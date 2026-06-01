import { beforeEach, describe, expect, it } from "vitest";
import { POST as registerPost } from "@/app/api/auth/register/route";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as forgotPasswordPost } from "@/app/api/auth/forgot-password/route";
import { clearTestCookies } from "../helpers/auth";
import { createUser, resetTables } from "../helpers/db";

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("auth API", () => {
  beforeEach(async () => {
    clearTestCookies();
    await resetTables();
  });

  describe("POST /api/auth/register", () => {
    it("returns 400 for invalid email", async () => {
      const res = await registerPost(
        jsonRequest("http://localhost/api/auth/register", {
          email: "not-an-email",
          password: "password12",
          displayName: "Test",
        }),
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 for short password", async () => {
      const res = await registerPost(
        jsonRequest("http://localhost/api/auth/register", {
          email: "user@example.com",
          password: "short",
          displayName: "Test",
        }),
      );
      expect(res.status).toBe(400);
    });

    it("returns 409 when email exists", async () => {
      await createUser({
        email: "dup@example.com",
        password: "password12",
        displayName: "Dup",
      });
      const res = await registerPost(
        jsonRequest("http://localhost/api/auth/register", {
          email: "dup@example.com",
          password: "password12",
          displayName: "Dup2",
        }),
      );
      expect(res.status).toBe(409);
    });

    it("returns 200 and sets session on success", async () => {
      const res = await registerPost(
        jsonRequest("http://localhost/api/auth/register", {
          email: "new@example.com",
          password: "password12",
          displayName: "New User",
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok?: boolean };
      expect(body.ok).toBe(true);
    });
  });

  describe("POST /api/auth/login", () => {
    it("returns 401 for wrong password", async () => {
      await createUser({
        email: "user@example.com",
        password: "password12",
        displayName: "User",
      });
      const res = await loginPost(
        jsonRequest("http://localhost/api/auth/login", {
          email: "user@example.com",
          password: "wrong-password",
        }),
      );
      expect(res.status).toBe(401);
    });

    it("returns 200 on valid credentials", async () => {
      await createUser({
        email: "user@example.com",
        password: "password12",
        displayName: "User",
      });
      const res = await loginPost(
        jsonRequest("http://localhost/api/auth/login", {
          email: "user@example.com",
          password: "password12",
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok?: boolean };
      expect(body.ok).toBe(true);
    });
  });

  describe("POST /api/auth/forgot-password", () => {
    it("returns 400 for invalid email", async () => {
      const res = await forgotPasswordPost(
        jsonRequest("http://localhost/api/auth/forgot-password", {
          email: "not-valid",
        }),
      );
      expect(res.status).toBe(400);
    });

    it("returns ok for unknown email without revealing existence", async () => {
      const res = await forgotPasswordPost(
        jsonRequest("http://localhost/api/auth/forgot-password", {
          email: "nobody@example.com",
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok?: boolean; message?: string };
      expect(body.ok).toBe(true);
      expect(body.message).toBeTruthy();
    });

    it("resets password for existing user", async () => {
      await createUser({
        email: "reset@example.com",
        password: "password12",
        displayName: "Reset User",
      });
      const res = await forgotPasswordPost(
        jsonRequest("http://localhost/api/auth/forgot-password", {
          email: "reset@example.com",
        }),
      );
      expect(res.status).toBe(200);

      const bad = await loginPost(
        jsonRequest("http://localhost/api/auth/login", {
          email: "reset@example.com",
          password: "password12",
        }),
      );
      expect(bad.status).toBe(401);
    });
  });
});
