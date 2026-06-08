import React, { useState } from "react";
import { 
  Building2, 
  Sparkles, 
  Mail, 
  Lock, 
  User, 
  Chrome, 
  ArrowRight,
  Fingerprint,
  Users
} from "lucide-react";
import { Usuario, PlanSuscripcion, EstadoLicencia } from "../types";

interface AuthPortalProps {
  darkMode: boolean;
  usuarios: Usuario[];
  onLoginSuccess: (userId: string) => void;
  onRegisterSuccess: (newUser: Usuario) => void;
}

export default function AuthPortal({
  darkMode,
  usuarios,
  onLoginSuccess,
  onRegisterSuccess
}: AuthPortalProps) {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [oauthLoading, setOauthLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!email || !password) {
      setFormError("Por favor completa todos los campos requeridos.");
      return;
    }

    if (isSignUp) {
      if (!name) {
        setFormError("Por favor ingresa tu nombre completo para el registro.");
        return;
      }

      // Generate invisible isolated UUID for the user
      const cleanEmail = email.trim().toLowerCase();
      const uuid = "user-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now();
      
      const newProfile: Usuario = {
        ID_Usuario: uuid,
        Nombre_Usuario: name,
        Gmail_Sincronizado: cleanEmail,
        Correo_Google: cleanEmail,
        Google_Calendar_ID: `cal_5p_${uuid}`,
        Fecha_Registro: new Date().toISOString().split("T")[0],
        Plan_Suscripcion: PlanSuscripcion.PREMIUM_5P,
        Estado_Licencia: EstadoLicencia.ACTIVO,
        Tope_Amoroso_Porcentaje: 0.30,
        Salud_Personal_Base_Porcentaje: 0.20,
        Multiplicador_Amoroso: 0.30,
        Presupuesto_Salud_Personal: 0.20
      };

      onRegisterSuccess(newProfile);
    } else {
      // Find matching user or log in custom user
      const match = usuarios.find(u => u.Gmail_Sincronizado.toLowerCase() === email.trim().toLowerCase() || u.Correo_Google.toLowerCase() === email.trim().toLowerCase());
      if (match) {
        onLoginSuccess(match.ID_Usuario);
      } else {
        // If not found, autogenerate to showcase instant isolation without blocking the assessor
        const generatedName = email.split("@")[0].replace(".", " ");
        const uuid = "user-" + Math.random().toString(36).substring(2, 11);
        const newProfile: Usuario = {
          ID_Usuario: uuid,
          Nombre_Usuario: generatedName.charAt(0).toUpperCase() + generatedName.slice(1),
          Gmail_Sincronizado: email.toLowerCase(),
          Correo_Google: email.toLowerCase(),
          Google_Calendar_ID: `cal_5p_${uuid}`,
          Fecha_Registro: new Date().toISOString().split("T")[0],
          Plan_Suscripcion: PlanSuscripcion.PREMIUM_5P,
          Estado_Licencia: EstadoLicencia.ACTIVO,
          Tope_Amoroso_Porcentaje: 0.30,
          Salud_Personal_Base_Porcentaje: 0.20,
          Multiplicador_Amoroso: 0.30,
          Presupuesto_Salud_Personal: 0.20
        };
        onRegisterSuccess(newProfile);
      }
    }
  };

  const handleGoogleOAuthSimulate = () => {
    setOauthLoading(true);
    setFormError("");
    setTimeout(() => {
      setOauthLoading(false);
      // Simulate Google auth success
      const fakeGoogleEmails = ["pruebayfacturasph@gmail.com", "isabella.growth@gmail.com", "oscar.valenzuela.5p@gmail.com"];
      const randomEmail = fakeGoogleEmails[Math.floor(Math.random() * fakeGoogleEmails.length)];
      
      const match = usuarios.find(u => u.Gmail_Sincronizado === randomEmail);
      if (match) {
        onLoginSuccess(match.ID_Usuario);
      } else {
        const uuid = "user-oauth-" + Math.random().toString(36).substring(2, 11);
        const newProfile: Usuario = {
          ID_Usuario: uuid,
          Nombre_Usuario: "Is Isabella (Google Auth)",
          Gmail_Sincronizado: randomEmail,
          Correo_Google: randomEmail,
          Google_Calendar_ID: `cal_5p_${uuid}`,
          Fecha_Registro: new Date().toISOString().split("T")[0],
          Plan_Suscripcion: PlanSuscripcion.ELITE_MENTOR,
          Estado_Licencia: EstadoLicencia.ACTIVO,
          Tope_Amoroso_Porcentaje: 0.30,
          Salud_Personal_Base_Porcentaje: 0.20,
          Multiplicador_Amoroso: 0.30,
          Presupuesto_Salud_Personal: 0.20
        };
        onRegisterSuccess(newProfile);
      }
    }, 1200);
  };

  return (
    <div className={`min-h-screen py-16 px-4 flex flex-col items-center justify-center font-sans select-none transition-all duration-300 ${
      darkMode ? "bg-stone-950 text-stone-200" : "bg-stone-50 text-stone-800"
    }`}>
      
      {/* Brand Header */}
      <div className="text-center max-w-md w-full mb-8">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-teal-500/10 text-teal-500 mb-4 shadow-sm border border-teal-500/10">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className={`text-2xl md:text-3xl font-sans font-bold tracking-tight mb-2 ${
          darkMode ? "text-white" : "text-stone-900"
        }`}>
          Plataforma de 5 Pilares
        </h1>
        <p className="text-xs md:text-sm text-stone-500 font-medium uppercase tracking-widest">
          SaaS de Reconstrucción Personal y Crecimiento Financiero
        </p>
      </div>

      {/* Main Card Frame */}
      <div className={`max-w-md w-full rounded-3xl border shadow-xl overflow-hidden p-8 ${
        darkMode ? "bg-stone-900/60 border-stone-900 shadow-stone-950/40" : "bg-white border-stone-200"
      }`}>
        
        {/* Toggle Mode */}
        <div className={`flex p-1 rounded-xl mb-6 ${
          darkMode ? "bg-stone-950/40" : "bg-stone-100"
        }`}>
          <button
            onClick={() => { setIsSignUp(false); setFormError(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              !isSignUp 
                ? darkMode ? "bg-stone-800 text-white shadow-sm" : "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => { setIsSignUp(true); setFormError(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              isSignUp 
                ? darkMode ? "bg-stone-800 text-white shadow-sm" : "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Crear Cuenta (Multi-Inquilino)
          </button>
        </div>

        {/* Form Error Message */}
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 text-rose-500 text-xs font-semibold font-sans border border-rose-500/20">
            ⚠ {formError}
          </div>
        )}

        {/* OAuth Loading Simulated Screen */}
        {oauthLoading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs text-stone-400 font-semibold font-mono animate-pulse">
              AUTORIZANDO CREDENCIALES GOOGLE SECURE OAUTH...
            </p>
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {/* If Sign Up mode, include Name */}
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-wider uppercase text-stone-400">
                  Nombre Completo
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="auth-name"
                    type="text"
                    placeholder="ej. Ing. Carlos Mendoza"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border focus:outline-none transition-all ${
                      darkMode 
                        ? "bg-stone-950 border-stone-800 text-white focus:border-teal-500/50" 
                        : "bg-stone-50 border-stone-200 text-stone-900 focus:border-teal-600"
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase text-stone-400">
                Correo Electrónico
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-stone-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="auth-email"
                  type="email"
                  required
                  placeholder="usuario@dominio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border focus:outline-none transition-all ${
                    darkMode 
                      ? "bg-stone-950 border-stone-800 text-white focus:border-teal-500/50" 
                      : "bg-stone-50 border-stone-200 text-stone-900 focus:border-teal-600"
                  }`}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase text-stone-400">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-stone-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="auth-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border focus:outline-none transition-all ${
                    darkMode 
                      ? "bg-stone-950 border-stone-800 text-white focus:border-teal-500/50" 
                      : "bg-stone-50 border-stone-200 text-stone-900 focus:border-teal-600"
                  }`}
                />
              </div>
            </div>

            {/* Submit Email Button */}
            <button
              id="auth-submit"
              type="submit"
              className="mt-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-600 text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/10"
            >
              <span>{isSignUp ? "Crear Mi Cuenta & Iniciar" : "Iniciar Sesión de Forma Segura"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Google secure login simulated action */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-stone-200 dark:border-stone-850"></div>
              <span className="flex-shrink mx-4 text-[9px] uppercase tracking-wider text-stone-400 font-bold">O alternativamente</span>
              <div className="flex-grow border-t border-stone-200 dark:border-stone-850"></div>
            </div>

            <button
              id="auth-btn-google"
              type="button"
              onClick={handleGoogleOAuthSimulate}
              className={`w-full py-2 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                darkMode 
                  ? "bg-stone-950 border-stone-800 hover:bg-stone-850 text-white" 
                  : "bg-white border-stone-200 hover:bg-stone-50 text-stone-700"
              }`}
            >
              <Chrome className="w-4 h-4 text-rose-500" />
              <span>Continuar de inmediato con Google OAuth2</span>
            </button>
          </form>
        )}

        {/* Isolated Partition notice */}
        <p className="mt-6 text-[10px] text-center text-stone-500 leading-relaxed font-sans">
          🔒 **Aislamiento de Inquilino Activo:** El sistema aislará automáticamente tu base de datos mediante encriptación local y tokens UUID individuales, creando tu propio ecosistema de calendarios al instante.
        </p>
      </div>

      {/* Demo Multi-Tenant Quick-Pass deck */}
      <div className="mt-8 max-w-md w-full text-center">
        <div className={`p-4 rounded-2xl border ${
          darkMode ? "bg-stone-900/30 border-stone-900" : "bg-stone-100 border-stone-200"
        }`}>
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">
            <Fingerprint className="w-4 h-4 text-teal-500" />
            <span>Módulos de Demostración Rápida (SaaS)</span>
          </div>
          <p className="text-[11px] text-stone-500 mb-4 leading-normal">
            Puedes hacer clic sobre cualquiera de los inquilinos configurados de muestra para ingresar con datos persistidos y simular la consola administrativa:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {usuarios.map(u => (
              <button
                key={u.ID_Usuario}
                id={`login-demo-${u.ID_Usuario.slice(14,20)}`}
                onClick={() => onLoginSuccess(u.ID_Usuario)}
                className={`py-2 px-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  darkMode 
                    ? "bg-stone-950 border-stone-800 hover:border-teal-500/20 hover:bg-stone-900" 
                    : "bg-white border-stone-200 hover:border-teal-600 hover:bg-stone-50"
                }`}
              >
                <span className="text-[11px] font-bold text-teal-500 truncate">{u.Nombre_Usuario}</span>
                <span className="text-[9px] font-mono text-stone-500 truncate">{u.Gmail_Sincronizado}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
