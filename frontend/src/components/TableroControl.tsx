// =============================================================================
// SERVITEX — Componente: TableroControl
// Dashboard de Órdenes con cuadrícula, filtros y cambio de estado en tarjeta
// =============================================================================
import React, { useState, useEffect } from 'react';
import type { OrdenCompraDB, OrdenResponse, LiquidacionOC } from '../types/ordenes';
import { actualizarEstadoOrden, eliminarOrden } from '../services/api';

interface TableroControlProps {
  ordenes: OrdenResponse[];
  rol?: string;
  onSeleccionarOrden: (orden: OrdenCompraDB, liquidacion: LiquidacionOC) => void;
  onNuevaOrden: () => void;
  onOrdenActualizada: (actualizada: OrdenCompraDB) => void;
  onOrdenEliminada?: (id: number) => void;
  onToast: (tipo: 'success' | 'error', mensaje: string) => void;
}

function formatearFechaTablero(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  return fecha
    .toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    })
    .replace('.', '');
}

function formatearMetros(metros: number): string {
  return metros.toLocaleString('es-PE') + ' m';
}

function getBadgeStyles(codigo: string) {
  switch (codigo) {
    case 'PENDIENTE':
      return { backgroundColor: '#FEF3C7', color: '#D97706' };
    case 'EN_PROCESO':
      return { backgroundColor: '#DBEAFE', color: '#1D4ED8' };
    case 'COMPLETADA':
      return { backgroundColor: '#D1FAE5', color: '#059669' };
    case 'ENTREGADA':
      return { backgroundColor: '#CCFBF1', color: '#0D9488' };
    case 'ANULADA':
      return { backgroundColor: '#FEE2E2', color: '#DC2626' };
    default:
      return { backgroundColor: 'var(--border-subtle)', color: 'var(--text-secondary)' };
  }
}

