import { useCallback, useEffect, useState } from 'react';
import { copy } from '@/i18n';
import {
  endFriendship,
  listFriends,
  myInviteUrl,
  renewInviteUrl,
  type Friend,
} from '@/store/friends';

const t = copy.friends;

/**
 * The friends block in Perfil (v1.2 C-01, guide 9.x «Amigos: invitar,
 * aceptar, quitar»). Only rendered for somebody with an account: a friendship
 * has to outlive the browser it was made in.
 */
export function FriendsSection() {
  const [link, setLink] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const [url, list] = await Promise.all([myInviteUrl(), listFriends()]);
      setLink(url);
      setFriends(list);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
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
      setFriends(await listFriends());
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <section className="surface surface-p14 mb-3">
      <p className="eyebrow mb-1.5">{t.kicker}</p>
      <p className="mb-3 text-[length:var(--fs-body-11_5)] leading-relaxed text-crema/60">{t.body}</p>

      {failed && (
        <p role="alert" className="mb-3 text-[length:var(--fs-body-11_5)] leading-relaxed text-crema/80">
          {t.unavailable}
        </p>
      )}

      {link && (
        <div className="mb-3 flex flex-col gap-2">
          <p className="break-all text-[length:var(--fs-body-11)] leading-relaxed text-crema/70 select-all">{link}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => void copyLink()} className="chip chip-p10 flex-1 text-crema/75">
              {copied ? t.copied : t.copy}
            </button>
            {canShare && (
              <button type="button" onClick={() => void share()} className="chip chip-p10 flex-1 text-crema/75">
                {t.share}
              </button>
            )}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void renew()}
            className="text-left text-[length:var(--fs-body-11)] leading-relaxed text-crema/55 underline disabled:opacity-50"
          >
            {t.renew}
          </button>
          <p className="text-[length:var(--fs-body-11)] leading-relaxed text-crema/55">{t.renewNote}</p>
        </div>
      )}

      {friends && friends.length === 0 && (
        <p className="text-[length:var(--fs-body-12)] leading-relaxed text-crema/60">{t.empty}</p>
      )}

      {friends && friends.length > 0 && (
        <ul className="flex flex-col gap-2">
          {friends.map((friend) => (
            <li key={friend.friendshipId} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[length:var(--fs-body-13)] text-blanco">{friend.firstName}</p>
                {confirming !== friend.friendshipId && (
                  <button
                    type="button"
                    onClick={() => setConfirming(friend.friendshipId)}
                    className="chip chip-p6 px-3 text-crema/70"
                  >
                    {t.remove}
                  </button>
                )}
              </div>
              {confirming === friend.friendshipId && (
                <div className="flex flex-col gap-2">
                  <p className="text-[length:var(--fs-body-12)] leading-relaxed text-crema/80">
                    {t.removeConfirm(friend.firstName)}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(friend.friendshipId)}
                      className="chip chip-p10 flex-1 text-crema/80 disabled:opacity-50"
                    >
                      {t.removeYes}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="chip chip-p10 flex-1 text-crema/60"
                    >
                      {t.removeNo}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
