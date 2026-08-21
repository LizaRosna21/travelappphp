const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, 'server/routes.ts');
let content = fs.readFileSync(routesPath, 'utf8');

// Replace the usage of isAdmin(req) with the direct check
const updatedContent = content.replace(/isAdmin\(req\)/g, 'req.user?.role === "admin"');

fs.writeFileSync(routesPath, updatedContent);
console.log('Updated all occurrences of isAdmin(req) in server/routes.ts');
