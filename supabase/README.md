# Backend del formulario de ventas

Flujo: formulario de la web → Edge Function `contact-sales` → tabla `contact_requests` → aviso por email con Resend.

- `migrations/20260926141846_yaju_contact_requests.sql`: tabla `public.contact_requests` (RLS sin acceso anon/authenticated) y `public.get_contact_config()`, que lee la configuración de Vault y solo puede ejecutar `service_role`.
- `functions/contact-sales/index.ts`: valida, guarda primero en la base de datos y después envía el email. Si Resend falla, el contacto queda guardado con `notification_status = 'failed'` y el error en `notification_error`.
- El formulario llama a la función desde `_next/static/immutable/chunks/2eggh75oapf3e.js` (solo el formulario de ventas, id 1013).

## Secretos (Supabase Vault, nunca en el repositorio)

| Nombre | Uso |
|---|---|
| `resend_api_key` | Clave de la API de Resend |
| `contact_notify_to` | Destinatario del aviso |
| `contact_mail_from` | Remitente (dominio verificado en Resend) |
| `contact_allowed_origins` | Orígenes permitidos (CORS), separados por comas |
| `contact_ip_salt` | Sal para guardar la IP como hash |

Cambiar un valor: `select vault.update_secret((select id from vault.secrets where name = '<nombre>'), '<valor>');`. La función lo recoge en un minuto como mucho.

Desplegar la función: `supabase functions deploy contact-sales --no-verify-jwt`.
