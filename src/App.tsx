import React, { useState, useEffect } from "react";
import ThemeToggle from "./components/ThemeToggle";
import DashboardTab from "./components/DashboardTab";
import SheetsSimulatorTab from "./components/SheetsSimulatorTab";
import GeminiAuditTab from "./components/GeminiAuditTab";
import ScriptEngineTab from "./components/ScriptEngineTab";
import WorkspaceSyncTab from "./components/WorkspaceSyncTab";
import AuthPortal from "./components/AuthPortal";
import { 
  INITIAL_INGRESOS, 
  INITIAL_EGRESOS, 
  INITIAL_DEUDAS, 
  INITIAL_METAS,
  INITIAL_USUARIOS,
  INITIAL_EVENTOS
} from "./data/initialData";
import { 
  Ingreso, 
  Egreso, 
  Deuda, 
  MetaPilar, 
  Usuario, 
  AgendaEvento 
} from "./types";
import { 
  Building2, 
  BarChart3, 
  Database, 
  Cpu, 
  FileCode,
  LogOut,
  Sliders,
  ShieldCheck,
  Cloud
} from "lucide-react";

export default function App() {
  // Theme Management (Default to true for immediate high-contrast dark tone)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("pilar5_theme");
    return saved ? saved === "dark" : true;
  });

  // SaaS Multi-User Tenant States
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => {
    const saved = localStorage.getItem("pilar5_usuarios");
    return saved ? JSON.parse(saved) : INITIAL_USUARIOS;
  });

  const [activeUserId, setActiveUserId] = useState<string>(() => {
    const saved = localStorage.getItem("pilar5_active_user_id");
    return saved ? saved : "user-salvador-gomez-11111";
  });

  // Independent Login/Sign-Up Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem("pilar5_authenticated");
    return saved === "true";
  });

  // Global Multi-User Datalake datasets
  const [ingresos, setIngresos] = useState<Ingreso[]>(() => {
    const saved = localStorage.getItem("pilar5_ingresos");
    return saved ? JSON.parse(saved) : INITIAL_INGRESOS;
  });

  const [egresos, setEgresos] = useState<Egreso[]>(() => {
    const saved = localStorage.getItem("pilar5_egresos");
    return saved ? JSON.parse(saved) : INITIAL_EGRESOS;
  });

  const [deudas, setDeudas] = useState<Deuda[]>(() => {
    const saved = localStorage.getItem("pilar5_deudas");
    return saved ? JSON.parse(saved) : INITIAL_DEUDAS;
  });

  const [metas, setMetas] = useState<MetaPilar[]>(() => {
    const saved = localStorage.getItem("pilar5_metas");
    return saved ? JSON.parse(saved) : INITIAL_METAS;
  });

  const [eventos, setEventos] = useState<AgendaEvento[]>(() => {
    const saved = localStorage.getItem("pilar5_eventos");
    return saved ? JSON.parse(saved) : INITIAL_EVENTOS;
  });

  const [activeTab, setActiveTab] = useState<"dashboard" | "sheets" | "ia" | "script" | "workspace">("dashboard");
  const [showAdminConsole, setShowAdminConsole] = useState<boolean>(false);

  // Sync back to storage on state changes
  useEffect(() => {
    localStorage.setItem("pilar5_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("pilar5_usuarios", JSON.stringify(usuarios));
  }, [usuarios]);

  useEffect(() => {
    localStorage.setItem("pilar5_active_user_id", activeUserId);
  }, [activeUserId]);

  useEffect(() => {
    localStorage.setItem("pilar5_authenticated", isAuthenticated ? "true" : "false");
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem("pilar5_ingresos", JSON.stringify(ingresos));
  }, [ingresos]);

  useEffect(() => {
    localStorage.setItem("pilar5_egresos", JSON.stringify(egresos));
  }, [egresos]);

  useEffect(() => {
    localStorage.setItem("pilar5_deudas", JSON.stringify(deudas));
  }, [deudas]);

  useEffect(() => {
    localStorage.setItem("pilar5_metas", JSON.stringify(metas));
  }, [metas]);

  useEffect(() => {
    localStorage.setItem("pilar5_eventos", JSON.stringify(eventos));
  }, [eventos]);

  // Active User Profile metadata dereference
  const activeUser = usuarios.find(u => u.ID_Usuario === activeUserId) || usuarios[0];

  // Active User Scoped Datasets (Logical isolation index querying)
  const filteredIngresos = ingresos.filter(i => i.ID_Usuario === activeUserId);
  const filteredEgresos = egresos.filter(e => e.ID_Usuario === activeUserId);
  const filteredDeudas = deudas.filter(d => d.ID_Usuario === activeUserId);
  const filteredMetas = metas.filter(m => m.ID_Usuario === activeUserId);
  const filteredEventos = eventos.filter(ev => ev.ID_Usuario === activeUserId);

  // SaaS Relational Interceptor State setters
  const handleSetIngresos = (action: React.SetStateAction<Ingreso[]>) => {
    setIngresos((prev) => {
      const currentFiltered = prev.filter(i => i.ID_Usuario === activeUserId);
      const updatedFiltered = typeof action === "function" ? action(currentFiltered) : action;
      const fixedFiltered = updatedFiltered.map(item => ({
        ...item,
        ID_Usuario: item.ID_Usuario || activeUserId
      }));
      const otherUsers = prev.filter(i => i.ID_Usuario !== activeUserId);
      return [...fixedFiltered, ...otherUsers];
    });
  };

  const handleSetEgresos = (action: React.SetStateAction<Egreso[]>) => {
    setEgresos((prev) => {
      const currentFiltered = prev.filter(e => e.ID_Usuario === activeUserId);
      const updatedFiltered = typeof action === "function" ? action(currentFiltered) : action;
      const fixedFiltered = updatedFiltered.map(item => ({
        ...item,
        ID_Usuario: item.ID_Usuario || activeUserId
      }));
      const otherUsers = prev.filter(e => e.ID_Usuario !== activeUserId);
      return [...fixedFiltered, ...otherUsers];
    });
  };

  const handleSetDeudas = (action: React.SetStateAction<Deuda[]>) => {
    setDeudas((prev) => {
      const currentFiltered = prev.filter(d => d.ID_Usuario === activeUserId);
      const updatedFiltered = typeof action === "function" ? action(currentFiltered) : action;
      const fixedFiltered = updatedFiltered.map(item => ({
        ...item,
        ID_Usuario: item.ID_Usuario || activeUserId
      }));
      const otherUsers = prev.filter(d => d.ID_Usuario !== activeUserId);
      return [...fixedFiltered, ...otherUsers];
    });
  };

  const handleSetMetas = (action: React.SetStateAction<MetaPilar[]>) => {
    setMetas((prev) => {
      const currentFiltered = prev.filter(m => m.ID_Usuario === activeUserId);
      const updatedFiltered = typeof action === "function" ? action(currentFiltered) : action;
      const fixedFiltered = updatedFiltered.map(item => ({
        ...item,
        ID_Usuario: item.ID_Usuario || activeUserId
      }));
      const otherUsers = prev.filter(m => m.ID_Usuario !== activeUserId);
      return [...fixedFiltered, ...otherUsers];
    });
  };

  const handleSetEventos = (action: React.SetStateAction<AgendaEvento[]>) => {
    setEventos((prev) => {
      const currentFiltered = prev.filter(ev => ev.ID_Usuario === activeUserId);
      const updatedFiltered = typeof action === "function" ? action(currentFiltered) : action;
      const fixedFiltered = updatedFiltered.map(item => ({
        ...item,
        ID_Usuario: item.ID_Usuario || activeUserId
      }));
      const otherUsers = prev.filter(ev => ev.ID_Usuario !== activeUserId);
      return [...fixedFiltered, ...otherUsers];
    });
  };

  const handleLoginSuccess = (userId: string) => {
    setActiveUserId(userId);
    setIsAuthenticated(true);
  };

  const handleRegisterSuccess = (newUser: Usuario) => {
    setUsuarios((prev) => [...prev, newUser]);
    
    // Automatically provision baseline instruments (TABLA C) on backend simulation to bypass manual setups
    const defaultDebit: Deuda = {
      ID_Usuario: newUser.ID_Usuario,
      ID_Instrumento: `card-${newUser.ID_Usuario}-debit`,
      ID_Tarjeta: `card-${newUser.ID_Usuario}-debit`,
      Nombre_Tarjeta: "SaaS Débito Ahorro",
      Nombre_Instrumento: "SaaS Débito Ahorro",
      Tipo: "Débito" as any,
      Limite_Credito: 0,
      Saldo_Disponible: 3000.00, // Preloaded trial checking balance
      Saldo_Al_Corte: 0,
      Deuda_Actual: 0,
      Pago_Minimo: 0,
      Pago_Para_No_Generar_Intereses: 0,
      Fecha_Corte: 1,
      Fecha_Limite_Pago: 1,
      Tasa_Interes_Anual: 0,
      Balance_Total_Pendiente: 0,
      Pago_Minimo_Mensual: 0
    };

    const defaultCredit: Deuda = {
      ID_Usuario: newUser.ID_Usuario,
      ID_Instrumento: `card-${newUser.ID_Usuario}-credit`,
      ID_Tarjeta: `card-${newUser.ID_Usuario}-credit`,
      Nombre_Tarjeta: "TDC Oro Premium",
      Nombre_Instrumento: "TDC Oro Premium",
      Tipo: "Crédito" as any,
      Limite_Credito: 5000.00,
      Saldo_Disponible: 5000.00,
      Saldo_Al_Corte: 0,
      Deuda_Actual: 0,
      Pago_Minimo: 0,
      Pago_Para_No_Generar_Intereses: 0,
      Fecha_Corte: 10,
      Fecha_Limite_Pago: 30,
      Tasa_Interes_Anual: 42.0,
      Balance_Total_Pendiente: 0,
      Pago_Minimo_Mensual: 0
    };

    // Prepopulate some default metas
    const defaultMeta1: MetaPilar = {
      ID_Usuario: newUser.ID_Usuario,
      ID_Meta: `meta-${newUser.ID_Usuario}-1`,
      Pilar: "Salud" as any,
      Meta_SMART: "Realizar entrenamiento cardiovascular de 30 minutos, 4 veces por semana.",
      Indicador_Exito: "Régimen del gimnasio certificado en bitácora",
      Estado: "En Proceso" as any,
      Presupuesto_Asignado: 80.00
    };

    const defaultMeta2: MetaPilar = {
      ID_Usuario: newUser.ID_Usuario,
      ID_Meta: `meta-${newUser.ID_Usuario}-2`,
      Pilar: "Escolar" as any,
      Meta_SMART: "Completar la certificación técnica de Desarrollo Frontend Full-Stack.",
      Indicador_Exito: "Certificado académico emitido",
      Estado: "En Proceso" as any,
      Presupuesto_Asignado: 250.00
    };

    // Prepopulate default Corte/Pago alarms for the credit card in TABLA E
    const creditCorteEvent: AgendaEvento = {
      ID_Usuario: newUser.ID_Usuario,
      ID_Evento: `evt-${newUser.ID_Usuario}-corte`,
      ID_Actividad: `evt-${newUser.ID_Usuario}-corte`,
      Tipo_Agenda: "Agenda_Personal",
      Pilar: "Económico" as any,
      Pilar_Asociado: "Económico" as any,
      Titulo_Actividad: "✂️ Corte de Tarjeta: TDC Oro Premium",
      Titulo: "✂️ Corte de Tarjeta: TDC Oro Premium",
      Descripcion_Detallada: "Fecha de corte del plástico. Liquidar remanente recomendado.",
      Descripcion: "Fecha de corte del plástico. Liquidar remanente recomendado.",
      Fecha_Hora_Inicio: "2026-06-10T09:00",
      Fecha_Hora_Fin: "2026-06-10T10:00",
      Requiere_Pago: false,
      ID_Egreso_Asociado: null,
      Fecha: "2026-06-10",
      Tipo_Evento: "Corte de Tarjeta",
      Color: "orange",
      Alerta_Descalce: false
    };

    const creditPagoEvent: AgendaEvento = {
      ID_Usuario: newUser.ID_Usuario,
      ID_Evento: `evt-${newUser.ID_Usuario}-pago`,
      ID_Actividad: `evt-${newUser.ID_Usuario}-pago`,
      Tipo_Agenda: "Agenda_Personal",
      Pilar: "Económico" as any,
      Pilar_Asociado: "Económico" as any,
      Titulo_Actividad: "⚠️ Fecha Límite: Pagar TDC Oro Premium",
      Titulo: "⚠️ Fecha Límite: Pagar TDC Oro Premium",
      Descripcion_Detallada: "Riesgo alto de intereses moratorios si no se inyecta liquidez.",
      Descripcion: "Riesgo alto de intereses moratorios si no se inyecta liquidez.",
      Fecha_Hora_Inicio: "2026-06-30T09:00",
      Fecha_Hora_Fin: "2026-06-30T10:00",
      Requiere_Pago: false,
      ID_Egreso_Asociado: null,
      Fecha: "2026-06-30",
      Tipo_Evento: "Límite de Pago",
      Color: "red",
      Alerta_Descalce: false
    };

    setDeudas((prev) => [...prev, defaultDebit, defaultCredit]);
    setMetas((prev) => [...prev, defaultMeta1, defaultMeta2]);
    setEventos((prev) => [...prev, creditCorteEvent, creditPagoEvent]);

    setActiveUserId(newUser.ID_Usuario);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleResetApplicationData = () => {
    if (window.confirm("¿Seguro que deseas reiniciar los datos de todos los inquilinos de la base de datos de simulación?")) {
      setUsuarios(INITIAL_USUARIOS);
      setActiveUserId("user-salvador-gomez-11111");
      setIngresos(INITIAL_INGRESOS);
      setEgresos(INITIAL_EGRESOS);
      setDeudas(INITIAL_DEUDAS);
      setMetas(INITIAL_METAS);
      setEventos(INITIAL_EVENTOS);
      setIsAuthenticated(false);
    }
  };

  // If user session is not authenticated, render the elite landing / login portal strictly
  if (!isAuthenticated) {
    return (
      <AuthPortal
        darkMode={darkMode}
        usuarios={usuarios}
        onLoginSuccess={handleLoginSuccess}
        onRegisterSuccess={handleRegisterSuccess}
      />
    );
  }

  // Render the authenticated Workspace Dashboard
  return (
    <div className={`min-h-screen transition-all duration-300 font-sans pb-16 ${
      darkMode ? "bg-stone-950 text-stone-200 dark" : "bg-stone-50 text-stone-800"
    }`}>
      
      {/* SaaS Premium Header Bar */}
      <header className={`sticky top-0 z-50 backdrop-blur border-b transition-all ${
        darkMode ? "bg-stone-950/80 border-stone-900" : "bg-white/80 border-stone-200"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center p-2 rounded-xl bg-teal-500/10 text-teal-600">
              <Building2 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className={`font-sans font-semibold tracking-tight text-sm md:text-base leading-none mb-1 ${
                darkMode ? "text-white" : "text-stone-900"
              }`}>
                Reconstrucción Personal y Finanzas
              </h1>
              <p className="text-stone-500 text-[10px] uppercase font-bold tracking-wider leading-none">
                ECOSISTEMA DE CRECIMIENTO DE 5 PILARES
              </p>
            </div>
          </div>

          {/* Connected Session Controls */}
          <div className="flex items-center justify-between sm:justify-end gap-3">
            
            {/* User Badge Profile */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
              darkMode ? "bg-stone-900/60 border-stone-800" : "bg-stone-100 border-stone-200"
            }`}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-left">
                <p className={`text-[10px] font-bold leading-none mb-0.5 ${darkMode ? "text-stone-300" : "text-stone-700"}`}>
                  {activeUser.Nombre_Usuario}
                </p>
                <p className="text-[8px] font-semibold text-stone-500 uppercase tracking-widest leading-none">
                  {activeUser.Plan_Suscripcion}
                </p>
              </div>
            </div>

            {/* Actions Deck */}
            <div className="flex items-center gap-1.5">
              <ThemeToggle darkMode={darkMode} onToggle={() => setDarkMode(!darkMode)} />

              <button
                id="btn-admin-console"
                title="Consola de Administración de Inquilinos"
                onClick={() => setShowAdminConsole(!showAdminConsole)}
                className={`p-2 rounded-xl border cursor-pointer hover:bg-stone-500/10 transition-all ${
                  showAdminConsole 
                    ? "bg-teal-500/10 text-teal-400 border-teal-500/25"
                    : darkMode ? "bg-stone-900/40 border-stone-800 text-stone-400" : "bg-white border-stone-200 text-stone-500"
                }`}
              >
                <Sliders className="w-4 h-4" />
              </button>

              <button
                id="btn-logout"
                title="Cerrar Sesión Activa"
                onClick={handleLogout}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-all cursor-pointer border border-rose-500/10"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        
        {/* Admin Console Selector (Hidden for standard sessions, toggleable for diagnostic evaluation) */}
        {showAdminConsole && (
          <div className={`p-5 rounded-3xl border animate-fadeIn ${
            darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-200 shadow-md"
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-teal-400 animate-pulse" />
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-white" : "text-stone-900"}`}>
                  Consola de Inquilinos Administrativa (Auditoría Cloud)
                </h3>
                <p className="text-[10px] text-stone-500">
                  Esta barra de simulación permite forzar el cambio de sesión a otros UUIDs para comprobar el aislamiento absoluto de datos.
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {usuarios.map(u => (
                <button
                  key={u.ID_Usuario}
                  id={`admin-switch-${u.ID_Usuario.slice(14,20)}`}
                  onClick={() => setActiveUserId(u.ID_Usuario)}
                  className={`px-3 py-1.5 rounded-xl text-left border text-[10px] transition-all cursor-pointer font-sans ${
                    u.ID_Usuario === activeUserId
                      ? "bg-teal-500/10 text-teal-400 border-teal-500/30 font-bold"
                      : darkMode ? "bg-stone-950 border-stone-850 text-stone-500 hover:text-stone-300" : "bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-800"
                  }`}
                >
                  {u.Nombre_Usuario} ({u.Gmail_Sincronizado})
                </button>
              ))}
              
              <button
                id="btn-admin-reset"
                onClick={handleResetApplicationData}
                className="ml-auto py-1.5 px-3 rounded-xl border border-rose-500/20 text-rose-500 bg-rose-500/5 text-[10px] uppercase font-bold tracking-wider hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
              >
                Inyectar Datos Limpios / Reset
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs (Smooth styling) */}
        <div className={`flex items-center p-1.5 rounded-xl border max-w-2xl ${
          darkMode ? "bg-stone-900/40 border-stone-900" : "bg-stone-100 border-stone-200"
        }`}>
          <button
            id="tab-dashboard"
            onClick={() => setActiveTab("dashboard")}
            className={`cursor-pointer flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeTab === "dashboard"
                ? darkMode
                  ? "bg-stone-800 text-white border border-stone-700 shadow-sm"
                  : "bg-white text-stone-900 border border-stone-250 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Consola de Gobierno</span>
          </button>

          <button
            id="tab-sheets"
            onClick={() => setActiveTab("sheets")}
            className={`cursor-pointer flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeTab === "sheets"
                ? darkMode
                  ? "bg-stone-800 text-white border border-stone-700 shadow-sm"
                  : "bg-white text-stone-900 border border-stone-250 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Simulador Sheets (RAW)</span>
          </button>

          <button
            id="tab-ia"
            onClick={() => setActiveTab("ia")}
            className={`cursor-pointer flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeTab === "ia"
                ? darkMode
                  ? "bg-stone-800 text-white border border-stone-700 shadow-sm"
                  : "bg-white text-stone-900 border border-stone-250 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Consultores Gemini Pro</span>
          </button>

          <button
            id="tab-script"
            onClick={() => setActiveTab("script")}
            className={`cursor-pointer flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeTab === "script"
                ? darkMode
                  ? "bg-stone-800 text-white border border-stone-700 shadow-sm"
                  : "bg-white text-stone-900 border border-stone-250 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Apps Script Engine</span>
          </button>

          <button
            id="tab-workspace"
            onClick={() => setActiveTab("workspace")}
            className={`cursor-pointer flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeTab === "workspace"
                ? darkMode
                  ? "bg-stone-800 text-white border border-stone-700 shadow-sm"
                  : "bg-white text-stone-900 border border-stone-250 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Sincronizar Workspace</span>
          </button>
        </div>

        {/* Tab Contents Frame */}
        <section className="transition-opacity duration-300">
          {activeTab === "dashboard" && (
            <DashboardTab 
              darkMode={darkMode} 
              ingresos={filteredIngresos} 
              egresos={filteredEgresos} 
              deudas={filteredDeudas} 
              metas={filteredMetas}
              eventos={filteredEventos}
              setIngresos={handleSetIngresos}
              setEgresos={handleSetEgresos}
              setDeudas={handleSetDeudas}
              setMetas={handleSetMetas}
              setEventos={handleSetEventos}
              activeUser={activeUser}
            />
          )}

          {activeTab === "sheets" && (
            <SheetsSimulatorTab 
              darkMode={darkMode} 
              ingresos={filteredIngresos} 
              egresos={filteredEgresos} 
              deudas={filteredDeudas} // cards (TDC and checking)
              metas={filteredMetas}
              eventos={filteredEventos}
              setIngresos={handleSetIngresos}
              setEgresos={handleSetEgresos}
              setDeudas={handleSetDeudas}
              setMetas={handleSetMetas}
              setEventos={handleSetEventos}
              resetToInitial={handleResetApplicationData}
            />
          )}

          {activeTab === "ia" && (
            <GeminiAuditTab 
              darkMode={darkMode} 
              activeUser={activeUser}
              ingresos={filteredIngresos} 
              egresos={filteredEgresos} 
              deudas={filteredDeudas} // cards
              metas={filteredMetas} 
              eventos={filteredEventos} // activities
            />
          )}

          {activeTab === "script" && (
            <ScriptEngineTab darkMode={darkMode} />
          )}

          {activeTab === "workspace" && (
            <WorkspaceSyncTab 
              darkMode={darkMode} 
              activeUser={activeUser}
              eventos={eventos}
              ingresos={ingresos}
              egresos={egresos}
              deudas={deudas}
              metas={metas}
              setEventos={setEventos}
            />
          )}
        </section>
      </main>
    </div>
  );
}
