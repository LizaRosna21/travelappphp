import React, { useEffect } from 'react';
import { 
  createWebsiteSchema, 
  createBreadcrumbSchema, 
  createFaqSchema, 
  createLocalBusinessSchema, 
  generateDynamicRouteSchema,
  injectSchema 
} from '@/lib/seo';

interface JsonLdProps {
  schema: object;
}

/**
 * Component for adding JSON-LD data to the page
 */
export const JsonLd: React.FC<JsonLdProps> = ({ schema }) => {
  useEffect(() => {
    // Create script element for JSON-LD
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.innerHTML = JSON.stringify(schema);
    
    // Append to document head
    document.head.appendChild(script);
    
    // Cleanup on unmount
    return () => {
      document.head.removeChild(script);
    };
  }, [schema]);
  
  return null; // This component doesn't render anything
};

/**
 * Component for Website schema
 */
export const WebsiteSchema: React.FC<{ siteName?: string }> = ({ siteName }) => {
  useEffect(() => {
    const schema = createWebsiteSchema(siteName);
    injectSchema(schema);
  }, [siteName]);
  
  return null;
};

/**
 * Component for Breadcrumb schema
 */
export const BreadcrumbSchema: React.FC<{ items: [string, string][] }> = ({ items }) => {
  useEffect(() => {
    const schema = createBreadcrumbSchema(items);
    injectSchema(schema);
  }, [items]);
  
  return null;
};

/**
 * Component for FAQ schema
 */
export const FaqSchema: React.FC<{ faqs: [string, string][] }> = ({ faqs }) => {
  useEffect(() => {
    const schema = createFaqSchema(faqs);
    injectSchema(schema);
  }, [faqs]);
  
  return null;
};

/**
 * Component for LocalBusiness schema
 */
export const LocalBusinessSchema: React.FC<{
  name: string;
  description: string;
  city: string;
  country: string;
  phone?: string;
  email?: string;
}> = ({ name, description, city, country, phone, email }) => {
  useEffect(() => {
    const schema = createLocalBusinessSchema(name, description, city, country, phone, email);
    injectSchema(schema);
  }, [name, description, city, country, phone, email]);
  
  return null;
};

/**
 * Component for Ferry Route schema
 */
export const RouteSchema: React.FC<{
  departureName: string;
  departureCity: string;
  departureCountry: string;
  arrivalName: string;
  arrivalCity: string;
  arrivalCountry: string;
  price: string;
  currency?: string;
  schedule?: {departureTime: string, arrivalTime: string}[];
}> = ({ 
  departureName, 
  departureCity,
  departureCountry,
  arrivalName, 
  arrivalCity,
  arrivalCountry,
  price,
  currency,
  schedule
}) => {
  useEffect(() => {
    const schema = generateDynamicRouteSchema(
      departureName, 
      departureCity, 
      departureCountry,
      arrivalName, 
      arrivalCity,
      arrivalCountry,
      price,
      currency,
      schedule
    );
    injectSchema(schema);
  }, [
    departureName, 
    departureCity,
    departureCountry,
    arrivalName, 
    arrivalCity,
    arrivalCountry,
    price,
    currency,
    schedule
  ]);
  
  return null;
};

/**
 * Combined schema for homepage
 * Includes website, local business, and optional FAQ schemas
 */
export const HomePageSchema: React.FC<{
  siteName?: string;
  businessName?: string;
  businessDescription?: string;
  businessCity?: string;
  businessCountry?: string;
  faqs?: [string, string][];
}> = ({ 
  siteName = "FerryBooking",
  businessName = "FerryBooking",
  businessDescription = "Online ferry ticket booking service",
  businessCity = "Istanbul",
  businessCountry = "Turkey",
  faqs
}) => {
  useEffect(() => {
    // Add website schema
    injectSchema(createWebsiteSchema(siteName));
    
    // Add local business schema
    injectSchema(createLocalBusinessSchema(
      businessName,
      businessDescription,
      businessCity,
      businessCountry
    ));
    
    // Add FAQ schema if provided
    if (faqs && faqs.length > 0) {
      injectSchema(createFaqSchema(faqs));
    }
  }, [
    siteName,
    businessName,
    businessDescription,
    businessCity,
    businessCountry,
    faqs
  ]);
  
  return null;
};