# Cardmatch

Next.js 全端專案（App Router、API Routes、Prisma + SQLite、iron-session）。

## 需求環境

- [Node.js](https://nodejs.org/)（建議 **20 LTS** 或以上）

## 本地啟動（完整流程）

### 1. 安裝相依套件

```bash
npm install
```

`postinstall` 會自動執行 `prisma generate`，無須手動再跑一次（除非要除錯）。

### 2. 環境變數

在專案**根目錄**建立 `.env`（不要提交到版控）。SQLite 的檔案路徑係相對於 `prisma/schema.prisma` 所在目錄解析。

```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="請換成至少32個字元的隨機密鑰"
```

| 變數 | 說明 |
|------|------|
| `DATABASE_URL` | Prisma 資料庫連線字串；本機開發可用 SQLite，例如 `file:./dev.db`。 |
| `SESSION_SECRET` | 加密 session cookie，**長度至少 32**，否則啟動會報錯。 |

### 3. 建立資料表

擇一即可：

- **建議（與 repo migrations 一致）**

  ```bash
  npm run db:migrate
  ```

- **快速對齊 schema（本機試用）**

  ```bash
  npm run db:push
  ```

### 4.（選用）種子資料

寫入示意店家等資料：

```bash
npm run db:seed
```

### 5. 開發伺服器

```bash
npm run dev
```

瀏覽器開啟 [http://localhost:3000](http://localhost:3000)。

---

## 常用指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 開發模式 |
| `npm run build` | 正式建置（含 `prisma generate`） |
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

## 部署備註

SQLite 依賴可寫入的持久化檔案系統；Serverless 託管常見作法是改用 PostgreSQL 等，並在環境中設定對應的 `DATABASE_URL`。正式環境請務必設定強隨機的 `SESSION_SECRET`，並啟用 HTTPS（production 下 session cookie 為 `secure`）。

---

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
