import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createGzip } from 'zlib';
import { pipeline } from 'stream';
import { db } from '../db';
import { 
  systemBackups, 
  backupSchedules,
  restoreOperations,
  disasterRecoveryPoints,
  InsertSystemBackup,
  InsertBackupSchedule,
  InsertRestoreOperation,
  InsertDisasterRecoveryPoint,
} from '@shared/schema';
import { eq, and, lt, gt, desc } from 'drizzle-orm';

const execPromise = promisify(exec);
const pipelinePromise = promisify(pipeline);

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export class BackupService {
  constructor() {
    // Initialize backup directory
    console.log(`Backup service initialized with directory: ${BACKUP_DIR}`);
  }

  /**
   * Creates a new backup based on the provided configuration
   */
  async createBackup(data: InsertSystemBackup, userId: number): Promise<{ id: number; filePath: string }> {
    try {
      // Generate a unique filename for the backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${data.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${timestamp}`;
      const backupFilePath = path.join(BACKUP_DIR, `${backupFileName}.sql`);
      const finalFilePath = data.compressionType === 'gzip' 
        ? `${backupFilePath}.gz` 
        : data.compressionType === 'zip' 
          ? `${backupFilePath}.zip` 
          : backupFilePath;

      // Insert the backup record first with 'pending' status
      const [backupRecord] = await db.insert(systemBackups).values({
        name: data.name,
        description: data.description || null,
        filePath: finalFilePath,
        size: '0', // Will be updated later
        createdBy: userId,
        backupType: data.backupType,
        status: 'pending',
        retentionDays: data.retentionDays,
        isAutomatic: false, // Manual backup
        compressionType: data.compressionType,
        encryptionEnabled: data.encryptionEnabled,
        metadata: {},
      }).returning({ id: systemBackups.id });

      // Start the backup process asynchronously
      this.performBackup(backupRecord.id, backupFilePath, data).catch(err => {
        console.error('Error during backup process:', err);
        this.updateBackupStatus(backupRecord.id, 'failed');
      });

      return { id: backupRecord.id, filePath: finalFilePath };
    } catch (error) {
      console.error('Error creating backup record:', error);
      throw new Error('Failed to create backup record');
    }
  }

  /**
   * Updates the status of a backup
   */
  private async updateBackupStatus(backupId: number, status: string, completedAt?: Date, size?: string): Promise<void> {
    try {
      const updateData: any = { status };
      
      if (completedAt) {
        updateData.completedAt = completedAt;
      }
      
      if (size) {
        updateData.size = size;
      }
      
      await db.update(systemBackups)
        .set(updateData)
        .where(eq(systemBackups.id, backupId));
    } catch (error) {
      console.error(`Error updating backup status for ID ${backupId}:`, error);
    }
  }

  /**
   * Performs the actual backup process
   */
  private async performBackup(backupId: number, backupFilePath: string, options: InsertSystemBackup): Promise<void> {
    try {
      // Update status to in_progress
      await this.updateBackupStatus(backupId, 'in_progress');

      // Generate backup command
      const pgDumpOptions = this.getPgDumpOptions(options);
      const pgDumpCmd = `pg_dump ${pgDumpOptions} > ${backupFilePath}`;

      console.log(`Starting backup process with command: ${pgDumpCmd}`);

      // Execute the pg_dump command
      await execPromise(pgDumpCmd);

      // Compress the file if needed
      const finalPath = await this.compressBackupFile(backupFilePath, options.compressionType);

      // Encrypt the file if needed
      if (options.encryptionEnabled) {
        await this.encryptFile(finalPath);
      }

      // Get file size
      const stats = fs.statSync(finalPath);
      const fileSize = stats.size.toString();

      // Update status to completed
      await this.updateBackupStatus(backupId, 'completed', new Date(), fileSize);

      console.log(`Backup completed successfully: ${finalPath}`);
    } catch (error) {
      console.error('Error during backup process:', error);
      await this.updateBackupStatus(backupId, 'failed');
      // Delete partial backup file if it exists
      try {
        if (fs.existsSync(backupFilePath)) {
          fs.unlinkSync(backupFilePath);
        }
      } catch (err) {
        console.error('Error cleaning up failed backup file:', err);
      }
    }
  }

  /**
   * Builds pg_dump options based on the provided configuration
   */
  private getPgDumpOptions(options: InsertSystemBackup): string {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    let pgDumpOptions = `-d "${connectionString}" --clean --if-exists`;

    // Add options based on backup type
    if (options.backupType === 'incremental' || options.backupType === 'differential') {
      pgDumpOptions += ' --data-only';
    }

    return pgDumpOptions;
  }

  /**
   * Compresses the backup file using the specified compression type
   */
  private async compressBackupFile(filePath: string, compressionType: string): Promise<string> {
    switch (compressionType) {
      case 'gzip': {
        const gzipFilePath = `${filePath}.gz`;
        const source = fs.createReadStream(filePath);
        const gzip = createGzip();
        const destination = fs.createWriteStream(gzipFilePath);

        await pipelinePromise(source, gzip, destination);
        
        // Remove the original uncompressed file
        fs.unlinkSync(filePath);
        
        return gzipFilePath;
      }
      case 'zip': {
        const zipFilePath = `${filePath}.zip`;
        await execPromise(`zip -j "${zipFilePath}" "${filePath}"`);
        
        // Remove the original uncompressed file
        fs.unlinkSync(filePath);
        
        return zipFilePath;
      }
      default:
        // No compression, return original path
        return filePath;
    }
  }

  /**
   * Encrypts a file using AES-256
   */
  private async encryptFile(filePath: string): Promise<void> {
    // Use a consistent encryption key from environment or generate a secure one
    const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || 
      crypto.createHash('sha256').update('ferry-backup-default-key').digest('hex');

    const inputBuffer = fs.readFileSync(filePath);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
    
    const encryptedBuffer = Buffer.concat([
      iv,
      cipher.update(inputBuffer),
      cipher.final()
    ]);
    
    fs.writeFileSync(filePath, encryptedBuffer);
  }

  /**
   * Creates a new backup schedule
   */
  async createBackupSchedule(data: InsertBackupSchedule, userId: number): Promise<{ id: number }> {
    try {
      // Calculate the next scheduled run time
      const nextScheduledAt = this.calculateNextScheduledRun(
        data.frequency,
        data.timeOfDay,
        data.dayOfWeek,
        data.dayOfMonth
      );

      // Insert the schedule record
      const [scheduleRecord] = await db.insert(backupSchedules).values({
        ...data,
        createdBy: userId,
        nextScheduledAt,
      }).returning({ id: backupSchedules.id });

      return { id: scheduleRecord.id };
    } catch (error) {
      console.error('Error creating backup schedule:', error);
      throw new Error('Failed to create backup schedule');
    }
  }

  /**
   * Calculates the next scheduled run time for a backup schedule
   */
  private calculateNextScheduledRun(
    frequency: string,
    timeOfDay: string,
    dayOfWeek?: number,
    dayOfMonth?: number
  ): Date {
    const now = new Date();
    const [hours, minutes] = timeOfDay.split(':').map(Number);
    const next = new Date(now);

    // Set the time component
    next.setHours(hours, minutes, 0, 0);

    // If the time is in the past, move to the next day
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    // Adjust based on frequency
    switch (frequency) {
      case 'weekly': {
        // Move to the next occurrence of the specified day of week
        const currentDayOfWeek = next.getDay();
        const targetDayOfWeek = dayOfWeek ?? 0; // Default to Sunday (0)
        
        let daysToAdd = targetDayOfWeek - currentDayOfWeek;
        if (daysToAdd <= 0) {
          daysToAdd += 7; // Move to next week if current day has passed
        }
        
        next.setDate(next.getDate() + daysToAdd);
        break;
      }
      case 'monthly': {
        // Move to the specified day of month
        const targetDayOfMonth = dayOfMonth ?? 1; // Default to the 1st of the month
        
        // Move to the next month if current day has passed
        next.setDate(1); // Go to the first day of the current month
        
        if (next <= now || targetDayOfMonth < now.getDate()) {
          next.setMonth(next.getMonth() + 1);
        }
        
        // Set the target day of month
        next.setDate(targetDayOfMonth);
        
        // Handle invalid dates (e.g., February 30 becomes March 2)
        if (next.getDate() !== targetDayOfMonth) {
          // This means the date was invalid and rolled over
          // Go back to the last day of the previous month
          next.setDate(0);
        }
        break;
      }
      // For daily, no additional adjustment needed
    }

    return next;
  }

  /**
   * Gets all backup schedules
   */
  async getBackupSchedules(): Promise<any[]> {
    try {
      return await db.select().from(backupSchedules).orderBy(desc(backupSchedules.isActive), desc(backupSchedules.createdAt));
    } catch (error) {
      console.error('Error fetching backup schedules:', error);
      throw new Error('Failed to fetch backup schedules');
    }
  }
  
  /**
   * Alias for getBackupSchedules for compatibility with existing endpoints
   */
  async listBackupSchedules(onlyActive: boolean = false): Promise<any[]> {
    try {
      let query = db.select().from(backupSchedules);
      
      if (onlyActive) {
        query = query.where(eq(backupSchedules.isActive, true));
      }
      
      return await query.orderBy(desc(backupSchedules.isActive), desc(backupSchedules.createdAt));
    } catch (error) {
      console.error('Error listing backup schedules:', error);
      throw new Error('Failed to list backup schedules');
    }
  }
  
  /**
   * Toggle a backup schedule's active status
   */
  async toggleBackupScheduleStatus(id: number, isActive: boolean): Promise<void> {
    try {
      await db.update(backupSchedules)
        .set({ isActive })
        .where(eq(backupSchedules.id, id));
    } catch (error) {
      console.error(`Error toggling backup schedule status ${id}:`, error);
      throw new Error('Failed to toggle backup schedule status');
    }
  }

  /**
   * Gets all system backups
   */
  async getSystemBackups(): Promise<any[]> {
    try {
      return await db.select().from(systemBackups).orderBy(desc(systemBackups.createdAt));
    } catch (error) {
      console.error('Error fetching system backups:', error);
      throw new Error('Failed to fetch system backups');
    }
  }
  
  /**
   * Alias for getSystemBackups for compatibility with existing endpoints
   */
  async listBackups(limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      return await db.select()
        .from(systemBackups)
        .orderBy(desc(systemBackups.createdAt))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error('Error listing backups:', error);
      throw new Error('Failed to list backups');
    }
  }

  /**
   * Gets a specific backup by ID
   */
  async getBackupById(id: number): Promise<any> {
    try {
      const [backup] = await db.select().from(systemBackups).where(eq(systemBackups.id, id));
      return backup;
    } catch (error) {
      console.error(`Error fetching backup ${id}:`, error);
      throw new Error('Failed to fetch backup');
    }
  }

  /**
   * Gets a specific backup schedule by ID
   */
  async getBackupScheduleById(id: number): Promise<any> {
    try {
      const [schedule] = await db.select().from(backupSchedules).where(eq(backupSchedules.id, id));
      return schedule;
    } catch (error) {
      console.error(`Error fetching backup schedule ${id}:`, error);
      throw new Error('Failed to fetch backup schedule');
    }
  }

  /**
   * Updates a backup schedule
   */
  async updateBackupSchedule(id: number, data: Partial<InsertBackupSchedule>): Promise<any> {
    try {
      const updateData: any = { ...data };
      
      // If frequency or time-related fields are updated, recalculate the next run
      if (data.frequency || data.timeOfDay || data.dayOfWeek || data.dayOfMonth) {
        const schedule = await this.getBackupScheduleById(id);
        if (schedule) {
          updateData.nextScheduledAt = this.calculateNextScheduledRun(
            data.frequency || schedule.frequency,
            data.timeOfDay || schedule.timeOfDay,
            data.dayOfWeek ?? schedule.dayOfWeek,
            data.dayOfMonth ?? schedule.dayOfMonth
          );
        }
      }
      
      const [updated] = await db.update(backupSchedules)
        .set(updateData)
        .where(eq(backupSchedules.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      console.error(`Error updating backup schedule ${id}:`, error);
      throw new Error('Failed to update backup schedule');
    }
  }

  /**
   * Executes a scheduled backup
   */
  async executeScheduledBackup(scheduleId: number): Promise<{ id: number; filePath: string }> {
    try {
      const schedule = await this.getBackupScheduleById(scheduleId);
      
      if (!schedule) {
        throw new Error(`Backup schedule ${scheduleId} not found`);
      }
      
      // Generate backup name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `${schedule.name}_${timestamp}`;
      
      // Create the backup based on the schedule settings
      const backup = await this.createBackup(
        {
          name: backupName,
          description: `Scheduled backup from ${schedule.name}`,
          backupType: schedule.backupType,
          compressionType: schedule.compressionType,
          encryptionEnabled: schedule.encryptionEnabled,
          retentionDays: schedule.retentionDays,
          includeData: schedule.includeData,
          includeFiles: schedule.includeFiles,
        }, 
        schedule.createdBy
      );
      
      // Update the last run time of the schedule
      await db.update(backupSchedules)
        .set({ 
          lastRunAt: new Date(),
          nextScheduledAt: this.calculateNextScheduledRun(
            schedule.frequency,
            schedule.timeOfDay,
            schedule.dayOfWeek,
            schedule.dayOfMonth
          )
        })
        .where(eq(backupSchedules.id, scheduleId));
      
      return backup;
    } catch (error) {
      console.error(`Error executing scheduled backup for ID ${scheduleId}:`, error);
      throw new Error('Failed to execute scheduled backup');
    }
  }

  /**
   * Deletes a backup schedule
   */
  async deleteBackupSchedule(id: number): Promise<{ success: boolean }> {
    try {
      await db.delete(backupSchedules).where(eq(backupSchedules.id, id));
      return { success: true };
    } catch (error) {
      console.error(`Error deleting backup schedule ${id}:`, error);
      throw new Error('Failed to delete backup schedule');
    }
  }

  /**
   * Deletes a backup
   */
  async deleteBackup(id: number): Promise<{ success: boolean }> {
    try {
      // Get the backup details first
      const backup = await this.getBackupById(id);
      
      if (!backup) {
        throw new Error(`Backup ${id} not found`);
      }
      
      // Delete the file
      if (backup.filePath && fs.existsSync(backup.filePath)) {
        fs.unlinkSync(backup.filePath);
      }
      
      // Delete the record
      await db.delete(systemBackups).where(eq(systemBackups.id, id));
      
      return { success: true };
    } catch (error) {
      console.error(`Error deleting backup ${id}:`, error);
      throw new Error('Failed to delete backup');
    }
  }

  /**
   * Initiates a restore operation
   */
  async initiateRestore(data: InsertRestoreOperation, userId: number): Promise<{ id: number }> {
    try {
      // Validate that the backup exists
      const backup = await this.getBackupById(data.backupId);
      
      if (!backup) {
        throw new Error(`Backup ${data.backupId} not found`);
      }
      
      // Create restore operation record
      const [operation] = await db.insert(restoreOperations).values({
        ...data,
        initiatedBy: userId,
        status: 'pending',
      }).returning({ id: restoreOperations.id });
      
      // Start the restore process asynchronously
      this.performRestore(operation.id, backup).catch(err => {
        console.error('Error during restore process:', err);
        this.updateRestoreStatus(operation.id, 'failed');
      });
      
      return { id: operation.id };
    } catch (error) {
      console.error('Error initiating restore operation:', error);
      throw new Error('Failed to initiate restore operation');
    }
  }
  
  /**
   * Alias for initiateRestore for compatibility with existing endpoints
   */
  async restoreFromBackup(data: InsertRestoreOperation): Promise<{ id: number }> {
    try {
      // If no userId is provided, use a system user ID (1 by default)
      const userId = data.initiatedBy || 1;
      return await this.initiateRestore(data, userId);
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw new Error('Failed to restore from backup');
    }
  }

  /**
   * Updates the status of a restore operation
   */
  private async updateRestoreStatus(restoreId: number, status: string, completedAt?: Date): Promise<void> {
    try {
      const updateData: any = { status };
      
      if (completedAt) {
        updateData.completedAt = completedAt;
      }
      
      await db.update(restoreOperations)
        .set(updateData)
        .where(eq(restoreOperations.id, restoreId));
    } catch (error) {
      console.error(`Error updating restore status for ID ${restoreId}:`, error);
    }
  }

  /**
   * Performs the actual restore process
   */
  private async performRestore(restoreId: number, backup: any): Promise<void> {
    try {
      // Get restore operation details
      const [operation] = await db.select().from(restoreOperations).where(eq(restoreOperations.id, restoreId));
      
      if (!operation) {
        throw new Error(`Restore operation ${restoreId} not found`);
      }
      
      // Update status to in_progress
      await this.updateRestoreStatus(restoreId, 'in_progress');
      
      // Check if the backup file exists
      if (!fs.existsSync(backup.filePath)) {
        throw new Error(`Backup file ${backup.filePath} not found`);
      }
      
      // Decrypt the file if it's encrypted
      let restoreFilePath = backup.filePath;
      if (backup.encryptionEnabled) {
        restoreFilePath = await this.decryptToTempFile(backup.filePath);
      }
      
      // Decompress the file if it's compressed
      if (backup.compressionType !== 'none') {
        restoreFilePath = await this.decompressToTempFile(restoreFilePath, backup.compressionType);
      }
      
      // Build restore command
      const restoreCmd = this.buildRestoreCommand(restoreFilePath, operation);
      
      console.log(`Starting restore process with command: ${restoreCmd}`);
      
      // Execute the restore command
      await execPromise(restoreCmd);
      
      // Run post-restore script if provided
      if (operation.postRestoreScript) {
        console.log('Running post-restore script');
        await execPromise(operation.postRestoreScript);
      }
      
      // Cleanup temporary files
      if (restoreFilePath !== backup.filePath) {
        fs.unlinkSync(restoreFilePath);
      }
      
      // Update status to completed
      await this.updateRestoreStatus(restoreId, 'completed', new Date());
      
      console.log(`Restore operation completed successfully: ${restoreId}`);
    } catch (error) {
      console.error('Error during restore process:', error);
      await this.updateRestoreStatus(restoreId, 'failed');
    }
  }

  /**
   * Builds the command for restoring the database
   */
  private buildRestoreCommand(filePath: string, operation: any): string {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    let restoreCmd = `psql -d "${connectionString}" -f "${filePath}"`;
    
    // Add partial restore options if applicable
    if (operation.restoreType === 'partial' && operation.selectedTables) {
      // For partial restore, we need a more complex approach
      // This is a placeholder - actual implementation would involve filtering the SQL file
      console.log(`Partial restore requested for tables: ${operation.selectedTables}`);
    }
    
    return restoreCmd;
  }

  /**
   * Decrypts an encrypted file to a temporary file
   */
  private async decryptToTempFile(filePath: string): Promise<string> {
    const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || 
      crypto.createHash('sha256').update('ferry-backup-default-key').digest('hex');
    
    const encryptedBuffer = fs.readFileSync(filePath);
    const iv = encryptedBuffer.slice(0, 16);
    const encryptedData = encryptedBuffer.slice(16);
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
    const decryptedBuffer = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    
    const tempPath = `${path.dirname(filePath)}/temp_${path.basename(filePath)}`;
    fs.writeFileSync(tempPath, decryptedBuffer);
    
    return tempPath;
  }

  /**
   * Decompresses a compressed file to a temporary file
   */
  private async decompressToTempFile(filePath: string, compressionType: string): Promise<string> {
    const tempPath = `${path.dirname(filePath)}/temp_${path.basename(filePath).replace(/\.(gz|zip)$/, '')}`;
    
    switch (compressionType) {
      case 'gzip':
        await execPromise(`gunzip -c "${filePath}" > "${tempPath}"`);
        break;
      case 'zip':
        await execPromise(`unzip -p "${filePath}" > "${tempPath}"`);
        break;
      default:
        return filePath; // No decompression needed
    }
    
    return tempPath;
  }

  /**
   * Gets all restore operations
   */
  async getRestoreOperations(): Promise<any[]> {
    try {
      return await db.select().from(restoreOperations).orderBy(desc(restoreOperations.startedAt));
    } catch (error) {
      console.error('Error fetching restore operations:', error);
      throw new Error('Failed to fetch restore operations');
    }
  }
  
  /**
   * Alias for getRestoreOperations for compatibility with existing endpoints
   */
  async listRestoreOperations(): Promise<any[]> {
    try {
      return await db.select().from(restoreOperations).orderBy(desc(restoreOperations.startedAt));
    } catch (error) {
      console.error('Error listing restore operations:', error);
      throw new Error('Failed to list restore operations');
    }
  }
  
  /**
   * Gets a specific restore operation by ID
   */
  async getRestoreOperationById(id: number): Promise<any> {
    try {
      const [operation] = await db.select().from(restoreOperations).where(eq(restoreOperations.id, id));
      return operation;
    } catch (error) {
      console.error(`Error fetching restore operation ${id}:`, error);
      throw new Error('Failed to fetch restore operation');
    }
  }

  /**
   * Creates a new disaster recovery point
   */
  async createRecoveryPoint(data: InsertDisasterRecoveryPoint, userId: number): Promise<{ id: number }> {
    try {
      // Validate that the backup exists
      const backup = await this.getBackupById(data.backupId);
      
      if (!backup) {
        throw new Error(`Backup ${data.backupId} not found`);
      }
      
      // Create recovery point record
      const [point] = await db.insert(disasterRecoveryPoints).values({
        ...data,
      }).returning({ id: disasterRecoveryPoints.id });
      
      return { id: point.id };
    } catch (error) {
      console.error('Error creating disaster recovery point:', error);
      throw new Error('Failed to create disaster recovery point');
    }
  }
  
  /**
   * Alias for createRecoveryPoint for compatibility with existing endpoints
   */
  async createDisasterRecoveryPoint(data: InsertDisasterRecoveryPoint, userId: number): Promise<{ id: number }> {
    try {
      return await this.createRecoveryPoint(data, userId);
    } catch (error) {
      console.error('Error creating disaster recovery point:', error);
      throw new Error('Failed to create disaster recovery point');
    }
  }

  /**
   * Gets all disaster recovery points
   */
  async getRecoveryPoints(): Promise<any[]> {
    try {
      return await db.select().from(disasterRecoveryPoints)
        .orderBy(desc(disasterRecoveryPoints.isActive), desc(disasterRecoveryPoints.createdAt));
    } catch (error) {
      console.error('Error fetching recovery points:', error);
      throw new Error('Failed to fetch recovery points');
    }
  }

  /**
   * Runs automatic backup cleanup based on retention policy
   */
  async cleanupExpiredBackups(): Promise<{ count: number }> {
    try {
      const now = new Date();
      const expiredBackups = await db.select().from(systemBackups).where(
        (backup) => {
          const expirationDate = new Date(backup.createdAt);
          expirationDate.setDate(expirationDate.getDate() + Number(backup.retentionDays));
          return and(
            lt(expirationDate, now),
            eq(backup.status, 'completed')
          );
        }
      );
      
      let deleteCount = 0;
      
      for (const backup of expiredBackups) {
        try {
          // Delete the backup file
          if (backup.filePath && fs.existsSync(backup.filePath)) {
            fs.unlinkSync(backup.filePath);
          }
          
          // Delete the record
          await db.delete(systemBackups).where(eq(systemBackups.id, backup.id));
          
          deleteCount++;
        } catch (error) {
          console.error(`Error cleaning up expired backup ${backup.id}:`, error);
        }
      }
      
      return { count: deleteCount };
    } catch (error) {
      console.error('Error cleaning up expired backups:', error);
      throw new Error('Failed to clean up expired backups');
    }
  }

  /**
   * Checks for due scheduled backups and executes them
   */
  async runDueScheduledBackups(): Promise<{ count: number }> {
    try {
      const now = new Date();
      const dueSchedules = await db.select().from(backupSchedules).where(
        (schedule) => {
          return and(
            eq(schedule.isActive, true),
            lt(schedule.nextScheduledAt, now)
          );
        }
      );
      
      let executedCount = 0;
      
      for (const schedule of dueSchedules) {
        try {
          await this.executeScheduledBackup(schedule.id);
          executedCount++;
        } catch (error) {
          console.error(`Error executing scheduled backup ${schedule.id}:`, error);
        }
      }
      
      return { count: executedCount };
    } catch (error) {
      console.error('Error running due scheduled backups:', error);
      throw new Error('Failed to run due scheduled backups');
    }
  }

  /**
   * Gets backup statistics for dashboard
   */
  async getBackupStats(): Promise<any> {
    try {
      // Get total backups count
      const [totalBackups] = await db.select({ count: count(systemBackups.id) }).from(systemBackups);
      
      // Get backup counts by status
      const statusCounts = await db.select({
        status: systemBackups.status,
        count: count(systemBackups.id),
      }).from(systemBackups).groupBy(systemBackups.status);
      
      // Get backup counts by type
      const typeCounts = await db.select({
        type: systemBackups.backupType,
        count: count(systemBackups.id),
      }).from(systemBackups).groupBy(systemBackups.backupType);
      
      // Get recent backups
      const recentBackups = await db.select().from(systemBackups)
        .orderBy(desc(systemBackups.createdAt))
        .limit(5);
      
      // Get active schedules count
      const [activeSchedules] = await db.select({ count: count(backupSchedules.id) })
        .from(backupSchedules)
        .where(eq(backupSchedules.isActive, true));
      
      // Get total used storage
      let totalStorage = BigInt(0);
      const allBackups = await db.select({ size: systemBackups.size }).from(systemBackups)
        .where(eq(systemBackups.status, 'completed'));
      
      allBackups.forEach(backup => {
        try {
          totalStorage += BigInt(backup.size);
        } catch (err) {
          // Skip if size is not a valid number
        }
      });
      
      return {
        totalBackups: totalBackups.count,
        statusCounts,
        typeCounts,
        recentBackups,
        activeSchedules: activeSchedules.count,
        totalStorage: totalStorage.toString(),
      };
    } catch (error) {
      console.error('Error getting backup statistics:', error);
      throw new Error('Failed to get backup statistics');
    }
  }

  /**
   * Gets active schedules that need to be executed
   */
  async getActiveSchedules(): Promise<any[]> {
    try {
      return await db.select().from(backupSchedules).where(eq(backupSchedules.isActive, true));
    } catch (error) {
      console.error('Error fetching active schedules:', error);
      throw new Error('Failed to fetch active schedules');
    }
  }

  /**
   * Gets a specific disaster recovery point by ID
   */
  async getRecoveryPointById(id: number): Promise<any> {
    try {
      const [point] = await db.select().from(disasterRecoveryPoints).where(eq(disasterRecoveryPoints.id, id));
      return point;
    } catch (error) {
      console.error(`Error fetching recovery point ${id}:`, error);
      throw new Error('Failed to fetch recovery point');
    }
  }
  
  /**
   * Alias for getRecoveryPoints for compatibility with existing endpoints
   */
  async listDisasterRecoveryPoints(): Promise<any[]> {
    try {
      return await db.select().from(disasterRecoveryPoints)
        .orderBy(desc(disasterRecoveryPoints.isActive), desc(disasterRecoveryPoints.createdAt));
    } catch (error) {
      console.error('Error listing disaster recovery points:', error);
      throw new Error('Failed to list disaster recovery points');
    }
  }

  /**
   * Tests a disaster recovery point
   */
  async testRecoveryPoint(id: number): Promise<{ success: boolean; testResult: string }> {
    try {
      const point = await this.getRecoveryPointById(id);
      
      if (!point) {
        throw new Error(`Recovery point ${id} not found`);
      }
      
      const backup = await this.getBackupById(point.backupId);
      
      if (!backup) {
        throw new Error(`Backup ${point.backupId} not found for recovery point ${id}`);
      }
      
      // Perform a simulated restore test (e.g., validate backup file integrity)
      const testResult = await this.validateBackupFile(backup.filePath, backup.compressionType, backup.encryptionEnabled);
      
      // Update the recovery point with test results
      await db.update(disasterRecoveryPoints)
        .set({ 
          lastTestedAt: new Date(),
          testResult: testResult ? 'passed' : 'failed',
        })
        .where(eq(disasterRecoveryPoints.id, id));
      
      return { success: testResult, testResult: testResult ? 'passed' : 'failed' };
    } catch (error) {
      console.error(`Error testing recovery point ${id}:`, error);
      
      // Update the recovery point with test results
      await db.update(disasterRecoveryPoints)
        .set({ 
          lastTestedAt: new Date(),
          testResult: 'failed',
        })
        .where(eq(disasterRecoveryPoints.id, id));
      
      throw new Error('Failed to test recovery point');
    }
  }

  /**
   * Validates a backup file's integrity
   */
  private async validateBackupFile(filePath: string, compressionType: string, isEncrypted: boolean): Promise<boolean> {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return false;
      }
      
      // Validate compression format
      if (compressionType === 'gzip') {
        // Check gzip file integrity
        await execPromise(`gzip -t "${filePath}"`);
      } else if (compressionType === 'zip') {
        // Check zip file integrity
        await execPromise(`unzip -t "${filePath}"`);
      }
      
      // For encrypted files, we would need to try decryption
      if (isEncrypted) {
        try {
          const tempFile = await this.decryptToTempFile(filePath);
          fs.unlinkSync(tempFile); // Clean up after validation
        } catch (error) {
          console.error('Encryption validation failed:', error);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Backup file validation failed:', error);
      return false;
    }
  }
  
  /**
   * Public version of validateBackupFile for external use
   */
  async verifyBackupIntegrity(backupId: number): Promise<{ valid: boolean; message: string }> {
    try {
      const backup = await this.getBackupById(backupId);
      
      if (!backup) {
        return { valid: false, message: `Backup ${backupId} not found` };
      }
      
      const isValid = await this.validateBackupFile(
        backup.filePath, 
        backup.compressionType, 
        backup.encryptionEnabled
      );
      
      return { 
        valid: isValid, 
        message: isValid ? 'Backup file integrity verified' : 'Backup file integrity check failed' 
      };
    } catch (error) {
      console.error(`Error verifying backup integrity for ID ${backupId}:`, error);
      return { valid: false, message: 'Error during backup verification' };
    }
  }
}

// Helper function for SQL count aggregation
const count = (column: any) => {
  return sql`count(${column})`;
};

// Import SQL tag from drizzle for raw SQL
import { sql } from 'drizzle-orm';

export default new BackupService();