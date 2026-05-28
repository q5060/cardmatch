import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import prisma from "./prisma";
import { sessionOptions, type SessionData } from "./session";

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function getCurrentUser() {
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
  const { suspendedUntil: _, ...safeUser } = user;
  return safeUser;
}
