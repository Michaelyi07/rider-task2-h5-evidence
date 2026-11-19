# VERIFICATION.md — Task 2/5 H5（真实验证记录）

> 所有命令在仓库根目录 `<WORKSPACE>Projects/clawhunt/rider-bids/task2-h5/` 真实执行，
> 时间 2026-11-19。原始输出留痕：`evidence/verify.txt`、`evidence/playwright.txt`、`evidence/evidence-summary.txt`。
> 本机环境：Windows 10 Pro / Node **v22.22.2** / npm **10.9.7** / **无 Docker**。
> npm 命令统一前置 `env -u NODE_OPTIONS`（WorkBuddy 注入的 NODE_OPTIONS 会导致 npm 批量删除失败）。

---

## 1. 单命令全量验证（终版）

命令：
```bash
env -u NODE_OPTIONS npm run verify
```
真实输出（已去除 ANSI 颜色码，内容未改）：
```
> clawhunt-task2-h5@1.0.0 verify
> npm run build && npm run test:all

> clawhunt-task2-h5@1.0.0 build
> tsc --noEmit && vite build

vite v6.4.3 building for production...
transforming...
✓ 42 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.59 kB │ gzip:  0.38 kB
dist/assets/index-CVVvy3QW.css    5.06 kB │ gzip:  1.63 kB
dist/assets/index-CcQ-sYDR.js    26.86 kB │ gzip:  9.20 kB
dist/assets/react-D3F3s8fL.js   141.72 kB │ gzip: 45.48 kB
✓ built in 2.17s

> clawhunt-task2-h5@1.0.0 test:all
> npm run test:unit && npm run test:e2e

> clawhunt-task2-h5@1.0.0 test:unit
> vitest run

 RUN  v3.2.4 <WORKSPACE>Projects/clawhunt/rider-bids/task2-h5

 ✓ tests/persist.test.ts (6 tests) 18ms
 ✓ tests/clearAllLocal.test.ts (1 test) 43ms
 ✓ tests/consent.test.tsx (7 tests) 202ms
 ✓ tests/mock-state.test.ts (6 tests) 22ms

 Test Files  4 passed (4)
      Tests  20 passed (20)
   Start at 16:33:16
   Duration 11.83s (transform 879ms, setup 0ms, collect 2.56s, tests 284ms, environment 18.41s, prepare 2.20s)

> clawhunt-task2-h5@1.0.0 test:e2e
> playwright test

[WebServer] > clawhunt-task2-h5@1.0.0 dev:all
[WebServer] > concurrently -k -n h5,mock -c cyan,magenta "npm:dev" "npm:mock"
[WebServer] [mock] listening on http://127.0.0.1:8787  (2026-11-19T08:33:39.018Z)
[WebServer]   VITE v6.4.3  ready in 1461 ms
[WebServer]   ➜  Local:   http://127.0.0.1:5173/

Running 8 tests using 1 worker

  ok 1 [chrome-h5] › e2e\aibadge.spec.ts:5:1 › AC3 AI 身份标识每一屏可见（六路由参数化） (3.2s)
  ok 2 [chrome-h5] › e2e\consent.spec.ts:3:1 › AC2 未勾选不能开始；同意版本与 UTC 时间戳按契约回传 (1.4s)
  ok 3 [chrome-h5] › e2e\consent.spec.ts:23:1 › AC2 不同意可退出且不发任何同意请求 (1.2s)
  ok 4 [chrome-h5] › e2e\flow.spec.ts:4:1 › AC1 渠道入口 → 同意 → 7 项 → 政策 → 站点 → 预约 → 结果 全流程 (2.6s)
  ok 5 [chrome-h5] › e2e\offline.spec.ts:4:1 › AC6 断网 10 秒恢复后会话与进度不丢、消息不重复 (12.1s)
  ok 6 [chrome-h5] › e2e\privacy.spec.ts:4:1 › AC4 个人信息四功能 + 撤回后清理本地缓存与会话 (3.2s)
  ok 7 [chrome-h5] › e2e\viewport.spec.ts:10:1 › AC5 375 / 390 / 414 三宽度无横向溢出 (1.9s)
  ok 8 [chrome-h5] › e2e\viewport.spec.ts:20:1 › AC5 150% 系统字号（注入 24px）关键组件不溢出仍可操作 (1.4s)
[WebServer] [h5] npm run dev exited with code 1
[WebServer] --> Sending SIGTERM to other processes..

  8 passed (38.4s)
```
说明：收尾时 `npm run dev exited with code 1` 是 Playwright webServer 停机 SIGTERM 由 concurrently 转述，
发生在 8 个用例全部通过之后，不影响结果。

