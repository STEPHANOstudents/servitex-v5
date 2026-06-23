// =============================================================================
// SERVITEX — Formulario de Receta Técnica (Módulo Lab)
// v3.2 — Soporta texto libre para artículos, Ajustes (Lotes en Proceso) y
//         Preview de Baños. Lógica de preview duplica las reglas del Motor
//         Químico del backend para feedback visual en tiempo real.
// =============================================================================
import React, { useState, useCallback, useEffect } from 'react';
import type { RecetaConMotor, RecetaPreload } from '../types/recetas';
import { getNivelClase, formatearGramos } from '../types/recetas';
import { crearReceta, registrarIteracion, aprobarReceta } from '../services/recetasApi';
import { obtenerOrdenes } from '../services/api';
import { fetchCatalogos } from '../services/catalogosApi';
import type { Catalogos, ArticuloTextil, ComposicionFibra, ColoranteCatalogo } from '../services/catalogosApi';
import type { OrdenCompraDB } from '../types/ordenes';

// ---------------------------------------------------------------------------
// Tipos locales
// ---------------------------------------------------------------------------
interface LoteOpcion { id: number; label: string; }

interface FormularioRecetaProps {
  preload?:          RecetaPreload | null;
  recetaAjuste?:    RecetaConMotor | null;
  onRecetaGuardada: (resultado: RecetaConMotor) => void;
  onCancelarAjuste?: () => void;
  onToast:          (tipo: 'success' | 'error', msg: string) => void;
}

// ---------------------------------------------------------------------------
// Constantes del Motor Químico frontend (Preview en tiempo real)
// Deben mantenerse sincronizadas con backend/src/engines/quimico.engine.ts
// ---------------------------------------------------------------------------
const CHEM_CONST = {
  POTASA_CAUST_PREBLAQ: 3.0, AGUA_OXIGENADA: 4.0, HUMECTANTE: 0.5,
  DESENGRASANTE: 0.5, ACIDO_ACETICO_GLACIAL: 0.5, SECUESTRANTE: 10.0,
  IGUALANTE: 1.0, JABON: 0.5, ULTRASIL_B: 1.0,
};

const INTENSITY_MATRIX = [
  { nivel:1.0, descripcion:'Pasteles',    sal:10.0, potasa:3.0 },
  { nivel:2.0, descripcion:'Claros',      sal:20.0, potasa:3.0 },
  { nivel:3.0, descripcion:'Intermedios', sal:40.0, potasa:4.0 },
  { nivel:4.0, descripcion:'Intensos',    sal:80.0, potasa:5.0 },
];

function getIntensityLevel(totalPct: number) {
  if (totalPct <= 0.01) return INTENSITY_MATRIX[0];
  if (totalPct <= 0.1)  return INTENSITY_MATRIX[1];
  if (totalPct <= 1.0)  return INTENSITY_MATRIX[2];
  return INTENSITY_MATRIX[3];
}

