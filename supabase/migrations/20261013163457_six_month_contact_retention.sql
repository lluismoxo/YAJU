-- User-approved retention: six months for inactive pending/spam submissions.
alter table public.contact_requests add column last_activity_at timestamptz;
update public.contact_requests set last_activity_at=created_at;
alter table public.contact_requests alter column last_activity_at set default now(), alter column last_activity_at set not null;
alter table public.form_submissions add column last_activity_at timestamptz;
update public.form_submissions set last_activity_at=created_at;
alter table public.form_submissions alter column last_activity_at set default now(), alter column last_activity_at set not null;

create function private.track_contact_activity() returns trigger language plpgsql set search_path='' as $$
begin
 if new.status is distinct from old.status then new.last_activity_at=now(); end if;
 return new;
end $$;
revoke all on function private.track_contact_activity() from public, anon, authenticated;
create trigger contact_activity before update on public.contact_requests for each row execute function private.track_contact_activity();
create trigger form_activity before update on public.form_submissions for each row execute function private.track_contact_activity();
create index contact_requests_retention_idx on public.contact_requests(last_activity_at) where status in ('new','spam');
create index form_submissions_retention_idx on public.form_submissions(last_activity_at) where status in ('new','spam');

create function private.purge_stale_forms() returns jsonb language plpgsql security definer set search_path='' as $$
declare contacts integer; programs integer;
begin
 delete from public.contact_requests where status in ('new','spam') and last_activity_at<now()-interval '6 months';
 get diagnostics contacts=row_count;
 delete from public.form_submissions where status in ('new','spam') and last_activity_at<now()-interval '6 months';
 get diagnostics programs=row_count;
 delete from private.form_rate_limits where updated_at<now()-interval '24 hours';
 return jsonb_build_object('contacts_deleted',contacts,'programs_deleted',programs);
end $$;
revoke all on function private.purge_stale_forms() from public, anon, authenticated;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('yaju-six-month-contact-retention','15 3 * * *','select private.purge_stale_forms();');
