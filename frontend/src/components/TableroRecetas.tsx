// =============================================================================
// SERVITEX — Tablero Histórico de Recetas (Mini Cartas + Paginación)
// Regla: Mini Cartas muestran SOLO: Nombre del Color (negrita), Fecha,
//        Composición del artículo (fibra). Nada más.
// =============================================================================
import React, { useState } from 'react';
import type { RecetaListItem, RecetaConMotor } from '../types/recetas';
import { getFibraClase, getFibraLabel, getNivelClase } from '../types/recetas';

const POR_PAGINA = 12;

function formatFechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

interface TableroRecetasProps {
  recetas: RecetaListItem[];
  onSeleccionar: (id: number) => void;
  onNuevaReceta: () => void;
}

const TableroRecetas: React.FC<TableroRecetasProps> = ({
  recetas, onSeleccionar, onNuevaReceta,
}) => {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(recetas.length / POR_PAGINA));
  const slice = recetas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <div>
      {/* Header */}
      <div className="tablero-recetas-header">
        <div>
          <h1 className="page-title">Lab <span>Histórico</span></h1>
          <p className="page-subtitle">
            {recetas.length} receta(s) registradas · Haz clic en una carta para ver el desglose químico
          </p>
        </div>
        <button id="btn-nueva-receta" type="button" className="btn btn-primary" onClick={onNuevaReceta}>
          🧪 Nueva Receta
        </button>
      </div>

      {/* Stats */}
      <div className="tablero-stats">
        <div className="stat-chip">
          <span className="stat-chip-icon">🧪</span>
          <span className="stat-chip-value">{recetas.length}</span>
          <span className="stat-chip-label">Recetas totales</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip-icon">🌿</span>
          <span className="stat-chip-value">
            {recetas.filter(r => r.composicionFibra === 'ALGODON').length}
          </span>
          <span className="stat-chip-label">Algodón</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip-icon">🔀</span>
          <span className="stat-chip-value">
            {recetas.filter(r => r.composicionFibra.startsWith('MULTIFIBRA')).length}
          </span>
          <span className="stat-chip-label">Multifibra</span>
        </div>
      </div>

      {/* Grid */}
      {recetas.length === 0 ? (
        <div className="recetas-empty">
          <div style={{ fontSize:'48px', opacity:0.3 }}>🧪</div>
          <div style={{ fontSize:'18px', fontWeight:600, color:'var(--text-secondary)' }}>
            No hay recetas registradas
          </div>
          <div style={{ fontSize:'14px', color:'var(--text-muted)', maxWidth:'300px' }}>
            Usa el formulario técnico para crear la primera receta de laboratorio.
          </div>
          <button id="btn-ir-formulario-lab" type="button" className="btn btn-ghost-teal" onClick={onNuevaReceta}>
            🧪 Crear primera receta
          </button>
        </div>
      ) : (
        <>
          <div className="grid-cartas-receta">
            {slice.map(r => (
              <MiniCartaReceta key={r.id} receta={r} onSeleccionar={onSeleccionar} />
            ))}
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="paginacion">
              <button className="pag-btn" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>‹</button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                <button key={p} className={`pag-btn ${p === pagina ? 'active' : ''}`} onClick={() => setPagina(p)}>
                  {p}
                </button>
              ))}
              <button className="pag-btn" disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)}>›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTE: MiniCartaReceta
// Regla estricta: SOLO muestra Nombre del Color (negrita), Fecha y Composición.
// =============================================================================
interface MiniCartaRecetaProps {
  receta: RecetaListItem;
  onSeleccionar: (id: number) => void;
}

const MiniCartaReceta: React.FC<MiniCartaRecetaProps> = ({ receta, onSeleccionar }) => {
  const fibraClase = getFibraClase(receta.composicionFibra);
  const nivelClase = getNivelClase(receta.nivelIntensidad);

  return (
    <div
      id={`carta-receta-${receta.id}`}
      className="mini-carta-receta"
      onClick={() => onSeleccionar(receta.id)}
      role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSeleccionar(receta.id); }}
      aria-label={`Ver desglose de ${receta.descripcionColor}`}
    >
      {/* Fibra badge */}
      <div className={`carta-fibra-badge ${fibraClase}`}>
        {receta.composicionFibra === 'ALGODON'   ? '🌿' :
         receta.composicionFibra === 'NYLON'     ? '🔵' :
         receta.composicionFibra === 'POLIESTER' ? '🟠' : '🔀'}
        &nbsp;{getFibraLabel(receta.composicionFibra)}
      </div>

      {/* DATO 1: Nombre del Color — en negrita, dato principal */}
      <div className="carta-color-nombre">{receta.descripcionColor}</div>

      {/* DATO 3: Composición del artículo */}
      <div className="carta-articulo">{receta.articulo}</div>

      {/* Footer */}
      <div className="carta-footer">
        {/* DATO 2: Fecha de registro */}
        <div className="carta-fecha">📅 {formatFechaCorta(receta.createdAt)}</div>
        <span className={`carta-nivel-chip intensidad-chip ${nivelClase}`} style={{ fontSize:'9px', padding:'2px 7px' }}>
          N{receta.nivelIntensidad}
        </span>
      </div>
    </div>
  );
};

export { MiniCartaReceta };
export default TableroRecetas;
