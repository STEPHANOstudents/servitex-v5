// =============================================================================
// SERVITEX — Componente: TableroControl
// Dashboard de Órdenes guardadas representadas como Mini Cartillas
// Regla estricta: cada cartilla solo muestra Nombre del Cliente y Fecha
// =============================================================================
import React from 'react';
import type { OrdenCompraDB, OrdenResponse, LiquidacionOC } from '../types/ordenes';

interface TableroControlProps {
  ordenes: OrdenResponse[];
  onSeleccionarOrden: (orden: OrdenCompraDB, liquidacion: LiquidacionOC) => void;
  onNuevaOrden: () => void;
}

function formatearFechaCorta(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  return fecha.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const TableroControl: React.FC<TableroControlProps> = ({
  ordenes,
  onSeleccionarOrden,
  onNuevaOrden,
}) => {
  // Estadísticas rápidas
  const totalOrdenes = ordenes.length;
  const totalLotes = ordenes.reduce((acc, o) => acc + o.orden.detalles.length, 0);
  const totalFacturado = ordenes.reduce((acc, o) => acc + o.liquidacion.totalReal, 0);

  return (
    <div>
      {/* ===================================================================
          HEADER DEL TABLERO
          =================================================================== */}
      <div className="tablero-header">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">
            Tablero de <span>Control</span>
          </h1>
          <p className="page-subtitle">
            Órdenes de Compra registradas — Haz clic en una cartilla para ver el desglose financiero
          </p>
        </div>
        <button
          id="btn-nueva-orden"
          type="button"
          className="btn btn-primary"
          onClick={onNuevaOrden}
        >
          ＋ Nueva Orden
        </button>
      </div>

      {/* ===================================================================
          CHIPS DE ESTADÍSTICAS
          =================================================================== */}
      <div className="tablero-stats">
        <div className="stat-chip">
          <span className="stat-chip-icon">📋</span>
          <span className="stat-chip-value">{totalOrdenes}</span>
          <span className="stat-chip-label">Órdenes registradas</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip-icon">🎨</span>
          <span className="stat-chip-value">{totalLotes}</span>
          <span className="stat-chip-label">Lotes / teñidos</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip-icon">💰</span>
          <span className="stat-chip-value">S/ {totalFacturado.toFixed(2)}</span>
          <span className="stat-chip-label">Total facturado</span>
        </div>
      </div>

      {/* ===================================================================
          GRID DE MINI CARTILLAS
          =================================================================== */}
      {ordenes.length === 0 ? (
        <div className="tablero-empty">
          <div className="tablero-empty-icon">📭</div>
          <div className="tablero-empty-title">No hay órdenes registradas</div>
          <div className="tablero-empty-text">
            Regresa al formulario y guarda tu primera Orden de Compra para verla aquí.
          </div>
          <button
            id="btn-ir-formulario-empty"
            type="button"
            className="btn btn-ghost-teal"
            onClick={onNuevaOrden}
          >
            ＋ Registrar primera orden
          </button>
        </div>
      ) : (
        <div className="grid-cartillas">
          {ordenes.map((oc) => (
            <MiniCartilla
              key={oc.orden.id}
              orden={oc.orden}
              liquidacion={oc.liquidacion}
              onClick={() => onSeleccionarOrden(oc.orden, oc.liquidacion)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTE: MiniCartilla
// Regla estricta: SOLO muestra Nombre del Cliente y Fecha de Registro
// =============================================================================
interface MiniCartillaProps {
  orden: OrdenCompraDB;
  liquidacion: LiquidacionOC;
  onClick: () => void;
}

const MiniCartilla: React.FC<MiniCartillaProps> = ({ orden, onClick }) => {
  return (
    <div
      id={`cartilla-orden-${orden.id}`}
      className="mini-cartilla"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      aria-label={`Ver desglose financiero de ${orden.cliente.nombre}`}
    >
      {/* Badge de estado */}
      <div className="cartilla-badge">
        <div className="cartilla-badge-dot" />
        {orden.estado}
      </div>

      {/* DATO 1: Nombre del Cliente — único dato principal visible */}
      <div className="cartilla-cliente">
        {orden.cliente.nombre}
      </div>

      {/* Número de OC (referencia de negocio) */}
      <div className="cartilla-numero-oc">
        {orden.numeroOC}
      </div>

      {/* Footer de la cartilla */}
      <div className="cartilla-footer">
        {/* DATO 2: Fecha de Registro */}
        <div className="cartilla-fecha">
          📅 {formatearFechaCorta(orden.createdAt)}
        </div>

        {/* Indicador de lotes */}
        <div className="cartilla-lotes">
          🎨 {orden.detalles.length} lote{orden.detalles.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Hint de interacción */}
      <div className="cartilla-clic-hint">
        Clic para ver desglose financiero →
      </div>
    </div>
  );
};

export default TableroControl;
