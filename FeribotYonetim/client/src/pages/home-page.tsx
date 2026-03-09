import { Helmet } from "react-helmet";
import SearchBox from "@/components/search/search-box";
import PopularRoutes from "@/components/home/popular-routes";
import FerryCompanies from "@/components/home/ferry-companies";
import Features from "@/components/home/features";
import Testimonials from "@/components/home/testimonials";
import FAQ from "@/components/home/faq";
import CTA from "@/components/home/cta";
import HeroBackground from "@/components/home/hero-background";
import { useSiteSettings } from "@/hooks/use-site-settings";
import RouteRecommendations from "@/components/recommendation/RouteRecommendations";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Ship, Anchor, Map, Award } from "lucide-react";

const HomePage = () => {
  const { settings } = useSiteSettings();

  return (
    <>
      <Helmet>
        <title>{settings?.siteName || "FerryBooking"} - Book Ferry Tickets Online</title>
        <meta
          name="description"
          content="Book ferry tickets online with the best prices. One-way and round-trip ferry tickets for all major routes."
        />

        {/* Schema.org structured data for FerryBooking */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TravelAgency",
            "name": settings?.siteName || "FerryBooking",
            "url": "https://ferrybooking.web.tr/",
            "logo": settings?.logoUrl || "https://ferrybooking.web.tr/logo.png",
            "description": "Book ferry tickets online with the best prices. One-way and round-trip ferry tickets for all major routes.",
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

      <div className="min-h-screen">
        <HeroBackground className="py-16">
          <div className="flex flex-col items-center justify-center pt-10 pb-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-6 max-w-4xl">
              <span className="text-gradient bg-gradient-to-r from-blue-300 to-cyan-100">
                Türkiye'den Yunanistan'a ve Ege Adalarına
              </span>
              <br /> 
              <span className="text-white">Feribot Bileti</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 text-center max-w-2xl mb-8">
              En iyi fiyat garantisi ile güvenli ve hızlı bilet rezervasyonu yapın.
              Tüm destinasyonlar için tek bir platformda çözüm.
            </p>
          </div>
          <SearchBox />
        </HeroBackground>
        
        {/* Quick Links Section */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 py-6">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { icon: <Ship className="h-6 w-6" />, text: "Tüm Feribot Rotaları" },
                { icon: <Anchor className="h-6 w-6" />, text: "Online Ödeme ve E-Bilet" },
                { icon: <Map className="h-6 w-6" />, text: "Liman Rehberi" },
                { icon: <Award className="h-6 w-6" />, text: "En İyi Fiyat Garantisi" }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-center md:justify-start space-x-2 p-3 rounded-lg card-hover bg-white shadow-sm">
                  <div className="text-primary">{item.icon}</div>
                  <span className="font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 mt-12">
          <div className="flex flex-col items-center justify-center mb-10">
            <h2 className="text-3xl font-bold mb-3 text-center">
              <span className="text-gradient">Önerilen Rotalar</span>
            </h2>
            <p className="text-center text-gray-600 max-w-2xl mb-6">
              Sizin için seçtiğimiz popüler ve önerilen destinasyonları keşfedin
            </p>
          </div>
          <RouteRecommendations />
        </div>

        <div className="py-12 bg-gradient-to-r from-blue-50 to-cyan-50 mt-16">
          <PopularRoutes />
        </div>
        
        <div className="py-16">
          <FerryCompanies />
        </div>

        <div className="py-16 bg-gradient-to-r from-blue-50 to-cyan-50">
          <Features />
        </div>

        <div className="py-16">
          <Testimonials />
        </div>

        <div className="py-16 bg-gradient-to-r from-blue-50 to-cyan-50">
          <FAQ />
        </div>

        <div className="py-16 bg-gradient-to-b from-blue-600 to-cyan-600 text-white">
          <CTA />
        </div>
      </div>
    </>
  );
};

export default HomePage;
