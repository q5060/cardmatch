# 安裝與本地啟動

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

請參考 [環境變數設定](environment.md) 章節。

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
