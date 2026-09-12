const fs = require('fs');
const path = require('path');

// routes.ts dosyasını oku
const routesPath = path.join(__dirname, 'server', 'routes.ts');
let content = fs.readFileSync(routesPath, 'utf8');

// Hatalı ifadeyi düzelt: !req.user?.role === "admin" -> req.user?.role !== "admin"
let newContent = content.replace(/if \(!req\.user\?\.role === "admin"\) \{/g, 'if (req.user?.role !== "admin") {');

// Yeni içeriği yaz
fs.writeFileSync(routesPath, newContent, 'utf8');

console.log('Admin kontrol ifadeleri düzeltildi.');