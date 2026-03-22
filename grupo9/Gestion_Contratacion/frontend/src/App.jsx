import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const emptyVacante = {
  titulo: '',
  descripcion: '',
  area: '',
  fecha_limite: '',
  estado: 'activa',
};

const estados = ['activa', 'cerrada', 'pausada'];

function toDateInput(value) {
  return value ? String(value).slice(0, 10) : '';
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [vacantes, setVacantes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [editingId, setEditingId] = useState(null);

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [vacanteForm, setVacanteForm] = useState(emptyVacante);

  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [areaFiltro, setAreaFiltro] = useState('');

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  async function login(e) {
    e.preventDefault();
    setFeedback('');

    try {
      const res = await axios.post(`${API}/auth/login/`, {
        username: loginForm.username.trim(),
        password: loginForm.password.trim(),
      });

      localStorage.setItem('token', res.data.access);
      setToken(res.data.access);
      setLoginForm({ username: '', password: '' });
      setFeedback('Sesion iniciada correctamente.');
      Swal.fire({
        title: 'Bienvenido',
        text: 'Has iniciado sesion correctamente.',
        icon: 'success',
        confirmButtonText: 'Continuar',
      });
    } catch {
      setFeedback('Credenciales incorrectas.');
    }
  }

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setVacantes([]);
    setEditingId(null);
    setVacanteForm(emptyVacante);
    setFeedback('Sesion cerrada.');
    Swal.fire({
      title: 'Sesion cerrada',
      text: 'Has salido del sistema.',
      icon: 'info',
      confirmButtonText: 'Entendido',
    });
  }, []);

  const loadProfile = useCallback(async () => {
    const res = await axios.get(`${API}/auth/me/`, { headers });
    setUser(res.data);
  }, [headers]);

  const loadVacantes = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (estadoFiltro) params.estado = estadoFiltro;
      if (areaFiltro.trim()) params.area = areaFiltro.trim();

      const res = await axios.get(`${API}/vacantes/`, { headers, params });
      setVacantes(res.data.results || res.data);
    } finally {
      setLoading(false);
    }
  }, [headers, search, estadoFiltro, areaFiltro]);

  function startEdit(vacante) {
    setEditingId(vacante.id);
    setVacanteForm({
      titulo: vacante.titulo,
      descripcion: vacante.descripcion,
      area: vacante.area,
      fecha_limite: toDateInput(vacante.fecha_limite),
      estado: vacante.estado,
    });
    setFeedback(`Editando vacante: ${vacante.titulo}`);
  }

  function cancelEdit() {
    setEditingId(null);
    setVacanteForm(emptyVacante);
  }

  async function saveVacante(e) {
    e.preventDefault();
    setSaving(true);
    setFeedback('');

    try {
      if (editingId) {
        await axios.patch(`${API}/vacantes/${editingId}/`, vacanteForm, { headers });
        setFeedback('Vacante actualizada con exito.');
      } else {
        await axios.post(`${API}/vacantes/`, vacanteForm, { headers });
        setFeedback('Vacante creada con exito.');
      }

      cancelEdit();
      await loadVacantes();
    } catch (err) {
      const message = err.response?.data?.detail || 'No se pudo guardar la vacante.';
      setFeedback(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSaving(false);
    }
  }

  async function removeVacante(id) {
    if (!window.confirm('Quieres eliminar esta vacante?')) {
      return;
    }

    try {
      await axios.delete(`${API}/vacantes/${id}/`, { headers });
      setFeedback('Vacante eliminada.');
      await loadVacantes();
    } catch {
      setFeedback('No tienes permisos para eliminar esta vacante.');
    }
  }

  async function postularse(vacanteId) {
    try {
      await axios.post(`${API}/postulaciones/`, { vacante: vacanteId }, { headers });
      setFeedback('Postulacion enviada correctamente.');
    } catch (err) {
      const message = err.response?.data?.detail || 'No fue posible postularse.';
      setFeedback(Array.isArray(message) ? message.join(', ') : message);
    }
  }

  useEffect(() => {
    if (!token) {
      return;
    }

    const initialize = async () => {
      try {
        await Promise.all([loadProfile(), loadVacantes()]);
      } catch {
        logout();
      }
    };

    initialize();
  }, [token, loadProfile, loadVacantes, logout]);

  useEffect(() => {
    if (token) {
      loadVacantes();
    }
  }, [token, loadVacantes]);

  const areasUnicas = useMemo(() => {
    return [...new Set(vacantes.map((v) => v.area).filter(Boolean))].sort();
  }, [vacantes]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-8">
      <header className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-md sm:p-10">
        <p className="mb-3 inline-block rounded-full bg-teal-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
          Gestion de contratacion
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Panel web para manejar vacantes y postulaciones
        </h1>
      </header>

      {!token ? (
        <section className="mt-8 grid gap-6 rounded-3xl border border-orange-100 bg-white/80 p-6 shadow-lg shadow-orange-200/30 sm:p-8 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">Iniciar sesion</h2>
            <p className="mt-2 text-sm text-slate-600">
              Accede con tu usuario de Django para operar segun tu rol.
            </p>
          </div>

          <form onSubmit={login} className="space-y-4">
            <input
              type="text"
              placeholder="Usuario"
              value={loginForm.username}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            />
            <input
              type="password"
              placeholder="Contrasena"
              value={loginForm.password}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-slate-800"
            >
              Entrar
            </button>
          </form>
        </section>
      ) : (
        <main className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-6 rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
            <div className="rounded-2xl bg-gradient-to-r from-teal-500 to-orange-400 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.16em] text-white/80">Sesion activa</p>
              <p className="mt-1 text-lg font-bold">{user?.username}</p>
              <p className="text-sm capitalize">Rol: {user?.role}</p>
            </div>

            {user?.role === 'reclutador' && (
              <form onSubmit={saveVacante} className="space-y-3">
                <h3 className="font-display text-xl font-bold text-slate-900">
                  {editingId ? 'Editar vacante' : 'Nueva vacante'}
                </h3>

                <input
                  required
                  type="text"
                  placeholder="Titulo"
                  value={vacanteForm.titulo}
                  onChange={(e) => setVacanteForm((prev) => ({ ...prev, titulo: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500"
                />

                <textarea
                  required
                  placeholder="Descripcion"
                  rows={4}
                  value={vacanteForm.descripcion}
                  onChange={(e) => setVacanteForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500"
                />

                <input
                  required
                  type="text"
                  placeholder="Area"
                  value={vacanteForm.area}
                  onChange={(e) => setVacanteForm((prev) => ({ ...prev, area: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500"
                />

                <input
                  required
                  type="date"
                  value={vacanteForm.fecha_limite}
                  onChange={(e) => setVacanteForm((prev) => ({ ...prev, fecha_limite: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500"
                />

                <select
                  value={vacanteForm.estado}
                  onChange={(e) => setVacanteForm((prev) => ({ ...prev, estado: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500"
                >
                  {estados.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear vacante'}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar edicion
                  </button>
                )}
              </form>
            )}

            <button
              onClick={logout}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cerrar sesion
            </button>
          </aside>

          <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-sm sm:p-8">
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por titulo o descripcion"
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500"
              />
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500"
              >
                <option value="">Todos los estados</option>
                {estados.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>

              <select
                value={areaFiltro}
                onChange={(e) => setAreaFiltro(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500"
              >
                <option value="">Todas las areas</option>
                {areasUnicas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 space-y-3">
              {loading ? (
                <p className="text-sm text-slate-500">Cargando vacantes...</p>
              ) : vacantes.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                  No hay vacantes para mostrar con esos filtros.
                </p>
              ) : (
                vacantes.map((vacante) => (
                  <article
                    key={vacante.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-xl font-bold text-slate-900">{vacante.titulo}</h3>
                        <p className="mt-1 text-sm text-slate-600">{vacante.descripcion}</p>
                      </div>
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
                        {vacante.estado}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">Area: {vacante.area}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">Limite: {toDateInput(vacante.fecha_limite)}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">Reclutador: {vacante.creado_por}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {user?.role === 'reclutador' && (
                        <>
                          <button
                            onClick={() => startEdit(vacante)}
                            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => removeVacante(vacante.id)}
                            className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                          >
                            Eliminar
                          </button>
                        </>
                      )}

                      {user?.role === 'candidato' && (
                        <button
                          onClick={() => postularse(vacante.id)}
                          className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700"
                        >
                          Postularme
                        </button>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </main>
      )}

      {feedback && (
        <div className="fixed bottom-5 right-5 max-w-sm rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-lg">
          {feedback}
        </div>
      )}
    </div>
  );
}