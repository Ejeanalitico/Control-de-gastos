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
  Micrometa
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
  User
} from "lucide-react";

export default function App() {
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

  const [activeTab, setActiveTab] = useState<"dashboard" | "sheets" | "ia" | "pilares" | "perfil" | "workspace">("dashboard");
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [currency, setCurrency] = useState<string>("USD");
  const [googleClientId, setGoogleClientId] = useState<string>("");

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
        const res = await fetch("https://ipapi.co/json/");
        if (res.ok) {
          const data = await res.json();
          if (data.currency) {
            setCurrency(data.currency);
          }
        }
      } catch (err) {
        console.error("Error detecting currency by IP:", err);
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

        // 3. Connect and persist Google token & status locally
        localStorage.setItem(`pilar5_g_connected_${userObj.ID_Usuario}`, "true");
        localStorage.setItem(`pilar5_g_token_${userObj.ID_Usuario}`, accessToken);
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

  // === DB FETCH ON AUTH STATE CHANGE ===
  useEffect(() => {
    const fetchUserData = async () => {
      if (!isAuthenticated || !activeUserId) return;
      setLoadingData(true);
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
        }
      } catch (err) {
        console.error("Error loading user data from SQLite:", err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchUserData();
  }, [isAuthenticated, activeUserId]);

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
  };

  const handleResetApplicationData = async () => {
    if (window.confirm("¿Seguro que deseas reiniciar los datos de tu cuenta en la base de datos real?")) {
      handleLogout();
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
    <div className={`min-h-screen transition-all duration-300 font-sans pb-16 ${
      darkMode ? "bg-stone-950 text-stone-200 dark" : "bg-stone-50 text-stone-850"
    }`}>
      
      {/* SaaS Premium Header Bar */}
      <header className={`sticky top-0 z-50 backdrop-blur border-b transition-all ${
        darkMode ? "bg-stone-950/80 border-stone-900" : "bg-white/80 border-stone-150"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center p-2 rounded-xl bg-teal-500/10 text-teal-600">
              <Building2 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className={`font-semibold tracking-tight text-sm md:text-base leading-none mb-1 ${
                darkMode ? "text-white" : "text-stone-900"
              }`}>
                Control de 5 Pilares
              </h1>
              <p className="text-stone-500 text-[9px] uppercase font-bold tracking-wider leading-none">
                Ecosistema de Crecimiento
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
        
        {loadingData ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs text-stone-500 animate-pulse">Cargando tus datos desde la base de datos real...</p>
          </div>
        ) : (
          <>
            {/* Navigation Tabs (Apple styling - renamed with friendly titles) */}
            <div className={`flex flex-wrap items-center p-1.5 rounded-2xl border max-w-4xl ${
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

              <button
                id="tab-workspace"
                onClick={() => setActiveTab("workspace")}
                className={`cursor-pointer flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  activeTab === "workspace"
                    ? darkMode
                      ? "bg-stone-800 text-white border border-stone-700 shadow-sm"
                      : "bg-white text-stone-900 border border-stone-250 shadow-sm"
                    : "text-stone-500 hover:text-stone-750"
                }`}
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Nube / Sync</span>
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
                />
              )}

              {activeTab === "sheets" && (
                <SheetsSimulatorTab 
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
                  resetToInitial={handleResetApplicationData}
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
                />
              )}

              {activeTab === "perfil" && (
                <ProfileTab 
                  darkMode={darkMode}
                  activeUser={activeUser}
                  onProfileUpdate={(updatedUser) => {
                    setActiveUser(updatedUser);
                    localStorage.setItem("pilar5_active_user", JSON.stringify(updatedUser));
                  }}
                />
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
                  googleClientId={googleClientId}
                />
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
