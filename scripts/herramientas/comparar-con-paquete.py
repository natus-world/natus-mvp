# Put the approved screen from the branding package next to our screenshot, to look at them together.
# python3 -I comparar-con-paquete.py <package.png> <ours.png> <out.png>
# A package PNG under 1000 px wide is the phone (780 = 390 x 2): side by side.
# Otherwise it is desktop (1440): one above the other.
import sys
from PIL import Image
p, o, out = sys.argv[1:4]
a = Image.open(p).convert('RGB'); b = Image.open(o).convert('RGB')
if a.width < 1000:
    b = b.resize((a.width, int(b.height * a.width / b.width)))
    im = Image.new('RGB', (a.width * 2 + 20, max(a.height, b.height)), 'white')
    im.paste(a, (0, 0)); im.paste(b, (a.width + 20, 0))
    im = im.resize((im.width // 2, im.height // 2))
else:
    b = b.resize((a.width, int(b.height * a.width / b.width)))
    im = Image.new('RGB', (a.width, a.height + b.height + 20), 'white')
    im.paste(a, (0, 0)); im.paste(b, (0, a.height + 20))
    im = im.resize((960, int(im.height * 960 / a.width)))
im.save(out)
print(out)
