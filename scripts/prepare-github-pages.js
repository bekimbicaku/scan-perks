const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const publicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(distDir)) {
  console.error('dist/ folder not found. Run expo export --platform web first.');
  process.exit(1);
}

const indexPath = path.join(distDir, 'index.html');
if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, path.join(distDir, '404.html'));
}

if (fs.existsSync(publicDir)) {
  for (const file of fs.readdirSync(publicDir)) {
    const source = path.join(publicDir, file);
    if (fs.statSync(source).isFile()) {
      fs.copyFileSync(source, path.join(distDir, file));
    }
  }
}

fs.writeFileSync(path.join(distDir, 'CNAME'), 'app.scan-perks.com\n');
fs.writeFileSync(path.join(distDir, '.nojekyll'), '\n');

console.log('Prepared dist/ for GitHub Pages (404.html, CNAME, public assets).');
