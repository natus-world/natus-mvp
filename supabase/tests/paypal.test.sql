-- Natus — subscriptions kept by PayPal's notifications (v1.2 P-01).
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

create or replace function pg_temp.act_as(uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$ language plpgsql;

insert into auth.users (id, instance_id, aud, role, email)
values ('aaaaaaaa-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'alice@example.test');

insert into public.subscriptions (user_id, status, activated_at, provider, provider_subscription_id, ends_at)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'active', now(), 'paypal', 'I-1', now() + interval '10 days');
select is(public.plan_tier('aaaaaaaa-0000-4000-8000-000000000001'), 'premium',
  'A cancelled subscription is premium until what was paid runs out');

update public.subscriptions set ends_at = now() - interval '1 minute' where user_id = 'aaaaaaaa-0000-4000-8000-000000000001';
select is(public.plan_tier('aaaaaaaa-0000-4000-8000-000000000001'), 'free',
  'and free after it');

insert into public.payment_events (id, event_type, user_id)
values ('WH-1', 'BILLING.SUBSCRIPTION.ACTIVATED', 'aaaaaaaa-0000-4000-8000-000000000001');
select throws_ok(
  $$insert into public.payment_events (id, event_type) values ('WH-1', 'BILLING.SUBSCRIPTION.ACTIVATED')$$,
  '23505', null,
  'An event is recorded once, so a retry changes nothing'
);

select pg_temp.act_as('aaaaaaaa-0000-4000-8000-000000000001');
select throws_ok(
  $$select count(*) from public.payment_events$$,
  '42501', null,
  'Nobody reads the payment events through the API'
);
select throws_ok(
  $$update public.subscriptions set ends_at = null where user_id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  '42501', null,
  'Alice cannot undo the end of her own subscription'
);

select * from finish();
rollback;
