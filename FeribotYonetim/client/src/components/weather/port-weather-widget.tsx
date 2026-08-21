import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Sun, Cloud, CloudRain, CloudLightning, Wind, AlertCircle, CloudSnow, Compass, Droplets, Thermometer } from "lucide-react";

interface WeatherData {
  cityName: string;
  countryCode: string;
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  wind_direction: number;
  condition: string;
  icon: string;
  forecast: DailyForecast[];
}

interface DailyForecast {
  date: string;
  max_temp: number;
  min_temp: number;
  condition: string;
  icon: string;
  wind_speed: number;
  chance_of_rain: number;
}

interface PortWeatherWidgetProps {
  portName: string;
  countryCode?: string;
  className?: string;
}

export function PortWeatherWidget({ 
  portName, 
  countryCode = "TR",
  className = ""
}: PortWeatherWidgetProps) {
  const [selectedTab, setSelectedTab] = useState<string>("today");
  
  // Gerçek uygulamada bu veri hava durumu API'sinden gelmeli
  // Örneğin: OpenWeatherMap, AccuWeather, vs.
  const { data: weatherData, isLoading, isError } = useQuery<WeatherData>({
    queryKey: ['/api/weather', portName, countryCode],
    placeholderData: {
      cityName: portName,
      countryCode: countryCode,
      temp: 24.5,
      feels_like: 26.2,
      humidity: 65,
      wind_speed: 18,
      wind_direction: 240,
      condition: "partly_cloudy",
      icon: "cloud",
      forecast: [
        { 
          date: new Date().toISOString(), 
          max_temp: 25, 
          min_temp: 18, 
          condition: "clear", 
          icon: "sun", 
          wind_speed: 15,
          chance_of_rain: 5
        },
        { 
          date: new Date(Date.now() + 86400000).toISOString(), 
          max_temp: 27, 
          min_temp: 19, 
          condition: "partly_cloudy", 
          icon: "cloud-sun", 
          wind_speed: 12,
          chance_of_rain: 20
        },
        { 
          date: new Date(Date.now() + 86400000 * 2).toISOString(), 
          max_temp: 24, 
          min_temp: 17, 
          condition: "rain", 
          icon: "cloud-rain", 
          wind_speed: 22,
          chance_of_rain: 70
        },
        { 
          date: new Date(Date.now() + 86400000 * 3).toISOString(), 
          max_temp: 22, 
          min_temp: 16, 
          condition: "thunderstorm", 
          icon: "cloud-lightning", 
          wind_speed: 25,
          chance_of_rain: 80
        },
        { 
          date: new Date(Date.now() + 86400000 * 4).toISOString(), 
          max_temp: 21, 
          min_temp: 15, 
          condition: "partly_cloudy", 
          icon: "cloud", 
          wind_speed: 20,
          chance_of_rain: 40
        }
      ]
    }
  });

  // Hava durumu simgesini seç
  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case "clear":
        return <Sun className="h-8 w-8 text-yellow-500" />;
      case "partly_cloudy":
        return <Cloud className="h-8 w-8 text-gray-400" />;
      case "rain":
        return <CloudRain className="h-8 w-8 text-blue-400" />;
      case "thunderstorm":
        return <CloudLightning className="h-8 w-8 text-purple-500" />;
      case "snow":
        return <CloudSnow className="h-8 w-8 text-blue-200" />;
      default:
        return <Cloud className="h-8 w-8 text-gray-400" />;
    }
  };

  // Rüzgar yönünü metin olarak al
  const getWindDirection = (degrees: number) => {
    const directions = ["Kuzey", "KD", "Doğu", "GD", "Güney", "GB", "Batı", "KB"];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  // Hava durumu rengini belirle
  const getWeatherColor = (condition: string) => {
    switch (condition) {
      case "clear":
        return "text-yellow-500";
      case "partly_cloudy":
        return "text-gray-400";
      case "rain":
        return "text-blue-400";
      case "thunderstorm":
        return "text-purple-500";
      case "snow":
        return "text-blue-200";
      default:
        return "text-gray-400";
    }
  };

  // Günün tarihi için formatlayıcı
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  // Yükleme durumu
  if (isLoading) {
    return (
      <Card className={`border shadow-sm ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Hata durumu
  if (isError || !weatherData) {
    return (
      <Card className={`border shadow-sm bg-red-50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center text-red-500">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>Hava durumu bilgisi alınamadı</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border shadow-sm ${className}`}>
      <CardContent className="p-0">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-700">{weatherData.cityName} Hava Durumu</h3>
              <span className="text-xs text-gray-500">Deniz koşulları</span>
            </div>
            <TabsList className="grid grid-cols-2 h-9">
              <TabsTrigger value="today">Bugün</TabsTrigger>
              <TabsTrigger value="forecast">5 Günlük Tahmin</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="today" className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {getWeatherIcon(weatherData.condition)}
                <div className="ml-3">
                  <div className="font-bold text-2xl">{Math.round(weatherData.temp)}°C</div>
                  <div className="text-sm text-gray-500">Hissedilen: {Math.round(weatherData.feels_like)}°C</div>
                </div>
              </div>
              <div>
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <Wind className="h-4 w-4 mr-1" />
                  <span>{weatherData.wind_speed} km/sa - {getWindDirection(weatherData.wind_direction)}</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Droplets className="h-4 w-4 mr-1" />
                  <span>Nem: %{weatherData.humidity}</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="font-medium mb-2">Gemi Yolculuğu İçin Deniz Durumu:</div>
              <div className="bg-blue-50 p-3 rounded-md">
                <div className="flex items-center">
                  <Compass className="text-blue-500 h-4 w-4 mr-2" />
                  <span className="text-sm">
                    {weatherData.wind_speed < 15 ? 
                      "Sakin deniz, gemi yolculuğu için uygun koşullar" : 
                      weatherData.wind_speed < 25 ?
                      "Hafif dalgalı deniz, dikkatli olunması önerilir" :
                      "Dalgalı deniz, gemi yolculuğu zor olabilir"}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="forecast" className="p-0">
            <div className="grid grid-cols-5 divide-x">
              {weatherData.forecast.map((day, index) => (
                <div key={index} className="p-3 text-center">
                  <div className="text-xs font-medium mb-2">{formatDate(day.date)}</div>
                  <div className="flex justify-center mb-2">
                    {getWeatherIcon(day.condition)}
                  </div>
                  <div className="font-bold text-sm mb-1">
                    {Math.round(day.max_temp)}° / {Math.round(day.min_temp)}°
                  </div>
                  <div className="flex justify-center items-center text-xs text-gray-500 mb-1">
                    <Wind className="h-3 w-3 mr-1" />
                    <span>{day.wind_speed} km/s</span>
                  </div>
                  <div className="flex justify-center items-center text-xs text-gray-500">
                    <CloudRain className="h-3 w-3 mr-1" />
                    <span>%{day.chance_of_rain}</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}