import { Helmet } from 'react-helmet';
import { renderSchemaJsonLd } from '@/lib/schema';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product' | 'profile';
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  schema?: Record<string, any>;
  language?: string;
  children?: React.ReactNode;
}

export default function SEO({
  title = 'Ferry Ticket Booking',
  description = 'Book ferry tickets for destinations across Turkey and Greece with our easy-to-use platform.',
  canonical,
  ogImage,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  schema,
  language = 'tr',
  children,
}: SEOProps) {
  const siteName = 'FerryTicket';
  const siteUrl = canonical || 'https://ferryticket.com';
  const imageUrl = ogImage || `${siteUrl}/images/default-og-image.jpg`;

  return (
    <Helmet htmlAttributes={{ lang: language }}>
      {/* Temel Meta Etiketleri */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical || siteUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {/* Ek Meta Etiketleri */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="robots" content="index, follow" />

      {/* Alternatif Diller */}
      <link rel="alternate" href={`${siteUrl}`} hrefLang="tr" />
      <link rel="alternate" href={`${siteUrl}/en`} hrefLang="en" />
      <link rel="alternate" href={`${siteUrl}/fr`} hrefLang="fr" />

      {/* Favicon */}
      <link rel="shortcut icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

      {/* Schema.org JSON-LD */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}

      {/* Custom Head İçeriği */}
      {children}
    </Helmet>
  );
}