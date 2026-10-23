import { useLayoutEffect, type RefObject } from 'react';

/**
 * A textarea that grows with what is written. `field-sizing: content` does it
 * in Chromium, but not in Safari: on the iPhone the step «¿Qué te estás
 * preguntando?» stayed at its first height and the text hid above as it was
 * written (QA-06). The height follows the content on every change.
 */
export function useAutoGrow(ref: RefObject<HTMLTextAreaElement | null>, value: string): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`;
  }, [ref, value]);
}
