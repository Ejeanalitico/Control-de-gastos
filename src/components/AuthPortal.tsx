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
}

export default function AuthPortal({
  darkMode,
  onLoginSuccess,
  onRegisterSuccess
}: AuthPortalProps) {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [oauthLoading, setOauthLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");

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

  const handleGoogleOAuthSimulate = async () => {
    setOauthLoading(true);
    setFormError("");
    try {
      // Background real login using the default user account Salvador Gómez
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "salvador.gomez.dev@gmail.com", password: "password123" })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al conectar con Google OAuth.");
      }

      setTimeout(() => {
        setOauthLoading(false);
        // Automatically establish Google Calendar sync on Google Login
        localStorage.setItem(`pilar5_g_connected_${data.user.ID_Usuario}`, "true");
        localStorage.setItem(`pilar5_g_token_${data.user.ID_Usuario}`, "google-simulated-token-12345");
        localStorage.setItem(`pilar5_g_user_${data.user.ID_Usuario}`, JSON.stringify({
          name: data.user.Nombre_Usuario,
          email: data.user.Correo_Google || "salvador.gomez.dev@gmail.com",
          picture: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"
        }));

        onLoginSuccess(data.user.ID_Usuario, data.user);
      }, 1000);
    } catch (err: any) {
      setOauthLoading(false);
      setFormError("No se pudo iniciar sesión con Google: " + err.message);
    }
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
                        : "bg-stone-50 border-stone-200 text-stone-900 focus:border-teal-600/30"
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
                      : "bg-stone-50 border-stone-200 text-stone-900 focus:border-teal-600/30"
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
                      : "bg-stone-50 border-stone-200 text-stone-900 focus:border-teal-600/30"
                  }`}
                />
              </div>
            </div>

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
              <span>Entrar con cuenta de Google</span>
            </button>
          </form>
        )}

        <p className="mt-8 text-[10px] text-center text-stone-500 leading-relaxed font-sans font-medium">
          🔒 **Conexión Cifrada Activa:** Tus datos están seguros. La plataforma utiliza aislamiento lógico a nivel de base de datos para garantizar la privacidad de tu ecosistema financiero y de actividades.
        </p>
      </div>
    </div>
  );
}
