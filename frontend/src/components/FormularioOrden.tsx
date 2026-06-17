// =============================================================================
// SERVITEX — Componente: FormularioOrden
// Sección 1: Registro de Órdenes de Compra
// - Cabecera estática (Número OC, Cliente, Tipo desde catálogo)
// - Tabla dinámica de filas (+ Añadir otro color)
// - Resumen financiero en tiempo real
// - Botón "Guardar Orden Completa"
// =============================================================================
import React, { useState, useCallback, useEffect } from 'react';
import type { FilaDetalle, TipoClienteCodigo, CrearOrdenInput } from '../types/ordenes';
import FilaDetalleComponent from './FilaDetalle';
import { crearOrden } from '../services/api';
import { fetchCatalogos } from '../services/catalogosApi';
import type { OrdenResponse } from '../types/ordenes';
import type { TipoCliente, ArticuloTextil, Catalogos } from '../services/catalogosApi';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generarId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function filaVacia(): FilaDetalle {
  return {
    localId: generarId(),
    cantidad: '',
    articuloId: '',
    colorSolicitado: '',
    precioPorMetro: '',
  };
}

function calcularResumen(filas: FilaDetalle[]) {
  let subtotal = 0;
  for (const f of filas) {
    const c = parseFloat(f.cantidad);
    const p = parseFloat(f.precioPorMetro);
    if (!isNaN(c) && !isNaN(p) && c > 0 && p > 0) {
      subtotal += Math.round(c * p * 100) / 100;
    }
  }
  const igv = Math.round(subtotal * 0.18 * 100) / 100;
  const total = Math.round((subtotal + igv) * 100) / 100;
  return { subtotal, igv, total };
}

