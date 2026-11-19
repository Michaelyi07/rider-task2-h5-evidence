export type Station = {
  id: string;
  name: string;
  distance_km: number;
  open_quota: number;
  slots: string[];
  notice?: string;
  virtual_tel?: string;
};

export function StationCard({ station, onPick }: { station: Station; onPick: (slot: string) => void }) {
  return (
    <article className="card station-card" data-testid="station-card">
      <h4>{station.name}</h4>
      <div className="station-meta">
        <span>距离约 {station.distance_km} km</span>
        <span>在招 {station.open_quota} 人</span>
      </div>
      <p className="station-label">可约时段（点击选择）：</p>
      <div className="slot-list">
        {station.slots.map((slot) => (
          <button key={slot} className="btn slot-btn" data-testid="slot-btn" onClick={() => onPick(slot)}>
            {slot.replace('T', ' ').slice(0, 16)}
          </button>
        ))}
      </div>
    </article>
  );
}
