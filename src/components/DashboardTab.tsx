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
  EstadoMeta,
  Micrometa,
  Pilar
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
  Bell,
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
  micrometas: Micrometa[];
  setMicrometas: React.Dispatch<React.SetStateAction<Micrometa[]>>;
  activeUser: Usuario;
  currency: string;
  isInitialLoadComplete: boolean;
  pilares: Pilar[];
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
  micrometas,
  setMicrometas,
  activeUser,
  currency,
  isInitialLoadComplete,
  pilares
}: DashboardTabProps) {

  const eventosRef = React.useRef(eventos);
  eventosRef.current = eventos;
  const metasRef = React.useRef(metas);
  metasRef.current = metas;
  const micrometasRef = React.useRef(micrometas);
  micrometasRef.current = micrometas;

  const getValidGoogleToken = () => {
    const gToken = localStorage.getItem(`pilar5_g_token_${activeUser.ID_Usuario}`);
    const isConnected = localStorage.getItem(`pilar5_g_connected_${activeUser.ID_Usuario}`);
    const expiresAt = localStorage.getItem(`pilar5_g_expires_at_${activeUser.ID_Usuario}`);

    if (gToken) {
      const isExpired = expiresAt ? Date.now() > parseInt(expiresAt) : false;
      if (isExpired) {
        localStorage.removeItem(`pilar5_g_token_${activeUser.ID_Usuario}`);
        localStorage.removeItem(`pilar5_g_connected_${activeUser.ID_Usuario}`);
        localStorage.removeItem(`pilar5_g_user_${activeUser.ID_Usuario}`);
        localStorage.removeItem(`pilar5_g_expires_at_${activeUser.ID_Usuario}`);
        fetch("/api/auth/google/unlink", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: activeUser.ID_Usuario })
        }).catch(() => {});
        return null;
      }
    }
    return isConnected === "true" ? gToken : null;
  };

  // --- CALENDAR GRID STATE ---
  const [calendarDate, setCalendarDate] = useState<Date>(new Date(2026, 5, 8)); // Default to June 8, 2026 (matching sample data)
  const [selectedDateStr, setSelectedDateStr] = useState<string>("2026-06-08");
  const [dateTimeInputVal, setDateTimeInputVal] = useState<string>("2026-06-08T10:00");
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [gcalLoading, setGcalLoading] = useState<boolean>(false);

  // --- FORM STATE ---
  const [titulo, setTitulo] = useState<string>("");
  const [pilar, setPilar] = useState<string>("");
  const [tipoAgenda, setTipoAgenda] = useState<string>("Agenda_Personal");
  const [descripcion, setDescripcion] = useState<string>("");
  const [horaInicio, setHoraInicio] = useState<string>("10:00");
  const [horaFin, setHoraFin] = useState<string>("11:00");
  const [requierePago, setRequierePago] = useState<boolean>(false);
  const [gastoMonto, setGastoMonto] = useState<string>("0");
  const [tarjetaId, setTarjetaId] = useState<string>("");
  const [gastoSubcategoria, setGastoSubcategoria] = useState<string>("");
  const [gastoTipo, setGastoTipo] = useState<TipoGasto>(TipoGasto.VARIABLE);
  
  // --- NEW FORM STATES FOR PENDING AND RECURRENCE ---
  const [registroTipo, setRegistroTipo] = useState<"recordatorio" | "micrometa">("recordatorio");
  const [selectedMetaId, setSelectedMetaId] = useState<string>("");
  const [gastoEstado, setGastoEstado] = useState<"Pagado" | "Pendiente">("Pagado");
  const [recurrencia, setRecurrencia] = useState<"none" | "semanal" | "mensual" | "anual">("none");
  const [repeticionesCount, setRepeticionesCount] = useState<number>(12);
  
  const [formSuccess, setFormSuccess] = useState<string>("");
  const [formError, setFormError] = useState<string>("");

  // --- FLOATING DAY ACTIVITIES MODAL STATE ---
  const [showDayModal, setShowDayModal] = useState<boolean>(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState<string>("");
  const [editPilar, setEditPilar] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");
  const [editHoraInicio, setEditHoraInicio] = useState<string>("10:00");
  const [editHoraFin, setEditHoraFin] = useState<string>("11:00");
  const [editFecha, setEditFecha] = useState<string>("");
  const [editSuccess, setEditSuccess] = useState<string>("");
  const [editError, setEditError] = useState<string>("");

  // --- EDIT RECURRING EGRESO MODAL STATE ---
  const [showEditEgresoModal, setShowEditEgresoModal] = useState<boolean>(false);
  const [editingEgreso, setEditingEgreso] = useState<Egreso | null>(null);
  const [editEgresoConcepto, setEditEgresoConcepto] = useState<string>("");
  const [editEgresoMonto, setEditEgresoMonto] = useState<string>("");
  const [editEgresoRecurrencia, setEditEgresoRecurrencia] = useState<string>("mensual");
  const [editEgresoError, setEditEgresoError] = useState<string>("");
  const [editEgresoSuccess, setEditEgresoSuccess] = useState<string>("");

  // Custom Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const selectedMeta = metas.find(m => m.ID_Meta === selectedMetaId);
  useEffect(() => {
    if (registroTipo === "micrometa" && selectedMeta) {
      setPilar(selectedMeta.Pilar as CategoriaPilar);
    }
  }, [registroTipo, selectedMetaId, selectedMeta]);

  useEffect(() => {
    setDateTimeInputVal(prev => {
      const currentHourMin = prev.includes("T") ? prev.split("T")[1] : "10:00";
      return `${selectedDateStr}T${currentHourMin}`;
    });
  }, [selectedDateStr]);

  const handleDateTimeChange = (val: string) => {
    setDateTimeInputVal(val);
    if (val && val.includes("T")) {
      setSelectedDateStr(val.split("T")[0]);
    }
  };

  // --- GOOGLE CALENDAR SYNC EFFECT ---
  useEffect(() => {
    if (!isInitialLoadComplete) return;

    const fetchGoogleCalendar = async () => {
      const gToken = getValidGoogleToken();
      if (!gToken) {
        setGoogleEvents([]);
        return;
      }

      setGcalLoading(true);
      try {
        const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?showDeleted=true&maxResults=100", {
          headers: { Authorization: `Bearer ${gToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          const items = data.items || [];
          
          const deletedKey = `pilar5_deleted_gcal_${activeUser.ID_Usuario}`;
          const deletedList = JSON.parse(localStorage.getItem(deletedKey) || "[]");

          // Sweep and delete stale Google Calendar events that the user deleted locally
          for (const it of items) {
            if (it.status !== "cancelled" && deletedList.includes(it.id)) {
              console.log(`[SYNC] Auto-deleting stale Google Calendar event from Google account: ${it.id}`);
              try {
                const isRecur = it.id.includes("_");
                await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${it.id}`, {
                  method: isRecur ? "PATCH" : "DELETE",
                  headers: { 
                    Authorization: `Bearer ${gToken}`,
                    ...(isRecur ? { "Content-Type": "application/json" } : {})
                  },
                  body: isRecur ? JSON.stringify({ status: "cancelled" }) : undefined
                });
              } catch (err) {
                console.error("Auto-delete stale Google event failed:", err);
              }
            }
          }

          const activeGcalEvents = items.filter((it: any) => it.status !== "cancelled" && !deletedList.includes(it.id));
          setGoogleEvents(activeGcalEvents.map((it: any) => ({
            id: it.id,
            summary: it.summary || "Evento Google Calendar",
            description: it.description || "",
            start: it.start?.dateTime || it.start?.date || "",
            end: it.end?.dateTime || it.end?.date || "",
            color: "indigo"
          })));

          let didChange = false;
          for (const it of items) {
            const isCancelled = it.status === "cancelled";
            
            const matchEvent = eventosRef.current.find(e => e.ID_Evento === it.id || e.ID_Actividad === it.id);
            const matchMeta = metasRef.current.find(m => m.ID_Evento_Calendario === it.id);
            const matchMm = micrometasRef.current.find(mm => mm.ID_Evento_Calendario === it.id);

            if (isCancelled) {
              if (matchEvent) {
                await fetch(`/api/eventos/${matchEvent.ID_Actividad}`, { method: "DELETE" });
                didChange = true;
              }
              if (matchMeta) {
                await fetch(`/api/metas/${matchMeta.ID_Meta}`, { method: "DELETE" });
                didChange = true;
              }
              if (matchMm) {
                await fetch(`/api/micrometas/${matchMm.ID_Micrometa}`, { method: "DELETE" });
                didChange = true;
              }
            } else {
              if (deletedList.includes(it.id)) {
                continue;
              }
              const startVal = it.start?.dateTime || it.start?.date || "";
              const endVal = it.end?.dateTime || it.end?.date || "";
              const dateStr = startVal.slice(0, 10) || new Date().toISOString().split("T")[0];
              const summaryText = it.summary || "Importado de GCal";
              const descText = it.description || "Sincronizado desde Google Calendar.";

              if (!matchEvent && !matchMeta && !matchMm) {
                const activityId = `gcal-import-${it.id}`;
                const newActivity = {
                  ID_Usuario: activeUser.ID_Usuario,
                  ID_Evento: it.id,
                  ID_Actividad: activityId,
                  Tipo_Agenda: "Agenda_Personal",
                  Pilar: "Personal",
                  Pilar_Asociado: "Personal",
                  Titulo_Actividad: summaryText,
                  Titulo: summaryText,
                  Descripcion_Detallada: descText,
                  Descripcion: descText,
                  Fecha_Hora_Inicio: startVal.includes("T") ? startVal.slice(0, 16) : `${dateStr}T10:00`,
                  Fecha_Hora_Fin: endVal.includes("T") ? endVal.slice(0, 16) : `${dateStr}T11:00`,
                  Requiere_Pago: 0,
                  ID_Egreso_Asociado: null,
                  Fecha: dateStr,
                  Tipo_Evento: "FDLA",
                  Color: "indigo",
                  Alerta_Descalce: 0
                };
                
                await fetch("/api/eventos", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(newActivity)
                });
                didChange = true;
              } else if (matchEvent) {
                const localStart = matchEvent.Fecha_Hora_Inicio || "";
                const localEnd = matchEvent.Fecha_Hora_Fin || "";
                const remoteStart = startVal.includes("T") ? startVal.slice(0, 16) : `${dateStr}T10:00`;
                const remoteEnd = endVal.includes("T") ? endVal.slice(0, 16) : `${dateStr}T11:00`;
                
                if (
                  matchEvent.Titulo !== summaryText ||
                  matchEvent.Descripcion !== descText ||
                  localStart.slice(0, 16) !== remoteStart ||
                  localEnd.slice(0, 16) !== remoteEnd
                ) {
                  const updatedPayload = {
                    ...matchEvent,
                    Titulo_Actividad: summaryText,
                    Titulo: summaryText,
                    Descripcion_Detallada: descText,
                    Descripcion: descText,
                    Fecha_Hora_Inicio: remoteStart,
                    Fecha_Hora_Fin: remoteEnd,
                    Fecha: dateStr
                  };
                  await fetch(`/api/eventos/${matchEvent.ID_Actividad}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatedPayload)
                  });
                  didChange = true;
                }
              } else if (matchMeta) {
                const remoteStart = startVal.slice(0, 10);
                const cleanSummary = summaryText.replace(/^🎯 Meta: /, "");
                if (matchMeta.Meta_SMART !== cleanSummary || matchMeta.Fecha_Meta !== remoteStart) {
                  await fetch(`/api/metas/${matchMeta.ID_Meta}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      ...matchMeta,
                      Meta_SMART: cleanSummary,
                      Fecha_Meta: remoteStart
                    })
                  });
                  didChange = true;
                }
              } else if (matchMm) {
                const remoteStart = startVal.slice(0, 10);
                const cleanSummary = summaryText.replace(/^🏁 Micrometa: /, "");
                if (matchMm.Titulo !== cleanSummary || matchMm.Fecha_Planificada !== remoteStart) {
                  await fetch(`/api/micrometas/${matchMm.ID_Micrometa}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      ...matchMm,
                      Titulo: cleanSummary,
                      Fecha_Planificada: remoteStart
                    })
                  });
                  didChange = true;
                }
              }
            }
          }

          if (didChange) {
            const fetchRes = await fetch(`/api/data?userId=${activeUser.ID_Usuario}`);
            if (fetchRes.ok) {
              const data = await fetchRes.json();
              setIngresos(data.ingresos || []);
              setEgresos(data.egresos || []);
              setDeudas(data.deudas || []);
              setMetas(data.metas || []);
              setEventos(data.eventos || []);
              setMicrometas(data.micrometas || []);
            }
          }
        } else {
          setGoogleEvents([]);
        }
      } catch (err) {
        console.error("Reconciliation error:", err);
        setGoogleEvents([]);
      } finally {
        setGcalLoading(false);
      }
    };
    fetchGoogleCalendar();
  }, [activeUser.ID_Usuario, isInitialLoadComplete]);

  // --- KPI CALCULATIONS ---
  const totalIncomes = useMemo(() => {
    const localToday = new Date().toLocaleDateString("sv-SE");
    const utcToday = new Date().toISOString().split("T")[0];
    const today = localToday > utcToday ? localToday : utcToday;
    return ingresos
      .filter(i => i.Fecha <= today)
      .reduce((s, i) => s + i.Monto_Neto, 0);
  }, [ingresos]);

  const totalExpenses = useMemo(() => {
    const localToday = new Date().toLocaleDateString("sv-SE");
    const utcToday = new Date().toISOString().split("T")[0];
    const today = localToday > utcToday ? localToday : utcToday;
    return egresos
      .filter(e => e.Fecha <= today)
      .reduce((s, e) => s + e.Monto, 0);
  }, [egresos]);

  const totalDebitAvailable = useMemo(() => {
    return deudas
      .filter(d => d.Saldo_Disponible > 0)
      .reduce((s, d) => s + d.Saldo_Disponible, 0);
  }, [deudas]);

  const totalCreditDebt = useMemo(() => {
    return deudas
      .filter(d => d.Tipo === TipoTarjeta.CREDITO)
      .reduce((s, d) => s + d.Deuda_Actual, 0);
  }, [deudas]);

  const netBalance = useMemo(() => {
    return (totalIncomes - totalExpenses) + totalDebitAvailable;
  }, [totalIncomes, totalExpenses, totalDebitAvailable]);

  const netCards = useMemo(() => {
    return totalDebitAvailable - totalCreditDebt;
  }, [totalDebitAvailable, totalCreditDebt]);

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

    // Add metas to the calendar
    metas.forEach(meta => {
      if (meta.Fecha_Meta) {
        // meta.Pilar can be an ID_Pilar or a CategoriaPilar name
        const metaPilarObj = pilares.find(p => p.ID_Pilar === meta.Pilar || p.Nombre === meta.Pilar);
        const metaPilarNombre = metaPilarObj?.Nombre || meta.Pilar;
        const metaHexColor = metaPilarObj?.Color && metaPilarObj.Color.startsWith("#")
          ? metaPilarObj.Color : "#10b981";
        list.push({
          ID_Actividad: `evt-meta-${meta.ID_Meta}`,
          Titulo_Actividad: `🎯 Meta: ${meta.Meta_SMART}`,
          Descripcion_Detallada: `Pilar: ${metaPilarNombre} | Indicador: ${meta.Indicador_Exito} | Presupuesto: $${meta.Presupuesto_Asignado}`,
          Fecha: meta.Fecha_Meta,
          Fecha_Hora_Inicio: `${meta.Fecha_Meta}T09:00`,
          Pilar: metaPilarNombre,
          Color: metaHexColor,
          Requiere_Pago: false
        });
      }
    });

    // Add micrometas to the calendar — resolve pilar name from parent meta
    micrometas.forEach(mm => {
      if (mm.Fecha_Planificada) {
        // Evitar duplicar si esta micrometa ya está en la base de datos (eventos sincronizados)
        const alreadyInDbEvents = list.some(evt => evt.ID_Actividad === `evt-micrometa-${mm.ID_Micrometa}`);
        if (alreadyInDbEvents) return;

        const parentMeta = metas.find(m => m.ID_Meta === mm.ID_Meta);
        // parentMeta.Pilar may be an ID_Pilar or a name string
        const parentPilarObj = parentMeta
          ? pilares.find(p => p.ID_Pilar === parentMeta.Pilar || p.Nombre === parentMeta.Pilar)
          : null;
        const parentPilarNombre = parentPilarObj?.Nombre || parentMeta?.Pilar || "Sin Pilar";
        const mmHexColor = parentPilarObj?.Color && parentPilarObj.Color.startsWith("#")
          ? parentPilarObj.Color : "#14b8a6";
        list.push({
          ID_Actividad: `evt-micrometa-${mm.ID_Micrometa}`,
          Titulo_Actividad: `🏁 Submeta: ${mm.Titulo}`,
          Descripcion_Detallada: `Estado: ${mm.Estado} | Gasto: $${mm.Monto_Gasto}`,
          Fecha: mm.Fecha_Planificada,
          Fecha_Hora_Inicio: `${mm.Fecha_Planificada}T10:00`,
          Pilar: parentPilarNombre,
          Color: mmHexColor,
          Requiere_Pago: mm.Genera_Gasto === 1,
          Estado: mm.Estado
        });
      }
    });

    return list;
  }, [eventos, deudas, googleEvents, metas, micrometas, pilares]);

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

    const parseMonto = parseFloat(gastoMonto);
    let egresoId: string | null = null;

    try {
      const isPaidNow = requierePago && gastoEstado === "Pagado";
      if (requierePago) {
        if (isNaN(parseMonto) || parseMonto <= 0) {
          throw new Error("Si la actividad requiere pago, ingresa un monto superior a 0.");
        }
        if (!tarjetaId) {
          throw new Error("Selecciona una tarjeta para autorizar el pago.");
        }

        if (isPaidNow) {
          const card = deudas.find(c => c.ID_Instrumento === tarjetaId);
          if (!card) throw new Error("Tarjeta no encontrada.");

          // 1. Save Egreso in SQLite
          egresoId = "egr-" + Math.random().toString(36).substring(2, 9);
          const subCat = gastoSubcategoria.trim() || `${pilar} Automático`;
          const finalPilar = registroTipo === "micrometa"
            ? (metas.find(m => m.ID_Meta === selectedMetaId)?.Pilar as CategoriaPilar || pilar)
            : pilar;
          const newEgreso: Egreso = {
            ID_Usuario: activeUser.ID_Usuario,
            ID_Egreso: egresoId,
            ID_Actividad_Origen: null,
            ID_Tarjeta_Utilizada: tarjetaId,
            Fecha: selectedDateStr,
            Concepto: titulo,
            Categoria_Pilar: finalPilar,
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

          // 2. Update Card Balances in SQLite
          let updatedCard: Deuda;
          if (card.Tipo === TipoTarjeta.CREDITO) {
            const nextDeuda = card.Deuda_Actual + parseMonto;
            updatedCard = {
              ...card,
              Deuda_Actual: nextDeuda,
              Saldo_Disponible: card.Limite_Credito - nextDeuda,
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
        }
      }

      if (registroTipo === "micrometa") {
        if (!selectedMetaId) {
          throw new Error("Selecciona una meta existente para vincular la micrometa.");
        }
        const mmId = "mm-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();

        // Push Micrometa to Google Calendar first if connected
        let googleEventId: string | null = null;
        const gToken = getValidGoogleToken();
        if (gToken && selectedDateStr) {
          if (gToken.startsWith("mock_google_token_")) {
            googleEventId = "mock-mm-evt-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
          } else {
            try {
              const syncRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${gToken}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  summary: `🏁 Micrometa: ${titulo.trim()}`,
                  description: `Pilar: ${selectedMeta?.Pilar || 'Personal'} | Gasto: ${parseMonto}`,
                  start: {
                    dateTime: `${selectedDateStr}T10:00:00-06:00`
                  },
                  end: {
                    dateTime: `${selectedDateStr}T11:00:00-06:00`
                  }
                })
              });
              if (syncRes.ok) {
                const syncData = await syncRes.json();
                googleEventId = syncData.id;
              }
            } catch (syncErr) {
              console.error("Google Calendar sync failed for micrometa in dashboard:", syncErr);
            }
          }
        }

        const micrometaPayload = {
          ID_Micrometa: mmId,
          ID_Usuario: activeUser.ID_Usuario,
          ID_Meta: selectedMetaId,
          Titulo: titulo,
          Estado: "Pendiente",
          Genera_Gasto: requierePago ? 1 : 0,
          Monto_Gasto: parseMonto || 0,
          Gasto_Pendiente: (requierePago && !isPaidNow) ? 1 : 0,
          ID_Tarjeta_Gasto: requierePago ? tarjetaId : null,
          Fecha_Planificada: selectedDateStr,
          Sincronizar_Calendario: gToken ? 1 : 0,
          ID_Evento_Calendario: googleEventId,
          Correlaciones: [],
          Recurrencia: recurrencia !== "none" ? recurrencia : null,
          Repeticiones: repeticionesCount
        };

        const resMm = await fetch("/api/micrometas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(micrometaPayload)
        });
        if (!resMm.ok) throw new Error("Fallo al registrar la micrometa.");

      } else {
        // Save Event in SQLite
        const activityId = "act-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
        const pilarObj = pilares.find(p => p.Nombre === pilar);
        const pilarColorHex: string = pilarObj?.Color
          ? (pilarObj.Color.startsWith("#") ? pilarObj.Color : "#3b82f6")
          : "#3b82f6";
        // Keep the legacy string color field for backward compat (stored as-is in DB)
        const color = pilarColorHex;

        const startHourMin = dateTimeInputVal.includes("T") ? dateTimeInputVal.split("T")[1] : "10:00";

        // Google Calendar Sync in background if token exists
        let googleEventId: string | null = null;
        const gTokenActivity = getValidGoogleToken();
        if (gTokenActivity) {
          if (gTokenActivity.startsWith("mock_google_token_")) {
            googleEventId = "mock-act-evt-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
          } else {
            try {
              const syncRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${gTokenActivity}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  summary: titulo,
                  description: descripcion || `Cita del pilar ${pilar}`,
                  start: {
                    dateTime: `${selectedDateStr}T${startHourMin}:00-06:00`
                  },
                  end: {
                    dateTime: `${selectedDateStr}T${horaFin}:00-06:00`
                  }
                })
              });
              if (syncRes.ok) {
                const syncData = await syncRes.json();
                googleEventId = syncData.id;
              }
            } catch (syncErr) {
              console.error("Google Calendar sync failed:", syncErr);
            }
          }
        }

        const newActivity = {
          ID_Usuario: activeUser.ID_Usuario,
          ID_Evento: googleEventId || activityId,
          ID_Actividad: activityId,
          Tipo_Agenda: tipoAgenda as any,
          Pilar: pilar,
          Pilar_Asociado: pilar,
          Titulo_Actividad: titulo,
          Titulo: titulo,
          Descripcion_Detallada: descripcion || `Cita del pilar ${pilar}`,
          Descripcion: descripcion || `Cita del pilar ${pilar}`,
          Fecha_Hora_Inicio: `${selectedDateStr}T${startHourMin}`,
          Fecha_Hora_Fin: `${selectedDateStr}T${horaFin}`,
          Requiere_Pago: requierePago,
          ID_Egreso_Asociado: isPaidNow ? egresoId : null,
          Fecha: selectedDateStr,
          Tipo_Evento: pilar,
          Color: color,
          Alerta_Descalce: false,
          Gasto_Pendiente: (requierePago && !isPaidNow) ? 1 : 0,
          Monto_Gasto: parseMonto || 0,
          ID_Tarjeta_Gasto: requierePago ? tarjetaId : null,
          Tipo_Gasto: requierePago ? gastoTipo : null,
          Recurrencia: recurrencia !== "none" ? recurrencia : null,
          Repeticiones: repeticionesCount
        };

        const resEvent = await fetch("/api/eventos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newActivity)
        });
        if (!resEvent.ok) throw new Error("Fallo al guardar la actividad.");
      }

      // 4. Reload all app datasets to sync visual states across pages
      const fetchRes = await fetch(`/api/data?userId=${activeUser.ID_Usuario}`);
      if (fetchRes.ok) {
        const data = await fetchRes.json();
        setIngresos(data.ingresos || []);
        setEgresos(data.egresos || []);
        setDeudas(data.deudas || []);
        setMetas(data.metas || []);
        setEventos(data.eventos || []);
        setMicrometas(data.micrometas || []);
      }

      setTitulo("");
      setDescripcion("");
      setGastoMonto("0");
      setRequierePago(false);
      setTarjetaId("");
      setGastoSubcategoria("");
      setRecurrencia("none");
      setGastoEstado("Pagado");
      setFormSuccess("🎉 Registrado exitosamente en la base de datos.");
      setTimeout(() => setFormSuccess(""), 4000);

    } catch (err: any) {
      setFormError(err.message || "Ocurrió un error.");
    }
  };



  const executeDeleteEvent = async (id: string) => {
    try {
      let googleEventId: string | undefined = undefined;
      if (id.startsWith("evt-meta-")) {
        const metaId = id.replace("evt-meta-", "");
        googleEventId = metas.find(m => m.ID_Meta === metaId)?.ID_Evento_Calendario;
      } else if (id.startsWith("evt-micrometa-")) {
        const mmId = id.replace("evt-micrometa-", "");
        googleEventId = micrometas.find(m => m.ID_Micrometa === mmId)?.ID_Evento_Calendario;
      } else {
        const eventToDelete = eventos.find(ev => ev.ID_Actividad === id);
        googleEventId = eventToDelete?.ID_Evento || id;
      }

      const gToken = getValidGoogleToken();

      if (
        googleEventId && 
        !googleEventId.startsWith("act-") && 
        !googleEventId.startsWith("g-") && 
        !googleEventId.startsWith("evt-") && 
        !googleEventId.startsWith("mock-") && 
        !googleEventId.startsWith("imported-") && 
        gToken && 
        !gToken.startsWith("mock_google_token_")
      ) {
        try {
          const isRecur = googleEventId.includes("_");
          await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
            method: isRecur ? "PATCH" : "DELETE",
            headers: {
              "Authorization": `Bearer ${gToken}`,
              ...(isRecur ? { "Content-Type": "application/json" } : {})
            },
            body: isRecur ? JSON.stringify({ status: "cancelled" }) : undefined
          });
        } catch (syncErr) {
          console.error("Google Calendar delete failed:", syncErr);
        }
      }

      // Add to local storage blocklist to prevent sync loop re-import
      if (googleEventId) {
        const deletedKey = `pilar5_deleted_gcal_${activeUser.ID_Usuario}`;
        const deletedList = JSON.parse(localStorage.getItem(deletedKey) || "[]");
        if (!deletedList.includes(googleEventId)) {
          deletedList.push(googleEventId);
          localStorage.setItem(deletedKey, JSON.stringify(deletedList));
        }
      }

      let deleteUrl = `/api/eventos/${id}`;
      if (id.startsWith("evt-micrometa-")) {
        const mmId = id.replace("evt-micrometa-", "");
        deleteUrl = `/api/micrometas/${mmId}`;
      } else if (id.startsWith("evt-meta-")) {
        const metaId = id.replace("evt-meta-", "");
        deleteUrl = `/api/metas/${metaId}`;
      }

      const res = await fetch(deleteUrl, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Fallo al eliminar de la base de datos.");

      // Reload dataset to update all tabs (including metas/micrometas/eventos cascade)
      const fetchRes = await fetch(`/api/data?userId=${activeUser.ID_Usuario}`);
      if (fetchRes.ok) {
        const data = await fetchRes.json();
        setIngresos(data.ingresos || []);
        setEgresos(data.egresos || []);
        setDeudas(data.deudas || []);
        setMetas(data.metas || []);
        setEventos(data.eventos || []);
        setMicrometas(data.micrometas || []);
      }

      setEditSuccess("Actividad eliminada con éxito.");
      setTimeout(() => {
        setEditSuccess("");
        setShowDayModal(false);
      }, 1000);
    } catch (err: any) {
      setEditError(err.message || "Error al eliminar.");
      setTimeout(() => setEditError(""), 3000);
    }
  };

  const handleDeleteEvent = (id: string) => {
    let concept = "";
    if (id.startsWith("evt-meta-")) {
      const metaId = id.replace("evt-meta-", "");
      concept = metas.find(m => m.ID_Meta === metaId)?.Meta_SMART || "Meta";
    } else if (id.startsWith("evt-micrometa-")) {
      const mmId = id.replace("evt-micrometa-", "");
      concept = micrometas.find(mm => mm.ID_Micrometa === mmId)?.Titulo || "Micrometa";
    } else {
      concept = eventos.find(ev => ev.ID_Actividad === id)?.Titulo_Actividad || eventos.find(ev => ev.ID_Actividad === id)?.Titulo || "Actividad";
    }

    setConfirmDialog({
      isOpen: true,
      title: "Confirmar Eliminación",
      message: `¿Estás seguro de que deseas eliminar permanentemente la actividad/meta "${concept}"? Esta acción no se puede deshacer y también la borrará de Google Calendar si está sincronizada.`,
      onConfirm: () => executeDeleteEvent(id)
    });
  };

  const handlePayEvent = async (ev: any) => {
    try {
      const isMicrometaEvent = ev.ID_Actividad.startsWith("evt-micrometa-");
      let url = "";
      let method = "PUT";
      let body: any = null;

      if (isMicrometaEvent) {
        const mmId = ev.ID_Actividad.replace("evt-micrometa-", "");
        // Extract original ID in case of recurrence postfixed with "-rec-X"
        const baseMmId = mmId.replace(/-rec-\d+$/, "");
        const targetMm = micrometas.find(m => m.ID_Micrometa === mmId || m.ID_Micrometa === baseMmId);
        if (!targetMm) {
          alert("No se encontró la micrometa asociada.");
          return;
        }
        url = `/api/micrometas/${targetMm.ID_Micrometa}`;
        body = {
          ...targetMm,
          Estado: "Completada"
        };
      } else {
        url = `/api/eventos/${ev.ID_Actividad}/pagar`;
      }

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });

      if (res.ok) {
        const fetchRes = await fetch(`/api/data?userId=${activeUser.ID_Usuario}`);
        if (fetchRes.ok) {
          const data = await fetchRes.json();
          setIngresos(data.ingresos || []);
          setEgresos(data.egresos || []);
          setDeudas(data.deudas || []);
          setMetas(data.metas || []);
          setEventos(data.eventos || []);
          setMicrometas(data.micrometas || []);
        }
        if (ev.Requiere_Pago) {
          alert("💵 Pago procesado exitosamente y descontado de la tarjeta.");
        } else {
          alert("🏁 Submeta marcada como completada exitosamente.");
        }
      } else {
        const err = await res.json();
        alert(`Error al procesar: ${err.error || "Ocurrió un error."}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error al procesar: ${err.message || err}`);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEventId) return;

    setEditError("");
    setEditSuccess("");

    try {
      const cleanTitle = (t: string) => {
        return t
          .replace(/^🎯\s*Meta:\s*/, "")
          .replace(/^🏁\s*Submeta:\s*/, "")
          .replace(/^🏁\s*Micrometa:\s*/, "")
          .replace(/^📌\s*Recordatorio:\s*/, "")
          .trim();
      };

      const cleanedTitle = cleanTitle(editTitulo);

      if (editingEventId.startsWith("evt-meta-")) {
        const metaId = editingEventId.replace("evt-meta-", "");
        const metaToEdit = metas.find(m => m.ID_Meta === metaId);
        if (!metaToEdit) throw new Error("Meta no encontrada.");

        const updatedPayload = {
          ...metaToEdit,
          Meta_SMART: cleanedTitle,
          Fecha_Meta: editFecha,
          Pilar: editPilar,
        };

        const res = await fetch(`/api/metas/${metaId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedPayload)
        });

        if (!res.ok) throw new Error("Fallo al guardar cambios de la meta en el servidor.");

      } else if (editingEventId.startsWith("evt-micrometa-")) {
        const mmId = editingEventId.replace("evt-micrometa-", "");
        const mmToEdit = micrometas.find(m => m.ID_Micrometa === mmId);
        if (!mmToEdit) throw new Error("Micrometa no encontrada.");

        const updatedPayload = {
          ...mmToEdit,
          Titulo: cleanedTitle,
          Fecha_Planificada: editFecha,
        };

        const res = await fetch(`/api/micrometas/${mmId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedPayload)
        });

        if (!res.ok) throw new Error("Fallo al guardar cambios de la micrometa en el servidor.");

      } else {
        const eventToEdit = eventos.find(ev => ev.ID_Actividad === editingEventId);
        if (!eventToEdit) throw new Error("Actividad no encontrada.");

        const editPilarObj = pilares.find(p => p.Nombre === editPilar);
        const updatedColor: string = editPilarObj?.Color
          ? (editPilarObj.Color.startsWith("#") ? editPilarObj.Color : "#3b82f6")
          : (eventToEdit.Color as string) || "#3b82f6";

        const dateOnly = editFecha || eventToEdit.Fecha;
        const startDateTime = `${dateOnly}T${editHoraInicio}`;
        const endDateTime = `${dateOnly}T${editHoraFin}`;

        const updatedPayload = {
          Titulo_Actividad: cleanedTitle,
          Titulo: cleanedTitle,
          Pilar: editPilar,
          Pilar_Asociado: editPilar,
          Descripcion_Detallada: editDesc,
          Descripcion: editDesc,
          Fecha_Hora_Inicio: startDateTime,
          Fecha_Hora_Fin: endDateTime,
          Color: updatedColor,
          Fecha: dateOnly
        };

        const googleEventId = eventToEdit.ID_Evento;
        const gToken = getValidGoogleToken();

        if (googleEventId && !googleEventId.startsWith("g-") && !googleEventId.startsWith("evt-") && !googleEventId.startsWith("mock-") && gToken && !gToken.startsWith("mock_google_token_")) {
          try {
            await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
              method: "PUT",
              headers: {
                "Authorization": `Bearer ${gToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                summary: cleanedTitle,
                description: editDesc,
                start: {
                  dateTime: `${dateOnly}T${editHoraInicio}:00-06:00`
                },
                end: {
                  dateTime: `${dateOnly}T${editHoraFin}:00-06:00`
                }
              })
            });
          } catch (syncErr) {
            console.error("Google Calendar update failed:", syncErr);
          }
        }

        const res = await fetch(`/api/eventos/${editingEventId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedPayload)
        });

        if (!res.ok) throw new Error("Fallo al guardar cambios en servidor.");
      }

      // Reload dataset to update all tabs
      const fetchRes = await fetch(`/api/data?userId=${activeUser.ID_Usuario}`);
      if (fetchRes.ok) {
        const data = await fetchRes.json();
        setIngresos(data.ingresos || []);
        setEgresos(data.egresos || []);
        setDeudas(data.deudas || []);
        setMetas(data.metas || []);
        setEventos(data.eventos || []);
        setMicrometas(data.micrometas || []);
      }

      setEditSuccess("¡Actualizado correctamente!");
      setTimeout(() => {
        setEditSuccess("");
        setEditingEventId(null);
      }, 1500);
    } catch (err: any) {
      setEditError(err.message || "Error al actualizar.");
    }
  };

  const handleSaveEgresoEdit = async () => {
    if (!editingEgreso) return;
    setEditEgresoError("");
    setEditEgresoSuccess("");

    try {
      const updatedPayload = {
        Concepto: editEgresoConcepto,
        Monto: parseFloat(editEgresoMonto) || 0,
        Recurrente: 1,
        Recurrencia: editEgresoRecurrencia
      };

      const res = await fetch(`/api/egresos/${editingEgreso.ID_Egreso}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload)
      });

      if (!res.ok) throw new Error("Fallo al guardar cambios del gasto en el servidor.");

      // Reload dataset to update all tabs
      const fetchRes = await fetch(`/api/data?userId=${activeUser.ID_Usuario}`);
      if (fetchRes.ok) {
        const data = await fetchRes.json();
        setIngresos(data.ingresos || []);
        setEgresos(data.egresos || []);
        setDeudas(data.deudas || []);
        setMetas(data.metas || []);
        setEventos(data.eventos || []);
        setMicrometas(data.micrometas || []);
      }

      setEditEgresoSuccess("¡Gasto actualizado correctamente!");
      setTimeout(() => {
        setEditEgresoSuccess("");
        setShowEditEgresoModal(false);
        setEditingEgreso(null);
      }, 1500);
    } catch (err: any) {
      setEditEgresoError(err.message || "Error al actualizar el gasto.");
    }
  };

  const periodicItems = useMemo(() => {
    const list: Array<{ id?: string; name: string; category: string; amount: number; period: string; color: string; detail: string; isFallback?: boolean }> = [];

    // Filter fixed recurring egresos
    egresos.forEach(e => {
      if (
        e.Recurrente === 1 ||
        e.Tipo_Gasto === "Fijo" || 
        e.Subcategoria.toLowerCase().includes("mensual") || 
        e.Concepto.toLowerCase().includes("renta") || 
        e.Concepto.toLowerCase().includes("suscrip") ||
        e.Concepto.toLowerCase().includes("plan")
      ) {
        const freqLabel = e.Recurrencia 
          ? (e.Recurrencia.charAt(0).toUpperCase() + e.Recurrencia.slice(1)) 
          : "Mensual";
        list.push({
          id: e.ID_Egreso,
          name: e.Concepto,
          category: e.Categoria_Pilar.replace("_", " "),
          amount: e.Monto,
          period: freqLabel,
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
          detail: `Corte: Día ${card.Fecha_Corte} | Pago Mínimo Obligatorio: $${card.Pago_Minimo}${currency ? ` ${currency}` : ""}`
        });
      }
    });

    return list;
  }, [egresos, deudas, currency]);

  const formatAmount = (val: number) => {
    const parts = (val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).split(".");
    return (
      <>
        <span>${parts[0]}</span>
        <span className="text-[0.75em] font-semibold opacity-85">.{parts[1]}</span>
      </>
    );
  };

  const todayMicrometasAlerts = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    return micrometas.filter(m => m.Fecha_Planificada === todayStr && m.Estado === "Pendiente");
  }, [micrometas]);

  return (
    <div className="space-y-8 animate-fadeIn font-sans">
      
      {/* Notification card hidden — alerts now shown via bell icon in mobile bottom nav */}
      
      {/* 1. Header & Quick KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className={`p-4 rounded-[1.75rem] border transition-all ${
          darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest">Ingresos</span>
            <span className="p-1.5 rounded-xl bg-teal-500/10 text-teal-500"><TrendingUp className="w-3.5 h-3.5" /></span>
          </div>
          <p className={`text-sm font-bold leading-none ${darkMode ? "text-white" : "text-stone-900"}`}>
            {formatAmount(totalIncomes)}
          </p>
          <p className="text-[9px] text-stone-400 mt-1.5">este período</p>
        </div>

        <div className={`p-4 rounded-[1.75rem] border transition-all ${
          darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest">Gastos</span>
            <span className="p-1.5 rounded-xl bg-rose-500/10 text-rose-500"><TrendingDown className="w-3.5 h-3.5" /></span>
          </div>
          <p className={`text-sm font-bold leading-none ${darkMode ? "text-white" : "text-stone-900"}`}>
            {formatAmount(totalExpenses)}
          </p>
          <p className="text-[9px] text-stone-400 mt-1.5">este período</p>
        </div>

        <div className={`p-4 rounded-[1.75rem] border transition-all ${
          darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest">Balance</span>
            <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500"><Coins className="w-3.5 h-3.5" /></span>
          </div>
          <p className={`text-sm font-bold leading-none ${netBalance >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            {formatAmount(netBalance)}
          </p>
          <p className="text-[9px] text-stone-400 mt-1.5">{netBalance >= 0 ? "disponible" : "déficit"}</p>
        </div>

        <div className={`p-4 rounded-[1.75rem] border transition-all ${
          darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest">Tarjetas</span>
            <span className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-500"><CreditCard className="w-3.5 h-3.5" /></span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 border-t pt-2 border-stone-150 dark:border-stone-800">
            <div>
              <span className="text-[8px] text-stone-500 block uppercase font-bold tracking-wider">Disponible</span>
              <span className="text-xs font-bold font-mono text-emerald-500">
                {formatAmount(totalDebitAvailable)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[8px] text-stone-500 block uppercase font-bold tracking-wider">Deudas</span>
              <span className="text-xs font-bold font-mono text-rose-500">
                {totalCreditDebt > 0 ? "-" : ""}{formatAmount(totalCreditDebt)}
              </span>
            </div>
          </div>
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
          {/* Tipo de Registro Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">¿Qué deseas registrar?</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRegistroTipo("recordatorio")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    registroTipo === "recordatorio"
                      ? "bg-teal-500 text-white border-teal-500 shadow-sm"
                      : darkMode
                        ? "bg-stone-900 border-stone-850 text-stone-300 hover:bg-stone-800"
                        : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100/50"
                  }`}
                >
                  📌 Recordatorio / Evento General
                </button>
                <button
                  type="button"
                  onClick={() => setRegistroTipo("micrometa")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    registroTipo === "micrometa"
                      ? "bg-teal-500 text-white border-teal-500 shadow-sm"
                      : darkMode
                        ? "bg-stone-900 border-stone-850 text-stone-300 hover:bg-stone-800"
                        : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100/50"
                  }`}
                >
                  🏁 Micrometa de una Meta
                </button>
              </div>
            </div>

            {registroTipo === "micrometa" && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Selecciona la Meta del Pilar</label>
                <select
                  required={registroTipo === "micrometa"}
                  value={selectedMetaId}
                  onChange={(e) => setSelectedMetaId(e.target.value)}
                  className="w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all bg-white border-stone-300 text-stone-900 dark:bg-stone-950 dark:border-stone-850 dark:text-white"
                >
                  <option value="">-- Seleccionar Meta Pilar --</option>
                  {metas.map(m => (
                    <option key={m.ID_Meta} value={m.ID_Meta}>
                      [{m.Pilar.replace(/user-.*$/, "").replace(/-$/, "")}] {m.Meta_SMART.substring(0, 60)}...
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Actividad Title */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                {registroTipo === "micrometa" ? "Título de Micrometa" : "Título de Actividad / Recordatorio"}
              </label>
              <input
                type="text"
                required
                placeholder={registroTipo === "micrometa" ? "Ej. Asistir a la primera consulta nutricional" : "Ej. Sesión de Mentoría Financiera"}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all bg-white border-stone-300 text-stone-900 dark:bg-stone-950 dark:border-stone-850 dark:text-white"
              />
            </div>

            {/* Fecha Selector (datetime-local) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Fecha y Hora Inicio</label>
              <input
                type="datetime-local"
                required
                value={dateTimeInputVal}
                onChange={(e) => handleDateTimeChange(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all bg-white border-stone-300 text-stone-900 dark:bg-stone-950 dark:border-stone-850 dark:text-white"
              />
            </div>

            {/* Pilar Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Pilar / Categoría</label>
              {registroTipo === "micrometa" && selectedMeta ? (
                <div className="w-full text-xs p-3 rounded-2xl border bg-stone-100/55 border-stone-250 dark:bg-stone-900 dark:border-stone-800 text-stone-500 dark:text-stone-400 font-semibold">
                  Auto: {pilar}
                </div>
              ) : (
                <select
                  value={pilar}
                  onChange={(e) => setPilar(e.target.value)}
                  className="w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all bg-white border-stone-300 text-stone-900 dark:bg-stone-950 dark:border-stone-850 dark:text-white"
                >
                  <option value="">-- Seleccionar Pilar --</option>
                  {pilares.map(p => (
                    <option key={p.ID_Pilar} value={p.Nombre}>
                      {p.Nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Descripción Detallada */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Descripción Detallada</label>
              <textarea
                placeholder="Ingresa los detalles o notas de esta actividad..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={2}
                className="w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all bg-white border-stone-300 text-stone-900 dark:bg-stone-950 dark:border-stone-850 dark:text-white"
              />
            </div>

            {/* Hora Fin */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Hora de Fin</label>
              <input
                type="time"
                required
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all bg-white border-stone-300 text-stone-900 dark:bg-stone-950 dark:border-stone-850 dark:text-white"
              />
            </div>

            {/* Cost? Checkbox */}
            <div className="flex items-center justify-between p-4.5 rounded-2xl border bg-white border-stone-300 dark:bg-stone-950 dark:border-stone-850 h-[46px] mb-0.5">
              <span className="text-[10px] uppercase font-bold text-stone-500">¿Implica costo?</span>
              <input
                type="checkbox"
                checked={requierePago}
                onChange={(e) => setRequierePago(e.target.checked)}
                className="w-4.5 h-4.5 cursor-pointer text-teal-650 rounded focus:ring-teal-500"
              />
            </div>
          </div>

          {/* If Payment Required, show these fields */}
          {requierePago && (
            <div className="space-y-4 p-5 rounded-3xl border bg-stone-50/50 border-stone-200 dark:bg-stone-950/20 dark:border-stone-850 animate-fadeIn">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Configuración Financiera y de Recurrencia</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Tarjeta / Cuenta</label>
                  <select
                    required={requierePago}
                    value={tarjetaId}
                    onChange={(e) => setTarjetaId(e.target.value)}
                    className="w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all bg-white border-stone-300 text-stone-900 dark:bg-stone-950 dark:border-stone-850 dark:text-white"
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Monto{currency ? ` (${currency})` : ""}</label>
                  <input
                    type="number"
                    required={requierePago}
                    placeholder="Monto"
                    value={gastoMonto}
                    onChange={(e) => setGastoMonto(e.target.value)}
                    className="w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all bg-white border-stone-300 text-stone-900 dark:bg-stone-950 dark:border-stone-850 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Tipo de Gasto</label>
                  <select
                    value={gastoTipo}
                    onChange={(e) => setGastoTipo(e.target.value as TipoGasto)}
                    className="w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all bg-white border-stone-300 text-stone-900 dark:bg-stone-950 dark:border-stone-850 dark:text-white"
                  >
                    <option value={TipoGasto.VARIABLE}>Variable</option>
                    <option value={TipoGasto.FIJO}>Fijo</option>
                    <option value={TipoGasto.HORMIGA}>Hormiga</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Estado del Gasto</label>
                  <select
                    value={gastoEstado}
                    onChange={(e) => setGastoEstado(e.target.value as any)}
                    className="w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all bg-white border-stone-300 text-stone-900 dark:bg-stone-950 dark:border-stone-850 dark:text-white"
                  >
                    <option value="Pagado">🟢 Pagado (Descontar ahora)</option>
                    <option value="Pendiente">🔴 Pendiente (Por pagar luego)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">¿Es un gasto recurrente?</label>
                  <select
                    value={recurrencia}
                    onChange={(e) => setRecurrencia(e.target.value as any)}
                    className="w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all bg-white border-stone-300 text-stone-900 dark:bg-stone-950 dark:border-stone-850 dark:text-white"
                  >
                    <option value="none">Única vez / No recurrente</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensual">Mensual</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>

                {recurrencia !== "none" && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Número de repeticiones a planificar</label>
                    <input
                      type="number"
                      min={2}
                      max={60}
                      value={repeticionesCount}
                      onChange={(e) => setRepeticionesCount(parseInt(e.target.value) || 12)}
                      className="w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all bg-white border-stone-300 text-stone-900 dark:bg-stone-950 dark:border-stone-850 dark:text-white"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="w-full pt-2">
            <button type="submit" className="w-full py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-650 text-white text-xs font-bold cursor-pointer transition-all shadow-md shadow-teal-500/10 flex items-center justify-center gap-1.5">
              <span>Registrar</span>
            </button>
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
                    if (dateEvents.length > 0) {
                      setShowDayModal(true); // Open activities floating modal if there are events
                    }
                  }
                }}
                className={`min-h-[40px] md:min-h-[110px] p-1 md:p-2.5 border flex flex-col justify-start transition-all cursor-pointer ${
                  !hasEvents ? "bg-transparent border-transparent cursor-default pointer-events-none"
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
                      <span className="w-4.5 h-4.5 md:w-5 md:h-5 rounded-full bg-teal-500 text-white flex items-center justify-center text-[9px] md:text-[10px] font-bold mx-auto md:mx-0">
                        {cDay.dayNum}
                      </span>
                    ) : (
                      <span className={`text-[9px] md:text-[10px] font-bold ${
                        cDay.dayNum === 1 ? (darkMode ? "text-stone-400" : "text-stone-600") : (darkMode ? "text-stone-500" : "text-stone-400")
                      }`}>
                        {cDay.dayNum === 1 ? (window.innerWidth < 768 ? "1" : `1 de ${monthNames[currentMonth].slice(0, 3).toLowerCase()}`) : cDay.dayNum}
                      </span>
                    )
                  )}
                </div>
                
                {/* Desktop View: Event list stacked vertically */}
                <div className="calendar-desktop-view space-y-1 overflow-hidden w-full flex-grow flex-col justify-start">
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

                {/* Mobile View: Row of colorful dots */}
                <div className="calendar-mobile-view flex-wrap gap-0.5 mt-1 justify-center w-full">
                  {dateEvents.slice(0, 4).map((e, index) => {
                    const dotColorClass = 
                      e.Color === "green" ? "bg-emerald-500"
                      : e.Color === "blue" || e.Color === "indigo" ? "bg-sky-400"
                      : e.Color === "orange" ? "bg-amber-500"
                      : e.Color === "purple" ? "bg-purple-400"
                      : "bg-rose-500";
                    return (
                      <span key={index} className={`w-1 h-1 rounded-full ${dotColorClass}`} />
                    );
                  })}
                  {dateEvents.length > 4 && (
                    <span className="text-[7px] font-extrabold text-stone-500 leading-none">
                      +
                    </span>
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
                    <span className={`text-base font-bold font-mono ${card.Saldo_Disponible > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                      {formatAmount(card.Saldo_Disponible)}
                    </span>
                  </div>

                  {isCredit && (
                    <>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-stone-500">Deuda actual:</span>
                        <span className="font-semibold text-rose-500">
                          {card.Deuda_Actual > 0 ? "-" : ""}{formatAmount(card.Deuda_Actual)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] items-baseline">
                        <span className="text-stone-500">Pago mínimo / No-Intereses:</span>
                        <span className="font-medium text-stone-400 text-[10px]">{formatAmount(card.Pago_Minimo)} / {formatAmount(card.Pago_Para_No_Generar_Intereses)}</span>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${darkMode ? "text-stone-300" : "text-stone-850"}`}>
            <Clock className="w-4 h-4 text-teal-500 animate-pulse" />
            <span>Gastos y Adquisiciones Periódicos</span>
          </h3>
          {periodicItems.some(item => item.isFallback) && (
            <span className="text-[10px] text-amber-500 dark:text-amber-400 font-semibold bg-amber-500/10 dark:bg-amber-500/5 px-2 py-0.5 rounded-lg border border-amber-500/20">
              ⚠️ Ejemplos de muestra (se quitarán al registrar gastos Fijos en "Mis Datos" o Tarjetas)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[350px] overflow-y-auto pr-1">
          {periodicItems.length === 0 ? (
            <div className={`col-span-full p-8 border border-dashed rounded-3xl text-center text-xs text-stone-500 italic ${
              darkMode ? "bg-stone-950/20 border-stone-850" : "bg-stone-50/50 border-stone-200"
            }`}>
              No hay gastos o adquisiciones periódicas registradas.
            </div>
          ) : (
            periodicItems.map((item, idx) => (
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
                    {formatAmount(item.amount)}{currency ? ` ${currency}` : ""}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1">{item.detail}</p>
                {item.id && (
                  <div className="flex gap-2 justify-end border-t pt-2 mt-2 border-stone-200 dark:border-stone-850">
                    <button
                      onClick={() => {
                        const originalEgreso = egresos.find(e => e.ID_Egreso === item.id);
                        if (originalEgreso) {
                          setEditingEgreso(originalEgreso);
                          setEditEgresoConcepto(originalEgreso.Concepto);
                          setEditEgresoMonto(originalEgreso.Monto.toString());
                          setEditEgresoRecurrencia(originalEgreso.Recurrencia || "mensual");
                          setShowEditEgresoModal(true);
                        }
                      }}
                      className="text-[10px] text-teal-500 hover:text-teal-400 font-bold uppercase tracking-wide cursor-pointer transition-all flex items-center gap-1"
                    >
                      ✏️ Editar Gasto
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
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
                              {/* Pilar badge — uses the real hex color from pilares list */}
                              {(() => {
                                const evPilarObj = pilares.find(p => p.Nombre === ev.Pilar);
                                const hexColor = evPilarObj?.Color && evPilarObj.Color.startsWith("#")
                                  ? evPilarObj.Color
                                  : ev.Color && (ev.Color as string).startsWith("#")
                                    ? (ev.Color as string)
                                    : null;
                                return (
                                  <span
                                    className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                                    style={hexColor ? {
                                      backgroundColor: hexColor + "22",
                                      color: hexColor,
                                      border: `1px solid ${hexColor}44`
                                    } : {
                                      backgroundColor: "rgba(99,102,241,0.1)",
                                      color: "#818cf8"
                                    }}
                                  >
                                    {ev.Pilar}
                                  </span>
                                );
                              })()}
                              {ev.Requiere_Pago && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-rose-500 font-mono flex items-center">
                                    -{formatAmount(ev.Monto || ev.Monto_Gasto || 0)}{currency ? ` ${currency}` : ""}
                                  </span>
                                  {(ev.ID_Egreso_Asociado || ev.Gasto_Pendiente === false || ev.Gasto_Pendiente === 0) ? (
                                    <span className="text-[8px] font-bold uppercase tracking-wide bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
                                      🟢 Pagado
                                    </span>
                                  ) : (
                                    <span className="text-[8px] font-bold uppercase tracking-wide bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded">
                                      🔴 Pendiente
                                    </span>
                                  )}
                                </div>
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
                          <div className="flex gap-2 justify-end border-t pt-2 border-stone-200 dark:border-stone-850">
                            {ev.Requiere_Pago && !ev.ID_Egreso_Asociado && (ev.Gasto_Pendiente === true || ev.Gasto_Pendiente === 1 || ev.Gasto_Pendiente === undefined) && (
                              <button
                                onClick={() => handlePayEvent(ev)}
                                className="py-1 px-3 rounded-lg text-[10px] font-bold border border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500 hover:text-white text-emerald-450 cursor-pointer transition-all mr-auto"
                              >
                                💵 Pagar Gasto Pendiente
                              </button>
                            )}
                            {ev.ID_Actividad.startsWith("evt-micrometa-") && ev.Estado === "Pendiente" && !ev.Requiere_Pago && (
                              <button
                                onClick={() => handlePayEvent(ev)}
                                className="py-1 px-3 rounded-lg text-[10px] font-bold border border-teal-500/25 bg-teal-500/5 hover:bg-teal-500 hover:text-white text-teal-400 cursor-pointer transition-all mr-auto"
                              >
                                ✓ Completar Submeta
                              </button>
                            )}
                            {!isGoogleEvent && (
                              <button
                                onClick={() => {
                                  setEditingEventId(ev.ID_Actividad);
                                  setEditTitulo(ev.Titulo_Actividad || ev.Titulo || "");
                                  setEditPilar(ev.Pilar || "");
                                  setEditDesc(ev.Descripcion_Detallada || ev.Descripcion || "");
                                  setEditHoraInicio(ev.Fecha_Hora_Inicio ? ev.Fecha_Hora_Inicio.slice(11, 16) : "10:00");
                                  setEditHoraFin(ev.Fecha_Hora_Fin ? ev.Fecha_Hora_Fin.slice(11, 16) : "11:00");
                                  setEditFecha(ev.Fecha || (ev.Fecha_Hora_Inicio ? ev.Fecha_Hora_Inicio.slice(0, 10) : ""));
                                }}
                                className="py-1 px-3 rounded-lg text-[10px] font-bold border border-teal-500/25 bg-teal-500/5 hover:bg-teal-500 hover:text-white text-teal-400 cursor-pointer transition-all"
                              >
                                Editar
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteEvent(ev.ID_Actividad)}
                              className="py-1 px-3 rounded-lg text-[10px] font-bold border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500 hover:text-white text-rose-455 cursor-pointer transition-all"
                            >
                              Eliminar
                            </button>
                          </div>
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
                      className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-800 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-stone-500">Fecha del Evento</label>
                    <input 
                      type="date" 
                      required
                      value={editFecha}
                      onChange={(e) => setEditFecha(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-800 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-stone-500">Pilar</label>
                    <select
                      value={editPilar}
                      onChange={(e) => setEditPilar(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-800 dark:text-white"
                    >
                      <option value="">-- Seleccionar Pilar --</option>
                      {pilares.map(p => (
                        <option key={p.ID_Pilar} value={p.Nombre}>
                          {p.Nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-stone-500">Hora Inicio</label>
                      <input 
                        type="time" 
                        value={editHoraInicio}
                        onChange={(e) => setEditHoraInicio(e.target.value)}
                        className="w-full text-xs p-2 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-800 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-stone-500">Hora Fin</label>
                      <input 
                        type="time" 
                        value={editHoraFin}
                        onChange={(e) => setEditHoraFin(e.target.value)}
                        className="w-full text-xs p-2 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-stone-500">Descripción</label>
                    <textarea
                      rows={2}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-800 dark:text-white"
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

      {/* 7. FLOATING MODAL OVERLAY (Editar Gasto Periódico) */}
      {showEditEgresoModal && editingEgreso && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-md rounded-[2.5rem] border shadow-2xl p-6 relative transition-all ${
            darkMode ? "bg-[#18181b] border-stone-800 text-white" : "bg-white border-stone-200 text-stone-900"
          }`}>
            
            {/* Close button */}
            <button 
              onClick={() => {
                setShowEditEgresoModal(false);
                setEditingEgreso(null);
                setEditEgresoError("");
                setEditEgresoSuccess("");
              }}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-500/10 cursor-pointer text-stone-400 font-semibold"
            >
              ✕
            </button>

            <div className="space-y-4">
              <div className="border-b pb-2 border-stone-250 dark:border-stone-800">
                <h3 className="text-sm font-bold uppercase tracking-wider text-teal-500">
                  Editar Gasto Periódico
                </h3>
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Actualiza el concepto, monto y frecuencia de este egreso recurrente.
                </p>
              </div>

              {editEgresoSuccess && <div className="p-2.5 text-xs rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">{editEgresoSuccess}</div>}
              {editEgresoError && <div className="p-2.5 text-xs rounded-xl bg-rose-500/10 text-rose-450 border border-rose-500/20">{editEgresoError}</div>}

              <div className="space-y-3">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] uppercase font-bold text-stone-500 block">Concepto</label>
                  <input
                    type="text"
                    value={editEgresoConcepto}
                    onChange={(e) => setEditEgresoConcepto(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white"
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[10px] uppercase font-bold text-stone-500 block">Monto</label>
                  <input
                    type="number"
                    value={editEgresoMonto}
                    onChange={(e) => setEditEgresoMonto(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white"
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[10px] uppercase font-bold text-stone-500 block">Frecuencia</label>
                  <select
                    value={editEgresoRecurrencia}
                    onChange={(e) => setEditEgresoRecurrencia(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white"
                  >
                    <option value="diaria">Diaria</option>
                    <option value="semanal">Semanal</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="mensual">Mensual</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t pt-3 border-stone-200 dark:border-stone-850">
                <button
                  onClick={handleSaveEgresoEdit}
                  className="py-2 px-4 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white cursor-pointer transition-all shadow-md"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog Component */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm" onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}></div>
          <div className={`relative p-6 rounded-[2rem] border max-w-md w-full shadow-2xl transition-all scale-100 ${
            darkMode ? "bg-stone-900 border-stone-850 text-white" : "bg-white border-stone-200 text-stone-900"
          }`}>
            <h3 className="text-sm font-bold uppercase tracking-wider text-rose-500 mb-2">{confirmDialog.title}</h3>
            <p className="text-xs text-stone-500 mb-6 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3 text-xs">
              <button
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className={`px-4 py-2 rounded-xl border font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer ${
                  darkMode ? "border-stone-800 text-stone-300" : "border-stone-250 text-stone-700"
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                  confirmDialog.onConfirm();
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md transition-all cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
