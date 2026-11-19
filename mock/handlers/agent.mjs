import { sessions, candidates, newId } from './state.mjs';

// 7 项采集字段（health_cert 为附加字段，不计入 total=7）
export const SLOT_DEFS = [
  { key: 'name', label: '称呼', question: '请问怎么称呼您？', quickReplies: ['王师傅', '李师傅', '不愿意透露'] },
  { key: 'birth_ym', label: '出生年月', question: '请问您的出生年月？（YYYY-MM）', quickReplies: ['1995-06', '2000-01', '1988-11'] },
  { key: 'area_text', label: '意向区域', question: '您想在哪个区域工作？', quickReplies: ['城市A-中心区', '城市A-东区', '城市B-南区'] },
  { key: 'job_type', label: '岗位意向', question: '想做全职还是兼职？', quickReplies: ['全职', '兼职', '待定'] },
  { key: 'has_ebike', label: '车辆', question: '是否已有电动自行车？', quickReplies: ['有', '无'] },
  { key: 'start_text', label: '到岗时间', question: '什么时候可以到岗？', quickReplies: ['本周内', '下周', '一个月内'] },
  { key: 'experience_text', label: '配送经验', question: '是否有配送经验？', quickReplies: ['有 1 年', '无经验', '有 3 年'] }
];

const LABELS = Object.fromEntries(SLOT_DEFS.map((s) => [s.key, s.label]));
const POLICY_KEYWORDS = ['政策', '多少钱', '社保', '收入', '保险', '待遇', '薪资', '考核'];

function normalizeValue(key, text) {
  const t = String(text || '').trim();
  if (key === 'job_type') {
    if (t.includes('全职')) return 'fulltime';
    if (t.includes('兼职')) return 'parttime';
    return 'undecided';
  }
  if (key === 'has_ebike') {
    if (t.startsWith('有')) return true;
    if (t.startsWith('无')) return false;
    return null;
  }
  return t;
}

function ageAt2026(ym) {
  const m = /^(\d{4})-(\d{1,2})$/.exec(String(ym).trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  let age = 2026 - year;
  if (11 < month) age -= 1;
  return age;
}

export function createSession(input = {}) {
  const session_id = newId('s');
  const candidate_id = input.candidate_id || newId('c');
  const session = {
    session_id,
    candidate_id,
    index: 0,
    fields: {},
    messages: [],
    progress: { done: 0, total: 7, fields: [] },
    actions: [],
    terminated: false,
    seq: 0,
    processed: new Map(),
    source_channel: input.source_channel || 'direct',
    consent_version: input.consent_version || null,
    consent_at: input.consent_at || null
  };
  sessions.set(session_id, session);
  if (!candidates.has(candidate_id)) {
    candidates.set(candidate_id, { id: candidate_id, draft: {} });
  }
  Object.assign(candidates.get(candidate_id), {
    source_channel: session.source_channel,
    consent_version: session.consent_version,
    consent_at: session.consent_at,
    status: 'collecting'
  });
  return {
    session_id,
    candidate_id,
    greeting: '您好，我是 AI 招聘助手。接下来用几个简单问题帮您完成报名，随时可以说「转人工」。',
    quick_replies: [...SLOT_DEFS[0].quickReplies, '政策咨询', '转人工'],
    progress: { ...session.progress }
  };
}

export function getSession(id) {
  const s = sessions.get(id);
  if (!s) return null;
  return {
    session_id: s.session_id,
    candidate_id: s.candidate_id,
    messages: s.messages.map((m) => ({ ...m })),
    progress: { ...s.progress, fields: [...s.progress.fields] },
    actions: [...s.actions],
    terminated: s.terminated,
    draft: { ...s.fields },
    index: s.index
  };
}

export function postMessage(id, body = {}) {
  const s = sessions.get(id);
  if (!s) return null;

  const text = String(body.text || '').trim();
  const messageId = String(body.messageId || newId('m'));
  // 幂等：同一 messageId 重放时返回首次结果，绝不重复填槽。
  if (s.processed.has(messageId)) return s.processed.get(messageId);

  const seq = ++s.seq;
  s.messages.push({ id: messageId, role: 'user', type: 'text', text, seq, status: 'sent' });

  let reply = '';
  let type = 'text';
  let payload = null;
  let quick_replies = [];
  const actions = [];

  if (/转人工|人工客服|切换人工/.test(text)) {
    reply = '已为您转接人工客服，请稍候（人工服务时间 09:00-21:00）。';
    actions.push('handoff');
    quick_replies = ['继续报名', '查看推荐站点'];
  } else if (POLICY_KEYWORDS.some((k) => text.includes(k))) {
    type = 'policy';
    reply = '这是我能提供的合成政策示例说明（非真实政策）：';
    payload = {
      answer: '站点按实际排班与订单量结算，具体薪资结构、社保与考核规则以站点公示为准；本演示不承诺任何具体收入金额。',
      source: '《城市A骑手政策 v2.1》 · 2026-10-01（合成示例）',
      disclaimer: '政策以站点现场解释为准；本回答为合成演示数据，不构成承诺。'
    };
    quick_replies = ['查看推荐站点', '转人工'];
  } else if (s.terminated) {
    reply = '报名已按未成年人保护规则终止。如需咨询请拨 400-000-1807。';
    actions.push('end_minor');
  } else if (s.index < SLOT_DEFS.length) {
    const def = SLOT_DEFS[s.index];
    if (def.key === 'birth_ym') {
      const age = ageAt2026(text);
      if (age !== null && age < 18) {
        s.terminated = true;
        reply = '抱歉，根据平台政策需年满 18 周岁才能报名，本次报名已终止。';
        actions.push('end_minor');
        quick_replies = [];
      }
    }
    if (actions.length === 0) {
      s.fields[def.key] = normalizeValue(def.key, text);
      s.index += 1;
      s.progress = {
        done: s.index,
        total: 7,
        fields: SLOT_DEFS.slice(0, s.index).map((d) => d.key)
      };
      if (s.index >= SLOT_DEFS.length) {
        reply = '7 项信息已收集完毕！下面是为您推荐的站点。';
        actions.push('show_stations');
        quick_replies = ['查看推荐站点', '政策咨询', '转人工'];
        const c = candidates.get(s.candidate_id);
        if (c) c.status = 'complete';
      } else {
        const next = SLOT_DEFS[s.index];
        reply = `已记录：${LABELS[def.key]}。${next.question}`;
        quick_replies = [...next.quickReplies, '政策咨询', '转人工'];
      }
    }
  } else {
    reply = '已为您准备好推荐站点，可查看距离、在招人数与可约时段。';
    actions.push('show_stations');
    quick_replies = ['查看推荐站点', '政策咨询', '转人工'];
  }

  const candidate = candidates.get(s.candidate_id);
  if (candidate) candidate.draft = { ...s.fields };

  const assistantId = `a-${seq}`;
  s.messages.push({ id: assistantId, role: 'assistant', type, text: reply, payload, seq, status: 'sent' });

  const result = {
    messageId,
    seq,
    session_id: s.session_id,
    candidate_id: s.candidate_id,
    reply,
    type,
    payload,
    quick_replies,
    progress: { ...s.progress, fields: [...s.progress.fields] },
    actions,
    terminated: s.terminated
  };
  s.processed.set(messageId, result);
  return result;
}

export function resetAgentState() {
  sessions.clear();
  candidates.clear();
}
