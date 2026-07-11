// =============================================================================
// SERVITEX — Componente: FormularioOrden
// Sección 1: Registro de Órdenes de Compra
// =============================================================================
import React, { useState, useCallback, useEffect } from 'react';
import type { FilaDetalle, TipoClienteCodigo, CrearOrdenInput, ClienteDB } from '../types/ordenes';
import FilaDetalleComponent from './FilaDetalle';
import { crearOrden, fetchClientes, crearCliente } from '../services/api';
import { fetchCatalogos } from '../services/catalogosApi';
import type { OrdenResponse } from '../types/ordenes';
import type { TipoCliente, Catalogos } from '../services/catalogosApi';

function generarId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function filaVacia(): FilaDetalle {
  return {
    localId: generarId(),
    cantidad: '',
    articuloNombre: '',
    colorSolicitado: '',
    precioPorMetro: '',
  };
}

function calcularTotalGeneral(filas: FilaDetalle[]): number {
  let total = 0;
  for (const f of filas) {
    const c = parseFloat(f.cantidad);
    const p = parseFloat(f.precioPorMetro);
    if (!isNaN(c) && !isNaN(p) && c > 0 && p > 0) {
      total += Math.round(c * p * 100) / 100;
    }
  }
  return total;
}

const TIPOS_CLIENTE_DEFAULT: TipoCliente[] = [
  { id: 1, codigo: 'EMPRESA', etiqueta: 'Empresa' },
  { id: 2, codigo: 'PERSONA_NATURAL', etiqueta: 'Persona Natural' },
  { id: 3, codigo: 'TALLER_EXTERNO', etiqueta: 'Taller Externo' },
  { id: 4, codigo: 'DISTRIBUIDOR', etiqueta: 'Distribuidor' },
];

interface FormularioOrdenProps {
  onOrdenGuardada: (orden: OrdenResponse) => void;
  onToast: (tipo: 'success' | 'error', mensaje: string) => void;
  catalogos?: Catalogos | null;
}

