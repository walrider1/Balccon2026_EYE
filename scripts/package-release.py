"""Create a portable snapshot without credentials, runtime or personal documents."""
import pathlib,sys,zipfile,hashlib,json,datetime
root=pathlib.Path(__file__).resolve().parents[1]
target=pathlib.Path(sys.argv[1]); target.parent.mkdir(parents=True,exist_ok=True)
if target.exists(): raise SystemExit('Refusing to overwrite existing release')
files=[]
for folder in ['terminal-sketch','YSP','scripts','tests','deploy']:
 for f in (root/folder).rglob('*'):
  if f.is_file() and not f.is_symlink() and not any(p in {'.git','.runtime','node_modules','__pycache__'} or p.startswith('.env') for p in f.relative_to(root).parts) and '.partial.' not in f.name:
   files.append(f)
files += [f for f in root.glob('*.md') if f.is_file()]
files += [root/'server.js',root/'.env.example']
manifest={}
with zipfile.ZipFile(target,'x',zipfile.ZIP_DEFLATED,compresslevel=1) as z:
 for f in files:
  name=f.relative_to(root).as_posix();data=f.read_bytes();z.writestr(name,data);manifest[name]=hashlib.sha256(data).hexdigest()
 z.writestr('RELEASE-MANIFEST.json',json.dumps({'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sha256':manifest},indent=2))
with zipfile.ZipFile(target) as z:
 assert z.testzip() is None
 for name,digest in manifest.items(): assert hashlib.sha256(z.read(name)).hexdigest()==digest
 assert '.env' not in z.namelist() and not any(n.startswith('.runtime/') for n in z.namelist())
print(f'Verified release: {target} ({len(manifest)} files, {target.stat().st_size/1e6:.1f} MB)')
