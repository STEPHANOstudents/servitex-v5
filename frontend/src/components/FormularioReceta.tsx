// =============================================================================
// SERVITEX — Formulario de Receta Técnica (Módulo Lab)
// Sección 2 del documento: Formulario de Ingreso al Laboratorio
// =============================================================================
import React, { useState, useCallback, useEffect } from 'react';
import type {
  ComposicionFibra, RecetaConMotor, RecetaPreload, ColoranteCatalogo,
} from '../types/recetas';
import { CATALOGO_COLORANTES, getNivelClase } from '../types/recetas';
import { crearReceta } from '../services/recetasApi';
import { obtenerOrdenes } from '../services/api';
import type { OrdenCompraDB } from '../types/ordenes';

// Selector de fibra principal
type FibraMain = 'ALGODON' | 'NYLON' | 'POLIESTER' | 'MULTIFIBRA';

interface LoteOpcion {
  id: number;
  label: string; // "OC-001 · Navy Blue · 150 m · Cliente ABC"
}

interface FormularioRecetaProps {
  preload?: RecetaPreload | null;
  onRecetaGuardada: (resultado: RecetaConMotor) => void;
  onToast: (tipo: 'success' | 'error', msg: string) => void;
}

// Calcula nivel de intensidad (para el chip en tiempo real)
function calcIntensidad(colorantes: Record<string, string>): { suma: number; nivel: number; desc: string } {
  const suma = Object.values(colorantes).reduce((acc, v) => {
    const f = parseFloat(v);
    return acc + (isNaN(f) ? 0 : f);
  }, 0);
  const s = Math.round(suma * 10000) / 10000;
  if (s <= 0.01)  return { suma: s, nivel: 1, desc: 'Pasteles' };
  if (s <= 0.1)   return { suma: s, nivel: 2, desc: 'Claros' };
  if (s <= 1.0)   return { suma: s, nivel: 3, desc: 'Intermedios' };
  return            { suma: s, nivel: 4, desc: 'Intensos' };
}

