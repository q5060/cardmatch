import { cache } from "react";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import prisma from "./prisma";
import { sessionOptions, type SessionData } from "./session";

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      createdAt: true,
      suspendedUntil: true,
    },
  });
  if (!user) return null;
  if (user.suspendedUntil && user.suspendedUntil > new Date()) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
});
