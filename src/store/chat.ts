import { read, write } from './db';
import { onlyMonthlySince } from './soulMap';
import { isSubscribed } from './subscription';
import type { ChatResponse } from '@/lib/schemas';
import { isChargeable, quotaState } from '@/lib/quota.ts';

/**
 * `conversations` and `messages` from PDR 5.6.
 *
 * The quota lives here rather than in the screen, because what counts as a
 * spent question is a product rule and not a rendering detail: a turn is
 * charged when it produced a usable answer. A failed call is not the person's
 * problem, and a crisis turn must never be — charging someone for being met
 * with a hotline would be the single worst line item this product could have.
 *
 * `clinical_basics` is not stored here and is never assembled into a message.
 * PDR 10.2 puts a derived risk level in the payload instead; the derivation
 * runs at call time from `lib/safety`, so nothing clinical is written into the
 * conversation history where a later turn could echo it back.
 */

export type MessageRole = 'user' | 'assistant';

export type StoredMessage = {
  id: string;
  conversation_id: string;
  role: MessageRole;
  /** Null on the person's own messages; the model's four types otherwise. */
  type: ChatResponse['type'] | null;
  text: string;
  linked_modality_slugs: string[];
  created_at: number;
  /** Whether this answer spent one of the free questions. */
  counted: boolean;
};

export type Conversation = {
  id: string;
  /** Which Soul Map the conversation is about, so a regenerated map starts a
   *  new thread rather than continuing one built on superseded text. */
  synthesis_id: string;
  created_at: number;
  /**
   * `carta`: the conversation of «Pregúntale a tu carta», the bubble on Carta
   * (owner, 22 Oct 2026). Kept apart from the Chat's; absent means the Chat.
   */
  kind?: 'chat' | 'carta';
};

/**
 * Re-exported, not defined. The Edge Function enforces this number and the
 * screen renders it; two copies would eventually disagree, and the person
 * would be shown a counter that is not the rule being applied to them.
 * `lib/quota.ts` is the single definition and it crosses to the server under
 * the parity test.
 */
export { FREE_QUESTIONS } from '@/lib/quota.ts';

function newId(prefix: string): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Math.trunc(performance.now())}`;
}

export function listConversations(): Conversation[] {
  return read<Conversation[]>('conversations', []);
}

export function listAllMessages(): StoredMessage[] {
  return read<StoredMessage[]>('messages', []);
}

export function listMessages(conversationId: string): StoredMessage[] {
  return listAllMessages().filter((m) => m.conversation_id === conversationId);
}

const kindOf = (c: Conversation): 'chat' | 'carta' => c.kind ?? 'chat';

/** The Chat's conversation about this map. */
export function conversationFor(synthesisId: string, now = Date.now()): Conversation {
  return conversationOf('chat', synthesisId, now);
}

/** The conversation of «Pregúntale a tu carta» about this map (owner, 22 Oct 2026). */
export function chartConversationFor(synthesisId: string, now = Date.now()): Conversation {
  return conversationOf('carta', synthesisId, now);
}

function conversationOf(kind: 'chat' | 'carta', synthesisId: string, now: number): Conversation {
  const mine = listConversations().filter((c) => kindOf(c) === kind);
  const existing = mine.find((c) => c.synthesis_id === synthesisId);
  if (existing) return existing;
  // v1.2 M-02: the monthly rewrite of the map continues the same conversation;
  // a rewrite for changed birth data starts a new one.
  const continued = [...mine]
    .sort((a, b) => b.created_at - a.created_at)
    .find((c) => onlyMonthlySince(c.synthesis_id, synthesisId));
  if (continued) return continued;

  const conversation: Conversation = {
    id: newId('conversation'),
    synthesis_id: synthesisId,
    created_at: now,
    ...(kind === 'carta' ? { kind } : {}),
  };
  write('conversations', [...listConversations(), conversation]);
  return conversation;
}

export function appendUserMessage(
  conversationId: string,
  text: string,
  now = Date.now(),
): StoredMessage {
  return append({
    id: newId('message'),
    conversation_id: conversationId,
    role: 'user',
    type: null,
    text,
    linked_modality_slugs: [],
    created_at: now,
    counted: false,
  });
}

export function appendAssistantMessage(
  conversationId: string,
  response: ChatResponse,
  now = Date.now(),
): StoredMessage {
  return append({
    id: newId('message'),
    conversation_id: conversationId,
    role: 'assistant',
    type: response.type,
    text: response.message_text,
    linked_modality_slugs: response.linked_modality_slugs,
    created_at: now,
    // A containment turn is not a product feature being consumed.
    counted: isChargeable(response.type),
  });
}

function append(message: StoredMessage): StoredMessage {
  write('messages', [...listAllMessages(), message]);
  return message;
}

/** Removes the person's message again when the call never produced an answer,
 *  so a failed turn leaves no half of an exchange behind. */
export function dropMessage(id: string): void {
  write(
    'messages',
    listAllMessages().filter((m) => m.id !== id),
  );
}

/** Counted across conversations: the quota belongs to the person, not to a
 *  thread they could restart to reset it. */
export function usedQuestions(): number {
  return listAllMessages().filter((m) => m.counted).length;
}

export function remainingQuestions(): number {
  return quotaState(usedQuestions(), isSubscribed()).remaining;
}

export function hasQuestionsLeft(): boolean {
  return remainingQuestions() > 0;
}