/** Genera la secuencia de baños preview para mostrar al técnico antes de guardar. */
function calculatePreviewBaths(fibra: string, pesoKg: number, relacion: number, totalPct: number) {
  const litros = Math.round(pesoKg * relacion * 100) / 100;
  if (isNaN(litros) || litros <= 0) return [];
  const matrix = getIntensityLevel(totalPct);

  const prod  = (nombre: string, conc: number) => ({ nombre, concentracion:conc, gramos:Math.round(conc*litros*100)/100 });
  const conP  = (num:number, nombre:string, fase:string, productos:any[], nota?:string) =>
    ({ numeroBano:num, nombre, fase, esEnjuagueSimple:false, litrosAgua:litros, productos, nota });
  const enj   = (num:number, nombre:string, fase:string, nota?:string) =>
    ({ numeroBano:num, nombre, fase, esEnjuagueSimple:true,  litrosAgua:litros, productos:[], nota });

  const preblaqAlgodon = [
    conP(1,'Preblanqueo','PREBLANQUEO',[prod('Potasa Cáustica',CHEM_CONST.POTASA_CAUST_PREBLAQ),prod('Agua Oxigenada',CHEM_CONST.AGUA_OXIGENADA),prod('Humectante',CHEM_CONST.HUMECTANTE),prod('Desengrasante',CHEM_CONST.DESENGRASANTE)]),
    enj(2,'Enjuague 1 (Agua Limpia)','PREBLANQUEO'),
    conP(3,'Enjuague Neutralizante','PREBLANQUEO',[prod('Ácido Acético Glacial',CHEM_CONST.ACIDO_ACETICO_GLACIAL)],'Neutralizado = agua + Ácido Acético Glacial'),
    enj(4,'Enjuague 2 (Agua Limpia)','PREBLANQUEO'),
  ];

  if (fibra === 'ALGODON') return [
    ...preblaqAlgodon,
    conP(5,'Baño de Teñido Principal','TENIDO',[prod('Fórmula de Colorantes (ver detalle)',0),prod('Secuestrante',CHEM_CONST.SECUESTRANTE),prod('Igualante',CHEM_CONST.IGUALANTE),prod(`Sal Industrial (Nivel ${matrix.nivel} — ${matrix.descripcion})`,matrix.sal),prod(`Potasa Cáustica (Nivel ${matrix.nivel})`,matrix.potasa)],`Nivel de intensidad ${matrix.nivel} (${matrix.descripcion})`),
    conP(6,'Neutralizado','TENIDO',[prod('Ácido Acético Glacial',CHEM_CONST.ACIDO_ACETICO_GLACIAL)],'Neutralizado = agua + Ácido Acético Glacial (0.5 g/L)'),
    conP(7,'Jabonado en Caliente','ACABADO',[prod('Jabón',CHEM_CONST.JABON)]),
    enj(8,'Enjuague Normal (Agua Limpia)','ACABADO'),
    conP(9,'Siliconado / Suavizado','ACABADO',[prod('Ultrasil-B',CHEM_CONST.ULTRASIL_B)]),
  ];

  if (fibra === 'NYLON' || fibra === 'POLIESTER') {
    const fn = fibra === 'NYLON' ? 'Nylon' : 'Poliéster';
    return [
      conP(1,`Baño de Teñido (${fn})`,'TENIDO',[prod(`Fórmula de Colorantes ${fn} (ver detalle)`,0),prod('Ácido Acético Glacial (directo al primer volumen)',CHEM_CONST.ACIDO_ACETICO_GLACIAL)],'Ácido Acético Glacial ingresado directamente. NO hay neutralizado separado.'),
      enj(2,'Enjuague Normal (Agua Limpia)','TENIDO','Se omite el neutralizado — el ácido se incorporó en el baño de teñido'),
      conP(3,'Jabonado','ACABADO',[prod('Jabón',CHEM_CONST.JABON)]),
      conP(4,'Enjuague Final con Suavizado','ACABADO',[prod('Ultrasil-B',CHEM_CONST.ULTRASIL_B)]),
    ];
  }

  if (fibra === 'MULTIFIBRA_ALGODON_NYLON' || fibra === 'MULTIFIBRA_ALGODON_POLIESTER') {
    const sn = fibra.includes('NYLON') ? 'Nylon' : 'Poliéster';
    return [
      conP(1,'Baño de Teñido Algodón','TENIDO_ALGODON',[prod('Fórmula de Colorantes Algodón (ver detalle)',0),prod('Secuestrante',CHEM_CONST.SECUESTRANTE),prod('Igualante',CHEM_CONST.IGUALANTE),prod(`Sal Industrial (Nivel ${matrix.nivel})`,matrix.sal),prod(`Potasa Cáustica (Nivel ${matrix.nivel})`,matrix.potasa)]),
      enj(2,'Enjuague Post-Algodón (Agua Limpia)','TENIDO_ALGODON','El Neutralizado del algodón es ELIMINADO — el ácido viene nativo en el baño de sintético'),
      conP(3,`Baño de Teñido ${sn}`,'TENIDO_SINTETICO',[prod(`Fórmula de Colorantes ${sn} (ver detalle)`,0),prod('Ácido Acético Glacial (nativo — reemplaza el neutralizado del algodón)',CHEM_CONST.ACIDO_ACETICO_GLACIAL)],'Regla crítica: el ácido acético de este baño sustituye el neutralizado eliminado'),
      enj(4,`Enjuague Post-${sn} (Agua Limpia)`,'TENIDO_SINTETICO'),
      conP(5,'Jabonado en Caliente','ACABADO',[prod('Jabón',CHEM_CONST.JABON)]),
      enj(6,'Enjuague Normal (Agua Limpia)','ACABADO'),
      conP(7,'Suavizado Final','ACABADO',[prod('Ultrasil-B',CHEM_CONST.ULTRASIL_B)]),
    ];
  }

  if (fibra === 'MULTIFIBRA_NYLON_POLIESTER') return [
    conP(1,'Baño de Teñido Poliéster','TENIDO_POLIESTER',[prod('Fórmula de Colorantes Poliéster (ver detalle)',0),prod('Ácido Acético Glacial',CHEM_CONST.ACIDO_ACETICO_GLACIAL)]),
    enj(2,'Enjuague Post-Poliéster (Agua Limpia)','TENIDO_POLIESTER'),
    conP(3,'Baño de Teñido Nylon','TENIDO_NYLON',[prod('Fórmula de Colorantes Nylon (ver detalle)',0),prod('Ácido Acético Glacial',CHEM_CONST.ACIDO_ACETICO_GLACIAL)]),
    enj(4,'Enjuague Post-Nylon (Agua Limpia)','TENIDO_NYLON'),
    conP(5,'Jabonado en Caliente','ACABADO',[prod('Jabón',CHEM_CONST.JABON)]),
    enj(6,'Enjuague Normal (Agua Limpia)','ACABADO'),
    conP(7,'Suavizado Final','ACABADO',[prod('Ultrasil-B',CHEM_CONST.ULTRASIL_B)]),
  ];

  return [];
}

// ---------------------------------------------------------------------------
// Heurística de tipo de colorante (idéntica a ModalDetalleReceta)
// ---------------------------------------------------------------------------
function getColoranteTipo(
  coloranteId: number, nombreColorante: string, catalogos: Catalogos | null
): 'REACTIVO' | 'ACIDO' | 'DISPERSO' {
  if (catalogos?.colorantesCatalogo) {
    const found = catalogos.colorantesCatalogo.find(c => c.id === coloranteId);
    if (found) return found.tipoColorante;
  }
  const n = nombreColorante.toLowerCase();
  const esAcido    = n.includes('ácido') || n.includes('acido') || n.includes('acid') || n.includes('nylon') || n.includes('lanasol') || n.includes('erionyl');
  const esDisperso = n.includes('dispers') || n.includes('dianix') || n.includes('poliéster') || n.includes('poliester');
  if (n.includes('ramazol') || n.includes('reactive') || n.includes('reactivo') || n.includes('black b') || n.includes('yellow') || n.includes('blue') || n.includes('red')) {
    if (esAcido)    return 'ACIDO';
    if (esDisperso) return 'DISPERSO';
    return 'REACTIVO';
  }
  if (esAcido)    return 'ACIDO';
  if (esDisperso) return 'DISPERSO';
  return 'REACTIVO';
}

// ---------------------------------------------------------------------------
// Constantes de estilo reutilizadas
// ---------------------------------------------------------------------------
const STY_CHIP_ITER: React.CSSProperties = { fontSize:'11px', padding:'2px 8px', background:'var(--bg-glass)', border:'1px solid var(--border-subtle)', borderRadius:'4px' };

