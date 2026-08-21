import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Route } from "@shared/schema";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import SearchBox from "@/components/search/search-box";
import SuggestedRoutes from "@/components/search/suggested-routes";
import RouteCard from "@/components/booking/route-card";
import { DatePicker } from "@/components/ui/datepicker";
import { Filter, Calendar, Ship, Users, Car, ArrowRight } from "lucide-react";

const SearchResults = () => {
  const [location] = useLocation();
  let queryString = location.split("?")[1] || "";
  
  // URL parametrelerini güvenli şekilde al
  const searchParams = new URLSearchParams(queryString);
  
  // Doğrudan URL'den parametre almayı dene
  const urlParams = new URLSearchParams(window.location.search);
  const fromUrlParam = urlParams.get("from");
  const toUrlParam = urlParams.get("to");
  
  // URL parametrelerini alırken decodeURIComponent kullan ve null/undefined kontrolü yap
  // Önce doğrudan URL'den, yoksa searchParams'dan al
  const fromParam = fromUrlParam || searchParams.get("from");
  const toParam = toUrlParam || searchParams.get("to");
  
  // Debug - URL parametrelerini göster
  console.log(`Original URL parameters:`, {
    from: fromParam,
    to: toParam,
    departureDate: searchParams.get("departureDate"),
    vehicleType: searchParams.get("vehicleType"),
    tripType: searchParams.get("tripType"),
    totalPassengers: searchParams.get("totalPassengers")
  });
  
  console.log(`Direct window.location.search: ${window.location.search}`);
  
  const [from, setFrom] = useState<string>(
    fromParam ? decodeURIComponent(fromParam) : ""
  );
  const [to, setTo] = useState<string>(
    toParam ? decodeURIComponent(toParam) : ""
  );
  const [departureDate, setDepartureDate] = useState<Date | undefined>(() => {
    const departureDateParam = searchParams.get("departureDate");
    if (!departureDateParam) return new Date();
    
    try {
      return new Date(departureDateParam);
    } catch (e) {
      console.error("Invalid date format:", e);
      return new Date();
    }
  });
  const [returnDate, setReturnDate] = useState<Date | undefined>(() => {
    const returnDateParam = searchParams.get("returnDate");
    if (!returnDateParam) return undefined;
    
    try {
      return new Date(returnDateParam);
    } catch (e) {
      console.error("Invalid date format:", e);
      return undefined;
    }
  });
  
  // Yolcu parametreleri
  const totalPassengersParam = searchParams.get("totalPassengers");
  // Toplam yolcu sayısını hesapla veya parametreden al
const [passengers, setPassengers] = useState<string>(() => {
  // Eğer doğrudan totalPassengers parametresi varsa, onu kullan
  if (totalPassengersParam) return totalPassengersParam;
  
  // Yoksa detaylı yolcu parametrelerinden hesapla
  const adult = parseInt(searchParams.get("passenger_adult") || "1");
  const child = parseInt(searchParams.get("passenger_child") || "0");
  const senior = parseInt(searchParams.get("passenger_senior") || "0");
  const baby = parseInt(searchParams.get("passenger_baby") || "0");
  
  return (adult + child + senior + baby).toString();
});
  const [passengerAdult, setPassengerAdult] = useState<string>(searchParams.get("passenger_adult") || "1");
  const [passengerChild, setPassengerChild] = useState<string>(searchParams.get("passenger_child") || "0");
  const [passengerSenior, setPassengerSenior] = useState<string>(searchParams.get("passenger_senior") || "0");
  const [passengerBaby, setPassengerBaby] = useState<string>(searchParams.get("passenger_baby") || "0");
  const [vehicleType, setVehicleType] = useState<string>(searchParams.get("vehicleType") || "1");
  const [tripType, setTripType] = useState<string>(searchParams.get("tripType") || "one-way");
  
  // Debug için loglama ekle
  console.log(`Search Parameters: from=${from}, to=${to}, departureDate=${departureDate?.toISOString()}, totalPassengers=${totalPassengersParam}`);

  const { data: routes, isLoading, error } = useQuery<Route[]>({
    queryKey: ['/api/routes/search', from, to],
    queryFn: async () => {
      if (!from || !to) {
        return [];
      }
      
      const params = new URLSearchParams();
      params.append('from', encodeURIComponent(from));
      params.append('to', encodeURIComponent(to));
      
      console.log(`Searching for routes from "${from}" to "${to}" (DEBUG INFO)`);
      
      // Göster URL parametrelerini
      const routeSearchUrl = `/api/routes/search?${params.toString()}`;
      console.log(`Search URL: ${routeSearchUrl} (DEBUG INFO)`);
      
      const res = await fetch(routeSearchUrl);
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`API Error: ${errorText} (DEBUG INFO)`);
        throw new Error(`Failed to fetch routes: ${errorText}`);
      }
      
      const data = await res.json();
      console.log(`Found ${data.length} routes matching search criteria (DEBUG INFO)`);
      
      // Eğer sonuç boş ise, belki de tam eşleşme sorunu vardır - konsolda uyarı göster
      if (data.length === 0) {
        console.warn("No routes found with exact matching. URL parameters might not match exact port names in database");
      }
      
      return data;
    },
    enabled: !!from && !!to,
  });

  // Check if search parameters are empty (to show recommended routes)
  const isEmptySearch = !from || !to;

  return (
    <>
      <Helmet>
        <title>Search Results - FerryBooking</title>
        <meta
          name="description"
          content={`Search results for ferry routes from ${from || 'all ports'} to ${to || 'all destinations'}.`}
        />
      </Helmet>

      <div className="min-h-screen bg-neutral-50">
        {/* Compact search box for refining search */}
        <div className="bg-primary">
          <div className="container mx-auto p-4">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-neutral-700 mb-1">Route</label>
                  <div className="flex items-center text-sm p-2 border rounded">
                    <div className="font-medium">{from || 'All Ports'}</div>
                    {from && to && (
                      <>
                        <ArrowRight className="h-4 w-4 mx-2 text-neutral-400" />
                        <div className="font-medium">{to}</div>
                      </>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1">Departure</label>
                  <DatePicker
                    date={departureDate}
                    setDate={setDepartureDate}
                    minDate={new Date()}
                  />
                </div>

                {tripType === 'round-trip' && (
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1">Return</label>
                    <DatePicker
                      date={returnDate}
                      setDate={setReturnDate}
                      minDate={departureDate}
                    />
                  </div>
                )}

                <div className="flex items-end">
                  <Button 
                  className="w-full"
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.append('from', from);
                    params.append('to', to);
                    params.append('departureDate', departureDate ? departureDate.toISOString() : new Date().toISOString());
                    
                    // Yolcu parametrelerini ekle
                    params.append('passenger_adult', passengerAdult);
                    params.append('passenger_child', passengerChild);
                    params.append('passenger_senior', passengerSenior);
                    params.append('passenger_baby', passengerBaby);
                    params.append('totalPassengers', passengers);
                    params.append('passengers', passengers);
                    
                    // Araç ve gidiş-dönüş bilgilerini ekle
                    params.append('vehicleType', vehicleType);
                    params.append('tripType', tripType);
                    
                    if (tripType === 'round-trip' && returnDate) {
                      params.append('returnDate', returnDate.toISOString());
                    }
                    
                    window.location.href = `/search-results?${params.toString()}`;
                  }}
                >
                  Aramayı Güncelle
                </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* If search is empty, show suggested routes */}
        {isEmptySearch ? (
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">
              Browse Available Ferry Routes
            </h1>
            
            <SuggestedRoutes 
              title="Popular Ferry Routes" 
              subtitle="Select a route to see available departures" 
              limit={6} 
            />
          </div>
        ) : (
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">
              {from} to {to} - {departureDate?.toLocaleDateString()}
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Filters sidebar */}
              <div className="md:col-span-1">
                <Card className="sticky top-4 shadow-lg border-none overflow-hidden">
                  <CardContent className="p-0">
                    {/* Filter header with gradient background */}
                    <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-5 flex items-center justify-between">
                      <h2 className="text-lg font-semibold flex items-center">
                        <Filter className="h-5 w-5 mr-2" />
                        Filtreler
                      </h2>
                      <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                        Temizle
                      </Button>
                    </div>

                    <div className="divide-y">
                      {/* Active filters summary */}
                      <div className="p-4 bg-muted/30">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Aktif Filtreler:</h3>
                        <div className="flex flex-wrap gap-2">
                          <div className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            <span>{departureDate?.toLocaleDateString()}</span>
                            <button className="hover:bg-primary/5 rounded-full p-0.5">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                            </button>
                          </div>
                          <div className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            <span>{passengers} Yolcu</span>
                            <button className="hover:bg-primary/5 rounded-full p-0.5">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      <Accordion type="multiple" defaultValue={["date", "ferry-operators", "passengers", "vehicle"]} className="w-full">
                        <AccordionItem value="date" className="border-0">
                          <AccordionTrigger className="py-4 px-5 hover:bg-muted/20 transition-colors">
                            <div className="flex items-center text-sm">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary mr-3">
                                <Calendar className="h-4 w-4" />
                              </div>
                              <span className="font-medium">Tarih</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-4 px-5">
                            <div className="space-y-4 pt-2">
                              <div className="border rounded-lg p-3 bg-muted/10">
                                <DatePicker
                                  label="Kalkış Tarihi"
                                  date={departureDate}
                                  setDate={setDepartureDate}
                                  minDate={new Date()}
                                />
                              </div>
                              {tripType === 'round-trip' && (
                                <div className="border rounded-lg p-3 bg-muted/10">
                                  <DatePicker
                                    label="Dönüş Tarihi"
                                    date={returnDate}
                                    setDate={setReturnDate}
                                    minDate={departureDate}
                                  />
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="ferry-operators" className="border-0">
                          <AccordionTrigger className="py-4 px-5 hover:bg-muted/20 transition-colors">
                            <div className="flex items-center text-sm">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary mr-3">
                                <Ship className="h-4 w-4" />
                              </div>
                              <span className="font-medium">Feribot Firmaları</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-4 px-5">
                            <div className="space-y-3 pt-2">
                              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/10 border hover:bg-muted/20 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full">
                                    <span className="text-xs font-bold">TM</span>
                                  </div>
                                  <label htmlFor="operator-all" className="text-sm font-medium">
                                    Tüm Firmalar
                                  </label>
                                </div>
                                <div className="h-5 w-10">
                                  <input
                                    type="checkbox"
                                    id="operator-all"
                                    className="sr-only peer"
                                    defaultChecked
                                  />
                                  <label
                                    htmlFor="operator-all"
                                    className="flex h-5 w-10 cursor-pointer items-center rounded-full bg-muted peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5"
                                  ></label>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/10 border hover:bg-muted/20 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full">
                                    <span className="text-xs font-bold">MF</span>
                                  </div>
                                  <label htmlFor="operator-1" className="text-sm font-medium">
                                    Mediterranean Ferries
                                  </label>
                                </div>
                                <div className="h-5 w-10">
                                  <input
                                    type="checkbox"
                                    id="operator-1"
                                    className="sr-only peer"
                                    defaultChecked
                                  />
                                  <label
                                    htmlFor="operator-1"
                                    className="flex h-5 w-10 cursor-pointer items-center rounded-full bg-muted peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5"
                                  ></label>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/10 border hover:bg-muted/20 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-8 h-8 bg-cyan-100 text-cyan-600 rounded-full">
                                    <span className="text-xs font-bold">AL</span>
                                  </div>
                                  <label htmlFor="operator-2" className="text-sm font-medium">
                                    Aegean Lines
                                  </label>
                                </div>
                                <div className="h-5 w-10">
                                  <input
                                    type="checkbox"
                                    id="operator-2"
                                    className="sr-only peer"
                                    defaultChecked
                                  />
                                  <label
                                    htmlFor="operator-2"
                                    className="flex h-5 w-10 cursor-pointer items-center rounded-full bg-muted peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5"
                                  ></label>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/10 border hover:bg-muted/20 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-8 h-8 bg-red-100 text-red-600 rounded-full">
                                    <span className="text-xs font-bold">TM</span>
                                  </div>
                                  <label htmlFor="operator-3" className="text-sm font-medium">
                                    Turkish Maritime
                                  </label>
                                </div>
                                <div className="h-5 w-10">
                                  <input
                                    type="checkbox"
                                    id="operator-3"
                                    className="sr-only peer"
                                    defaultChecked
                                  />
                                  <label
                                    htmlFor="operator-3"
                                    className="flex h-5 w-10 cursor-pointer items-center rounded-full bg-muted peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5"
                                  ></label>
                                </div>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        {/* Other accordion items... */}
                      </Accordion>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search results */}
              <div className="md:col-span-3">
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Card key={index} className="w-full">
                        <CardContent className="p-5">
                          <div className="flex flex-col space-y-3">
                            <div className="flex items-center justify-between">
                              <Skeleton className="h-8 w-1/3" />
                              <Skeleton className="h-8 w-1/4" />
                            </div>
                            <Skeleton className="h-16 w-full" />
                            <div className="flex justify-between">
                              <Skeleton className="h-10 w-1/3" />
                              <Skeleton className="h-10 w-1/4" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : routes && routes.length > 0 ? (
                  <div className="space-y-4">
                    {routes.map((route) => (
                      <RouteCard 
                        key={route.id} 
                        route={route} 
                        departureDate={departureDate}
                        returnDate={tripType === "round-trip" ? returnDate : undefined}
                        passengers={parseInt(passengers)}
                        vehicleTypeId={parseInt(vehicleType)}
                        tripType={tripType}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-muted/20 p-4 rounded-full">
                        <Ship className="h-10 w-10 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold">No Routes Found</h3>
                      <p className="text-neutral-500 max-w-lg mx-auto">
                        We couldn't find any ferry routes matching your criteria. 
                        Try adjusting your search parameters or explore our popular routes below.
                      </p>
                      
                      <div className="mt-6 w-full">
                        <h4 className="text-lg font-semibold mb-4">Recommended Routes</h4>
                        <SuggestedRoutes 
                          limit={3} 
                          onRouteSelect={(route) => {
                            // Create search params with the selected route
                            const params = new URLSearchParams();
                            params.append('from', route.departurePort);
                            params.append('to', route.arrivalPort);
                            params.append('departureDate', departureDate ? departureDate.toISOString() : new Date().toISOString());
                            params.append('passengers', passengers);
                            params.append('vehicleType', vehicleType);
                            params.append('tripType', tripType);
                            
                            if (tripType === 'round-trip' && returnDate) {
                              params.append('returnDate', returnDate.toISOString());
                            }
                            
                            // Update the search form with these values
                            setFrom(route.departurePort);
                            setTo(route.arrivalPort);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SearchResults;