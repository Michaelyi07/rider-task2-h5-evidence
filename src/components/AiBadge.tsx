import { AI_BADGE_TEXT } from '../config/consent';

export function AiBadge() {
  return (
    <div className="ai-badge" data-testid="ai-badge" role="status">
      <span className="ai-badge-dot" aria-hidden="true" />
      {AI_BADGE_TEXT}
    </div>
  );
}
