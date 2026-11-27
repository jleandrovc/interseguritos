import { pretty } from '../examples.js';

export function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="alert" role="alert">
      <div className="alert__title">
        <span aria-hidden="true">⚠️</span>
        {error.status ? <span className="pill pill--error">HTTP {error.status}</span> : null}
        {error.code ? <code className="alert__code">{error.code}</code> : null}
      </div>
      <p>{error.message}</p>
      {error.details ? <pre className="code code--small">{pretty(error.details)}</pre> : null}
    </div>
  );
}
