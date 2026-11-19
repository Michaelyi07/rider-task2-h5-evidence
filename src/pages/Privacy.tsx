import { useState } from 'react';
import { api } from '../api/client';
import { clearAllLocal, useStore } from '../state/store';
import type { Nav } from './Entry';

const CORRECTABLE = ['name', 'area_text', 'start_text', 'experience_text'];

export function PrivacyPage({ navigate }: { navigate: Nav }) {
  const { state, dispatch } = useStore();
  const [view, setView] = useState<any>(null);
  const [field, setField] = useState(CORRECTABLE[0]);
  const [value, setValue] = useState('');
  const [correctResult, setCorrectResult] = useState<string | null>(null);
  const [downloadResult, setDownloadResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function doView() {
    try {
      setView(await api.getMe(state.candidateId || ''));
    } catch (e: any) {
      dispatch({ type: 'SET_NOTICE', value: `查看失败：${e.message}` });
    }
  }

  async function doCorrect() {
    try {
      const r = await api.patchMe(state.candidateId || '', field, value);
      setCorrectResult(`已更正：${field} = ${JSON.stringify(r.value)}`);
    } catch (e: any) {
      setCorrectResult(`更正失败：${e.message}`);
    }
  }

  async function doDownload() {
    try {
      const data = await api.exportData(state.candidateId || '');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-data.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      // 立即 revoke 会导致部分浏览器取消下载，延迟释放
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      setDownloadResult('已生成副本：my-data.json');
    } catch (e: any) {
      setDownloadResult(`下载失败：${e.message}`);
    }
  }

  async function doRevoke() {
    if (!state.candidateId) return;
    setBusy(true);
    try {
      await api.revoke(state.candidateId); // 先服务端删除成功
      clearAllLocal();                     // 再清 6 个本地面
      dispatch({ type: 'RESET' });         // 清 React 内存 state
      navigate('/entry?revoked=1');
    } catch (e: any) {
      dispatch({ type: 'SET_NOTICE', value: `撤回失败，请重试：${e.message}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <h1>个人信息自助</h1>
      <section className="card">
        <h3>1. 查看我的信息（脱敏）</h3>
        <button className="btn secondary" data-testid="privacy-view" onClick={doView}>查看</button>
        {view && <pre className="data-box" data-testid="privacy-data">{JSON.stringify(view, null, 2)}</pre>}
      </section>
      <section className="card">
        <h3>2. 更正我的信息</h3>
        <select data-testid="correct-field" value={field} onChange={(e) => setField(e.target.value)}>
          {CORRECTABLE.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <input data-testid="correct-value" value={value} placeholder="新值" onChange={(e) => setValue(e.target.value)} />
        <button className="btn secondary" data-testid="privacy-correct" onClick={doCorrect}>提交更正</button>
        {correctResult && <p data-testid="correct-result">{correctResult}</p>}
      </section>
      <section className="card">
        <h3>3. 下载信息副本</h3>
        <button className="btn secondary" data-testid="privacy-download" onClick={doDownload}>下载 my-data.json</button>
        {downloadResult && <p data-testid="download-result">{downloadResult}</p>}
      </section>
      <section className="card">
        <h3>4. 撤回授权并删除</h3>
        <p>撤回后服务器将删除您的报名信息，并清除本机缓存、会话与内存状态。</p>
        <button className="btn danger-btn" data-testid="privacy-revoke" disabled={busy} onClick={doRevoke}>
          {busy ? '处理中…' : '撤回授权并删除'}
        </button>
        <a className="btn ghost wide" href="tel:400-000-1807">联系人工处理</a>
      </section>
      <button className="btn ghost wide" onClick={() => navigate('/chat')}>返回对话</button>
    </div>
  );
}
