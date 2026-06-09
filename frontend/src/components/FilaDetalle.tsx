// =============================================================================
// SERVITEX — Componente: FilaDetalle
// Una fila individual de la tabla dinámica de colores/lotes
// =============================================================================
import React from 'react';
import type { FilaDetalle } from '../types/ordenes';

interface FilaDetalleProps {
  fila: FilaDetalle;
  indice: number;
  totalFilas: number;
  onChange: (localId: string, campo: keyof Omit<FilaDetalle, 'localId'>, valor: string) => void;
  onEliminar: (localId: string) => void;
}

function calcularTotalFila(cantidad: string, precio: string): string {
  const c = parseFloat(cantidad);
  const p = parseFloat(precio);
  if (isNaN(c) || isNaN(p) || c <= 0 || p <= 0) return '';
  return (Math.round(c * p * 100) / 100).toFixed(2);
}

const FilaDetalleComponent: React.FC<FilaDetalleProps> = ({
  fila,
  indice,
  totalFilas,
  onChange,
  onEliminar,
}) => {
  const total = calcularTotalFila(fila.cantidad, fila.precioPorMetro);

  return (
    <tr>
      {/* Número de fila */}
      <td className="col-num">
        <span>{indice + 1}</span>
      </td>

      {/* Cantidad (metros) */}
      <td>
        <input
          id={`fila-cantidad-${fila.localId}`}
          type="number"
          className="tabla-input"
          placeholder="0.00"
          min="0.01"
          step="0.5"
          value={fila.cantidad}
          onChange={(e) => onChange(fila.localId, 'cantidad', e.target.value)}
          aria-label={`Cantidad fila ${indice + 1}`}
        />
      </td>

      {/* Unidad de Medida — FIJA: Metros */}
      <td>
        <input
          type="text"
          className="tabla-input"
          value="Metros"
          readOnly
          tabIndex={-1}
          aria-label="Unidad de medida fija"
        />
      </td>

      {/* Descripción del artículo */}
      <td>
        <input
          id={`fila-descripcion-${fila.localId}`}
          type="text"
          className="tabla-input"
          placeholder="Ej: Avío, Prenda, Tela..."
          value={fila.descripcionArticulo}
          onChange={(e) => onChange(fila.localId, 'descripcionArticulo', e.target.value)}
          aria-label={`Descripción artículo fila ${indice + 1}`}
        />
      </td>

      {/* Color solicitado */}
      <td>
        <input
          id={`fila-color-${fila.localId}`}
          type="text"
          className="tabla-input"
          placeholder="Ej: Navy Blue"
          value={fila.colorSolicitado}
          onChange={(e) => onChange(fila.localId, 'colorSolicitado', e.target.value)}
          aria-label={`Color solicitado fila ${indice + 1}`}
        />
      </td>

      {/* Precio por metro */}
      <td>
        <input
          id={`fila-precio-${fila.localId}`}
          type="number"
          className="tabla-input"
          placeholder="0.00"
          min="0.01"
          step="0.10"
          value={fila.precioPorMetro}
          onChange={(e) => onChange(fila.localId, 'precioPorMetro', e.target.value)}
          aria-label={`Precio por metro fila ${indice + 1}`}
        />
      </td>

      {/* Total fila — calculado en tiempo real (solo lectura) */}
      <td>
        <span className={`total-fila ${!total ? 'empty' : ''}`}>
          {total ? `S/ ${total}` : '—'}
        </span>
      </td>

      {/* Botón eliminar fila */}
      <td>
        <button
          id={`btn-eliminar-fila-${fila.localId}`}
          type="button"
          className="btn-eliminar-fila"
          onClick={() => onEliminar(fila.localId)}
          disabled={totalFilas <= 1}
          title={totalFilas <= 1 ? 'Debe haber al menos una fila' : 'Eliminar esta fila'}
          aria-label={`Eliminar fila ${indice + 1}`}
        >
          ✕
        </button>
      </td>
    </tr>
  );
};

export default FilaDetalleComponent;
