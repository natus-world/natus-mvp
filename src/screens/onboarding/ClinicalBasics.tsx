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
 * The honesty problem the PDR flags in section 5.9 and again in section 14:
 * the vault's copy promises "solo lo ve tu facilitador asignado", which is
 * false, because an admin is notified on a crisis signal. The copy below says
 * what actually happens.
 */

const text = copy.onboarding.care;

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
      </div>
    </StepBody>
  );
}
