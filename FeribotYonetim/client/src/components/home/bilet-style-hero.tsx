import { useEffect, useState, useRef } from "react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Ship, MapPin, Search, ArrowRightLeft, Users, Car,
  User, Baby, Cog, GraduationCap, ChevronDown
} from "lucide-react";
import { Port } from "@shared/schema";

// Biletcom stil ana sayfa hero bileşeni
const BiletStyleHero = () => {
  const { settings } = useSiteSettings();
  const [, navigate] = useLocation();
  
  // Sefer türü için sekme değeri
  const [transportType, setTransportType] = useState("ferry");
  
  // Seyahat tipi (tek yön / gidiş-dönüş)
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  
  // Yolcu tipleri için arayüz
  interface PassengerTypes {
    adult: number;
    child: number;
    infant: number;
    senior: number;
    student: number;
  }

  // Araç tipleri için arayüz
  interface VehicleType {
    selected: boolean;
    type: string;
    length?: number;
    height?: number;
  }

  // Seçim değerleri
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departureDate, setDepartureDate] = useState<Date | undefined>(new Date());
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [passengerCount, setPassengerCount] = useState(1);
  
  // Detaylı yolcu tipleri
  const [passengerTypes, setPassengerTypes] = useState<PassengerTypes>({
    adult: 1,
    child: 0,
    infant: 0,
    senior: 0,
    student: 0
  });
  
  // Araç seçimi
  const [showVehicleOptions, setShowVehicleOptions] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleType[]>([
    { selected: false, type: "car", length: 0, height: 0 },
    { selected: false, type: "caravan", length: 0, height: 0 },
    { selected: false, type: "motorcycle", length: 0, height: 0 },
    { selected: false, type: "bicycle", length: 0, height: 0 }
  ]);
  
  // Yolcu detayları dropdown kontrolü
  const [showPassengerDetails, setShowPassengerDetails] = useState(false);

  // Limanları yükle
  const { data: ports } = useQuery<Port[]>({
    queryKey: ['/api/ports'],
  });

  // Gidiş-dönüş seçildiğinde, returnDate'i otomatik ayarla
  useEffect(() => {
    if (tripType === 'round-trip' && !returnDate && departureDate) {
      const oneWeekLater = new Date(departureDate);
      oneWeekLater.setDate(oneWeekLater.getDate() + 7);
      setReturnDate(oneWeekLater);
    }
  }, [tripType, returnDate, departureDate]);

  // Arama işlemi
  const handleSearch = () => {
    if (!from || !to || !departureDate) return;

    const searchParams = new URLSearchParams();
    searchParams.append('from', from);
    searchParams.append('to', to);
    searchParams.append('departureDate', departureDate.toISOString());
    searchParams.append('tripType', tripType);
    searchParams.append('passengers', passengerCount.toString());
    
    // Detaylı yolcu tiplerini ekle
    Object.entries(passengerTypes).forEach(([type, count]) => {
      if (count > 0) {
        searchParams.append(`passenger_${type}`, count.toString());
      }
    });
    
    // Seçili araçları ekle
    const selectedVehicles = vehicles.filter(v => v.selected);
    if (selectedVehicles.length > 0) {
      selectedVehicles.forEach((vehicle, index) => {
        searchParams.append(`vehicle_${index}_type`, vehicle.type);
        if (vehicle.length) searchParams.append(`vehicle_${index}_length`, vehicle.length.toString());
        if (vehicle.height) searchParams.append(`vehicle_${index}_height`, vehicle.height.toString());
      });
      searchParams.append('hasVehicle', 'true');
    }
    
    if (tripType === 'round-trip' && returnDate) {
      searchParams.append('returnDate', returnDate.toISOString());
    }

    navigate(`/search-results?${searchParams.toString()}`);
  };

  const handleSwapPorts = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };
  
  // Yolcu sayısını artır/azalt
  const adjustPassengerCount = (delta: number) => {
    const newCount = passengerCount + delta;
    if (newCount >= 1 && newCount <= 9) {
      setPassengerCount(newCount);
      
      // Eğer yolcu tipi azaltılıyorsa ve yetişkin sayısı 1'in altına düşecekse engelle
      if (delta < 0 && passengerTypes.adult <= 1) {
        return;
      }
      
      // Total ve yetişkin sayısını güncelle
      if (delta > 0) {
        setPassengerTypes(prev => ({ ...prev, adult: prev.adult + 1 }));
      } else {
        setPassengerTypes(prev => ({ ...prev, adult: prev.adult - 1 }));
      }
    }
  };
  
  // Belirli bir yolcu tipinin sayısını artır/azalt
  const adjustPassengerType = (type: keyof PassengerTypes, delta: number) => {
    const currentValue = passengerTypes[type];
    const newValue = currentValue + delta;
    
    // Toplam yolcu sayısı limiti (9)
    const totalPassengers = Object.values(passengerTypes).reduce((sum, val) => sum + val, 0);
    
    // Yeni değer 0-9 arasında olmalı ve toplam 9'u geçmemeli
    if (newValue >= 0 && newValue <= 9 && (totalPassengers + delta <= 9)) {
      // Eğer yetişkin sayısı 0'a düşürülmeye çalışılıyorsa engelle
      if (type === 'adult' && newValue < 1) {
        return;
      }
      
      // Yolcu tipini güncelle
      setPassengerTypes(prev => ({
        ...prev,
        [type]: newValue
      }));
      
      // Toplam yolcu sayısını güncelle
      setPassengerCount(totalPassengers + delta);
    }
  };
  
  // Araç seçimini değiştir
  const toggleVehicle = (index: number) => {
    const updatedVehicles = [...vehicles];
    updatedVehicles[index].selected = !updatedVehicles[index].selected;
    setVehicles(updatedVehicles);
  };
  
  // Araç boyutlarını güncelle
  const updateVehicleDimensions = (index: number, field: 'length' | 'height', value: number) => {
    const updatedVehicles = [...vehicles];
    updatedVehicles[index][field] = value;
    setVehicles(updatedVehicles);
  };

  return (
    <div className="bg-gradient-to-b from-blue-700 to-blue-500 pt-12 pb-24 relative">
      {/* Dekoratif dalgalar */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-white" 
        style={{ 
          clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 75% 50%, 50% 0, 25% 50%, 0 0)'
        }} 
      />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Başlık Bölümü */}
          <div className="mb-10 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {settings?.siteName || "FerryTicket"} ile Seyahat
            </h1>
            <p className="text-lg text-white/90 max-w-3xl mx-auto">
              Yurt içi ve yurt dışı tüm feribot seferlerini en uygun fiyatlarla hemen satın alın.
            </p>
          </div>
          
          {/* Ana Arama Kartı */}
          <Card className="border-none shadow-xl">
            <CardContent className="p-0">
              {/* Ulaşım Tipi Sekmeleri - Sadece Feribot */}
              <Tabs defaultValue="ferry" onValueChange={setTransportType} className="w-full">
                <TabsList className="w-full rounded-none rounded-t-lg h-16 bg-slate-100">
                  <TabsTrigger value="ferry" className="data-[state=active]:bg-white rounded-none rounded-t-lg h-full w-full">
                    <Ship className="mr-2 h-5 w-5" />
                    <span className="inline">Feribot</span>
                  </TabsTrigger>
                </TabsList>
                
                {/* Feribot İçeriği */}
                <TabsContent value="ferry" className="p-6">
                  {/* Seyahat Tipi Seçimi */}
                  <div className="flex mb-6 border-b">
                    <button 
                      className={`px-4 py-2 font-medium ${tripType === 'one-way' ? 'text-primary border-b-2 border-primary' : 'text-neutral-500 hover:text-primary'}`}
                      onClick={() => setTripType('one-way')}
                    >
                      Tek Yön
                    </button>
                    <button 
                      className={`px-4 py-2 font-medium ${tripType === 'round-trip' ? 'text-primary border-b-2 border-primary' : 'text-neutral-500 hover:text-primary'}`}
                      onClick={() => setTripType('round-trip')}
                    >
                      Gidiş-Dönüş
                    </button>
                  </div>
                  
                  {/* Ana Arama Formu */}
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-9 gap-4 relative">
                      {/* Nereden */}
                      <div className="md:col-span-4">
                        <Label className="font-medium">Nereden</Label>
                        <div className="relative mt-1">
                          <Select value={from} onValueChange={setFrom}>
                            <SelectTrigger className="w-full py-6">
                              <div className="flex items-center">
                                <MapPin className="mr-2 h-4 w-4 text-neutral-500" />
                                <SelectValue placeholder="Kalkış Limanı" />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {ports?.map((port) => (
                                <SelectItem key={port.id} value={port.name}>
                                  {port.name}{port.country ? ` (${port.country})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* Yer Değiştirme Butonu */}
                      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 md:block hidden">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-10 w-10 rounded-full bg-white shadow-md border-blue-200 hover:bg-blue-50"
                          onClick={handleSwapPorts}
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Nereye */}
                      <div className="md:col-span-4">
                        <Label className="font-medium">Nereye</Label>
                        <div className="relative mt-1">
                          <Select value={to} onValueChange={setTo}>
                            <SelectTrigger className="w-full py-6">
                              <div className="flex items-center">
                                <MapPin className="mr-2 h-4 w-4 text-neutral-500" />
                                <SelectValue placeholder="Varış Limanı" />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {ports?.filter(port => !from || port.name !== from).map((port) => (
                                <SelectItem key={port.id} value={port.name}>
                                  {port.name}{port.country ? ` (${port.country})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* Gelişmiş Yolcu Sayısı */}
                      <div className="md:col-span-1">
                        <Label className="font-medium">Yolcu</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              role="combobox" 
                              className="w-full justify-between h-[50px] border"
                            >
                              <div className="flex items-center">
                                <Users className="mr-2 h-4 w-4 text-neutral-500" />
                                <span>{passengerCount}</span>
                              </div>
                              <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 w-[300px]" align="start" side="bottom" avoidCollisions={false} alignOffset={-24}>
                            <div className="p-4 space-y-4">
                              <h4 className="font-semibold text-sm border-b pb-2">Yolcu Tipleri</h4>
                              
                              {/* Yetişkin */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <User className="h-4 w-4 mr-2 text-neutral-500" />
                                  <div>
                                    <p className="text-sm font-medium">Yetişkin</p>
                                    <p className="text-xs text-neutral-500">12+ yaş</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 w-8 p-0"
                                    onClick={() => adjustPassengerType('adult', -1)}
                                    disabled={passengerTypes.adult <= 1}
                                  >-</Button>
                                  <span className="w-6 text-center">{passengerTypes.adult}</span>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 w-8 p-0"
                                    onClick={() => adjustPassengerType('adult', 1)}
                                  >+</Button>
                                </div>
                              </div>
                              
                              {/* Çocuk */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <User className="h-4 w-4 mr-2 text-neutral-500" />
                                  <div>
                                    <p className="text-sm font-medium">Çocuk</p>
                                    <p className="text-xs text-neutral-500">2-12 yaş</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 w-8 p-0"
                                    onClick={() => adjustPassengerType('child', -1)}
                                    disabled={passengerTypes.child <= 0}
                                  >-</Button>
                                  <span className="w-6 text-center">{passengerTypes.child}</span>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 w-8 p-0"
                                    onClick={() => adjustPassengerType('child', 1)}
                                  >+</Button>
                                </div>
                              </div>
                              
                              {/* Bebek */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Baby className="h-4 w-4 mr-2 text-neutral-500" />
                                  <div>
                                    <p className="text-sm font-medium">Bebek</p>
                                    <p className="text-xs text-neutral-500">0-2 yaş</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 w-8 p-0"
                                    onClick={() => adjustPassengerType('infant', -1)}
                                    disabled={passengerTypes.infant <= 0}
                                  >-</Button>
                                  <span className="w-6 text-center">{passengerTypes.infant}</span>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 w-8 p-0"
                                    onClick={() => adjustPassengerType('infant', 1)}
                                  >+</Button>
                                </div>
                              </div>
                              
                              {/* Yaşlı */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Cog className="h-4 w-4 mr-2 text-neutral-500" />
                                  <div>
                                    <p className="text-sm font-medium">Yaşlı</p>
                                    <p className="text-xs text-neutral-500">65+ yaş</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 w-8 p-0"
                                    onClick={() => adjustPassengerType('senior', -1)}
                                    disabled={passengerTypes.senior <= 0}
                                  >-</Button>
                                  <span className="w-6 text-center">{passengerTypes.senior}</span>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 w-8 p-0"
                                    onClick={() => adjustPassengerType('senior', 1)}
                                  >+</Button>
                                </div>
                              </div>
                              
                              {/* Öğrenci */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <GraduationCap className="h-4 w-4 mr-2 text-neutral-500" />
                                  <div>
                                    <p className="text-sm font-medium">Öğrenci</p>
                                    <p className="text-xs text-neutral-500">12+ yaş, öğrenci kimlikli</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 w-8 p-0"
                                    onClick={() => adjustPassengerType('student', -1)}
                                    disabled={passengerTypes.student <= 0}
                                  >-</Button>
                                  <span className="w-6 text-center">{passengerTypes.student}</span>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 w-8 p-0"
                                    onClick={() => adjustPassengerType('student', 1)}
                                  >+</Button>
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    
                    {/* Araç Ekleme */}
                    <div className="flex items-center mb-2 justify-between">
                      <div className="flex items-center">
                        <Checkbox 
                          id="add-vehicle"
                          checked={showVehicleOptions}
                          onCheckedChange={(checked) => setShowVehicleOptions(checked as boolean)}
                          className="mr-2"
                        />
                        <Label htmlFor="add-vehicle" className="cursor-pointer text-sm">
                          Araç eklemek istiyorum
                        </Label>
                      </div>
                    </div>
                    
                    {/* Araç Seçenekleri */}
                    {showVehicleOptions && (
                      <div className="border p-4 rounded-lg mb-4 bg-slate-50">
                        <h4 className="font-medium text-sm mb-3">Araç Türünü Seçin</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {vehicles.map((vehicle, index) => (
                            <div 
                              key={vehicle.type} 
                              className={`border rounded-lg p-3 cursor-pointer transition-colors ${vehicle.selected ? 'bg-blue-50 border-blue-300' : 'hover:bg-slate-100'}`}
                              onClick={() => toggleVehicle(index)}
                            >
                              <div className="flex flex-col items-center">
                                <Car className={`h-6 w-6 mb-1 ${vehicle.selected ? 'text-blue-500' : 'text-neutral-400'}`} />
                                <span className="text-xs font-medium">
                                  {vehicle.type === 'car' && 'Otomobil'}
                                  {vehicle.type === 'caravan' && 'Karavan'}
                                  {vehicle.type === 'motorcycle' && 'Motosiklet'}
                                  {vehicle.type === 'bicycle' && 'Bisiklet'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Seçili araçlar için boyut bilgileri */}
                        {vehicles.some(v => v.selected) && (
                          <div className="mt-4 space-y-3">
                            <h4 className="font-medium text-sm">Araç Boyutları</h4>
                            {vehicles.map((vehicle, index) => (
                              vehicle.selected && (
                                <div key={`${vehicle.type}-dimensions`} className="space-y-2">
                                  <p className="text-xs">{vehicle.type === 'car' ? 'Otomobil' : vehicle.type === 'caravan' ? 'Karavan' : vehicle.type === 'motorcycle' ? 'Motosiklet' : 'Bisiklet'} Boyutları</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-xs">Uzunluk (m)</Label>
                                      <Input 
                                        type="number" 
                                        value={vehicle.length} 
                                        onChange={(e) => updateVehicleDimensions(index, 'length', parseFloat(e.target.value) || 0)}
                                        className="h-8 text-sm"
                                        step="0.1"
                                        min="0"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Yükseklik (m)</Label>
                                      <Input 
                                        type="number" 
                                        value={vehicle.height} 
                                        onChange={(e) => updateVehicleDimensions(index, 'height', parseFloat(e.target.value) || 0)}
                                        className="h-8 text-sm"
                                        step="0.1"
                                        min="0"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Gidiş Tarihi */}
                      <div>
                        <Label className="font-medium">Gidiş Tarihi</Label>
                        <div className="mt-1">
                          <DatePicker 
                            date={departureDate} 
                            setDate={setDepartureDate}
                            minDate={new Date()}
                            className="py-6"
                          />
                        </div>
                      </div>
                      
                      {/* Dönüş Tarihi (sadece gidiş-dönüş seçiliyse) */}
                      {tripType === 'round-trip' && (
                        <div>
                          <Label className="font-medium">Dönüş Tarihi</Label>
                          <div className="mt-1">
                            <DatePicker 
                              date={returnDate} 
                              setDate={setReturnDate}
                              minDate={departureDate ? new Date(departureDate) : new Date()}
                              className="py-6"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Arama Butonu */}
                    <Button 
                      className="w-full py-6 text-lg bg-blue-600 hover:bg-blue-700" 
                      onClick={handleSearch}
                      disabled={!from || !to || !departureDate}
                    >
                      <Search className="mr-2 h-5 w-5" />
                      Bilet Bul
                    </Button>
                  </div>
                </TabsContent>
                
                {/* Sadece feribot modülü aktif olduğu için diğer içerikler kaldırıldı */}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BiletStyleHero;