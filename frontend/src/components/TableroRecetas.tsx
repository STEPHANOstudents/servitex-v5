// =============================================================================
// SERVITEX — Tablero Histórico de Recetas (Mini Cartas + Paginación)
// Regla: Mini Cartas muestran SOLO: Nombre del Color (negrita), Fecha,
//        Composición del artículo (fibra). Nada más.
// =============================================================================
import React, { useState, useEffect } from 'react';
import type { RecetaListItem, RecetaPreload } from '../types/recetas';
import { getFibraClase, getFibraLabel, getNivelClase } from '../types/recetas';
import { fetchCatalogos } from '../services/catalogosApi';
import type { Catalogos } from '../services/catalogosApi';

function getColoranteTipo(
  coloranteId: number,
  nombreColorante: string,
  catalogos: Catalogos | null
): 'REACTIVO' | 'ACIDO' | 'DISPERSO' {
  if (catalogos?.colorantesCatalogo) {
    const found = catalogos.colorantesCatalogo.find(c => c.id === coloranteId);
    if (found) return found.tipoColorante;
  }
  const name = nombreColorante.toLowerCase();
  if (name.includes('ramazol') || name.includes('reactive') || name.includes('reactivo') || name.includes('black b') || name.includes('yellow') || name.includes('blue') || name.includes('red')) {
    if (name.includes('ácido') || name.includes('acido') || name.includes('acid') || name.includes('nylon')) {
      return 'ACIDO';
    }
    if (name.includes('dispers') || name.includes('dianix') || name.includes('poliéster') || name.includes('poliester')) {
      return 'DISPERSO';
    }
    return 'REACTIVO';
  }
  if (name.includes('ácido') || name.includes('acido') || name.includes('acid') || name.includes('nylon') || name.includes('lanasol') || name.includes('erionyl')) {
    return 'ACIDO';
  }
  if (name.includes('dispers') || name.includes('dianix') || name.includes('poliéster') || name.includes('poliester')) {
    return 'DISPERSO';
  }
  return 'REACTIVO';
}

const POR_PAGINA = 12;

function formatFechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

interface TableroRecetasProps {
  recetas: RecetaListItem[];
  rol?: string;
  onSeleccionar: (id: number) => void;
  onNuevaReceta: () => void;
  onCopiarBase: (preload: RecetaPreload) => void;
}

