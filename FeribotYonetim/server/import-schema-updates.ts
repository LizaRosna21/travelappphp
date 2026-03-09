// Bu script schema-updates.ts dosyasını ana schema.ts dosyasına dahil etmek için kullanılır
// Bu sayede üzerine yazma ihtiyacı olmadan yeni tablolar eklenebilir

import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ESM ile __dirname oluştur
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function importUpdates() {
  try {
    console.log("Schema güncelleme scriptini çalıştırma");
    
    const schemaPath = join(__dirname, '../shared/schema.ts');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    const updatePath = join(__dirname, '../shared/schema-updates.ts');
    const updateContent = fs.readFileSync(updatePath, 'utf8');
    
    // İmplement edilmiş mi kontrol et
    if (schemaContent.includes('// SOSYAL MEDYA PAYLAŞIMLARI')) {
      console.log("Şema güncellemeleri zaten dahil edilmiş, işlem atlanıyor.");
      return;
    }
    
    // schema.ts dosyasının sonuna eklemeleri yap
    const updatedContent = schemaContent + '\n\n' +
      '// Schema güncellemeleri - Buradan sonrası schema-updates.ts dosyasından dahil edilmiştir\n' +
      updateContent;
    
    fs.writeFileSync(schemaPath, updatedContent, 'utf8');
    console.log("Schema güncellemeleri başarıyla entegre edildi!");
    
  } catch (error) {
    console.error("Schema güncelleme hatası:", error);
  }
}

// Fonksiyonu çalıştır
importUpdates();