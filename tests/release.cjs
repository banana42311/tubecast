/* Static deployment contract: node tests/release.cjs */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
for(const name of ['index.html','line.html','lines.html','map.html','console.html','about.html','onboarding.html']){
 const html=fs.readFileSync(name,'utf8');
 for(const [,ref] of html.matchAll(/(?:src|href)="([^"]+)"/g)){
  if(/^(?:https?:|mailto:|#|data:|blob:)/.test(ref))continue;
  const local=ref.split(/[?#]/)[0];if(local)assert(fs.existsSync(path.resolve(local)),name+' missing '+local);
 }
 if(name==='lines.html'){assert(html.includes('index.html#all-lines'));continue;}
 assert(html.includes('rel="manifest"'),name+' has manifest');
 assert(html.includes('apple-touch-icon'),name+' has iPhone icon');
}
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');
assert(!manifest.start_url.startsWith('/'),'start URL stays inside GitHub project subdirectory');
for(const icon of manifest.icons){const data=fs.readFileSync(icon.src);assert.equal(data.toString('ascii',1,4),'PNG');const size=icon.sizes.split('x').map(Number);assert.equal(data.readUInt32BE(16),size[0]);assert.equal(data.readUInt32BE(20),size[1]);}
assert(fs.existsSync('.nojekyll'));
console.log('PASS all entry-page links/assets, project-relative PWA manifest, PNG dimensions and GitHub Pages configuration');
