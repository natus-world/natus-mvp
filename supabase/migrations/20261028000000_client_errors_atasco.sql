-- Signs that something does not work, sent by the browser (owner, 27 Oct
-- 2026: «botones que no funcionan» that nobody tells us about): the same
-- button tapped again and again in a moment, or a tap on a button that is
-- switched off. Kept in `client_errors` as kind `atasco`, so the panel's
-- «Errores» lists them with the rest. Never what the person wrote: the
-- message names the screen's own label of what was tapped.

alter table public.client_errors drop constraint client_errors_kind_check;
alter table public.client_errors
  add constraint client_errors_kind_check check (kind in ('render', 'error', 'rejection', 'atasco'));
