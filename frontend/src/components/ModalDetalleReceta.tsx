// =============================================================================
// SERVITEX — Modal Detalle Receta (Cartilla Expandida)
// Muestra: parámetros, fórmula de color, trazabilidad de ajustes, desglose de baños y resumen.
// Incluye botón "Copiar como base para nueva receta".
// =============================================================================
import React, { useEffect, useState, useRef } from 'react';
import type { RecetaConMotor, BanoQuimico, RecetaPreload } from '../types/recetas';
import { getFibraLabel, getNivelClase } from '../types/recetas';
import { analizarColor, guardarColor } from '../services/recetasApi';

interface ModalDetalleRecetaProps {
  data: RecetaConMotor;
  onCerrar: () => void;
  onCopiarBase: (preload: RecetaPreload) => void;
  onActualizarReceta?: (recetaActualizada: RecetaConMotor) => void;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

/** Agrupa productos de todos los baños sumando sus gramos por nombre */
function calcularResumenConsolidado(secuencia: BanoQuimico[]) {
  const map = new Map<string, number>();
  for (const bano of secuencia) {
    for (const p of bano.productos) {
      if (p.gramos === 0 || p.nombre.includes('ver detalle')) continue;
      map.set(p.nombre, (map.get(p.nombre) ?? 0) + p.gramos);
    }
  }
  return Array.from(map.entries()).map(([nombre, total]) => ({ nombre, total }));
}

const ModalDetalleReceta: React.FC<ModalDetalleRecetaProps> = ({
  data, onCerrar, onCopiarBase, onActualizarReceta,
}) => {
  const { receta, motorQuimico } = data;

  const [activeTab, setActiveTab] = useState<'procedimiento' | 'color'>('procedimiento');

  // Camera/Image selection state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);
  const [loadedImageFile, setLoadedImageFile] = useState<File | null>(null);

  // Selection rectangle drag state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [currentY, setCurrentY] = useState(0);

  // Analysis result state
  const [analizing, setAnalizing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    colorHex: string;
    colorRgb: { r: number; g: number; b: number };
    miniaturaBase64: string;
  } | null>(null);

  const [forceCapture, setForceCapture] = useState(false);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const showCaptureWorkspace = !receta.colorHex || forceCapture;

  // Usar la secuencia guardada en la receta, o en su defecto la del motor químico
  const secuencia = receta.secuenciaBanos || motorQuimico.secuencia || [];
  const resumen = calcularResumenConsolidado(secuencia);
  const totalAgua = Math.round(secuencia.length * receta.litrosAgua * 100) / 100;
  const iteraciones = Array.isArray(receta.iteraciones) ? receta.iteraciones : [];

  // Cerrar con ESC
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', fn);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', fn); document.body.style.overflow = ''; };
  }, [onCerrar]);

  // Cleanup camera stream
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    if (activeTab !== 'color' && stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setShowVideo(false);
    }
  }, [activeTab, stream]);

  function handleCopiarBase() {
    const preload: RecetaPreload = {
      pesoRealKg:            String(receta.pesoRealKg),
      articulo:              receta.articulo,
      articuloId:            receta.articuloId,
      composicionFibra:      receta.composicionFibra,
      relacionBano:          String(receta.relacionBano),
      descripcionColor:      receta.descripcionColor,
      observacionesTecnicas: receta.observacionesTecnicas ?? '',
      colorantes: receta.colorantes.map(c => ({
        nombre:      c.nombreColorante,
        coloranteId: c.coloranteId,
        porcentaje:  String(c.porcentaje),
      })),
    };
    onCopiarBase(preload);
  }

  // Drag handlers
  const handleDragStart = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setIsDragging(true);
    setStartX(clientX - rect.left);
    setStartY(clientY - rect.top);
    setCurrentX(clientX - rect.left);
    setCurrentY(clientY - rect.top);
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    setCurrentX(x);
    setCurrentY(y);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    handleDragStart(e.clientX, e.clientY);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  };

  const onMouseUp = () => {
    handleDragEnd();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onTouchEnd = () => {
    handleDragEnd();
  };

  // Selection rectangle properties
  const leftVal = Math.min(startX, currentX);
  const topVal = Math.min(startY, currentY);
  const widthVal = Math.abs(startX - currentX);
  const heightVal = Math.abs(startY - currentY);

  const selectionStyle: React.CSSProperties = {
    position: 'absolute',
    border: '2px dashed var(--accent-teal)',
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    left: `${leftVal}px`,
    top: `${topVal}px`,
    width: `${widthVal}px`,
    height: `${heightVal}px`,
    pointerEvents: 'none',
    boxSizing: 'border-box',
    borderRadius: '2px',
  };

  const handleAnalizar = async () => {
    if (!loadedImageFile || !imageRef.current || !containerRef.current) return;
    
    setAnalizing(true);
    try {
      const img = imageRef.current;
      const displayWidth = img.width;
      const displayHeight = img.height;
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      const scaleX = naturalWidth / displayWidth;
      const scaleY = naturalHeight / displayHeight;

      const x = Math.round(leftVal * scaleX);
      const y = Math.round(topVal * scaleY);
      const width = Math.round(widthVal * scaleX);
      const height = Math.round(heightVal * scaleY);

      const result = await analizarColor(loadedImageFile, x, y, width, height);
      setAnalysisResult(result);
    } catch (err: any) {
      console.error(err);
      alert(err.message ?? 'Error al analizar el color.');
    } finally {
      setAnalizing(false);
    }
  };

  const handleGuardarColor = async () => {
    if (!analysisResult) return;
    try {
      const payload = {
        colorHex: analysisResult.colorHex,
        colorRgb: analysisResult.colorRgb,
        colorMiniatura: analysisResult.miniaturaBase64,
      };
      const updatedData = await guardarColor(receta.id, payload);
      if (onActualizarReceta) {
        onActualizarReceta(updatedData);
      }
      setForceCapture(false);
      setLoadedImageUrl(null);
      setLoadedImageFile(null);
      setAnalysisResult(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message ?? 'Error al guardar el color.');
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}
      role="dialog" aria-modal="true" aria-labelledby="modal-receta-titulo"
    >
      <div className="modal-receta-panel">
        <div className="modal-receta-topbar" />

        {/* ── HEADER ── */}
        <div className="modal-header" style={{ paddingBottom: receta.estado === 'APROBADO' ? '8px' : '20px' }}>
          <div className="modal-header-info">
            <h2 className="modal-title" id="modal-receta-titulo">
              {receta.descripcionColor}
            </h2>
            <div className="modal-subtitle">
              {getFibraLabel(receta.composicionFibra)} · {receta.articulo} · {formatFecha(receta.createdAt)}
            </div>
          </div>
          <button id="btn-cerrar-modal-receta" className="modal-close" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </div>

        {/* ── SISTEMA DE PESTAÑAS (Sólo para recetas aprobadas en Lab Histórico) ── */}
        {receta.estado === 'APROBADO' && (
          <div
            style={{
              display: 'flex',
              gap: '4px',
              padding: '0 24px',
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: '20px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('procedimiento')}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: 'transparent',
                fontSize: '14px',
                fontWeight: activeTab === 'procedimiento' ? '600' : '500',
                color: activeTab === 'procedimiento' ? 'var(--accent-teal)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'procedimiento' ? '3px solid var(--accent-teal)' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none',
              }}
            >
              🧪 Procedimiento
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('color')}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: 'transparent',
                fontSize: '14px',
                fontWeight: activeTab === 'color' ? '600' : '500',
                color: activeTab === 'color' ? 'var(--accent-teal)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'color' ? '3px solid var(--accent-teal)' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none',
              }}
            >
              🎨 Color de Referencia
            </button>
          </div>
        )}

        {/* ── CONTENIDO DE PROCEDIMIENTO ── */}
        {activeTab === 'procedimiento' && (
          <>
            {/* ── SECCIÓN 1: Parámetros de Origen ── */}
            <div className="modal-seccion">
              <div className="modal-seccion-titulo">⚗️ Parámetros de Origen</div>
              <div className="params-grid">
                <div className="param-item">
                  <div className="param-label">Peso Real</div>
                  <div className="param-value highlight">{receta.pesoRealKg} kg</div>
                </div>
                <div className="param-item">
                  <div className="param-label">Relación de Baño</div>
                  <div className="param-value highlight">1 : {receta.relacionBano}</div>
                </div>
                <div className="param-item">
                  <div className="param-label">Litros / Baño</div>
                  <div className="param-value highlight">{receta.litrosAgua} L</div>
                </div>
                <div className="param-item">
                  <div className="param-label">Fibra</div>
                  <div className="param-value" style={{ fontSize: '13px' }}>
                    {getFibraLabel(receta.composicionFibra)}
                  </div>
                </div>
                <div className="param-item">
                  <div className="param-label">Total Baños</div>
                  <div className="param-value highlight">{secuencia.length}</div>
                </div>
                <div className="param-item">
                  <div className="param-label">Agua Total</div>
                  <div className="param-value highlight">{totalAgua} L</div>
                </div>
              </div>
            </div>

            {/* ── SECCIÓN 2: Fórmula del Color ── */}
            <div className="modal-seccion">
              <div className="modal-seccion-titulo">🎨 Fórmula del Color Aprobada</div>

              {/* Intensidad */}
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`intensidad-chip ${getNivelClase(receta.nivelIntensidad)}`}>
                  Nivel {receta.nivelIntensidad} — {motorQuimico.nivelDescripcion}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Suma total: <strong>{motorQuimico.sumaConcentracion.toFixed(4)}%</strong>
                </span>
              </div>

              <div className="formula-lista">
                {receta.colorantes.map((c, i) => (
                  <div className="formula-item" key={i}>
                    <span className="formula-colorante-nombre">{c.nombreColorante}</span>
                    <span className="formula-porcentaje">{c.porcentaje.toFixed(4)}%</span>
                  </div>
                ))}
              </div>
              {receta.observacionesTecnicas && (
                <div className="bano-nota" style={{ marginTop: '12px' }}>
                  📝 {receta.observacionesTecnicas}
                </div>
              )}
            </div>

            {/* ── SECCIÓN 3: Trazabilidad de Ajustes (Timeline) ── */}
            {iteraciones.length > 0 && (
              <div className="modal-seccion">
                <div className="modal-seccion-titulo">⏳ Trazabilidad de Ajustes e Iteraciones</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  {iteraciones.map((it: any, idx: number) => {
                    const esUltimo = idx === iteraciones.length - 1;
                    return (
                      <div key={idx} style={{ borderLeft: '2px solid var(--accent-purple)', paddingLeft: '12px', paddingBottom: '6px', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '-6px', top: '3px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-purple)' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
                          <span>
                            Iteración #{it.iteracion} {esUltimo ? '✅ (Fórmula Final)' : ''}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>{new Date(it.fecha).toLocaleDateString('es-PE')}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          <strong>Motivo/Nota:</strong> {it.observacion}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          {it.colorantes.map((col: any, colIdx: number) => (
                            <span key={colIdx} style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                              🎨 {col.nombreColorante}: <strong>{col.porcentaje}%</strong> ({col.gramos.toFixed(2)} g)
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── SECCIÓN 4: Desglose paso a paso de baños ── */}
            <div className="modal-seccion">
              <div className="modal-seccion-titulo">
                🪣 Secuencia Fija de Baños — {secuencia.length} usos de agua
              </div>
              <div className="banos-lista">
                {secuencia.map((bano: any) => (
                  <div className="bano-item" key={bano.numeroBano}>
                    <div className="bano-header">
                      <div className="bano-numero">{bano.numeroBano}</div>
                      <div className="bano-nombre">{bano.nombre}</div>
                      <span className={`bano-fase-chip ${bano.fase.replace(/_/g,'_')}`}>
                        {bano.fase.replace(/_/g, ' ')}
                      </span>
                      <div className="bano-litros">{bano.litrosAgua} L</div>
                    </div>

                    {!bano.esEnjuagueSimple && (
                      <div className="bano-body">
                        {bano.productos && bano.productos.filter((p: any) => p.gramos > 0 && !p.nombre.includes('ver detalle')).map((p: any, i: number) => (
                          <div className="producto-row" key={i}>
                            <span className="producto-nombre">{p.nombre}</span>
                            <span className="producto-concentracion">{p.concentracion} g/L</span>
                            <span className="producto-gramos">{p.gramos.toFixed(1)} g</span>
                          </div>
                        ))}
                        {/* Nota de la fórmula de colorantes */}
                        {bano.productos && bano.productos.some((p: any) => p.nombre.includes('ver detalle')) && (
                          <div className="producto-row">
                            <span className="producto-nombre" style={{ color: 'var(--accent-teal)', fontStyle: 'italic' }}>
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

            {/* ── SECCIÓN 5: Resumen Total Consolidado ── */}
            <div className="modal-seccion">
              <div className="modal-seccion-titulo">📊 Resumen Total Consolidado</div>
              <div className="resumen-consolidado">
                <div className="resumen-consolidado-header">
                  <span className="resumen-consolidado-title">Total de insumos del proceso</span>
                  <span className="resumen-consolidado-meta">
                    {secuencia.length} baños · {totalAgua} L agua total
                  </span>
                </div>
                {resumen.map((r, i) => (
                  <div className="resumen-producto-row" key={i}>
                    <span className="resumen-producto-nombre">{r.nombre}</span>
                    <span className="resumen-producto-total">
                      {r.total >= 1000
                        ? `${(r.total / 1000).toFixed(2)} kg`
                        : `${r.total.toFixed(1)} g`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── CONTENIDO DE COLOR DE REFERENCIA ── */}
        {activeTab === 'color' && (
          <div style={{ padding: '0 24px 24px 24px' }}>
            {!showCaptureWorkspace ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Color de Referencia Guardado
                </h3>
                
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Miniatura de zona original</div>
                    {receta.colorMiniatura ? (
                      <img
                        src={receta.colorMiniatura}
                        alt="Miniatura recortada"
                        style={{
                          width: '120px',
                          height: '120px',
                          objectFit: 'cover',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '120px',
                          height: '120px',
                          backgroundColor: 'var(--bg-base)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          border: '1px dashed var(--border-subtle)',
                        }}
                      >
                        Sin imagen
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Bloque de color sólido</div>
                    <div
                      style={{
                        width: '120px',
                        height: '120px',
                        backgroundColor: receta.colorHex || '#cccccc',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>HEX: </span>
                      <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', background: 'var(--bg-glass)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                        {receta.colorHex}
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>RGB: </span>
                      <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', background: 'var(--bg-glass)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                        {receta.colorRgb ? `R: ${receta.colorRgb.r}, G: ${receta.colorRgb.g}, B: ${receta.colorRgb.b}` : 'N/A'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => {
                      setForceCapture(true);
                      setAnalysisResult(null);
                    }}
                  >
                    🔄 Actualizar color
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {!loadedImageUrl && !showVideo && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div
                      style={{
                        padding: '12px 16px',
                        backgroundColor: 'var(--accent-teal-bg)',
                        color: 'var(--accent-teal-dim)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '13px',
                        borderLeft: '4px solid var(--accent-teal)',
                      }}
                    >
                      💡 <strong>Nota:</strong> Para mejor resultado, fotografía la muestra bajo luz natural o luz blanca.
                    </div>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={async () => {
                          try {
                            const str = await navigator.mediaDevices.getUserMedia({
                              video: { facingMode: 'environment' }
                            });
                            setStream(str);
                            setShowVideo(true);
                            setTimeout(() => {
                              if (videoRef.current) {
                                videoRef.current.srcObject = str;
                                videoRef.current.play().catch(e => console.error("Error video play:", e));
                              }
                            }, 100);
                          } catch (err) {
                            console.error("Camera access error:", err);
                            alert("No se pudo acceder a la cámara. Por favor selecciona una imagen.");
                          }
                        }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      >
                        📷 Tomar foto
                      </button>
                      
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      >
                        🖼️ Seleccionar imagen
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            setLoadedImageFile(file);
                            setLoadedImageUrl(URL.createObjectURL(file));
                            setAnalysisResult(null);
                          }
                        }}
                      />
                    </div>
                    
                    {receta.colorHex && (
                      <div style={{ marginTop: '10px' }}>
                        <button
                          type="button"
                          className="btn btn-ghost-teal"
                          onClick={() => setForceCapture(false)}
                        >
                          Volver al color guardado
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {showVideo && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '400px', background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden', aspectRatio: '4/3' }}>
                      <video
                        ref={videoRef}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        playsInline
                        muted
                      />
                    </div>
                    <canvas ref={videoCanvasRef} style={{ display: 'none' }} />
                    
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          if (videoRef.current && videoCanvasRef.current) {
                            const video = videoRef.current;
                            const canvas = videoCanvasRef.current;
                            canvas.width = video.videoWidth || 640;
                            canvas.height = video.videoHeight || 480;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                              canvas.toBlob((blob) => {
                                if (blob) {
                                  const file = new File([blob], 'foto_muestra.jpg', { type: 'image/jpeg' });
                                  setLoadedImageFile(file);
                                  setLoadedImageUrl(URL.createObjectURL(blob));
                                  setAnalysisResult(null);
                                  if (stream) {
                                    stream.getTracks().forEach(track => track.stop());
                                    setStream(null);
                                  }
                                  setShowVideo(false);
                                }
                              }, 'image/jpeg', 0.95);
                            }
                          }
                        }}
                      >
                        📸 Capturar Foto
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          if (stream) {
                            stream.getTracks().forEach(track => track.stop());
                            setStream(null);
                          }
                          setShowVideo(false);
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {loadedImageUrl && !analysisResult && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Arrastra el mouse o el dedo sobre la imagen para seleccionar la zona de tela a analizar:
                    </div>
                    
                    <div
                      ref={containerRef}
                      style={{
                        position: 'relative',
                        display: 'inline-block',
                        maxWidth: '100%',
                        maxHeight: '400px',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        userSelect: 'none',
                        cursor: 'crosshair',
                        touchAction: 'none',
                      }}
                      onMouseDown={onMouseDown}
                      onMouseMove={onMouseMove}
                      onMouseUp={onMouseUp}
                      onTouchStart={onTouchStart}
                      onTouchMove={onTouchMove}
                      onTouchEnd={onTouchEnd}
                    >
                      <img
                        ref={imageRef}
                        src={loadedImageUrl}
                        alt="Muestra"
                        style={{
                          display: 'block',
                          maxWidth: '100%',
                          maxHeight: '400px',
                          pointerEvents: 'none',
                        }}
                        onLoad={() => {
                          setTimeout(() => {
                            if (containerRef.current) {
                              const rect = containerRef.current.getBoundingClientRect();
                              const cx = rect.width / 2;
                              const cy = rect.height / 2;
                              setStartX(cx - 30);
                              setStartY(cy - 30);
                              setCurrentX(cx + 30);
                              setCurrentY(cy + 30);
                            }
                          }, 100);
                        }}
                      />
                      
                      <div style={selectionStyle} />
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleAnalizar}
                        disabled={analizing}
                      >
                        {analizing ? 'Analizando...' : 'Analizar zona seleccionada'}
                      </button>
                      
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setLoadedImageUrl(null);
                          setLoadedImageFile(null);
                          setAnalysisResult(null);
                        }}
                      >
                        Cambiar Imagen
                      </button>
                    </div>
                  </div>
                )}

                {analysisResult && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Resultado del Análisis
                    </h4>
                    
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Zona recortada</div>
                        <img
                          src={analysisResult.miniaturaBase64}
                          alt="Miniatura"
                          style={{
                            width: '120px',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-subtle)',
                            boxShadow: 'var(--shadow-sm)',
                          }}
                        />
                      </div>

                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Color calculado</div>
                        <div
                          style={{
                            width: '120px',
                            height: '120px',
                            backgroundColor: analysisResult.colorHex,
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-subtle)',
                            boxShadow: 'var(--shadow-sm)',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>HEX: </span>
                          <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', background: 'var(--bg-glass)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                            {analysisResult.colorHex}
                          </strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>RGB: </span>
                          <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', background: 'var(--bg-glass)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                            R: {analysisResult.colorRgb.r}, G: {analysisResult.colorRgb.g}, B: {analysisResult.colorRgb.b}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleGuardarColor}
                      >
                        ✅ Guardar color en receta
                      </button>
                      
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setAnalysisResult(null);
                        }}
                      >
                        🔄 Volver a capturar
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {/* ── FOOTER ── */}
        <div className="modal-footer" style={{ gap: '12px', justifyContent: 'space-between' }}>
          {activeTab === 'procedimiento' ? (
            <button
              id="btn-copiar-base-receta"
              className="btn-copiar-base"
              onClick={handleCopiarBase}
              title="Precarga todos los datos en el formulario para una edición libre"
            >
              📋 Copiar como base para nueva receta
            </button>
          ) : (
            <div />
          )}
          <button id="btn-cerrar-modal-receta-footer" className="btn btn-secondary" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalleReceta;
