# 簡介

本文件為 CardMatch REST API（`/api/*`）之介面規格說明。

本系統之網頁前端主要透過 Next.js Server Actions（`src/actions/*`）進行資料互動；本文件僅涵蓋可經 HTTP 客戶端（`fetch`、SSE 等）直接呼叫之 REST 路由。機器可讀規格見 [`docs/openapi.yaml`](docs/openapi.yaml)。

本文件與 OpenAPI 規格並行維護。若兩者不一致，以 `src/app/api/` 下之 route handler 實作為準。

---


# 通用規範

## 路由命名

以下路由均以 `/api/` 為前綴，相對於部署主機之根路徑。

## 內容類型

| 類型 | 適用路由 |
|------|----------|
| `application/json` | 多數 POST／PATCH／PUT 請求及回應 |
| `multipart/form-data` | `POST /api/auth/update-profile` |
| 二進位（依儲存 MIME） | `GET /api/avatar/{userId}` |
| `text/event-stream` | `GET /api/realtime/stream` |

## 回應格式

成功回應尚未完全統一，可能為 `{ "ok": true }`、`{ "success": true }`，或直接回傳資料物件／陣列。錯誤回應多為 `{ "error": "<訊息或代碼>" }`；部分路由回傳純文字（如頭像 `404`、SSE `401`）。

## 分頁與上限

| 路由 | 說明 |
|------|------|
| `GET /api/cards` | `page` 預設 1；`limit` 預設 20 |
| `GET /api/matches/{matchId}/messages` | 單次最多 200 則 |
| `GET /api/friendships/{friendshipId}/messages` | `limit` 預設 30；支援 `offset` |
| `GET /api/notifications` | `limit` 預設 50、上限 200；`skip` 分頁 |
| `GET /api/search` | 使用者 10 筆、地點 10 筆、店家 8 筆 |

---

# 認證

## Session 機制

