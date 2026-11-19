import { useCallback, useEffect, useRef, useState } from 'react';
import { api, newClientId } from '../api/client';
import { Bubble } from '../components/Bubble';
import { ProgressBar } from '../components/Progress';
import { useStore, type Msg } from '../state/store';
import type { Nav } from './Entry';

export function ChatPage({ navigate }: { navigate: Nav }) {
  const { state, dispatch } = useStore();
  const [input, setInput] = useState('');
  const [voiceTip, setVoiceTip] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const bottomRef = useRef<HTMLDivElement>(null);

  const deliver = useCallback(async (msg: Msg) => {
    const s = stateRef.current;
    if (!s.sessionId || !s.consent) return;
    try {
      const r = await api.postMessage(s.sessionId, {
        text: msg.text,
        messageId: msg.id,
        source_channel: s.sourceChannel,
        consent_version: s.consent.version,
        consent_at: s.consent.at
      });
      dispatch({ type: 'UPDATE_MESSAGE', id: msg.id, patch: { status: 'sent' } });
      dispatch({ type: 'SET_REPLY', response: r });
    } catch {
      dispatch({ type: 'UPDATE_MESSAGE', id: msg.id, patch: { status: 'pending' } });
      dispatch({ type: 'QUEUE', message: { ...msg, status: 'pending' } });
      dispatch({ type: 'SET_NOTICE', value: '网络异常，消息已排队，恢复后自动发送' });
    }
  }, [dispatch]);

  /** 断点续传：用 sessionId 拉服务端权威状态，按 id 合并并按幂等键重放 outbox */
  const sync = useCallback(async () => {
    const s = stateRef.current;
    if (!s.sessionId) return;
    try {
      const remote = await api.getSession(s.sessionId);
      dispatch({ type: 'MERGE_MESSAGES', messages: remote.messages || [] });
      if (remote.progress) dispatch({ type: 'SET_PROGRESS', value: remote.progress });
    } catch { /* 服务端暂不可达时保留本地状态 */ }
    const pending = stateRef.current.outbox.slice();
    for (const msg of pending) await deliver(msg);
    dispatch({ type: 'CLEAR_OUTBOX' });
  }, [dispatch, deliver]);

  useEffect(() => {
    const onOff = () => dispatch({ type: 'SET_OFFLINE', value: true });
    const onOn = () => {
      dispatch({ type: 'SET_OFFLINE', value: false });
      void sync();
    };
    window.addEventListener('offline', onOff);
    window.addEventListener('online', onOn);
    if (navigator.onLine === false) dispatch({ type: 'SET_OFFLINE', value: true });
    return () => {
      window.removeEventListener('offline', onOff);
      window.removeEventListener('online', onOn);
    };
  }, [dispatch, sync]);

  // 兜底心跳：即使 online 事件未触发，只要有离线消息也会重连重放
  useEffect(() => {
    const timer = window.setInterval(() => {
      const s = stateRef.current;
      if (s.outbox.length > 0 && navigator.onLine) void sync();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [sync]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'end' });
  }, [state.messages.length]);

  function sendText(text: string) {
    const t = text.trim();
    if (!t || stateRef.current.terminated) return;
    const s = stateRef.current;
    const msg: Msg = {
      id: newClientId(), role: 'user', type: 'text', text: t,
      status: s.isOffline ? 'pending' : 'sending'
    };
    dispatch({ type: 'ADD_MESSAGE', message: msg });
    setInput('');
    if (s.isOffline) {
      dispatch({ type: 'QUEUE', message: { ...msg, status: 'pending' } });
      dispatch({ type: 'SET_NOTICE', value: '当前离线，消息已暂存，恢复后自动发送' });
      return;
    }
    void deliver(msg);
  }

  function onVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceTip('当前浏览器不支持语音输入，已回退到文字输入');
      return;
    }
    try {
      const rec = new SR();
      rec.lang = 'zh-CN';
      let finished = false;
      const fallback = window.setTimeout(() => {
        if (!finished) {
          finished = true;
          rec.stop?.();
          setVoiceTip('语音识别超时，已回退到文字输入');
        }
      }, 8000);
      rec.onresult = (e: any) => {
        finished = true;
        window.clearTimeout(fallback);
        const text = e.results?.[0]?.[0]?.transcript;
        if (text) sendText(String(text));
      };
      rec.onerror = () => {
        finished = true;
        window.clearTimeout(fallback);
        setVoiceTip('语音识别失败，已回退到文字输入');
      };
      rec.start();
    } catch {
      setVoiceTip('语音不可用，已回退到文字输入');
    }
  }

  const showStations = state.stationsReady || state.actions.includes('show_stations');
  const pendingCount = state.outbox.length;

  return (
    <div className="screen chat-screen">
      <ProgressBar {...state.progress} />
      {state.isOffline && <div className="banner" data-testid="offline-banner">离线中 · {pendingCount} 条消息待发送</div>}
      {state.terminated && <div className="banner danger" data-testid="minor-banner">报名已终止（未满 18 周岁）</div>}
      {voiceTip && <div className="banner" data-testid="voice-tip">{voiceTip}</div>}

      <div className="message-list" data-testid="message-list">
        {state.messages.map((m) => <Bubble key={m.id} message={m} />)}
        <div ref={bottomRef} />
      </div>

      {showStations && (
        <button className="btn secondary wide" data-testid="go-stations" onClick={() => navigate('/stations')}>
          查看推荐站点
        </button>
      )}

      {!state.terminated && state.quickReplies.length > 0 && (
        <div className="quick-replies" data-testid="quick-replies">
          {state.quickReplies.map((q) => (
            <button key={q} className="btn chip" data-testid="quick-reply" onClick={() => sendText(q)}>{q}</button>
          ))}
        </div>
      )}

      {!state.terminated && (
        <div className="composer">
          <input
            data-testid="chat-input"
            value={input}
            placeholder="输入回答…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendText(input); }}
          />
          <button className="btn primary" data-testid="send-btn" onClick={() => sendText(input)}>发送</button>
          <button className="btn ghost" data-testid="voice-btn" onClick={onVoice}>语音</button>
          <button className="btn ghost" data-testid="handoff-btn" onClick={() => sendText('转人工')}>转人工</button>
        </div>
      )}
    </div>
  );
}
