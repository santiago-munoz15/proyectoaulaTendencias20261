import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useLocation, useNavigate } from 'react-router-dom';
import RecruiterNavbar from './components/RecruiterNavbar.jsx';
import RecruiterModuleContent from './components/RecruiterModuleContent.jsx';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '', role: 'candidato', invite_code: '' });
  const [authClass, setAuthClass] = useState('close');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [areaFiltro, setAreaFiltro] = useState('');
  const [vacantes, setVacantes] = useState([]);
  const [postulaciones, setPostulaciones] = useState([]);
  const [entrevistas, setEntrevistas] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [reportes, setReportes] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [interviewTarget, setInterviewTarget] = useState(null);
  const [contractTarget, setContractTarget] = useState(null);
  const [postulacionState, setPostulacionState] = useState({});
  const [postulacionContractForm, setPostulacionContractForm] = useState({});

  const emptyVacante = { titulo: '', descripcion: '', area: '', fecha_limite: '', estado: 'activa' };
  const emptyInterview = { fecha: '', modalidad: 'virtual', observaciones: '' };
  const emptyContract = { fecha_inicio: '', tipo_contrato: 'indefinido', salario: '' };
  const emptyApprovalContract = { fecha_inicio: '', tipo_contrato: 'indefinido', salario: '' };

  const [vacanteForm, setVacanteForm] = useState(emptyVacante);
  const [interviewForm, setInterviewForm] = useState(emptyInterview);
  const [contractForm, setContractForm] = useState(emptyContract);

  const headers = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  );

  const vacanteEstados = useMemo(() => ['activa', 'cerrada', 'pausada'], []);
  const postulacionEstados = useMemo(() => ['en_revision', 'entrevistado', 'aprobado', 'rechazado'], []);
  const modalidades = useMemo(() => ['virtual', 'presencial', 'telefonica'], []);
  const contractTypes = useMemo(() => ['indefinido', 'temporal', 'por_proyecto'], []);

  function asList(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  }

  function toDateInput(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  function toMoney(value) {
    if (value === null || value === undefined || value === '') return 'Pendiente';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Number(value));
  }

  function prettyStage(value) {
    const map = {
      en_revision: 'En revisión',
      entrevistado: 'Entrevistado',
      aprobado: 'Aprobado',
      rechazado: 'Rechazado',
    };
    return map[value] || value || 'Sin estado';
  }

  function prettyRole(value) {
    const map = {
      reclutador: 'Reclutador',
      candidato: 'Candidato',
      admin: 'Administrador',
    };
    return map[value] || value || 'Usuario';
  }

  function getErrorMessage(err, fallback) {
    return err?.response?.data?.detail || err?.response?.data?.message || fallback;
  }

  const performLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
    setPostulaciones([]);
    setEntrevistas([]);
    setContratos([]);
    setReportes(null);
    setEditingId(null);
    setInterviewTarget(null);
    setContractTarget(null);
    setPostulacionContractForm({});
    setVacanteForm(emptyVacante);
    setInterviewForm(emptyInterview);
    setContractForm(emptyContract);
    setFeedback('Sesión cerrada.');
    Swal.fire({ title: 'Sesión cerrada', text: 'Has cerrado la sesión correctamente.', icon: 'success', confirmButtonColor: '#0f766e' });
  }, []);

  function handleLogoutInteractive() {
    Swal.fire({
      title: '¿Cerrar sesión?',
      text: '¿Estás seguro que quieres cerrar la sesión?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    }).then((result) => {
      if (result.isConfirmed) {
        performLogout();
      }
    });
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
    setVacantes(asList(res.data));
  }, [headers, search, estadoFiltro, areaFiltro]);

  const loadPostulaciones = useCallback(async () => {
    const res = await axios.get(`${API}/postulaciones/`, { headers });
    setPostulaciones(asList(res.data));
  }, [headers]);

  const loadEntrevistas = useCallback(async () => {
    const res = await axios.get(`${API}/entrevistas/`, { headers });
    setEntrevistas(asList(res.data));
  }, [headers]);

  const loadContratos = useCallback(async () => {
    const res = await axios.get(`${API}/contratos/`, { headers });
    setContratos(asList(res.data));
  }, [headers]);

  const loadReports = useCallback(async () => {
    if (user?.role !== 'reclutador') {
      setReportes(null);
      return;
    }

    const res = await axios.get(`${API}/postulaciones/reportes/embudo/`, { headers });
    setReportes(res.data);
  }, [headers, user?.role]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadProfile(), loadVacantes(), loadPostulaciones(), loadEntrevistas(), loadContratos(), loadReports()]);
    } finally {
      setLoading(false);
    }
  }, [loadProfile, loadVacantes, loadPostulaciones, loadEntrevistas, loadContratos, loadReports]);

  useEffect(() => {
    if (!token) return;
    refreshData().catch((err) => {
      console.error('refreshData error', err);
      const status = err?.response?.status;
      if (status === 401) {
        // token inválido o expirado
        performLogout();
      } else {
        setFeedback(getErrorMessage(err, 'Error al cargar datos tras iniciar sesión.'));
      }
    });
  }, [token, refreshData, performLogout]);

  useEffect(() => {
    if (!token) return;
    loadVacantes().catch(() => setFeedback('No se pudieron cargar las vacantes.'));
  }, [token, loadVacantes]);

  useEffect(() => {
    if (!token) return;
    loadPostulaciones().catch(() => setFeedback('No se pudieron cargar las postulaciones.'));
    loadEntrevistas().catch(() => setFeedback('No se pudieron cargar las entrevistas.'));
    loadContratos().catch(() => setFeedback('No se pudieron cargar los contratos.'));
    loadReports().catch(() => setFeedback('No se pudieron cargar los reportes.'));
  }, [token, loadPostulaciones, loadEntrevistas, loadContratos, loadReports]);

  const areasUnicas = useMemo(
    () => [...new Set(vacantes.map((vacante) => vacante.area).filter(Boolean))].sort(),
    [vacantes],
  );

  const metrics = useMemo(() => {
    const abiertas = vacantes.filter((vacante) => vacante.estado === 'activa').length;
    const aprobadas = postulaciones.filter((postulacion) => postulacion.estado === 'aprobado').length;
    return { abiertas, aprobadas, entrevistas: entrevistas.length, contratos: contratos.length };
  }, [vacantes, postulaciones, entrevistas, contratos]);

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
      Swal.fire({ title: 'Bienvenido', text: 'Has iniciado sesión correctamente.', icon: 'success', confirmButtonColor: '#0f766e' });
      navigate('/dashboard');
    } catch (err) {
      setFeedback(getErrorMessage(err, 'Credenciales incorrectas.'));
    }
  }

  async function register(e) {
    e.preventDefault();
    setFeedback('');

    try {
      await axios.post(`${API}/auth/register/`, {
        username: registerForm.username.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
        role: registerForm.role,
        invite_code: registerForm.role === 'reclutador' ? registerForm.invite_code.trim() : '',
      });

      setFeedback('Registro completado. Ahora puedes iniciar sesión.');
      Swal.fire({
        title: 'Registro exitoso',
        text: 'Ya puedes iniciar sesión con tu nueva cuenta.',
        icon: 'success',
        confirmButtonColor: '#0f766e',
      });
      setLoginForm({ username: registerForm.username, password: registerForm.password });
      setRegisterForm({ username: '', email: '', password: '', role: 'candidato', invite_code: '' });
      setAuthClass('close');
    } catch (err) {
      setFeedback(getErrorMessage(err, 'No se pudo completar el registro.'));
    }
  }

  async function saveVacante(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = editingId
        ? vacanteForm
        : { ...vacanteForm, estado: 'activa' };

      if (editingId) {
        await axios.patch(`${API}/vacantes/${editingId}/`, payload, { headers });
        setFeedback('Vacante actualizada con éxito.');
      } else {
        await axios.post(`${API}/vacantes/`, payload, { headers });
        setFeedback('Vacante creada con éxito.');
        Swal.fire({
          title: 'Vacante creada exitosamente',
          icon: 'success',
          confirmButtonColor: '#0f766e',
        });
      }
      cancelEdit();
      await loadVacantes();
      if (user?.role === 'reclutador') await loadReports();
    } catch (err) {
      setFeedback(getErrorMessage(err, 'No se pudo guardar la vacante.'));
    } finally {
      setSaving(false);
    }
  }

  async function removeVacante(id) {
    const result = await Swal.fire({
      title: '¿Quieres eliminar esta vacante?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${API}/vacantes/${id}/`, { headers });
      setFeedback('Vacante eliminada.');
      Swal.fire({
        title: 'Vacante eliminada exitosamente',
        icon: 'success',
        confirmButtonColor: '#0f766e',
      });
      await refreshData();
    } catch (err) {
      setFeedback(getErrorMessage(err, 'No se pudo eliminar la vacante.'));
    }
  }

  async function postularse(vacanteId) {
    try {
      await axios.post(`${API}/postulaciones/`, { vacante: vacanteId }, { headers });
      setFeedback('Postulación enviada correctamente.');
      Swal.fire({
        title: 'Postulación enviada correctamente.',
        icon: 'success',
        confirmButtonColor: '#0f766e',
      });
      await refreshData();
    } catch (err) {
      setFeedback(getErrorMessage(err, 'No fue posible postularse.'));
    }
  }

  async function cambiarEstado(postulacionId) {
    const estado = postulacionState[postulacionId] || '';
    try {
      const approvalContract = postulacionContractForm[postulacionId] || emptyApprovalContract;
      const payload = estado === 'aprobado'
        ? {
            estado,
            contrato_fecha_inicio: approvalContract.fecha_inicio,
            contrato_tipo_contrato: approvalContract.tipo_contrato,
            contrato_salario: approvalContract.salario,
          }
        : { estado };

      await axios.patch(`${API}/postulaciones/${postulacionId}/`, payload, { headers });
      setFeedback('Estado de postulación actualizado.');
      setPostulacionContractForm((prev) => {
        const next = { ...prev };
        delete next[postulacionId];
        return next;
      });
      await refreshData();
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
      Swal.fire({
        title: 'Entrevista registrada correctamente.',
        icon: 'success',
        confirmButtonColor: '#0f766e',
      });
      setInterviewTarget(null);
      setInterviewForm(emptyInterview);
      await refreshData();
    } catch (err) {
      if (err?.response?.status === 404) {
        setFeedback('No se encontró el endpoint de entrevistas. Revisa VITE_API_URL o que el backend esté desplegado con la última versión.');
      } else {
        setFeedback(getErrorMessage(err, 'No se pudo registrar la entrevista.'));
      }
    }
  }

  function abrirContrato(contrato) {
    setContractTarget(contrato.id);
    setContractForm({
      fecha_inicio: toDateInput(contrato.fecha_inicio),
      tipo_contrato: contrato.tipo_contrato || 'indefinido',
      salario: contrato.salario ?? '',
    });
  }

  async function guardarContrato(e) {
    e.preventDefault();
    if (!contractTarget) return;

    try {
      await axios.patch(
        `${API}/contratos/${contractTarget}/`,
        {
          fecha_inicio: contractForm.fecha_inicio || null,
          tipo_contrato: contractForm.tipo_contrato,
          salario: contractForm.salario === '' ? null : contractForm.salario,
        },
        { headers },
      );
      setFeedback('Contrato actualizado con éxito.');
      Swal.fire({
        title: 'Contrato guardado correctamente.',
        icon: 'success',
        confirmButtonColor: '#0f766e',
      });
      setContractTarget(null);
      setContractForm(emptyContract);
      await refreshData();
    } catch (err) {
      setFeedback(getErrorMessage(err, 'No se pudo guardar el contrato.'));
    }
  }

  function isContractOpenForPostulation(postulacion) {
    return postulacion.estado === 'aprobado' && postulacion.contrato;
  }

  const navItems = useMemo(() => {
    const baseItems = [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Vacantes', path: '/vacantes' },
      { label: 'Postulaciones', path: '/postulaciones' },
      { label: 'Entrevistas', path: '/entrevistas' },
      { label: 'Contratos', path: '/contratos' },
    ];

    return baseItems;
  }, [user?.role]);

  const currentPage = useMemo(() => {
    const segment = location.pathname.split('/').filter(Boolean)[0] || 'dashboard';
    const validPages = new Set(['dashboard', 'vacantes', 'postulaciones', 'entrevistas', 'contratos']);
    return validPages.has(segment) ? segment : 'dashboard';
  }, [location.pathname]);

  if (!token) {
    return (
      <div className="auth-page min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div id="container" className={authClass}>
          <div className="login">
            <div className="content">
              <h1>Iniciar sesión</h1>
              <form onSubmit={login}>
                <input
                  type="text"
                  placeholder="usuario"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
                />
                <input
                  type="password"
                  placeholder="contraseña"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                />
                <span className="remember">Recordarme</span>
                <span className="forget" role="button" tabIndex={0} onClick={() => setFeedback('Recuperación de contraseña no configurada todavía.')} onKeyDown={() => {}}>
                  Olvidé mi contraseña
                </span>
                <span className="clearfix"></span>
                <button type="submit">Iniciar sesión</button>
              </form>

              <span className="loginwith">O conecta con</span>

              <div className="socials">
                <a href="https://facebook.com" onClick={(e) => e.preventDefault()} aria-label="Facebook"><i className="fa-brands fa-facebook-f"></i></a>
                <a href="https://twitter.com" onClick={(e) => e.preventDefault()} aria-label="Twitter"><i className="fa-brands fa-twitter"></i></a>
                <a href="https://github.com" onClick={(e) => e.preventDefault()} aria-label="GitHub"><i className="fa-brands fa-github"></i></a>
                <a href="https://linkedin.com" onClick={(e) => e.preventDefault()} aria-label="LinkedIn"><i className="fa-brands fa-linkedin-in"></i></a>
              </div>

              <span className="copy">&copy; 2026</span>
            </div>
          </div>

          <div className="page front">
            <div className="content">
              <i className="fa-solid fa-user-plus userIcon"></i>

              <h1>Hola, amigo</h1>
              <p>Ingresa tus datos personales y comienza tu proceso con nosotros</p>

              <button type="button" id="register" onClick={() => setAuthClass('active')}>
                Registrarse
                <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>

          <div className="page back">
            <div className="content">
              <i className="fa-solid fa-right-to-bracket bracketIcon"></i>

              <h1>¡Bienvenido de nuevo!</h1>
              <p>
                Para seguir conectado con nosotros, inicia sesión con tu
                información personal
              </p>

              <button type="button" id="login" onClick={() => setAuthClass('close')}>
                <i className="fa-solid fa-arrow-left"></i> Iniciar sesión
              </button>
            </div>
          </div>

          <div className="register">
            <div className="content">
              <h1>Registrarse</h1>

              <i className="fa-brands fa-facebook-f"></i>
              <i className="fa-brands fa-twitter"></i>
              <i className="fa-brands fa-github"></i>
              <i className="fa-brands fa-linkedin-in"></i>

              <span className="loginwith">O</span>

              <form onSubmit={register}>
                <input
                  type="text"
                  placeholder="nombre de usuario"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, username: e.target.value }))}
                />
                <input
                  type="email"
                  placeholder="correo"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                />
                <input
                  type="password"
                  placeholder="contraseña"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                />
                <select
                  value={registerForm.role}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, role: e.target.value }))}
                >
                  <option value="candidato">Candidato</option>
                  <option value="reclutador">Reclutador</option>
                </select>
                {registerForm.role === 'reclutador' && (
                  <input
                    type="text"
                    placeholder="código de invitación"
                    value={registerForm.invite_code}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, invite_code: e.target.value }))}
                  />
                )}
                <span className="remember">Acepto los términos</span>
                <span className="clearfix"></span>
                <button type="submit">Registrarse</button>
              </form>
            </div>
          </div>
        </div>

        {feedback && <div className="fixed bottom-5 right-5 max-w-sm rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-xl">{feedback}</div>}
      </div>
    );
  }

  const totalReportes = reportes?.total_postulaciones_global || 0;
  const maxVacante = Math.max(1, ...(reportes?.total_postulaciones_por_vacante || []).map((item) => item.total_postulaciones || 0));
  const maxEtapa = Math.max(1, ...(reportes?.candidatos_por_etapa || []).map((item) => item.cantidad || 0));

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <RecruiterNavbar
          navItems={navItems}
          onLogout={handleLogoutInteractive}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          onGoHome={() => navigate('/dashboard')}
        />

        <header className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-2xl shadow-slate-900/10 backdrop-blur-md">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
            <div>
              <p className="inline-flex rounded-full bg-teal-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                Sistema de selección
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Publicar, postular, entrevistar y contratar sin salir del mismo panel.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                El panel se adapta a tu rol y muestra el progreso real del proceso, incluyendo reportes del embudo y el estado de cada contrato.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-3xl bg-gradient-to-r from-slate-950 to-slate-700 p-5 text-white">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Sesión activa</p>
                <p className="mt-2 text-2xl font-black">{user?.username}</p>
                <p className="text-sm text-slate-300">{prettyRole(user?.role)}</p>
              </div>
              <div className="rounded-3xl bg-gradient-to-r from-teal-500 to-orange-400 p-5 text-white">
                <p className="text-xs uppercase tracking-[0.24em] text-white/80">Estado del flujo</p>
                <p className="mt-2 text-2xl font-black">{metrics.contratos} contratos</p>
                <p className="text-sm text-white/90">{metrics.abiertas} vacantes activas, {metrics.aprobadas} postulaciones aprobadas</p>
              </div>
            </div>
          </div>
        </header>

        {currentPage === 'dashboard' && (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Vacantes activas</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{metrics.abiertas}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Postulaciones aprobadas</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{metrics.aprobadas}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Entrevistas registradas</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{metrics.entrevistas}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Contratos</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{metrics.contratos}</p>
            </div>
          </section>
        )}

        <main className={`grid gap-6 ${currentPage === 'vacantes' ? 'xl:grid-cols-[360px_1fr]' : 'xl:grid-cols-1'}`}>
          {currentPage === 'vacantes' && (
            <aside className="space-y-6 rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-900/10 backdrop-blur-md">
              {user?.role === 'reclutador' ? (
                <form onSubmit={saveVacante} className="space-y-3">
                  <SectionTitle eyebrow="Publicación" title={editingId ? 'Editar vacante' : 'Nueva vacante'} subtitle="Crea o actualiza vacantes desde aquí." />
                  <input required type="text" placeholder="Título" value={vacanteForm.titulo} onChange={(e) => setVacanteForm((prev) => ({ ...prev, titulo: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" />
                  <textarea required placeholder="Descripción" rows={4} value={vacanteForm.descripcion} onChange={(e) => setVacanteForm((prev) => ({ ...prev, descripcion: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" />
                  <input required type="text" placeholder="Área" value={vacanteForm.area} onChange={(e) => setVacanteForm((prev) => ({ ...prev, area: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" />
                  <input required type="date" value={vacanteForm.fecha_limite} onChange={(e) => setVacanteForm((prev) => ({ ...prev, fecha_limite: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" />
                  <select value={vacanteForm.estado} onChange={(e) => setVacanteForm((prev) => ({ ...prev, estado: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100">
                    {vacanteEstados.map((estado) => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </select>
                  <button disabled={saving} className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                    {saving ? 'Guardando...' : editingId ? 'Actualizar vacante' : 'Crear vacante'}
                  </button>
                  {editingId && (
                    <button type="button" onClick={cancelEdit} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                      Cancelar edición
                    </button>
                  )}
                </form>
              ) : (
                <div className="rounded-3xl bg-slate-950 p-5 text-white">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Rol candidato</p>
                  <p className="mt-2 text-lg font-bold">Vista de seguimiento</p>
                  <p className="mt-2 text-sm text-slate-300">Puedes revisar vacantes, postularte y ver el estado de tus entrevistas y contrato.</p>
                </div>
              )}

              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Filtros</p>
                <div className="mt-4 space-y-3">
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar vacante" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" />
                  <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100">
                    <option value="">Todos los estados</option>
                    {vacanteEstados.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                  </select>
                  <select value={areaFiltro} onChange={(e) => setAreaFiltro(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100">
                    <option value="">Todas las áreas</option>
                    {areasUnicas.map((area) => <option key={area} value={area}>{area}</option>)}
                  </select>
                </div>
              </div>

              <button onClick={handleLogoutInteractive} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Cerrar sesión
              </button>
            </aside>
          )}

          <RecruiterModuleContent
            currentPage={currentPage}
            user={user}
            reportes={reportes}
            totalReportes={totalReportes}
            maxVacante={maxVacante}
            maxEtapa={maxEtapa}
            loading={loading}
            vacantes={vacantes}
            vacanteEstados={vacanteEstados}
            toDateInput={toDateInput}
            areasUnicas={areasUnicas}
            search={search}
            setSearch={setSearch}
            estadoFiltro={estadoFiltro}
            setEstadoFiltro={setEstadoFiltro}
            areaFiltro={areaFiltro}
            setAreaFiltro={setAreaFiltro}
            handleLogoutInteractive={handleLogoutInteractive}
            startEdit={startEdit}
            removeVacante={removeVacante}
            postularse={postularse}
            prettyStage={prettyStage}
            prettyRole={prettyRole}
            postulaciones={postulaciones}
            postulacionState={postulacionState}
            setPostulacionState={setPostulacionState}
            postulacionContractForm={postulacionContractForm}
            setPostulacionContractForm={setPostulacionContractForm}
            postulacionEstados={postulacionEstados}
            cambiarEstado={cambiarEstado}
            abrirEntrevista={abrirEntrevista}
            interviewTarget={interviewTarget}
            guardarEntrevista={guardarEntrevista}
            interviewForm={interviewForm}
            setInterviewForm={setInterviewForm}
            modalidades={modalidades}
            entrevistas={entrevistas}
            toMoney={toMoney}
            isContractOpenForPostulation={isContractOpenForPostulation}
            abrirContrato={abrirContrato}
            contratos={contratos}
            contractTarget={contractTarget}
            guardarContrato={guardarContrato}
            contractForm={contractForm}
            setContractForm={setContractForm}
            contractTypes={contractTypes}
            setInterviewTarget={setInterviewTarget}
            setContractTarget={setContractTarget}
          />
        </main>
      </div>

      {contractTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={guardarContrato} className="w-full max-w-lg rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl shadow-slate-900/20 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Contrato</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Completar contrato</h3>
            <p className="mt-2 text-sm text-slate-600">Define fecha de inicio, tipo de contrato y salario.</p>

            <div className="mt-5 space-y-4">
              <input type="date" value={contractForm.fecha_inicio} onChange={(e) => setContractForm((prev) => ({ ...prev, fecha_inicio: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" />
              <select value={contractForm.tipo_contrato} onChange={(e) => setContractForm((prev) => ({ ...prev, tipo_contrato: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100">
                {contractTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <input type="number" min="0" step="1000" placeholder="Salario" value={contractForm.salario} onChange={(e) => setContractForm((prev) => ({ ...prev, salario: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Guardar contrato</button>
              <button type="button" onClick={() => { setContractTarget(null); setContractForm(emptyContract); }} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {feedback && <div className="fixed bottom-5 right-5 max-w-sm rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-xl">{feedback}</div>}
    </div>
  );
}

function SectionTitle({ eyebrow, title, subtitle }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">{eyebrow}</p>
      <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
      {subtitle ? <p className="max-w-3xl text-sm text-slate-600">{subtitle}</p> : null}
    </div>
  );
}
