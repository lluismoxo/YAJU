-- Yaju: formulario de contacto de ventas.

create table public.contact_requests (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),

  -- campos del formulario
  first_name          text not null check (char_length(first_name) between 1 and 100),
  last_name           text not null check (char_length(last_name) between 1 and 100),
  email               text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  job_title           text not null check (char_length(job_title) between 1 and 150),
  country             text not null check (char_length(country) between 1 and 100),
  phone               text check (phone is null or char_length(phone) <= 40),
  company_size        text not null check (char_length(company_size) between 1 and 60),
  use_case            text not null check (char_length(use_case) between 1 and 5000),
  marketing_opt_in    boolean not null default false,

  -- contexto del envio
  source_page         text check (source_page is null or char_length(source_page) <= 500),
  source_url          text check (source_url is null or char_length(source_url) <= 2000),
  referrer            text check (referrer is null or char_length(referrer) <= 2000),
  utm_source          text check (utm_source is null or char_length(utm_source) <= 200),
  utm_medium          text check (utm_medium is null or char_length(utm_medium) <= 200),
  utm_campaign        text check (utm_campaign is null or char_length(utm_campaign) <= 200),
  utm_term            text check (utm_term is null or char_length(utm_term) <= 200),
  utm_content         text check (utm_content is null or char_length(utm_content) <= 200),
  user_agent          text check (user_agent is null or char_length(user_agent) <= 500),
  ip_hash             text,

  -- seguimiento comercial
  status              text not null default 'new' check (status in ('new','contacted','qualified','closed','spam')),

  -- aviso por email (Resend). La fila es la fuente de verdad aunque el aviso falle.
  notification_status text not null default 'pending' check (notification_status in ('pending','sent','failed')),
  notification_id     text,
  notification_error  text,
  notified_at         timestamptz
);

comment on table public.contact_requests is 'Contactos de ventas de la web de Yaju. Solo escribe la Edge Function contact-sales (service_role); sin acceso anon ni authenticated.';

create index contact_requests_created_at_idx on public.contact_requests (created_at desc);
create index contact_requests_ip_hash_idx on public.contact_requests (ip_hash, created_at desc);
create index contact_requests_email_idx on public.contact_requests (lower(email), created_at desc);

alter table public.contact_requests enable row level security;
revoke all on public.contact_requests from anon, authenticated;

-- Configuracion del backend desde Vault (la clave de Resend nunca llega al navegador)
create or replace function public.get_contact_config()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(name, decrypted_secret), '{}'::jsonb)
  from vault.decrypted_secrets
  where name in ('resend_api_key', 'contact_notify_to', 'contact_mail_from', 'contact_allowed_origins', 'contact_ip_salt');
$$;
revoke all on function public.get_contact_config() from public, anon, authenticated;
grant execute on function public.get_contact_config() to service_role;
