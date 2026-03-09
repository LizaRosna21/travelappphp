import { Request, Response, Router } from "express";
import { MarketingService } from "../services/marketing-service";
import { IStorage } from "../storage";
import { insertCampaignSchema, insertCouponSchema, insertMarketingEmailSchema, insertCustomerSegmentSchema } from "@shared/schema";
import { z } from "zod";
import { WebSocket } from "ws";
import { isAuthenticated, isAdmin } from "../auth";

export function registerMarketingRoutes(router: Router, storage: IStorage, wss: WebSocket.Server) {
  const marketingService = new MarketingService(storage, wss);

  // Campaign routes - Public
  router.get("/campaigns", async (req: Request, res: Response) => {
    try {
      const campaigns = req.query.active === "true" 
        ? await marketingService.getActiveCampaigns() 
        : await marketingService.getAllCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  router.get("/campaigns/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await marketingService.getCampaign(id);
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Record a campaign view
      await marketingService.recordCampaignView(id);
      
      res.json(campaign);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });

  // Coupon validation route - Public
  router.post("/validate-coupon", async (req: Request, res: Response) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Coupon code is required" });
      }
      
      const result = await marketingService.validateCoupon(code);
      res.json(result);
    } catch (error) {
      console.error("Error validating coupon:", error);
      res.status(500).json({ message: "Failed to validate coupon" });
    }
  });

  // Campaign routes - Admin only
  router.post("/admin/campaigns", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertCampaignSchema.parse(req.body);
      const campaign = await marketingService.createCampaign(validatedData);
      
      res.status(201).json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  router.patch("/admin/campaigns/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCampaignSchema.partial().parse(req.body);
      const campaign = await marketingService.updateCampaign(id, validatedData);
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      res.json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  router.delete("/admin/campaigns/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await marketingService.deleteCampaign(id);
      
      if (!success) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  // Coupon routes - Admin only
  router.get("/admin/campaigns/:campaignId/coupons", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const coupons = await marketingService.getCouponsByCampaign(campaignId);
      res.json(coupons);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      res.status(500).json({ message: "Failed to fetch coupons" });
    }
  });

  router.post("/admin/coupons", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertCouponSchema.parse(req.body);
      const coupon = await marketingService.createCoupon(validatedData);
      
      res.status(201).json(coupon);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating coupon:", error);
      res.status(500).json({ message: "Failed to create coupon" });
    }
  });

  // Customer segment routes - Admin only
  router.get("/admin/customer-segments", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const segments = await marketingService.getCustomerSegments();
      res.json(segments);
    } catch (error) {
      console.error("Error fetching customer segments:", error);
      res.status(500).json({ message: "Failed to fetch customer segments" });
    }
  });

  router.post("/admin/customer-segments", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertCustomerSegmentSchema.parse(req.body);
      const segment = await marketingService.createCustomerSegment(validatedData);
      
      res.status(201).json(segment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating customer segment:", error);
      res.status(500).json({ message: "Failed to create customer segment" });
    }
  });

  // Marketing email routes - Admin only
  router.get("/admin/marketing-emails", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const campaignId = req.query.campaignId ? parseInt(req.query.campaignId as string) : undefined;
      const emails = await marketingService.getMarketingEmails(campaignId);
      res.json(emails);
    } catch (error) {
      console.error("Error fetching marketing emails:", error);
      res.status(500).json({ message: "Failed to fetch marketing emails" });
    }
  });

  router.post("/admin/marketing-emails", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertMarketingEmailSchema.parse(req.body);
      const email = await marketingService.createMarketingEmail(validatedData);
      
      res.status(201).json(email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating marketing email:", error);
      res.status(500).json({ message: "Failed to create marketing email" });
    }
  });

  router.post("/admin/marketing-emails/:id/send-test", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { testRecipient } = req.body;
      
      if (!testRecipient) {
        return res.status(400).json({ message: "Test recipient email is required" });
      }
      
      const success = await marketingService.sendTestEmail(id, testRecipient);
      
      if (!success) {
        return res.status(404).json({ message: "Email not found or failed to send" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ message: "Failed to send test email" });
    }
  });

  // Campaign performance routes - Admin only
  router.get("/admin/campaigns/:id/performance", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const performance = await marketingService.getCampaignPerformance(id);
      res.json(performance);
    } catch (error) {
      console.error("Error fetching campaign performance:", error);
      res.status(500).json({ message: "Failed to fetch campaign performance" });
    }
  });

  // Campaign analytics routes - Admin only
  router.get("/admin/marketing/overview", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const overview = await marketingService.getCampaignOverview();
      res.json(overview);
    } catch (error) {
      console.error("Error fetching marketing overview:", error);
      res.status(500).json({ message: "Failed to fetch marketing overview" });
    }
  });

  // Campaign interaction routes - For tracking clicks
  router.post("/campaigns/:id/click", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await marketingService.recordCampaignClick(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error recording campaign click:", error);
      res.status(500).json({ message: "Failed to record campaign click" });
    }
  });

  return router;
}