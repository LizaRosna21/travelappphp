import fs from 'fs';
import path from 'path';
import { storage } from '../storage';

export class SitemapGenerator {
  private baseUrl: string;
  private outputPath: string;
  private urls: Array<{
    loc: string;
    lastmod?: string;
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority?: number;
  }>;

  constructor(baseUrl: string, outputPath: string = 'public/sitemap.xml') {
    this.baseUrl = baseUrl;
    this.outputPath = outputPath;
    this.urls = [];
  }

  /**
   * Statik sayfalar için sitemap girdileri ekler
   */
  private async addStaticPages() {
    // Ana sayfa
    this.urls.push({
      loc: `${this.baseUrl}/`,
      changefreq: 'daily',
      priority: 1.0
    });

    // Diğer statik sayfalar
    const staticPages = [
      { url: '/about', changefreq: 'monthly', priority: 0.8 },
      { url: '/contact', changefreq: 'monthly', priority: 0.8 },
      { url: '/faq', changefreq: 'monthly', priority: 0.7 },
      { url: '/terms', changefreq: 'yearly', priority: 0.5 },
      { url: '/privacy', changefreq: 'yearly', priority: 0.5 },
      { url: '/search', changefreq: 'weekly', priority: 0.9 },
    ];

    staticPages.forEach(page => {
      this.urls.push({
        loc: `${this.baseUrl}${page.url}`,
        changefreq: page.changefreq as any,
        priority: page.priority
      });
    });

    // CMS sayfalarını ekle
    try {
      const pages = await storage.getAllPages();
      pages.forEach(page => {
        if (page.isActive) {
          this.urls.push({
            loc: `${this.baseUrl}/pages/${page.slug}`,
            lastmod: new Date(page.updatedAt).toISOString().split('T')[0],
            changefreq: 'monthly',
            priority: 0.7
          });
        }
      });
    } catch (error) {
      console.error('CMS sayfalarını alırken hata:', error);
    }
  }

  /**
   * Rota sayfaları için sitemap girdileri ekler
   */
  private async addRoutePages() {
    try {
      const routes = await storage.getAllRoutes();
      routes.forEach(route => {
        if (route.isActive) {
          this.urls.push({
            loc: `${this.baseUrl}/routes/${route.id}`,
            changefreq: 'weekly',
            priority: 0.9
          });
        }
      });
    } catch (error) {
      console.error('Rotaları alırken hata:', error);
    }
  }

  /**
   * Destinasyon sayfaları için sitemap girdileri ekler
   */
  private async addDestinationPages() {
    try {
      const destinations = await storage.getAllDestinations();
      destinations.forEach(destination => {
        if (destination.isActive) {
          this.urls.push({
            loc: `${this.baseUrl}/destinations/${destination.id}`,
            lastmod: new Date(destination.updatedAt).toISOString().split('T')[0],
            changefreq: 'weekly',
            priority: 0.8
          });
        }
      });
    } catch (error) {
      console.error('Destinasyonları alırken hata:', error);
    }
  }

  /**
   * Rota kombinasyonları için arama sayfaları ekler (SEO için önemli)
   */
  private async addSearchCombinationPages() {
    try {
      const routes = await storage.getAllRoutes();
      const activeRoutes = routes.filter(r => r.isActive);
      
      // En popüler rota kombinasyonlarını ekle
      const popularCombinations = new Set<string>();
      
      activeRoutes.forEach(route => {
        popularCombinations.add(`${this.baseUrl}/search?from=${encodeURIComponent(route.departurePort)}`);
        popularCombinations.add(`${this.baseUrl}/search?to=${encodeURIComponent(route.arrivalPort)}`);
        popularCombinations.add(`${this.baseUrl}/search?from=${encodeURIComponent(route.departurePort)}&to=${encodeURIComponent(route.arrivalPort)}`);
      });
      
      // Set'ten URL'leri al ve sitemap'e ekle
      [...popularCombinations].forEach(url => {
        this.urls.push({
          loc: url,
          changefreq: 'weekly',
          priority: 0.8
        });
      });
    } catch (error) {
      console.error('Arama kombinasyonlarını eklerken hata:', error);
    }
  }

  /**
   * XML sitemap dosyasını oluşturur
   */
  private generateSitemapXML(): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    this.urls.forEach(url => {
      xml += '  <url>\n';
      xml += `    <loc>${url.loc}</loc>\n`;
      
      if (url.lastmod) {
        xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
      }
      
      if (url.changefreq) {
        xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
      }
      
      if (url.priority !== undefined) {
        xml += `    <priority>${url.priority.toFixed(1)}</priority>\n`;
      }
      
      xml += '  </url>\n';
    });

    xml += '</urlset>';
    return xml;
  }

  /**
   * Sitemap'i generate eder ve kaydeder
   */
  public async generateSitemap(): Promise<string> {
    // URL'leri ekle
    await this.addStaticPages();
    await this.addRoutePages();
    await this.addDestinationPages();
    await this.addSearchCombinationPages();

    // XML oluştur
    const xml = this.generateSitemapXML();
    
    // Dizin yoksa oluştur
    const dir = path.dirname(this.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Dosyaya yaz
    fs.writeFileSync(this.outputPath, xml);
    
    return this.outputPath;
  }
}