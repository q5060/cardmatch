import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { ProfileMatchesPage } from "@/components/profile/ProfileMatchesPage";
import { getProfileMatchFeed } from "@/lib/queries";
import { PROFILE_ALL_MATCHES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "所有對戰 | CardMatch",
  description: "查看您的完整對戰紀錄",
};

export default async function MyMatchesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const feed = await getProfileMatchFeed(user.id, PROFILE_ALL_MATCHES);

  return (
    <ProfileMatchesPage
      feed={feed}
      backHref="/profile"
      title="所有對戰"
      subtitle="您的已完成對戰紀錄"
    />
  );
}