/** Chips de colorantes para el historial de iteraciones (fibra simple o multifibra). */
function renderIterationChips(colorantes: any[], composicionFibraCodigo: string, catalogos: Catalogos | null) {
  const chip = (col: any, cidx: number) => (
    <span key={cidx} style={STY_CHIP_ITER}>
      🎨 {col.nombreColorante}: <strong>{col.porcentaje}%</strong> ({formatearGramos(col.gramos)})
    </span>
  );

  if (!composicionFibraCodigo.startsWith('MULTIFIBRA')) {
    return <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginTop:'6px' }}>{colorantes.map(chip)}</div>;
  }

  const reactivos = colorantes.filter(c => getColoranteTipo(c.coloranteId, c.nombreColorante, catalogos) === 'REACTIVO');
  const acidos    = colorantes.filter(c => getColoranteTipo(c.coloranteId, c.nombreColorante, catalogos) === 'ACIDO');
  const dispersos = colorantes.filter(c => getColoranteTipo(c.coloranteId, c.nombreColorante, catalogos) === 'DISPERSO');

  const grupo = (label: string, lista: any[]) => lista.length > 0 && (
    <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', alignItems:'center' }}>
      <span style={{ fontSize:'11px', fontWeight:600, color:'var(--text-muted)', marginRight:'4px' }}>[ {label}: ]</span>
      {lista.map(chip)}
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginTop:'6px', width:'100%' }}>
      {grupo('Algodón',   reactivos)}
      {grupo('Nylon',     acidos)}
      {grupo('Poliéster', dispersos)}
    </div>
  );
}

/** Fila de tabla de baños (Químico + Dosis + Gramos). Reutilizada en preview y ajuste. */
function BanoTablaRow({ p }: { p: any }) {
  const esColorante = p.nombre.toLowerCase().includes('colorante');
  return (
    <tr style={{ borderBottom:'1px dotted var(--border-subtle)', color:'var(--text-primary)' }}>
      <td style={{ padding:'6px 4px' }}>{p.nombre}</td>
      <td style={{ padding:'6px 4px', textAlign:'right', fontFamily:'var(--font-mono)' }}>
        {esColorante ? '—' : p.concentracion.toFixed(2)}
      </td>
      <td style={{ padding:'6px 4px', textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:'bold', color: esColorante ? 'var(--text-muted)' : 'var(--accent-teal)' }}>
        {esColorante ? 'Fórmula' : `${p.gramos.toFixed(2)} g`}
      </td>
    </tr>
  );
}

