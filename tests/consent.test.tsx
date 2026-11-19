import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConsentView } from '../src/pages/Consent';
import {
  canStartConsent, CONSENT_VERSION, makeConsentAt, sanitizeSourceChannel
} from '../src/config/consent';

describe('AC2 同意门禁', () => {
  it('未勾选时「同意并开始」不可用', () => {
    render(<ConsentView agreed={false} onToggle={() => {}} onAgree={() => {}} onDecline={() => {}} />);
    const btn = screen.getByTestId('agree-start') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('勾选后按钮可用，且同意事件被触发', () => {
    const onAgree = vi.fn();
    render(<ConsentView agreed onAgree={onAgree} onToggle={() => {}} onDecline={() => {}} />);
    const btn = screen.getByTestId('agree-start') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(onAgree).toHaveBeenCalledTimes(1);
  });

  it('拒绝出口可用且不触发同意', () => {
    const onAgree = vi.fn();
    const onDecline = vi.fn();
    render(<ConsentView agreed={false} onAgree={onAgree} onToggle={() => {}} onDecline={onDecline} />);
    fireEvent.click(screen.getByTestId('decline-btn'));
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onAgree).not.toHaveBeenCalled();
  });

  it('门禁纯函数：只有明确 agree=true 才放行', () => {
    expect(canStartConsent(false)).toBe(false);
    expect(canStartConsent(true)).toBe(true);
  });
});

describe('契约常量与渠道白名单', () => {
  it('同意版本号固定', () => {
    expect(CONSENT_VERSION).toBe('v1.0-20261119');
  });

  it('同意时间为 UTC ISO 8601', () => {
    expect(makeConsentAt()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('source_channel 白名单拦截注入', () => {
    expect(sanitizeSourceChannel('poster_cityA')).toBe('poster_cityA');
    expect(sanitizeSourceChannel(null)).toBe('direct');
    expect(sanitizeSourceChannel('<script>x</script>')).toBe('unknown');
    expect(sanitizeSourceChannel('a'.repeat(33))).toBe('unknown');
  });
});
