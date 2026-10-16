import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { serveModel } from '../_shared/serve-model.ts';
import { routineReviewInputSchema } from '../_shared/lib/model-input.ts';
import {
  routineReviewSchema,
  soulMapSynthesisSchema,
  type Modality,
  type RoutineReview,
  type SoulMapSynthesis,
} from '../_shared/lib/schemas/index.ts';
import { modalityBySlug } from '../_shared/lib/catalog.ts';
import { scanText } from '../_shared/lib/safety.ts';
import { lintDeep } from '../_shared/lib/copy-lint.ts';
import { hasFoodOrWeightSignal, lintPhysicalRisk } from '../_shared/lib/physical-risk.ts';
import { reviewDue, type ReviewTrigger } from '../_shared/lib/routine-review.ts';
import { callerIsClinicallyVulnerable, withoutClinicalExclusions } from '../_shared/clinical.ts';
import { overPlanCap, planTier } from '../_shared/quota.ts';
import { memoryActive, readMemory } from '../_shared/memory.ts';
import {
  ROUTINE_REVIEW_PROMPT_VERSION,
  ROUTINE_REVIEW_SYSTEM_PROMPT,
  buildRoutineReviewUserMessage,
  type ReviewPractice,
} from '../_shared/prompts/routine-review.ts';

/**
 * v1.2 R-04: review the person's routine and propose a change, or none.
 *
 * The browser asks and says nothing else. Whether a review is due — the week,
 * the two months, the two signals — is decided here from the rows, by the
 * same rule `src/lib/routine-review.ts` tests, so nobody can ask for reviews
 * the plan does not give. What is proposed is stored as a pending proposal
 * the person accepts or turns down; nothing in the routine changes here.
 */

const DISMISSED_FOR_MS = 7 * 24 * 60 * 60 * 1000;
const RECENT = 4;

type Practice = {
  id: string;
  title: string;
  body: string;
  invitation: string;
  cadence: string;
  connects_soul_map: boolean;
  connects_modality: string | null;
  created_at: string;
};
type Checkin = { practice_title: string; checked_on: string; rating: number | null; comment: string | null };

type Built = {
  trigger: ReviewTrigger;
  matchId: string;
  synthesis: SoulMapSynthesis;
  practices: Practice[];
  checkins: Checkin[];
  kept: { modality: Modality; reason: string | null }[];
  canReturn: Modality[];
  memory: { category: string; content: string }[] | null;
  fastingBarred: boolean;
};

type Request = { built?: Built };

type Read = { trigger: ReviewTrigger | null; reason?: string; base?: Omit<Built, 'trigger' | 'memory' | 'fastingBarred' | 'canReturn' | 'kept'> & { result: unknown; reactions: { modality_slug: string; reaction: string; reacted_at: string }[] } };

