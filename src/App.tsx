import { useCallback, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { PhoneFrame } from '@/components/PhoneFrame';
import { SaveFailureNotice } from '@/components/SaveFailureNotice';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { BottomNav } from '@/components/BottomNav';
import { Landing } from '@/screens/Landing';
import { SoulMap } from '@/screens/SoulMap';
import { SafetyLab } from '@/screens/SafetyLab';
import { Onboarding } from '@/screens/onboarding/Onboarding';
import { Care } from '@/screens/onboarding/Care';
import { RequireCare } from '@/screens/onboarding/RequireCare';
import { Recommendations } from '@/screens/Recommendations';
import { Routine } from '@/screens/Routine';
import { Today } from '@/screens/Today';
import { Signup } from '@/screens/Signup';
import { Profile } from '@/screens/Profile';
import { Chat } from '@/screens/Chat';
import { Meditation } from '@/screens/Meditation';
import { Library } from '@/screens/Library';
import { ComparisonHome } from '@/screens/comparison/ComparisonHome';
import { Result } from '@/screens/comparison/Result';
import { showsNav, showsProfile } from '@/components/navigation';
import { ProfileButton } from '@/components/ProfileButton';
import { LegacyRedirect } from '@/components/LegacyRedirect';
import { LEGACY_PATHS, PATHS } from '@/components/routes';
import { copy } from '@/i18n';
import { useTakeoverShown } from '@/components/takeover';
import { HelpNowButton, HelpNowPanel } from '@/components/HelpNow';
import { hydrate } from '@/store/hydrate.ts';
import { rememberFirstTouch, track } from '@/store/funnel';
import { ensureWholeSignChart } from '@/store/chart';
import { activeProfile } from '@/store/account';
import { learnFromPending } from '@/store/memory';
import { refreshMapMonthly } from '@/store/monthly-map';

const LEARN_EVERY_MS = 10 * 60 * 1000;
import { isBackendConfigured, isDemoMode, requiresInvite } from '@/supabase/client.ts';
import { Gate } from '@/screens/Gate';
import { NotFound } from '@/screens/NotFound';
import { Journal, NewJournalEntry } from '@/screens/Journal';
import { FriendInvite } from '@/screens/friends/FriendInvite';

const TITLES: [prefix: string, title: string][] = [
  ['/onboarding', copy.chrome.titles.onboarding],
  [PATHS.chart, copy.nav.chart],
  ['/cuidarte', copy.chrome.titles.care],
  [PATHS.paths, copy.nav.paths],
  [PATHS.journey, copy.nav.journey],
  [PATHS.journal, copy.nav.journal],
  [PATHS.today, copy.nav.today],
  ['/registro', copy.chrome.titles.signup],
  [PATHS.profile, copy.nav.profile],
  [PATHS.chat, copy.nav.chat],
  ['/meditaciones', copy.chrome.titles.meditations],
  ['/biblioteca', copy.chrome.titles.library],
  ['/comparacion', copy.chrome.titles.comparison],
  ...(isDemoMode ? [['/lab', 'Safety lab'] as [string, string]] : []),
];

function titleFor(pathname: string): string {
  if (pathname === '/') return 'Natus';
  const match = TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return `${match?.[1] ?? copy.chrome.titles.notFound} · Natus`;
}

export function App() {
  const { pathname } = useLocation();
  const takeoverShown = useTakeoverShown();
  const [helpOpen, setHelpOpen] = useState(false);
  const openHelp = useCallback(() => setHelpOpen(true), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  // Load the dataset before anything reads it.
  //
  // The screens below call the store from their render bodies —
  // `activeProfile()`, `currentSynthesis()` — so rendering before the mirror
  // is filled would paint an empty account and then flip. Gating here is what
  // buys those twenty-eight call sites the right to stay synchronous.
  //
  // It resolves either way: a paused project or a missing configuration lands
  // on localStorage rather than on an error.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    document.title = titleFor(pathname);
  }, [pathname]);

  const [ready, setReady] = useState(false);
  const [admitted, setAdmitted] = useState(false);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    let live = true;
    rememberFirstTouch();
    let memoryTimer: ReturnType<typeof setInterval> | null = null;
    void hydrate().then((result) => {
      if (result.kind === 'remote') {
        track('app_opened');
        const profile = activeProfile();
        if (profile) void ensureWholeSignChart(profile.draft);
        // v1.2 M-01: whatever the memory has not read yet, and every few
        // minutes after, which is how a conversation gone quiet is read.
        void learnFromPending();
        // v1.2 M-02: the map is written again once a month, in the background.
        void refreshMapMonthly();
        memoryTimer = setInterval(() => void learnFromPending(), LEARN_EVERY_MS);
      }
      if (!live) return;
      setAdmitted(result.kind === 'remote');
      setOffline(result.kind === 'local' && result.reason === 'failed');
      setReady(true);
    });
    return () => {
      live = false;
      if (memoryTimer) clearInterval(memoryTimer);
    };
  }, []);

  if (!ready) {
    return (
      <PhoneFrame>
        <div
          role="status"
          aria-live="polite"
          className="flex min-h-dvh items-center justify-center px-6 text-center"
        >
          <p className="text-[length:var(--fs-body-12_5)] leading-relaxed text-crema/55">{copy.chrome.opening}</p>
        </div>
      </PhoneFrame>
    );
  }

  // The door.
  //
  // Only when a backend is configured: without one there is nothing to protect
  // and nothing to sign in to, so the fixture demo runs untouched and offline.
  // `admitted` comes from hydration having found a session, which it now never
  // creates — an identity arrives only by walking through Google, and Google
  // refuses anyone off the consent screen's list before the redirect returns.
  if (isBackendConfigured && requiresInvite && !admitted) {
    return (
      <PhoneFrame>
        <Gate />
        <div className="fixed top-0 right-0 z-50 p-2 sm:absolute">
          <HelpNowButton onOpen={openHelp} />
        </div>
        {helpOpen && <HelpNowPanel onClose={closeHelp} />}
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div className="fixed inset-x-0 top-0 z-50 flex flex-col gap-1.5 p-2 sm:absolute">
        <div className="flex items-start gap-1.5">
          <div className="min-w-0 flex-1" />
          <HelpNowButton onOpen={openHelp} />
          {showsProfile(pathname, takeoverShown) && <ProfileButton />}
        </div>
        <SaveFailureNotice offline={offline} />
      </div>
      {/*
        Keyed by pathname so navigating away clears a caught error. Without the
        key the fallback outlives the screen that produced it and the whole
        application reads as broken, which is a worse lie than the bug.

        Inside the frame rather than around it: the banner and the navigation
        are how somebody leaves a screen that failed, so they have to survive
        it.
      */}
      <main className="h-full">
        <ErrorBoundary key={pathname}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path={PATHS.chart} element={<SoulMap />} />
            <Route path="/cuidarte" element={<Care />} />
            <Route
              path={PATHS.paths}
              element={
                <RequireCare next="/caminos" blockOnCrisis>
                  <Recommendations />
                </RequireCare>
              }
            />
            <Route
              path={PATHS.journey}
              element={
                <RequireCare next="/recorrido" blockOnCrisis>
                  <Routine />
                </RequireCare>
              }
            />
            <Route path={PATHS.journal} element={<Journal />} />
            <Route path={`${PATHS.journal}/nueva`} element={<NewJournalEntry />} />
            <Route path={PATHS.today} element={<Today />} />
            <Route path="/registro" element={<Signup />} />
            <Route path={PATHS.profile} element={<Profile />} />
            <Route
              path={PATHS.chat}
              element={
                <RequireCare next="/chat">
                  <Chat />
                </RequireCare>
              }
            />
            <Route path={PATHS.meditations} element={<Meditation />} />
            <Route path={PATHS.library} element={<Library />} />
            <Route path={PATHS.comparison} element={<ComparisonHome />} />
            <Route path="/comparacion/:friendshipId" element={<Result />} />
            <Route path="/amigos/:token" element={<FriendInvite />} />
            {Object.entries(LEGACY_PATHS).map(([from, to]) => (
              <Route key={from} path={from} element={<LegacyRedirect to={to} />} />
            ))}
            {isDemoMode && <Route path="/lab/safety" element={<SafetyLab />} />}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>
      {showsNav(pathname, takeoverShown) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-3 sm:absolute">
          <BottomNav />
        </div>
      )}
      {helpOpen && <HelpNowPanel onClose={closeHelp} />}
    </PhoneFrame>
  );
}
