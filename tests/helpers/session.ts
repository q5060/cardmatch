import { POST as loginPost } from "@/app/api/auth/login/route";
import { testPrisma } from "./db";

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Logs in via API and stores session in the test cookie jar. */
export async function loginAsUser(
  email: string,
  password = "password12",
): Promise<{ id: number; email: string; displayName: string }> {
  const res = await loginPost(
    jsonRequest("http://localhost/api/auth/login", { email, password }),
  );
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: HTTP ${res.status}`);
  }
  return testPrisma.user.findUniqueOrThrow({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, displayName: true },
  });
}
