import { STATIONS } from '../data/stations.mjs';
import { bookings, newId } from './state.mjs';

export function listStations() {
  return STATIONS.map((s) => ({ ...s, slots: [...s.slots] }));
}

export function createBooking(body = {}) {
  const { candidate_id, station_id, slot_start } = body;
  if (!station_id || !slot_start) {
    return { error: { code: 'INVALID_BOOKING', message: '缺少 station_id 或 slot_start' } };
  }
  const station = STATIONS.find((s) => s.id === station_id);
  if (!station || !station.slots.includes(slot_start)) {
    return { error: { code: 'SLOT_UNAVAILABLE', message: '所选时段不可预约，请重新选择' } };
  }
  const booking = {
    id: newId('b'),
    candidate_id: candidate_id || 'anonymous',
    station_id,
    slot_start,
    status: 'booked',
    created_at: new Date().toISOString()
  };
  bookings.set(booking.id, booking);
  return booking;
}

export function getBooking(id) {
  const b = bookings.get(id);
  return b ? { ...b } : null;
}

export function patchBooking(id, body = {}) {
  const b = bookings.get(id);
  if (!b) return null;
  if (body.status === 'cancelled') b.status = 'cancelled';
  if (body.status === 'done') b.status = 'done';
  if (body.slot_start) b.slot_start = body.slot_start;
  b.updated_at = new Date().toISOString();
  return { ...b };
}
