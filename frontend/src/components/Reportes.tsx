// =============================================================================
// SERVITEX — Componente: Reportes e Inteligencia de Negocios
// Visualización de gráficos con recharts para volumen, fidelidad y periodos.
// =============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid 
} from 'recharts';
import { 
  fetchConsumoColorantes, 
  fetchFidelidadClientes, 
  fetchProduccionTemporal 
} from '../services/reportesApi';
import type { ConsumoColorante, FidelidadCliente, ProduccionTemporal } from '../types/reportes';

const Reportes: React.FC = () => {
  // --- Filtro de rango de fechas ---
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  // --- Datos de los reportes ---
  const [consumo, setConsumo] = useState<ConsumoColorante[]>([]);
  const [fidelidad, setFidelidad] = useState<FidelidadCliente[]>([]);
  const [produccion, setProduccion] = useState<ProduccionTemporal[]>([]);
  
  // Agrupación para el tercer reporte: mes | trimestre | año
  const [agrupacion, setAgrupacion] = useState<'mes' | 'trimestre' | 'año'>('mes');
  
  // Estados de carga e interfaz
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Cargar datos de la API ---
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [resConsumo, resFidelidad, resProduccion] = await Promise.all([
        fetchConsumoColorantes(desde || undefined, hasta || undefined),
        fetchFidelidadClientes(desde || undefined, hasta || undefined),
        fetchProduccionTemporal(agrupacion, desde || undefined, hasta || undefined)
      ]);
      
      setConsumo(resConsumo);
      setFidelidad(resFidelidad);
      setProduccion(resProduccion);
    } catch (err: any) {
      console.error('Error al cargar reportes:', err);
      setError(err.message || 'No se pudieron cargar los datos de inteligencia.');
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, agrupacion]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // --- Función de Impresión de Reportes en Formato PDF ---
  const imprimirReporte = (tipo: 'consumo' | 'fidelidad' | 'produccion') => {
    const win = window.open('', '_blank');
    if (!win) return;
    const desdeStr = desde ? new Date(desde).toLocaleDateString('es-PE') : 'Inicio';
    const hastaStr = hasta ? new Date(hasta).toLocaleDateString('es-PE') : 'Actual';
    const fechaGen = new Date().toLocaleString('es-PE');

    let titulo = '';
    let colorPrimario = '';
    let descripcion = '';
    let tablaHtml = '';

    if (tipo === 'consumo') {
      titulo = 'Reporte de Consumo de Colorantes';
      colorPrimario = '#0d9488'; // Teal
      descripcion = 'Este reporte detalla el consumo total acumulado de colorantes químicos en el taller de teñido, calculado automáticamente a partir de las recetas técnicas y el peso real del material procesado.';
      tablaHtml = `
        <table>
          <thead>
            <tr>
              <th>Posición</th>
              <th>Colorante</th>
              <th style="text-align: right;">Gramos (g)</th>
              <th style="text-align: right;">Kilogramos (kg)</th>
            </tr>
          </thead>
          <tbody>
            ${consumo.map((c, i) => `
              <tr>
                <td><strong>#${i + 1}</strong></td>
                <td>${c.nombre}</td>
                <td style="text-align: right;">${c.totalGramos.toLocaleString('es-PE')} g</td>
                <td style="text-align: right; font-weight: bold; color: ${colorPrimario};">${(c.totalGramos / 1000).toFixed(3)} kg</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (tipo === 'fidelidad') {
      titulo = 'Reporte de Fidelidad de Clientes';
      colorPrimario = '#d97706'; // Gold
      descripcion = 'Este reporte presenta el ranking de fidelidad de clientes basado en la cantidad de lotes teñidos individuales y los metros totales procesados.';
      tablaHtml = `
        <table>
          <thead>
            <tr>
              <th>Posición</th>
              <th>Razón Social / Cliente</th>
              <th style="text-align: right;">Total Lotes</th>
              <th style="text-align: right;">Metros Totales (m)</th>
            </tr>
          </thead>
          <tbody>
            ${fidelidad.map((c, i) => `
              <tr>
                <td><strong>#${i + 1}</strong></td>
                <td>${c.clienteNombre}</td>
                <td style="text-align: right; font-weight: bold; color: ${colorPrimario};">${c.totalTeñidos} lote${c.totalTeñidos !== 1 ? 's' : ''}</td>
                <td style="text-align: right;">${c.totalMetros.toLocaleString('es-PE')} m</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      const agrStr = agrupacion === 'mes' ? 'Mensual' : agrupacion === 'trimestre' ? 'Trimestral' : 'Anual';
      titulo = `Reporte de Producción Temporal (${agrStr})`;
      colorPrimario = '#ea580c'; // Orange
      descripcion = 'Este reporte detalla los metros lineales totales de textil teñidos y despachados en el taller de teñido, agrupados de forma periódica.';
      tablaHtml = `
        <table>
          <thead>
            <tr>
              <th>Periodo</th>
              <th style="text-align: right;">Metros Teñidos (m)</th>
            </tr>
          </thead>
          <tbody>
            ${produccion.map((c) => `
              <tr>
                <td><strong>${c.periodo}</strong></td>
                <td style="text-align: right; font-weight: bold; color: ${colorPrimario};">${c.totalMetros.toLocaleString('es-PE')} m</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    win.document.write(`
      <html>
        <head>
          <title>${titulo}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; line-height: 1.6; background-color: #ffffff; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid ${colorPrimario}; padding-bottom: 20px; margin-bottom: 30px; }
            .logo-mark { background-color: ${colorPrimario}; color: #ffffff; font-weight: 800; font-size: 20px; width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; margin-right: 10px; }
            .logo-area { display: flex; align-items: center; }
            .logo-text { font-size: 18px; font-weight: 800; letter-spacing: -0.5px; }
            .logo-sub { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; }
            .title-area { text-align: right; }
            .report-title { font-size: 22px; font-weight: 800; margin: 0; color: #0f172a; letter-spacing: -0.5px; }
            .metadata { font-size: 11px; color: #64748b; margin-top: 6px; font-weight: 500; }
            .description { font-size: 13px; color: #334155; margin-bottom: 32px; background-color: #f8fafc; border-left: 4px solid #cbd5e1; padding: 12px 16px; border-radius: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 60px; }
            th { background-color: #f1f5f9; color: #475569; font-weight: 700; padding: 12px 16px; text-align: left; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
            td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { margin-top: 100px; display: flex; justify-content: space-between; }
            .signature-box { border-top: 1.5px solid #94a3b8; width: 220px; text-align: center; padding-top: 8px; font-size: 11px; color: #475569; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-area">
              <div class="logo-mark">SX</div>
              <div>
                <div class="logo-text">SERVITEX</div>
                <div class="logo-sub">Sistema de Gestión Comercial</div>
              </div>
            </div>
            <div class="title-area">
              <h1 class="report-title">${titulo}</h1>
              <div class="metadata">Rango: ${desdeStr} a ${hastaStr} &nbsp;|&nbsp; Emisión: ${fechaGen}</div>
            </div>
          </div>
          <div class="description">${descripcion}</div>
          ${tablaHtml}
          <div class="footer">
            <div class="signature-box">Firma del Técnico Responsable</div>
            <div class="signature-box">Firma Autorizada de Gerencia</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const imprimirReporteCliente = (cliente: FidelidadCliente) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const desdeStr = desde ? new Date(desde).toLocaleDateString('es-PE') : 'Inicio';
    const hastaStr = hasta ? new Date(hasta).toLocaleDateString('es-PE') : 'Actual';
    const fechaGen = new Date().toLocaleString('es-PE');
    
    // Agrupar por Código OC
    const ocsAgrupadas: Record<string, number> = {};
    for (const d of cliente.detalles || []) {
      if (!ocsAgrupadas[d.numeroOC]) {
        ocsAgrupadas[d.numeroOC] = 0;
      }
      ocsAgrupadas[d.numeroOC] += d.costo;
    }

    const ocsList = Object.entries(ocsAgrupadas).map(([numeroOC, totalSinIGV]) => {
      const totalConIGV = totalSinIGV * 1.18;
      return { numeroOC, totalSinIGV, totalConIGV };
    });

    const sumaTotalSinIGV = ocsList.reduce((acc, item) => acc + item.totalSinIGV, 0);
    const sumaTotalConIGV = ocsList.reduce((acc, item) => acc + item.totalConIGV, 0);

    win.document.write(`
      <html>
        <head>
          <title>Historial de Lotes - ${cliente.clienteNombre}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; line-height: 1.6; background-color: #ffffff; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #d97706; padding-bottom: 20px; margin-bottom: 30px; }
            .logo-mark { background-color: #d97706; color: #ffffff; font-weight: 800; font-size: 20px; width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; margin-right: 10px; }
            .logo-area { display: flex; align-items: center; }
            .logo-text { font-size: 18px; font-weight: 800; letter-spacing: -0.5px; }
            .logo-sub { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; }
            .title-area { text-align: right; }
            .report-title { font-size: 22px; font-weight: 800; margin: 0; color: #0f172a; letter-spacing: -0.5px; }
            .metadata { font-size: 11px; color: #64748b; margin-top: 6px; font-weight: 500; }
            
            .summary-cards { display: flex; gap: 20px; margin-bottom: 30px; }
            .summary-card { flex: 1; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; }
            .summary-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
            .summary-value { font-size: 18px; font-weight: 800; color: #0f172a; }
            .summary-value.highlight { color: #d97706; }

            .section-title { font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 40px; margin-bottom: 12px; border-bottom: 2px solid #cbd5e1; padding-bottom: 6px; }

            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 30px; }
            th { background-color: #f1f5f9; color: #475569; font-weight: 700; padding: 10px 14px; text-align: left; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
            td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { margin-top: 80px; display: flex; justify-content: space-between; page-break-inside: avoid; }
            .signature-box { border-top: 1.5px solid #94a3b8; width: 220px; text-align: center; padding-top: 8px; font-size: 11px; color: #475569; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-area">
              <div class="logo-mark">SX</div>
              <div>
                <div class="logo-text">SERVITEX</div>
                <div class="logo-sub">Sistema de Gestión Comercial</div>
              </div>
            </div>
            <div class="title-area">
              <h1 class="report-title">Historial de Lotes y Facturación</h1>
              <div class="metadata">Rango: ${desdeStr} a ${hastaStr} &nbsp;|&nbsp; Emisión: ${fechaGen}</div>
            </div>
          </div>
          
          <div style="font-size: 13px; color: #334155; margin-bottom: 24px;">
            Reporte consolidado de la actividad comercial para el cliente <strong>${cliente.clienteNombre}</strong>. A continuación se desglosan todos los lotes procesados y el resumen de facturación por Orden de Compra.
          </div>

          <div class="summary-cards">
            <div class="summary-card">
              <div class="summary-label">Total Facturado (Con IGV)</div>
              <div class="summary-value highlight">S/ ${sumaTotalConIGV.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Sin IGV</div>
              <div class="summary-value">S/ ${sumaTotalSinIGV.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Metros Procesados (Lotes)</div>
              <div class="summary-value">${cliente.totalMetros.toLocaleString('es-PE')} m (${cliente.totalTeñidos} lotes)</div>
            </div>
          </div>

          <div class="section-title">Detalle de Lotes Procesados</div>
          <table>
            <thead>
              <tr>
                <th>Fecha OC</th>
                <th>Código OC</th>
                <th>Artículo</th>
                <th>Color</th>
                <th style="text-align: right;">Cantidad (m)</th>
                <th style="text-align: right;">Costo Sin IGV (S/)</th>
              </tr>
            </thead>
            <tbody>
              ${!cliente.detalles || cliente.detalles.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align: center; color: #64748b;">No hay lotes registrados para este cliente en el periodo seleccionado.</td>
                </tr>
              ` : cliente.detalles.map((d) => `
                <tr>
                  <td>${new Date(d.fecha).toLocaleDateString('es-PE')}</td>
                  <td><strong>${d.numeroOC}</strong></td>
                  <td>${d.articuloNombre}</td>
                  <td>${d.colorSolicitado}</td>
                  <td style="text-align: right;">${d.metros.toLocaleString('es-PE')} m</td>
                  <td style="text-align: right; font-weight: 600;">S/ ${d.costo.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="section-title">Cuadro Resumen de Facturación por Orden de Compra</div>
          <table>
            <thead>
              <tr>
                <th>Código de Orden de Compra (OC)</th>
                <th style="text-align: right;">Subtotal (Sin IGV)</th>
                <th style="text-align: right;">Total Con IGV (18%)</th>
              </tr>
            </thead>
            <tbody>
              ${ocsList.length === 0 ? `
                <tr>
                  <td colspan="3" style="text-align: center; color: #64748b;">No hay órdenes registradas en el periodo seleccionado.</td>
                </tr>
              ` : ocsList.map((oc) => `
                <tr>
                  <td><strong>${oc.numeroOC}</strong></td>
                  <td style="text-align: right;">S/ ${oc.totalSinIGV.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style="text-align: right; font-weight: 600;">S/ ${oc.totalConIGV.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
              <tr style="background-color: #f1f5f9; font-weight: 800; border-top: 2px solid #94a3b8; border-bottom: 2px double #94a3b8;">
                <td>SUMA TOTAL CONSOLIDADA</td>
                <td style="text-align: right;">S/ ${sumaTotalSinIGV.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style="text-align: right; color: #d97706; font-size: 14px;">S/ ${sumaTotalConIGV.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <div class="signature-box">Firma del Técnico Responsable</div>
            <div class="signature-box">Firma Autorizada de Gerencia</div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  // Convertir gramos a Kg para el gráfico horizontal
  const consumoDataKg = consumo.map(c => ({
    nombre: c.nombre,
    kg: parseFloat((c.totalGramos / 1000).toFixed(3))
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Cabecera del Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Reportes <span>Generales</span></h1>
          <p className="page-subtitle">Panel estratégico e inteligencia comercial del taller de teñido</p>
        </div>

        {/* Controles de Filtro de Fechas */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          backgroundColor: 'var(--bg-card)', 
          padding: '12px 18px', 
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label className="form-label" style={{ fontSize: '10px' }}>Desde</label>
            <input 
              type="date" 
              className="form-input" 
              value={desde} 
              onChange={(e) => setDesde(e.target.value)} 
              style={{ padding: '6px 10px', fontSize: '13px', width: '135px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label className="form-label" style={{ fontSize: '10px' }}>Hasta</label>
            <input 
              type="date" 
              className="form-input" 
              value={hasta} 
              onChange={(e) => setHasta(e.target.value)} 
              style={{ padding: '6px 10px', fontSize: '13px', width: '135px' }}
            />
          </div>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => { setDesde(''); setHasta(''); }}
            style={{ marginTop: '16px', padding: '6px 12px', fontSize: '12px', height: '32px' }}
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Estado de error */}
      {error && (
        <div style={{ 
          color: 'var(--accent-red)', 
          backgroundColor: 'rgba(220, 38, 38, 0.05)', 
          border: '1px solid rgba(220, 38, 38, 0.15)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          fontSize: '13px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Grid de Reportes */}
      {cargando ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', gap: '14px', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ borderTopColor: 'var(--accent-teal)' }} />
          Generando reportes con snapshots...
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '24px' 
        }}>
          
          {/* PANEL 1: Consumo de Colorantes */}
          <div className="card" style={{ 
            borderLeft: '5px solid var(--accent-teal)', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            minHeight: '420px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '20px' }}>🧪</span>
                <h3 className="card-title" style={{ margin: 0, fontSize: '16px' }}>Consumo de Productos</h3>
              </div>
              <p className="card-desc" style={{ marginBottom: '20px' }}>Top 5 colorantes por volumen (kg)</p>

              {consumoDataKg.length === 0 ? (
                <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Sin datos de consumo en este rango.
                </div>
              ) : (
                <div style={{ width: '100%', height: '220px', marginLeft: '-20px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={consumoDataKg}
                      margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                    >
                      <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                      <YAxis 
                        dataKey="nombre" 
                        type="category" 
                        stroke="var(--text-secondary)" 
                        fontSize={10} 
                        tickLine={false} 
                        width={100}
                      />
                      <Tooltip 
                        formatter={(value: any) => [`${value} kg`, 'Consumo']} 
                        contentStyle={{ fontSize: '12px', borderRadius: 'var(--radius-sm)' }}
                      />
                      <Bar dataKey="kg" fill="var(--accent-teal)" radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <button 
              type="button" 
              className="btn btn-primary"
              disabled={consumoDataKg.length === 0}
              onClick={() => imprimirReporte('consumo')}
              style={{ width: '100%', justifyContent: 'center', gap: '8px', marginTop: '16px' }}
            >
              📥 Generar Reporte
            </button>
          </div>

          {/* PANEL 2: Fidelidad de Clientes */}
          <div className="card" style={{ 
            borderLeft: '5px solid var(--accent-gold)', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            minHeight: '420px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '20px' }}>🤝</span>
                <h3 className="card-title" style={{ margin: 0, fontSize: '16px' }}>Fidelidad de Clientes</h3>
              </div>
              <p className="card-desc" style={{ marginBottom: '20px' }}>Ranking por número de pedidos de teñido</p>

              {fidelidad.length === 0 ? (
                <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Sin datos de clientes en este rango.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '220px', overflowY: 'auto' }}>
                  {fidelidad.map((cliente, idx) => (
                    <div key={idx} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      paddingBottom: '10px',
                      borderBottom: idx < fidelidad.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '99px', 
                          backgroundColor: 'var(--accent-gold)', 
                          color: '#fff', 
                          fontWeight: 700, 
                          fontSize: '11px' 
                        }}>
                          {idx + 1}
                        </span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{cliente.clienteNombre}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{cliente.totalMetros.toLocaleString()} metros teñidos</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          <span>🎨</span>
                          <span>{cliente.totalTeñidos} lote{cliente.totalTeñidos !== 1 ? 's' : ''}</span>
                        </div>
                        <button
                          type="button"
                          title={`Imprimir historial detallado de ${cliente.clienteNombre}`}
                          onClick={() => imprimirReporteCliente(cliente)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '15px',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            color: 'var(--accent-gold)',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(217, 119, 6, 0.1)';
                            e.currentTarget.style.transform = 'scale(1.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          🖨️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button 
              type="button" 
              className="btn"
              disabled={fidelidad.length === 0}
              onClick={() => imprimirReporte('fidelidad')}
              style={{ 
                width: '100%', 
                justifyContent: 'center', 
                gap: '8px', 
                marginTop: '16px',
                border: '1px solid var(--accent-gold)',
                color: 'var(--accent-gold)',
                backgroundColor: 'transparent'
              }}
            >
              📥 Imprimir Ranking General
            </button>
          </div>

          {/* PANEL 3: Producción Temporal */}
          <div className="card" style={{ 
            borderLeft: '5px solid #ea580c', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            minHeight: '420px'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>📈</span>
                  <h3 className="card-title" style={{ margin: 0, fontSize: '16px' }}>Producción Temporal</h3>
                </div>

                {/* Filtro Pill Buttons */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['mes', 'trimestre', 'año'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAgrupacion(t)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        borderRadius: '12px',
                        border: agrupacion === t ? 'none' : '1px solid var(--border-medium)',
                        backgroundColor: agrupacion === t ? '#ea580c' : '#ffffff',
                        color: agrupacion === t ? '#ffffff' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {t === 'mes' ? 'Mes' : t === 'trimestre' ? 'Trimestre' : 'Año'}
                    </button>
                  ))}
                </div>
              </div>
              <p className="card-desc" style={{ marginBottom: '20px' }}>Metros teñidos por período</p>

              {produccion.length === 0 ? (
                <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Sin datos de producción en este rango.
                </div>
              ) : (
                <div style={{ width: '100%', height: '220px', marginLeft: '-20px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={produccion}
                      margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                      <XAxis dataKey="periodo" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        formatter={(value: any) => [`${value} m`, 'Metros teñidos']}
                        contentStyle={{ fontSize: '12px', borderRadius: 'var(--radius-sm)' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="totalMetros" 
                        stroke="#ea580c" 
                        strokeWidth={2.5} 
                        dot={{ r: 4, stroke: '#ea580c', strokeWidth: 1, fill: '#fff' }} 
                        activeDot={{ r: 6 }} 
                        name="Metros" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <button 
              type="button" 
              className="btn"
              disabled={produccion.length === 0}
              onClick={() => imprimirReporte('produccion')}
              style={{ 
                width: '100%', 
                justifyContent: 'center', 
                gap: '8px', 
                marginTop: '16px',
                border: '1px solid #ea580c',
                color: '#ea580c',
                backgroundColor: 'transparent'
              }}
            >
              📥 Generar Reporte
            </button>
          </div>

        </div>
      )}

    </div>
  );
};

export default Reportes;
