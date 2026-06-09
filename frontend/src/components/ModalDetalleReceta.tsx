// =============================================================================
// SERVITEX — Modal Detalle Receta (Cartilla Expandida)
// Muestra: parámetros, fórmula de color, desglose de baños y resumen total.
// Incluye botón "Copiar como base para nueva receta".
// =============================================================================
import React, { useEffect } from 'react';
import type { RecetaConMotor, BanoQuimico, RecetaPreload } from '../types/recetas';
import { getFibraLabel, getNivelClase } from '../types/recetas';

interface ModalDetalleRecetaProps {
  data: RecetaConMotor;
  onCerrar: () => void;
  onCopiarBase: (preload: RecetaPreload) => void;
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
  data, onCerrar, onCopiarBase,
}) => {
  const { receta, motorQuimico } = data;
  const resumen = calcularResumenConsolidado(motorQuimico.secuencia);
  const totalAgua = Math.round(motorQuimico.totalBanos * motorQuimico.litrosAgua * 100) / 100;

  // Cerrar con ESC
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', fn);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', fn); document.body.style.overflow = ''; };
  }, [onCerrar]);

  function handleCopiarBase() {
    const preload: RecetaPreload = {
      pesoRealKg:           String(receta.pesoRealKg),
      articulo:             receta.articulo,
      composicionFibra:     receta.composicionFibra,
      relacionBano:         String(receta.relacionBano),
      descripcionColor:     receta.descripcionColor,
      observacionesTecnicas: receta.observacionesTecnicas ?? '',
      colorantes: receta.colorantes.map(c => ({
        nombre:    c.nombreColorante,
        porcentaje: String(c.porcentaje),
      })),
    };
    onCopiarBase(preload);
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}
      role="dialog" aria-modal="true" aria-labelledby="modal-receta-titulo"
    >
      <div className="modal-receta-panel">
        <div className="modal-receta-topbar" />

        {/* ── HEADER ── */}
        <div className="modal-header">
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
              <div className="param-value highlight">{motorQuimico.totalBanos}</div>
            </div>
            <div className="param-item">
              <div className="param-label">Agua Total</div>
              <div className="param-value highlight">{totalAgua} L</div>
            </div>
          </div>
        </div>

        {/* ── SECCIÓN 2: Fórmula del Color ── */}
        <div className="modal-seccion">
          <div className="modal-seccion-titulo">🎨 Fórmula del Color</div>

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

        {/* ── SECCIÓN 3: Desglose paso a paso de baños ── */}
        <div className="modal-seccion">
          <div className="modal-seccion-titulo">
            🪣 Desglose de Baños — {motorQuimico.totalBanos} usos de agua
          </div>
          <div className="banos-lista">
            {motorQuimico.secuencia.map(bano => (
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
                    {bano.productos.filter(p => p.gramos > 0 && !p.nombre.includes('ver detalle')).map((p, i) => (
                      <div className="producto-row" key={i}>
                        <span className="producto-nombre">{p.nombre}</span>
                        <span className="producto-concentracion">{p.concentracion} g/L</span>
                        <span className="producto-gramos">{p.gramos.toFixed(1)} g</span>
                      </div>
                    ))}
                    {/* Nota de la fórmula de colorantes */}
                    {bano.productos.some(p => p.nombre.includes('ver detalle')) && (
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

        {/* ── SECCIÓN 4: Resumen Total Consolidado ── */}
        <div className="modal-seccion">
          <div className="modal-seccion-titulo">📊 Resumen Total Consolidado</div>
          <div className="resumen-consolidado">
            <div className="resumen-consolidado-header">
              <span className="resumen-consolidado-title">Total de insumos del proceso</span>
              <span className="resumen-consolidado-meta">
                {motorQuimico.totalBanos} baños · {totalAgua} L agua total
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

        {/* ── FOOTER ── */}
        <div className="modal-footer" style={{ gap: '12px', justifyContent: 'space-between' }}>
          <button
            id="btn-copiar-base-receta"
            className="btn-copiar-base"
            onClick={handleCopiarBase}
            title="Precarga todos los datos en el formulario para una edición libre"
          >
            📋 Copiar como base para nueva receta
          </button>
          <button id="btn-cerrar-modal-receta-footer" className="btn btn-secondary" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalleReceta;
