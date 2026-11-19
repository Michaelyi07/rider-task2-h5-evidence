import { beforeEach, describe, expect, it } from 'vitest';
import { initialState, isPristine, mergeMessages, persist, reducer, restore } from '../src/state/store';
import { STORAGE_KEY } from '../src/config/consent';
import type { Msg } from '../src/state/store';

describe('AC6 断点续传 / 本地持久化', () => {
  beforeEach(() => localStorage.clear());

  it('会话、消息、进度、同意状态写入后可恢复', () => {
    const s = initialState('poster_cityA');
    s.sessionId = 's-test';
    s.candidateId = 'c-test';
    s.consent = { agreed: true, version: 'v1.0-20261119', at: '2026-11-19T08:30:00.000Z' };
    s.messages = [{ id: 'm-1', role: 'user', type: 'text', text: '王师傅', status: 'sent' }];
    s.progress = { done: 1, total: 7, fields: ['name'] };
    persist(s);

    const r = restore()!;
    expect(r.sessionId).toBe('s-test');
    expect(r.sourceChannel).toBe('poster_cityA');
    expect(r.consent?.at).toBe('2026-11-19T08:30:00.000Z');
    expect(r.messages).toHaveLength(1);
    expect(r.progress.done).toBe(1);
  });

  it('schemaVersion 不匹配时拒绝恢复', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 99, sessionId: 's-old' }));
    expect(restore()).toBeNull();
  });

  it('空状态不落盘，撤回后存储可被清空', () => {
    expect(isPristine(initialState())).toBe(true);
    persist(initialState());
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('离线重放：按 id 去重，pending 被服务端 sent 版本替换', () => {
    const local: Msg[] = [
      { id: 'm-1', role: 'user', type: 'text', text: '王师傅', status: 'pending' },
      { id: 'a-1', role: 'assistant', type: 'text', text: '已记录', status: 'sent', seq: 1 }
    ];
    const remote: Msg[] = [
      { id: 'm-1', role: 'user', type: 'text', text: '王师傅', status: 'sent', seq: 1 },
      { id: 'a-1', role: 'assistant', type: 'text', text: '已记录', status: 'sent', seq: 1 }
    ];
    const merged = mergeMessages(local, remote);
    expect(merged).toHaveLength(2);
    expect(merged.find((m) => m.id === 'm-1')?.status).toBe('sent');
  });

  it('进度不允许回退（恢复的服务端状态落后于本地时）', () => {
    const s = initialState();
    s.progress = { done: 4, total: 7, fields: ['name', 'birth_ym', 'area_text', 'job_type'] };
    const next = reducer(s, { type: 'SET_PROGRESS', value: { done: 2, total: 7, fields: ['name', 'birth_ym'] } });
    expect(next.progress.done).toBe(4);
  });

  it('SET_REPLY 幂等：同一 seq 的助手气泡不重复', () => {
    let s = initialState();
    s.sessionId = 's-1';
    const response = { seq: 3, reply: '已记录', type: 'text', progress: { done: 1, total: 7, fields: ['name'] } };
    s = reducer(s, { type: 'SET_REPLY', response });
    s = reducer(s, { type: 'SET_REPLY', response });
    expect(s.messages.filter((m) => m.id === 'a-3')).toHaveLength(1);
    expect(s.progress.done).toBe(1);
  });
});
