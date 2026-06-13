# 測試

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

GitHub Actions 會在 push / pull request 時自動執行 lint、unit、integration 與 e2e（見 [`.github/workflows/ci.yml`](https://github.com/q5060/cardmatch/blob/main/.github/workflows/ci.yml)）。

詳細測試覆蓋範圍請見 [TEST_COVERAGE.md](../TEST_COVERAGE.md)。