## 2. Mock 契约接口（真实 curl）

命令与输出：
```bash
$ curl -s http://127.0.0.1:8787/health
{"status":"ok"}

$ curl -s http://127.0.0.1:8787/api/v1/stations | head -c 200
[{"id":"st-A-01","name":"城市A · 中心站","lat":31.2304,"lng":121.4737,"open_quota":12,"distance_km":1.2,"slots":["2026-11-20T10:00:00+08:00","2026-11-20T14:00:00+08:00","2026-11-21T09:30:00+08:0
```
（mock 由 `npm run mock` 单独启动后执行；采集完已停止。）

`npm run evidence` 输出：
```
collected_at=2026-11-19T08:34:32.186Z
GET http://127.0.0.1:8787/health -> HTTP 200 {"status":"ok"}

evidence files:
  - offline-after.png
  - playwright-report
  - playwright.txt
  - shot-150font.png
  - shot-375.png
  - shot-390.png
  - shot-414.png
  - verify.txt
```

## 3. AC 覆盖与证据对应关系

| AC | 证据 |
|---|---|
| AC0 | `npm run build` 成功、README 启动说明、`curl /health` 返回 200 |
| AC1 | `flow.spec.ts` 通过（渠道→同意→7/7→政策卡出处→3 张站点卡→预约→结果页，`tel:`/`geo:` 链接断言） |
| AC2 | `consent.spec.ts` 2 项通过：未勾选按钮 disabled；拒绝无 consent POST；回传 `consent_version=v1.0-20261119` 与 ISO UTC 时间戳 |
| AC3 | `aibadge.spec.ts`：6 个路由逐一断言 AI 标识可见 |
| AC4 | `privacy.spec.ts`：查看（脱敏 `138****8000`）、更正、下载 `my-data.json`、撤回后 `localStorage.length=0 & sessionStorage.length=0` |
| AC5 | `viewport.spec.ts`：375/390/414 三宽度 + 注入 `html{font-size:24px}`（=150%）后 `scrollWidth<=innerWidth`，关键按钮可见；截图 `evidence/shot-*.png` |
| AC6 | `offline.spec.ts`：真实 `context.setOffline(true)` 等待 10s 再恢复，`sessionId` 不变、`progress 2→4/7`、消息无重复 |
| AC7 | `npm run test:e2e` → `8 passed`；`evidence/playwright.txt` 与本报告 |

## 4. 修复记录（如实标注）

首次 E2E 运行为 `7 passed / 1 failed`：`flow.spec.ts` 在政策问答后找不到 `go-stations` 按钮。
根因是政策问答响应的 `actions=[]` 覆盖了此前的 `show_stations`，导致站点入口消失。
已在 `src/state/store.ts` 增加常驻 `stationsReady` 标志、并由 `src/pages/Chat.tsx` 消费；
修复后连续两次 `npm run verify` 均为 `20 passed / 8 passed`（终版输出见第 1 节）。

## 5. 本机验证 vs 需客户真机/集成环境

