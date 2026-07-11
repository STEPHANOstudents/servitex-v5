// =============================================================================
// SERVITEX — Modal Detalle Receta (Cartilla Expandida)
// Muestra: parámetros, fórmula de color, trazabilidad de ajustes, desglose de
// baños y resumen. Incluye botón "Copiar como base para nueva receta".
// =============================================================================
import React, { useEffect, useState, useRef } from 'react';
import type { RecetaConMotor, BanoQuimico, RecetaPreload } from '../types/recetas';
import { getFibraLabel, getNivelClase, formatearGramos } from '../types/recetas';
import { analizarColor, guardarColor } from '../services/recetasApi';
import { fetchCatalogos } from '../services/catalogosApi';
import type { Catalogos } from '../services/catalogosApi';

// ---------------------------------------------------------------------------
// Helpers de clasificación de colorante (heurística de nombre + catálogo)
// ---------------------------------------------------------------------------
function getColoranteTipo(
  coloranteId: number,
  nombreColorante: string,
  catalogos: Catalogos | null
): 'REACTIVO' | 'ACIDO' | 'DISPERSO' {
  if (catalogos?.colorantesCatalogo) {
    const found = catalogos.colorantesCatalogo.find(c => c.id === coloranteId);
    if (found) return found.tipoColorante;
  }
  const n = nombreColorante.toLowerCase();
  const esAcido    = n.includes('ácido') || n.includes('acido') || n.includes('acid') || n.includes('nylon') || n.includes('lanasol') || n.includes('erionyl');
  const esDisperso = n.includes('dispers') || n.includes('dianix') || n.includes('poliéster') || n.includes('poliester');
  if (n.includes('ramazol') || n.includes('reactive') || n.includes('reactivo') || n.includes('black b') || n.includes('yellow') || n.includes('blue') || n.includes('red')) {
    if (esAcido)    return 'ACIDO';
    if (esDisperso) return 'DISPERSO';
    return 'REACTIVO';
  }
  if (esAcido)    return 'ACIDO';
  if (esDisperso) return 'DISPERSO';
  return 'REACTIVO';
}

/** Agrupa productos de todos los baños sumando sus gramos por nombre. */
function calcularResumenConsolidado(secuencia: BanoQuimico[]) {
  const map = new Map<string, number>();
  for (const bano of secuencia)
    for (const p of bano.productos)
      if (p.gramos !== 0 && !p.nombre.includes('ver detalle'))
        map.set(p.nombre, (map.get(p.nombre) ?? 0) + p.gramos);
  return Array.from(map.entries()).map(([nombre, total]) => ({ nombre, total }));
}

// ---------------------------------------------------------------------------
// Constantes de estilo reutilizadas
// ---------------------------------------------------------------------------
const STY_COLOR_BOX: React.CSSProperties = { width:'120px', height:'120px', borderRadius:'var(--radius-md)', border:'1px solid var(--border-subtle)', boxShadow:'var(--shadow-sm)' };
const STY_MONO_BADGE: React.CSSProperties = { fontFamily:'var(--font-mono)', fontSize:'14px', background:'var(--bg-glass)', padding:'2px 6px', borderRadius:'4px', border:'1px solid var(--border-subtle)' };
const STY_LABEL_MUTED: React.CSSProperties = { fontSize:'12px', color:'var(--text-muted)', marginBottom:'6px' };

// ---------------------------------------------------------------------------
// Sub-componente: chip de un colorante (reutilizado en trazabilidad)
// ---------------------------------------------------------------------------
interface ChipColoranteProps { col: any }
const ChipColorante: React.FC<ChipColoranteProps> = ({ col }) => (
  <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', backgroundColor:'#ffffff', border:'1px solid var(--border-subtle)', padding:'4px 10px', borderRadius:'6px', fontSize:'12px', color:'var(--text-primary)', boxShadow:'0 1px 2px rgba(15,23,42,0.03)' }}>
    <span style={{ color:'var(--text-secondary)' }}>🎨 {col.nombreColorante}</span>
    <strong style={{ color:'var(--accent-teal)' }}>{col.porcentaje.toFixed(4)}%</strong>
    <span style={{ color:'var(--accent-teal)', fontSize:'11px' }}>({formatearGramos(col.gramos)})</span>
  </div>
);

