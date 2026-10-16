import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Screen } from '@/design/Screen';
import { PATHS } from '@/components/routes';
import { copy } from '@/i18n';
import { activeProfile, getClient } from '@/store/account';
import { hasRemoteIdentity } from '@/store/hydrate.ts';
import { listFriends, type Friend } from '@/store/friends';
import { fetchQuota, renewalDate, type Quota } from '@/store/quota';
import { ComparisonGate } from './Gate';
import { Chevron, firstNameOf, initialOf, sinceLabel, useWide } from './pieces';

const t = copy.comparison.home;

/** Where «Invitar a alguien» and «Ir a Perfil» lead: Amigos, in Perfil. */
const TO_FRIENDS = `${PATHS.profile}?ver=amigos`;

/**
 * Comparar cartas, from Hoy (guide 9.14; package 15, 16 Oct 2026): the
 * friends to compare with. v1.2 C-01 — only friends inside Natus, astrology
 * and numerology only. Invitations are links, shared from Perfil; nobody is
 * searched for here.
 *
 * The phone lists them; the desktop lays them out as circles around yours,
 * to be dragged onto it or clicked.
 */
export function ComparisonHome() {
  const hasAccount = getClient() !== null && hasRemoteIdentity();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [failed, setFailed] = useState(false);
  // v1.2 F-01: what the plan has left, said before choosing.
  const [quota, setQuota] = useState<Quota | null>(null);
  const wide = useWide();
  const me = initialOf(firstNameOf(activeProfile()?.draft.legal_birth_name));

  useEffect(() => {
    if (!hasAccount) return;
    let live = true;
    listFriends()
      .then((list) => live && setFriends(list))
      .catch(() => live && setFailed(true));
    void fetchQuota('comparison').then((q) => live && setQuota(q));
    return () => {
      live = false;
    };
  }, [hasAccount]);

  return (
    <ComparisonGate>
      <Screen photo="bote" veil={0.38} glassAlpha={0.39}>
        <div className="pz comparar elegir mar">
          <div className="sc">
            <div className="d-izq">
              <p className="k">{t.kicker}</p>
              <h1 className="t mt">
                {t.titleLead}
                <em>{t.titleEmphasis}</em>
              </h1>
              <p className="cuerpo">{t.helper}</p>

              {hasAccount && <Cupo quota={quota} />}

              {!hasAccount && (
                <>
                  <p className="cuerpo">{t.needAccount}</p>
                  <Link to="/registro" className="btn p sola">
                    {t.createAccount}
                  </Link>
                </>
              )}

              {failed && (
                <p role="alert" className="cuerpo">
                  {t.unavailable}
                </p>
              )}

              {friends && friends.length === 0 && (
                <>
                  <p className="cuerpo">{t.empty}</p>
                  <Link to={TO_FRIENDS} className="btn s sola">
                    {t.toProfile}
                  </Link>
                </>
              )}
            </div>

            {!wide && friends && friends.length > 0 && (
              <>
                <div className="vid lista">
                  {friends.map((friend) => (
                    <Link key={friend.friendshipId} to={`${PATHS.comparison}/${friend.friendshipId}`} className="am">
                      <span className="av" aria-hidden="true">
                        {initialOf(friend.firstName)}
                      </span>
                      <div>
                        <p className="nm">{friend.firstName}</p>
                        {friend.since && <p className="sb">{sinceLabel(friend.since)}</p>}
                      </div>
                      <Chevron />
                    </Link>
                  ))}
                </div>
                <p className="link invitar">
                  <Link to={TO_FRIENDS}>
                    <u>{t.invite}</u>
                  </Link>
                </p>
              </>
            )}

            {wide && friends && friends.length > 0 && <Mesa friends={friends} me={me} />}
          </div>
        </div>
      </Screen>
    </ComparisonGate>
  );
}

function Cupo({ quota }: { quota: Quota | null }) {
  if (!quota || quota.remaining === null) return null;
  return (
    <p className="cupo">
      {quota.remaining > 0 ? copy.quota.comparisons(quota.remaining) : copy.quota.usedThisMonth(renewalDate(quota.renewsOn))}
    </p>
  );
}

/* ── Desktop: the table where two circles meet ─────────────────────────── */

/** Your circle, in the table's units (one at 1440 wide). */
const YO = { x: 210, y: 390, r: 118 };
/** How close a friend has to be dropped to count as on yours. */
const NEAR = 230;

/**
 * The friends on an arc to the right of yours. Three sit where the package
 * draws them (540,210 · 630,390 · 540,570); more spread along the same
 * ellipse, and from seven on the circles get smaller.
 */
