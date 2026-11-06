import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Telegram WebApp Integration: Notify Telegram client when ready and expand to full viewport
if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
  try {
    const tg = (window as any).Telegram.WebApp;
    tg.ready();
    tg.expand();
  } catch {
    // ignore
  }
}

createRoot(document.getElementById('root')!).render(<App />);
