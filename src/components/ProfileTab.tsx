import React, { useState } from "react";
import { User, Lock, Sliders, ShieldCheck, Mail, Edit3, Cloud, Sparkles } from "lucide-react";
import { Usuario } from "../types";

interface ProfileTabProps {
  darkMode: boolean;
  activeUser: Usuario;
  googleClientId: string;
  onProfileUpdate: (updatedUser: Usuario) => void;
  onLogout?: () => void;
  onResetData?: () => void;
}

export default function ProfileTab({ darkMode, activeUser, googleClientId, onProfileUpdate, onLogout, onResetData }: ProfileTabProps) {
  // Google sync state
  const [accessToken, setAccessToken] = useState<string>(() => {
    return localStorage.getItem(`pilar5_g_token_${activeUser.ID_Usuario}`) || "";
  });
  const [isConnected, setIsConnected] = useState<boolean>(() => {
    return !!localStorage.getItem(`pilar5_g_connected_${activeUser.ID_Usuario}`);
  });
  const [googleUser, setGoogleUser] = useState<{ name: string; email: string; picture?: string } | null>(() => {
    const saved = localStorage.getItem(`pilar5_g_user_${activeUser.ID_Usuario}`);
    return saved ? JSON.parse(saved) : null;
  });
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");

  // Confirmation dialog state
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

  const handleGoogleOAuthDirect = () => {
    const redirectUri = window.location.origin + "/";
    const scope = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.profile email openid https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(googleClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=consent`;

    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    setConfirmDialog({
      isOpen: true,
      title: "Desconectar Cuenta Google",
      message: "¿Seguro que deseas desconectar tu cuenta de Google Workspace del SaaS? Esto desactivará la sincronización en tiempo real.",
      onConfirm: async () => {
        try {
          await fetch("/api/auth/google/unlink", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: activeUser.ID_Usuario })
          });
        } catch (err) {
          console.error("Error unlinking Google from server:", err);
        }
        setAccessToken("");
        setIsConnected(false);
        setGoogleUser(null);
        localStorage.removeItem(`pilar5_g_token_${activeUser.ID_Usuario}`);
        localStorage.removeItem(`pilar5_g_connected_${activeUser.ID_Usuario}`);
        localStorage.removeItem(`pilar5_g_user_${activeUser.ID_Usuario}`);
        localStorage.removeItem(`pilar5_g_expires_at_${activeUser.ID_Usuario}`);
        
        onProfileUpdate({
          ...activeUser,
          Correo_Google: ""
        });
        setSyncMessage("Cuenta de Google desconectada.");
      }
    });
  };

  // Profile edit state
  const [nombre, setNombre] = useState(activeUser.Nombre_Usuario || "");
  const [correoG, setCorreoG] = useState(activeUser.Correo_Google || "");
  const [gmailSinc, setGmailSinc] = useState(activeUser.Gmail_Sincronizado || "");
  const [topeAmoroso, setTopeAmoroso] = useState((activeUser.Tope_Amoroso_Porcentaje * 100).toString());
  const [saludBase, setSaludBase] = useState((activeUser.Salud_Personal_Base_Porcentaje * 100).toString());

  // Password change state
  const [currPass, setCurrPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confPass, setConfPass] = useState("");

  // Feedback messages
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const [passError, setPassError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setSavingProfile(true);

    const parseTope = parseFloat(topeAmoroso);
    const parseSalud = parseFloat(saludBase);

    if (isNaN(parseTope) || parseTope < 0 || parseTope > 100) {
      setProfileError("El tope amoroso debe ser un porcentaje entre 0 y 100.");
      setSavingProfile(false);
      return;
    }
    if (isNaN(parseSalud) || parseSalud < 0 || parseSalud > 100) {
      setProfileError("La salud personal base debe ser un porcentaje entre 0 y 100.");
      setSavingProfile(false);
      return;
    }

    try {
      const res = await fetch(`/api/usuarios/${activeUser.ID_Usuario}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Nombre_Usuario: nombre,
          Correo_Google: correoG,
          Gmail_Sincronizado: gmailSinc,
          Tope_Amoroso_Porcentaje: parseTope / 100,
          Salud_Personal_Base_Porcentaje: parseSalud / 100
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo actualizar el perfil.");
      }

      onProfileUpdate(data.user);
      setProfileSuccess("¡Perfil y métricas actualizados correctamente!");
      setTimeout(() => setProfileSuccess(""), 4000);
    } catch (err: any) {
      setProfileError(err.message || "Error al actualizar perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");
    setSavingPass(true);

    if (!currPass || !newPass || !confPass) {
      setPassError("Todos los campos de contraseña son requeridos.");
      setSavingPass(false);
      return;
    }

    if (newPass.length < 6) {
      setPassError("La nueva contraseña debe tener al menos 6 caracteres.");
      setSavingPass(false);
      return;
    }

    if (newPass !== confPass) {
      setPassError("La nueva contraseña y su confirmación no coinciden.");
      setSavingPass(false);
      return;
    }

    try {
      const res = await fetch(`/api/usuarios/${activeUser.ID_Usuario}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currPass,
          newPassword: newPass
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo cambiar la contraseña.");
      }

      setPassSuccess("¡Contraseña restablecida con éxito!");
      setCurrPass("");
      setNewPass("");
      setConfPass("");
      setTimeout(() => setPassSuccess(""), 4000);
    } catch (err: any) {
      setPassError(err.message || "Error al cambiar contraseña.");
    } finally {
      setSavingPass(false);
    }
  };

  const inputClass = `w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all ${
    darkMode 
      ? "bg-stone-950 border-stone-850 text-white placeholder-stone-600 focus:border-teal-500/30" 
      : "bg-white border-stone-200 text-stone-900 placeholder-stone-400 focus:border-teal-600/30"
  }`;

  return (
    <div className="space-y-6 animate-fadeIn font-sans text-left">
      
      {/* Overview Block */}
      <div className={`p-6 rounded-[2.5rem] border ${
        darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-200 shadow-sm"
      } flex flex-col md:flex-row md:items-center justify-between gap-6`}>
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-teal-500/10 text-teal-500 rounded-2xl border border-teal-500/15">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${darkMode ? "text-white" : "text-stone-900"}`}>
              Mi Perfil y Datos Personales
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Cuenta: <span className="font-mono">{activeUser.Gmail_Sincronizado || activeUser.Correo_Google}</span>
            </p>
          </div>
        </div>
        
        {/* Subscription badges */}
        <div className="flex gap-2">
          <span className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-500 border border-teal-500/15">
            Licencia: {activeUser.Estado_Licencia}
          </span>
          <span className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-500 border border-indigo-500/15">
            Plan: {activeUser.Plan_Suscripcion}
          </span>
        </div>
      </div>

      {/* Google Workspace Sync Section */}
      <div className={`p-6 rounded-[2.5rem] border ${
        darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
      } space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-500/10 text-teal-500 rounded-2xl border border-teal-500/15">
              <Cloud className="w-5 h-5 text-teal-500" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${darkMode ? "text-white" : "text-stone-900"}`}>
                Sincronización Avanzada Google Workspace
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Vincula tu cuenta para agendar tus metas, actividades y tareas automáticamente.
              </p>
            </div>
          </div>

          {isConnected ? (
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 text-xs font-bold text-rose-500 hover:text-white border border-rose-500/35 hover:bg-rose-500 rounded-xl transition-all cursor-pointer"
            >
              Desconectar Cuenta Google
            </button>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={handleGoogleOAuthDirect}
                className="px-4 py-2 text-xs font-bold text-white bg-teal-500 hover:bg-teal-650 rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Conectar Google Workspace</span>
              </button>
            </div>
          )}
        </div>

        {syncMessage && (
          <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-400 text-xs font-semibold border border-teal-500/15">
            {syncMessage}
          </div>
        )}
        {syncError && (
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 text-xs font-semibold border border-rose-500/15">
            {syncError}
          </div>
        )}

        {isConnected && googleUser && (
          <div className={`p-4 rounded-2xl border ${
            darkMode ? "bg-stone-950/60 border-stone-850" : "bg-stone-50/70 border-stone-200"
          } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
            <div className="flex items-center gap-3">
              {googleUser.picture ? (
                <img src={googleUser.picture} alt="Avatar" className="w-10 h-10 rounded-full border border-stone-300 dark:border-stone-800" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-stone-300 dark:bg-stone-800 text-stone-600 dark:text-stone-400 flex items-center justify-center font-bold">
                  {googleUser.name.charAt(0)}
                </div>
              )}
              <div>
                <p className={`text-xs font-bold ${darkMode ? "text-white" : "text-stone-900"}`}>{googleUser.name}</p>
                <p className="text-[10px] text-stone-500">{googleUser.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/15">
                Sincronización Activa
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Profile Card & Settings Form */}
        <div className={`p-6 rounded-[2.5rem] border ${
          darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
        }`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5 ${darkMode ? "text-stone-300" : "text-stone-850"}`}>
            <Edit3 className="w-4 h-4 text-teal-500" />
            <span>Editar Información y Métricas Base</span>
          </h3>

          {profileSuccess && (
            <div className="mb-4 p-3 rounded-2xl bg-teal-500/10 text-teal-400 text-xs font-semibold border border-teal-500/15">
              {profileSuccess}
            </div>
          )}
          {profileError && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 text-rose-500 text-xs font-semibold border border-rose-500/15">
              {profileError}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Nombre Completo</label>
              <input 
                type="text" 
                required
                className={inputClass}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Correo Principal</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-stone-500"><Mail className="w-4 h-4" /></span>
                  <input 
                    type="email" 
                    required
                    className={`${inputClass} pl-10`}
                    value={gmailSinc}
                    onChange={(e) => setGmailSinc(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Correo Google Vinc.</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-stone-500"><Mail className="w-4 h-4" /></span>
                  <input 
                    type="email" 
                    className={`${inputClass} pl-10`}
                    placeholder="correo@gmail.com"
                    value={correoG}
                    onChange={(e) => setCorreoG(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* SaaS Metrics parameters */}
            <div className="pt-4 border-t border-stone-200 dark:border-stone-900 space-y-4">
              <h4 className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 text-stone-400`}>
                <Sliders className="w-3.5 h-3.5" />
                <span>Configuración de Límites y Presupuesto</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Tope Gasto Amoroso (%)</label>
                  <input 
                    type="number" 
                    step="1"
                    className={inputClass}
                    value={topeAmoroso}
                    onChange={(e) => setTopeAmoroso(e.target.value)}
                  />
                  <p className="text-[9px] text-stone-500">Límite mensual recomendado del pilar Amoroso (ej. 30%).</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Salud Personal Base (%)</label>
                  <input 
                    type="number" 
                    step="1"
                    className={inputClass}
                    value={saludBase}
                    onChange={(e) => setSaludBase(e.target.value)}
                  />
                  <p className="text-[9px] text-stone-500">Presupuesto inicial para bienestar del pilar Salud (ej. 20%).</p>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={savingProfile}
              className="py-3 px-6 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-55 flex items-center justify-center gap-1.5"
            >
              {savingProfile ? "Guardando..." : "Guardar Perfil"}
            </button>
          </form>
        </div>

        {/* Change / Reset Password Card */}
        <div className={`p-6 rounded-[2.5rem] border ${
          darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
        } flex flex-col justify-between`}>
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5 ${darkMode ? "text-stone-300" : "text-stone-850"}`}>
              <Lock className="w-4 h-4 text-rose-500" />
              <span>Restablecer Contraseña de Acceso</span>
            </h3>

            {passSuccess && (
              <div className="mb-4 p-3 rounded-2xl bg-teal-500/10 text-teal-400 text-xs font-semibold border border-teal-500/15">
                {passSuccess}
              </div>
            )}
            {passError && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 text-rose-500 text-xs font-semibold border border-rose-500/15">
                {passError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Contraseña Actual</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className={inputClass}
                  value={currPass}
                  onChange={(e) => setCurrPass(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Nueva Contraseña</label>
                <input 
                  type="password" 
                  required
                  placeholder="Mínimo 6 caracteres"
                  className={inputClass}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Confirmar Nueva Contraseña</label>
                <input 
                  type="password" 
                  required
                  placeholder="Repite la nueva contraseña"
                  className={inputClass}
                  value={confPass}
                  onChange={(e) => setConfPass(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                disabled={savingPass}
                className="py-3 px-6 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-55 flex items-center justify-center gap-1.5"
              >
                {savingPass ? "Restableciendo..." : "Cambiar Contraseña"}
              </button>
            </form>
          </div>

          {/* Secure disclaimer */}
          <div className={`mt-6 p-4 rounded-2xl border flex gap-3 text-xs leading-normal ${
            darkMode ? "bg-teal-950/10 border-teal-900/20 text-teal-400" : "bg-teal-50 border-teal-200 text-teal-800"
          }`}>
            <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>
              Tu contraseña se almacena de manera segura utilizando hashing criptográfico SHA-256 de un solo sentido (Tabla A). El SaaS aplica aislamiento de sesión estricto.
            </p>
          </div>
        </div>

      </div>

      {/* Account Actions Section */}
      <div className={`p-6 rounded-[2.5rem] border ${
        darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
      } space-y-4`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${darkMode ? "text-stone-300" : "text-stone-850"}`}>
          <Sliders className="w-4 h-4 text-rose-500" />
          <span>Acciones de la Cuenta</span>
        </h3>
        
        <div className="flex flex-wrap gap-4">
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-5 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-650 text-white text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-2"
            >
              Cerrar Sesión Activa
            </button>
          )}

          {onResetData && (
            <button
              onClick={onResetData}
              className="px-5 py-2.5 rounded-2xl border border-rose-500/35 hover:bg-rose-500/10 text-rose-500 text-xs font-bold transition-all cursor-pointer"
            >
              Reiniciar Datos de la Cuenta
            </button>
          )}
        </div>
      </div>

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm" onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}></div>
          <div className={`relative w-full max-w-sm p-6 rounded-[2rem] border shadow-2xl transition-all ${
            darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-200 text-stone-900"
          }`}>
            <h3 className="text-sm font-bold uppercase tracking-wider text-rose-500 mb-2">{confirmDialog.title}</h3>
            <p className="text-xs text-stone-500 mb-6 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  darkMode 
                    ? "border-stone-800 text-stone-400 hover:text-white hover:bg-stone-850" 
                    : "border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-100"
                }`}
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                  confirmDialog.onConfirm();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-650 text-white transition-all cursor-pointer shadow-md"
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
