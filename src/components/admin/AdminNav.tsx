export function AdminNav({ active }: { active: "shop-reports" | "user-reports" }) {
  return (
    <nav className="flex gap-2 text-sm border-b border-border pb-4">
      <a
        href="/admin/shop-reports"
        className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
          active === "shop-reports"
            ? "bg-primary text-white"
            : "bg-muted text-muted-foreground hover:text-foreground"
        }`}
      >
        店家回報
      </a>
      <a
        href="/admin/user-reports"
        className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
          active === "user-reports"
            ? "bg-primary text-white"
            : "bg-muted text-muted-foreground hover:text-foreground"
        }`}
      >
        用戶回報
      </a>
    </nav>
  );
}
