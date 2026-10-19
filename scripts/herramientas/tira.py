# A contact sheet: frames of a video every N seconds, or a list of PNGs, in a grid with their label.
# python3 -I tira.py video.mp4 out.png [every_s=0.5] [columns=5] [width=360]
# python3 -I tira.py a.png b.png c.png out.png          (PNGs: last argument is the output)
import sys, subprocess, tempfile, glob, os
from PIL import Image, ImageDraw
args = sys.argv[1:]
if args[0].lower().endswith(('.mp4', '.webm', '.mov')):
    video, out = args[0], args[1]
    every = float(args[2]) if len(args) > 2 else 0.5
    cols = int(args[3]) if len(args) > 3 else 5
    w = int(args[4]) if len(args) > 4 else 360
    d = tempfile.mkdtemp()
    subprocess.run(['ffmpeg', '-v', 'error', '-i', video, '-vf', f'fps={1/every},scale={w}:-2', f'{d}/%04d.png'], check=True)
    files = sorted(glob.glob(f'{d}/*.png'))
    labels = ['%.1fs' % (i * every) for i in range(len(files))]
else:
    files, out, cols, w = args[:-1], args[-1], min(4, len(args) - 1), 480
    labels = [os.path.basename(f) for f in files]
ims = []
for f in files:
    im = Image.open(f).convert('RGB'); im = im.resize((w, int(im.height * w / im.width))); ims.append(im)
rows = [ims[i:i + cols] for i in range(0, len(ims), cols)]
heights = [max(i.height for i in r) for r in rows]
sheet = Image.new('RGB', (cols * (w + 4), sum(h + 4 for h in heights)), (60, 60, 60))
y = 0
for r, (row, h) in enumerate(zip(rows, heights)):
    for c, im in enumerate(row):
        ImageDraw.Draw(im).text((6, 6), labels[r * cols + c], fill=(255, 80, 80))
        sheet.paste(im, (c * (w + 4), y))
    y += h + 4
sheet.save(out)
print(out, len(ims), 'cuadros')
