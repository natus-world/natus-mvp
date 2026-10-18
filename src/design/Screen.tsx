import { useLayoutEffect, type CSSProperties, type ReactNode } from 'react';

export type Backdrop =
  | 'hero'
  | 'sala'
  | 'ella'
  | 'mar'
  | 'canon'
  | 'hoja'
  | 'luz'
  | 'ojo'
  | 'plumas'
  | 'cruce'
  | 'montana'
  | 'rio'
  | 'nebulosa'
  | 'none';

const IMAGES: Record<Exclude<Backdrop, 'none'>, string> = {
  hero: 'hero.avif',
  sala: 'sala.avif',
  ella: 'ella.avif',
  mar: 'mar.avif',
  canon: 'canon.avif',
  hoja: 'hoja.avif',
  luz: 'luz.avif',
  ojo: 'ojo.avif',
  plumas: 'plumas.avif',
  cruce: 'cruce.avif',
  montana: 'montana.avif',
  rio: 'rio.avif',
  nebulosa: 'nebulosa.avif',
};

/**
 * Legibility gradients, transcribed per-screen from the mockup. Each one is
 * tuned to where that screen puts its text: `bottom` keeps the top of the
 * photograph clear and crushes the base to near-black for a bottom-anchored
 * headline, `even` is for screens with content throughout.
 */
const SCRIMS = {
  bottom:
    'linear-gradient(to bottom, rgb(11 18 14/0.15) 0%, rgb(11 18 14/0.05) 25%, rgb(11 18 14/0.35) 55%, rgb(11 18 14/0.82) 78%, rgb(11 18 14/0.96) 100%)',
  even: 'linear-gradient(to bottom, rgb(11 18 14/0.55) 0%, rgb(11 18 14/0.45) 50%, rgb(11 18 14/0.78) 100%)',
  diagonal:
    'linear-gradient(160deg, rgb(11 18 14/0.72) 0%, rgb(11 18 14/0.60) 60%, rgb(11 18 14/0.80) 100%)',
  heavy:
    'linear-gradient(to bottom, rgb(11 18 14/0.45) 0%, rgb(11 18 14/0.35) 40%, rgb(11 18 14/0.75) 70%, rgb(11 18 14/0.94) 100%)',
} as const;

export type Scrim = keyof typeof SCRIMS;

/**
 * How much of the photograph shows through, per screen.
 *
 * Nine values for what are really three situations. `hero` is the two entry
 * screens, where the photograph is the screen. `veil` is the onboarding
 * sequence, where it recedes behind a question. `content` is everything
 * else — and that one carries five numbers across twenty-seven screens,
 * including a 0.42 sitting next to a 0.45 in two states of the same screen.
 *
 * Named at their transcribed values rather than normalised, for the same
 * reason as the type scale in `tokens.css`: naming the drift and deciding
 * what it should be are different jobs.
 */
export const PHOTO = {
  hero: 0.9,
  veil70: 0.7,
  veil60: 0.6,
  veil55: 0.55,
  content50: 0.5,
  content45: 0.45,
  content42: 0.42,
  content40: 0.4,
  content35: 0.35,
} as const;

/**
 * The photo bank of the branding package (16 Oct 2026), in `public/img/banco`.
 * Each one carries its family — whose tone tints the veil, the glass, the bar
 * and the help pill — and has a wide crop for desktop when the package gave
 * one. The photo never takes a filter.
 */
export type Family = 'verde' | 'azul' | 'tierra' | 'arena' | 'grafito';

type BankPhoto = { file: string; wide?: string; family: Family };

export const BANK = {
  monstera: { file: 'monstera', wide: 'monstera-ancha', family: 'verde' },
  incienso: { file: 'incienso', wide: 'incienso-ancha', family: 'azul' },
  oceanoNoche: { file: 'oceano-noche', wide: 'oceano-noche-ancha', family: 'azul' },
  hojaGotas: { file: 'hoja-gotas', wide: 'hoja-gotas-ancha', family: 'verde' },
  concretoSombra: { file: 'concreto-sombra', wide: 'concreto-sombra-ancha', family: 'grafito' },
  maderaOscura: { file: 'madera-oscura', wide: 'madera-oscura-ancha', family: 'tierra' },
  surcosArena: { file: 'surcos-arena', wide: 'surcos-arena-ancha', family: 'grafito' },
  vela: { file: 'vela', wide: 'vela-ancha', family: 'verde' },
  muroSombra: { file: 'muro-sombra', wide: 'muro-sombra-ancha', family: 'arena' },
  cieloEstrellas: { file: 'cielo-estrellas', wide: 'cielo-estrellas-ancha', family: 'azul' },
  rocaBlanca: { file: 'roca-blanca', wide: 'roca-blanca-ancha', family: 'grafito' },
  hojasPlatano: { file: 'hojas-platano', wide: 'hojas-platano-ancha', family: 'verde' },
  maderaQuemada: { file: 'madera-quemada', wide: 'madera-quemada-ancha', family: 'tierra' },
  monje: { file: 'monje', wide: 'monje-ancho-real', family: 'azul' },
  estatua: { file: 'estatua', wide: 'estatua-ancha', family: 'tierra' },
  nubesAzules: { file: 'nubes-azules', wide: 'nubes-azules-ancha', family: 'azul' },
  lunaDunas: { file: 'luna-dunas', wide: 'luna-dunas-ancha', family: 'arena' },
  maderaCafe: { file: 'madera-cafe', wide: 'madera-cafe-ancha', family: 'tierra' },
  sedaAzul: { file: 'seda-azul', wide: 'seda-azul-ancha', family: 'azul' },
  bote: { file: 'bote2', wide: 'bote2-ancha', family: 'azul' },
  travertino: { file: 'travertino-madera', wide: 'travertino-madera-ancha', family: 'tierra' },
  ola: { file: 'ola', wide: 'ola-ancha', family: 'azul' },
  orilla: { file: 'orilla-aerea', wide: 'orilla-aerea-ancha', family: 'azul' },
} as const satisfies Record<string, BankPhoto>;

