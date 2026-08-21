import React from 'react';
import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet';
import { 
  generateWebsiteSchema, 
  generateFerryTripSchema, 
  generateOrganizationSchema,
  generateBreadcrumbSchema 
} from '@/lib/schema';

interface SchemaOrgProviderProps {
  children: React.ReactNode;
  siteName: string;
  siteUrl: string;
  logoUrl: string;
  route?: any;
  destination?: any;
  schedule?: any;
  page?: any;
  booking?: any;
  companyInfo?: {
    name: string;
    contactPhone?: string;
    contactEmail?: string;
    contactType?: string;
  };
}

/**
 * Schema.org yapılandırılmış verilerini uygulama genelinde sağlayan bileşen
 * Çeşitli sayfalarda kullanılabilir, sayfa türüne göre doğru şemayı oluşturur
 */
export default function SchemaOrgProvider({
  children,
  siteName,
  siteUrl,
  logoUrl,
  route,
  destination,
  schedule,
  page,
  booking,
  companyInfo = { 
    name: siteName, 
    contactPhone: '+902124441234', 
    contactEmail: 'info@ferryticket.com',
    contactType: 'customer service'
  }
}: SchemaOrgProviderProps) {
  const [location] = useLocation();
  
  // Temel website şeması - her zaman dahil edilir
  const websiteSchema = generateWebsiteSchema(siteName, siteUrl, 'TravelAgency');
  
  // Organizasyon şeması - her zaman dahil edilir
  const organizationSchema = generateOrganizationSchema(
    companyInfo.name,
    siteUrl,
    `${siteUrl}${logoUrl}`,
    {
      telephone: companyInfo.contactPhone || '',
      contactType: companyInfo.contactType || 'customer service',
      email: companyInfo.contactEmail
    },
    'Organization'
  );

  // Breadcrumb listesi (mevcut URL yoluna göre)
  const breadcrumbItems = generateBreadcrumbItems(location, {
    route,
    destination,
    page
  });
  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);
  
  // Eğer bir feribot rotası görüntüleniyorsa, uygun şemayı ekle
  let ferryTripSchema: Record<string, any> | null = null;
  
  if (route && schedule) {
    ferryTripSchema = generateFerryTripSchema(
      `${route.departurePort} - ${route.arrivalPort} Ferry Trip`,
      `Ferry trip from ${route.departurePort} to ${route.arrivalPort}`,
      siteName,
      schedule.departureTime,
      schedule.arrivalTime,
      {
        name: route.departurePort,
        address: {
          addressCountry: route.countryDeparture || 'Turkey',
          addressLocality: route.departurePort.split(' ')[0]
        }
      },
      {
        name: route.arrivalPort,
        address: {
          addressCountry: route.countryArrival || 'Greece',
          addressLocality: route.arrivalPort.split(' ')[0]
        }
      },
      {
        price: route.basePrice,
        priceCurrency: 'EUR',
        url: `${siteUrl}/routes/${route.id}`
      }
    );
  }
  
  // Tüm şemaları bir araya getir
  const schemas = [
    websiteSchema,
    organizationSchema,
    breadcrumbSchema,
    ...(ferryTripSchema ? [ferryTripSchema] : [])
  ];
  
  return (
    <>
      <Helmet>
        {schemas.map((schema, index) => (
          <script key={index} type="application/ld+json">
            {JSON.stringify(schema)}
          </script>
        ))}
      </Helmet>
      {children}
    </>
  );
}

/**
 * Mevcut URL'ye göre breadcrumb öğelerini oluşturur
 */
function generateBreadcrumbItems(
  location: string,
  pageContext: {
    route?: any;
    destination?: any;
    page?: any;
  }
): { name: string; url: string }[] {
  const { route, destination, page } = pageContext;
  const items: { name: string; url: string }[] = [
    { name: 'Home', url: '/' }
  ];
  
  const pathParts = location.split('/').filter(Boolean);
  
  if (pathParts.length === 0) return items;
  
  // Her yol parçası için breadcrumb oluştur
  let currentPath = '';
  
  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    currentPath += `/${part}`;
    
    // Farklı sayfa türleri için özel isimlendirme
    let name = part.charAt(0).toUpperCase() + part.slice(1);
    
    // Rota sayfası için özel işleme
    if (part === 'routes' && route && pathParts[i+1] && pathParts[i+1] === route.id.toString()) {
      items.push({ name: 'Routes', url: '/routes' });
      items.push({
        name: `${route.departurePort} - ${route.arrivalPort}`,
        url: `/routes/${route.id}`
      });
      break; // Rota detayını ekledikten sonra döngüyü sonlandır
    }
    
    // Destinasyon sayfası için özel işleme
    else if (part === 'destinations' && destination && pathParts[i+1] && pathParts[i+1] === destination.id.toString()) {
      items.push({ name: 'Destinations', url: '/destinations' });
      items.push({
        name: destination.name,
        url: `/destinations/${destination.id}`
      });
      break; // Destinasyon detayını ekledikten sonra döngüyü sonlandır
    }
    
    // İçerik sayfası için özel işleme
    else if (part === 'pages' && page && pathParts[i+1] && pathParts[i+1] === page.slug) {
      items.push({
        name: page.title,
        url: `/pages/${page.slug}`
      });
      break; // Sayfa detayını ekledikten sonra döngüyü sonlandır
    }
    
    // Standart breadcrumb öğesi
    else {
      items.push({ name, url: currentPath });
    }
  }
  
  return items;
}