# 環境變數設定

複製範例並編輯（不要提交 `.env` 到版控）：

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://cardmatch:cardmatch@localhost:5432/cardmatch"
SESSION_SECRET="請換成至少32個字元的隨機密鑰"
```

## 基本變數

| 變數 | 說明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串，例如 `postgresql://user:pass@localhost:5432/cardmatch`。 |
| `SESSION_SECRET` | 加密 session cookie，**長度至少 32**，否則啟動會報錯。 |
| `SMTP_*` | 忘記密碼寄信用（`SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASS`、`SMTP_FROM`）。本機未設定時僅在終端機印出信件內容。 |

## 即時同步相關變數

| 環境變數 | 說明 |
|----------|------|
| `REALTIME_BUS` | 預設 `memory`（單一 Node 進程）。**Vercel 等多 instance 部署請設 `redis`**。 |
| `REDIS_URL` | `REALTIME_BUS=redis` 時必填；建議使用 [Upstash Redis](https://upstash.com/) 的 `rediss://...` 連線字串。 |

詳見 [即時同步 (SSE)](../guides/realtime-sse.md)。

## 正式環境

正式環境請設定 `NEXT_PUBLIC_SITE_URL`（例如 `https://your-domain.com`），分享連結與 OG 圖才會使用正確網域。詳見 [部署到 Vercel](../deployment/vercel.md)。
