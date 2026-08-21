import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Ship, TrendingUp, Navigation, Calendar, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PopularRoute {
  id: number;
  from: string;
  fromCountry: string;
  to: string;
  toCountry: string;
  price: number;
  currency: string;
  travelTime: string;
  image: string;
  searchCount: number;
}

const PopularRoutes = () => {
  const [, navigate] = useLocation();
  
  // Popüler rotaları getir
  const { data: popularRoutes, isLoading } = useQuery<PopularRoute[]>({
    queryKey: ['/api/popular-routes'],
    placeholderData: [
      {
        id: 1,
        from: "İstanbul",
        fromCountry: "Türkiye",
        to: "Yalta",
        toCountry: "Ukrayna",
        price: 399.99,
        currency: "TL",
        travelTime: "12 saat",
        image: "https://images.unsplash.com/photo-1612353280996-7e10bd3ba705",
        searchCount: 1250
      },
      {
        id: 2,
        from: "Bodrum",
        fromCountry: "Türkiye",
        to: "Rodos",
        toCountry: "Yunanistan",
        price: 199.99,
        currency: "TL",
        travelTime: "2 saat",
        image: "https://images.unsplash.com/photo-1586500036706-41963de24d8b",
        searchCount: 980
      },
      {
        id: 3,
        from: "İzmir",
        fromCountry: "Türkiye",
        to: "Atina",
        toCountry: "Yunanistan",
        price: 299.99,
        currency: "TL",
        travelTime: "8 saat",
        image: "https://images.unsplash.com/photo-1599946347371-68eb71b16afc",
        searchCount: 870
      },
      {
        id: 4,
        from: "Trabzon",
        fromCountry: "Türkiye",
        to: "Soçi",
        toCountry: "Rusya",
        price: 449.99,
        currency: "TL", 
        travelTime: "10 saat",
        image: "https://images.unsplash.com/photo-1591104945366-b36dfc6f5328",
        searchCount: 750
      }
    ]
  });

  // Arama sayfasına yönlendir
  const handleRouteClick = (route: PopularRoute) => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    const searchParams = new URLSearchParams();
    searchParams.append('from', route.from);
    searchParams.append('to', route.to);
    searchParams.append('departureDate', today.toISOString());
    searchParams.append('tripType', 'one-way');
    searchParams.append('passengers', '1');
    
    navigate(`/search-results?${searchParams.toString()}`);
  };

  return (
    <div className="py-16 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-2xl font-bold text-gray-800">Popüler Rotalar</h2>
          </div>
          <p className="text-gray-600 max-w-2xl">
            Türkiye'den en çok tercih edilen feribot rotalarını keşfedin ve hemen rezervasyon yapın.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))
          ) : popularRoutes?.map((route) => (
            <Card key={route.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div 
                className="h-48 bg-center bg-cover" 
                style={{ backgroundImage: `url(${route.image})` }}
              >
                <div className="h-full w-full bg-black bg-opacity-40 flex items-end p-4">
                  <div className="text-white">
                    <div className="font-bold text-lg">{route.from} → {route.to}</div>
                    <div className="text-sm opacity-90">{route.fromCountry} → {route.toCountry}</div>
                  </div>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <span className="text-lg font-bold text-blue-600">{route.price} {route.currency}</span>
                    <span className="text-xs text-gray-500 ml-1">başlayan fiyatlarla</span>
                  </div>
                  <div className="flex items-center text-gray-500 text-sm">
                    <Ship className="h-4 w-4 mr-1" />
                    <span>{route.travelTime}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>Günlük hareket</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    <Navigation className="h-3 w-3 mr-1" />
                    <span>{route.searchCount}+ kişi baktı</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={() => handleRouteClick(route)}
                >
                  Bilet Bul
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PopularRoutes;