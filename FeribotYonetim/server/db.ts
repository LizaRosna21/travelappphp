import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Optimize database connection pool
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maksimum bağlantı sayısı
  idleTimeoutMillis: 30000, // Boşta kalma zaman aşımı
  connectionTimeoutMillis: 2000 // Bağlantı zaman aşımı
});

// Drizzle ORM yapılandırması
export const db = drizzle({ 
  client: pool, 
  schema,
  logger: false // Loglama kapalı, performans için
});

// Genişletilmiş sorgu önbellekleme sistemi
// Farklı sorgu tipleri için ayrı önbellekler - performans optimizasyonu
const queryCaches = {
  user: new Map<string, { result: any, timestamp: number }>(),
  route: new Map<string, { result: any, timestamp: number }>(),
  booking: new Map<string, { result: any, timestamp: number }>(),
  general: new Map<string, { result: any, timestamp: number }>()
};

// Farklı sorgu tipleri için önbellek süreleri (ms)
const CACHE_TTL = {
  user: 120000,     // Kullanıcı sorguları 2 dakika
  route: 300000,    // Rota sorguları 5 dakika
  booking: 180000,  // Rezervasyon sorguları 3 dakika 
  general: 60000    // Genel sorgular 1 dakika
};

// Dinamik olarak sorgu tipini belirle
function getCacheType(sql: string): 'user' | 'route' | 'booking' | 'general' {
  sql = sql.toLowerCase();
  if (sql.includes('users') || sql.includes('user_profiles')) {
    return 'user';
  } else if (sql.includes('routes') || sql.includes('schedules') || sql.includes('ports')) {
    return 'route';
  } else if (sql.includes('bookings') || sql.includes('booking_passengers') || sql.includes('payment')) {
    return 'booking';
  }
  return 'general';
}

db.execute = async (sql: string, params: any[] = [], useCache = true) => {
  // Önbellek kullanılacaksa ve SQL sorgusu basit bir SELECT ise
  // DELETE, UPDATE ve INSERT sorgularını önbelleğe almıyoruz
  if (useCache && sql.trim().toLowerCase().startsWith('select')) {
    const cacheType = getCacheType(sql);
    const cache = queryCaches[cacheType];
    const cacheTTL = CACHE_TTL[cacheType];
    
    const cacheKey = `${sql}-${JSON.stringify(params)}`;
    const cached = cache.get(cacheKey);
    
    // Önbellekte varsa ve süresi geçmemişse
    if (cached && (Date.now() - cached.timestamp) < cacheTTL) {
      // console.log(`Cache hit for ${cacheType} query: ${sql.substring(0, 30)}...`);
      return cached.result;
    }
    
    // Önbellekte yoksa veya süresi geçmişse, çalıştır ve önbelleğe al
    const result = await pool.query(sql, params);
    cache.set(cacheKey, { result, timestamp: Date.now() });
    
    // Önbellek boyutunu kontrol et (250'den fazlaysa en eski girişleri temizle)
    if (cache.size > 250) {
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // En eski 50 girişi sil
      entries.slice(0, 50).forEach(([key]) => cache.delete(key));
    }
    
    return result;
  }
  
  // DATA MODIFICATION sorgusuysa, ilgili önbellekleri temizle
  if (!sql.trim().toLowerCase().startsWith('select')) {
    const affectedType = getCacheType(sql);
    if (affectedType !== 'general') {
      queryCaches[affectedType].clear();
      console.log(`${affectedType} cache cleared due to data modification`);
    }
  }
  
  // Önbellek kullanılmayacaksa doğrudan çalıştır
  return await pool.query(sql, params);
};

// Önbelleği temizleme fonksiyonları - geliştirilmiş
db.clearCache = () => {
  Object.values(queryCaches).forEach(cache => cache.clear());
  console.log('All query caches cleared');
};

// Belirli bir kategori için önbelleği temizleme
db.clearCacheCategory = (category: 'user' | 'route' | 'booking' | 'general') => {
  if (queryCaches[category]) {
    queryCaches[category].clear();
    console.log(`${category} cache cleared`);
  } else {
    console.error(`Invalid cache category: ${category}`);
  }
};

// Önbellek durumu hakkında bilgi
db.getCacheStats = () => {
  const stats = {
    user: queryCaches.user.size,
    route: queryCaches.route.size,
    booking: queryCaches.booking.size,
    general: queryCaches.general.size,
    total: queryCaches.user.size + queryCaches.route.size + queryCaches.booking.size + queryCaches.general.size
  };
  return stats;
};
