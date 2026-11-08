import { Route, Routes } from 'react-router-dom';
import { Layout } from './layouts/Layout';
import Dashboard from './pages/Dashboard';
import DeploymentDetail from './pages/DeploymentDetail';
import Deployments from './pages/Deployments';
import Settings from './pages/Settings';
import Verifier from './pages/Verifier';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="deployments" element={<Deployments />} />
        <Route path="deployments/:id" element={<DeploymentDetail />} />
        <Route path="verify" element={<Verifier />} />
        <Route path="verify/:hash" element={<Verifier />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<div className="p-8 text-slate-400">Page not found.</div>} />
      </Route>
    </Routes>
  );
}
