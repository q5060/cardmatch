# 部署到 Vercel

專案已設定為 **PostgreSQL + Redis 即時 bus**。`vercel.json` 預設區域為東京（`hnd1`）。

**Vercel build 不跑 migration**（避免多個 deploy 同時搶 Postgres advisory lock 而 P1002 失敗）。Schema 有變更時請用下方「資料庫 migration」其中一種方式套用。

## 1. 建立 PostgreSQL

任選其一並取得 `DATABASE_URL`（`postgresql://...` 或 `postgres://...`）：

- [Vercel Postgres](https://vercel.com/storage/postgres)（Storage → Connect to Project）
- [Neon](https://neon.tech/)
- [Supabase](https://supabase.com/)

## 2. 建立 Upstash Redis

見 [即時同步 (SSE)](../guides/realtime-sse.md) 中的「Vercel + Upstash」：區域建議東京，取得 `rediss://...` URL。

## 3. Vercel 環境變數

於 **Settings → Environment Variables**（Production 與 Preview 建議都設）：

| 變數 | 值 |
|------|-----|
| `DATABASE_URL` | Postgres 連線字串（Neon 建議用 **Pooled** / `-pooler` 主機名，給 runtime 用） |
| `DIRECT_DATABASE_URL` | **Neon 必填**：Dashboard → Connect → **Direct connection**（非 `-pooler`）。Migration 需直連，否則可能 P1002 advisory lock timeout |
| `SESSION_SECRET` | 至少 32 字元的強隨機字串 |
| `REALTIME_BUS` | `redis` |
| `REDIS_URL` | Upstash 的 `rediss://...` |

若使用 Vercel Postgres 整合，通常只需 `DATABASE_URL`（本機 `db:deploy` 會在未設定時 fallback 成同一 URL）。

## 資料庫 migration（Production）

`npm run build` **不會** migrate。Schema 有更新時，擇一：

1. **GitHub Actions（建議）** — 在 repo **Settings → Secrets and variables → Actions** 新增 `DATABASE_URL`、`DIRECT_DATABASE_URL`（Neon 直連 URL）。push 到 `main` 且 `prisma/` 有變更時，`.github/workflows/migrate-production.yml` 會自動 `npm run db:deploy`。
2. **本機手動** — 對正式庫執行一次：
```bash
   DATABASE_URL="postgresql://..." DIRECT_DATABASE_URL="postgresql://...(Neon Direct)..." npm run db:deploy
```

若只是改程式、沒有新的 migration 檔，**不必**跑 migrate，直接 Vercel Deploy 即可。

## 4. 匯入 GitHub 並部署

1. [Vercel Dashboard](https://vercel.com/new) → Import Git Repository → 選本 repo。
2. Framework Preset 應自動辨識為 **Next.js**；Build Command 使用預設 `npm run build` 即可。
3. 設好環境變數後 **Deploy**。
4.（選用）部署成功後在本機對正式庫執行種子：
   `DATABASE_URL="你的正式庫 URL" npm run db:seed`

## 5. 驗證

- 註冊／登入
- 兩個瀏覽器（或無痕）測約戰邀請是否即時出現（驗證 Redis bus）

正式環境 session cookie 為 `secure`（需 HTTPS）。卡牌圖鑑等功能尚未實作，不影響目前社交／約戰功能上線。
