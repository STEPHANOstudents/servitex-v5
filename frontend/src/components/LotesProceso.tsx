// =============================================================================
// SERVITEX — Componente: LotesProceso
// Vista del módulo Lab que lista las recetas técnicas activas
// (estado FORMULACION o PROCESO). Permite iniciar un ajuste de colorantes
// desde cualquier lote, buscando por color, artículo, cliente o N° de OC.
// =============================================================================
import React, { useState, useEffect } from 'react';
import { obtenerRecetas } from '../services/recetasApi';
import type { RecetaListItem } from '../types/recetas';
import { getFibraClase, getFibraLabel } from '../types/recetas';

interface LotesProcesoProps {
  onSeleccionarAjuste: (id: number) => void;
  onNuevaReceta: () => void;
  onToast: (tipo: 'success' | 'error', msg: string) => void;
}

const LotesProceso: React.FC<LotesProcesoProps> = ({
  onSeleccionarAjuste,
  onNuevaReceta,
  onToast,
}) => {
  const [recetas, setRecetas] = useState<RecetaListItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const cargarRecetasProceso = async () => {
    setCargando(true);
    try {
      const totalRecetas = await obtenerRecetas();
      const activas = totalRecetas.filter(
        (r) => r.estado === 'FORMULACION' || r.estado === 'PROCESO'
      );
      setRecetas(activas);
    } catch (err) {
      onToast('error', 'No se pudieron cargar los lotes en proceso.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarRecetasProceso();
  }, []);

  const recetasFiltradas = recetas.filter((r) => {
    const term = busqueda.toLowerCase();
    const matchesColor = r.descripcionColor.toLowerCase().includes(term);
    const matchesArticulo = r.articulo.toLowerCase().includes(term);
    const matchesLote = r.lote?.numeroOC.toLowerCase().includes(term) || r.lote?.cliente.toLowerCase().includes(term);
    return matchesColor || matchesArticulo || matchesLote;
  });

  return (
    <div>
      {/* Header */}
      <div className="tablero-recetas-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title">Lotes en <span>Proceso</span></h1>
          <p className="page-subtitle">
            Seguimiento de lotes activos de laboratorio en estado de Formulación o Ajustes de color.
          </p>
        </div>
        <button
          id="btn-nuevo-lote-proceso"
          type="button"
          className="btn btn-primary"
          onClick={onNuevaReceta}
        >
          🧪 Crear Nueva Receta
        </button>
      </div>

      {/* Buscador */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por color, artículo, cliente o número de OC..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ paddingLeft: '36px', width: '100%' }}
          />
        </div>
      </div>

      {/* Grid de lotes */}
      {cargando ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', gap: '14px', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ borderTopColor: 'var(--accent-teal)' }} />
          Cargando lotes en proceso...
        </div>
      ) : recetasFiltradas.length === 0 ? (
        <div className="recetas-empty" style={{ padding: '40px' }}>
          <div style={{ fontSize: '48px', opacity: 0.3 }}>⏳</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '12px' }}>
            No hay lotes activos en proceso
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '400px', margin: '8px auto' }}>
            Todos los lotes se encuentran aprobados (Lab Histórico) o aún no tienen una receta técnica inicial formulada.
          </div>
          <button type="button" className="btn btn-ghost-teal" onClick={onNuevaReceta} style={{ marginTop: '12px' }}>
            Formular primer lote
          </button>
        </div>
      ) : (
        <div className="grid-cartas-receta">
          {recetasFiltradas.map((r) => {
            const fibraClase = getFibraClase(r.composicionFibra);
            const iteracionesCount = Array.isArray(r.iteraciones) ? r.iteraciones.length : 1;
            const ultimoIteracion = Array.isArray(r.iteraciones) && r.iteraciones.length > 0 
              ? r.iteraciones[r.iteraciones.length - 1] 
              : null;
            
            return (
              <div
                key={r.id}
                id={`lote-proceso-${r.id}`}
                className="mini-carta-receta"
                style={{ borderLeft: r.estado === 'FORMULACION' ? '4px solid var(--accent-gold)' : '4px solid var(--accent-teal)' }}
                onClick={() => onSeleccionarAjuste(r.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSeleccionarAjuste(r.id); }}
                aria-label={`Ajustar lote de color ${r.descripcionColor}`}
              >
                {/* Cabecera de la tarjeta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div className={`carta-fibra-badge ${fibraClase}`}>
                    {r.composicionFibra === 'ALGODON' ? '🌿' :
                     r.composicionFibra === 'NYLON' ? '🔵' :
                     r.composicionFibra === 'POLIESTER' ? '🟠' : '🔀'}
                    &nbsp;{getFibraLabel(r.composicionFibra)}
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: r.estado === 'FORMULACION' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(20, 184, 166, 0.1)',
                      color: r.estado === 'FORMULACION' ? 'var(--accent-gold)' : 'var(--accent-teal)',
                      border: '1px solid',
                      borderColor: r.estado === 'FORMULACION' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(20, 184, 166, 0.2)'
                    }}
                  >
                    {r.estado === 'FORMULACION' ? 'En Formulación' : 'En Proceso'}
                  </span>
                </div>

                {/* Color (Principal) */}
                <div className="carta-color-nombre" style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {r.descripcionColor}
                </div>

                {/* Artículo */}
                <div className="carta-articulo" style={{ margin: '4px 0 12px 0', fontSize: '13px' }}>
                  {r.articulo}
                </div>

                {/* Información de Iteración y Cliente */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  {r.lote && (
                    <div>
                      <strong>OC:</strong> {r.lote.numeroOC} &middot; <strong>Clt:</strong> {r.lote.cliente}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span><strong>Iteración:</strong> {iteracionesCount}</span>
                    <span style={{ fontSize: '10px', fontStyle: 'italic', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ultimoIteracion?.observacion || 'Sin observaciones'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LotesProceso;
