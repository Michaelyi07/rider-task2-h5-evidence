# ClawHunt 投标 Task 2/5 — 候选人端 H5（可运行仓库）

> 单号 1807 · 报价 $600 · 硬验收 AC0–AC7。
> 本仓库是可运行代码 + 真实验证证据，不是文档/PPT 方案。
> 全部数据为**合成数据**，不含真实姓名、手机号、站点或联系方式。

## 1. 环境与启动

本机基线：Node **v22.22.2**、npm **10.9.7**（本机无 Docker，compose 文件已写就绪，见下）。
技术栈：React 18 + TypeScript + Vite 6 + Vitest 3 + @testing-library/react + Playwright 1.63 + 原生 Node mock（8787）。
依赖许可：React / Vite / Vitest / Playwright / @testing-library / concurrently 均为 MIT；无 GPL/AGPL。

### 方式 A：Docker Compose 一键启动（交付默认方式）

```bash
docker compose up --build
# H5:   http://127.0.0.1:5173/?source_channel=poster_cityA （nginx 静态服务 Vite 构建产物）
# Mock: http://127.0.0.1:8787/health                      （Node 原生契约 mock）
```

- `Dockerfile` 为单文件双 target：`build`（npm ci + vite build）→ `h5`（nginx 托管 dist 并把 `/api` 反代到 mock）→ `mock`（零依赖 Node）。
- `nginx.conf`：`/api/` → `http://mock:8787`，SPA 路由回退 `index.html`；compose 内 mock 带 `/health` 健康检查，H5 等其就绪后启动。
- 拆开跑：`docker compose up --build mock`（仅 API）或 `--build h5`（仅前端）。
- 本机验证状态见 [VERIFICATION.md](./VERIFICATION.md) 第 6 节（本机无 Docker，文件写就绪、由客户环境执行 `docker compose up` 验证）。

### 方式 B：本机 dev 启动（无需 Docker）

> WorkBuddy 注入的 `NODE_OPTIONS` 会让 npm 批量删除失败，所有 npm 命令前置 `env -u NODE_OPTIONS`。

```bash
# 安装（一条命令）
env -u NODE_OPTIONS npm install

# 一条命令同时起 H5(5173) + Node mock(8787)
env -u NODE_OPTIONS npm run dev:all
# H5:   http://127.0.0.1:5173/?source_channel=poster_cityA
# Mock: http://127.0.0.1:8787/health   -> {"status":"ok"}
```

完整路由：`/entry → /consent → /chat → /stations → /booking → /result`，另有 `/decline`、`/privacy`。

## 2. 一条命令跑全部验证

```bash
env -u NODE_OPTIONS npm run verify
# = build + test:unit + test:e2e
```
真实输出见 [VERIFICATION.md](./VERIFICATION.md)。E2E 输出留痕在 `evidence/playwright.txt`，
三宽度/150% 字号截图在 `evidence/shot-375.png`、`shot-390.png`、`shot-414.png`、`shot-150font.png`。

单独执行：
```bash
env -u NODE_OPTIONS npm run build        # tsc --noEmit && vite build
env -u NODE_OPTIONS npm run test:unit    # Vitest
env -u NODE_OPTIONS npm run test:e2e     # Playwright（webServer 自动起 H5+mock）
env -u NODE_OPTIONS npm run evidence     # 采集 mock health + evidence 文件清单
```

## 3. 验收映射（AC → 实现与证据）

| AC | 实现位置 | 验证 |
|---|---|---|
| AC0 可运行交付 + 启动说明 | `package.json` / `Dockerfile` / `docker-compose.yml` / `vite.config.ts` / `mock/server.mjs` | `docker compose up --build`（客户环境）、`npm run dev:all`、`npm run build` |
| AC1 一条命令起全流程 | `src/App.tsx` + 各 `src/pages/*` + `mock/server.mjs` | `e2e/flow.spec.ts` |
| AC2 同意门禁/拒绝出口/版本+时间戳 | `src/pages/Consent.tsx`、`src/config/consent.ts` | `tests/consent.test.tsx`、`e2e/consent.spec.ts` |
| AC3 AI 标识每屏 | `src/components/AiBadge.tsx`（根布局唯一实例） | `e2e/aibadge.spec.ts`（六路由参数化） |
| AC4 个人信息四功能 + 撤回清理 | `src/pages/Privacy.tsx`、`src/state/store.ts:clearAllLocal` | `tests/clearAllLocal.test.ts`、`e2e/privacy.spec.ts` |
| AC5 375/390/414 + 150% 字号 | `src/styles.css`（rem/flex/max-width/安全区） | `e2e/viewport.spec.ts` + 截图（jsdom/浏览器断言，非人工肉眼） |
| AC6 断网 10s 恢复 | `src/state/store.ts`（持久化/合并）+ `src/pages/Chat.tsx`（outbox/重放） | `tests/persist.test.ts`、`e2e/offline.spec.ts` |
| AC7 E2E 单命令全绿 | `playwright.config.ts` + `e2e/*.spec.ts` | `npm run test:e2e` / `evidence/playwright.txt` |

## 4. 契约对齐（Shared Interface Contract v1）

