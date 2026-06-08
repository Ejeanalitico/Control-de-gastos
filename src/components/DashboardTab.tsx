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

  // --- FLOATING DAY ACTIVITIES MODAL STATE ---
  const [showDayModal, setShowDayModal] = useState<boolean>(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState<string>("");
  const [editPilar, setEditPilar] = useState<CategoriaPilar>(CategoriaPilar.SALUD);
  const [editDesc, setEditDesc] = useState<string>("");
  const [editHoraInicio, setEditHoraInicio] = useState<string>("10:00");
  const [editHoraFin, setEditHoraFin] = useState<string>("11:00");
  const [editSuccess, setEditSuccess] = useState<string>("");
  const [editError, setEditError] = useState<string>("");

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

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta actividad permanentemente?")) return;

    try {
      const res = await fetch(`/api/eventos/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Fallo al eliminar de la base de datos.");

      setEventos(prev => prev.filter(ev => ev.ID_Actividad !== id));
      setEditSuccess("Actividad eliminada con éxito.");
      setTimeout(() => setEditSuccess(""), 3000);
    } catch (err: any) {
      setEditError(err.message || "Error al eliminar.");
      setTimeout(() => setEditError(""), 3000);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEventId) return;

    setEditError("");
    setEditSuccess("");

    try {
      const eventToEdit = eventos.find(ev => ev.ID_Actividad === editingEventId);
      if (!eventToEdit) throw new Error("Actividad no encontrada.");

      const updatedColor = 
        editPilar === CategoriaPilar.SALUD ? "green" 
        : editPilar === CategoriaPilar.ESCOLAR ? "blue"
        : editPilar === CategoriaPilar.LABORAL ? "indigo"
        : editPilar === CategoriaPilar.PERSONAL ? "orange"
        : "purple";

      const dateOnly = eventToEdit.Fecha;
      const startDateTime = `${dateOnly}T${editHoraInicio}`;
      const endDateTime = `${dateOnly}T${editHoraFin}`;

      const updatedPayload = {
        Titulo_Actividad: editTitulo,
        Titulo: editTitulo,
        Pilar: editPilar,
        Pilar_Asociado: editPilar,
        Descripcion_Detallada: editDesc,
        Descripcion: editDesc,
        Fecha_Hora_Inicio: startDateTime,
        Fecha_Hora_Fin: endDateTime,
        Color: updatedColor
      };

      const res = await fetch(`/api/eventos/${editingEventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload)
      });

      if (!res.ok) throw new Error("Fallo al guardar cambios en servidor.");

      setEventos(prev => prev.map(ev => 
        ev.ID_Actividad === editingEventId 
          ? { ...ev, ...updatedPayload } 
          : ev
      ));

      setEditSuccess("¡Actividad actualizada correctamente!");
      setTimeout(() => {
        setEditSuccess("");
        setEditingEventId(null);
      }, 1500);
    } catch (err: any) {
      setEditError(err.message || "Error al actualizar.");
    }
  };



  const periodicItems = useMemo(() => {
    const list: Array<{ name: string; category: string; amount: number; period: string; color: string; detail: string }> = [];

    // Filter fixed recurring egresos
    egresos.forEach(e => {
      if (
        e.Tipo_Gasto === "Fijo" || 
        e.Subcategoria.toLowerCase().includes("mensual") || 
        e.Concepto.toLowerCase().includes("renta") || 
        e.Concepto.toLowerCase().includes("suscrip") ||
        e.Concepto.toLowerCase().includes("plan")
      ) {
        list.push({
          name: e.Concepto,
          category: e.Categoria_Pilar.replace("_", " "),
          amount: e.Monto,
          period: "Mensual",
          color: "teal",
          detail: `Vía: ${e.Metodo_Pago} | Categoría: ${e.Subcategoria}`
        });
      }
    });

    // Add credit card cut-off/payment schedules from deudas
    deudas.forEach(card => {
      if (card.Tipo === TipoTarjeta.CREDITO) {
        list.push({
          name: `Liquidación: ${card.Nombre_Tarjeta}`,
          category: "Finanzas",
          amount: card.Pago_Para_No_Generar_Intereses || card.Pago_Minimo || 150.00,
          period: `Día ${card.Fecha_Limite_Pago} del mes`,
          color: "rose",
          detail: `Corte: Día ${card.Fecha_Corte} | Pago Mínimo Obligatorio: $${card.Pago_Minimo} USD`
        });
      }
    });

    // Fallback if list empty
    if (list.length === 0) {
      list.push({
        name: "Renta de Departamento",
        category: "Vivienda",
        amount: 1200.00,
        period: "Día 02 de cada mes",
        color: "teal",
        detail: "Fijo - Citi Checking Débito"
      });
      list.push({
        name: "Plan de Internet + Telefonía Móvil",
        category: "Comunicaciones",
        amount: 45.00,
        period: "Día 10 de cada mes",
        color: "teal",
        detail: "Cargo automático en TDC"
      });
    }

    return list;
  }, [egresos, deudas]);

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

      {/* 2. Registro de Actividades o Eventos (Pilar Entry Card - Moved First!) */}
      <div className={`p-6 rounded-[2.5rem] border transition-all ${
        darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
      }`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5 ${darkMode ? "text-stone-300" : "text-stone-850"}`}>
          <PlusCircle className="w-4 h-4 text-teal-500 animate-pulse" />
          <span>Registrar Actividad o Evento</span>
        </h3>

        {formSuccess && <div className="p-3 text-xs rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 mb-4 font-semibold">{formSuccess}</div>}
        {formError && <div className="p-3 text-xs rounded-xl bg-rose-500/10 text-rose-450 border border-rose-500/20 mb-4 font-semibold">{formError}</div>}

        <form onSubmit={handleCreateActivity} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Actividad Title */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Título de Actividad</label>
              <input
                type="text"
                required
                placeholder="Ej. Sesión de Mentoría Financiera"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className={`w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all ${
                  darkMode ? "bg-stone-950 border-stone-850 text-white" : "bg-stone-50 border-stone-200 text-stone-900"
                }`}
              />
            </div>

            {/* Fecha Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Fecha</label>
              <input
                type="date"
                required
                value={selectedDateStr}
                onChange={(e) => setSelectedDateStr(e.target.value)}
                className={`w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all ${
                  darkMode ? "bg-stone-950 border-stone-850 text-white" : "bg-stone-50 border-stone-200 text-stone-900"
                }`}
              />
            </div>

            {/* Pilar Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Pilar / Categoría</label>
              <select
                value={pilar}
                onChange={(e) => setPilar(e.target.value as CategoriaPilar)}
                className={`w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all ${
                  darkMode ? "bg-stone-950 border-stone-850 text-white" : "bg-stone-50 border-stone-200 text-stone-900"
                }`}
              >
                <option value={CategoriaPilar.SALUD}>🩺 Salud</option>
                <option value={CategoriaPilar.ESCOLAR}>📚 Escolar</option>
                <option value={CategoriaPilar.LABORAL}>💼 Laboral</option>
                <option value={CategoriaPilar.PERSONAL}>🍀 Personal</option>
                <option value={CategoriaPilar.AMOROSO}>💖 Amoroso</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Cost? Checkbox */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-205 dark:border-stone-850">
              <span className="text-[10px] uppercase font-bold text-stone-500">¿Implica costo financiero?</span>
              <input
                type="checkbox"
                checked={requierePago}
                onChange={(e) => setRequierePago(e.target.checked)}
                className="w-4.5 h-4.5 cursor-pointer text-teal-600 rounded focus:ring-teal-500"
              />
            </div>

            {/* If Payment Required, show these fields */}
            {requierePago && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Tarjeta / Cuenta</label>
                  <select
                    required={requierePago}
                    value={tarjetaId}
                    onChange={(e) => setTarjetaId(e.target.value)}
                    className={`w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all ${
                      darkMode ? "bg-stone-950 border-stone-850 text-white" : "bg-stone-50 border-stone-200 text-stone-900"
                    }`}
                  >
                    <option value="">-- Escoger Tarjeta --</option>
                    {deudas.map(card => (
                      <option key={card.ID_Instrumento} value={card.ID_Instrumento}>
                        {card.Nombre_Tarjeta} (${card.Saldo_Disponible})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Monto (USD)</label>
                  <input
                    type="number"
                    required={requierePago}
                    placeholder="Monto"
                    value={gastoMonto}
                    onChange={(e) => setGastoMonto(e.target.value)}
                    className={`w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all ${
                      darkMode ? "bg-stone-950 border-stone-850 text-white" : "bg-stone-50 border-stone-200 text-stone-900"
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Tipo de Gasto</label>
                  <select
                    value={gastoTipo}
                    onChange={(e) => setGastoTipo(e.target.value as TipoGasto)}
                    className={`w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all ${
                      darkMode ? "bg-stone-950 border-stone-850 text-white" : "bg-stone-50 border-stone-200 text-stone-900"
                    }`}
                  >
                    <option value={TipoGasto.VARIABLE}>Variable</option>
                    <option value={TipoGasto.FIJO}>Fijo</option>
                    <option value={TipoGasto.HORMIGA}>Hormiga</option>
                  </select>
                </div>
              </>
            )}

            {!requierePago && <div className="md:col-span-2 hidden md:block" />}

            {/* Submit Button */}
            <div className={`${requierePago ? "md:col-span-4" : ""} w-full`}>
              <button type="submit" className="w-full py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-650 text-white text-xs font-bold cursor-pointer transition-all shadow-md shadow-teal-500/10 flex items-center justify-center gap-1.5">
                <span>Registrar Actividad en Base de Datos</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 3. Monthly Calendar Grid (Primary View - Expanded to Full Width!) */}
      <div className={`p-6 rounded-[2.5rem] border transition-all ${
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
                  if (hasEvents) {
                    setSelectedDateStr(cDay.dateStr);
                    setShowDayModal(true); // Open activities floating modal
                  }
                }}
                className={`min-h-[110px] p-2.5 border flex flex-col justify-start transition-all cursor-pointer ${
                  !hasEvents ? "bg-transparent border-transparent cursor-default"
                  : isSelected 
                    ? darkMode
                      ? "bg-stone-900/60 border-teal-500/50"
                      : "bg-stone-50 border-teal-500/50 shadow-sm"
                    : darkMode 
                      ? "bg-[#161616]/40 border-stone-900 text-stone-300 hover:border-stone-800" 
                      : "bg-white border-stone-150 text-stone-800 hover:bg-stone-50"
                }`}
              >
                {/* Day number with selected circular badge */}
                <div className="flex items-center justify-between w-full mb-1">
                  {hasEvents && (
                    isSelected ? (
                      <span className="w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center text-[10px] font-bold">
                        {cDay.dayNum}
                      </span>
                    ) : (
                      <span className={`text-[10px] font-bold ${
                        cDay.dayNum === 1 ? (darkMode ? "text-stone-400" : "text-stone-600") : (darkMode ? "text-stone-500" : "text-stone-400")
                      }`}>
                        {cDay.dayNum === 1 ? `1 de ${monthNames[currentMonth].slice(0, 3).toLowerCase()}` : cDay.dayNum}
                      </span>
                    )
                  )}
                </div>
                
                {/* Event list stacked vertically */}
                <div className="space-y-1 overflow-hidden w-full flex-grow flex flex-col justify-start">
                  {dateEvents.slice(0, 3).map((e, index) => {
                    const dotColorClass = 
                      e.Color === "green" ? "bg-emerald-500"
                      : e.Color === "blue" || e.Color === "indigo" ? "bg-sky-400"
                      : e.Color === "orange" ? "bg-amber-500"
                      : e.Color === "purple" ? "bg-purple-400"
                      : "bg-rose-500";

                    // Extract time from Fecha_Hora_Inicio (e.g. "2026-06-08T10:00")
                    let timeStr = "";
                    if (e.Fecha_Hora_Inicio && e.Fecha_Hora_Inicio.includes("T")) {
                      const rawTime = e.Fecha_Hora_Inicio.split("T")[1];
                      const parts = rawTime.split(":");
                      if (parts.length >= 2) {
                        const hour = parseInt(parts[0], 10);
                        const min = parts[1];
                        const ampm = hour >= 12 ? "pm" : "am";
                        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
                        timeStr = `${displayHour}:${min}${ampm}`;
                      }
                    }

                    return (
                      <div 
                        key={index} 
                        title={`${timeStr ? timeStr + " " : ""}${e.Titulo_Actividad || e.Titulo}`}
                        className="flex items-center gap-1.5 text-[9px] font-medium leading-none truncate w-full text-stone-600 dark:text-stone-300 select-none py-0.5"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColorClass}`} />
                        <span className="truncate">
                          {timeStr && <span className="opacity-75 font-semibold mr-1">{timeStr}</span>}
                          {e.Titulo_Actividad || e.Titulo}
                        </span>
                      </div>
                    );
                  })}
                  {dateEvents.length > 3 && (
                    <div className="text-[8px] font-bold text-stone-500 text-left pl-3 leading-none mt-0.5">
                      +{dateEvents.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Wallet Cuentas/Tarjetas Deck */}
      <div className={`p-6 rounded-[2.5rem] border transition-all ${
        darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
      }`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-5 flex items-center gap-1.5 ${darkMode ? "text-stone-300" : "text-stone-850"}`}>
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

      {/* 5. Gastos y Adquisiciones Periódicos (Full Width at Bottom - Removed Matrix!) */}
      <div className={`p-6 rounded-[2.5rem] border transition-all ${
        darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
      }`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5 ${darkMode ? "text-stone-300" : "text-stone-850"}`}>
          <Clock className="w-4 h-4 text-teal-500 animate-pulse" />
          <span>Gastos y Adquisiciones Periódicos</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[350px] overflow-y-auto pr-1">
          {periodicItems.map((item, idx) => (
            <div key={idx} className={`p-4 rounded-2xl border ${darkMode ? "bg-stone-950/60 border-stone-850" : "bg-stone-50 border-stone-200"}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  item.color === "rose" ? "bg-rose-500/10 text-rose-400" : "bg-teal-500/10 text-teal-400"
                }`}>
                  {item.category}
                </span>
                <span className="text-[10px] font-semibold text-stone-400">{item.period}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <h4 className={`text-xs font-bold truncate ${darkMode ? "text-white" : "text-stone-900"}`}>{item.name}</h4>
                <span className={`text-xs font-mono font-bold ${item.color === "rose" ? "text-rose-500" : "text-teal-500"}`}>
                  ${item.amount.toLocaleString()} USD
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 6. FLOATING MODAL OVERLAY (Google Calendar Day Details) */}
      {showDayModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-lg rounded-[2.5rem] border shadow-2xl p-6 relative transition-all ${
            darkMode ? "bg-[#18181b] border-stone-800 text-white" : "bg-white border-stone-200 text-stone-900"
          }`}>
            
            {/* Close button */}
            <button 
              onClick={() => {
                setShowDayModal(false);
                setEditingEventId(null);
                setEditError("");
                setEditSuccess("");
              }}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-500/10 cursor-pointer text-stone-400 font-semibold"
            >
              ✕
            </button>

            {editingEventId === null ? (
              // --- VIEW MODE ---
              <div className="space-y-4">
                <div className="border-b pb-2 border-stone-250 dark:border-stone-800">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-teal-500">
                    Actividades para el {selectedDateStr}
                  </h3>
                  <p className="text-[10px] text-stone-500 mt-0.5">
                    Historial de eventos y sincronización Google Calendar.
                  </p>
                </div>

                {editSuccess && <div className="p-2.5 text-xs rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">{editSuccess}</div>}
                {editError && <div className="p-2.5 text-xs rounded-xl bg-rose-500/10 text-rose-450 border border-rose-500/20">{editError}</div>}

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {selectedDayEvents.length === 0 ? (
                    <p className="text-xs text-stone-500 text-center py-12">No hay actividades registradas en esta fecha.</p>
                  ) : (
                    selectedDayEvents.map((ev) => {
                      const isGoogleEvent = ev.Pilar === "Google Sync" || ev.ID_Actividad.startsWith("g-");
                      return (
                        <div 
                          key={ev.ID_Actividad} 
                          className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                            darkMode ? "bg-stone-950/60 border-stone-850" : "bg-stone-50 border-stone-200"
                          }`}
                        >
                          <div className="flex flex-col gap-1">
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
                              {ev.Requiere_Pago && (
                                <span className="text-[10px] font-bold text-amber-500">
                                  -${ev.Monto || 0} USD
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-bold">{ev.Titulo_Actividad || ev.Titulo}</h4>
                            {ev.Descripcion_Detallada && (
                              <p className="text-[11px] text-stone-500 leading-normal">{ev.Descripcion_Detallada}</p>
                            )}
                            {ev.Fecha_Hora_Inicio && (
                              <p className="text-[10px] text-stone-400 font-mono">
                                🕒 {ev.Fecha_Hora_Inicio.slice(11, 16)} - {(ev.Fecha_Hora_Fin || "").slice(11, 16)}
                              </p>
                            )}
                          </div>

                          {/* Action deck */}
                          {!isGoogleEvent && (
                            <div className="flex gap-2 justify-end border-t pt-2 border-stone-200 dark:border-stone-850">
                              <button
                                onClick={() => {
                                  setEditingEventId(ev.ID_Actividad);
                                  setEditTitulo(ev.Titulo_Actividad || ev.Titulo || "");
                                  setEditPilar(ev.Pilar as CategoriaPilar);
                                  setEditDesc(ev.Descripcion_Detallada || ev.Descripcion || "");
                                  setEditHoraInicio(ev.Fecha_Hora_Inicio ? ev.Fecha_Hora_Inicio.slice(11, 16) : "10:00");
                                  setEditHoraFin(ev.Fecha_Hora_Fin ? ev.Fecha_Hora_Fin.slice(11, 16) : "11:00");
                                }}
                                className="py-1 px-3 rounded-lg text-[10px] font-bold border border-teal-500/25 bg-teal-500/5 hover:bg-teal-500 hover:text-white text-teal-400 cursor-pointer transition-all"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteEvent(ev.ID_Actividad)}
                                className="py-1 px-3 rounded-lg text-[10px] font-bold border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500 hover:text-white text-rose-455 cursor-pointer transition-all"
                              >
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              // --- EDIT MODE ---
              <form onSubmit={handleUpdateEvent} className="space-y-4">
                <div className="border-b pb-2 border-stone-250 dark:border-stone-850">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-teal-500">
                    Editar Actividad
                  </h3>
                  <p className="text-[10px] text-stone-500 mt-0.5">
                    Modifica los campos del evento seleccionado.
                  </p>
                </div>

                {editSuccess && <div className="p-2 text-xs rounded-xl bg-teal-500/10 text-teal-450">{editSuccess}</div>}
                {editError && <div className="p-2 text-xs rounded-xl bg-rose-500/10 text-rose-455">{editError}</div>}

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-stone-500">Título</label>
                    <input 
                      type="text" 
                      required
                      value={editTitulo}
                      onChange={(e) => setEditTitulo(e.target.value)}
                      className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none ${
                        darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-stone-50 border-stone-200 text-stone-900"
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-stone-500">Pilar</label>
                    <select
                      value={editPilar}
                      onChange={(e) => setEditPilar(e.target.value as CategoriaPilar)}
                      className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none ${
                        darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-stone-50 border-stone-200 text-stone-900"
                      }`}
                    >
                      <option value={CategoriaPilar.SALUD}>🩺 Salud</option>
                      <option value={CategoriaPilar.ESCOLAR}>📚 Escolar</option>
                      <option value={CategoriaPilar.LABORAL}>💼 Laboral</option>
                      <option value={CategoriaPilar.PERSONAL}>🍀 Personal</option>
                      <option value={CategoriaPilar.AMOROSO}>💖 Amoroso</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-stone-500">Hora Inicio</label>
                      <input 
                        type="time" 
                        value={editHoraInicio}
                        onChange={(e) => setEditHoraInicio(e.target.value)}
                        className={`w-full text-xs p-2 rounded-xl border focus:outline-none ${
                          darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-stone-50 border-stone-200 text-stone-900"
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-stone-500">Hora Fin</label>
                      <input 
                        type="time" 
                        value={editHoraFin}
                        onChange={(e) => setEditHoraFin(e.target.value)}
                        className={`w-full text-xs p-2 rounded-xl border focus:outline-none ${
                          darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-stone-50 border-stone-200 text-stone-900"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-stone-500">Descripción</label>
                    <textarea
                      rows={2}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none ${
                        darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-stone-50 border-stone-200 text-stone-900"
                      }`}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end border-t pt-3 border-stone-200 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => setEditingEventId(null)}
                    className={`py-2 px-4 rounded-xl text-xs font-bold border cursor-pointer ${
                      darkMode ? "bg-stone-900 border-stone-800 hover:bg-stone-800 text-white" : "bg-stone-100 border-stone-200 hover:bg-stone-200 text-stone-700"
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-4 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-650 text-white cursor-pointer shadow-md"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
