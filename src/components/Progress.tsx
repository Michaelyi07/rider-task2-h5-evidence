export const FIELD_LABELS: Record<string, string> = {
  name: '称呼',
  birth_ym: '出生年月',
  area_text: '意向区域',
  job_type: '岗位意向',
  has_ebike: '车辆',
  start_text: '到岗时间',
  experience_text: '配送经验'
};

export function ProgressBar({ done, total, fields }: { done: number; total: number; fields: string[] }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <section className="progress-card" data-testid="progress" aria-label="报名进度">
      <div className="progress-head">
        <strong>报名进度 {done}/{total}</strong>
        <span>{pct}%</span>
      </div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
      <p className="progress-fields">
        已收集：{fields.length ? fields.map((f) => FIELD_LABELS[f] || f).join('、') : '暂无'}
      </p>
    </section>
  );
}
