// Edge Function: form-submit (Yaju)
//
// Formularios de programas de la web (Labs, partners, informe) -> esta funcion ->
// Supabase (guardar en public.form_submissions) -> Resend (avisar).
//
// Cada formulario tiene campos distintos: se guardan todos en "fields" (jsonb) con su
// etiqueta visible en "labels", y los datos de contacto comunes tambien en columnas.
// Igual que contact-sales: se guarda primero (la base de datos es la fuente de verdad),
// la configuracion y la clave de Resend salen de Vault y hay limite de envios.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const DEFAULT_ORIGINS = ["http://localhost:8080", "https://yajuas.com", "https://www.yajuas.com"];
const MAX_POR_IP = 5;        // envios por IP ...
const VENTANA_IP_MIN = 15;   // ... en estos minutos
const MAX_POR_EMAIL = 3;     // envios por email ...
const VENTANA_EMAIL_MIN = 60;

// formulario -> nombre en el aviso y campos obligatorios (nombres de campo de Marketo)
const FORMS: Record<string, { nombre: string; obligatorios: string[] }> = {
  report_download: {
    nombre: "Descarga del informe State of Sovereign AI",
    obligatorios: ["FirstName", "LastName", "Email", "Country", "No_of_Employees_Range__c"],
  },
  labs_newsletter: { nombre: "Newsletter de Yaju Labs", obligatorios: ["Email"] },
  labs_research_grant: {
    nombre: "Solicitud de Research Grant (Yaju Labs)",
    obligatorios: ["FirstName", "LastName", "Company", "Country"],
  },
  labs_open_science: {
    nombre: "Solicitud Open Science Community (Yaju Labs)",
    obligatorios: ["FirstName", "LastName", "Email"],
  },
  partner_application: {
    nombre: "Solicitud del Partner Program",
    obligatorios: ["FirstName", "LastName", "Email", "Company", "Country"],
  },
};

// campos internos de Marketo o de seguimiento que no son respuestas
const IGNORADOS = /^(utm_.*|formid|munchkinId|webPageID|Recent_Engagement_Type__c|Preferred_Language__c|lpId|subId|lpurl|kw|cr|_mkt_trk|_mktoReferrer|HtmlText_.*|Platform_Preference__c|Products__c)$/i;
const CLAVE = /^[A-Za-z0-9_]{1,100}$/;
const MAX_CAMPOS = 60;

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

