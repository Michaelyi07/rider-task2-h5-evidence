// 同意版本、时间戳与渠道白名单：前端契约常量（纯函数，便于单测）
export const CONSENT_VERSION = 'v1.0-20261119';
export const AI_BADGE_TEXT = '本服务由 AI 提供 · 可随时转人工';
export const STORAGE_KEY = 'clawhunt:session:v1';
export const TOTAL_FIELDS = 7;

/** 渠道参数白名单：防 prompt/XSS 注入第一道闸 */
export function sanitizeSourceChannel(raw: string | null | undefined): string {
  if (!raw) return 'direct';
  return /^[a-zA-Z0-9_-]{1,32}$/.test(raw) ? raw : 'unknown';
}

/** 同意时间点：UTC ISO 8601，禁止本地时区格式 */
export function makeConsentAt(): string {
  return new Date().toISOString();
}

/** 同意门禁：未勾选不得开始 */
export function canStartConsent(agreed: boolean): boolean {
  return agreed === true;
}
