// Edge Function: contact-sales (Yaju)
//
// Formulario de contacto de la web -> esta funcion -> Supabase (guardar) -> Resend (avisar).
//
// - Valida los datos en el servidor (el navegador no es de fiar).
// - Guarda primero el contacto en public.contact_requests: la base de datos es la fuente
//   de verdad. Si el aviso por email falla, el contacto sigue guardado y la fila queda
//   marcada con notification_status = 'failed' y el motivo.
// - La clave de Resend y el resto de la configuracion se leen de Supabase Vault con la
//   service_role (public.get_contact_config), nunca llegan al navegador.
// - Limite de envios por IP (guardada como hash con sal, no en claro) y por email.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

import {RequestError,json,corsHeaders,readBody,consent,safeUrl,safePath,controlCharacters,reserve} from "../_shared/security.ts";
import {fieldRules} from "../_shared/field-rules.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false }, global: { fetch: (url,options) => fetch(url,{...options,signal:AbortSignal.timeout(10000)}) } });

const DEFAULT_ORIGINS = ["https://yajuas.com", "https://www.yajuas.com"];


type Config = Record<string, string>;
let configCache: { at: number; value: Config } | null = null;

async function getConfig(): Promise<Config> {
  if (configCache && Date.now() - configCache.at < 60_000) return configCache.value;
  const { data, error } = await db.rpc("get_contact_config");
  if (error) throw new Error(`config: ${error.message}`);
  const value = (data ?? {}) as Config;
  configCache = { at: Date.now(), value };
  return value;
}

// ---- validacion
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^[0-9+()\-.\s]{5,40}$/;

function str(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}
function texto(v: unknown): string {
  // conserva los saltos de linea del mensaje, recorta espacios
  return typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : "";
}
function opcional(v: unknown, max: number): string | null {
  const s = str(v);
  return s ? s.slice(0, max) : null;
}

interface Contacto {
  first_name: string; last_name: string; email: string; job_title: string; country: string;
  phone: string | null; company_size: string; use_case: string; marketing_opt_in: boolean;
}

function validar(b: Record<string, unknown>): { ok: true; data: Contacto } | { ok: false; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  if (Object.values(b).some(controlCharacters)) fields.input="invalid";
  const rules=fieldRules[str(b.form)];
  if (!rules?.Country.values?.includes(str(b.country))) fields.country="invalid";
  if (!rules?.No_of_Employees_Range__c.values?.includes(str(b.company_size))) fields.company_size="invalid";
  const req = (key: string, v: string, max: number) => {
    if (!v) fields[key] = "required";
    else if (v.length > max) fields[key] = `max_${max}`;
  };
  const first_name = str(b.first_name), last_name = str(b.last_name), email = str(b.email).toLowerCase();
  const job_title = str(b.job_title), country = str(b.country), company_size = str(b.company_size);
  const use_case = texto(b.use_case);
  const phone = str(b.phone);
  req("first_name", first_name, 100);
  req("last_name", last_name, 100);
  req("email", email, 254);
  if (email && !fields.email && !EMAIL_RE.test(email)) fields.email = "invalid";
  req("job_title", job_title, 150);
  req("country", country, 100);
  req("company_size", company_size, 60);
  req("use_case", use_case, 5000);
  if (phone && !PHONE_RE.test(phone)) fields.phone = "invalid";
  if (Object.keys(fields).length) return { ok: false, fields };
  const optin = b.marketing_opt_in;
  return {
    ok: true,
    data: {
      first_name, last_name, email, job_title, country, company_size, use_case,
      phone: phone || null,
      marketing_opt_in: optin === true || optin === "true" || optin === "yes" || optin === "on" || optin === 1,
    },
  };
}


// formularios que llegan a esta funcion (misma estructura de campos)
const FORMS: Record<string, { asunto: string; titulo: string }> = {
  contact_sales: { asunto: "Nuevo contacto de ventas", titulo: "Nuevo contacto de ventas en Yaju" },
  early_access: { asunto: "Nueva solicitud de acceso anticipado", titulo: "Nueva solicitud de acceso anticipado en Yaju" },
};

