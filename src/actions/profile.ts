"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { publishNotification } from "@/lib/realtime/publish";
import { assertNotBlocked } from "@/lib/block";
import { isUserAge, isUserGender, parseUserAge } from "@/lib/profile";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function updateProfile(formData: FormData) {
  const session = await getSession();
  if (!session.userId) throw new Error("UNAUTHORIZED");

  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim();
  const age = parseUserAge(String(formData.get("age") ?? ""));
  if (!displayName || displayName.length > 40) {
    throw new Error("INVALID_DISPLAY_NAME");
  }
  if (gender && !isUserGender(gender)) throw new Error("INVALID_GENDER");
  const ageRaw = String(formData.get("age") ?? "").trim();
  if (ageRaw && age === null) throw new Error("INVALID_AGE");

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

    const buf = Buffer.from(await file.arrayBuffer());
    await prisma.avatar.upsert({
      where: { userId },
      update: { data: buf, mimeType: file.type },
      create: { userId, data: buf, mimeType: file.type },
    });

    nextAvatarUrl = `/api/avatar/${userId}?v=${Date.now()}`;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      displayName,
      bio: bio.slice(0, 500),
      gender,
      age,
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

  if (existing.avatarUrl?.startsWith("/api/avatar/")) {
    await prisma.avatar.deleteMany({
      where: { userId },
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null },
  });

  revalidatePath("/profile");
  revalidatePath(`/profile/${userId}`);
}

export async function sendFriendRequest(targetUserId: number) {
  const session = await getSession();
  if (!session.userId) throw new Error("UNAUTHORIZED");

  if (session.userId === targetUserId) {
    throw new Error("CANNOT_ADD_SELF");
  }

  await assertNotBlocked(session.userId, targetUserId);

  // 检查是否已有友谊关系
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: session.userId, addresseeId: targetUserId },
        { requesterId: targetUserId, addresseeId: session.userId },
      ],
    },
  });

  if (existing) {
    throw new Error("ALREADY_EXISTS");
  }

  const friendship = await prisma.friendship.create({
    data: {
      requesterId: session.userId,
      addresseeId: targetUserId,
      status: "PENDING",
    },
  });

  // Send friend request notification with sender name
  const requester = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { displayName: true },
  });

  await prisma.notification.create({
    data: {
      userId: targetUserId,
      type: "FRIEND_REQUEST",
      referenceId: friendship.id,
      senderId: session.userId,
      data: JSON.stringify(`${requester?.displayName} 邀請你加入好友`),
      read: false,
    },
  });

  await publishNotification(targetUserId);
  revalidatePath(`/profile/${targetUserId}`);
  return friendship;
}
