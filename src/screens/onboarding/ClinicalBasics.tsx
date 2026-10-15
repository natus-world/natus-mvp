import { useState } from 'react';
import { StepBody } from '@/components/onboarding/StepChrome';
import { OptionItem } from '@/components/onboarding/OptionItem';
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
 */

const text = copy.onboarding.care;

/** Matches the column's check constraint. */
const NOTES_MAX = 2000;

const IDEATION_ORDER: IdeationAnswer[] = ['no', 'fugaces_sin_plan', 'frecuentes', 'plan_o_intencion'];

function Question({ children, label }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-2.5 text-[length:var(--fs-body-13)] leading-snug text-blanco">{label}</legend>
      <div className="flex flex-col gap-2">{children}</div>
    </fieldset>
  );
}

export function ClinicalBasics({
  initial,
  busy,
  onSubmit,
}: {
  initial: Answers;
  busy: boolean;
  onSubmit: (answers: Answers) => void;
}) {
  const [basics, setBasics] = useState<Answers>(initial);
  const skipped = new Set(basics.prefer_not_to_say ?? []);

  const yesNo = (field: Skippable, label: string) => (
    <Question label={label}>
      <OptionItem
        label={text.yes}
        multi={false}
        selected={basics[field] === true}
        onToggle={() => setBasics(answerYesNo(basics, field, true))}
      />
      <OptionItem
        label={text.no}
        multi={false}
        selected={basics[field] === false}
        onToggle={() => setBasics(answerYesNo(basics, field, false))}
      />
      <OptionItem
        label={text.preferNotToSay}
        multi={false}
        selected={skipped.has(field)}
        onToggle={() => setBasics(answerYesNo(basics, field, 'skip'))}
      />
    </Question>
  );

  return (
    <StepBody
      title={
        <>
          {text.titleLead}
          <br />
          {text.titleTail}
        </>
      }
      action={
        <button
          type="button"
          className="cta"
          disabled={basics.ideation_6m === undefined || busy}
          onClick={() => onSubmit(basics)}
        >
          {busy ? text.saving : copy.common.continue}
          <span aria-hidden="true">→</span>
        </button>
      }
    >
      <div className="flex flex-col gap-6">
        <p className="text-[length:var(--fs-body-12)] leading-relaxed text-crema/60">
          {text.intro}
          <br />
          <br />
          <span className="text-crema/55">{text.privacy}</span>
        </p>

        <Question label={text.ideationLabel}>
          {IDEATION_ORDER.map((value) => (
            <OptionItem
              key={value}
              label={text.ideationOptions[value]}
              multi={false}
              selected={basics.ideation_6m === value}
              onToggle={() => setBasics({ ...basics, ideation_6m: value })}
            />
          ))}
        </Question>

        {yesNo('in_treatment', text.treatmentLabel)}
        {yesNo('psychiatric_medication', text.medicationLabel)}

        <label className="flex flex-col gap-2">
          <span className="text-[length:var(--fs-body-13)] leading-snug text-blanco">{text.notesLabel}</span>
          <span className="text-[length:var(--fs-body-12)] leading-relaxed text-crema/55">{text.notesHint}</span>
          <textarea
            className="field min-h-24 resize-none text-[length:var(--fs-body-14)] leading-relaxed"
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
        </label>
      </div>
    </StepBody>
  );
}
