from pathlib import Path

from PIL import Image


SOURCE = Path(__file__).resolve().parents[2] / "YSP" / "JSP_Boot_Up_No_scan_lines.gif"
OUTPUT = Path(__file__).resolve().parents[2] / "YSP" / "JSA_boot_transparent.gif"


def key_alpha(red: int, green: int, blue: int) -> int:
    """Remove the black plate while keeping dark blue emblem edges intact."""
    maximum = max(red, green, blue)
    if maximum <= 8:
        return 0
    if maximum >= 34:
        return 255
    return round((maximum - 8) / 26 * 255)


source = Image.open(SOURCE)
frames = []
durations = []

for frame_index in range(getattr(source, "n_frames", 1)):
    source.seek(frame_index)
    frame = source.convert("RGBA")
    pixels = frame.load()

    for y in range(frame.height):
        for x in range(frame.width):
            red, green, blue, _ = pixels[x, y]
            pixels[x, y] = (red, green, blue, key_alpha(red, green, blue))

    frames.append(frame)
    durations.append(source.info.get("duration", 50))

frames[0].save(
    OUTPUT,
    save_all=True,
    append_images=frames[1:],
    duration=durations,
    loop=0,
    disposal=2,
    transparency=0,
    optimize=False,
)

print(f"Wrote {OUTPUT}")
print(f"Frames: {len(frames)} / duration: {sum(durations)} ms")