export type Photo = keyof typeof BANK;

const FAMILY_RGB: Record<Family, string> = {
  verde: '15 24 13',
  azul: '13 18 24',
  tierra: '24 18 13',
  arena: '24 20 15',
  grafito: '24 24 24',
};

type ScreenProps = {
  /** A photo from the bank: the new screens (16 Oct 2026). */
  photo?: Photo;
  /** The even veil over the whole photo, 0 to .62, per screen. */
  veil?: number;
  /** How opaque the glass is over this photo, .3 to .86. */
  glassAlpha?: number;
  /** Overrides the photo's family tone, as RGB channels («6 12 18»). */
  tone?: string;
  /** Where the photo is anchored when it is cropped. */
  focus?: string;
  /** Before the bank: the photo, gradient and opacity of the old screens. */
  backdrop?: Backdrop;
  scrim?: Scrim;
  /** Background opacity, matching the per-screen values in the mockup. */
  opacity?: number;
  mono?: boolean;
  children: ReactNode;
};

/**
 * The tone of the screen on view is set on the root, because the header, the
 * help pill and the tab bar live outside the screen and take it too.
 */
function useTone(rgb: string | undefined, glass: number | undefined) {
  useLayoutEffect(() => {
    const root = document.documentElement.style;
    if (rgb) root.setProperty('--v', rgb);
    else root.removeProperty('--v');
    if (glass !== undefined) root.setProperty('--glass-alpha', String(glass));
    else root.removeProperty('--glass-alpha');
  }, [rgb, glass]);
}

/**
 * A full-bleed screen: photograph, veil, content.
 *
 * With a bank `photo`, the 16 Oct 2026 rules: one even veil in the family's
 * tone over the whole photo, no bands; loose text with a soft shadow in the
 * same tone; and the content cut just below the header, with no mask.
 *
 * Image paths go through `import.meta.env.BASE_URL` so the app works both at
 * a domain root and under a `/natus-mvp/` subpath without a code change.
 */
export function Screen({
  photo,
  veil = 0.2,
  glassAlpha,
  tone,
  focus = 'center',
  backdrop = 'none',
  scrim = 'even',
  opacity = 0.85,
  mono = false,
  children,
}: ScreenProps) {
  const base = import.meta.env.BASE_URL;
  const bank = photo ? (BANK[photo] as BankPhoto) : undefined;
  useTone(tone ?? (bank ? FAMILY_RGB[bank.family] : undefined), bank ? glassAlpha : undefined);

  if (bank) {
    const style = {
      backgroundImage: `url(${base}img/banco/${bank.file}.avif)`,
      backgroundPosition: focus,
      ...(bank.wide ? { '--photo-wide': `url(${base}img/banco/${bank.wide}.avif)` } : {}),
    } as CSSProperties;
    return (
      <div className="on-photo relative h-full w-full overflow-hidden bg-noche">
        <div className="photo-layer" data-wide={bank.wide ? '' : undefined} style={style} aria-hidden="true" />
        <div className="photo-scrim" style={{ background: `rgb(var(--v) / ${veil})` }} aria-hidden="true" />
        <div className="screen-body">{children}</div>
      </div>
    );
  }

  const photoStyle: CSSProperties | undefined =
    backdrop === 'none'
      ? undefined
      : {
          backgroundImage: `url(${base}img/${IMAGES[backdrop]})`,
          backgroundPosition: focus,
          opacity,
        };

  return (
    <div className="relative h-full w-full overflow-hidden bg-noche">
      {photoStyle && <div className={mono ? 'photo-layer photo-mono' : 'photo-layer'} style={photoStyle} aria-hidden="true" />}
      <div className="photo-scrim" style={{ background: SCRIMS[scrim] }} aria-hidden="true" />
      <div className="relative flex h-full flex-col lg:mx-auto lg:w-full lg:max-w-[480px]">{children}</div>
    </div>
  );
}
