// Task 5 保险箱的最小契约 mock：只发 token，不保存真实值（合成数据）。
import { newId } from './state.mjs';

const issued = new Map();

export function tokenize(body = {}) {
  if (!body.value) return { error: { code: 'INVALID_VALUE', message: 'value 不能为空' } };
  const token = `tk_${body.type || 'text'}_${newId('v').slice(2)}`;
  issued.set(token, { type: body.type || 'text', value: String(body.value) });
  return { token };
}

export function detokenize(body = {}) {
  if (!body.reason) return { error: { code: 'REASON_REQUIRED', message: 'detokenize 必须提供 reason' } };
  if (!body.token || !issued.has(body.token)) {
    return { error: { code: 'TOKEN_NOT_FOUND', message: 'token 不存在' } };
  }
  return { value: '***', reason: body.reason, note: '合成 mock：真实值仅存在于 Task 5 保险箱' };
}
