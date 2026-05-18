import { lazy, Suspense } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { SitesPage } from './pages/SitesPage';
import { SiteDetailsPage } from './pages/SiteDetailsPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { FleetPage } from './pages/FleetPage';
import { Sidebar } from './components/Sidebar';
import { AdminLogin } from './components/AdminLogin';
import { AdminUndoControl } from './components/AdminUndoControl';
import { useUndoKeyboard } from './hooks/useUndoKeyboard';
import { useAuthStore } from './store/auth';
import { useSites } from './api/hooks';

const MapPage = lazy(() => import('./pages/MapPage').then((module) => ({ default: module.MapPage })));

export default function App() {
  const { data: sites = [] } = useSites();
  const isAdmin = useAuthStore((s) => s.isAdmin());
  useUndoKeyboard(isAdmin);
  const rainSite = sites.find((s) => s.weather_state === 'rain');

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="logo" />
          <span>Метео-планировщик асфальтоукладки</span>
        </div>
        <nav>
          <NavLink to="/" end>
            Карта
          </NavLink>
          <NavLink to="/sites">Участки</NavLink>
          <NavLink to="/maintenance">Наряды ТО</NavLink>
          <NavLink to="/fleet">Справочники</NavLink>
        </nav>
        <div className="spacer" />
        <AdminUndoControl />
        <AdminLogin />
        {rainSite ? (
          <span className="status-pill alert">
            Дождь на участке «{rainSite.name}»
          </span>
        ) : (
          <span className="status-pill">Погода в норме</span>
        )}
      </header>
      <main>
        <section className="workspace">
          <Suspense fallback={<div className="card">Загружаем карту…</div>}>
            <Routes>
              <Route path="/" element={<MapPage />} />
              <Route path="/sites" element={<SitesPage />} />
              <Route path="/sites/:id" element={<SiteDetailsPage />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/fleet" element={<FleetPage />} />
            </Routes>
          </Suspense>
        </section>
        <aside className="sidebar">
          <Sidebar />
        </aside>
      </main>
    </div>
  );
}