function seats(n: number): { x: number; y: number; r: number }[] {
  const r = n > 6 ? 50 : 62;
  const step = n > 5 ? 160 / (n - 1) : 38.2;
  const span = (step * (n - 1)) / 2;
  return Array.from({ length: n }, (_, i) => {
    const angle = ((-span + i * step) * Math.PI) / 180;
    return { x: Math.round(YO.x + 420 * Math.cos(angle)), y: Math.round(YO.y + 291 * Math.sin(angle)), r };
  });
}

function Mesa({ friends, me }: { friends: Friend[]; me: string }) {
  const yo = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const places = seats(friends.length);

  return (
    <div className="mesa">
      <p className="pista-m">
        {t.dragHint}
        <small>{t.dragOr}</small>
      </p>
      <div ref={yo} className={near ? 'circ yo-c cerca' : 'circ yo-c'} style={{ '--x': YO.x, '--y': YO.y } as CSSProperties}>
        <b aria-hidden="true">{me}</b>
        <small>{t.you}</small>
      </div>
      {friends.map((friend, i) => (
        <FriendCircle key={friend.friendshipId} friend={friend} seat={places[i]!} yo={yo} onNear={setNear} />
      ))}
      <Link
        to={TO_FRIENDS}
        className="circ inv"
        aria-label={t.invite}
        style={{ '--x': 660, '--y': 680 } as CSSProperties}
      >
        <b aria-hidden="true">+</b>
        <span className="nm-c" aria-hidden="true">
          <u>{t.invite}</u>
        </span>
      </Link>
    </div>
  );
}

/**
 * A friend's circle. Dragged onto yours, or clicked, or Enter on it: the
 * comparison with that friend opens. Dropped anywhere else, it goes back.
 */
function FriendCircle({
  friend,
  seat,
  yo,
  onNear,
}: {
  friend: Friend;
  seat: { x: number; y: number; r: number };
  yo: RefObject<HTMLDivElement | null>;
  onNear: (near: boolean) => void;
}) {
  const navigate = useNavigate();
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const grab = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);
  const open = () => navigate(`${PATHS.comparison}/${friend.friendshipId}`);

  /** The pointer in the table's units: your circle is 236 of them wide. */
  const point = (ev: PointerEvent<HTMLDivElement>) => {
    const table = ev.currentTarget.parentElement!.getBoundingClientRect();
    const unit = (yo.current?.offsetWidth ?? YO.r * 2) / (YO.r * 2);
    return { x: (ev.clientX - table.left) / unit, y: (ev.clientY - table.top) / unit };
  };
  const isNear = (p: { x: number; y: number }) => Math.hypot(p.x - YO.x, p.y - YO.y) < NEAR;

  const down = (ev: PointerEvent<HTMLDivElement>) => {
    ev.currentTarget.setPointerCapture(ev.pointerId);
    const p = point(ev);
    grab.current = { dx: p.x - seat.x, dy: p.y - seat.y, moved: false };
    setDragging(true);
  };
  const move = (ev: PointerEvent<HTMLDivElement>) => {
    const g = grab.current;
    if (!g) return;
    const p = point(ev);
    const next = { x: p.x - g.dx, y: p.y - g.dy };
    if (Math.abs(next.x - seat.x) + Math.abs(next.y - seat.y) > 6) g.moved = true;
    setAt(next);
    onNear(isNear(next));
  };
  const up = (ev: PointerEvent<HTMLDivElement>) => {
    const g = grab.current;
    if (!g) return;
    grab.current = null;
    setDragging(false);
    const p = point(ev);
    const dropped = { x: p.x - g.dx, y: p.y - g.dy };
    if (!g.moved || isNear(dropped)) {
      setAt({ x: YO.x + 70, y: YO.y });
      setTimeout(open, g.moved ? 380 : 0);
    } else {
      setAt(null);
      onNear(false);
    }
  };
  const key = (ev: KeyboardEvent<HTMLDivElement>) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      open();
    }
  };

  const where = at ?? seat;
  return (
    <div
      className={dragging ? 'circ amigo arrastrando' : 'circ amigo'}
      role="link"
      tabIndex={0}
      aria-label={t.compareWith(friend.firstName)}
      style={{ '--x': where.x, '--y': where.y, '--r': seat.r } as CSSProperties}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        grab.current = null;
        setDragging(false);
        setAt(null);
        onNear(false);
      }}
      onKeyDown={key}
    >
      <b aria-hidden="true">{initialOf(friend.firstName)}</b>
      <span className="nm-c" aria-hidden="true">
        {friend.firstName}
        {friend.since && <small>{sinceLabel(friend.since)}</small>}
      </span>
    </div>
  );
}
