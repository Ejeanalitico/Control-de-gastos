import React, { useState, useMemo, useEffect } from "react";
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
  EstadoMeta,
  Usuario,
  Pilar,
  Prestamo
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
  FileSpreadsheet,
  X
} from "lucide-react";

interface SheetsSimulatorTabProps {
  darkMode: boolean;
  activeUser: Usuario | null;
  ingresos: Ingreso[];
  egresos: Egreso[];
  deudas: Deuda[]; // cards (debit and credit)
  metas: MetaPilar[];
  eventos: AgendaEvento[]; // activities
  prestamos: Prestamo[];
  setIngresos: React.Dispatch<React.SetStateAction<Ingreso[]>>;
  setEgresos: React.Dispatch<React.SetStateAction<Egreso[]>>;
  setDeudas: React.Dispatch<React.SetStateAction<Deuda[]>>;
  setMetas: React.Dispatch<React.SetStateAction<MetaPilar[]>>;
  setEventos: React.Dispatch<React.SetStateAction<AgendaEvento[]>>;
  setPrestamos: React.Dispatch<React.SetStateAction<Prestamo[]>>;
  resetToInitial: () => void;
  pilares: Pilar[];
}

export default function SheetsSimulatorTab({
  darkMode,
  activeUser,
  ingresos,
  egresos,
  deudas,
  metas,
  eventos,
  prestamos,
  setIngresos,
  setEgresos,
  setDeudas,
  setMetas,
  setEventos,
  setPrestamos,
  resetToInitial,
  pilares
}: SheetsSimulatorTabProps) {
  const [activeSheet, setActiveSheet] = useState<"B" | "C" | "D" | "E" | "P">("B");
  const [showAddForm, setShowAddForm] = useState(false);

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

  // Filter States for Activities (Tab E)
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("all");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("all");
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string>("all");
  const [selectedPillarFilter, setSelectedPillarFilter] = useState<string>("all");

  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  // Clear selections when active sheet or filters change
  useEffect(() => {
    setSelectedEventIds([]);
  }, [activeSheet, selectedYearFilter, selectedMonthFilter, selectedWeekFilter, selectedPillarFilter]);

  // Dynamic date helpers for form initialization
  const todayStr = new Date().toLocaleDateString("sv-SE");
  const todayTimeStart = todayStr + "T10:00";
  const todayTimeEnd = todayStr + "T11:00";

  // Form States
  const [ingresoForm, setIngresoForm] = useState({
    Fecha: todayStr,
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
    Tasa_Interes_Anual: "45",
    Pilar: ""
  });

  const [egresoForm, setEgresoForm] = useState({
    Fecha: todayStr,
    Concepto: "",
    Categoria_Pilar: "",
    Subcategoria: "",
    Monto: "",
    Metodo_Pago: "",
    Tipo_Gasto: TipoGasto.VARIABLE,
    Recurrente: false,
    Recurrencia: "mensual"
  });

  const [prestamoForm, setPrestamoForm] = useState({
    Monto_Prestado: "",
    Monto_A_Pagar: "",
    Fecha_Inicio: todayStr,
    Fecha_Limite: todayStr
  });

  const [eventoForm, setEventoForm] = useState({
    Titulo_Actividad: "",
    Tipo_Agenda: "Agenda_Personal" as any,
    Pilar: "",
    Descripcion_Detallada: "",
    Fecha_Hora_Inicio: todayTimeStart,
    Fecha_Hora_Fin: todayTimeEnd,
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
      ID_Usuario: activeUser.ID_Usuario,
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
          Fecha: todayStr,
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
      ID_Usuario: activeUser.ID_Usuario,
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
      Pilar: deudaForm.Pilar || (pilares.length > 0 ? pilares[0].Nombre : "Económico"),
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
          Tasa_Interes_Anual: "45",
          Pilar: pilares.length > 0 ? pilares[0].Nombre : ""
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
      ID_Usuario: activeUser.ID_Usuario,
      ID_Egreso: generateUuid("egr"),
      ID_Actividad_Origen: null,
      ID_Tarjeta_Utilizada: "card-direct-sheets-entry",
      Fecha: egresoForm.Fecha,
      Concepto: egresoForm.Concepto,
      Categoria_Pilar: egresoForm.Categoria_Pilar || (pilares.length > 0 ? pilares[0].Nombre : "Personal"),
      Subcategoria: egresoForm.Subcategoria || "Unassigned",
      Monto: parseFloat(egresoForm.Monto),
      Metodo_Pago: egresoForm.Metodo_Pago || "Hojas Directas",
      Tipo_Gasto: egresoForm.Tipo_Gasto,
      Recurrente: egresoForm.Recurrente ? 1 : 0,
      Recurrencia: egresoForm.Recurrente ? egresoForm.Recurrencia : undefined
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
          Fecha: todayStr,
          Concepto: "",
          Categoria_Pilar: pilares.length > 0 ? pilares[0].Nombre : "",
          Subcategoria: "",
          Monto: "",
          Metodo_Pago: "",
          Tipo_Gasto: TipoGasto.VARIABLE,
          Recurrente: false,
          Recurrencia: "mensual"
        });
        setShowAddForm(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPrestamo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prestamoForm.Monto_Prestado || !prestamoForm.Monto_A_Pagar) return;

    const parseMontoPrestado = parseFloat(prestamoForm.Monto_Prestado) || 0;
    const parseMontoAPagar = parseFloat(prestamoForm.Monto_A_Pagar) || 0;

    const newRecord: Prestamo = {
      ID_Usuario: activeUser.ID_Usuario,
      ID_Prestamo: generateUuid("loan"),
      Monto_Prestado: parseMontoPrestado,
      Monto_A_Pagar: parseMontoAPagar,
      Fecha_Inicio: prestamoForm.Fecha_Inicio,
      Fecha_Limite: prestamoForm.Fecha_Limite
    };

    try {
      const res = await fetch("/api/prestamos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord)
      });
      if (res.ok) {
        setPrestamos((prev) => [newRecord, ...prev]);
        setPrestamoForm({
          Monto_Prestado: "",
          Monto_A_Pagar: "",
          Fecha_Inicio: todayStr,
          Fecha_Limite: todayStr
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
      ID_Usuario: activeUser.ID_Usuario,
      ID_Evento: uuidAct,
      ID_Actividad: uuidAct,
      Tipo_Agenda: eventoForm.Tipo_Agenda,
      Pilar: eventoForm.Pilar || (pilares.length > 0 ? pilares[0].Nombre : "Personal"),
      Pilar_Asociado: eventoForm.Pilar || (pilares.length > 0 ? pilares[0].Nombre : "Personal"),
      Titulo_Actividad: eventoForm.Titulo_Actividad,
      Titulo: eventoForm.Titulo_Actividad,
      Descripcion_Detallada: eventoForm.Descripcion_Detallada || "Registrado en Hoja de cálculo",
      Descripcion: eventoForm.Descripcion_Detallada || "Registrado en Hoja de cálculo",
      Fecha_Hora_Inicio: eventoForm.Fecha_Hora_Inicio,
      Fecha_Hora_Fin: eventoForm.Fecha_Hora_Fin,
      Requiere_Pago: eventoForm.Requiere_Pago,
      ID_Egreso_Asociado: null,
      Fecha: eventoForm.Fecha_Hora_Inicio.split("T")[0],
      Tipo_Evento: eventoForm.Pilar || (pilares.length > 0 ? pilares[0].Nombre : "Personal"),
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
          Pilar: pilares.length > 0 ? pilares[0].Nombre : "",
          Descripcion_Detallada: "",
          Fecha_Hora_Inicio: todayTimeStart,
          Fecha_Hora_Fin: todayTimeEnd,
          Requiere_Pago: false
        });
        setShowAddForm(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getValidGoogleToken = () => {
    if (!activeUser) return null;
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

  const executeDeleteItem = async (type: "ingresos" | "egresos" | "deudas" | "eventos" | "prestamos", id: string) => {
    try {
      if (type === "eventos") {
        const eventToDelete = eventos.find(ev => ev.ID_Actividad === id);
        const googleEventId = eventToDelete?.ID_Evento;
        const gToken = getValidGoogleToken();

        if (googleEventId && 
            !googleEventId.startsWith("act-") && 
            !googleEventId.startsWith("g-") && 
            !googleEventId.startsWith("evt-") && 
            !googleEventId.startsWith("mock-") && 
            !googleEventId.startsWith("imported-") && 
            gToken && 
            !gToken.startsWith("mock_google_token_")) {
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
            console.error("Google Calendar delete failed for single event:", syncErr);
          }
        }

        // Add to local storage blocklist to prevent sync loop re-import
        if (googleEventId && activeUser) {
          const deletedKey = `pilar5_deleted_gcal_${activeUser.ID_Usuario}`;
          const deletedList = JSON.parse(localStorage.getItem(deletedKey) || "[]");
          if (!deletedList.includes(googleEventId)) {
            deletedList.push(googleEventId);
            localStorage.setItem(deletedKey, JSON.stringify(deletedList));
          }
        }
      }

      const res = await fetch(`/api/${type}/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (type === "ingresos") setIngresos(prev => prev.filter(i => i.ID_Ingreso !== id));
        if (type === "egresos") setEgresos(prev => prev.filter(e => e.ID_Egreso !== id));
        if (type === "deudas") setDeudas(prev => prev.filter(d => d.ID_Instrumento !== id));
        if (type === "eventos") setEventos(prev => prev.filter(ev => ev.ID_Actividad !== id));
        if (type === "prestamos") setPrestamos(prev => prev.filter(p => p.ID_Prestamo !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = (type: "ingresos" | "egresos" | "deudas" | "eventos" | "prestamos", id: string) => {
    const itemConcept = type === "ingresos" ? ingresos.find(i => i.ID_Ingreso === id)?.Concepto
      : type === "egresos" ? egresos.find(e => e.ID_Egreso === id)?.Concepto
      : type === "deudas" ? deudas.find(d => d.ID_Instrumento === id)?.Nombre_Tarjeta
      : type === "prestamos" ? `Préstamo de $${prestamos.find(p => p.ID_Prestamo === id)?.Monto_Prestado}`
      : eventos.find(ev => ev.ID_Actividad === id)?.Titulo_Actividad || eventos.find(ev => ev.ID_Actividad === id)?.Titulo;
      
    const typeLabel = type === "ingresos" ? "ingreso"
      : type === "egresos" ? "gasto"
      : type === "deudas" ? "cuenta/tarjeta"
      : type === "prestamos" ? "préstamo"
      : "actividad";

    setConfirmDialog({
      isOpen: true,
      title: "Confirmar Eliminación",
      message: `¿Estás seguro de que deseas eliminar permanentemente este ${typeLabel} "${itemConcept || ''}"? Esta acción no se puede deshacer.`,
      onConfirm: () => executeDeleteItem(type, id)
    });
  };

  const executeDeleteSelected = async () => {
    try {
      const gToken = getValidGoogleToken();

      // Delete from Google Calendar first if connected
      for (const id of selectedEventIds) {
        const item = eventos.find(ev => ev.ID_Actividad === id);
        if (!item) continue;
        const googleEventId = item.ID_Evento;
        if (googleEventId && 
            !googleEventId.startsWith("act-") && 
            !googleEventId.startsWith("g-") && 
            !googleEventId.startsWith("evt-") && 
            !googleEventId.startsWith("mock-") && 
            !googleEventId.startsWith("imported-") && 
            gToken && 
            !gToken.startsWith("mock_google_token_")) {
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
            console.error(`Fallo al eliminar de Google Calendar para evento ${googleEventId}:`, syncErr);
          }
        }

        // Add to local storage blocklist to prevent sync loop re-import
        if (googleEventId && activeUser) {
          const deletedKey = `pilar5_deleted_gcal_${activeUser.ID_Usuario}`;
          const deletedList = JSON.parse(localStorage.getItem(deletedKey) || "[]");
          if (!deletedList.includes(googleEventId)) {
            deletedList.push(googleEventId);
            localStorage.setItem(deletedKey, JSON.stringify(deletedList));
          }
        }
      }

      // Bulk delete in SQLite database
      const res = await fetch("/api/eventos/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedEventIds })
      });

      if (res.ok) {
        setEventos(prev => prev.filter(ev => !selectedEventIds.includes(ev.ID_Actividad)));
        setSelectedEventIds([]);
      } else {
        throw new Error("Fallo al eliminar en el servidor.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al realizar la eliminación de los elementos seleccionados.");
    }
  };

  const handleDeleteSelected = () => {
    if (selectedEventIds.length === 0) return;
    const confirmMsg = `¿Seguro que deseas eliminar permanentemente las ${selectedEventIds.length} actividades seleccionadas? Esta acción no se puede deshacer y también las eliminará de Google Calendar si están sincronizadas.`;
    
    setConfirmDialog({
      isOpen: true,
      title: "Eliminación Masiva de Actividades",
      message: confirmMsg,
      onConfirm: executeDeleteSelected
    });
  };  // --- FILTERING & GROUPING LOGIC FOR ACTIVITIES (TAB E) ---

  const isDateInCurrentWeek = (dateStr: string) => {
    const today = new Date();
    // Start of week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const itemDate = new Date(dateStr + "T00:00:00");
    return itemDate >= startOfWeek && itemDate <= endOfWeek;
  };

  // Get list of unique years in events for filtering
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    eventos.forEach(ev => {
      if (ev.Fecha) {
        const y = ev.Fecha.split("-")[0];
        if (y) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [eventos]);

  // Filter activities based on Year, Month, Week and Pillar states
  const filteredEventos = useMemo(() => {
    return eventos.filter(item => {
      // 1. Pillar Filter
      if (selectedPillarFilter !== "all" && item.Pilar !== selectedPillarFilter) {
        return false;
      }
      
      // Get Date
      const dateParts = item.Fecha ? item.Fecha.split("-") : [];
      if (dateParts.length < 3) return true; // Keep malformed/unassigned items
      
      const year = dateParts[0];
      const monthIndex = parseInt(dateParts[1]) - 1; // 0-11
      const day = parseInt(dateParts[2]);

      // 2. Year Filter
      if (selectedYearFilter !== "all" && year !== selectedYearFilter) {
        return false;
      }

      // 3. Month Filter
      if (selectedMonthFilter !== "all" && monthIndex.toString() !== selectedMonthFilter) {
        return false;
      }

      // 4. Week Filter
      if (selectedWeekFilter !== "all") {
        if (selectedWeekFilter === "current") {
          if (!isDateInCurrentWeek(item.Fecha)) {
            return false;
          }
        } else {
          // "w1" -> day 1-7, "w2" -> day 8-14, "w3" -> day 15-21, "w4" -> day 22-28, "w5" -> day 29+
          if (selectedWeekFilter === "w1" && (day < 1 || day > 7)) return false;
          if (selectedWeekFilter === "w2" && (day < 8 || day > 14)) return false;
          if (selectedWeekFilter === "w3" && (day < 15 || day > 21)) return false;
          if (selectedWeekFilter === "w4" && (day < 22 || day > 28)) return false;
          if (selectedWeekFilter === "w5" && day < 29) return false;
        }
      }

      return true;
    });
  }, [eventos, selectedPillarFilter, selectedYearFilter, selectedMonthFilter, selectedWeekFilter]);

  // Group activities by month/year and then by week index
  const groupedEventos = useMemo(() => {
    // Structure: Record<MonthKey, Record<WeekKey, AgendaEvento[]>>
    const groups: Record<string, Record<string, AgendaEvento[]>> = {};

    // Sort events descending (newest first)
    const sorted = [...filteredEventos].sort((a, b) => {
      return new Date(b.Fecha_Hora_Inicio).getTime() - new Date(a.Fecha_Hora_Inicio).getTime();
    });

    sorted.forEach(ev => {
      let monthKey = "Sin Fecha";
      let weekKey = "no-week";

      const dateParts = ev.Fecha ? ev.Fecha.split("-") : [];
      if (dateParts.length >= 2) {
        const year = dateParts[0];
        monthKey = `${year}-${dateParts[1]}`;
        
        if (dateParts.length >= 3) {
          const day = parseInt(dateParts[2]);
          if (day >= 1 && day <= 7) weekKey = "w1";
          else if (day >= 8 && day <= 14) weekKey = "w2";
          else if (day >= 15 && day <= 21) weekKey = "w3";
          else if (day >= 22 && day <= 28) weekKey = "w4";
          else weekKey = "w5";
        }
      }

      if (!groups[monthKey]) {
        groups[monthKey] = {
          w1: [],
          w2: [],
          w3: [],
          w4: [],
          w5: [],
          "no-week": []
        };
      }
      groups[monthKey][weekKey].push(ev);
    });

    return groups;
  }, [filteredEventos]);

  // Sorted list of month keys (descending chronological order)
  const sortedGroupKeys = useMemo(() => {
    return Object.keys(groupedEventos).sort((a, b) => {
      if (a === "Sin Fecha") return 1;
      if (b === "Sin Fecha") return -1;
      return b.localeCompare(a);
    });
  }, [groupedEventos]);

  const getGroupHeaderLabel = (key: string) => {
    if (key === "Sin Fecha") return "Sin Fecha Específica";
    const parts = key.split("-");
    const year = parts[0];
    const monthIdx = parseInt(parts[1]) - 1;
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return `${monthNames[monthIdx]} ${year}`;
  };

  const getMonthEvents = (monthKey: string): AgendaEvento[] => {
    const monthWeeks = groupedEventos[monthKey] || {};
    return Object.values(monthWeeks).flat() as AgendaEvento[];
  };

  const isMonthSelected = (monthKey: string) => {
    const monthEvents = getMonthEvents(monthKey);
    return monthEvents.length > 0 && monthEvents.every(ev => selectedEventIds.includes(ev.ID_Actividad));
  };

  const handleToggleSelectMonth = (monthKey: string) => {
    const monthEvents = getMonthEvents(monthKey);
    const monthIds = monthEvents.map(ev => ev.ID_Actividad);
    if (isMonthSelected(monthKey)) {
      setSelectedEventIds(prev => prev.filter(id => !monthIds.includes(id)));
    } else {
      setSelectedEventIds(prev => {
        const newSelection = [...prev];
        monthIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  const isWeekSelected = (monthKey: string, weekKey: string) => {
    const weekEvents = groupedEventos[monthKey]?.[weekKey] || [];
    return weekEvents.length > 0 && weekEvents.every(ev => selectedEventIds.includes(ev.ID_Actividad));
  };

  const handleToggleSelectWeek = (monthKey: string, weekKey: string) => {
    const weekEvents = groupedEventos[monthKey]?.[weekKey] || [];
    const weekIds = weekEvents.map(ev => ev.ID_Actividad);
    if (isWeekSelected(monthKey, weekKey)) {
      setSelectedEventIds(prev => prev.filter(id => !weekIds.includes(id)));
    } else {
      setSelectedEventIds(prev => {
        const newSelection = [...prev];
        weekIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  const getWeekLabel = (weekKey: string) => {
    if (weekKey === "w1") return "Semana 1 (Días 1-7)";
    if (weekKey === "w2") return "Semana 2 (Días 8-14)";
    if (weekKey === "w3") return "Semana 3 (Días 15-21)";
    if (weekKey === "w4") return "Semana 4 (Días 22-28)";
    if (weekKey === "w5") return "Semana 5 (Días 29+)";
    return "Sin Semana Específica";
  };

  const isAllSelected = useMemo(() => {
    return filteredEventos.length > 0 && filteredEventos.every(ev => selectedEventIds.includes(ev.ID_Actividad));
  }, [filteredEventos, selectedEventIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = filteredEventos.map(ev => ev.ID_Actividad);
      setSelectedEventIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      const filteredIds = filteredEventos.map(ev => ev.ID_Actividad);
      setSelectedEventIds(prev => {
        const newSelection = [...prev];
        filteredIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  const handleToggleSelectEvent = (id: string) => {
    setSelectedEventIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
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

        <button
          id="sheet-tab-p"
          onClick={() => { setActiveSheet("P"); setShowAddForm(false); }}
          className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSheet === "P" 
              ? "bg-purple-500/10 border-purple-500/30 text-purple-500 font-bold" 
              : darkMode ? "bg-stone-900/20 border-stone-900 text-stone-400 hover:text-stone-300" : "bg-white border-stone-150 text-stone-600 hover:bg-stone-50"
          }`}
        >
          <Coins className="w-3.5 h-3.5 text-purple-500" />
          <span>Préstamos ({prestamos.length})</span>
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
                  <input type="date" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={ingresoForm.Fecha} onChange={(e)=>setIngresoForm({...ingresoForm, Fecha: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Concepto</label>
                  <input type="text" placeholder="ej. Asesoría Frontend" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={ingresoForm.Concepto} onChange={(e)=>setIngresoForm({...ingresoForm, Concepto: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Monto Neto</label>
                  <input type="number" placeholder="0.00" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={ingresoForm.Monto_Neto} onChange={(e)=>setIngresoForm({...ingresoForm, Monto_Neto: e.target.value})} />
                </div>
                <button type="submit" className="py-2.5 px-4 font-bold rounded-xl bg-teal-500 hover:bg-teal-650 text-white text-xs cursor-pointer transition-all shadow-md">Registrar</button>
              </form>
            )}

            {activeSheet === "C" && (
              <form onSubmit={handleAddDeuda} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-stone-500">Nombre de la Cuenta</label>
                    <input type="text" required placeholder="ej. Tarjeta Citi" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={deudaForm.Nombre_Tarjeta} onChange={(e)=>setDeudaForm({...deudaForm, Nombre_Tarjeta: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-stone-500">Tipo de Cuenta</label>
                    <select className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={deudaForm.Tipo} onChange={(e)=>setDeudaForm({...deudaForm, Tipo: e.target.value as any})}>
                      <option value={TipoTarjeta.CREDITO}>Crédito</option>
                      <option value={TipoTarjeta.DEBITO}>Débito</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-stone-500">Línea de Crédito</label>
                    <input type="number" placeholder="0.00" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={deudaForm.Limite_Credito} onChange={(e)=>setDeudaForm({...deudaForm, Limite_Credito: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-stone-500">Saldo Disponible</label>
                    <input type="number" placeholder="0.00" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={deudaForm.Saldo_Disponible} onChange={(e)=>setDeudaForm({...deudaForm, Saldo_Disponible: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-stone-500">Deuda Actual</label>
                    <input type="number" placeholder="0.00" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={deudaForm.Deuda_Actual} onChange={(e)=>setDeudaForm({...deudaForm, Deuda_Actual: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-stone-500">Pago Mínimo</label>
                    <input type="number" placeholder="0.00" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={deudaForm.Pago_Minimo} onChange={(e)=>setDeudaForm({...deudaForm, Pago_Minimo: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-stone-500">Pago No Generar Intereses</label>
                    <input type="number" placeholder="0.00" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={deudaForm.Pago_Para_No_Generar_Intereses} onChange={(e)=>setDeudaForm({...deudaForm, Pago_Para_No_Generar_Intereses: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-stone-500">Tasa Interés Anual (%)</label>
                    <input type="number" placeholder="ej. 42" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={deudaForm.Tasa_Interes_Anual} onChange={(e)=>setDeudaForm({...deudaForm, Tasa_Interes_Anual: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-stone-500">Día de Corte (1-31)</label>
                    <input type="number" placeholder="15" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={deudaForm.Fecha_Corte} onChange={(e)=>setDeudaForm({...deudaForm, Fecha_Corte: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-stone-500">Día Límite de Pago (1-31)</label>
                    <input type="number" placeholder="5" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={deudaForm.Fecha_Limite_Pago} onChange={(e)=>setDeudaForm({...deudaForm, Fecha_Limite_Pago: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-stone-500">Pilar Asociado</label>
                    <select className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={deudaForm.Pilar || (pilares.length > 0 ? pilares[0].Nombre : "")} onChange={(e)=>setDeudaForm({...deudaForm, Pilar: e.target.value})}>
                      {pilares.map(p => (
                        <option key={p.ID_Pilar} value={p.Nombre}>{p.Nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" className="w-full py-2.5 px-4 font-bold rounded-xl bg-teal-500 hover:bg-teal-650 text-white text-xs cursor-pointer transition-all shadow-md">Registrar</button>
              </form>
            )}

            {activeSheet === "D" && (
              <form onSubmit={handleAddEgreso} className={`grid grid-cols-1 gap-3 items-end ${egresoForm.Recurrente ? "md:grid-cols-6" : "md:grid-cols-5"}`}>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Fecha</label>
                  <input type="date" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={egresoForm.Fecha} onChange={(e)=>setEgresoForm({...egresoForm, Fecha: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Concepto</label>
                  <input type="text" placeholder="Concepto del Gasto" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={egresoForm.Concepto} onChange={(e)=>setEgresoForm({...egresoForm, Concepto: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Pilar Categoría</label>
                  <select className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={egresoForm.Categoria_Pilar || (pilares.length > 0 ? pilares[0].Nombre : "")} onChange={(e)=>setEgresoForm({...egresoForm, Categoria_Pilar: e.target.value as any})}>
                    {pilares.map(p => (
                      <option key={p.ID_Pilar} value={p.Nombre}>{p.Nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Monto</label>
                  <input type="number" placeholder="0.00" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={egresoForm.Monto} onChange={(e)=>setEgresoForm({...egresoForm, Monto: e.target.value})} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border bg-white border-stone-300 dark:bg-stone-900 dark:border-stone-850 h-[42px] mb-0.5">
                  <span className="text-[9px] uppercase font-bold text-stone-500">¿Recurrente?</span>
                  <input
                    type="checkbox"
                    checked={egresoForm.Recurrente}
                    onChange={(e) => setEgresoForm({...egresoForm, Recurrente: e.target.checked})}
                    className="w-4 h-4 cursor-pointer text-teal-650 rounded focus:ring-teal-500"
                  />
                </div>
                {egresoForm.Recurrente && (
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-stone-500">Frecuencia</label>
                    <select className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={egresoForm.Recurrencia} onChange={(e)=>setEgresoForm({...egresoForm, Recurrencia: e.target.value})}>
                      <option value="diaria">Diaria</option>
                      <option value="semanal">Semanal</option>
                      <option value="quincenal">Quincenal</option>
                      <option value="mensual">Mensual</option>
                    </select>
                  </div>
                )}
                <button type="submit" className={`py-2.5 px-4 font-bold rounded-xl bg-teal-500 hover:bg-teal-650 text-white text-xs cursor-pointer transition-all shadow-md ${egresoForm.Recurrente ? "md:col-span-6" : "md:col-span-5"}`}>Registrar</button>
              </form>
            )}

            {activeSheet === "P" && (
              <form onSubmit={handleAddPrestamo} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Monto Prestado</label>
                  <input type="number" placeholder="0.00" required className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={prestamoForm.Monto_Prestado} onChange={(e)=>setPrestamoForm({...prestamoForm, Monto_Prestado: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Monto a Pagar</label>
                  <input type="number" placeholder="0.00" required className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={prestamoForm.Monto_A_Pagar} onChange={(e)=>setPrestamoForm({...prestamoForm, Monto_A_Pagar: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Fecha Inicio</label>
                  <input type="date" required className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={prestamoForm.Fecha_Inicio} onChange={(e)=>setPrestamoForm({...prestamoForm, Fecha_Inicio: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Fecha Límite</label>
                  <input type="date" required className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={prestamoForm.Fecha_Limite} onChange={(e)=>setPrestamoForm({...prestamoForm, Fecha_Limite: e.target.value})} />
                </div>
                <button type="submit" className="py-2.5 px-4 font-bold rounded-xl bg-teal-500 hover:bg-teal-650 text-white text-xs cursor-pointer transition-all shadow-md">Registrar</button>
              </form>
            )}

            {activeSheet === "E" && (
              <form onSubmit={handleAddEvento} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Nombre de la actividad</label>
                  <input type="text" placeholder="ej. Gimnasio" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={eventoForm.Titulo_Actividad} onChange={(e)=>setEventoForm({...eventoForm, Titulo_Actividad: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Pilar Asociado</label>
                  <select className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={eventoForm.Pilar || (pilares.length > 0 ? pilares[0].Nombre : "")} onChange={(e)=>setEventoForm({...eventoForm, Pilar: e.target.value as any})}>
                    {pilares.map(p => (
                      <option key={p.ID_Pilar} value={p.Nombre}>{p.Nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500">Inicio (Fecha Hora)</label>
                  <input type="datetime-local" className="w-full text-xs p-2.5 rounded-xl border focus:outline-none bg-white border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-850 dark:text-white" value={eventoForm.Fecha_Hora_Inicio} onChange={(e)=>setEventoForm({...eventoForm, Fecha_Hora_Inicio: e.target.value})} />
                </div>
                <button type="submit" className="py-2.5 px-4 font-bold rounded-xl bg-teal-500 hover:bg-teal-650 text-white text-xs cursor-pointer transition-all shadow-md">Registrar</button>
              </form>
            )}

          </div>
        )}

        {/* Filter Bar (Only for Sheet E - Actividades) */}
        {activeSheet === "E" && (
          <div className={`p-4 rounded-2xl border mb-6 flex flex-wrap items-center gap-4 ${
            darkMode ? "bg-stone-950/30 border-stone-900" : "bg-stone-50/50 border-stone-200"
          }`}>
            <div className="flex items-center gap-2 text-stone-500 text-[10px] uppercase font-bold tracking-wider">
              <Sliders className="w-3.5 h-3.5" />
              <span>Filtros:</span>
            </div>

            <div className="flex flex-wrap gap-3 flex-grow flex-shrink">
              {/* Year Select */}
              <div className="space-y-1">
                <select
                  value={selectedYearFilter}
                  onChange={(e) => setSelectedYearFilter(e.target.value)}
                  className={`text-[11px] p-2 rounded-xl border focus:outline-none cursor-pointer font-semibold ${
                    darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-250 text-stone-700"
                  }`}
                >
                  <option value="all">Todos los Años</option>
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Month Select */}
              <div className="space-y-1">
                <select
                  value={selectedMonthFilter}
                  onChange={(e) => setSelectedMonthFilter(e.target.value)}
                  className={`text-[11px] p-2 rounded-xl border focus:outline-none cursor-pointer font-semibold ${
                    darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-250 text-stone-700"
                  }`}
                >
                  <option value="all">Todos los Meses</option>
                  <option value="0">Enero</option>
                  <option value="1">Febrero</option>
                  <option value="2">Marzo</option>
                  <option value="3">Abril</option>
                  <option value="4">Mayo</option>
                  <option value="5">Junio</option>
                  <option value="6">Julio</option>
                  <option value="7">Agosto</option>
                  <option value="8">Septiembre</option>
                  <option value="9">Octubre</option>
                  <option value="10">Noviembre</option>
                  <option value="11">Diciembre</option>
                </select>
              </div>

              {/* Week Select */}
              <div className="space-y-1">
                <select
                  value={selectedWeekFilter}
                  onChange={(e) => setSelectedWeekFilter(e.target.value)}
                  className={`text-[11px] p-2 rounded-xl border focus:outline-none cursor-pointer font-semibold ${
                    darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-250 text-stone-700"
                  }`}
                >
                  <option value="all">Todas las Semanas</option>
                  <option value="current">Esta Semana (Actual)</option>
                  <option value="w1">Semana 1 del mes (Días 1-7)</option>
                  <option value="w2">Semana 2 del mes (Días 8-14)</option>
                  <option value="w3">Semana 3 del mes (Días 15-21)</option>
                  <option value="w4">Semana 4 del mes (Días 22-28)</option>
                  <option value="w5">Semana 5 del mes (Días 29+)</option>
                </select>
              </div>

              {/* Pillar Select */}
              <div className="space-y-1">
                <select
                  value={selectedPillarFilter}
                  onChange={(e) => setSelectedPillarFilter(e.target.value)}
                  className={`text-[11px] p-2 rounded-xl border focus:outline-none cursor-pointer font-semibold ${
                    darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-250 text-stone-700"
                  }`}
                >
                  <option value="all">Todos los Pilares</option>
                  <option value="Salud">🩺 Salud</option>
                  <option value="Escolar">📚 Escolar</option>
                  <option value="Laboral">💼 Laboral</option>
                  <option value="Personal">🍀 Personal</option>
                  <option value="Amoroso">💖 Amoroso</option>
                  <option value="Económico">💰 Económico</option>
                </select>
              </div>
            </div>

            {/* Clear filters button */}
            {(selectedYearFilter !== "all" || selectedMonthFilter !== "all" || selectedWeekFilter !== "all" || selectedPillarFilter !== "all") && (
              <button
                onClick={() => {
                  setSelectedYearFilter("all");
                  setSelectedMonthFilter("all");
                  setSelectedWeekFilter("all");
                  setSelectedPillarFilter("all");
                }}
                className="py-1.5 px-3 rounded-xl border border-rose-500/20 text-rose-500 bg-rose-500/5 hover:bg-rose-500 hover:text-white text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>
            )}

            {/* Selection Checkbox and Delete Button */}
            {filteredEventos.length > 0 && (
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-[10px] uppercase font-bold cursor-pointer select-none text-stone-500 hover:text-stone-400">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-stone-300 dark:border-stone-800 text-teal-600 focus:ring-teal-500/20 bg-transparent transition-all cursor-pointer"
                  />
                  <span>Seleccionar Todo</span>
                </label>

                {selectedEventIds.length > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className="py-1.5 px-3 rounded-xl border border-red-500/20 text-white bg-red-600 hover:bg-red-700 text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Borrar Seleccionados ({selectedEventIds.length})</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Clean card lists instead of spreadsheets */}
        <div className="space-y-3 text-left">
          
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
                  <span className="text-xs font-bold font-mono text-teal-400">{formatAmount(item.Monto_Neto)}</span>
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
                    <span className={`font-bold ${item.Saldo_Disponible > 0 ? "text-emerald-500" : "text-rose-500"}`}>{formatAmount(item.Saldo_Disponible)}</span>
                  </div>
                  {item.Tipo === TipoTarjeta.CREDITO && (
                    <div className="text-right">
                      <span className="text-stone-500 text-[9px] block uppercase font-bold">Deuda</span>
                      <span className="text-rose-500 font-bold">{item.Deuda_Actual > 0 ? "-" : ""}{formatAmount(item.Deuda_Actual)}</span>
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
                    {item.Recurrente === 1 && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-teal-500/10 text-teal-400">Recurrente</span>
                    )}
                  </div>
                  <h4 className={`text-xs font-semibold ${darkMode ? "text-white" : "text-stone-900"}`}>{item.Concepto}</h4>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold font-mono text-rose-400">-{formatAmount(item.Monto)}</span>
                  <button onClick={() => handleDeleteItem("egresos", item.ID_Egreso)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl cursor-pointer transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}

          {activeSheet === "P" && (
            prestamos.length === 0 ? <p className="text-xs text-stone-500 py-6 text-center">No hay préstamos registrados.</p> :
            prestamos.map(item => {
              const excedente = item.Monto_A_Pagar - item.Monto_Prestado;
              const tasa = item.Monto_Prestado > 0 ? (excedente / item.Monto_Prestado) * 100 : 0;
              return (
                <div key={item.ID_Prestamo} className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  darkMode ? "bg-stone-950/60 border-stone-850" : "bg-stone-50 border-stone-200"
                }`}>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400">Préstamo</span>
                      <span className="text-[10px] font-mono text-stone-500">Inicio: {item.Fecha_Inicio} | Límite: {item.Fecha_Limite}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
                      <div>
                        <span className="text-stone-500 text-[9px] block uppercase font-bold">Monto Prestado</span>
                        <span className={`font-semibold font-mono ${darkMode ? "text-white" : "text-stone-900"}`}>{formatAmount(item.Monto_Prestado)}</span>
                      </div>
                      <div>
                        <span className="text-stone-500 text-[9px] block uppercase font-bold">Monto a Pagar</span>
                        <span className={`font-semibold font-mono ${darkMode ? "text-white" : "text-stone-900"}`}>{formatAmount(item.Monto_A_Pagar)}</span>
                      </div>
                      <div>
                        <span className="text-stone-500 text-[9px] block uppercase font-bold">Excedente a Pagar</span>
                        <span className="text-rose-500 font-semibold font-mono">{formatAmount(excedente)}</span>
                      </div>
                      <div>
                        <span className="text-stone-500 text-[9px] block uppercase font-bold">Tasa de Interés</span>
                        <span className="text-amber-500 font-semibold">{tasa.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleDeleteItem("prestamos", item.ID_Prestamo)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl cursor-pointer transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {activeSheet === "E" && (
            filteredEventos.length === 0 ? (
              <p className="text-xs text-stone-500 py-6 text-center">No hay actividades que coincidan con los filtros.</p>
            ) : (
              <div className="space-y-6">
                {sortedGroupKeys.map((groupKey) => {
                  const monthEvents = getMonthEvents(groupKey);
                  if (monthEvents.length === 0) return null;
                  
                  return (
                    <div key={groupKey} className="space-y-3">
                      {/* Month Header Group */}
                      <div className="flex items-center gap-2.5 pb-1.5 border-b border-stone-200 dark:border-stone-850">
                        <input
                          type="checkbox"
                          checked={isMonthSelected(groupKey)}
                          onChange={() => handleToggleSelectMonth(groupKey)}
                          className="w-3.5 h-3.5 rounded border-stone-300 dark:border-stone-800 text-teal-600 focus:ring-teal-500/20 bg-transparent transition-all cursor-pointer"
                        />
                        <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-stone-300" : "text-stone-800"}`}>
                          📅 {getGroupHeaderLabel(groupKey)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-stone-100 dark:bg-stone-900 text-stone-500 border border-stone-200 dark:border-stone-800">
                          {monthEvents.length} {monthEvents.length === 1 ? "actividad" : "actividades"}
                        </span>
                      </div>

                      {/* Weeks Loop */}
                      <div className="space-y-4 pl-4 border-l border-stone-150 dark:border-stone-850 ml-1.5">
                        {["w1", "w2", "w3", "w4", "w5", "no-week"].map(weekKey => {
                          const weekEvents = groupedEventos[groupKey]?.[weekKey] || [];
                          if (weekEvents.length === 0) return null;
                          return (
                            <div key={weekKey} className="space-y-2">
                              {/* Week Sub-Header */}
                              <div className="flex items-center gap-2 py-1">
                                <input
                                  type="checkbox"
                                  checked={isWeekSelected(groupKey, weekKey)}
                                  onChange={() => handleToggleSelectWeek(groupKey, weekKey)}
                                  className="w-3.5 h-3.5 rounded border-stone-300 dark:border-stone-800 text-teal-600 focus:ring-teal-500/20 bg-transparent transition-all cursor-pointer"
                                />
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-stone-400" : "text-stone-600"}`}>
                                  {getWeekLabel(weekKey)}
                                </span>
                                <span className="px-1.5 py-0.2 rounded-full text-[8px] font-bold bg-stone-100/50 dark:bg-stone-900/50 text-stone-500">
                                  {weekEvents.length}
                                </span>
                              </div>

                              {/* Week Events List */}
                              <div className="space-y-2.5">
                                {weekEvents.map(item => {
                                  const isSelected = selectedEventIds.includes(item.ID_Actividad);
                                  return (
                                    <div key={item.ID_Actividad} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                                      isSelected 
                                        ? darkMode ? "bg-teal-950/20 border-teal-500/30" : "bg-teal-50/50 border-teal-500/30"
                                        : darkMode ? "bg-stone-950/60 border-stone-850" : "bg-stone-50 border-stone-200"
                                    }`}>
                                      <div className="flex items-start gap-3 flex-grow mr-4">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => handleToggleSelectEvent(item.ID_Actividad)}
                                          className="mt-1 w-3.5 h-3.5 rounded border-stone-300 dark:border-stone-800 text-teal-600 focus:ring-teal-500/20 bg-transparent transition-all cursor-pointer"
                                        />
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400">{item.Pilar}</span>
                                            <span className="text-[10px] font-mono text-stone-500">{item.Fecha_Hora_Inicio.replace("T", " ")}</span>
                                          </div>
                                          <h4 className={`text-xs font-semibold ${darkMode ? "text-white" : "text-stone-900"}`}>{item.Titulo_Actividad}</h4>
                                          <p className="text-[11px] text-stone-500">{item.Descripcion_Detallada}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-4">
                                        <button onClick={() => handleDeleteItem("eventos", item.ID_Actividad)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl cursor-pointer transition-all">
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

        </div>
      </div>

      {/* Custom Confirm Dialog Component */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
