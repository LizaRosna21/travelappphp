import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface MarsRoute {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  departureTerminal: string;
  arrivalTerminal: string;
  journeyTime: string;
  price: string;
  capacity: string;
  isActive: boolean;
  tags: string[];
  departureSchedules: {
    time: string;
    days: string[];
  }[];
  launchDate: string;
  returnDate: string | null;
}

export default function MarsOldakiPage() {
  const { data: routes, isLoading, error } = useQuery<MarsRoute[]>({
    queryKey: ['/api/admin/mars-routes'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/mars-routes');
      return response.json();
    }
  });

  const getDayName = (day: string) => {
    const days: Record<string, string> = {
      'mon': 'Pazartesi',
      'tue': 'Salı',
      'wed': 'Çarşamba',
      'thu': 'Perşembe',
      'fri': 'Cuma',
      'sat': 'Cumartesi',
      'sun': 'Pazar'
    };
    return days[day] || day;
  };

  return (
    <>
      <Helmet>
        <title>Mars Seferleri | FerryBoat</title>
        <meta name="description" content="Dünya'dan Mars'a özel seferler. Uzay teknolojisinin son harikası gemilerimizle Mars yolculuğuna çıkın." />
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-orange-500 mb-4">
            Mars Oldakiler
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Kızıl Gezegen Mars'a giden feribot seferlerimizle uzayın sonsuzluğunu keşfedin. 
            Gelecek nesiller için tarihi bir yolculuğa katılın.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-10 h-10 border-t-2 border-primary rounded-full"></div>
          </div>
        ) : error ? (
          <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <p className="text-red-600 dark:text-red-400">
                Rota bilgileri yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {routes?.map(route => (
              <Card key={route.id} className={`overflow-hidden hover:shadow-lg transition ${!route.isActive ? 'opacity-60' : ''}`}>
                <div className="relative h-48">
                  <img 
                    src={route.imageUrl} 
                    alt={route.name} 
                    className="w-full h-full object-cover"
                  />
                  {!route.isActive && (
                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                      <Badge variant="destructive" className="text-lg px-3 py-1">
                        Yakında
                      </Badge>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                    <div className="flex gap-2 flex-wrap">
                      {route.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="bg-opacity-80 backdrop-blur-sm">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                <CardHeader>
                  <CardTitle>{route.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{route.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{route.departureTerminal} → {route.arrivalTerminal}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{route.journeyTime}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Kapasite: {route.capacity}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {new Date(route.launchDate).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>
                  
                  {route.departureSchedules.length > 0 && (
                    <div className="border rounded-md p-3 bg-muted/40">
                      <p className="text-sm font-medium mb-2">Sefer Saatleri:</p>
                      <div className="space-y-2">
                        {route.departureSchedules.map((schedule, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{schedule.days.map(day => getDayName(day)).join(', ')}</span>
                            <span className="font-semibold">{schedule.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4 flex justify-between items-center">
                    <div className="text-2xl font-bold">
                      {parseInt(route.price).toLocaleString('tr-TR')} ₺
                    </div>
                    <Button disabled={!route.isActive} className="rounded-full">
                      {route.isActive ? 'Bilet Al' : 'Çok Yakında'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}