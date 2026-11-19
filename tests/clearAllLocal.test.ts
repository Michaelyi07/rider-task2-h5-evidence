import { describe, expect, it, vi } from 'vitest';
import { clearAllLocal } from '../src/state/store';
import { STORAGE_KEY } from '../src/config/consent';

describe('AC4 撤回同意后的本地清理（六个存储面）', () => {
  it('清空 localStorage / sessionStorage / cookie / IndexedDB / Cache API', async () => {
    localStorage.setItem(STORAGE_KEY, '{"sessionId":"s-1"}');
    localStorage.setItem('other-key', 'x');
    sessionStorage.setItem('source_channel', 'poster_cityA');
    document.cookie = 'clawhunt_test=1; path=/';

    const deleteDatabase = vi.fn();
    const cacheDelete = vi.fn().mockResolvedValue(true);
    const cacheKeys = vi.fn().mockResolvedValue(['clawhunt-v1']);
    Object.defineProperty(window, 'indexedDB', { value: { deleteDatabase }, configurable: true });
    Object.defineProperty(window, 'caches', { value: { keys: cacheKeys, delete: cacheDelete }, configurable: true });

    clearAllLocal();
    await Promise.resolve();

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).not.toContain('clawhunt_test');
    expect(deleteDatabase).toHaveBeenCalledWith('clawhunt-h5');
    expect(cacheKeys).toHaveBeenCalled();
    expect(cacheDelete).toHaveBeenCalledWith('clawhunt-v1');
  });
});
