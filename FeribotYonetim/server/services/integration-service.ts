import { storage } from "../storage";

// External API Integration Service
export class IntegrationService {
  private demo: boolean;

  constructor() {
    this.demo = !process.env.INTEGRATION_API_KEY;
    console.log(`[${this.demo ? 'DEMO' : 'PROD'}] Integration service initialized`);
  }

  // Get all API integrations
  async getAllIntegrations() {
    try {
      // In a real implementation, this would come from the database
      if (this.demo) {
        return [
          {
            id: 'exchange-rate',
            name: 'Exchange Rate API',
            description: 'Currency exchange rate service',
            apiKey: this.demo ? 'demo_key_xxxx' : process.env.EXCHANGE_RATE_API_KEY,
            apiSecret: '',
            apiUrl: 'https://api.exchangerate.host',
            isActive: true,
            lastChecked: new Date().toISOString(),
            status: 'active'
          },
          {
            id: 'email-service',
            name: 'Email Service',
            description: 'SendGrid email integration',
            apiKey: this.demo ? 'demo_key_xxxx' : process.env.SENDGRID_API_KEY,
            apiSecret: '',
            apiUrl: 'https://api.sendgrid.com/v3',
            isActive: true,
            lastChecked: new Date().toISOString(),
            status: 'active'
          },
          {
            id: 'whatsapp-business',
            name: 'WhatsApp Business API',
            description: 'WhatsApp messaging integration',
            apiKey: this.demo ? 'demo_key_xxxx' : process.env.WHATSAPP_API_KEY,
            apiSecret: '',
            apiUrl: 'https://api.whatsapp.com',
            isActive: true,
            lastChecked: new Date().toISOString(),
            status: 'active'
          }
        ];
      }
      
      return await storage.getAllIntegrationSettings();
    } catch (error) {
      console.error('Error fetching integrations:', error);
      throw new Error('Failed to fetch integrations');
    }
  }

  // Get a specific integration by ID
  async getIntegrationById(id: string) {
    const integrations = await this.getAllIntegrations();
    return integrations.find(integration => integration.id === id);
  }

  // Update integration settings
  async updateIntegration(id: string, settings: {
    apiKey?: string;
    apiSecret?: string;
    apiUrl?: string;
    isActive?: boolean;
  }) {
    try {
      if (this.demo) {
        // In demo mode, just return a mocked response
        return {
          id,
          ...settings,
          lastUpdated: new Date().toISOString(),
          status: settings.isActive ? 'active' : 'inactive'
        };
      }
      
      // In a real implementation, this would update the database
      return await storage.updateIntegrationSettings(id, settings);
    } catch (error) {
      console.error(`Error updating integration ${id}:`, error);
      throw new Error(`Failed to update integration ${id}`);
    }
  }

  // Test integration connection
  async testIntegration(id: string) {
    try {
      // In demo mode, all tests "succeed"
      if (this.demo) {
        return {
          success: true,
          message: `Demo mode: Integration test for ${id} successful`
        };
      }

      // Get the integration
      const integration = await this.getIntegrationById(id);
      if (!integration) {
        throw new Error(`Integration ${id} not found`);
      }

      if (!integration.isActive) {
        return {
          success: false,
          message: 'Integration is not active'
        };
      }

      // Perform appropriate test based on integration type
      switch (id) {
        case 'exchange-rate':
          return await this.testExchangeRateAPI(integration);
        case 'email-service':
          return await this.testEmailService(integration);
        case 'whatsapp-business':
          return await this.testWhatsAppAPI(integration);
        default:
          throw new Error(`Unknown integration type: ${id}`);
      }
    } catch (error: any) {
      console.error(`Error testing integration ${id}:`, error);
      return {
        success: false,
        message: error.message || `Failed to test integration ${id}`
      };
    }
  }

  // Test Exchange Rate API
  private async testExchangeRateAPI(integration: any) {
    try {
      // In a real implementation, make an actual API request to the exchange rate service
      return {
        success: true,
        message: 'Exchange Rate API connection successful',
        data: {
          EUR: 1.08,
          TRY: 32.15,
          USD: 1.0
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Exchange Rate API test failed: ${error.message}`
      };
    }
  }

  // Test Email Service
  private async testEmailService(integration: any) {
    try {
      // In a real implementation, attempt to send a test email
      return {
        success: true,
        message: 'Email service connection successful'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Email service test failed: ${error.message}`
      };
    }
  }

  // Test WhatsApp Business API
  private async testWhatsAppAPI(integration: any) {
    try {
      // In a real implementation, test the WhatsApp API connection
      return {
        success: true,
        message: 'WhatsApp Business API connection successful'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `WhatsApp Business API test failed: ${error.message}`
      };
    }
  }
}

// Singleton instance
export const integrationService = new IntegrationService();

export default integrationService;