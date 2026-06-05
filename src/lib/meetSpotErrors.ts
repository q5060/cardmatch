export const STALE_ANNOUNCEMENT_ERROR = "此公告已失效或不存在";

export function isStaleAnnouncementError(error: unknown): boolean {
  return error instanceof Error && error.message === STALE_ANNOUNCEMENT_ERROR;
}
