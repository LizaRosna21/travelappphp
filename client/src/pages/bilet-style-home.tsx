import { Helmet } from "react-helmet";
import BiletStyleHero from "@/components/home/bilet-style-hero";
import PopularDestinations from "@/components/home/popular-destinations";
import ServiceAdvantages from "@/components/home/service-advantages";
import MobileAppBanner from "@/components/home/mobile-app-banner";
import Features from "@/components/home/features";
import Testimonials from "@/components/home/testimonials";
import FAQ from "@/components/home/faq";
import CTA from "@/components/home/cta";
import PopularRoutes from "@/components/home/popular-routes";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { PortWeatherWidget } from "@/components/weather/port-weather-widget";

// Bilet.com stil ana sayfa
const BiletStyleHomePage = () => {
  const { settings } = useSiteSettings();

  return (
    <>
      <Helmet>
        <title>{settings?.siteName || "FerryBooking"} - En İyi Fiyatlarla Feribot Bileti</title>
        <meta
          name="description"
          content="En uygun fiyatlarla online feribot bileti satın alın. Türkiye'den Yunanistan'a ve Ege Adalarına tüm feribot seferlerini karşılaştırın, en uygun bileti hemen alın."
        />

        {/* Schema.org yapısal verisi */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TravelAgency",
            "name": settings?.siteName || "FerryBooking",
            "url": "https://ferrybooking.web.tr/",
            "logo": settings?.logoUrl || "https://ferrybooking.web.tr/logo.png",
            "description": "Türkiye'den Yunanistan'a ve Ege Adalarına en uygun fiyatlı feribot bileti satış platformu.",
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "Turkey"
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": settings?.contactPhone || "+90-123-456-7890",
              "contactType": "customer service",
              "email": settings?.contactEmail
            },
            "sameAs": [
              "https://www.facebook.com/ferrybooking",
              "https://www.twitter.com/ferrybooking",
              "https://www.instagram.com/ferrybooking"
            ]
          })}
        </script>
      </Helmet>

      <main className="min-h-screen bg-white">
        {/* Ana Hero Bölümü */}
        <BiletStyleHero />
        
        {/* Popüler Rotalar */}
        <PopularRoutes />
        
        {/* Liman Hava Durumu Widget */}
        <div className="py-8 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-8">Popüler Limanlar Hava Durumu</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <PortWeatherWidget portName="İstanbul" countryCode="TR" />
              <PortWeatherWidget portName="Bodrum" countryCode="TR" />
              <PortWeatherWidget portName="İzmir" countryCode="TR" />
            </div>
          </div>
        </div>
        
        {/* Popüler Destinasyonlar */}
        <PopularDestinations />
        
        {/* Hizmet Avantajları */}
        <ServiceAdvantages />
        
        {/* Mobil Uygulama Banner */}
        <MobileAppBanner />
        
        {/* Diğer Özellikler (Mevcut Features bileşeni) */}
        <div className="py-16 bg-gradient-to-r from-blue-50 to-cyan-50">
          <Features />
        </div>
        
        {/* Müşteri Yorumları */}
        <div className="py-16">
          <Testimonials />
        </div>
        
        {/* SSS */}
        <div className="py-16 bg-gradient-to-r from-blue-50 to-cyan-50">
          <FAQ />
        </div>
        
        {/* CTA Bölümü */}
        <div className="py-16 bg-gradient-to-b from-blue-600 to-cyan-600 text-white">
          <CTA />
        </div>
      </main>
    </>
  );
};

export default BiletStyleHomePage;