import { describe, expect, it } from "vitest";
import { generateTemporaryPassword } from "@/lib/generatePassword";

describe("generateTemporaryPassword", () => {
  it("returns password of requested length", () => {
    expect(generateTemporaryPassword(12)).toHaveLength(12);
  });

  it("generates different values", () => {
    const a = generateTemporaryPassword();
    const b = generateTemporaryPassword();
    expect(a).not.toBe(b);
  });
});