function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const h: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (origin && allowed.includes(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

function json(status: number, body: unknown, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

// ---- validacion
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function str(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}
function opcional(v: unknown, max: number): string | null {
  const s = str(v);
  return s ? s.slice(0, max) : null;
}
function valor(v: unknown): string {
  // conserva los saltos de linea de los textos largos
  if (typeof v === "string") return v.replace(/\r\n/g, "\n").trim().slice(0, 5000);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string" || typeof x === "number").join(", ").slice(0, 5000);
  return "";
}
function si(v: unknown): boolean {
  return v === true || v === 1 || ["true", "yes", "on", "1"].includes(String(v).toLowerCase());
}

function limpiar(b: Record<string, unknown>) {
  const fields: Record<string, string> = {};
  const labels: Record<string, string> = {};
  const entrada = b.fields && typeof b.fields === "object" && !Array.isArray(b.fields) ? b.fields as Record<string, unknown> : {};
  const etiquetas = b.labels && typeof b.labels === "object" && !Array.isArray(b.labels) ? b.labels as Record<string, unknown> : {};
  for (const [k, v] of Object.entries(entrada)) {
    if (Object.keys(fields).length >= MAX_CAMPOS) break;
    if (!CLAVE.test(k) || IGNORADOS.test(k)) continue;
    const s = valor(v);
    if (!s) continue;
    fields[k] = s;
    const l = str(etiquetas[k]).replace(/[*:]+$/, "").trim().slice(0, 300);
    if (l) labels[k] = l;
  }
  return { fields, labels };
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

// ---- email
function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function emailHtml(r: Record<string, unknown>): string {
  const form = FORMS[String(r.form)];
  const fields = (r.fields ?? {}) as Record<string, string>;
  const labels = (r.labels ?? {}) as Record<string, string>;
  const filas: [string, unknown][] = [
    ...Object.entries(fields).map(([k, v]) => [labels[k] || k, v] as [string, unknown]),
    ["Acepta comunicaciones", r.marketing_opt_in ? "Sí" : "No"],
    ["Página", r.source_page || "—"],
    ["UTM", [r.utm_source, r.utm_medium, r.utm_campaign].filter(Boolean).join(" · ") || "—"],
    ["Recibido", new Date(String(r.created_at)).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })],
    ["ID", r.id],
  ];
  const tr = filas.map(([k, v]) =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;color:#444;vertical-align:top;width:40%">${esc(k)}</td>` +
    `<td style="padding:8px 12px;border-bottom:1px solid #eee;color:#222">${esc(v).replace(/\n/g, "<br>")}</td></tr>`).join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto">
  <h2 style="color:#111;border-bottom:2px solid #1f8a6a;padding-bottom:8px">${esc(form?.nombre ?? r.form)}</h2>
  <p style="color:#555">Alguien ha rellenado este formulario en la web de Yaju.${r.email ? " Puedes responder directamente a este email." : ""}</p>
  <table style="border-collapse:collapse;width:100%;background:#fafafa;border:1px solid #eee">${tr}</table>
  <p style="color:#999;font-size:12px;margin-top:16px">Guardado en Supabase (tabla form_submissions) · aviso enviado con Resend.</p>
</div>`;
}

async function enviarAviso(cfg: Config, r: Record<string, unknown>): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const key = cfg.resend_api_key || Deno.env.get("RESEND_API_KEY");
  if (!key) return { ok: false, error: "resend_api_key no configurada" };
  const quien = [r.first_name, r.last_name].filter(Boolean).join(" ") || String(r.email ?? "");
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
        ...(r.email ? { reply_to: r.email } : {}),
        subject: `${FORMS[String(r.form)]?.nombre ?? r.form}${quien ? `: ${quien}` : ""}`,
        html: emailHtml(r),
      }),
    });
    const body = await res.text();
    if (!res.ok) return { ok: false, error: `resend ${res.status}: ${body.slice(0, 400)}` };
    let id = "";
    try { id = JSON.parse(body).id ?? ""; } catch { /* sin id */ }
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: `resend: ${String(e).slice(0, 400)}` };
  } finally {
    clearTimeout(t);
  }
}

// ---- entrada
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  let cfg: Config = {};
  try { cfg = await getConfig(); } catch (e) { console.error(String(e)); }
  const allowed = (cfg.contact_allowed_origins || DEFAULT_ORIGINS.join(",")).split(",").map((s) => s.trim()).filter(Boolean);
  const cors = corsHeaders(origin, allowed);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" }, cors);
  if (origin && !allowed.includes(origin)) return json(403, { ok: false, error: "origin_not_allowed" }, cors);

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 60_000) return json(413, { ok: false, error: "too_large" }, cors);
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("no object");
  } catch {
    return json(400, { ok: false, error: "invalid_json" }, cors);
  }

  // campo trampa: los humanos no lo ven; si viene relleno, es un robot
  if (str(body.hp)) return json(200, { ok: true }, cors);

  const formKey = str(body.form);
  const form = FORMS[formKey];
  if (!form) return json(400, { ok: false, error: "unknown_form" }, cors);

  // validacion
  const { fields, labels } = limpiar(body);
  const errores: Record<string, string> = {};
  for (const k of form.obligatorios) if (!fields[k]) errores[k] = "required";
  const email = (fields.Email ?? "").toLowerCase();
  if (email && (email.length > 254 || !EMAIL_RE.test(email))) errores.Email = "invalid";
  const corto: [string, number][] = [["FirstName", 100], ["LastName", 100], ["Company", 200], ["Country", 100]];
  for (const [k, max] of corto) if ((fields[k] ?? "").length > max) errores[k] = `max_${max}`;
  if (Object.keys(errores).length) return json(400, { ok: false, error: "validation", fields: errores }, cors);
  if (email) fields.Email = email;

  // limite de envios
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "";
  const ip_hash = ip ? await sha256(`${cfg.contact_ip_salt || ""}:${ip}`) : null;
  const desde = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
  if (ip_hash) {
    const { count } = await db.from("form_submissions").select("id", { count: "exact", head: true })
      .eq("ip_hash", ip_hash).gte("created_at", desde(VENTANA_IP_MIN));
    if ((count ?? 0) >= MAX_POR_IP) return json(429, { ok: false, error: "rate_limited" }, cors);
  }
  if (email) {
    const { count } = await db.from("form_submissions").select("id", { count: "exact", head: true })
      .eq("email", email).eq("form", formKey).gte("created_at", desde(VENTANA_EMAIL_MIN));
    if ((count ?? 0) >= MAX_POR_EMAIL) return json(429, { ok: false, error: "rate_limited" }, cors);
  }

  // 1. guardar (fuente de verdad)
  const fila = {
    form: formKey,
    email: email || null,
    first_name: fields.FirstName ?? null,
    last_name: fields.LastName ?? null,
    company: fields.Company ?? null,
    country: fields.Country ?? null,
    marketing_opt_in: si(fields.emailOptIn) || si(fields.mkto_labs_opted_in),
    fields,
    labels,
    source_page: opcional(body.source_page, 500),
    source_url: opcional(body.source_url, 2000),
    referrer: opcional(body.referrer, 2000),
    utm_source: opcional(body.utm_source, 200),
    utm_medium: opcional(body.utm_medium, 200),
    utm_campaign: opcional(body.utm_campaign, 200),
    utm_term: opcional(body.utm_term, 200),
    utm_content: opcional(body.utm_content, 200),
    user_agent: opcional(req.headers.get("user-agent"), 500),
    ip_hash,
  };
  const { data: guardado, error: errGuardar } = await db.from("form_submissions").insert(fila).select().single();
  if (errGuardar || !guardado) {
    console.error("guardar formulario:", errGuardar?.message);
    return json(500, { ok: false, error: "save_failed" }, cors);
  }

  // 2. avisar por email; si falla, el envio ya esta guardado
  const aviso = await enviarAviso(cfg, guardado);
  const { error: errAviso } = await db.from("form_submissions").update(
    aviso.ok
      ? { notification_status: "sent", notification_id: aviso.id || null, notification_error: null, notified_at: new Date().toISOString() }
      : { notification_status: "failed", notification_error: aviso.error },
  ).eq("id", guardado.id);
  if (!aviso.ok) console.error("aviso por email:", aviso.error);
  if (errAviso) console.error("marcar aviso:", errAviso.message);

  return json(201, { ok: true, id: guardado.id }, cors);
});
