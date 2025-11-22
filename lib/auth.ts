const COOKIE_PREFIX = "room_auth_";

export function getAuthCookieName(slug: string) {
  return `${COOKIE_PREFIX}${slug}`;
}

function getSecret() {
  // Keep a stable server-side secret; avoid leaking to client
  const secret =
    process.env.STACK_SECRET_SERVER_KEY ||
    process.env.POSTGRES_PASSWORD ||
    "fallback-secret";
  return secret;
}

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualStr(a: string, b: string) {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) {
    res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return res === 0;
}

async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return toHex(digest);
}

async function hmacSHA256(keyString: string, data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(keyString),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return toHex(sig);
}

// Portable password hash to avoid bcrypt runtime issues in Next.js
export async function hashPassword(password: string) {
  const secret = getSecret();
  return sha256(`${password}|${secret}`);
}

// token binds to current room slug + password_hash (or "public")
export async function signRoomToken(params: {
  slug: string;
  password_hash: string | null;
}) {
  const secret = getSecret();
  const payload = `${params.slug}|${params.password_hash ?? "public"}`;
  return hmacSHA256(secret, payload);
}

export async function verifyRoomToken(params: {
  slug: string;
  password_hash: string | null;
  token: string | undefined;
}) {
  if (!params.token) return false;
  const expected = await signRoomToken({
    slug: params.slug,
    password_hash: params.password_hash,
  });
  return timingSafeEqualStr(expected, params.token);
}
