"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const session = await getSession();
  if (!session.userId) throw new Error("UNAUTHORIZED");

  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (!displayName || displayName.length > 40) {
    throw new Error("INVALID_DISPLAY_NAME");
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { displayName, bio: bio.slice(0, 500) },
  });

  revalidatePath("/profile");
}
