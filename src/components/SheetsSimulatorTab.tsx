import React, { useState } from "react";
import { 
  Ingreso, 
  Egreso, 
  Deuda, 
  MetaPilar,
  AgendaEvento,
  CategoriaIngreso,
  CategoriaPilar,
  TipoGasto,
  TipoTarjeta,
  EstadoMeta
} from "../types";
import { 
  Plus, 
  Trash2, 
  Database, 
  Calendar, 
  Coins, 
  Target, 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard, 
  Award,
  AlertCircle,
  RotateCcw,
  Sliders,
  CheckCircle2,
  FileSpreadsheet
} from "lucide-react";

interface SheetsSimulatorTabProps {
  darkMode: boolean;
  ingresos: Ingreso[];
  egresos: Egreso[];
  deudas: Deuda[]; // cards (debit and credit)
  metas: MetaPilar[];
  eventos: AgendaEvento[]; // activities
  setIngresos: React.Dispatch<React.SetStateAction<Ingreso[]>>;
  setEgresos: React.Dispatch<React.SetStateAction<Egreso[]>>;
  setDeudas: React.Dispatch<React.SetStateAction<Deuda[]>>;
  setMetas: React.Dispatch<React.SetStateAction<MetaPilar[]>>;
  setEventos: React.Dispatch<React.SetStateAction<AgendaEvento[]>>;
  resetToInitial: () => void;
}

