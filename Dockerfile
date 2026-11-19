# ClawHunt Task 2/5 H5 — 单 Dockerfile 双 target：
#   target=build：Node 构建产物 dist
#   target=h5：nginx 静态服务（/api 反代到 mock 服务）
#   target=mock：Node 原生契约 mock（零依赖）

# ---------- 1) 前端构建 ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
RUN npm run build

# ---------- 2) H5 静态服务（nginx） ----------
FROM nginx:alpine AS h5
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

# ---------- 3) Mock API（Node 原生，无第三方依赖） ----------
FROM node:22-alpine AS mock
WORKDIR /app
ENV MOCK_HOST=0.0.0.0 MOCK_PORT=8787
COPY mock ./mock
EXPOSE 8787
HEALTHCHECK --interval=5s --timeout=3s --start-period=2s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "mock/server.mjs"]
