import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { STORAGE_KEY } from '../config/consent';

export interface Progress { done: number; total: number; fields: string[] }
export interface Msg {
  id: string;
  role: 'user' | 'assistant';
  type: 'text' | 'policy' | 'station';
  text: string;
  payload?: any;
  status?: 'sending' | 'sent' | 'pending';
  seq?: number;
}
export interface SessionState {
  schemaVersion: 1;
  sessionId: string | null;
  candidateId: string | null;
  sourceChannel: string;
  consent: { agreed: boolean; version: string; at: string } | null;
  messages: Msg[];
  progress: Progress;
  quickReplies: string[];
  draft: Record<string, any>;
  actions: string[];
  stationsReady: boolean;
  selectedStation: any | null;
  selectedSlot: string | null;
  booking: any | null;
  isOffline: boolean;
  outbox: Msg[];
  terminated: boolean;
  notice: string | null;
}

export type Action =
  | { type: 'SET_SOURCE'; value: string }
  | { type: 'SET_CONSENT'; value: { agreed: boolean; version: string; at: string } }
  | { type: 'SET_CANDIDATE'; id: string }
  | { type: 'SET_SESSION'; id: string; candidateId?: string; greeting?: string; quickReplies?: string[]; progress?: Progress }
  | { type: 'ADD_MESSAGE'; message: Msg }
  | { type: 'UPDATE_MESSAGE'; id: string; patch: Partial<Msg> }
  | { type: 'SET_REPLY'; response: any }
  | { type: 'SET_PROGRESS'; value: Progress }
  | { type: 'SET_OFFLINE'; value: boolean }
  | { type: 'QUEUE'; message: Msg }
  | { type: 'CLEAR_OUTBOX' }
  | { type: 'MERGE_MESSAGES'; messages: Msg[] }
  | { type: 'SELECT_SLOT'; station: any; slot: string }
  | { type: 'SET_BOOKING'; booking: any }
  | { type: 'SET_NOTICE'; value: string | null }
  | { type: 'RESET' };

export function initialState(sourceChannel = 'direct'): SessionState {
  return {
    schemaVersion: 1,
    sessionId: null,
    candidateId: null,
    sourceChannel,
    consent: null,
    messages: [],
    progress: { done: 0, total: 7, fields: [] },
    quickReplies: [],
    draft: {},
    actions: [],
    stationsReady: false,
    selectedStation: null,
    selectedSlot: null,
    booking: null,
    isOffline: false,
    outbox: [],
    terminated: false,
    notice: null
  };
}

/** 空状态不落盘，保证撤回后 localStorage 长度为 0 */
export function isPristine(s: SessionState): boolean {
  return !s.sessionId && !s.candidateId && !s.consent?.agreed && s.messages.length === 0 && !s.booking;
}

/** 按 id 去重合并消息；本地 pending 与服务端 sent 同 id 时保留 sent */
export function mergeMessages(local: Msg[] = [], remote: Msg[] = []): Msg[] {
  const map = new Map<string, Msg>();
  for (const m of [...local, ...remote]) {
    const prev = map.get(m.id);
    if (!prev || (prev.status === 'pending' && m.status !== 'pending')) {
      map.set(m.id, { ...m });
    }
  }
  return [...map.values()];
}

export function reducer(s: SessionState, a: Action): SessionState {
  switch (a.type) {
    case 'SET_SOURCE':
      return { ...s, sourceChannel: a.value };
    case 'SET_CONSENT':
      return { ...s, consent: a.value };
    case 'SET_CANDIDATE':
      return { ...s, candidateId: a.id };
    case 'SET_SESSION': {
      const greeting: Msg = {
        id: 'a-0', role: 'assistant', type: 'text',
        text: a.greeting || '您好，我是 AI 招聘助手。', status: 'sent', seq: 0
      };
      return {
        ...s,
        sessionId: a.id,
        candidateId: a.candidateId || s.candidateId,
        messages: mergeMessages([], [greeting]),
        progress: a.progress || s.progress,
        quickReplies: a.quickReplies || s.quickReplies
      };
    }
    case 'ADD_MESSAGE':
      return { ...s, messages: mergeMessages(s.messages, [a.message]) };
    case 'UPDATE_MESSAGE':
      return { ...s, messages: s.messages.map((m) => (m.id === a.id ? { ...m, ...a.patch } : m)) };
    case 'SET_REPLY': {
      const r = a.response || {};
      const assistant: Msg = {
        id: `a-${r.seq ?? Date.now()}`,
        role: 'assistant',
        type: r.type === 'policy' ? 'policy' : 'text',
        text: r.reply || '',
        payload: r.payload || null,
        status: 'sent',
        seq: r.seq
      };
      const acts: string[] = r.actions || [];
      const nextProgress: Progress = r.progress && r.progress.done >= s.progress.done ? r.progress : s.progress;
      return {
        ...s,
        messages: mergeMessages(s.messages, [assistant]),
        quickReplies: r.quick_replies || [],
        progress: nextProgress,
        draft: r.draft ? { ...r.draft } : s.draft,
        candidateId: r.candidate_id || s.candidateId,
        actions: acts,
        stationsReady: acts.includes('show_stations') ? true : s.stationsReady,
        terminated: r.terminated ?? s.terminated,
        notice: acts.includes('handoff')
          ? '已为您转接人工客服'
          : acts.includes('end_minor')
            ? '报名已按未成年人保护规则终止'
            : s.notice
      };
    }
    case 'SET_PROGRESS':
      return { ...s, progress: a.value.done >= s.progress.done ? a.value : s.progress };
    case 'SET_OFFLINE':
      return { ...s, isOffline: a.value, notice: a.value ? '网络已断开，消息将在恢复后自动发送' : s.notice };
    case 'QUEUE':
      return { ...s, outbox: mergeMessages(s.outbox, [a.message]) };
    case 'CLEAR_OUTBOX':
      return { ...s, outbox: [] };
    case 'MERGE_MESSAGES':
      return { ...s, messages: mergeMessages(s.messages, a.messages) };
    case 'SELECT_SLOT':
      return { ...s, selectedStation: a.station, selectedSlot: a.slot };
    case 'SET_BOOKING':
      return { ...s, booking: a.booking };
    case 'SET_NOTICE':
      return { ...s, notice: a.value };
    case 'RESET':
      return initialState();
    default:
      return s;
  }
}

export function persist(state: SessionState): void {
  try {
    if (isPristine(state)) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch { /* 隐私模式下 localStorage 不可用，静默降级 */ }
}

export function restore(): SessionState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.schemaVersion !== 1) return null;
    return { ...initialState(parsed.sourceChannel || 'direct'), ...parsed, schemaVersion: 1 };
  } catch {
    return null;
  }
}

/** 撤回同意：先由调用方确认服务端删除成功，再清全部本地面 */
export function clearAllLocal(): void {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch { /* ignore */ }
  try {
    document.cookie.split(';').forEach((c) => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
    });
  } catch { /* ignore */ }
  try {
    if (typeof indexedDB !== 'undefined' && indexedDB.deleteDatabase) indexedDB.deleteDatabase('clawhunt-h5');
  } catch { /* ignore */ }
  try {
    if (typeof caches !== 'undefined' && caches.keys) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => undefined);
    }
  } catch { /* ignore */ }
}

const StoreContext = createContext<{ state: SessionState; dispatch: React.Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => restore() || initialState());
  useEffect(() => { persist(state); }, [state]);
  return React.createElement(StoreContext.Provider, { value: { state, dispatch } }, children);
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore 必须在 StoreProvider 内使用');
  return ctx;
}
