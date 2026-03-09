import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Helmet } from "react-helmet";
import { 
  Route, 
  Schedule, 
  PassengerType, 
  VehicleType
} from "@shared/schema";
import { PhoneInput } from "@/components/ui/phone-input";
import { z } from "zod";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDuration, generateBookingReference } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  Ship, 
  Clock, 
  Calendar, 
  Users, 
  ArrowRight, 
  MapPin, 
  CreditCard, 
  Check,
  Car,
  ChevronRight
} from "lucide-react";
import PassengerForm from "@/components/booking/passenger-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const OrderPage = () => {
  const params = useParams<{ routeId: string }>();
  const routeId = parseInt(params.routeId);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const searchParams = new URLSearchParams(window.location.search);
  const departureDate = searchParams.get("departureDate") 
    ? new Date(searchParams.get("departureDate") as string)
    : new Date();
  const returnDate = searchParams.get("returnDate")
    ? new Date(searchParams.get("returnDate") as string)
    : undefined;
  const tripType = searchParams.get("tripType") || "one-way";
  const passengerCount = parseInt(searchParams.get("passengers") || "1");
  const vehicleTypeId = parseInt(searchParams.get("vehicleType") || "1");
  
  // Seçilen sefer ID'leri
  const scheduleId = searchParams.get("scheduleId") 
    ? parseInt(searchParams.get("scheduleId") as string)
    : null;
  const returnScheduleId = searchParams.get("returnScheduleId")
    ? parseInt(searchParams.get("returnScheduleId") as string)
    : null;
  
  // Süreç yönetimi ve form geçerliliği
  const [currentStep, setCurrentStep] = useState(1);
  const [progressValue, setProgressValue] = useState(33);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [contactInfo, setContactInfo] = useState({
    email: "",
    phone: ""
  });
  const [formIsValid, setFormIsValid] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Yolcu türlerine göre sayılar
  const adultCount = parseInt(searchParams.get("passenger_adult") || "1");
  const childCount = parseInt(searchParams.get("passenger_child") || "0");
  const seniorCount = parseInt(searchParams.get("passenger_senior") || "0");
  const babyCount = parseInt(searchParams.get("passenger_baby") || "0");

  // Rota bilgilerini çek
  const { data: route, isLoading: isLoadingRoute } = useQuery<Route>({
    queryKey: [`/api/routes/${routeId}`],
    queryFn: async () => {
      const res = await fetch(`/api/routes/${routeId}`);
      if (!res.ok) throw new Error("Failed to fetch route");
      return res.json();
    },
  });

  // Seçilen seferi çek
  const { data: schedule, isLoading: isLoadingSchedule } = useQuery<Schedule>({
    queryKey: ['/api/schedules', scheduleId],
    queryFn: async () => {
      const res = await fetch(`/api/schedules/${scheduleId}`);
      if (!res.ok) throw new Error("Failed to fetch schedule");
      return res.json();
    },
    enabled: !!scheduleId,
  });

  // Yolcu türlerini çek
  const { data: passengerTypes } = useQuery<PassengerType[]>({
    queryKey: ['/api/passenger-types'],
  });

  // Araç tipini çek
  const { data: vehicleType } = useQuery<VehicleType>({
    queryKey: ['/api/vehicle-types', vehicleTypeId],
    queryFn: async () => {
      const res = await fetch(`/api/vehicle-types/${vehicleTypeId}`);
      if (!res.ok) throw new Error("Failed to fetch vehicle type");
      return res.json();
    },
    enabled: !!vehicleTypeId && vehicleTypeId !== 1, // Araç yoksa (vehicleTypeId=1) çekme
  });

  // Yolcu formlarını yolcu tipine göre oluştur
  useEffect(() => {
    if (passengerTypes && passengerTypes.length > 0) {
      let totalPassengerCount = 0;
      let passengerArray = [];
      
      // Yetişkin yolcular
      for (let i = 0; i < adultCount; i++) {
        const adultPassenger = {
          passengerTypeId: passengerTypes.find(p => p.name === "Adult")?.id || 1,
          firstName: "",
          lastName: "",
          documentNumber: "",
          birthDate: "",
          contact: contactInfo.email,
          passengerType: "Adult"
        };
        passengerArray.push(adultPassenger);
        totalPassengerCount++;
      }
      
      // Çocuk yolcular
      for (let i = 0; i < childCount; i++) {
        const childPassenger = {
          passengerTypeId: passengerTypes.find(p => p.name === "Child")?.id || 2,
          firstName: "",
          lastName: "",
          documentNumber: "",
          birthDate: "",
          contact: "",
          passengerType: "Child"
        };
        passengerArray.push(childPassenger);
        totalPassengerCount++;
      }
      
      // Yaşlı yolcular
      for (let i = 0; i < seniorCount; i++) {
        const seniorPassenger = {
          passengerTypeId: passengerTypes.find(p => p.name === "Senior")?.id || 3,
          firstName: "",
          lastName: "",
          documentNumber: "",
          birthDate: "",
          contact: "",
          passengerType: "Senior"
        };
        passengerArray.push(seniorPassenger);
        totalPassengerCount++;
      }
      
      // Bebek yolcular
      for (let i = 0; i < babyCount; i++) {
        const babyPassenger = {
          passengerTypeId: passengerTypes.find(p => p.name === "Baby")?.id || 4,
          firstName: "",
          lastName: "",
          birthDate: "",
          contact: "",
          passengerType: "Baby"
        };
        passengerArray.push(babyPassenger);
        totalPassengerCount++;
      }
      
      setPassengers(passengerArray);
    }
  }, [passengerTypes, adultCount, childCount, seniorCount, babyCount, contactInfo.email]);

  // Form doğrulama
  useEffect(() => {
    // Tüm yolcuların zorunlu alanlarını kontrol et
    const allPassengersValid = passengers.every(p => 
      p.firstName && p.lastName && (p.passengerType !== "Adult" || p.documentNumber)
    );
    
    // İletişim bilgilerini kontrol et
    const contactValid = contactInfo.email && contactInfo.phone;
    
    setFormIsValid(allPassengersValid && contactValid && termsAccepted === true);
  }, [passengers, contactInfo, termsAccepted]);

  // Toplam fiyat hesaplama
  const calculateTotalPrice = () => {
    if (!route || !passengerTypes) return 0;
    
    const basePrice = parseFloat(route.basePrice.toString());
    const vehiclePrice = vehicleType ? parseFloat(vehicleType.additionalPrice.toString()) : 0;
    
    // Yolcu fiyatlarını hesapla
    let passengerPrice = 0;
    
    if (passengerTypes) {
      passengers.forEach(passenger => {
        const passengerType = passengerTypes.find(pt => pt.id === passenger.passengerTypeId);
        if (passengerType) {
          passengerPrice += basePrice * parseFloat(passengerType.priceMultiplier.toString());
        }
      });
    } else {
      // Yolcu tipleri yüklenmediyse basit hesap
      passengerPrice = basePrice * passengerCount;
    }
    
    const totalPrice = passengerPrice + vehiclePrice;
    return totalPrice;
  };

  // İletişim bilgilerini güncelle
  const updateContactInfo = (field: string, value: string) => {
    setContactInfo(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Yetişkin yolcuları güncelle (otomatik iletişim bilgisi aktarımı)
    if (field === "email") {
      const updatedPassengers = passengers.map(p => {
        if (p.passengerType === "Adult") {
          return {...p, contact: value};
        }
        return p;
      });
      setPassengers(updatedPassengers);
    }
  };

  // Rezervasyon oluşturma
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const res = await apiRequest("POST", "/api/bookings", bookingData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Rezervasyon oluşturuldu",
        description: "Rezervasyonunuz başarıyla oluşturuldu. Ödeme sayfasına yönlendiriliyorsunuz.",
      });
      
      // Ödeme sayfasına yönlendir
      navigate(`/payment/${data.id}?total=${calculateTotalPrice()}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Rezervasyon oluşturulamadı",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Rezervasyon oluştur
  const createBooking = () => {
    if (!formIsValid) {
      toast({
        title: "Form eksik",
        description: "Lütfen tüm gerekli alanları doldurun ve şartları kabul edin.",
        variant: "destructive",
      });
      return;
    }

    // Rezervasyon verisini oluştur
    const bookingData = {
      routeId,
      scheduleId,
      returnScheduleId: tripType === "round-trip" ? returnScheduleId : undefined,
      departureDate: format(departureDate, "yyyy-MM-dd"),
      returnDate: returnDate ? format(returnDate, "yyyy-MM-dd") : undefined,
      totalPrice: calculateTotalPrice().toString(),
      status: "pending",
      isPaid: false,
      bookingReference: generateBookingReference(),
      contactEmail: contactInfo.email,
      contactPhone: contactInfo.phone,
      passengers: passengers.map(p => ({
        passengerTypeId: p.passengerTypeId,
        firstName: p.firstName,
        lastName: p.lastName,
        documentNumber: p.documentNumber || "",
        birthDate: p.birthDate || null,
      })),
      vehicle: vehicleTypeId !== 1 ? { vehicleTypeId } : undefined,
    };

    createBookingMutation.mutate(bookingData);
  };

  // Adım değiştirme
  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      setProgressValue((currentStep + 1) * 33);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setProgressValue((currentStep - 1) * 33);
    }
  };

  // Yükleme durumu
  if (isLoadingRoute || isLoadingSchedule) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Rota bulunamadıysa
  if (!route) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-red-600 mb-2">Rota bulunamadı</h3>
              <p className="text-neutral-600 mb-4">
                İstediğiniz rota bulunamadı.
              </p>
              <Button onClick={() => navigate("/")}>
                Ana Sayfaya Dön
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sefer bulunamadıysa
  if (!schedule && scheduleId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-red-600 mb-2">Sefer bulunamadı</h3>
              <p className="text-neutral-600 mb-4">
                Seçilen sefer bulunamadı.
              </p>
              <Button onClick={() => navigate(`/search-results?from=${route.departurePort}&to=${route.arrivalPort}`)}>
                Sefer Ara
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Bilet Satın Al - {route.departurePort} → {route.arrivalPort} | Feribot Bileti</title>
        <meta
          name="description"
          content={`${route.departurePort} - ${route.arrivalPort} seferi için bilet satın alın. Yolcu bilgilerinizi girin ve ödemeye geçin.`}
        />
      </Helmet>

      <div className="bg-neutral-50 min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* İlerleme çubuğu */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <div className={`flex items-center ${currentStep >= 1 ? 'text-primary font-medium' : 'text-neutral-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${currentStep >= 1 ? 'bg-primary text-white' : 'bg-neutral-200'}`}>
                    <span>{currentStep > 1 ? <Check className="h-5 w-5" /> : 1}</span>
                  </div>
                  Sefer Bilgileri
                </div>
                <div className={`flex items-center ${currentStep >= 2 ? 'text-primary font-medium' : 'text-neutral-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${currentStep >= 2 ? 'bg-primary text-white' : 'bg-neutral-200'}`}>
                    <span>{currentStep > 2 ? <Check className="h-5 w-5" /> : 2}</span>
                  </div>
                  Yolcu Bilgileri
                </div>
                <div className={`flex items-center ${currentStep >= 3 ? 'text-primary font-medium' : 'text-neutral-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${currentStep >= 3 ? 'bg-primary text-white' : 'bg-neutral-200'}`}>
                    <span>3</span>
                  </div>
                  Ödeme
                </div>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Ana içerik */}
              <div className="md:col-span-2 space-y-6">
                {/* Adım 1: Sefer Bilgileri */}
                {currentStep === 1 && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center text-lg">
                          <Ship className="h-5 w-5 mr-2" />
                          Sefer Bilgileri
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col space-y-4">
                          {/* Rota bilgileri */}
                          <div className="bg-neutral-50 p-4 rounded-lg border">
                            <div className="flex items-start">
                              <div className="flex-1">
                                <div className="flex items-center mb-3">
                                  <MapPin className="h-4 w-4 text-primary mr-1" />
                                  <span className="font-medium">{route.departurePort}</span>
                                  {route.countryDeparture && (
                                    <span className="text-xs text-neutral-500 ml-1">({route.countryDeparture})</span>
                                  )}
                                </div>
                                
                                <div className="border-l-2 border-dashed border-neutral-300 h-10 ml-2"></div>
                                
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 text-primary mr-1" />
                                  <span className="font-medium">{route.arrivalPort}</span>
                                  {route.countryArrival && (
                                    <span className="text-xs text-neutral-500 ml-1">({route.countryArrival})</span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className="text-xs text-neutral-500">Seyahat Süresi</div>
                                <div className="flex items-center justify-end">
                                  <Clock className="h-4 w-4 mr-1 text-neutral-400" />
                                  <span className="font-medium">{formatDuration(route.duration)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Sefer detayları */}
                          <div className="bg-neutral-50 p-4 rounded-lg border">
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 text-primary mr-1" />
                                <span className="font-medium">{format(departureDate, "d MMMM yyyy, EEEE")}</span>
                              </div>
                              {route.isInternational && (
                                <Badge className="bg-blue-500">Uluslararası Sefer</Badge>
                              )}
                            </div>
                            
                            {schedule && (
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm text-neutral-500">Kalkış</div>
                                  <div className="text-lg font-semibold">{schedule.departureTime.substring(0, 5)}</div>
                                </div>
                                
                                <div className="flex-1 mx-4 border-t border-dashed border-neutral-300 relative">
                                  <Ship className="h-4 w-4 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                                </div>
                                
                                <div>
                                  <div className="text-sm text-neutral-500">Varış</div>
                                  <div className="text-lg font-semibold">{schedule.arrivalTime.substring(0, 5)}</div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Yolcu bilgileri özeti */}
                          <div className="bg-neutral-50 p-4 rounded-lg border">
                            <h3 className="font-medium mb-3 flex items-center">
                              <Users className="h-4 w-4 mr-2 text-primary" />
                              Yolcular
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-2">
                              {adultCount > 0 && (
                                <div className="text-sm p-2 bg-white rounded border">
                                  <span className="font-medium">{adultCount}</span> Yetişkin
                                </div>
                              )}
                              
                              {childCount > 0 && (
                                <div className="text-sm p-2 bg-white rounded border">
                                  <span className="font-medium">{childCount}</span> Çocuk (2-12 yaş)
                                </div>
                              )}
                              
                              {seniorCount > 0 && (
                                <div className="text-sm p-2 bg-white rounded border">
                                  <span className="font-medium">{seniorCount}</span> Yaşlı (65+ yaş)
                                </div>
                              )}
                              
                              {babyCount > 0 && (
                                <div className="text-sm p-2 bg-white rounded border">
                                  <span className="font-medium">{babyCount}</span> Bebek (0-2 yaş)
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Araç bilgileri */}
                          {vehicleTypeId !== 1 && vehicleType && (
                            <div className="bg-neutral-50 p-4 rounded-lg border">
                              <h3 className="font-medium mb-3 flex items-center">
                                <Car className="h-4 w-4 mr-2 text-primary" />
                                Araç
                              </h3>
                              
                              <div className="p-2 bg-white rounded border text-sm">
                                {vehicleType.name}
                                <span className="text-neutral-500 ml-2">
                                  (+{formatCurrency(parseFloat(vehicleType.additionalPrice.toString()))})
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end">
                        <Button onClick={handleNextStep}>
                          Devam Et <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  </>
                )}

                {/* Adım 2: Yolcu Bilgileri */}
                {currentStep === 2 && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center text-lg">
                          <Users className="h-5 w-5 mr-2" />
                          Yolcu Bilgileri
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* İletişim bilgileri */}
                          <div className="bg-neutral-50 p-4 rounded-lg border mb-4">
                            <h3 className="font-medium mb-3">İletişim Bilgileri</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">E-posta*</label>
                                <input
                                  type="email"
                                  value={contactInfo.email}
                                  onChange={(e) => updateContactInfo('email', e.target.value)}
                                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                  placeholder="ornek@email.com"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Telefon*</label>
                                <PhoneInput
                                  value={contactInfo.phone}
                                  onChange={(value) => updateContactInfo('phone', value)}
                                  required
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Yolcu formları */}
                          {passengers.map((passenger, index) => (
                            <div key={index} className="bg-neutral-50 p-4 rounded-lg border mb-4">
                              <h3 className="font-medium mb-3 flex items-center">
                                <span className="w-6 h-6 bg-primary/10 text-primary rounded-full inline-flex items-center justify-center text-xs mr-2">{index + 1}</span>
                                {passenger.passengerType} {index === 0 ? '(Ana Yolcu)' : ''}
                              </h3>
                              <PassengerForm
                                passenger={passenger}
                                index={index}
                                passengerTypes={passengerTypes || []}
                                onChange={(updatedPassenger) => {
                                  const newPassengers = [...passengers];
                                  newPassengers[index] = updatedPassenger;
                                  setPassengers(newPassengers);
                                }}
                              />
                            </div>
                          ))}
                          
                          {/* Şartlar ve koşullar */}
                          <div className="flex items-start mt-4">
                            <input
                              type="checkbox"
                              id="terms"
                              checked={termsAccepted}
                              onChange={(e) => setTermsAccepted(e.target.checked === true)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/50 mt-1"
                            />
                            <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                              <a href="#" className="text-primary hover:underline">Şartlar ve koşulları</a> okudum ve kabul ediyorum. Kişisel bilgilerimin rezervasyon işlemleri için kullanılmasını onaylıyorum.
                            </label>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={handlePrevStep}>
                          Geri Dön
                        </Button>
                        <Button onClick={handleNextStep} disabled={!formIsValid}>
                          Devam Et <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  </>
                )}

                {/* Adım 3: Ödeme */}
                {currentStep === 3 && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center text-lg">
                          <CreditCard className="h-5 w-5 mr-2" />
                          Ödeme
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* Rezervasyon özeti */}
                          <div className="bg-neutral-50 p-4 rounded-lg border">
                            <h3 className="font-medium mb-3">Rezervasyon Özeti</h3>
                            
                            <div className="space-y-2 divide-y">
                              <div className="flex justify-between py-2">
                                <span>Rota:</span>
                                <span className="font-medium">{route.departurePort} → {route.arrivalPort}</span>
                              </div>
                              
                              <div className="flex justify-between py-2">
                                <span>Tarih:</span>
                                <span className="font-medium">{format(departureDate, "d MMMM yyyy")}</span>
                              </div>
                              
                              {schedule && (
                                <div className="flex justify-between py-2">
                                  <span>Sefer saati:</span>
                                  <span className="font-medium">{schedule.departureTime.substring(0, 5)} - {schedule.arrivalTime.substring(0, 5)}</span>
                                </div>
                              )}
                              
                              <div className="flex justify-between py-2">
                                <span>Toplam yolcu:</span>
                                <span className="font-medium">{passengerCount}</span>
                              </div>
                              
                              {vehicleTypeId !== 1 && vehicleType && (
                                <div className="flex justify-between py-2">
                                  <span>Araç:</span>
                                  <span className="font-medium">{vehicleType.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Fiyat detayları */}
                          <div className="bg-neutral-50 p-4 rounded-lg border">
                            <h3 className="font-medium mb-3">Fiyat Detayları</h3>
                            
                            <div className="space-y-2 divide-y">
                              {/* Yolcu fiyatları */}
                              {adultCount > 0 && (
                                <div className="flex justify-between py-2">
                                  <span>Yetişkin ({adultCount} x {formatCurrency(parseFloat(route.basePrice.toString()))})</span>
                                  <span className="font-medium">{formatCurrency(parseFloat(route.basePrice.toString()) * adultCount)}</span>
                                </div>
                              )}
                              
                              {childCount > 0 && passengerTypes && (
                                <div className="flex justify-between py-2">
                                  <span>
                                    Çocuk ({childCount} x {formatCurrency(parseFloat(route.basePrice.toString()) * parseFloat(passengerTypes.find(p => p.name === "Child")?.priceMultiplier.toString() || "0.7"))})
                                  </span>
                                  <span className="font-medium">
                                    {formatCurrency(parseFloat(route.basePrice.toString()) * parseFloat(passengerTypes.find(p => p.name === "Child")?.priceMultiplier.toString() || "0.7") * childCount)}
                                  </span>
                                </div>
                              )}
                              
                              {seniorCount > 0 && passengerTypes && (
                                <div className="flex justify-between py-2">
                                  <span>
                                    Yaşlı ({seniorCount} x {formatCurrency(parseFloat(route.basePrice.toString()) * parseFloat(passengerTypes.find(p => p.name === "Senior")?.priceMultiplier.toString() || "0.8"))})
                                  </span>
                                  <span className="font-medium">
                                    {formatCurrency(parseFloat(route.basePrice.toString()) * parseFloat(passengerTypes.find(p => p.name === "Senior")?.priceMultiplier.toString() || "0.8") * seniorCount)}
                                  </span>
                                </div>
                              )}
                              
                              {babyCount > 0 && passengerTypes && (
                                <div className="flex justify-between py-2">
                                  <span>
                                    Bebek ({babyCount} x {formatCurrency(parseFloat(route.basePrice.toString()) * parseFloat(passengerTypes.find(p => p.name === "Baby")?.priceMultiplier.toString() || "0"))})
                                  </span>
                                  <span className="font-medium">
                                    {formatCurrency(parseFloat(route.basePrice.toString()) * parseFloat(passengerTypes.find(p => p.name === "Baby")?.priceMultiplier.toString() || "0") * babyCount)}
                                  </span>
                                </div>
                              )}
                              
                              {/* Araç fiyatı */}
                              {vehicleTypeId !== 1 && vehicleType && (
                                <div className="flex justify-between py-2">
                                  <span>Araç ({vehicleType.name})</span>
                                  <span className="font-medium">{formatCurrency(parseFloat(vehicleType.additionalPrice.toString()))}</span>
                                </div>
                              )}
                              
                              {/* Toplam */}
                              <div className="flex justify-between py-2">
                                <span className="font-bold">Toplam</span>
                                <span className="font-bold text-xl text-primary">{formatCurrency(calculateTotalPrice())}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Ödeme bilgilendirmesi */}
                          <Alert>
                            <AlertTitle>Ödeme Bilgilendirmesi</AlertTitle>
                            <AlertDescription>
                              "Ödemeyi Tamamla" düğmesine tıkladığınızda güvenli ödeme sayfasına yönlendirileceksiniz. Rezervasyonunuz, ödeme işlemi tamamlandıktan sonra kesinleşecektir.
                            </AlertDescription>
                          </Alert>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={handlePrevStep}>
                          Geri Dön
                        </Button>
                        <Button 
                          onClick={createBooking}
                          disabled={createBookingMutation.isPending || !formIsValid}
                          className="bg-primary hover:bg-primary/90"
                        >
                          {createBookingMutation.isPending ? (
                            <>
                              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                              İşleniyor...
                            </>
                          ) : (
                            <>Ödemeyi Tamamla</>
                          )}
                        </Button>
                      </CardFooter>
                    </Card>
                  </>
                )}
              </div>

              {/* Yan bölüm */}
              <div className="md:col-span-1">
                <div className="space-y-6">
                  {/* Rezervasyon özeti */}
                  <Card>
                    <CardHeader className="bg-gradient-to-r from-primary to-primary/90 text-white">
                      <CardTitle className="text-lg">Özet</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <Ship className="h-4 w-4 text-primary mr-2" />
                          <div className="font-medium">
                            {route.departurePort} → {route.arrivalPort}
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-primary mr-2" />
                          <div>
                            {format(departureDate, "d MMMM yyyy")}
                          </div>
                        </div>
                        
                        {schedule && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-primary mr-2" />
                            <div>
                              {schedule.departureTime.substring(0, 5)} - {schedule.arrivalTime.substring(0, 5)}
                            </div>
                          </div>
                        )}
                        
                        <Separator />
                        
                        <div className="flex items-center">
                          <Users className="h-4 w-4 text-primary mr-2" />
                          <div>
                            {passengerCount} Yolcu
                            {vehicleTypeId !== 1 && vehicleType && (
                              <span className="ml-1">+ {vehicleType.name}</span>
                            )}
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex justify-between pt-2">
                          <span className="font-medium">Toplam Tutar:</span>
                          <span className="font-bold text-primary">{formatCurrency(calculateTotalPrice())}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Yardım kartı */}
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">Yardıma mı ihtiyacınız var?</h3>
                      <p className="text-sm text-neutral-600 mb-3">
                        Satın alma süreciyle ilgili sorularınız varsa, müşteri hizmetlerimizle iletişime geçebilirsiniz.
                      </p>
                      <div className="flex items-center text-sm font-medium text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        +90 850 123 45 67
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderPage;