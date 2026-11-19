import { useStore } from '../state/store';

export type Nav = (to: string) => void;

export function EntryPage({ navigate }: { navigate: Nav }) {
  const { state } = useStore();
  const revoked = new URLSearchParams(window.location.search).get('revoked') === '1';
  return (
    <div className="screen">
      <section className="hero">
        <h1>骑手报名助手</h1>
        <p>几分钟完成报名、问清政策、预约到站面试</p>
      </section>
      {revoked && (
        <div className="banner" data-testid="revoked-banner">已撤回授权并删除您的信息</div>
      )}
      <section className="card">
        <p className="row"><span>来源渠道</span><b data-testid="source-channel">{state.sourceChannel}</b></p>
        <p className="row"><span>报名项目</span><b>城市A / 城市B 骑手招募（合成演示）</b></p>
        <p className="row"><span>预计用时</span><b>约 3 分钟</b></p>
        <button className="btn primary wide" data-testid="start-btn" onClick={() => navigate('/consent')}>
          开始报名
        </button>
        <a className="btn ghost wide" href="tel:400-000-1807">电话咨询报名</a>
      </section>
      <p className="footnote">本演示仅使用合成数据，不收集真实个人信息。</p>
    </div>
  );
}
