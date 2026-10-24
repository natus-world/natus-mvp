import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Screen } from '@/design/Screen';
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

  // No design of its own in the package: the door to Comparar cartas, on
  // that screen's photo and with its pieces.
  return (
    <Screen photo="bote" veil={0.38} glassAlpha={0.39}>
      <div className="pz comparar aviso mar">
        <div className="sc">
          <div className="d-izq">
            <p className="k">{t.kicker}</p>

            {state.kind === 'loading' && <p className="cuerpo">…</p>}

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
                <h1 className="t mt">
                  {t.titleLead(state.inviter)}
                  <em>{t.titleEmphasis}</em>
                </h1>
                <div className="vid bloque-c">
                  <p className="cuerpo">{t.body}</p>
                  <p className="cuerpo">
                    {t.chartsShared}{' '}
                    <Link to="/privacidad">
                      <u>{copy.friends.privacy}</u>
                    </Link>
                  </p>
                </div>

                {hasAccount ? (
                  <div className="acciones">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void accept(state.inviter)}
                      className="btn p"
                    >
                      {t.accept}
                    </button>
                    <p className="link">
                      <Link to={PATHS.today} onClick={later}>
                        <u>{t.later}</u>
                      </Link>
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="cuerpo">{hasMap ? t.needAccount : t.needMap}</p>
                    {/* A new account, or the one they already have (owner,
                        22 Oct 2026): the invitation waits either way, and
                        Hoy offers it again once they are in. */}
                    <div className="acciones">
                      <Link to={hasMap ? '/registro' : '/onboarding'} className="btn p">
                        {hasMap ? t.createAccount : t.startMap}
                      </Link>
                      <p className="link">
                        <Link to="/volver">
                          <u>{t.haveAccount}</u>
                        </Link>
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Screen>
  );
}

function Message({ text, to, cta }: { text: string; to: string; cta: string }) {
  return (
    <>
      <div className="vid bloque-c">
        <p className="cuerpo">{text}</p>
      </div>
      <Link to={to} className="btn s sola">
        {cta}
      </Link>
    </>
  );
}
