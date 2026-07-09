import { useEffect } from 'react';
import axios from 'axios';

let checking = false;

export function useBrowserNotifications() {
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    let stopped = false;

    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const { data } = await axios.get('/api/notifications/upcoming', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data.length > 0) {
          const fmt = (n: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
          const list = data.map((s: any) => `${s.name} - ${fmt(s.rub_amount)}`).join('\n');
          new Notification('SubTrack - завтра списание', { body: list, icon: '/favicon.svg' });
        }
      } catch (err) {
        console.warn('[Notifications] Failed to check upcoming:', err);
      } finally {
        checking = false;
      }
    };

    check();
    const interval = setInterval(() => { if (!stopped) check(); }, 60 * 60 * 1000);
    return () => { stopped = true; clearInterval(interval); };
  }, []);
}
