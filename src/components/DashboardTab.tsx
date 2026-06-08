import React, { useState, useMemo, useEffect } from "react";
import { 
  Ingreso, 
  Egreso, 
  Deuda, 
  MetaPilar,
  AgendaEvento,
  Usuario,
  CategoriaPilar,
  TipoGasto,
  TipoTarjeta,
  EstadoMeta
} from "../types";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Activity, 
  Heart, 
  Briefcase, 
  GraduationCap, 
  Sparkles, 
  Calendar, 
  Plus, 
  Coins, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  HelpCircle,
  FileText
} from "lucide-react";

interface DashboardTabProps {
  darkMode: boolean;
  ingresos: Ingreso[];
  egresos: Egreso[];
  deudas: Deuda[];
  metas: MetaPilar[];
  eventos: AgendaEvento[];
  setIngresos: React.Dispatch<React.SetStateAction<Ingreso[]>>;
  setEgresos: React.Dispatch<React.SetStateAction<Egreso[]>>;
  setDeudas: React.Dispatch<React.SetStateAction<Deuda[]>>;
  setMetas: React.Dispatch<React.SetStateAction<MetaPilar[]>>;
  setEventos: React.Dispatch<React.SetStateAction<AgendaEvento[]>>;
  activeUser: Usuario;
}

