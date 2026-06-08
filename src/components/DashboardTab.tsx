import React, { useState, useMemo } from "react";
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
  Cell,
  Legend
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Activity, 
  ShieldAlert, 
  ShieldCheck,
  Heart,
  Briefcase,
  GraduationCap,
  Sparkles,
  Info,
  Calendar,
  Layers,
  Plus,
  Coins,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle
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

  // --- FORM STATE ---
  const [titulo, setTitulo] = useState<string>("");
  const [pilar, setPilar] = useState<CategoriaPilar>(CategoriaPilar.SALUD);
  const [tipoAgenda, setTipoAgenda] = useState<string>("Agenda_Personal");
  const [descripcion, setDescripcion] = useState<string>("");
  const [fechaInicio, setFechaInicio] = useState<string>("2026-06-12T10:00");
  const [fechaFin, setFechaFin] = useState<string>("2026-06-12T11:00");
  const [requierePago, setRequierePago] = useState<boolean>(false);
  const [gastoMonto, setGastoMonto] = useState<string>("0");
  const [tarjetaId, setTarjetaId] = useState<string>("");
  const [gastoSubcategoria, setGastoSubcategoria] = useState<string>("");
  const [gastoTipo, setGastoTipo] = useState<TipoGasto>(TipoGasto.VARIABLE);
  const [formSuccess, setFormSuccess] = useState<string>("");
  const [formError, setFormError] = useState<string>("");

  // --- CALENDAR SYNC TOGGLES STATE ---
  const [syncSalud, setSyncSalud] = useState<boolean>(true);
  const [syncEscolar, setSyncEscolar] = useState<boolean>(true);
  const [syncLaboral, setSyncLaboral] = useState<boolean>(true);
  const [syncPersonal, setSyncPersonal] = useState<boolean>(true);
  const [syncAmoroso, setSyncAmoroso] = useState<boolean>(true);
  const [syncEconomico, setSyncEconomico] = useState<boolean>(true);

  // --- KPI CALCULATIONS ---
  const totalNetoIncomes = useMemo(() => {
    return ingresos.reduce((sum, item) => sum + item.Monto_Neto, 0);
  }, [ingresos]);

  const totalExpenses = useMemo(() => {
    return egresos.reduce((sum, item) => sum + item.Monto, 0);
  }, [egresos]);

  // Aggregate current actual debts (credit balances)
  const totalDebtBalance = useMemo(() => {
    return deudas
      .filter(d => d.Tipo === TipoTarjeta.CREDITO)
      .reduce((sum, item) => sum + item.Deuda_Actual, 0);
  }, [deudas]);

  const netRemanenteFree = useMemo(() => {
    return totalNetoIncomes - totalExpenses;
  }, [totalNetoIncomes, totalExpenses]);

  // Rule 1: 50% Esenciales, 30% Deudas/Ahorros, 20% Desarrollo
  const rule503020Metrics = useMemo(() => {
    const esenciales = egresos
      .filter(item => item.Categoria_Pilar === CategoriaPilar.NECESIDAD_ESENCIAL)
      .reduce((sum, item) => sum + item.Monto, 0);

    // Sum of minimum payments or debit cards total balance
    const deudasMinimas = deudas
      .filter(d => d.Tipo === TipoTarjeta.CREDITO)
      .reduce((sum, d) => sum + d.Pago_Minimo, 0);

    const desarrollo = egresos
      .filter(item => item.Categoria_Pilar !== CategoriaPilar.NECESIDAD_ESENCIAL)
      .reduce((sum, item) => sum + item.Monto, 0);

    return { esenciales, deudasMinimas, desarrollo };
  }, [egresos, deudas]);

  // Recharts Data for Rule Distribution vs Ideal limit
  const budgetCheckData = useMemo(() => {
    const totalIn = totalNetoIncomes || 1;
    const pctEsenciales = (rule503020Metrics.esenciales / totalIn) * 100;
    const pctDeudas = (rule503020Metrics.deudasMinimas / totalIn) * 100;
    const pctDesarrollo = (rule503020Metrics.desarrollo / totalIn) * 100;

    return [
      { name: "Esenciales (Regla 50%)", Actual: parseFloat(pctEsenciales.toFixed(1)), Limite: 50 },
      { name: "Deudas Mín. (Regla 30%)", Actual: parseFloat(pctDeudas.toFixed(1)), Limite: 30 },
      { name: "Desarrollo (Regla 20%)", Actual: parseFloat(pctDesarrollo.toFixed(1)), Limite: 20 }
    ];
  }, [rule503020Metrics, totalNetoIncomes]);

  // Rule 2: Salud cross-impact on Personal Available
  const healthRuleCalculation = useMemo(() => {
    const gastosalud = egresos
      .filter(item => item.Categoria_Pilar === CategoriaPilar.SALUD)
      .reduce((sum, item) => sum + item.Monto, 0);

    const usePercentage = activeUser.Salud_Personal_Base_Porcentaje ?? 0.20;
    const basePersonalBudget = totalNetoIncomes * usePercentage;
    const adjustedPersonalBudget = Math.max(0, basePersonalBudget - gastosalud);

    const actualPersonalSpent = egresos
      .filter(item => item.Categoria_Pilar === CategoriaPilar.PERSONAL)
      .reduce((sum, item) => sum + item.Monto, 0);

    return {
      gastosalud,
      basePersonalBudget,
      adjustedPersonalBudget,
      actualPersonalSpent,
      exceeded: actualPersonalSpent > adjustedPersonalBudget
    };
  }, [egresos, totalNetoIncomes, activeUser]);

  // Rule 3: Escolar & Laboral high priority overload triggers warning for Personal/Amoroso
  const schoolPriorityCalculation = useMemo(() => {
    const escolarSpent = egresos
      .filter(item => item.Categoria_Pilar === CategoriaPilar.ESCOLAR)
      .reduce((sum, item) => sum + item.Monto, 0);

    const laboralSpent = egresos
      .filter(item => item.Categoria_Pilar === CategoriaPilar.LABORAL)
      .reduce((sum, item) => sum + item.Monto, 0);

    const escolarBudget = metas
      .filter(m => m.Pilar === CategoriaPilar.ESCOLAR)
      .reduce((sum, item) => sum + item.Presupuesto_Asignado, 0) || 500;

    const laboralBudget = metas
      .filter(m => m.Pilar === CategoriaPilar.LABORAL)
      .reduce((sum, item) => sum + item.Presupuesto_Asignado, 0) || 200;

    const totalSpent = escolarSpent + laboralSpent;
    const totalBudget = escolarBudget + laboralBudget;
    const exceededAmount = Math.max(0, totalSpent - totalBudget);

    return {
      escolarSpent,
      laboralSpent,
      escolarBudget,
      laboralBudget,
      totalSpent,
      totalBudget,
      exceededAmount,
      triggered: exceededAmount > 0
    };
  }, [egresos, metas]);

  // Rule 4: Amoroso Limit freezing based on card credit minimum safety ratio
  const amorosoCapCalculation = useMemo(() => {
    const totalNoInteresesPay = deudas
      .filter(d => d.Tipo === TipoTarjeta.CREDITO)
      .reduce((sum, item) => sum + item.Pago_Para_No_Generar_Intereses, 0);
    
    // limit is 30% of Net Income or general threshold
    const limitRatio = totalNetoIncomes * 0.3;
    const capActive = totalNoInteresesPay > limitRatio;
    
    const usePct = activeUser.Tope_Amoroso_Porcentaje ?? 0.30;
    const maxAmorosoAllowed = totalNetoIncomes * (capActive ? 0.05 : usePct);

    const actualAmorosoSpent = egresos
      .filter(item => item.Categoria_Pilar === CategoriaPilar.AMOROSO)
      .reduce((sum, item) => sum + item.Monto, 0);

    return {
      totalNoInteresesPay,
      limitRatio,
      capActive,
      maxAmorosoAllowed,
      actualAmorosoSpent,
      exceededCap: actualAmorosoSpent > maxAmorosoAllowed
    };
  }, [deudas, totalNetoIncomes, egresos, activeUser]);

  // PIE CHART DATA: Expenses per category pilar
  const pilarChartData = useMemo(() => {
    const categoriesMap: Record<string, number> = {};
    egresos.forEach(item => {
      categoriesMap[item.Categoria_Pilar] = (categoriesMap[item.Categoria_Pilar] || 0) + item.Monto;
    });

    return Object.entries(categoriesMap).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2))
    }));
  }, [egresos]);

  const PIE_COLORS = ["#14b8a6", "#6366f1", "#06b6d4", "#a855f7", "#ec4899", "#10b981", "#f59e0b"];

  // --- FILTERED EVENTS DYNAMICALLY ACCORDING TO SYNC TOGGLES ---
  // If user unchecks sync, we hide those pillar events from the simulated Calendar!
  const syncedCalendarEvents = useMemo(() => {
    // 1. Fetch current normal eventos
    const normalEvents = eventos.filter(e => {
      if (e.Pilar === CategoriaPilar.SALUD && !syncSalud) return false;
      if (e.Pilar === CategoriaPilar.ESCOLAR && !syncEscolar) return false;
      if (e.Pilar === CategoriaPilar.LABORAL && !syncLaboral) return false;
      if (e.Pilar === CategoriaPilar.PERSONAL && !syncPersonal) return false;
      if (e.Pilar === CategoriaPilar.AMOROSO && !syncAmoroso) return false;
      if (e.Pilar === CategoriaPilar.NECESIDAD_ESENCIAL) return true; // always show essential living
      return true;
    });

    // 2. Generate AUTOMATED ALERTS for target key dates of active cards (Corte & Límite)
    const automatedCardAlerts: AgendaEvento[] = [];
    if (syncEconomico) {
      deudas.forEach(card => {
        if (card.Tipo === TipoTarjeta.CREDITO) {
          // Add close cut (Fecha de Corte) alert
          automatedCardAlerts.push({
            ID_Usuario: card.ID_Usuario,
            ID_Evento: `auto-corte-${card.ID_Tarjeta}`,
            ID_Actividad: `auto-corte-${card.ID_Tarjeta}`,
            Tipo_Agenda: "Agenda_Personal",
            Pilar: "Económico" as any,
            Pilar_Asociado: "Económico" as any,
            Titulo_Actividad: `✂️ Corte: ${card.Nombre_Tarjeta}`,
            Titulo: `✂️ Corte: ${card.Nombre_Tarjeta}`,
            Descripcion_Detallada: `Fecha de corte. Saldo al corte actual: $${card.Saldo_Al_Corte}. Límite disponible: $${card.Saldo_Disponible}.`,
            Descripcion: `Fecha de corte. Saldo al corte actual: $${card.Saldo_Al_Corte}. Límite disponible: $${card.Saldo_Disponible}.`,
            Fecha_Hora_Inicio: `2026-06-${card.Fecha_Corte.toString().padStart(2, "0")}T09:00`,
            Fecha_Hora_Fin: `2026-06-${card.Fecha_Corte.toString().padStart(2, "0")}T10:00`,
            Requiere_Pago: false,
            ID_Egreso_Asociado: null,
            Fecha: `2026-06-${card.Fecha_Corte.toString().padStart(2, "0")}`,
            Tipo_Evento: "Corte de Tarjeta",
            Color: "red",
            Alerta_Descalce: true
          });

          // Add payment due (Fecha Límite Pago) alert
          automatedCardAlerts.push({
            ID_Usuario: card.ID_Usuario,
            ID_Evento: `auto-pago-${card.ID_Tarjeta}`,
            ID_Actividad: `auto-pago-${card.ID_Tarjeta}`,
            Tipo_Agenda: "Agenda_Personal",
            Pilar: "Económico" as any,
            Pilar_Asociado: "Económico" as any,
            Titulo_Actividad: `⚠️ Plazo Límite: ${card.Nombre_Tarjeta}`,
            Titulo: `⚠️ Plazo Límite: ${card.Nombre_Tarjeta}`,
            Descripcion_Detallada: `Evita generar intereses de financiamiento. Importe para no generar intereses: $${card.Pago_Para_No_Generar_Intereses}. Pago Mínimo: $${card.Pago_Minimo}.`,
            Descripcion: `Evita generar intereses de financiamiento. Importe para no generar intereses: $${card.Pago_Para_No_Generar_Intereses}. Pago Mínimo: $${card.Pago_Minimo}.`,
            Fecha_Hora_Inicio: `2026-06-${card.Fecha_Limite_Pago.toString().padStart(2, "0")}T09:00`,
            Fecha_Hora_Fin: `2026-06-${card.Fecha_Limite_Pago.toString().padStart(2, "0")}T10:00`,
            Requiere_Pago: false,
            ID_Egreso_Asociado: null,
            Fecha: `2026-06-${card.Fecha_Limite_Pago.toString().padStart(2, "0")}`,
            Tipo_Evento: "Límite de Pago",
            Color: "red",
            Alerta_Descalce: true
          });
        }
      });
    }

    return [...normalEvents, ...automatedCardAlerts].sort((a,b) => a.Fecha_Hora_Inicio.localeCompare(b.Fecha_Hora_Inicio));
  }, [eventos, deudas, syncSalud, syncEscolar, syncLaboral, syncPersonal, syncAmoroso, syncEconomico]);

  // --- SUBMIT WORKFLOW ---
  // Executes: Activity -> Require Cost -> Wallet balance decrease/Credit Debt Increase -> logs egreso -> links
  const handleCreateActivityWithDualConnection = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!titulo.trim()) {
      setFormError("El Título de la actividad es un parámetro de texto obligatorio.");
      return;
    }

    const uuidActividad = "act-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
    let computedEgresoId: string | null = null;
    const parseMonto = parseFloat(gastoMonto);

    if (requierePago) {
      if (isNaN(parseMonto) || parseMonto <= 0) {
        setFormError("Si la actividad requiere pago, ingresa un monto decimal superior a 0.");
        return;
      }
      if (!tarjetaId) {
        setFormError("Elige un instrumento de pago (Tarjeta / Monedero) de tu TABLA C para autorizar la compra.");
        return;
      }

      // Check card properties to decrease available checking money or increase credit balance
      const selectedCard = deudas.find(c => c.ID_Instrumento === tarjetaId);
      if (!selectedCard) {
        setFormError("La tarjeta seleccionada no existe en tu base de datos multiusuario.");
        return;
      }

      // If debit, check if they have enough balance (Liquidez safety block)
      if (selectedCard.Tipo === TipoTarjeta.DEBITO && selectedCard.Saldo_Disponible < parseMonto) {
        setFormError(`⚠ Saldo Insuficiente en cuenta de Débito: Tienes $${selectedCard.Saldo_Disponible} pero el gasto es de $${parseMonto}.`);
        return;
      }

      // Lock block credit limit checks
      if (selectedCard.Tipo === TipoTarjeta.CREDITO && selectedCard.Saldo_Disponible < parseMonto) {
        setFormError(`⚠ Límite de Crédito Insuficiente en tarjeta: Cupo disponible de $${selectedCard.Saldo_Disponible}. No se puede transaccionar.`);
        return;
      }

      // Transform state of cards (TABLA C)
      setDeudas((prev) => prev.map(card => {
        if (card.ID_Instrumento === tarjetaId) {
          if (card.Tipo === TipoTarjeta.CREDITO) {
            const nextDeuda = card.Deuda_Actual + parseMonto;
            const nextDisp = Math.max(0, card.Limite_Credito - nextDeuda);
            return {
              ...card,
              Deuda_Actual: nextDeuda,
              Saldo_Disponible: nextDisp,
              Balance_Total_Pendiente: nextDeuda,
              Saldo_Al_Corte: nextDeuda,
              Pago_Para_No_Generar_Intereses: card.Pago_Para_No_Generar_Intereses + (parseMonto * 0.15) // proportional increase
            };
          } else {
            // Debit checking decrease money
            return {
              ...card,
              Saldo_Disponible: card.Saldo_Disponible - parseMonto
            };
          }
        }
        return card;
      }));

      // Register corresponding Egreso Record dynamically into TABLA D
      computedEgresoId = "egr-" + Math.random().toString(36).substring(2, 9);
      const cleanSub = gastoSubcategoria.trim() || `${pilar} Automático`;
      
      const newEgreso: Egreso = {
        ID_Usuario: activeUser.ID_Usuario,
        ID_Egreso: computedEgresoId,
        ID_Actividad_Origen: uuidActividad,
        ID_Tarjeta_Utilizada: tarjetaId,
        Fecha: fechaInicio.split("T")[0],
        Concepto: titulo,
        Categoria_Pilar: pilar,
        Subcategoria: cleanSub,
        Monto: parseMonto,
        Metodo_Pago: selectedCard.Nombre_Tarjeta,
        Tipo_Gasto: gastoTipo
      };

      setEgresos((prev) => [...prev, newEgreso]);
    }

    // Register Activity (TABLA E)
    const colorCode: "indigo" | "red" | "orange" | "blue" | "purple" | "green" = 
      pilar === CategoriaPilar.SALUD ? "green" 
      : pilar === CategoriaPilar.ESCOLAR ? "blue"
      : pilar === CategoriaPilar.LABORAL ? "indigo"
      : pilar === CategoriaPilar.PERSONAL ? "orange"
      : "purple";

    const newActivity: AgendaEvento = {
      ID_Usuario: activeUser.ID_Usuario,
      ID_Evento: uuidActividad,
      ID_Actividad: uuidActividad,
      Tipo_Agenda: tipoAgenda as any,
      Pilar: pilar,
      Pilar_Asociado: pilar,
      Titulo_Actividad: titulo,
      Titulo: titulo,
      Descripcion_Detallada: descripcion || `Nueva cita en el pilar ${pilar}`,
      Descripcion: descripcion || `Nueva cita en el pilar ${pilar}`,
      Fecha_Hora_Inicio: fechaInicio,
      Fecha_Hora_Fin: fechaFin,
      Requiere_Pago: requierePago,
      ID_Egreso_Asociado: computedEgresoId,
      Fecha: fechaInicio.split("T")[0],
      Tipo_Evento: pilar,
      Color: colorCode,
      Alerta_Descalce: false
    };

    setEventos((prev) => [...prev, newActivity]);
    
    // Clear inputs and success
    setTitulo("");
    setDescripcion("");
    setGastoMonto("0");
    setRequieresPagoDefaults();
    setFormSuccess("🎉 Actividad registrada con éxito. Se calculó el impacto cruzado en monederos y egresos.");
    
    setTimeout(() => setFormSuccess(""), 4500);
  };

  const setRequieresPagoDefaults = () => {
    setRequierePago(false);
    setTarjetaId("");
    setGastoSubcategoria("");
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top 4 Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Percepciones Netas */}
        <div className={`p-4 rounded-2xl border ${
          darkMode ? "bg-stone-900 border-stone-850" : "bg-white border-stone-200"
        } flex items-center justify-between shadow-sm`}>
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest leading-none">Ingresos Netos (Caja)</span>
            <h3 className={`text-xl font-bold mt-1.5 ${darkMode ? "text-teal-400" : "text-teal-700"}`}>
              ${totalNetoIncomes.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span className="text-[9px] text-stone-400">Canales de Nómina / Freelance</span>
          </div>
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-500">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Egresos Ejecutados */}
        <div className={`p-4 rounded-2xl border ${
          darkMode ? "bg-stone-900 border-stone-850" : "bg-white border-stone-200"
        } flex items-center justify-between shadow-sm`}>
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest leading-none">Egresos Ejecutados</span>
            <h3 className={`text-xl font-bold mt-1.5 ${totalExpenses > totalNetoIncomes ? "text-rose-500" : "text-indigo-400"}`}>
              ${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span className="text-[9px] text-stone-400">{egresos.length} Registros en Tabla D</span>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Remanente Libre */}
        <div className={`p-4 rounded-2xl border ${
          darkMode ? "bg-stone-900 border-stone-850" : "bg-white border-stone-200"
        } flex items-center justify-between shadow-sm`}>
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest leading-none">Remanente de Cuenta</span>
            <h3 className={`text-xl font-bold mt-1.5 ${netRemanenteFree >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              ${netRemanenteFree.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span className="text-[9px] text-stone-400">Flujo de caja disponible</span>
          </div>
          <div className={`p-2.5 rounded-xl ${netRemanenteFree >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
            <Coins className="w-5 h-5" />
          </div>
        </div>

        {/* Deuda Consolidada */}
        <div className={`p-4 rounded-2xl border ${
          darkMode ? "bg-stone-900 border-stone-850" : "bg-white border-stone-200"
        } flex items-center justify-between shadow-sm`}>
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest leading-none">Pasivos en Tarjetas</span>
            <h3 className="text-xl font-bold mt-1.5 text-rose-500">
              ${totalDebtBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span className="text-[9px] text-stone-400">Obligación Actual TDC (Tabla C)</span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* PRIORITIZED SECTION: Gestor de Actividades y Eventos Diarios (TABLA E) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 cols: Activities Agenda */}
        <div className={`lg:col-span-2 p-6 rounded-3xl border ${
          darkMode ? "bg-stone-900/60 border-stone-900" : "bg-white border-stone-200 shadow-sm"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-400" />
              <div>
                <h2 className={`font-sans font-bold text-sm uppercase tracking-wider ${darkMode ? "text-white" : "text-stone-900"}`}>
                  Gestor de Actividades y Eventos Diarios (TABLA E)
                </h2>
                <p className="text-[10px] text-stone-500 font-medium">
                  Agenda prioritaria del inquilino. Las actividades se ligan de forma automática a transacciones bancarias.
                </p>
              </div>
            </div>
          </div>

          {/* Agenda Feed */}
          {syncedCalendarEvents.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="w-8 h-8 text-stone-600 mx-auto mb-3" />
              <p className="text-xs text-stone-500">No hay eventos ni actividades agendadas para el periodo activo.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2">
              {syncedCalendarEvents.map((ev) => {
                const mapColors: Record<string, string> = {
                  green: "border-l-emerald-500 bg-emerald-500/5",
                  blue: "border-l-indigo-500 bg-indigo-500/5",
                  cyan: "border-l-cyan-500 bg-cyan-500/5",
                  amber: "border-l-amber-500 bg-amber-500/5",
                  pink: "border-l-rose-500 bg-rose-500/5",
                  orange: "border-l-orange-500 bg-orange-500/5",
                  red: "border-l-red-500 bg-red-500/5"
                };
                
                const cardUsed = ev.ID_Egreso_Asociado 
                  ? egresos.find(eg => eg.ID_Egreso === ev.ID_Egreso_Asociado)
                  : null;

                return (
                  <div
                    key={ev.ID_Actividad}
                    className={`p-4 rounded-2xl border-l-[4px] border ${
                      darkMode ? "border-stone-850" : "border-stone-200 bg-stone-50/50"
                    } ${mapColors[ev.Color] || "border-l-stone-400 bg-stone-400/5"} flex flex-col sm:flex-row justify-between items-start gap-4 transition-all hover:-translate-y-0.5`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                          ev.Color === "green" ? "bg-emerald-500/10 text-emerald-400"
                          : ev.Color === "blue" ? "bg-indigo-500/10 text-indigo-400"
                          : ev.Color === "cyan" ? "bg-cyan-500/10 text-cyan-400"
                          : ev.Color === "amber" ? "bg-amber-500/10 text-amber-500"
                          : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {ev.Pilar}
                        </span>
                        
                        <span className="text-[10px] text-stone-500 font-mono font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {ev.Fecha_Hora_Inicio.replace("T", " ")}
                        </span>
                      </div>
                      
                      <h3 className={`text-xs md:text-sm font-bold ${darkMode ? "text-white" : "text-stone-900"}`}>
                        {ev.Titulo_Actividad}
                      </h3>
                      
                      <p className="text-xs text-stone-500 font-sans max-w-lg leading-relaxed">
                        {ev.Descripcion_Detallada}
                      </p>

                      {/* Explicit connection log */}
                      {ev.Requiere_Pago && (
                        <div className="mt-2.5 flex items-center gap-1.5 p-1 px-2.5 rounded-lg bg-stone-500/5 inline-flex text-[10.5px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                          <span className="text-stone-400 font-medium">Ligo Financiero Directo:</span>
                          <span className="text-amber-500 font-bold font-mono">-${cardUsed ? cardUsed.Monto : 0}</span>
                          <span className="text-stone-500 font-medium">({cardUsed ? cardUsed.Metodo_Pago : "N/A"})</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 col: Dynamic activity creator */}
        <div className={`p-6 rounded-3xl border ${
          darkMode ? "bg-stone-900/60 border-stone-900" : "bg-white border-stone-200 shadow-sm"
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-4 h-4 text-teal-400" />
            <h3 className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-white" : "text-stone-900"}`}>
              Registrar Nueva Actividad (Pilar/Costo)
            </h3>
          </div>

          <form onSubmit={handleCreateActivityWithDualConnection} className="space-y-4">
            
            {formSuccess && (
              <div className="p-3 text-xs rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/15 font-sans leading-relaxed">
                {formSuccess}
              </div>
            )}
            {formError && (
              <div className="p-3 text-xs rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/15 font-sans">
                ⚠ {formError}
              </div>
            )}

            {/* Title */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Metas / Citas / Actividad</label>
              <input
                id="act-title"
                type="text"
                required
                placeholder="ej. Inscripción Posgrado Materia X"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none ${
                  darkMode ? "bg-stone-950 border-stone-800 text-white" : "bg-stone-50 border-stone-250 text-stone-900"
                }`}
              />
            </div>

            {/* Pilar and Agenda Type */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Pilar Asociado</label>
                <select
                  id="act-pilar"
                  value={pilar}
                  onChange={(e) => setPilar(e.target.value as CategoriaPilar)}
                  className={`w-full text-xs p-2 rounded-xl border focus:outline-none ${
                    darkMode ? "bg-stone-950 border-stone-800 text-white" : "bg-stone-50 border-stone-250 text-stone-900"
                  }`}
                >
                  <option value={CategoriaPilar.SALUD}>🩺 Salud / Clínico</option>
                  <option value={CategoriaPilar.ESCOLAR}>📚 Escolar / Metas</option>
                  <option value={CategoriaPilar.LABORAL}>💼 Laboral / Trabajo</option>
                  <option value={CategoriaPilar.PERSONAL}>🍀 Personal / Meditación</option>
                  <option value={CategoriaPilar.AMOROSO}>💖 Amoroso / Pareja</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Tipo Agenda</label>
                <select
                  id="act-tipo-agenda"
                  value={tipoAgenda}
                  onChange={(e) => setTipoAgenda(e.target.value)}
                  className={`w-full text-xs p-2 rounded-xl border focus:outline-none ${
                    darkMode ? "bg-stone-950 border-stone-800 text-white" : "bg-stone-50 border-stone-250 text-stone-900"
                  }`}
                >
                  <option value="Cita_Médica">Cita Médica</option>
                  <option value="Agenda_Laboral">Agenda Laboral</option>
                  <option value="Agenda_Personal">Agenda Personal</option>
                  <option value="Control_Escolar">Control Escolar</option>
                </select>
              </div>
            </div>

            {/* DateTime pickers */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Inicio</label>
                <input
                  id="act-start"
                  type="datetime-local"
                  required
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className={`w-full text-[11px] p-1.5 rounded-xl border focus:outline-none ${
                    darkMode ? "bg-stone-950 border-stone-800 text-white" : "bg-stone-50 border-stone-250 text-stone-900"
                  }`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Fin</label>
                <input
                  id="act-end"
                  type="datetime-local"
                  required
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className={`w-full text-[11px] p-1.5 rounded-xl border focus:outline-none ${
                    darkMode ? "bg-stone-950 border-stone-800 text-white" : "bg-stone-50 border-stone-250 text-stone-900"
                  }`}
                />
              </div>
            </div>

            {/* Short Decription */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Descripción Breve</label>
              <textarea
                id="act-desc"
                placeholder="Indica notas relevantes..."
                rows={2}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className={`w-full text-xs p-2 rounded-xl border focus:outline-none ${
                  darkMode ? "bg-stone-950 border-stone-800 text-white" : "bg-stone-50 border-stone-250 text-stone-900"
                }`}
              />
            </div>

            {/* DUAL PAYMENT TOGGLE BAR & DYNAMIC FORM */}
            <div className={`p-3 rounded-2xl border ${
              requierePago 
                ? darkMode ? "bg-stone-950/80 border-teal-500/20" : "bg-teal-500/5 border-teal-200"
                : darkMode ? "bg-stone-950/40 border-stone-850" : "bg-stone-50 border-stone-200"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[10.5px] font-bold uppercase tracking-wide text-stone-400">¿Implica pago / costo?</span>
                </div>
                <input
                  id="act-requiere-pago"
                  type="checkbox"
                  checked={requierePago}
                  onChange={(e) => setRequierePago(e.target.checked)}
                  className="w-4 h-4 cursor-pointer text-teal-600 border-stone-300 rounded focus:ring-teal-500"
                />
              </div>

              {requierePago && (
                <div className="space-y-3 animate-fadeIn">
                  
                  {/* Select card/instrument from TABLA C */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Seleccionar Tarjeta / Monedero (Tabla C)</label>
                    <select
                      id="act-card-select"
                      required={requierePago}
                      value={tarjetaId}
                      onChange={(e) => setTarjetaId(e.target.value)}
                      className={`w-full text-xs p-2 rounded-lg border focus:outline-none ${
                        darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-200 text-stone-900"
                      }`}
                    >
                      <option value="">-- Elige Instrumento --</option>
                      {deudas.map(card => {
                        const styleDesc = card.Tipo === TipoTarjeta.CREDITO 
                          ? `(Crédito - Límite Disp: $${card.Saldo_Disponible})` 
                          : `(Débito - Caja: $${card.Saldo_Disponible})`;
                        return (
                          <option key={card.ID_Instrumento} value={card.ID_Instrumento}>
                            {card.Nombre_Tarjeta} {styleDesc}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Expense Amount */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Costo ($ Neto)</label>
                      <input
                        id="act-cost-value"
                        type="number"
                        min="0"
                        step="0.01"
                        required={requierePago}
                        value={gastoMonto}
                        onChange={(e) => setGastoMonto(e.target.value)}
                        className={`w-full text-xs p-1.5 rounded-lg border focus:outline-none ${
                          darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-250"
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Subcategoría Gasto</label>
                      <input
                        id="act-subcat"
                        type="text"
                        placeholder="ej. Consulta Nutriólogo"
                        value={gastoSubcategoria}
                        onChange={(e) => setGastoSubcategoria(e.target.value)}
                        className={`w-full text-[11px] p-1.5 rounded-lg border focus:outline-none ${
                          darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-250"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Expense profile properties */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Tipo de Gasto</label>
                    <select
                      id="act-gastotipo"
                      value={gastoTipo}
                      onChange={(e) => setGastoTipo(e.target.value as TipoGasto)}
                      className={`w-full text-xs p-1.5 rounded-lg border focus:outline-none ${
                        darkMode ? "bg-stone-900 border-stone-850" : "bg-white border-stone-200"
                      }`}
                    >
                      <option value={TipoGasto.FIJO}>Mensual Fijo (Prioritario)</option>
                      <option value={TipoGasto.VARIABLE}>Gasto Variable (Esparcimiento)</option>
                      <option value={TipoGasto.HORMIGA}>Gasto Hormiga / Antojo</option>
                    </select>
                  </div>

                  <p className="text-[9px] text-amber-500 font-medium leading-relaxed leading-none">
                    ⚠ **Validación Activa:** Al agendar se descontará liquidez o se endeudará la tarjeta y se inyectará el egreso a la TABLA D del DataLake linkeado.
                  </p>
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              id="btn-save-event"
              type="submit"
              className="w-full py-2.5 px-4 font-bold rounded-xl text-xs bg-teal-500 hover:bg-teal-600 text-white transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-teal-500/10"
            >
              <span>{requierePago ? "Autorizar Pago & Agendar Evento" : "Agendar Actividad Física"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* MID SECTION: GOOGLE CALENDAR DUAL SIMULATOR */}
      <div className={`p-6 rounded-3xl border ${
        darkMode ? "bg-stone-900/60 border-stone-900" : "bg-white border-stone-200 shadow-sm"
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 pb-4 border-b border-stone-200 dark:border-stone-850">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
              <h3 className={`font-sans font-bold text-sm uppercase tracking-wider ${darkMode ? "text-white" : "text-stone-900"}`}>
                Sincronización de Calendario Google API (Live Simulation)
              </h3>
            </div>
            <p className="text-[10px] text-stone-500 mt-1">
              Habilita o apaga las palancas (Toggles) de sincronización de pilares para alimentar el Google Calendar del usuario activo de forma invisible.
            </p>
          </div>

          {/* Sincronización Toggles Deck */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 truncate text-[11px] cursor-pointer">
              <input
                id="sync-salud"
                type="checkbox"
                checked={syncSalud}
                onChange={(e) => setSyncSalud(e.target.checked)}
                className="w-3.5 h-3.5 text-teal-600"
              />
              <span className="text-emerald-500 font-bold">Salud</span>
            </label>
            <label className="flex items-center gap-1.5 truncate text-[11px] cursor-pointer">
              <input
                id="sync-escolar"
                type="checkbox"
                checked={syncEscolar}
                onChange={(e) => setSyncEscolar(e.target.checked)}
                className="w-3.5 h-3.5 text-teal-600"
              />
              <span className="text-indigo-400 font-bold">Escolar</span>
            </label>
            <label className="flex items-center gap-1.5 truncate text-[11px] cursor-pointer">
              <input
                id="sync-laboral"
                type="checkbox"
                checked={syncLaboral}
                onChange={(e) => setSyncLaboral(e.target.checked)}
                className="w-3.5 h-3.5 text-teal-600"
              />
              <span className="text-cyan-400 font-bold">Laboral</span>
            </label>
            <label className="flex items-center gap-1.5 truncate text-[11px] cursor-pointer">
              <input
                id="sync-personal"
                type="checkbox"
                checked={syncPersonal}
                onChange={(e) => setSyncPersonal(e.target.checked)}
                className="w-3.5 h-3.5 text-teal-600"
              />
              <span className="text-amber-500 font-bold">Personal</span>
            </label>
            <label className="flex items-center gap-1.5 truncate text-[11px] cursor-pointer">
              <input
                id="sync-amoroso"
                type="checkbox"
                checked={syncAmoroso}
                onChange={(e) => setSyncAmoroso(e.target.checked)}
                className="w-3.5 h-3.5 text-teal-600"
              />
              <span className="text-pink-500 font-bold">Amoroso</span>
            </label>
            <label className="flex items-center gap-1.5 truncate text-[11px] cursor-pointer bg-red-500/5 p-1 px-2 rounded-lg border border-red-500/10">
              <input
                id="sync-deudas"
                type="checkbox"
                checked={syncEconomico}
                onChange={(e) => setSyncEconomico(e.target.checked)}
                className="w-3.5 h-3.5 text-rose-600"
              />
              <span className="text-rose-500 font-bold">Alertas TDC 🚨</span>
            </label>
          </div>
        </div>

        {/* Google Calendar Visual grid (Days block mapping) */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          
          {/* Sunday */}
          <div className={`p-3 rounded-2xl border text-center ${darkMode ? "bg-stone-950/40 border-stone-850" : "bg-stone-50 border-stone-150"}`}>
            <span className="text-[10px] font-bold text-stone-500">DOMINGO</span>
            <div className="text-lg font-bold my-1 text-stone-400">07</div>
            <div className="space-y-1.5 mt-2">
              {syncedCalendarEvents.filter(ev => ev.Fecha === "2026-06-07").map(ev => (
                <div key={ev.ID_Evento} className={`p-1.5 rounded-lg text-left text-[9px] font-semibold leading-relaxed border ${
                  ev.Color === "red" 
                    ? "bg-rose-500/15 text-rose-450 border-rose-500/30 font-bold" 
                    : "bg-pink-500/10 text-pink-500 border-pink-500/20"
                }`}>
                  {ev.Titulo_Actividad}
                </div>
              ))}
            </div>
          </div>

          {/* Monday */}
          <div className={`p-3 rounded-2xl border text-center ${darkMode ? "bg-stone-950/40 border-stone-850" : "bg-stone-50 border-stone-150"}`}>
            <span className="text-[10px] font-bold text-stone-500">LUNES</span>
            <div className="text-lg font-bold my-1">08</div>
            <div className="space-y-1.5 mt-2">
              {syncedCalendarEvents.filter(ev => ev.Fecha === "2026-06-08").map(ev => (
                <div key={ev.ID_Evento} className="p-1.5 rounded-lg text-left text-[9px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {ev.Titulo_Actividad}
                </div>
              ))}
              {syncedCalendarEvents.filter(ev => ev.Fecha === "2026-06-08" && ev.Color === "red").map(ev => (
                <div key={ev.ID_Evento} className="p-1.5 rounded-lg text-left text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {ev.Titulo_Actividad}
                </div>
              ))}
            </div>
          </div>

          {/* Tuesday */}
          <div className={`p-3 rounded-2xl border text-center ${darkMode ? "bg-stone-950/40 border-stone-850" : "bg-stone-50 border-stone-150"}`}>
            <span className="text-[10px] font-bold text-stone-500">MARTES</span>
            <div className="text-lg font-bold my-1">09</div>
            <div className="space-y-1.5 mt-2">
              {syncedCalendarEvents.filter(ev => ev.Fecha === "2026-06-09").map(ev => (
                <div key={ev.ID_Evento} className="p-1.5 rounded-lg text-left text-[9px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  {ev.Titulo_Actividad}
                </div>
              ))}
            </div>
          </div>

          {/* Wednesday */}
          <div className={`p-3 rounded-2xl border text-center ${darkMode ? "bg-stone-950/40 border-stone-850" : "bg-stone-50 border-stone-150"}`}>
            <span className="text-[10px] font-bold text-stone-500">MIÉRCOLES</span>
            <div className="text-lg font-bold my-1">10</div>
            <div className="space-y-1.5 mt-2">
              {syncedCalendarEvents.filter(ev => ev.Fecha === "2026-06-10").map(ev => {
                const isRed = ev.Color === "red" || ev.ID_Evento.includes("auto-");
                return (
                  <div key={ev.ID_Evento} className={`p-1.5 rounded-lg text-left text-[9px] border ${
                    isRed 
                      ? "bg-rose-500/15 text-rose-450 border-red-500/35 font-bold" 
                      : "bg-teal-500/10 text-teal-400 border-teal-500/20"
                  }`}>
                    {ev.Titulo_Actividad}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Thursday */}
          <div className={`p-3 rounded-2xl border text-center ${darkMode ? "bg-stone-950/40 border-stone-850" : "bg-stone-50 border-stone-150"}`}>
            <span className="text-[10px] font-bold text-stone-500">JUEVES</span>
            <div className="text-lg font-bold my-1">11</div>
            <div className="space-y-1.5 mt-2">
              {syncedCalendarEvents.filter(ev => ev.Fecha === "2026-06-11").map(ev => (
                <div key={ev.ID_Evento} className="p-1.5 rounded-lg text-left text-[9px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {ev.Titulo_Actividad}
                </div>
              ))}
            </div>
          </div>

          {/* Friday */}
          <div className={`p-3 rounded-2xl border text-center ${darkMode ? "bg-stone-950/40 border-stone-850" : "bg-stone-50 border-stone-150"}`}>
            <span className="text-[10px] font-bold text-stone-500">VIERNES</span>
            <div className="text-lg font-bold my-1">12</div>
            <div className="space-y-1.5 mt-2">
              {syncedCalendarEvents.filter(ev => ev.Fecha === "2026-06-12" || ev.Fecha === "2026-06-12").map(ev => {
                const styleMap: Record<string, string> = {
                  green: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                  blue: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
                  red: "bg-rose-500/15 text-rose-450 border border-rose-500/30 font-bold"
                };
                return (
                  <div key={ev.ID_Evento} className={`p-1.5 rounded-lg text-left text-[9px] font-semibold ${styleMap[ev.Color] || "bg-teal-500/10 text-teal-400"}`}>
                    {ev.Titulo_Actividad}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Saturday (and others) */}
          <div className={`p-3 rounded-2xl border text-center ${darkMode ? "bg-stone-950/40 border-stone-850" : "bg-stone-50 border-stone-150"}`}>
            <span className="text-[10px] font-bold text-stone-500">SÁBADO</span>
            <div className="text-lg font-bold my-1">13</div>
            <div className="space-y-1.5 mt-2">
              {syncedCalendarEvents.filter(ev => ev.Fecha === "2026-06-13").map(ev => (
                <div key={ev.ID_Evento} className="p-1.5 rounded-lg text-left text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {ev.Titulo_Actividad}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* CROSS-IMPACT INTELLIGENT RULE CARDS MONITORS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Rule 2 Monitor Card */}
        <div className={`p-5 rounded-2xl border ${
          healthRuleCalculation.exceeded 
            ? darkMode ? "bg-rose-950/20 border-rose-900/30 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-900"
            : (healthRuleCalculation.actualPersonalSpent <= healthRuleCalculation.adjustedPersonalBudget)
              ? darkMode ? "bg-emerald-950/15 border-emerald-900/20 text-emerald-400" : "bg-emerald-50 border-emerald-150 text-emerald-900"
              : darkMode ? "bg-stone-900/40 border-stone-850" : "bg-stone-50 border-stone-150"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h4 className="font-sans font-semibold text-xs uppercase tracking-wider text-stone-400">
              Cross-Impact: Pilar Salud 🩺 ➔ Personal
            </h4>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-400 font-medium">Gasto en Salud:</span>
              <span className="font-mono font-semibold text-rose-400">${healthRuleCalculation.gastosalud.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs border-b pb-2 border-stone-800">
              <span className="text-stone-400 font-medium">Pto. Personal Base ({((activeUser.Salud_Personal_Base_Porcentaje ?? 0.20) * 100).toFixed(0)}%):</span>
              <span className="font-mono">${healthRuleCalculation.basePersonalBudget.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs pt-1">
              <span className="font-bold">Presupuesto Personal Ajustado:</span>
              <span className="font-mono font-bold text-teal-400">${healthRuleCalculation.adjustedPersonalBudget.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-400 font-medium">Gastado en Personal:</span>
              <span className="font-mono font-bold">${healthRuleCalculation.actualPersonalSpent.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-800/50 flex gap-2 items-start text-[10px]">
            {healthRuleCalculation.exceeded ? (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Exceso detectado:</strong> Tus egresos en Salud han reducido tu presupuesto Personal. Te has sobregirado por <strong>${(healthRuleCalculation.actualPersonalSpent - healthRuleCalculation.adjustedPersonalBudget).toFixed(2)}</strong>. Reduce tus gastos de entretenimiento.
                </p>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed text-stone-400">
                  <strong>Estatus Equilibrado:</strong> Cumples el cross-impact. Tu presupuesto disponible en pilar Personal se ajustó correctamente absorbiendo el costo de Salud.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Rule 3 Monitor Card */}
        <div className={`p-5 rounded-2xl border ${
          schoolPriorityCalculation.triggered
            ? darkMode ? "bg-amber-950/20 border-amber-900/30 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-900"
            : darkMode ? "bg-stone-900/40 border-stone-850" : "bg-stone-50 border-stone-150"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="w-4 h-4 text-cyan-400" />
            <h4 className="font-sans font-semibold text-xs uppercase tracking-wider text-stone-400">
              Escolar / Laboral Inversiones 🎓
            </h4>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-400 font-medium">Gastado en Escolar / Laboral:</span>
              <span className="font-mono font-semibold">${schoolPriorityCalculation.totalSpent.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs border-b pb-2 border-stone-850">
              <span className="text-stone-400 font-medium">Límite Proyectado Metas:</span>
              <span className="font-mono">${schoolPriorityCalculation.totalBudget.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs pt-1">
              <span className="font-bold">Descalce / Sobreinversión:</span>
              <span className={`font-mono font-bold ${schoolPriorityCalculation.triggered ? "text-amber-500" : "text-stone-400"}`}>
                ${schoolPriorityCalculation.exceededAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-850 flex gap-2 items-start text-[10px]">
            {schoolPriorityCalculation.triggered ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Acción Propuesta:</strong> Has sobrepasado el límite escolar prioritario por <strong>${schoolPriorityCalculation.exceededAmount.toFixed(2)}</strong>. El sistema recomienda recortar un 15% de gastos Variables en Personal y Amoroso para mitigar.
                </p>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed text-stone-400">
                  <strong>Óptimo:</strong> Tus inversiones de alta prioridad en capacitación y desarrollo escolar están dentro del marco seguro de presupuesto.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Rule 4 Monitor Card */}
        <div className={`p-5 rounded-2xl border ${
          amorosoCapCalculation.capActive
            ? darkMode ? "bg-rose-950/20 border-rose-900/30 text-rose-450" : "bg-rose-50 border-rose-200 text-rose-900"
            : darkMode ? "bg-stone-900/40 border-stone-850" : "bg-stone-50 border-stone-150"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-pink-400" />
            <h4 className="font-sans font-semibold text-xs uppercase tracking-wider text-stone-400">
              Tope Amoroso / Social Coping 💖
            </h4>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-400 font-medium">Pago No-Ints. de TDC:</span>
              <span className="font-mono font-semibold text-rose-400">${amorosoCapCalculation.totalNoInteresesPay.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs border-b pb-2 border-stone-850">
              <span className="text-stone-400 font-medium">Umbral Seguro de Deuda (30% Inc):</span>
              <span className="font-mono">${amorosoCapCalculation.limitRatio.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs pt-1">
              <span className="font-bold">Tope Máx Amoroso permitido:</span>
              <span className={`font-mono font-bold ${amorosoCapCalculation.capActive ? "text-rose-500" : "text-emerald-400"}`}>
                ${amorosoCapCalculation.maxAmorosoAllowed.toFixed(2)} ({amorosoCapCalculation.capActive ? "Congelado al 5%" : `${((activeUser.Tope_Amoroso_Porcentaje ?? 0.3) * 100).toFixed(0)}%`})
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-400 font-medium">Gastado en Amoroso:</span>
              <span className="font-mono font-bold">${amorosoCapCalculation.actualAmorosoSpent.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-850 flex gap-2 items-start text-[10px]">
            {amorosoCapCalculation.capActive ? (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5 animate-pulse" />
                <p className="leading-relaxed">
                  <strong>🚨 CANDADO DE AMOROSO ACTIVO:</strong> Tu obligación no-generadora de intereses supera el 30% de tus ingresos. Tu presupuesto amoroso ha sido <strong>congelado al 5%</strong>.
                </p>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed text-stone-400">
                  <strong>Estatus Libre:</strong> Tu nivel de apalancamiento es menor al 30% seguro, permitiéndote disponer de hasta el {((activeUser.Tope_Amoroso_Porcentaje ?? 0.3) * 100).toFixed(0)}% de tu dinero en recreación y salidas de pareja.
                </p>
              </>
            )}
          </div>
        </div>

      </div>

      {/* BOTTOM VISUALIZATIONS: RECHARTS BUDGET LIMIT PIE CHART & PROPORTION TRACKING */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pie: Distribution of spent across pilares */}
        <div className={`p-6 rounded-3xl border ${
          darkMode ? "bg-stone-900 border-stone-850" : "bg-white border-stone-200"
        }`}>
          <h2 className={`font-sans font-bold text-xs uppercase tracking-wider mb-4 ${darkMode ? "text-white" : "text-stone-900"}`}>
            Distribución Real de Egresos por Pilar Base (Gastado)
          </h2>
          {pilarChartData.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-500">No hay egresos registrados para mostrar en el gráfico de pastel.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pilarChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pilarChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: darkMode ? "#1c1917" : "#fff", 
                      borderColor: darkMode ? "#2e2a24" : "#e2e8f0",
                      borderRadius: "12px",
                      color: darkMode ? "#fff" : "#000",
                      fontSize: "11px"
                    }} 
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "10.5px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bar Chart: 50-30-20 Actual percentages vs Target Limit */}
        <div className={`p-6 rounded-3xl border ${
          darkMode ? "bg-stone-900 border-stone-850" : "bg-white border-stone-200"
        }`}>
          <h2 className={`font-sans font-bold text-xs uppercase tracking-wider mb-4 ${darkMode ? "text-white" : "text-stone-900"}`}>
            Senda de Estabilidad Financiera (Porcentajes Reales vs Regla 50/30/20)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetCheckData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#888888" fontSize={9.5} tickLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} unit="%" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: darkMode ? "#1c1917" : "#fff", 
                    borderColor: darkMode ? "#2e2a24" : "#e2e8f0",
                    borderRadius: "12px",
                    color: darkMode ? "#fff" : "#000",
                    fontSize: "11px"
                  }} 
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "10.5px" }} />
                <Bar dataKey="Actual" name="Tu Porcentaje Real" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Limite" name="Techo Recomendado" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
