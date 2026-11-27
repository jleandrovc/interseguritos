import { useEffect, useState } from 'react';

const POLL_MS = 30_000;

export function useServiceHealth(url) {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!cancelled) setStatus(response.ok ? 'up' : 'down');
      } catch {
        if (!cancelled) setStatus('down');
      }
    };
    check();
    const timer = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [url]);

  return status;
}
