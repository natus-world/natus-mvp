import { useState } from 'react';
import { copy } from '@/i18n';
import { track } from '@/store/funnel';

const t = copy.friends;

/**
 * «Invitar a alguien» and «Copiar mi link»: the phone's share sheet, or
 * copying where there is none. One behaviour for Amigos in Perfil and for
 * Comparar cartas with no friends yet (owner, 21 Oct 2026).
 */
export function InviteButtons({
  link,
  primary,
  secondary,
}: {
  link: string;
  primary: string;
  secondary: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
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
    try {
      await navigator.share({ text: t.shareText, url: link });
      track('friend_invited');
    } catch {
      // Cancelled, or not supported: copying is the fallback beside it.
    }
  };

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <>
      <button type="button" className={primary} onClick={() => void (canShare ? share() : copyLink())}>
        {!canShare && copied ? t.copied : t.inviteCta}
      </button>
      {canShare && (
        <button type="button" className={secondary} onClick={() => void copyLink()}>
          {copied ? t.copied : t.copy}
        </button>
      )}
    </>
  );
}
