import dynamic from "next/dynamic";

export type { MapShopPin, MapPeerPin } from "./MeetMapClient";

export const MeetMap = dynamic(
  () => import("./MeetMapClient").then((m) => m.MeetMapClient),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full animate-pulse rounded-xl bg-gray-200"
        style={{ height: 320 }}
      />
    ),
  },
);
