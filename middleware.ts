import { NextResponse, type NextRequest } from "next/server";

export function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  const isDev = process.env.NODE_ENV !== "production";
  const feed = process.env.NEXT_PUBLIC_FEED_URL ? ` ${process.env.NEXT_PUBLIC_FEED_URL}` : "";
  // Vercel preview deployments inject the vercel.live feedback toolbar; production stays strict.
  const preview = process.env.VERCEL_ENV === "preview";
  const live = preview ? " https://vercel.live" : "";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' blob:${isDev ? " 'unsafe-eval'" : ""} https://plausible.io${live}`,
    `style-src 'self' 'unsafe-inline'${live}`,
    `img-src 'self' data: blob:${live}${preview ? " https://vercel.com" : ""}`,
    `font-src 'self' data:${live}${preview ? " https://assets.vercel.com" : ""}`,
    `connect-src 'self' blob: data: https://plausible.io https://unpkg.com https://cdn.jsdelivr.net${isDev ? " ws: wss:" : ""}${feed}${preview ? " https://vercel.live wss://ws-us3.pusher.com" : ""}`,
    ...(preview ? ["frame-src https://vercel.live"] : []),
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), accelerometer=(self), gyroscope=(self)");
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|posters|models|textures).*)"] };