async function read(caller: SupabaseClient, elevated: SupabaseClient, userId: string): Promise<Read> {
  const { data: match } = await caller
    .from('modality_matches')
    .select('id, result, synthesis_id')
    .eq('user_id', userId)
    .eq('is_current', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!match) return { trigger: null, reason: 'no_routine' };

  const [synthesisRow, practicesRows, checkinRows, reactionRows, lastReview, pending, tier] = await Promise.all([
    caller.from('soul_map_syntheses').select('synthesis').eq('id', match.synthesis_id).maybeSingle(),
    caller
      .from('routine_practices')
      .select('id, title, body, invitation, cadence, connects_soul_map, connects_modality, created_at')
      .eq('match_id', match.id)
      .eq('is_active', true),
    caller.from('recommendation_checkins').select('practice_title, checked_on, rating, comment').eq('user_id', userId),
    caller.from('match_reactions').select('modality_slug, reaction, reacted_at').eq('user_id', userId),
    caller
      .from('routine_change_proposals')
      .select('created_at')
      .eq('match_id', match.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    caller.from('routine_change_proposals').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'pending'),
    planTier(elevated, userId),
  ]);

  const synthesis = soulMapSynthesisSchema.safeParse(synthesisRow.data?.synthesis);
  const practices = (practicesRows.data ?? []) as Practice[];
  if (!synthesis.success || practices.length === 0) return { trigger: null, reason: 'no_routine' };

  const titles = new Set(practices.map((p) => p.title));
  const checkins = ((checkinRows.data ?? []) as Checkin[]).filter((c) => titles.has(c.practice_title));

  const trigger = reviewDue({
    tier,
    now: Date.now(),
    routineStartedAt: Math.min(...practices.map((p) => Date.parse(p.created_at))),
    lastReviewAt: lastReview.data ? Date.parse(lastReview.data.created_at as string) : null,
    pendingProposal: (pending.count ?? 0) > 0,
    practices: practices.map((p) => ({ title: p.title, cadence: p.cadence, createdAt: Date.parse(p.created_at) })),
    checkins: checkins.map((c) => ({ title: c.practice_title, day: c.checked_on, rating: c.rating })),
  });

  return {
    trigger,
    reason: trigger ? undefined : 'not_due',
    base: {
      matchId: match.id as string,
      synthesis: synthesis.data,
      practices,
      checkins,
      result: match.result,
      reactions: (reactionRows.data ?? []) as { modality_slug: string; reaction: string; reacted_at: string }[],
    },
  };
}

function refOf(index: number): string {
  return `p${index + 1}`;
}

function practiceByRef(practices: readonly Practice[], ref: string): Practice | undefined {
  const match = /^p(\d+)$/.exec(ref);
  return match ? practices[Number(match[1]) - 1] : undefined;
}

function reviewPractices(built: Built): ReviewPractice[] {
  return built.practices.map((p, index) => {
    const mine = built.checkins
      .filter((c) => c.practice_title === p.title)
      .sort((a, b) => b.checked_on.localeCompare(a.checked_on));
    return {
      ref: refOf(index),
      title: p.title,
      body: p.body,
      cadence: p.cadence,
      connectsTo: { soul_map: p.connects_soul_map, modality_slug: p.connects_modality },
      timesDone: mine.length,
      lastDone: mine[0]?.checked_on ?? null,
      recentRatings: mine.flatMap((c) => (c.rating === null ? [] : [c.rating])).slice(0, RECENT),
      // A comment that raised a signal stays out of the payload.
      recentComments: mine
        .flatMap((c) => (c.comment && !scanText(c.comment).crisis ? [c.comment] : []))
        .slice(0, RECENT),
    };
  });
}

function built(input: Request): Built {
  if (!input.built) throw new Error('the review payload was not built');
  return input.built;
}