const FormularioOrden: React.FC<FormularioOrdenProps> = ({
  onOrdenGuardada,
  onToast,
  catalogos: catalogosProp,
}) => {
  const [numeroOC, setNumeroOC] = useState('');
  const [clienteIdSelect, setClienteIdSelect] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [clientes, setClientes] = useState<ClienteDB[]>([]);
  const [tiposCliente, setTiposCliente] = useState<TipoCliente[]>(catalogosProp?.tiposCliente ?? TIPOS_CLIENTE_DEFAULT);

  const [filas, setFilas] = useState<FilaDetalle[]>([filaVacia()]);

  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  // --- Estados del Modal de Cliente ---
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('');
  const [nuevoClienteTipo, setNuevoClienteTipo] = useState<TipoClienteCodigo>('EMPRESA');
  const [nuevoClienteRuc, setNuevoClienteRuc] = useState('');
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState('');
  const [guardandoCliente, setGuardandoCliente] = useState(false);

  // --- Cargar catálogos e inicializar clientes ---
  useEffect(() => {
    // 1. Cargar catálogo de tipos de clientes
    if (catalogosProp) {
      setTiposCliente(catalogosProp.tiposCliente.length > 0 ? catalogosProp.tiposCliente : TIPOS_CLIENTE_DEFAULT);
    } else {
      fetchCatalogos()
        .then((cat) => {
          setTiposCliente(cat.tiposCliente.length > 0 ? cat.tiposCliente : TIPOS_CLIENTE_DEFAULT);
        })
        .catch(() => {
          // Mantener defaults
        });
    }

    // 2. Cargar clientes registrados en la BD
    fetchClientes()
      .then(setClientes)
      .catch(() => {
        onToast('error', 'No se pudieron cargar los clientes de la base de datos.');
      });
  }, [catalogosProp, onToast]);

  // ---------------------------------------------------------------------------
  // Manejadores del cliente dropdown y modal
  // ---------------------------------------------------------------------------
  const handleClienteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'ADD_NEW') {
      setMostrarModalCliente(true);
      setClienteIdSelect('');
    } else {
      setClienteIdSelect(val);
    }
  };

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
    if (!clienteIdSelect) {
      nuevosErrores['clienteIdSelect'] = 'Debe seleccionar un cliente.';
    }

    filas.forEach((f, i) => {
      const c = parseFloat(f.cantidad);
      const p = parseFloat(f.precioPorMetro);

      if (!f.cantidad || isNaN(c) || c <= 0) {
        nuevosErrores[`fila_${i}_cantidad`] = `Fila ${i + 1}: cantidad inválida.`;
      }
      if (!f.articuloNombre || !f.articuloNombre.trim()) {
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

    const clienteSeleccionado = clientes.find((c) => String(c.id) === clienteIdSelect);
    if (!clienteSeleccionado) {
      onToast('error', 'Cliente seleccionado no válido.');
      return;
    }

    setGuardando(true);
    setErrores({});

    try {
      const payload: CrearOrdenInput = {
        numeroOC: numeroOC.trim().toUpperCase(),
        clienteNombre: clienteSeleccionado.nombre,
        tipoClienteCodigo: clienteSeleccionado.tipoCliente.codigo as TipoClienteCodigo,
        observaciones: observaciones.trim() || undefined,
        detalles: filas.map((f) => ({
          cantidad: parseFloat(f.cantidad),
          articuloNombre: f.articuloNombre.trim(),
          colorSolicitado: f.colorSolicitado.trim(),
          precioPorMetro: parseFloat(f.precioPorMetro),
        })),
      };

      const resultado = await crearOrden(payload);

      onToast('success', `✅ OC "${resultado.orden.numeroOC}" guardada exitosamente.`);
      onOrdenGuardada(resultado);

      // Limpiar el formulario
      setNumeroOC('');
      setClienteIdSelect('');
      setObservaciones('');
      setFilas([filaVacia()]);
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido.';
      onToast('error', `❌ ${mensaje}`);
    } finally {
      setGuardando(false);
    }
  }

  const totalGeneral = calcularTotalGeneral(filas);
  const tieneErrores = Object.keys(errores).length > 0;

  return (
    <>
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

          <div className="form-grid" style={{ gap: '24px' }}>
            {/* Número de Orden de Compra */}
            <div className="form-group">
              <label
                className="form-label"
                htmlFor="input-numero-oc"
                style={{ textTransform: 'none', fontWeight: 500, fontSize: '12px', color: 'var(--text-secondary)' }}
              >
                Número de Orden de Compra <span className="required">*</span>
              </label>
              <input
                id="input-numero-oc"
                type="text"
                className="form-input"
                placeholder="Ej: OC-2026-1046"
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

            {/* Dropdown de Clientes */}
            <div className="form-group">
              <label
                className="form-label"
                htmlFor="select-cliente"
                style={{ textTransform: 'none', fontWeight: 500, fontSize: '12px', color: 'var(--text-secondary)' }}
              >
                Cliente <span className="required">*</span>
              </label>
              <select
                id="select-cliente"
                className="form-input form-select"
                value={clienteIdSelect}
                onChange={handleClienteChange}
                style={errores['clienteIdSelect'] ? { borderColor: 'var(--accent-red)' } : {}}
              >
                <option value="">— Seleccionar Cliente —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.nombre} ({c.tipoCliente.etiqueta})
                  </option>
                ))}
                <option value="ADD_NEW" style={{ fontWeight: 'bold', color: 'var(--accent-teal)' }}>
                  ＋ Añadir nuevo cliente...
                </option>
              </select>
              {errores['clienteIdSelect'] && (
                <span style={{ fontSize: '11px', color: 'var(--accent-red)' }}>
                  {errores['clienteIdSelect']}
                </span>
              )}
            </div>

            {/* Observaciones (opcional) */}
            <div className="form-group full-width">
              <label
                className="form-label"
                htmlFor="input-observaciones"
                style={{ textTransform: 'none', fontWeight: 500, fontSize: '12px', color: 'var(--text-secondary)' }}
              >
                Observaciones (opcional)
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
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="card-icon">🎨</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="card-title" style={{ margin: 0 }}>Detalle de Colores / Lotes</div>
                <span
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(13,148,136,0.1)',
                    color: 'var(--accent-teal)',
                    fontWeight: 600,
                  }}
                >
                  {filas.length} lote{filas.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <span
              className="badge"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '12px',
                backgroundColor: 'rgba(13,148,136,0.1)',
                color: 'var(--accent-teal)',
                fontWeight: 600,
              }}
            >
              Unidad fija: metros
            </span>
          </div>

          {/* Tabla */}
          <div className="tabla-wrapper">
            <table className="tabla-detalles">
              <thead>
                <tr>
                  <th className="col-num">#</th>
                  <th className="col-descripcion" style={{ width: '30%' }}>Artículo</th>
                  <th className="col-color" style={{ width: '25%' }}>Color Solicitado</th>
                  <th className="col-cantidad" style={{ width: '15%' }}>Cantidad (m)</th>
                  <th className="col-precio" style={{ width: '15%' }}>Precio / m</th>
                  <th className="col-total" style={{ textAlign: 'right', width: '15%' }}>Total</th>
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
                    onChange={handleCambioFila}
                    onEliminar={handleEliminarFila}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Errores de filas */}
          {tieneErrores && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                color: 'var(--accent-red)',
                marginTop: '8px',
                lineHeight: 1.7,
              }}
            >
              {Object.entries(errores)
                .filter(([key]) => key !== 'numeroOC' && key !== 'clienteIdSelect')
                .map(([key, e]) => (
                  <div key={key}>• {e}</div>
                ))}
            </div>
          )}

          {/* Botón + Añadir otro color */}
          <div style={{ marginTop: '14px' }}>
            <button
              id="btn-anadir-color"
              type="button"
              onClick={handleAgregarFila}
              disabled={guardando}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                border: '1px dashed var(--accent-teal)',
                backgroundColor: '#ffffff',
                color: 'var(--accent-teal)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span>＋</span>
              Añadir otro color
            </button>
          </div>

          {/* Total General visible debajo de la tabla */}
          {totalGeneral > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '16px 24px',
                borderTop: '1px solid var(--border-subtle)',
                marginTop: '16px',
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Total General: <span style={{ color: 'var(--accent-teal)' }}>S/ {totalGeneral.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Separador y botones de acción */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '20px',
            }}
          >
            <button
              id="btn-limpiar-formulario"
              type="button"
              onClick={() => {
                setFilas([filaVacia()]);
                setNumeroOC('');
                setClienteIdSelect('');
                setObservaciones('');
                setErrores({});
              }}
              disabled={guardando}
              style={{
                width: '200px',
                height: '42px',
                fontSize: '14px',
                fontWeight: 500,
                border: '1px solid var(--border-medium)',
                backgroundColor: '#ffffff',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition)',
              }}
            >
              Limpiar
            </button>

            <button
              id="btn-guardar-orden"
              type="submit"
              disabled={guardando}
              style={{
                width: '200px',
                height: '42px',
                fontSize: '14px',
                fontWeight: 600,
                backgroundColor: 'var(--accent-teal)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition)',
              }}
            >
              {guardando ? 'Guardando...' : 'Guardar Orden Completa'}
            </button>
          </div>
        </div>
      </form>

      {/* =====================================================================
          MODAL DE REGISTRO DE NUEVO CLIENTE (DISEÑO PULIDO)
          ===================================================================== */}
      {mostrarModalCliente && (
        <div className="modal-overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            className="modal-panel"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              maxWidth: '480px',
              width: '90%',
              margin: '0 auto',
              overflow: 'hidden',
            }}
          >
            {/* Cabecera Simple sin Degradado */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Registrar Nuevo Cliente</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Crea un cliente rápido en la base de datos</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMostrarModalCliente(false);
                  setNuevoClienteNombre('');
                  setNuevoClienteTipo('EMPRESA');
                  setNuevoClienteRuc('');
                  setNuevoClienteTelefono('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Cuerpo del Formulario */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Nombre o Razón Social */}
              <div className="form-group">
                <label
                  className="form-label"
                  style={{ textTransform: 'none', fontWeight: 500, fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}
                >
                  Nombre / Razón Social <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={nuevoClienteNombre}
                  onChange={(e) => {
                    if (e.target.value.length <= 200) {
                      setNuevoClienteNombre(e.target.value);
                    }
                  }}
                  placeholder="Ej: Servitex S.A.C."
                  autoComplete="off"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Tipo de Cliente */}
              <div className="form-group">
                <label
                  className="form-label"
                  style={{ textTransform: 'none', fontWeight: 500, fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}
                >
                  Tipo de Cliente
                </label>
                <select
                  className="form-input form-select"
                  value={nuevoClienteTipo}
                  onChange={(e) => setNuevoClienteTipo(e.target.value as TipoClienteCodigo)}
                  style={{ width: '100%' }}
                >
                  {tiposCliente.map((t) => (
                    <option key={t.id} value={t.codigo}>
                      {t.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fila Lado a Lado: RUC y Teléfono */}
              <div style={{ display: 'flex', gap: '16px' }}>
                {/* RUC (Solo números, max 11) */}
                <div className="form-group" style={{ flex: 1 }}>
                  <label
                    className="form-label"
                    style={{ textTransform: 'none', fontWeight: 500, fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}
                  >
                    RUC <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={nuevoClienteRuc}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*$/.test(val) && val.length <= 11) {
                        setNuevoClienteRuc(val);
                      }
                    }}
                    placeholder="Ej: 20123456789"
                    autoComplete="off"
                  />
                </div>

                {/* Teléfono (max 15) */}
                <div className="form-group" style={{ flex: 1 }}>
                  <label
                    className="form-label"
                    style={{ textTransform: 'none', fontWeight: 500, fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}
                  >
                    Teléfono <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={nuevoClienteTelefono}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.length <= 15) {
                        setNuevoClienteTelefono(val);
                      }
                    }}
                    placeholder="Ej: 999 888 777"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            {/* Pie del Modal con Botones */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                padding: '16px 24px',
                borderTop: '1px solid var(--border-subtle)',
                backgroundColor: '#fafafa',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setMostrarModalCliente(false);
                  setNuevoClienteNombre('');
                  setNuevoClienteTipo('EMPRESA');
                  setNuevoClienteRuc('');
                  setNuevoClienteTelefono('');
                }}
                disabled={guardandoCliente}
                style={{
                  height: '38px',
                  padding: '0 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: '1px solid var(--border-medium)',
                  backgroundColor: '#ffffff',
                  color: 'var(--text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all var(--transition)',
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={guardandoCliente}
                style={{
                  height: '38px',
                  padding: '0 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: 'var(--accent-teal)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all var(--transition)',
                  minWidth: '130px',
                }}
                onClick={async () => {
                  if (!nuevoClienteNombre.trim()) {
                    onToast('error', 'El nombre del cliente es obligatorio.');
                    return;
                  }

                  if (nuevoClienteRuc.trim()) {
                    const rucVal = nuevoClienteRuc.trim();
                    if (!/^\d{8,11}$/.test(rucVal)) {
                      onToast('error', 'El RUC debe tener entre 8 y 11 dígitos numéricos.');
                      return;
                    }
                  }

                  setGuardandoCliente(true);
                  try {
                    const creado = await crearCliente(
                      nuevoClienteNombre.trim(),
                      nuevoClienteTipo,
                      nuevoClienteRuc.trim() || undefined,
                      nuevoClienteTelefono.trim() || undefined
                    );
                    onToast('success', `Cliente "${creado.nombre}" registrado exitosamente.`);
                    setClientes((prev) => [...prev, creado]);
                    setClienteIdSelect(String(creado.id));

                    // Limpiar y Cerrar
                    setMostrarModalCliente(false);
                    setNuevoClienteNombre('');
                    setNuevoClienteTipo('EMPRESA');
                    setNuevoClienteRuc('');
                    setNuevoClienteTelefono('');
                  } catch (err: any) {
                    onToast('error', `Error: ${err.message || 'No se pudo crear el cliente.'}`);
                  } finally {
                    setGuardandoCliente(false);
                  }
                }}
              >
                {guardandoCliente ? 'Guardando...' : 'Registrar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FormularioOrden;