// Tipos cliente por defecto (fallback si el catálogo no carga)
const TIPOS_CLIENTE_DEFAULT: TipoCliente[] = [
  { id: 1, codigo: 'EMPRESA', etiqueta: 'Empresa' },
  { id: 2, codigo: 'PERSONA_NATURAL', etiqueta: 'Persona Natural' },
  { id: 3, codigo: 'TALLER_EXTERNO', etiqueta: 'Taller Externo' },
  { id: 4, codigo: 'DISTRIBUIDOR', etiqueta: 'Distribuidor' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface FormularioOrdenProps {
  onOrdenGuardada: (orden: OrdenResponse) => void;
  onToast: (tipo: 'success' | 'error', mensaje: string) => void;
  catalogos?: Catalogos | null;
}

// =============================================================================
// COMPONENTE
// =============================================================================
const FormularioOrden: React.FC<FormularioOrdenProps> = ({ onOrdenGuardada, onToast, catalogos: catalogosProp }) => {
  // --- Estado cabecera ---
  const [numeroOC, setNumeroOC] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [tipoClienteCodigo, setTipoClienteCodigo] = useState<TipoClienteCodigo>('EMPRESA');
  const [observaciones, setObservaciones] = useState('');

  // --- Estado tabla ---
  const [filas, setFilas] = useState<FilaDetalle[]>([filaVacia()]);

  // --- Estado UI ---
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  // --- Catálogos locales (puede ser pasados por prop o cargados aquí) ---
  const [tiposCliente, setTiposCliente] = useState<TipoCliente[]>(catalogosProp?.tiposCliente ?? TIPOS_CLIENTE_DEFAULT);
  const [articulosTextiles, setArticulosTextiles] = useState<ArticuloTextil[]>(catalogosProp?.articulosTextiles ?? []);

  useEffect(() => {
    if (catalogosProp) {
      setTiposCliente(catalogosProp.tiposCliente.length > 0 ? catalogosProp.tiposCliente : TIPOS_CLIENTE_DEFAULT);
      setArticulosTextiles(catalogosProp.articulosTextiles);
    } else {
      // Cargar catálogos si no fueron provistos por prop
      fetchCatalogos().then(cat => {
        setTiposCliente(cat.tiposCliente.length > 0 ? cat.tiposCliente : TIPOS_CLIENTE_DEFAULT);
        setArticulosTextiles(cat.articulosTextiles);
      }).catch(() => {
        // Mantener defaults
      });
    }
  }, [catalogosProp]);

  // ---------------------------------------------------------------------------
  // Manejadores de la tabla dinámica
  // ---------------------------------------------------------------------------
  const handleCambioFila = useCallback(
    (localId: string, campo: keyof Omit<FilaDetalle, 'localId'>, valor: string) => {
      setFilas((prev) =>
        prev.map((f) => (f.localId === localId ? { ...f, [campo]: valor } : f))
      );
    },
    []
  );

  const handleAgregarFila = useCallback(() => {
    setFilas((prev) => [...prev, filaVacia()]);
  }, []);

  const handleEliminarFila = useCallback((localId: string) => {
    setFilas((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((f) => f.localId !== localId);
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Validación del formulario
  // ---------------------------------------------------------------------------
  function validar(): boolean {
    const nuevosErrores: Record<string, string> = {};

    if (!numeroOC.trim()) {
      nuevosErrores['numeroOC'] = 'El número de OC es obligatorio.';
    }
    if (!clienteNombre.trim()) {
      nuevosErrores['clienteNombre'] = 'El nombre del cliente es obligatorio.';
    }

    filas.forEach((f, i) => {
      const c = parseFloat(f.cantidad);
      const p = parseFloat(f.precioPorMetro);

      if (!f.cantidad || isNaN(c) || c <= 0) {
        nuevosErrores[`fila_${i}_cantidad`] = `Fila ${i + 1}: cantidad inválida.`;
      }
      if (!f.articuloId) {
        nuevosErrores[`fila_${i}_articulo`] = `Fila ${i + 1}: artículo requerido.`;
      }
      if (!f.colorSolicitado.trim()) {
        nuevosErrores[`fila_${i}_color`] = `Fila ${i + 1}: color requerido.`;
      }
      if (!f.precioPorMetro || isNaN(p) || p <= 0) {
        nuevosErrores[`fila_${i}_precio`] = `Fila ${i + 1}: precio inválido.`;
      }
    });

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  // ---------------------------------------------------------------------------
  // Envío al backend
  // ---------------------------------------------------------------------------
  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();

    if (!validar()) {
      onToast('error', 'Corrige los errores antes de guardar.');
      return;
    }

    setGuardando(true);
    setErrores({});

    try {
      const payload: CrearOrdenInput = {
        numeroOC: numeroOC.trim().toUpperCase(),
        clienteNombre: clienteNombre.trim(),
        tipoClienteCodigo,
        observaciones: observaciones.trim() || undefined,
        detalles: filas.map((f) => ({
          cantidad: parseFloat(f.cantidad),
          articuloId: parseInt(f.articuloId),
          colorSolicitado: f.colorSolicitado.trim(),
          precioPorMetro: parseFloat(f.precioPorMetro),
        })),
      };

      const resultado = await crearOrden(payload);

      onToast('success', `✅ OC "${resultado.orden.numeroOC}" guardada exitosamente.`);
      onOrdenGuardada(resultado);

      // Limpiar el formulario
      setNumeroOC('');
      setClienteNombre('');
      setTipoClienteCodigo('EMPRESA');
      setObservaciones('');
      setFilas([filaVacia()]);
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido.';
      onToast('error', `❌ ${mensaje}`);
    } finally {
      setGuardando(false);
    }
  }

  const resumen = calcularResumen(filas);
  const tieneErrores = Object.keys(errores).length > 0;

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <form onSubmit={handleGuardar} noValidate>

      {/* =====================================================================
          CABECERA ESTÁTICA
          ===================================================================== */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <div className="card-icon">📋</div>
          <div>
            <div className="card-title">Datos de la Orden</div>
            <div className="card-desc">Información fija del pedido comercial</div>
          </div>
        </div>

        <div className="form-grid">
          {/* Número de Orden de Compra */}
          <div className="form-group">
            <label className="form-label" htmlFor="input-numero-oc">
              Número de Orden de Compra <span className="required">*</span>
            </label>
            <input
              id="input-numero-oc"
              type="text"
              className="form-input"
              placeholder="Ej: OC-2026-0045"
              value={numeroOC}
              onChange={(e) => setNumeroOC(e.target.value)}
              style={errores['numeroOC'] ? { borderColor: 'var(--accent-red)' } : {}}
              autoComplete="off"
            />
            {errores['numeroOC'] && (
              <span style={{ fontSize: '11px', color: 'var(--accent-red)' }}>
                {errores['numeroOC']}
              </span>
            )}
          </div>

          {/* Tipo de Cliente — desde catálogo */}
          <div className="form-group">
            <label className="form-label" htmlFor="select-tipo-cliente">
              Tipo de Cliente <span className="required">*</span>
            </label>
            <select
              id="select-tipo-cliente"
              className="form-input form-select"
              value={tipoClienteCodigo}
              onChange={(e) => setTipoClienteCodigo(e.target.value as TipoClienteCodigo)}
            >
              {tiposCliente.map((t) => (
                <option key={t.id} value={t.codigo}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
          </div>

          {/* Nombre del Cliente */}
          <div className="form-group full-width">
            <label className="form-label" htmlFor="input-cliente-nombre">
              Nombre del Cliente <span className="required">*</span>
            </label>
            <input
              id="input-cliente-nombre"
              type="text"
              className="form-input"
              placeholder="Nombre completo o razón social"
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              style={errores['clienteNombre'] ? { borderColor: 'var(--accent-red)' } : {}}
              autoComplete="off"
            />
            {errores['clienteNombre'] && (
              <span style={{ fontSize: '11px', color: 'var(--accent-red)' }}>
                {errores['clienteNombre']}
              </span>
            )}
          </div>

          {/* Observaciones (opcional) */}
          <div className="form-group full-width">
            <label className="form-label" htmlFor="input-observaciones">
              Observaciones Generales <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span>
            </label>
            <input
              id="input-observaciones"
              type="text"
              className="form-input"
              placeholder="Ej: Cliente paga al contado. Entrega urgente."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* =====================================================================
          TABLA DINÁMICA DE DETALLES
          ===================================================================== */}
      <div className="card">
        <div className="card-header">
          <div className="card-icon">🎨</div>
          <div>
            <div className="card-title">Detalle de Colores / Lotes</div>
            <div className="card-desc">
              {filas.length} lote{filas.length !== 1 ? 's' : ''} · Unidad fija: Metros
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="tabla-wrapper">
          <table className="tabla-detalle">
            <thead>
              <tr>
                <th className="col-num">#</th>
                <th className="col-cantidad">Cantidad (m)</th>
                <th className="col-unidad">Unidad</th>
                <th className="col-descripcion">Artículo</th>
                <th className="col-color">Color Solicitado</th>
                <th className="col-precio">Precio / Metro</th>
                <th className="col-total" style={{ textAlign: 'right' }}>Subtotal</th>
                <th className="col-accion"></th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, i) => (
                <FilaDetalleComponent
                  key={fila.localId}
                  fila={fila}
                  indice={i}
                  totalFilas={filas.length}
                  articulos={articulosTextiles}
                  onChange={handleCambioFila}
                  onEliminar={handleEliminarFila}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Errores de filas */}
        {tieneErrores && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 'var(--radius-md)',
            fontSize: '12px',
            color: 'var(--accent-red)',
            marginTop: '8px',
            lineHeight: 1.7,
          }}>
            {Object.values(errores).map((e, i) => (
              <div key={i}>• {e}</div>
            ))}
          </div>
        )}

        {/* Botón + Añadir otro color */}
        <div style={{ marginTop: '14px' }}>
          <button
            id="btn-anadir-color"
            type="button"
            className="btn btn-ghost-teal"
            onClick={handleAgregarFila}
            disabled={guardando}
          >
            <span>＋</span>
            Añadir otro color
          </button>
        </div>

        {/* Resumen financiero en tiempo real */}
        {resumen.subtotal > 0 && (
          <div className="resumen-rapido">
            <div className="resumen-panel">
              <div className="resumen-row">
                <span className="resumen-label">Subtotal General</span>
                <span className="resumen-value">S/ {resumen.subtotal.toFixed(2)}</span>
              </div>
              <div className="resumen-row">
                <span className="resumen-label">IGV (18%)</span>
                <span className="resumen-value">S/ {resumen.igv.toFixed(2)}</span>
              </div>
              <div className="resumen-divider" />
              <div className="resumen-total-row">
                <span className="resumen-total-label">Total Real a Pagar</span>
                <span className="resumen-total-value">S/ {resumen.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Separador y botón guardar */}
        <div className="form-actions">
          <div className="form-actions-left">
            <button
              id="btn-limpiar-formulario"
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setFilas([filaVacia()]);
                setNumeroOC('');
                setClienteNombre('');
                setTipoClienteCodigo('EMPRESA');
                setObservaciones('');
                setErrores({});
              }}
              disabled={guardando}
            >
              🗑 Limpiar
            </button>
          </div>

          <button
            id="btn-guardar-orden"
            type="submit"
            className="btn btn-guardar"
            disabled={guardando}
            style={{ width: 'auto', minWidth: '240px' }}
          >
            {guardando ? (
              <>
                <div className="spinner" />
                Guardando...
              </>
            ) : (
              <>
                💾 Guardar Orden Completa
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default FormularioOrden;
