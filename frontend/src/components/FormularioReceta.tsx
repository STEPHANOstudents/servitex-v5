// =============================================================================
// SERVITEX — Formulario de Receta Técnica (Módulo Lab)
// v3.0 — Usa catálogos de la API: articuloId, composicionFibraCodigo, coloranteId
// =============================================================================
import React, { useState, useCallback, useEffect } from 'react';
import type { RecetaConMotor, RecetaPreload } from '../types/recetas';
import { getNivelClase } from '../types/recetas';
import { crearReceta } from '../services/recetasApi';
import { obtenerOrdenes } from '../services/api';
import { fetchCatalogos } from '../services/catalogosApi';
import type {
  Catalogos, ArticuloTextil, ComposicionFibra, ColoranteCatalogo,
} from '../services/catalogosApi';
import type { OrdenCompraDB } from '../types/ordenes';

interface LoteOpcion {
  id: number;
  label: string;
}

interface FormularioRecetaProps {
  preload?: RecetaPreload | null;
  onRecetaGuardada: (resultado: RecetaConMotor) => void;
  onToast: (tipo: 'success' | 'error', msg: string) => void;
}

function calcIntensidad(pcts: Map<number, string>, sel: Set<number>) {
  let suma = 0;
  sel.forEach(id => {
    const v = parseFloat(pcts.get(id) ?? '');
    if (!isNaN(v)) suma += v;
  });
  const s = Math.round(suma * 10000) / 10000;
  if (s <= 0.01) return { suma: s, nivel: 1, desc: 'Pasteles' };
  if (s <= 0.1)  return { suma: s, nivel: 2, desc: 'Claros' };
  if (s <= 1.0)  return { suma: s, nivel: 3, desc: 'Intermedios' };
  return           { suma: s, nivel: 4, desc: 'Intensos' };
}

