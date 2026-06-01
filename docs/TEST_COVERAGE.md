# CardMatch 測試覆蓋說明

本文件記錄專案中 **單元測試（Unit）**、**整合測試（Integration）** 與 **端對端測試（E2E）** 的範圍與執行方式。

## 如何執行

| 指令 | 說明 |
|------|------|
| `npm run test:unit` | Vitest：僅 `tests/unit/` |
| `npm run test:integration` | Vitest：僅 `tests/integration/`（需本機 Postgres `cardmatch_test`） |
| `npm test` | Vitest：全部單元 + 整合 |
| `npm run test:e2e` | Playwright：需先 `npm run build`，E2E 使用 `cardmatch_test` 資料庫 |
| `npm run test:ci` | Lint + unit + integration + build + e2e（CI 用） |

環境變數預設見 `tests/setup.ts`、`.env.test.example`。整合／E2E 會執行 `prisma migrate deploy`。

---

## 功能對照總覽

| 功能領域 | Unit | Integration | E2E |
|----------|:----:|:-----------:|:---:|
| 註冊／登入／忘記密碼 | — | ✅ | ✅ |
| 對戰邀請與生命週期 | — | ✅ | ✅ |
| 準備／開戰（IN_PROGRESS） | — | ✅ | ✅ |
| 對戰結果確認與分享 | ✅ | ✅ | — |
| 取消約戰（雙方同意） | — | ✅ | — |
| 對戰中檢舉對手 | ✅ | ✅ | ✅ |
| 個人檔案檢舉／封鎖 | — | ✅ | — |
| 地圖公告／首頁即時動態 | — | ✅ | ✅ |
| 訪客瀏覽對戰地圖 | — | — | ✅ |
| 地圖座標／導航連結 | ✅ | — | — |
| 距離／地理計算 | ✅ | — | — |
| 店家營業時間 | ✅ | — | — |
| 地址搜尋（Nominatim 正規化） | ✅ | — | — |
| 通知文案顯示 | ✅ | — | — |
| 登入後導向安全 | ✅ | — | — |
| 即時頻道序列化 | ✅ | — | — |
| 重設密碼隨機字串 | ✅ | — | — |
| 進行中約戰 API | — | ✅ | — |

---

## 單元測試（`tests/unit/`）

純函式或 mock 外部依賴，不連真實資料庫（`redisBus` 除外僅 mock ioredis）。

### `geo.test.ts`
- **距離計算 `distanceKm`**：同點為 0；台北—高雄約 250–350 km。
- **中點 `midpoint`**：座標平均。

### `maps.test.ts`
- **座標驗證 `isValidCoordinates`**：合法／越界／非有限值。
- **座標格式化 `formatCoordinates`**：小數位數。
- **Google 地圖導航 URL `googleMapsNavUrl`**：查詢參數編碼。

### `safeRedirect.test.ts`
- **登入後導向 `safeLoginRedirect`**：空值回 `/`；允許站內路徑；阻擋 `//`、`https://`、反斜線、null byte。
- **`loginUrlWithNext`**：`next` 查詢字串編碼。

### `geocode.test.ts`
- **Nominatim 結果正規化 `normalizeNominatimResult`**：lat/lng、標題、副標。

### `shopHours.test.ts`
- **營業時間 JSON `parseShopHours`**：合法週表；無效（結束早於開始）回 null。
- **是否營業中 `isShopOpenNow`**：依星期與時段判斷。

### `generatePassword.test.ts`
- **臨時密碼 `generateTemporaryPassword`**：指定長度；連續產生不重複。

### `notificationDisplay.test.ts`
- **通知 payload 解析 `parseNotificationData`**：JSON 物件；舊版純字串。
- **標題 `getNotificationTitle`**：自訂標題；`SPOT_INVITE` 預設；未知類型。
- **內文 `getNotificationBody`**：約戰地點等。

### `matchDto.test.ts`
- **`toActiveMatchDTO`**：資料庫列對應前端 DTO 欄位。

### `matchShare.test.ts`
- **分享連結 `buildShareUrl` / `resolveSiteOrigin`**：網域、尾斜線。
- **勝負顯示 `getWinnerDisplayName` / `getWinnerLabelForViewer`**：勝利／平手。
- **分享文案 `buildSharePostText`**：選手、地點。
- **社群分享 URL**：Twitter、Facebook、Threads intent 參數。

### `matchReport.test.ts`
- **`executeMatchReport`（lib）**：進行中約戰檢舉後狀態 `CANCELLED`、寫入 `UserReport`。
- **`normalizeMatchReportCategories`**：去重、過濾無效代碼。

### `matchReportCategories.test.ts`
- **檢舉原因常數與中文標籤**：每項皆有標籤；含「無故要求取消」；已移除 `WRONG_RESULT`。
- **類別正規化**：去重、全無效時空陣列。

### `redisBus.test.ts`
- **Realtime 頻道 `userChannel`**：使用者 ID 頻道名。
- **事件序列化**：`serializeRealtimeEvent` / `parseRealtimeEvent` 往返。
- **Redis bus（mock）**：訂閱／發佈介面行為。

---

## 整合測試（`tests/integration/`）

使用 `cardmatch_test` 資料庫，每個案例前 `resetTables()`；server action／API 透過測試 cookie 模擬登入（`tests/helpers/session.ts`）。

