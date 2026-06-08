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
  Sliders,
  RotateCcw,
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
  const [activeSheet, setActiveSheet] = useState<"B" | "C" | "D" | "E">("B");
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

  // --- CRUD API ACTIONS (PERSIST TO SQLITE IN BACKGROUND) ---
  
  const handleAddIngreso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingresoForm.Concepto || !ingresoForm.Monto_Neto) return;
    const valNet = parseFloat(ingresoForm.Monto_Neto);

    const newRecord: Ingreso = {
      ID_Usuario: deudas[0]?.ID_Usuario || "",
      ID_Ingreso: generateUuid("ing"),
      Fecha: ingresoForm.Fecha,
      Concepto: ingresoForm.Concepto,
      Categoria: ingresoForm.Categoria,
      Monto_Neto: valNet,
      Monto_Bruto: valNet,
      Cuenta_Destino: "SaaS Cuentas Bancarias"
    };

    try {
      const res = await fetch("/api/ingresos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord)
      });
      if (res.ok) {
        setIngresos((prev) => [newRecord, ...prev]);
        setIngresoForm({
          Fecha: "2026-06-12",
          Concepto: "",
          Categoria: CategoriaIngreso.NOMINA,
          Monto_Neto: ""
        });
        setShowAddForm(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDeuda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deudaForm.Nombre_Tarjeta) return;

    const parseLim = parseFloat(deudaForm.Limite_Credito) || 0;
    const parseDisp = parseFloat(deudaForm.Saldo_Disponible) || 0;
    const parseDeuda = parseFloat(deudaForm.Deuda_Actual) || 0;
    const cardId = generateUuid("card");

    const newRecord: Deuda = {
      ID_Usuario: deudas[0]?.ID_Usuario || "",
      ID_Instrumento: cardId,
      ID_Tarjeta: cardId,
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

    try {
      const res = await fetch("/api/deudas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord)
      });
      if (res.ok) {
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddEgreso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!egresoForm.Concepto || !egresoForm.Monto) return;

    const newRecord: Egreso = {
      ID_Usuario: deudas[0]?.ID_Usuario || "",
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

    try {
      const res = await fetch("/api/egresos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord)
      });
      if (res.ok) {
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventoForm.Titulo_Actividad) return;

    const uuidAct = generateUuid("act");
    const newRecord: AgendaEvento = {
      ID_Usuario: deudas[0]?.ID_Usuario || "",
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

    try {
      const res = await fetch("/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord)
      });
      if (res.ok) {
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (type: "ingresos" | "egresos" | "deudas" | "eventos", id: string) => {
    try {
      const res = await fetch(`/api/${type}/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (type === "ingresos") setIngresos(prev => prev.filter(i => i.ID_Ingreso !== id));
        if (type === "egresos") setEgresos(prev => prev.filter(e => e.ID_Egreso !== id));
        if (type === "deudas") setDeudas(prev => prev.filter(d => d.ID_Instrumento !== id));
        if (type === "eventos") setEventos(prev => prev.filter(ev => ev.ID_Actividad !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      
      {/* Top Banner (Apple Style Card) */}
      <div className={`p-6 rounded-[2rem] border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`text-sm font-semibold tracking-tight uppercase ${darkMode ? "text-stone-200" : "text-stone-900"}`}>
              Gestión e Integración de Datos
            </h3>
            <p className="text-[10px] text-stone-500 font-medium">
              Consulta de datos sincronizada en tiempo real con la base de datos persistente.
            </p>
          </div>
        </div>

        <button
          onClick={resetToInitial}
          className="py-2 px-4 rounded-xl border border-rose-500/20 text-rose-500 bg-rose-500/5 text-[10px] uppercase font-bold tracking-wider hover:bg-rose-500 hover:text-white transition-all cursor-pointer flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restablecer Datos</span>
        </button>
      </div>

      {/* Tabs list (clean labels) */}
      <div className="flex flex-wrap gap-2">
        <button
          id="sheet-tab-b"
          onClick={() => { setActiveSheet("B"); setShowAddForm(false); }}
          className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSheet === "B" 
              ? "bg-teal-500/10 border-teal-500/30 text-teal-500 font-bold" 
              : darkMode ? "bg-stone-900/20 border-stone-900 text-stone-400 hover:text-stone-300" : "bg-white border-stone-150 text-stone-600 hover:bg-stone-50"
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
          <span>Ingresos ({ingresos.length})</span>
        </button>

        <button
          id="sheet-tab-c"
          onClick={() => { setActiveSheet("C"); setShowAddForm(false); }}
          className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSheet === "C" 
              ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-500 font-bold" 
              : darkMode ? "bg-stone-900/20 border-stone-900 text-stone-400 hover:text-stone-300" : "bg-white border-stone-150 text-stone-600 hover:bg-stone-50"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
          <span>Cuentas y Tarjetas ({deudas.length})</span>
        </button>

        <button
          id="sheet-tab-d"
          onClick={() => { setActiveSheet("D"); setShowAddForm(false); }}
          className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSheet === "D" 
              ? "bg-rose-500/10 border-rose-500/30 text-rose-500 font-bold" 
              : darkMode ? "bg-stone-900/20 border-stone-900 text-stone-400 hover:text-stone-300" : "bg-white border-stone-150 text-stone-600 hover:bg-stone-50"
          }`}
        >
          <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
          <span>Gastos ({egresos.length})</span>
        </button>

        <button
          id="sheet-tab-e"
          onClick={() => { setActiveSheet("E"); setShowAddForm(false); }}
          className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSheet === "E" 
              ? "bg-amber-500/10 border-amber-500/30 text-amber-500 font-bold" 
              : darkMode ? "bg-stone-900/20 border-stone-900 text-stone-400 hover:text-stone-300" : "bg-white border-stone-150 text-stone-600 hover:bg-stone-50"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-amber-500" />
          <span>Actividades ({eventos.length})</span>
        </button>
      </div>

      {/* Grid container redesigned into card-list (No Excel spreadsheet look) */}
      <div className={`p-6 rounded-[2rem] border transition-all ${
        darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
      }`}>
        
        <div className="flex items-center justify-between mb-6 border-b pb-3 border-stone-200 dark:border-stone-850">
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
            Listado Sincronizado
          </span>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`py-1.5 px-3 rounded-xl border text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
              showAddForm 
                ? "bg-stone-500/10 text-stone-400 border-stone-500/10"
                : "bg-teal-500 text-white border-transparent"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddForm ? "Cerrar Panel" : "Registrar Manualmente"}</span>
          </button>
        </div>

        {/* Dynamic add form drawer */}
        {showAddForm && (
          <div className={`p-5 rounded-2xl border mb-6 ${
            darkMode ? "bg-stone-950/60 border-stone-850" : "bg-stone-50 border-stone-200"
          }`}>
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-stone-400 mb-4">Ingresar nuevo registro</h4>
            
            {activeSheet === "B" && (
              <form onSubmit={handleAddIngreso} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Fecha</label>
                  <input type="date" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none dark:bg-stone-900 dark:border-stone-800" value={ingresoForm.Fecha} onChange={(e)=>setIngresoForm({...ingresoForm, Fecha: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Concepto</label>
                  <input type="text" placeholder="ej. Asesoría Frontend" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none dark:bg-stone-900 dark:border-stone-800" value={ingresoForm.Concepto} onChange={(e)=>setIngresoForm({...ingresoForm, Concepto: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Monto Neto</label>
                  <input type="number" placeholder="0.00" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none dark:bg-stone-900 dark:border-stone-800" value={ingresoForm.Monto_Neto} onChange={(e)=>setIngresoForm({...ingresoForm, Monto_Neto: e.target.value})} />
                </div>
                <button type="submit" className="py-2.5 px-4 font-bold rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-xs cursor-pointer transition-all">Guardar Registro</button>
              </form>
            )}

            {activeSheet === "C" && (
              <form onSubmit={handleAddDeuda} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Nombre de la Cuenta</label>
                  <input type="text" placeholder="ej. Tarjeta Citi" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none dark:bg-stone-900 dark:border-stone-800" value={deudaForm.Nombre_Tarjeta} onChange={(e)=>setDeudaForm({...deudaForm, Nombre_Tarjeta: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Tipo de Cuenta</label>
                  <select className="w-full text-xs p-2.5 rounded-xl border focus:outline-none dark:bg-stone-900 dark:border-stone-800" value={deudaForm.Tipo} onChange={(e)=>setDeudaForm({...deudaForm, Tipo: e.target.value as any})}>
                    <option value={TipoTarjeta.CREDITO}>Crédito</option>
                    <option value={TipoTarjeta.DEBITO}>Débito</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Línea de Crédito</label>
                  <input type="number" placeholder="Línea de Crédito" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none dark:bg-stone-900 dark:border-stone-800" value={deudaForm.Limite_Credito} onChange={(e)=>setDeudaForm({...deudaForm, Limite_Credito: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Saldo Disponible</label>
                  <input type="number" placeholder="Saldo Disponible" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none dark:bg-stone-900 dark:border-stone-800" value={deudaForm.Saldo_Disponible} onChange={(e)=>setDeudaForm({...deudaForm, Saldo_Disponible: e.target.value})} />
                </div>
                <button type="submit" className="py-2.5 px-4 font-bold rounded-xl bg-teal-500 hover:bg-teal-650 text-white text-xs cursor-pointer md:col-span-4 transition-all">Registrar Cuenta</button>
              </form>
            )}

            {activeSheet === "D" && (
              <form onSubmit={handleAddEgreso} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Fecha</label>
                  <input type="date" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none dark:bg-stone-900 dark:border-stone-800" value={egresoForm.Fecha} onChange={(e)=>setEgresoForm({...egresoForm, Fecha: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Concepto</label>
                  <input type="text" placeholder="Concepto del Gasto" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none dark:bg-stone-900 dark:border-stone-800" value={egresoForm.Concepto} onChange={(e)=>setEgresoForm({...egresoForm, Concepto: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Pilar Categoria</label>
                  <select className="w-full text-xs p-2.5 rounded-xl border focus:outline-none dark:bg-stone-900 dark:border-stone-800" value={egresoForm.Categoria_Pilar} onChange={(e)=>setEgresoForm({...egresoForm, Categoria_Pilar: e.target.value as any})}>
                    <option value={CategoriaPilar.NECESIDAD_ESENCIAL}>Necesidades esenciales</option>
                    <option value={CategoriaPilar.SALUD}>Salud</option>
                    <option value={CategoriaPilar.ESCOLAR}>Escolar</option>
                    <option value={CategoriaPilar.LABORAL}>Laboral</option>
                    <option value={CategoriaPilar.PERSONAL}>Personal</option>
                    <option value={CategoriaPilar.AMOROSO}>Amoroso</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Monto</label>
                  <input type="number" placeholder="0.00" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none dark:bg-stone-900 dark:border-stone-800" value={egresoForm.Monto} onChange={(e)=>setEgresoForm({...egresoForm, Monto: e.target.value})} />
                </div>
                <button type="submit" className="py-2.5 px-4 font-bold rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-xs cursor-pointer md:col-span-4 transition-all">Insertar Gasto</button>
              </form>
            )}

            {activeSheet === "E" && (
              <form onSubmit={handleAddEvento} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Nombre de la actividad</label>
                  <input type="text" placeholder="ej. Gimnasio" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none dark:bg-stone-900 dark:border-stone-800" value={eventoForm.Titulo_Actividad} onChange={(e)=>setEventoForm({...eventoForm, Titulo_Actividad: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Pilar Asociado</label>
                  <select className="w-full text-xs p-2.5 rounded-xl border focus:outline-none dark:bg-stone-900 dark:border-stone-800" value={eventoForm.Pilar} onChange={(e)=>setEventoForm({...eventoForm, Pilar: e.target.value as any})}>
                    <option value={CategoriaPilar.SALUD}>Salud</option>
                    <option value={CategoriaPilar.ESCOLAR}>Escolar</option>
                    <option value={CategoriaPilar.LABORAL}>Laboral</option>
                    <option value={CategoriaPilar.PERSONAL}>Personal</option>
                    <option value={CategoriaPilar.AMOROSO}>Amoroso</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Inicio (Fecha Hora)</label>
                  <input type="text" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none dark:bg-stone-900 dark:border-stone-800" value={eventoForm.Fecha_Hora_Inicio} onChange={(e)=>setEventoForm({...eventoForm, Fecha_Hora_Inicio: e.target.value})} />
                </div>
                <button type="submit" className="py-2.5 px-4 font-bold rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-xs cursor-pointer transition-all">Guardar Actividad</button>
              </form>
            )}

          </div>
        )}

        {/* Clean card lists instead of spreadsheets */}
        <div className="space-y-3">
          
          {activeSheet === "B" && (
            ingresos.length === 0 ? <p className="text-xs text-stone-500 py-6 text-center">No hay ingresos registrados.</p> :
            ingresos.map(item => (
              <div key={item.ID_Ingreso} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                darkMode ? "bg-stone-950/60 border-stone-850" : "bg-stone-50 border-stone-200"
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-400">{item.Categoria}</span>
                    <span className="text-[10px] font-mono text-stone-500">{item.Fecha}</span>
                  </div>
                  <h4 className={`text-xs font-semibold ${darkMode ? "text-white" : "text-stone-900"}`}>{item.Concepto}</h4>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold font-mono text-teal-400">${item.Monto_Neto.toFixed(2)}</span>
                  <button onClick={() => handleDeleteItem("ingresos", item.ID_Ingreso)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl cursor-pointer transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}

          {activeSheet === "C" && (
            deudas.length === 0 ? <p className="text-xs text-stone-500 py-6 text-center">No hay tarjetas registradas.</p> :
            deudas.map(item => (
              <div key={item.ID_Instrumento} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                darkMode ? "bg-stone-950/60 border-stone-850" : "bg-stone-50 border-stone-200"
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                      item.Tipo === TipoTarjeta.CREDITO ? "bg-indigo-500/10 text-indigo-400" : "bg-teal-500/10 text-teal-400"
                    }`}>{item.Tipo}</span>
                    <span className="text-[10px] text-stone-500 font-semibold">Corte: Día {item.Fecha_Corte} / Pago: Día {item.Fecha_Limite_Pago}</span>
                  </div>
                  <h4 className={`text-xs font-semibold ${darkMode ? "text-white" : "text-stone-900"}`}>{item.Nombre_Tarjeta}</h4>
                </div>
                
                <div className="flex items-center gap-6 font-mono text-xs">
                  <div className="text-right">
                    <span className="text-stone-500 text-[9px] block uppercase font-bold">Disponible</span>
                    <span className="text-emerald-500 font-bold">${item.Saldo_Disponible.toLocaleString()}</span>
                  </div>
                  {item.Tipo === TipoTarjeta.CREDITO && (
                    <div className="text-right">
                      <span className="text-stone-500 text-[9px] block uppercase font-bold">Deuda</span>
                      <span className="text-rose-500 font-bold">${item.Deuda_Actual.toLocaleString()}</span>
                    </div>
                  )}
                  <button onClick={() => handleDeleteItem("deudas", item.ID_Instrumento)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl cursor-pointer transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}

          {activeSheet === "D" && (
            egresos.length === 0 ? <p className="text-xs text-stone-500 py-6 text-center">No hay gastos registrados.</p> :
            egresos.map(item => (
              <div key={item.ID_Egreso} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                darkMode ? "bg-stone-950/60 border-stone-850" : "bg-stone-50 border-stone-200"
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400">{item.Categoria_Pilar}</span>
                    <span className="text-[10px] font-mono text-stone-500">{item.Fecha}</span>
                    <span className="text-[10px] text-stone-500">({item.Metodo_Pago})</span>
                  </div>
                  <h4 className={`text-xs font-semibold ${darkMode ? "text-white" : "text-stone-900"}`}>{item.Concepto}</h4>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold font-mono text-rose-400">-${item.Monto.toFixed(2)}</span>
                  <button onClick={() => handleDeleteItem("egresos", item.ID_Egreso)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl cursor-pointer transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}

          {activeSheet === "E" && (
            eventos.length === 0 ? <p className="text-xs text-stone-500 py-6 text-center">No hay actividades registradas.</p> :
            eventos.map(item => (
              <div key={item.ID_Actividad} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                darkMode ? "bg-stone-950/60 border-stone-850" : "bg-stone-50 border-stone-200"
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400">{item.Pilar}</span>
                    <span className="text-[10px] font-mono text-stone-500">{item.Fecha_Hora_Inicio.replace("T", " ")}</span>
                  </div>
                  <h4 className={`text-xs font-semibold ${darkMode ? "text-white" : "text-stone-900"}`}>{item.Titulo_Actividad}</h4>
                  <p className="text-[11px] text-stone-500">{item.Descripcion_Detallada}</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <button onClick={() => handleDeleteItem("eventos", item.ID_Actividad)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl cursor-pointer transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}

        </div>
      </div>
    </div>
  );
}
