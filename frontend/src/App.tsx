import { NavLink, Route, Routes } from 'react-router-dom';
import { MapPage } from './pages/MapPage';
import { SitesPage } from './pages/SitesPage';
import { SiteDetailsPage } from './pages/SiteDetailsPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { Sidebar } from './components/Sidebar';
import { useSites } from './api/hooks';

export default function App() {
  const { data: sites = [] } = useSites();
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
        </nav>
        <div className="spacer" />
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
          <Routes>
            <Route path="/" element={<MapPage />} />
            <Route path="/sites" element={<SitesPage />} />
            <Route path="/sites/:id" element={<SiteDetailsPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
          </Routes>
        </section>
        <aside className="sidebar">
          <Sidebar />
        </aside>
      </main>
    </div>
  );
}
