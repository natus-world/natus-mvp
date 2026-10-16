import { useState } from 'react';
import { copy } from '@/i18n';
import { answerProposal, type RoutineProposal } from '@/store/routine-review';

/**
 * v1.2 R-04, guide 9.7: what changes and why, and two answers of equal
 * weight. Nothing changes until the person accepts.
 */

const t = copy.routine.review;

function Change({ label, title, why }: { label: string; title: string; why: string }) {
  return (
    <li className="flex flex-col gap-1 border-t border-crema/10 pt-2.5 first:border-t-0 first:pt-0">
      <span className="text-[length:var(--fs-label-10)] tracking-wide text-crema/55 uppercase">{label}</span>
      <span className="text-[length:var(--fs-heading-14)] leading-snug text-blanco">{title}</span>
      <span className="text-[length:var(--fs-body-12_5)] leading-relaxed text-crema/70">{why}</span>
    </li>
  );
}

export function RoutineProposalCard({
  proposal,
  onAnswered,
}: {
  proposal: RoutineProposal;
  onAnswered: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const { summary, remove, add, restore } = proposal.proposal;

  const answer = async (accept: boolean) => {
    setBusy(true);
    setFailed(false);
    const ok = await answerProposal(proposal, accept);
    setBusy(false);
    if (ok) onAnswered();
    else setFailed(true);
  };

  return (
    <section className="surface surface-p16 mb-4" aria-label={t.kicker}>
      <p className="eyebrow mb-2">{t.kicker}</p>
      {summary && <p className="mb-3.5 text-[length:var(--fs-body-13)] leading-relaxed text-blanco/85">{summary}</p>}

      <ul className="mb-4 flex flex-col gap-2.5">
        {remove.map((r) => (
          <Change key={`r-${r.practice_id}`} label={t.leaves} title={r.title} why={r.why} />
        ))}
        {add.map((a, i) => (
          <Change key={`a-${i}`} label={t.enters} title={a.title} why={a.why} />
        ))}
        {restore && <Change label={t.returns} title={restore.name} why={restore.why} />}
      </ul>

      <div className="flex gap-2">
        <button type="button" disabled={busy} className="chip chip-p8 flex-1 text-crema/80" onClick={() => void answer(true)}>
          {t.accept}
        </button>
        <button type="button" disabled={busy} className="chip chip-p8 flex-1 text-crema/80" onClick={() => void answer(false)}>
          {t.keep}
        </button>
      </div>
      {failed && (
        <p role="alert" className="mt-2 text-[length:var(--fs-body-11)] leading-relaxed text-crema/70">
          {t.failed}
        </p>
      )}
    </section>
  );
}
