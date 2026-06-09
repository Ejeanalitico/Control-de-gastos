import React, { useState } from "react";
import { User, Lock, Sliders, ShieldCheck, Mail, Edit3 } from "lucide-react";
import { Usuario } from "../types";

interface ProfileTabProps {
  darkMode: boolean;
  activeUser: Usuario;
  onProfileUpdate: (updatedUser: Usuario) => void;
}

export default function ProfileTab({ darkMode, activeUser, onProfileUpdate }: ProfileTabProps) {
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
              UUID de inquilino: <span className="font-mono">{activeUser.ID_Usuario}</span>
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

    </div>
  );
}
