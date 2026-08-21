import express, { Request, Response } from "express";
import axios from "axios";

const weatherRouter = express.Router();

/**
 * OpenWeatherMap API veya benzeri bir hava durumu API'sine istek atar
 * Demo modda örnek veri döndürür
 */
weatherRouter.get("/:city", async (req: Request, res: Response) => {
  const city = req.params.city;
  const countryCode = req.query.countryCode || "TR";
  
  try {
    // API anahtarı bulunuyorsa gerçek API kullanılabilir
    if (process.env.OPENWEATHER_API_KEY) {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?q=${city},${countryCode}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
      );
      
      // API yanıtını işleyip formatla ve gönder
      // Bu kısımda gerçek API yanıtları işlenecek
      
      return res.json(response.data);
    } else {
      // Demo mod - örnek veri gönder
      const demoData = generateDemoWeatherData(city, countryCode as string);
      return res.json(demoData);
    }
  } catch (error) {
    console.error("Hava durumu bilgisi alınamadı:", error);
    return res.status(500).json({ error: "Hava durumu bilgisi alınamadı" });
  }
});

/**
 * Demo mod için örnek hava durumu verisi üretir
 */
function generateDemoWeatherData(city: string, countryCode: string) {
  // Rastgele sıcaklık değeri (15-30 arası)
  const temp = 15 + Math.random() * 15;
  const feels_like = temp + (Math.random() * 3 - 1); // -1 ile +2 arası fark
  
  // Nem değeri (40-90 arası)
  const humidity = Math.round(40 + Math.random() * 50);
  
  // Rüzgar hızı (0-30 arası)
  const wind_speed = Math.round(Math.random() * 30);
  
  // Rüzgar yönü (0-360 arası)
  const wind_direction = Math.round(Math.random() * 360);
  
  // Hava durumu koşulları
  const conditions = ["clear", "partly_cloudy", "rain", "thunderstorm", "snow"];
  const condition = conditions[Math.floor(Math.random() * conditions.length)];
  
  // İlgili simge
  const icons = ["sun", "cloud", "cloud-rain", "cloud-lightning", "cloud-snow"];
  const icon = icons[conditions.indexOf(condition)];
  
  // 5 günlük tahmin için yardımcı fonksiyon
  const generateForecast = () => {
    return Array.from({ length: 5 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      const icon = icons[conditions.indexOf(condition)];
      
      return {
        date: date.toISOString(),
        max_temp: Math.round(15 + Math.random() * 15),
        min_temp: Math.round(10 + Math.random() * 10),
        condition,
        icon,
        wind_speed: Math.round(Math.random() * 30),
        chance_of_rain: Math.round(Math.random() * 100)
      };
    });
  };
  
  return {
    cityName: city,
    countryCode,
    temp,
    feels_like,
    humidity,
    wind_speed,
    wind_direction,
    condition,
    icon,
    forecast: generateForecast()
  };
}

export default weatherRouter;