import { supabase } from '@/supabase/client.ts';
import { read, write } from './db.ts';

/**
 * Friends inside Natus (v1.2 C-01), through the functions in
 * `20261015180000_friends.sql`. Nothing here writes a table: the database
 * checks who is calling, and the browser only asks.
 *
 * Asynchronous on purpose, unlike the rest of the store. A friend list is the
 * other person's state as much as this one's, so it is read when the screen
 * opens rather than mirrored at session start.
 */

export class FriendsUnavailable extends Error {}

export type Friend = { friendshipId: string; firstName: string; since: string | null };

export type InvitePreview =
  | { kind: 'invalid' }
  | { kind: 'own' }
  | { kind: 'already'; inviter: string }
  | { kind: 'open'; inviter: string };

function client() {
  if (!supabase) throw new FriendsUnavailable('There is no backend configured.');
  return supabase;
}

/** The link a person shares. Its path is `/amigos/<token>`. */
export function inviteUrl(token: string, origin = globalThis.location?.origin ?? ''): string {
  return new URL(`${import.meta.env.BASE_URL}amigos/${token}`, origin).toString();
}

export async function myInviteUrl(): Promise<string> {
  const { data, error } = await client().rpc('my_invite_token');
  if (error || typeof data !== 'string') throw new FriendsUnavailable(error?.message ?? 'no token');
  return inviteUrl(data);
}

export async function renewInviteUrl(): Promise<string> {
  const { data, error } = await client().rpc('renew_invite_token');
  if (error || typeof data !== 'string') throw new FriendsUnavailable(error?.message ?? 'no token');
  return inviteUrl(data);
}

export async function previewInvite(token: string): Promise<InvitePreview> {
  const { data, error } = await client().rpc('invite_preview', { p_token: token });
  if (error) throw new FriendsUnavailable(error.message);
  const row = data?.[0];
  if (!row || !row.valid) return { kind: 'invalid' };
  if (row.own_link) return { kind: 'own' };
  const inviter = row.inviter_first_name ?? '';
  return row.already_friends ? { kind: 'already', inviter } : { kind: 'open', inviter };
}

export async function acceptInvite(token: string): Promise<void> {
  const { error } = await client().rpc('accept_friend_invite', { p_token: token });
  if (error) throw new FriendsUnavailable(error.message);
  clearPendingInvite();
}

export async function listFriends(): Promise<Friend[]> {
  const { data, error } = await client().rpc('my_friends');
  if (error) throw new FriendsUnavailable(error.message);
  return (data ?? []).map((row) => ({
    friendshipId: row.friendship_id,
    firstName: row.first_name ?? '',
    since: row.since,
  }));
}

export async function endFriendship(friendshipId: string): Promise<void> {
  const { error } = await client().rpc('end_friendship', { p_friendship: friendshipId });
  if (error) throw new FriendsUnavailable(error.message);
}

/**
 * An invitation opened by somebody who has to sign up first. Google sends
 * them back to the application root, not to the link, so the token waits here
 * and Today offers it again once there is an account.
 */
export function pendingInvite(): string | null {
  return read<string | null>('pending_invite', null);
}

export function rememberPendingInvite(token: string): void {
  write('pending_invite', token);
}

export function clearPendingInvite(): void {
  write('pending_invite', null);
}