const FormularioReceta: React.FC<FormularioRecetaProps> = ({
  preload, onRecetaGuardada, onToast,
}) => {
  // ── Catálogos ──
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [lotes, setLotes] = useState<LoteOpcion[]>([]);
  const [busquedaColorante, setBusquedaColorante] = useState('');

  // ── Datos físicos ──
  const [detalleOrdenId, setDetalleOrdenId] = useState('');
  const [pesoRealKg, setPesoRealKg]         = useState('');
  const [articuloId, setArticuloId]         = useState('');
  const [relacionBano, setRelacionBano]     = useState('');
  const [descripcionColor, setDescripcionColor] = useState('');
  const [observaciones, setObservaciones]   = useState('');
  const [composicionFibraCodigo, setComposicionFibraCodigo] = useState('');

  // ── Colorantes seleccionados ──
  // Set de IDs seleccionados + Map de porcentajes
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [porcentajes, setPorcentajes]     = useState<Map<number, string>>(new Map());

  // ── UI ──
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores]     = useState<Record<string, string>>({});

  // ── Cargar catálogos + lotes al montar ──
  useEffect(() => {
    fetchCatalogos().then(setCatalogos).catch(() => {});

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
    setArticuloId(String(preload.articuloId));
    setRelacionBano(preload.relacionBano);
    setDescripcionColor(preload.descripcionColor);
    setObservaciones(preload.observacionesTecnicas);
    setComposicionFibraCodigo(preload.composicionFibra);
    setDetalleOrdenId('');

    const sel = new Set<number>();
    const pct = new Map<number, string>();
    for (const c of preload.colorantes) {
      sel.add(c.coloranteId);
      pct.set(c.coloranteId, c.porcentaje);
    }
    setSeleccionados(sel);
    setPorcentajes(pct);
  }, [preload]);

  // Cuando cambia la composición, limpiar colorantes si no hay preload
  const cambiarComposicion = useCallback((codigo: string) => {
    setComposicionFibraCodigo(codigo);
    if (!preload) {
      setSeleccionados(new Set());
      setPorcentajes(new Map());
    }
  }, [preload]);

  // Toggle de colorante
  const toggleColorante = useCallback((id: number) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setPorcentajes(p => { const n = new Map(p); n.delete(id); return n; });
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const setPorcentaje = useCallback((id: number, valor: string) => {
    setPorcentajes(prev => new Map(prev).set(id, valor));
  }, []);

  const intensidad = calcIntensidad(porcentajes, seleccionados);

  // ── Validar ──
  function validar(): boolean {
    const e: Record<string, string> = {};
    if (!detalleOrdenId)             e['lote']     = 'Selecciona el lote de OC.';
    if (!pesoRealKg || parseFloat(pesoRealKg) <= 0) e['peso'] = 'Peso real obligatorio (Float > 0).';
    if (!articuloId)                 e['articulo']  = 'Selecciona el artículo.';
    if (!composicionFibraCodigo)     e['fibra']     = 'Selecciona la composición de fibra.';
    if (!relacionBano || parseFloat(relacionBano) <= 0) e['relacion'] = 'Relación de baño obligatoria.';
    if (!descripcionColor.trim())    e['color']     = 'Descripción del color obligatoria.';
    if (seleccionados.size === 0)    e['colorantes']= 'Selecciona al menos un colorante.';
    seleccionados.forEach(id => {
      const pct = parseFloat(porcentajes.get(id) ?? '');
      if (isNaN(pct) || pct <= 0) e[`pct_${id}`] = 'Porcentaje inválido.';
    });
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;
    setGuardando(true);
    try {
      const colorantesPayload = [...seleccionados].map(id => ({
        coloranteId: id,
        porcentaje: parseFloat(porcentajes.get(id) ?? '0'),
      }));

      const resultado = await crearReceta({
        detalleOrdenId:          parseInt(detalleOrdenId),
        pesoRealKg:              parseFloat(pesoRealKg),
        articuloId:              parseInt(articuloId),
        composicionFibraCodigo,
        relacionBano:            parseFloat(relacionBano),
        descripcionColor:        descripcionColor.trim(),
        observacionesTecnicas:   observaciones.trim() || undefined,
        colorantes:              colorantesPayload,
      });

      onToast('success', `✅ Receta "${resultado.receta.descripcionColor}" guardada. ${resultado.motorQuimico.totalBanos} baños generados.`);
      onRecetaGuardada(resultado);

      // Limpiar formulario
      setDetalleOrdenId(''); setPesoRealKg(''); setArticuloId('');
      setRelacionBano(''); setDescripcionColor(''); setObservaciones('');
      setComposicionFibraCodigo('');
      setSeleccionados(new Set()); setPorcentajes(new Map());
    } catch (err) {
      onToast('error', `❌ ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setGuardando(false);
    }
  }

  // Colorantes filtrados por búsqueda
  const colorantesFiltrados = (catalogos?.colorantesCatalogo ?? []).filter(c =>
    c.nombre.toLowerCase().includes(busquedaColorante.toLowerCase())
  );

  const nivelClase = getNivelClase(intensidad.nivel);

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
            <label className="form-label" htmlFor="sel-articulo">Artículo <span className="required">*</span></label>
            <select id="sel-articulo" className="form-input form-select"
              value={articuloId} onChange={e => setArticuloId(e.target.value)}
              style={errores['articulo'] ? { borderColor:'var(--accent-red)' } : {}}
            >
              <option value="">— Selecciona —</option>
              {(catalogos?.articulosTextiles ?? []).map((a: ArticuloTextil) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
            {errores['articulo'] && <span style={{ fontSize:'11px', color:'var(--accent-red)' }}>{errores['articulo']}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="inp-color">Color a reproducir <span className="required">*</span></label>
            <input id="inp-color" type="text" className="form-input"
              placeholder="Ej: Navy Blue" value={descripcionColor} onChange={e => setDescripcionColor(e.target.value)}
              style={errores['color'] ? { borderColor:'var(--accent-red)' } : {}} />
            {errores['color'] && <span style={{ fontSize:'11px', color:'var(--accent-red)' }}>{errores['color']}</span>}
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '12px' }}>
          <label className="form-label" htmlFor="txt-obs">Observaciones técnicas</label>
          <textarea id="txt-obs" className="form-input form-textarea"
            placeholder="Notas del proceso de teñido..." rows={2}
            value={observaciones} onChange={e => setObservaciones(e.target.value)} />
        </div>
      </div>

      {/* ── COMPOSICIÓN DE FIBRA ── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <div className="card-icon">🧵</div>
          <div>
            <div className="card-title">Composición de Fibra</div>
            <div className="card-desc">Determina la ruta del Motor Químico</div>
          </div>
        </div>

        <div className="fibra-grid">
          {(catalogos?.composicionesFibra ?? []).map((f: ComposicionFibra) => (
            <button
              key={f.id}
              type="button"
              className={`fibra-btn ${composicionFibraCodigo === f.codigo ? 'active' : ''}`}
              onClick={() => cambiarComposicion(f.codigo)}
            >
              <span className="fibra-btn-icon">
                {f.codigo === 'ALGODON' ? '🌿' :
                 f.codigo === 'NYLON' ? '🔵' :
                 f.codigo === 'POLIESTER' ? '🟠' : '🔀'}
              </span>
              <span className="fibra-btn-label">{f.etiqueta}</span>
              <span className="fibra-btn-banos">{f.totalBanos} baños</span>
            </button>
          ))}
        </div>

        {errores['fibra'] && (
          <div style={{ fontSize:'12px', color:'var(--accent-red)', marginTop:'8px' }}>{errores['fibra']}</div>
        )}

        {composicionFibraCodigo && catalogos && (
          <div className="fibra-info-box">
            {catalogos.composicionesFibra.find(f => f.codigo === composicionFibraCodigo)?.descripcionRuta
              ?? composicionFibraCodigo}
          </div>
        )}
      </div>

      {/* ── COLORANTES ── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <div className="card-icon">🎨</div>
          <div>
            <div className="card-title">Fórmula de Colorantes</div>
            <div className="card-desc">Selecciona e ingresa el % de cada colorante</div>
          </div>
          {/* Chip de intensidad en tiempo real */}
          {seleccionados.size > 0 && (
            <div className={`intensidad-chip ${nivelClase}`}>
              Σ {intensidad.suma.toFixed(4)}% — <strong>Nivel {intensidad.nivel}</strong> {intensidad.desc}
            </div>
          )}
        </div>

        {/* Buscador */}
        <div className="form-group" style={{ marginBottom: '12px' }}>
          <input type="text" className="form-input"
            placeholder="🔍 Buscar colorante..."
            value={busquedaColorante}
            onChange={e => setBusquedaColorante(e.target.value)}
          />
        </div>

        {errores['colorantes'] && (
          <div style={{ fontSize:'12px', color:'var(--accent-red)', marginBottom:'8px' }}>{errores['colorantes']}</div>
        )}

        {/* Lista de colorantes */}
        <div className="colorantes-grid">
          {colorantesFiltrados.map((c: ColoranteCatalogo) => {
            const activo = seleccionados.has(c.id);
            return (
              <div key={c.id}
                className={`colorante-fila ${activo ? 'activo' : ''}`}
                onClick={() => toggleColorante(c.id)}
              >
                <div className="colorante-check">
                  <input
                    id={`chk-col-${c.id}`}
                    type="checkbox"
                    checked={activo}
                    onChange={() => toggleColorante(c.id)}
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                <label className="colorante-nombre" htmlFor={`chk-col-${c.id}`}>
                  {c.nombre}
                </label>
                {activo && (
                  <div className="colorante-pct" onClick={e => e.stopPropagation()}>
                    <input
                      id={`pct-col-${c.id}`}
                      type="number"
                      className={`pct-input ${errores[`pct_${c.id}`] ? 'error' : ''}`}
                      placeholder="%"
                      step="0.01"
                      min="0.001"
                      value={porcentajes.get(c.id) ?? ''}
                      onChange={e => setPorcentaje(c.id, e.target.value)}
                    />
                    <span className="pct-unit">%</span>
                  </div>
                )}
              </div>
            );
          })}
          {colorantesFiltrados.length === 0 && (
            <div style={{ color:'var(--text-muted)', fontSize:'13px', padding:'12px', textAlign:'center' }}>
              No se encontraron colorantes con ese nombre.
            </div>
          )}
        </div>

        {seleccionados.size > 0 && (
          <div className="colorantes-resumen">
            {[...seleccionados].map(id => {
              const nombre = catalogos?.colorantesCatalogo.find(c => c.id === id)?.nombre ?? `ID:${id}`;
              return (
                <span key={id} className="colorante-tag">
                  {nombre}: {porcentajes.get(id) ?? '?'}%
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* ── BOTÓN SUBMIT ── */}
      <div className="form-actions">
        <button
          id="btn-guardar-receta"
          type="submit"
          className="btn btn-primary btn-xl"
          disabled={guardando}
        >
          {guardando ? '⏳ Procesando...' : '🧪 Guardar Receta y Generar Motor Químico'}
        </button>
      </div>

    </form>
  );
};

export default FormularioReceta;
