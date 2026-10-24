import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Screen } from '@/design/Screen';
import { buildExport, exportFileName } from '@/lib/export';
import { clearAll, exportAll } from '@/store/db';
import { clearStoredBlobs } from '@/store/blobs';
import { hasRemoteIdentity, LastAdminError, purgeRemote } from '@/store/hydrate.ts';
import { LegalLinks } from '@/components/LegalLinks';
import { currentUser, signOut } from '@/supabase/session.ts';
import { activeProfile, getClient, updateActiveProfile } from '@/store/account';
import { copy, type GrammaticalGender } from '@/i18n';
import { FriendsSection } from '@/screens/friends/FriendsSection';
import { MemorySection } from '@/screens/MemorySection';
import { PATHS } from '@/components/routes';
import { serverOnlyData } from '@/store/server-export';
import { CrisisScreen } from '@/screens/CrisisScreen';
import { listCrisisEvents, markFalsePositive } from '@/store/crisis';
import { fetchQuota, renewalDate } from '@/store/quota';
import { isSubscribed } from '@/store/subscription';
import { getPreferences } from '@/store/preferences';
import { listFriends } from '@/store/friends';
import { initialOf } from '@/components/ProfileButton';
import { PayPalSubscribe } from '@/components/PayPalSubscribe';
import { Row, RowIcon, Tick, Title } from '@/screens/profile/parts';
import { LIVING_COUNTRIES, countryName } from '@/components/countries';

const t = copy.profile;
const GENDERS = copy.onboarding.basicData.genderOptions;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Where PayPal keeps the subscriptions a person pays (proposal, 16 Oct 2026). */
const PAYPAL_AUTOPAY = 'https://www.paypal.com/myaccount/autopay/';

/**
 * Each row of the profile opens its own screen (package 11). They live in the
 * query string, so the browser's back goes back to the list.
 */
type View =
  'cuenta' | 'trato' | 'pais' | 'amigos' | 'memoria' | 'plan' | 'datos' | 'borrar' | 'confirmar';
const VIEWS: readonly View[] = [
  'cuenta',
  'trato',
  'pais',
  'amigos',
  'memoria',
  'plan',
  'datos',
  'borrar',
  'confirmar',
];

function firstNameOf(fullName: string | undefined): string {
  return fullName?.trim().split(/\s+/)[0] ?? '';
}

/**
 * Premium is never offered after a crisis alert (decided 15 Oct 2026). The
 * server decides it for the quota; the browser holds it back too, on the
 * alerts it saw itself, so the offer never flashes before the server answers.
 */
function alertWithinSevenDays(now = Date.now()): boolean {
  return listCrisisEvents().some(
    (e) => e.false_positive !== true && now - e.created_at < SEVEN_DAYS_MS,
  );
}

/**
 * Perfil (package 11, 16 Oct 2026): «Tus datos son tuyos». The monk, a
 * neutral black veil, and two glass lists — the account, then the plan and
 * the data. Each row opens its own screen.
 */