// ---------------------------------------------------------------------------
// Sub-componente: grupo de chips para una sección de multifibra en iteraciones
// ---------------------------------------------------------------------------
interface GrupoIterProps { label: string; lista: any[] }
const GrupoIter: React.FC<GrupoIterProps> = ({ label, lista }) => {
  if (lista.length === 0) return null;
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', alignItems:'center' }}>
      <span style={{ fontSize:'12px', fontWeight:600, color:'var(--text-muted)', marginRight:'4px' }}>[ {label}: ]</span>
      {lista.map((col, i) => <ChipColorante key={i} col={col} />)}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tipos e interfaces del componente principal
// ---------------------------------------------------------------------------
interface ModalDetalleRecetaProps {
  data: RecetaConMotor;
  onCerrar: () => void;
  onCopiarBase: (preload: RecetaPreload) => void;
  onActualizarReceta?: (recetaActualizada: RecetaConMotor) => void;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day:'2-digit', month:'long', year:'numeric' });
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================
const ModalDetalleReceta: React.FC<ModalDetalleRecetaProps> = ({
  data, onCerrar, onCopiarBase, onActualizarReceta,
}) => {
  const { receta, motorQuimico } = data;

  const [activeTab, setActiveTab]   = useState<'procedimiento' | 'color' | 'costos'>('procedimiento');
  const [catalogos, setCatalogos]   = useState<Catalogos | null>(null);
  const [stream, setStream]         = useState<MediaStream | null>(null);
  const [showVideo, setShowVideo]   = useState(false);
  const [loadedImageUrl, setLoadedImageUrl]   = useState<string | null>(null);
  const [loadedImageFile, setLoadedImageFile] = useState<File | null>(null);
  const [margenObjetivo, setMargenObjetivo]   = useState(40);
  const [precioVentaTest, setPrecioVentaTest] = useState(100);

  // Sincronizar precio sugerido inicial en el simulador
  useEffect(() => {
    if (receta.costoTotal) {
      setPrecioVentaTest(Math.round(receta.costoTotal * 1.5 * 10) / 10);
    }
  }, [receta.costoTotal]);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX]   = useState(0);
  const [startY, setStartY]   = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [analizing, setAnalizing]     = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    colorHex: string; colorRgb: { r:number; g:number; b:number }; miniaturaBase64: string;
  } | null>(null);
  const [forceCapture, setForceCapture] = useState(false);

  const videoRef      = useRef<HTMLVideoElement | null>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef      = useRef<HTMLImageElement | null>(null);
  const fileInputRef  = useRef<HTMLInputElement | null>(null);
  const containerRef  = useRef<HTMLDivElement | null>(null);

  const showCaptureWorkspace = !receta.colorHex || forceCapture;
  const secuencia   = receta.secuenciaBanos || motorQuimico.secuencia || [];
  const resumen     = calcularResumenConsolidado(secuencia);
  const totalAgua   = Math.round(secuencia.length * receta.litrosAgua * 100) / 100;
  const iteraciones = Array.isArray(receta.iteraciones) ? receta.iteraciones : [];

  // Cerrar con ESC + bloquear scroll del body
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', fn);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', fn); document.body.style.overflow = ''; };
  }, [onCerrar]);

  // Liberar la cámara al desmontar
  useEffect(() => () => { stream?.getTracks().forEach(t => t.stop()); }, [stream]);

  // Apagar cámara al salir de la pestaña color
  useEffect(() => {
    if (activeTab !== 'color' && stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null); setShowVideo(false);
    }
  }, [activeTab, stream]);

  // ── Construir objeto preload para duplicar receta ──
  function handleCopiarBase() {
    onCopiarBase({
      pesoRealKg: String(receta.pesoRealKg), articulo: receta.articulo, articuloId: receta.articuloId,
      composicionFibra: receta.composicionFibra, relacionBano: String(receta.relacionBano),
      descripcionColor: receta.descripcionColor, observacionesTecnicas: receta.observacionesTecnicas ?? '',
      colorantes: receta.colorantes.map(c => ({ nombre:c.nombreColorante, coloranteId:c.coloranteId, porcentaje:String(c.porcentaje) })),
    });
  }

  // ── Drag sobre imagen para seleccionar área de análisis ──
  const handleDragStart = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    setIsDragging(true);
    setStartX(clientX - r.left);   setStartY(clientY - r.top);
    setCurrentX(clientX - r.left); setCurrentY(clientY - r.top);
  };
  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    setCurrentX(Math.max(0, Math.min(r.width,  clientX - r.left)));
    setCurrentY(Math.max(0, Math.min(r.height, clientY - r.top)));
  };
  const handleDragEnd = () => setIsDragging(false);

  const onMouseDown  = (e: React.MouseEvent)  => { if (e.button === 0) handleDragStart(e.clientX, e.clientY); };
  const onMouseMove  = (e: React.MouseEvent)  => handleDragMove(e.clientX, e.clientY);
  const onMouseUp    = ()                      => handleDragEnd();
  const onTouchStart = (e: React.TouchEvent)  => { if (e.touches.length > 0) handleDragStart(e.touches[0].clientX, e.touches[0].clientY); };
  const onTouchMove  = (e: React.TouchEvent)  => { if (e.touches.length > 0) handleDragMove(e.touches[0].clientX, e.touches[0].clientY); };
  const onTouchEnd   = ()                      => handleDragEnd();

  // Rectángulo de selección sobre la imagen
  const leftVal   = Math.min(startX, currentX);
  const topVal    = Math.min(startY, currentY);
  const widthVal  = Math.abs(startX - currentX);
  const heightVal = Math.abs(startY - currentY);
  const selectionStyle: React.CSSProperties = {
    position:'absolute', border:'2px dashed var(--accent-teal)', backgroundColor:'rgba(13,148,136,0.12)',
    left:`${leftVal}px`, top:`${topVal}px`, width:`${widthVal}px`, height:`${heightVal}px`,
    pointerEvents:'none', boxSizing:'border-box', borderRadius:'2px',
  };

  // ── Analizar zona seleccionada ──
  const handleAnalizar = async () => {
    if (!loadedImageFile || !imageRef.current || !containerRef.current) return;
    setAnalizing(true);
    try {
      const img = imageRef.current;
      const scaleX = img.naturalWidth  / img.width;
      const scaleY = img.naturalHeight / img.height;
      const result = await analizarColor(
        loadedImageFile,
        Math.round(leftVal * scaleX), Math.round(topVal * scaleY),
        Math.round(widthVal * scaleX), Math.round(heightVal * scaleY)
      );
      setAnalysisResult(result);
    } catch (err: any) { alert(err.message ?? 'Error al analizar el color.'); }
    finally { setAnalizing(false); }
  };

  // ── Guardar color analizado en la receta ──
  const handleGuardarColor = async () => {
    if (!analysisResult) return;
    try {
      const updated = await guardarColor(receta.id, {
        colorHex: analysisResult.colorHex, colorRgb: analysisResult.colorRgb,
        colorMiniatura: analysisResult.miniaturaBase64,
      });
      onActualizarReceta?.(updated);
      setForceCapture(false); setLoadedImageUrl(null); setLoadedImageFile(null); setAnalysisResult(null);
    } catch (err: any) { alert(err.message ?? 'Error al guardar el color.'); }
  };

  // ── Helper: renderizar fila de colorante en la tabla de fórmula ──
  const renderFormulaColorante = (c: any, i: number, paddingLeft = '0px') => {
    const gramos = receta.pesoRealKg * 1000 * (c.porcentaje / 100);
    return (
      <div className="formula-item" key={i} style={paddingLeft !== '0px' ? { paddingLeft } : {}}>
        <span className="formula-colorante-nombre">{c.nombreColorante}</span>
        <span className="formula-porcentaje">
          {c.porcentaje.toFixed(4)}%{' '}
          <span style={{ color:'var(--accent-teal)', fontWeight:500, marginLeft:'6px' }}>
            ({formatearGramos(gramos)})
          </span>
        </span>
      </div>
    );
  };

  // ── Helper: sección separadora de colorantes en multifibra ──
  const renderSeparadorFormula = (label: string) => (
    <div style={{ fontSize:'11px', color:'var(--text-muted)', borderBottom:'1px solid var(--border-subtle)', paddingBottom:'4px', marginBottom:'8px', marginTop:'12px' }}>
      ── {label} ──
    </div>
  );

  // ── Renderizado de la pestaña COLOR ──
  const renderTabColor = () => (
    <div style={{ padding:'0 24px 24px 24px' }}>
      {!showCaptureWorkspace ? (
        /* Color ya guardado */
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
          <h3 style={{ fontSize:'15px', fontWeight:600, color:'var(--text-primary)' }}>Color de Referencia Guardado</h3>
          <div style={{ display:'flex', gap:'24px', alignItems:'center', flexWrap:'wrap' }}>
            <div>
              <div style={STY_LABEL_MUTED}>Miniatura de zona original</div>
              {receta.colorMiniatura
                ? <img src={receta.colorMiniatura} alt="Miniatura recortada" style={{ ...STY_COLOR_BOX, objectFit:'cover' }} />
                : <div style={{ ...STY_COLOR_BOX, backgroundColor:'var(--bg-base)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', color:'var(--text-muted)', border:'1px dashed var(--border-subtle)' }}>Sin imagen</div>
              }
            </div>
            <div>
              <div style={STY_LABEL_MUTED}>Bloque de color sólido</div>
              <div style={{ ...STY_COLOR_BOX, backgroundColor: receta.colorHex || '#cccccc' }} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <div><span style={{ fontSize:'12px', color:'var(--text-muted)' }}>HEX: </span><strong style={STY_MONO_BADGE}>{receta.colorHex}</strong></div>
              <div><span style={{ fontSize:'12px', color:'var(--text-muted)' }}>RGB: </span>
                <strong style={STY_MONO_BADGE}>
                  {receta.colorRgb ? `R: ${receta.colorRgb.r}, G: ${receta.colorRgb.g}, B: ${receta.colorRgb.b}` : 'N/A'}
                </strong>
              </div>
            </div>
          </div>
          <div style={{ marginTop:'10px' }}>
            <button type="button" className="btn btn-primary" style={{ display:'inline-flex', alignItems:'center', gap:'6px' }}
              onClick={() => { setForceCapture(true); setAnalysisResult(null); }}>
              🔄 Actualizar color
            </button>
          </div>
        </div>
      ) : (
        /* Workspace de captura */
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

          {/* Paso 1: elegir fuente de imagen */}
          {!loadedImageUrl && !showVideo && (
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <div style={{ padding:'12px 16px', backgroundColor:'var(--accent-teal-bg)', color:'var(--accent-teal-dim)', borderRadius:'var(--radius-md)', fontSize:'13px', borderLeft:'4px solid var(--accent-teal)' }}>
                💡 <strong>Nota:</strong> Para mejor resultado, fotografía la muestra bajo luz natural o luz blanca.
              </div>
              <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                <button type="button" className="btn btn-primary" style={{ display:'inline-flex', alignItems:'center', gap:'8px' }}
                  onClick={async () => {
                    try {
                      const str = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' } });
                      setStream(str); setShowVideo(true);
                      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = str; videoRef.current.play(); } }, 100);
                    } catch { alert('No se pudo acceder a la cámara. Por favor selecciona una imagen.'); }
                  }}>
                  📷 Tomar foto
                </button>
                <button type="button" className="btn btn-secondary" style={{ display:'inline-flex', alignItems:'center', gap:'8px' }}
                  onClick={() => fileInputRef.current?.click()}>
                  🖼️ Seleccionar imagen
                </button>
                <input type="file" ref={fileInputRef} style={{ display:'none' }} accept="image/*"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setLoadedImageFile(f); setLoadedImageUrl(URL.createObjectURL(f)); setAnalysisResult(null); } }} />
              </div>
              {receta.colorHex && (
                <div style={{ marginTop:'10px' }}>
                  <button type="button" className="btn btn-ghost-teal" onClick={() => setForceCapture(false)}>
                    Volver al color guardado
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Paso 2: vista de cámara */}
          {showVideo && (
            <div style={{ display:'flex', flexDirection:'column', gap:'12px', alignItems:'center' }}>
              <div style={{ position:'relative', width:'100%', maxWidth:'400px', background:'#000', borderRadius:'var(--radius-md)', overflow:'hidden', aspectRatio:'4/3' }}>
                <video ref={videoRef} style={{ width:'100%', height:'100%', objectFit:'cover' }} playsInline muted />
              </div>
              <canvas ref={videoCanvasRef} style={{ display:'none' }} />
              <div style={{ display:'flex', gap:'12px' }}>
                <button type="button" className="btn btn-primary"
                  onClick={() => {
                    if (!videoRef.current || !videoCanvasRef.current) return;
                    const v = videoRef.current; const c = videoCanvasRef.current;
                    c.width = v.videoWidth || 640; c.height = v.videoHeight || 480;
                    const ctx = c.getContext('2d');
                    if (ctx) {
                      ctx.drawImage(v, 0, 0, c.width, c.height);
                      c.toBlob(blob => {
                        if (blob) {
                          const file = new File([blob], 'foto_muestra.jpg', { type:'image/jpeg' });
                          setLoadedImageFile(file); setLoadedImageUrl(URL.createObjectURL(blob)); setAnalysisResult(null);
                          stream?.getTracks().forEach(t => t.stop()); setStream(null); setShowVideo(false);
                        }
                      }, 'image/jpeg', 0.95);
                    }
                  }}>📸 Capturar Foto</button>
                <button type="button" className="btn btn-secondary"
                  onClick={() => { stream?.getTracks().forEach(t => t.stop()); setStream(null); setShowVideo(false); }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Paso 3: imagen cargada — arrastrar para seleccionar zona */}
          {loadedImageUrl && !analysisResult && (
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <div style={{ fontSize:'13px', color:'var(--text-secondary)' }}>
                Arrastra el mouse o el dedo sobre la imagen para seleccionar la zona de tela a analizar:
              </div>
              <div ref={containerRef}
                style={{ position:'relative', display:'inline-block', maxWidth:'100%', maxHeight:'400px', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-md)', overflow:'hidden', userSelect:'none', cursor:'crosshair', touchAction:'none' }}
                onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
                onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
                <img ref={imageRef} src={loadedImageUrl} alt="Muestra"
                  style={{ display:'block', maxWidth:'100%', maxHeight:'400px', pointerEvents:'none' }}
                  onLoad={() => setTimeout(() => {
                    if (containerRef.current) {
                      const r = containerRef.current.getBoundingClientRect();
                      const cx = r.width/2; const cy = r.height/2;
                      setStartX(cx-30); setStartY(cy-30); setCurrentX(cx+30); setCurrentY(cy+30);
                    }
                  }, 100)} />
                <div style={selectionStyle} />
              </div>
              <div style={{ display:'flex', gap:'12px' }}>
                <button type="button" className="btn btn-primary" onClick={handleAnalizar} disabled={analizing}>
                  {analizing ? 'Analizando...' : 'Analizar zona seleccionada'}
                </button>
                <button type="button" className="btn btn-secondary"
                  onClick={() => { setLoadedImageUrl(null); setLoadedImageFile(null); setAnalysisResult(null); }}>
                  Cambiar Imagen
                </button>
              </div>
            </div>
          )}

          {/* Paso 4: resultado del análisis */}
          {analysisResult && (
            <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
              <h4 style={{ fontSize:'14px', fontWeight:600, color:'var(--text-primary)' }}>Resultado del Análisis</h4>
              <div style={{ display:'flex', gap:'24px', alignItems:'center', flexWrap:'wrap' }}>
                <div>
                  <div style={STY_LABEL_MUTED}>Zona recortada</div>
                  <img src={analysisResult.miniaturaBase64} alt="Miniatura" style={{ ...STY_COLOR_BOX, objectFit:'cover' }} />
                </div>
                <div>
                  <div style={STY_LABEL_MUTED}>Color calculado</div>
                  <div style={{ ...STY_COLOR_BOX, backgroundColor:analysisResult.colorHex }} />
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  <div><span style={{ fontSize:'12px', color:'var(--text-muted)' }}>HEX: </span><strong style={STY_MONO_BADGE}>{analysisResult.colorHex}</strong></div>
                  <div><span style={{ fontSize:'12px', color:'var(--text-muted)' }}>RGB: </span><strong style={STY_MONO_BADGE}>R: {analysisResult.colorRgb.r}, G: {analysisResult.colorRgb.g}, B: {analysisResult.colorRgb.b}</strong></div>
                </div>
              </div>
              <div style={{ display:'flex', gap:'12px' }}>
                <button type="button" className="btn btn-primary" onClick={handleGuardarColor}>✅ Guardar color en receta</button>
                <button type="button" className="btn btn-secondary" onClick={() => setAnalysisResult(null)}>🔄 Volver a capturar</button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );

  // ==========================================================================
  // RENDER PRINCIPAL
  // ==========================================================================
  useEffect(() => {
    fetchCatalogos().then(setCatalogos).catch(() => {});
  }, []);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}
      role="dialog" aria-modal="true" aria-labelledby="modal-receta-titulo">
      <div className="modal-receta-panel">
        <div className="modal-receta-topbar" />

        {/* ── HEADER ── */}
        <div className="modal-header" style={{ paddingBottom: receta.estado === 'APROBADO' ? '8px' : '20px' }}>
          <div className="modal-header-info">
            <h2 className="modal-title" id="modal-receta-titulo">{receta.descripcionColor}</h2>
            <div className="modal-subtitle">
              {getFibraLabel(receta.composicionFibra)} · {receta.articulo} · {formatFecha(receta.createdAt)}
            </div>
          </div>
          <button id="btn-cerrar-modal-receta" className="modal-close" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </div>

        {/* ── PESTAÑAS (siempre visibles) ── */}
        <div style={{ display:'flex', gap:'4px', padding:'0 24px', borderBottom:'1px solid var(--border-subtle)', marginBottom:'20px' }}>
          {(['procedimiento', 'color', 'costos'] as const).map(tab => {
            if (tab === 'color' && receta.estado !== 'APROBADO') return null;
            if (tab === 'costos' && !receta.detalleOrdenId) return null;
            return (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                style={{ padding:'12px 20px', border:'none', background:'transparent', fontSize:'14px', cursor:'pointer', transition:'all 0.2s ease', outline:'none',
                  fontWeight: activeTab === tab ? '600' : '500',
                  color: activeTab === tab ? 'var(--accent-teal)' : 'var(--text-secondary)',
                  borderBottom: activeTab === tab ? '3px solid var(--accent-teal)' : '3px solid transparent',
                }}>
                {tab === 'procedimiento' ? '🧪 Procedimiento' : tab === 'color' ? '🎨 Color de Referencia' : '💰 Costos y Márgenes'}
              </button>
            );
          })}
        </div>

        {/* ── CONTENIDO PROCEDIMIENTO ── */}
        {activeTab === 'procedimiento' && (
          <>
            {/* Sección 1: Parámetros */}
            <div className="modal-seccion">
              <div className="modal-seccion-titulo">⚗️ Parámetros de Origen</div>
              <div className="params-grid">
                {[
                  { label:'Peso Real',       value:`${receta.pesoRealKg} kg`,    hl:true },
                  { label:'Relación de Baño',value:`1 : ${receta.relacionBano}`, hl:true },
                  { label:'Litros / Baño',   value:`${receta.litrosAgua} L`,     hl:true },
                  { label:'Fibra',           value:getFibraLabel(receta.composicionFibra), hl:false },
                  { label:'Total Baños',     value:String(secuencia.length),     hl:true },
                  { label:'Agua Total',      value:`${totalAgua} L`,             hl:true },
                ].map(p => (
                  <div className="param-item" key={p.label}>
                    <div className="param-label">{p.label}</div>
                    <div className={`param-value ${p.hl ? 'highlight' : ''}`} style={!p.hl ? { fontSize:'13px' } : {}}>
                      {p.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sección 2: Fórmula del Color */}
            <div className="modal-seccion">
              <div className="modal-seccion-titulo">🎨 Fórmula del Color Aprobada</div>
              <div style={{ marginBottom:'12px', display:'flex', alignItems:'center', gap:'10px' }}>
                <span className={`intensidad-chip ${getNivelClase(receta.nivelIntensidad)}`}>
                  Nivel {receta.nivelIntensidad} — {motorQuimico.nivelDescripcion}
                </span>
                <span style={{ fontSize:'12px', color:'var(--text-muted)' }}>
                  Suma total: <strong>{motorQuimico.sumaConcentracion.toFixed(4)}%</strong>
                </span>
              </div>

              <div className="formula-lista">
                {!receta.composicionFibra.startsWith('MULTIFIBRA') ? (
                  receta.colorantes.map((c, i) => renderFormulaColorante(c, i))
                ) : (() => {
                  const reactivos = receta.colorantes.filter(c => getColoranteTipo(c.coloranteId, c.nombreColorante, catalogos) === 'REACTIVO');
                  const acidos    = receta.colorantes.filter(c => getColoranteTipo(c.coloranteId, c.nombreColorante, catalogos) === 'ACIDO');
                  const dispersos = receta.colorantes.filter(c => getColoranteTipo(c.coloranteId, c.nombreColorante, catalogos) === 'DISPERSO');
                  return (
                    <>
                      {reactivos.length > 0 && <div style={{ marginTop:'8px' }}>{renderSeparadorFormula('Colorantes para Algodón (Reactivos)')}{reactivos.map((c,i) => renderFormulaColorante(c, i, '8px'))}</div>}
                      {acidos.length    > 0 && <div style={{ marginTop:'12px' }}>{renderSeparadorFormula('Colorantes para Nylon (Ácidos)')}{acidos.map((c,i) => renderFormulaColorante(c, i, '8px'))}</div>}
                      {dispersos.length > 0 && <div style={{ marginTop:'12px' }}>{renderSeparadorFormula('Colorantes para Poliéster (Dispersos)')}{dispersos.map((c,i) => renderFormulaColorante(c, i, '8px'))}</div>}
                    </>
                  );
                })()}
              </div>
              {receta.observacionesTecnicas && <div className="bano-nota" style={{ marginTop:'12px' }}>📝 {receta.observacionesTecnicas}</div>}
            </div>

            {/* Sección 3: Trazabilidad de iteraciones */}
            {iteraciones.length > 0 && (
              <div className="modal-seccion">
                <div className="modal-seccion-titulo">⏳ Trazabilidad de Ajustes e Iteraciones</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginTop:'12px' }}>
                  {iteraciones.map((it: any, idx: number) => {
                    const esUltimo = idx === iteraciones.length - 1;
                    const itReactivos = it.colorantes.filter((c: any) => getColoranteTipo(c.coloranteId, c.nombreColorante, catalogos) === 'REACTIVO');
                    const itAcidos    = it.colorantes.filter((c: any) => getColoranteTipo(c.coloranteId, c.nombreColorante, catalogos) === 'ACIDO');
                    const itDispersos = it.colorantes.filter((c: any) => getColoranteTipo(c.coloranteId, c.nombreColorante, catalogos) === 'DISPERSO');
                    const esMulti     = receta.composicionFibra.startsWith('MULTIFIBRA');
                    return (
                      <div key={idx} style={{ backgroundColor:'#F9FAFB', borderLeft:`3px solid ${esUltimo ? 'var(--accent-green)' : 'var(--accent-teal)'}`, padding:'16px', borderRadius:'8px', boxShadow:'var(--shadow-sm)', display:'flex', flexDirection:'column', gap:'10px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                            <span style={{ fontWeight:700, color:'var(--text-primary)', fontSize:'14px' }}>Iteración #{it.iteracion}</span>
                            {esUltimo && (
                              <span style={{ backgroundColor:'#dcfce7', color:'var(--accent-green)', fontSize:'11px', fontWeight:600, padding:'2px 8px', borderRadius:'999px', display:'inline-flex', alignItems:'center', gap:'3px' }}>
                                ✅ Fórmula Final
                              </span>
                            )}
                          </div>
                          <span style={{ color:'var(--text-muted)', fontSize:'12px' }}>{new Date(it.fecha).toLocaleDateString('es-PE')}</span>
                        </div>
                        <div style={{ fontSize:'13px', color:'var(--text-secondary)', fontStyle:'italic' }}>{it.observacion}</div>

                        {/* Chips de colorantes por tipo */}
                        {!esMulti ? (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', marginTop:'2px' }}>
                            {it.colorantes.map((col: any, i: number) => <ChipColorante key={i} col={col} />)}
                          </div>
                        ) : (
                          <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginTop:'2px', width:'100%' }}>
                            <GrupoIter label="Algodón"  lista={itReactivos} />
                            <GrupoIter label="Nylon"    lista={itAcidos} />
                            <GrupoIter label="Poliéster" lista={itDispersos} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sección 4: Desglose de baños */}
            <div className="modal-seccion">
              <div className="modal-seccion-titulo">🪣 Secuencia Fija de Baños — {secuencia.length} usos de agua</div>
              <div className="banos-lista">
                {secuencia.map((bano: any) => (
                  <div className="bano-item" key={bano.numeroBano}>
                    <div className="bano-header">
                      <div className="bano-numero">{bano.numeroBano}</div>
                      <div className="bano-nombre">{bano.nombre}</div>
                      <span className={`bano-fase-chip ${bano.fase.replace(/_/g,'_')}`}>{bano.fase.replace(/_/g,' ')}</span>
                      <div className="bano-litros">{bano.litrosAgua} L</div>
                    </div>
                    {!bano.esEnjuagueSimple && (
                      <div className="bano-body">
                        {bano.productos?.filter((p: any) => p.gramos > 0 && !p.nombre.includes('ver detalle')).map((p: any, i: number) => (
                          <div className="producto-row" key={i}>
                            <span className="producto-nombre">{p.nombre}</span>
                            <span className="producto-concentracion">{p.concentracion} g/L</span>
                            <span className="producto-gramos">{p.gramos.toFixed(1)} g</span>
                          </div>
                        ))}
                        {bano.productos?.some((p: any) => p.nombre.includes('ver detalle')) && (
                          <div className="producto-row">
                            <span className="producto-nombre" style={{ color:'var(--accent-teal)', fontStyle:'italic' }}>
                              Colorantes — ver Fórmula del Color ↑
                            </span>
                          </div>
                        )}
                        {bano.nota && <div className="bano-nota">{bano.nota}</div>}
                      </div>
                    )}
                    {bano.esEnjuagueSimple && (
                      <div className="bano-body">
                        <div className="bano-enjuague-simple">Agua limpia — sin productos químicos</div>
                        {bano.nota && <div className="bano-nota">{bano.nota}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sección 5: Resumen total */}
            <div className="modal-seccion">
              <div className="modal-seccion-titulo">📊 Resumen Total Consolidado</div>
              <div className="resumen-consolidado">
                <div className="resumen-consolidado-header">
                  <span className="resumen-consolidado-title">Total de insumos del proceso</span>
                  <span className="resumen-consolidado-meta">{secuencia.length} baños · {totalAgua} L agua total</span>
                </div>
                {resumen.map((r, i) => (
                  <div className="resumen-producto-row" key={i}>
                    <span className="resumen-producto-nombre">{r.nombre}</span>
                    <span className="resumen-producto-total">
                      {r.total >= 1000 ? `${(r.total/1000).toFixed(2)} kg` : `${r.total.toFixed(1)} g`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── CONTENIDO COLOR ── */}
        {activeTab === 'color' && renderTabColor()}

        {/* ── CONTENIDO COSTOS ── */}
        {activeTab === 'costos' && (() => {
          if (receta.costoTotal == null) {
            return (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Sin Costeo Histórico</h3>
                <p style={{ maxWidth: '400px', margin: '8px auto', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Esta receta fue creada antes de implementar el módulo de costos. Para costearla, realiza un nuevo ajuste (iteración) o guarda una nueva receta.
                </p>
              </div>
            );
          }

          const margenValido = !isNaN(margenObjetivo) && margenObjetivo >= 0 && margenObjetivo < 100;
          const precioSugerido = margenValido ? receta.costoTotal / (1 - (margenObjetivo / 100)) : 0;

          const ventaTestSubtotal = parseFloat(precioVentaTest as any) || 0;
          const ventaTestConIGV = ventaTestSubtotal * 1.18;
          const utilidadTest = ventaTestConIGV - receta.costoTotal;
          const retornoCajaTest = ventaTestConIGV > 0 ? (utilidadTest / ventaTestConIGV) * 100 : 0;
          const margenNetoTest = ventaTestSubtotal > 0 ? ((ventaTestSubtotal - receta.costoTotal) / ventaTestSubtotal) * 100 : 0;

          let semaforoClase = 'nivel-1'; // rojo
          let semaforoLabel = 'Crítico';
          if (margenNetoTest >= 15 && margenNetoTest <= 30) {
            semaforoClase = 'nivel-2'; // amarillo/naranja
            semaforoLabel = 'Aceptable';
          } else if (margenNetoTest > 30) {
            semaforoClase = 'nivel-3'; // verde
            semaforoLabel = 'Excelente';
          }

          return (
            <div style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="modal-seccion" style={{ marginBottom: 0 }}>
                <div className="modal-seccion-titulo">💰 Desglose de Costos de Producción</div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Valores calculados al momento de registrar la receta con las tarifas unitarias vigentes.
                </p>
                <div className="resumen-consolidado" style={{ marginTop: '8px' }}>
                  <div className="resumen-producto-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span className="resumen-producto-nombre" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>💧 Agua Industrial ({totalAgua} L totales)</span>
                    <span className="resumen-producto-total" style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>S/ {receta.costoAgua?.toFixed(2)}</span>
                  </div>
                  <div className="resumen-producto-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span className="resumen-producto-nombre" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>🧪 Insumos Químicos Auxiliares</span>
                    <span className="resumen-producto-total" style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>S/ {receta.costoQuimicos?.toFixed(2)}</span>
                  </div>
                  <div className="resumen-producto-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span className="resumen-producto-nombre" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>🎨 Colorantes de Fórmula</span>
                    <span className="resumen-producto-total" style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>S/ {receta.costoColorantes?.toFixed(2)}</span>
                  </div>
                  <div className="resumen-producto-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span className="resumen-producto-nombre" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>👤 Mano de Obra (lote: {receta.pesoRealKg} kg)</span>
                    <span className="resumen-producto-total" style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>S/ {receta.costoManoObra?.toFixed(2)}</span>
                  </div>
                  <div className="totales-divider" style={{ margin: '12px 0', height: '1px', backgroundColor: 'var(--border-subtle)' }} />
                  <div className="resumen-producto-row" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '15px', padding: '4px 0' }}>
                    <span style={{ color: 'var(--text-primary)' }}>COSTO DE PRODUCCIÓN TOTAL</span>
                    <span style={{ color: 'var(--accent-teal)' }}>S/ {receta.costoTotal?.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                {/* Calculadora de Precio Sugerido */}
                <div className="modal-seccion" style={{ margin: 0, padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div className="modal-seccion-titulo" style={{ fontSize: '14px', marginBottom: '8px' }}>📈 Precio Sugerido por Margen</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Margen Objetivo %:</label>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={margenObjetivo}
                        onChange={(e) => setMargenObjetivo(parseFloat(e.target.value) || 0)}
                        style={{
                          padding: '8px 12px',
                          fontSize: '14px',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          width: '100%',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>PRECIO VENTA SUGERIDO (Sin IGV)</div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
                        S/ {precioSugerido.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--accent-teal)', fontWeight: '600', marginTop: '2px' }}>
                        Con IGV: S/ {(precioSugerido * 1.18).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulador de Rentabilidad */}
                <div className="modal-seccion" style={{ margin: 0, padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div className="modal-seccion-titulo" style={{ fontSize: '14px', marginBottom: '8px' }}>🎯 Simulador de Rentabilidad</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Precio Venta Lote (Subtotal / Sin IGV):</label>
                      <input
                        type="number"
                        min="0"
                        value={precioVentaTest}
                        onChange={(e) => setPrecioVentaTest(parseFloat(e.target.value) || 0)}
                        style={{
                          padding: '8px 12px',
                          fontSize: '14px',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          width: '100%',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ backgroundColor: '#f8fafc', padding: '10px 6px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: '600' }}>RETORNO DE CAJA</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                          {retornoCajaTest.toFixed(1)}%
                        </div>
                      </div>
                      <div style={{ backgroundColor: '#f8fafc', padding: '10px 6px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                        <div style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: '600' }}>MARGEN NETO (Sin IGV)</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          {margenNetoTest.toFixed(1)}%
                          <span className={`intensidad-chip ${semaforoClase}`} style={{ fontSize: '8px', padding: '1px 5px', fontWeight: 700, display: 'inline-flex', verticalAlign: 'middle' }}>
                            {semaforoLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Evolución de Costos por Ajuste de Laboratorio */}
              {iteraciones.length > 0 && (
                <div className="modal-seccion" style={{ marginTop: '24px' }}>
                  <div className="modal-seccion-titulo">⏳ Evolución de Costos por Ajuste de Laboratorio</div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Historial de variaciones de costos originados por cada corrección de color.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {iteraciones.map((it: any, idx: number) => {
                      const costoTotalIt = it.costoTotal;
                      if (costoTotalIt == null) return null; // Saltar iteraciones antiguas sin costeo

                      // Calcular diferencia con la anterior
                      let delta = 0;
                      let cambiosColorantes: string[] = [];

                      if (idx > 0) {
                        const itPrev = iteraciones[idx - 1];
                        if (itPrev.costoTotal != null) {
                          delta = costoTotalIt - itPrev.costoTotal;

                          // Comparar colorantes
                          const colPrev = itPrev.colorantes || [];
                          const colAct = it.colorantes || [];
                          for (const col of colAct) {
                            const prevItem = colPrev.find((c: any) => c.coloranteId === col.coloranteId);
                            if (!prevItem) {
                              cambiosColorantes.push(`+ ${col.nombreColorante} (+${col.porcentaje.toFixed(3)}%)`);
                            } else if (col.porcentaje > prevItem.porcentaje) {
                              const diffPct = col.porcentaje - prevItem.porcentaje;
                              cambiosColorantes.push(`▲ ${col.nombreColorante} (+${diffPct.toFixed(3)}%)`);
                            } else if (col.porcentaje < prevItem.porcentaje) {
                              const diffPct = prevItem.porcentaje - col.porcentaje;
                              cambiosColorantes.push(`▼ ${col.nombreColorante} (-${diffPct.toFixed(3)}%)`);
                            }
                          }
                          for (const col of colPrev) {
                            const actItem = colAct.find((c: any) => c.coloranteId === col.coloranteId);
                            if (!actItem) {
                              cambiosColorantes.push(`- ${col.nombreColorante} (Removido)`);
                            }
                          }
                        }
                      }

                      return (
                        <div key={idx} style={{ backgroundColor: '#f8fafc', borderLeft: `4px solid ${idx === 0 ? 'var(--accent-teal)' : 'var(--accent-purple)'}`, padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', borderLeftWidth: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>Iteración #{it.iteracion} {idx === 0 ? '(Formulación Inicial)' : '(Ajuste de Receta)'}</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(it.fecha).toLocaleDateString('es-PE')}</span>
                          </div>
                          
                          {it.observacion && (
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: '4px 0 8px 0' }}>
                              &ldquo;{it.observacion}&rdquo;
                            </div>
                          )}

                          {/* Detalles del Costo */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)', margin: '6px 0', borderBottom: cambiosColorantes.length > 0 ? '1px dashed var(--border-subtle)' : 'none', paddingBottom: cambiosColorantes.length > 0 ? '6px' : '0' }}>
                            <div>💧 Agua: <strong>S/ {it.costoAgua?.toFixed(2)}</strong></div>
                            <div>🧪 Químicos: <strong>S/ {it.costoQuimicos?.toFixed(2)}</strong></div>
                            <div>🎨 Colorantes: <strong>S/ {it.costoColorantes?.toFixed(2)}</strong></div>
                            <div>👤 M. Obra: <strong>S/ {it.costoManoObra?.toFixed(2)}</strong></div>
                          </div>

                          {/* Variaciones y Cambios */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', fontSize: '11px', marginTop: '6px' }}>
                            <div>
                              {cambiosColorantes.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '10px' }}>Cambios en fórmula:</span>
                                  {cambiosColorantes.map((c, i) => (
                                    <span key={i} style={{ color: 'var(--text-primary)' }}>• {c}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div style={{ textAlign: 'right', marginLeft: 'auto' }}>
                              <div style={{ fontSize: '12px', fontWeight: '700' }}>Costo Total: S/ {costoTotalIt.toFixed(2)}</div>
                              {idx > 0 && (
                                <div style={{ 
                                  fontSize: '11px', 
                                  fontWeight: '600',
                                  color: delta > 0 ? '#ef4444' : delta < 0 ? 'var(--accent-green)' : 'var(--text-secondary)',
                                  marginTop: '2px'
                                }}>
                                  {delta > 0 ? `📈 + S/ ${delta.toFixed(2)}` : delta < 0 ? `📉 - S/ ${Math.abs(delta).toFixed(2)}` : 'Sin variación'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── FOOTER ── */}
        <div className="modal-footer" style={{ gap:'12px', justifyContent:'space-between' }}>
          {activeTab === 'procedimiento' && receta.estado === 'APROBADO' ? (
            <button id="btn-copiar-base-receta" className="btn-copiar-base" onClick={handleCopiarBase}
              title="Precarga todos los datos en el formulario para una edición libre">
              📋 Copiar como base para nueva receta
            </button>
          ) : <div />}
          <button id="btn-cerrar-modal-receta-footer" className="btn btn-secondary" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalleReceta;
