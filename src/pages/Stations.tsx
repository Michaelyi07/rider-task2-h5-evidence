import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { StationCard, type Station } from '../components/StationCard';
import { useStore } from '../state/store';
import type { Nav } from './Entry';

export function StationsPage({ navigate }: { navigate: Nav }) {
  const { dispatch } = useStore();
  const [stations, setStations] = useState<Station[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.getStations()
      .then((data: any) => { if (alive) setStations(Array.isArray(data) ? data : []); })
      .catch((e: any) => { if (alive) setError(`站点加载失败：${e.message}`); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="screen">
      <h1>推荐站点</h1>
      <p className="sub">按距离与剩余名额排序（合成数据）</p>
      {loading && <p>加载中…</p>}
      {error && <div className="banner danger">{error}</div>}
      {stations.map((s) => (
        <StationCard
          key={s.id}
          station={s}
          onPick={(slot) => {
            dispatch({ type: 'SELECT_SLOT', station: s, slot });
            navigate('/booking');
          }}
        />
      ))}
      <button className="btn ghost wide" onClick={() => navigate('/chat')}>返回对话</button>
    </div>
  );
}
