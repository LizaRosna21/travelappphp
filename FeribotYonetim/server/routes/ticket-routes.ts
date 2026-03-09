/**
 * Ticket Routes Module
 * 
 * API routes for ticket generation, viewing, and management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ticketService, TicketFormat } from '../services/ticket';
import path from 'path';
import fs from 'fs';
import { isAdmin, isAuthenticated } from '../auth';

const router = Router();
const TICKET_DIR = path.join(process.cwd(), 'data', 'tickets');

// Ensure ticket directory exists
try {
  if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
    fs.mkdirSync(path.join(process.cwd(), 'data'));
  }
  if (!fs.existsSync(TICKET_DIR)) {
    fs.mkdirSync(TICKET_DIR);
  }
} catch (error) {
  console.error('Error creating ticket directory:', error);
}

/**
 * Generate ticket for booking
 * POST /api/tickets/generate/:bookingId/:format?
 */
router.post('/generate/:bookingId/:format?', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, error: 'Invalid booking ID' });
    }
    
    // Determine the format (default to PDF)
    let format = TicketFormat.PDF;
    if (req.params.format) {
      switch (req.params.format.toLowerCase()) {
        case 'pdf':
          format = TicketFormat.PDF;
          break;
        case 'html':
          format = TicketFormat.HTML;
          break;
        case 'email':
          format = TicketFormat.EMAIL;
          break;
        case 'print':
          format = TicketFormat.PRINT;
          break;
        default:
          return res.status(400).json({
            success: false,
            error: `Unsupported format: ${req.params.format}`
          });
      }
    }
    
    // Generate the ticket
    const result = await ticketService.generateTicket(bookingId, format);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // Send appropriate response based on format
    switch (format) {
      case TicketFormat.PDF:
        // For API calls, return the file path/URL
        return res.status(200).json(result);
      case TicketFormat.HTML:
      case TicketFormat.PRINT:
        if (req.query.download === 'true') {
          // For download requests, set content-disposition
          res.setHeader('Content-Disposition', `attachment; filename="ticket_${result.bookingReference}.html"`);
          res.setHeader('Content-Type', 'text/html');
          return res.send(result.content);
        } else {
          // For view requests, send HTML content
          return res.status(200).send(result.content);
        }
      case TicketFormat.EMAIL:
        // For email format, return the result with content
        return res.status(200).json(result);
      default:
        return res.status(200).json(result);
    }
  } catch (error: any) {
    console.error('Error generating ticket:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error generating ticket'
    });
  }
});

/**
 * Get ticket for booking
 * GET /api/tickets/:bookingId/:format?
 */
router.get('/:bookingId/:format?', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, error: 'Invalid booking ID' });
    }
    
    // Determine the format (default to PDF)
    let format = TicketFormat.PDF;
    if (req.params.format) {
      switch (req.params.format.toLowerCase()) {
        case 'pdf':
          format = TicketFormat.PDF;
          break;
        case 'html':
          format = TicketFormat.HTML;
          break;
        case 'email':
          format = TicketFormat.EMAIL;
          break;
        case 'print':
          format = TicketFormat.PRINT;
          break;
        default:
          return res.status(400).json({
            success: false,
            error: `Unsupported format: ${req.params.format}`
          });
      }
    }
    
    // Get the ticket
    const result = await ticketService.getTicket(bookingId, format);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // Send appropriate response based on format
    switch (format) {
      case TicketFormat.PDF:
        if (req.query.download === 'true') {
          // For download requests, set content-disposition
          res.setHeader('Content-Disposition', `attachment; filename="ticket_${result.bookingReference}.pdf"`);
          res.setHeader('Content-Type', 'application/pdf');
          return res.send(result.content);
        } else if (req.query.view === 'true') {
          // For view requests, set content-type to display PDF in browser
          res.setHeader('Content-Type', 'application/pdf');
          return res.send(result.content);
        } else {
          // For API calls, return the file path/URL
          return res.status(200).json(result);
        }
      case TicketFormat.HTML:
      case TicketFormat.PRINT:
        if (req.query.download === 'true') {
          // For download requests, set content-disposition
          res.setHeader('Content-Disposition', `attachment; filename="ticket_${result.bookingReference}.html"`);
          res.setHeader('Content-Type', 'text/html');
          return res.send(result.content);
        } else {
          // For view requests, send HTML content
          return res.status(200).send(result.content);
        }
      case TicketFormat.EMAIL:
        // For email format, return the result with content
        return res.status(200).json(result);
      default:
        return res.status(200).json(result);
    }
  } catch (error: any) {
    console.error('Error getting ticket:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error getting ticket'
    });
  }
});

/**
 * Send ticket by email
 * POST /api/tickets/email/:bookingId
 */
router.post('/email/:bookingId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, error: 'Invalid booking ID' });
    }
    
    // Get email ticket content
    const result = await ticketService.getTicket(bookingId, TicketFormat.EMAIL);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // In a real implementation, the email service would be used to send the ticket
    // For now, return success response
    return res.status(200).json({
      success: true,
      message: 'Ticket sent by email',
      // Omit content from response for efficiency
      ticketId: result.ticketId,
      pnrNumber: result.pnrNumber,
      bookingReference: result.bookingReference,
    });
  } catch (error: any) {
    console.error('Error sending ticket by email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error sending ticket by email'
    });
  }
});

/**
 * Generate boarding passes for booking
 * POST /api/tickets/boarding-passes/:bookingId
 */
router.post('/boarding-passes/:bookingId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, error: 'Invalid booking ID' });
    }
    
    // Generate boarding passes
    const result = await ticketService.generateBoardingPasses(bookingId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    if (req.query.download === 'true' && result.content) {
      // For download requests, set content-disposition
      res.setHeader('Content-Disposition', `attachment; filename="boarding_passes_${result.bookingReference}.pdf"`);
      res.setHeader('Content-Type', 'application/pdf');
      return res.send(result.content);
    } else {
      // For API calls, return the file path/URL
      return res.status(200).json(result);
    }
  } catch (error: any) {
    console.error('Error generating boarding passes:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error generating boarding passes'
    });
  }
});

/**
 * Delete ticket
 * DELETE /api/tickets/:bookingId
 */
router.delete('/:bookingId', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, error: 'Invalid booking ID' });
    }
    
    // Delete ticket
    const result = await ticketService.deleteTicket(bookingId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error deleting ticket:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error deleting ticket'
    });
  }
});

/**
 * Serve static ticket files
 * GET /api/tickets/files/:filename
 */
router.get('/files/:filename', isAuthenticated, (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(TICKET_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Ticket file not found' 
      });
    }
    
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.html':
        contentType = 'text/html';
        break;
      case '.txt':
        contentType = 'text/plain';
        break;
    }
    
    // Set content type
    res.setHeader('Content-Type', contentType);
    
    // If download parameter is set, set content-disposition header
    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error('Error serving ticket file:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error serving ticket file'
    });
  }
});

export default router;