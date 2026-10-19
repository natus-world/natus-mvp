/**
 * How the journal opens and closes (owner, 19 Oct 2026, chosen from the
 * mockup «Abrir la Bitácora»). On desktop the open book itself travels from
 * where the cover lies on the wood, growing, and its left page turns on the
 * spine with the leather on its back — three seconds, the same backwards to
 * close. On the phone the page slides in from the right over the closed book,
 * which moves a little to the left and darkens — the mockup's slow motion,
 * 1.56 s. With reduced motion nothing moves: the views change at once.
 */

export const DESK_MS = 3000;
export const PHONE_MS = 1560;

type Rect = { x: number; y: number; w: number; h: number };

let lastCover: (Rect & { vw: number; vh: number }) | null = null;

/** Where the closed cover lies, measured while it is on screen. */
export function rememberCover(el: Element): void {
  const r = el.getBoundingClientRect();
  if (r.width === 0) return;
  lastCover = { x: r.left, y: r.top, w: r.width, h: r.height, vw: window.innerWidth, vh: window.innerHeight };
}

/**
 * The cover's rectangle on desktop. Measured when the book was seen closed at
 * this window size; otherwise from the closed book's own CSS (`.mesaR` and
 * `.tapaR`): 600 `--d` tall, its top 200 `--d` down, centred between 140 `--d`
 * and the right edge.
 */
export function coverRect(): Rect {
  if (lastCover && lastCover.vw === window.innerWidth && lastCover.vh === window.innerHeight) return lastCover;
  const vw = window.innerWidth;
  const d = Math.min(1.25, Math.max(0.8, vw / 1440));
  const h = 600 * d;
  const w = (h * 1415) / 2000;
  return { x: (140 * d + vw) / 2 - w / 2, y: 200 * d, w, h };
}

const EASE_OUT = 'cubic-bezier(.22,.61,.36,1)';
const EASE_IO = 'cubic-bezier(.45,.05,.25,1)';
const EASE_SLIDE = 'cubic-bezier(.32,.72,0,1)';
/** Where the travel ends and the turn is already under way. */
const CUT = 0.42;

export type DeskParts = {
  book: HTMLElement;
  turn: HTMLElement;
  rightPage: HTMLElement;
  rightShade: HTMLElement | null;
  turnShade: HTMLElement | null;
  close: HTMLElement | null;
};

function run(list: [HTMLElement | null, Keyframe[]][], ms: number, forward: boolean): Promise<void> {
  const anims = list
    .filter((x): x is [HTMLElement, Keyframe[]] => x[0] !== null)
    .map(([el, kf]) => el.animate(kf, { duration: ms, fill: 'both', direction: forward ? 'normal' : 'reverse' }));
  // Opened, the elements go back to their own CSS; closed, they stay where
  // the motion left them until the closed book replaces them.
  return Promise.all(anims.map((a) => a.finished)).then(
    () => {
      if (forward) anims.forEach((a) => a.cancel());
    },
    () => undefined,
  );
}

/** The book from the cover's place to the open spread (or back, to close). */
export function playDesk(parts: DeskParts, forward: boolean): Promise<void> {
  const cover = coverRect();
  const a = parts.book.getBoundingClientRect();
  const d = parts.rightPage.getBoundingClientRect();
  const sx = cover.w / d.width;
  const sy = cover.h / d.height;
  const tx = cover.x - a.left - (d.left - a.left) * sx;
  const ty = cover.y - a.top - (d.top - a.top) * sy;
  parts.book.style.transformOrigin = '0 0';
  const from = `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`;
  return run(
    [
      [parts.book, [{ offset: 0, transform: from, easing: EASE_OUT }, { offset: CUT, transform: 'none' }, { offset: 1, transform: 'none' }]],
      [parts.turn, [{ offset: 0, transform: 'rotateY(180deg)' }, { offset: CUT - 0.04, transform: 'rotateY(180deg)', easing: EASE_IO }, { offset: 1, transform: 'rotateY(0deg)' }]],
      [parts.rightShade, [{ offset: 0, opacity: 1 }, { offset: CUT, opacity: 1, easing: 'ease-out' }, { offset: 1, opacity: 0 }]],
      [parts.turnShade, [{ offset: 0, opacity: 0.9 }, { offset: CUT + 0.1, opacity: 0.9, easing: 'ease-out' }, { offset: 1, opacity: 0 }]],
      [parts.close, [{ offset: 0, opacity: 0 }, { offset: 0.3, opacity: 0, easing: 'ease-out' }, { offset: 0.6, opacity: 1 }, { offset: 1, opacity: 1 }]],
    ],
    DESK_MS,
    forward,
  ).then(() => {
    if (forward) parts.book.style.transformOrigin = '';
  });
}

/** The page over the closed book (or off it, to close). */
export function playPhone(page: HTMLElement, scene: HTMLElement, forward: boolean): Promise<void> {
  const shift = `translateX(${-window.innerWidth * 0.3}px)`;
  return run(
    [
      [page, [{ offset: 0, transform: 'translateX(100%)', easing: EASE_SLIDE }, { offset: 1, transform: 'translateX(0)' }]],
      [scene, [{ offset: 0, transform: 'translateX(0)', filter: 'brightness(1)', easing: EASE_SLIDE }, { offset: 1, transform: shift, filter: 'brightness(0.55)' }]],
    ],
    PHONE_MS,
    forward,
  );
}

/** While the book moves, the app's chrome fades (see bitacora.css). */
export function markBookMoving(on: boolean): void {
  if (on) document.documentElement.setAttribute('data-book', '');
  else document.documentElement.removeAttribute('data-book');
}
