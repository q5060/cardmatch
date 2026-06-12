# CardMatch API 文件

CardMatch 後端介面分兩類：

- **REST API**（`/api/*`）：本文件與 [`docs/openapi.yaml`](docs/openapi.yaml) 所描述，適合 `fetch`、SSE、外部整合。
- **Server Actions**（`src/actions/*`）：Next.js 表單與頁面互動使用，見 [附錄 A](#附錄-a-server-actions)。

## 快速開始

### 認證

使用 [iron-session](https://github.com/vvo/iron-session) cookie：

| 項目 | 值 |
|------|-----|
| Cookie 名稱 | `cardmatch_session` |
| 設定時機 | `POST /api/auth/login` 或 `POST /api/auth/register` 成功後 |
| 正式環境 | `secure`（需 HTTPS） |

本機測試範例（需先 `npm run dev`）：

```bash
# 登入
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}'

# 帶 cookie 呼叫
curl -b cookies.txt http://localhost:3000/api/auth/me
```

### OpenAPI 規格

機器可讀規格：[`docs/openapi.yaml`](docs/openapi.yaml)

預覽方式：開啟 [Swagger Editor](https://editor.swagger.io/) → **File → Import file** → 選擇 `docs/openapi.yaml`。

---

## 目錄

1. [認證 API](#1-認證-api)
2. [牌組 API](#2-牌組-api)
3. [卡牌圖鑑 API](#3-卡牌圖鑑-api)
4. [約戰／配對 API](#4-約戰配對-api)
5. [對戰 API](#5-對戰-api)
6. [好友 API](#6-好友-api)
7. [通知 API](#7-通知-api)
8. [封鎖 API](#8-封鎖-api)
9. [搜尋 API](#9-搜尋-api)
10. [頭像 API](#10-頭像-api)
11. [即時推送 API](#11-即時推送-api)
12. [錯誤碼參考](#12-錯誤碼參考)
13. [附錄 A：Server Actions](#附錄-a-server-actions)

---

## 1. 認證 API

### POST /api/auth/login

登入並設定 session cookie。

**權限**：無

**請求體**：

```json
{ "email": "user@example.com", "password": "password123" }
```

**成功** `200`：

```json
{ "ok": true }
```

**錯誤**：`400` 參數缺失；`401` 帳密錯誤；`403` 帳號停權中

---

### POST /api/auth/logout

清除 session cookie。

**權限**：無（無 session 也回成功）

**成功** `200`：`{ "ok": true }`

---

### POST /api/auth/register

註冊新帳號並自動登入。

**權限**：無

**請求體**：

```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "訓練家小明"
}
```

| 欄位 | 限制 |
|------|------|
| email | 有效 email 格式 |
| password | ≥ 8 字元 |
| displayName | 1–40 字 |

**成功** `200`：`{ "ok": true }`

**錯誤**：`400` 驗證失敗；`409` email 已註冊

---

### GET /api/auth/me

取得目前登入使用者。

**權限**：需 session

**成功** `200`：

```json
{
  "id": 1,
  "email": "user@example.com",
  "displayName": "訓練家小明",
  "bio": "",
  "avatarUrl": null,
  "gender": "MALE",
  "age": 20,
  "profileComplete": true,
  "profileMissingFields": [],
  "battleRecordVisibility": "PUBLIC",
  "winrateVisibility": "PUBLIC",
  "defaultShopId": null,
  "isAdmin": false
}
```

**錯誤**：`401` 未登入或停權（`SUSPENDED`）；`404` 使用者不存在

---

### POST /api/auth/forgot-password

寄送臨時密碼至註冊信箱。為防止帳號枚舉，不論 email 是否存在皆回相同訊息。

**權限**：無

**請求體**：`{ "email": "user@example.com" }`

**成功** `200`：

```json
{
  "ok": true,
  "message": "若此電子郵件已註冊，我們已寄出密碼重設信，請查收信箱。"
}
```

---

### POST /api/auth/change-password

**權限**：需 session

**請求體**：`{ "currentPassword": "...", "newPassword": "..." }`（新密碼 ≥ 8 字元）

**成功** `200`：`{ "ok": true }`

---

### POST /api/auth/change-email

**權限**：需 session

**請求體**：`{ "newEmail": "new@example.com", "currentPassword": "..." }`

**成功** `200`：`{ "ok": true }`

**錯誤**：`409` email 已被使用

---

### POST /api/auth/update-profile

更新個人檔案（含性別、年齡、頭像、橫幅）。

**權限**：需 session

**請求**：`multipart/form-data`

| 欄位 | 必填 | 說明 |
|------|------|------|
| displayName | 是 | ≤ 50 字 |
| bio | 否 | ≤ 500 字 |
| gender | 否 | MALE / FEMALE / OTHER |
| age | 否 | 整數 |
| avatar | 否 | JPEG/PNG/WebP，≤ 2MB |
| banner | 否 | JPEG/PNG/WebP，≤ 3MB |

**成功** `200`：使用者欄位 + `bannerUrl`、`profileComplete`、`profileMissingFields`

---

### POST /api/auth/update-privacy

**權限**：需 session

**請求體**：

```json
{
  "battleRecordVisibility": "PUBLIC",
  "winrateVisibility": "FRIENDS"
}
```

可見性：`PUBLIC` | `FRIENDS` | `PRIVATE`

**成功** `200`：`{ "id", "displayName", "battleRecordVisibility", "winrateVisibility" }`

---

## 2. 牌組 API

### GET /api/decks

列出目前使用者的牌組（依 `sortOrder` 排序）。

**權限**：需 session

**成功** `200`：

```json
[
  {
    "id": "clx...",
    "name": "皮卡丘 ex",
    "visibility": "PUBLIC",
    "cardCount": 60
  }
]
```

> 回應欄位 `name` 對應資料庫 `title`。

---

### GET /api/decks/{id}

取得牌組詳情。

**權限**：需 session

**Query**：`viewOnly=true` — 可讀取他人 `PUBLIC` 或好友可見（`FRIENDS`）牌組

**成功** `200`：`{ id, userId, title, notes, visibility, deckJson, createdAt, updatedAt }`

**錯誤**：`403` 無權限；`404` 不存在

---

### PATCH /api/decks/{id}

儲存牌組內容（僅擁有者可寫）。

**請求體**：`{ "deckJson": "..." }`

**成功** `200`：`{ "success": true, "deck": { ... } }`

---

### DELETE /api/decks/{id}

刪除牌組（僅擁有者）。

**成功** `200`：`{ "success": true }`

---

### PATCH /api/decks/reorder

調整牌組顯示順序。

**請求體**：`{ "deckIds": ["id1", "id2", ...] }` — 須包含該使用者**全部**牌組 ID，不可重複

**成功** `200`：`{ "ok": true }`

**錯誤**：`400` — `INVALID_BODY` / `DUPLICATE_IDS` / `INCOMPLETE_ORDER` / `INVALID_DECK`

---

## 3. 卡牌圖鑑 API

### GET /api/cards

分頁查詢卡牌資料庫。**無需登入**。

**Query 參數**：

| 參數 | 預設 | 說明 |
|------|------|------|
| page | 1 | 頁碼 |
| limit | 20 | 每頁筆數 |
| category | — | POKEMON、支援者、物品、寶可夢道具、競技場、ENERGY |
| type | — | 寶可夢屬性（category=POKEMON 時） |
| stage | — | 進化階段 |
| search | — | 名稱關鍵字 |

**成功** `200`：

```json
{
  "cards": [ { "id": 1, "name": "皮卡丘", "category": "POKEMON", ... } ],
  "totalPages": 10,
  "currentPage": 1,
  "hasMore": true
}
```

---

## 4. 約戰／配對 API

### GET /api/battle/queue

查詢隨機配對佇列狀態。

**權限**：需 session

**成功** `200`（未在佇列）：

```json
{ "inQueue": false }
```

**成功** `200`（在佇列中）：

```json
{
  "inQueue": true,
  "shopId": "shop_abc",
  "shopName": "某卡店",
  "scope": "shop",
  "joinedAt": "2026-06-12T10:00:00.000Z",
  "lat": 25.03,
  "lng": 121.56,
  "radiusKm": 5,
  "playFormat": "OPEN"
}
```

`scope`：`shop`（同店優先）或 `any`（全站）；`playFormat`：`OPEN` | `STANDARD` | `ANY`

---

### GET /api/battle/snapshot

地圖約戰公告快照（對戰頁 `/battle` 使用）。

**權限**：需 session

**成功** `200`：

```json
{
  "announcements": [
    {
      "spotId": "clx...",
      "userId": 2,
      "displayName": "對手",
      "lat": 25.03,
      "lng": 121.56,
      "label": "台北車站",
      "playNote": "打標準賽",
      "playFormat": "STANDARD",
      "expiresAt": "2026-06-12T14:00:00.000Z",
      "deck": { "id": "...", "title": "...", "visibility": "PUBLIC", "canViewCards": true }
    }
  ],
  "myAnnouncement": null
}
```

---

### GET /api/battle/deck-preview

預覽透過公告或對戰披露的牌組卡表。

**權限**：需 session

**Query**（必填 `deckId`，另需 `spotId` 或 `matchId` 其一）：

```
/api/battle/deck-preview?deckId=xxx&spotId=yyy
/api/battle/deck-preview?deckId=xxx&matchId=42
```

**成功** `200`：`{ id, title, visibility, canViewCards, cards: [...] }`

**錯誤**：`403` 牌組未公開；`404` 找不到

---

### POST /api/battles

提交或確認對戰結果（雙方皆同意後對戰完成）。

**權限**：需 session，且為對戰參與者

**請求體**：

```json
{
  "matchId": 42,
  "winnerId": 1,
  "addFriend": false
}
```

**成功** `200`：

```json
{
  "battleResult": {
    "id": "clx...",
    "matchId": 42,
    "winnerId": 1,
    "playerAAgreed": true,
    "playerBAgreed": false,
    "status": "PENDING"
  }
}
```

雙方同意且勝者一致時 `status` 為 `AGREED`，對戰狀態改為 `COMPLETED`。`addFriend: true` 時會建立好友邀請。

**錯誤**：`400` 對戰非進行中；`403` 非參與者

---

## 5. 對戰 API

### GET /api/matches/active

取得目前進行中的對戰與待確認戰績。

**權限**：需 session

**成功** `200`：

```json
{
  "activeMatch": {
    "id": 42,
    "status": "ACCEPTED",
    "playerAId": 1,
    "playerBId": 2,
    "playerAReady": false,
    "playerBReady": false,
    "meetLat": 25.03,
    "meetLng": 121.56,
    "meetLabel": "某卡店",
    "playerA": { "id": 1, "displayName": "...", "gender": "MALE", "age": 20 },
    "playerB": { "id": 2, "displayName": "...", "gender": "FEMALE", "age": 22 },
    "myDeck": null,
    "theirDeck": null
  },
  "battleResult": null
}
```

無進行中對戰時 `activeMatch` 為 `null`。

---

### GET /api/matches/{matchId}/messages

對戰聊天紀錄。對戰狀態須為 `ACCEPTED` 或 `IN_PROGRESS`。

**權限**：需 session，且為對戰參與者

**Query**：`afterTime`（ISO 8601，可選）— 增量拉取

**成功** `200`：

```json
{
  "messages": [
    {
      "id": "clx...",
      "senderId": 1,
      "body": "到了",
      "createdAt": "2026-06-12T10:00:00.000Z",
      "sender": { "id": 1, "displayName": "小明" }
    }
  ]
}
```

最多回傳 200 則。

---

### POST /api/matches/{matchId}/messages

發送對戰聊天訊息（最長 4000 字）。

**請求體**：`{ "body": "訊息內容" }`

**成功** `200`：`{ "message": { ... } }`

**錯誤**：`400` `BAD_JSON` / `EMPTY`；`404` 非參與者或狀態不允許

---

## 6. 好友 API

### PATCH /api/friendships/{friendshipId}

接受或拒絕好友邀請（僅受邀者可操作）。

**權限**：需 session

**請求體**：`{ "action": "ACCEPT" }` 或 `{ "action": "REJECT" }`

**成功** `200`：

```json
{
  "success": true,
  "message": "好友請求已接受"
}
```

> 發送好友邀請無 REST 端點，請使用 Server Action `sendFriendRequest`（見附錄）。

---

### GET /api/friendships/{friendshipId}/messages

好友私訊紀錄（分頁）。

**Query**：`afterTime`、`offset`（預設 0）、`limit`（預設 30）

**成功** `200`：

```json
{
  "messages": [ ... ],
  "totalCount": 100,
  "offset": 0,
  "limit": 30,
  "hasMore": true
}
```

**錯誤**：`403` `BLOCKED`（雙方任一方封鎖）

---

### POST /api/friendships/{friendshipId}/messages

發送好友私訊。

**請求體**：`{ "body": "..." }`

**成功** `200`：`{ "message": { ... } }`

---

## 7. 通知 API

### GET /api/notifications

**Query**：`limit`（預設 50，最大 200）、`skip`（預設 0）、`unreadOnly=true`

**成功** `200`：

```json
{
  "notifications": [
    {
      "id": "clx...",
      "type": "MESSAGE",
      "senderId": 2,
      "referenceId": "msg_id",
      "data": "對手 在約戰中傳來訊息",
      "read": false,
      "createdAt": "2026-06-12T10:00:00.000Z"
    }
  ],
  "unreadCount": 3,
  "total": 10
}
```

---

### PUT /api/notifications

標記單則通知已讀。

**請求體**：`{ "notificationId": "clx..." }`

**成功** `200`：`{ "success": true }`

---

### POST /api/notifications/mark-all-read

全部標記已讀。

**成功** `200`：`{ "success": true }`

---

## 8. 封鎖 API

### GET /api/blocks

列出目前使用者封鎖的名單（唯讀；封鎖／解除封鎖見 Server Actions）。

**成功** `200`：

```json
[
  {
    "id": 5,
    "displayName": "某人",
    "avatarUrl": null,
    "blockedAt": "2026-06-01T00:00:00.000Z"
  }
]
```

---

## 9. 搜尋 API

### GET /api/search

搜尋使用者、有效約戰地點、卡店。

**Query**：`q`（至少 2 字元；不足則回 `[]`）

**成功** `200`（混合陣列，以 `type` 區分）：

```json
[
  { "type": "user", "id": 2, "displayName": "小明", "avatarUrl": null },
  { "type": "spot", "id": "clx...", "label": "台北車站" },
  { "type": "shop", "id": "shop_1", "name": "某卡店", "addressNote": "..." }
]
```

排除自己與已封鎖使用者；使用者最多 10 筆、地點 10 筆、店家 8 筆。

---

## 10. 頭像 API

### GET /api/avatar/{userId}

從 `Avatar` 資料表讀取二進位頭像。**無需登入**。

**成功** `200`：圖片二進位，`Content-Type` 為儲存的 MIME

**錯誤** `404`：純文字 `Not Found`

> 多數使用者頭像存於 `User.avatarUrl`（data URL）；此端點供獨立上傳至 `Avatar` 表的備援路徑。

---

## 11. 即時推送 API

### GET /api/realtime/stream

Server-Sent Events（SSE）長連線，推送對戰、聊天、通知更新。

**權限**：需 session

**回應**：`Content-Type: text/event-stream`

連線後第一則事件：

```json
{ "type": "connected" }
```

其後可能收到的事件型別：

| type | 說明 |
|------|------|
| `match.updated` | 對戰狀態變更（含 `activeMatch`、`battleResult`） |
| `match.completed` | 對戰完成（含分享 `share` payload） |
| `message.new` | 新訊息（`channel`: `match` 或 `friend`） |
| `notification.new` | 未讀通知數 `unreadCount` 更新 |

每 25 秒送 `: ping` 維持連線。斷線時前端以輪詢 API 作 fallback（見 README「即時同步」）。

**錯誤** `401`：純文字 `Unauthorized`

---

## 12. 錯誤碼參考

| HTTP | 常見 `error` 值 | 說明 |
|------|-----------------|------|
| 400 | 各種驗證訊息 | 參數錯誤 |
| 401 | `UNAUTHORIZED`、中文訊息 | 未登入或認證失敗 |
| 403 | `FORBIDDEN`、`BLOCKED` | 無權限或已封鎖 |
| 404 | `NOT_FOUND` | 資源不存在 |
| 409 | — | 衝突（email 重複等） |
| 500 | `INTERNAL_SERVER_ERROR` | 伺服器錯誤 |

回應格式不統一：多數為 `{ "error": "..." }`，成功時有 `{ "ok": true }`、`{ "success": true }` 或直接回傳資料物件。

---

## 附錄 A：Server Actions

Next.js App Router 中，表單提交與頁面互動多透過 Server Actions（`"use server"`）呼叫，**不是** REST endpoint。以下供對照完整後端能力；實作位於 [`src/actions/`](src/actions/)。

### match.ts — 約戰生命週期

| 函式 | 說明 |
|------|------|
| `sendInviteFromSpot` | 從地圖公告或店家大廳向對手發起約戰邀請 |
| `setMatchDeck` | 為進行中對戰選擇要披露的牌組 |
| `acceptInvite` / `rejectInvite` | 接受或拒絕邀請 |
| `setReady` | 標記「我準備好了」 |
| `cancelMatch` | 請求取消（需雙方同意） |
| `rejectCancelRequest` | 拒絕對方的取消請求 |
| `finishMatch` | 提交戰績（與 `POST /api/battles` 互補） |
| `resetBattleResult` | 重設待確認戰績 |
| `requestFriendAfterMatch` | 賽後發送好友邀請 |
| `updateMatchNotes` | 更新賽後備註 |

### meetSpot.ts — 地圖公告

| 函式 | 說明 |
|------|------|
| `publishBattleAnnouncement` | 在地圖發布約戰公告（地點、說明、時長、牌組等） |
| `clearBattleAnnouncement` | 清除自己的公告 |
| `fetchShopLobby` | 取得店家大廳玩家列表 |
| `refreshShops` | 重新載入店家資料 |

### matchQueue.ts — 隨機配對

| 函式 | 說明 |
|------|------|
| `joinRandomQueue` | 加入隨機配對佇列（可指定店家、地圖中心、半徑、賽制） |
| `leaveRandomQueue` | 離開佇列 |
| `getMyQueueStatus` | 佇列狀態（`GET /api/battle/queue` 內部使用） |

### friends.ts — 好友（與 REST 重疊處）

| 函式 | 說明 |
|------|------|
| `acceptFriendship` / `rejectFriendship` | 同 `PATCH /api/friendships/{id}`，UI 表單路徑 |
| `sendFriendMessage` | 同 `POST .../messages`，部分頁面直接呼叫 |

### profile.ts

| 函式 | 說明 |
|------|------|
| `updateProfile` | 表單版更新檔案（REST 版見 `POST /api/auth/update-profile`） |
| `removeAvatar` | 移除頭像 |
| `sendFriendRequest` | 發送好友邀請（無對應 REST） |

### decks.ts

| 函式 | 說明 |
|------|------|
| `createDeck` / `submitCreateDeck` | 建立牌組 |
| `deleteDeck` | 刪除牌組 |
| `updateDeckVisibility` | 變更牌組可見性 |
| `updateDeck` | 更新牌組標題、備註等 |

### moderation.ts

| 函式 | 說明 |
|------|------|
| `reportUser` | 檢舉使用者 |
| `reportMatchOpponent` | 對戰中檢舉對手 |
| `blockUser` / `unblockUser` | 封鎖／解除（列表見 `GET /api/blocks`） |
| `viewerHasBlocked` | 查詢是否已封鎖 |

### shops.ts — 店家回報（管理員）

| 函式 | 說明 |
|------|------|
| `submitShopReport` | 使用者回報店家資訊問題 |
| `getShopReports` | 管理員取得回報列表 |
| `resolveShopReport` / `dismissShopReport` / `replyToShopReport` | 處理回報 |

### admin.ts

| 函式 | 說明 |
|------|------|
| `suspendUser` / `unsuspendUser` | 停權／解除停權 |

### geocode.ts

| 函式 | 說明 |
|------|------|
| `searchPlaces` | 地圖地點搜尋（Nominatim），對戰頁搜尋欄使用 |

---

## 版本歷史

| 版本 | 日期 | 說明 |
|------|------|------|
| 2.0 | 2026-06 | 對齊現行 27 個 API route；新增 openapi.yaml；補齊約戰／對戰／通知／即時端點 |
| 1.0 | 2025-01 | 初版（已過時） |
