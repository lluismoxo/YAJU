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
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const DEFAULT_ORIGINS = ["http://localhost:8080", "https://yajuas.com", "https://www.yajuas.com"];
const MAX_POR_IP = 5;        // envios por IP ...
const VENTANA_IP_MIN = 15;   // ... en estos minutos
const MAX_POR_EMAIL = 3;     // envios por email ...
const VENTANA_EMAIL_MIN = 60;

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
  const filas: [string, unknown][] = [
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
  <h2 style="color:#111;border-bottom:2px solid #1f8a6a;padding-bottom:8px">Nuevo contacto de ventas en Yaju</h2>
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
        subject: `Nuevo contacto de ventas: ${r.first_name} ${r.last_name} — ${r.job_title}`,
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
    if (raw.length > 20_000) return json(413, { ok: false, error: "too_large" }, cors);
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("no object");
  } catch {
    return json(400, { ok: false, error: "invalid_json" }, cors);
  }

  // campo trampa: los humanos no lo ven; si viene relleno, es un robot
  if (str(body.website)) return json(200, { ok: true }, cors);

  const v = validar(body);
  if (!v.ok) return json(400, { ok: false, error: "validation", fields: v.fields }, cors);

  // limite de envios
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "";
  const ip_hash = ip ? await sha256(`${cfg.contact_ip_salt || ""}:${ip}`) : null;
  const desde = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
  if (ip_hash) {
    const { count } = await db.from("contact_requests").select("id", { count: "exact", head: true })
      .eq("ip_hash", ip_hash).gte("created_at", desde(VENTANA_IP_MIN));
    if ((count ?? 0) >= MAX_POR_IP) return json(429, { ok: false, error: "rate_limited" }, cors);
  }
  {
    const { count } = await db.from("contact_requests").select("id", { count: "exact", head: true })
      .eq("email", v.data.email).gte("created_at", desde(VENTANA_EMAIL_MIN));
    if ((count ?? 0) >= MAX_POR_EMAIL) return json(429, { ok: false, error: "rate_limited" }, cors);
  }

  // 1. guardar (fuente de verdad)
  const fila = {
    ...v.data,
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
  const { data: guardado, error: errGuardar } = await db.from("contact_requests").insert(fila).select().single();
  if (errGuardar || !guardado) {
    console.error("guardar contacto:", errGuardar?.message);
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
  if (errAviso) console.error("marcar aviso:", errAviso.message);

  return json(201, { ok: true, id: guardado.id }, cors);
});
