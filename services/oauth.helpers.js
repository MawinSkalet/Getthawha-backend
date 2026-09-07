export function safeReturnPath(value) {
  return typeof value === "string" && /^\/(booking|profile)(\?|$)/.test(value) && !/[\\\r\n]/.test(value) ? value : "/booking";
}
export function frontendUrl(path) {
  const base = process.env.FRONTEND_ORIGIN || process.env.REDIRECT_URI_AFTER_LOGIN || "http://localhost:3000";
  return new URL(path, new URL(base).origin).toString();
}
export function authCookieOptions() {
  return {httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV === "production",path:"/",...(process.env.COOKIE_DOMAIN ? {domain:process.env.COOKIE_DOMAIN}: {})};
}
export function loginFailure(res,reason,next) {
  const url = new URL(frontendUrl("/login"));
  url.searchParams.set("error",reason);url.searchParams.set("next",safeReturnPath(next));
  return res.redirect(url.toString());
}
