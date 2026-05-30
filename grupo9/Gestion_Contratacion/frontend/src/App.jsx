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

const emptyInterview = {
  fecha: '',
  modalidad: 'virtual',
  observaciones: '',
};

const vacanteEstados = ['activa', 'cerrada', 'pausada'];
const postulacionEstados = ['en_revision', 'entrevistado', 'aprobado', 'rechazado'];
const modalidades = ['virtual', 'presencial', 'telefonica'];

function toDateInput(value) {
  return value ? String(value).slice(0, 10) : '';
}

function getErrorMessage(err, fallback) {
  const data = err.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  const first = Object.values(data)[0];
  if (Array.isArray(first)) return first.join(', ');
  if (typeof first === 'string') return first;
  return fallback;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [vacantes, setVacantes] = useState([]);
  const [postulaciones, setPostulaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [interviewTarget, setInterviewTarget] = useState(null);

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [vacanteForm, setVacanteForm] = useState(emptyVacante);
  const [interviewForm, setInterviewForm] = useState(emptyInterview);
  const [postulacionState, setPostulacionState] = useState({});

  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [areaFiltro, setAreaFiltro] = useState('');

  const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setVacantes([]);
    setPostulaciones([]);
    setEditingId(null);
    setInterviewTarget(null);
    setVacanteForm(emptyVacante);
    setInterviewForm(emptyInterview);
    setFeedback('Sesión cerrada.');
  }, []);

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
      setFeedback('Sesión iniciada correctamente.');
      Swal.fire({ title: 'Bienvenido', text: 'Has iniciado sesión correctamente.', icon: 'success' });
    } catch (err) {
      setFeedback(getErrorMessage(err, 'Credenciales incorrectas.'));
    }
  }

  const loadProfile = useCallback(async () => {
    const res = await axios.get(`${API}/auth/me/`, { headers });
    setUser(res.data);
  }, [headers]);

  const loadVacantes = useCallback(async () => {
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (estadoFiltro) params.estado = estadoFiltro;
    if (areaFiltro.trim()) params.area = areaFiltro.trim();

    const res = await axios.get(`${API}/vacantes/`, { headers, params });
    setVacantes(res.data.results || res.data);
  }, [headers, search, estadoFiltro, areaFiltro]);

  const loadPostulaciones = useCallback(async () => {
    const res = await axios.get(`${API}/postulaciones/`, { headers });
    setPostulaciones(res.data.results || res.data);
  }, [headers]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadProfile(), loadVacantes(), loadPostulaciones()]);
    } finally {
      setLoading(false);
    }
  }, [loadProfile, loadVacantes, loadPostulaciones]);

  useEffect(() => {
    if (!token) return;
    refreshData().catch(() => logout());
  }, [token, refreshData, logout]);

  useEffect(() => {
    if (token) {
      loadVacantes().catch(() => setFeedback('No se pudieron cargar las vacantes.'));
      loadPostulaciones().catch(() => setFeedback('No se pudieron cargar las postulaciones.'));
    }
  }, [token, loadVacantes, loadPostulaciones]);

  const areasUnicas = useMemo(() => [...new Set(vacantes.map((v) => v.area).filter(Boolean))].sort(), [vacantes]);

  function startEdit(vacante) {
    setEditingId(vacante.id);
    setVacanteForm({
      titulo: vacante.titulo,
      descripcion: vacante.descripcion,
      area: vacante.area,
      fecha_limite: toDateInput(vacante.fecha_limite),
      estado: vacante.estado,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setVacanteForm(emptyVacante);
  }

  async function saveVacante(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await axios.patch(`${API}/vacantes/${editingId}/`, vacanteForm, { headers });
        setFeedback('Vacante actualizada con éxito.');
      } else {
        await axios.post(`${API}/vacantes/`, vacanteForm, { headers });
        setFeedback('Vacante creada con éxito.');
      }
      cancelEdit();
      await loadVacantes();
    } catch (err) {
      setFeedback(getErrorMessage(err, 'No se pudo guardar la vacante.'));
    } finally {
      setSaving(false);
    }
  }

  async function removeVacante(id) {
    if (!window.confirm('¿Quieres eliminar esta vacante?')) return;
    try {
      await axios.delete(`${API}/vacantes/${id}/`, { headers });
      setFeedback('Vacante eliminada.');
      await loadVacantes();
    } catch (err) {
      setFeedback(getErrorMessage(err, 'No se pudo eliminar la vacante.'));
    }
  }

  async function postularse(vacanteId) {
    try {
      await axios.post(`${API}/postulaciones/`, { vacante: vacanteId }, { headers });
      setFeedback('Postulación enviada correctamente.');
      await loadPostulaciones();
    } catch (err) {
      setFeedback(getErrorMessage(err, 'No fue posible postularse.'));
    }
  }

  async function cambiarEstado(postulacionId) {
    const estado = postulacionState[postulacionId];
    try {
      await axios.patch(`${API}/postulaciones/${postulacionId}/`, { estado }, { headers });
      setFeedback('Estado de postulación actualizado.');
      await loadPostulaciones();
    } catch (err) {
      setFeedback(getErrorMessage(err, 'No se pudo actualizar el estado.'));
    }
  }

  function abrirEntrevista(postulacionId) {
    setInterviewTarget(postulacionId);
    setInterviewForm(emptyInterview);
  }

  async function guardarEntrevista(e) {
    e.preventDefault();
    if (!interviewTarget) return;

    try {
      await axios.post(
        `${API}/entrevistas/`,
        {
          postulacion: interviewTarget,
          fecha: interviewForm.fecha,
          modalidad: interviewForm.modalidad,
          observaciones: interviewForm.observaciones,
        },
        { headers },
      );
      setFeedback('Entrevista registrada correctamente.');
      setInterviewTarget(null);
      setInterviewForm(emptyInterview);
      await loadPostulaciones();
    } catch (err) {
      setFeedback(getErrorMessage(err, 'No se pudo registrar la entrevista.'));
    }
  }

  if (!token) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8">
        <section className="grid w-full gap-6 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-900/5 md:grid-cols-2">
          <div>
            <p className="mb-3 inline-block rounded-full bg-teal-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
              Gestión de contratación
            </p>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Panel de vacantes, postulaciones y entrevistas</h1>
            <p className="mt-3 text-sm text-slate-600">Accede con tu usuario para operar según tu rol.</p>
          </div>

          <form onSubmit={login} className="space-y-4">
            <input
              type="text"
              placeholder="Usuario"
              value={loginForm.username}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={loginForm.password}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
            />
            <button className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Entrar
            </button>
          </form>
        </section>
        {feedback && <div className="fixed bottom-5 right-5 rounded-xl bg-white px-4 py-3 text-sm shadow-lg">{feedback}</div>}
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8">
      <header className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-md sm:p-10">
        <p className="mb-3 inline-block rounded-full bg-teal-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
          Sistema de selección
        </p>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">Gestión de vacantes, postulaciones y entrevistas</h1>
      </header>

      <main className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-6 rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
          <div className="rounded-2xl bg-gradient-to-r from-teal-500 to-orange-400 p-4 text-white">
            <p className="text-xs uppercase tracking-[0.16em] text-white/80">Sesión activa</p>
            <p className="mt-1 text-lg font-bold">{user?.username}</p>
            <p className="text-sm capitalize">Rol: {user?.role}</p>
          </div>

          {user?.role === 'reclutador' && (
            <form onSubmit={saveVacante} className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">{editingId ? 'Editar vacante' : 'Nueva vacante'}</h2>
              <input required type="text" placeholder="Título" value={vacanteForm.titulo} onChange={(e) => setVacanteForm((prev) => ({ ...prev, titulo: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500" />
              <textarea required placeholder="Descripción" rows={4} value={vacanteForm.descripcion} onChange={(e) => setVacanteForm((prev) => ({ ...prev, descripcion: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500" />
              <input required type="text" placeholder="Área" value={vacanteForm.area} onChange={(e) => setVacanteForm((prev) => ({ ...prev, area: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500" />
              <input required type="date" value={vacanteForm.fecha_limite} onChange={(e) => setVacanteForm((prev) => ({ ...prev, fecha_limite: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500" />
              <select value={vacanteForm.estado} onChange={(e) => setVacanteForm((prev) => ({ ...prev, estado: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500">
                {vacanteEstados.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
              </select>
              <button disabled={saving} className="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                {saving ? 'Guardando...' : editingId ? 'Actualizar vacante' : 'Crear vacante'}
              </button>
              {editingId && <button type="button" onClick={cancelEdit} className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar edición</button>}
            </form>
          )}

          <button onClick={logout} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cerrar sesión
          </button>
        </aside>

        <section className="space-y-6 rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-sm sm:p-8">
          <div className="grid gap-3 sm:grid-cols-3">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título o descripción" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500" />
            <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500">
              <option value="">Todos los estados</option>
              {vacanteEstados.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
            </select>
            <select value={areaFiltro} onChange={(e) => setAreaFiltro(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500">
              <option value="">Todas las áreas</option>
              {areasUnicas.map((area) => <option key={area} value={area}>{area}</option>)}
            </select>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900">Vacantes</h2>
            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="text-sm text-slate-500">Cargando información...</p>
              ) : vacantes.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">No hay vacantes para mostrar.</p>
              ) : (
                vacantes.map((vacante) => (
                  <article key={vacante.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{vacante.titulo}</h3>
                        <p className="mt-1 text-sm text-slate-600">{vacante.descripcion}</p>
                      </div>
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">{vacante.estado}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">Área: {vacante.area}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">Límite: {toDateInput(vacante.fecha_limite)}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">Reclutador: {vacante.creado_por}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {user?.role === 'reclutador' ? (
                        <>
                          <button onClick={() => startEdit(vacante)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">Editar</button>
                          <button onClick={() => removeVacante(vacante.id)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700">Eliminar</button>
                        </>
                      ) : (
                        <button onClick={() => postularse(vacante.id)} className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700">Postularme</button>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900">Postulaciones</h2>
            <div className="mt-4 space-y-4">
              {postulaciones.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">No hay postulaciones para mostrar.</p>
              ) : (
                postulaciones.map((postulacion) => (
                  <article key={postulacion.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{postulacion.vacante_titulo}</h3>
                        <p className="text-sm text-slate-600">Candidato: {postulacion.candidato}</p>
                      </div>
                      <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">{postulacion.estado}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">Área: {postulacion.vacante_area}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">Fecha: {toDateInput(postulacion.fecha_postulacion)}</span>
                    </div>

                    {user?.role === 'reclutador' && (
                      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                        <select
                          value={postulacionState[postulacion.id] ?? postulacion.estado}
                          onChange={(e) => setPostulacionState((prev) => ({ ...prev, [postulacion.id]: e.target.value }))}
                          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500"
                        >
                          {postulacionEstados.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                        </select>
                        <button onClick={() => cambiarEstado(postulacion.id)} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">
                          Cambiar estado
                        </button>
                        <button onClick={() => abrirEntrevista(postulacion.id)} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">
                          Registrar entrevista
                        </button>
                      </div>
                    )}

                    {interviewTarget === postulacion.id && user?.role === 'reclutador' && (
                      <form onSubmit={guardarEntrevista} className="mt-4 space-y-3 rounded-2xl border border-teal-100 bg-teal-50 p-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <input type="datetime-local" value={interviewForm.fecha} onChange={(e) => setInterviewForm((prev) => ({ ...prev, fecha: e.target.value }))} className="rounded-xl border border-teal-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500" required />
                          <select value={interviewForm.modalidad} onChange={(e) => setInterviewForm((prev) => ({ ...prev, modalidad: e.target.value }))} className="rounded-xl border border-teal-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500">
                            {modalidades.map((modalidad) => <option key={modalidad} value={modalidad}>{modalidad}</option>)}
                          </select>
                        </div>
                        <textarea rows={3} placeholder="Observaciones" value={interviewForm.observaciones} onChange={(e) => setInterviewForm((prev) => ({ ...prev, observaciones: e.target.value }))} className="w-full rounded-xl border border-teal-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500" />
                        <div className="flex gap-2">
                          <button className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">Guardar entrevista</button>
                          <button type="button" onClick={() => setInterviewTarget(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white">Cancelar</button>
                        </div>
                      </form>
                    )}

                    {postulacion.entrevistas?.length > 0 && (
                      <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-800">Entrevistas</p>
                        {postulacion.entrevistas.map((entrevista) => (
                          <div key={entrevista.id} className="rounded-xl bg-white p-3 text-sm text-slate-700 shadow-sm">
                            <p><strong>Fecha:</strong> {new Date(entrevista.fecha).toLocaleString()}</p>
                            <p><strong>Modalidad:</strong> {entrevista.modalidad}</p>
                            <p><strong>Entrevistador:</strong> {entrevista.entrevistador}</p>
                            {entrevista.observaciones && <p><strong>Observaciones:</strong> {entrevista.observaciones}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {feedback && <div className="fixed bottom-5 right-5 max-w-sm rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-lg">{feedback}</div>}
    </div>
  );
}