const developmentOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3100",
  "http://localhost:3101",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:5173",
];

function normalizeOrigin(value, variableName) {
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`${variableName} must contain valid absolute URLs.`);
  }
}

export function getAllowedCorsOrigins(env = process.env) {
  const configuredOrigins = (env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => normalizeOrigin(origin, "CORS_ALLOWED_ORIGINS"));

  if (env.FRONTEND_ORIGIN) {
    configuredOrigins.push(normalizeOrigin(env.FRONTEND_ORIGIN, "FRONTEND_ORIGIN"));
  }

  const isDevelopment = ["dev", "development", "test"].includes(env.NODE_ENV);
  const allowedOrigins = new Set([
    ...configuredOrigins,
    ...(isDevelopment ? developmentOrigins : []),
  ]);

  if (env.NODE_ENV === "production" && allowedOrigins.size === 0) {
    throw new Error("Set FRONTEND_ORIGIN or CORS_ALLOWED_ORIGINS before starting in production.");
  }

  return allowedOrigins;
}
