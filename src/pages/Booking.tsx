import { useState } from 'react';
import { api } from '../api/client';
import { useStore } from '../state/store';
import type { Nav } from './Entry';

export function BookingPage({ navigate }: { navigate: Nav }) {
  const { state, dispatch } = useStore();
  const [busy, setBusy] = useState(false);

  const station = state.selectedStation;
  const slot = state.selectedSlot;

  if (!station || !slot) {
    return (
      <div className="screen">
        <h1>预约面试</h1>
        <div className="card"><p>请先选择站点与时段。</p></div>
        <button className="btn primary wide" onClick={() => navigate('/stations')}>选择站点</button>
      </div>
    );
  }

  async function confirm() {
    setBusy(true);
    try {
      const booking = await api.createBooking({
        candidate_id: state.candidateId,
        station_id: station.id,
        slot_start: slot!
      });
      dispatch({ type: 'SET_BOOKING', booking });
      navigate('/result');
    } catch (e: any) {
      dispatch({ type: 'SET_NOTICE', value: `预约失败：${e.message || '请重试'}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <h1>确认预约</h1>
      <section className="card">
        <p className="row"><span>站点</span><b>{state.selectedStation.name}</b></p>
        <p className="row"><span>地址坐标</span><b>{state.selectedStation.lat}, {state.selectedStation.lng}</b></p>
        <p className="row"><span>到站时段</span><b>{slot.replace('T', ' ').slice(0, 16)}</b></p>
        <p className="row"><span>预约编号</span><b>提交后生成</b></p>
      </section>
      <button className="btn primary wide" data-testid="confirm-booking" disabled={busy} onClick={confirm}>
        {busy ? '提交中…' : '确认预约'}
      </button>
      <button className="btn ghost wide" onClick={() => navigate('/stations')}>返回改约</button>
    </div>
  );
}
