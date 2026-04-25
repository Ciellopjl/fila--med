const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace indigo with emerald
    let updated = content.replace(/indigo/g, 'emerald');
    
    // Replace zinc with slate for a slightly more blueish dark theme
    updated = updated.replace(/zinc/g, 'slate');
    
    if (content !== updated) {
      fs.writeFileSync(filePath, updated, 'utf8');
      console.log('Updated: ' + filePath);
    }
  }
});
