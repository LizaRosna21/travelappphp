const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/pages/admin/revenue-management.tsx');

// Dosyayı oku
let content = fs.readFileSync(filePath, 'utf8');

// Boş value değerini düzelt
let updatedContent = content.replace(/<SelectItem value="">\s*All Routes\s*<\/SelectItem>/g, 
  '<SelectItem value="all">All Routes</SelectItem>');

// Global Settings için boş value değerini düzelt
updatedContent = updatedContent.replace(/<SelectItem value="">\s*Global Settings\s*<\/SelectItem>/g, 
  '<SelectItem value="global">Global Settings</SelectItem>');

// Dosyayı kaydet
fs.writeFileSync(filePath, updatedContent, 'utf8');

console.log('Select value düzeltmeleri tamamlandı!');