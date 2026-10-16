import { useState } from 'react';
import { copy } from '@/i18n';
import { answerProposal, type RoutineProposal } from '@/store/routine-review';

/**
 * v1.2 R-04, guide 9.7, package 07: what changes and why, and two answers.
 * Nothing changes until the person accepts. Drawn with the package's pieces
 * (`.vclaro .prop`, `.camb`, `.acc2`), so it lives inside `.pz.rutina`.
 */

const t = copy.routine.review;

export function RoutineProposalCard({
  proposal,
  onAnswered,
}: {
  proposal: RoutineProposal;
  onAnswered: (accepted: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const { summary, remove, add, restore } = proposal.proposal;
  // «Por qué» carries the reason of each change; the one-line summary only
  // when there is no reason to show.
  const whys = [...remove.map((r) => r.why), ...add.map((a) => a.why), ...(restore ? [restore.why] : [])].filter(
    (w) => w.trim(),
  );
  const reasons = whys.length > 0 ? whys : summary ? [summary] : [];

  const answer = async (accept: boolean) => {
    setBusy(true);
    setFailed(false);
    const ok = await answerProposal(proposal, accept);
    setBusy(false);
    if (ok) onAnswered(accept);
    else setFailed(true);
  };

  return (
    <section className="vclaro prop" aria-label={t.kicker}>
      <p className="cad">{t.kicker}</p>
      <p className="ia">
        {t.by} <b>{t.aiLabel}</b>
      </p>
      <h2 className="fbt">
        {t.titleLead}
        <em>{t.titleEmphasis}</em>
        {t.titleTail}
      </h2>

      <dl className="camb">
        {remove.map((r) => (
          <div key={`r-${r.practice_id}`}>
            <dt className="de">{t.leaves}</dt>
            <dd className="sale">{r.title}</dd>
          </div>
        ))}
        {add.map((a, i) => (
          <div key={`a-${i}`}>
            <dt className="de">{t.enters}</dt>
            <dd>{a.title}</dd>
          </div>
        ))}
        {restore && (
          <div>
            <dt className="de">{t.returns}</dt>
            <dd>{restore.name}</dd>
          </div>
        )}
      </dl>

      {reasons.length > 0 && (
        <>
          <p className="cad">{t.why}</p>
          {reasons.map((why, i) => (
            <p key={i} className="pc">
              {why}
            </p>
          ))}
        </>
      )}

      <div className="acc2">
        <button type="button" disabled={busy} className="p2 on" onClick={() => void answer(true)}>
          {t.accept}
        </button>
        <button type="button" disabled={busy} className="p2" onClick={() => void answer(false)}>
          {t.keep}
        </button>
      </div>
      {failed && (
        <p role="alert" className="pc">
          {t.failed}
        </p>
      )}
    </section>
  );
}
