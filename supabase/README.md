# Backend de los formularios de la web

Flujo: formulario de la web → Edge Function → tabla en Supabase → aviso por email con Resend.

| Formulario (id Marketo) | Páginas | Función | Tabla (`form`) |
|---|---|---|---|
| Contact Sales (1013) | contact-sales, pricing, soluciones… | `contact-sales` | `contact_requests` (`contact_sales`) |
| Acceso anticipado (1152) | credential-vault, mcp-gateway | `contact-sales` | `contact_requests` (`early_access`) |
| Informe (1141) | reports/state-of-sovereign-ai-adoption-2026 | `form-submit` | `form_submissions` (`report_download`) |
| Newsletter Labs (1080) | labs/newsletter | `form-submit` | `form_submissions` (`labs_newsletter`) |
| Research Grant (1079) | labs/catalyst-grants/application | `form-submit` | `form_submissions` (`labs_research_grant`) |
| Open Science (1097) | labs/open-development/application | `form-submit` | `form_submissions` (`labs_open_science`) |
| Partner Program (1393) | partners/application | `form-submit` | `form_submissions` (`partner_application`) |

- `migrations/20260926141846_yaju_contact_requests.sql`: tabla `public.contact_requests` (RLS sin acceso anon/authenticated) y `public.get_contact_config()`, que lee la configuración de Vault y solo puede ejecutar `service_role`.
- `migrations/20260926160000_yaju_form_submissions.sql`: columna `form` en `contact_requests` y tabla `public.form_submissions` (todas las respuestas en `fields`, con su etiqueta en `labels`).
- `functions/contact-sales/index.ts`: valida, guarda primero en la base de datos y después envía el email. Si Resend falla, el contacto queda guardado con `notification_status = 'failed'` y el error en `notification_error`.
- `functions/form-submit/index.ts`: lo mismo para los formularios de programas.
- El formulario llama a la función desde `_next/static/immutable/chunks/2eggh75oapf3e.js` (también cambia los textos y enlaces de Cohere que traen los formularios de Marketo).

## Secretos (Supabase Vault, nunca en el repositorio)

| Nombre | Uso |
|---|---|
| `resend_api_key` | Clave de la API de Resend |
| `contact_notify_to` | Destinatario del aviso |
| `contact_mail_from` | Remitente (dominio verificado en Resend) |
| `contact_allowed_origins` | Orígenes permitidos (CORS), separados por comas |
| `contact_ip_salt` | Sal para guardar la IP como hash |

Cambiar un valor: `select vault.update_secret((select id from vault.secrets where name = '<nombre>'), '<valor>');`. La función lo recoge en un minuto como mucho.

Desplegar: `supabase functions deploy contact-sales --no-verify-jwt` y `supabase functions deploy form-submit --no-verify-jwt`.
