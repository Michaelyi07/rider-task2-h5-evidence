const newClientId = () => `m-${globalThis.crypto.randomUUID()}`;
type ReqOptions = { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown };

async function request<T = any>(path: string, opts: ReqOptions = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000); // 弱网超时：避免挂起白屏
  try {
    const response = await fetch(`/api/v1${path}`, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'content-type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: ctrl.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw Object.assign(new Error(data.message || `HTTP ${response.status}`), {
        code: data.code,
        status: response.status
      });
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

export { newClientId };

export const api = {
  postConsent: (body: { candidate_id?: string; consent_version: string; consent_at: string; source_channel: string }) =>
    request('/consent', { method: 'POST', body }),
  createSession: (body: { candidate_id?: string; source_channel: string; consent_version: string; consent_at: string }) =>
    request('/agent/sessions', { method: 'POST', body }),
  getSession: (sessionId: string) => request(`/agent/sessions/${encodeURIComponent(sessionId)}`),
  postMessage: (sessionId: string, body: { text: string; messageId: string; source_channel: string; consent_version: string; consent_at: string }) =>
    request(`/agent/sessions/${encodeURIComponent(sessionId)}/messages`, { method: 'POST', body }),
  getStations: () => request('/stations'),
  createBooking: (body: { candidate_id: string | null; station_id: string; slot_start: string }) =>
    request('/bookings', { method: 'POST', body }),
  patchBooking: (id: string, body: { status?: string; slot_start?: string }) =>
    request(`/bookings/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  getMe: (candidateId: string) => request(`/candidates/${encodeURIComponent(candidateId)}/me`),
  patchMe: (candidateId: string, field: string, value: unknown) =>
    request(`/candidates/${encodeURIComponent(candidateId)}/me`, { method: 'PATCH', body: { field, value } }),
  exportData: (candidateId: string) => request(`/candidates/${encodeURIComponent(candidateId)}/export`),
  revoke: (candidateId: string) =>
    request('/consent/revoke', { method: 'POST', body: { candidate_id: candidateId, reason: 'user_request' } })
};