export default function DashboardTab({
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
  activeUser
}: DashboardTabProps) {

  // --- CALENDAR GRID STATE ---
  const [calendarDate, setCalendarDate] = useState<Date>(new Date(2026, 5, 8)); // Default to June 8, 2026 (matching sample data)
  const [selectedDateStr, setSelectedDateStr] = useState<string>("2026-06-08");
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [gcalLoading, setGcalLoading] = useState<boolean>(false);

  // --- FORM STATE ---
  const [titulo, setTitulo] = useState<string>("");
  const [pilar, setPilar] = useState<CategoriaPilar>(CategoriaPilar.SALUD);
  const [tipoAgenda, setTipoAgenda] = useState<string>("Agenda_Personal");
  const [descripcion, setDescripcion] = useState<string>("");
  const [horaInicio, setHoraInicio] = useState<string>("10:00");
  const [horaFin, setHoraFin] = useState<string>("11:00");
  const [requierePago, setRequierePago] = useState<boolean>(false);
  const [gastoMonto, setGastoMonto] = useState<string>("0");
  const [tarjetaId, setTarjetaId] = useState<string>("");
  const [gastoSubcategoria, setGastoSubcategoria] = useState<string>("");
  const [gastoTipo, setGastoTipo] = useState<TipoGasto>(TipoGasto.VARIABLE);
  
  const [formSuccess, setFormSuccess] = useState<string>("");
  const [formError, setFormError] = useState<string>("");

  // --- GOOGLE CALENDAR SYNC EFFECT ---
  useEffect(() => {
    const fetchGoogleCalendar = async () => {
      const gToken = localStorage.getItem(`pilar5_g_token_${activeUser.ID_Usuario}`);
      const isConnected = localStorage.getItem(`pilar5_g_connected_${activeUser.ID_Usuario}`);
      if (!gToken || !isConnected) {
        setGoogleEvents([]);
        return;
      }

      const fillMockEvents = () => {
        setGoogleEvents([
          {
            id: "g-mock-1",
            summary: "📅 Sesión de Mentoría Financiera (Google Calendar)",
            description: "Revisar los gastos del pilar Amoroso con el consultor.",
            start: "2026-06-08T10:00:00Z",
            end: "2026-06-08T11:00:00Z",
            color: "indigo"
          },
          {
            id: "g-mock-2",
            summary: "🏋️ Récord de Gimnasio - Salir a Correr",
            description: "Meta vinculada al Pilar Salud en el SaaS.",
            start: "2026-06-09T08:00:00Z",
            end: "2026-06-09T09:00:00Z",
            color: "indigo"
          },
          {
            id: "g-mock-3",
            summary: "💡 Evaluación de Exclusiones de Impuesto",
            description: "Recomendado por el optimizador avalancha de deudas.",
            start: "2026-06-11T12:00:00Z",
            end: "2026-06-11T13:30:00Z",
            color: "indigo"
          }
        ]);
      };

      setGcalLoading(true);
      try {
        const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=25", {
          headers: { Authorization: `Bearer ${gToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          const items = data.items || [];
          setGoogleEvents(items.map((it: any) => ({
            id: it.id,
            summary: it.summary || "Evento Google Calendar",
            description: it.description || "",
            start: it.start?.dateTime || it.start?.date || "",
            end: it.end?.dateTime || it.end?.date || "",
            color: "indigo"
          })));
        } else {
          fillMockEvents();
        }
      } catch (err) {
        console.error("Error fetching Google Calendar:", err);
        fillMockEvents();
      } finally {
        setGcalLoading(false);
      }
    };
    fetchGoogleCalendar();
  }, [activeUser.ID_Usuario]);

  // --- KPI CALCULATIONS ---
  const totalIncomes = useMemo(() => ingresos.reduce((s, i) => s + i.Monto_Neto, 0), [ingresos]);
  const totalExpenses = useMemo(() => egresos.reduce((s, e) => s + e.Monto, 0), [egresos]);
  const netBalance = useMemo(() => totalIncomes - totalExpenses, [totalIncomes, totalExpenses]);
  const totalDebt = useMemo(() => deudas.filter(d => d.Tipo === TipoTarjeta.CREDITO).reduce((s, d) => s + d.Deuda_Actual, 0), [deudas]);

  // Recharts Expense Distribution per Pillar
  const pillarChartData = useMemo(() => {
    const map: Record<string, number> = {};
    egresos.forEach(item => {
      const label = item.Categoria_Pilar.replace("_", " ");
      map[label] = (map[label] || 0) + item.Monto;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
  }, [egresos]);

  const PIE_COLORS = ["#14b8a6", "#6366f1", "#06b6d4", "#a855f7", "#ec4899", "#10b981", "#f59e0b"];

  // --- MONTHLY CALENDAR GRID LOGIC ---
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const daysOfWeek = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();

  const handlePrevMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const startDayIndex = new Date(currentYear, currentMonth, 1).getDay();

    const arr = [];
    // Prev month padding
    for (let i = 0; i < startDayIndex; i++) {
      arr.push({ dayNum: null, dateStr: "" });
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-${i.toString().padStart(2, "0")}`;
      arr.push({ dayNum: i, dateStr });
    }
    return arr;
  }, [currentYear, currentMonth]);

  // Aggregate local events + Google Calendar events + automated credit card alarms
  const allEventsCombined = useMemo(() => {
    const list: any[] = [...eventos];

    // Add automated Corte/Pago alarms if sync enabled
    deudas.forEach(card => {
      if (card.Tipo === TipoTarjeta.CREDITO) {
        list.push({
          ID_Actividad: `auto-corte-${card.ID_Tarjeta}`,
          Titulo_Actividad: `✂️ Corte: ${card.Nombre_Tarjeta}`,
          Descripcion_Detallada: `Fecha de corte. Saldo al corte: $${card.Saldo_Al_Corte}.`,
          Fecha: `2026-06-${card.Fecha_Corte.toString().padStart(2, "0")}`,
          Fecha_Hora_Inicio: `2026-06-${card.Fecha_Corte.toString().padStart(2, "0")}T09:00`,
          Pilar: "Económico",
          Color: "red",
          Requiere_Pago: false
        });

        list.push({
          ID_Actividad: `auto-pago-${card.ID_Tarjeta}`,
          Titulo_Actividad: `⚠️ Pago Límite: ${card.Nombre_Tarjeta}`,
          Descripcion_Detallada: `Pago para no generar intereses: $${card.Pago_Para_No_Generar_Intereses}. Mínimo: $${card.Pago_Minimo}.`,
          Fecha: `2026-06-${card.Fecha_Limite_Pago.toString().padStart(2, "0")}`,
          Fecha_Hora_Inicio: `2026-06-${card.Fecha_Limite_Pago.toString().padStart(2, "0")}T09:00`,
          Pilar: "Económico",
          Color: "red",
          Requiere_Pago: false
        });
      }
    });

    // Add Google Calendar events
    googleEvents.forEach(g => {
      const dateOnly = g.start.slice(0, 10);
      list.push({
        ID_Actividad: g.id,
        Titulo_Actividad: g.summary,
        Descripcion_Detallada: g.description || "Sincronizado de Google Calendar",
        Fecha: dateOnly,
        Fecha_Hora_Inicio: g.start,
        Pilar: "Google Sync",
        Color: "blue",
        Requiere_Pago: false
      });
    });

    return list;
  }, [eventos, deudas, googleEvents]);

  // Events filtered by the clicked date
  const selectedDayEvents = useMemo(() => {
    return allEventsCombined.filter(e => e.Fecha === selectedDateStr);
  }, [allEventsCombined, selectedDateStr]);

  // --- SUBMIT DUAL WORKFLOW ---
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!titulo.trim()) {
      setFormError("El título de la actividad es requerido.");
      return;
    }

    const activityId = "act-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
    let egresoId: string | null = null;
    const parseMonto = parseFloat(gastoMonto);

    try {
      if (requierePago) {
        if (isNaN(parseMonto) || parseMonto <= 0) {
          throw new Error("Si la actividad requiere pago, ingresa un monto superior a 0.");
        }
        if (!tarjetaId) {
          throw new Error("Selecciona una tarjeta para autorizar el pago.");
        }

        const card = deudas.find(c => c.ID_Instrumento === tarjetaId);
        if (!card) throw new Error("Tarjeta no encontrada.");

        if (card.Tipo === TipoTarjeta.DEBITO && card.Saldo_Disponible < parseMonto) {
          throw new Error(`Saldo insuficiente en cuenta de Débito: Tienes $${card.Saldo_Disponible} pero el gasto es de $${parseMonto}.`);
        }
        if (card.Tipo === TipoTarjeta.CREDITO && card.Saldo_Disponible < parseMonto) {
          throw new Error(`Límite insuficiente en tarjeta de Crédito: Tienes $${card.Saldo_Disponible} de cupo libre.`);
        }

        // 1. Save Egreso in SQLite
        egresoId = "egr-" + Math.random().toString(36).substring(2, 9);
        const subCat = gastoSubcategoria.trim() || `${pilar} Automático`;
        const newEgreso: Egreso = {
          ID_Usuario: activeUser.ID_Usuario,
          ID_Egreso: egresoId,
          ID_Actividad_Origen: activityId,
          ID_Tarjeta_Utilizada: tarjetaId,
          Fecha: selectedDateStr,
          Concepto: titulo,
          Categoria_Pilar: pilar,
          Subcategoria: subCat,
          Monto: parseMonto,
          Metodo_Pago: card.Nombre_Tarjeta,
          Tipo_Gasto: gastoTipo
        };

        const resEgreso = await fetch("/api/egresos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEgreso)
        });
        if (!resEgreso.ok) throw new Error("Fallo al guardar el egreso.");
        setEgresos(prev => [newEgreso, ...prev]);

        // 2. Update Card Balances in SQLite
        let updatedCard: Deuda;
        if (card.Tipo === TipoTarjeta.CREDITO) {
          const nextDeuda = card.Deuda_Actual + parseMonto;
          updatedCard = {
            ...card,
            Deuda_Actual: nextDeuda,
            Saldo_Disponible: Math.max(0, card.Limite_Credito - nextDeuda),
            Balance_Total_Pendiente: nextDeuda,
            Saldo_Al_Corte: nextDeuda,
            Pago_Para_No_Generar_Intereses: card.Pago_Para_No_Generar_Intereses + (parseMonto * 0.15)
          };
        } else {
          updatedCard = {
            ...card,
            Saldo_Disponible: card.Saldo_Disponible - parseMonto
          };
        }

        const resCard = await fetch(`/api/deudas/${tarjetaId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedCard)
        });
        if (!resCard.ok) throw new Error("Fallo al actualizar el saldo de la tarjeta.");
        setDeudas(prev => prev.map(c => c.ID_Instrumento === tarjetaId ? updatedCard : c));
      }

      // 3. Save Event in SQLite
      const color: "green" | "blue" | "indigo" | "orange" | "purple" = 
        pilar === CategoriaPilar.SALUD ? "green" 
        : pilar === CategoriaPilar.ESCOLAR ? "blue"
        : pilar === CategoriaPilar.LABORAL ? "indigo"
        : pilar === CategoriaPilar.PERSONAL ? "orange"
        : "purple";

      const newActivity: AgendaEvento = {
        ID_Usuario: activeUser.ID_Usuario,
        ID_Evento: activityId,
        ID_Actividad: activityId,
        Tipo_Agenda: tipoAgenda as any,
        Pilar: pilar,
        Pilar_Asociado: pilar,
        Titulo_Actividad: titulo,
        Titulo: titulo,
        Descripcion_Detallada: descripcion || `Cita del pilar ${pilar}`,
        Descripcion: descripcion || `Cita del pilar ${pilar}`,
        Fecha_Hora_Inicio: `${selectedDateStr}T${horaInicio}`,
        Fecha_Hora_Fin: `${selectedDateStr}T${horaFin}`,
        Requiere_Pago: requierePago,
        ID_Egreso_Asociado: egresoId,
        Fecha: selectedDateStr,
        Tipo_Evento: pilar,
        Color: color,
        Alerta_Descalce: false
      };

      const resEvent = await fetch("/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newActivity)
      });
      if (!resEvent.ok) throw new Error("Fallo al guardar la actividad.");
      setEventos(prev => [...prev, newActivity]);

      setTitulo("");
      setDescripcion("");
      setGastoMonto("0");
      setRequierePago(false);
      setTarjetaId("");
      setGastoSubcategoria("");
      setFormSuccess("🎉 Actividad y transacciones guardadas exitosamente en la base de datos.");
      setTimeout(() => setFormSuccess(""), 4000);

    } catch (err: any) {
      setFormError(err.message || "Ocurrió un error.");
    }
  };

  // Rule metrics calculations
  const healthStatus = useMemo(() => {
    const saludSpent = egresos.filter(e => e.Categoria_Pilar === CategoriaPilar.SALUD).reduce((s, e) => s + e.Monto, 0);
    const basePersonal = totalIncomes * (activeUser.Salud_Personal_Base_Porcentaje || 0.20);
    const personalSpent = egresos.filter(e => e.Categoria_Pilar === CategoriaPilar.PERSONAL).reduce((s, e) => s + e.Monto, 0);
    const remainingPersonal = Math.max(0, basePersonal - saludSpent);
    return {
      saludSpent,
      personalSpent,
      remainingPersonal,
      warning: personalSpent > remainingPersonal
    };
  }, [egresos, totalIncomes, activeUser]);

  return (
    <div className="space-y-8 animate-fadeIn font-sans">
      
      {/* 1. Header & Quick KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className={`p-5 rounded-[2rem] border transition-all ${
          darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Ingresos</span>
            <span className="p-1.5 rounded-xl bg-teal-500/10 text-teal-500"><TrendingUp className="w-4 h-4" /></span>
          </div>
          <h3 className={`text-xl font-bold ${darkMode ? "text-white" : "text-stone-900"}`}>
            ${totalIncomes.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </h3>
        </div>

        <div className={`p-5 rounded-[2rem] border transition-all ${
          darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Gastos</span>
            <span className="p-1.5 rounded-xl bg-rose-500/10 text-rose-500"><TrendingDown className="w-4 h-4" /></span>
          </div>
          <h3 className={`text-xl font-bold ${darkMode ? "text-white" : "text-stone-900"}`}>
            ${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </h3>
        </div>

        <div className={`p-5 rounded-[2rem] border transition-all ${
          darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Balance</span>
            <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500"><Coins className="w-4 h-4" /></span>
          </div>
          <h3 className={`text-xl font-bold ${netBalance >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            ${netBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </h3>
        </div>

        <div className={`p-5 rounded-[2rem] border transition-all ${
          darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Tarjetas</span>
            <span className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-500"><CreditCard className="w-4 h-4" /></span>
          </div>
          <h3 className={`text-xl font-bold ${darkMode ? "text-white" : "text-stone-900"}`}>
            ${totalDebt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </h3>
        </div>
      </div>

      {/* 2. Apple Calendar Month Grid (Primary View) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Visual Monthly Calendar Grid (Left 2 cols) */}
        <div className={`lg:col-span-2 p-6 rounded-[2rem] border transition-all ${
          darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
        }`}>
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-500" />
              <h2 className={`text-sm font-bold uppercase tracking-wider ${darkMode ? "text-white" : "text-stone-900"}`}>
                Agenda Mensual
              </h2>
              {gcalLoading && (
                <span className="text-[10px] text-stone-500 font-medium animate-pulse">Sincronizando Google Calendar...</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={handlePrevMonth} className={`p-1.5 rounded-xl border hover:bg-stone-500/10 cursor-pointer ${darkMode ? "border-stone-850" : "border-stone-200"}`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={`text-xs font-bold ${darkMode ? "text-white" : "text-stone-900"}`}>
                {monthNames[currentMonth]} {currentYear}
              </span>
              <button onClick={handleNextMonth} className={`p-1.5 rounded-xl border hover:bg-stone-500/10 cursor-pointer ${darkMode ? "border-stone-850" : "border-stone-200"}`}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-stone-500 uppercase tracking-widest border-b pb-2 border-stone-200 dark:border-stone-850">
            {daysOfWeek.map(d => <div key={d}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1 mt-2">
            {calendarDays.map((cDay, idx) => {
              const hasEvents = cDay.dayNum !== null;
              const dateEvents = hasEvents 
                ? allEventsCombined.filter(e => e.Fecha === cDay.dateStr)
                : [];
              const isSelected = hasEvents && cDay.dateStr === selectedDateStr;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (hasEvents) setSelectedDateStr(cDay.dateStr);
                  }}
                  className={`min-h-[60px] p-1.5 border rounded-2xl flex flex-col justify-between transition-all cursor-pointer ${
                    !hasEvents ? "bg-transparent border-transparent cursor-default"
                    : isSelected 
                      ? "bg-teal-500/10 border-teal-500/30 text-teal-500 font-bold"
                      : darkMode 
                        ? "bg-stone-950/40 border-stone-900 text-stone-300 hover:border-stone-800" 
                        : "bg-stone-50/50 border-stone-150 text-stone-800 hover:bg-stone-100"
                  }`}
                >
                  <span className="text-[10px] text-left">{cDay.dayNum}</span>
                  
                  {/* Event Dots */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {dateEvents.slice(0, 4).map((e, index) => {
                      const colorMap: Record<string, string> = {
                        green: "bg-emerald-500",
                        blue: "bg-indigo-500",
                        indigo: "bg-indigo-500",
                        orange: "bg-orange-500",
                        purple: "bg-purple-500",
                        red: "bg-red-500"
                      };
                      return (
                        <span 
                          key={index} 
                          title={e.Titulo_Actividad}
                          className={`w-1.5 h-1.5 rounded-full ${colorMap[e.Color] || "bg-stone-400"}`} 
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda Detail panel (Right 1 col) */}
        <div className={`p-6 rounded-[2rem] border transition-all ${
          darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
        } flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-4 border-b pb-2 border-stone-200 dark:border-stone-850">
              <h3 className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-white" : "text-stone-900"}`}>
                Actividades: {selectedDateStr}
              </h3>
              <span className="text-[9px] font-mono text-stone-500">
                {selectedDayEvents.length} eventos
              </span>
            </div>

            {/* List Events for Selected Day */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {selectedDayEvents.length === 0 ? (
                <p className="text-xs text-stone-500 text-center py-8">No hay actividades registradas en esta fecha.</p>
              ) : (
                selectedDayEvents.map((ev) => (
                  <div key={ev.ID_Actividad} className={`p-3 rounded-2xl border ${darkMode ? "bg-stone-950/60 border-stone-850" : "bg-stone-50 border-stone-200"} flex flex-col gap-1`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        ev.Color === "green" ? "bg-emerald-500/10 text-emerald-400"
                        : ev.Color === "blue" ? "bg-indigo-500/10 text-indigo-400"
                        : ev.Color === "purple" ? "bg-purple-500/10 text-purple-400"
                        : ev.Color === "orange" ? "bg-orange-500/10 text-orange-400"
                        : "bg-rose-500/10 text-rose-400"
                      }`}>
                        {ev.Pilar}
                      </span>
                      {ev.Requiere_Pago && <span className="text-[9px] font-bold text-amber-500">-$ {ev.ID_Egreso_Asociado ? "Gasto Linc" : ""}</span>}
                    </div>
                    <h4 className={`text-xs font-semibold ${darkMode ? "text-stone-100" : "text-stone-800"}`}>
                      {ev.Titulo_Actividad}
                    </h4>
                    <p className="text-[11px] text-stone-500">{ev.Descripcion_Detallada}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Inline Add Quick Form */}
          <div className="mt-6 border-t pt-4 border-stone-200 dark:border-stone-850 space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
              <PlusCircle className="w-3.5 h-3.5 text-teal-500" />
              <span>Añadir a esta fecha</span>
            </h4>

            {formSuccess && <div className="p-2 text-[10px] rounded-lg bg-teal-500/10 text-teal-400">{formSuccess}</div>}
            {formError && <div className="p-2 text-[10px] rounded-lg bg-rose-500/10 text-rose-450">{formError}</div>}

            <form onSubmit={handleCreateActivity} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Título de la actividad..."
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className={`w-full text-xs p-2 rounded-xl border focus:outline-none ${
                  darkMode ? "bg-stone-950 border-stone-850 text-white" : "bg-stone-50 border-stone-200 text-stone-900"
                }`}
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={pilar}
                  onChange={(e) => setPilar(e.target.value as CategoriaPilar)}
                  className={`w-full text-[11px] p-1.5 rounded-xl border focus:outline-none ${
                    darkMode ? "bg-stone-950 border-stone-850 text-white" : "bg-stone-50 border-stone-200 text-stone-900"
                  }`}
                >
                  <option value={CategoriaPilar.SALUD}>🩺 Salud</option>
                  <option value={CategoriaPilar.ESCOLAR}>📚 Escolar</option>
                  <option value={CategoriaPilar.LABORAL}>💼 Laboral</option>
                  <option value={CategoriaPilar.PERSONAL}>🍀 Personal</option>
                  <option value={CategoriaPilar.AMOROSO}>💖 Amoroso</option>
                </select>

                <div className="flex items-center justify-between px-2 py-1 rounded-xl border border-stone-200 dark:border-stone-850">
                  <span className="text-[9px] uppercase font-bold text-stone-400">¿Implica costo?</span>
                  <input
                    type="checkbox"
                    checked={requierePago}
                    onChange={(e) => setRequierePago(e.target.checked)}
                    className="w-3.5 h-3.5 cursor-pointer text-teal-600 rounded focus:ring-teal-500"
                  />
                </div>
              </div>

              {requierePago && (
                <div className="space-y-2 p-2.5 rounded-xl bg-stone-500/5 animate-fadeIn">
                  <select
                    required={requierePago}
                    value={tarjetaId}
                    onChange={(e) => setTarjetaId(e.target.value)}
                    className={`w-full text-[11px] p-1.5 rounded-lg border focus:outline-none ${
                      darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-200 text-stone-900"
                    }`}
                  >
                    <option value="">-- Escoger Tarjeta --</option>
                    {deudas.map(card => (
                      <option key={card.ID_Instrumento} value={card.ID_Instrumento}>
                        {card.Nombre_Tarjeta} (${card.Saldo_Disponible})
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      required={requierePago}
                      placeholder="Costo"
                      value={gastoMonto}
                      onChange={(e) => setGastoMonto(e.target.value)}
                      className={`w-full text-xs p-1.5 rounded-lg border focus:outline-none ${
                        darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-200 text-stone-900"
                      }`}
                    />
                    <select
                      value={gastoTipo}
                      onChange={(e) => setGastoTipo(e.target.value as TipoGasto)}
                      className={`w-full text-[10px] p-1 rounded-lg border focus:outline-none ${
                        darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-200 text-stone-900"
                      }`}
                    >
                      <option value={TipoGasto.VARIABLE}>Variable</option>
                      <option value={TipoGasto.FIJO}>Fijo</option>
                      <option value={TipoGasto.HORMIGA}>Hormiga</option>
                    </select>
                  </div>
                </div>
              )}

              <button type="submit" className="w-full py-2 rounded-xl bg-teal-500 hover:bg-teal-650 text-white text-[11px] font-bold cursor-pointer transition-all shadow-md">
                Registrar Evento
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 3. Apple-Style Wallet Cuentas/Tarjetas Deck */}
      <div className={`p-6 rounded-[2.5rem] border transition-all ${
        darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
      }`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-5 flex items-center gap-1.5 ${darkMode ? "text-stone-300" : "text-stone-800"}`}>
          <CreditCard className="w-4 h-4 text-indigo-500" />
          <span>Cuentas y Tarjetas</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {deudas.map(card => {
            const isCredit = card.Tipo === TipoTarjeta.CREDITO;
            return (
              <div 
                key={card.ID_Instrumento} 
                className={`relative p-6 rounded-[2rem] border overflow-hidden transition-all hover:-translate-y-1 shadow-md ${
                  isCredit 
                    ? darkMode ? "bg-stone-950/80 border-indigo-900/30 text-white" : "bg-indigo-50/50 border-indigo-100 text-stone-850"
                    : darkMode ? "bg-stone-950/80 border-teal-900/30 text-white" : "bg-teal-50/50 border-teal-100 text-stone-850"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold font-mono tracking-wider">{card.Nombre_Tarjeta}</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
                    isCredit ? "bg-indigo-500/10 text-indigo-400" : "bg-teal-500/10 text-teal-400"
                  }`}>{card.Tipo}</span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] text-stone-500">Disponible:</span>
                    <span className="text-base font-bold font-mono text-emerald-500">${card.Saldo_Disponible.toLocaleString()}</span>
                  </div>

                  {isCredit && (
                    <>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-stone-500">Deuda actual:</span>
                        <span className="font-semibold text-rose-500">${card.Deuda_Actual.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-stone-500">Pago mínimo / No-Intereses:</span>
                        <span className="font-medium text-stone-400">${card.Pago_Minimo} / ${card.Pago_Para_No_Generar_Intereses}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-stone-500">Corte / Límite:</span>
                        <span className="font-medium text-stone-400">Día {card.Fecha_Corte} / Día {card.Fecha_Limite_Pago}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Metas de Crecimiento & Rule Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Metas SMART (Apple Card-List) */}
        <div className={`p-6 rounded-[2.5rem] border transition-all ${
          darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
        }`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5 ${darkMode ? "text-stone-300" : "text-stone-800"}`}>
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Metas de Crecimiento</span>
          </h3>

          <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
            {metas.map(meta => (
              <div key={meta.ID_Meta} className={`p-4 rounded-2xl border ${darkMode ? "bg-stone-950/60 border-stone-850" : "bg-stone-50 border-stone-200"}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-400 px-1.5 py-0.5 rounded">
                    {meta.Pilar}
                  </span>
                  <span className="text-[10px] font-semibold text-stone-400">${meta.Presupuesto_Asignado} USD</span>
                </div>
                <h4 className={`text-xs font-bold ${darkMode ? "text-white" : "text-stone-900"}`}>{meta.Meta_SMART}</h4>
                <p className="text-[11px] text-stone-500 mt-1">🔑 Indicador: {meta.Indicador_Exito}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rule Checking matrix */}
        <div className={`p-6 rounded-[2.5rem] border transition-all ${
          darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
        } space-y-4`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${darkMode ? "text-stone-300" : "text-stone-800"}`}>
            <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
            <span>Matriz de Reglas Integradas</span>
          </h3>

          {/* Rule 2 Indicator */}
          <div className={`p-4 rounded-2xl border ${healthStatus.warning ? "border-rose-900/30 bg-rose-950/5 text-rose-400" : "border-stone-850 bg-stone-950/10"}`}>
            <h4 className="text-xs font-bold">🩺 Regla de Salud Cruzada</h4>
            <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
              Los gastos en Salud restan presupuesto a tus gastos Personales. Presupuesto Personal Inicial: ${healthStatus.remainingPersonal + healthStatus.saludSpent} USD.
            </p>
            <div className="mt-3 flex items-center justify-between text-[11px] font-mono">
              <span>Gastado en Salud: ${healthStatus.saludSpent}</span>
              <span>Cupo Personal Restante: ${healthStatus.remainingPersonal}</span>
            </div>
          </div>

          {/* Rule 4 Indicator */}
          <div className="p-4 rounded-2xl border border-stone-850 bg-stone-950/10">
            <h4 className="text-xs font-bold">💖 Tope Amoroso Hard-Limit</h4>
            <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
              Si tu Pago para No Generar Intereses acumulado supera el 30% de tus ingresos, el pilar Amoroso se congela al 5%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
