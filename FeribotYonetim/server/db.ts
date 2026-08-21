import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';

// .env dosyasını yükle
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to configure your database?",
  );
}

// PostgreSQL bağlantı havuzu - Hostinger VPS veya harici PostgreSQL için
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Bağlantı durumunu kontrol et
pool.on('error', (err) => {
  console.error('Veritabanı bağlantı havuzu hatası:', err);
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Veritabanına yeni bağlantı oluşturuldu');
  }
});

// Drizzle ORM yapılandırması
export const db = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV !== 'production',
});

// Sorgu önbellekleme sistemi
const queryCaches = {
  user: new Map<string, { result: any, timestamp: number }>(),
  route: new Map<string, { result: any, timestamp: number }>(),
  booking: new Map<string, { result: any, timestamp: number }>(),
  general: new Map<string, { result: any, timestamp: number }>()
};

const CACHE_TTL = {
  user: 120000,
  route: 300000,
  booking: 180000,
  general: 60000
};

function getCacheType(sql: string): 'user' | 'route' | 'booking' | 'general' {
  sql = sql.toLowerCase();
  if (sql.includes('users') || sql.includes('user_profiles')) {
    return 'user';
  } else if (sql.includes('routes') || sql.includes('schedules') || sql.includes('ports')) {
    return 'route';
  } else if (sql.includes('bookings') || sql.includes('booking_passengers') || sql.includes('payment')) {
    return 'booking';
  }
  return 'general';
}

// Veritabanı bağlantı testi
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('Veritabanı bağlantısı başarılı!');
    return true;
  } catch (error) {
    console.error('Veritabanı bağlantı hatası:', error);
    return false;
  }
}
