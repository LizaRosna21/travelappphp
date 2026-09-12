import { Router } from 'express';
import path from 'path';
import { SitemapGenerator } from '../services/sitemap-generator';
import { storage } from '../storage';

export const sitemapRouter = Router();

// Ana sitemap endpoint'i - XML dosyası döndürür
sitemapRouter.get('/sitemap.xml', async (req, res) => {
  try {
    // Host name'i al
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('x-forwarded-host') || req.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    // Sitemap generator oluştur ve XML dosyasını oluştur
    const generator = new SitemapGenerator(baseUrl);
    const sitemapPath = await generator.generateSitemap();
    
    // XML dosyasını gönder
    res.header('Content-Type', 'application/xml');
    res.sendFile(path.resolve(sitemapPath));
  } catch (error) {
    console.error('Sitemap servis edilirken hata:', error);
    res.status(500).send('Sitemap oluşturulurken bir hata oluştu');
  }
});

// Robots.txt için endpoint
sitemapRouter.get('/robots.txt', (req, res) => {
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  const baseUrl = `${protocol}://${host}`;
  
  const robotsTxt = `
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /payment-processing/
Disallow: /auth/
Disallow: /private/

Sitemap: ${baseUrl}/sitemap.xml
  `.trim();
  
  res.header('Content-Type', 'text/plain');
  res.send(robotsTxt);
});

// Site haritası için HTML sayfası (insan tarafından okunabilir)
sitemapRouter.get('/site-map', async (req, res) => {
  try {
    // Tüm site yapısını toplama
    const routes = await storage.getAllRoutes();
    const destinations = await storage.getAllDestinations();
    const pages = await storage.getAllPages();
    
    res.render('sitemap', {
      title: 'Site Haritası',
      routes,
      destinations,
      pages
    });
  } catch (error) {
    console.error('Site haritası servis edilirken hata:', error);
    res.status(500).send('Site haritası oluşturulurken bir hata oluştu');
  }
});