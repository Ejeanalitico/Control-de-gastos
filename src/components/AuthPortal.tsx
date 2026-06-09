import React, { useState } from "react";
import { 
  Building2, 
  Sparkles, 
  Mail, 
  Lock, 
  User, 
  Chrome, 
  ArrowRight
} from "lucide-react";
import { Usuario } from "../types";

interface AuthPortalProps {
  darkMode: boolean;
  usuarios: Usuario[];
  onLoginSuccess: (userId: string, userObj: Usuario) => void;
  onRegisterSuccess: (newUser: Usuario) => void;
  googleClientId: string;
}

export default function AuthPortal({
  darkMode,
  onLoginSuccess,
  onRegisterSuccess,
  googleClientId
}: AuthPortalProps) {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [oauthLoading, setOauthLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");

  // Simulated Google Auth States
  const [showMockGoogleModal, setShowMockGoogleModal] = useState<boolean>(false);
  const [customMockEmail, setCustomMockEmail] = useState<string>("");
  const [customMockName, setCustomMockName] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!email || !password) {
      setFormError("Por favor completa todos los campos requeridos.");
      return;
    }

    try {
      if (isSignUp) {
        if (!name) {
          setFormError("Por favor ingresa tu nombre completo para el registro.");
          return;
        }
        if (password.length < 6) {
          setFormError("La contraseña debe tener al menos 6 caracteres.");
          return;
        }
        if (password !== confirmPassword) {
          setFormError("Las contraseñas no coinciden.");
          return;
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Error al registrar el usuario.");
        }

        onRegisterSuccess(data.user);
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Credenciales incorrectas.");
        }

        onLoginSuccess(data.user.ID_Usuario, data.user);
      }
    } catch (err: any) {
      setFormError(err.message || "Ocurrió un error al procesar la autenticación.");
    }
  };

  const handleGoogleOAuthSimulate = () => {
    const clientId = googleClientId.trim();
    if (!clientId || clientId.includes("example.apps.googleusercontent.com")) {
      // Trigger the gorgeous simulated account selector immediately
      setShowMockGoogleModal(true);
      return;
    }

    setOauthLoading(true);
    setFormError("");

    // Build standard implicit flow URL for Google Calendar & UserInfo profile scopes
    const redirectUri = window.location.origin + "/";
    const scope = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.profile email openid";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=consent`;

    // Redirect user to Google sign-in consent screen
    window.location.href = authUrl;
  };

  return (
    <div className={`min-h-screen py-16 px-4 flex flex-col items-center justify-center select-none transition-all duration-300 font-sans ${
      darkMode ? "bg-stone-950 text-stone-200" : "bg-stone-50 text-stone-850"
    }`}>
      
      {/* Brand Header */}
      <div className="text-center max-w-md w-full mb-10">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-teal-500/10 text-teal-500 mb-4 shadow-sm border border-teal-500/10">
          <Building2 className="w-6 h-6" />
        </div>
        <h1 className={`text-xl md:text-2xl font-semibold tracking-tight mb-1 ${
          darkMode ? "text-white" : "text-stone-900"
        }`}>
          Control de 5 Pilares
        </h1>
        <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">
          Consola Inteligente de Reconstrucción y Finanzas
        </p>
      </div>

      {/* Premium Apple-Style Sign In Card */}
      <div className={`max-w-md w-full rounded-[2.5rem] border shadow-2xl overflow-hidden p-8 transition-all ${
        darkMode ? "bg-stone-900/40 border-stone-900 shadow-stone-950/50" : "bg-white border-stone-150 shadow-stone-200/50"
      }`}>
        
        {/* Tab Selection */}
        <div className={`flex p-1 rounded-2xl mb-8 ${
          darkMode ? "bg-stone-950/40" : "bg-stone-100"
        }`}>
          <button
            onClick={() => { setIsSignUp(false); setFormError(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              !isSignUp 
                ? darkMode ? "bg-stone-800 text-white shadow-sm" : "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-750"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => { setIsSignUp(true); setFormError(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              isSignUp 
                ? darkMode ? "bg-stone-800 text-white shadow-sm" : "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-750"
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        {formError && (
          <div className="mb-5 p-3 rounded-2xl bg-rose-500/10 text-rose-500 text-xs font-semibold border border-rose-500/15">
            {formError}
          </div>
        )}

        {oauthLoading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[10px] text-stone-400 font-semibold tracking-wider animate-pulse">
              CONECTANDO CON GOOGLE WORKSPACE...
            </p>
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-wider uppercase text-stone-500">
                  Nombre Completo
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-stone-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="auth-name"
                    type="text"
                    placeholder="ej. Carlos Mendoza"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full text-xs pl-10 pr-4 py-3 rounded-2xl border focus:outline-none transition-all ${
                      darkMode 
                        ? "bg-stone-950 border-stone-850 text-white focus:border-teal-500/30" 
                        : "bg-white border-stone-300 text-stone-900 focus:border-teal-600/30"
                    }`}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase text-stone-500">
                Correo Electrónico
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-stone-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="auth-email"
                  type="email"
                  required
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full text-xs pl-10 pr-4 py-3 rounded-2xl border focus:outline-none transition-all ${
                    darkMode 
                      ? "bg-stone-950 border-stone-850 text-white focus:border-teal-500/30" 
                      : "bg-white border-stone-300 text-stone-900 focus:border-teal-600/30"
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase text-stone-500">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-stone-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="auth-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full text-xs pl-10 pr-4 py-3 rounded-2xl border focus:outline-none transition-all ${
                    darkMode 
                      ? "bg-stone-950 border-stone-850 text-white focus:border-teal-500/30" 
                      : "bg-white border-stone-300 text-stone-900 focus:border-teal-600/30"
                  }`}
                />
              </div>
            </div>

            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-wider uppercase text-stone-500">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-stone-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="auth-confirm-password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full text-xs pl-10 pr-4 py-3 rounded-2xl border focus:outline-none transition-all ${
                      darkMode 
                        ? "bg-stone-950 border-stone-850 text-white focus:border-teal-500/30" 
                        : "bg-white border-stone-300 text-stone-900 focus:border-teal-600/30"
                    }`}
                  />
                </div>
              </div>
            )}

            <button
              id="auth-submit"
              type="submit"
              className="mt-3 w-full py-3 px-4 rounded-2xl text-xs font-semibold bg-teal-500 hover:bg-teal-600 text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-teal-500/10"
            >
              <span>{isSignUp ? "Crear Cuenta" : "Entrar al Sistema"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-stone-200 dark:border-stone-900"></div>
              <span className="flex-shrink mx-4 text-[9px] uppercase tracking-wider text-stone-500 font-bold">O también</span>
              <div className="flex-grow border-t border-stone-200 dark:border-stone-900"></div>
            </div>

            <button
              id="auth-btn-google"
              type="button"
              onClick={handleGoogleOAuthSimulate}
              className={`w-full py-3 px-4 rounded-2xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                darkMode 
                  ? "bg-stone-950 border-stone-850 hover:bg-stone-900 text-white" 
                  : "bg-white border-stone-200 hover:bg-stone-50 text-stone-700"
              }`}
            >
              <Chrome className="w-4 h-4 text-rose-500" />
              <span>Entrar con tu cuenta de Google</span>
            </button>

          </form>
        )}

        <p className="mt-8 text-[10px] text-center text-stone-500 leading-relaxed font-sans font-medium">
          🔒 **Conexión Cifrada Activa:** Tus datos están seguros. La plataforma utiliza aislamiento lógico a nivel de base de datos para garantizar la privacidad de tu ecosistema financiero y de actividades.
        </p>
      </div>

      {/* GORGEOUS SIMULATED GOOGLE ACCOUNT SELECTOR MODAL */}
      {showMockGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all">
          <div className={`w-full max-w-md p-6 rounded-[2rem] border shadow-2xl transition-all ${
            darkMode ? "bg-stone-900 border-stone-850 text-white shadow-stone-950/60" : "bg-white border-stone-200 text-stone-850 shadow-stone-200/60"
          }`}>
            <div className="flex flex-col items-center mb-6">
              {/* Google colorful G logo */}
              <div className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-md mb-3 border border-stone-100">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.483 0-6.312-2.83-6.312-6.314s2.829-6.313 6.312-6.313c1.558 0 2.977.568 4.076 1.503l3.078-3.077C18.99 2.378 15.82 1 12.24 1 6.033 1 12.24 1 12.24s5.033 11.24 11.24 11.24c6.476 0 11.164-4.549 11.164-11.393 0-.773-.082-1.343-.2-1.802H12.24z" />
                </svg>
              </div>
              <h2 className={`text-lg font-bold tracking-tight font-sans ${darkMode ? "text-white" : "text-stone-900"}`}>Google</h2>
              <p className="text-xs text-stone-500 mt-1 font-sans text-center">
                Elige una cuenta para continuar a 5 Pilares
              </p>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {/* Profile button 1: Javier García */}
              <button
                type="button"
                onClick={() => {
                  const email = "xavier.garcia.vp@gmail.com";
                  const name = "Javier García";
                  setShowMockGoogleModal(false);
                  setOauthLoading(true);
                  const mockToken = `mock_google_token_${encodeURIComponent(email)}__${encodeURIComponent(name)}`;
                  window.location.href = `/#access_token=${mockToken}`;
                  window.location.reload();
                }}
                className={`w-full p-3.5 rounded-2xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                  darkMode 
                    ? "bg-stone-950/40 border-stone-850 hover:bg-stone-900 hover:border-teal-500/30 text-white" 
                    : "bg-stone-50 border-stone-200 hover:bg-stone-100 hover:border-teal-500/30 text-stone-900"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  JG
                </div>
                <div className="flex-1 truncate">
                  <p className="text-xs font-bold font-sans">Javier García</p>
                  <p className="text-[10px] text-stone-500 font-mono mt-0.5">xavier.garcia.vp@gmail.com</p>
                </div>
              </button>

              {/* Profile button 2: Test User */}
              <button
                type="button"
                onClick={() => {
                  const email = "test@example.com";
                  const name = "Test User";
                  setShowMockGoogleModal(false);
                  setOauthLoading(true);
                  const mockToken = `mock_google_token_${encodeURIComponent(email)}__${encodeURIComponent(name)}`;
                  window.location.href = `/#access_token=${mockToken}`;
                  window.location.reload();
                }}
                className={`w-full p-3.5 rounded-2xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                  darkMode 
                    ? "bg-stone-950/40 border-stone-850 hover:bg-stone-900 hover:border-teal-500/30 text-white" 
                    : "bg-stone-50 border-stone-200 hover:bg-stone-100 hover:border-teal-500/30 text-stone-900"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  TU
                </div>
                <div className="flex-1 truncate">
                  <p className="text-xs font-bold font-sans">Test User</p>
                  <p className="text-[10px] text-stone-500 font-mono mt-0.5">test@example.com</p>
                </div>
              </button>

              {/* Custom login form */}
              {showCustomInput ? (
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  darkMode ? "bg-stone-950/40 border-stone-850" : "bg-stone-50 border-stone-200"
                }`}>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-stone-500">Nombre Completo</label>
                    <input
                      type="text"
                      placeholder="ej. Juan Pérez"
                      value={customMockName}
                      onChange={(e) => setCustomMockName(e.target.value)}
                      className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:border-teal-500 ${
                        darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-300 text-stone-900"
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-stone-500">Correo Google</label>
                    <input
                      type="email"
                      placeholder="ej. juan@gmail.com"
                      value={customMockEmail}
                      onChange={(e) => setCustomMockEmail(e.target.value)}
                      className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:border-teal-500 ${
                        darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-300 text-stone-900"
                      }`}
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(false)}
                      className="py-1 px-3 text-[10px] rounded-lg font-bold border border-stone-350 hover:bg-stone-150 dark:hover:bg-stone-800 transition-all cursor-pointer"
                    >
                      Atrás
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const email = customMockEmail.trim().toLowerCase();
                        const name = customMockName.trim() || "Usuario Google";
                        if (!email) {
                          alert("Por favor ingresa un correo electrónico.");
                          return;
                        }
                        setShowMockGoogleModal(false);
                        setOauthLoading(true);
                        const mockToken = `mock_google_token_${encodeURIComponent(email)}__${encodeURIComponent(name)}`;
                        window.location.href = `/#access_token=${mockToken}`;
                        window.location.reload();
                      }}
                      className="py-1 px-3 text-[10px] rounded-lg font-bold bg-teal-500 hover:bg-teal-600 text-white transition-all cursor-pointer shadow-sm shadow-teal-500/10"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className={`w-full p-3.5 rounded-2xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                    darkMode 
                      ? "bg-stone-950/20 border-stone-850 hover:bg-stone-900 hover:border-teal-500/30 text-white" 
                      : "bg-white border-stone-205 hover:bg-stone-50 hover:border-teal-500/30 text-stone-900"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full border border-dashed border-stone-400 text-stone-550 flex items-center justify-center font-bold text-sm shadow-sm">
                    +
                  </div>
                  <div className="flex-1 truncate">
                    <p className="text-xs font-bold font-sans">Usar otra cuenta</p>
                    <p className="text-[10px] text-stone-500 mt-0.5 font-sans">Acceder con otro perfil de Google</p>
                  </div>
                </button>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t pt-4 border-stone-100 dark:border-stone-850">
              <button
                type="button"
                onClick={() => setShowMockGoogleModal(false)}
                className="py-1.5 px-4 rounded-xl border border-stone-300 dark:border-stone-800 text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-950 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
