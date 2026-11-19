import { useState } from 'react';
import { api } from '../api/client';
import { canStartConsent, CONSENT_VERSION, makeConsentAt } from '../config/consent';
import { useStore } from '../state/store';
import type { Nav } from './Entry';

type ViewProps = {
  agreed: boolean;
  busy?: boolean;
  consentAt?: string | null;
  onToggle: (v: boolean) => void;
  onAgree: () => void;
  onDecline: () => void;
};

/** 纯展示组件：便于单测直接断言"未勾选不能开始" */
export function ConsentView({ agreed, busy, consentAt, onToggle, onAgree, onDecline }: ViewProps) {
  const enabled = canStartConsent(agreed) && !busy;
  return (
    <div className="screen">
      <h1>知情同意</h1>
      <section className="card consent-card">
        <h3>我们会收集什么</h3>
        <p>7 项报名信息：称呼、出生年月、意向区域、岗位意向、车辆、到岗时间、配送经验；以及来源渠道与同意记录。</p>
        <h3>我们不会收集</h3>
        <p>身份证号、银行卡号、人脸等敏感信息；请不要在对话中发送这些内容。</p>
        <h3>用途</h3>
        <p>用于报名登记、政策咨询答复与到站面试预约；录用与淘汰始终由人工确认。</p>
        <h3>保存期限</h3>
        <p>未录用信息默认保存 90 天，对话原文保存 30 天，到期删除或匿名化。</p>
        <h3>您的权利</h3>
        <p>可随时查看、更正、下载副本，或撤回授权并要求删除；也可联系人工处理。</p>
      </section>
      <label className="check-row">
        <input
          type="checkbox"
          data-testid="consent-checkbox"
          checked={agreed}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span>我已阅读并同意上述告知，同意按此收集与使用信息</span>
      </label>
      <button className="btn primary wide" data-testid="agree-start" disabled={!enabled} onClick={onAgree}>
        {busy ? '提交中…' : '同意并开始报名'}
      </button>
      <button className="btn ghost wide" data-testid="decline-btn" onClick={onDecline}>不同意，退出报名</button>
      <p className="footnote" data-testid="consent-version">
        同意版本：{CONSENT_VERSION}{consentAt ? ` · 时间：${consentAt}` : ''}
      </p>
    </div>
  );
}

export function ConsentPage({ navigate }: { navigate: Nav }) {
  const { state, dispatch } = useStore();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onAgree() {
    if (!canStartConsent(agreed) || busy) return;
    setBusy(true);
    const consent_at = makeConsentAt();
    try {
      const consent = await api.postConsent({
        candidate_id: state.candidateId || undefined,
        consent_version: CONSENT_VERSION,
        consent_at,
        source_channel: state.sourceChannel
      });
      dispatch({ type: 'SET_CANDIDATE', id: consent.candidate_id });
      const session = await api.createSession({
        candidate_id: consent.candidate_id,
        source_channel: state.sourceChannel,
        consent_version: CONSENT_VERSION,
        consent_at
      });
      dispatch({ type: 'SET_CONSENT', value: { agreed: true, version: CONSENT_VERSION, at: consent_at } });
      dispatch({
        type: 'SET_SESSION',
        id: session.session_id,
        candidateId: session.candidate_id,
        greeting: session.greeting,
        quickReplies: session.quick_replies,
        progress: session.progress
      });
      navigate('/chat');
    } catch (err: any) {
      dispatch({ type: 'SET_NOTICE', value: `提交同意失败：${err.message || '请重试'}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConsentView
      agreed={agreed}
      busy={busy}
      consentAt={state.consent?.at}
      onToggle={setAgreed}
      onAgree={onAgree}
      onDecline={() => navigate('/decline')}
    />
  );
}

export function DeclinePage({ navigate }: { navigate: Nav }) {
  return (
    <div className="screen">
      <h1>已退出报名</h1>
      <section className="card">
        <p>您选择了不同意，我们不会收集任何报名信息，也不会创建会话。</p>
        <a className="btn primary wide" href="tel:400-000-1807">电话咨询报名</a>
        <button className="btn ghost wide" onClick={() => navigate('/consent')}>重新考虑</button>
      </section>
    </div>
  );
}
