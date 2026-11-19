import { PolicyCard } from './PolicyCard';
import type { Msg } from '../state/store';

export function Bubble({ message }: { message: Msg }) {
  const isUser = message.role === 'user';
  const pending = message.status === 'pending' || message.status === 'sending';
  return (
    <div className={`bubble-row ${isUser ? 'from-user' : 'from-ai'}`} data-testid="bubble">
      <div className={`bubble ${isUser ? 'bubble-user' : 'bubble-ai'}`}>
        <span className="bubble-role">{isUser ? '我' : 'AI'}</span>
        <span className="bubble-text">{message.text}</span>
        {pending && <span className="bubble-status" data-testid="bubble-pending"> · 待发送</span>}
      </div>
      {message.type === 'policy' && <PolicyCard payload={message.payload} />}
    </div>
  );
}