// ---- email
function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function emailHtml(r: Record<string, unknown>): string {
  const filas: [string, unknown][] = [
    ["Formulario", r.form === "early_access" ? "Acceso anticipado (Credential Vault / MCP Gateway)" : "Contact Sales"],
    ["Nombre", `${r.first_name} ${r.last_name}`],
    ["Email", r.email],
    ["Cargo", r.job_title],
    ["País / región", r.country],
    ["Teléfono", r.phone || "—"],
    ["Tamaño de empresa", r.company_size],
    ["Cómo quiere usar la IA", r.use_case],
    ["Acepta emails de marketing", r.marketing_opt_in ? "Sí" : "No"],
    ["Página", r.source_page || "—"],
    ["UTM", [r.utm_source, r.utm_medium, r.utm_campaign].filter(Boolean).join(" · ") || "—"],
    ["Recibido", new Date(String(r.created_at)).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })],
    ["ID", r.id],
  ];
  const tr = filas.map(([k, v]) =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;color:#444;white-space:nowrap;vertical-align:top">${esc(k)}</td>` +
    `<td style="padding:8px 12px;border-bottom:1px solid #eee;color:#222">${esc(v).replace(/\n/g, "<br>")}</td></tr>`).join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto">
  <h2 style="color:#111;border-bottom:2px solid #1f8a6a;padding-bottom:8px">${esc((FORMS[String(r.form)] ?? FORMS.contact_sales).titulo)}</h2>
  <p style="color:#555">Alguien ha rellenado el formulario de contacto de la web. Puedes responder directamente a este email.</p>
  <table style="border-collapse:collapse;width:100%;background:#fafafa;border:1px solid #eee">${tr}</table>
  <p style="color:#999;font-size:12px;margin-top:16px">Guardado en Supabase (tabla contact_requests) · aviso enviado con Resend.</p>
</div>`;
}

async function enviarAviso(cfg: Config, r: Record<string, unknown>): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const key = cfg.resend_api_key || Deno.env.get("RESEND_API_KEY");
  if (!key) return { ok: false, error: "resend_api_key no configurada" };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: cfg.contact_mail_from || "Yaju Web <onboarding@resend.dev>",
        to: (cfg.contact_notify_to || "").split(",").map((s) => s.trim()).filter(Boolean),
        reply_to: r.email,
        subject: `${(FORMS[String(r.form)] ?? FORMS.contact_sales).asunto}: ${r.first_name} ${r.last_name} — ${r.job_title}`,
        html: emailHtml(r),
      }),
    });
    const body = await res.text();
    if (!res.ok) return { ok: false, error: `resend_http_${res.status}` };
    let id = "";
    try { id = JSON.parse(body).id ?? ""; } catch { /* sin id */ }
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: "resend_unavailable" };
  } finally {
    clearTimeout(t);
  }
}

// ---- entrada
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  let cors = corsHeaders(origin, DEFAULT_ORIGINS);
  if (req.method !== "POST" && req.method !== "OPTIONS") return json(405,{ok:false,error:"method_not_allowed"},cors);
  try {
  const cfg = await getConfig();
  const allowed = (cfg.contact_allowed_origins || DEFAULT_ORIGINS.join(",")).split(",").map(s=>s.trim()).filter(s=>s.startsWith("https://"));
  cors = corsHeaders(origin,allowed);
  if (!origin || !allowed.includes(origin)) return json(403,{ok:false,error:"origin_not_allowed"},cors);
  if (req.method === "OPTIONS") return new Response(null,{status:204,headers:cors});
  const body = await readBody(req,20000);
  // campo trampa: los humanos no lo ven; si viene relleno, es un robot
  if (str(body.website)) return json(200, { ok: true }, cors);

  const consentRecord = consent(body);
  if (!Object.hasOwn(FORMS,str(body.form))) return json(400,{ok:false,error:"unknown_form"},cors);
  const v = validar(body);
  if (!v.ok) return json(400, { ok: false, error: "validation", fields: v.fields }, cors);

  const ip_hash = await reserve(db,req,cfg,v.data.email);

  // 1. guardar (fuente de verdad)
  const fila = {
    ...consentRecord,
    ...v.data,
    form: FORMS[str(body.form)] ? str(body.form) : "contact_sales",
    source_page: safePath(body.source_page),
    source_url: safeUrl(body.source_url,true),
    referrer: safeUrl(body.referrer),
    utm_source: opcional(body.utm_source, 200),
    utm_medium: opcional(body.utm_medium, 200),
    utm_campaign: opcional(body.utm_campaign, 200),
    utm_term: opcional(body.utm_term, 200),
    utm_content: opcional(body.utm_content, 200),
    user_agent: opcional(req.headers.get("user-agent"), 500),
    ip_hash,
  };
  const { data: guardado, error: errGuardar } = await db.from("contact_requests").insert(fila).select().single();
  if (errGuardar || !guardado) {
    console.error("contact_save_failed");
    return json(500, { ok: false, error: "save_failed" }, cors);
  }

  // 2. avisar por email; si falla, el contacto ya esta guardado
  const aviso = await enviarAviso(cfg, guardado);
  const { error: errAviso } = await db.from("contact_requests").update(
    aviso.ok
      ? { notification_status: "sent", notification_id: aviso.id || null, notification_error: null, notified_at: new Date().toISOString() }
      : { notification_status: "failed", notification_error: aviso.error },
  ).eq("id", guardado.id);
  if (!aviso.ok) console.error("aviso por email:", aviso.error);
  if (errAviso) console.error("notification_status_update_failed");

  return json(201, { ok: true }, cors);
  } catch(error) {
    if(error instanceof RequestError) return json(error.status,{ok:false,error:error.code},cors);
    console.error("form_request_failed");
    return json(503,{ok:false,error:"temporarily_unavailable"},cors);
  }
});
