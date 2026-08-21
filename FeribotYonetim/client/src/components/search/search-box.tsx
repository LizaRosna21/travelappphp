import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DatePicker } from "@/components/ui/datepicker";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Calendar, Users, Car, Baby, Plus, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Port, Route as RouteType, PassengerType, VehicleType } from "@shared/schema";
import { useSiteSettings } from "@/hooks/use-site-settings";

interface SearchBoxProps {
  className?: string;
  /**
   * Eğer `defaultValues` geçilirse, varsayılan değerler bu parametreler üzerinden ayarlanacak
   */
  defaultValues?: {
    /** Varsayılan kalkış limanı */
    defaultFrom?: string;
    /** Varsayılan varış limanı */
    defaultTo?: string;
    /** Varsayılan gidiş tarihi - ISO string formatında */
    defaultDepartureDate?: string;
    /** Varsayılan dönüş tarihi - ISO string formatında */
    defaultReturnDate?: string;
    /** Tek yön mü yoksa gidiş-dönüş mü? */
    defaultTripType?: 'one-way' | 'round-trip';
    /** Varsayılan araç türü ID'si */
    defaultVehicleTypeId?: string;
  };
  /**
   * Arama kutusu başlık metni, özel bir başlık kullanmak istediğinizde belirtin
   */
  title?: string;
  /**
   * Arama kutusu açıklama metni, özel bir açıklama kullanmak istediğinizde belirtin
   */
  subtitle?: string;
  /**
   * Eğer arama kutusu limanlar ön seçimli olarak çalışacaksa - bu özellik devre dışı bırakır
   * @default false
   */
  disablePortSelection?: boolean;
  /**
   * Arama butonu metni
   * @default "Search Tickets"
   */
  searchButtonText?: string;
  /**
   * Seçili kalkış limanı değiştiğinde çağrılacak fonksiyon
   */
  onFromChange?: (value: string) => void;
  /**
   * Seçili varış limanı değiştiğinde çağrılacak fonksiyon
   */
  onToChange?: (value: string) => void;
  /**
   * Seçili tarihler değiştiğinde çağrılacak fonksiyon
   */
  onDateChange?: (departure: Date | undefined, returnDate: Date | undefined) => void;
  /**
   * Arama düğmesine tıklandığında çalışacak özel fonksiyon
   * Eğer bu özellik belirtilirse, varsayılan arama davranışı gerçekleşmez
   */
  onCustomSearch?: (searchParams: URLSearchParams) => void;
  /**
   * Kompakt görünüm - daha dar bir arama kutusu için
   * @default false
   */
  compact?: boolean;
}

interface PassengerCount {
  id: number;
  type: string;
  count: number;
  maxAllowed: number;
}

