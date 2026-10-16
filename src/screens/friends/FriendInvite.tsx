import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PHOTO, Screen } from '@/design/Screen';
import { PATHS } from '@/components/routes';
import { copy } from '@/i18n';
import { getClient } from '@/store/account';
import { hasRemoteIdentity } from '@/store/hydrate.ts';
import { currentSynthesis } from '@/store/soulMap';
import {
  acceptInvite,
  clearPendingInvite,
  previewInvite,
  rememberPendingInvite,
  type InvitePreview,
} from '@/store/friends';

const t = copy.friends.invite;

type State = InvitePreview | { kind: 'loading' } | { kind: 'failed' } | { kind: 'accepted'; inviter: string };

/**
 * What somebody sees when they open a friend's link: `/amigos/<token>`.
 *
 * Accepting needs an account. A person who arrives without one is told what
 * is missing — their map, or saving it — and the token is kept, so Today can
 * offer the invitation again after they sign up (Google returns to the root,
 * not to this link).
 */
export function FriendInvite() {
  const { token = '' } = useParams();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);

  const hasAccount = getClient() !== null && hasRemoteIdentity();
  const hasMap = currentSynthesis() !== undefined;

  useEffect(() => {
    let live = true;
    previewInvite(token)
      .then((preview) => {
        if (!live) return;
        setState(preview);
        if (preview.kind === 'open' && !hasAccount) rememberPendingInvite(token);
        if (preview.kind !== 'open') clearPendingInvite();
      })
      .catch(() => live && setState({ kind: 'failed' }));
    return () => {
      live = false;
    };
  }, [token, hasAccount]);

  const accept = async (inviter: string) => {
    setBusy(true);
    try {
      await acceptInvite(token);
      setState({ kind: 'accepted', inviter });
    } catch {
      setState({ kind: 'failed' });
    } finally {
      setBusy(false);
    }
  };

  const later = () => clearPendingInvite();

  return (
    <Screen backdrop="cruce" scrim="heavy" opacity={PHOTO.content45}>
      <div className="flex flex-col justify-center gap-5 px-6 flex-1">
        <p className="eyebrow">{t.kicker}</p>

        {state.kind === 'loading' && <p className="text-[length:var(--fs-body-14)] text-crema/60">…</p>}

        {state.kind === 'invalid' && <Message text={t.invalid} to={PATHS.today} cta={t.toToday} />}
        {state.kind === 'failed' && <Message text={t.failed} to={PATHS.today} cta={t.toToday} />}
        {state.kind === 'own' && <Message text={t.own} to={PATHS.profile} cta={t.toFriends} />}
        {state.kind === 'already' && (
          <Message text={t.already(state.inviter)} to={PATHS.profile} cta={t.toFriends} />
        )}
        {state.kind === 'accepted' && (
          <Message text={t.accepted(state.inviter)} to={PATHS.profile} cta={t.toFriends} />
        )}

        {state.kind === 'open' && (
          <>
            <h1 className="text-[length:var(--fs-title-28)] leading-[var(--lh-heading-1_15)] text-blanco">
              {t.titleLead(state.inviter)}
              <em className="font-serif text-crema italic">{t.titleEmphasis}</em>
            </h1>
            <p className="text-[length:var(--fs-body-14)] leading-relaxed text-crema/70">{t.body}</p>

            {hasAccount ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void accept(state.inviter)}
                  className="cta disabled:opacity-50"
                >
                  {t.accept}
                </button>
                <Link to={PATHS.today} onClick={later} className="chip chip-p10 text-center text-crema/70 no-underline">
                  {t.later}
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-[length:var(--fs-body-12_5)] leading-relaxed text-crema/60">
                  {hasMap ? t.needAccount : t.needMap}
                </p>
                <Link to={hasMap ? '/registro' : '/onboarding'} className="cta no-underline">
                  {hasMap ? t.createAccount : t.startMap}
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </Screen>
  );
}

function Message({ text, to, cta }: { text: string; to: string; cta: string }) {
  return (
    <>
      <p className="text-[length:var(--fs-body-14)] leading-relaxed text-crema/70">{text}</p>
      <Link to={to} className="cta no-underline">
        {cta}
      </Link>
    </>
  );
}
