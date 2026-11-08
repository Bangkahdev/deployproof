import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/deployments', label: 'Deployments' },
  { to: '/verify', label: 'Verifier' },
  { to: '/settings', label: 'Settings' },
];

export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-slate-100">DeployProof</span>
            <span className="hidden text-xs text-slate-500 sm:inline">Every Deployment Deserves Proof</span>
          </div>
          <nav className="flex flex-wrap gap-1 text-sm">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
