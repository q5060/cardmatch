import { deleteSpotForm, setSpotLookingForm } from "@/actions/meetSpot";

type Spot = {
  id: string;
  label: string;
  timeNote: string;
  lat: number;
  lng: number;
  looking: boolean;
};

export function MeetSpotList({ spots }: { spots: Spot[] }) {
  if (spots.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
        尚未新增約戰地點。
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {spots.map((s) => (
        <li
          key={s.id}
          className="card card-hover flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="font-medium text-foreground">{s.label}</div>
            <div className="text-xs text-muted-foreground">
              {s.timeNote || "未填時段"} · {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
            </div>
            {s.looking ? (
              <span className="mt-2 inline-block rounded-full bg-[var(--success-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--success-fg)]">
                大廳公開中
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={setSpotLookingForm}>
              <input type="hidden" name="spotId" value={s.id} />
              <input type="hidden" name="looking" value={String(!s.looking)} />
              <button type="submit" className="btn btn-outline btn-sm">
                {s.looking ? "取消大廳公開" : "公開到大廳"}
              </button>
            </form>
            <form action={deleteSpotForm}>
              <input type="hidden" name="spotId" value={s.id} />
              <button
                type="submit"
                className="rounded-md bg-red-500/15 px-3 py-1 text-xs font-medium text-red-800 transition hover:bg-red-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                刪除
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
