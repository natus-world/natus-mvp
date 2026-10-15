insert into public.modalities (
  slug, name_es, name_en, family, short_description, what_happens,
  works_well_for, typical_format, typical_horizon, intensity,
  evidence_level, contraindications, requires_clinical_support, is_active
) values
  ('breathwork-holotropico', 'Breathwork holotrópico', 'Holotropic breathwork', 'corporal', 'Respiración rápida y sostenida durante horas, en un taller guiado y de alta intensidad.', 'Es un taller de varias horas, en grupo y con facilitadores formados. Se respira más rápido y más profundo de lo habitual durante un período largo, en el suelo sobre una colchoneta y con música intensa. Se trabaja de a dos: una persona respira mientras la otra la acompaña, y después se intercambian. Esa respiración sostenida cambia el estado de conciencia y puede traer emociones, recuerdos o sensaciones físicas fuertes y difíciles de anticipar. Al final se dibuja o se conversa sobre lo vivido, y lo que se mueve ahí suele necesitar acompañamiento en los días siguientes.', array['trauma', 'espiritualidad', 'proposito', 'duelo']::text[], 'taller intensivo', 'short', 5, 'emergente', array['Contraindicado en embarazo, epilepsia, glaucoma, hipertensión, cardiopatías o antecedentes de aneurisma o accidente cerebrovascular: ante cualquiera de estas condiciones, consulta antes con un médico.', 'Desaconsejado con antecedentes psicóticos, bipolaridad, cuadros disociativos o medicación psiquiátrica activa.', 'Lo que se mueve en la sesión suele necesitar un espacio terapéutico de integración después.']::text[], true, true)
on conflict (slug) do update set
  name_es = excluded.name_es,
  name_en = excluded.name_en,
  family = excluded.family,
  short_description = excluded.short_description,
  what_happens = excluded.what_happens,
  works_well_for = excluded.works_well_for,
  typical_format = excluded.typical_format,
  typical_horizon = excluded.typical_horizon,
  intensity = excluded.intensity,
  evidence_level = excluded.evidence_level,
  contraindications = excluded.contraindications,
  requires_clinical_support = excluded.requires_clinical_support,
  is_active = excluded.is_active;

comment on table public.modalities is
  'PDR 5.3. Twenty-one modalities, plus breathwork-holotropico split out of breathwork by PDR v1.1 O-04. No facilitators.';