const TableroRecetas: React.FC<TableroRecetasProps> = ({
  recetas, rol, onSeleccionar, onNuevaReceta, onCopiarBase,
}) => {
  const [filtroFibra, setFiltroFibra] = useState<'TODOS' | 'ALGODON' | 'NYLON' | 'POLIESTER' | 'MULTIFIBRA'>('TODOS');
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);

  useEffect(() => {
    fetchCatalogos().then(setCatalogos).catch(() => { /* catálogos opcionales para heurística de tipo */ });
  }, []);

  const seleccionarFiltro = (f: 'TODOS' | 'ALGODON' | 'NYLON' | 'POLIESTER' | 'MULTIFIBRA') => {
    setFiltroFibra(f);
    setPagina(1);
    setExpandedId(null);
  };

  const handleToggleExpand = (id: number) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const recetasFiltradas = recetas.filter(r => {

    if (filtroFibra !== 'TODOS') {
      if (filtroFibra === 'ALGODON' && r.composicionFibra !== 'ALGODON') return false;
      if (filtroFibra === 'NYLON' && r.composicionFibra !== 'NYLON') return false;
      if (filtroFibra === 'POLIESTER' && r.composicionFibra !== 'POLIESTER') return false;
      if (filtroFibra === 'MULTIFIBRA' && !r.composicionFibra.startsWith('MULTIFIBRA')) return false;
    }


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
      {/* Estilos locales para el cursor, el estado activo y las animaciones de expansión */}
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
        
        .carta-expanded-content {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 0.2s ease-out, opacity 0.2s ease-out;
        }
        .carta-expanded-content.expanded {
          max-height: 350px;
          opacity: 1;
        }
        
        .mini-carta-receta {
          transition: border-color var(--transition-slow), transform var(--transition-slow), box-shadow var(--transition-slow), background var(--transition-slow), padding var(--transition-slow);
        }
      `}</style>

      {/* Header */}
      <div className="tablero-recetas-header">
        <div>
          <h1 className="page-title">Lab <span>Histórico</span></h1>
          <p className="page-subtitle">
            {recetas.length} receta(s) registradas · Haz clic en una carta para ver sus colorantes y opciones
          </p>
        </div>
        {rol === 'PROPIETARIA' && (
          <button id="btn-nueva-receta" type="button" className="btn btn-primary" onClick={onNuevaReceta}>
            🧪 Nueva Receta
          </button>
        )}
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
            setExpandedId(null);
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
            <div style={{ fontSize: '48px', opacity: 0.3 }}>🧪</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              No hay recetas que coincidan con este filtro
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '300px' }}>
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
              <MiniCartaReceta
                key={r.id}
                receta={r}
                rol={rol}
                isExpanded={expandedId === r.id}
                onToggle={() => handleToggleExpand(r.id)}
                onVerDetalles={onSeleccionar}
                onCopiarBase={onCopiarBase}
                catalogos={catalogos}
              />
            ))}
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="paginacion">
              <button className="pag-btn" disabled={pagina === 1} onClick={() => { setPagina(p => p - 1); setExpandedId(null); }}>‹</button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                <button key={p} className={`pag-btn ${p === pagina ? 'active' : ''}`} onClick={() => { setPagina(p); setExpandedId(null); }}>
                  {p}
                </button>
              ))}
              <button className="pag-btn" disabled={pagina === totalPaginas} onClick={() => { setPagina(p => p + 1); setExpandedId(null); }}>›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTE: MiniCartaReceta
// Regla: Expansión inline. Muestra barra, círculo, badges, fecha y collapse/expand.
// =============================================================================
interface MiniCartaRecetaProps {
  receta: RecetaListItem;
  rol?: string;
  isExpanded: boolean;
  onToggle: () => void;
  onVerDetalles: (id: number) => void;
  onCopiarBase: (preload: RecetaPreload) => void;
  catalogos: Catalogos | null;
}

const MiniCartaReceta: React.FC<MiniCartaRecetaProps> = ({
  receta, rol, isExpanded, onToggle, onVerDetalles, onCopiarBase, catalogos,
}) => {
  const fibraClase = getFibraClase(receta.composicionFibra);
  const nivelClase = getNivelClase(receta.nivelIntensidad);

  return (
    <div
      id={`carta-receta-${receta.id}`}
      className={`mini-carta-receta ${isExpanded ? 'expanded' : ''}`}
      onClick={onToggle}
      role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onToggle(); }}
      aria-label={`Ver desglose de ${receta.descripcionColor}`}
      style={{
        paddingBottom: isExpanded ? '20px' : '36px',
        position: 'relative',
      }}
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
        {receta.composicionFibra === 'ALGODON' ? '🌿' :
          receta.composicionFibra === 'NYLON' ? '🔵' :
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
        <span className={`carta-nivel-chip intensidad-chip ${nivelClase}`} style={{ fontSize: '9px', padding: '2px 7px' }}>
          N{receta.nivelIntensidad}
        </span>
      </div>

      {/* ── CONTENIDO EXPANDIDO INLINE ── */}
      <div className={`carta-expanded-content ${isExpanded ? 'expanded' : ''}`}>
        <hr style={{ border: 0, borderTop: '1px solid var(--border-subtle)', margin: '12px 0' }} />

        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          <strong style={{ display: 'block', marginBottom: '6px', color: 'var(--text-primary)' }}>Colorantes:</strong>
          {!receta.composicionFibra.startsWith('MULTIFIBRA') ? (
            <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {receta.colorantes.map((c, i) => {
                return (
                  <li key={i} style={{ fontFamily: 'var(--font-base)', color: 'var(--text-secondary)' }}>
                    · {c.nombreColorante} {c.porcentaje.toFixed(4)}%
                  </li>
                );
              })}
            </ul>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(() => {
                const reactivos = receta.colorantes.filter(c => getColoranteTipo(c.coloranteId, c.nombreColorante, catalogos) === 'REACTIVO');
                const acidos = receta.colorantes.filter(c => getColoranteTipo(c.coloranteId, c.nombreColorante, catalogos) === 'ACIDO');
                const dispersos = receta.colorantes.filter(c => getColoranteTipo(c.coloranteId, c.nombreColorante, catalogos) === 'DISPERSO');

                /** Renderiza una sección de colorantes con su etiqueta de fibra. */
                const renderGrupo = (label: string, lista: typeof reactivos) =>
                  lista.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>[ {label} ]</div>
                      <ul style={{ listStyle: 'none', paddingLeft: 0, margin: '0 0 6px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {lista.map((c, i) => (
                          <li key={i} style={{ fontFamily: 'var(--font-base)', color: 'var(--text-secondary)', paddingLeft: '6px' }}>
                            · {c.nombreColorante} {c.porcentaje.toFixed(4)}%
                          </li>
                        ))}
                      </ul>
                    </div>
                  );

                return (
                  <>
                    {renderGrupo('Algodón', reactivos)}
                    {renderGrupo('Nylon', acidos)}
                    {renderGrupo('Poliéster', dispersos)}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            type="button"
            className="btn"
            style={{
              flex: 1,
              border: '1px solid var(--border-medium)',
              backgroundColor: '#ffffff',
              color: 'var(--text-primary)',
              fontSize: '12px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onVerDetalles(receta.id);
            }}
          >
            Ver detalles
          </button>

          {rol === 'PROPIETARIA' && (
            <button
              type="button"
              className="btn btn-primary"
              style={{
                flex: 1,
                backgroundColor: 'var(--accent-teal)',
                color: '#ffffff',
                border: 'none',
                fontSize: '12px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
              onClick={(e) => {
                e.stopPropagation();
                const preload: RecetaPreload = {
                  pesoRealKg: String(receta.pesoRealKg),
                  articulo: receta.articulo,
                  articuloId: receta.articuloId,
                  composicionFibra: receta.composicionFibra,
                  relacionBano: String(receta.relacionBano),
                  descripcionColor: receta.descripcionColor,
                  observacionesTecnicas: receta.observacionesTecnicas ?? '',
                  colorantes: receta.colorantes.map(col => ({
                    nombre: col.nombreColorante,
                    coloranteId: col.coloranteId,
                    porcentaje: String(col.porcentaje),
                  })),
                };
                onCopiarBase(preload);
              }}
            >
              Duplicar
            </button>
          )}
        </div>
      </div>

      {/* Flecha indicadora en la parte inferior */}
      <div
        style={{
          position: 'absolute',
          bottom: '4px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          pointerEvents: 'none',
          transition: 'transform 0.2s ease',
        }}
      >
        {isExpanded ? '∧' : '∨'}
      </div>
    </div>
  );
};

export { MiniCartaReceta };
export default TableroRecetas;
