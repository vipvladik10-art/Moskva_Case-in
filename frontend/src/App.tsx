import { NavLink, Route, Routes } from 'react-router-dom';
import { MapPage } from './pages/MapPage';
import { SitesPage } from './pages/SitesPage';
import { SiteDetailsPage } from './pages/SiteDetailsPage';
import { MaintenancePage } from './pages/MaintenancePage';

export default function App() {
  return (
    <div className="app-shell">
      <nav className="topbar">
        <NavLink to="/">Карта</NavLink>
        <NavLink to="/sites">Участки</NavLink>
        <NavLink to="/maintenance">ТО</NavLink>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/sites" element={<SitesPage />} />
          <Route path="/sites/:id" element={<SiteDetailsPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
        </Routes>
      </main>
    </div>
  );
}
