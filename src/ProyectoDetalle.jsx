import React from 'react';
import { createPortal } from 'react-dom';

// Ventana con el detalle de un proyecto: observaciones, lo que falta y el proceso completo
// (Proyecto → Obra → Documentación) con el avance de cada etapa desplegado.
const colorAvance = (v) => (v >= 100 ? '#16a34a' : v >= 60 ? '#2563eb' : v >= 20 ? '#e5a91c' : '#dc2626');
const textoEstado = (v) =>
  v === 'NA' ? 'No aplica a esta obra' : v === null ? 'Sin cargar' : v >= 100 ? 'Completa' : v > 0 ? 'En curso' : 'Sin empezar';

const colorSub = (s) => (s.na ? '#6f8a8f' : s.avance >= 100 ? '#16a34a' : s.avance > 0 ? '#e5a91c' : '#dc2626');

function Aro({ valor, color, tam = 76 }) {
  const r = tam / 2 - 7;
  const c = 2 * Math.PI * r;
  return (
    <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} aria-hidden="true">
      <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke="#2c5059" strokeWidth="7" />
      <circle
        cx={tam / 2}
        cy={tam / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${(Math.max(0, Math.min(100, valor)) / 100) * c} ${c}`}
        transform={`rotate(-90 ${tam / 2} ${tam / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="#f4f8f8" fontSize={tam * 0.27} fontWeight="800">
        {Math.round(valor)}%
      </text>
    </svg>
  );
}

function Nodo({ valor }) {
  const base = {
    width: 28,
    height: 28,
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 800,
    flexShrink: 0,
    zIndex: 1,
  };
  if (valor === 'NA')
    return <div style={{ ...base, border: '2px dashed #3b5d65', color: '#6f8a8f', background: '#16323a' }}>–</div>;
  if (valor === null)
    return <div style={{ ...base, border: '2px solid #3b5d65', color: '#8fa6a9', background: '#16323a' }}>?</div>;
  const c = colorAvance(valor);
  if (valor >= 100) return <div style={{ ...base, background: c, color: '#fff', fontSize: 14 }}>✔</div>;
  if (valor <= 0) return <div style={{ ...base, border: `3px solid ${c}`, background: '#16323a', color: c }} />;
  return <div style={{ ...base, border: `3px solid ${c}`, background: c + '33', color: '#fff' }}>{Math.round(valor)}</div>;
}

export default function ProyectoDetalle({ proyecto: p, etapasCols, grupos, getAvance, getItem, onVerEtapa, onClose }) {
  const etapas = etapasCols.map((col) => ({
    col,
    valor: getAvance(p.etapas_lista, col.key),
    subs: getItem(p.etapas_lista, col.key)?.subitems,
  }));

  const grupoStats = (id) => {
    const lista = etapas.filter((e) => e.col.grupo === id && e.valor !== 'NA');
    return lista.length ? lista.reduce((s, e) => s + (typeof e.valor === 'number' ? e.valor : 0), 0) / lista.length : null;
  };
  const pendientes = etapas.filter((e) => e.valor !== 'NA' && (e.valor === null || e.valor < 100));
  const colorEstado = p.estado === 'Finalizado' ? '#16a34a' : '#4fc3f7';

  const meta = [
    p.capacidad_kwp != null ? ['Capacidad', `${p.capacidad_kwp} kWp`] : null,
    p.responsable ? ['Responsable', p.responsable] : null,
    p.fecha_venta ? ['Venta', p.fecha_venta] : null,
    p.fecha_inicio ? ['Inicio de obra', p.fecha_inicio] : null,
    p.fecha_fin ? ['Fin de obra', p.fecha_fin] : null,
    p.fecha_fin_tramite_ug ? ['Fin trámite UG', p.fecha_fin_tramite_ug] : null,
  ].filter(Boolean);

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(5, 15, 18, 0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle del proyecto ${p.nombre_proyecto}`}
        onClick={(e) => e.stopPropagation()}
        className="proceso-ventana"
        style={{
          width: '100%',
          maxWidth: 1180,
          maxHeight: '92vh',
          overflow: 'auto',
          background: '#16323a',
          border: '1px solid #2c5059',
          borderTop: `4px solid ${colorEstado}`,
          borderRadius: 14,
          boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
          padding: '18px 22px 22px',
        }}
      >
        {/* Encabezado */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 260, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: '#8fa6a9' }}>{p.id_proyecto || 'PROYECTO'}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, color: colorEstado, background: colorEstado + '22', border: `1px solid ${colorEstado}66` }}>
                {p.estado || 'Sin estado'}
              </span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#f4f8f8', lineHeight: 1.15 }}>{p.nombre_proyecto}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginTop: 10 }}>
              {meta.map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8fa6a9' }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e3eaea' }}>{v}</div>
                </div>
              ))}
              {p.ubicacion && (
                <a href={p.ubicacion} target="_blank" rel="noreferrer" style={{ alignSelf: 'flex-end', fontSize: 13, fontWeight: 700, color: '#4fc3f7' }}>
                  Ver ubicación ↗
                </a>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <Aro valor={p.avance || 0} color={colorAvance(p.avance || 0)} />
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8fa6a9', marginTop: 2 }}>Avance total</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              title="Cerrar (Esc)"
              style={{ alignSelf: 'flex-start', cursor: 'pointer', border: '1px solid #3b5d65', background: '#1d3c44', color: '#e3eaea', borderRadius: 8, padding: '6px 11px', fontSize: 16, lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Observaciones */}
        <div
          style={{
            marginTop: 16,
            padding: '12px 16px',
            borderRadius: 10,
            borderLeft: `5px solid ${p.observaciones ? '#ffc933' : '#3b5d65'}`,
            background: p.observaciones ? '#3a3216' : '#1d3c44',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: p.observaciones ? '#ffc933' : '#8fa6a9' }}>
            Observaciones del proyecto
            {p.observaciones && p.ultima_actualizacion && (
              <span style={{ fontWeight: 500, letterSpacing: 0, textTransform: 'none', color: '#b9c7c9', marginLeft: 10 }}>
                · actualizado el {p.ultima_actualizacion}
              </span>
            )}
          </div>
          <div style={{ marginTop: 5, fontSize: 16, lineHeight: 1.4, color: p.observaciones ? '#fff4cf' : '#8fa6a9', whiteSpace: 'pre-wrap' }}>
            {p.observaciones || 'Sin observaciones cargadas.'}
          </div>
        </div>

        {/* Lo que falta */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8fa6a9', marginBottom: 6 }}>
            {pendientes.length ? `Lo que falta (${pendientes.length})` : 'Estado de las etapas'}
          </div>
          {pendientes.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {pendientes.map(({ col, valor }) => {
                const c = valor === null ? '#8fa6a9' : colorAvance(valor);
                return (
                  <span key={col.key} style={{ fontSize: 13, fontWeight: 700, padding: '4px 11px', borderRadius: 999, color: '#f4f8f8', background: c + '2b', border: `1px solid ${c}99` }}>
                    {col.label} · {valor === null ? 'sin cargar' : `${Math.round(valor)} %`}
                  </span>
                );
              })}
            </div>
          ) : (
            <span style={{ fontSize: 14, fontWeight: 700, color: '#95de1d' }}>✔ Todas las etapas están completas.</span>
          )}
        </div>

        {/* Proceso completo */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 18 }}>
          {['proyecto', 'obra', 'doc'].map((gid, gi) => {
            const g = grupos[gid];
            const lista = etapas.filter((e) => e.col.grupo === gid);
            const prom = grupoStats(gid);
            return (
              <div
                key={gid}
                className="proceso-col"
                style={{
                  flex: gid === 'obra' ? '1.25 1 340px' : '1 1 280px',
                  minWidth: 0,
                  border: `1px solid ${g.color}55`,
                  borderTop: `4px solid ${g.color}`,
                  borderRadius: 10,
                  background: g.tint,
                  padding: '12px 14px 4px',
                  animationDelay: `${gi * 120}ms`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: g.color }}>
                    {gi + 1} · {g.label}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: prom === null ? '#8fa6a9' : '#f4f8f8' }}>{prom === null ? '—' : `${Math.round(prom)}%`}</div>
                </div>
                <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {lista.map(({ col, valor, subs }, i) => {
                    const ultimo = i === lista.length - 1;
                    const c = valor === 'NA' || valor === null ? '#8fa6a9' : colorAvance(valor);
                    return (
                      <li key={col.key} style={{ display: 'grid', gridTemplateColumns: '30px 1fr', gap: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Nodo valor={valor} />
                          {!ultimo && <div style={{ flex: 1, width: 3, margin: '2px 0', borderRadius: 2, background: valor === 100 ? '#16a34a88' : '#2c5059' }} />}
                        </div>
                        <div style={{ paddingBottom: ultimo ? 10 : 14 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: valor === 'NA' ? '#8fa6a9' : '#f4f8f8' }}>{col.label}</span>
                            <span style={{ fontSize: 15, fontWeight: 800, color: c }}>{valor === 'NA' || valor === null ? '' : `${Math.round(valor)}%`}</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#8fa6a9' }}>{textoEstado(valor)}</div>
                          {typeof valor === 'number' && (
                            <div style={{ height: 6, borderRadius: 3, background: '#2c5059', marginTop: 5, overflow: 'hidden' }}>
                              <div style={{ width: `${Math.max(0, Math.min(100, valor))}%`, height: 6, background: c }} />
                            </div>
                          )}
                          {Array.isArray(subs) && subs.length > 0 && (
                            <ul style={{ listStyle: 'none', margin: '7px 0 0', padding: '6px 9px', borderRadius: 7, background: '#0f272d99' }}>
                              {subs.map((s, k) => (
                                <li key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13, padding: '2px 0', color: s.na ? '#6f8a8f' : '#d3dfe0' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <span style={{ width: 9, height: 9, borderRadius: 999, background: colorSub(s), flexShrink: 0 }} />
                                    {s.nombre}
                                  </span>
                                  <span style={{ fontWeight: 700, color: colorSub(s) }}>{s.na ? 'N/A' : s.avance >= 100 ? '✔ 100%' : `${Math.round(s.avance || 0)}%`}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {gid === 'obra' && valor !== 'NA' && (
                            <button
                              type="button"
                              onClick={() => onVerEtapa(col, valor)}
                              style={{ marginTop: 5, cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 700, color: g.color }}
                            >
                              Ver actividades de la etapa →
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
