/**
 * Verilen bir metni slug formatına dönüştürür.
 * Türkçe karakterleri düzgün şekilde dönüştürür.
 * Örnek: "Merhaba Dünya!" -> "merhaba-dunya"
 */
export function slugify(str: string): string {
  // Türkçe ve diğer özel karakterleri dönüştürme 
  const turkishMap: { [key: string]: string } = {
    'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c',
    'İ': 'I', 'Ğ': 'G', 'Ü': 'U', 'Ş': 'S', 'Ö': 'O', 'Ç': 'C'
  };
  
  // Tüm Türkçe karakterleri değiştir
  let text = str
    .replace(/[ıİğĞüÜşŞöÖçÇ]/g, match => turkishMap[match])
    .toString()
    .toLowerCase()
    .trim();
    
  // Alfanümerik olmayan karakterleri -'ye dönüştür
  text = text
    .replace(/\s+/g, '-')           // Boşlukları tire ile değiştir
    .replace(/[^\w\-]+/g, '')       // Alfanümerik olmayan karakterleri kaldır
    .replace(/\-\-+/g, '-')         // Çoklu tireleri tek tire yap
    .replace(/^-+/, '')             // Baştaki tireleri kaldır
    .replace(/-+$/, '');            // Sondaki tireleri kaldır
    
  return text;
}

/**
 * Başlıktan otomatik olarak slug üretir
 * Eğer bir sayfa başlığı verilmişse, onu slug formatına dönüştürür
 */
export function generateSlugFromTitle(title: string): string {
  return slugify(title);
}

/**
 * Türkçe karakterler için insan dostu URL dizelerini decode eder
 */
export function decodeSlug(slug: string): string {
  return decodeURIComponent(slug);
}