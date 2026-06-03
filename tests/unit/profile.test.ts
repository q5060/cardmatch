import { describe, expect, it } from "vitest";
import {
  isProfileIdentificationComplete,
  profileIdentificationMissing,
  parseUserAge,
} from "@/lib/profile";
import { USER_GENDER } from "@/lib/constants";

describe("profile identification", () => {
  const complete = {
    gender: USER_GENDER.MALE,
    age: 25,
    avatarUrl: "/uploads/avatars/1.jpg",
  };

  it("detects complete profile", () => {
    expect(isProfileIdentificationComplete(complete)).toBe(true);
    expect(profileIdentificationMissing(complete)).toEqual([]);
  });

  it("lists missing fields", () => {
    expect(
      profileIdentificationMissing({
        gender: "",
        age: null,
        avatarUrl: null,
      }),
    ).toEqual(["性別", "年齡", "大頭貼照片"]);
  });

  it("parses valid age", () => {
    expect(parseUserAge("30")).toBe(30);
    expect(parseUserAge("12")).toBeNull();
    expect(parseUserAge("abc")).toBeNull();
  });
});
