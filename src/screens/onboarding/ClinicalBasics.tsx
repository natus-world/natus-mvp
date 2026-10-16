import { useState, type ReactNode } from 'react';
import { NextButton, StepBody } from '@/components/onboarding/StepChrome';
import { LockIcon } from '@/components/onboarding/icons';
import type { ClinicalBasics as Answers, IdeationAnswer } from '@/lib/safety';
import { answerYesNo, type Skippable } from '@/store/care';
import { copy } from '@/i18n';

/**
 * PDR US-1.3: this must feel like care, not a medical form.
 *
 * Three things the PDR makes explicit and this screen implements. A
 * containment paragraph comes before the first question. Every question
 * accepts "prefiero no decir" except the ideation one. And answering
 * `plan_o_intencion` does not continue to Caminos — the flow hands off to the
 * crisis screen.
 *
 * The privacy line is the owner's decision (v1.2 S-07, word chosen on
 * 2026-10-15): "solo lo ve tu terapeuta". It becomes exact when the therapist
 * side connects; until then an admin receives the crisis alerts, a gap the
 * PDR records in sections 5.9 and 14 for legal review.
 *
 * The fourth question (v1.2 O-06) is free text and optional. It is scanned for
 * crisis on submit and never reaches a model.
 *
 * Drawn as package 01 «Para cuidarte» (16 Oct 2026): each question in its own
 * glass card, the answers as pills.
 */

const text = copy.onboarding.care;

/** Matches the column's check constraint. */
const NOTES_MAX = 2000;

const IDEATION_ORDER: IdeationAnswer[] = ['no', 'fugaces_sin_plan', 'frecuentes', 'plan_o_intencion'];

function Question({
  id,
  label,
  stacked = false,
  children,
}: {
  id: string;
  label: string;
  stacked?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="vid preg" role="radiogroup" aria-labelledby={id}>
      <p className="q" id={id}>
        {label}
      </p>
      <div className={stacked ? 'lista-r' : 'chips'}>{children}</div>
    </div>
  );
}

function Answer({ label, selected, onChoose }: { label: string; selected: boolean; onChoose: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onChoose} className={selected ? 'chip on' : 'chip'}>
      {label}
    </button>
  );
}

export function ClinicalBasics({
  initial,
  busy,
  actionLabel,
  onSubmit,
}: {
  initial: Answers;
  busy: boolean;
  /** «Ver mis caminos» when Caminos comes next, «Continuar» otherwise. */
  actionLabel: string;
  onSubmit: (answers: Answers) => void;
}) {
  const [basics, setBasics] = useState<Answers>(initial);
  const skipped = new Set(basics.prefer_not_to_say ?? []);
  // Package 12/01 (owner, 16 Oct 2026): the button lights once the three
  // questions that decide what is safe are answered — «Prefiero no decir»
  // counts as an answer.
  const answered = (field: Skippable) => basics[field] !== undefined || skipped.has(field);
  const complete =
    basics.ideation_6m !== undefined && answered('in_treatment') && answered('psychiatric_medication');

  const yesNo = (field: Skippable, label: string) => (
    <Question id={`care-${field}`} label={label}>
      <Answer
        label={text.yes}
        selected={basics[field] === true}
        onChoose={() => setBasics(answerYesNo(basics, field, true))}
      />
      <Answer
        label={text.no}
        selected={basics[field] === false}
        onChoose={() => setBasics(answerYesNo(basics, field, false))}
      />
      <Answer
        label={text.preferNotToSay}
        selected={skipped.has(field)}
        onChoose={() => setBasics(answerYesNo(basics, field, 'skip'))}
      />
    </Question>
  );

  return (
    <StepBody
      kicker={text.kicker}
      title={
        <>
          {text.titleLead}
          <em>{text.titleEmphasis}</em>
          {text.titleTail}
        </>
      }
      helper={text.intro}
      aside={
        <p className="priv">
          <LockIcon />
          {text.privacy}
        </p>
      }
      action={
        <NextButton disabled={!complete || busy} onClick={() => onSubmit(basics)}>
          {busy ? text.saving : actionLabel}
        </NextButton>
      }
    >
      <Question id="care-ideation" label={text.ideationLabel} stacked>
        {IDEATION_ORDER.map((value) => (
          <Answer
            key={value}
            label={text.ideationOptions[value]}
            selected={basics.ideation_6m === value}
            onChoose={() => setBasics({ ...basics, ideation_6m: value })}
          />
        ))}
      </Question>

      {yesNo('in_treatment', text.treatmentLabel)}
      {yesNo('psychiatric_medication', text.medicationLabel)}

      <div className="vid preg">
        <label className="q" htmlFor="care-notes">
          {text.notesLabel}
        </label>
        <p className="l" id="care-notes-hint">
          {text.notesHint}
        </p>
        <textarea
          id="care-notes"
          className="nota"
          aria-describedby="care-notes-hint"
          maxLength={NOTES_MAX}
          value={basics.additional_notes ?? ''}
          onChange={(event) => {
            const next: Answers = { ...basics };
            const value = event.target.value;
            if (value.trim() === '') delete next.additional_notes;
            else next.additional_notes = value;
            setBasics(next);
          }}
        />
      </div>
    </StepBody>
  );
}
