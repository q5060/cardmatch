import { describe, expect, it } from "vitest";
import { loginUrlWithNext, safeLoginRedirect } from "@/lib/safeRedirect";

describe("safeLoginRedirect", () => {
  it("returns / when missing", () => {
    expect(safeLoginRedirect(null)).toBe("/");
    expect(safeLoginRedirect("")).toBe("/");
  });

  it("allows same-origin relative paths", () => {
    expect(safeLoginRedirect("/battle")).toBe("/battle");
    expect(safeLoginRedirect("  /profile  ")).toBe("/profile");
  });

  it("blocks protocol-relative and external paths", () => {
    expect(safeLoginRedirect("//evil.com")).toBe("/");
    expect(safeLoginRedirect("https://evil.com")).toBe("/");
  });

  it("blocks backslash and null byte", () => {
    expect(safeLoginRedirect("/\\evil")).toBe("/");
    expect(safeLoginRedirect("/battle\0")).toBe("/");
  });
});

describe("loginUrlWithNext", () => {
  it("builds login URL with encoded next path", () => {
    expect(loginUrlWithNext("/battle")).toBe("/login?next=%2Fbattle");
  });
});
