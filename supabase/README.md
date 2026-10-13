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
- El controlador nativo `src/client/forms.js` llama a las funciones; el build genera sus versiones traducidas.

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


## Controles de seguridad (octubre de 2026)

- POST JSON con origen HTTPS permitido, cuerpo limitado durante la lectura y errores genéricos sin caché.
- Las dos confirmaciones obligatorias llegan como booleanos y se validan en el servidor. Las nuevas filas guardan versión y fecha de aceptación; los registros históricos no se convierten artificialmente en consentidos.
- Campos conocidos y valores de select validados contra `_shared/field-rules.ts`. Mantener este archivo sincronizado cuando cambien los siete formularios.
- Reserva atómica compartida entre ambos endpoints: cinco envíos por IP/15 minutos y tres por email/hora. Fallos de la configuración o del limitador bloquean el envío. Los contadores contienen hashes con sal y se eliminan después de 24 horas.
- El origen y el límite no sustituyen un CAPTCHA ni el control de tráfico en el gateway. La identidad de IP depende de las cabeceras del proxy de confianza; el límite por email es independiente.
- No se guardan queries/fragments de URL de origen o referencia; solo se mantienen los UTM explícitos ya existentes. Los errores de proveedor ya no guardan cuerpos de respuestas potencialmente sensibles.
- SDK fijado a 2.117.3. Las pruebas de seguridad usan proveedores simulados y no envían correos.

## Retención aprobada: seis meses

El job `yaju-six-month-contact-retention` se ejecuta cada día a las 03:15 UTC.
Elimina solo filas `new` o `spam` sin actividad durante seis meses en ambas tablas.
Los cambios de estado actualizan `last_activity_at`; para registrar otro contacto comercial
se puede actualizar expresamente esa fecha. No se eliminan filas en seguimiento (`contacted`,
`qualified`, `reviewing`, etc.). Los datos históricos parten de `created_at` porque no había
un registro anterior de actividad. Los backups y buzones de correo se gestionan aparte.

Consultar la ejecución sin extraer datos personales:

```sql
select jobname, schedule, active from cron.job
where jobname = 'yaju-six-month-contact-retention';
```

Para una solicitud de supresión, identificar el registro por email desde una sesión
administrativa autorizada, revisar obligaciones de conservación y eliminarlo de ambas
tablas y de los buzones/proveedores correspondientes. No existe endpoint público de lectura,
exportación ni borrado. No dar acceso `anon` o `authenticated` a estas tablas para resolver
avisos informativos de RLS sin políticas: ese bloqueo es intencionado.
