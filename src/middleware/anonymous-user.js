import crypto from "node:crypto";

export const ANONYMOUS_USER_COOKIE = "moodflow_user";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseCookies(header) {
  if (!header) {
    return {};
  }

  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf("=");
        if (separatorIndex === -1) {
          return [part, ""];
        }

        const name = part.slice(0, separatorIndex);
        const value = part.slice(separatorIndex + 1);
        try {
          return [name, decodeURIComponent(value)];
        } catch {
          return [name, ""];
        }
      })
  );
}

function cookieOptions() {
  return [
    `Max-Age=${ONE_YEAR_SECONDS}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    process.env.NODE_ENV === "production" ? "Secure" : null
  ].filter(Boolean);
}

export function isValidAnonymousUserId(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function anonymousUserMiddleware(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  const existingUserId = cookies[ANONYMOUS_USER_COOKIE];

  if (isValidAnonymousUserId(existingUserId)) {
    req.userId = existingUserId;
    next();
    return;
  }

  const userId = crypto.randomUUID();
  req.userId = userId;
  res.setHeader(
    "Set-Cookie",
    `${ANONYMOUS_USER_COOKIE}=${encodeURIComponent(userId)}; ${cookieOptions().join("; ")}`
  );
  next();
}