/** Tarjeta de un baño en el panel de preview (ajuste o nueva receta). */
function BanoPreviewCard({ b }: { b: any }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid var(--border-subtle)', borderRadius:'8px', padding:'14px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
        <div>
          <span style={{ background:'var(--accent-teal)', color:'#000', fontSize:'11px', fontWeight:'bold', padding:'2px 6px', borderRadius:'4px', marginRight:'8px' }}>
            Baño #{b.numeroBano}
          </span>
          <strong style={{ fontSize:'14px', color:'var(--text-primary)' }}>{b.nombre}</strong>
        </div>
        <span style={{ fontSize:'12px', color:'var(--accent-purple)', fontWeight:'600' }}>💧 {b.litrosAgua} L</span>
      </div>
      {b.nota && <p style={{ fontSize:'11px', color:'var(--text-muted)', margin:'0 0 8px 0', fontStyle:'italic' }}>ℹ️ {b.nota}</p>}
      {b.productos && b.productos.length > 0 ? (
        <table style={{ width:'100%', fontSize:'12px', borderCollapse:'collapse', marginTop:'8px' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--border-subtle)', textAlign:'left', color:'var(--text-muted)' }}>
              <th style={{ padding:'4px' }}>Químico</th>
              <th style={{ padding:'4px', textAlign:'right' }}>Dosis (g/L)</th>
              <th style={{ padding:'4px', textAlign:'right' }}>Cantidad Requerida (g)</th>
            </tr>
          </thead>
          <tbody>{b.productos.map((p: any, idx: number) => <BanoTablaRow key={idx} p={p} />)}</tbody>
        </table>
      ) : (
        <div style={{ fontSize:'12px', color:'var(--text-muted)', fontStyle:'italic', padding:'4px' }}>
          Enjuague simple — solo agua limpia, sin insumos químicos.
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================
const FormularioReceta: React.FC<FormularioRecetaProps> = ({
  preload, recetaAjuste, onRecetaGuardada, onCancelarAjuste, onToast,
}) => {
  // ── Estados de catálogos y UI ──
  const [catalogos, setCatalogos]         = useState<Catalogos | null>(null);
  const [lotes, setLotes]                 = useState<LoteOpcion[]>([]);
  const [busquedaColorante, setBusquedaColorante] = useState('');
  const [guardando, setGuardando]         = useState(false);
  const [errores, setErrores]             = useState<Record<string,string>>({});
  const [banosAbierto, setBanosAbierto]   = useState(false);

  // ── Estados de campos físicos ──
  const [detalleOrdenId, setDetalleOrdenId]           = useState('');
  const [pesoRealKg, setPesoRealKg]                   = useState('');
  const [articuloNombre, setArticuloNombre]           = useState('');
  const [relacionBano, setRelacionBano]               = useState('');
  const [descripcionColor, setDescripcionColor]       = useState('');
  const [observaciones, setObservaciones]             = useState('');
  const [composicionFibraCodigo, setComposicionFibraCodigo] = useState('');

  // ── Estados de colorantes ──
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [porcentajes, setPorcentajes]     = useState<Map<number,string>>(new Map());

  // ── Carga inicial: catálogos + lotes disponibles ──
  useEffect(() => {
    fetchCatalogos().then(setCatalogos).catch(() => {});
    obtenerOrdenes().then(data => {
      const opts: LoteOpcion[] = [];
      for (const oc of data.ordenes as OrdenCompraDB[]) {
        if (oc.estado.codigo !== 'PENDIENTE' && oc.estado.codigo !== 'EN_PROCESO') continue;
        for (const d of oc.detalles ?? []) {
          if (d.recetaTecnica?.estado === 'APROBADO') continue;
          opts.push({ id:d.id, label:`${oc.numeroOC} · ${d.colorSolicitado} · ${d.cantidad}m · ${oc.cliente.nombre}` });
        }
      }
      setLotes(opts);
    }).catch(() => {});
  }, []);

  // ── Aplicar preload (duplicar) o recetaAjuste (ajuste de lote) ──
  useEffect(() => {
    if (recetaAjuste) {
      const r = recetaAjuste.receta;
      setDetalleOrdenId(String(r.detalleOrdenId)); setPesoRealKg(String(r.pesoRealKg));
      setArticuloNombre(r.articulo); setRelacionBano(String(r.relacionBano));
      setDescripcionColor(r.descripcionColor); setObservaciones('');
      setComposicionFibraCodigo(r.composicionFibra);
      const sel = new Set<number>(); const pct = new Map<number,string>();
      for (const c of r.colorantes) { sel.add(c.coloranteId); pct.set(c.coloranteId, String(c.porcentaje)); }
      setSeleccionados(sel); setPorcentajes(pct); setErrores({});
      return;
    }
    if (preload) {
      setPesoRealKg(preload.pesoRealKg); setArticuloNombre(preload.articulo);
      setRelacionBano(preload.relacionBano); setDescripcionColor(preload.descripcionColor);
      setObservaciones(preload.observacionesTecnicas); setComposicionFibraCodigo(preload.composicionFibra);
      setDetalleOrdenId('');
      const sel = new Set<number>(); const pct = new Map<number,string>();
      for (const c of preload.colorantes) { sel.add(c.coloranteId); pct.set(c.coloranteId, c.porcentaje); }
      setSeleccionados(sel); setPorcentajes(pct); setErrores({});
    }
  }, [preload, recetaAjuste]);

  // Cambiar fibra limpia la selección de colorantes
  const cambiarComposicion = useCallback((codigo: string) => {
    if (recetaAjuste) return;
    setComposicionFibraCodigo(codigo);
    setSeleccionados(new Set()); setPorcentajes(new Map());
  }, [recetaAjuste]);

  // Toggle de colorante
  const toggleColorante = useCallback((id: number) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setPorcentajes(p => { const n = new Map(p); n.delete(id); return n; });
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const setPorcentaje = (id: number, val: string) =>
    setPorcentajes(prev => new Map(prev).set(id, val));

  // ── Valores calculados en tiempo real ──
  const pesoNum    = parseFloat(pesoRealKg);
  const relacionNum = parseFloat(relacionBano);
  const totalPct   = [...seleccionados].reduce((sum, id) => sum + (parseFloat(porcentajes.get(id) ?? '0') || 0), 0);
  const intensidad = { nivel:getIntensityLevel(totalPct).nivel, desc:getIntensityLevel(totalPct).descripcion, suma:totalPct };
  const nivelClase = getNivelClase(intensidad.nivel);
  const iteraciones = Array.isArray(recetaAjuste?.receta.iteraciones) ? recetaAjuste.receta.iteraciones : [];

  // Secuencia de baños a mostrar en preview
  const banosPreview = recetaAjuste
    ? (recetaAjuste.receta.secuenciaBanos || [])
    : (composicionFibraCodigo && !isNaN(pesoNum) && !isNaN(relacionNum)
        ? calculatePreviewBaths(composicionFibraCodigo, pesoNum, relacionNum, totalPct)
        : []);

  // ── Validación del formulario ──
  function validar() {
    const e: Record<string,string> = {};
    if (!recetaAjuste && !detalleOrdenId) e['lote'] = 'Debes seleccionar un lote de OC.';
    if (!pesoRealKg || isNaN(parseFloat(pesoRealKg)) || parseFloat(pesoRealKg) <= 0) e['peso'] = 'Peso requerido.';
    if (!articuloNombre.trim()) e['articulo'] = 'Nombre de artículo requerido.';
    if (!relacionBano || isNaN(parseInt(relacionBano))) e['relacion'] = 'Relación de baño requerida.';
    if (!descripcionColor.trim()) e['color'] = 'Descripción de color requerida.';
    if (!composicionFibraCodigo) e['fibra'] = 'Debes seleccionar la composición de fibra.';
    if (seleccionados.size === 0) e['colorantes'] = 'Debes seleccionar al menos un colorante.';
    for (const id of seleccionados) {
      const v = parseFloat(porcentajes.get(id) ?? '0');
      if (isNaN(v) || v <= 0) { e[`pct_${id}`] = 'Porcentaje inválido.'; }
    }
    if (recetaAjuste && !observaciones.trim()) e['observaciones'] = 'Explica el motivo del ajuste.';
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  // ── Handlers de submit ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;
    setGuardando(true);
    try {
      const colorantesPayload = [...seleccionados].map(id => ({
        coloranteId:id, porcentaje:parseFloat(porcentajes.get(id) ?? '0'),
      }));
      const resultado = await crearReceta({
        detalleOrdenId:parseInt(detalleOrdenId), pesoRealKg:parseFloat(pesoRealKg),
        articuloNombre:articuloNombre.trim(), composicionFibraCodigo,
        relacionBano:parseFloat(relacionBano), descripcionColor:descripcionColor.trim(),
        observacionesTecnicas:observaciones.trim() || undefined, colorantes:colorantesPayload,
      });
      onToast('success', `✅ Receta "${resultado.receta.descripcionColor}" guardada. ${resultado.motorQuimico.totalBanos} baños generados.`);
      onRecetaGuardada(resultado);
      // Limpiar formulario
      setDetalleOrdenId(''); setPesoRealKg(''); setArticuloNombre('');
      setRelacionBano(''); setDescripcionColor(''); setObservaciones('');
      setComposicionFibraCodigo(''); setSeleccionados(new Set()); setPorcentajes(new Map());
    } catch (err) {
      onToast('error', `❌ ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally { setGuardando(false); }
  }

  async function handleGuardarAjuste() {
    if (!recetaAjuste || !validar()) return;
    setGuardando(true);
    try {
      const colorantesPayload = [...seleccionados].map(id => ({
        coloranteId:id, porcentaje:parseFloat(porcentajes.get(id) ?? '0'),
      }));
      const resultado = await registrarIteracion(recetaAjuste.receta.id, colorantesPayload, observaciones.trim());
      onToast('success', `✅ Ajuste guardado (Iteración ${resultado.receta.iteraciones.length}).`);
      onRecetaGuardada(resultado);
    } catch (err) {
      onToast('error', `❌ ${err instanceof Error ? err.message : 'Error al guardar el ajuste'}`);
    } finally { setGuardando(false); }
  }

  async function handleAprobarReceta() {
    if (!recetaAjuste) return;
    setGuardando(true);
    try {
      const resultado = await aprobarReceta(recetaAjuste.receta.id);
      onToast('success', '✅ Receta aprobada. El color ha sido aprobado y el lote finalizado.');
      onRecetaGuardada(resultado);
    } catch (err) {
      onToast('error', `❌ ${err instanceof Error ? err.message : 'Error al aprobar la receta'}`);
    } finally { setGuardando(false); }
  }

  // ── Filtrar colorantes compatibles con la fibra seleccionada ──
  const colorantesFiltrados = (catalogos?.colorantesCatalogo ?? []).filter(c => {
    if (!c.nombre.toLowerCase().includes(busquedaColorante.toLowerCase())) return false;
    if (!composicionFibraCodigo) return true;
    if (composicionFibraCodigo === 'ALGODON')   return c.tipoColorante === 'REACTIVO';
    if (composicionFibraCodigo === 'NYLON')     return c.tipoColorante === 'ACIDO';
    if (composicionFibraCodigo === 'POLIESTER') return c.tipoColorante === 'DISPERSO';
    if (composicionFibraCodigo === 'MULTIFIBRA_ALGODON_NYLON')     return c.tipoColorante === 'REACTIVO' || c.tipoColorante === 'ACIDO';
    if (composicionFibraCodigo === 'MULTIFIBRA_ALGODON_POLIESTER') return c.tipoColorante === 'REACTIVO' || c.tipoColorante === 'DISPERSO';
    if (composicionFibraCodigo === 'MULTIFIBRA_NYLON_POLIESTER')   return c.tipoColorante === 'ACIDO'    || c.tipoColorante === 'DISPERSO';
    return true;
  });

  // ── Fila individual de colorante ──
  const renderColoranteRow = (c: ColoranteCatalogo) => {
    const activo  = seleccionados.has(c.id);
    const valPct  = parseFloat(porcentajes.get(c.id) ?? '0');
    const gramosCol = !isNaN(pesoNum) && !isNaN(valPct) ? (pesoNum * 1000 * (valPct / 100)) : 0;
    return (
      <div key={c.id} className={`colorante-fila ${activo ? 'activo' : ''}`} onClick={() => toggleColorante(c.id)}>
        <div className="colorante-check">
          <input id={`chk-col-${c.id}`} type="checkbox" checked={activo}
            onChange={() => toggleColorante(c.id)} onClick={e => e.stopPropagation()} />
        </div>
        <label className="colorante-nombre" htmlFor={`chk-col-${c.id}`}>{c.nombre}</label>
        {activo && (
          <div className="colorante-pct" onClick={e => e.stopPropagation()} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            {gramosCol > 0 && <span style={{ fontSize:'11px', color:'var(--accent-teal)', fontFamily:'var(--font-mono)' }}>({formatearGramos(gramosCol)})</span>}
            <input id={`pct-col-${c.id}`} type="number" className={`pct-input ${errores[`pct_${c.id}`] ? 'error' : ''}`}
              placeholder="%" step="0.001" min="0.0001"
              value={porcentajes.get(c.id) ?? ''} onChange={e => setPorcentaje(c.id, e.target.value)} />
            <span className="pct-unit">%</span>
          </div>
        )}
      </div>
    );
  };

  // ── Lista de colorantes (simple o agrupada por fibra) ──
  const renderColorantesList = () => {
    if (colorantesFiltrados.length === 0) {
      return <div style={{ color:'var(--text-muted)', fontSize:'13px', padding:'12px', textAlign:'center', width:'100%' }}>No se encontraron colorantes compatibles con ese nombre.</div>;
    }
    if (!composicionFibraCodigo.startsWith('MULTIFIBRA')) {
      return <div className="colorantes-grid" style={{ width:'100%' }}>{colorantesFiltrados.map(renderColoranteRow)}</div>;
    }

    const reactivos = colorantesFiltrados.filter(c => c.tipoColorante === 'REACTIVO');
    const acidos    = colorantesFiltrados.filter(c => c.tipoColorante === 'ACIDO');
    const dispersos = colorantesFiltrados.filter(c => c.tipoColorante === 'DISPERSO');

    const grupoHeader = (label: string, color: string, border: string) => (
      <div style={{ fontSize:'12px', fontWeight:700, color, marginBottom:'8px', borderBottom:`1px solid ${border}`, paddingBottom:'4px', letterSpacing:'0.5px' }}>
        ── {label} ──
      </div>
    );

    return (
      <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:'16px' }}>
        {composicionFibraCodigo.includes('ALGODON') && reactivos.length > 0 && (
          <div>{grupoHeader('Colorantes para Algodón','var(--accent-teal)','rgba(20,184,166,0.2)')}<div className="colorantes-grid">{reactivos.map(renderColoranteRow)}</div></div>
        )}
        {composicionFibraCodigo.includes('NYLON') && acidos.length > 0 && (
          <div>{grupoHeader('Colorantes para Nylon','var(--accent-purple)','rgba(139,92,246,0.2)')}<div className="colorantes-grid">{acidos.map(renderColoranteRow)}</div></div>
        )}
        {composicionFibraCodigo.includes('POLIESTER') && dispersos.length > 0 && (
          <div>{grupoHeader('Colorantes para Poliéster','var(--accent-gold)','rgba(245,158,11,0.2)')}<div className="colorantes-grid">{dispersos.map(renderColoranteRow)}</div></div>
        )}
      </div>
    );
  };

  // ── Sección de historial de iteraciones (compartida entre modo ajuste y normal) ──
  const renderHistorialIteraciones = () => iteraciones.length > 0 && (
    <div className="card" style={{ marginBottom:'20px', borderLeft:'4px solid var(--accent-teal)' }}>
      <div className="card-header">
        <div className="card-icon">⏳</div>
        <div>
          <div className="card-title">Historial de Iteraciones (Ajustes de Color)</div>
          <div className="card-desc">Historial cronológico de esta receta técnica</div>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'14px', marginTop:'16px' }}>
        {iteraciones.map((it: any, idx: number) => (
          <div key={idx} style={{ position:'relative', borderLeft:'2px solid var(--border-medium)', paddingLeft:'14px', paddingBottom:'6px' }}>
            <div style={{ position:'absolute', left:'-6px', top:'2px', width:'10px', height:'10px', borderRadius:'50%', background:'var(--accent-teal)' }} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', fontWeight:'bold' }}>
              <span>Iteración #{it.iteracion}</span>
              <span style={{ color:'var(--text-muted)' }}>{new Date(it.fecha).toLocaleString('es-PE')}</span>
            </div>
            <p style={{ margin:'4px 0', fontSize:'12px', color:'var(--text-secondary)' }}><strong>Motivo/Nota:</strong> {it.observacion}</p>
            {renderIterationChips(it.colorantes, composicionFibraCodigo, catalogos)}
          </div>
        ))}
      </div>
    </div>
  );

  // ── Botones de acción ──
  const renderBotonesAccion = (compact = false) => (
    <div className="form-actions" style={{ display:'flex', gap:'12px', justifyContent:'flex-end', marginBottom: compact ? '20px' : '0', marginTop: compact ? '0' : '24px' }}>
      {recetaAjuste ? (
        <>
          <button id="btn-cancelar-ajuste" type="button" className="btn btn-secondary" onClick={onCancelarAjuste}
            style={compact ? { backgroundColor:'#ffffff', border:'1px solid var(--border-medium)', color:'var(--text-secondary)' } : {}}>
            Cancelar
          </button>
          <button id="btn-guardar-ajuste" type="button" className="btn btn-primary" disabled={guardando} onClick={handleGuardarAjuste}>
            {guardando ? '⏳ Guardando...' : `💾 Guardar Ajuste (Iteración ${iteraciones.length + 1})`}
          </button>
          <button id="btn-aprobar-receta" type="button" className="btn btn-success"
            style={{ backgroundColor:'#10b981', color:'#fff', border:'none' }} disabled={guardando} onClick={handleAprobarReceta}>
            ✅ Aprobar Color y Finalizar
          </button>
        </>
      ) : (
        <button id="btn-guardar-receta" type="submit" className="btn btn-primary btn-xl" disabled={guardando}>
          {guardando ? '⏳ Procesando...' : '🧪 Guardar Receta y Generar Motor Químico'}
        </button>
      )}
    </div>
  );

  // ── Panel colapsable de baños ──
  const renderPanelBanos = (compact = false) => banosPreview.length > 0 && (
    <div className="card" style={{ padding:'16px', overflow:'hidden', marginBottom: compact ? '0' : '20px' }}>
      {compact ? (
        /* En modo ajuste: botón toggle */
        <>
          <button type="button" onClick={() => setBanosAbierto(!banosAbierto)}
            style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', background:'transparent', border:'none', color:'var(--accent-teal)', fontWeight:'600', cursor:'pointer', fontSize:'14px', padding:'0', outline:'none' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:'8px' }}>⚡ Ver especificaciones de baños {banosAbierto ? '▲' : '▼'}</span>
            <span>{banosAbierto ? '∧' : '∨'}</span>
          </button>
          {!banosAbierto && (
            <div style={{ fontSize:'13px', color:'var(--text-muted)', marginTop:'8px', borderTop:'1px solid var(--border-subtle)', paddingTop:'8px' }}>
              Baños fijos de la formulación inicial — {banosPreview.length} baños totales
            </div>
          )}
          <div style={{ maxHeight:banosAbierto ? '4000px' : '0px', opacity:banosAbierto ? 1 : 0, transition:'max-height 200ms ease, opacity 200ms ease', marginTop:banosAbierto ? '16px' : '0px', overflow:'hidden' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {banosPreview.map((b: any) => <BanoPreviewCard key={b.numeroBano} b={b} />)}
            </div>
          </div>
        </>
      ) : (
        /* En modo nueva receta: siempre visible con header */
        <>
          <div className="card-header">
            <div className="card-icon">⚡</div>
            <div>
              <div className="card-title">Secuencia de Baños (Vista Previa)</div>
              <div className="card-desc">Calculada automáticamente según las reglas químicas.</div>
            </div>
            <span style={{ fontSize:'11px', background:'rgba(20,184,166,0.15)', color:'var(--accent-teal)', border:'1px solid rgba(20,184,166,0.3)', padding:'4px 10px', borderRadius:'12px', fontWeight:'bold' }}>
              {banosPreview.length} Baños Totales
            </span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginTop:'16px' }}>
            {banosPreview.map((b: any) => <BanoPreviewCard key={b.numeroBano} b={b} />)}
          </div>
        </>
      )}
    </div>
  );

  // ==========================================================================
  // RENDER — Modo Ajuste (recetaAjuste != null)
  // ==========================================================================
  if (recetaAjuste) {
    return (
      <form onSubmit={e => e.preventDefault()} noValidate>
        {renderHistorialIteraciones()}

        {/* Parámetros físicos bloqueados (solo lectura) */}
        <div className="card" style={{ marginBottom:'20px', padding:'16px 20px' }}>
          <div style={{ display:'flex', flexDirection:'row', flexWrap:'wrap', gap:'20px', justifyContent:'space-around', alignItems:'center' }}>
            {[
              { label:'Peso Real',          value:`${pesoRealKg} kg` },
              { label:'Fibra',              value:catalogos?.composicionesFibra.find(f => f.codigo === composicionFibraCodigo)?.etiqueta ?? composicionFibraCodigo },
              { label:'Relación de Baño',   value:`1 : ${relacionBano}` },
              { label:'Artículo',           value:articuloNombre },
              { label:'Color a Reproducir', value:descripcionColor },
            ].reduce<JSX.Element[]>((acc, item, i, arr) => {
              acc.push(
                <div key={item.label} style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
                  <span style={{ fontSize:'11px', color:'var(--text-muted)', textTransform:'uppercase', fontWeight:600 }}>{item.label}</span>
                  <span style={{ fontSize:'13px', fontWeight:700, color:'var(--text-primary)' }}>{item.value}</span>
                </div>
              );
              if (i < arr.length - 1) acc.push(<div key={`div-${i}`} style={{ width:'1px', height:'24px', backgroundColor:'var(--border-subtle)' }} />);
              return acc;
            }, [])}
          </div>
        </div>

        {/* Fórmula de colorantes (editable) */}
        <div className="card" style={{ marginBottom:'20px', border:'2px solid var(--accent-teal)', backgroundColor:'rgba(13,148,136,0.04)', padding:'20px' }}>
          <div className="card-header" style={{ marginBottom:'16px' }}>
            <div className="card-icon">🎨</div>
            <div>
              <div className="card-title" style={{ color:'var(--accent-teal-dim)' }}>Fórmula de Colorantes (Ajuste)</div>
              <div className="card-desc">Única sección editable: selecciona o ajusta porcentajes</div>
            </div>
            {seleccionados.size > 0 && (
              <div className={`intensidad-chip ${nivelClase}`}>
                Σ {intensidad.suma.toFixed(4)}% — <strong>Nivel {intensidad.nivel}</strong> {intensidad.desc}
              </div>
            )}
          </div>
          <div className="form-group" style={{ marginBottom:'16px' }}>
            <input type="text" className="form-input" placeholder="🔍 Buscar colorante..."
              value={busquedaColorante} onChange={e => setBusquedaColorante(e.target.value)}
              style={{ backgroundColor:'#ffffff' }} />
          </div>
          {errores['colorantes'] && <div style={{ fontSize:'12px', color:'var(--accent-red)', marginBottom:'8px' }}>{errores['colorantes']}</div>}
          <div style={{ backgroundColor:'#ffffff', borderRadius:'8px', padding:'12px', border:'1px solid var(--border-subtle)' }}>
            {renderColorantesList()}
          </div>
          {seleccionados.size > 0 && (
            <div className="colorantes-resumen" style={{ marginTop:'16px' }}>
              {[...seleccionados].map(id => {
                const nombre = catalogos?.colorantesCatalogo.find(c => c.id === id)?.nombre ?? `ID:${id}`;
                const valPct = parseFloat(porcentajes.get(id) ?? '0');
                const gCol   = !isNaN(pesoNum) && !isNaN(valPct) ? (pesoNum * 1000 * (valPct / 100)) : 0;
                return <span key={id} className="colorante-tag" style={{ backgroundColor:'#ffffff', border:'1px solid var(--border-subtle)' }}>{nombre}: {porcentajes.get(id) ?? '?'}% ({formatearGramos(gCol)})</span>;
              })}
            </div>
          )}
        </div>

        {/* Observaciones / Motivo de ajuste */}
        <div className="card" style={{ marginBottom:'20px', padding:'20px' }}>
          <div className="form-group" style={{ margin:0 }}>
            <label className="form-label" htmlFor="txt-obs" style={{ fontWeight:600 }}>
              Observaciones / Motivo de Ajuste <span className="required">*</span>
            </label>
            <textarea id="txt-obs" className={`form-input form-textarea ${errores['observaciones'] ? 'error' : ''}`}
              placeholder="Explica detalladamente el motivo del ajuste (ej: Faltó intensidad, Matizar 10% azul)..."
              rows={3} value={observaciones} onChange={e => setObservaciones(e.target.value)} />
            {errores['observaciones'] && <span style={{ fontSize:'11px', color:'var(--accent-red)', marginTop:'6px', display:'block' }}>{errores['observaciones']}</span>}
          </div>
        </div>

        {renderBotonesAccion(true)}
        {renderPanelBanos(true)}
      </form>
    );
  }

  // ==========================================================================
  // RENDER — Modo Nueva Receta
  // ==========================================================================
  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* Datos físicos */}
      <div className="card" style={{ marginBottom:'20px' }}>
        <div className="card-header">
          <div className="card-icon">⚗️</div>
          <div><div className="card-title">Parámetros Físicos</div><div className="card-desc">Datos de la pieza a teñir</div></div>
        </div>

        {/* Selector de lote */}
        <div className="form-group" style={{ marginBottom:'20px' }}>
          <label className="form-label" htmlFor="sel-lote">Lote de Orden de Compra <span className="required">*</span></label>
          <select id="sel-lote" className="form-input form-select" value={detalleOrdenId}
            onChange={e => setDetalleOrdenId(e.target.value)} disabled={!!recetaAjuste}
            style={errores['lote'] ? { borderColor:'var(--accent-red)' } : {}}>
            <option value="">— Selecciona el lote —</option>
            {lotes.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
          {errores['lote'] && <span style={{ fontSize:'11px', color:'var(--accent-red)' }}>{errores['lote']}</span>}
          {detalleOrdenId && <div className="lote-selector-info">Lote #{detalleOrdenId} seleccionado — la receta quedará vinculada a este lote.</div>}
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="inp-peso">Peso Real (kg) <span className="required">*</span></label>
            <input id="inp-peso" type="number" step="0.01" min="0.01" className="form-input"
              placeholder="Ej: 2.50" value={pesoRealKg} onChange={e => setPesoRealKg(e.target.value)} disabled={!!recetaAjuste}
              style={errores['peso'] ? { borderColor:'var(--accent-red)' } : {}} />
            {errores['peso'] && <span style={{ fontSize:'11px', color:'var(--accent-red)' }}>{errores['peso']}</span>}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="inp-relacion">Relación de Baño (1:X) <span className="required">*</span></label>
            <input id="inp-relacion" type="number" step="1" min="1" className="form-input"
              placeholder="Ej: 40" value={relacionBano} onChange={e => setRelacionBano(e.target.value)} disabled={!!recetaAjuste}
              style={errores['relacion'] ? { borderColor:'var(--accent-red)' } : {}} />
            {errores['relacion'] && <span style={{ fontSize:'11px', color:'var(--accent-red)' }}>{errores['relacion']}</span>}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="inp-articulo">Artículo (Texto Libre) <span className="required">*</span></label>
            <input id="inp-articulo" type="text" list="articulos-sugeridos" className="form-input"
              placeholder="Ej: Jersey 30/1 Peinado" value={articuloNombre} onChange={e => setArticuloNombre(e.target.value)}
              disabled={!!recetaAjuste} style={errores['articulo'] ? { borderColor:'var(--accent-red)' } : {}} />
            <datalist id="articulos-sugeridos">
              {(catalogos?.articulosTextiles ?? []).map((a: ArticuloTextil) => <option key={a.id} value={a.nombre} />)}
            </datalist>
            {errores['articulo'] && <span style={{ fontSize:'11px', color:'var(--accent-red)' }}>{errores['articulo']}</span>}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="inp-color">Color a reproducir <span className="required">*</span></label>
            <input id="inp-color" type="text" className="form-input"
              placeholder="Ej: Navy Blue" value={descripcionColor} onChange={e => setDescripcionColor(e.target.value)}
              disabled={!!recetaAjuste} style={errores['color'] ? { borderColor:'var(--accent-red)' } : {}} />
            {errores['color'] && <span style={{ fontSize:'11px', color:'var(--accent-red)' }}>{errores['color']}</span>}
          </div>
        </div>

        <div className="form-group" style={{ marginTop:'12px' }}>
          <label className="form-label" htmlFor="txt-obs">Observaciones técnicas</label>
          <textarea id="txt-obs" className="form-input form-textarea"
            placeholder="Notas del proceso de teñido..." rows={2}
            value={observaciones} onChange={e => setObservaciones(e.target.value)}
            style={errores['observaciones'] ? { borderColor:'var(--accent-red)' } : {}} />
          {errores['observaciones'] && <span style={{ fontSize:'11px', color:'var(--accent-red)' }}>{errores['observaciones']}</span>}
        </div>
      </div>

      {/* Composición de fibra */}
      <div className="card" style={{ marginBottom:'20px' }}>
        <div className="card-header">
          <div className="card-icon">🧵</div>
          <div><div className="card-title">Composición de Fibra</div><div className="card-desc">Determina la ruta del Motor Químico</div></div>
        </div>
        <div className="fibra-grid">
          {(catalogos?.composicionesFibra ?? []).map((f: ComposicionFibra) => (
            <button key={f.id} type="button" disabled={!!recetaAjuste}
              className={`fibra-btn ${composicionFibraCodigo === f.codigo ? 'active' : ''}`}
              onClick={() => cambiarComposicion(f.codigo)}
              style={recetaAjuste ? { opacity:0.6, cursor:'not-allowed' } : {}}>
              <span className="fibra-btn-icon">
                {f.codigo === 'ALGODON' ? '🌿' : f.codigo === 'NYLON' ? '🔵' : f.codigo === 'POLIESTER' ? '🟠' : '🔀'}
              </span>
              <span className="fibra-btn-label">{f.etiqueta}</span>
              <span className="fibra-btn-banos">{f.totalBanos} baños</span>
            </button>
          ))}
        </div>
        {errores['fibra'] && <div style={{ fontSize:'12px', color:'var(--accent-red)', marginTop:'8px' }}>{errores['fibra']}</div>}
        {composicionFibraCodigo && catalogos && (
          <div className="fibra-info-box">
            {catalogos.composicionesFibra.find(f => f.codigo === composicionFibraCodigo)?.descripcionRuta ?? composicionFibraCodigo}
          </div>
        )}
      </div>

      {/* Fórmula de colorantes */}
      <div className="card" style={{ marginBottom:'20px' }}>
        <div className="card-header">
          <div className="card-icon">🎨</div>
          <div><div className="card-title">Fórmula de Colorantes</div><div className="card-desc">Selecciona e ingresa el % de cada colorante</div></div>
          {seleccionados.size > 0 && (
            <div className={`intensidad-chip ${nivelClase}`}>
              Σ {intensidad.suma.toFixed(4)}% — <strong>Nivel {intensidad.nivel}</strong> {intensidad.desc}
            </div>
          )}
        </div>
        <div className="form-group" style={{ marginBottom:'12px' }}>
          <input type="text" className="form-input" placeholder="🔍 Buscar colorante..."
            value={busquedaColorante} onChange={e => setBusquedaColorante(e.target.value)} />
        </div>
        {errores['colorantes'] && <div style={{ fontSize:'12px', color:'var(--accent-red)', marginBottom:'8px' }}>{errores['colorantes']}</div>}
        {renderColorantesList()}
        {seleccionados.size > 0 && (
          <div className="colorantes-resumen">
            {[...seleccionados].map(id => {
              const nombre = catalogos?.colorantesCatalogo.find(c => c.id === id)?.nombre ?? `ID:${id}`;
              const valPct = parseFloat(porcentajes.get(id) ?? '0');
              const gCol   = !isNaN(pesoNum) && !isNaN(valPct) ? (pesoNum * 1000 * (valPct / 100)) : 0;
              return <span key={id} className="colorante-tag">{nombre}: {porcentajes.get(id) ?? '?'}% ({formatearGramos(gCol)})</span>;
            })}
          </div>
        )}
      </div>

      {/* Preview de baños en tiempo real */}
      {renderPanelBanos(false)}

      {renderBotonesAccion(false)}
    </form>
  );
};

export default FormularioReceta;
