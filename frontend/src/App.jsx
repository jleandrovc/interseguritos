import { useState } from 'react';
import { LoginCard, SessionChip } from './components/AuthPanel.jsx';
import { EndorsementTab } from './components/EndorsementTab.jsx';
import { RoutesTab } from './components/RoutesTab.jsx';
import { ServiceStatus } from './components/ServiceStatus.jsx';
import { useAuth } from './hooks/useAuth.js';

const TABS = [
  { id: 'endorsement', icon: '📑', label: 'Traductor de endosos', service: 'Node.js · Hapi · PostgreSQL' },
  { id: 'routes', icon: '🚚', label: 'Rutas óptimas de grúas', service: 'Go · Dijkstra' },
];

export function App() {
  const { session, login, logout } = useAuth();
  const [active, setActive] = useState(TABS[0].id);
  const token = session?.token;

  return (
    <div className="page">
      <header className="hero">
        <div className="hero__inner">
          <div className="brand">
            <span className="brand__logo" aria-hidden="true">IS</span>
            <div>
              <h1>Interseguritos · Evolution</h1>
              <p>Reto técnico Technical Lead · Endosos Sencillos y Atención de Siniestros</p>
            </div>
          </div>
          <div className="hero__aside">
            <ServiceStatus />
            {session ? <SessionChip session={session} onLogout={logout} /> : null}
          </div>
        </div>

        <div className="hero__inner hero__nav">
          <nav className="tabs" role="tablist" aria-label="Servicios">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active === tab.id}
                className={`tab ${active === tab.id ? 'tab--active' : ''}`}
                onClick={() => setActive(tab.id)}
              >
                <span className="tab__icon" aria-hidden="true">
                  {tab.icon}
                </span>
                <span className="tab__text">
                  {tab.label}
                  <small>{tab.service}</small>
                </span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="content">
        {!session ? <LoginCard onLogin={login} /> : null}

        <div role="tabpanel">
          {active === 'endorsement' ? <EndorsementTab token={token} /> : <RoutesTab token={token} />}
        </div>
      </main>

      <footer className="footer muted">JWT compartido · API versionada /api/v1 · Docker</footer>
    </div>
  );
}
