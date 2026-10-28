import { reportError } from './report-error.ts';

/**
 * Signs that something does not work (owner, 27 Oct 2026: «pasa muy seguido
 * cosas así o botones que no funcionan» and nobody tells us). Two:
 *
 * - the same thing tapped four times or more within 2.5 seconds — what people
 *   do when a button does not answer;
 * - a tap on a button that is switched off — the person thinks they are done
 *   and the app does not let them go on.
 *
 * Each goes to `client_errors` as kind `atasco`, once per page and thing, so
 * the panel's «Errores» shows where and how many. Never what the person wrote:
 * only the screen and the label drawn on the button or link (40 characters at
 * most; a friend's name can be one); anything else is named by its tag alone.
 */

const RAPIDOS = 4;
const VENTANA_MS = 2500;

const INTERACTIVO = 'button, a[href], [role="button"], [role="tab"], select, summary, label';

function nombreDe(target: Element): string {
  const interactivo = target.closest(INTERACTIVO);
  if (interactivo) {
    const etiqueta = (interactivo.getAttribute('aria-label') || interactivo.textContent || '').replace(/\s+/g, ' ').trim();
    // Only short labels: a long one may be content, not the app's own words.
    if (etiqueta && etiqueta.length <= 40) return `«${etiqueta}»`;
    return interactivo.tagName.toLowerCase();
  }
  // Not a control: something that looks tappable and is not.
  return `algo que no es un botón (${target.tagName.toLowerCase()})`;
}

function apagado(target: Element): Element | null {
  const boton = target.closest('button, [role="button"]');
  if (!boton) return null;
  const off =
    (boton instanceof HTMLButtonElement && boton.disabled) ||
    boton.getAttribute('aria-disabled') === 'true' ||
    boton.classList.contains('off');
  return off ? boton : null;
}

export function installStuckSignals(): void {
  const contados = new Set<string>();
  const avisar = (mensaje: string) => {
    const clave = `${window.location.pathname}|${mensaje}`;
    if (contados.has(clave)) return;
    contados.add(clave);
    reportError('atasco', new Error(mensaje));
  };

  let ultimo: { el: Element; veces: number; desde: number } | null = null;

  document.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const ahora = Date.now();
      const el = target.closest(INTERACTIVO) ?? target;
      if (ultimo && ultimo.el === el && ahora - ultimo.desde <= VENTANA_MS) {
        ultimo.veces += 1;
      } else {
        ultimo = { el, veces: 1, desde: ahora };
      }
      if (ultimo.veces === RAPIDOS) avisar(`Atasco: toques repetidos en ${nombreDe(target)}`);

      const off = apagado(target);
      if (off) avisar(`Atasco: tocó ${nombreDe(off)} apagado`);
    },
    { capture: true, passive: true },
  );
}
