"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createMeetSpot(formData: FormData) {
  const session = await getSession();
  if (!session.userId) throw new Error("UNAUTHORIZED");

  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const label = String(formData.get("label") ?? "").trim();
  const timeNote = String(formData.get("timeNote") ?? "").trim();
  const looking = formData.get("looking") === "on";

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("INVALID_COORDS");
  }
  if (!label) throw new Error("INVALID_LABEL");

  await prisma.$transaction(async (tx) => {
    if (looking) {
      await tx.meetSpot.updateMany({
        where: { userId: session.userId! },
        data: { looking: false },
      });
    }
    await tx.meetSpot.create({
      data: {
        userId: session.userId!,
        lat,
        lng,
        label: label.slice(0, 120),
        timeNote: timeNote.slice(0, 500),
        looking,
        active: true,
      },
    });
  });

  revalidatePath("/profile");
  revalidatePath("/battle");
}

export async function deleteMeetSpot(spotId: string) {
  const session = await getSession();
  if (!session.userId) throw new Error("UNAUTHORIZED");

  await prisma.meetSpot.deleteMany({
    where: { id: spotId, userId: session.userId },
  });

  revalidatePath("/profile");
  revalidatePath("/battle");
}

export async function deleteSpotForm(formData: FormData) {
  const spotId = String(formData.get("spotId") ?? "");
  if (!spotId) throw new Error("INVALID");
  await deleteMeetSpot(spotId);
}

export async function setSpotLookingForm(formData: FormData) {
  const spotId = String(formData.get("spotId") ?? "");
  const looking = String(formData.get("looking")) === "true";
  if (!spotId) throw new Error("INVALID");
  await setSpotLooking(spotId, looking);
}

export async function setSpotLooking(spotId: string, looking: boolean) {
  const session = await getSession();
  if (!session.userId) throw new Error("UNAUTHORIZED");

  await prisma.$transaction(async (tx) => {
    const spot = await tx.meetSpot.findFirst({
      where: { id: spotId, userId: session.userId! },
    });
    if (!spot) throw new Error("NOT_FOUND");

    if (looking) {
      await tx.meetSpot.updateMany({
        where: { userId: session.userId! },
        data: { looking: false },
      });
    }
    await tx.meetSpot.update({
      where: { id: spotId },
      data: { looking },
    });
  });

  revalidatePath("/profile");
  revalidatePath("/battle");
}
