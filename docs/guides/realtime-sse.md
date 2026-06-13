# 即時同步（SSE）

登入後全站會建立一條 Server-Sent Events 連線（`GET /api/realtime/stream`），用於推送：

- 對戰狀態變更（邀請、準備、取消等）
- 約戰／好友新訊息
- 通知未讀數更新

聊天與對戰頁在 SSE 斷線時會以輕量 API 輪詢作為 fallback（`afterTime` 增量拉取訊息、`/api/matches/active` 同步對戰狀態）。

| 環境變數 | 說明 |
|----------|------|
| `REALTIME_BUS` | 預設 `memory`（單一 Node 進程）。**Vercel 等多 instance 部署請設 `redis`**。 |
| `REDIS_URL` | `REALTIME_BUS=redis` 時必填；建議使用 [Upstash Redis](https://upstash.com/) 的 `rediss://...` 連線字串。 |

## 本機開發

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

## Vercel + Upstash（建議）

1. 在 [Upstash Console](https://console.upstash.com/) 建立 Redis（區域建議選東京一帶，與 `vercel.json` 的 `hnd1` 相近）。
2. 複製 **Redis URL**（`rediss://...`）。
3. 於 Vercel 專案 **Settings → Environment Variables** 新增：
   - `REALTIME_BUS` = `redis`
   - `REDIS_URL` = Upstash 提供的 URL
4. 重新部署。

任一 instance 上的 API（例如接受約戰）發布事件後，會經 Redis pub/sub 送達其他 instance 上同一使用者的 SSE 連線。
