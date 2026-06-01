import { randomInt } from "crypto";

const CHARSET =
  "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Random temporary password (no ambiguous 0/O/1/l/I). */
export function generateTemporaryPassword(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARSET[randomInt(0, CHARSET.length)];
  }
  return out;
}
