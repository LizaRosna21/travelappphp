import { Helmet } from "react-helmet";
import { useLocation } from "wouter";
import SearchBox from "@/components/search/search-box";
import PopularRoutes from "@/components/home/popular-routes";
import { Anchor, Calendar, Clock, Sailboat, Ship, MapPin, Info } from "lucide-react";

// Feature Card bileşeni
const FeatureCard = ({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string 
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-700">{description}</p>
    </div>
  );
};

export default function BodrumKosPage() {
  const [, navigate] = useLocation();
  
  // Bodrum-Kos sayfasına özel arama fonksiyonu
  const handleCustomSearch = (searchParams: URLSearchParams) => {
    // İhtiyaç duyulan özel işlemler (örn: analitik kaydı) burada yapılabilir
    
    // Sonra normal arama sayfasına yönlendir
    navigate(`/search?${searchParams.toString()}`);
  };
  
  return (
    <>
      <Helmet>
        <title>Bodrum - Kos Ferry Route | Book Your Ferry Tickets</title>
        <meta 
          name="description" 
          content="Book your ferry ticket from Bodrum to Kos. Fast and comfortable ferries with affordable prices. Check availability and schedule for your next trip." 
        />
        <meta name="keywords" content="Bodrum Kos ferry, Bodrum Kos tickets, ferry Bodrum to Kos, Bodrum Kos schedule" />
        <link rel="canonical" href="https://ferrytickets.com/routes/bodrum-kos" />
        
        {/* OpenGraph */}
        <meta property="og:title" content="Bodrum - Kos Ferry Route | Book Your Ferry Tickets" />
        <meta property="og:description" content="Book your ferry ticket from Bodrum to Kos. Fast and comfortable ferries with affordable prices." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ferrytickets.com/routes/bodrum-kos" />
        <meta property="og:image" content="https://ferrytickets.com/images/bodrum-kos-og.jpg" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Bodrum - Kos Ferry Route | Book Your Ferry Tickets" />
        <meta name="twitter:description" content="Book your ferry ticket from Bodrum to Kos. Fast and comfortable ferries with affordable prices." />
        <meta name="twitter:image" content="https://ferrytickets.com/images/bodrum-kos-og.jpg" />
        
        {/* Structured Data / JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemPage",
            "name": "Bodrum - Kos Ferry Route",
            "description": "Book your ferry ticket from Bodrum to Kos. Fast and comfortable ferries with affordable prices.",
            "mainEntity": {
              "@type": "Service",
              "name": "Bodrum to Kos Ferry Service",
              "serviceType": "Ferry Transportation",
              "provider": {
                "@type": "Organization",
                "name": "Ferry Ticket Booking System",
                "url": "https://ferrytickets.com"
              },
              "availableChannel": {
                "@type": "ServiceChannel",
                "serviceUrl": "https://ferrytickets.com/routes/bodrum-kos",
                "serviceSmsNumber": "+901234567890",
                "servicePhone": "+901234567890"
              }
            }
          })}
        </script>
      </Helmet>
      
      <div className="min-h-screen">
        {/* Hero Section with Search Box */}
        <div 
          className="relative py-20 bg-cover bg-center"
          style={{ 
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/bodrum-kos-hero.jpg')`,
            backgroundColor: '#0f172a' // Fallback color if image doesn't load
          }}
        >
          <SearchBox 
            defaultValues={{
              defaultFrom: "Bodrum",
              defaultTo: "Kos",
              defaultDepartureDate: new Date().toISOString(),
              defaultTripType: 'round-trip',
            }}
            title="Bodrum to Kos Ferry Tickets"
            subtitle="Book your ferry tickets between Bodrum and Kos with our easy online booking system"
            disablePortSelection={true}
            searchButtonText="Check Availability"
            onCustomSearch={handleCustomSearch}
          />
        </div>
        
        {/* Route Information */}
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Bodrum - Kos Ferry Route</h2>
              <p className="text-gray-700 mb-6">
                The ferry route connecting Bodrum (Turkey) and Kos (Greece) is one of the most popular routes in the Aegean Sea. The journey takes approximately 1 hour, making it a perfect option for day trips or longer stays.
              </p>
              <p className="text-gray-700 mb-6">
                With multiple departures daily during the high season (April to October), this route offers great flexibility for travelers. During the low season, the frequency is reduced to a few departures per week.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start space-x-2">
                  <Clock className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium">Duration</h3>
                    <p className="text-sm text-gray-600">1 hour</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Ship className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium">Vessel Type</h3>
                    <p className="text-sm text-gray-600">High-speed catamaran</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Anchor className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium">Port Distance</h3>
                    <p className="text-sm text-gray-600">24 nautical miles</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Calendar className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium">High Season</h3>
                    <p className="text-sm text-gray-600">April to October</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="rounded-lg overflow-hidden shadow-xl">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d202896.93509523753!2d27.17280771277865!3d37.04134022290884!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e0!4m5!1s0x14be6c3f4f4cb927%3A0xe8f2b0b8ea196a7e!2sBodrum%2C%20Mu%C4%9Fla%2C%20Turkey!3m2!1d37.034081099999996!2d27.4303293!4m5!1s0x14bfb1c2ea26b173%3A0x4c25ba520ae108d5!2sKos%2C%20Kos%20Island%2C%20Greece!3m2!1d36.8915069!2d27.2877304!5e0!3m2!1sen!2sus!4v1680566421761!5m2!1sen!2sus" 
                  width="600" 
                  height="450" 
                  style={{ border: 0 }} 
                  allowFullScreen 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
        
        {/* Port Information */}
        <div className="bg-gray-50 py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-10 text-center">Port Information</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <MapPin className="h-6 w-6 text-primary mr-2" />
                  <h3 className="text-xl font-bold">Bodrum Port</h3>
                </div>
                <p className="text-gray-700 mb-4">
                  Bodrum Port is located in the center of Bodrum town, making it easily accessible for travelers. The port offers various amenities including cafes, restaurants, and shops.
                </p>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-primary mr-2 mt-1" />
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Address:</span> Bodrum Marina, 48400 Bodrum, Muğla, Turkey
                    </p>
                  </div>
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-primary mr-2 mt-1" />
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Check-in:</span> At least 60 minutes before departure
                    </p>
                  </div>
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-primary mr-2 mt-1" />
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Facilities:</span> Restaurants, cafes, shops, ATMs, waiting area
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <MapPin className="h-6 w-6 text-primary mr-2" />
                  <h3 className="text-xl font-bold">Kos Port</h3>
                </div>
                <p className="text-gray-700 mb-4">
                  Kos Port is centrally located in Kos Town, near the historic center and the famous Castle of the Knights. It serves both domestic and international routes.
                </p>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-primary mr-2 mt-1" />
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Address:</span> Kos Harbor, 85300 Kos Town, Kos Island, Greece
                    </p>
                  </div>
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-primary mr-2 mt-1" />
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Check-in:</span> At least 45 minutes before departure
                    </p>
                  </div>
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-primary mr-2 mt-1" />
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Facilities:</span> Tourist information, cafes, restaurants, shops, taxi stand
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Travel Tips */}
        <div className="container mx-auto px-4 py-12">
          <h2 className="text-3xl font-bold mb-10 text-center">Travel Tips</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Sailboat className="h-10 w-10 text-primary" />}
              title="Best Time to Travel"
              description="The best time to travel on the Bodrum-Kos route is between May and September when the weather is warm and the sea is calm. July and August are the busiest months, so book in advance."
            />
            <FeatureCard
              icon={<Anchor className="h-10 w-10 text-primary" />}
              title="Required Documents"
              description="Since this is an international route, all passengers need a valid passport. EU citizens can travel with their ID card. Non-EU citizens may need a visa for Greece."
            />
            <FeatureCard
              icon={<Info className="h-10 w-10 text-primary" />}
              title="Luggage Allowance"
              description="Each passenger is allowed to bring up to 30kg of luggage. Excess luggage may incur additional charges. Dangerous materials and unaccompanied luggage are not permitted."
            />
          </div>
        </div>
        
        {/* Other Popular Routes */}
        <div className="bg-gray-50 py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-10 text-center">Other Popular Routes</h2>
            <PopularRoutes />
          </div>
        </div>
      </div>
    </>
  );
}