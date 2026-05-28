"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, Users, MapPin, UserCircle, Store } from "lucide-react";
import { BackLink } from "@/components/ui/BackLink";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";

interface SearchResult {
  id: string;
  type: "user" | "spot" | "shop";
  displayName?: string;
  avatarUrl?: string | null;
  label?: string;
  name?: string;
  addressNote?: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) {
        throw new Error("搜尋失敗");
      }
      const data = await res.json();
      setResults(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "搜尋時出錯");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      await performSearch(trimmed);
    })();

    return () => {
      cancelled = true;
    };
  }, [query]);

  const displayedResults = query.trim() ? results : [];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <BackLink />
      </div>

      <div className="card card-hover p-6">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋使用者、約戰地點或店家..."
            autoFocus
            className="input-field pl-10"
          />
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-soft-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {error ? <Alert variant="error">{error}</Alert> : null}

      {query && !loading && displayedResults.length === 0 && !error ? (
        <EmptyState
          icon={<Search className="h-10 w-10" />}
          title={`找不到符合「${query}」的結果`}
        />
      ) : null}

      {displayedResults.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">找到 {displayedResults.length} 個結果</p>
          <ul className="space-y-2">
            {displayedResults.map((result) => (
              <li key={`${result.type}-${result.id}`}>
                {result.type === "user" ? (
                  <Link
                    href={`/profile/${result.id}`}
                    className="card card-hover flex items-center gap-3 p-4"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-black/[0.02]">
                      {result.avatarUrl ? (
                        <Image
                          src={result.avatarUrl}
                          alt={result.displayName ?? ""}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <UserCircle className="h-6 w-6 text-muted-foreground opacity-50" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" aria-hidden />
                        <h3 className="truncate font-medium text-foreground">
                          {result.displayName}
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">使用者</p>
                    </div>
                  </Link>
                ) : result.type === "shop" ? (
                  <Link
                    href={`/battle?shop=${result.id}`}
                    className="card card-hover flex items-center gap-3 p-4"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-emerald-50 text-emerald-700">
                      <Store className="h-6 w-6" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium text-foreground">{result.name}</h3>
                      {result.addressNote && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{result.addressNote}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">卡牌店</p>
                    </div>
                  </Link>
                ) : (
                  <div className="card card-hover flex items-center gap-3 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-primary/10 text-primary">
                      <MapPin className="h-6 w-6" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium text-foreground">{result.label}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">約戰地點</p>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!query && !loading ? (
        <EmptyState
          icon={<Search className="h-12 w-12" />}
          title="開始搜尋"
          description="輸入使用者名稱、約戰地點標籤或店家名稱以搜尋"
        />
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-soft-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