**本机已真实执行（非模拟、非编造）**：
- Vite 生产构建与 TypeScript 类型检查；
- 20 项 Vitest（同意门禁、渠道白名单、撤回清理六存储面、持久化/合并/幂等、mock 7 槽状态机与未成年终止）；
- 8 项 Playwright E2E，驱动为本机已安装的 **Google Chrome**（`channel: 'chrome'`），默认视口 390×844；
- 三宽度/150% 字号为**真实浏览器截图 + DOM 溢出断言**（非 jsdom 替代）；断网用 Playwright `setOffline` 真断网 10 秒。

**未在本机验证，需客户/集成环境**：
- Task 1 真实 Agent 引擎、政策知识库召回与真实 LLM；Task 3 真实并发预约/名额扣减与 Webhook；Task 5 真实保险箱加解密、权限与审计；
- iOS/Android 真机适配、WebKit(iPhone) 安全区表现、现网 4G 首屏 ≤2s（本机未跑 Lighthouse 真机/4G 报告，仅记录构建体积：首屏 JS gzip 9.20KB + React vendor 45.48KB）；
- 真实短信/电话外呼与站长虚拟号；小程序（Taro 同源加分项）本仓未包含，认证上架由发单方负责；
- 本仓 E2E 未跑 WebKit/Safari 项目。

数据合规：全部为合成数据；依赖 React / Vite / Vitest / Playwright / @testing-library / concurrently 均为 MIT，无 GPL/AGPL。

## 6. Docker Compose 交付件（写就绪 · 本机无 Docker 未运行 · 需客户环境验证）

**如实标注：本机（Windows 10 Pro）无 Docker（`docker --version` 不存在），以下 compose 栈未在本机实际运行。**
Docker 交付件补齐后已重跑全量本机验证，结果与第 1 节一致：`env -u NODE_OPTIONS npm run verify` →
build 通过、Vitest **20 passed (20)**、Playwright **8 passed (41.4s)**（留痕追加于 `evidence/verify.txt` 末尾）。

### 6.1 新增文件

| 文件 | 作用 |
|---|---|
| `Dockerfile` | 单文件三 target：`build`（node:22-alpine，npm ci + tsc/vite build）→ `h5`（nginx:alpine 托管 dist）→ `mock`（node:22-alpine，零依赖 Node mock，含 `/health` HEALTHCHECK） |
| `docker-compose.yml` | 两服务：`mock`(8787) + `h5`(5173→80)，h5 依赖 mock 健康检查通过后启动 |
| `nginx.conf` | `/api/` 反代 `http://mock:8787`（契约前缀原样透传）；SPA 路由回退 `index.html`；带 hash 静态资源 7 天缓存 |
| `.dockerignore` | 排除 node_modules / dist / test-results / playwright-report / evidence / .git |

### 6.2 为容器化做的代码改动（已随重跑验证）

- `mock/server.mjs`：监听地址改为 `process.env.MOCK_HOST || '127.0.0.1'`（容器内传 `0.0.0.0` 才能被 nginx 反代访问）；
  该改动不影响本机 dev/E2E 行为，重跑结果一致。
- H5 API 客户端本就走相对路径 `/api/v1`（`src/api/client.ts:8`），nginx 反代无需改前端代码。

### 6.3 客户环境验证步骤（建议）

```bash
docker compose up --build
curl -s http://127.0.0.1:8787/health          # 期望 {"status":"ok"}
curl -s http://127.0.0.1:5173/                # 期望 200，HTML 含 #root
curl -s http://127.0.0.1:5173/api/v1/stations # 期望经 nginx 反代返回站点 JSON
# 浏览器打开 http://127.0.0.1:5173/?source_channel=poster_cityA 走完整全流程
```

### 6.4 风险点（诚实说明）

- compose 内服务名 `mock` 依赖 Docker 内置 DNS，属标准用法，但未经本机实测；
- nginx:alpine 与 node:22-alpine 镜像版本漂移可能带来差异；`npm ci` 在容器内重新解析 lock，理论可复现；
- 若客户环境端口 5173/8787 被占用，改 `docker-compose.yml` 端口映射左侧即可。
