const fs = require('fs');
const c = fs.readFileSync('backend/src/travel/catalog/catalog_http.gleam', 'utf8');
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('create_manage_listing')) {
    console.log('Line ' + (i + 1) + ': ' + lines[i].substring(0, 300));
  }
}
