import { useState } from "react";
import { GOOGLE_APPS_SCRIPT_CODE } from "../data/googleAppsScript";
import { Copy, Check, ChevronRight, FileText, Database, Calendar, Mail, Settings } from "lucide-react";

export default function ScriptEngineTab({ darkMode }: { darkMode: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const codeSnippetLines = GOOGLE_APPS_SCRIPT_CODE.split("\n");

  const steps = [
    {
      icon: <Database className="w-4 h-4 text-teal-500" />,
      title: "1. Inicialización de Tablas",
      desc: "Ejecuta la función setupDatabase() una vez. Esto creará automáticamente las 4 pestañas formateadas en tu Google Sheet activo con todos los campos de datos relacionales mandatorios."
    },
    {
      icon: <Mail className="w-4 h-4 text-indigo-500" />,
      title: "2. Automatización de Facturas (Gmail)",
      desc: "La función parseGmailInvoices() busca correos de compras, retiros o colegiaturas recurrentes (ej. UVM), lee los datos con Gemini AI Pro/Flash (o Regex si es fallback) e impacta directo los egresos."
    },
    {
      icon: <Calendar className="w-4 h-4 text-rose-500" />,
      title: "3. Sincronización de Agenda (Calendar)",
      desc: "syncFinancialCalendar() lee la Tabla C de deudas y crea eventos color ROJO para fechas de corte y límites de pago. Aplica alertamiento inteligente de [DESCALCE] si un pago vence antes del siguiente cobro."
    },
    {
      icon: <FileText className="w-4 h-4 text-amber-500" />,
      title: "4. Auditoría de Progreso Semanal",
      desc: "generateWeeklyInsights() computa balances, cruza metas de Salud, Escolar y Laboral, consulta a Gemini y escribe automáticamente un reporte ejecutivo consolidado en tu cuenta de Google Docs."
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
      {/* Instructions Pane (Left Col - spans 1) */}
      <div className="lg:col-span-1 space-y-6">
        <div className={`p-5 rounded-2xl border ${
          darkMode ? "bg-stone-900/60 border-stone-800" : "bg-white border-stone-200"
        } shadow-sm`}>
          <div className="inline-flex p-2 rounded-xl mb-4 bg-teal-500/10 text-teal-500">
            <Settings className="w-5 h-5 animate-spin-slow" />
          </div>
          <h3 className={`font-sans font-medium text-lg leading-tight mb-2 ${
            darkMode ? "text-white" : "text-stone-900"
          }`}>
            Guía de Configuración
          </h3>
          <p className="text-stone-500 text-xs mb-4 leading-relaxed">
            Sigue estos pasos para instalar y activar el motor bi-direccional en tu entorno de Google Workspace.
          </p>

          <div className="space-y-4">
            {steps.map((s, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {s.icon}
                </div>
                <div>
                  <h4 className={`text-xs font-semibold ${darkMode ? "text-stone-200" : "text-stone-800"}`}>
                    {s.title}
                  </h4>
                  <p className="text-stone-500 text-[11px] leading-relaxed mt-0.5">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-5 rounded-2xl border ${
          darkMode ? "bg-amber-950/20 border-amber-900/30 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-800"
        } text-xs leading-relaxed space-y-2`}>
          <p className="font-semibold">⚠️ Nota Importante sobre Secretos:</p>
          <p className="text-[11px]">
            Tanto Gmail como Google Docs requieren acceso a la API de Gemini para el análisis predictivo. Recuerda añadir tu llave de API en tu editor de Google Apps Script dentro de la pestaña:
          </p>
          <p className="font-mono text-[10px] bg-stone-900 text-stone-200 px-2 py-1 rounded select-all text-center">
            Configuración del proyecto &gt; Propiedades de Script &gt; GEMINI_API_KEY
          </p>
        </div>
      </div>

      {/* Code Repository Pane (Right Cols - spans 2) */}
      <div className="lg:col-span-2 space-y-4">
        <div className={`flex items-center justify-between p-4 rounded-xl border ${
          darkMode ? "bg-stone-900/80 border-stone-800" : "bg-white border-stone-200"
        }`}>
          <div>
            <h4 className={`font-medium text-sm ${darkMode ? "text-white" : "text-stone-900"}`}>
              googleAppsScript.gs
            </h4>
            <p className="text-[11px] text-stone-500">
              {codeSnippetLines.length} líneas de código nativo documentado
            </p>
          </div>

          <button
            id="copy-script-btn"
            onClick={handleCopy}
            className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
              copied
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                : darkMode
                  ? "bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-200"
                  : "bg-stone-150 hover:bg-stone-200 border-stone-250 text-stone-700"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Código</span>
              </>
            )}
          </button>
        </div>

        {/* Code Block Visualizer */}
        <div className={`relative rounded-2xl border overflow-hidden font-mono text-[11px] md:text-xs shadow-inner h-[500px] overflow-y-auto ${
          darkMode ? "bg-[#18181b] border-stone-800 text-stone-300" : "bg-stone-50 border-stone-200 text-stone-700"
        }`}>
          <div className={`sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-b text-[10px] uppercase font-semibold ${
            darkMode ? "bg-[#1f1f23] border-stone-800/80 text-stone-500" : "bg-stone-200/50 border-stone-200/80 text-stone-500"
          }`}>
            <span>Google Apps Script Motor</span>
            <span>JS / GS</span>
          </div>

          <pre id="script-code-block" className="p-4 leading-relaxed overflow-x-auto selection:bg-teal-500/30 selection:text-white">
            <code>{GOOGLE_APPS_SCRIPT_CODE}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
