// =============================================================================
// SERVITEX — Componente: ModalFinanciero
// Modal flotante con el desglose financiero completo de una OC
// =============================================================================
import React, { useEffect } from 'react';
import type { OrdenCompraDB, LiquidacionOC } from '../types/ordenes';

interface ModalFinancieroProps {
  orden: OrdenCompraDB;
  liquidacion: LiquidacionOC;
  onCerrar: () => void;
}

function formatearFecha(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  return fecha.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

const ModalFinanciero: React.FC<ModalFinancieroProps> = ({
  orden,
  liquidacion,
  onCerrar,
}) => {
  // Cerrar con ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCerrar]);

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titulo"
    >
      {/* Estilos locales para el desglose y totales de liquidación */}
      <style>{`
        .modal-totales {
          background-color: #f8fafc;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px 20px;
          margin-top: 20px;
        }
        .totales-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .totales-row:last-of-type {
          margin-bottom: 0;
        }
        .totales-row-label {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .totales-row-value {
          font-size: 14px;
          color: var(--text-primary);
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .totales-divider {
          height: 1px;
          background-color: var(--border-subtle);
          margin: 12px 0;
        }
        .totales-final {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-top: 6px;
        }
        .totales-final-label {
          font-size: 14px;
          color: var(--text-primary);
          font-weight: 700;
          line-height: 1.4;
        }
        .totales-final-value {
          font-size: 18px;
          color: var(--accent-teal);
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }
        .desglose-seccion-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }
        .desglose-lista {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 200px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .desglose-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background-color: #ffffff;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          transition: var(--transition);
        }
        .desglose-item:hover {
          border-color: var(--border-medium);
          background-color: var(--bg-surface);
        }
        .desglose-color {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .desglose-detalle {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .desglose-item-precio {
          font-size: 14px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
      `}</style>

      <div className="modal-panel" style={{ maxWidth: '520px', width: '95%' }}>
        {/* Barra de color superior */}
        <div className="modal-top-bar" />

        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-info">
            <h2 className="modal-title" id="modal-titulo">
              {orden.cliente.nombre}
            </h2>
            <div className="modal-subtitle">
              OC #{orden.numeroOC} &nbsp;·&nbsp; {formatearFecha(orden.createdAt)}
            </div>
          </div>
          <button
            id="btn-cerrar-modal"
            type="button"
            className="modal-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* ================================================================
              DESGLOSE LINEAL POR COLOR
              ================================================================ */}
          <div className="desglose-seccion-label">
            📦 Desglose por lote / color ({orden.detalles.length} ítems)
          </div>

          <div className="desglose-lista">
            {orden.detalles.map((detalle, idx) => (
              <div className="desglose-item" key={detalle.id}>
                <div className="desglose-item-left">
                  <div className="desglose-color">{detalle.colorSolicitado}</div>
                  <div className="desglose-detalle">
                    {detalle.articulo.nombre} &nbsp;·&nbsp; {detalle.cantidad.toFixed(2)} m × S/ {detalle.precioPorMetro.toFixed(2)}
                  </div>
                </div>
                <div
                  className="desglose-item-precio"
                  style={{
                    color: idx % 2 === 0 ? 'var(--accent-teal)' : 'var(--accent-purple)',
                  }}
                >
                  S/ {detalle.total.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* ================================================================
              TOTALES FINANCIEROS
              ================================================================ */}
          <div className="modal-totales">
            {/* Subtotal */}
            <div className="totales-row">
              <span className="totales-row-label">Subtotal General (Valor Venta)</span>
              <span className="totales-row-value">S/ {liquidacion.subtotalVenta.toFixed(2)}</span>
            </div>

            {/* IGV 18% */}
            <div className="totales-row">
              <span className="totales-row-label">IGV (18%)</span>
              <span className="totales-row-value">S/ {liquidacion.igv.toFixed(2)}</span>
            </div>

            {/* Metros totales */}
            <div className="totales-row">
              <span className="totales-row-label">Total metros procesados</span>
              <span className="totales-row-value">{liquidacion.metrosTotales.toFixed(2)} m</span>
            </div>

            <div className="totales-divider" />

            {/* Total Real a Pagar — destacado */}
            <div className="totales-final">
              <span className="totales-final-label">
                Total Real a Pagar
                <br />
                <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)' }}>
                  Monto Facturado (Subtotal + IGV)
                </span>
              </span>
              <span className="totales-final-value">S/ {liquidacion.totalReal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <button
            id="btn-cerrar-modal-footer"
            type="button"
            className="btn btn-secondary"
            onClick={onCerrar}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalFinanciero;