const TableroControl: React.FC<TableroControlProps> = ({
  ordenes,
  rol,
  onSeleccionarOrden,
  onNuevaOrden,
  onOrdenActualizada,
  onOrdenEliminada,
  onToast,
}) => {
  // --- Estados de filtros y búsqueda ---
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [terminoBusqueda, setTerminoBusqueda] = useState<string>('');

  // --- Estado del menú de cambio de estado ---
  const [dropdownOpenId, setDropdownOpenId] = useState<number | null>(null);

  const handleEliminarOrden = async (id: number) => {
    try {
      await eliminarOrden(id);
      if (onOrdenEliminada) {
        onOrdenEliminada(id);
      }
      onToast('success', 'Orden de Compra eliminada correctamente.');
    } catch (err: any) {
      onToast('error', `Error al eliminar la orden: ${err.message || 'Error desconocido'}`);
    }
  };

  // --- Cerrar dropdown al hacer clic fuera ---
  useEffect(() => {
    const handleOutsideClick = () => {
      setDropdownOpenId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleBadgeClick = (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Evitar abrir el modal de detalles de la OC
    setDropdownOpenId((prev) => (prev === id ? null : id));
  };

  const handleCambiarEstado = async (id: number, nuevoEstado: string) => {
    try {
      const actualizada = await actualizarEstadoOrden(id, nuevoEstado);
      onOrdenActualizada(actualizada);
      onToast('success', `Estado de la orden actualizado a "${nuevoEstado.replace('_', ' ')}"`);
    } catch (err: any) {
      onToast('error', `Error al actualizar estado: ${err.message || 'Error desconocido'}`);
    }
  };

  // --- Filtrado y ordenamiento por prioridad ---
  const PRIORIDAD_ESTADO = ['EN_PROCESO', 'PENDIENTE', 'COMPLETADA', 'ENTREGADA', 'ANULADA'];

  const ordenesFiltradas = ordenes
    .filter((oc) => {

      if (filtroEstado !== 'TODOS' && oc.orden.estado.codigo !== filtroEstado) {
        return false;
      }

      if (terminoBusqueda.trim()) {
        const term = terminoBusqueda.toLowerCase();
        const numOC = oc.orden.numeroOC.toLowerCase();
        const cliente = oc.orden.cliente.nombre.toLowerCase();
        return numOC.includes(term) || cliente.includes(term);
      }
      return true;
    })
    .sort((a, b) => {
      const indexA = PRIORIDAD_ESTADO.indexOf(a.orden.estado.codigo);
      const indexB = PRIORIDAD_ESTADO.indexOf(b.orden.estado.codigo);
      const priorityA = indexA === -1 ? PRIORIDAD_ESTADO.length : indexA;
      const priorityB = indexB === -1 ? PRIORIDAD_ESTADO.length : indexB;

      if (priorityA === priorityB) {
        return new Date(b.orden.createdAt).getTime() - new Date(a.orden.createdAt).getTime();
      }

      return priorityA - priorityB;
    });

  return (
    <div style={{ backgroundColor: '#F3F4F6', minHeight: 'calc(100vh - 120px)', padding: '28px', borderRadius: 'var(--radius-lg)' }}>
      {/* Estilos locales para efectos de hover */}
      <style>{`
        .cartilla-hover {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .cartilla-hover:hover {
          box-shadow: var(--shadow-md) !important;
          transform: translateY(-2px);
        }
        .dropdown-item-hover {
          transition: background-color 0.15s ease, color 0.15s ease;
        }
        .dropdown-item-hover:hover {
          background-color: var(--bg-base) !important;
          color: var(--accent-teal) !important;
        }
        .pill-hover {
          transition: border-color 0.2s ease, color 0.2s ease;
        }
        .pill-hover:hover {
          border-color: var(--accent-teal) !important;
          color: var(--accent-teal) !important;
        }
        .btn-liquidacion {
          transition: background-color 0.2s ease, transform 0.1s ease;
        }
        .btn-liquidacion:hover {
          background-color: rgba(13,148,136,0.05) !important;
        }
        .btn-liquidacion:active {
          transform: scale(0.99);
        }
      `}</style>

      {/* ===================================================================
          HEADER DEL TABLERO
          =================================================================== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Tablero de <span style={{ color: 'var(--accent-teal)' }}>Órdenes</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0 0' }}>
            Vista general de todas las órdenes de compra registradas.
          </p>
        </div>
        {rol === 'PROPIETARIA' && (
          <button
            id="btn-nueva-orden"
            type="button"
            className="btn btn-primary"
            onClick={onNuevaOrden}
            style={{ backgroundColor: 'var(--accent-teal)', color: 'white' }}
          >
            ＋ Nueva OC
          </button>
        )}
      </div>

      {/* ===================================================================
          BARRA DE HERRAMIENTAS (BUSCADOR & FILTROS)
          =================================================================== */}
      <div style={{ marginBottom: '24px' }}>
        {/* Buscador con lupa */}
        <div style={{ position: 'relative', width: '100%', marginBottom: '14px' }}>
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
            placeholder="Buscar por número de OC o cliente..."
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 42px',
              fontSize: '14px',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              outline: 'none',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent-teal)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-medium)')}
          />
        </div>

        {/* Fila de Filtros Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { code: 'TODOS', label: 'Todos' },
            { code: 'PENDIENTE', label: 'Pendiente' },
            { code: 'EN_PROCESO', label: 'En Proceso' },
            { code: 'COMPLETADA', label: 'Completada' },
            { code: 'ENTREGADA', label: 'Entregada' },
            { code: 'ANULADA', label: 'Anulada' },
          ].map((pill) => {
            const isActive = filtroEstado === pill.code;
            return (
              <button
                key={pill.code}
                type="button"
                onClick={() => setFiltroEstado(pill.code)}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '20px',
                  border: isActive ? 'none' : '1px solid var(--border-medium)',
                  backgroundColor: isActive ? 'var(--accent-teal)' : '#ffffff',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
                className={isActive ? '' : 'pill-hover'}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================
          GRID DE CARTILLAS
          =================================================================== */}
      {ordenesFiltradas.length === 0 ? (
        <div className="tablero-empty" style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: 'var(--radius-md)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <div className="tablero-empty-icon" style={{ fontSize: '36px', marginBottom: '10px' }}>📭</div>
          <div className="tablero-empty-title" style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>No se encontraron órdenes</div>
          <div className="tablero-empty-text" style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Prueba ajustando los filtros de búsqueda o registra una nueva Orden de Compra.
          </div>
          <button
            id="btn-ir-formulario-empty"
            type="button"
            className="btn btn-ghost-teal"
            onClick={onNuevaOrden}
          >
            ＋ Registrar nueva orden
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))',
            gap: '20px',
          }}
        >
          {ordenesFiltradas.map((oc) => (
            <div
              key={oc.orden.id}
              className="cartilla-hover"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              {/* Fila superior: OC, cliente y badge interactivo */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    {oc.orden.numeroOC}
                  </h2>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0', fontWeight: 500 }}>
                    {oc.orden.cliente.nombre}
                  </p>
                </div>

                {/* Badge de estado con Dropdown */}
                <div style={{ position: 'relative' }}>
                  {rol === 'PROPIETARIA' ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => handleBadgeClick(e, oc.orden.id)}
                        style={{
                          ...getBadgeStyles(oc.orden.estado.codigo),
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {oc.orden.estado.etiqueta} ▾
                      </button>

                      {dropdownOpenId === oc.orden.id && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '6px',
                            backgroundColor: '#ffffff',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: 'var(--shadow-lg)',
                            zIndex: 50,
                            minWidth: '130px',
                            overflow: 'hidden',
                          }}
                        >
                          {['PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'ENTREGADA', 'ANULADA'].map((code) => {
                            const labels: Record<string, string> = {
                              PENDIENTE: 'Pendiente',
                              EN_PROCESO: 'En Proceso',
                              COMPLETADA: 'Completada',
                              ENTREGADA: 'Entregada',
                              ANULADA: 'Anulada',
                            };
                            return (
                              <button
                                key={code}
                                type="button"
                                className="dropdown-item-hover"
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  padding: '8px 12px',
                                  textAlign: 'left',
                                  border: 'none',
                                  background: 'none',
                                  fontSize: '13px',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                  color: 'var(--text-primary)',
                                }}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setDropdownOpenId(null);
                                  await handleCambiarEstado(oc.orden.id, code);
                                }}
                              >
                                {labels[code]}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      style={{
                        ...getBadgeStyles(oc.orden.estado.codigo),
                        padding: '6px 14px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {oc.orden.estado.etiqueta}
                    </div>
                  )}
                </div>
              </div>

              {/* Fila de métricas */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '12px',
                  backgroundColor: '#F8FAFC',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    📅 Fecha
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatearFechaTablero(oc.orden.createdAt)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    🎨 Lotes
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-teal)' }}>
                    {oc.orden.detalles.length}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    📏 Total m
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatearMetros(oc.liquidacion.metrosTotales)}
                  </div>
                </div>
              </div>

              {/* Botón Ver liquidación y Eliminar */}
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button
                  type="button"
                  className="btn-liquidacion"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    border: '1px solid var(--accent-teal)',
                    backgroundColor: '#ffffff',
                    color: 'var(--accent-teal)',
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onClick={() => onSeleccionarOrden(oc.orden, oc.liquidacion)}
                >
                  👁 Ver liquidación
                </button>
                {rol === 'PROPIETARIA' && (
                  <button
                    type="button"
                    title="Eliminar Orden de Compra"
                    style={{
                      border: '1px solid #ef4444',
                      backgroundColor: '#ffffff',
                      color: '#ef4444',
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fef2f2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (window.confirm(`¿Estás completamente seguro de eliminar la Orden de Compra ${oc.orden.numeroOC}?\n\nEsta acción es irreversible y eliminará todos sus lotes, fórmulas y registros asociados.`)) {
                        await handleEliminarOrden(oc.orden.id);
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                      <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TableroControl;
