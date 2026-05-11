# CardMatch API Documentation

## 目錄

1. [認證 API](#認證-api)
2. [牌組 API](#牌組-api)
3. [好友 API](#好友-api)
4. [隱私設置 API](#隱私設置-api)

---

## 認證 API

### 獲取當前用戶資訊

**端點**: `GET /api/auth/me`

**描述**: 獲取當前已認證用戶的資訊

**權限**: 需要有效的會話

**響應** (200 OK):
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "displayName": "用戶名",
  "bio": "個人簡介",
  "avatarUrl": "https://example.com/avatar.jpg",
  "battleRecordVisibility": "PUBLIC",
  "winrateVisibility": "PUBLIC",
  "defaultShopId": "shop_id_or_null"
}
```

**錯誤響應**:
- 401 Unauthorized: 無有效會話
- 404 Not Found: 用戶不存在

---

### 登入

**端點**: `POST /api/auth/login`

**描述**: 使用電子郵件和密碼登入

**請求體**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**響應** (200 OK):
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "displayName": "用戶名"
  }
}
```

**錯誤響應**:
- 400 Bad Request: 郵件或密碼缺失
- 401 Unauthorized: 郵件或密碼不正確

---

### 註冊

**端點**: `POST /api/auth/register`

**描述**: 建立新用戶帳戶

**請求體**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "用戶名"
}
```

**響應** (201 Created):
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "displayName": "用戶名"
  }
}
```

**錯誤響應**:
- 400 Bad Request: 缺失必要字段或郵件已註冊
- 422 Unprocessable Entity: 密碼過短

---

### 登出

**端點**: `POST /api/auth/logout`

**描述**: 登出當前用戶

**權限**: 需要有效的會話

**響應** (200 OK):
```json
{
  "success": true
}
```

---

### 更新檔案

**端點**: `POST /api/auth/update-profile`

**描述**: 更新用戶檔案（名稱、簡介、頭像）

**權限**: 需要有效的會話

**請求體**: `FormData`
```
- displayName (string, 必填): 顯示名稱，最多 50 字元
- bio (string, 可選): 個人簡介，最多 500 字元
- avatar (File, 可選): 頭像圖片 (JPEG/PNG/WebP, 最多 2MB)
```

**響應** (200 OK):
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "displayName": "新用戶名",
  "bio": "新簡介",
  "avatarUrl": "data:image/jpeg;base64,...",
  "battleRecordVisibility": "PUBLIC",
  "winrateVisibility": "PUBLIC"
}
```

**錯誤響應**:
- 400 Bad Request: 驗證失敗（名稱為空、超長、文件過大等）
- 401 Unauthorized: 無有效會話

---

### 更新隱私設置

**端點**: `POST /api/auth/update-privacy`

**描述**: 更新用戶隱私設置

**權限**: 需要有效的會話

**請求體**:
```json
{
  "battleRecordVisibility": "PUBLIC|FRIENDS|PRIVATE",
  "winrateVisibility": "PUBLIC|FRIENDS|PRIVATE"
}
```

**響應** (200 OK):
```json
{
  "id": "user_id",
  "displayName": "用戶名",
  "battleRecordVisibility": "PUBLIC",
  "winrateVisibility": "FRIENDS"
}
```

**錯誤響應**:
- 400 Bad Request: 無效的隱私設置值
- 401 Unauthorized: 無有效會話

---

### 更改密碼

**端點**: `POST /api/auth/change-password`

**描述**: 更改用戶密碼

**權限**: 需要有效的會話

**請求體**:
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password_min_8_chars"
}
```

**響應** (200 OK):
```json
{
  "success": true,
  "message": "密碼已成功更改"
}
```

**錯誤響應**:
- 400 Bad Request: 新密碼太短（少於 8 字元）
- 401 Unauthorized: 目前密碼不正確
- 401 Unauthorized: 無有效會話

---

## 牌組 API

### 獲取用戶的所有牌組

**端點**: `GET /api/decks`

**描述**: 獲取當前用戶的所有牌組

**權限**: 需要有效的會話

**查詢參數**: 無

**響應** (200 OK):
```json
[
  {
    "id": "deck_id_1",
    "name": "牌組名稱",
    "visibility": "PUBLIC",
    "cardCount": 42
  },
  {
    "id": "deck_id_2",
    "name": "另一個牌組",
    "visibility": "FRIENDS",
    "cardCount": 35
  }
]
```

**錯誤響應**:
- 401 Unauthorized: 無有效會話
- 500 Internal Server Error: 伺服器錯誤

---

### 獲取牌組詳情

**端點**: `GET /api/decks/[id]`

**描述**: 獲取特定牌組的詳細信息

**權限**: 需要有效的會話，且為牌組所有者

**路徑參數**:
- `id` (string): 牌組 ID

**響應** (200 OK):
```json
{
  "id": "deck_id",
  "userId": "user_id",
  "title": "牌組名稱",
  "notes": "牌組備註",
  "visibility": "PUBLIC",
  "deckJson": "{...}",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

**錯誤響應**:
- 401 Unauthorized: 無有效會話
- 403 Forbidden: 不是牌組所有者
- 404 Not Found: 牌組不存在

---

### 刪除牌組

**端點**: `DELETE /api/decks/[id]`

**描述**: 刪除特定牌組（僅所有者）

**權限**: 需要有效的會話，且為牌組所有者

**路徑參數**:
- `id` (string): 牌組 ID

**響應** (200 OK):
```json
{
  "success": true
}
```

**錯誤響應**:
- 401 Unauthorized: 無有效會話
- 403 Forbidden: 不是牌組所有者
- 404 Not Found: 牌組不存在
- 500 Internal Server Error: 刪除失敗

---

## 好友 API

### 發送好友邀請

**端點**: `POST /api/friends/add` (實現中)

**描述**: 向另一用戶發送好友邀請

**權限**: 需要有效的會話

**請求體**:
```json
{
  "targetUserId": "target_user_id"
}
```

**響應** (200 OK):
```json
{
  "success": true,
  "friendshipId": "friendship_id",
  "status": "PENDING"
}
```

**錯誤響應**:
- 400 Bad Request: 無法添加自己為好友
- 401 Unauthorized: 無有效會話
- 409 Conflict: 已是好友或邀請已發送

---

### 接受好友邀請

**端點**: `POST /api/friendships/[friendshipId]/accept` (實現中)

**描述**: 接受好友邀請

**權限**: 需要有效的會話，且為邀請接收者

**路徑參數**:
- `friendshipId` (string): 好友關係 ID

**響應** (200 OK):
```json
{
  "success": true,
  "status": "ACCEPTED"
}
```

**錯誤響應**:
- 401 Unauthorized: 無有效會話
- 403 Forbidden: 不是邀請接收者
- 404 Not Found: 好友關係不存在

---

## 隱私設置 API

### 隱私設置選項

每個用戶可以設置以下可見性選項：

**battleRecordVisibility** - 對戰紀錄可見性
- `PUBLIC`: 所有用戶都能看到
- `FRIENDS`: 僅好友能看到
- `PRIVATE`: 只有用戶自己能看到

**winrateVisibility** - 勝率可見性
- `PUBLIC`: 所有用戶都能看到
- `FRIENDS`: 僅好友能看到
- `PRIVATE`: 只有用戶自己能看到

### 牌組隱私設置

每個牌組可以有以下隱私設置：

**visibility** - 牌組可見性
- `PUBLIC`: 在大廳和檔案中公開顯示
- `FRIENDS`: 僅好友能看到
- `PRIVATE`: 只有所有者能看到

---

## 錯誤代碼參考

| 代碼 | 說明 |
|------|------|
| 400 | Bad Request - 請求參數驗證失敗 |
| 401 | Unauthorized - 需要認證或認證失敗 |
| 403 | Forbidden - 無權限訪問資源 |
| 404 | Not Found - 資源不存在 |
| 409 | Conflict - 操作衝突（如重複操作） |
| 422 | Unprocessable Entity - 請求數據驗證失敗 |
| 500 | Internal Server Error - 伺服器內部錯誤 |

---

## 認證

所有需要認證的端點使用會話 cookie 進行認證。

- 登入時會設置 `__Secure-cardmatch-session` cookie
- 後續請求會自動包含此 cookie
- 登出時 cookie 會被清除

---

## 速率限制

目前無速率限制。生產環境建議添加。

---

## 版本歷史

- **v1.0** (2025-01-15): 初始 API 文檔
  - 認證端點 (登入/登出/更新檔案)
  - 牌組管理端點
  - 隱私設置端點
