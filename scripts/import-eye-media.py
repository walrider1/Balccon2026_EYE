"""Prepare supplied local eye clips for browser/Pi playback. Requires ffmpeg/ffprobe.
Usage: python scripts/import-eye-media.py path/to/ntsc.zip
Archive files are data; no embedded code is executed.
"""
import json, pathlib, subprocess, sys, tempfile, zipfile

root = pathlib.Path(__file__).resolve().parents[1]
dest = root / 'terminal-sketch' / 'eye-media'
dest.mkdir(exist_ok=True)
records = []
with zipfile.ZipFile(sys.argv[1]) as archive, tempfile.TemporaryDirectory(prefix='eye-import-') as tmp:
    for entry in archive.infolist():
        if not entry.filename.startswith('ntsc/') or not entry.filename.endswith('.mov'):
            continue
        name = pathlib.PurePosixPath(entry.filename).name
        extracted = root / '.runtime' / 'media-source' / 'ntsc' / name
        source = extracted if extracted.exists() else pathlib.Path(tmp) / name
        if not extracted.exists():
            source.write_bytes(archive.read(entry))
        target = dest / (source.stem + '.mp4')
        temporary_target = dest / (source.stem + '.partial.mp4')
        probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(source)]))
        video = next(s for s in probe['streams'] if s['codec_type'] == 'video')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(source), '-map', '0:v:0', '-an', '-vf', 'scale=720:720', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(temporary_target)], check=True)
        temporary_target.replace(target)
        records.append({'source': entry.filename, 'file': target.name, 'duration': float(probe['format']['duration']), 'sourceCodec': video['codec_name'], 'sourcePixelFormat': video['pix_fmt'], 'sourceWidth': video['width'], 'sourceHeight': video['height'], 'fps': video['avg_frame_rate'], 'bytes': target.stat().st_size})
        print(target.name, flush=True)
(dest / 'manifest.json').write_text(json.dumps(records, indent=2), encoding='utf-8')
print(f'Imported {len(records)} silent H.264 clips, {sum(r["bytes"] for r in records)/1e6:.1f} MB')
