import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { pages } from "@/content/copy/pages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JURISDICTIONS = [
  "Malta",
  "UK",
  "Isle of Man",
  "Gibraltar",
  "Curaçao",
  "Kahnawake",
  "Ontario",
  "New Jersey",
  "Nevada",
  "Philippines",
  "Other",
] as const;

const ROLES = ["Operator executive", "Product", "Risk and compliance", "Engineering", "Investor", "Partner"] as const;

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  company: z.string().trim().min(2).max(160),
  jurisdiction: z.enum(JURISDICTIONS),
  role: z.enum(ROLES),
  message: z.string().trim().max(2000).optional().default(""),
  consent: z.literal(true),
  website: z.string().max(0).optional().default(""),
  variant: z.enum(["briefing", "sandbox"]).optional().default("briefing"),
});

type Briefing = z.infer<typeof schema>;

/* ---------------- in-memory rate limit: 5 requests / hour / IP ---------------- */
const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return false;
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function summary(d: Briefing): string {
  return [
    `Request type: ${d.variant}`,
    `Name: ${d.name}`,
    `Email: ${d.email}`,
    `Company: ${d.company}`,
    `Licence jurisdiction: ${d.jurisdiction}`,
    `Role: ${d.role}`,
    "",
    "Message:",
    d.message || "(none)",
  ].join("\n");
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // Honeypot: bots fill the hidden "website" field. Pretend success, do nothing.
  if (raw && typeof raw === "object" && "website" in raw) {
    const w = (raw as { website?: unknown }).website;
    if (typeof w === "string" && w.trim().length > 0) {
      return NextResponse.json({ ok: true });
    }
  }

  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid", issues: parsed.error.issues.map((i) => i.path.join(".")) },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.BRIEFING_TO_EMAIL;
  const from = process.env.BRIEFING_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    console.info("[briefing] Email not configured; logging request instead.\n" + summary(data));
    return NextResponse.json({ ok: true, dev: true });
  }

  const e = pages.contact.email;
  const resend = new Resend(apiKey);
  try {
    const notify = await resend.emails.send({
      from,
      to,
      replyTo: data.email,
      subject: `${data.variant === "sandbox" ? e.notifySubjectSandbox : e.notifySubject}: ${data.company} (${data.jurisdiction})`,
      text: summary(data),
    });
    if (notify.error) throw new Error(notify.error.message);

    // Auto-reply failure should not fail the request.
    const reply = await resend.emails.send({
      from,
      to: data.email,
      subject: e.autoReplySubject,
      text: `${data.name},\n\n${e.autoReplyBody}`,
    });
    if (reply.error) console.warn("[briefing] auto-reply failed:", reply.error.message);
  } catch (err) {
    console.error("[briefing] send failed:", err);
    return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
