import { useState } from 'react';
import { api } from '../api/client';
import { useStore } from '../state/store';
import type { Nav } from './Entry';

export function ResultPage({ navigate }: { navigate: Nav }) {
  const { state, dispatch } = useStore();
  const [busy, setBusy] = useState(false);
  const booking = state.booking;
  const station = state.selectedStation;

  if (!booking || !station) {
    return (
      <div className="screen">
        <h1>预约结果</h1>
        <div className="card"><p>暂无预约记录。</p></div>
        <button className="btn primary wide" onClick={() => navigate('/entry')}>返回首页</button>
      </div>
    );
  }

  async function cancel() {
    setBusy(true);
    try {
      const updated = await api.patchBooking(booking.id, { status: 'cancelled' });
      dispatch({ type: 'SET_BOOKING', booking: updated });
    } catch (e: any) {
      dispatch({ type: 'SET_NOTICE', value: `取消失败：${e.message}` });
    } finally {
      setBusy(false);
    }
  }

  const statusText = booking.status === 'cancelled' ? '已取消' : '预约成功';

  return (
    <div className="screen">
      <h1 data-testid="result-title">预约结果 · {statusText}</h1>
      <section className="card" data-testid="result-card">
        <p className="row"><span>预约编号</span><b data-testid="booking-id">{booking.id}</b></p>
        <p className="row"><span>站点</span><b>{station.name}</b></p>
        <p className="row"><span>到站时段</span><b>{booking.slot_start.replace('T', ' ').slice(0, 16)}</b></p>
        <p className="row"><span>状态</span><b data-testid="booking-status">{statusText}</b></p>
        <h3>到站须知</h3>
        <p>{station.notice}</p>
        <p>录用与淘汰由人工确认；本页信息为合成演示数据。</p>
      </section>
      <a className="btn primary wide" data-testid="nav-btn" href={`geo:${station.lat},${station.lng}`}>导航到站点</a>
      <a className="btn secondary wide" data-testid="virtual-tel" href={`tel:${station.virtual_tel}`}>
        拨打站长虚拟号 {station.virtual_tel}
      </a>
      <button className="btn ghost wide" data-testid="reschedule-btn" onClick={() => navigate('/stations')}>改约</button>
      <button className="btn ghost wide" data-testid="cancel-booking" disabled={busy || booking.status === 'cancelled'} onClick={cancel}>取消预约</button>
      <button className="btn ghost wide" data-testid="privacy-entry" onClick={() => navigate('/privacy')}>个人信息自助</button>
    </div>
  );
}
