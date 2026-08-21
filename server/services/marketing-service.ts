import { InsertCampaign, Campaign, InsertCoupon, Coupon, InsertMarketingEmail, MarketingEmail, 
  InsertCustomerSegment, CustomerSegment, InsertCampaignPerformance, CampaignPerformance } from "@shared/schema";
import { IStorage } from "../storage";
import { WebSocket } from "ws";

interface CustomWebSocket extends WebSocket {
  campaignSubscriptions?: number[];
}

export class MarketingService {
  constructor(private storage: IStorage, private wss: WebSocket.Server) {}

  // Campaign methods with enhanced functionality
  async getCampaign(id: number): Promise<Campaign | undefined> {
    return this.storage.getCampaign(id);
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    return this.storage.getAllCampaigns();
  }

  async getActiveCampaigns(): Promise<Campaign[]> {
    return this.storage.getActiveCampaigns();
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const createdCampaign = await this.storage.createCampaign(campaign);
    
    // Broadcast to all admin users
    this.broadcastToAdmins({
      type: 'campaign_created',
      data: { 
        id: createdCampaign.id, 
        name: createdCampaign.name,
        code: createdCampaign.code
      }
    });
    
    return createdCampaign;
  }

  async updateCampaign(id: number, campaign: Partial<Campaign>): Promise<Campaign | undefined> {
    const updatedCampaign = await this.storage.updateCampaign(id, campaign);
    
    if (updatedCampaign) {
      // Broadcast to all admin users and subscribers
      this.broadcastToCampaign(id, {
        type: 'campaign_updated',
        data: { 
          id: updatedCampaign.id, 
          name: updatedCampaign.name,
          code: updatedCampaign.code,
          isActive: updatedCampaign.isActive
        }
      });
    }
    
    return updatedCampaign;
  }

  async deleteCampaign(id: number): Promise<boolean> {
    const deleted = await this.storage.deleteCampaign(id);
    
    if (deleted) {
      // Broadcast to all admin users
      this.broadcastToAdmins({
        type: 'campaign_deleted',
        data: { id }
      });
    }
    
    return deleted;
  }

  // Coupon methods
  async getCouponsByCampaign(campaignId: number): Promise<Coupon[]> {
    return this.storage.getCouponsByCampaignId(campaignId);
  }

  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    const createdCoupon = await this.storage.createCoupon(coupon);
    
    // Broadcast to campaign subscribers
    if (coupon.campaignId) {
      this.broadcastToCampaign(coupon.campaignId, {
        type: 'coupon_created',
        data: { 
          id: createdCoupon.id, 
          code: createdCoupon.code,
          campaignId: createdCoupon.campaignId
        }
      });
    }
    
