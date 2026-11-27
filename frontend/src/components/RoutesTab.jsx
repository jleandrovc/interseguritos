import { useState } from 'react';
import { calculateRoute } from '../api/client.js';
import { pretty, routesExample } from '../examples.js';
import { EmptyState } from './EmptyState.jsx';
import { ErrorBox } from './ErrorBox.jsx';
import { JsonEditor, parseJson } from './JsonEditor.jsx';
import { JsonView } from './JsonView.jsx';

const splitDepots = (text) =>
  text
    .split(',')
    .map((depot) => depot.trim())
    .filter(Boolean);

function RoutePath({ path, graph }) {
  return (
    <ol className="route" aria-label="Ruta">
      {path.map((district, index) => {
        const next = path[index + 1];
        const weight = next ? graph?.[district]?.[next] : undefined;
        const role = index === 0 ? 'Base' : index === path.length - 1 ? 'Siniestro' : 'Paso';
        return (
          <li key={`${district}-${index}`} className={`route__stop route__stop--${role.toLowerCase()}`}>
            <span className="route__marker" aria-hidden="true">
              {index === 0 ? '🚚' : index === path.length - 1 ? '📍' : index}
            </span>
            <div className="route__body">
              <strong>{district}</strong>
              <span className="muted">{role}</span>
            </div>
            {next && weight !== undefined ? <span className="route__leg">+{weight}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function RoutesTab({ token }) {
  const [accidentLocation, setAccidentLocation] = useState(routesExample.accidentLocation);
  const [depots, setDepots] = useState(routesExample.depots.join(', '));
  const [graph, setGraph] = useState(pretty(routesExample.graph));
  const [useDefaultGraph, setUseDefaultGraph] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const parsedGraph = parseJson(graph);
  const graphInvalid = !useDefaultGraph && Boolean(parsedGraph.error);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload = { accidentLocation: accidentLocation.trim(), depots: splitDepots(depots) };
      if (!useDefaultGraph) payload.graph = parsedGraph.value;
      const { data } = await calculateRoute(payload, token);
      setResult({ route: data, graph: payload.graph });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setAccidentLocation(routesExample.accidentLocation);
    setDepots(routesExample.depots.join(', '));
    setGraph(pretty(routesExample.graph));
  };

  return (
    <form className="workspace" onSubmit={submit}>
      <section className="card">
        <header className="card__header">
          <span className="step">1</span>
          <div>
            <h2>Siniestro y red de distritos</h2>
            <p className="muted">Se asigna la base de grúas más cercana con Dijkstra.</p>
          </div>
        </header>
        <div className="row">
          <label className="field">
            <span>📍 Ubicación del accidente</span>
            <input value={accidentLocation} onChange={(e) => setAccidentLocation(e.target.value)} required />
          </label>
          <label className="field">
            <span>🚚 Bases de grúas (separadas por coma)</span>
            <input value={depots} onChange={(e) => setDepots(e.target.value)} required />
          </label>
        </div>
        <label className="switch">
          <input type="checkbox" checked={useDefaultGraph} onChange={(e) => setUseDefaultGraph(e.target.checked)} />
          <span className="switch__track" aria-hidden="true" />
          Usar el grafo por defecto del servidor
        </label>
        {!useDefaultGraph ? (
          <JsonEditor label="Grafo · distrito → vecino → distancia" value={graph} onChange={setGraph} rows={12} onReset={reset} />
        ) : null}
        <button type="submit" className="button button--primary button--block" disabled={!token || loading || graphInvalid}>
          {loading ? <span className="spinner" aria-hidden="true" /> : null}
          {loading ? 'Calculando…' : 'Calcular ruta óptima  →'}
        </button>
      </section>

      <section className="card">
        <header className="card__header">
          <span className="step">2</span>
          <div>
            <h2>Asignación de grúa</h2>
            <p className="muted">Base más cercana y ruta más corta hasta el siniestro.</p>
          </div>
        </header>
        <ErrorBox error={error} />
        {result ? (
          <>
            <div className="stats">
              <div className="stat stat--highlight">
                <span>Base asignada</span>
                <strong>{result.route.fromDepot}</strong>
              </div>
              <div className="stat">
                <span>Destino</span>
                <strong>{result.route.to}</strong>
              </div>
              <div className="stat">
                <span>Distancia total</span>
                <strong>{result.route.distance}</strong>
              </div>
            </div>
            <RoutePath path={result.route.path} graph={result.graph} />
            <JsonView value={result.route} label="POST /api/v1/routes/optimal · 200 OK" />
          </>
        ) : null}
        {!result && !error ? (
          <EmptyState icon="🗺️" title="Sin ruta calculada">
            {token ? 'Pulsa "Calcular ruta óptima" para asignar la grúa.' : 'Obtén un token para habilitar el cálculo.'}
          </EmptyState>
        ) : null}
      </section>
    </form>
  );
}
