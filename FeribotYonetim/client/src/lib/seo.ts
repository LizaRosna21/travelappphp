/**
 * Advanced SEO utilities for client-side rendering
 * This file provides utilities for injecting Schema.org JSON-LD and meta tags
 */

interface SeoMeta {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  canonical: string;
}

/**
 * Fetches dynamic meta tags for the current page
 * @param path Current page path
 * @param lang Language code (optional)
 */
export async function fetchMetaTags(path: string, lang?: string): Promise<SeoMeta> {
  try {
    const url = new URL('/api/seo/meta', window.location.origin);
    url.searchParams.append('path', path);
    if (lang) url.searchParams.append('lang', lang);
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch meta tags: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching meta tags:', error);
    // Return default meta tags
    return {
      title: 'FerryBooking',
      description: 'Book ferry tickets online with the best prices',
      keywords: 'ferry, booking, tickets, travel',
      ogTitle: 'FerryBooking',
      ogDescription: 'Book ferry tickets online with the best prices',
      ogImage: '/og-image.jpg',
      ogUrl: window.location.href,
      twitterTitle: 'FerryBooking',
      twitterDescription: 'Book ferry tickets online with the best prices',
      twitterImage: '/twitter-card.jpg',
      canonical: window.location.href
    };
  }
}

/**
 * Fetches Schema.org JSON-LD data for a ferry route
 * @param routeId Route ID
 */
export async function fetchRouteSchema(routeId: number): Promise<object> {
  try {
    const response = await fetch(`/api/seo/schema/route/${routeId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch schema data: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching schema data:', error);
    // Return minimal schema
    return {
      "@context": "https://schema.org",
      "@type": "BoatTrip",
      "name": "Ferry Route"
    };
  }
}

/**
 * Fetches Schema.org JSON-LD data for a ferry company
 * @param companyId Company ID
 */
export async function fetchCompanySchema(companyId: number): Promise<object> {
  try {
    const response = await fetch(`/api/seo/schema/company/${companyId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch schema data: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching schema data:', error);
    // Return minimal schema
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Ferry Company"
    };
  }
}

/**
 * Creates a WebSite Schema.org JSON-LD object for the homepage
 */
export function createWebsiteSchema(siteName: string = 'FerryBooking'): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": siteName,
    "url": window.location.origin,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${window.location.origin}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

/**
 * Creates a BreadcrumbList Schema.org JSON-LD object
 * @param items Array of breadcrumb items [name, url]
 */
export function createBreadcrumbSchema(items: [string, string][]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item[0],
      "item": item[1]
    }))
  };
}

/**
 * Creates a LocalBusiness Schema.org JSON-LD object for local ferry operators
 */
export function createLocalBusinessSchema(
  name: string,
  description: string,
  city: string,
  country: string,
  phone: string = "+90 123 456 7890",
  email: string = "contact@ferrybooking.com"
): object {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    "name": name,
    "description": description,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": city,
      "addressCountry": country
    },
    "telephone": phone,
    "email": email,
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": [
          "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"
        ],
        "opens": "09:00",
        "closes": "18:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Saturday"],
        "opens": "10:00",
        "closes": "16:00"
      }
    ]
  };
}

/**
 * Creates FAQ Schema.org JSON-LD object for FAQ pages
 * @param faqs Array of FAQ items [question, answer]
 */
export function createFaqSchema(faqs: [string, string][]): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(([question, answer]) => ({
      "@type": "Question",
      "name": question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": answer
      }
    }))
  };
}

/**
 * Utility to safely add JSON-LD schema to document
 * @param schema Schema.org JSON-LD object
 */
export function injectSchema(schema: object): void {
  try {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  } catch (error) {
    console.error('Error injecting schema:', error);
  }
}

/**
 * Utility to add hreflang tags to document
 * @param url Current page URL
 * @param languages Array of language codes
 */
export function injectHreflangTags(url: string, languages: string[]): void {
  try {
    // Remove existing hreflang tags
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
    
    // Add hreflang tag for x-default (default language)
    const defaultLink = document.createElement('link');
    defaultLink.rel = 'alternate';
    defaultLink.hreflang = 'x-default';
    defaultLink.href = url;
    document.head.appendChild(defaultLink);
    
    // Add hreflang tags for each language
    languages.forEach(lang => {
      const langUrl = new URL(url);
      const urlParts = langUrl.pathname.split('/');
      
      // Check if URL already has a language code
      if (languages.includes(urlParts[1])) {
        urlParts[1] = lang;
      } else {
        urlParts.splice(1, 0, lang);
      }
      
      langUrl.pathname = urlParts.join('/');
      
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = lang;
      link.href = langUrl.toString();
      document.head.appendChild(link);
    });
  } catch (error) {
    console.error('Error injecting hreflang tags:', error);
  }
}

/**
 * Utility to generate dynamically structured data for routes
 */
export function generateDynamicRouteSchema(
  departureName: string, 
  departureCity: string,
  departureCountry: string,
  arrivalName: string, 
  arrivalCity: string,
  arrivalCountry: string,
  price: string,
  currency: string = "TRY",
  schedule: {departureTime: string, arrivalTime: string}[] = []
): object {
  return {
    "@context": "https://schema.org",
    "@type": "BoatTrip",
    "name": `Ferry from ${departureName} to ${arrivalName}`,
    "description": `Ferry service connecting ${departureName} (${departureCity}, ${departureCountry}) and ${arrivalName} (${arrivalCity}, ${arrivalCountry})`,
    "offers": {
      "@type": "Offer",
      "price": price,
      "priceCurrency": currency,
      "availability": "https://schema.org/InStock"
    },
    "departureBoatTerminal": {
      "@type": "BoatTerminal",
      "name": departureName,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": departureCity,
        "addressCountry": departureCountry
      }
    },
    "arrivalBoatTerminal": {
      "@type": "BoatTerminal",
      "name": arrivalName,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": arrivalCity,
        "addressCountry": arrivalCountry
      }
    },
    "itinerary": schedule.map(s => ({
      "@type": "ItemList",
      "itemListElement": [
        {
          "@type": "BoatTrip",
          "departureTime": s.departureTime,
          "arrivalTime": s.arrivalTime
        }
      ]
    }))
  };
}