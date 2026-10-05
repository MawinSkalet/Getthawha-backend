import { describe, expect, it } from "bun:test";
import { getAllowedCorsOrigins } from "../services/cors.config.js";

describe("CORS origin configuration", () => {
  it("uses only configured origins in production", () => {
    const allowed = getAllowedCorsOrigins({
      NODE_ENV: "production",
      FRONTEND_ORIGIN: "https://client.example.com/booking",
      CORS_ALLOWED_ORIGINS: "https://admin.example.com, https://client.example.com",
    });

    expect([...allowed].sort()).toEqual([
      "https://admin.example.com",
      "https://client.example.com",
    ]);
    expect(allowed.has("https://getthawha.com")).toBe(false);
  });

  it("allows local development origins only outside production", () => {
    const allowed = getAllowedCorsOrigins({ NODE_ENV: "dev" });

    expect(allowed.has("http://localhost:3000")).toBe(true);
    expect(allowed.has("http://localhost:3001")).toBe(true);
  });

  it("fails closed when production has no configured web origin", () => {
    expect(() => getAllowedCorsOrigins({ NODE_ENV: "production" })).toThrow(
      "Set FRONTEND_ORIGIN or CORS_ALLOWED_ORIGINS",
    );
  });
});
