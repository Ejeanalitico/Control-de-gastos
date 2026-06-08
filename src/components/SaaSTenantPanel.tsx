import React, { useState } from "react";
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  ShieldCheck, 
  Settings2, 
  Database,
  Calendar,
  AlertTriangle,
  Sparkles,
  Info
} from "lucide-react";
import { 
  Usuario, 
  PlanSuscripcion, 
  EstadoLicencia 
} from "../types";

interface SaaSTenantPanelProps {
  darkMode: boolean;
  usuarios: Usuario[];
  activeUserId: string;
  setActiveUserId: (id: string) => void;
  setUsuarios: React.Dispatch<React.SetStateAction<Usuario[]>>;
  globalStats: {
    ingresosTotal: number;
    ingresosUser: number;
    egresosTotal: number;
    egresosUser: number;
    deudasTotal: number;
    deudasUser: number;
    metasTotal: number;
    metasUser: number;
    eventosTotal: number;
    eventosUser: number;
  };
}

export default function SaaSTenantPanel({
  darkMode,
  usuarios,
  activeUserId,
  setActiveUserId,
  setUsuarios,
  globalStats
}: SaaSTenantPanelProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);

  // New User Form State
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserCal, setNewUserCal] = useState("");
  const [newUserPlan, setNewUserPlan] = useState<PlanSuscripcion>(PlanSuscripcion.PREMIUM_5P);
  const [newUserMultAmoroso, setNewUserMultAmoroso] = useState("0.05");
  const [newUserPresupuestoSalud, setNewUserPresupuestoSalud] = useState("0.12");

  const activeUser = usuarios.find(u => u.ID_Usuario === activeUserId) || usuarios[0];

  // Setting edit form
  const [editPlan, setEditPlan] = useState<PlanSuscripcion>(activeUser?.Plan_Suscripcion);
  const [editEstado, setEditEstado] = useState<EstadoLicencia>(activeUser?.Estado_Licencia);
  const [editMultAmoroso, setEditMultAmoroso] = useState(activeUser?.Multiplicador_Amoroso.toString());
  const [editPresupuestoSalud, setEditPresupuestoSalud] = useState(activeUser?.Presupuesto_Salud_Personal.toString());

  // Trigger values sync when activeUser changes
  React.useEffect(() => {
    if (activeUser) {
      setEditPlan(activeUser.Plan_Suscripcion);
      setEditEstado(activeUser.Estado_Licencia);
      setEditMultAmoroso(activeUser.Multiplicador_Amoroso.toString());
      setEditPresupuestoSalud(activeUser.Presupuesto_Salud_Personal.toString());
    }
  }, [activeUserId, activeUser]);

  const generateUuid = () => {
    return "user-" + Math.random().toString(36).substring(2, 11) + "-" + Math.random().toString(36).substring(2, 6);
  };

  const handleRegisterUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const newId = generateUuid();
    const newUser: Usuario = {
      ID_Usuario: newId,
      Nombre_Usuario: newUserName,
      Gmail_Sincronizado: newUserEmail,
      Correo_Google: newUserEmail,
      Google_Calendar_ID: newUserCal || `${newUserName.toLowerCase().replace(/\s+/g, "_")}_cal`,
      Fecha_Registro: new Date().toISOString().split("T")[0],
      Plan_Suscripcion: newUserPlan,
      Estado_Licencia: EstadoLicencia.ACTIVO,
      Multiplicador_Amoroso: parseFloat(newUserMultAmoroso) || 0.05,
      Presupuesto_Salud_Personal: parseFloat(newUserPresupuestoSalud) || 0.12,
      Tope_Amoroso_Porcentaje: parseFloat(newUserMultAmoroso) || 0.30,
      Salud_Personal_Base_Porcentaje: parseFloat(newUserPresupuestoSalud) || 0.20
    };

    setUsuarios([...usuarios, newUser]);
    setActiveUserId(newId);
    
    // Reset Form
    setNewUserName("");
    setNewUserEmail("");
    setNewUserCal("");
    setIsRegistering(false);
  };

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    setUsuarios(prev => prev.map(u => {
      if (u.ID_Usuario === activeUserId) {
        return {
          ...u,
          Plan_Suscripcion: editPlan,
          Estado_Licencia: editEstado,
          Multiplicador_Amoroso: parseFloat(editMultAmoroso) || 0.05,
          Presupuesto_Salud_Personal: parseFloat(editPresupuestoSalud) || 0.12,
          Tope_Amoroso_Porcentaje: parseFloat(editMultAmoroso) || 0.30,
          Salud_Personal_Base_Porcentaje: parseFloat(editPresupuestoSalud) || 0.20
        };
      }
      return u;
    }));
    setIsEditingSettings(false);
  };

  return (
    <div className={`p-5 rounded-2xl border ${
      darkMode ? "bg-stone-900/80 border-stone-800" : "bg-white border-stone-200"
    } shadow-sm space-y-4`}>
      
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-850">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-teal-600" />
          <h4 className={`text-xs uppercase font-bold tracking-widest ${darkMode ? "text-stone-300" : "text-stone-700"}`}>
            SaaS Tenant Control Center (Multi-Usuario)
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tenant Selector Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-stone-500 font-medium">Tenant Activo:</span>
            <select
              id="active-tenant-select"
              value={activeUserId}
              onChange={(e) => {
                setActiveUserId(e.target.value);
                setIsEditingSettings(false);
              }}
              className={`text-xs py-1 px-2.5 rounded-lg border font-semibold ${
                darkMode 
                  ? "bg-stone-850 border-stone-700 text-white" 
                  : "bg-stone-100 border-stone-250 text-stone-800"
              }`}
            >
              {usuarios.map(u => (
                <option key={u.ID_Usuario} value={u.ID_Usuario}>
                  {u.Nombre_Usuario} ({u.Plan_Suscripcion})
                </option>
              ))}
            </select>
          </div>

          <button
            id="btn-saas-toggle-register"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setIsEditingSettings(false);
            }}
            className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Registrar</span>
          </button>
        </div>
      </div>

      {isRegistering ? (
        /* Register Tenant Form */
        <form onSubmit={handleRegisterUser} className="p-4 rounded-xl bg-stone-50 dark:bg-stone-850/50 border border-stone-200 dark:border-stone-800 space-y-4 animate-slideDown">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-wider text-teal-600 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              Nuevo Cliente Inquilino (SaaS Tenant)
            </h5>
            <button
              type="button"
              onClick={() => setIsRegistering(false)}
              className="text-[11px] text-stone-500 hover:text-stone-700 font-bold"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Nombre Completo</label>
              <input
                id="tenant-reg-name"
                type="text"
                required
                value={newUserName}
                placeholder="Ej. Martha Beltrán"
                onChange={(e) => setNewUserName(e.target.value)}
                className={`w-full text-xs p-2 rounded-lg border ${
                  darkMode ? "bg-stone-900 border-stone-700 text-white" : "bg-white border-stone-200"
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Gmail Sincronizado</label>
              <input
                id="tenant-reg-email"
                type="email"
                required
                value={newUserEmail}
                placeholder="martha.beltran@gmail.com"
                onChange={(e) => setNewUserEmail(e.target.value)}
                className={`w-full text-xs p-2 rounded-lg border ${
                  darkMode ? "bg-stone-900 border-stone-700 text-white" : "bg-white border-stone-200"
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Calendar ID (GCP Sync)</label>
              <input
                id="tenant-reg-cal"
                type="text"
                value={newUserCal}
                placeholder="Auto-generado si queda vacío"
                onChange={(e) => setNewUserCal(e.target.value)}
                className={`w-full text-xs p-2 rounded-lg border ${
                  darkMode ? "bg-stone-900 border-stone-700 text-white" : "bg-white border-stone-200"
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Plan de Suscripción</label>
              <select
                id="tenant-reg-plan"
                value={newUserPlan}
                onChange={(e) => setNewUserPlan(e.target.value as PlanSuscripcion)}
                className={`w-full text-xs p-2 rounded-lg border ${
                  darkMode ? "bg-stone-900 border-stone-700 text-white" : "bg-white border-stone-200"
                }`}
              >
                <option value={PlanSuscripcion.STARTER}>Starter</option>
                <option value={PlanSuscripcion.PREMIUM_5P}>Premium_5P</option>
                <option value={PlanSuscripcion.ELITE_MENTOR}>Elite_Mentor</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Multiplicador Amoroso</label>
              <input
                id="tenant-reg-mult-amoroso"
                type="number"
                step="0.01"
                min="0.01"
                max="0.20"
                value={newUserMultAmoroso}
                onChange={(e) => setNewUserMultAmoroso(e.target.value)}
                className={`w-full text-xs p-2 rounded-lg border ${
                  darkMode ? "bg-stone-900 border-stone-700 text-white" : "bg-white border-stone-200"
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Presupuesto Salud-Personal</label>
              <input
                id="tenant-reg-presupuesto-salud"
                type="number"
                step="0.01"
                min="0.05"
                max="0.30"
                value={newUserPresupuestoSalud}
                onChange={(e) => setNewUserPresupuestoSalud(e.target.value)}
                className={`w-full text-xs p-2 rounded-lg border ${
                  darkMode ? "bg-stone-900 border-stone-700 text-white" : "bg-white border-stone-200"
                }`}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
            <button
              id="tenant-reg-submit"
              type="submit"
              className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Registrar e Iniciar Sesión</span>
            </button>
          </div>
        </form>
      ) : isEditingSettings ? (
        /* Edit tenant configuration */
        <form onSubmit={handleSaveChanges} className="p-4 rounded-xl bg-stone-50 dark:bg-stone-850/50 border border-stone-200 dark:border-stone-800 space-y-4 animate-slideDown">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5" />
              Configuración y Contrato Financiero: {activeUser.Nombre_Usuario}
            </h5>
            <button
              type="button"
              onClick={() => setIsEditingSettings(false)}
              className="text-[11px] text-stone-500 hover:text-stone-700 font-bold"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Plan</label>
              <select
                id="tenant-edit-plan"
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value as PlanSuscripcion)}
                className={`w-full text-xs p-2 rounded-lg border ${
                  darkMode ? "bg-stone-900 border-stone-700 text-white" : "bg-white border-stone-200"
                }`}
              >
                <option value={PlanSuscripcion.STARTER}>Starter</option>
                <option value={PlanSuscripcion.PREMIUM_5P}>Premium_5P</option>
                <option value={PlanSuscripcion.ELITE_MENTOR}>Elite_Mentor</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Estado Licencia</label>
              <select
                id="tenant-edit-licencia"
                value={editEstado}
                onChange={(e) => setEditEstado(e.target.value as EstadoLicencia)}
                className={`w-full text-xs p-2 rounded-lg border ${
                  darkMode ? "bg-stone-900 border-stone-700 text-white" : "bg-white border-stone-200"
                }`}
              >
                <option value={EstadoLicencia.ACTIVO}>Activo</option>
                <option value={EstadoLicencia.SUSPENDIDO}>Suspendido</option>
                <option value={EstadoLicencia.DEMO}>Demo</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Tope Amoroso (% Neto)</label>
              <input
                id="tenant-edit-mult-amoroso"
                type="number"
                step="0.01"
                min="0.01"
                max="0.20"
                value={editMultAmoroso}
                onChange={(e) => setEditMultAmoroso(e.target.value)}
                className={`w-full text-xs p-2 rounded-lg border ${
                  darkMode ? "bg-stone-900 border-stone-700 text-white" : "bg-white border-stone-200"
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Salud/Personal Base (% Neto)</label>
              <input
                id="tenant-edit-presupuesto-salud"
                type="number"
                step="0.01"
                min="0.05"
                max="0.30"
                value={editPresupuestoSalud}
                onChange={(e) => setEditPresupuestoSalud(e.target.value)}
                className={`w-full text-xs p-2 rounded-lg border ${
                  darkMode ? "bg-stone-900 border-stone-700 text-white" : "bg-white border-stone-200"
                }`}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
            <button
              id="tenant-edit-submit"
              type="submit"
              className="cursor-pointer inline-flex items-center gap-1 px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-sm"
            >
              <span>Guardar Configuración</span>
            </button>
          </div>
        </form>
      ) : (
        /* Display Current Tenant Information Card */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
          
          {/* Tenant Visual Profile Badge */}
          <div className={`p-4 rounded-xl flex flex-col justify-between border ${
            activeUser.Estado_Licencia === EstadoLicencia.SUSPENDIDO
              ? "bg-rose-500/5 border-rose-500/20"
              : darkMode 
                ? "bg-stone-950/50 border-stone-800/80" 
                : "bg-stone-50 border-stone-150"
          }`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg flex items-center justify-center ${
                  activeUser.Plan_Suscripcion === PlanSuscripcion.ELITE_MENTOR
                    ? "bg-purple-500/15 text-purple-400"
                    : activeUser.Plan_Suscripcion === PlanSuscripcion.PREMIUM_5P
                      ? "bg-teal-500/15 text-teal-400"
                      : "bg-stone-500/15 text-stone-400"
                }`}>
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h5 className={`font-sans font-semibold text-xs leading-tight ${darkMode ? "text-stone-100" : "text-stone-900"}`}>
                    {activeUser.Nombre_Usuario}
                  </h5>
                  <p className="text-[10px] text-stone-500 leading-none mt-0.5">{activeUser.Gmail_Sincronizado}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 items-center mt-3">
                {/* Subscription Badge */}
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                  activeUser.Plan_Suscripcion === PlanSuscripcion.ELITE_MENTOR
                    ? "bg-purple-600/20 text-purple-400 border border-purple-500/20"
                    : activeUser.Plan_Suscripcion === PlanSuscripcion.PREMIUM_5P
                      ? "bg-teal-600/20 text-teal-400 border border-teal-500/20"
                      : "bg-stone-500/20 text-stone-400 border border-stone-500/20"
                }`}>
                  {activeUser.Plan_Suscripcion}
                </span>

                {/* State Badge */}
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                  activeUser.Estado_Licencia === EstadoLicencia.ACTIVO
                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/20"
                    : activeUser.Estado_Licencia === EstadoLicencia.DEMO
                      ? "bg-amber-600/20 text-amber-400 border border-amber-500/20"
                      : "bg-rose-600/20 text-rose-400 border border-rose-500/20"
                }`}>
                  {activeUser.Estado_Licencia}
                </span>
              </div>
            </div>

            {activeUser.Estado_Licencia === EstadoLicencia.SUSPENDIDO && (
              <div className="mt-3 flex gap-1.5 items-start p-2 rounded-lg bg-rose-500/10 border border-rose-550/20 text-rose-400 text-[10px] leading-tight">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-rose-400" />
                <span>Atención: Tenant suspendido temporalmente por impago de cuota. Vista en modo Solo Lectura.</span>
              </div>
            )}
          </div>

          {/* Logical Multi-User Relational Database Isolation Stats */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2.5">
            <h6 className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
              <Database className="w-3 h-3 text-stone-500" />
              Estructura DataLake Multi-Tenant
            </h6>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="space-y-1">
                <p className="text-stone-500 text-[10px]">Filtrado Relacional:</p>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                  <span className="font-mono text-[9px] truncate tracking-tight text-teal-400 bg-stone-900 border border-stone-850 px-1 py-0.5 rounded" title={activeUser.ID_Usuario}>
                    ID_Usuario = {activeUser.ID_Usuario.substring(0, 11)}...
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-stone-500 text-[10px]">Workspace Cal:</p>
                <div className="flex items-center gap-1 text-[10px] text-stone-400 truncate">
                  <Calendar className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
                  <span className="truncate">{activeUser.Google_Calendar_ID}</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-stone-500 italic leading-tight">
              Aislamiento lógico garantizado. Todas las consultas inyectan <code className="text-teal-400 font-mono text-[9px] bg-stone-900 px-1 py-0.5 rounded">ID_Usuario</code> en el indexador.
            </p>
          </div>

          {/* Datalake Metrics */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
            <h6 className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
              <Database className="w-3 h-3 text-stone-500" />
              Matriz de Filas Relacionales
            </h6>
            
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center text-stone-500">
                <span>Ingresos en Datalake:</span>
                <span className="font-mono font-semibold text-stone-300">
                  {globalStats.ingresosUser} <span className="text-[9px] text-stone-600">de {globalStats.ingresosTotal}</span>
                </span>
              </div>
              <div className="flex justify-between items-center text-stone-500">
                <span>Egresos en Datalake:</span>
                <span className="font-mono font-semibold text-stone-300">
                  {globalStats.egresosUser} <span className="text-[9px] text-stone-600">de {globalStats.egresosTotal}</span>
                </span>
              </div>
              <div className="flex justify-between items-center text-stone-500">
                <span>Deudas en Datalake:</span>
                <span className="font-mono font-semibold text-stone-300">
                  {globalStats.deudasUser} <span className="text-[9px] text-stone-600">de {globalStats.deudasTotal}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Configuration and Multipliers Dashboard */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h6 className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                  <Settings2 className="w-3 h-3 text-stone-500" />
                  Pre-ajustes y Limites
                </h6>
                <button
                  id="btn-saas-edit-settings"
                  onClick={() => setIsEditingSettings(true)}
                  className="text-[10px] text-teal-500 hover:text-teal-400 font-bold flex items-center gap-0.5 cursor-pointer"
                >
                  Configurar
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] mt-2">
                <div className={`p-1.5 rounded border ${darkMode ? "bg-stone-900 border-stone-800" : "bg-stone-50 border-stone-150"}`}>
                  <p className="text-stone-500 font-medium">Tope Amoroso:</p>
                  <p className="font-mono font-bold text-xs mt-0.5 text-stone-300">
                    {(activeUser.Multiplicador_Amoroso * 100).toFixed(0)}% <span className="text-[9px] font-normal text-stone-500">Neto</span>
                  </p>
                </div>
                <div className={`p-1.5 rounded border ${darkMode ? "bg-stone-900 border-stone-800" : "bg-stone-50 border-stone-150"}`}>
                  <p className="text-stone-500 font-medium">Salud/Personal Base:</p>
                  <p className="font-mono font-bold text-xs mt-0.5 text-stone-300">
                    {(activeUser.Presupuesto_Salud_Personal * 100).toFixed(0)}% <span className="text-[9px] font-normal text-stone-500">Neto</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[9px] text-stone-500 mt-1">
              <Info className="w-3 h-3 text-stone-500 flex-shrink-0" />
              <span className="leading-tight leading-none">Cruce lógico de Salud y Deudas de 5 Pilares activo.</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
