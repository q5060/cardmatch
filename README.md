# Cardmatch

Next.js 全端專案（App Router、API Routes、Prisma + PostgreSQL、iron-session）。

## 需求環境

- [Node.js](https://nodejs.org/)（建議 **20 LTS** 或以上）

## 本地啟動（完整流程）

### 1. 安裝相依套件

```bash
npm install
```

`postinstall` 會自動執行 `prisma generate`，無須手動再跑一次（除非要除錯）。

### 2. 啟動 PostgreSQL

本機需有 PostgreSQL。最簡單方式：

```bash
docker compose -f docker-compose.db.yml up -d
```

### 3. 環境變數

複製範例並編輯（不要提交 `.env` 到版控）：

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://cardmatch:cardmatch@localhost:5432/cardmatch"
SESSION_SECRET="請換成至少32個字元的隨機密鑰"
```

| 變數 | 說明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串，例如 `postgresql://user:pass@localhost:5432/cardmatch`。 |
| `SESSION_SECRET` | 加密 session cookie，**長度至少 32**，否則啟動會報錯。 |
| `SMTP_*` | 忘記密碼寄信用（`SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASS`、`SMTP_FROM`）。本機未設定時僅在終端機印出信件內容。 |

### 4. 建立資料表

擇一即可：

- **建議（與 repo migrations 一致）**

  ```bash
  npm run db:migrate
  ```

- **快速對齊 schema（本機試用）**

  ```bash
  npm run db:push
  ```

### 5.（選用）種子資料

寫入示意店家等資料：

```bash
npm run db:seed
```

### 6. 開發伺服器

```bash
npm run dev
```

瀏覽器開啟 [http://localhost:3000](http://localhost:3000)。

### 約戰流程（對戰頁 `/battle`）

1. 登入後進入 **對戰** 頁。
2. **隨機配對（選用）**：按「隨機配對」以全站佇列配對；或選一家卡店後按「同店優先配對」（先找同店，否則與全站等候者配對）。配對成功會產生邀請，對方需在對戰頁接受。
3. **搜尋欄**：輸入卡店名稱、地址或地標，地圖會移動到該處；選外部地點後可按「在此發布約戰」。地點搜尋使用 [Nominatim](https://nominatim.openstreetmap.org/)（OpenStreetMap，需網路）。
4. **藍色釘（卡店）**：點擊進入店家大廳，查看在該店打牌的玩家，或按「發布約戰公告」發布公告。
5. **綠色釘（自選地點）**：點擊地圖空白處發布，可填寫**約戰說明**（打什麼、程度）與**公告時長**（預設 4 小時，可自訂 1–24 小時）；或點擊他人玩家釘查看需求，大廳列表會顯示公告結束時間。
6. **點擊釘或從大廳選擇玩家** 可 **發起約戰**。
7. 對方接受後，雙方按「我準備好了」即開始對戰；可於頁面內聊天並在賽後填寫戰績。進行中約戰與公告詳情會顯示會面經緯度，並可一鍵開啟 Google 地圖導航。
8. **雙方確認戰績後**會進入**結果分享**畫面：可複製公開連結（`/battle/result/{matchId}`），分享至 X、Facebook 等；連結含 Open Graph 預覽圖（雙方頭像、勝方、時間、地點）。按「返回地圖」才回到探索介面。

公告僅能從對戰頁地圖發布；個人檔案不再管理約戰地點。

正式環境請在 `.env` 設定 `NEXT_PUBLIC_SITE_URL`（例如 `https://your-domain.com`），分享連結與 OG 圖才會使用正確網域。

---

## Docker 支援（跨平台開發）

使用 Docker 能在任何作業系統上統一開發環境。

### 開發模式

在根目錄執行：

```bash
docker-compose -f docker-compose.dev.yml up
```

或簡短寫法：

```bash
docker-compose -f docker-compose.dev.yml up -d
```

指令執行後，在 [http://localhost:3000](http://localhost:3000) 訪問應用。支援 Hot Reload（修改程式碼自動重啟）。

停止容器：

```bash
docker-compose -f docker-compose.dev.yml down
```

檢視日誌：

```bash
docker-compose -f docker-compose.dev.yml logs -f
```

### 正式模式

在根目錄執行：

```bash
docker-compose up -d
```

此模式會將 Next.js 應用編譯成正式版本並運行。

停止容器：

```bash
docker-compose down
```

### 資料庫初始化

若 Docker 容器中的資料庫需要初始化，可在容器內執行：

```bash
docker-compose exec cardmatch-dev npm run db:migrate
docker-compose exec cardmatch-dev npm run db:seed
```

或正式模式：

```bash
docker-compose exec cardmatch npm run db:migrate
docker-compose exec cardmatch npm run db:seed
```

### 常見問題

- **Port 已被佔用**：修改 `docker-compose.yml` 或 `docker-compose.dev.yml` 中的 `ports` 設定。
- **Windows 上 Volume 掛載慢**：建議用 WSL 2 backend。
- **Postgres 連不上**：確認 `docker compose -f docker-compose.db.yml up -d` 已啟動，且 `DATABASE_URL` 主機為 `localhost`（本機）或 `postgres`（Docker Compose 內）。

---

## 測試

先啟動 Postgres，並建立測試用資料庫（只需一次）：

```bash
docker compose -f docker-compose.db.yml up -d
docker compose -f docker-compose.db.yml exec postgres \
  psql -U cardmatch -c "CREATE DATABASE cardmatch_test;"
```

複製測試環境變數範例：

```bash
cp .env.test.example .env.test
```

| 指令 | 說明 |
|------|------|
| `npm run test:unit` | Vitest 單元測試（`tests/unit`） |
| `npm run test:integration` | Vitest 整合測試（API + Prisma + PostgreSQL） |
| `npm run test` | 執行所有 Vitest 測試 |
| `npm run test:e2e` | Playwright E2E（需先 `npm run build`，並執行 `npx playwright install`） |
| `npm run test:ci` | 本地模擬 CI：lint → unit → integration → build → e2e |

GitHub Actions 會在 push / pull request 時自動執行 lint、unit、integration 與 e2e（見 [`.github/workflows/ci.yml`](.github/workflows/ci.yml)）。

---

## 常用指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 開發模式 |
| `npm run build` | 正式建置（`prisma generate` + `next build`） |
| `npm run db:deploy` | 對正式／遠端 DB 執行 `prisma migrate deploy`（含重試） |
| `npm run start` | 以正式模式啟動（需先 `build`） |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:push` | 將 schema 推到資料庫 |
| `npm run db:seed` | 執行 `prisma/seed.ts` |
| `npm run db:studio` | Prisma Studio（視覺化管理資料） |

---

## 多人／多帳號本機測試

登入狀態綁在 cookie，同一瀏覽器設定檔通常只能登一個帳號。測兩個使用者時可用：**不同瀏覽器**、或 **一般視窗 + 無痕視窗**、或 **不同瀏覽器設定檔**。

---

## 即時同步（SSE）

登入後全站會建立一條 Server-Sent Events 連線（`GET /api/realtime/stream`），用於推送：

- 對戰狀態變更（邀請、準備、取消等）
- 約戰／好友新訊息
- 通知未讀數更新

聊天與對戰頁在 SSE 斷線時會以輕量 API 輪詢作為 fallback（`afterTime` 增量拉取訊息、`/api/matches/active` 同步對戰狀態）。

| 環境變數 | 說明 |
|----------|------|
| `REALTIME_BUS` | 預設 `memory`（單一 Node 進程）。**Vercel 等多 instance 部署請設 `redis`**。 |
| `REDIS_URL` | `REALTIME_BUS=redis` 時必填；建議使用 [Upstash Redis](https://upstash.com/) 的 `rediss://...` 連線字串。 |

### 本機開發

維持預設即可（不需 Redis）：

```env
REALTIME_BUS=memory
```

若要本機驗證 Redis bus（可選）：

```bash
docker run -p 6379:6379 redis:7
```

```env
REALTIME_BUS=redis
REDIS_URL=redis://127.0.0.1:6379
```

### Vercel + Upstash（建議）

1. 在 [Upstash Console](https://console.upstash.com/) 建立 Redis（區域建議選東京一帶，與 `vercel.json` 的 `hnd1` 相近）。
2. 複製 **Redis URL**（`rediss://...`）。
3. 於 Vercel 專案 **Settings → Environment Variables** 新增：
   - `REALTIME_BUS` = `redis`
   - `REDIS_URL` = Upstash 提供的 URL
4. 重新部署。

任一 instance 上的 API（例如接受約戰）發布事件後，會經 Redis pub/sub 送達其他 instance 上同一使用者的 SSE 連線。

---

## 部署到 Vercel

專案已設定為 **PostgreSQL + Redis 即時 bus**。`vercel.json` 預設區域為東京（`hnd1`）。

**Vercel build 不跑 migration**（避免多個 deploy 同時搶 Postgres advisory lock 而 P1002 失敗）。Schema 有變更時請用下方「資料庫 migration」其中一種方式套用。

### 1. 建立 PostgreSQL

任選其一並取得 `DATABASE_URL`（`postgresql://...` 或 `postgres://...`）：

- [Vercel Postgres](https://vercel.com/storage/postgres)（Storage → Connect to Project）
- [Neon](https://neon.tech/)
- [Supabase](https://supabase.com/)

### 2. 建立 Upstash Redis

見上方「Vercel + Upstash」：區域建議東京，取得 `rediss://...` URL。

### 3. Vercel 環境變數

於 **Settings → Environment Variables**（Production 與 Preview 建議都設）：

| 變數 | 值 |
|------|-----|
| `DATABASE_URL` | Postgres 連線字串（Neon 建議用 **Pooled** / `-pooler` 主機名，給 runtime 用） |
| `DIRECT_DATABASE_URL` | **Neon 必填**：Dashboard → Connect → **Direct connection**（非 `-pooler`）。Migration 需直連，否則可能 P1002 advisory lock timeout |
| `SESSION_SECRET` | 至少 32 字元的強隨機字串 |
| `REALTIME_BUS` | `redis` |
| `REDIS_URL` | Upstash 的 `rediss://...` |

若使用 Vercel Postgres 整合，通常只需 `DATABASE_URL`（本機 `db:deploy` 會在未設定時 fallback 成同一 URL）。

### 資料庫 migration（Production）

`npm run build` **不會** migrate。Schema 有更新時，擇一：

1. **GitHub Actions（建議）** — 在 repo **Settings → Secrets and variables → Actions** 新增 `DATABASE_URL`、`DIRECT_DATABASE_URL`（Neon 直連 URL）。push 到 `main` 且 `prisma/` 有變更時，`.github/workflows/migrate-production.yml` 會自動 `npm run db:deploy`。
2. **本機手動** — 對正式庫執行一次：
   ```bash
   DATABASE_URL="postgresql://..." DIRECT_DATABASE_URL="postgresql://...(Neon Direct)..." npm run db:deploy
   ```

若只是改程式、沒有新的 migration 檔，**不必**跑 migrate，直接 Vercel Deploy 即可。

### 4. 匯入 GitHub 並部署

1. [Vercel Dashboard](https://vercel.com/new) → Import Git Repository → 選本 repo。
2. Framework Preset 應自動辨識為 **Next.js**；Build Command 使用預設 `npm run build` 即可。
3. 設好環境變數後 **Deploy**。
4.（選用）部署成功後在本機對正式庫執行種子：  
   `DATABASE_URL="你的正式庫 URL" npm run db:seed`

### 5. 驗證

- 註冊／登入
- 兩個瀏覽器（或無痕）測約戰邀請是否即時出現（驗證 Redis bus）

正式環境 session cookie 為 `secure`（需 HTTPS）。卡牌圖鑑等功能尚未實作，不影響目前社交／約戰功能上線。

---

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
