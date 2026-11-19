import { consents, candidates, sessions, bookings, newId } from './state.mjs';

const ALLOWED_PATCH_FIELDS = new Set([
  'name', 'area_text', 'job_type', 'has_ebike', 'start_text', 'experience_text', 'health_cert'
]);

function maskName(value) {
  const v = String(value || '王师傅').trim();
  return `${v.slice(0, 1)}**`;
}

export function recordConsent(body = {}) {
  const candidate_id = body.candidate_id || newId('c');
  const now = new Date().toISOString();
  const rec = {
    candidate_id,
    consent_version: body.consent_version || null,
    consent_at: body.consent_at || null,
    source_channel: body.source_channel || 'direct',
    retention_until: new Date(Date.now() + 90 * 86400_000).toISOString(),
    created_at: now,
    revoked: false
  };
  consents.set(candidate_id, rec);
  if (!candidates.has(candidate_id)) candidates.set(candidate_id, { id: candidate_id, draft: {} });
  Object.assign(candidates.get(candidate_id), {
    source_channel: rec.source_channel,
    consent_version: rec.consent_version,
    consent_at: rec.consent_at,
    retention_until: rec.retention_until
  });
  return rec;
}

export function getMe(candidateId) {
  const c = candidates.get(candidateId);
  if (!c) return null;
  const d = c.draft || {};
  return {
    id: c.id,
    name: maskName(d.name),
    phone: '138****8000',
    name_token: `tk_name_${c.id.slice(-8)}`,
    phone_token: `tk_phone_${c.id.slice(-8)}`,
    birth_ym: d.birth_ym || '1995-06',
    area_text: d.area_text || '',
    job_type: d.job_type || 'undecided',
    has_ebike: d.has_ebike ?? null,
    start_text: d.start_text || '',
    experience_text: d.experience_text || '',
    health_cert: d.health_cert || 'none',
    source_channel: c.source_channel || 'direct',
    status: c.status || 'collecting',
    consent_version: c.consent_version || null,
    consent_at: c.consent_at || null,
    retention_until: c.retention_until || null
  };
}

export function patchMe(candidateId, body = {}) {
  const c = candidates.get(candidateId);
  if (!c) return null;
  const field = String(body.field || '');
  if (!ALLOWED_PATCH_FIELDS.has(field)) {
    return { error: { code: 'FIELD_NOT_ALLOWED', message: `字段 ${field} 不可通过本接口更正` } };
  }
  c.draft = { ...(c.draft || {}), [field]: body.value };
  return { ok: true, field, value: body.value, data: getMe(candidateId) };
}

export function exportData(candidateId) {
  const c = candidates.get(candidateId);
  if (!c) return null;
  return {
    candidate: {
      id: c.id,
      ...(c.draft || {}),
      name_token: `tk_name_${c.id.slice(-8)}`,
      phone_token: `tk_phone_${c.id.slice(-8)}`,
      source_channel: c.source_channel,
      status: c.status,
      consent_version: c.consent_version,
      consent_at: c.consent_at,
      retention_until: c.retention_until
    },
    consent: consents.get(candidateId) || null,
    exported_at: new Date().toISOString(),
    note: '合成数据副本；真实姓名与手机号仅在 Task 5 保险箱中存在。'
  };
}

export function revokeConsent(candidateId, body = {}) {
  const rec = consents.get(candidateId);
  if (rec) rec.revoked = true;
  const now = new Date().toISOString();
  for (const [sid, s] of sessions) if (s.candidate_id === candidateId) sessions.delete(sid);
  for (const [bid, b] of bookings) if (b.candidate_id === candidateId) bookings.delete(bid);
  consents.delete(candidateId);
  candidates.delete(candidateId);
  return { ok: true, revoked_at: now, reason: body.reason || 'user_request', deleted: true };
}
