export function googleConfigErrors(env = process.env) {
  const errors = [];
  for (const key of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI", "JWT_SECRET"]) {
    if (!env[key]?.trim()) errors.push(key + " is missing");
  }
  const frontend = env.FRONTEND_ORIGIN || env.REDIRECT_URI_AFTER_LOGIN;
  if (!frontend) errors.push("FRONTEND_ORIGIN is missing");
  let callback, client;
  try { callback = new URL(env.GOOGLE_REDIRECT_URI); } catch { errors.push("GOOGLE_REDIRECT_URI must be an absolute URL"); }
  try { client = new URL(frontend); } catch { errors.push("FRONTEND_ORIGIN must be an absolute URL"); }
  for (const url of [callback,client].filter(Boolean)) {
    if (url.username || url.password || !["http:","https:"].includes(url.protocol)) errors.push("Invalid OAuth URL");
  }
  if (callback && (callback.pathname !== "/google/authorization" || callback.search || callback.hash)) errors.push("Callback must end in /google/authorization without query parameters");
  if (env.NODE_ENV === "production") {
    if ([callback,client].some(url => !url || url.protocol !== "https:" || ["localhost","127.0.0.1","[::1]"].includes(url.hostname))) errors.push("Production requires HTTPS and public hostnames");
    if ((env.JWT_SECRET || "").length < 32) errors.push("Production JWT_SECRET must contain at least 32 characters");
  }
  if (callback && client && callback.hostname !== client.hostname) {
    const domain = (env.COOKIE_DOMAIN || "").replace(/^\./, "");
    const matches = host => host === domain || host.endsWith("." + domain);
    if (!domain.includes(".") || !matches(callback.hostname) || !matches(client.hostname)) errors.push("COOKIE_DOMAIN must cover both frontend and API hosts");
  }
  if (callback?.hostname === "localhost" && env.COOKIE_DOMAIN) errors.push("Leave COOKIE_DOMAIN empty for localhost");
  return errors;
}
export function devLoginAllowed(env = process.env) {
  return env.NODE_ENV === "dev" || env.NODE_ENV === "development";
}
