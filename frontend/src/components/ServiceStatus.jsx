import { ENDORSEMENT_API, ROUTES_API } from '../api/client.js';
import { useServiceHealth } from '../hooks/useServiceHealth.js';

const LABELS = { up: 'En línea', down: 'Sin conexión', checking: 'Verificando' };

function Status({ name, url }) {
  const status = useServiceHealth(url);
  return (
    <span className={`status status--${status}`} title={`${name}: ${LABELS[status]}`}>
      <span className="status__dot" aria-hidden="true" />
      {name}
      <span className="sr-only">: {LABELS[status]}</span>
    </span>
  );
}

export function ServiceStatus() {
  return (
    <div className="statuses" aria-label="Estado de los servicios">
      <Status name="API Endosos" url={`${ENDORSEMENT_API}/health`} />
      <Status name="API Rutas" url={`${ROUTES_API}/health`} />
    </div>
  );
}
