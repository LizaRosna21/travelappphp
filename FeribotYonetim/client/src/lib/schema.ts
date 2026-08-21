/**
 * Schema.org yapılandırılmış verilerini üretmek için yardımcı fonksiyonlar
 */

type WebsiteType = 'WebSite' | 'TravelAgency' | 'LocalBusiness';
type FaqPageType = 'FAQPage';
type BreadcrumbType = 'BreadcrumbList';
type FerryType = 'BoatTrip' | 'BoatReservation';
type OrganizationType = 'Organization' | 'LocalBusiness';

/**
 * Temel website şeması
 */
export function generateWebsiteSchema(siteName: string, url: string, type: WebsiteType = 'WebSite'): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': type,
    name: siteName,
    url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${url}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };
}

/**
 * Organizasyon şeması
 */
export function generateOrganizationSchema(
  name: string,
  url: string,
  logoUrl: string,
  contactPoint?: {
    telephone?: string;
    contactType?: string;
    email?: string;
  },
  type: OrganizationType = 'Organization'
): Record<string, any> {
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': type,
    name,
    url,
    logo: logoUrl
  };

  if (contactPoint) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      ...contactPoint
    };
  }

  return schema;
}

/**
 * SSS sayfası şeması
 */
export function generateFaqSchema(faqs: { question: string; answer: string }[]): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}

/**
 * Ekmek kırıntısı (breadcrumb) şeması
 */
export function generateBreadcrumbSchema(items: { name: string; url: string }[]): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

/**
 * Feribot rotası/seferi şeması
 */
export function generateFerryTripSchema(
  name: string,
  description: string,
  provider: string,
  departureTime: string,
  arrivalTime: string,
  departureBoatTerminal: {
    name?: string;
    address: {
      addressCountry: string;
      addressLocality: string;
    };
  },
  arrivalBoatTerminal: {
    name?: string;
    address: {
      addressCountry: string;
      addressLocality: string;
    };
  },
  offer: {
    price: string;
    priceCurrency: string;
    url: string;
  }
): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BoatTrip',
    name,
    description,
    departureBoatTerminal: {
      '@type': 'BoatTerminal',
      name: departureBoatTerminal.name,
      address: {
        '@type': 'PostalAddress',
        addressCountry: departureBoatTerminal.address.addressCountry,
        addressLocality: departureBoatTerminal.address.addressLocality
      }
    },
    arrivalBoatTerminal: {
      '@type': 'BoatTerminal',
      name: arrivalBoatTerminal.name,
      address: {
        '@type': 'PostalAddress',
        addressCountry: arrivalBoatTerminal.address.addressCountry,
        addressLocality: arrivalBoatTerminal.address.addressLocality
      }
    },
    departureTime,
    arrivalTime,
    provider: {
      '@type': 'Organization',
      name: provider
    },
    offers: {
      '@type': 'Offer',
      price: offer.price,
      priceCurrency: offer.priceCurrency,
      availability: 'https://schema.org/InStock',
      url: offer.url
    }
  };
}

/**
 * Feribot rezervasyonu şeması
 */
export function generateFerryReservationSchema(
  reservationId: string,
  bookingTime: string,
  modifiedTime: string | null,
  status: string,
  underName: {
    name: string;
    email?: string;
    phone?: string;
  },
  reservationFor: {
    name: string;
    departureTime: string;
    arrivalTime: string;
    departureBoatTerminal: {
      name: string;
      address: {
        addressCountry: string;
        addressLocality: string;
      };
    },
    arrivalBoatTerminal: {
      name: string;
      address: {
        addressCountry: string;
        addressLocality: string;
      };
    },
  },
  totalPrice: {
    value: string;
    currency: string;
  },
  priceCurrency: string,
  provider: {
    name: string;
    url?: string;
  }
): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BoatReservation',
    reservationId,
    reservationStatus: `https://schema.org/${status}`,
    bookingTime,
    ...(modifiedTime && { modifiedTime }),
    underName: {
      '@type': 'Person',
      name: underName.name,
      ...(underName.email && { email: underName.email }),
      ...(underName.phone && { telephone: underName.phone })
    },
    reservationFor: {
      '@type': 'BoatTrip',
      name: reservationFor.name,
      departureTime: reservationFor.departureTime,
      arrivalTime: reservationFor.arrivalTime,
      departureBoatTerminal: {
        '@type': 'BoatTerminal',
        name: reservationFor.departureBoatTerminal.name,
        address: {
          '@type': 'PostalAddress',
          addressCountry: reservationFor.departureBoatTerminal.address.addressCountry,
          addressLocality: reservationFor.departureBoatTerminal.address.addressLocality
        }
      },
      arrivalBoatTerminal: {
        '@type': 'BoatTerminal',
        name: reservationFor.arrivalBoatTerminal.name,
        address: {
          '@type': 'PostalAddress',
          addressCountry: reservationFor.arrivalBoatTerminal.address.addressCountry,
          addressLocality: reservationFor.arrivalBoatTerminal.address.addressLocality
        }
      }
    },
    totalPrice: {
      '@type': 'PriceSpecification',
      price: totalPrice.value,
      priceCurrency: totalPrice.currency
    },
    provider: {
      '@type': 'Organization',
      name: provider.name,
      ...(provider.url && { url: provider.url })
    }
  };
}

/**
 * Schema.org yapılandırılmış verilerini HTML head'e eklemek için 
 * Genellikle _document.tsx veya SEO bileşeniyle kullanılır
 */
export function renderSchemaJsonLd(schema: Record<string, any>): string {
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}