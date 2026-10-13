-- Add consent evidence without inventing consent for historical submissions.
alter table public.contact_requests
 add column age_confirmed boolean,
 add column privacy_accepted boolean,
 add column consent_version text,
 add column consent_recorded_at timestamptz;
alter table public.form_submissions
 add column age_confirmed boolean,
 add column privacy_accepted boolean,
 add column consent_version text,
 add column consent_recorded_at timestamptz;

-- Internal, pseudonymous sliding-window counters shared by both public forms.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.form_rate_limits (
 key text primary key check (key ~ '^(ip|email):[a-f0-9]{64}$'),
 attempts timestamptz[] not null default '{}',
 updated_at timestamptz not null default now()
);
alter table private.form_rate_limits enable row level security;
revoke all on private.form_rate_limits from public, anon, authenticated;
create index form_rate_limits_expiry_idx on private.form_rate_limits(updated_at);

create function public.reserve_form_submission(p_ip_hash text, p_email_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
 k text; keys text[] := '{}'; previous timestamptz[]; cutoff timestamptz;
 budget integer; instant timestamptz := clock_timestamp();
begin
 if p_ip_hash is not null then
  if p_ip_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid limiter key'; end if;
  keys := array_append(keys,'ip:'||p_ip_hash);
 end if;
 if p_email_hash is not null then
  if p_email_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid limiter key'; end if;
  keys := array_append(keys,'email:'||p_email_hash);
 end if;
 if cardinality(keys)=0 then return false; end if;
 -- Consistent lock order serializes concurrent requests, including new keys.
 for k in select unnest(keys) order by 1 loop
  perform pg_advisory_xact_lock(hashtextextended(k,0));
 end loop;
 for k in select unnest(keys) order by 1 loop
  cutoff:=instant-case when k like 'ip:%' then interval '15 minutes' else interval '60 minutes' end;
  budget:=case when k like 'ip:%' then 5 else 3 end;
  select array(select a from unnest(coalesce(r.attempts,'{}'::timestamptz[])) a where a>cutoff)
   into previous from private.form_rate_limits r where r.key=k;
  if coalesce(cardinality(previous),0)>=budget then return false; end if;
 end loop;
 for k in select unnest(keys) order by 1 loop
  cutoff:=instant-case when k like 'ip:%' then interval '15 minutes' else interval '60 minutes' end;
  insert into private.form_rate_limits as r(key,attempts,updated_at) values(k,array[instant],instant)
  on conflict(key) do update set attempts=array(select a from unnest(r.attempts) a where a>cutoff)||array[instant],updated_at=instant;
 end loop;
 -- Only obsolete limiter counters are removed, never contact or business data.
 delete from private.form_rate_limits where updated_at < instant-interval '24 hours';
 return true;
end $$;
revoke all on function public.reserve_form_submission(text,text) from public, anon, authenticated;
grant execute on function public.reserve_form_submission(text,text) to service_role;
