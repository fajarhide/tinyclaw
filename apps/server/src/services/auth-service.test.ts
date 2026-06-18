import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { AuthService, resolveJwtSecret } from "./auth-service";

const TEST_CONFIG = {
  jwtSecret: "test-secret-key-for-jwt-signing-1234567890",
};

describe("resolveJwtSecret", () => {
  const originalEnv = process.env.TINYCLAW_JWT_SECRET;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.TINYCLAW_JWT_SECRET;
    } else {
      process.env.TINYCLAW_JWT_SECRET = originalEnv;
    }
  });

  test("returns env var when set", async () => {
    process.env.TINYCLAW_JWT_SECRET = "env-secret-123";
    const secret = await resolveJwtSecret();
    expect(secret).toBe("env-secret-123");
  });

  test("generates a new secret when env var is not set", async () => {
    delete process.env.TINYCLAW_JWT_SECRET;
    const secret = await resolveJwtSecret();
    expect(secret).toBeTruthy();
    expect(secret.length).toBe(32);
  });

  test("returns persisted secret on subsequent calls", async () => {
    delete process.env.TINYCLAW_JWT_SECRET;
    const secret1 = await resolveJwtSecret();
    const secret2 = await resolveJwtSecret();
    expect(secret2).toBe(secret1);
  });
});

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(TEST_CONFIG);
  });

  describe("hashPassword", () => {
    test("returns a bcrypt hash", async () => {
      const hash = await authService.hashPassword("password123");
      expect(hash).toStartWith("$2");
      expect(hash.length).toBeGreaterThan(50);
    });

    test("different passwords produce different hashes", async () => {
      const hash1 = await authService.hashPassword("password1");
      const hash2 = await authService.hashPassword("password2");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verifyPassword", () => {
    test("returns true for correct password", async () => {
      const hash = await authService.hashPassword("password123");
      const result = await authService.verifyPassword("password123", hash);
      expect(result).toBe(true);
    });

    test("returns false for incorrect password", async () => {
      const hash = await authService.hashPassword("password123");
      const result = await authService.verifyPassword("wrongpassword", hash);
      expect(result).toBe(false);
    });
  });

  describe("browser session helpers", () => {
    test("creates opaque browser session tokens and hashes them", () => {
      const session = authService.createBrowserSessionTokens();

      expect(session.sessionToken).not.toContain(".");
      expect(session.csrfToken).not.toContain(".");
      expect(session.sessionToken.length).toBeGreaterThan(50);
      expect(session.csrfToken.length).toBeGreaterThan(50);
      expect(new Date(session.expiresAt).toString()).not.toBe("Invalid Date");
      expect(authService.hashToken(session.sessionToken)).toHaveLength(43);
      expect(authService.hashToken(session.sessionToken)).not.toBe(session.sessionToken);
    });
  });

  describe("createToken and verifyToken", () => {
    test("creates a valid JWT token", async () => {
      const token = await authService.createToken("admin@example.com");
      const payload = await authService.verifyToken(token);
      expect(payload.email).toBe("admin@example.com");
    });

    test("rejects an invalid token", async () => {
      await expect(authService.verifyToken("invalid-token")).rejects.toThrow();
    });

    test("rejects a token signed with a different secret", async () => {
      const otherService = new AuthService({
        jwtSecret: "different-secret-key-12345678901234567890",
      });
      const token = await otherService.createToken("admin@example.com");
      await expect(authService.verifyToken(token)).rejects.toThrow();
    });
  });
});
