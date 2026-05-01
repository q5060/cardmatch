"use server";

import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const AVATAR_PREFIX = "/uploads/avatars/";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function avatarsDir(): string {
  return path.join(process.cwd(), "public", "uploads", "avatars");
}

/** Resolve a DB avatar URL to an absolute path only if it is this user's upload under avatars/. */
function safeLocalAvatarAbsolutePath(
  avatarUrl: string | null | undefined,
  userId: string,
): string | null {
  if (!avatarUrl?.startsWith(AVATAR_PREFIX)) return null;
  const rest = avatarUrl.slice(AVATAR_PREFIX.length);
  if (!rest || rest.includes("/") || rest.includes("..")) return null;
  const dot = rest.lastIndexOf(".");
  if (dot <= 0) return null;
  const base = rest.slice(0, dot);
  const ext = rest.slice(dot + 1).toLowerCase();
  if (base !== userId) return null;
  if (!["jpg", "jpeg", "png", "webp"].includes(ext)) return null;

  const root = path.resolve(avatarsDir());
  const abs = path.resolve(path.join(avatarsDir(), rest));
  if (!abs.startsWith(root + path.sep) && abs !== root) return null;
  return abs;
}

async function removeLocalAvatarIfOwned(userId: string, avatarUrl: string | null | undefined) {
  const abs = safeLocalAvatarAbsolutePath(avatarUrl, userId);
  if (!abs) return;
  try {
    await unlink(abs);
  } catch {
    /* ignore missing file */
  }
}

export async function updateProfile(formData: FormData) {
  const session = await getSession();
  if (!session.userId) throw new Error("UNAUTHORIZED");

  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (!displayName || displayName.length > 40) {
    throw new Error("INVALID_DISPLAY_NAME");
  }

  const userId = session.userId;
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });
  if (!existing) throw new Error("UNAUTHORIZED");

  let nextAvatarUrl: string | undefined;

  const avatarEntry = formData.get("avatar");
  if (
    avatarEntry &&
    typeof avatarEntry === "object" &&
    "size" in avatarEntry &&
    typeof (avatarEntry as File).size === "number" &&
    (avatarEntry as File).size > 0
  ) {
    const file = avatarEntry as File;
    if (file.size > MAX_AVATAR_BYTES) {
      throw new Error("AVATAR_TOO_LARGE");
    }
    const ext = MIME_TO_EXT[file.type];
    if (!ext) {
      throw new Error("AVATAR_INVALID_TYPE");
    }

    await removeLocalAvatarIfOwned(userId, existing.avatarUrl);

    const dir = avatarsDir();
    await mkdir(dir, { recursive: true });

    const filename = ext === "jpg" ? `${userId}.jpg` : `${userId}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buf);

    nextAvatarUrl = `${AVATAR_PREFIX}${filename}`;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      displayName,
      bio: bio.slice(0, 500),
      ...(nextAvatarUrl !== undefined ? { avatarUrl: nextAvatarUrl } : {}),
    },
  });

  revalidatePath("/profile");
  revalidatePath(`/profile/${userId}`);
}

export async function removeAvatar() {
  const session = await getSession();
  if (!session.userId) throw new Error("UNAUTHORIZED");

  const userId = session.userId;
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });
  if (!existing) throw new Error("UNAUTHORIZED");

  await removeLocalAvatarIfOwned(userId, existing.avatarUrl);

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null },
  });

  revalidatePath("/profile");
  revalidatePath(`/profile/${userId}`);
}