本 API 採用 [iron-session](https://github.com/vvo/iron-session) 加密 Cookie 管理 Session。

| 項目 | 值 |
|------|-----|
| Cookie 名稱 | `cardmatch_session` |
| 設定時機 | `POST /api/auth/login` 或 `POST /api/auth/register` 成功後 |
| 清除時機 | `POST /api/auth/logout` |
| 正式環境 | Cookie 帶 `secure` 屬性（須 HTTPS） |

需 Session 之路由，客戶端須於請求中附帶上述 Cookie。瀏覽器環境下 Cookie 由使用者代理自動附加；非瀏覽器客戶端須自行管理 Cookie 儲存與轉發。

## 停權帳號

若帳號遭停權，登入請求回傳 `403 Forbidden`。已建立之 Session 於 `GET /api/auth/me` 回傳 `401 Unauthorized`，`error` 為 `SUSPENDED`。

## 公開路由

以下路由無須 Session：

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `GET /api/cards`
- `GET /api/avatar/{userId}`

其餘路由預設須有效 Session。

---

# 錯誤

| HTTP | 常見 `error` | 說明 |
|------|-------------|------|
| 400 | 驗證訊息、`BAD_JSON`、`EMPTY`、`INVALID_BODY`、`DUPLICATE_IDS`、`INCOMPLETE_ORDER`、`INVALID_DECK` | 請求參數無效 |
| 401 | `UNAUTHORIZED`、`SUSPENDED` | 未認證或認證失敗 |
| 403 | `FORBIDDEN`、`BLOCKED` | 權限不足或遭封鎖 |
| 404 | `NOT_FOUND` | 資源不存在 |
| 409 | — | 資源衝突（如 email 重複） |
| 500 | `INTERNAL_SERVER_ERROR` | 伺服器內部錯誤 |

錯誤訊息可能為中文或英文。程式處理時建議優先依 HTTP 狀態碼及機器可讀代碼判斷。

---

# 認證 API

## 登入

**權限：** 公開

驗證使用者憑證並建立 Session。

**請求：** `POST /api/auth/login`

**Content-Type：** `application/json`

#### Body 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| email | string | 是 | 使用者電子信箱 |
| password | string | 是 | 使用者密碼 |

**回應：** 成功時回傳 `200 OK` 及 [OkResponse](#okresponse)，並設定 Session Cookie。

**錯誤：** 若憑證無效回傳 `401 Unauthorized`；若帳號遭停權回傳 `403 Forbidden`。

---

## 登出

**權限：** 公開

清除 Session Cookie。無論伺服器端是否存有該 Session，皆回傳成功狀態。

**請求：** `POST /api/auth/logout`

**回應：** 成功時回傳 `200 OK` 及 [OkResponse](#okresponse)。

---

## 註冊

**權限：** 公開

建立新帳號並自動登入（Session 行為同登入）。

**請求：** `POST /api/auth/register`

**Content-Type：** `application/json`

#### Body 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| email | string | 是 | 有效 email 格式；系統自動轉為小寫儲存 |
| password | string | 是 | 長度至少 8 字元 |
| displayName | string | 是 | 顯示名稱，1–40 字 |

**回應：** 成功時回傳 `200 OK` 及 [OkResponse](#okresponse)，並設定 Session Cookie。

**錯誤：** 驗證失敗回傳 `400`；email 已註冊回傳 `409 Conflict`。

---

## 取得目前使用者

**權限：** 需 Session

**請求：** `GET /api/auth/me`

**回應：** 成功時回傳 `200 OK` 及 [UserProfile](#userprofile) 物件。

**錯誤：** 未登入或 Session 無效回傳 `401`（`UNAUTHORIZED`）；停權回傳 `401`（`SUSPENDED`）；使用者不存在回傳 `404`。

---

## 忘記密碼

**權限：** 公開

若電子信箱已註冊，寄送臨時密碼至該信箱。為防止帳號枚舉，不論 email 是否存在皆回傳相同訊息。

**請求：** `POST /api/auth/forgot-password`

**Content-Type：** `application/json`

#### Body 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| email | string | 是 | 有效 email 格式 |

**回應：** 成功時回傳 `200 OK` 及 `{ "ok": true, "message": "<通用訊息>" }`。

---

## 變更密碼

**權限：** 需 Session

**請求：** `POST /api/auth/change-password`

**Content-Type：** `application/json`

#### Body 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| currentPassword | string | 是 | 目前密碼 |
| newPassword | string | 是 | 新密碼，長度至少 8 字元 |

**回應：** 成功時回傳 `200 OK` 及 [OkResponse](#okresponse)。

**錯誤：** 目前密碼不正確回傳 `401`。

---

## 變更 email

**權限：** 需 Session

**請求：** `POST /api/auth/change-email`

**Content-Type：** `application/json`

#### Body 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| newEmail | string | 是 | 新 email，有效格式 |
| currentPassword | string | 是 | 目前密碼 |

**回應：** 成功時回傳 `200 OK` 及 [OkResponse](#okresponse)。

**錯誤：** 新 email 已被使用回傳 `409`。

---

## 更新個人檔案

**權限：** 需 Session

更新顯示名稱、簡介、性別、年齡、頭像及橫幅。

**請求：** `POST /api/auth/update-profile`

**Content-Type：** `multipart/form-data`

#### Body 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| displayName | string | 是 | 顯示名稱，最多 50 字 |
| bio | string | 否 | 個人簡介，最多 500 字 |
| gender | string | 否 | `MALE`、`FEMALE` 或 `OTHER` |
| age | integer | 否 | 年齡 |
| avatar | file | 否 | JPEG／PNG／WebP，最大 2 MB |
| banner | file | 否 | JPEG／PNG／WebP，最大 3 MB |

**回應：** 成功時回傳 `200 OK` 及更新後之使用者欄位，含 `bannerUrl`、`profileComplete`、`profileMissingFields`。

---

## 更新隱私設定

**權限：** 需 Session

**請求：** `POST /api/auth/update-privacy`

**Content-Type：** `application/json`

#### Body 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| battleRecordVisibility | string | 是 | 戰績可見性，見 [Visibility](#visibility) |
| winrateVisibility | string | 是 | 勝率可見性，見 [Visibility](#visibility) |

**回應：** 成功時回傳 `200 OK` 及 `{ id, displayName, battleRecordVisibility, winrateVisibility }`。

---

# 牌組 API

牌組建立、標題／備註修改及可見性變更由 Server Actions 處理，見 [Server Actions](#server-actions)。本節路由負責列表、讀取、卡表儲存、刪除及排序。

## 列出牌組

**權限：** 需 Session

回傳目前使用者之牌組列表，依 `sortOrder` 排序。

**請求：** `GET /api/decks`

**回應：** 成功時回傳 `200 OK` 及 [DeckSummary](#decksummary) 陣列。回應欄位 `name` 對應資料庫欄位 `title`。

---

## 取得牌組

**權限：** 需 Session

**請求：** `GET /api/decks/{id}`

#### URL 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| id | string | 是 | 牌組 ID |

#### Query 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| viewOnly | string | 否 | 設為 `true` 時，可讀取他人 `PUBLIC` 牌組，或 `FRIENDS` 且為已接受好友之牌組。未帶此參數時僅擁有者可讀 |

**回應：** 成功時回傳 `200 OK` 及 [DeckDetail](#deckdetail) 物件。

**錯誤：** 無讀取權限回傳 `403`；不存在回傳 `404`。

---

## 儲存牌組卡表

**權限：** 需 Session（僅擁有者）

更新牌組卡表內容（`deckJson`）。

**請求：** `PATCH /api/decks/{id}`

**Content-Type：** `application/json`

#### URL 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| id | string | 是 | 牌組 ID |

#### Body 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| deckJson | string | 是 | 牌組卡表 JSON 字串 |

**回應：** 成功時回傳 `200 OK` 及 [SuccessResponse](#successresponse)（含完整 `deck` 物件）。

---

## 刪除牌組

**權限：** 需 Session（僅擁有者）

**請求：** `DELETE /api/decks/{id}`

#### URL 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| id | string | 是 | 牌組 ID |

**回應：** 成功時回傳 `200 OK` 及 [SuccessResponse](#successresponse)。

**錯誤：** 非擁有者回傳 `403`；不存在回傳 `404`。

---

## 調整牌組順序

**權限：** 需 Session

**請求：** `PATCH /api/decks/reorder`

**Content-Type：** `application/json`

#### Body 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| deckIds | string[] | 是 | 該使用者全部牌組 ID，須完整且不可重複 |

**回應：** 成功時回傳 `200 OK` 及 [OkResponse](#okresponse)。

**錯誤：** `400` 時 `error` 可能為 `INVALID_BODY`、`DUPLICATE_IDS`、`INCOMPLETE_ORDER`、`INVALID_DECK`。

---

# 卡牌圖鑑 API

## 搜尋卡牌

**權限：** 公開

分頁查詢卡牌資料庫。

**請求：** `GET /api/cards`

#### Query 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| page | integer | 否 | 頁碼，預設 1 |
| limit | integer | 否 | 每頁筆數，預設 20 |
| category | string | 否 | 類別篩選，見 [CardCategoryFilter](#cardcategoryfilter) |
| type | string | 否 | 寶可夢屬性；僅 `category=POKEMON` 時有效 |
| stage | string | 否 | 進化階段；僅 `category=POKEMON` 時有效 |
| search | string | 否 | 名稱關鍵字（子字串比對） |

**回應：** 成功時回傳 `200 OK` 及 [CardListResponse](#cardlistresponse)。

---

# 約戰 API

約戰邀請、接受對戰、地圖公告發布及隨機配對佇列之寫入操作由 Server Actions 處理，不在此列。

## 取得配對佇列狀態

**權限：** 需 Session

**請求：** `GET /api/battle/queue`

**回應：** 成功時回傳 `200 OK`。未在佇列時 `{ "inQueue": false }`；在佇列中時回傳佇列詳情（`shopId`、`shopName`、`scope`、`joinedAt`、`lat`、`lng`、`radiusKm`、`playFormat`）。

---

## 取得約戰地圖快照

**權限：** 需 Session

供對戰頁 `/battle` 使用之地圖公告快照。

**請求：** `GET /api/battle/snapshot`

**回應：** 成功時回傳 `200 OK` 及 `{ announcements: MapAnnouncement[], myAnnouncement: MapAnnouncement | null }`。

---

## 預覽披露牌組

**權限：** 需 Session

取得透過公告或對戰披露之牌組卡表。

**請求：** `GET /api/battle/deck-preview`

#### Query 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| deckId | string | 是 | 牌組 ID |
| spotId | string | 條件必填 | 公告 spot ID；須與 `matchId` 擇一提供 |
| matchId | integer | 條件必填 | 對戰 ID；須與 `spotId` 擇一提供 |

**回應：** 成功時回傳 `200 OK` 及 [DeckSummaryWithCards](#decksummarywithcards)。

**錯誤：** 牌組未披露回傳 `403`；不存在回傳 `404`。

---

## 提交對戰結果

**權限：** 需 Session（須為對戰參與者）

對戰狀態須為 `IN_PROGRESS`。雙方提交相同勝者且一致時，戰績 `status` 為 `AGREED`，對戰狀態改為 `COMPLETED`。

**請求：** `POST /api/battles`

**Content-Type：** `application/json`

#### Body 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| matchId | integer | 是 | 對戰 ID |
| winnerId | integer | 是 | 勝者使用者 ID，須為 `playerAId` 或 `playerBId` |
| addFriend | boolean | 否 | 為 `true` 時，戰績確認後向對手發送好友邀請 |

**回應：** 成功時回傳 `200 OK` 及 `{ "battleResult": BattleResult }`。見 [BattleResult](#battleresult)。

**錯誤：** 非參與者回傳 `403`；對戰非進行中回傳 `400`。

---

# 對戰 API

邀請流程、準備狀態及取消對戰由 Server Actions 處理。

## 取得進行中對戰

**權限：** 需 Session

**請求：** `GET /api/matches/active`

**回應：** 成功時回傳 `200 OK` 及 `{ activeMatch: ActiveMatch | null, battleResult: BattleResult | null }`。無進行中對戰時 `activeMatch` 為 `null`。

---

## 取得對戰聊天

**權限：** 需 Session（須為對戰參與者）

對戰狀態須為 `ACCEPTED` 或 `IN_PROGRESS`。

**請求：** `GET /api/matches/{matchId}/messages`

#### URL 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| matchId | integer | 是 | 對戰 ID |

#### Query 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| afterTime | string | 否 | ISO 8601 時間戳；僅回傳此時間之後的訊息 |

**回應：** 成功時回傳 `200 OK` 及 `{ "messages": ChatMessage[] }`，最多 200 則。

---

## 發送對戰訊息

**權限：** 需 Session（須為對戰參與者）

**請求：** `POST /api/matches/{matchId}/messages`

**Content-Type：** `application/json`

#### URL 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| matchId | integer | 是 | 對戰 ID |

#### Body 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| body | string | 是 | 訊息內容，trim 後最長 4000 字 |

**回應：** 成功時回傳 `200 OK` 及 `{ "message": ChatMessage }`。同時為對手建立通知並推送 Realtime 事件。

---

# 好友 API

發送好友邀請無 REST 端點，請使用 `sendFriendRequest` Server Action。

## 接受或拒絕好友邀請

**權限：** 需 Session（僅受邀者）

邀請須仍為 `PENDING` 狀態。

**請求：** `PATCH /api/friendships/{friendshipId}`

**Content-Type：** `application/json`

#### URL 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| friendshipId | string | 是 | 好友關係 ID |

#### Body 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| action | string | 是 | `ACCEPT` 或 `REJECT`；拒絕時刪除 pending 記錄 |

**回應：** 成功時回傳 `200 OK` 及 `{ "success": true, "message": "<訊息>" }`。

**錯誤：** 非受邀者回傳 `403`；邀請已處理回傳 `400`。

---

## 取得好友私訊

**權限：** 需 Session（須為已接受之好友關係）

**請求：** `GET /api/friendships/{friendshipId}/messages`

#### URL 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| friendshipId | string | 是 | 好友關係 ID |

#### Query 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| afterTime | string | 否 | ISO 8601 時間戳，增量拉取 |
| offset | integer | 否 | 分頁偏移，預設 0 |
| limit | integer | 否 | 每頁筆數，預設 30 |

**回應：** 成功時回傳 `200 OK` 及 [FriendMessageListResponse](#friendmessagelistresponse)。

**錯誤：** 任一方封鎖對方回傳 `403`（`BLOCKED`）。

---

## 發送好友私訊

**權限：** 需 Session（須為已接受之好友關係）

封鎖規則同 GET。

**請求：** `POST /api/friendships/{friendshipId}/messages`

**Content-Type：** `application/json`

#### URL 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| friendshipId | string | 是 | 好友關係 ID |

#### Body 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| body | string | 是 | 訊息內容，trim 後最長 4000 字 |

**回應：** 成功時回傳 `200 OK` 及 `{ "message": ChatMessage }`。

---

# 通知 API

## 列出通知

**權限：** 需 Session

**請求：** `GET /api/notifications`

#### Query 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| limit | integer | 否 | 回傳筆數上限，預設 50，最大 200 |
| skip | integer | 否 | 分頁偏移，預設 0 |
| unreadOnly | string | 否 | 設為 `true` 時僅回未讀通知 |

**回應：** 成功時回傳 `200 OK` 及 [NotificationListResponse](#notificationlistresponse)。`data` 欄位由儲存之 JSON 解析，型別依通知類型而異。

---

## 標記單則已讀

**權限：** 需 Session

**請求：** `PUT /api/notifications`

**Content-Type：** `application/json`

#### Body 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| notificationId | string | 是 | 通知 ID |

**回應：** 成功時回傳 `200 OK` 及 [SuccessResponse](#successresponse)。

---

## 全部標記已讀

**權限：** 需 Session

**請求：** `POST /api/notifications/mark-all-read`

**回應：** 成功時回傳 `200 OK` 及 [SuccessResponse](#successresponse)。

---

# 封鎖 API

封鎖及解除封鎖由 Server Actions 處理。本路由為唯讀。

## 列出封鎖名單

**權限：** 需 Session

回傳目前使用者所封鎖之名單（單向）。

**請求：** `GET /api/blocks`

**回應：** 成功時回傳 `200 OK` 及 [BlockedUser](#blockeduser) 陣列。

---

# 搜尋 API

## 全站搜尋

**權限：** 需 Session

搜尋使用者、有效約戰地點及卡店。停權使用者視同未認證。查詢字串少於 2 字元時回傳空陣列。

**請求：** `GET /api/search`

#### Query 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| q | string | 是 | 搜尋字串，至少 2 字元 |

**回應：** 成功時回傳 `200 OK` 及 [SearchResult](#searchresult) 混合陣列。結果排除本人及已封鎖使用者（使用者與地點結果）。

---

# 頭像 API

## 取得頭像

**權限：** 公開

自 `Avatar` 資料表讀取二進位頭像。

**請求：** `GET /api/avatar/{userId}`

#### URL 參數

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| userId | integer | 是 | 使用者 ID |

**回應：** 成功時回傳 `200 OK`，`Content-Type` 為儲存之 MIME，含長期快取標頭。

**錯誤：** 不存在時回傳 `404`，純文字 `Not Found`。

多數使用者頭像存於 `User.avatarUrl`（data URL）；本端點供獨立上傳至 `Avatar` 表之備援路徑。

---

# 即時推送 API

## SSE 事件串流

**權限：** 需 Session

Server-Sent Events 長連線，推送對戰、聊天及通知更新。連線建立後首則事件為 `{ "type": "connected" }`；後續事件見 [RealtimeEvent](#realtimeevent)。每 25 秒傳送 `: ping` 維持連線。

**請求：** `GET /api/realtime/stream`

**回應：** `Content-Type: text/event-stream`。

**錯誤：** 未認證時回傳 `401`，純文字 `Unauthorized`（非 JSON）。

---

# 資料物件

本節定義各端點回應所引用之資料結構，以欄位表格描述 Schema。端點章節以物件名稱交叉引用。

## OkResponse

| 欄位 | 型別 | 說明 |
|------|------|------|
| ok | boolean | 操作成功 |

---

## SuccessResponse

| 欄位 | 型別 | 說明 |
|------|------|------|
| success | boolean | 操作成功 |

部分端點於此基礎上附加額外欄位（如 `deck`、`message`）。

---

## UserProfile

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | integer | 使用者 ID |
| email | string | 登入 email |
| displayName | string | 顯示名稱 |
| bio | string | 個人簡介 |
| avatarUrl | string \| null | 頭像（常為 data URL） |
| gender | string | `MALE`、`FEMALE`、`OTHER` |
| age | integer \| null | 年齡 |
| profileComplete | boolean | 識別資料是否完整 |
| profileMissingFields | string[] | 未完成時缺少的欄位名稱 |
| battleRecordVisibility | string | 見 [Visibility](#visibility) |
| winrateVisibility | string | 見 [Visibility](#visibility) |
| defaultShopId | string \| null | 預設卡店 ID |
| isAdmin | boolean | 使用者 email 列於 `ADMIN_EMAILS` 時為 `true` |

---

## DeckSummary

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | string | 牌組 ID |
| name | string | 牌組名稱（對應 DB 欄位 `title`） |
| visibility | string | 見 [Visibility](#visibility) |
| cardCount | integer | 卡牌張數 |

---

## DeckDetail

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | string | 牌組 ID |
| userId | integer | 擁有者 ID |
| title | string | 牌組標題 |
| notes | string | 備註 |
| visibility | string | 見 [Visibility](#visibility) |
| deckJson | string | 卡表 JSON |
| createdAt | string | ISO 8601 |
| updatedAt | string | ISO 8601 |

---

## DeckSummaryWithCards

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | string | 牌組 ID |
| title | string | 牌組標題 |
| visibility | string | 見 [Visibility](#visibility) |
| canViewCards | boolean | 是否可檢視卡表 |
| cards | DeckCardRow[] \| null | 卡表；不可檢視時為 `null` |

### DeckCardRow

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | integer | 卡牌 ID |
| name | string | 卡牌名稱 |
| imageUrl | string \| null | 圖片 URL |
| count | integer | 張數 |
| category | string | 類別 |

---

## CardListResponse

| 欄位 | 型別 | 說明 |
|------|------|------|
| cards | object[] | 卡牌物件陣列（Prisma `Card` model 欄位） |
| totalPages | integer | 總頁數 |
| currentPage | integer | 目前頁碼 |
| hasMore | boolean | 是否有下一頁 |

---

## ActiveMatch

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | integer | 對戰 ID |
| status | string | 見 [MatchStatus](#matchstatus) |
| invitedById | integer | 發起邀請之使用者 ID |
| playerAId | integer | 玩家 A ID |
| playerBId | integer | 玩家 B ID |
| playerAReady | boolean | 玩家 A 是否準備完成 |
| playerBReady | boolean | 玩家 B 是否準備完成 |
| cancelRequestedBy | integer \| null | 請求取消之使用者 ID |
| meetLat | number | 集合地點緯度 |
| meetLng | number | 集合地點經度 |
| meetLabel | string | 地點標籤 |
| playerA | MatchPlayer | 玩家 A 資訊 |
| playerB | MatchPlayer | 玩家 B 資訊 |
| myDeck | DeckSummaryWithCards \| null | 檢視者披露之牌組 |
| theirDeck | DeckSummaryWithCards \| null | 對手披露之牌組 |

### MatchPlayer

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | integer | 使用者 ID |
| displayName | string | 顯示名稱 |
| avatarUrl | string \| null | 頭像 URL |
| gender | string | 性別 |
| age | integer \| null | 年齡 |

---

## BattleResult

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | string | 戰績記錄 ID |
| matchId | integer | 對戰 ID |
| winnerId | integer \| null | 雙方同意之勝者 ID |
| playerAAgreed | boolean | 玩家 A 是否已確認 |
| playerBAgreed | boolean | 玩家 B 是否已確認 |
| status | string | `PENDING` 或 `AGREED` |

---

## MapAnnouncement

| 欄位 | 型別 | 說明 |
|------|------|------|
| spotId | string | 公告 spot ID |
| userId | integer | 發布者 ID |
| displayName | string | 發布者顯示名稱 |
| avatarUrl | string \| null | 頭像 URL |
| gender | string | 性別 |
| age | integer \| null | 年齡 |
| bio | string | 個人簡介 |
| lat | number | 緯度 |
| lng | number | 經度 |
| label | string | 地點標籤 |
| timeNote | string | 時間備註 |
| playNote | string | 對戰備註 |
| playFormat | string | 見 [PlayFormat](#playformat) |
| shopId | string \| null | 關聯卡店 ID |
| expiresAt | string | 到期時間（ISO 8601） |
| deck | DeckSummaryWithAccess \| null | 披露牌組摘要 |

### DeckSummaryWithAccess

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | string | 牌組 ID |
| title | string | 牌組標題 |
| visibility | string | 見 [Visibility](#visibility) |
| canViewCards | boolean | 是否可檢視卡表 |

---

## ChatMessage

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | string | 訊息 ID |
| senderId | integer | 發送者 ID |
| body | string | 訊息內容 |
| createdAt | string | 建立時間（ISO 8601） |
| sender | MessageSender | 發送者資訊 |

### MessageSender

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | integer | 使用者 ID |
| displayName | string | 顯示名稱 |

---

## FriendMessageListResponse

| 欄位 | 型別 | 說明 |
|------|------|------|
| messages | ChatMessage[] | 訊息列表 |
| totalCount | integer | 符合條件之總筆數 |
| offset | integer | 目前偏移 |
| limit | integer | 每頁筆數 |
| hasMore | boolean | 是否有更多資料 |

---

## NotificationListResponse

| 欄位 | 型別 | 說明 |
|------|------|------|
| notifications | Notification[] | 通知列表 |
| unreadCount | integer | 未讀總數 |
| total | integer | 本次回傳筆數 |

### Notification

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | string | 通知 ID |
| type | string | 通知類型 |
| senderId | integer \| null | 發送者 ID |
| referenceId | string \| null | 關聯資源 ID |
| data | string \| object \| null | 通知內容（由 JSON 解析） |
| read | boolean | 是否已讀 |
| createdAt | string | 建立時間（ISO 8601） |

---

## BlockedUser

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | integer | 被封鎖使用者 ID |
| displayName | string | 顯示名稱 |
| avatarUrl | string \| null | 頭像 URL |
| blockedAt | string | 封鎖時間（ISO 8601） |

---

## RealtimeEvent

`GET /api/realtime/stream` 推送之事件：

| type | 承載 |
|------|------|
| `connected` | — |
| `match.updated` | `{ matchId, activeMatch, battleResult }` |
| `match.completed` | `{ matchId, share }` |
| `message.new` | `{ channel: "match", matchId, message }` 或 `{ channel: "friend", friendshipId, message }` |
| `notification.new` | `{ unreadCount }` |

---

## SearchResult

以 `type` 欄位區分之聯集型別：

| type | 欄位 |
|------|------|
| `user` | `id`, `displayName`, `avatarUrl?` |
| `spot` | `id`, `label` |
| `shop` | `id`, `name`, `addressNote?` |

---

## Visibility

牌組可見性與個人隱私設定共用。

| 值 | 說明 |
|----|------|
| `PUBLIC` | 所有人 |
| `FRIENDS` | 已接受之好友 |
| `PRIVATE` | 僅本人 |

---

## MatchStatus

| 值 | 可聊天 |
|----|--------|
| `INVITE_PENDING` | 否 |
| `ACCEPTED` | 是 |
| `IN_PROGRESS` | 是 |
| `COMPLETED` | 否 |
| `CANCELLED` | 否 |

---

## PlayFormat

| 值 | 說明 |
|----|------|
| `OPEN` | 開放賽制 |
| `STANDARD` | 標準賽制 |
| `ANY` | 不限 |

配對佇列 `scope`：`shop`（同店）或 `any`（全站）。

---

## CardCategoryFilter

`GET /api/cards` 之 `category` 參數接受值：

| 值 | 說明 |
|----|------|
| `POKEMON` | 寶可夢卡 |
| `支援者` | 支援者卡 |
| `物品` | 物品卡 |
| `寶可夢道具` | 寶可夢道具卡 |
| `競技場` | 競技場卡 |
| `ENERGY` | 能量卡 |

---

# Server Actions

Next.js 前端之寫入操作主要透過 [`src/actions/`](src/actions/) 下之 `"use server"` 函式完成。**非 HTTP 路由。**

| 模組 | 函式 |
|------|------|
| `match.ts` | `sendInviteFromSpot`、`setMatchDeck`、`acceptInvite`、`rejectInvite`、`setReady`、`cancelMatch`、`rejectCancelRequest`、`finishMatch`、`resetBattleResult`、`requestFriendAfterMatch`、`updateMatchNotes` |
| `meetSpot.ts` | `publishBattleAnnouncement`、`clearBattleAnnouncement`、`fetchShopLobby`、`refreshShops` |
| `matchQueue.ts` | `joinRandomQueue`、`leaveRandomQueue`、`getMyQueueStatus` |
| `friends.ts` | `acceptFriendship`、`rejectFriendship`、`sendFriendMessage` |
| `profile.ts` | `updateProfile`、`removeAvatar`、`sendFriendRequest` |
| `decks.ts` | `createDeck`、`submitCreateDeck`、`deleteDeck`、`updateDeckVisibility`、`updateDeck` |
| `moderation.ts` | `reportUser`、`reportMatchOpponent`、`blockUser`、`unblockUser`、`viewerHasBlocked` |
| `shops.ts` | `submitShopReport`、`getShopReports`、`resolveShopReport`、`dismissShopReport`、`replyToShopReport` |
| `admin.ts` | `suspendUser`、`unsuspendUser` |
| `geocode.ts` | `searchPlaces` |

部分 Server Action 與 REST 端點功能重疊（如 `acceptFriendship` ↔ `PATCH /api/friendships/{id}`）；其餘無對應 REST 端點（如 `sendFriendRequest`、`joinRandomQueue`）。
