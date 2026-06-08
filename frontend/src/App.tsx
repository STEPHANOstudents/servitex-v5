// =============================================================================
// SERVITEX — App.tsx
// Orquestador principal: gestiona vista activa, estado global y toasts
// Vistas: 'formulario' | 'tablero'
// =============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import './index.css';
import FormularioOrden from './components/FormularioOrden';
import TableroControl from './components/TableroControl';
import ModalFinanciero from './components/ModalFinanciero';
import { obtenerOrdenes } from './services/api';
import type {
  OrdenResponse,
  OrdenCompraDB,
  LiquidacionOC,
} from './types/ordenes';

// ---------------------------------------------------------------------------
// Tipos locales
// ---------------------------------------------------------------------------
type Vista = 'formulario' | 'tablero';

interface ToastMessage {
  id: string;
  tipo: 'success' | 'error';
  mensaje: string;
}

// =============================================================================
// APP
// =============================================================================
const App: React.FC = () => {
  // --- Vista activa ---
  const [vista, setVista] = useState<Vista>('formulario');

  // --- Órdenes en memoria (session) ---
  const [ordenes, setOrdenes] = useState<OrdenResponse[]>([]);
  const [cargandoOrdenes, setCargandoOrdenes] = useState(false);

  // --- Modal financiero ---
  const [modalData, setModalData] = useState<{
    orden: OrdenCompraDB;
    liquidacion: LiquidacionOC;
  } | null>(null);

  // --- Toasts ---
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // ---------------------------------------------------------------------------
  // Cargar órdenes desde el backend al iniciar
  // ---------------------------------------------------------------------------
  useEffect(() => {
    cargarOrdenes();
  }, []);

  async function cargarOrdenes() {
    setCargandoOrdenes(true);
    try {
      const resultado = await obtenerOrdenes();
      // Construimos OrdenResponse[] desde la respuesta paginada
      // El backend devuelve ordenes con detalles anidados pero sin liquidación en lista
      // Calculamos la liquidación en el cliente para el tablero
      const ordenesConLiquidacion: OrdenResponse[] = resultado.ordenes.map((orden) => ({
        orden,
        liquidacion: calcularLiquidacionLocal(orden),
      }));
      setOrdenes(ordenesConLiquidacion);
    } catch {
      // Silencioso — el backend puede no estar activo aún
    } finally {
      setCargandoOrdenes(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Cálculo de liquidación en el cliente (para el tablero al cargar)
  // ---------------------------------------------------------------------------
  function calcularLiquidacionLocal(orden: OrdenCompraDB): LiquidacionOC {
    const subtotalVenta = orden.detalles.reduce((acc, d) => acc + d.total, 0);
    const igv = Math.round(subtotalVenta * 0.18 * 100) / 100;
    const totalReal = Math.round((subtotalVenta + igv) * 100) / 100;
    const metrosTotales = orden.detalles.reduce((acc, d) => acc + d.cantidad, 0);
    return {
      subtotalVenta: Math.round(subtotalVenta * 100) / 100,
      igv,
      totalReal,
      cantidadLotes: orden.detalles.length,
      metrosTotales: Math.round(metrosTotales * 100) / 100,
    };
  }

  // ---------------------------------------------------------------------------
  // Callback: orden guardada exitosamente
  // ---------------------------------------------------------------------------
  const handleOrdenGuardada = useCallback((nuevaOrden: OrdenResponse) => {
    setOrdenes((prev) => [nuevaOrden, ...prev]);
    // Ir al tablero después de guardar
    setTimeout(() => setVista('tablero'), 800);
  }, []);

  // ---------------------------------------------------------------------------
  // Callback: abrir modal financiero
  // ---------------------------------------------------------------------------
  const handleSeleccionarOrden = useCallback(
    (orden: OrdenCompraDB, liquidacion: LiquidacionOC) => {
      setModalData({ orden, liquidacion });
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Toasts
  // ---------------------------------------------------------------------------
  const agregarToast = useCallback((tipo: 'success' | 'error', mensaje: string) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, tipo, mensaje }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <div className="app-wrapper">

      {/* =================================================================
          NAVBAR
          ================================================================= */}
      <nav className="navbar" role="navigation" aria-label="Navegación principal">
        <div className="navbar-brand">
          <div className="navbar-logo">SX</div>
          <div>
            <div className="navbar-title">SERVITEX</div>
            <div className="navbar-subtitle">Sistema de Gestión Comercial</div>
          </div>
        </div>

        <div className="navbar-nav">
          <button
            id="nav-btn-formulario"
            type="button"
            className={`nav-btn ${vista === 'formulario' ? 'active' : ''}`}
            onClick={() => setVista('formulario')}
          >
            📋 Nueva Orden
          </button>
          <button
            id="nav-btn-tablero"
            type="button"
            className={`nav-btn ${vista === 'tablero' ? 'active' : ''}`}
            onClick={() => setVista('tablero')}
          >
            📊 Tablero
            {ordenes.length > 0 && (
              <span style={{
                marginLeft: '6px',
                background: 'var(--accent-teal)',
                color: '#000',
                fontSize: '10px',
                fontWeight: '700',
                padding: '1px 6px',
                borderRadius: '99px',
              }}>
                {ordenes.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* =================================================================
          CONTENIDO PRINCIPAL
          ================================================================= */}
      <main className="main-content" role="main">

        {/* Vista: Formulario de Nueva Orden */}
        {vista === 'formulario' && (
          <div>
            <div className="page-header">
              <h1 className="page-title">
                Nueva <span>Orden de Compra</span>
              </h1>
              <p className="page-subtitle">
                Registra la cabecera y los lotes de colores del pedido del cliente
              </p>
            </div>
            <FormularioOrden
              onOrdenGuardada={handleOrdenGuardada}
              onToast={agregarToast}
            />
          </div>
        )}

        {/* Vista: Tablero de Control */}
        {vista === 'tablero' && (
          <>
            {cargandoOrdenes ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '200px',
                gap: '14px',
                color: 'var(--text-muted)',
              }}>
                <div className="spinner" style={{ borderTopColor: 'var(--accent-teal)' }} />
                Cargando órdenes...
              </div>
            ) : (
              <TableroControl
                ordenes={ordenes}
                onSeleccionarOrden={handleSeleccionarOrden}
                onNuevaOrden={() => setVista('formulario')}
              />
            )}
          </>
        )}
      </main>

      {/* =================================================================
          MODAL FINANCIERO
          ================================================================= */}
      {modalData && (
        <ModalFinanciero
          orden={modalData.orden}
          liquidacion={modalData.liquidacion}
          onCerrar={() => setModalData(null)}
        />
      )}

      {/* =================================================================
          TOAST NOTIFICATIONS
          ================================================================= */}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast ${toast.tipo}`}
            role="alert"
          >
            <span className="toast-icon">
              {toast.tipo === 'success' ? '✅' : '❌'}
            </span>
            <span className="toast-text">{toast.mensaje}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
