-- Chile's Línea de Prevención del Suicidio *4141 (Ministry of Health, free,
-- 24 hours), first among Chile's lines (owner, 16 Oct 2026), accepted from
-- minsal.cl — not a call placed to it. data/crisis-resources.json is what the
-- application reads; this keeps the table its copy.
update public.crisis_resources set priority = priority + 1 where country = 'CL';

insert into public.crisis_resources
  (country, type, name, contact, note, priority, is_active, verified_at)
values
  ('CL', 'hotline', 'Línea de Prevención del Suicidio', '*4141',
   'Del Ministerio de Salud. Gratuita, 24 horas.', 1, true, '2026-10-16');
