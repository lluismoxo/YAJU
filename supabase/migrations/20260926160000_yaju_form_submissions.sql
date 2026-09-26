-- Yaju: formularios de programas (Labs, partners, informe) y origen de los contactos de ventas.

-- contact_requests recibe dos formularios con los mismos campos: ventas y acceso anticipado (EAP)
alter table public.contact_requests
  add column form text not null default 'contact_sales'
  check (form in ('contact_sales', 'early_access'));

-- Resto de formularios: campos distintos en cada uno, se guardan en "fields" (jsonb).
-- Los datos de contacto comunes van tambien en columnas para poder buscar y filtrar.
create table public.form_submissions (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),

  form                text not null check (form in (
                        'report_download', 'labs_newsletter', 'labs_research_grant',
                        'labs_open_science', 'partner_application')),

  email               text check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  first_name          text check (first_name is null or char_length(first_name) <= 100),
  last_name           text check (last_name is null or char_length(last_name) <= 100),
  company             text check (company is null or char_length(company) <= 200),
  country             text check (country is null or char_length(country) <= 100),
  marketing_opt_in    boolean not null default false,

  -- todas las respuestas del formulario (nombre del campo -> valor) y su etiqueta visible
  fields              jsonb not null default '{}'::jsonb check (jsonb_typeof(fields) = 'object' and pg_column_size(fields) <= 65536),
  labels              jsonb not null default '{}'::jsonb check (jsonb_typeof(labels) = 'object' and pg_column_size(labels) <= 16384),

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

  -- seguimiento
  status              text not null default 'new' check (status in ('new', 'reviewing', 'accepted', 'rejected', 'spam')),

  -- aviso por email (Resend). La fila es la fuente de verdad aunque el aviso falle.
  notification_status text not null default 'pending' check (notification_status in ('pending', 'sent', 'failed')),
  notification_id     text,
  notification_error  text,
  notified_at         timestamptz
);

comment on table public.form_submissions is 'Formularios de programas de la web de Yaju (Labs, partners, informe). Solo escribe la Edge Function form-submit (service_role); sin acceso anon ni authenticated.';

create index form_submissions_created_at_idx on public.form_submissions (created_at desc);
create index form_submissions_form_idx on public.form_submissions (form, created_at desc);
create index form_submissions_ip_hash_idx on public.form_submissions (ip_hash, created_at desc);
create index form_submissions_email_idx on public.form_submissions (lower(email), created_at desc);

alter table public.form_submissions enable row level security;
revoke all on public.form_submissions from anon, authenticated;
