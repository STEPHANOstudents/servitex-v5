// =============================================================================
// SERVITEX — App.tsx
// Orquestador principal: gestiona vista activa, estado global y toasts
// Vistas: 'formulario' | 'tablero' | 'lab-formulario' | 'lab-tablero'
// =============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import './index.css';
import './lab.css';
import FormularioOrden from './components/FormularioOrden';
import TableroControl from './components/TableroControl';
import ModalFinanciero from './components/ModalFinanciero';
import FormularioReceta from './components/FormularioReceta';
import TableroRecetas from './components/TableroRecetas';
import ModalDetalleReceta from './components/ModalDetalleReceta';
import { obtenerOrdenes } from './services/api';
import { obtenerRecetas, obtenerRecetaPorId } from './services/recetasApi';
import type {
  OrdenResponse, OrdenCompraDB, LiquidacionOC,
} from './types/ordenes';
import type { RecetaListItem, RecetaConMotor, RecetaPreload } from './types/recetas';

// ---------------------------------------------------------------------------
// Tipos locales
// ---------------------------------------------------------------------------
type Vista = 'formulario' | 'tablero' | 'lab-formulario' | 'lab-tablero';

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

  // ── Módulo 1: Órdenes ──
  const [ordenes, setOrdenes]               = useState<OrdenResponse[]>([]);
  const [cargandoOrdenes, setCargandoOrdenes] = useState(false);
  const [modalData, setModalData]           = useState<{
    orden: OrdenCompraDB; liquidacion: LiquidacionOC;
  } | null>(null);

  // ── Módulo 2: Recetas / Lab ──
  const [recetas, setRecetas]               = useState<RecetaListItem[]>([]);
  const [cargandoRecetas, setCargandoRecetas] = useState(false);
  const [modalReceta, setModalReceta]       = useState<RecetaConMotor | null>(null);
  const [recetaPreload, setRecetaPreload]   = useState<RecetaPreload | null>(null);

  // ── Toasts ──
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // ---------------------------------------------------------------------------
  // Carga inicial
  // ---------------------------------------------------------------------------
  useEffect(() => { cargarOrdenes(); cargarRecetas(); }, []);

  async function cargarOrdenes() {
    setCargandoOrdenes(true);
    try {
      const res = await obtenerOrdenes();
      setOrdenes(res.ordenes.map(orden => ({ orden, liquidacion: calcLiquidacion(orden) })));
    } catch { /* servidor puede estar apagado */ }
    finally { setCargandoOrdenes(false); }
  }

  async function cargarRecetas() {
    setCargandoRecetas(true);
    try {
      const lista = await obtenerRecetas();
      setRecetas(lista);
    } catch { /* silencioso */ }
    finally { setCargandoRecetas(false); }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function calcLiquidacion(orden: OrdenCompraDB): LiquidacionOC {
    const sub = orden.detalles.reduce((a, d) => a + d.total, 0);
    const igv = Math.round(sub * 0.18 * 100) / 100;
    return {
      subtotalVenta:  Math.round(sub * 100) / 100,
      igv,
      totalReal:      Math.round((sub + igv) * 100) / 100,
      cantidadLotes:  orden.detalles.length,
      metrosTotales:  Math.round(orden.detalles.reduce((a, d) => a + d.cantidad, 0) * 100) / 100,
    };
  }

  // ---------------------------------------------------------------------------
  // Módulo 1: Callbacks
  // ---------------------------------------------------------------------------
  const handleOrdenGuardada = useCallback((nueva: OrdenResponse) => {
    setOrdenes(prev => [nueva, ...prev]);
    setTimeout(() => setVista('tablero'), 800);
  }, []);

  const handleSeleccionarOrden = useCallback(
    (orden: OrdenCompraDB, liquidacion: LiquidacionOC) =>
      setModalData({ orden, liquidacion }),
    []
  );

  // ---------------------------------------------------------------------------
  // Módulo 2: Callbacks
  // ---------------------------------------------------------------------------
  const handleRecetaGuardada = useCallback((resultado: RecetaConMotor) => {
    // Añadir al tablero y abrir modal de resultado
    setRecetas(prev => [resultado.receta as RecetaListItem, ...prev]);
    setModalReceta(resultado);
  }, []);

  const handleSeleccionarReceta = useCallback(async (id: number) => {
    try {
      const data = await obtenerRecetaPorId(id);
      setModalReceta(data);
    } catch {
      agregarToast('error', 'No se pudo cargar el detalle de la receta.');
    }
  }, []);

  const handleCopiarBase = useCallback((preload: RecetaPreload) => {
    setModalReceta(null);
    setRecetaPreload(preload);
    setVista('lab-formulario');
    agregarToast('success', '📋 Datos cargados como base. Elige un nuevo lote y guarda.');
  }, []);

  // ---------------------------------------------------------------------------
  // Toasts
  // ---------------------------------------------------------------------------
  const agregarToast = useCallback((tipo: 'success' | 'error', mensaje: string) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => [...prev, { id, tipo, mensaje }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <div className="app-wrapper">

      {/* ============================================================
          NAVBAR
          ============================================================ */}
      <nav className="navbar" role="navigation" aria-label="Navegación principal">
        <div className="navbar-brand">
          <div className="navbar-logo">SX</div>
          <div>
            <div className="navbar-title">SERVITEX</div>
            <div className="navbar-subtitle">Sistema de Gestión Comercial</div>
          </div>
        </div>

        <div className="navbar-nav">
          {/* Módulo 1 */}
          <button id="nav-btn-formulario" type="button"
            className={`nav-btn ${vista === 'formulario' ? 'active' : ''}`}
            onClick={() => setVista('formulario')}>
            📋 Nueva OC
          </button>
          <button id="nav-btn-tablero" type="button"
            className={`nav-btn ${vista === 'tablero' ? 'active' : ''}`}
            onClick={() => setVista('tablero')}>
            📊 Tablero OC
            {ordenes.length > 0 && (
              <span style={{ marginLeft:'6px', background:'var(--accent-teal)', color:'#000', fontSize:'10px', fontWeight:'700', padding:'1px 6px', borderRadius:'99px' }}>
                {ordenes.length}
              </span>
            )}
          </button>

          {/* Separador visual */}
          <div className="nav-separator" />

          {/* Módulo 2: Lab */}
          <button id="nav-btn-lab-formulario" type="button"
            className={`nav-btn ${vista === 'lab-formulario' ? 'active' : ''}`}
            onClick={() => { setRecetaPreload(null); setVista('lab-formulario'); }}>
            🧪 Formulario Técnico
          </button>
          <button id="nav-btn-lab-tablero" type="button"
            className={`nav-btn ${vista === 'lab-tablero' ? 'active' : ''}`}
            onClick={() => setVista('lab-tablero')}>
            📚 Lab Histórico
            {recetas.length > 0 && (
              <span style={{ marginLeft:'6px', background:'var(--accent-purple)', color:'#fff', fontSize:'10px', fontWeight:'700', padding:'1px 6px', borderRadius:'99px' }}>
                {recetas.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* ============================================================
          CONTENIDO PRINCIPAL
          ============================================================ */}
      <main className="main-content" role="main">

        {/* ── Vista: Nueva Orden de Compra ── */}
        {vista === 'formulario' && (
          <div>
            <div className="page-header">
              <h1 className="page-title">Nueva <span>Orden de Compra</span></h1>
              <p className="page-subtitle">Registra la cabecera y los lotes de colores del pedido del cliente</p>
            </div>
            <FormularioOrden onOrdenGuardada={handleOrdenGuardada} onToast={agregarToast} />
          </div>
        )}

        {/* ── Vista: Tablero de Órdenes ── */}
        {vista === 'tablero' && (
          cargandoOrdenes ? (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'200px', gap:'14px', color:'var(--text-muted)' }}>
              <div className="spinner" style={{ borderTopColor:'var(--accent-teal)' }} />
              Cargando órdenes...
            </div>
          ) : (
            <TableroControl
              ordenes={ordenes}
              onSeleccionarOrden={handleSeleccionarOrden}
              onNuevaOrden={() => setVista('formulario')}
            />
          )
        )}

        {/* ── Vista: Formulario Técnico (Lab) ── */}
        {vista === 'lab-formulario' && (
          <div>
            <div className="page-header">
              <h1 className="page-title">🧪 Formulario <span>Técnico</span></h1>
              <p className="page-subtitle">
                Registra la receta de laboratorio — el sistema calcula los baños y gramos de químicos automáticamente
              </p>
            </div>
            <FormularioReceta
              preload={recetaPreload}
              onRecetaGuardada={handleRecetaGuardada}
              onToast={agregarToast}
            />
          </div>
        )}

        {/* ── Vista: Lab Histórico ── */}
        {vista === 'lab-tablero' && (
          cargandoRecetas ? (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'200px', gap:'14px', color:'var(--text-muted)' }}>
              <div className="spinner" style={{ borderTopColor:'var(--accent-purple)' }} />
              Cargando recetas...
            </div>
          ) : (
            <TableroRecetas
              recetas={recetas}
              onSeleccionar={handleSeleccionarReceta}
              onNuevaReceta={() => setVista('lab-formulario')}
            />
          )
        )}
      </main>

      {/* ============================================================
          MODAL FINANCIERO (Módulo 1)
          ============================================================ */}
      {modalData && (
        <ModalFinanciero
          orden={modalData.orden}
          liquidacion={modalData.liquidacion}
          onCerrar={() => setModalData(null)}
        />
      )}

      {/* ============================================================
          MODAL DETALLE RECETA (Módulo 2)
          ============================================================ */}
      {modalReceta && (
        <ModalDetalleReceta
          data={modalReceta}
          onCerrar={() => setModalReceta(null)}
          onCopiarBase={handleCopiarBase}
        />
      )}

      {/* ============================================================
          TOASTS
          ============================================================ */}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.tipo}`} role="alert">
            <span className="toast-icon">{toast.tipo === 'success' ? '✅' : '❌'}</span>
            <span className="toast-text">{toast.mensaje}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
