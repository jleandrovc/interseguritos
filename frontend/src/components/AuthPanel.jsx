import { useEffect, useState } from 'react';
import { ErrorBox } from './ErrorBox.jsx';

function useCountdown(expiresAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.round((expiresAt - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function SessionChip({ session, onLogout }) {
  const remaining = useCountdown(session.expiresAt);
  return (
    <div className="session">
      <span className="session__avatar" aria-hidden="true">
        {session.clientId.slice(0, 1).toUpperCase()}
      </span>
      <div className="session__info">
        <strong>{session.clientId}</strong>
        <span>Token vigente · {remaining}</span>
      </div>
      <button type="button" className="button button--light" onClick={onLogout}>
        Salir
      </button>
    </div>
  );
}

export function LoginCard({ onLogin }) {
  const [clientId, setClientId] = useState('frontend');
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onLogin(clientId.trim(), clientSecret);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card login" onSubmit={submit} aria-label="Obtener token">
      <div className="login__intro">
        <span className="login__icon" aria-hidden="true">🔐</span>
        <div>
          <h2>Acceso a las APIs</h2>
          <p className="muted">
            Ambos servicios exigen un JWT. Ingresa las credenciales de cliente para obtenerlo.
          </p>
        </div>
      </div>
      <div className="login__fields">
        <label className="field">
          <span>Client ID</span>
          <input value={clientId} onChange={(e) => setClientId(e.target.value)} autoComplete="username" required />
        </label>
        <label className="field">
          <span>Client secret</span>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            autoComplete="current-password"
            placeholder="API_CLIENT_SECRET del archivo .env"
            required
          />
        </label>
        <button type="submit" className="button button--primary" disabled={loading}>
          {loading ? 'Validando…' : 'Obtener token'}
        </button>
      </div>
      <ErrorBox error={error} />
    </form>
  );
}
