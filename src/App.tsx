import { useCallback, useEffect, useState } from 'react';
import { AiBadge } from './components/AiBadge';
import { sanitizeSourceChannel } from './config/consent';
import { BookingPage } from './pages/Booking';
import { ChatPage } from './pages/Chat';
import { ConsentPage, DeclinePage } from './pages/Consent';
import { EntryPage } from './pages/Entry';
import { PrivacyPage } from './pages/Privacy';
import { ResultPage } from './pages/Result';
import { StationsPage } from './pages/Stations';
import { StoreProvider, useStore } from './state/store';

const PROTECTED = ['/chat', '/stations', '/booking', '/result', '/privacy'];

function Shell() {
  const { state, dispatch } = useStore();
  const [path, setPath] = useState(window.location.pathname);

  const navigate = useCallback((to: string) => {
    window.history.pushState({}, '', to);
    setPath(window.location.pathname);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('source_channel');
    if (raw !== null) {
      const sc = sanitizeSourceChannel(raw);
      dispatch({ type: 'SET_SOURCE', value: sc });
      try { sessionStorage.setItem('source_channel', sc); } catch { /* ignore */ }
    }
  }, [dispatch]);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // 同意门禁：未同意不得进入受保护路由
  useEffect(() => {
    if (PROTECTED.includes(path) && !state.consent?.agreed) {
      window.history.replaceState({}, '', '/consent');
      setPath('/consent');
    }
  }, [path, state.consent]);

  let content: React.ReactNode;
  switch (path) {
    case '/consent': content = <ConsentPage navigate={navigate} />; break;
    case '/decline': content = <DeclinePage navigate={navigate} />; break;
    case '/chat': content = <ChatPage navigate={navigate} />; break;
    case '/stations': content = <StationsPage navigate={navigate} />; break;
    case '/booking': content = <BookingPage navigate={navigate} />; break;
    case '/result': content = <ResultPage navigate={navigate} />; break;
    case '/privacy': content = <PrivacyPage navigate={navigate} />; break;
    default: content = <EntryPage navigate={navigate} />;
  }

  return (
    <div className="app-shell">
      <AiBadge />
      <main className="page">{content}</main>
      {state.notice && <div className="toast" data-testid="notice">{state.notice}</div>}
    </div>
  );
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>;
}
