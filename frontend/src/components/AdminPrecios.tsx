// =============================================================================
// SERVITEX — Componente: AdminPrecios (Administración de Tarifario)
// Permite al administrador (PROPIETARIA) actualizar los costos base unitarios
// =============================================================================
import React, { useEffect, useState } from 'react';
import { obtenerPreciosInsumos, actualizarPrecioInsumo } from '../services/recetasApi';
import type { PrecioInsumo } from '../services/recetasApi';

const AdminPrecios: React.FC = () => {
  const [precios, setPrecios] = useState<PrecioInsumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'quimicos' | 'colorantes'>('quimicos');

  const cargarPrecios = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await obtenerPreciosInsumos();
      setPrecios(res);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los precios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPrecios();
  }, []);

  const handleStartEdit = (item: PrecioInsumo) => {
    setEditingId(item.id);
    setEditingValue(item.precioUnitario.toString());
  };

  const handleSave = async (id: number) => {
    const val = parseFloat(editingValue);
    if (isNaN(val) || val < 0) {
      alert('Ingresa un valor numérico positivo válido.');
      return;
    }

    try {
      setSavingId(id);
      await actualizarPrecioInsumo(id, val);
      setSuccessMsg('Tarifa actualizada correctamente.');
      setEditingId(null);
      await cargarPrecios();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Error al actualizar el precio.');
    } finally {
      setSavingId(null);
    }
  };

  // Filtrado de acuerdo a búsqueda y categoría activa
  const query = search.toLowerCase().trim();
  const insumosFiltrados = precios.filter(p => {
    const matchSearch = p.nombreInsumo.toLowerCase().includes(query) || p.codigoInsumo.toLowerCase().includes(query);
    const isColorante = p.codigoInsumo.startsWith('RAMAZOL') || 
                        p.codigoInsumo.startsWith('DIANIX') || 
                        p.codigoInsumo.startsWith('ACIDO') || 
                        p.nombreInsumo.toLowerCase().includes('colorante:');
    
    if (activeCategory === 'colorantes') {
      return isColorante && matchSearch;
    } else {
      return !isColorante && matchSearch;
    }
  });

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>⚙️ Tarifario de Insumos y Colorantes</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Configuración de precios unitarios base para el cálculo automático de costos. Solo editable por administradores.
        </p>
      </div>

      {successMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: 'var(--accent-teal-bg)', color: 'var(--accent-teal)', borderRadius: 'var(--radius-md)', fontSize: '13px', borderLeft: '4px solid var(--accent-teal)' }}>
          ✅ {successMsg}
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: 'var(--radius-md)', fontSize: '13px', borderLeft: '4px solid #ef4444' }}>
          ❌ {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        {/* Selector de Categorías */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveCategory('quimicos')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: activeCategory === 'quimicos' ? 600 : 500,
              backgroundColor: activeCategory === 'quimicos' ? '#ffffff' : 'transparent',
              color: activeCategory === 'quimicos' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              boxShadow: activeCategory === 'quimicos' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            🧪 Insumos Químicos y Agua
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('colorantes')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: activeCategory === 'colorantes' ? 600 : 500,
              backgroundColor: activeCategory === 'colorantes' ? '#ffffff' : 'transparent',
              color: activeCategory === 'colorantes' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              boxShadow: activeCategory === 'colorantes' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            🎨 Colorantes
          </button>
        </div>

        {/* Buscador */}
        <input
          type="text"
          placeholder="Buscar por nombre o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '8px 14px',
            fontSize: '14px',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-primary)',
            width: '280px',
            outline: 'none'
          }}
        />
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          🔄 Cargando tarifario...
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Descripción</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Código Interno</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Unidad</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Precio Unitario</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {insumosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No se encontraron insumos que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                insumosFiltrados.map((item) => {
                  const isEditing = editingId === item.id;
                  const isSaving = savingId === item.id;
                  
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.nombreInsumo}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {item.codigoInsumo}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {item.unidadMedida}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>S/ </span>
                            <input
                              type="number"
                              step="0.0001"
                              min="0"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '13px',
                                border: '1px solid var(--accent-teal)',
                                borderRadius: '4px',
                                width: '100px',
                                outline: 'none'
                              }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <strong>S/ {item.precioUnitario.toFixed(4)}</strong>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                              onClick={() => setEditingId(null)}
                              disabled={isSaving}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                              onClick={() => handleSave(item.id)}
                              disabled={isSaving}
                            >
                              {isSaving ? 'Guardando...' : 'Guardar'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '4px 12px', fontSize: '12px', color: 'var(--accent-teal)', border: '1px solid var(--border-subtle)' }}
                            onClick={() => handleStartEdit(item)}
                          >
                            ✏️ Editar precio
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPrecios;
