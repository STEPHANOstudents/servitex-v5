// =============================================================================
// SERVITEX — Tablero Histórico de Recetas (Mini Cartas + Paginación)
// Regla: Mini Cartas muestran SOLO: Nombre del Color (negrita), Fecha,
//        Composición del artículo (fibra). Nada más.
// =============================================================================
import React, { useState } from 'react';
import type { RecetaListItem } from '../types/recetas';
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
  const [filtroFibra, setFiltroFibra] = useState<'TODOS' | 'ALGODON' | 'NYLON' | 'POLIESTER' | 'MULTIFIBRA'>('TODOS');
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');

  const seleccionarFiltro = (f: 'TODOS' | 'ALGODON' | 'NYLON' | 'POLIESTER' | 'MULTIFIBRA') => {
    setFiltroFibra(f);
    setPagina(1);
  };

  const recetasFiltradas = recetas.filter(r => {
    // 1. Filtro por fibra
    if (filtroFibra !== 'TODOS') {
      if (filtroFibra === 'ALGODON' && r.composicionFibra !== 'ALGODON') return false;
      if (filtroFibra === 'NYLON' && r.composicionFibra !== 'NYLON') return false;
      if (filtroFibra === 'POLIESTER' && r.composicionFibra !== 'POLIESTER') return false;
      if (filtroFibra === 'MULTIFIBRA' && !r.composicionFibra.startsWith('MULTIFIBRA')) return false;
    }

    // 2. Filtro por buscador de texto libre (color, artículo, cliente)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      const colorMatch = r.descripcionColor.toLowerCase().includes(q);
      const articuloMatch = r.articulo.toLowerCase().includes(q);
      const clienteMatch = r.lote?.cliente?.toLowerCase().includes(q) ?? false;
      return colorMatch || articuloMatch || clienteMatch;
    }

    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(recetasFiltradas.length / POR_PAGINA));
  const slice = recetasFiltradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <div>
      {/* Estilos locales para el cursor y el estado activo */}
      <style>{`
        .stat-chip-btn {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-sm);
          font-family: inherit;
        }
        .stat-chip-btn:hover {
          border-color: var(--accent-purple);
          transform: translateY(-1px);
        }
        .stat-chip-btn.active {
          background: rgba(139, 92, 246, 0.15) !important;
          border-color: var(--accent-purple) !important;
          box-shadow: 0 0 12px rgba(139, 92, 246, 0.15);
        }
        .stat-chip-btn.active .stat-chip-value {
          color: var(--accent-purple) !important;
        }
      `}</style>

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

      {/* Buscador de recetas */}
      <div style={{ position: 'relative', width: '100%', marginBottom: '16px' }}>
        <span
          style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            fontSize: '16px',
            pointerEvents: 'none',
          }}
        >
          🔍
        </span>
        <input
          type="text"
          placeholder="Buscar por color, artículo o cliente..."
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPagina(1);
          }}
          style={{
            width: '100%',
            padding: '12px 16px 12px 42px',
            fontSize: '14px',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-primary)',
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent-teal)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
        />
      </div>

      {/* Stats / Interactive filter parameter buttons */}
      <div className="tablero-stats" style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`stat-chip-btn ${filtroFibra === 'TODOS' ? 'active' : ''}`}
          onClick={() => seleccionarFiltro('TODOS')}
        >
          <span className="stat-chip-icon">🧪</span>
          <span className="stat-chip-value">{recetas.length}</span>
          <span className="stat-chip-label">Recetas totales</span>
        </button>

        <button
          type="button"
          className={`stat-chip-btn ${filtroFibra === 'ALGODON' ? 'active' : ''}`}
          onClick={() => seleccionarFiltro('ALGODON')}
        >
          <span className="stat-chip-icon">🌿</span>
          <span className="stat-chip-value">
            {recetas.filter(r => r.composicionFibra === 'ALGODON').length}
          </span>
          <span className="stat-chip-label">Algodón</span>
        </button>

        <button
          type="button"
          className={`stat-chip-btn ${filtroFibra === 'NYLON' ? 'active' : ''}`}
          onClick={() => seleccionarFiltro('NYLON')}
        >
          <span className="stat-chip-icon">🔵</span>
          <span className="stat-chip-value">
            {recetas.filter(r => r.composicionFibra === 'NYLON').length}
          </span>
          <span className="stat-chip-label">Nylon</span>
        </button>

        <button
          type="button"
          className={`stat-chip-btn ${filtroFibra === 'POLIESTER' ? 'active' : ''}`}
          onClick={() => seleccionarFiltro('POLIESTER')}
        >
          <span className="stat-chip-icon">🟠</span>
          <span className="stat-chip-value">
            {recetas.filter(r => r.composicionFibra === 'POLIESTER').length}
          </span>
          <span className="stat-chip-label">Poliéster</span>
        </button>

        <button
          type="button"
          className={`stat-chip-btn ${filtroFibra === 'MULTIFIBRA' ? 'active' : ''}`}
          onClick={() => seleccionarFiltro('MULTIFIBRA')}
        >
          <span className="stat-chip-icon">🔀</span>
          <span className="stat-chip-value">
            {recetas.filter(r => r.composicionFibra.startsWith('MULTIFIBRA')).length}
          </span>
          <span className="stat-chip-label">Multifibra</span>
        </button>
      </div>

      {/* Grid */}
      {recetasFiltradas.length === 0 ? (
        busqueda.trim() ? (
          <div className="recetas-empty" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '48px', opacity: 0.3 }}>🔍</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '12px' }}>
              No se encontraron recetas con ese criterio
            </div>
          </div>
        ) : (
          <div className="recetas-empty">
            <div style={{ fontSize:'48px', opacity:0.3 }}>🧪</div>
            <div style={{ fontSize:'18px', fontWeight:600, color:'var(--text-secondary)' }}>
              No hay recetas que coincidan con este filtro
            </div>
            <div style={{ fontSize:'14px', color:'var(--text-muted)', maxWidth:'300px' }}>
              Prueba a seleccionar otro tipo de fibra o crea una nueva receta.
            </div>
            <button id="btn-ir-formulario-lab" type="button" className="btn btn-ghost-teal" onClick={onNuevaReceta}>
              🧪 Crear nueva receta
            </button>
          </div>
        )
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
      {/* Barra superior de color */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '8px',
          backgroundColor: receta.colorHex || '#E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '7px',
          zIndex: 5,
        }}
      >
        {!receta.colorHex && '📷'}
      </div>

      {/* Círculo de color grande (40px) */}
      {receta.colorHex && (
        <span
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: receta.colorHex,
            border: '2px solid #ffffff',
            boxShadow: 'var(--shadow-sm)',
            zIndex: 10,
          }}
          title={`Color de referencia: ${receta.colorHex}`}
        />
      )}

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