- Mock 严格走 `/api/v1`，错误体 `{code, message}`，求职者端用会话令牌（非 JWT）。
- `POST /agent/sessions` → `{session_id, candidate_id}`；`POST /agent/sessions/{id}/messages` →
  `{reply, quick_replies[], progress{done,total:7,fields[]}, actions[]}`；actions ∈
  `show_stations | booking_confirmed | handoff | end_minor`。
- 站点 `station{id,name,lat,lng,open_quota}`；预约 `booking{id,candidate_id,station_id,slot_start,status}`。
- 同意/权利：`POST /consent`、`GET|PATCH /candidates/{id}/me`、`GET /candidates/{id}/export`、`POST /consent/revoke`。
- 保险箱最小契约：`POST /vault/tokenize`、`POST /vault/detokenize`（无 reason 拒绝 403）。
- 7 项采集：称呼、出生年月、意向区域、岗位意向、车辆、到岗时间、配送经验（health_cert 不计入）。
- 所有写请求带幂等键 `messageId`；mock 对同一 messageId 返回首次结果，重放不重复填槽。

## 5. 安全与隐私要点

- `source_channel` 走白名单 `/^[a-zA-Z0-9_-]{1,32}$/`，不入 HTML；全程 React 转义，**禁用 `dangerouslySetInnerHTML`**。
- 政策出处与免责声明按纯文本渲染；政策回答为合成示例，不承诺具体收入。
- 撤回同意：**先服务端删除成功，再清 localStorage / sessionStorage / cookie / IndexedDB / Cache API / React 内存 state**。
- `consent_at` 用 `new Date().toISOString()`（UTC）；版本号写死常量 `v1.0-20261119`。
- 150% 字号：`meta viewport` 未锁 `maximum-scale`；容器 `max-width:100%`、`box-sizing:border-box`、按钮 `min-height:44px`、`height:auto`、`overflow-wrap:anywhere`；含 iOS 安全区 `env(safe-area-inset-*)`。

## 6. Taro 同源出小程序（加分项 · 状态说明）

需求第 7 项「用 Taro 同源代码出微信小程序」为**加分项，本仓暂未包含小程序构建产物**（如实标注），但源代码已按同源路径预留，迁移成本低：

- **可直接复用**：`src/state/store.ts`（纯 TS，无 DOM 依赖）、`src/config/consent.ts`、`src/api/client.ts`（把 `fetch` 换成 `Taro.request`，URL 逻辑不变）、全部 mock 接口。
- **需适配层替换**：
  - 页面路由：`src/App.tsx` 的 history 路由 → Taro `Taro.navigateTo`，六个页面（Entry/Consent/Chat/Stations/Booking/Result + Privacy）各转一个 Taro page；
  - 组件：`components/*` 为无状态 JSX，可平移；`localStorage/sessionStorage/cookie/IndexedDB/Cache API` 六存储面清理 → `Taro.clearStorage()` + 内存 state 重置；
  - 语音输入与 `setOffline` 断网模拟 → `Taro.getRecorderManager` 与 `Taro.onNetworkStatusChange`；
  - AI 标识 `AiBadge` 为全局组件，小程序端放自定义 tabBar 上方或页面级固定条。
- **迁移路径**：`npm i @tarojs/cli` → `taro convert` 或新建 Taro 项目后将 `src/` 平移进 `src/pages/*`，共享逻辑抽 `src/shared/`；一条命令 `npm run build:weapp` 出小程序包。
- 小程序认证与上架由发单方负责（需求「明确不含」），后续中标可按上述路径交付小程序包。

## 7. 目录结构

```
task2-h5/
├─ src/{main.tsx,App.tsx,styles.css,config/consent.ts,api/client.ts,
│       state/store.ts,pages/{Entry,Consent,Chat,Stations,Booking,Result,Privacy},
│       components/{AiBadge,Bubble,PolicyCard,StationCard,Progress}}
├─ mock/{server.mjs,data/stations.mjs,handlers/{agent,booking,consent,vault,state}.mjs}
├─ tests/{consent,clearAllLocal,persist,mock-state}.test.*
├─ e2e/{flow,consent,aibadge,privacy,viewport,offline}.spec.ts + helpers.ts
├─ scripts/collect-evidence.mjs
├─ Dockerfile（build/h5/mock 三 target）+ docker-compose.yml + nginx.conf + .dockerignore
├─ evidence/（真实运行输出与截图）
└─ VERIFICATION.md
```

## 8. 边界（诚实标注）

**本机已验证**：构建、20 项 Vitest 单测、8 项 Playwright E2E（系统 Chrome 驱动）、三宽度/150% 字号浏览器断言、mock 契约。

**需客户/集成环境**：docker compose 一键启动（本机无 Docker，文件写就绪，见 VERIFICATION.md 第 6 节）；
Task 1 真实 Agent 引擎与政策知识库召回、Task 3 真实并发预约与名额扣减、Task 5 真实保险箱加解密与审计；
真实短信/电话外呼与站长虚拟号；iOS/Android 真机与现网 4G 首屏指标（本机用 Chrome DevTools + 断言替代，未跑 Lighthouse 真机报告）；
Taro 同源小程序为加分项，本仓未包含构建产物（迁移路径见第 6 节），认证与上架由发单方负责。E2E 未跑 WebKit/iOS 模拟器。
