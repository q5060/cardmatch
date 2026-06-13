# Docker 支援（跨平台開發）

使用 Docker 能在任何作業系統上統一開發環境。

## 開發模式

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

## 正式模式

在根目錄執行：

```bash
docker-compose up -d
```

此模式會將 Next.js 應用編譯成正式版本並運行。

停止容器：

```bash
docker-compose down
```

## 資料庫初始化

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

## 常見問題

- **Port 已被佔用**：修改 `docker-compose.yml` 或 `docker-compose.dev.yml` 中的 `ports` 設定。
- **Windows 上 Volume 掛載慢**：建議用 WSL 2 backend。
- **Postgres 連不上**：確認 `docker compose -f docker-compose.db.yml up -d` 已啟動，且 `DATABASE_URL` 主機為 `localhost`（本機）或 `postgres`（Docker Compose 內）。
