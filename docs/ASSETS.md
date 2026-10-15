# Assets

## Photography

Thirteen backgrounds from the approved photo bank in the owner's package
(`natus-paquete-tomas/assets/fotos/`, interface guide §11). The package ships
them at 900px; these are cut from the full-size originals published on
natus.world, which the package names as the source of the originals.

**Origin: the owner's approved bank.** Nebulosa is a Hubble image (NASA/ESA,
public domain, credit appreciated). Licensing of the rest is the owner's and
is recorded in the package, not here — ask before reusing any outside the app.

Every image is a centred 9:16 crop, encoded AVIF. One photograph per screen
(guide §7); the four fixed by the approved captures are marked.

| File | Bank name | Screen | Shipped | Size |
|------|-----------|--------|---------|------|
| `hero.avif` | Hoja (hero) | Landing | 627 x 1116 | 52 KB |
| `sala.avif` | La sala | Onboarding, Generating — capture «Empezar» | 762 x 1355 | 67 KB |
| `ella.avif` | Ella | «Para cuidarte» | 902 x 1604 | 61 KB |
| `mar.avif` | El mar | Carta — capture «Carta» | 1080 x 1920 | 184 KB |
| `canon.avif` | El cañón | Caminos — capture «Caminos» | 1080 x 1920 | 181 KB |
| `hoja.avif` | Hoja | Recorrido — capture «Recorrido» | 627 x 1116 | 50 KB |
| `luz.avif` | La luz | Hoy | 1080 x 1920 | 120 KB |
| `ojo.avif` | El ojo | Chat | 576 x 1024 | 31 KB |
| `plumas.avif` | Las plumas | Meditaciones, Mis prácticas | 1080 x 1920 | 152 KB |
| `cruce.avif` | El cruce | Comparar cartas | 1080 x 1920 | 360 KB |
| `montana.avif` | La montaña | Perfil, shown in black and white (§9.10) | 1080 x 1920 | 57 KB |
| `rio.avif` | El río | Crisis | 627 x 1116 | 36 KB |
| `nebulosa.avif` | Nebulosa | Gate, Signup, 404 | 1080 x 1920 | 208 KB |

The assignments beyond the four captures are a proposal awaiting the owner's
sign-off. The approved «Empezar» capture shows a curtained room that is not in
the bank; La sala is the bank's only room.

### Format

AVIF: quality 62, and 45 for the five heaviest (mar, luz, plumas, cruce,
nebulosa). `sips` on macOS reads WebP but cannot write it; AVIF is supported
everywhere WebP is and compresses better on this low-contrast photography.
Perfil's monochrome is a CSS filter on the photo layer only (`mono` on
`Screen`), so no second file ships.

### Regenerating

```bash
curl -s https://natus.world/usuarios/bote2.webp --output source.webp
sips -s format png source.webp --out source.png
sips --cropToHeightWidth <h> <h*9/16> source.png      # centred 9:16
sips --resampleHeight 1920 source.png                  # only if taller
sips -s format avif -s formatOptions 62 source.png --out mar.avif
```

Originals: `usuarios/{sala.jpg,bote2.webp,canon3.webp,plumas-hd.webp}`,
`terapeutas/{hoja,selva-luz,camino-hd,montana}.webp`, `hero.jpg`, `ojo.webp`,
`usuario.jpg`, `ella-abiertos.webp`, `nebulosa.jpg`, all under natus.world.

### Link preview

`public/og.jpg`, 1200 x 630, is `forest` with the wordmark and the landing's
line set over it in the product's two typefaces — rendered from a throwaway
HTML page in a browser and screenshotted. Same origin as the photograph, so
the same licensing note applies. The source photo carries 60 px grey bands on
both edges, which the app's portrait crop hides; the card zooms past them.

## Typography

Cormorant Garamond and DM Sans, self-hosted from `src/styles/fonts/`: the
Latin subset of each variable font, as Google Fonts serves it (v21 and v17),
declared in `src/styles/index.css`. The upright faces are preloaded at build.

Both are licensed under the SIL Open Font License.

## Audio

None. Meditation bed tracks are synthesised in the browser with
`OscillatorNode` rather than shipped as files, which is why `data/bed-tracks.json`
holds synthesis descriptors instead of storage paths. There is therefore no
audio licence to track.
