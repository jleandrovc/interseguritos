import { useState } from 'react';
import { translateEndorsement } from '../api/client.js';
import { endorsementExample, pretty } from '../examples.js';
import { EmptyState } from './EmptyState.jsx';
import { ErrorBox } from './ErrorBox.jsx';
import { JsonEditor, parseJson } from './JsonEditor.jsx';
import { JsonView } from './JsonView.jsx';

export function EndorsementTab({ token }) {
  const [input, setInput] = useState(pretty(endorsementExample));
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const parsed = parseJson(input);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data, headers } = await translateEndorsement(parsed.value, token);
      setResult({ document: data, templateVersion: headers.get('X-Template-Version') });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const dynamicCount = result?.document?.eventEntity?.dynamicData?.length ?? 0;
  const eventsCount = result?.document?.eventAppliedEntities?.length ?? 0;

  return (
    <form className="workspace" onSubmit={submit}>
      <section className="card">
        <header className="card__header">
          <span className="step">1</span>
          <div>
            <h2>Endoso en formato plano</h2>
            <p className="muted">
              La plantilla se elige en BD con <code>producto</code> + <code>tipoEndoso</code>.
            </p>
          </div>
        </header>
        <JsonEditor
          label="Datos de entrada"
          value={input}
          onChange={setInput}
          rows={17}
          onReset={() => setInput(pretty(endorsementExample))}
        />
        <button type="submit" className="button button--primary button--block" disabled={!token || loading || Boolean(parsed.error)}>
          {loading ? <span className="spinner" aria-hidden="true" /> : null}
          {loading ? 'Traduciendo…' : 'Traducir endoso  →'}
        </button>
      </section>

      <section className="card">
        <header className="card__header">
          <span className="step">2</span>
          <div>
            <h2>JSON para el core</h2>
            <p className="muted">Estructura y orden definidos por la plantilla.</p>
          </div>
        </header>
        <ErrorBox error={error} />
        {result ? (
          <>
            <div className="stats">
              <div className="stat">
                <span>Plantilla</span>
                <strong>v{result.templateVersion}</strong>
              </div>
              <div className="stat">
                <span>dynamicData</span>
                <strong>{dynamicCount} campos</strong>
              </div>
              <div className="stat">
                <span>Eventos</span>
                <strong>{eventsCount}</strong>
              </div>
            </div>
            <JsonView value={result.document} label="POST /api/v1/endorse/translate · 200 OK" />
          </>
        ) : null}
        {!result && !error ? (
          <EmptyState icon="📄" title="Sin resultado todavía">
            {token ? 'Pulsa "Traducir endoso" para ver el JSON del core.' : 'Obtén un token para habilitar la traducción.'}
          </EmptyState>
        ) : null}
      </section>
    </form>
  );
}