const SearchBox = ({ 
  className, 
  defaultValues, 
  title, 
  subtitle, 
  disablePortSelection = false,
  searchButtonText = "Search Tickets",
  onFromChange,
  onToChange,
  onDateChange,
  onCustomSearch,
  compact = false
}: SearchBoxProps) => {
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>(
    defaultValues?.defaultTripType || 'one-way'
  );
  const [from, setFrom] = useState<string>(defaultValues?.defaultFrom || '');
  const [to, setTo] = useState<string>(defaultValues?.defaultTo || '');
  
  const initialDepartureDate = defaultValues?.defaultDepartureDate 
    ? new Date(defaultValues.defaultDepartureDate) 
    : new Date();
  
  const initialReturnDate = defaultValues?.defaultReturnDate 
    ? new Date(defaultValues.defaultReturnDate) 
    : undefined;
  
  const [departureDate, setDepartureDate] = useState<Date | undefined>(initialDepartureDate);
  const [returnDate, setReturnDate] = useState<Date | undefined>(initialReturnDate);
  const [vehicleType, setVehicleType] = useState<string>(defaultValues?.defaultVehicleTypeId || '1');
  
  // Araçsız / Araçlı modunu izlemek için
  const isWithoutVehicle = vehicleType === '0';
  const [, navigate] = useLocation();
  const { settings } = useSiteSettings();
  
  // From değişikliğini izle ve callback'i çağır
  const handleFromChange = (value: string) => {
    setFrom(value);
    if (onFromChange) {
      onFromChange(value);
    }
  };

  // To değişikliğini izle ve callback'i çağır
  const handleToChange = (value: string) => {
    setTo(value);
    if (onToChange) {
      onToChange(value);
    }
  };
  
  // Tarih değişikliklerini izle ve callback'i çağır
  const handleDepartureDateChange = (date: Date | undefined) => {
    setDepartureDate(date);
    if (onDateChange) {
      onDateChange(date, returnDate);
    }
  };
  
  const handleReturnDateChange = (date: Date | undefined) => {
    setReturnDate(date);
    if (onDateChange) {
      onDateChange(departureDate, date);
    }
  };
  
  // Yolcu sayısı kontrolü için
  const [passengerCounts, setPassengerCounts] = useState<PassengerCount[]>([
    { id: 1, type: 'Adult', count: 2, maxAllowed: 9 },
    { id: 2, type: 'Child', count: 0, maxAllowed: 9 },
    { id: 3, type: 'Baby', count: 0, maxAllowed: 4 },
    { id: 4, type: 'Senior', count: 0, maxAllowed: 9 },
  ]);
  
  const totalPassengers = passengerCounts.reduce((sum, p) => p.type !== 'Baby' ? sum + p.count : sum, 0);
  const passengerSummary = `${totalPassengers} Passenger${totalPassengers !== 1 ? 's' : ''}`;
  
  const handlePassengerChange = useCallback((id: number, increment: number) => {
    setPassengerCounts((currentCounts) => {
      const newCounts = [...currentCounts];
      const passengerIndex = newCounts.findIndex(p => p.id === id);
      
      if (passengerIndex === -1) return currentCounts;
      
      const passenger = newCounts[passengerIndex];
      const newCount = passenger.count + increment;
      
      // Bebekler için sınırsız, diğerleri için maksimum 9 kişi
      if (newCount < 0 || newCount > passenger.maxAllowed) return currentCounts;
      
      // Bebek hariç toplam 9 kişi sınırı kontrolü
      const totalWithoutCurrent = newCounts.reduce((sum, p) => {
        if (p.id === id || p.type === 'Baby') return sum;
        return sum + p.count;
      }, 0);
      
      if (passenger.type !== 'Baby' && totalWithoutCurrent + newCount > 9) return currentCounts;
      
      newCounts[passengerIndex] = { ...passenger, count: newCount };
      return newCounts;
    });
  }, []);

  useEffect(() => {
    if (tripType === 'round-trip' && !returnDate) {
      // Set return date to one week after departure date by default
      const nextWeek = new Date();
      if (departureDate) {
        nextWeek.setDate(departureDate.getDate() + 7);
        setReturnDate(nextWeek);
      }
    }
  }, [tripType, returnDate, departureDate]);

  const { data: ports } = useQuery<Port[]>({
    queryKey: ['/api/ports'],
  });

  const { data: passengerTypes } = useQuery<PassengerType[]>({
    queryKey: ['/api/passenger-types'],
  });

  const { data: vehicleTypes } = useQuery<VehicleType[]>({
    queryKey: ['/api/vehicle-types'],
  });

  const handleSearch = () => {
    if (!from || !to || !departureDate) return;

    const searchParams = new URLSearchParams();
    searchParams.append('from', from);
    searchParams.append('to', to);
    searchParams.append('departureDate', departureDate.toISOString());
    searchParams.append('vehicleType', vehicleType);
    searchParams.append('tripType', tripType);
    
    // Add passenger details
    passengerCounts.forEach(passenger => {
      searchParams.append(`passenger_${passenger.type.toLowerCase()}`, passenger.count.toString());
    });
    
    // Add total passenger count
    searchParams.append('totalPassengers', totalPassengers.toString());
    
    if (tripType === 'round-trip' && returnDate) {
      searchParams.append('returnDate', returnDate.toISOString());
    }

    // Eğer özel arama fonksiyonu verilmişse, onu kullan
    if (onCustomSearch) {
      onCustomSearch(searchParams);
    } else {
      // Varsayılan arama davranışı
      navigate(`/search-results?${searchParams.toString()}`);
    }
  };

  return (
    <div className={`container mx-auto px-4 relative z-10 ${className}`}>
      <div className={`${compact ? 'max-w-3xl' : 'max-w-4xl'} mx-auto`}>
        {/* Başlık ve Açıklama, eğer verilmişse göster */}
        {(title || subtitle) && (
          <>
            {title && <h1 className="text-3xl md:text-4xl text-white font-bold mb-4 text-center">{title}</h1>}
            {subtitle && <p className="text-white text-center mb-6">{subtitle}</p>}
          </>
        )}
        
        {/* Varsayılan başlık ve açıklama, özel başlık verilmemişse göster - zaten ana sayfada bu içerik var */}
        {!title && !subtitle && !compact && (
          <>
            <h1 className="text-3xl md:text-4xl text-white font-bold mb-4 text-center">Book Your Ferry Tickets Online</h1>
            <p className="text-white text-center mb-6">Find and book ferry tickets to your favorite destinations</p>
          </>
        )}
        
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl p-6 border border-white/30">
          {/* Tab Navigation */}
          <div className="flex mb-6 border-b">
            <button 
              className={`px-4 py-2 font-medium ${tripType === 'one-way' ? 'text-primary border-b-2 border-primary' : 'text-neutral-500 hover:text-primary'}`}
              onClick={() => setTripType('one-way')}
            >
              One Way
            </button>
            <button 
              className={`px-4 py-2 font-medium ${tripType === 'round-trip' ? 'text-primary border-b-2 border-primary' : 'text-neutral-500 hover:text-primary'}`}
              onClick={() => setTripType('round-trip')}
            >
              Round Trip
            </button>
          </div>
          
          {/* Search Form */}
          <div>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">From</label>
                <div className="relative">
                  {disablePortSelection ? (
                    <div className="w-full border border-neutral-300 rounded-md py-2 pl-10 pr-3 text-neutral-900 bg-neutral-100">
                      {from}
                    </div>
                  ) : (
                    <Select value={from} onValueChange={handleFromChange}>
                      <SelectTrigger className="w-full border border-neutral-300 rounded-md py-2 pl-10 pr-3 text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary">
                        <SelectValue placeholder="Select departure port" />
                      </SelectTrigger>
                      <SelectContent>
                        {ports?.map((port) => (
                          <SelectItem key={port.id} value={port.name}>
                            {port.name}{port.country ? ` (${port.country})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-neutral-400" />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">To</label>
                <div className="relative">
                  {disablePortSelection ? (
                    <div className="w-full border border-neutral-300 rounded-md py-2 pl-10 pr-3 text-neutral-900 bg-neutral-100">
                      {to}
                    </div>
                  ) : (
                    <Select value={to} onValueChange={handleToChange}>
                      <SelectTrigger className="w-full border border-neutral-300 rounded-md py-2 pl-10 pr-3 text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary">
                        <SelectValue placeholder="Select arrival port" />
                      </SelectTrigger>
                      <SelectContent>
                        {ports?.filter(port => !from || port.name !== from).map((port) => (
                          <SelectItem key={port.id} value={port.name}>
                            {port.name}{port.country ? ` (${port.country})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-neutral-400" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`grid ${compact ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-6 mb-6`}>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Departure Date</label>
                <div className="relative">
                  <DatePicker 
                    date={departureDate} 
                    setDate={handleDepartureDateChange}
                    minDate={new Date()}
                    closeOnSelect={true}
                  />
                </div>
              </div>
              
              {tripType === 'round-trip' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Return Date</label>
                  <div className="relative">
                    <DatePicker 
                      date={returnDate} 
                      setDate={handleReturnDateChange}
                      minDate={departureDate ? new Date(departureDate) : new Date()}
                      closeOnSelect={true}
                    />
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Passengers</label>
                <div className="relative">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full border border-neutral-300 rounded-md py-2 pl-10 pr-3 text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary justify-between">
                        <span>{passengerSummary}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0">
                      <Card>
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            {passengerCounts.map((passenger) => (
                              <div key={passenger.id} className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{passenger.type}</div>
                                  {passenger.type === 'Baby' && <div className="text-xs text-neutral-500">Under 2 years</div>}
                                  {passenger.type === 'Child' && <div className="text-xs text-neutral-500">2-12 years</div>}
                                  {passenger.type === 'Senior' && <div className="text-xs text-neutral-500">65+ years</div>}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 w-8 p-0 rounded-full"
                                    onClick={() => handlePassengerChange(passenger.id, -1)}
                                    disabled={passenger.count === 0}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="w-6 text-center">{passenger.count}</span>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 w-8 p-0 rounded-full"
                                    onClick={() => handlePassengerChange(passenger.id, 1)}
                                    disabled={
                                      passenger.count === passenger.maxAllowed ||
                                      (passenger.type !== 'Baby' && 
                                       totalPassengers - passenger.count + (passenger.count + 1) > 9)
                                    }
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            {totalPassengers === 9 && (
                              <div className="text-xs text-accent-dark p-2 bg-accent-light/20 rounded-md">
                                Note: Maximum 9 passengers (excluding babies) allowed per booking.
                              </div>
                            )}
                            {/* "Tamam" butonu ile yolcu seçim popoverını kapatma */}
                            <div className="flex justify-end mt-3">
                              <PopoverClose asChild>
                                <Button 
                                  className="bg-primary text-white hover:bg-primary/90"
                                >
                                  Tamam
                                </Button>
                              </PopoverClose>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </PopoverContent>
                  </Popover>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users className="h-5 w-5 text-neutral-400" />
                  </div>
                </div>
              </div>
              
              {!compact && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-neutral-700">Araç Seçimi</label>
                    <div className="flex space-x-1 text-xs">
                      <button 
                        type="button"
                        className={`px-3 py-1 rounded-l-md ${vehicleType === '0' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
                        onClick={() => setVehicleType('0')}
                      >
                        Araçsız
                      </button>
                      <button 
                        type="button"
                        className={`px-3 py-1 rounded-r-md ${vehicleType !== '0' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
                        onClick={() => vehicleType === '0' && setVehicleType('1')}
                      >
                        Araçlı
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <Select 
                      value={vehicleType} 
                      onValueChange={setVehicleType}
                      disabled={vehicleType === '0'} // Araçsız seçiliyse disable et
                    >
                      <SelectTrigger className={`w-full border border-neutral-300 rounded-md py-2 pl-10 pr-3 text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary ${vehicleType === '0' ? 'bg-gray-100 opacity-70' : ''}`}>
                        <SelectValue placeholder={vehicleType === '0' ? "Araçsız yolcu" : "Araç tipi seçin"} />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicleTypes?.filter(v => v.id > 1).map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            {vehicle.name} {vehicle.additionalPrice ? `(+${formatCurrency(parseFloat(vehicle.additionalPrice), 'USD')})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Car className={`h-5 w-5 ${vehicleType === '0' ? 'text-neutral-300' : 'text-neutral-400'}`} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {compact && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-neutral-700">Araç Seçimi</label>
                  <div className="flex space-x-1 text-xs">
                    <button 
                      type="button"
                      className={`px-3 py-1 rounded-l-md ${vehicleType === '0' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
                      onClick={() => setVehicleType('0')}
                    >
                      Araçsız
                    </button>
                    <button 
                      type="button"
                      className={`px-3 py-1 rounded-r-md ${vehicleType !== '0' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
                      onClick={() => vehicleType === '0' && setVehicleType('1')}
                    >
                      Araçlı
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Select 
                    value={vehicleType} 
                    onValueChange={setVehicleType}
                    disabled={vehicleType === '0'} // Araçsız seçiliyse disable et
                  >
                    <SelectTrigger className={`w-full border border-neutral-300 rounded-md py-2 pl-10 pr-3 text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary ${vehicleType === '0' ? 'bg-gray-100 opacity-70' : ''}`}>
                      <SelectValue placeholder={vehicleType === '0' ? "Araçsız yolcu" : "Araç tipi seçin"} />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypes?.filter(v => v.id > 1).map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                          {vehicle.name} {vehicle.additionalPrice ? `(+${formatCurrency(parseFloat(vehicle.additionalPrice), 'USD')})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Car className={`h-5 w-5 ${vehicleType === '0' ? 'text-neutral-300' : 'text-neutral-400'}`} />
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1">
              <Button 
                onClick={handleSearch}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-3 px-6 rounded-md transition-all duration-300 flex justify-center items-center space-x-2 shadow-lg hover:shadow-xl hover:translate-y-[-2px]"
                style={{ 
                  backgroundImage: settings?.buttonPrimaryColor 
                    ? `linear-gradient(to right, ${settings.buttonPrimaryColor}, ${settings.buttonSecondaryColor})` 
                    : undefined 
                }}
              >
                <Search className="h-5 w-5" />
                <span>{searchButtonText}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchBox;
