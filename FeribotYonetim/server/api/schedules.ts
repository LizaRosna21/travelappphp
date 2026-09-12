import { Express } from "express";
import { storage } from "../storage";
import { Schedule, insertScheduleSchema } from "@shared/schema";
import { z } from "zod";

export default function registerSchedulesRoutes(app: Express) {
  // Tüm seferleri getir
  app.get('/api/schedules', async (req, res) => {
    try {
      const { routeId } = req.query;
      
      try {
        // Rota ID verildiyse ilgili rotanın seferlerini getir
        if (routeId) {
          const schedules = await storage.getSchedulesByRoute(parseInt(routeId as string));
          return res.json(schedules);
        }
        
        // Rota ID yoksa tüm seferleri getir
        const allSchedules = await storage.getAllSchedules();
        res.json(allSchedules);
      } catch (err) {
        console.error("Inner schedule fetch error:", err);
        // Eğer yeni alanlar henüz veritabanında oluşturulmadıysa, eski sorguyu kullan
        const query = routeId ? 
          `SELECT * FROM schedules WHERE route_id = ${parseInt(routeId as string)}` :
          `SELECT * FROM schedules`;
          
        const result = await storage.rawQuery(query);
        return res.json(result.rows);
      }
    } catch (error) {
      console.error("Sefer getirme hatası:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  // Belirli bir seferi ID'ye göre getir
  app.get('/api/schedules/:id', async (req, res) => {
    try {
      const scheduleId = parseInt(req.params.id);
      const schedule = await storage.getSchedule(scheduleId);
      
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      res.json(schedule);
    } catch (error) {
      console.error("Sefer detayı getirme hatası:", error);
      res.status(500).json({ message: "Failed to fetch schedule details" });
    }
  });

  // Yeni sefer oluştur
  app.post('/api/schedules', async (req, res) => {
    try {
      // Validate the request body with Zod schema
      const validatedData = insertScheduleSchema.parse(req.body);
      const newSchedule = await storage.createSchedule(validatedData);
      res.status(201).json(newSchedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Sefer oluşturma hatası:", error);
      res.status(500).json({ message: "Failed to create schedule" });
    }
  });

  // Seferi güncelle
  app.put('/api/schedules/:id', async (req, res) => {
    try {
      const scheduleId = parseInt(req.params.id);
      
      // Validate the request body with Zod schema
      const validatedData = insertScheduleSchema.partial().parse(req.body);
      const updatedSchedule = await storage.updateSchedule(scheduleId, validatedData);
      
      if (!updatedSchedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      res.json(updatedSchedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Sefer güncelleme hatası:", error);
      res.status(500).json({ message: "Failed to update schedule" });
    }
  });

  // Seferi sil
  app.delete('/api/schedules/:id', async (req, res) => {
    try {
      const scheduleId = parseInt(req.params.id);
      const deleted = await storage.deleteSchedule(scheduleId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Sefer silme hatası:", error);
      res.status(500).json({ message: "Failed to delete schedule" });
    }
  });
}