import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PHOTO, Screen } from '@/design/Screen';
import { buildExport, exportFileName } from '@/lib/export';
import { clearAll, exportAll } from '@/store/db';
import { clearStoredBlobs } from '@/store/blobs';
import { hasRemoteIdentity, purgeRemote } from '@/store/hydrate.ts';
import { signOut } from '@/supabase/session.ts';
import { activeProfile, getClient, updateActiveProfile } from '@/store/account';
import { copy, type GrammaticalGender } from '@/i18n';

const t = copy.profile;

export function Profile() {
  const navigate = useNavigate();
  const client = getClient();
  const [gender, setGender] = useState<GrammaticalGender | null>(
    () => activeProfile()?.draft.grammatical_gender ?? null,
  );
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [exported, setExported] = useState<string | null>(null);

  const chooseGender = (value: GrammaticalGender) => {
    if (updateActiveProfile({ grammatical_gender: value })) setGender(value);
  };

  const download = () => {
    const at = new Date().toISOString();
    const doc = buildExport(exportAll(), { exportedAt: at });
    const name = exportFileName(at);

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);

    setExported(name);
  };

  const deleteEverything = async () => {
    setBusy(true);
    setFailed(false);

    // Postgres first, and nothing local until it answers. A browser emptied
    // against rows that survived is the worst of the three outcomes: it looks
    // done, it reads as done, and the next load contradicts it.
    try {
      await purgeRemote();
    } catch {
      setBusy(false);
      setFailed(true);
      return;
    }

    await clearStoredBlobs();
    clearAll();

    await signOut().catch(() => {});

    navigate('/', { replace: true });
  };

  const leave = async () => {
    setBusy(true);
    const onServer = hasRemoteIdentity();
    await signOut().catch(() => {});
    if (onServer) {
      await clearStoredBlobs().catch(() => {});
      clearAll();
    }
    window.location.assign(import.meta.env.BASE_URL);
  };

  return (
    <Screen backdrop="palm" scrim="heavy" opacity={PHOTO.content40} mono>
      <div className="flex min-h-dvh flex-col overflow-y-auto px-6 pt-[var(--top-inset)] pb-[var(--bottom-inset)] sm:min-h-0">
        <p className="eyebrow mb-3">{t.kicker}</p>
        <h1 className="mb-7 text-[length:var(--fs-title-30)] leading-[var(--lh-heading-1_15)] text-blanco">
          {t.titleLead}
          <em className="font-serif text-crema italic">{t.titleEmphasis}</em>
        </h1>

        <section className="surface surface-p14 mb-3">
          <p className="eyebrow mb-1.5">{t.accountKicker}</p>
          {client ? (
            <>
              <p className="text-[length:var(--fs-body-13)] leading-snug text-blanco">{client.email}</p>
              <p className="mt-1 text-[length:var(--fs-body-11_5)] leading-relaxed text-crema/60">
                {hasRemoteIdentity() ? t.accountRemote : t.accountSimulated}
              </p>
            </>
          ) : (
            <>
              <p className="text-[length:var(--fs-body-13)] leading-snug text-blanco">{t.noAccount}</p>
              <p className="mt-1 mb-2.5 text-[length:var(--fs-body-11_5)] leading-relaxed text-crema/60">
                {t.noAccountBody}
              </p>
              <Link to="/registro" className="chip chip-p6 inline-block text-crema/75 no-underline">
                {t.saveMap}
              </Link>
            </>
          )}
        </section>

        {gender && (
          <section className="surface surface-p14 mb-3">
            <p id="profile-gender" className="eyebrow mb-2.5">
              {t.genderKicker}
            </p>
            <div role="radiogroup" aria-labelledby="profile-gender" className="flex flex-wrap gap-2">
              {copy.onboarding.basicData.genderOptions.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={gender === value}
                  onClick={() => chooseGender(value)}
                  className={[
                    'chip-p6 px-3.5 transition-colors',
                    gender === value ? 'chip chip-on' : 'chip text-crema/70',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="surface surface-p14 mb-3">
          <p className="eyebrow mb-1.5">{t.exportKicker}</p>
          <p className="mb-3 text-[length:var(--fs-body-11_5)] leading-relaxed text-crema/60">{t.exportBody}</p>
          <button type="button" onClick={download} className="chip chip-p10 w-full text-crema/75">
            {t.exportCta}
          </button>
          {exported && (
            <p role="status" className="mt-2 text-[length:var(--fs-body-11)] leading-relaxed text-crema/60">
              {t.exported(exported)}
            </p>
          )}
        </section>

        <section className="mb-3 rounded-[var(--radius-option)] border border-error/25 px-4 py-3.5">
          <p className="eyebrow mb-1.5">{t.deleteKicker}</p>
          <p className="mb-3 text-[length:var(--fs-body-11_5)] leading-relaxed text-crema/60">{t.deleteBody}</p>

          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="w-full rounded-full border border-error/40 px-3 py-2.5 text-[length:var(--fs-label-11)] tracking-wide text-error uppercase"
            >
              {t.deleteCta}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-[length:var(--fs-body-12)] leading-relaxed text-crema/80">{t.deleteConfirm}</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void deleteEverything()}
                className="w-full rounded-full bg-error px-3 py-2.5 text-[length:var(--fs-label-11)] tracking-wide text-noche uppercase disabled:opacity-50"
              >
                {busy ? t.deleting : t.deleteConfirmCta}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="chip chip-p10 w-full text-crema/70"
              >
                {t.deleteCancel}
              </button>
              {failed && (
                <p role="alert" className="text-[length:var(--fs-body-11_5)] leading-relaxed text-error">
                  {t.deleteFailed}
                </p>
              )}
            </div>
          )}
        </section>

        {hasRemoteIdentity() && (
          <section className="mt-6">
            <button
              type="button"
              disabled={busy}
              onClick={() => void leave()}
              className="chip chip-p10 w-full text-crema/70 disabled:opacity-50"
            >
              {t.signOut}
            </button>
            <p className="mt-2 text-[length:var(--fs-body-11)] leading-relaxed text-crema/60">{t.signOutNote}</p>
          </section>
        )}
      </div>
    </Screen>
  );
}