Deno.serve(
  serveModel<Request, RoutineReview>({
    purpose: 'routine_review',
    promptVersion: ROUTINE_REVIEW_PROMPT_VERSION,
    input: routineReviewInputSchema,
    output: routineReviewSchema,
    system: ROUTINE_REVIEW_SYSTEM_PROMPT,
    user: (input, { gender }) => {
      const b = built(input);
      return buildRoutineReviewUserMessage({
        trigger: b.trigger,
        synthesis: b.synthesis,
        practices: reviewPractices(b),
        kept: b.kept,
        canReturn: b.canReturn,
        memory: b.memory,
        gender,
      });
    },

    refuse: async (_input, { caller, userId, elevated }) => {
      const { trigger, reason } = await read(caller, elevated, userId);
      if (!trigger) return { reason: reason ?? 'not_due', safety: false };
      if (trigger !== 'bimonthly_free' && (await overPlanCap(elevated, userId)).over) {
        return { reason: 'plan_cap', safety: false };
      }
      return null;
    },

    enrich: async (_input, { caller, userId, elevated }) => {
      const { trigger, base } = await read(caller, elevated, userId);
      if (!trigger || !base) throw new Error('the review stopped being due');

      const vulnerable = await callerIsClinicallyVulnerable(caller, userId);
      const matched = ((base.result as { matched_modalities?: { modality_slug: string; reasoning?: string }[] })
        .matched_modalities ?? []);
      const dismissedAt = new Map(
        base.reactions.filter((r) => r.reaction === 'dismissed').map((r) => [r.modality_slug, Date.parse(r.reacted_at)]),
      );
      const now = Date.now();
      const keptSlugs = withoutClinicalExclusions(
        matched.map((m) => m.modality_slug).filter((slug) => !dismissedAt.has(slug)),
        vulnerable,
      ).kept;
      const returning = withoutClinicalExclusions(
        matched
          .map((m) => m.modality_slug)
          .filter((slug) => dismissedAt.has(slug) && now - (dismissedAt.get(slug) ?? now) >= DISMISSED_FOR_MS),
        vulnerable,
      ).kept;

      const memory = (await memoryActive(caller, elevated, userId)) ? await readMemory(caller, userId) : null;

      return {
        built: {
          ...base,
          trigger,
          kept: keptSlugs.flatMap((slug) => {
            const modality = modalityBySlug(slug);
            return modality
              ? [{ modality, reason: matched.find((m) => m.modality_slug === slug)?.reasoning ?? null }]
              : [];
          }),
          canReturn: returning.flatMap((slug) => modalityBySlug(slug) ?? []),
          memory: memory?.map(({ category, content }) => ({ category, content })) ?? null,
          fastingBarred:
            vulnerable || hasFoodOrWeightSignal({ texts: [], topics: base.synthesis.inferred_topics }),
        },
      };
    },

    check: (review, input) => {
      const b = built(input);
      if (review.no_change) return null;

      const removed = new Set<string>();
      for (const { ref } of review.remove) {
        const practice = practiceByRef(b.practices, ref);
        if (!practice) return `remove names ${ref}, which was not sent`;
        removed.add(practice.id);
      }
      const total = b.practices.length - removed.size + review.add.length;
      if (total < 3 || total > 5) return `the routine would have ${total} practices`;

      const restored = review.restore?.slug ?? null;
      if (restored && !b.canReturn.some((m) => m.slug === restored)) return `restore names ${restored}, which may not return`;
      const allowed = new Set([...b.kept.map((k) => k.modality.slug), ...(restored ? [restored] : [])]);
      for (const practice of review.add) {
        const slug = practice.connects_to.modality_slug;
        if (slug !== null && !allowed.has(slug)) return `a practice connects to ${slug}, which is not kept`;
        if (!practice.connects_to.soul_map && slug === null) return 'a practice that connects to nothing';
      }

      const risk = lintPhysicalRisk(review.add, { fastingBarred: b.fastingBarred })[0];
      if (risk) return `${risk.rule} at ${risk.path}`;
      const copy = lintDeep({ summary: review.summary, remove: review.remove, add: review.add, restore: review.restore })[0];
      if (copy) return `${copy.rule} at ${copy.path}: "${copy.match}"`;
      return null;
    },

    store: async (review, input, { elevated, userId, promptVersion }) => {
      const b = built(input);
      const proposal = {
        summary: review.summary,
        remove: review.remove.map(({ ref, why }) => {
          const practice = practiceByRef(b.practices, ref)!;
          return { practice_id: practice.id, title: practice.title, why };
        }),
        add: review.add,
        restore: review.restore
          ? { ...review.restore, name: modalityBySlug(review.restore.slug)?.name_es ?? review.restore.slug }
          : null,
      };
      const { data, error } = await elevated
        .from('routine_change_proposals')
        .insert({
          user_id: userId,
          match_id: b.matchId,
          trigger: b.trigger,
          proposal,
          status: review.no_change ? 'no_change' : 'pending',
          prompt_version: promptVersion,
        })
        .select('id')
        .single();
      if (error) console.error('routine_review_store_failed', error.code);
      return (data?.id as string | undefined) ?? null;
    },
  }),
);