### `auth-api.test.ts` — 認證 API
| 案例 | 驗證內容 |
|------|----------|
| 註冊 email 無效 | 400 |
| 註冊密碼過短 | 400 |
| 重複 email | 409 |
| 註冊成功 | 200、`ok: true` |
| 登入密碼錯誤 | 401 |
| 登入成功 | 200、session |
| 忘記密碼 email 無效 | 400 |
| 忘記密碼未知 email | 200、統一訊息（不洩漏是否存在） |
| 忘記密碼已知 email | 重設後舊密碼無法登入 |

### `matches-active.test.ts` — 進行中約戰 API
| 案例 | 驗證內容 |
|------|----------|
| 未登入 `GET /api/matches/active` | 401 |
| 登入後有進行中約戰 | 200、DTO 狀態與地點 |

### `match-invite.test.ts` — 建立邀請
| 案例 | 驗證內容 |
|------|----------|
| 地圖公告邀請 | `INVITE_PENDING`、邀請者 ID |
| 隨機配對邀請 | 直接 `ACCEPTED` |
| 邀請者已有進行中約戰 | 拒絕新邀請 |
| 重複邀請同一對象 | 拒絕 |

### `match-lifecycle.test.ts` — 邀請接受與準備
| 案例 | 驗證內容 |
|------|----------|
| 接受後雙方準備 | `ACCEPTED` → `IN_PROGRESS`、雙方 ready |
| 邀請者自行接受 | 拋錯 |

### `match-cancel.test.ts` — 取消約戰
| 案例 | 驗證內容 |
|------|----------|
| 雙方同意取消 | 先 `cancelRequestedBy`，再 `CANCELLED` |

### `match-finish.test.ts` — 對戰結果
| 案例 | 驗證內容 |
|------|----------|
| 雙方同意同一勝者 | 第一次未完成、第二次 `completed` + share、`COMPLETED` |
| 勝者不一致 | 拋錯「雙方送出之結果不相符」 |

### `match-report-action.test.ts` — 對戰檢舉（Server Action）
| 案例 | 驗證內容 |
|------|----------|
| 登入參戰者檢舉 | 約戰 `CANCELLED`、`UserReport` 含 matchId／categories |
| 未選原因 | 拋錯 |

### `moderation.test.ts` — 檢舉／封鎖
| 案例 | 驗證內容 |
|------|----------|
| `reportUser` | 寫入檢舉理由 |
| `blockUser` | 無法再 `createInviteMatch` |

### `queries.test.ts` — 查詢
| 案例 | 驗證內容 |
|------|----------|
| `getHomeAnnouncementStats` | 地圖玩家數、最新公告預覽 |

---

## 端對端測試（`e2e/`）

Playwright 啟動 production build（port 3001），`global-setup` 執行 migration。使用真實瀏覽器操作與 `tests/helpers/db` 種子資料。

### `auth.spec.ts` — 認證與訪客
| 案例 | 驗證內容 |
|------|----------|
| 訪客開啟對戰頁 | 可進 `/battle` |
| 訪客隨機配對 | 導向 `/login?next=/battle` |
| 註冊新帳號 | 導向 `/profile` |
| 錯誤密碼登入 | 顯示「帳號或密碼錯誤」 |
| 忘記密碼入口 | 登入頁切換至寄信表單 |
| 忘記密碼未知 email | 顯示統一成功訊息 |

### `home.spec.ts` — 首頁
| 案例 | 驗證內容 |
|------|----------|
| 訪客首頁 | 「探索對戰地圖」連結、「如何使用」區塊 |

### `match-flow.spec.ts` — 完整約戰流程
| 案例 | 驗證內容 |
|------|----------|
| 雙使用者邀請、接受、雙方準備 | UI：送出邀請、接受、`mark-ready`；DB：`IN_PROGRESS` |

### `match-report.spec.ts` — 對戰檢舉 UI
| 案例 | 驗證內容 |
|------|----------|
| 註冊後檢舉對手 | UI 註冊 + API 建立對手；對話框確認；`activeMatch` 清空；DB：`CANCELLED` + `UserReport` |

---

## 輔助工具（`tests/helpers/`）

| 檔案 | 用途 |
|------|------|
| `db.ts` | `testPrisma`、`resetTables`、`createUser`、`createLookingMeetSpot`、`createShop` |
| `auth.ts` | 測試 cookie 清除／讀取 |
| `session.ts` | `loginAsUser`：呼叫登入 API 建立 session |

---

## 目前未自動化或覆蓋較薄的功能

以下功能尚無專屬測試，或未涵蓋全部路徑，後續可補強：

- 牌組 CRUD、好友聊天、通知已讀 API
- 隨機配對佇列（`matchQueue`）完整配對流程
- 店家回報（`ShopReport`）、管理後台停權
- 對戰結果公開頁 `/battle/result/[matchId]`、OG 圖
- 個人檔案隱私（戰績可見度）、封鎖後 UI
- 即時 SSE 連線（目前 publish 在整合測試中 mock）
- 寄信 SMTP（忘記密碼在 dev 僅 console，整合測試驗證密碼變更）

---

## 新增測試時的慣例

1. **Unit**：放在 `tests/unit/`，檔名 `*.test.ts`，不依賴 DB。
2. **Integration**：放在 `tests/integration/`，需 `beforeEach(resetTables)`，需要登入時用 `loginAsUser`。
3. **E2E**：放在 `e2e/`，互動元素請加 `data-testid`；可搭配 `testPrisma` 種子狀態縮短流程。
4. 更新本文件對應章節，保持「測了什麼」可被查閱。
