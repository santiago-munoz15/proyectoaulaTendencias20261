import { NavLink } from 'react-router-dom';

export default function RecruiterNavbar({ navItems, onLogout, menuOpen, setMenuOpen, onGoHome }) {
  return (
    <nav className="sticky top-4 z-50 overflow-hidden rounded-[1.5rem] border border-white/70 bg-slate-950/95 text-white shadow-2xl shadow-slate-900/20 backdrop-blur-md">
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <button type="button" onClick={onGoHome} className="text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-300">Gestión de contratación</p>
          <p className="text-lg font-black tracking-tight sm:text-xl">Panel ejecutivo</p>
        </button>

        <div className="hidden items-center gap-2 lg:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) => `rounded-full border px-4 py-2 text-sm font-semibold transition ${isActive ? 'border-teal-400 bg-teal-500 text-white' : 'border-white/10 text-white hover:bg-white/10'}`}
            >
              {item.label}
            </NavLink>
          ))}
          <button onClick={onLogout} className="rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-400">
            Cerrar sesión
          </button>
        </div>

        <div className="relative lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <i className="fa-solid fa-bars mr-2" /> Menú
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+0.6rem)] z-50 min-w-56 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-xl shadow-slate-950/30">
              {navItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => `block px-4 py-3 text-sm transition ${isActive ? 'bg-teal-500 text-white' : 'text-slate-100 hover:bg-white/10'}`}
                >
                  {item.label}
                </NavLink>
              ))}
              <button onClick={onLogout} className="block w-full px-4 py-3 text-left text-sm font-semibold text-white hover:bg-white/10">Cerrar sesión</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