const FormularioReceta: React.FC<FormularioRecetaProps> = ({
  preload, onRecetaGuardada, onToast,
}) => {
  // ── Lotes disponibles ──
  const [lotes, setLotes] = useState<LoteOpcion[]>([]);
  const [detalleOrdenId, setDetalleOrdenId] = useState('');

  // ── Datos físicos ──
  const [pesoRealKg, setPesoRealKg]     = useState('');
  const [articulo, setArticulo]         = useState('');
  const [relacionBano, setRelacionBano] = useState('');
  const [descripcionColor, setDescripcionColor] = useState('');
  const [observaciones, setObservaciones]       = useState('');

  // ── Selección de fibra ──
  const [fibraMain, setFibraMain]   = useState<FibraMain | null>(null);
  const [composicion, setComposicion] = useState<ComposicionFibra | null>(null);

  // ── Colorantes: { nombreColorante: porcentaje string } ──
  const [seleccionados, setSeleccionados] = useState<Record<string, boolean>>({});
  const [porcentajes,   setPorcentajes]   = useState<Record<string, string>>({});

  // ── UI ──
  const [guardando, setGuardando] = useState(false);
  const [errores,   setErrores]   = useState<Record<string, string>>({});

  // ── Cargar lotes disponibles ──
  useEffect(() => {
    obtenerOrdenes().then(data => {
      const opts: LoteOpcion[] = [];
      for (const oc of data.ordenes as OrdenCompraDB[]) {
        for (const d of oc.detalles ?? []) {
          opts.push({
            id: d.id,
            label: `${oc.numeroOC} · ${d.colorSolicitado} · ${d.cantidad}m · ${oc.cliente.nombre}`,
          });
        }
      }
      setLotes(opts);
    }).catch(() => {});
  }, []);

  // ── Aplicar preload (Copiar como base) ──
  useEffect(() => {
    if (!preload) return;
    setPesoRealKg(preload.pesoRealKg);
    setArticulo(preload.articulo);
    setRelacionBano(preload.relacionBano);
    setDescripcionColor(preload.descripcionColor);
    setObservaciones(preload.observacionesTecnicas);
    setDetalleOrdenId(''); // el lote debe elegirse manualmente

    // Establecer fibra
    setComposicion(preload.composicionFibra);
    const main: FibraMain =
      preload.composicionFibra === 'ALGODON'   ? 'ALGODON'   :
      preload.composicionFibra === 'NYLON'     ? 'NYLON'     :
      preload.composicionFibra === 'POLIESTER' ? 'POLIESTER' : 'MULTIFIBRA';
    setFibraMain(main);

    // Restaurar colorantes
    const sel: Record<string, boolean> = {};
    const pct: Record<string, string>  = {};
    for (const c of preload.colorantes) {
      sel[c.nombre] = true;
      pct[c.nombre] = c.porcentaje;
    }
    setSeleccionados(sel);
    setPorcentajes(pct);
  }, [preload]);

  // ── Catálogo activo ──
  const catalogoActivo: ColoranteCatalogo[] = composicion ? CATALOGO_COLORANTES[composicion] : [];

  // Cuando cambia la composición, limpiar colorantes si no hay preload activo
  const cambiarComposicion = useCallback((nueva: ComposicionFibra) => {
    setComposicion(nueva);
    setSeleccionados({});
    setPorcentajes({});
  }, []);

  // Toggle de un colorante en el catálogo
  const toggleColorante = useCallback((nombre: string) => {
    setSeleccionados(prev => {
      const next = { ...prev, [nombre]: !prev[nombre] };
      if (!next[nombre]) {
        setPorcentajes(p => { const n = { ...p }; delete n[nombre]; return n; });
      }
      return next;
    });
  }, []);

  // Intensidad calculada en tiempo real
  const intensidad = calcIntensidad(
    Object.fromEntries(
      Object.entries(porcentajes).filter(([k]) => seleccionados[k])
    )
  );

  // ── Validar ──
  function validar(): boolean {
    const e: Record<string, string> = {};
    if (!detalleOrdenId) e['lote'] = 'Selecciona el lote de OC.';
    if (!pesoRealKg || isNaN(parseFloat(pesoRealKg)) || parseFloat(pesoRealKg) <= 0)
      e['peso'] = 'Peso real obligatorio (Float > 0).';
    if (!articulo.trim()) e['articulo'] = 'Artículo obligatorio.';
    if (!relacionBano || isNaN(parseFloat(relacionBano)) || parseFloat(relacionBano) <= 0)
      e['relacion'] = 'Relación de baño obligatoria (Float > 0).';
    if (!descripcionColor.trim()) e['color'] = 'Descripción del color obligatoria.';
    if (!composicion) e['fibra'] = 'Selecciona la composición de fibra.';

    const colorantesActivos = Object.entries(seleccionados)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (colorantesActivos.length === 0) e['colorantes'] = 'Selecciona al menos un colorante.';
    colorantesActivos.forEach(nombre => {
      const pct = parseFloat(porcentajes[nombre] ?? '');
      if (isNaN(pct) || pct <= 0) e[`pct_${nombre}`] = `Porcentaje inválido para "${nombre}".`;
    });
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validar() || !composicion) return;
    setGuardando(true);
    try {
      const colorantesPayload = Object.entries(seleccionados)
        .filter(([, v]) => v)
        .map(([nombre]) => ({ nombreColorante: nombre, porcentaje: parseFloat(porcentajes[nombre]!) }));

      const resultado = await crearReceta({
        detalleOrdenId:    parseInt(detalleOrdenId),
        pesoRealKg:        parseFloat(pesoRealKg),
        articulo:          articulo.trim(),
        composicionFibra:  composicion,
        relacionBano:      parseFloat(relacionBano),
        descripcionColor:  descripcionColor.trim(),
        observacionesTecnicas: observaciones.trim() || undefined,
        colorantes: colorantesPayload,
      });

      onToast('success', `✅ Receta "${resultado.receta.descripcionColor}" guardada. ${resultado.motorQuimico.totalBanos} baños generados.`);
      onRecetaGuardada(resultado);

      // Limpiar formulario
      setDetalleOrdenId(''); setPesoRealKg(''); setArticulo('');
      setRelacionBano(''); setDescripcionColor(''); setObservaciones('');
      setFibraMain(null); setComposicion(null);
      setSeleccionados({}); setPorcentajes({});
    } catch (err) {
      onToast('error', `❌ ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* ── DATOS FÍSICOS ── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <div className="card-icon">⚗️</div>
          <div>
            <div className="card-title">Parámetros Físicos</div>
            <div className="card-desc">Datos de la pieza a teñir</div>
          </div>
        </div>

        {/* Selector de lote */}
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label" htmlFor="sel-lote">
            Lote de Orden de Compra <span className="required">*</span>
          </label>
          <select
            id="sel-lote" className="form-input form-select"
            value={detalleOrdenId}
            onChange={e => setDetalleOrdenId(e.target.value)}
            style={errores['lote'] ? { borderColor: 'var(--accent-red)' } : {}}
          >
            <option value="">— Selecciona el lote —</option>
            {lotes.map(l => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
          {errores['lote'] && <span style={{ fontSize:'11px', color:'var(--accent-red)' }}>{errores['lote']}</span>}
          {detalleOrdenId && (
            <div className="lote-selector-info">
              Lote #{detalleOrdenId} seleccionado — la receta quedará vinculada a este lote.
            </div>
          )}
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="inp-peso">Peso Real (kg) <span className="required">*</span></label>
            <input id="inp-peso" type="number" step="0.01" min="0.01" className="form-input"
              placeholder="Ej: 2.50" value={pesoRealKg} onChange={e => setPesoRealKg(e.target.value)}
              style={errores['peso'] ? { borderColor:'var(--accent-red)' } : {}} />
            {errores['peso'] && <span style={{ fontSize:'11px', color:'var(--accent-red)' }}>{errores['peso']}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="inp-relacion">Relación de Baño (1:X) <span className="required">*</span></label>
            <input id="inp-relacion" type="number" step="1" min="1" className="form-input"
              placeholder="Ej: 40" value={relacionBano} onChange={e => setRelacionBano(e.target.value)}
              style={errores['relacion'] ? { borderColor:'var(--accent-red)' } : {}} />
            {errores['relacion'] && <span style={{ fontSize:'11px', color:'var(--accent-red)' }}>{errores['relacion']}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="inp-articulo">Artículo <span className="required">*</span></label>
            <input id="inp-articulo" type="text" className="form-input"
              placeholder="Ej: Prenda, Avío, Cierre, Hilo" value={articulo}
              onChange={e => setArticulo(e.target.value)}
              style={errores['articulo'] ? { borderColor:'var(--accent-red)' } : {}} />
            {errores['articulo'] && <span style={{ fontSize:'11px', color:'var(--accent-red)' }}>{errores['articulo']}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="inp-color">Descripción del Color <span className="required">*</span></label>
            <input id="inp-color" type="text" className="form-input"
              placeholder="Ej: Navy Blue, Coral Reef" value={descripcionColor}
              onChange={e => setDescripcionColor(e.target.value)}
              style={errores['color'] ? { borderColor:'var(--accent-red)' } : {}} />
            {errores['color'] && <span style={{ fontSize:'11px', color:'var(--accent-red)' }}>{errores['color']}</span>}
          </div>

          <div className="form-group full-width">
            <label className="form-label" htmlFor="inp-obs">Observaciones Técnicas <span style={{ color:'var(--text-muted)', fontWeight:400 }}>(opcional)</span></label>
            <input id="inp-obs" type="text" className="form-input"
              placeholder='Ej: "Cliente solicita omitir suavizado"' value={observaciones}
              onChange={e => setObservaciones(e.target.value)} />
          </div>
        </div>

        {/* Preview de litros en tiempo real */}
        {pesoRealKg && relacionBano && parseFloat(pesoRealKg) > 0 && parseFloat(relacionBano) > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 14px', background:'rgba(20,184,166,0.05)', border:'1px solid var(--border-accent)', borderRadius:'var(--radius-md)', fontSize:'13px' }}>
            <span>💧</span>
            <span style={{ color:'var(--text-secondary)' }}>Litros por baño:</span>
            <strong style={{ color:'var(--accent-teal)', fontFamily:'var(--font-mono)' }}>
              {(parseFloat(pesoRealKg) * parseFloat(relacionBano)).toFixed(2)} L
            </strong>
            <span style={{ color:'var(--text-muted)', fontSize:'11px' }}>= {pesoRealKg} kg × {relacionBano}</span>
          </div>
        )}
      </div>

      {/* ── FÓRMULA DEL COLOR ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-icon">🎨</div>
          <div>
            <div className="card-title">Fórmula del Color</div>
            <div className="card-desc">Filtra por fibra y selecciona los colorantes compatibles</div>
          </div>
        </div>

        {errores['fibra'] && (
          <div style={{ marginBottom:'16px', padding:'8px 14px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'var(--radius-md)', fontSize:'12px', color:'var(--accent-red)' }}>
            {errores['fibra']}
          </div>
        )}

        {/* Filtros de fibra */}
        <div className="fiber-filter-bar">
          <div className="fiber-filter-label">Composición de Fibra</div>
          <div className="fiber-btns">
            {(['ALGODON','NYLON','POLIESTER'] as FibraMain[]).map(f => (
              <button key={f} type="button"
                className={`fiber-btn ${fibraMain === f && f !== 'MULTIFIBRA' ? 'active' : ''}`}
                onClick={() => { setFibraMain(f); cambiarComposicion(f as ComposicionFibra); }}
              >
                {f === 'ALGODON' ? '🌿 Algodón' : f === 'NYLON' ? '🔵 Nylon' : '🟠 Poliéster'}
              </button>
            ))}
            <button type="button"
              className={`fiber-btn ${fibraMain === 'MULTIFIBRA' ? 'active-purple' : ''}`}
              onClick={() => { setFibraMain('MULTIFIBRA'); setComposicion(null); setSeleccionados({}); setPorcentajes({}); }}
            >
              🔀 Multifibra
            </button>
          </div>

          {/* Sub-menú Multifibra */}
          {fibraMain === 'MULTIFIBRA' && (
            <div className="fiber-submenu">
              {([
                ['MULTIFIBRA_ALGODON_NYLON',     'Alg + Nylon'],
                ['MULTIFIBRA_ALGODON_POLIESTER', 'Alg + Poliéster'],
                ['MULTIFIBRA_NYLON_POLIESTER',   'Nylon + Poliéster'],
              ] as [ComposicionFibra, string][]).map(([val, lbl]) => (
                <button key={val} type="button"
                  className={`fiber-sub-btn ${composicion === val ? 'active' : ''}`}
                  onClick={() => cambiarComposicion(val)}
                >
                  {lbl}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Catálogo de colorantes */}
        {composicion && catalogoActivo.length > 0 && (
          <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
              <span style={{ fontSize:'12px', color:'var(--text-muted)' }}>
                {Object.values(seleccionados).filter(Boolean).length} colorante(s) seleccionado(s)
              </span>
              {intensidad.suma > 0 && (
                <span className={`intensidad-chip ${getNivelClase(intensidad.nivel)}`}>
                  Nivel {intensidad.nivel} — {intensidad.desc} ({intensidad.suma.toFixed(4)}%)
                </span>
              )}
            </div>

            <div className="colorantes-catalogo">
              {catalogoActivo.map(c => (
                <div
                  key={c.nombre}
                  className={`colorante-item ${seleccionados[c.nombre] ? 'checked' : ''}`}
                  onClick={() => toggleColorante(c.nombre)}
                >
                  <input type="checkbox" className="colorante-checkbox"
                    checked={!!seleccionados[c.nombre]}
                    onChange={() => toggleColorante(c.nombre)}
                    onClick={e => e.stopPropagation()}
                    id={`chk-${c.nombre}`}
                  />
                  <label className="colorante-nombre" htmlFor={`chk-${c.nombre}`} onClick={e => e.stopPropagation()}>
                    {c.nombre}
                  </label>
                  {c.etiqueta && (
                    <span className={`colorante-etiqueta ${c.etiqueta}`}>
                      {c.etiqueta === 'algodon' ? 'Algodón' : c.etiqueta === 'nylon' ? 'Nylon' : 'Poliéster'}
                    </span>
                  )}
                  {seleccionados[c.nombre] && (
                    <>
                      <input
                        type="number" step="0.0001" min="0.0001"
                        className="colorante-porcentaje-input"
                        placeholder="0.0000"
                        value={porcentajes[c.nombre] ?? ''}
                        onChange={e => { e.stopPropagation(); setPorcentajes(p => ({ ...p, [c.nombre]: e.target.value })); }}
                        onClick={e => e.stopPropagation()}
                        aria-label={`Porcentaje de ${c.nombre}`}
                      />
                      <span className="colorante-porcentaje-label">%</span>
                    </>
                  )}
                </div>
              ))}
            </div>

            {errores['colorantes'] && (
              <div style={{ marginTop:'8px', fontSize:'11px', color:'var(--accent-red)' }}>{errores['colorantes']}</div>
            )}
          </>
        )}

        {!composicion && (
          <div style={{ textAlign:'center', padding:'32px', color:'var(--text-muted)', fontSize:'14px' }}>
            👆 Selecciona la composición de fibra para ver el catálogo de colorantes compatibles
          </div>
        )}

        {/* Acciones */}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary"
            onClick={() => {
              setDetalleOrdenId(''); setPesoRealKg(''); setArticulo('');
              setRelacionBano(''); setDescripcionColor(''); setObservaciones('');
              setFibraMain(null); setComposicion(null);
              setSeleccionados({}); setPorcentajes({});
              setErrores({});
            }} disabled={guardando}>
            🗑 Limpiar
          </button>
          <button id="btn-guardar-receta" type="submit" className="btn btn-guardar"
            disabled={guardando} style={{ width:'auto', minWidth:'260px' }}>
            {guardando ? <><div className="spinner" /> Procesando motor químico...</> : '🧪 Guardar Receta y Generar Baños'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default FormularioReceta;
