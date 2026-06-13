import { describe, expect, it } from "vitest";
import {
  isProfileIdentificationComplete,
  parseProfileIdentificationFromFormData,
  parseUserAge,
  profileIdentificationMissing,
} from "@/lib/profile";
import { USER_GENDER } from "@/lib/constants";

describe("profile identification", () => {
  const complete = {
    gender: USER_GENDER.OTHER,
    age: 99,
    avatarUrl: "/uploads/avatars/1.jpg",
  };

  it("detects complete profile when all optional fields filled", () => {
    expect(isProfileIdentificationComplete(complete)).toBe(true);
    expect(profileIdentificationMissing(complete)).toEqual([]);
  });

  it("allows empty identification", () => {
    expect(
      isProfileIdentificationComplete({ gender: "", age: null, avatarUrl: null }),
    ).toBe(false);
    expect(profileIdentificationMissing({ gender: "", age: null, avatarUrl: null }))
      .toEqual(["性別", "年齡", "大頭貼"]);
  });

  it("parses optional form fields", () => {
    const fd = new FormData();
    fd.set("gender", USER_GENDER.FEMALE);
    fd.set("age", "42");
    expect(parseProfileIdentificationFromFormData(fd)).toEqual({
      gender: USER_GENDER.FEMALE,
      age: 42,
    });

    const empty = new FormData();
    expect(parseProfileIdentificationFromFormData(empty)).toEqual({
      gender: "",
      age: null,
    });
  });

  it("parses age without upper bound", () => {
    expect(parseUserAge("150")).toBe(150);
    expect(parseUserAge("")).toBeNull();
    expect(parseUserAge("0")).toBeNull();
  });
});
