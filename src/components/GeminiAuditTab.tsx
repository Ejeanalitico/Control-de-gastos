import { useState } from "react";
import { 
  Sparkles, 
  Activity, 
  TrendingDown, 
  AlertTriangle, 
  Calendar, 
  TrendingUp,
  RotateCcw,
  BookOpen,
  PieChart,
  DollarSign
} from "lucide-react";
import { Ingreso, Egreso, Deuda, MetaPilar, AgendaEvento, Usuario } from "../types";

interface GeminiAuditTabProps {
  darkMode: boolean;
  activeUser: Usuario;
  ingresos: Ingreso[];
  egresos: Egreso[];
  deudas: Deuda[];
  metas: MetaPilar[];
  eventos: AgendaEvento[];
  currency: string;
}

export default function GeminiAuditTab({ 
  darkMode, 
  activeUser,
  ingresos, 
  egresos, 
  deudas, 
  metas,
  eventos,
  currency
}: GeminiAuditTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"audit" | "optimize">("audit");
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [optimizeResult, setOptimizeResult] = useState<string | null>(null);
  const [errorObj, setErrorObj] = useState<string | null>(null);

  const testAudit = async () => {
    setLoading(true);
    setErrorObj(null);
    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeUser, ingresos, egresos, deudas, metas, eventos, currency }),
      });
      if (!response.ok) {
        throw new Error("Error en el servidor al generar diagnóstico");
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setAuditResult(data.text);
    } catch (e: any) {
      console.error(e);
      setErrorObj(e.message || "Por favor, verifica que tu GEMINI_API_KEY esté configurada en Secrets.");
    } finally {
      setLoading(false);
    }
  };

  const testOptimize = async () => {
    setLoading(true);
    setErrorObj(null);
    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingresos, deudas, egresos, currency }),
      });
      if (!response.ok) {
        throw new Error("Error en el servidor al optimizar deudas");
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setOptimizeResult(data.text);
    } catch (e: any) {
      console.error(e);
      setErrorObj(e.message || "Por favor, verifica que tu GEMINI_API_KEY esté configurada en Secrets.");
    } finally {
      setLoading(false);
    }
  };

  // Simple and fully custom stable Markdown parser to HTML with safe styles
  const renderMarkdown = (mdStr: string) => {
    if (!mdStr) return "";
    
    // Split into lines
    const lines = mdStr.split("\n");
    return lines.map((line, idx) => {
      let trimmed = line.trim();
      
      // Headers
      if (trimmed.startsWith("###")) {
        return (
          <h4 key={idx} className={`font-semibold text-sm md:text-base mt-4 mb-2 ${darkMode ? "text-teal-400" : "text-teal-700"}`}>
            {trimmed.slice(3).trim()}
          </h4>
        );
      }
      if (trimmed.startsWith("##")) {
        return (
          <h3 key={idx} className={`font-medium text-base md:text-lg mt-6 mb-3 border-b pb-1 ${darkMode ? "text-stone-100 border-stone-800" : "text-stone-900 border-stone-150"}`}>
            {trimmed.slice(2).trim()}
          </h3>
        );
      }
      if (trimmed.startsWith("#")) {
        return (
          <h2 key={idx} className={`font-semibold text-lg md:text-xl mt-8 mb-4 ${darkMode ? "text-white" : "text-stone-900"}`}>
            {trimmed.slice(1).trim()}
          </h2>
        );
      }
      
      // Bullets
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        let content = trimmed.substring(1).trim();
        // Bold in bullet
        return (
          <li key={idx} className="ml-5 list-disc text-xs leading-relaxed mb-1.5 text-stone-500">
            {formatBoldText(content)}
          </li>
        );
      }

      if (trimmed.match(/^\d+\./)) {
        let match = trimmed.match(/^(\d+)\.(.*)/);
        if (match) {
          return (
            <div key={idx} className="ml-4 flex gap-2 text-xs leading-relaxed mb-2">
              <span className="font-semibold text-teal-600">{match[1]}.</span>
              <span className="text-stone-500">{formatBoldText(match[2].trim())}</span>
            </div>
          );
        }
      }

      // Empty separator
      if (trimmed === "") {
        return <div key={idx} className="h-2" />;
      }

      // Regular paragraph
      return (
        <p key={idx} className="text-xs text-stone-500 leading-relaxed mb-2.5">
          {formatBoldText(trimmed)}
        </p>
      );
    });
  };

  const formatBoldText = (text: string) => {
    // Regex for bold text markdown **text**
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-semibold text-stone-900 dark:text-stone-100">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Sub Tabs Selection */}
      <div className="flex border-b border-stone-250 dark:border-stone-800">
        <button
          id="btn-subtab-audit"
          onClick={() => { setActiveSubTab("audit"); setErrorObj(null); }}
          className={`px-5 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "audit"
              ? "border-teal-500 text-teal-500 dark:text-teal-400"
              : "border-transparent text-stone-500 hover:text-stone-700"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Auditoría de 5 Pilares</span>
        </button>
        <button
          id="btn-subtab-optimize"
          onClick={() => { setActiveSubTab("optimize"); setErrorObj(null); }}
          className={`px-5 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "optimize"
              ? "border-indigo-500 text-indigo-500 dark:text-indigo-400"
              : "border-transparent text-stone-500 hover:text-stone-700"
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>Plan Avalancha de Deudas</span>
        </button>
      </div>

      {activeSubTab === "audit" ? (
        <div className="space-y-6">
          {/* Top Panel for Audit Action */}
          <div className={`p-6 rounded-[2rem] border transition-all ${
            darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
          } flex flex-col md:flex-row md:items-center justify-between gap-4`}>
            <div className="max-w-xl text-left">
              <h4 className={`text-sm font-sans font-bold leading-tight ${darkMode ? "text-white" : "text-stone-900"}`}>
                Auditoría Semanal de 5 Pilares con Gemini AI
              </h4>
              <p className="text-xs text-stone-500 mt-1 leading-normal">
                Analiza de forma proactiva la liquidez mensual, plazos de tarjetas y el impacto cruzado entre tus pilares de crecimiento (Salud, Escolar, Laboral, Personal, Amoroso).
              </p>
            </div>
            <div>
              <button
                id="run-gemini-audit-btn"
                disabled={loading}
                onClick={testAudit}
                className="cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-50 transition-all duration-200 shadow-md shadow-teal-500/15"
              >
                {loading ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Calculando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-300" />
                    <span>Ejecutar Auditoría Semanal</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Audit Results (Full Width) */}
          <div className="w-full text-left">
            {auditResult ? (
              <div className={`p-6 rounded-2xl border ${
                darkMode ? "bg-stone-900/60 border-stone-800" : "bg-white border-stone-200"
              } shadow-sm space-y-4`}>
                <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <h4 className={`text-sm font-semibold uppercase tracking-wider ${darkMode ? "text-stone-100" : "text-stone-800"}`}>
                      Auditoría Integrada de 5 Pilares
                    </h4>
                  </div>
                  <button
                    id="reset-audit-btn"
                    onClick={() => setAuditResult(null)}
                    className="text-[11px] text-stone-500 hover:text-stone-700 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Limpiar</span>
                  </button>
                </div>

                <div className="space-y-1">
                  {renderMarkdown(auditResult)}
                </div>
              </div>
            ) : loading ? (
              <div className={`p-12 rounded-2xl border flex flex-col items-center justify-center text-center h-full min-h-[300px] ${
                darkMode ? "bg-stone-900/20 border-stone-800" : "bg-stone-50/50 border-stone-200"
              }`}>
                <div className="relative mb-4">
                  <div className="w-12 h-12 rounded-full border-4 border-teal-500/20 border-t-teal-500 animate-spin" />
                  <Sparkles className="w-5 h-5 text-emerald-400 absolute top-3.5 left-3.5 animate-bounce" />
                </div>
                <h5 className={`font-semibold text-xs leading-none uppercase tracking-widest ${darkMode ? "text-stone-200" : "text-stone-800"}`}>
                  Compilando matrices de datos relacionales...
                </h5>
                <p className="text-[11px] text-stone-500 max-w-sm mt-2 leading-relaxed">
                  Gemini está analizando tus gastos hormiga, proyectando los meses de retraso para tus metas y cross-impactando el pilar Salud sobre el Personal. Por favor, mantén la pestaña activa.
                </p>
              </div>
            ) : (
              <div className={`p-10 rounded-2xl border flex flex-col items-center justify-center text-center h-full min-h-[350px] ${
                darkMode ? "bg-stone-900/10 border-stone-800/80" : "bg-stone-50 border-stone-150"
              }`}>
                <Activity className="w-8 h-8 text-stone-400 dark:text-stone-600 mb-3 animate-pulse" />
                <h5 className={`font-sans font-medium text-sm ${darkMode ? "text-stone-300" : "text-stone-700"}`}>
                  Sin reporte ejecutado
                </h5>
                <p className="text-stone-500 text-xs max-w-sm mt-1 mb-4 leading-relaxed">
                  Presiona el botón de la izquierda para procesar tu flujo de caja neto e iniciar un análisis completo con IA proactiva sobre tus metas SMART y gastos corrientes de Reconstrucción.
                </p>
              </div>
            )}

            {errorObj && (
              <div className="mt-4 p-4 rounded-xl border border-rose-900/30 bg-rose-950/20 text-rose-400 text-xs leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Fallo en la comunicación con la IA:</span> {errorObj}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Debt Avalanche details */}
          <div className="lg:col-span-1 space-y-4">
            <div className={`p-4 rounded-xl border ${
              darkMode ? "bg-stone-900/40 border-stone-800" : "bg-stone-50 border-stone-200"
            }`}>
              <h4 className="text-xs font-bold leading-tight uppercase tracking-wider text-indigo-600 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Filosofía de Alud (Avalancha)
              </h4>
              <p className="text-[11px] text-stone-500 leading-relaxed mb-4">
                El algoritmo de asignación óptima combate los intereses de forma matemática.
              </p>

              <div className="space-y-3">
                <div className="flex gap-2.5 items-start">
                  <div className="p-1 rounded bg-stone-200 dark:bg-stone-850 text-indigo-500 text-stone-600 mt-0.5 text-xs font-semibold">1</div>
                  <p className="text-[10px] text-stone-500 leading-relaxed">
                    <strong>Tasa Mayor Primero:</strong> Se ordenan todos tus créditos de mayor a menor según su costo financiero (Tasa de Interés Anual).
                  </p>
                </div>
                <div className="flex gap-2.5 items-start">
                  <div className="p-1 rounded bg-stone-200 dark:bg-stone-850 text-indigo-500 text-stone-600 mt-0.5 text-xs font-semibold">2</div>
                  <p className="text-[10px] text-stone-500 leading-relaxed">
                    <strong>Pagar Mínimos:</strong> Se inyecta el pago mínimo obligatorio para cada instrumento financiero para evitar penalizaciones y daño crediticio.
                  </p>
                </div>
                <div className="flex gap-2.5 items-start">
                  <div className="p-1 rounded bg-stone-200 dark:bg-stone-850 text-indigo-500 text-stone-600 mt-0.5 text-xs font-semibold">3</div>
                  <p className="text-[10px] text-stone-500 leading-relaxed">
                    <strong>Inyección del Flujo Remanente:</strong> Todo el dinero disponible se añade a la tarjeta cabeza de interés para erradicar el principal hiper-rápido.
                  </p>
                </div>
              </div>
            </div>

            {/* Run Button Container */}
            <div className={`p-4 rounded-xl border ${
              darkMode ? "bg-stone-900/90 border-stone-800" : "bg-white border-stone-200"
            }`}>
              <button
                id="run-gemini-optimize-btn"
                disabled={loading}
                onClick={testOptimize}
                className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all duration-200"
              >
                {loading ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Calculando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-300" />
                    <span>Generar Plan Avalancha</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-stone-500 text-center mt-2 leading-tight">
                Sincronizado con límites de pago del <strong>Google Calendar</strong>
              </p>
            </div>
          </div>

          {/* Avalanche Results */}
          <div className="lg:col-span-3">
            {optimizeResult ? (
              <div className={`p-6 rounded-2xl border ${
                darkMode ? "bg-stone-900/60 border-stone-800" : "bg-white border-stone-200"
              } shadow-sm space-y-4`}>
                <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <h4 className={`text-sm font-semibold uppercase tracking-wider ${darkMode ? "text-stone-100" : "text-stone-800"}`}>
                      Optimización de amortizaciones (Avalancha)
                    </h4>
                  </div>
                  <button
                    id="reset-optimize-btn"
                    onClick={() => setOptimizeResult(null)}
                    className="text-[11px] text-stone-500 hover:text-stone-700 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Limpiar</span>
                  </button>
                </div>

                <div className="space-y-1">
                  {renderMarkdown(optimizeResult)}
                </div>
              </div>
            ) : loading ? (
              <div className={`p-12 rounded-2xl border flex flex-col items-center justify-center text-center h-full min-h-[300px] ${
                darkMode ? "bg-stone-900/20 border-stone-800" : "bg-stone-50/50 border-stone-200"
              }`}>
                <div className="relative mb-4">
                  <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  <Sparkles className="w-5 h-5 text-indigo-400 absolute top-3.5 left-3.5 animate-bounce" />
                </div>
                <h5 className={`font-semibold text-xs leading-none uppercase tracking-widest ${darkMode ? "text-stone-200" : "text-stone-800"}`}>
                  Calculando interés acumulado y remanente...
                </h5>
                <p className="text-[11px] text-stone-500 max-w-sm mt-2 leading-relaxed">
                  Gemini está estructurando el orden óptimo de salida de pasivos de acuerdo con el costo financiero, programando inyecciones y simulando los plazos de salida definitiva de deudas.
                </p>
              </div>
            ) : (
              <div className={`p-10 rounded-2xl border flex flex-col items-center justify-center text-center h-full min-h-[350px] ${
                darkMode ? "bg-stone-900/10 border-stone-800/80" : "bg-stone-50 border-stone-150"
              }`}>
                <TrendingDown className="w-8 h-8 text-stone-400 dark:text-stone-600 mb-3 animate-pulse" />
                <h5 className={`font-sans font-medium text-sm ${darkMode ? "text-stone-300" : "text-stone-700"}`}>
                  Sin plan avalancha generado
                </h5>
                <p className="text-stone-500 text-xs max-w-sm mt-1 mb-4 leading-relaxed">
                  Presiona el botón de la izquierda para recalcular la amortización acelerada. Gemini consolidará las tasas anuales por encima del pago mínimo mensual y generará el instructivo exacto de pago.
                </p>
              </div>
            )}

            {errorObj && (
              <div className="mt-4 p-4 rounded-xl border border-rose-900/30 bg-rose-950/20 text-rose-400 text-xs leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Fallo en la comunicación con la IA:</span> {errorObj}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
