import { beforeEach, describe, expect, it } from 'vitest';
// 直接测 mock 状态机（Node ESM），无需起服务
import { createSession, getSession, postMessage, resetAgentState } from '../mock/handlers/agent.mjs';

const ANSWERS = ['王师傅', '1995-06', '城市A-中心区', '全职', '有', '本周内', '有 1 年'];

describe('Mock 会话状态机（按共享契约 v1）', () => {
  beforeEach(() => resetAgentState());

  it('7 项采集完成后 progress=7/7 且返回 show_stations', () => {
    const s = createSession({ source_channel: 'poster_cityA', consent_version: 'v1.0-20261119' });
    let last: any;
    ANSWERS.forEach((text, i) => {
      last = postMessage(s.session_id, { text, messageId: `m-${i}` });
    });
    expect(last.progress).toEqual({ done: 7, total: 7, fields: [
      'name', 'birth_ym', 'area_text', 'job_type', 'has_ebike', 'start_text', 'experience_text'
    ] });
    expect(last.actions).toContain('show_stations');
    expect(last.candidate_id).toBe(s.candidate_id);
  });

  it('政策问答返回出处与免责声明，且不推进采集进度', () => {
    const s = createSession({});
    postMessage(s.session_id, { text: '王师傅', messageId: 'm-1' });
    const r = postMessage(s.session_id, { text: '社保政策是什么', messageId: 'm-2' });
    expect(r.type).toBe('policy');
    expect(r.payload.source).toContain('v2.1');
    expect(r.payload.disclaimer).toContain('站点现场');
    expect(r.progress.done).toBe(1);
  });

  it('转人工返回 handoff，不填槽', () => {
    const s = createSession({});
    const r = postMessage(s.session_id, { text: '转人工', messageId: 'm-1' });
    expect(r.actions).toContain('handoff');
    expect(r.progress.done).toBe(0);
  });

  it('未成年（推算 <18）返回 end_minor 并终止', () => {
    const s = createSession({});
    postMessage(s.session_id, { text: '王师傅', messageId: 'm-1' });
    const r = postMessage(s.session_id, { text: '2012-05', messageId: 'm-2' });
    expect(r.actions).toContain('end_minor');
    expect(r.terminated).toBe(true);
    expect(r.progress.done).toBe(1);
    const after = postMessage(s.session_id, { text: '继续报名', messageId: 'm-3' });
    expect(after.actions).toContain('end_minor');
  });

  it('幂等键 messageId 重放不重复填槽', () => {
    const s = createSession({});
    const first = postMessage(s.session_id, { text: '王师傅', messageId: 'same-id' });
    const replay = postMessage(s.session_id, { text: '王师傅', messageId: 'same-id' });
    expect(replay).toEqual(first);
    expect(replay.progress.done).toBe(1);
    const next = postMessage(s.session_id, { text: '1995-06', messageId: 'm-2' });
    expect(next.progress.done).toBe(2);
  });

  it('可用 sessionId 拉取服务端权威状态用于断点续传', () => {
    const s = createSession({ source_channel: 'poster_x' });
    postMessage(s.session_id, { text: '王师傅', messageId: 'm-1' });
    postMessage(s.session_id, { text: '1995-06', messageId: 'm-2' });
    const state = getSession(s.session_id);
    expect(state.session_id).toBe(s.session_id);
    expect(state.progress.done).toBe(2);
    expect(state.messages).toHaveLength(4); // 2 user + 2 assistant
    expect(state.draft.name).toBe('王师傅');
  });
});
