import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ChevronRight, ExternalLink, Map } from "lucide-react";

// Bilet.com şeklinde popüler destinasyonlar bileşeni
const PopularDestinations = () => {
  const [, navigate] = useLocation();

  // Popüler rota kartına tıklandığında
  const handleRouteClick = (from: string, to: string) => {
    const searchParams = new URLSearchParams();
    searchParams.append('from', from);
    searchParams.append('to', to);
    
    // Bugünün tarihini ekle
    const today = new Date();
    searchParams.append('departureDate', today.toISOString());
    
    // Bir kişi olarak varsayılan
    searchParams.append('passengers', '1');
    searchParams.append('tripType', 'one-way');
    
    navigate(`/search-results?${searchParams.toString()}`);
  };

  // Popüler destinasyonlar
  const popularDestinations = [
    {
      id: 1,
      name: "İstanbul - Midilli",
      description: "Türkiye'den Yunanistan'a en hızlı rota",
      image: "https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?q=80&w=500&auto=format&fit=crop",
      from: "Istanbul Port",
      to: "Lesvos Port"
    },
    {
      id: 2,
      name: "Bodrum - Kos",
      description: "Popüler tatil adası rotası",
      image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?q=80&w=500&auto=format&fit=crop",
      from: "Bodrum Port",
      to: "Kos Port"
    },
    {
      id: 3,
      name: "Çeşme - Sakız",
      description: "Hızlı feribot bağlantısı",
      image: "https://images.unsplash.com/photo-1632990447951-4295e9af9dde?q=80&w=500&auto=format&fit=crop",
      from: "Cesme Port",
      to: "Chios Port"
    },
    {
      id: 4,
      name: "Kuşadası - Samos",
      description: "Yunan adaları keşfi",
      image: "https://images.unsplash.com/photo-1584555613483-83e948ba7090?q=80&w=500&auto=format&fit=crop",
      from: "Kusadasi Port",
      to: "Samos Port"
    }
  ];

  // Bütün destinasyon kartları
  const allDestinations = [
    { id: 1, title: "İstanbul", subtitle: "Türkiye", image: "https://images.unsplash.com/photo-1527838832700-5059252407fa?q=80&w=400&auto=format&fit=crop" },
    { id: 2, title: "Midilli", subtitle: "Yunanistan", image: "https://images.unsplash.com/photo-1586861256632-52a3db752f8c?q=80&w=400&auto=format&fit=crop" },
    { id: 3, title: "Bodrum", subtitle: "Türkiye", image: "https://images.unsplash.com/photo-1663586569411-9c9415e9db12?q=80&w=400&auto=format&fit=crop" },
    { id: 4, title: "Kos", subtitle: "Yunanistan", image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=400&auto=format&fit=crop" },
    { id: 5, title: "Çeşme", subtitle: "Türkiye", image: "https://images.unsplash.com/photo-1519143587129-d9d3443a1fbb?q=80&w=400&auto=format&fit=crop" },
    { id: 6, title: "Sakız", subtitle: "Yunanistan", image: "https://images.unsplash.com/photo-1519720212809-94c89d1a500b?q=80&w=400&auto=format&fit=crop" },
    { id: 7, title: "Kuşadası", subtitle: "Türkiye", image: "https://images.unsplash.com/photo-1526721709997-3db3f1e685a6?q=80&w=400&auto=format&fit=crop" },
    { id: 8, title: "Samos", subtitle: "Yunanistan", image: "https://images.unsplash.com/photo-1543158756-2ee391f04211?q=80&w=400&auto=format&fit=crop" },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">
            <span className="text-gradient bg-gradient-to-r from-blue-600 to-cyan-500">Popüler Rotalar</span>
          </h2>
          <Button variant="outline" className="gap-1 hidden md:flex">
            Tümünü Gör <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Popüler Rotalar Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {popularDestinations.map((destination) => (
            <Card key={destination.id} className="overflow-hidden group cursor-pointer shadow-md hover:shadow-lg transition-shadow"
                  onClick={() => handleRouteClick(destination.from, destination.to)}>
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={destination.image} 
                  alt={destination.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4 text-white">
                  <h3 className="font-bold text-xl">{destination.name}</h3>
                  <p className="text-sm text-white/80">{destination.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Tüm Destinasyonlar */}
      <div className="mt-16">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Tüm Destinasyonlar</h2>
          <Button variant="outline" className="gap-1 hidden md:flex">
            <Map className="h-4 w-4 mr-1" /> Destinasyon Haritası
          </Button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {allDestinations.map((destination) => (
            <Card key={destination.id} className="overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-shadow">
              <div className="relative h-40 overflow-hidden">
                <img 
                  src={destination.image} 
                  alt={destination.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 p-3 text-white">
                  <h3 className="font-bold text-lg">{destination.title}</h3>
                  <p className="text-xs text-white/80">{destination.subtitle}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Tüm Firmalar Bölümü */}
      <div className="mt-16">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Feribot Firmaları</h2>
          <Button variant="outline" className="gap-1 hidden md:flex">
            Tümünü Gör <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {["TurkFerry", "GreekLines", "AegeanSeaways", "MedFerries"].map((company, index) => (
            <Card key={index} className="overflow-hidden border-2 hover:border-blue-200 transition-all">
              <CardContent className="p-6 flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <img 
                    src={`/logos/ferry-company-${index + 1}.png`} 
                    alt={company} 
                    className="w-10 h-10 object-contain opacity-70"
                    onError={(e) => {
                      try {
                        // Görsel yüklenemezse fallback olarak ikon kullan
                        e.currentTarget.src = "";
                        e.currentTarget.style.display = "none";
                        
                        // Ebeveyn elementi kontrol et
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          // Güvenli bir şekilde SVG ikon ekle
                          const iconSvg = document.createElement('svg');
                          iconSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                          iconSvg.setAttribute('width', '32');
                          iconSvg.setAttribute('height', '32');
                          iconSvg.setAttribute('viewBox', '0 0 24 24');
                          iconSvg.setAttribute('fill', 'none');
                          iconSvg.setAttribute('stroke', 'currentColor');
                          iconSvg.setAttribute('stroke-width', '2');
                          iconSvg.setAttribute('stroke-linecap', 'round');
                          iconSvg.setAttribute('stroke-linejoin', 'round');
                          iconSvg.classList.add('text-blue-400');
                          
                          const pathElement = document.createElement('path');
                          pathElement.setAttribute('d', 'M20 4h-5l-5-4-5 4H0v3h4c0 3 2 6 6 7 4-1 6-4 6-7h4V4zm-9 12c-3-1-5-3-5-6 3 2 7 2 10 0-1 3-2 5-5 6zm2 2 1 3h-5l1-3h3zm-1-4v1h1s1 0 1-1-1-1-1-1h-1v1z');
                          
                          iconSvg.appendChild(pathElement);
                          parent.appendChild(iconSvg);
                        }
                      } catch (error) {
                        console.log('Görsel yerine ikon eklenirken hata oluştu:', error);
                      }
                    }}
                  />
                </div>
                <h3 className="font-semibold text-center">{company}</h3>
                <Button variant="link" size="sm" className="mt-2 text-blue-600">
                  Seferlere Bak <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PopularDestinations;