import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useLocation } from 'wouter';
import { fetchMetaTags } from '@/lib/seo';
import { useQuery } from '@tanstack/react-query';

interface MetaTagsProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  language?: string;
  schema?: object;
}

/**
 * SEO Component for adding meta tags to page head
 * 
 * If props are provided, they override the dynamic meta tags fetched from API
 */
export function MetaTags({
  title,
  description,
  keywords,
  ogImage,
  language,
  schema
}: MetaTagsProps) {
  const [location] = useLocation();
  const [schemaMarkup, setSchemaMarkup] = useState<string | null>(null);
  
  // Fetch meta tags from API
  const { data: metaTags } = useQuery({
    queryKey: ['/api/seo/meta', location, language],
    queryFn: async () => {
      const data = await fetchMetaTags(location, language);
      return data;
    },
    // Don't refetch unnecessarily
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Set schema JSON-LD
  useEffect(() => {
    if (schema) {
      setSchemaMarkup(JSON.stringify(schema));
    }
  }, [schema]);
  
  if (!metaTags) {
    return null;
  }
  
  // Override meta tags with props if provided
  const meta = {
    title: title || metaTags.title,
    description: description || metaTags.description,
    keywords: keywords || metaTags.keywords,
    ogTitle: title || metaTags.ogTitle,
    ogDescription: description || metaTags.ogDescription,
    ogImage: ogImage || metaTags.ogImage,
    ogUrl: metaTags.ogUrl,
    twitterTitle: title || metaTags.twitterTitle,
    twitterDescription: description || metaTags.twitterDescription,
    twitterImage: ogImage || metaTags.twitterImage,
    canonical: metaTags.canonical
  };
  
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta name="keywords" content={meta.keywords} />
      
      {/* Canonical Link */}
      <link rel="canonical" href={meta.canonical} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={meta.ogTitle} />
      <meta property="og:description" content={meta.ogDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={meta.ogUrl} />
      <meta property="og:image" content={meta.ogImage} />
      <meta property="og:site_name" content="FerryBooking" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.twitterTitle} />
      <meta name="twitter:description" content={meta.twitterDescription} />
      <meta name="twitter:image" content={meta.twitterImage} />
      
      {/* Mobile Meta Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#0C4B7D" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      
      {/* Schema.org JSON-LD */}
      {schemaMarkup && (
        <script type="application/ld+json">{schemaMarkup}</script>
      )}
      
      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    </Helmet>
  );
}

/**
 * SEO Component for Ferry Route pages
 */
export function RouteMetaTags({ routeId, language, schema }: { 
  routeId: number, 
  language?: string,
  schema?: object
}) {
  const { data: route } = useQuery({
    queryKey: ['/api/routes', routeId],
    enabled: !!routeId
  });
  
  if (!route) return <MetaTags />;
  
  return (
    <MetaTags
      title={`${route.departurePort} to ${route.arrivalPort} Ferry | FerryBooking`}
      description={`Book ferry tickets from ${route.departurePort} to ${route.arrivalPort}. View schedules, prices and availability.`}
      keywords={`${route.departurePort}, ${route.arrivalPort}, ferry, ticket, booking`}
      language={language}
      schema={schema}
    />
  );
}

/**
 * SEO Component for Port pages
 */
export function PortMetaTags({ portId, language, schema }: { 
  portId: number, 
  language?: string,
  schema?: object
}) {
  const { data: port } = useQuery({
    queryKey: ['/api/ports', portId],
    enabled: !!portId
  });
  
  if (!port) return <MetaTags />;
  
  return (
    <MetaTags
      title={`${port.name} | Ferry Port Information | FerryBooking`}
      description={`Information about ${port.name} ferry port in ${port.city}, ${port.country}. Routes, facilities and more.`}
      keywords={`${port.name}, ${port.city}, ${port.country}, ferry port, terminal`}
      language={language}
      schema={schema}
    />
  );
}

/**
 * SEO Component for Ferry Company pages
 */
export function CompanyMetaTags({ companyId, language, schema }: { 
  companyId: number, 
  language?: string,
  schema?: object
}) {
  const { data: company } = useQuery({
    queryKey: ['/api/ferry-companies', companyId],
    enabled: !!companyId
  });
  
  if (!company) return <MetaTags />;
  
  return (
    <MetaTags
      title={`${company.name} | Ferry Operator | FerryBooking`}
      description={`Information about ${company.name} ferry operator. Routes, fleet and services.`}
      keywords={`${company.name}, ferry operator, ferry company`}
      language={language}
      schema={schema}
    />
  );
}

/**
 * SEO Component for Search Results pages
 */
export function SearchMetaTags({ 
  departurePort, 
  arrivalPort, 
  language 
}: { 
  departurePort?: string, 
  arrivalPort?: string, 
  language?: string 
}) {
  const title = departurePort && arrivalPort
    ? `${departurePort} to ${arrivalPort} Ferry Tickets | Search Results | FerryBooking`
    : 'Search Ferry Routes | FerryBooking';
    
  const description = departurePort && arrivalPort
    ? `Find ferry schedules and tickets from ${departurePort} to ${arrivalPort}. Compare prices and book online.`
    : 'Search and compare ferry routes, schedules and ticket prices. Book ferry tickets online.';
    
  return (
    <MetaTags
      title={title}
      description={description}
      keywords={`ferry search, ${departurePort || ''}, ${arrivalPort || ''}, ferry tickets, booking`}
      language={language}
    />
  );
}