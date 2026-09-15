const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'terminal-sketch/app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'terminal-sketch/index.html'),'utf8');
const assets=new Set([...app.matchAll(/['"](audio\/[^'"]+)['"]/g)].map(m=>'terminal-sketch/'+m[1]));
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if(!/^(https?:|data:)/.test(match[1])) assets.add(match[1].startsWith('/YSP/') ? match[1].slice(1) : 'terminal-sketch/'+match[1]);
}
let missing=0;
for(const name of ['eye.html','eye.css','eye-client.js','eye-director.js']) assets.add('terminal-sketch/'+name);
const manifest=path.join(root,'terminal-sketch/eye-media/manifest.json');
if(fs.existsSync(manifest)) {
  for(const clip of JSON.parse(fs.readFileSync(manifest,'utf8'))) assets.add('terminal-sketch/eye-media/'+clip.file);
} else { console.error('MISSING: eye media manifest — run scripts/import-eye-media.py with ntsc.zip'); missing++; }
for(const file of assets) if(!fs.existsSync(path.join(root,file))){console.error('MISSING: '+file);missing++;}
console.log(`Local application assets: ${assets.size-missing}/${assets.size} present.`);
const state=path.resolve(process.env.EYE_STATE_DIR || path.join(root,'.runtime'));
console.log('Administrator password: '+(fs.existsSync(path.join(state,'admin.json'))?'configured':'not configured — run node scripts/setup-admin.cjs'));
console.log('Run node scripts/check-ai.cjs with the server running to check API configuration.');
console.log('Hardware, OS kiosk and external lore/video integration require separate installation checks.');
if(missing) process.exitCode=1;
