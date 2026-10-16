import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { copy } from '@/i18n';
import {
  endFriendship,
  listFriends,
  myInviteUrl,
  pendingInvite,
  renewInviteUrl,
  type Friend,
} from '@/store/friends';
import { track } from '@/store/funnel';

const t = copy.friends;

/** «Desde septiembre», with the year when it is not this one. */
function since(iso: string | null): string {
  const m = iso ? /^(\d{4})-(\d{2})/.exec(iso) : null;
  if (!m) return '';
  const month = copy.quota.months[Number(m[2]) - 1] ?? '';
  return t.since(Number(m[1]) === new Date().getFullYear() ? month : `${month} de ${m[1]}`);
}

/**
 * The friends of Perfil (v1.2 C-01; package 11 «Tus amigos»): an invitation
 * waiting, the friends to compare charts with, and how to invite. Only
 * rendered for somebody with an account: a friendship has to outlive the
 * browser it was made in.
 */
export function FriendsSection({ onCount }: { onCount?: (n: number) => void }) {
  const [link, setLink] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const waiting = pendingInvite();

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const [url, list] = await Promise.all([myInviteUrl(), listFriends()]);
      setLink(url);
      setFriends(list);
      onCount?.(list.length);
    } catch {
      setFailed(true);
    }
  }, [onCount]);

  useEffect(() => {
    void load();
  }, [load]);

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      track('friend_invited');
      setCopied(true);
      setTimeout(() => setCopied(false), 2_500);
    } catch {
      // Some browsers refuse the clipboard; the link is on screen to select.
    }
  };

  const share = async () => {
    if (!link) return;
    try {
      await navigator.share({ text: t.shareText, url: link });
      track('friend_invited');
    } catch {
      // Cancelled, or not supported: copying is the fallback beside it.
    }
  };

  const renew = async () => {
    setBusy(true);
    try {
      setLink(await renewInviteUrl());
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (friendshipId: string) => {
    setBusy(true);
    try {
      await endFriendship(friendshipId);
      setConfirming(null);
      const list = await listFriends();
      setFriends(list);
      onCount?.(list.length);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <>
      {failed && (
        <p role="alert" className="nota">
          {t.unavailable}
        </p>
      )}

      {waiting && (
        <>
          <h2 className="grupo">{t.groupInvite}</h2>
          <div className="lista">
            <div className="amigo">
              <span className="tx">
                <span className="t1">{t.pending}</span>
              </span>
              <Link to={`/amigos/${waiting}`} className="mini-b on">
                {t.pendingCta}
              </Link>
            </div>
          </div>
        </>
      )}

      {friends && friends.length === 0 && <p className="sub">{t.empty}</p>}

      {friends && friends.length > 0 && (
        <>
          <h2 className="grupo">{t.groupFriends}</h2>
          <ul className="lista">
            {friends.map((friend) => (
              <li key={friend.friendshipId} className="amigo">
                <span className="av2" aria-hidden="true">
                  {friend.firstName.charAt(0).toLocaleUpperCase('es')}
                </span>
                <span className="tx">
                  <span className="t1">{friend.firstName}</span>
                  {friend.since && <span className="t2">{since(friend.since)}</span>}
                  {confirming === friend.friendshipId && (
                    <span className="conf">
                      <span className="nota">{t.removeConfirm(friend.firstName)}</span>
                      <span className="acts">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void remove(friend.friendshipId)}
                          className="mini-b on"
                        >
                          {t.removeYes}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(null)}
                          className="mini-b"
                        >
                          {t.removeNo}
                        </button>
                      </span>
                    </span>
                  )}
                </span>
                {confirming !== friend.friendshipId && (
                  <button
                    type="button"
                    onClick={() => setConfirming(friend.friendshipId)}
                    className="mini-b"
                  >
                    {t.remove}
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="nota">{t.removeNote}</p>
        </>
      )}

      {link && (
        <>
          <button
            type="button"
            className="p1i"
            onClick={() => void (canShare ? share() : copyLink())}
          >
            {!canShare && copied ? t.copied : t.inviteCta}
          </button>
          {canShare && (
            <button type="button" className="p2i" onClick={() => void copyLink()}>
              {copied ? t.copied : t.copy}
            </button>
          )}
          <p className="nota enlace">{link}</p>
          <p className="nota">{t.body}</p>
          <button type="button" disabled={busy} onClick={() => void renew()} className="enl">
            {t.renew}
          </button>
          <p className="nota">{t.renewNote}</p>
        </>
      )}
    </>
  );
}