export function Profile() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const asked = params.get('ver') as View | null;
  const view: View | null = asked && VIEWS.includes(asked) ? asked : null;
  const go = (next: View | null) => setParams(next ? { ver: next } : {});

  const client = getClient();
  const remote = Boolean(client && hasRemoteIdentity());
  const profile = activeProfile();
  const draft = profile?.draft;

  const [gender, setGender] = useState<GrammaticalGender | null>(
    () => draft?.grammatical_gender ?? null,
  );
  const [country, setCountry] = useState<string>(() => draft?.country ?? '');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<false | 'error' | 'last_admin'>(false);
  const [exported, setExported] = useState<string | null>(null);
  const [crisisEventId, setCrisisEventId] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);

  // What the server says of the plan; unknown until it answers.
  const [quota, setQuota] = useState<{
    tier: 'free' | 'premium';
    offer: boolean;
    gift: boolean;
    giftEndsOn: string | null;
  } | null>(null);
  const [google, setGoogle] = useState(false);
  const [friendCount, setFriendCount] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    void fetchQuota('chat').then((q) => {
      if (live)
        setQuota(q ? { tier: q.tier, offer: q.offerPremium, gift: q.gift, giftEndsOn: q.giftEndsOn } : null);
    });
    if (remote) {
      void currentUser().then((user) => {
        if (live) setGoogle(Boolean(user?.identities?.some((i) => i.provider === 'google')));
      });
      listFriends()
        .then((list) => live && setFriendCount(list.length))
        .catch(() => {});
    }
    return () => {
      live = false;
    };
  }, [remote]);

  const tier = quota?.tier ?? (isSubscribed() ? 'premium' : 'free');
  const offer = (quota ? quota.offer : true) && !alertWithinSevenDays();

  const chooseGender = (value: GrammaticalGender) => {
    if (updateActiveProfile({ grammatical_gender: value })) setGender(value);
  };

  const download = async () => {
    const at = new Date().toISOString();
    // The memory and the routine proposals live only on the server (M-01,
    // R-04); everything else is in the mirror.
    const doc = buildExport({ ...exportAll(), ...(await serverOnlyData()) }, { exportedAt: at });
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
    } catch (error) {
      setBusy(false);
      setFailed(error instanceof LastAdminError ? 'last_admin' : 'error');
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

  if (crisisEventId) {
    return (
      <CrisisScreen
        country={draft?.country}
        onNotMyCase={() => {
          markFalsePositive(crisisEventId);
          setCrisisEventId(null);
        }}
        onBack={() => setCrisisEventId(null)}
      />
    );
  }

  const genderLabel = GENDERS.find(([value]) => value === gender)?.[1];
  const livingName = country ? countryName(country) : undefined;
  const elsewhere = Boolean(country) && !(LIVING_COUNTRIES.first as readonly (readonly [string, string])[]).some(([c]) => c === country);
  const accountLine = remote
    ? google
      ? t.rows.accountGoogle
      : client?.email
    : client
      ? client.email
      : t.noAccount;
  const memoryLine =
    tier === 'premium'
      ? getPreferences().memory_consent_at
        ? t.rows.memoryOn
        : t.rows.memoryPaused
      : offer
        ? t.rows.memoryFree
        : undefined;
  const exportedNote = exported && (
    <p role="status" className="nota">
      {t.exported(exported)}
    </p>
  );

  /** The screen each row opens. */
  const inner = (): ReactNode => {
    switch (view) {
      case 'cuenta': {
        const born = draft?.birth_date
          ? [copy.journal.date(draft.birth_date, 0), draft.birth_time || t.birth.noTime].join(' · ')
          : '';
        const where = [
          draft?.birth_city,
          (draft?.birth_country ? countryName(draft.birth_country) : undefined) || draft?.birth_country,
        ]
          .filter(Boolean)
          .join(', ');
        return (
          <>
            <p className="k">{t.account.kicker}</p>
            <Title lead={t.account.titleLead} emphasis={t.account.titleEmphasis} />
            <div className="lista">
              <div className="dato">
                <p className="l">{t.account.access}</p>
                <p className="v">
                  {client
                    ? google
                      ? t.account.accessGoogle(client.email)
                      : client.email
                    : t.noAccount}
                </p>
              </div>
              {draft?.birth_date && (
                <>
                  <div className="dato">
                    <p className="l">{t.account.fullName}</p>
                    <p className="v">{draft.legal_birth_name}</p>
                  </div>
                  <div className="dato">
                    <p className="l">{t.account.birth}</p>
                    <p className="v">
                      {born}
                      {where && (
                        <>
                          <br />
                          {where}
                        </>
                      )}
                    </p>
                  </div>
                </>
              )}
            </div>
            {!client && (
              <>
                <p className="nota">{t.noAccountBody}</p>
                <Link to="/registro" className="p1i">
                  {t.saveMap}
                </Link>
              </>
            )}
            {client && !remote && <p className="nota">{t.accountSimulated}</p>}
            {/* v1.2 M-02: the birth data, editable; changing it writes the map again. */}
            {draft?.birth_date && (
              <>
                <p className="nota">{t.account.note}</p>
                <Link to={`${PATHS.profile}/nacimiento`} className="p2i">
                  {t.account.edit}
                </Link>
              </>
            )}
            {hasRemoteIdentity() && (
              <>
                <div className="hueco" />
                <p className="nota centro">{t.signOutNote}</p>
                <button
                  type="button"
                  className="borrar"
                  disabled={busy}
                  onClick={() => void leave()}
                >
                  {t.signOut}
                </button>
              </>
            )}
          </>
        );
      }

      // The country decides the help lines; the birth data edit has always
      // changed it too, without writing the map again.
      case 'pais':
        return (
          <>
            <p className="k">{t.country.kicker}</p>
            <Title lead={t.country.titleLead} emphasis={t.country.titleEmphasis} />
            <p className="sub">{t.country.sub}</p>
            {/* Every country (owner, 16 Oct 2026): the five with help lines,
                then the rest of the world in one list. */}
            <div role="radiogroup" aria-label={t.country.kicker} className="lista">
              {LIVING_COUNTRIES.first.map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  role="radio"
                  aria-checked={country === code}
                  onClick={() => {
                    if (updateActiveProfile({ country: code })) setCountry(code);
                  }}
                  className={country === code ? 'op on' : 'op'}
                >
                  <span className="tx">
                    <span className="t1">{label}</span>
                  </span>
                  <span className="ck">{country === code && Tick}</span>
                </button>
              ))}
              <label className={elsewhere ? 'op on' : 'op'}>
                <span className="tx">
                  <span className="t1">{elsewhere ? livingName : t.country.otherLabel}</span>
                  <span className="t2">{t.country.other}</span>
                </span>
                <span className="ck">{elsewhere && Tick}</span>
                <select
                  className="op-select"
                  aria-label={t.country.otherLabel}
                  value={elsewhere ? country : ''}
                  onChange={(e) => {
                    const code = e.target.value;
                    if (code && updateActiveProfile({ country: code })) setCountry(code);
                  }}
                >
                  <option value="" disabled>
                    {t.country.otherLabel}
                  </option>
                  {LIVING_COUNTRIES.rest.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        );

      case 'trato':
        return (
          <>
            <p className="k">{t.voice.kicker}</p>
            <Title lead={t.voice.titleLead} emphasis={t.voice.titleEmphasis} />
            <p className="sub">{t.voice.sub}</p>
            <div role="radiogroup" aria-label={t.voice.kicker} className="lista">
              {GENDERS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={gender === value}
                  onClick={() => chooseGender(value)}
                  className={gender === value ? 'op on' : 'op'}
                >
                  <span className="tx">
                    <span className="t1">{label}</span>
                    <span className="t2">{t.voice.examples[value]}</span>
                  </span>
                  <span className="ck">{gender === value && Tick}</span>
                </button>
              ))}
            </div>
          </>
        );

      case 'amigos':
        return (
          <>
            <p className="k">{copy.friends.kicker}</p>
            <Title lead={copy.friends.titleLead} emphasis={copy.friends.titleEmphasis} />
            {remote ? (
              <FriendsSection onCount={setFriendCount} />
            ) : (
              <p className="sub">{copy.friends.needAccount}</p>
            )}
          </>
        );

      case 'memoria':
        return (
          <>
            <p className="k">{copy.memory.kicker}</p>
            <Title lead={copy.memory.titleLead} emphasis={copy.memory.titleEmphasis} />
            {remote && <MemorySection country={draft?.country} onCrisis={setCrisisEventId} />}
          </>
        );

      case 'plan':
        return (
          <>
            <p className="k">{t.plan.kicker}</p>
            <Title lead={t.plan.titleLead} emphasis={t.plan.titleEmphasis} />
            {tier === 'premium' ? (
              <>
                <div className="card on">
                  <p className="et">{t.plan.yours}</p>
                  <p className="nom">{t.tierPremium}</p>
                  <p className="pr">
                    {quota?.gift
                      ? quota.giftEndsOn
                        ? t.plan.giftUntil(renewalDate(quota.giftEndsOn))
                        : t.plan.giftNoEnd
                      : t.plan.renews}
                  </p>
                  <ul>
                    {t.plan.premiumIncludes.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                {/* Chile's Ley 21.398: cancelling sits where the plan is. A gift has nothing to cancel. */}
                {!quota?.gift && (
                  <>
                    <div className="hueco" />
                    <button type="button" className="p2i" onClick={() => setCancelling(true)}>
                      {t.plan.cancel}
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="card">
                  <p className="et">{t.plan.yours}</p>
                  <p className="nom">{t.tierFree}</p>
                  <ul>
                    {t.plan.freeIncludes.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                {offer && (
                  <>
                    <div className="card on">
                      <p className="et">{t.tierPremium}</p>
                      <p className="nom">
                        {t.plan.premiumLead}
                        <em>{t.plan.premiumEmphasis}</em>
                        {t.plan.premiumTail}
                      </p>
                      <p className="pr">{t.plan.price}</p>
                      <ul>
                        {t.plan.premiumIncludes.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                      {paying ? (
                        <div className="pago">
                          <PayPalSubscribe place="profile" />
                        </div>
                      ) : (
                        <button type="button" className="p1i" onClick={() => setPaying(true)}>
                          {t.plan.tryFree}
                        </button>
                      )}
                    </div>
                    <p className="nota">{t.plan.cancelAnytime}</p>
                  </>
                )}
              </>
            )}
          </>
        );

      case 'datos':
        return (
          <>
            <p className="k">{t.data.kicker}</p>
            <Title lead={t.data.titleLead} emphasis={t.data.titleEmphasis} />
            <p className="sub">{t.data.sub}</p>
            <div className="lista">
              <Row
                icon={RowIcon.download}
                title={t.data.take}
                line={t.data.takeLine}
                onClick={() => void download()}
              />
            </div>
            {exportedNote}
            <div className="hueco" />
            <p className="nota centro">{t.data.leaveNote}</p>
            <button type="button" className="borrar" onClick={() => go('borrar')}>
              {t.data.deleteLink}
            </button>
          </>
        );

      case 'borrar':
        return (
          <>
            <p className="paso">{t.erase.step1}</p>
            <Title lead={t.erase.titleLead} emphasis={t.erase.titleEmphasis} />
            <p className="sub">{t.erase.forever}</p>
            <div className="card">
              <ul className="sin-margen">
                {t.erase.what.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <p className="nota">{t.erase.when}</p>
            <button type="button" className="p1i" onClick={() => void download()}>
              {t.erase.takeFirst}
            </button>
            {exportedNote}
            <button type="button" className="p2i" onClick={() => go('confirmar')}>
              {t.erase.next}
            </button>
          </>
        );

      case 'confirmar': {
        const ready = typed.trim().toLocaleUpperCase('es') === t.erase.word;
        return (
          <>
            <p className="paso">{t.erase.step2}</p>
            <Title
              lead={t.erase.confirmLead}
              emphasis={t.erase.confirmEmphasis}
              tail={t.erase.confirmTail}
            />
            <label htmlFor="perfil-borrar" className="lbl-b">
              {t.erase.typeLabel}
            </label>
            <input
              id="perfil-borrar"
              className="campo-b"
              value={typed}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              onChange={(e) => setTyped(e.target.value)}
            />
            <div className="hueco" />
            <button
              type="button"
              className={ready ? 'p1err' : 'p1err off'}
              disabled={!ready || busy}
              onClick={() => void deleteEverything()}
            >
              {busy ? t.deleting : t.erase.confirm}
            </button>
            {failed && (
              <p role="alert" className="nota error">
                {failed === 'last_admin' ? t.deleteLastAdmin : t.deleteFailed}
              </p>
            )}
            <button
              type="button"
              className="p2i"
              onClick={() => {
                setTyped('');
                go('datos');
              }}
            >
              {t.erase.back}
            </button>
          </>
        );
      }

      default:
        return null;
    }
  };

  const veil = <div className="velo-pf" aria-hidden="true" />;

  if (view) {
    return (
      <Screen photo="monje" veil={0} focus="center 70%">
        <div className="pz perfil">
          {veil}
          <div key={view} className="scroll interna">
            {inner()}
          </div>
          {cancelling && (
            <>
              <div className="velo-p" aria-hidden="true" onClick={() => setCancelling(false)} />
              <div
                className="hoja-c"
                role="dialog"
                aria-modal="true"
                aria-labelledby="perfil-cancelar"
              >
                <h2 id="perfil-cancelar" className="t">
                  {t.plan.cancelTitleLead}
                  <em>{t.plan.cancelTitleEmphasis}</em>
                  {t.plan.cancelTitleTail}
                </h2>
                <p className="nota fuerte">{t.plan.cancelBody}</p>
                <a href={PAYPAL_AUTOPAY} target="_blank" rel="noopener noreferrer" className="p2i">
                  {t.plan.cancel}
                </a>
                <button type="button" className="p1i" onClick={() => setCancelling(false)}>
                  {t.plan.cancelNo}
                </button>
              </div>
            </>
          )}
        </div>
      </Screen>
    );
  }

  const name = firstNameOf(draft?.legal_birth_name);

  return (
    <Screen photo="monje" veil={0} focus="center 70%">
      <div className="pz perfil">
        {veil}
        <div className="scroll">
          <div className="colA">
            <p className="k">{t.kicker}</p>
            <Title lead={t.titleLead} emphasis={t.titleEmphasis} />
            <div className="yo-g">
              <span className="av" aria-hidden="true">
                {initialOf(draft?.legal_birth_name)}
              </span>
              <div>
                {name && <p className="nm">{name}</p>}
                <p className="sb">{client ? t.savedInAccount : t.noAccountBody}</p>
                <span className="plan">{tier === 'premium' ? t.tierPremium : t.tierFree}</span>
              </div>
            </div>
            {remote && <p className="sub solo-pc">{t.deskSub}</p>}

            <h2 className="grupo">{t.groupAccount}</h2>
            <div className="lista">
              <Row icon={RowIcon.lock} title={t.rows.account} line={accountLine} to="?ver=cuenta" />
              {gender && (
                <Row icon={RowIcon.voice} title={t.rows.voice} line={genderLabel} to="?ver=trato" />
              )}
              {draft && (
                <Row
                  icon={RowIcon.country}
                  title={t.rows.country}
                  line={livingName ? t.rows.countryLine(livingName) : undefined}
                  to="?ver=pais"
                />
              )}
              {remote && (
                <Row
                  icon={RowIcon.friends}
                  title={t.rows.friends}
                  line={t.rows.friendsCount(friendCount ?? 0)}
                  to="?ver=amigos"
                />
              )}
            </div>
          </div>

          <div className="colB">
            <h2 className="grupo">{t.groupPlan}</h2>
            <div className="lista">
              <Row
                icon={RowIcon.plan}
                title={t.rows.plan}
                line={tier === 'premium' ? t.tierPremium : offer ? t.rows.planFree : t.tierFree}
                to="?ver=plan"
              />
              {remote && (
                <Row
                  icon={RowIcon.memory}
                  title={t.rows.memory}
                  line={memoryLine}
                  to="?ver=memoria"
                />
              )}
              <Row
                icon={RowIcon.download}
                title={t.rows.data}
                line={t.rows.dataLine}
                to="?ver=datos"
              />
            </div>
            {/* «Cerrar sesión» in sight at the foot of Perfil (option B,
                owner, 21 Oct 2026); it stays in «Cuenta» too. Only for an
                account: without one, leaving loses the map. */}
            {remote && (
              <div className="salir">
                <button type="button" className="p2i" disabled={busy} onClick={() => void leave()}>
                  {t.signOut}
                </button>
                <p className="nota centro">{t.signOutNote}</p>
              </div>
            )}
            <LegalLinks className="legales" />
          </div>
        </div>
      </div>
    </Screen>
  );
}
