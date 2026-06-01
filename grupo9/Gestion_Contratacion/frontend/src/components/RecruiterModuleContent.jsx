export default function RecruiterModuleContent({
  currentPage,
  user,
  reportes,
  totalReportes,
  maxVacante,
  maxEtapa,
  loading,
  vacantes,
  vacanteEstados,
  toDateInput,
  areasUnicas,
  search,
  setSearch,
  estadoFiltro,
  setEstadoFiltro,
  areaFiltro,
  setAreaFiltro,
  handleLogoutInteractive,
  startEdit,
  removeVacante,
  postularse,
  prettyStage,
  prettyRole,
  postulaciones,
  postulacionState,
  setPostulacionState,
  postulacionContractForm,
  setPostulacionContractForm,
  postulacionEstados,
  cambiarEstado,
  abrirEntrevista,
  interviewTarget,
  guardarEntrevista,
  interviewForm,
  setInterviewForm,
  modalidades,
  entrevistas,
  prettyMoney,
  toMoney,
  isContractOpenForPostulation,
  abrirContrato,
  contratos,
  contractTarget,
  guardarContrato,
  contractForm,
  setContractForm,
  contractTypes,
  setInterviewTarget,
  setContractTarget,
}) {
  function safePercent(value, max) {
    const v = Number(value) || 0;
    const m = Math.max(1, Number(max) || 1);
    const pct = Math.round((v / m) * 100);
    return `${Math.min(100, Math.max(0, pct))}%`;
  }

  const emptyApprovalContract = { fecha_inicio: '', tipo_contrato: 'indefinido', salario: '' };

  return (
    <section className="space-y-6 rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-900/10 backdrop-blur-md sm:p-8">
      {currentPage === 'dashboard' && user?.role === 'reclutador' && reportes && (
        <div className="space-y-6 rounded-[1.75rem] bg-slate-950 p-5 text-white sm:p-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-300">Reportes</p>
            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Embudo de selección</h2>
            <p className="max-w-3xl text-sm text-slate-300">Resumen de postulaciones por vacante, por etapa y tasa de conversión.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Postulaciones globales" value={totalReportes} tone="teal" hint="Total contabilizado en tus vacantes." />
            <MetricCard label="Conversión global" value={`${reportes.tasa_conversion_global}%`} tone="orange" hint="Aprobadas sobre el total." />
            <MetricCard label="Vacantes con movimiento" value={reportes.total_postulaciones_por_vacante?.length || 0} tone="emerald" hint="Vacantes con al menos una postulación." />
            <MetricCard label="Etapas activas" value={reportes.candidatos_por_etapa?.length || 0} tone="slate" hint="Estados presentes en el embudo." />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-3xl bg-white/5 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">Postulaciones por vacante</h3>
              <div className="mt-4 space-y-4">
                {(reportes.total_postulaciones_por_vacante || []).map((item) => (
                  <div key={item.vacante_id}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-white">{item.vacante_titulo}</span>
                      <span className="text-slate-300">{item.total_postulaciones} postulaciones</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-orange-400" style={{ width: safePercent(item.total_postulaciones, maxVacante) }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Conversión: {item.tasa_conversion}%</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white/5 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">Candidatos por etapa</h3>
              <div className="mt-4 space-y-4">
                {(reportes.candidatos_por_etapa || []).map((item) => (
                  <div key={item.estado}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-white">{prettyStage(item.estado)}</span>
                      <span className="text-slate-300">{item.cantidad}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400" style={{ width: safePercent(item.cantidad, maxEtapa) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {currentPage === 'vacantes' && (
        <div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Vacantes</p>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Publicadas y disponibles</h2>
            <p className="max-w-3xl text-sm text-slate-600">El candidato puede postularse solo a vacantes activas; las vencidas o cubiertas se cierran automáticamente.</p>
          </div>
          <div className="mt-5 space-y-4">
            {loading ? (
              <p className="text-sm text-slate-500">Cargando información...</p>
            ) : vacantes.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">No hay vacantes para mostrar.</p>
            ) : (
              vacantes.map((vacante) => (
                <article key={vacante.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold text-slate-950">{vacante.titulo}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{vacante.descripcion}</p>
                    </div>
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">{vacante.estado}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="rounded-full bg-slate-100 px-3 py-1">Área: {vacante.area}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">Límite: {toDateInput(vacante.fecha_limite)}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">Reclutador: {vacante.creado_por}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {user?.role === 'reclutador' ? (
                      <>
                        <button onClick={() => startEdit(vacante)} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">Editar</button>
                        <button onClick={() => removeVacante(vacante.id)} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700">Eliminar</button>
                      </>
                    ) : (
                      <button onClick={() => postularse(vacante.id)} disabled={vacante.estado !== 'activa'} className="rounded-xl bg-teal-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                        {vacante.estado === 'activa' ? 'Postularme' : 'No disponible'}
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {currentPage === 'postulaciones' && (
        <div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Postulaciones</p>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Seguimiento del proceso</h2>
            <p className="max-w-3xl text-sm text-slate-600">Cada postulación muestra entrevistas registradas y, cuando se aprueba, el contrato asociado.</p>
          </div>
          <div className="mt-5 space-y-4">
            {postulaciones.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">No hay postulaciones para mostrar.</p>
            ) : (
              postulaciones.map((postulacion) => {
                const selectedState = postulacionState[postulacion.id] ?? postulacion.estado;
                const approvalDraft = postulacionContractForm[postulacion.id] ?? emptyApprovalContract;

                return (
                <article key={postulacion.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950">{postulacion.vacante_titulo}</h3>
                      <p className="text-sm text-slate-600">Candidato: {postulacion.candidato}</p>
                    </div>
                    <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">{prettyStage(postulacion.estado)}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="rounded-full bg-slate-100 px-3 py-1">Área: {postulacion.vacante_area}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">Fecha: {toDateInput(postulacion.fecha_postulacion)}</span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {user?.role === 'reclutador' && (
                      <select
                        value={selectedState}
                        onChange={(e) => {
                          const nextState = e.target.value;
                          setPostulacionState((prev) => ({ ...prev, [postulacion.id]: nextState }));
                          if (nextState === 'aprobado') {
                            setPostulacionContractForm((prev) => ({
                              ...prev,
                              [postulacion.id]: prev[postulacion.id] ?? emptyApprovalContract,
                            }));
                          }
                        }}
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                      >
                        {postulacionEstados.map((estado) => (
                          <option key={estado} value={estado}>{prettyStage(estado)}</option>
                        ))}
                      </select>
                    )}
                    {user?.role === 'reclutador' && (
                      <button onClick={() => cambiarEstado(postulacion.id)} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                        {selectedState === 'aprobado' ? 'Aprobar y generar contrato' : 'Cambiar estado'}
                      </button>
                    )}
                    {user?.role === 'reclutador' && <button onClick={() => abrirEntrevista(postulacion.id)} className="rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">Registrar entrevista</button>}
                  </div>

                  {user?.role === 'reclutador' && selectedState === 'aprobado' && (
                    <div className="mt-4 rounded-3xl border border-amber-100 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-amber-900">Datos del contrato al aprobar</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <input
                          type="date"
                          value={approvalDraft.fecha_inicio}
                          onChange={(e) => setPostulacionContractForm((prev) => ({
                            ...prev,
                            [postulacion.id]: { ...(prev[postulacion.id] ?? emptyApprovalContract), fecha_inicio: e.target.value },
                          }))}
                          className="rounded-2xl border border-amber-200 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                        />
                        <select
                          value={approvalDraft.tipo_contrato}
                          onChange={(e) => setPostulacionContractForm((prev) => ({
                            ...prev,
                            [postulacion.id]: { ...(prev[postulacion.id] ?? emptyApprovalContract), tipo_contrato: e.target.value },
                          }))}
                          className="rounded-2xl border border-amber-200 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                        >
                          {contractTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                        </select>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          placeholder="Salario"
                          value={approvalDraft.salario}
                          onChange={(e) => setPostulacionContractForm((prev) => ({
                            ...prev,
                            [postulacion.id]: { ...(prev[postulacion.id] ?? emptyApprovalContract), salario: e.target.value },
                          }))}
                          className="rounded-2xl border border-amber-200 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                        />
                      </div>
                    </div>
                  )}

                  {interviewTarget === postulacion.id && user?.role === 'reclutador' && (
                    <form onSubmit={guardarEntrevista} className="mt-4 space-y-3 rounded-3xl border border-teal-100 bg-teal-50 p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <input type="datetime-local" value={interviewForm.fecha} onChange={(e) => setInterviewForm((prev) => ({ ...prev, fecha: e.target.value }))} className="rounded-2xl border border-teal-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" required />
                        <select value={interviewForm.modalidad} onChange={(e) => setInterviewForm((prev) => ({ ...prev, modalidad: e.target.value }))} className="rounded-2xl border border-teal-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100">
                          {modalidades.map((modalidad) => (
                            <option key={modalidad} value={modalidad}>{modalidad}</option>
                          ))}
                        </select>
                      </div>
                      <textarea rows={3} placeholder="Observaciones" value={interviewForm.observaciones} onChange={(e) => setInterviewForm((prev) => ({ ...prev, observaciones: e.target.value }))} className="w-full rounded-2xl border border-teal-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" />
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">Guardar entrevista</button>
                        <button type="button" onClick={() => setInterviewTarget(null)} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white">Cancelar</button>
                      </div>
                    </form>
                  )}

                  {postulacion.entrevistas?.length > 0 && (
                    <div className="mt-4 space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-800">Entrevistas</p>
                      {postulacion.entrevistas.map((entrevista) => (
                        <div key={entrevista.id} className="rounded-2xl bg-white p-3 text-sm text-slate-700 shadow-sm">
                          <p><strong>Fecha:</strong> {new Date(entrevista.fecha).toLocaleString()}</p>
                          <p><strong>Modalidad:</strong> {entrevista.modalidad}</p>
                          <p><strong>Entrevistador:</strong> {entrevista.entrevistador}</p>
                          {entrevista.observaciones && <p><strong>Observaciones:</strong> {entrevista.observaciones}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {postulacion.contrato ? (
                    <div className="mt-4 rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-emerald-800">Contrato generado</p>
                          <p className="text-sm text-emerald-700">{postulacion.contrato.vacante}</p>
                        </div>
                        <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">{postulacion.contrato.tipo_contrato}</span>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-emerald-900 sm:grid-cols-3">
                        <p><strong>Inicio:</strong> {postulacion.contrato.fecha_inicio || 'Pendiente'}</p>
                        <p><strong>Salario:</strong> {toMoney(postulacion.contrato.salario)}</p>
                        <p><strong>Creado:</strong> {new Date(postulacion.contrato.creado_en).toLocaleDateString()}</p>
                      </div>
                      {user?.role === 'reclutador' && isContractOpenForPostulation(postulacion) && (
                        <button onClick={() => abrirContrato(postulacion.contrato)} className="mt-4 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">Editar contrato</button>
                      )}
                    </div>
                  ) : null}
                </article>
                );
              })
            )}
          </div>
        </div>
      )}

      {currentPage === 'entrevistas' && (
        <div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Entrevistas</p>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Programadas y registradas</h2>
            <p className="max-w-3xl text-sm text-slate-600">Lista centralizada de entrevistas para no perderlas de vista aunque no abras cada postulación.</p>
          </div>
          <div className="mt-5 space-y-4">
            {entrevistas.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">No hay entrevistas registradas.</p>
            ) : (
              entrevistas.map((entrevista) => (
                <article key={entrevista.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950">{entrevista.postulacion_detalle?.vacante || 'Entrevista'}</h3>
                      <p className="text-sm text-slate-600">Candidato: {entrevista.postulacion_detalle?.candidato || 'Sin candidato'}</p>
                    </div>
                    <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">{entrevista.modalidad}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                    <p><strong>Fecha:</strong> {new Date(entrevista.fecha).toLocaleString()}</p>
                    <p><strong>Entrevistador:</strong> {entrevista.entrevistador}</p>
                    <p><strong>Postulación:</strong> {prettyStage(entrevista.postulacion_detalle?.estado)}</p>
                  </div>
                  {entrevista.observaciones && <p className="mt-3 text-sm text-slate-700"><strong>Observaciones:</strong> {entrevista.observaciones}</p>}
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {currentPage === 'contratos' && (
        <div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Contratos</p>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Gestión contractual</h2>
            <p className="max-w-3xl text-sm text-slate-600">Los contratos se crean al aprobar una postulación y se pueden completar desde aquí.</p>
          </div>
          <div className="mt-5 space-y-4">
            {contratos.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">No hay contratos disponibles.</p>
            ) : (
              contratos.map((contrato) => (
                <article key={contrato.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950">{contrato.vacante_titulo}</h3>
                      <p className="text-sm text-slate-600">Candidato: {contrato.candidato}</p>
                    </div>
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">{contrato.tipo_contrato}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                    <p><strong>Inicio:</strong> {contrato.fecha_inicio || 'Pendiente'}</p>
                    <p><strong>Salario:</strong> {toMoney(contrato.salario)}</p>
                    <p><strong>Creado:</strong> {new Date(contrato.creado_en).toLocaleString()}</p>
                  </div>
                  {user?.role === 'reclutador' && (
                    <button onClick={() => abrirContrato(contrato)} className="mt-4 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">Completar contrato</button>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {contractTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={guardarContrato} className="w-full max-w-lg rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl shadow-slate-900/20 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Contrato</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Completar contrato</h3>
            <p className="mt-2 text-sm text-slate-600">Define fecha de inicio, tipo de contrato y salario.</p>
            <div className="mt-5 space-y-4">
              <input type="date" value={contractForm.fecha_inicio} onChange={(e) => setContractForm((prev) => ({ ...prev, fecha_inicio: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" />
              <select value={contractForm.tipo_contrato} onChange={(e) => setContractForm((prev) => ({ ...prev, tipo_contrato: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100">
                {contractTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <input type="number" min="0" step="1000" placeholder="Salario" value={contractForm.salario} onChange={(e) => setContractForm((prev) => ({ ...prev, salario: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Guardar contrato</button>
              <button type="button" onClick={() => { setContractTarget(null); setContractForm(emptyContract); }} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function MetricCard({ label, value, tone = 'slate', hint }) {
  const tones = {
    teal: 'from-teal-500 to-cyan-400',
    orange: 'from-orange-500 to-amber-400',
    slate: 'from-slate-900 to-slate-700',
    emerald: 'from-emerald-600 to-teal-500',
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-5 shadow-lg shadow-slate-900/5 backdrop-blur-md">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tones[tone]}`} />
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-600">{hint}</p> : null}
    </div>
  );
}
