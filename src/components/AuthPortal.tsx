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

  // Real Google Auth States
  const [showConfigAlert, setShowConfigAlert] = useState<boolean>(false);

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
      // Show professional OAuth setup guide instead of simulated popups
      setShowConfigAlert(true);
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

      {/* REAL GOOGLE OAUTH CONFIGURATION INSTRUCTION MODAL */}
      {showConfigAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 transition-all">
          <div className={`w-full max-w-lg p-6 md:p-8 rounded-[2.5rem] border shadow-2xl transition-all ${
            darkMode ? "bg-stone-900 border-stone-800 text-white shadow-stone-950/80" : "bg-white border-stone-200 text-stone-900 shadow-stone-200/80"
          }`}>
            <div className="flex items-center gap-3 mb-5 border-b pb-4 border-stone-200 dark:border-stone-800">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold">Configuración de Google OAuth Requerida</h3>
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mt-0.5">Conexión Profesional Real</p>
              </div>
            </div>

            <div className="text-xs space-y-4 leading-relaxed max-h-[350px] overflow-y-auto pr-1">
              <p>
                Para habilitar una conexión auténtica con tu cuenta de Google y habilitar la sincronización en tiempo real con Google Calendar, debes configurar tu propio <strong>Client ID de Google</strong>.
              </p>
              
              <div className="space-y-2.5">
                <p className="font-semibold text-teal-500">Pasos para la configuración:</p>
                <ol className="list-decimal pl-4 space-y-2">
                  <li>
                    Ingresa a la consola de desarrolladores: <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-teal-455 hover:underline">Google Cloud Console</a>.
                  </li>
                  <li>
                    Crea un proyecto (ej. <em>"Control 5 Pilares"</em>).
                  </li>
                  <li>
                    Configura la <strong>Pantalla de consentimiento de OAuth</strong> (tipo Externo, agrega tu correo).
                  </li>
                  <li>
                    Ve a <strong>Credenciales</strong> &gt; <strong>Crear credenciales</strong> &gt; <strong>ID de cliente de OAuth</strong>.
                  </li>
                  <li>
                    Elige tipo de aplicación: <strong>Aplicación web</strong>.
                  </li>
                  <li>
                    En <strong>Orígenes de JavaScript autorizados</strong> agrega: <code className="bg-stone-950 text-emerald-450 px-1.5 py-0.5 rounded font-mono">http://localhost:3000</code>.
                  </li>
                  <li>
                    En <strong>URIs de redireccionamiento autorizados</strong> agrega exactamente: <code className="bg-stone-950 text-emerald-450 px-1.5 py-0.5 rounded font-mono">http://localhost:3000/</code> (incluyendo la barra diagonal al final).
                  </li>
                  <li>
                    Copia el <strong>ID de cliente</strong> generado.
                  </li>
                </ol>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-950 text-stone-300 font-mono text-[10px] border border-stone-850 space-y-2 select-text">
                <p className="text-stone-500"># Edita el archivo .env de tu proyecto y pega tu Client ID:</p>
                <p>GOOGLE_CLIENT_ID="<span className="text-teal-400">TU_CLIENT_ID_GENERADO.apps.googleusercontent.com</span>"</p>
              </div>

              <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[11px] font-medium animate-pulse">
                💡 <strong>Una vez guardado:</strong> Guarda el archivo <code>.env</code>. El servidor se reiniciará automáticamente. Recarga esta página para iniciar la sesión real con Google.
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-200 dark:border-stone-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowConfigAlert(false)}
                className="py-2.5 px-6 rounded-2xl text-xs font-semibold bg-teal-500 hover:bg-teal-600 text-white transition-all cursor-pointer shadow-lg shadow-teal-500/10"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
