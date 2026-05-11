"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, Users, MapPin, UserCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  type: "user" | "spot";
  label?: string;
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (query.trim()) {
      performSearch(query);
    } else {
      setResults([]);
    }
  }, [query]);

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
    } catch (err: any) {
      setError(err.message || "搜尋時出錯");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-neutral-200 transition-colors"
            aria-label="返回"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-foreground">搜尋</h1>
        </div>

        {/* Search Input */}
        <div className="card card-hover p-6 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋使用者或約戰地點..."
              autoFocus
              className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            可以搜尋使用者名稱或約戰地點標籤
          </p>
        </div>

        {/* Results */}
        {loading && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-800 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}

        {query && !loading && results.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 py-12">
            <Search className="h-10 w-10 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              找不到符合「{query}」的結果
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              找到 {results.length} 個結果
            </p>
            <ul className="space-y-2">
              {results.map((result) => (
                <li key={`${result.type}-${result.id}`}>
                  {result.type === "user" ? (
                    <Link
                      href={`/profile/${result.id}`}
                      className="card card-hover flex items-center gap-3 p-4 transition-colors hover:bg-neutral-100"
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-neutral-100">
                        {result.avatarUrl ? (
                          <Image
                            src={result.avatarUrl}
                            alt={result.displayName}
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
                          <Users className="h-4 w-4 text-primary" />
                          <h3 className="font-medium truncate text-foreground">
                            {result.displayName}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">使用者</p>
                      </div>
                    </Link>
                  ) : (
                    <div className="card card-hover flex items-center gap-3 p-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-primary/10 text-primary">
                        <MapPin className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium truncate text-foreground">
                          {result.label}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">約戰地點</p>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!query && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 py-16">
            <Search className="h-12 w-12 text-muted-foreground opacity-30" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">開始搜尋</p>
              <p className="text-xs text-muted-foreground mt-1">
                輸入使用者名稱或約戰地點標籤以搜尋
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
