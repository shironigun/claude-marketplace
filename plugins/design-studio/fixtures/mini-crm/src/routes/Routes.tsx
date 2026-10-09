import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { LeadsPage } from 'components/leads/LeadsPage';

const SettingsPage = lazy(() => import('../components/settings/SettingsPage'));

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/leads" element={<LeadsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}
