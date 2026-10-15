-- v1.2 P-01: only the server decides who is premium.
--
-- "own subscription" was `for all`, so anybody holding the publishable key
-- could upsert `status = 'active'` on their own row, and the chat function
-- reads that row (with the service role) to raise the question limit. The
-- browser now only reads it.
--
-- Activation is manual at first (P-01: compare the payer's email with the
-- account's) and later the payment webhook's job; both run as the service
-- role or the database owner, never as the person.

drop policy "own subscription" on public.subscriptions;

create policy "own subscription is readable"
  on public.subscriptions for select to authenticated
  using (auth.uid() = user_id);

-- Denied at the grant layer too, so no later policy can reopen the write by
-- accident: authenticated is simply never given the verb.
revoke insert, update, delete on public.subscriptions from authenticated;

grant insert, update on public.subscriptions to service_role;
