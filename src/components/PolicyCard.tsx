export function PolicyCard({ payload }: { payload: any }) {
  const p = payload || {};
  return (
    <article className="card policy-card" data-testid="policy-card">
      <h4>政策问答（合成示例）</h4>
      <p className="policy-answer">{p.answer || '暂无政策内容，已为您转人工。'}</p>
      <div className="policy-source" data-testid="policy-source">出处：{p.source || '未标注'}</div>
      <p className="policy-disclaimer">{p.disclaimer || '政策以站点现场解释为准。'}</p>
    </article>
  );
}
