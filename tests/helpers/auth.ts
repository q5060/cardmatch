export function clearTestCookies() {
  globalThis.__testCookieStore?.clear();
}

export function getTestCookieHeader(): string {
  const store = globalThis.__testCookieStore;
  if (!store) return "";
  return [...store.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}