export default function SheetsSimulatorTab({
  darkMode,
  ingresos,
  egresos,
  deudas,
  metas,
  eventos,
  setIngresos,
  setEgresos,
  setDeudas,
  setMetas,
  setEventos,
  resetToInitial
}: SheetsSimulatorTabProps) {
  const [activeSheet, setActiveSheet] = useState<"A" | "B" | "C" | "D" | "E">("B");
  const [showAddForm, setShowAddForm] = useState(false);

  // Form States
  const [ingresoForm, setIngresoForm] = useState({
    Fecha: "2026-06-12",
    Concepto: "",
    Categoria: CategoriaIngreso.NOMINA,
    Monto_Neto: ""
  });

  const [deudaForm, setDeudaForm] = useState({
    Nombre_Tarjeta: "",
    Tipo: TipoTarjeta.CREDITO,
    Limite_Credito: "",
    Saldo_Disponible: "",
    Deuda_Actual: "",
    Pago_Minimo: "",
    Pago_Para_No_Generar_Intereses: "",
    Fecha_Corte: "15",
    Fecha_Limite_Pago: "5",
    Tasa_Interes_Anual: "45"
  });

  const [egresoForm, setEgresoForm] = useState({
    Fecha: "2026-06-12",
    Concepto: "",
    Categoria_Pilar: CategoriaPilar.PERSONAL,
    Subcategoria: "",
    Monto: "",
    Metodo_Pago: "",
    Tipo_Gasto: TipoGasto.VARIABLE
  });

  const [eventoForm, setEventoForm] = useState({
    Titulo_Actividad: "",
    Tipo_Agenda: "Agenda_Personal" as any,
    Pilar: CategoriaPilar.PERSONAL,
    Descripcion_Detallada: "",
    Fecha_Hora_Inicio: "2026-06-12T10:00",
    Fecha_Hora_Fin: "2026-06-12T11:00",
    Requiere_Pago: false
  });

  const generateUuid = (prefix: string) => {
    return prefix + "-" + Math.random().toString(36).substring(2, 9);
  };

  // --- CRUD ACTIONS ---
  const handleAddIngreso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingresoForm.Concepto || !ingresoForm.Monto_Neto) return;
    const valNet = parseFloat(ingresoForm.Monto_Neto);

    const newRecord: Ingreso = {
      ID_Usuario: "",
      ID_Ingreso: generateUuid("ing"),
      Fecha: ingresoForm.Fecha,
      Concepto: ingresoForm.Concepto,
      Categoria: ingresoForm.Categoria,
      Monto_Neto: valNet,
      Monto_Bruto: valNet,
      Cuenta_Destino: "SaaS Cuentas Bancarias"
    };

    setIngresos((prev) => [newRecord, ...prev]);
    setIngresoForm({
      Fecha: "2026-06-12",
      Concepto: "",
      Categoria: CategoriaIngreso.NOMINA,
      Monto_Neto: ""
    });
    setShowAddForm(false);
  };

  const handleAddDeuda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deudaForm.Nombre_Tarjeta) return;

    const parseLim = parseFloat(deudaForm.Limite_Credito) || 0;
    const parseDisp = parseFloat(deudaForm.Saldo_Disponible) || 0;
    const parseDeuda = parseFloat(deudaForm.Deuda_Actual) || 0;

    const newRecord: Deuda = {
      ID_Usuario: "",
      ID_Instrumento: generateUuid("card"),
      ID_Tarjeta: generateUuid("card"),
      Nombre_Tarjeta: deudaForm.Nombre_Tarjeta,
      Nombre_Instrumento: deudaForm.Nombre_Tarjeta,
      Tipo: deudaForm.Tipo,
      Limite_Credito: parseLim,
      Saldo_Disponible: parseDisp,
      Saldo_Al_Corte: parseDeuda,
      Deuda_Actual: parseDeuda,
      Pago_Minimo: parseFloat(deudaForm.Pago_Minimo) || 0,
      Pago_Para_No_Generar_Intereses: parseFloat(deudaForm.Pago_Para_No_Generar_Intereses) || 0,
      Fecha_Corte: parseInt(deudaForm.Fecha_Corte) || 15,
      Fecha_Limite_Pago: parseInt(deudaForm.Fecha_Limite_Pago) || 5,
      Tasa_Interes_Anual: parseFloat(deudaForm.Tasa_Interes_Anual) || 0,
      Balance_Total_Pendiente: parseDeuda,
      Pago_Minimo_Mensual: parseFloat(deudaForm.Pago_Minimo) || 0
    };

    setDeudas((prev) => [newRecord, ...prev]);
    setDeudaForm({
      Nombre_Tarjeta: "",
      Tipo: TipoTarjeta.CREDITO,
      Limite_Credito: "",
      Saldo_Disponible: "",
      Deuda_Actual: "",
      Pago_Minimo: "",
      Pago_Para_No_Generar_Intereses: "",
      Fecha_Corte: "15",
      Fecha_Limite_Pago: "5",
      Tasa_Interes_Anual: "45"
    });
    setShowAddForm(false);
  };

  const handleAddEgreso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!egresoForm.Concepto || !egresoForm.Monto) return;

    const newRecord: Egreso = {
      ID_Usuario: "",
      ID_Egreso: generateUuid("egr"),
      ID_Actividad_Origen: null,
      ID_Tarjeta_Utilizada: "card-direct-sheets-entry",
      Fecha: egresoForm.Fecha,
      Concepto: egresoForm.Concepto,
      Categoria_Pilar: egresoForm.Categoria_Pilar,
      Subcategoria: egresoForm.Subcategoria || "Unassigned",
      Monto: parseFloat(egresoForm.Monto),
      Metodo_Pago: egresoForm.Metodo_Pago || "Hojas Directas",
      Tipo_Gasto: egresoForm.Tipo_Gasto
    };

    setEgresos((prev) => [newRecord, ...prev]);
    setEgresoForm({
      Fecha: "2026-06-12",
      Concepto: "",
      Categoria_Pilar: CategoriaPilar.PERSONAL,
      Subcategoria: "",
      Monto: "",
      Metodo_Pago: "",
      Tipo_Gasto: TipoGasto.VARIABLE
    });
    setShowAddForm(false);
  };

  const handleAddEvento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventoForm.Titulo_Actividad) return;

    const uuidAct = generateUuid("act");
    const newRecord: AgendaEvento = {
      ID_Usuario: "",
      ID_Evento: uuidAct,
      ID_Actividad: uuidAct,
      Tipo_Agenda: eventoForm.Tipo_Agenda,
      Pilar: eventoForm.Pilar,
      Pilar_Asociado: eventoForm.Pilar,
      Titulo_Actividad: eventoForm.Titulo_Actividad,
      Titulo: eventoForm.Titulo_Actividad,
      Descripcion_Detallada: eventoForm.Descripcion_Detallada || "Registrado en Hoja de cálculo",
      Descripcion: eventoForm.Descripcion_Detallada || "Registrado en Hoja de cálculo",
      Fecha_Hora_Inicio: eventoForm.Fecha_Hora_Inicio,
      Fecha_Hora_Fin: eventoForm.Fecha_Hora_Fin,
      Requiere_Pago: eventoForm.Requiere_Pago,
      ID_Egreso_Asociado: null,
      Fecha: eventoForm.Fecha_Hora_Inicio.split("T")[0],
      Tipo_Evento: eventoForm.Pilar,
      Color: "indigo",
      Alerta_Descalce: false
    };

    setEventos((prev) => [newRecord, ...prev]);
    setEventoForm({
      Titulo_Actividad: "",
      Tipo_Agenda: "Agenda_Personal" as any,
      Pilar: CategoriaPilar.PERSONAL,
      Descripcion_Detallada: "",
      Fecha_Hora_Inicio: "2026-06-12T10:00",
      Fecha_Hora_Fin: "2026-06-12T11:00",
      Requiere_Pago: false
    });
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Visual Top Bar Banner */}
      <div className={`p-4 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        darkMode ? "bg-stone-900 border-stone-850" : "bg-white border-stone-200"
      }`}>
        <div className="flex items-center gap-2.5">
          <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-white" : "text-stone-900"}`}>
              Esquemas de Base de Datos Google Sheets (Data Lake)
            </h3>
            <p className="text-[10px] text-stone-500 font-medium">
              Alineación relacional con el aislamiento lógico de inquilino. Cada registro está indexado por ID_Usuario.
            </p>
          </div>
        </div>

        <button
          onClick={resetToInitial}
          className="py-1.5 px-3 rounded-xl border border-rose-500/20 text-rose-500 bg-rose-500/5 text-[10px] uppercase font-bold tracking-wider hover:bg-rose-500 hover:text-white transition-all cursor-pointer flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Restablecer Data Inicial</span>
        </button>
      </div>

      {/* Tabs list sheets */}
      <div className="flex flex-wrap gap-2">
        <button
          id="sheet-tab-b"
          onClick={() => { setActiveSheet("B"); setShowAddForm(false); }}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSheet === "B" 
              ? "bg-stone-900 dark:bg-stone-200 text-white dark:text-stone-900 border-transparent font-extrabold" 
              : darkMode ? "bg-stone-950/60 border-stone-850 text-stone-400 hover:bg-stone-900" : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
          <span>Tabla B: Ingresos ({ingresos.length})</span>
        </button>

        <button
          id="sheet-tab-c"
          onClick={() => { setActiveSheet("C"); setShowAddForm(false); }}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSheet === "C" 
              ? "bg-stone-900 dark:bg-stone-200 text-white dark:text-stone-900 border-transparent font-extrabold" 
              : darkMode ? "bg-stone-950/60 border-stone-850 text-stone-400 hover:bg-stone-900" : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 text-rose-500" />
          <span>Tabla C: Monedero e Instrumentos ({deudas.length})</span>
        </button>

        <button
          id="sheet-tab-d"
          onClick={() => { setActiveSheet("D"); setShowAddForm(false); }}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSheet === "D" 
              ? "bg-stone-900 dark:bg-stone-200 text-white dark:text-stone-900 border-transparent font-extrabold" 
              : darkMode ? "bg-stone-950/60 border-stone-850 text-stone-400 hover:bg-stone-900" : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
          }`}
        >
          <ArrowDownRight className="w-3.5 h-3.5 text-indigo-400" />
          <span>Tabla D: Egresos ({egresos.length})</span>
        </button>

        <button
          id="sheet-tab-e"
          onClick={() => { setActiveSheet("E"); setShowAddForm(false); }}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSheet === "E" 
              ? "bg-stone-900 dark:bg-stone-200 text-white dark:text-stone-900 border-transparent font-extrabold" 
              : darkMode ? "bg-stone-950/60 border-stone-850 text-stone-400 hover:bg-stone-900" : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-purple-400" />
          <span>Tabla E: Actividades y Agenda ({eventos.length})</span>
        </button>
      </div>

      {/* Sheet Frame Content rendering */}
      <div className={`p-6 rounded-3xl border overflow-x-auto min-h-[300px] ${
        darkMode ? "bg-stone-900/60 border-stone-900/80" : "bg-white border-stone-200"
      }`}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest font-bold">
            Mostrando partición lógica activa de Google Sheets (Vista de Celdas)
          </span>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`py-1.5 px-3 rounded-xl border text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
              showAddForm 
                ? "bg-stone-500/10 text-stone-400 border-stone-500/10"
                : "bg-teal-500 text-white border-transparent"
            }`}
          >
            <Plus className="w-3 h-3" />
            <span>{showAddForm ? "Cerrar Panel" : "Añadir Fila manual"}</span>
          </button>
        </div>

        {/* Form Add row dynamically */}
        {showAddForm && (
          <div className={`p-4 rounded-2xl border mb-6 ${
            darkMode ? "bg-stone-950 border-stone-850" : "bg-stone-50 border-stone-200"
          }`}>
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-teal-400 mb-3">Ingresar nueva fila a la tabla activa de Sheets</h4>
            
            {activeSheet === "B" && (
              <form onSubmit={handleAddIngreso} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-[9px] uppercase font-bold text-stone-400">Fecha</label>
                  <input type="date" className="w-full text-xs p-2 rounded-lg border focus:outline-none dark:bg-stone-900" value={ingresoForm.Fecha} onChange={(e)=>setIngresoForm({...ingresoForm, Fecha: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-stone-400">Concepto</label>
                  <input type="text" placeholder="ej. Honorarios Extras" className="w-full text-xs p-2 rounded-lg border focus:outline-none dark:bg-stone-900" value={ingresoForm.Concepto} onChange={(e)=>setIngresoForm({...ingresoForm, Concepto: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-stone-400">Monto Neto</label>
                  <input type="number" placeholder="0.00" className="w-full text-xs p-2 rounded-lg border focus:outline-none dark:bg-stone-900" value={ingresoForm.Monto_Neto} onChange={(e)=>setIngresoForm({...ingresoForm, Monto_Neto: e.target.value})} />
                </div>
                <button type="submit" className="py-2.5 px-4 font-bold rounded-lg bg-teal-500 text-white text-xs cursor-pointer">Insertar Fila</button>
              </form>
            )}

            {activeSheet === "C" && (
              <form onSubmit={handleAddDeuda} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-[9px] uppercase font-bold text-stone-400">Nombre de la Tarjeta</label>
                  <input type="text" placeholder="ej. TDC Oro Visa" className="w-full text-xs p-2 rounded-lg border focus:outline-none dark:bg-stone-900" value={deudaForm.Nombre_Tarjeta} onChange={(e)=>setDeudaForm({...deudaForm, Nombre_Tarjeta: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-stone-400">Tipo de Cuenta</label>
                  <select className="w-full text-xs p-2 rounded-lg border focus:outline-none dark:bg-stone-900" value={deudaForm.Tipo} onChange={(e)=>setDeudaForm({...deudaForm, Tipo: e.target.value as any})}>
                    <option value={TipoTarjeta.CREDITO}>Crédito (TDC)</option>
                    <option value={TipoTarjeta.DEBITO}>Débito (Checking/Ahorros)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-stone-400">Línea de Crédito / Caja</label>
                  <input type="number" placeholder="Monto" className="w-full text-xs p-2 rounded-lg border focus:outline-none dark:bg-stone-900" value={deudaForm.Limite_Credito} onChange={(e)=>setDeudaForm({...deudaForm, Limite_Credito: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-stone-400">Saldo Disponible</label>
                  <input type="number" placeholder="Saldo" className="w-full text-xs p-2 rounded-lg border focus:outline-none dark:bg-stone-900" value={deudaForm.Saldo_Disponible} onChange={(e)=>setDeudaForm({...deudaForm, Saldo_Disponible: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-stone-400">Fecha Corte (Día)</label>
                  <input type="number" className="w-full text-xs p-2 rounded-lg border focus:outline-none dark:bg-stone-900" value={deudaForm.Fecha_Corte} onChange={(e)=>setDeudaForm({...deudaForm, Fecha_Corte: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-stone-400">Fecha Límite Pago (Día)</label>
                  <input type="number" className="w-full text-xs p-2 rounded-lg border focus:outline-none dark:bg-stone-900" value={deudaForm.Fecha_Limite_Pago} onChange={(e)=>setDeudaForm({...deudaForm, Fecha_Limite_Pago: e.target.value})} />
                </div>
                <button type="submit" className="py-2.5 px-4 font-bold rounded-lg bg-teal-500 text-white text-xs cursor-pointer md:col-span-2">Insertar Tarjeta</button>
              </form>
            )}

            {activeSheet === "D" && (
              <form onSubmit={handleAddEgreso} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-[9px] uppercase font-bold text-stone-400">Fecha</label>
                  <input type="date" className="w-full text-xs p-2 rounded-lg border focus:outline-none dark:bg-stone-900" value={egresoForm.Fecha} onChange={(e)=>setEgresoForm({...egresoForm, Fecha: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-stone-400">Concepto</label>
                  <input type="text" placeholder="Concepto del Egreso" className="w-full text-xs p-2 rounded-lg border focus:outline-none dark:bg-stone-900" value={egresoForm.Concepto} onChange={(e)=>setEgresoForm({...egresoForm, Concepto: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-stone-400">Pilar Categoria</label>
                  <select className="w-full text-xs p-2 rounded-lg border focus:outline-none dark:bg-stone-900" value={egresoForm.Categoria_Pilar} onChange={(e)=>setEgresoForm({...egresoForm, Categoria_Pilar: e.target.value as any})}>
                    <option value={CategoriaPilar.NECESIDAD_ESENCIAL}>Necesidades básicas</option>
                    <option value={CategoriaPilar.SALUD}>Salud / Medicina</option>
                    <option value={CategoriaPilar.ESCOLAR}>Escolar / Tesis</option>
                    <option value={CategoriaPilar.LABORAL}>Laboral / Empleos</option>
                    <option value={CategoriaPilar.PERSONAL}>Personal / Esparcimiento</option>
                    <option value={CategoriaPilar.AMOROSO}>Amoroso / Social</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-stone-400">Monto</label>
                  <input type="number" placeholder="0.00" className="w-full text-xs p-2 rounded-lg border focus:outline-none dark:bg-stone-900" value={egresoForm.Monto} onChange={(e)=>setEgresoForm({...egresoForm, Monto: e.target.value})} />
                </div>
                <button type="submit" className="py-2.5 px-4 font-bold rounded-lg bg-teal-500 text-white text-xs cursor-pointer md:col-span-4">Insertar Egreso</button>
              </form>
            )}

            {activeSheet === "E" && (
              <form onSubmit={handleAddEvento} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-[9px] uppercase font-bold text-stone-400">Título de la actividad</label>
                  <input type="text" placeholder="ej. Gimnasio o Cita" className="w-full text-xs p-2 rounded-lg border focus:outline-none dark:bg-stone-900" value={eventoForm.Titulo_Actividad} onChange={(e)=>setEventoForm({...eventoForm, Titulo_Actividad: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-stone-400">Pilar Fijo</label>
                  <select className="w-full text-xs p-2 rounded-lg border focus:outline-none dark:bg-stone-900" value={eventoForm.Pilar} onChange={(e)=>setEventoForm({...eventoForm, Pilar: e.target.value as any})}>
                    <option value={CategoriaPilar.SALUD}>Salud</option>
                    <option value={CategoriaPilar.ESCOLAR}>Escolar</option>
                    <option value={CategoriaPilar.LABORAL}>Laboral</option>
                    <option value={CategoriaPilar.PERSONAL}>Personal</option>
                    <option value={CategoriaPilar.AMOROSO}>Amoroso</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-stone-400">Inicio (Fecha Hora)</label>
                  <input type="text" className="w-full text-xs p-2 rounded-lg border focus:outline-none dark:bg-stone-900" value={eventoForm.Fecha_Hora_Inicio} onChange={(e)=>setEventoForm({...eventoForm, Fecha_Hora_Inicio: e.target.value})} />
                </div>
                <button type="submit" className="py-2.5 px-4 font-bold rounded-lg bg-teal-500 text-white text-xs cursor-pointer">Insertar Actividad</button>
              </form>
            )}

          </div>
        )}

        {/* Raw Grid renderer */}
        <table className="w-full text-left font-sans text-xs border-collapse">
          <thead>
            {activeSheet === "B" && (
              <tr className="border-b border-stone-850 bg-stone-500/5 text-stone-400">
                <th className="p-3 font-semibold uppercase tracking-wider">ID_Ingreso</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Fecha</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Concepto</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Categoría</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Monto_Neto</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Cuenta_Destino</th>
                <th className="p-3 font-semibold uppercase tracking-wider text-right">Acciones</th>
              </tr>
            )}

            {activeSheet === "C" && (
              <tr className="border-b border-stone-850 bg-stone-500/5 text-stone-400">
                <th className="p-3 font-semibold uppercase tracking-wider">ID_Tarjeta</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Tarjeta / Instrumento</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Tipo</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Línea de Crédito</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Saldo Disponible</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Deuda Actual</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Pago Mínimo</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Pago No-Ints.</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Corte / Límite</th>
                <th className="p-3 font-semibold uppercase tracking-wider text-right">Acciones</th>
              </tr>
            )}

            {activeSheet === "D" && (
              <tr className="border-b border-stone-850 bg-stone-500/5 text-stone-400">
                <th className="p-3 font-semibold uppercase tracking-wider">ID_Egreso</th>
                <th className="p-3 font-semibold uppercase tracking-wider">ID_Actividad_Origen</th>
                <th className="p-3 font-semibold uppercase tracking-wider">ID_Tarjeta_Utilizada</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Fecha</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Concepto</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Pilar</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Subcategoría</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Monto</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Tarjeta cargada</th>
                <th className="p-3 font-semibold uppercase tracking-wider text-right">Acciones</th>
              </tr>
            )}

            {activeSheet === "E" && (
              <tr className="border-b border-stone-850 bg-stone-500/5 text-stone-400">
                <th className="p-3 font-semibold uppercase tracking-wider">ID_Actividad</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Tipo Agenda</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Pilar</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Título de Actividad</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Descripción</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Fecha Hora Inicio</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Fecha Hora Fin</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Requiere Pago</th>
                <th className="p-3 font-semibold uppercase tracking-wider">Ref Egreso</th>
                <th className="p-3 font-semibold uppercase tracking-wider text-right">Acciones</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-stone-800">
            
            {activeSheet === "B" && ingresos.map(item => (
              <tr key={item.ID_Ingreso} className="hover:bg-stone-500/5">
                <td className="p-3 font-mono text-stone-500 max-w-[120px] truncate" title={item.ID_Ingreso}>{item.ID_Ingreso}</td>
                <td className="p-3 text-stone-300 font-medium font-mono">{item.Fecha}</td>
                <td className="p-3 font-semibold text-stone-200">{item.Concepto}</td>
                <td className="p-3 text-stone-400"><span className="px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-400 font-bold">{item.Categoria}</span></td>
                <td className="p-3 font-mono font-bold text-teal-400">${item.Monto_Neto.toFixed(2)}</td>
                <td className="p-3 text-stone-400">{item.Cuenta_Destino || "SaaS Checking"}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setIngresos(ingresos.filter(i=> i.ID_Ingreso !== item.ID_Ingreso))} className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}

            {activeSheet === "C" && deudas.map(item => (
              <tr key={item.ID_Instrumento} className="hover:bg-stone-500/5">
                <td className="p-3 font-mono text-stone-500 max-w-[110px] truncate" title={item.ID_Instrumento}>{item.ID_Instrumento}</td>
                <td className="p-3 font-bold text-stone-200">{item.Nombre_Tarjeta}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    item.Tipo === TipoTarjeta.CREDITO 
                      ? "bg-rose-500/10 text-rose-450 border border-rose-500/10" 
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
                  }`}>
                    {item.Tipo}
                  </span>
                </td>
                <td className="p-3 font-mono text-stone-400">${item.Limite_Credito.toLocaleString()}</td>
                <td className="p-3 font-mono font-bold text-emerald-400">${item.Saldo_Disponible.toLocaleString()}</td>
                <td className="p-3 font-mono text-rose-450 font-bold">${item.Deuda_Actual.toLocaleString()}</td>
                <td className="p-3 font-mono text-stone-400">${item.Pago_Minimo.toLocaleString()}</td>
                <td className="p-3 font-mono text-stone-400">${item.Pago_Para_No_Generar_Intereses.toLocaleString()}</td>
                <td className="p-3 font-mono font-semibold text-stone-400">Día {item.Fecha_Corte} / Día {item.Fecha_Limite_Pago}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setDeudas(deudas.filter(d=> d.ID_Instrumento !== item.ID_Instrumento))} className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}

            {activeSheet === "D" && egresos.map(item => (
              <tr key={item.ID_Egreso} className="hover:bg-stone-500/5">
                <td className="p-3 font-mono text-stone-500 max-w-[120px] truncate" title={item.ID_Egreso}>{item.ID_Egreso}</td>
                <td className="p-3 font-mono text-stone-400 max-w-[110px] truncate" title={item.ID_Actividad_Origen || undefined}>{item.ID_Actividad_Origen || "NULL"}</td>
                <td className="p-3 font-mono text-stone-500 max-w-[110px] truncate" title={item.ID_Tarjeta_Utilizada}>{item.ID_Tarjeta_Utilizada}</td>
                <td className="p-3 text-stone-400 font-mono font-semibold">{item.Fecha}</td>
                <td className="p-3 font-bold text-stone-200">{item.Concepto}</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold">{item.Categoria_Pilar}</span></td>
                <td className="p-3 text-stone-400">{item.Subcategoria}</td>
                <td className="p-3 font-mono font-extrabold text-amber-500">-${item.Monto.toFixed(2)}</td>
                <td className="p-3 font-bold text-stone-400">{item.Metodo_Pago}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setEgresos(egresos.filter(eg=> eg.ID_Egreso !== item.ID_Egreso))} className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}

            {activeSheet === "E" && eventos.map(item => (
              <tr key={item.ID_Actividad} className="hover:bg-stone-500/5">
                <td className="p-3 font-mono text-stone-500 max-w-[120px] truncate" title={item.ID_Actividad}>{item.ID_Actividad}</td>
                <td className="p-3 text-stone-400 font-semibold">{item.Tipo_Agenda}</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 font-bold">{item.Pilar}</span></td>
                <td className="p-3 font-bold text-stone-200">{item.Titulo_Actividad}</td>
                <td className="p-3 text-stone-400 max-w-[180px] truncate" title={item.Descripcion_Detallada}>{item.Descripcion_Detallada}</td>
                <td className="p-3 font-mono text-stone-400">{item.Fecha_Hora_Inicio}</td>
                <td className="p-3 font-mono text-stone-400">{item.Fecha_Hora_Fin}</td>
                <td className="p-3 font-bold text-stone-300">{item.Requiere_Pago ? "SÍ ✅" : "NO ❌"}</td>
                <td className="p-3 font-mono text-stone-500 max-w-[100px] truncate" title={item.ID_Egreso_Asociado || undefined}>{item.ID_Egreso_Asociado || "NULL"}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setEventos(eventos.filter(ev=> ev.ID_Actividad !== item.ID_Actividad))} className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}

          </tbody>
        </table>
        
        {/* Total rows count in database partition footer */}
        <div className="mt-4 pt-4 border-t border-stone-850 flex items-center justify-between text-[11px] text-stone-400">
          <span>Inquilino Activo: <strong className="font-mono text-teal-400">UUID Secure Data Block</strong></span>
          <span>Indexación garantizada via <strong className="font-mono">ID_Usuario (UUID)</strong>.</span>
        </div>
      </div>
    </div>
  );
}
