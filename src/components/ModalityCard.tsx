import { useId, type ComponentType, type MouseEvent } from 'react';
import { copy } from '@/i18n';
import { CheckIcon } from '@/design/icons';
import { AirIcon, EarthIcon, EtherIcon, FireIcon, WaterIcon } from '@/design/brand-icons';
import type { Modality } from '@/lib/schemas';
import type { UserReaction } from '@/store/matches';

/**
 * A recommended modality, as package 06 (16 Oct 2026) draws it: the element
 * in its circle and the counter; element · family · evidence; the name; the
 * why in a sentence or two; format · horizon; the warning when the therapy
 * needs clinical support; and touching the card opens the full why in place.
 * US-6.1 CA1 fixes what has to be on it: name, family, what happens in a
 * session, the personalised reasoning, the typical format and the evidence
 * level.
 *
 * What is absent is the point. No person's name, no percentage, no "best
 * match" badge. The mockup's card carried "98% match" over a photograph of a
 * facilitator; this is the same visual language making a different claim.
 */

const text = copy.modalityCard;

type Element = keyof typeof text.element;

/** The element comes from the family, as the approved package decided — no
 *  new column in the catalogue. */
const ELEMENT_OF: Record<Modality['family'], Element> = {
  corporal: 'tierra',
  contemplativa: 'aire',
  psicologica: 'agua',
  simbolica: 'eter',
  energetica: 'fuego',
};

const ELEMENT_ICON: Record<Element, ComponentType> = {
  fuego: FireIcon,
  tierra: EarthIcon,
  aire: AirIcon,
  agua: WaterIcon,
  eter: EtherIcon,
};

function CautionIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6.5v4.5M10 13.5v.2" />
    </svg>
  );
}

export function ModalityCard({
  modality,
  position,
  total,
  summary,
  reasoning,
  cautionNote,
  reaction,
  onReact,
  open,
  onToggle,
  faint,
  onGo,
}: {
  modality: Modality;
  /** Where the card sits in the row, from 1. An order, never a score. */
  position: number;
  total: number;
  /** v1.2 R-02: the card's one or two sentences. Null on matches made before it. */
  summary: string | null;
  /** The full why, opened by touching the card. */
  reasoning: string;
  cautionNote: string | null;
  reaction: UserReaction | undefined;
  onReact: (reaction: UserReaction) => void;
  open: boolean;
  onToggle: () => void;
  /** The next card peeking: faint and summarised; touching it brings it in. */
  faint: boolean;
  onGo: () => void;
}) {
  const panelId = useId();
  const element = ELEMENT_OF[modality.family];
  const Icon = ELEMENT_ICON[element];
  const counter = text.counter(position, total);

  // v1.2 R-05: «No me hace sentido» takes the therapy off the paths, says so,
  // and offers to bring it back at once. It is not proposed again for 7 days.
  if (reaction === 'dismissed') {
    return (
      <article className="vid cam quitada" data-cam>
        <p className="cnt">{counter}</p>
        <p role="status">
          {text.removedLead}
          <em>{modality.name_es}</em>
          {text.removedTail}
        </p>
        <button type="button" className="txtbtn" onClick={() => onReact('dismissed')}>
          {text.undo}
        </button>
      </article>
    );
  }

  if (faint) {
    return (
      <button type="button" className="vid cam tenue" data-cam onClick={onGo}>
        <span className="ctop">
          <span className="el">
            <Icon />
          </span>
        </span>
        <span className="linea">{text.element[element]}</span>
        <span className="nom">{modality.name_es}</span>
      </button>
    );
  }

  const act = (reaction: UserReaction) => (event: MouseEvent) => {
    event.stopPropagation();
    onReact(reaction);
  };

  // Clinical support: the approved warning, in the warm error colour, under
  // the format; the model's own note for this person follows it.
  const caution = modality.requires_clinical_support || cautionNote;

  return (
    <article className={open ? 'vid cam on' : 'vid cam'} data-cam onClick={onToggle}>
      {/* v1.2 R-02: the whole card opens the full why. The button carries the
          state for keyboards and screen readers; the click bubbles to the card. */}
      <button type="button" className="abrir" aria-expanded={open} aria-controls={panelId}>
        <span className="ctop">
          <span className="el">
            <Icon />
          </span>
          <span className="cnt">{counter}</span>
        </span>
        <span className="linea">
          {text.element[element]} · {text.family[modality.family]} · {text.evidence[modality.evidence_level]}
        </span>
        <span className="nom">{modality.name_es}</span>
        <span className="porq">{summary ?? reasoning}</span>
        <span className="fmt">
          {text.format[modality.typical_format]} · {text.horizon[modality.typical_horizon]}
        </span>
      </button>

      {caution && (
        <p className="cuid">
          <CautionIcon />
          <span>
            {modality.requires_clinical_support && <span className="cuid-l">{text.caution}</span>}
            {cautionNote && <span className="cuid-l">{cautionNote}</span>}
          </span>
        </p>
      )}

      <div id={panelId} className="mas" hidden={!open}>
        <p className="ia">
          {text.aiName} <b>{text.aiLabel}</b>
        </p>
        {summary && (
          <div className="bloq">
            <p>{reasoning}</p>
          </div>
        )}
        <div className="bloq">
          <p className="k">{text.whatHappens}</p>
          <p>{modality.what_happens}</p>
        </div>
      </div>

      <div className="acc2">
        <button
          type="button"
          className={reaction === 'saved' ? 'p2 on' : 'p2'}
          aria-pressed={reaction === 'saved'}
          onClick={act('saved')}
        >
          {reaction === 'saved' && <CheckIcon />}
          {reaction === 'saved' ? text.saved : text.save}
        </button>
        <button type="button" className="p2" onClick={act('dismissed')}>
          {text.dismiss}
        </button>
      </div>
    </article>
  );
}
