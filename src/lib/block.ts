import prisma from "@/lib/prisma";

/** User IDs that should be hidden from viewer (either direction of block). */
export async function getBlockedUserIds(viewerId: number): Promise<Set<number>> {
  const rows = await prisma.userBlock.findMany({
    where: {
      OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
    },
    select: { blockerId: true, blockedId: true },
  });

  const blocked = new Set<number>();
  for (const row of rows) {
    if (row.blockerId === viewerId) {
      blocked.add(row.blockedId);
    } else {
      blocked.add(row.blockerId);
    }
  }
  return blocked;
}

export async function isBlockedBetween(userA: number, userB: number): Promise<boolean> {
  const row = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: userA, blockedId: userB },
        { blockerId: userB, blockedId: userA },
      ],
    },
    select: { blockerId: true },
  });
  return row != null;
}

export async function assertNotBlocked(viewerId: number, otherId: number): Promise<void> {
  if (viewerId === otherId) return;
  if (await isBlockedBetween(viewerId, otherId)) {
    throw new Error("無法與此使用者互動");
  }
}

/** Users the viewer has blocked (one-way; for settings list). */
export async function listUsersBlockedByViewer(viewerId: number) {
  const rows = await prisma.userBlock.findMany({
    where: { blockerId: viewerId },
    select: {
      createdAt: true,
      blocked: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.blocked.id,
    displayName: row.blocked.displayName,
    avatarUrl: row.blocked.avatarUrl,
    blockedAt: row.createdAt.toISOString(),
  }));
}
