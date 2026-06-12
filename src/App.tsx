import React, { useState, useEffect } from "react";
import ThemeToggle from "./components/ThemeToggle";
import DashboardTab from "./components/DashboardTab";
import SheetsSimulatorTab from "./components/SheetsSimulatorTab";
import GeminiAuditTab from "./components/GeminiAuditTab";
import PilaresTab from "./components/PilaresTab";
import ProfileTab from "./components/ProfileTab";

import WorkspaceSyncTab from "./components/WorkspaceSyncTab";
import AuthPortal from "./components/AuthPortal";
import { 
  Ingreso, 
  Egreso, 
  Deuda, 
  MetaPilar, 
  Usuario, 
  AgendaEvento,
  Pilar,
  CorrelacionPilar,
  Micrometa,
  Prestamo
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
  Cloud,
  Target,
  User,
  Bell,
  CheckCircle,
  XCircle,
  X
} from "lucide-react";

export default function App() {
  // === SYNCHRONOUS GOOGLE TOKEN EXPIRY VALIDATION ===
  // Clean up expired Google tokens immediately on initial render before children read it
  const activeUserIdForSyncCheck = localStorage.getItem("pilar5_active_user_id") || "";
  if (activeUserIdForSyncCheck) {
    const storedToken = localStorage.getItem(`pilar5_g_token_${activeUserIdForSyncCheck}`);
    const expiresAt = localStorage.getItem(`pilar5_g_expires_at_${activeUserIdForSyncCheck}`);
    if (storedToken) {
      const isExpired = expiresAt ? Date.now() > parseInt(expiresAt) : false;
      if (isExpired) {
        localStorage.removeItem(`pilar5_g_token_${activeUserIdForSyncCheck}`);
        localStorage.removeItem(`pilar5_g_connected_${activeUserIdForSyncCheck}`);
        localStorage.removeItem(`pilar5_g_user_${activeUserIdForSyncCheck}`);
        localStorage.removeItem(`pilar5_g_expires_at_${activeUserIdForSyncCheck}`);
      }
    }
  }

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("pilar5_theme");
    return saved ? saved === "dark" : true;
  });

  const [activeUserId, setActiveUserId] = useState<string>(() => {
    return localStorage.getItem("pilar5_active_user_id") || "";
  });

  const [activeUser, setActiveUser] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem("pilar5_active_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem("pilar5_authenticated");
    return saved === "true";
  });

  // Database datasets
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [egresos, setEgresos] = useState<Egreso[]>([]);
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [metas, setMetas] = useState<MetaPilar[]>([]);
  const [eventos, setEventos] = useState<AgendaEvento[]>([]);
  const [pilares, setPilares] = useState<Pilar[]>([]);
  const [correlacionesPilares, setCorrelacionesPilares] = useState<CorrelacionPilar[]>([]);
  const [micrometas, setMicrometas] = useState<Micrometa[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);

  const [activeTab, setActiveTab] = useState<"dashboard" | "sheets" | "ia" | "pilares" | "perfil" | "workspace">("dashboard");
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState<boolean>(false);
  const [currency, setCurrency] = useState<string>("");
  const [googleClientId, setGoogleClientId] = useState<string>("");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [selectedDetailMm, setSelectedDetailMm] = useState<Micrometa | null>(null);
  const [highlightedMetaId, setHighlightedMetaId] = useState<string | null>(null);

  // Today's pending micrometas and their count
  const todayMicrometasAlerts = React.useMemo(() => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return micrometas.filter(m => m.Fecha_Planificada === todayStr && m.Estado === "Pendiente");
  }, [micrometas]);

  const todayAlertCount = todayMicrometasAlerts.length;

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          setGoogleClientId(data.googleClientId || "");
        }
      } catch (err) {
        console.error("Error fetching config:", err);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    const detectCurrency = async () => {
      try {
        const res = await fetch("/api/detect-currency");
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          const data = await res.json();
          if (data.currency) {
            setCurrency("");
          }
        }
      } catch {
        // Silently ignore — defaults to empty
      }
    };
    detectCurrency();
  }, []);

  // Sync back theme to storage
  useEffect(() => {
    localStorage.setItem("pilar5_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // === REAL GOOGLE OAUTH CALLBACK HANDLER ===
  useEffect(() => {
    const handleGoogleCallback = async () => {
      const hash = window.location.hash;
      if (!hash) return;

      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const expiresIn = params.get("expires_in") || "3600";
      if (!accessToken) return;

      setLoadingData(true);
      try {
        // 1. Fetch real user profile from Google UserInfo endpoint
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!userInfoRes.ok) {
          throw new Error("El token de acceso de Google no es válido o expiró.");
        }

        const info = await userInfoRes.json();

        const email = info.email.trim().toLowerCase();
        const name = info.name || "Usuario Google";
        const picture = info.picture || "";

        // Check if there is an active session
        const existingUserId = localStorage.getItem("pilar5_active_user_id");
        const existingUserStr = localStorage.getItem("pilar5_active_user");

        let userObj;
        if (existingUserId && existingUserStr) {
          userObj = JSON.parse(existingUserStr);
          // Call backend to link Google account to the logged-in user profile
          const linkRes = await fetch("/api/auth/google/link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: existingUserId, token: accessToken })
          });

          if (!linkRes.ok) {
            const errData = await linkRes.json();
            throw new Error(errData.error || "No se pudo vincular tu cuenta de Google.");
          }

          const linkData = await linkRes.json();
          userObj = linkData.user; // updated user detail with linked Google email
        } else {
          // Perform backend registration or login using Google Access Token directly
          const authRes = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: accessToken })
          });

          if (!authRes.ok) {
            const errData = await authRes.json();
            throw new Error(errData.error || "No se pudo registrar ni iniciar sesión con esta cuenta de Google.");
          }

          const authData = await authRes.json();
          userObj = authData.user;
        }

        // 3. Connect and persist Google token, status & expiry locally
        const expiresAt = Date.now() + parseInt(expiresIn) * 1000;
        localStorage.setItem(`pilar5_g_connected_${userObj.ID_Usuario}`, "true");
        localStorage.setItem(`pilar5_g_token_${userObj.ID_Usuario}`, accessToken);
        localStorage.setItem(`pilar5_g_expires_at_${userObj.ID_Usuario}`, expiresAt.toString());
        localStorage.setItem(`pilar5_g_user_${userObj.ID_Usuario}`, JSON.stringify({
          name: info.name,
          email: info.email,
          picture: info.picture
        }));

        // 4. Clean up hash from URL bar
        window.history.replaceState(null, "", window.location.pathname);

        // 5. Complete login trigger or update state
        if (!existingUserId || !existingUserStr) {
          handleLoginSuccess(userObj.ID_Usuario, userObj);
        } else {
          setActiveUserId(userObj.ID_Usuario);
          setActiveUser(userObj);
          setIsAuthenticated(true);
          const fetchRes = await fetch(`/api/data?userId=${userObj.ID_Usuario}`);
          if (fetchRes.ok) {
            const data = await fetchRes.json();
            setIngresos(data.ingresos || []);
            setEgresos(data.egresos || []);
            setDeudas(data.deudas || []);
            setMetas(data.metas || []);
            setEventos(data.eventos || []);
            setPilares(data.pilares || []);
            setCorrelacionesPilares(data.correlacionesPilares || []);
            setMicrometas(data.micrometas || []);
            setPrestamos(data.prestamos || []);
            setIsInitialLoadComplete(true);
          }
        }
      } catch (err: any) {
        console.error(err);
        alert(`Error al autenticar con Google: ${err.message || err}`);
      } finally {
        setLoadingData(false);
      }
    };

    handleGoogleCallback();
  }, []);

  const refreshUserData = React.useCallback(async () => {
    if (!activeUserId) return;
    try {
      const res = await fetch(`/api/data?userId=${activeUserId}`);
      if (res.ok) {
        const data = await res.json();
        setIngresos(data.ingresos || []);
        setEgresos(data.egresos || []);
        setDeudas(data.deudas || []);
        setMetas(data.metas || []);
        setEventos(data.eventos || []);
        setPilares(data.pilares || []);
        setCorrelacionesPilares(data.correlacionesPilares || []);
        setMicrometas(data.micrometas || []);
        setPrestamos(data.prestamos || []);
      }
    } catch (err) {
      console.error("Error refreshing user data:", err);
    }
  }, [activeUserId]);

  // === DB FETCH ON AUTH STATE CHANGE ===
  useEffect(() => {
    const fetchUserData = async () => {
      if (!isAuthenticated || !activeUserId) return;
      setLoadingData(true);
      await refreshUserData();
      setIsInitialLoadComplete(true);
      setLoadingData(false);
    };
    fetchUserData();
  }, [isAuthenticated, activeUserId, refreshUserData]);

  const handleUpdateMicrometaStatus = async (id: string, newStatus: "Completada" | "Cancelada") => {
    try {
      const mmToEdit = micrometas.find(m => m.ID_Micrometa === id);
      if (!mmToEdit) return;

      const updatedPayload = {
        ...mmToEdit,
        Estado: newStatus
      };

      const res = await fetch(`/api/micrometas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload)
      });

      if (res.ok) {
        await refreshUserData();
      } else {
        console.error("Fallo al actualizar el estado de la micrometa.");
      }
    } catch (error) {
      console.error("Error actualizando micrometa:", error);
    }
  };

  const handleLoginSuccess = (userId: string, userObj: Usuario) => {
    setActiveUserId(userId);
    setActiveUser(userObj);
    setIsAuthenticated(true);
    localStorage.setItem("pilar5_active_user_id", userId);
    localStorage.setItem("pilar5_active_user", JSON.stringify(userObj));
    localStorage.setItem("pilar5_authenticated", "true");
  };

  const handleRegisterSuccess = (newUser: Usuario) => {
    setActiveUserId(newUser.ID_Usuario);
    setActiveUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem("pilar5_active_user_id", newUser.ID_Usuario);
    localStorage.setItem("pilar5_active_user", JSON.stringify(newUser));
    localStorage.setItem("pilar5_authenticated", "true");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveUserId("");
    setActiveUser(null);
    localStorage.removeItem("pilar5_active_user_id");
    localStorage.removeItem("pilar5_active_user");
    localStorage.removeItem("pilar5_authenticated");
    setIngresos([]);
    setEgresos([]);
    setDeudas([]);
    setMetas([]);
    setEventos([]);
    setMicrometas([]);
    setPrestamos([]);
    setIsInitialLoadComplete(false);
  };

  const handleResetApplicationData = async () => {
    if (!activeUser) return;
    if (window.confirm("¿Seguro que deseas reiniciar los datos de tu cuenta? Se eliminarán permanentemente todos tus ingresos, egresos, tarjetas y actividades en la base de datos real.")) {
      try {
        const res = await fetch("/api/auth/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: activeUser.ID_Usuario })
        });
        if (res.ok) {
          alert("Datos reiniciados con éxito.");
          // Clear frontend states
          setIngresos([]);
          setEgresos([]);
          setDeudas([]);
          setMetas([]);
          setEventos([]);
          setMicrometas([]);
          handleLogout();
        } else {
          alert("Error al restablecer los datos en el servidor.");
        }
      } catch (err) {
        console.error(err);
        alert("Error de conexión al restablecer los datos.");
      }
    }
  };

  // Auth portal strictly if not logged in
  if (!isAuthenticated || !activeUser) {
    return (
      <AuthPortal
        darkMode={darkMode}
        usuarios={[]} // Compatibility prop
        onLoginSuccess={handleLoginSuccess}
        onRegisterSuccess={handleRegisterSuccess}
        googleClientId={googleClientId}
      />
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 font-sans pb-20 sm:pb-6 ${
      darkMode ? "bg-stone-950 text-stone-200 dark" : "bg-stone-50 text-stone-850"
    }`}>
      
      {/* SaaS Premium Header Bar */}
      <header className={`sticky top-0 z-50 backdrop-blur border-b transition-all ${
        darkMode ? "bg-stone-950/90 border-stone-900" : "bg-white/90 border-stone-150"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-row items-center justify-between gap-3">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center p-2 rounded-xl bg-teal-500/10 text-teal-600">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className={`font-semibold tracking-tight text-xs sm:text-sm leading-none mb-0.5 ${
                darkMode ? "text-white" : "text-stone-900"
              }`}>
                XPH Control Tower
              </h1>
              <p className="text-stone-500 text-[8px] uppercase font-bold tracking-wider leading-none hidden sm:block">
                Ecosistema de Crecimiento
              </p>
            </div>
          </div>

          {/* Right side: user badge + actions */}
          <div className="flex items-center gap-2">
            {/* 🔔 Alertas Desktop */}
            <button
              onClick={() => setIsNotificationsOpen(true)}
              className={`hidden sm:flex relative p-2 rounded-xl border transition-all cursor-pointer hover:ring-2 hover:ring-teal-500/30 ${
                darkMode ? "bg-stone-900/60 border-stone-800 hover:bg-stone-800 text-stone-300" : "bg-stone-100 border-stone-200 hover:bg-stone-200 text-stone-700"
              } ${isNotificationsOpen ? "ring-2 ring-teal-500/40 text-teal-500" : ""}`}
              title="Alertas de hoy"
            >
              <Bell className="w-4 h-4" />
              {todayAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center leading-none shadow-sm animate-pulse">
                  {todayAlertCount}
                </span>
              )}
            </button>

            {/* Actions Deck */}
            <div className="flex items-center gap-1.5">
              <ThemeToggle darkMode={darkMode} onToggle={() => setDarkMode(!darkMode)} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        
        {loadingData ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs text-stone-500 animate-pulse">Cargando tus datos desde la base de datos real...</p>
          </div>
        ) : (
          <>
            {/* Navigation Tabs — desktop only */}
            <div className={`no-print hidden sm:flex flex-wrap items-center p-1.5 rounded-2xl border max-w-4xl ${
              darkMode ? "bg-stone-900/40 border-stone-900" : "bg-stone-100 border-stone-200"
            }`}>
              <button
                id="tab-dashboard"
                onClick={() => setActiveTab("dashboard")}
                className={`cursor-pointer flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  activeTab === "dashboard"
                    ? darkMode
                      ? "bg-stone-800 text-white border border-stone-700 shadow-sm"
                      : "bg-white text-stone-900 border border-stone-250 shadow-sm"
                    : "text-stone-500 hover:text-stone-750"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Mi Dashboard</span>
              </button>

              <button
                id="tab-sheets"
                onClick={() => setActiveTab("sheets")}
                className={`cursor-pointer flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  activeTab === "sheets"
                    ? darkMode
                      ? "bg-stone-800 text-white border border-stone-700 shadow-sm"
                      : "bg-white text-stone-900 border border-stone-250 shadow-sm"
                    : "text-stone-500 hover:text-stone-750"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Mis Datos</span>
              </button>

              <button
                id="tab-pilares"
                onClick={() => setActiveTab("pilares")}
                className={`cursor-pointer flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  activeTab === "pilares"
                    ? darkMode
                      ? "bg-stone-800 text-white border border-stone-700 shadow-sm"
                      : "bg-white text-stone-900 border border-stone-250 shadow-sm"
                    : "text-stone-500 hover:text-stone-750"
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Mis Pilares</span>
              </button>

              <button
                id="tab-ia"
                onClick={() => setActiveTab("ia")}
                className={`cursor-pointer flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  activeTab === "ia"
                    ? darkMode
                      ? "bg-stone-800 text-white border border-stone-700 shadow-sm"
                      : "bg-white text-stone-900 border border-stone-250 shadow-sm"
                    : "text-stone-500 hover:text-stone-750"
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Auditoría IA</span>
              </button>

              <button
                id="tab-perfil"
                onClick={() => setActiveTab("perfil")}
                className={`cursor-pointer flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  activeTab === "perfil"
                    ? darkMode
                      ? "bg-stone-800 text-white border border-stone-700 shadow-sm"
                      : "bg-white text-stone-900 border border-stone-250 shadow-sm"
                    : "text-stone-500 hover:text-stone-750"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Mi Perfil</span>
              </button>

            </div>

            {/* Tab Contents Frame */}
            <section className="transition-opacity duration-300">
              {activeTab === "dashboard" && (
                <DashboardTab 
                  darkMode={darkMode} 
                  ingresos={ingresos} 
                  egresos={egresos} 
                  deudas={deudas} 
                  metas={metas}
                  eventos={eventos}
                  setIngresos={setIngresos}
                  setEgresos={setEgresos}
                  setDeudas={setDeudas}
                  setMetas={setMetas}
                  setEventos={setEventos}
                  micrometas={micrometas}
                  setMicrometas={setMicrometas}
                  activeUser={activeUser}
                  currency={currency}
                  isInitialLoadComplete={isInitialLoadComplete}
                  pilares={pilares}
                />
              )}

              {activeTab === "sheets" && (
                <SheetsSimulatorTab 
                  darkMode={darkMode} 
                  activeUser={activeUser}
                  ingresos={ingresos} 
                  egresos={egresos} 
                  deudas={deudas} 
                  metas={metas}
                  eventos={eventos}
                  prestamos={prestamos}
                  setIngresos={setIngresos}
                  setEgresos={setEgresos}
                  setDeudas={setDeudas}
                  setMetas={setMetas}
                  setEventos={setEventos}
                  setPrestamos={setPrestamos}
                  resetToInitial={handleResetApplicationData}
                  pilares={pilares}
                />
              )}

              {activeTab === "ia" && (
                <GeminiAuditTab 
                  darkMode={darkMode} 
                  activeUser={activeUser}
                  ingresos={ingresos} 
                  egresos={egresos} 
                  deudas={deudas} 
                  metas={metas} 
                  eventos={eventos} 
                  currency={currency}
                  micrometas={micrometas}
                  pilares={pilares}
                  correlacionesPilares={correlacionesPilares}
                  prestamos={prestamos}
                />
              )}

              {activeTab === "pilares" && (
                <PilaresTab 
                  darkMode={darkMode}
                  activeUser={activeUser}
                  metas={metas}
                  setMetas={setMetas}
                  currency={currency}
                  pilares={pilares}
                  setPilares={setPilares}
                  correlacionesPilares={correlacionesPilares}
                  setCorrelacionesPilares={setCorrelacionesPilares}
                  micrometas={micrometas}
                  setMicrometas={setMicrometas}
                  deudas={deudas}
                  setDeudas={setDeudas}
                  setEgresos={setEgresos}
                  highlightedMetaId={highlightedMetaId}
                  onClearHighlight={() => setHighlightedMetaId(null)}
                />
              )}

              {activeTab === "perfil" && (
                <ProfileTab 
                  darkMode={darkMode}
                  activeUser={activeUser}
                  googleClientId={googleClientId}
                  onProfileUpdate={(updatedUser) => {
                    setActiveUser(updatedUser);
                    localStorage.setItem("pilar5_active_user", JSON.stringify(updatedUser));
                  }}
                  onLogout={handleLogout}
                  onResetData={handleResetApplicationData}
                />
              )}
            </section>
          </>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════
           MOBILE BOTTOM NAVIGATION BAR — sm:hidden
          ═══════════════════════════════════════════════════════ */}
      <nav className={`sm:hidden fixed bottom-0 left-0 right-0 z-50 ${
        darkMode
          ? "bg-stone-950/95 border-stone-800"
          : "bg-white/95 border-stone-200"
      } border-t backdrop-blur-xl`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch">

          {/* Dashboard */}
          <button
            id="mobile-tab-dashboard"
            onClick={() => setActiveTab("dashboard")}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all relative ${
              activeTab === "dashboard" ? "text-teal-500" : darkMode ? "text-stone-500" : "text-stone-400"
            }`}
          >
            {activeTab === "dashboard" && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-500 rounded-full" />
            )}
            <div className={`p-1 rounded-xl transition-all ${
              activeTab === "dashboard"
                ? darkMode ? "bg-teal-500/15" : "bg-teal-50"
                : "bg-transparent"
            }`}>
              <BarChart3 className="w-4 h-4" />
            </div>
            <span className="text-[8px] font-semibold tracking-wide">Dashboard</span>
          </button>

          {/* Mis Datos */}
          <button
            id="mobile-tab-sheets"
            onClick={() => setActiveTab("sheets")}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all relative ${
              activeTab === "sheets" ? "text-teal-500" : darkMode ? "text-stone-500" : "text-stone-400"
            }`}
          >
            {activeTab === "sheets" && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-500 rounded-full" />
            )}
            <div className={`p-1 rounded-xl transition-all ${
              activeTab === "sheets"
                ? darkMode ? "bg-teal-500/15" : "bg-teal-50"
                : "bg-transparent"
            }`}>
              <Database className="w-4 h-4" />
            </div>
            <span className="text-[8px] font-semibold tracking-wide">Datos</span>
          </button>

          {/* Mis Pilares */}
          <button
            id="mobile-tab-pilares"
            onClick={() => setActiveTab("pilares")}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all relative ${
              activeTab === "pilares" ? "text-teal-500" : darkMode ? "text-stone-500" : "text-stone-400"
            }`}
          >
            {activeTab === "pilares" && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-500 rounded-full" />
            )}
            <div className={`p-1 rounded-xl transition-all ${
              activeTab === "pilares"
                ? darkMode ? "bg-teal-500/15" : "bg-teal-50"
                : "bg-transparent"
            }`}>
              <Target className="w-4 h-4" />
            </div>
            <span className="text-[8px] font-semibold tracking-wide">Pilares</span>
          </button>

          {/* Auditoría IA */}
          <button
            id="mobile-tab-ia"
            onClick={() => setActiveTab("ia")}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all relative ${
              activeTab === "ia" ? "text-teal-500" : darkMode ? "text-stone-500" : "text-stone-400"
            }`}
          >
            {activeTab === "ia" && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-500 rounded-full" />
            )}
            <div className={`p-1 rounded-xl transition-all ${
              activeTab === "ia"
                ? darkMode ? "bg-teal-500/15" : "bg-teal-50"
                : "bg-transparent"
            }`}>
              <Cpu className="w-4 h-4" />
            </div>
            <span className="text-[8px] font-semibold tracking-wide">IA</span>
          </button>

          {/* 🔔 Alertas — con badge de conteo como Facebook */}
          <button
            id="mobile-tab-alertas"
            onClick={() => setIsNotificationsOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all relative ${
              isNotificationsOpen ? "text-teal-500" : darkMode ? "text-stone-500" : "text-stone-400"
            }`}
          >
            <div className="relative">
              <div className={`p-1 rounded-xl transition-all ${
                isNotificationsOpen
                  ? darkMode ? "bg-teal-500/15" : "bg-teal-50"
                  : "bg-transparent"
              }`}>
                <Bell className="w-4 h-4" />
              </div>
              {todayAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center leading-none shadow-sm">
                  {todayAlertCount > 9 ? "9+" : todayAlertCount}
                </span>
              )}
            </div>
            <span className="text-[8px] font-semibold tracking-wide">Alertas</span>
          </button>

          {/* Perfil */}
          <button
            id="mobile-tab-perfil"
            onClick={() => setActiveTab("perfil")}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all relative ${
              activeTab === "perfil" ? "text-teal-500" : darkMode ? "text-stone-500" : "text-stone-400"
            }`}
          >
            {activeTab === "perfil" && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-500 rounded-full" />
            )}
            <div className={`p-1 rounded-xl transition-all ${
              activeTab === "perfil"
                ? darkMode ? "bg-teal-500/15" : "bg-teal-50"
                : "bg-transparent"
            }`}>
              <User className="w-4 h-4" />
            </div>
            <span className="text-[8px] font-semibold tracking-wide">Perfil</span>
          </button>

        </div>
      </nav>

      {/* 🔔 Notifications Sheet / Modal */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className={`w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border shadow-xl flex flex-col max-h-[85vh] sm:max-h-[75vh] transition-transform duration-300 transform translate-y-0 ${
              darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-200 text-stone-850"
            }`}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b flex items-center justify-between sticky top-0 bg-inherit rounded-t-3xl">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-sm">Alertas de hoy</h3>
              </div>
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-stone-500/10 hover:bg-stone-500/20 transition-all text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            {/* List */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {todayMicrometasAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-medium text-stone-500">
                    No tienes micrometas pendientes para hoy. ¡Todo al día!
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-[10px] text-stone-500 uppercase font-bold tracking-wider mb-2">
                    Micrometas pendientes hoy:
                  </p>
                  {todayMicrometasAlerts.map((mm) => (
                    <div 
                      key={mm.ID_Micrometa}
                      onClick={() => setSelectedDetailMm(mm)}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2.5 cursor-pointer hover:border-teal-500/50 ${
                        darkMode ? "bg-stone-950/40 border-stone-800 hover:bg-stone-900/60" : "bg-stone-50 border-stone-150 hover:bg-stone-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-xs font-semibold leading-snug">{mm.Titulo}</p>
                          {mm.Genera_Gasto === 1 && (
                            <p className="text-[10px] text-rose-500 font-semibold mt-1">
                              Gasto: ${mm.Monto_Gasto}
                            </p>
                          )}
                          <p className="text-[8px] text-teal-500 font-semibold mt-1.5 uppercase tracking-wider">
                            Haga clic para ver detalles y acción →
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-end gap-2 mt-1.5 pt-2 border-t border-stone-500/10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateMicrometaStatus(mm.ID_Micrometa, "Completada");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-teal-500 text-white text-[10px] font-bold hover:bg-teal-600 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Completar</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateMicrometaStatus(mm.ID_Micrometa, "Cancelada");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-stone-500/10 hover:bg-rose-500/10 text-stone-500 hover:text-rose-500 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Cancelar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 📋 Micrometa Details Modal */}
      {selectedDetailMm && (() => {
        const parentMeta = metas.find(m => m.ID_Meta === selectedDetailMm.ID_Meta);
        const parentPilar = pilares.find(p => p.ID_Pilar === parentMeta?.Pilar || p.Nombre === parentMeta?.Pilar);
        const matchingCard = deudas.find(d => d.ID_Instrumento === selectedDetailMm.ID_Tarjeta_Gasto);
        
        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-fadeIn">
            <div 
              className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 flex flex-col gap-4 transition-all ${
                darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-200 text-stone-850"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-500/10">
                <span className="text-[10px] uppercase font-bold tracking-widest text-teal-500">
                  Detalles de Submeta
                </span>
                <button
                  onClick={() => setSelectedDetailMm(null)}
                  className="p-1 rounded-lg hover:bg-stone-500/10 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold leading-snug">{selectedDetailMm.Titulo}</h4>
                  <p className="text-[10px] text-stone-500 mt-1">Estado: <span className="font-semibold text-amber-500">{selectedDetailMm.Estado}</span></p>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-500/5 space-y-2.5 text-xs">
                  {parentMeta && (
                    <div>
                      <span className="text-[9px] text-stone-500 block uppercase font-bold tracking-wider">Meta SMART</span>
                      <span className="font-medium text-stone-700 dark:text-stone-300">{parentMeta.Meta_SMART}</span>
                    </div>
                  )}
                  {parentPilar && (
                    <div>
                      <span className="text-[9px] text-stone-500 block uppercase font-bold tracking-wider">Pilar Asociado</span>
                      <span className="font-medium text-stone-700 dark:text-stone-300">{parentPilar.Nombre}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-[9px] text-stone-500 block uppercase font-bold tracking-wider">Fecha Planificada</span>
                    <span className="font-medium text-stone-700 dark:text-stone-300">{selectedDetailMm.Fecha_Planificada || "Sin fecha asignada"}</span>
                  </div>
                  {selectedDetailMm.Genera_Gasto === 1 && (
                    <div className="pt-2 border-t border-stone-500/5">
                      <span className="text-[9px] text-rose-500 block uppercase font-bold tracking-wider">Detalles de Gasto</span>
                      <p className="font-medium">Monto: ${selectedDetailMm.Monto_Gasto}</p>
                      <p className="text-[10px] text-stone-500">
                        Cuenta: {matchingCard?.Nombre_Tarjeta || "Balance General"}
                      </p>
                      <p className="text-[10px] text-stone-500">
                        Deducción: {selectedDetailMm.Gasto_Pendiente === 1 ? "Pendiente" : "Deducción completa"}
                      </p>
                    </div>
                  )}
                  {selectedDetailMm.Recurrencia && (
                    <div>
                      <span className="text-[9px] text-stone-500 block uppercase font-bold tracking-wider">Recurrencia</span>
                      <span className="font-medium text-stone-700 dark:text-stone-300">{selectedDetailMm.Recurrencia}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => {
                    if (selectedDetailMm.ID_Meta) {
                      setHighlightedMetaId(selectedDetailMm.ID_Meta);
                      setActiveTab("pilares");
                      setSelectedDetailMm(null);
                      setIsNotificationsOpen(false);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-teal-500 text-white text-xs font-bold hover:bg-teal-600 transition-all text-center cursor-pointer"
                >
                  Ir a Mis Pilares / Acciones
                </button>
                <button
                  onClick={() => setSelectedDetailMm(null)}
                  className="flex-1 py-2.5 rounded-xl bg-stone-500/10 hover:bg-stone-500/20 text-stone-500 text-xs font-bold transition-all text-center cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
