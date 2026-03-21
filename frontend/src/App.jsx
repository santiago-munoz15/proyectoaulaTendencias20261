import React, { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

const API = "http://127.0.0.1:8000/api";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [vacantes, setVacantes] = useState([]);
  const [role, setRole] = useState(""); //Nuevo

  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    area: "",
    fecha_publicacion: new Date().toISOString().split("T")[0],
    fecha_limite: "",
    estado: "activa",
  });

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  // LOGIN
  const login = async () => {
    try {
      const res = await axios.post(`${API}/auth/login/`, {
        username: loginForm.username.trim(),
        password: loginForm.password.trim(),
      });

      const access = res.data.access;

      const decoded = jwtDecode(access);
      console.log("TOKEN:", decoded);

      localStorage.setItem("token", access);
      localStorage.setItem("user_id", decoded.user_id);

      setToken(access);

      alert("✅ Login exitoso");
    } catch (err) {
      console.log(err.response?.data);
      alert("❌ Credenciales incorrectas");
    }
  };

  //OBTENER USUARIO (ROL)
  const getUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("USER:", res.data);
      setRole(res.data.role);
    } catch (err) {
      console.log("Error obteniendo usuario", err);
    }
  };

  // LOGOUT
  const logout = () => {
    setToken("");
    setRole("");
    localStorage.removeItem("token");
  };

  //VACANTES
  const getVacantes = async () => {
    try {
      const res = await axios.get(`${API}/vacantes/`, { headers });
      setVacantes(res.data.results || res.data);
    } catch (err) {
      console.log("Error cargando vacantes", err);
    }
  };

  //CREAR
  const crearVacante = async () => {
    try {
      await axios.post(`${API}/vacantes/`, form, { headers });
      getVacantes();
    } catch (err) {
      console.log(err.response?.data);
      alert("❌ No tienes permisos (solo reclutador)");
    }
  };

  // ELIMINAR
  const eliminarVacante = async (id) => {
    await axios.delete(`${API}/vacantes/${id}/`, { headers });
    getVacantes();
  };

  // POSTULARSE
  const postularse = async (id) => {
    try {
      await axios.post(`${API}/postulaciones/`, { vacante: id }, { headers });
      alert("✅ Postulación enviada");
    } catch (err) {
      console.log(err.response?.data);
      alert("❌ No tienes permisos (solo candidato)");
    }
  };

  useEffect(() => {
    if (token) {
      getVacantes();
      getUser(); //YA FUNCIONA
    }
  }, [token]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Plataforma de Empleo</h1>

      {/* LOGIN */}
      {!token ? (
        <div className="border p-4 rounded mb-6">
          <h2 className="text-xl mb-2">Login</h2>

          <input
            className="border p-2 mr-2"
            placeholder="Usuario"
            value={loginForm.username}
            onChange={(e) =>
              setLoginForm({ ...loginForm, username: e.target.value })
            }
          />

          <input
            className="border p-2 mr-2"
            type="password"
            placeholder="Contraseña"
            value={loginForm.password}
            onChange={(e) =>
              setLoginForm({ ...loginForm, password: e.target.value })
            }
          />

          <button onClick={login} className="bg-blue-500 text-white px-4 py-2">
            Iniciar sesión
          </button>
        </div>
      ) : (
        <button
          onClick={logout}
          className="bg-red-500 text-white px-4 py-2 mb-4"
        >
          Cerrar sesión
        </button>
      )}

      {/* APP */}
      {token && (
        <>
          {/* SOLO RECLUTADOR */}
          {role === "reclutador" && (
            <div className="mb-6 border p-4 rounded">
              <h2 className="text-xl mb-2">Crear Vacante</h2>

              <input
                className="border p-2 mr-2"
                placeholder="Título"
                onChange={(e) =>
                  setForm({ ...form, titulo: e.target.value })
                }
              />

              <input
                className="border p-2 mr-2"
                placeholder="Descripción"
                onChange={(e) =>
                  setForm({ ...form, descripcion: e.target.value })
                }
              />

              <input
                className="border p-2 mr-2"
                placeholder="Área"
                onChange={(e) =>
                  setForm({ ...form, area: e.target.value })
                }
              />

              <input
                className="border p-2 mr-2"
                type="date"
                onChange={(e) =>
                  setForm({ ...form, fecha_limite: e.target.value })
                }
              />

              <button
                onClick={crearVacante}
                className="bg-green-500 text-white px-4 py-2"
              >
                Crear
              </button>
            </div>
          )}

          {/* VACANTES */}
          <div>
            <h2 className="text-xl mb-2">Vacantes</h2>

            {vacantes.map((v) => (
              <div key={v.id} className="border p-4 mb-2 rounded">
                <h3 className="font-bold">{v.titulo}</h3>
                <p>{v.descripcion}</p>
                <p className="text-sm text-gray-600">{v.area}</p>

                {/* SOLO RECLUTADOR */}
                {role === "reclutador" && (
                  <button
                    onClick={() => eliminarVacante(v.id)}
                    className="bg-red-500 text-white px-2 mr-2 mt-2"
                  >
                    Eliminar
                  </button>
                )}

                {/* SOLO CANDIDATO */}
                {role === "candidato" && (
                  <button
                    onClick={() => postularse(v.id)}
                    className="bg-purple-500 text-white px-2 mt-2"
                  >
                    Postularme
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}