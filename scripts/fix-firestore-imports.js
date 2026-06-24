const fs = require('fs');
const path = require('path');

const skip = new Set(['lib/firebase.ts', 'lib/firebaseConfig.ts']);

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    const rel = p.replace(/\\/g, '/');
    if (skip.has(rel)) continue;
    if (ent.isDirectory()) walk(p, files);
    else if (/\.(ts|tsx)$/.test(ent.name)) files.push(p);
  }
  return files;
}

const files = walk('app').concat(walk('components')).concat(walk('lib'));
let changed = 0;

for (const file of files) {
  let s = fs.readFileSync(file, 'utf8');
  const orig = s;

  if (!/\bdb\b/.test(s) && !/\bstorage\b/.test(s)) continue;

  s = s.replace(/import\s*\{([^}]+)\}\s*from\s*['"]@\/lib\/firebase['"]/g, (_m, inner) => {
    const updated = inner.replace(/\bdb\b/g, 'getDb').replace(/\bstorage\b/g, 'getStorageInstance');
    return `import {${updated}} from '@/lib/firebase'`;
  });

  s = s.replace(/import\s*\{([^}]+)\}\s*from\s*['"]\.\/firebase['"]/g, (_m, inner) => {
    const updated = inner.replace(/\bdb\b/g, 'getDb').replace(/\bstorage\b/g, 'getStorageInstance');
    return `import {${updated}} from './firebase'`;
  });

  s = s.replace(/\bcollection\(db,/g, 'collection(getDb(),');
  s = s.replace(/\bcollection\(db\)/g, 'collection(getDb())');
  s = s.replace(/\bdoc\(db,/g, 'doc(getDb(),');
  s = s.replace(/\bwriteBatch\(db\)/g, 'writeBatch(getDb())');
  s = s.replace(/\bref\(storage,/g, 'ref(getStorageInstance(),');
  s = s.replace(/\bgetDownloadURL\(ref\(storage,/g, 'getDownloadURL(ref(getStorageInstance(),');

  if (s !== orig) {
    fs.writeFileSync(file, s);
    changed += 1;
    console.log('updated', file);
  }
}

console.log('done', changed);
