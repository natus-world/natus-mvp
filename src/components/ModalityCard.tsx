import { useId, useState } from 'react';
import { copy } from '@/i18n';
import type { Modality } from '@/lib/schemas';
import type { UserReaction } from '@/store/matches';

/**
 * A recommended modality. US-6.1 CA1 fixes what has to be on it: name,
 * family, what happens in a session, the personalised reasoning, the typical
 * format and the evidence level.
 *
 * What is absent is the point. No person's name, no percentage, no "best
 * match" badge. The mockup's card carried "98% match" over a photograph of a
 * facilitator; this is the same visual language making a different claim.
 */

const FAMILY_LABEL: Record<Modality['family'], string> = copy.modalityCard.family;

/**
 * PDR 5.3 calls this column the cheapest legal defence there is, and it only
 * works if the UI actually shows it. Wording is plain rather than euphemistic:
 * a tradition should read as a tradition.
 */
const EVIDENCE_LABEL: Record<Modality['evidence_level'], string> = copy.modalityCard.evidence;

const HORIZON_LABEL: Record<Modality['typical_horizon'], string> = copy.modalityCard.horizon;

export function ModalityCard({
  modality,
  rank,
  summary,
  reasoning,
  cautionNote,
  reaction,
  onReact,
}: {
  modality: Modality;
  rank: number;
  /** v1.2 R-02: the card's one or two sentences. Null on matches made before it. */
  summary: string | null;
  /** The full why, opened by touching the card. */
  reasoning: string;
  cautionNote: string | null;
  reaction: UserReaction | undefined;
  onReact: (reaction: UserReaction) => void;
}) {
  const dismissed = reaction === 'dismissed';
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <article
      className={[
        'surface surface-p16 transition-opacity',
        dismissed ? 'opacity-40' : '',
      ].join(' ')}
    >
      <div className="mb-2 flex items-baseline gap-2.5">
        <span aria-hidden="true" className="font-serif text-[length:var(--fs-voice-15)] text-crema/55 italic">
          {rank}
        </span>
        <h3 className="flex-1 font-serif text-[length:var(--fs-heading-19)] leading-tight font-light text-blanco">
          {modality.name_es}
        </h3>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <span className="badge text-crema/70">
          {FAMILY_LABEL[modality.family]}
        </span>
        <span className="badge text-crema/70">
          {modality.typical_format}
        </span>
        <span className="badge text-crema/70">
          {HORIZON_LABEL[modality.typical_horizon]}
        </span>
        <span
          className={[
            modality.evidence_level === 'clinica'
              ? 'badge-bare bg-verde/70 text-crema'
              : 'badge text-crema/55',
          ].join(' ')}
        >
          {EVIDENCE_LABEL[modality.evidence_level]}
        </span>
      </div>

      {/* v1.2 R-02: the card says why in a sentence or two; touching it opens
          the full why and what actually happens in a session (US-6.1 CA1 —
          without that the recommendation is useless: most people have no
          idea what EMDR or constelaciones involve). */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="mb-3 block w-full text-left"
      >
        <span className="block text-[length:var(--fs-body-13)] leading-relaxed text-blanco/85">
          {summary ?? reasoning}
        </span>
        <span className="mt-2 block text-[length:var(--fs-label-11)] tracking-wide text-crema/55 uppercase">
          {open ? copy.modalityCard.whyClose : copy.modalityCard.whyOpen}
          <span aria-hidden="true" className="ml-1.5">
            {open ? '−' : '+'}
          </span>
        </span>
      </button>

      <div id={panelId} hidden={!open} className="mb-3">
        {summary && (
          <p className="mb-3 text-[length:var(--fs-body-12_5)] leading-relaxed text-crema/75">{reasoning}</p>
        )}
        <p className="mb-1 text-[length:var(--fs-label-11)] tracking-wide text-crema/55 uppercase">
          {copy.modalityCard.whatHappens}
        </p>
        <p className="text-[length:var(--fs-body-12_5)] leading-relaxed text-crema/65">{modality.what_happens}</p>
      </div>

      {cautionNote && (
        <div className="mb-3 flex gap-2.5 rounded-[10px] border border-error/25 bg-error/8 px-3 py-2.5">
          <span aria-hidden="true" className="mt-[5px] size-1.5 shrink-0 rounded-full bg-error" />
          <p className="text-[length:var(--fs-body-11_5)] leading-relaxed text-crema/75">{cautionNote}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onReact('saved')}
          aria-pressed={reaction === 'saved'}
          className={[
            'chip-p8 flex-1 transition-colors',
            reaction === 'saved'
              ? 'chip chip-on'
              : 'chip text-crema/70 hover:text-crema',
          ].join(' ')}
        >
          {reaction === 'saved' ? copy.modalityCard.saved : copy.modalityCard.save}
        </button>
        <button
          type="button"
          onClick={() => onReact('dismissed')}
          aria-pressed={dismissed}
          className="chip chip-p8 flex-1 text-crema/55 hover:text-crema"
        >
          {dismissed ? copy.modalityCard.dismissed : copy.modalityCard.dismiss}
        </button>
      </div>
    </article>
  );
}