    return createdCoupon;
  }

  async validateCoupon(code: string): Promise<{ valid: boolean; coupon?: Coupon; message?: string }> {
    return this.storage.validateCoupon(code);
  }

  // Customer segment methods
  async getCustomerSegments(): Promise<CustomerSegment[]> {
    return this.storage.getAllCustomerSegments();
  }

  async createCustomerSegment(segment: InsertCustomerSegment): Promise<CustomerSegment> {
    const createdSegment = await this.storage.createCustomerSegment(segment);
    
    // Calculate segment size
    await this.calculateSegmentSize(createdSegment.id);
    
    return createdSegment;
  }

  async calculateSegmentSize(id: number): Promise<CustomerSegment | undefined> {
    return this.storage.calculateSegmentSize(id);
  }

  // Marketing email methods
  async getMarketingEmails(campaignId?: number): Promise<MarketingEmail[]> {
    if (campaignId) {
      return this.storage.getMarketingEmailsByCampaignId(campaignId);
    }
    
    // Get all emails if no campaign ID provided
    // We'll need to add this method to the storage interface
    const campaigns = await this.storage.getAllCampaigns();
    
    let allEmails: MarketingEmail[] = [];
    for (const campaign of campaigns) {
      const emails = await this.storage.getMarketingEmailsByCampaignId(campaign.id);
      allEmails = [...allEmails, ...emails];
    }
    
    return allEmails;
  }

  async createMarketingEmail(email: InsertMarketingEmail): Promise<MarketingEmail> {
    return this.storage.createMarketingEmail(email);
  }

  async sendTestEmail(emailId: number, testRecipient: string): Promise<boolean> {
    const email = await this.storage.getMarketingEmail(emailId);
    if (!email) {
      return false;
    }
    
    // Here we would integrate with an actual email sending service
    // For now, we'll just return true to simulate success
    console.log(`Sending test email to ${testRecipient}: ${email.subject}`);
    return true;
  }

  // Campaign performance methods
  async getCampaignPerformance(campaignId: number): Promise<CampaignPerformance[]> {
    return this.storage.getCampaignPerformanceByCampaignId(campaignId);
  }

  async recordCampaignView(campaignId: number): Promise<void> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // Get today's performance record or create new
    const performances = await this.storage.getCampaignPerformanceByCampaignId(campaignId);
    const todayPerformance = performances.find(p => p.date === dateStr);
    
    if (todayPerformance) {
      // Increment views
      await this.storage.updateCampaignPerformance(todayPerformance.id, {
        views: todayPerformance.views + 1
      });
    } else {
      // Create new performance record
      await this.storage.createCampaignPerformance({
        campaignId,
        date: dateStr,
        views: 1,
        clicks: 0,
        conversions: 0,
        revenue: "0",
        cost: "0",
        bookingCount: 0,
        customerCount: 0,
        avgTicketValue: "0"
      });
    }
  }

  async recordCampaignClick(campaignId: number): Promise<void> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // Get today's performance record or create new
    const performances = await this.storage.getCampaignPerformanceByCampaignId(campaignId);
    const todayPerformance = performances.find(p => p.date === dateStr);
    
    if (todayPerformance) {
      // Increment clicks
      await this.storage.updateCampaignPerformance(todayPerformance.id, {
        clicks: todayPerformance.clicks + 1
      });
    } else {
      // Create new performance record
      await this.storage.createCampaignPerformance({
        campaignId,
        date: dateStr,
        views: 0,
        clicks: 1,
        conversions: 0,
        revenue: "0",
        cost: "0",
        bookingCount: 0,
        customerCount: 0,
        avgTicketValue: "0"
      });
    }
  }

  async recordCampaignConversion(campaignId: number, revenue: string): Promise<void> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // Get today's performance record or create new
    const performances = await this.storage.getCampaignPerformanceByCampaignId(campaignId);
    const todayPerformance = performances.find(p => p.date === dateStr);
    
    if (todayPerformance) {
      // Increment conversions and add revenue
      const updatedRevenue = (parseFloat(todayPerformance.revenue) + parseFloat(revenue)).toString();
      await this.storage.updateCampaignPerformance(todayPerformance.id, {
        conversions: todayPerformance.conversions + 1,
        revenue: updatedRevenue,
        bookingCount: todayPerformance.bookingCount + 1
      });
    } else {
      // Create new performance record
      await this.storage.createCampaignPerformance({
        campaignId,
        date: dateStr,
        views: 0,
        clicks: 0,
        conversions: 1,
        revenue,
        cost: "0",
        bookingCount: 1,
        customerCount: 1,
        avgTicketValue: revenue
      });
    }
  }

  // WebSocket helpers
  private broadcastToAdmins(message: any): void {
    const clients = this.wss.clients as Set<CustomWebSocket>;
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.role === 'admin') {
        client.send(JSON.stringify(message));
      }
    });
  }

  private broadcastToCampaign(campaignId: number, message: any): void {
    const clients = this.wss.clients as Set<CustomWebSocket>;
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && 
          (client.campaignSubscriptions?.includes(campaignId) || client.role === 'admin')) {
        client.send(JSON.stringify(message));
      }
    });
  }

  // Analytics methods
  async getCampaignOverview(): Promise<any> {
    const campaigns = await this.storage.getAllCampaigns();
    const activeCampaigns = await this.storage.getActiveCampaigns();
    
    // Get total figures
    let totalViews = 0;
    let totalClicks = 0;
    let totalConversions = 0;
    let totalRevenue = 0;
    
    for (const campaign of campaigns) {
      const performances = await this.storage.getCampaignPerformanceByCampaignId(campaign.id);
      
      for (const perf of performances) {
        totalViews += perf.views;
        totalClicks += perf.clicks;
        totalConversions += perf.conversions;
        totalRevenue += parseFloat(perf.revenue);
      }
    }
    
    // Calculate overall CTR and conversion rate
    const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    
    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: activeCampaigns.length,
      totalViews,
      totalClicks,
      totalConversions,
      totalRevenue,
      ctr,
      conversionRate
    };
  }
}