import React, { useState, useMemo } from "react";
import { 
  Target, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  HelpCircle, 
  ArrowRight, 
  GitCommit, 
  Calendar, 
  DollarSign, 
  CreditCard,
  X,
  PlusCircle,
  FolderPlus,
  GitMerge,
  Info,
  ChevronDown,
  ChevronUp,
  Link
} from "lucide-react";
import { 
  MetaPilar, 
  Pilar, 
  CorrelacionPilar, 
  Micrometa, 
  Deuda, 
  Usuario, 
  EstadoMeta,
  CategoriaPilar,
  TipoTarjeta,
  TipoGasto
} from "../types";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from "recharts";

// --- COLOR CONVERSION HELPERS ---
function hsvToRgb(h: number, s: number, v: number) {
  s /= 100;
  v /= 100;
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h / 60);
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100)
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (val: number) => {
    const hex = val.toString(16).toUpperCase();
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string) {
  const cleanHex = hex.replace(/^#/, "");
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  } else if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  return null;
}

// --- ADVANCED CUSTOM COLOR PICKER COMPONENT ---
interface AdvancedColorPickerProps {
  color: string;
  onChange: (hex: string) => void;
  onClose: () => void;
  darkMode: boolean;
  getNodeColor: (colorName?: string) => any;
}

const AdvancedColorPicker: React.FC<AdvancedColorPickerProps> = ({
  color,
  onChange,
  onClose,
  darkMode,
  getNodeColor
}) => {
  const initialHex = useMemo(() => {
    if (!color) return "#0ea5e9";
    if (color.startsWith("#")) return color;
    return getNodeColor(color).hex || "#0ea5e9";
  }, [color, getNodeColor]);

  const [hsv, setHsv] = useState(() => {
    const rgbVal = hexToRgb(initialHex) || { r: 14, g: 165, b: 233 };
    return rgbToHsv(rgbVal.r, rgbVal.g, rgbVal.b);
  });

  const rgb = useMemo(() => hsvToRgb(hsv.h, hsv.s, hsv.v), [hsv]);
  const hex = useMemo(() => rgbToHex(rgb.r, rgb.g, rgb.b), [rgb]);

  const [tempHex, setTempHex] = useState(hex);

  // Sync tempHex when hex changes from slider or canvas
  React.useEffect(() => {
    setTempHex(hex);
  }, [hex]);

  React.useEffect(() => {
    const rgbProp = hexToRgb(initialHex) || { r: 14, g: 165, b: 233 };
    const hsvProp = rgbToHsv(rgbProp.r, rgbProp.g, rgbProp.b);
    const rgbCurrent = hsvToRgb(hsv.h, hsv.s, hsv.v);
    const hexCurrent = rgbToHex(rgbCurrent.r, rgbCurrent.g, rgbCurrent.b);
    if (initialHex.toLowerCase() !== hexCurrent.toLowerCase()) {
      setHsv(hsvProp);
    }
  }, [initialHex]);

  const canvasRef = React.useRef<HTMLDivElement>(null);
  const hueSliderRef = React.useRef<HTMLDivElement>(null);

  const handleCanvasMove = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let x = clientX - rect.left;
    let y = clientY - rect.top;
    x = Math.max(0, Math.min(rect.width, x));
    y = Math.max(0, Math.min(rect.height, y));
    const newS = Math.round((x / rect.width) * 100);
    const newV = Math.round((1 - y / rect.height) * 100);
    const newHsv = { ...hsv, s: newS, v: newV };
    setHsv(newHsv);
    const newRgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
    onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  const handleHueMove = (clientX: number) => {
    if (!hueSliderRef.current) return;
    const rect = hueSliderRef.current.getBoundingClientRect();
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(rect.width, x));
    const newH = Math.round((x / rect.width) * 360);
    const newHsv = { ...hsv, h: newH };
    setHsv(newHsv);
    const newRgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
    onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    handleCanvasMove(e.clientX, e.clientY);
    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleCanvasMove(moveEvent.clientX, moveEvent.clientY);
    };
    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleCanvasTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    handleCanvasMove(e.touches[0].clientX, e.touches[0].clientY);
    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length === 0) return;
      handleCanvasMove(moveEvent.touches[0].clientX, moveEvent.touches[0].clientY);
    };
    const handleTouchEnd = () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  };

  const handleHueMouseDown = (e: React.MouseEvent) => {
    handleHueMove(e.clientX);
    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleHueMove(moveEvent.clientX);
    };
    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleHueTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    handleHueMove(e.touches[0].clientX);
    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length === 0) return;
      handleHueMove(moveEvent.touches[0].clientX);
    };
    const handleTouchEnd = () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTempHex(val);

    const cleanVal = val.replace(/^#/, "");
    if (cleanVal.length === 3 || cleanVal.length === 6) {
      if (/^[0-9A-Fa-f]{3}$/.test(cleanVal) || /^[0-9A-Fa-f]{6}$/.test(cleanVal)) {
        const formattedHex = "#" + cleanVal;
        const parsedRgb = hexToRgb(formattedHex);
        if (parsedRgb) {
          const parsedHsv = rgbToHsv(parsedRgb.r, parsedRgb.g, parsedRgb.b);
          setHsv(parsedHsv);
          onChange(formattedHex);
        }
      }
    }
  };

  const handleRgbChange = (channel: 'r' | 'g' | 'b', valStr: string) => {
    const cleanVal = valStr.replace(/[^0-9]/g, "");
    let val = parseInt(cleanVal);
    if (isNaN(val)) val = 0;
    val = Math.max(0, Math.min(255, val));
    const newRgb = { ...rgb, [channel]: val };
    const newHsv = rgbToHsv(newRgb.r, newRgb.g, newRgb.b);
    setHsv(newHsv);
    onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  const cursorLeft = `${hsv.s}%`;
  const cursorTop = `${100 - hsv.v}%`;
  const hueCursorLeft = `${(hsv.h / 360) * 100}%`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-[320px] rounded-3xl p-6 border shadow-2xl transition-all bg-white border-stone-200 text-stone-900"
      >
        {/* Back navigation matching screenshot: < Atrás */}
        <button 
          onClick={onClose}
          className="flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors uppercase tracking-wider mb-4 cursor-pointer"
        >
          <span className="text-sm font-medium">&lt;</span>
          <span>Atrás</span>
        </button>

        {/* 2D Canvas (Saturation-Value) */}
        <div 
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onTouchStart={handleCanvasTouchStart}
          className="relative w-full h-[180px] rounded-xl cursor-crosshair overflow-hidden select-none border border-stone-200 shadow-inner mb-4"
          style={{
            backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
            backgroundImage: `
              linear-gradient(to bottom, transparent, #000),
              linear-gradient(to right, #fff, transparent)
            `,
            backgroundBlendMode: 'multiply'
          }}
        >
          {/* Thumb handle */}
          <div 
            className="absolute w-7 h-7 rounded-full border border-stone-850 shadow-lg -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all pointer-events-none"
            style={{ 
              left: cursorLeft, 
              top: cursorTop, 
              backgroundColor: hex
            }}
          />
        </div>

        {/* Hue Spectrum Slider */}
        <div 
          ref={hueSliderRef}
          onMouseDown={handleHueMouseDown}
          onTouchStart={handleHueTouchStart}
          className="relative w-full h-[18px] rounded-full cursor-ew-resize overflow-visible select-none shadow-inner mb-6"
          style={{
            background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
          }}
        >
          {/* Hue thumb */}
          <div 
            className="absolute w-6 h-6 rounded-full border border-stone-850 shadow-md top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all pointer-events-none"
            style={{ 
              left: hueCursorLeft,
              backgroundColor: `hsl(${hsv.h}, 100%, 50%)`
            }}
          />
        </div>

        {/* Hex & RGB Inputs Grid */}
        <div className="grid grid-cols-5 gap-2 text-left">
          {/* Hexadecimal input */}
          <div className="col-span-2 space-y-1">
            <label className="text-[10px] font-bold text-stone-500 block tracking-wide uppercase">Hexadecimal</label>
            <input 
              type="text" 
              className="w-full text-xs font-mono p-2 border border-stone-250 bg-white text-stone-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-center"
              value={tempHex}
              onChange={handleHexChange}
              onBlur={() => setTempHex(hex)}
            />
          </div>

          {/* Rojo input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-500 block tracking-wide uppercase">Rojo</label>
            <input 
              type="text" 
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full text-xs p-2 px-1 border border-stone-250 bg-white text-stone-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-center animate-fadeIn"
              value={rgb.r}
              onChange={(e) => handleRgbChange('r', e.target.value)}
            />
          </div>

          {/* Verde input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-500 block tracking-wide uppercase">Verde</label>
            <input 
              type="text" 
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full text-xs p-2 px-1 border border-stone-250 bg-white text-stone-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-center animate-fadeIn"
              value={rgb.g}
              onChange={(e) => handleRgbChange('g', e.target.value)}
            />
          </div>

          {/* Azul input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-500 block tracking-wide uppercase">Azul</label>
            <input 
              type="text" 
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full text-xs p-2 px-1 border border-stone-250 bg-white text-stone-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-center animate-fadeIn"
              value={rgb.b}
              onChange={(e) => handleRgbChange('b', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

interface PilaresTabProps {
  darkMode: boolean;
  activeUser: Usuario;
  metas: MetaPilar[];
  setMetas: React.Dispatch<React.SetStateAction<MetaPilar[]>>;
  currency: string;
  
  // Dynamic datasets passed from App.tsx
  pilares: Pilar[];
  setPilares: React.Dispatch<React.SetStateAction<Pilar[]>>;
  correlacionesPilares: CorrelacionPilar[];
  setCorrelacionesPilares: React.Dispatch<React.SetStateAction<CorrelacionPilar[]>>;
  micrometas: Micrometa[];
  setMicrometas: React.Dispatch<React.SetStateAction<Micrometa[]>>;
  
  // Card databases to deduct expense from
  deudas: Deuda[];
  setDeudas: React.Dispatch<React.SetStateAction<Deuda[]>>;
  setEgresos: React.Dispatch<React.SetStateAction<any[]>>;
  highlightedMetaId?: string | null;
  onClearHighlight?: () => void;
}

export default function PilaresTab({
  darkMode,
  activeUser,
  metas,
  setMetas,
  currency,
  pilares,
  setPilares,
  correlacionesPilares,
  setCorrelacionesPilares,
  micrometas,
  setMicrometas,
  deudas,
  setDeudas,
  setEgresos,
  highlightedMetaId,
  onClearHighlight
}: PilaresTabProps) {
  
  const getTodayDateStr = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const todayStr = getTodayDateStr();

  const getValidGoogleToken = () => {
    const gToken = localStorage.getItem(`pilar5_g_token_${activeUser.ID_Usuario}`);
    const isConnected = localStorage.getItem(`pilar5_g_connected_${activeUser.ID_Usuario}`);
    const expiresAt = localStorage.getItem(`pilar5_g_expires_at_${activeUser.ID_Usuario}`);

    if (gToken) {
      const isExpired = expiresAt ? Date.now() > parseInt(expiresAt) : false;
      if (isExpired) {
        localStorage.removeItem(`pilar5_g_token_${activeUser.ID_Usuario}`);
        localStorage.removeItem(`pilar5_g_connected_${activeUser.ID_Usuario}`);
        localStorage.removeItem(`pilar5_g_user_${activeUser.ID_Usuario}`);
        localStorage.removeItem(`pilar5_g_expires_at_${activeUser.ID_Usuario}`);
        fetch("/api/auth/google/unlink", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: activeUser.ID_Usuario })
        }).catch(() => {});
        return null;
      }
    }
    return isConnected === "true" ? gToken : null;
  };

  // UI Interactive States
  const [collapsedPilarIds, setCollapsedPilarIds] = useState<Record<string, boolean>>({});
  const [expandedMetaIds, setExpandedMetaIds] = useState<Record<string, boolean>>({});
  const [addingMetaToPilarId, setAddingMetaToPilarId] = useState<string | null>(null);

  const [localHighlightId, setLocalHighlightId] = useState<string | null>(null);

  React.useEffect(() => {
    if (highlightedMetaId) {
      setLocalHighlightId(highlightedMetaId);
      setExpandedMetaIds(prev => ({
        ...prev,
        [highlightedMetaId]: true
      }));

      const metaObj = metas.find(m => m.ID_Meta === highlightedMetaId);
      if (metaObj) {
        const pilarObj = pilares.find(p => p.ID_Pilar === metaObj.Pilar || p.Nombre === metaObj.Pilar);
        if (pilarObj) {
          setCollapsedPilarIds(prev => ({
            ...prev,
            [pilarObj.ID_Pilar]: false
          }));
        }
      }

      setTimeout(() => {
        const el = document.getElementById(`meta-card-${highlightedMetaId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        if (onClearHighlight) {
          onClearHighlight();
        }
      }, 300);

      const timer = setTimeout(() => {
        setLocalHighlightId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedMetaId, metas, pilares, onClearHighlight]);
  const [addingMmToMetaId, setAddingMmToMetaId] = useState<string | null>(null);
  const [showConnections, setShowConnections] = useState(false);

  // Completing meta modal state
  const [completingMeta, setCompletingMeta] = useState<MetaPilar | null>(null);
  const [selectedCardIdForMeta, setSelectedCardIdForMeta] = useState<string>("");
  const [connectionType, setConnectionType] = useState<"pilar" | "meta">("pilar");
  const [selectedPillarIdForExpense, setSelectedPillarIdForExpense] = useState<string>("");
  const [selectedMetaIdForExpense, setSelectedMetaIdForExpense] = useState<string>("");

  const togglePilarCollapse = (pilarId: string) => {
    setCollapsedPilarIds(prev => ({
      ...prev,
      [pilarId]: prev[pilarId] === false ? true : false
    }));
  };

  // Form States - Dynamic Pilar Creator
  const [newPilarNombre, setNewPilarNombre] = useState("");
  const [newPilarPadreId, setNewPilarPadreId] = useState("");
  const [newPilarColor, setNewPilarColor] = useState("blue");
  const [showPilarForm, setShowPForm] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newPilarMetas, setNewPilarMetas] = useState<string[]>([""]);

  // Helper to close pilar form and reset its states
  const setShowPilarForm = (val: boolean) => {
    setShowPForm(val);
    if (!val) {
      setNewPilarMetas([""]);
    }
  };

  const checkAndAutoUpdateMetaStatus = async (metaId: string, updatedMicrometasList: Micrometa[]) => {
    const parentMeta = metas.find(m => m.ID_Meta === metaId);
    if (!parentMeta) return;

    const relevantMms = updatedMicrometasList.filter(mm => mm.ID_Meta === metaId);
    if (relevantMms.length === 0) return;

    const hasRecurrentMm = relevantMms.some(mm => mm.Recurrencia && mm.Recurrencia !== "none");
    const allCompleted = !hasRecurrentMm && relevantMms.every(mm => mm.Estado === "Completada" || mm.Estado === "Cancelada");
    const expectedStatus = allCompleted ? EstadoMeta.LOGRADO : EstadoMeta.EN_PROCESO;

    if (parentMeta.Estado !== expectedStatus) {
      setMetas(prev => prev.map(m => m.ID_Meta === metaId ? { ...m, Estado: expectedStatus } : m));

      try {
        await fetch(`/api/metas/${metaId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...parentMeta,
            Estado: expectedStatus
          })
        });
      } catch (err) {
        console.error("Fallo al actualizar el estado de la meta padre:", err);
      }
    }
  };

  // Form States - New Correlation Creator
  const [corrOrigenId, setCorrOrigenId] = useState("");
  const [corrDestinoId, setCorrDestinoId] = useState("");
  const [showCorrForm, setShowCorrForm] = useState(false);

  // Form States - Meta Creator (Shared)
  const [metaSmartText, setMetaSmartText] = useState("");
  const [metaIndicador, setMetaIndicador] = useState("");
  const [metaPresupuesto, setMetaPresupuesto] = useState("");
  const [metaFecha, setMetaFecha] = useState("");

  // Form States - Micrometa Creator (Shared)
  const [mmTitulo, setMmTitulo] = useState("");
  const [mmGeneraGasto, setMmGeneraGasto] = useState(false);
  const [mmMonto, setMmMonto] = useState("");
  const [mmGastoPendiente, setMmGastoPendiente] = useState(true);
  const [mmTarjetaId, setMmTarjetaId] = useState("__balance__");
  const [mmFecha, setMmFecha] = useState("");
  const [mmCorrelaciones, setMmCorrelaciones] = useState<string[]>([]);
  const [mmRecurrencia, setMmRecurrencia] = useState<string>("none");
  const [mmRepeticiones, setMmRepeticiones] = useState<string>("5");


  // Custom Confirm dialog state
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
  const formatAmount = (val: number) => {
    const parts = (val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).split(".");
    return (
      <>
        <span>{symbol}{parts[0]}</span>
        <span className="text-[0.75em] font-semibold opacity-85">.{parts[1]}</span>
      </>
    );
  };

  const formatAmountText = (val: number) => {
    return symbol + (val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getCurrencySymbol = (code: string) => {
    if (code === "EUR") return "€";
    if (code === "GBP") return "£";
    return "$";
  };
  const symbol = getCurrencySymbol(currency);

  // Memos & Calculations
  const rootPilares = useMemo(() => pilares.filter(p => !p.ID_Padre), [pilares]);

  const getSubpilares = (rootId: string) => pilares.filter(p => p.ID_Padre === rootId);

  // Compute node progress (% of metas completed)
  const pilarProgress = useMemo(() => {
    const map: Record<string, { total: number; completed: number; pct: number }> = {};
    
    pilares.forEach(p => {
      const pMetas = metas.filter(m => m.Pilar === p.ID_Pilar || m.Pilar === p.Nombre);
      const total = pMetas.length;
      const completed = pMetas.filter(m => m.Estado === EstadoMeta.LOGRADO).length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      map[p.ID_Pilar] = { total, completed, pct };
    });
    
    return map;
  }, [pilares, metas]);

  // Combined stats (Pilar + Subpillars) for Root Visual Progress Bar
  const getPilarAndChildrenProgress = (pilarId: string) => {
    const childIds = pilares.filter(p => p.ID_Padre === pilarId).map(p => p.ID_Pilar);
    const allIds = [pilarId, ...childIds];
    const allNames = pilares.filter(p => allIds.includes(p.ID_Pilar)).map(p => p.Nombre);
    const relevantMetas = metas.filter(m => allIds.includes(m.Pilar) || allNames.includes(m.Pilar));
    
    const total = relevantMetas.length;
    const completed = relevantMetas.filter(m => m.Estado === EstadoMeta.LOGRADO).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  };

  // Recharts Progress per Pillar Dataset
  const pilarChartData = useMemo(() => {
    return pilares.map(p => {
      const stats = pilarProgress[p.ID_Pilar] || { total: 0, completed: 0, pct: 0 };
      return {
        name: p.Nombre,
        'Progreso %': stats.pct,
        'Completadas': stats.completed,
        'Total': stats.total,
        color: p.Color || "blue"
      };
    }).filter(item => item.Total > 0);
  }, [pilares, pilarProgress]);

  // Recharts Overall Ecosistema Dataset
  const overallStats = useMemo(() => {
    const validMetas = metas.filter(m => pilares.some(p => p.ID_Pilar === m.Pilar));
    const total = validMetas.length;
    const completed = validMetas.filter(m => m.Estado === EstadoMeta.LOGRADO).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  }, [metas, pilares]);

  const generalChartData = useMemo(() => {
    if (overallStats.total === 0) {
      return [
        { name: "Sin Metas", value: 1, color: darkMode ? "#27272a" : "#f4f4f5" }
      ];
    }
    return [
      { name: "Completadas", value: overallStats.completed, color: "#14b8a6" },
      { name: "Pendientes", value: overallStats.total - overallStats.completed, color: darkMode ? "#27272a" : "#f4f4f5" }
    ];
  }, [overallStats, darkMode]);

  // --- ACTIONS ---

  const handleAddPilar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPilarNombre.trim()) return;

    // Filter out empty goals
    const activeMetas = newPilarMetas.map(m => m.trim()).filter(m => m !== "");
    if (activeMetas.length === 0) {
      alert("Debes ingresar al menos una meta para registrar el pilar.");
      return;
    }

    const newId = "pilar-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
    const pilarObj: Pilar = {
      ID_Pilar: newId,
      ID_Usuario: activeUser.ID_Usuario,
      Nombre: newPilarNombre.trim(),
      ID_Padre: newPilarPadreId || null,
      Color: newPilarPadreId 
        ? pilares.find(p => p.ID_Pilar === newPilarPadreId)?.Color || newPilarColor
        : newPilarColor
    };

    try {
      const res = await fetch("/api/pilares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pilarObj)
      });
      if (res.ok) {
        // Create each meta associated to the new pilar
        for (const metaText of activeMetas) {
          const metaId = "meta-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
          const metaObj: MetaPilar = {
            ID_Usuario: activeUser.ID_Usuario,
            ID_Meta: metaId,
            Pilar: newId,
            Meta_SMART: metaText,
            Indicador_Exito: "Por definir",
            Estado: EstadoMeta.EN_PROCESO,
            Presupuesto_Asignado: 0,
            Sincronizar_Calendario: 0
          };
          await fetch("/api/metas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(metaObj)
          });
        }

        // Fetch freshly updated data from the server
        const fetchRes = await fetch(`/api/data?userId=${activeUser.ID_Usuario}`);
        if (fetchRes.ok) {
          const data = await fetchRes.json();
          setPilares(data.pilares || []);
          setMetas(data.metas || []);
        } else {
          setPilares(prev => [...prev, pilarObj]);
        }

        setNewPilarNombre("");
        setNewPilarPadreId("");
        setNewPilarMetas([""]);
        setShowPilarForm(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const executeDeletePilar = async (pilarId: string) => {
    try {
      const childPilarIds = pilares.filter(p => p.ID_Padre === pilarId).map(p => p.ID_Pilar);
      const allPilarIds = [pilarId, ...childPilarIds];

      const gToken = getValidGoogleToken();
      if (gToken && !gToken.startsWith("mock_google_token_")) {
        const relevantMetas = metas.filter(m => allPilarIds.includes(m.Pilar));
        for (const metaObj of relevantMetas) {
          if (metaObj.ID_Evento_Calendario) {
            try {
              const isRecur = metaObj.ID_Evento_Calendario.includes("_");
              await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${metaObj.ID_Evento_Calendario}`, {
                method: isRecur ? "PATCH" : "DELETE",
                headers: { 
                  Authorization: `Bearer ${gToken}`,
                  ...(isRecur ? { "Content-Type": "application/json" } : {})
                },
                body: isRecur ? JSON.stringify({ status: "cancelled" }) : undefined
              });
            } catch (e) {
              console.error("GCal delete failed for meta during pilar delete:", e);
            }
          }
          const childMms = micrometas.filter(mm => mm.ID_Meta === metaObj.ID_Meta);
          for (const mm of childMms) {
            if (mm.ID_Evento_Calendario) {
              try {
                const isRecur = mm.ID_Evento_Calendario.includes("_");
                await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${mm.ID_Evento_Calendario}`, {
                  method: isRecur ? "PATCH" : "DELETE",
                  headers: { 
                    Authorization: `Bearer ${gToken}`,
                    ...(isRecur ? { "Content-Type": "application/json" } : {})
                  },
                  body: isRecur ? JSON.stringify({ status: "cancelled" }) : undefined
                });
              } catch (e) {
                console.error("GCal delete failed for micrometa during pilar delete:", e);
              }
            }
          }
        }
      }

      const res = await fetch(`/api/pilares/${pilarId}`, { method: "DELETE" });
      if (res.ok) {
        setPilares(prev => prev.filter(p => !allPilarIds.includes(p.ID_Pilar)));
        setCorrelacionesPilares(prev => prev.filter(c => !allPilarIds.includes(c.ID_Origen) && !allPilarIds.includes(c.ID_Destino)));
        
        const deletedMetaIds = metas.filter(m => allPilarIds.includes(m.Pilar)).map(m => m.ID_Meta);
        setMetas(prev => prev.filter(m => !allPilarIds.includes(m.Pilar)));
        setMicrometas(prev => prev.filter(mm => !deletedMetaIds.includes(mm.ID_Meta)));
      }
    } catch (err) {
      console.error(err);
    }
  };


  const handleDeletePilar = (pilarId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Eliminar Pilar",
      message: "¿Seguro que deseas borrar este pilar/subpilar? Se eliminarán también sus subpilares y metas asociadas.",
      onConfirm: () => executeDeletePilar(pilarId)
    });
  };

  const handleAddCorrelation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!corrOrigenId || !corrDestinoId || corrOrigenId === corrDestinoId) return;

    const corrId = "corr-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
    const corrObj: CorrelacionPilar = {
      ID_Correlacion: corrId,
      ID_Usuario: activeUser.ID_Usuario,
      ID_Origen: corrOrigenId,
      ID_Destino: corrDestinoId
    };

    try {
      const res = await fetch("/api/pilares/correlaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corrObj)
      });
      if (res.ok) {
        setCorrelacionesPilares(prev => [...prev, corrObj]);
        setCorrOrigenId("");
        setCorrDestinoId("");
        setShowCorrForm(false);
        setShowConnections(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const executeDeleteCorrelation = async (corrId: string) => {
    try {
      const res = await fetch(`/api/pilares/correlaciones/${corrId}`, { method: "DELETE" });
      if (res.ok) {
        setCorrelacionesPilares(prev => prev.filter(c => c.ID_Correlacion !== corrId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCorrelation = (corrId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Eliminar Correlación",
      message: "¿Seguro que deseas eliminar esta correlación entre pilares?",
      onConfirm: () => executeDeleteCorrelation(corrId)
    });
  };

  const handleAddMeta = async (e: React.FormEvent, targetPilarId: string) => {
    e.preventDefault();
    const targetPilar = pilares.find(p => p.ID_Pilar === targetPilarId);
    if (!targetPilar || !metaSmartText.trim()) return;

    const newId = "meta-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
    const parsePres = parseFloat(metaPresupuesto) || 0;

    let googleEventId: string | null = null;
    const gToken = getValidGoogleToken();

    if (metaFecha && gToken) {
      if (gToken.startsWith("mock_google_token_")) {
        googleEventId = "mock-meta-evt-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
      } else {
        try {
          const syncRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${gToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              summary: `🎯 Meta: ${metaSmartText.trim()}`,
              description: `Pilar: ${targetPilar.Nombre} | Indicador: ${metaIndicador.trim()} | Presupuesto: ${parsePres}`,
              start: {
                dateTime: `${metaFecha}T09:00:00-06:00`
              },
              end: {
                dateTime: `${metaFecha}T10:00:00-06:00`
              }
            })
          });
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            googleEventId = syncData.id;
          }
        } catch (syncErr) {
          console.error("Google Calendar sync failed for Meta:", syncErr);
        }
      }
    }

    const metaObj: MetaPilar = {
      ID_Usuario: activeUser.ID_Usuario,
      ID_Meta: newId,
      Pilar: targetPilar.ID_Pilar,
      Meta_SMART: metaSmartText.trim(),
      Indicador_Exito: metaIndicador.trim() || "Por definir",
      Estado: EstadoMeta.EN_PROCESO,
      Presupuesto_Asignado: parsePres,
      Fecha_Meta: metaFecha || undefined,
      Sincronizar_Calendario: gToken && metaFecha ? 1 : 0,
      ID_Evento_Calendario: googleEventId
    };

    try {
      const res = await fetch("/api/metas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metaObj)
      });
      if (res.ok) {
        const fetchRes = await fetch(`/api/data?userId=${activeUser.ID_Usuario}`);
        if (fetchRes.ok) {
          const data = await fetchRes.json();
          setMetas(data.metas || []);
        } else {
          setMetas(prev => [metaObj, ...prev]);
        }
        setMetaSmartText("");
        setMetaIndicador("");
        setMetaPresupuesto("");
        setMetaFecha("");
        setAddingMetaToPilarId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleMeta = async (meta: MetaPilar) => {
    const nextStatus = meta.Estado === EstadoMeta.LOGRADO ? EstadoMeta.EN_PROCESO : EstadoMeta.LOGRADO;
    
    if (nextStatus === EstadoMeta.LOGRADO && meta.Presupuesto_Asignado > 0) {
      setCompletingMeta(meta);
      setSelectedCardIdForMeta(deudas[0]?.ID_Instrumento || "");
      setConnectionType("pilar");
      setSelectedPillarIdForExpense(meta.Pilar || "");
      setSelectedMetaIdForExpense("");
      return;
    }

    // Optimistic UI update
    setMetas(prev => prev.map(m => m.ID_Meta === meta.ID_Meta ? { ...m, Estado: nextStatus } : m));

    try {
      const res = await fetch(`/api/metas/${meta.ID_Meta}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Meta_SMART: meta.Meta_SMART,
          Indicador_Exito: meta.Indicador_Exito,
          Estado: nextStatus,
          Presupuesto_Asignado: meta.Presupuesto_Asignado,
          Fecha_Meta: meta.Fecha_Meta,
          Sincronizar_Calendario: meta.Sincronizar_Calendario
        })
      });
      if (!res.ok) {
        // Revert on error
        setMetas(prev => prev.map(m => m.ID_Meta === meta.ID_Meta ? meta : m));
      }
    } catch (e) {
      console.error(e);
      setMetas(prev => prev.map(m => m.ID_Meta === meta.ID_Meta ? meta : m));
    }
  };

  const handleConfirmMetaCompletion = async () => {
    if (!completingMeta) return;
    const meta = completingMeta;
    const nextStatus = EstadoMeta.LOGRADO;
    const parsePres = meta.Presupuesto_Asignado;

    try {
      // 1. Update the meta status in DB
      const resMeta = await fetch(`/api/metas/${meta.ID_Meta}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Meta_SMART: meta.Meta_SMART,
          Indicador_Exito: meta.Indicador_Exito,
          Estado: nextStatus,
          Presupuesto_Asignado: meta.Presupuesto_Asignado,
          Fecha_Meta: meta.Fecha_Meta,
          Sincronizar_Calendario: meta.Sincronizar_Calendario
        })
      });

      if (!resMeta.ok) throw new Error("Fallo al actualizar el estado de la meta.");

      // 2. Deduct budget from the chosen card
      if (selectedCardIdForMeta) {
        const card = deudas.find(d => d.ID_Instrumento === selectedCardIdForMeta);
        if (card) {
          const isCredit = card.Tipo === TipoTarjeta.CREDITO;
          const updatedCard = {
            ...card,
            Saldo_Disponible: card.Saldo_Disponible - parsePres,
            Deuda_Actual: isCredit ? (card.Deuda_Actual + parsePres) : card.Deuda_Actual,
            Balance_Total_Pendiente: isCredit ? (card.Balance_Total_Pendiente + parsePres) : card.Balance_Total_Pendiente
          };

          const resCard = await fetch(`/api/deudas/${selectedCardIdForMeta}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedCard)
          });
          if (!resCard.ok) throw new Error("Fallo al deducir presupuesto de la tarjeta.");
          
          // Update local deudas state
          setDeudas(prev => prev.map(d => d.ID_Instrumento === selectedCardIdForMeta ? updatedCard : d));

          // 3. Create an Egreso record
          let targetPilarCategory = selectedPillarIdForExpense;
          let conceptText = `Meta Lograda: ${meta.Meta_SMART}`;
          if (connectionType === "meta" && selectedMetaIdForExpense) {
            const connectedMeta = metas.find(m => m.ID_Meta === selectedMetaIdForExpense);
            if (connectedMeta) {
              targetPilarCategory = connectedMeta.Pilar;
              conceptText = `Meta Lograda: ${meta.Meta_SMART} (Vinculada a Meta: ${connectedMeta.Meta_SMART})`;
            }
          }

          const newEgreso = {
            ID_Usuario: activeUser.ID_Usuario,
            ID_Egreso: "egr-meta-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now(),
            ID_Actividad_Origen: `evt-meta-${meta.ID_Meta}`,
            ID_Tarjeta_Utilizada: selectedCardIdForMeta,
            Fecha: new Date().toISOString().split("T")[0],
            Concepto: conceptText,
            Categoria_Pilar: targetPilarCategory || CategoriaPilar.PERSONAL,
            Subcategoria: "Presupuesto Meta",
            Monto: parsePres,
            Metodo_Pago: card.Nombre_Tarjeta,
            Tipo_Gasto: TipoGasto.VARIABLE
          };

          const resEgreso = await fetch("/api/egresos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newEgreso)
          });
          if (resEgreso.ok) {
            setEgresos(prev => [newEgreso, ...prev]);
          }
        }
      }

      // Update local metas state
      setMetas(prev => prev.map(m => m.ID_Meta === meta.ID_Meta ? { ...m, Estado: nextStatus } : m));
      setCompletingMeta(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error al completar la meta.");
    }
  };

  const executeDeleteMeta = async (id: string) => {
    try {
      const gToken = getValidGoogleToken();

      if (gToken && !gToken.startsWith("mock_google_token_")) {
        // 1. Delete Meta Google Calendar event
        const metaObj = metas.find(m => m.ID_Meta === id);
        if (metaObj && metaObj.ID_Evento_Calendario) {
          try {
            const isRecur = metaObj.ID_Evento_Calendario.includes("_");
            await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${metaObj.ID_Evento_Calendario}`, {
              method: isRecur ? "PATCH" : "DELETE",
              headers: { 
                Authorization: `Bearer ${gToken}`,
                ...(isRecur ? { "Content-Type": "application/json" } : {})
              },
              body: isRecur ? JSON.stringify({ status: "cancelled" }) : undefined
            });
          } catch (e) {
            console.error("GCal delete failed for meta:", e);
          }
        }

        // 2. Delete child Micrometas Google Calendar events
        const childMms = micrometas.filter(mm => mm.ID_Meta === id);
        for (const mm of childMms) {
          if (mm.ID_Evento_Calendario) {
            try {
              const isRecur = mm.ID_Evento_Calendario.includes("_");
              await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${mm.ID_Evento_Calendario}`, {
                method: isRecur ? "PATCH" : "DELETE",
                headers: { 
                  Authorization: `Bearer ${gToken}`,
                  ...(isRecur ? { "Content-Type": "application/json" } : {})
                },
                body: isRecur ? JSON.stringify({ status: "cancelled" }) : undefined
              });
            } catch (e) {
              console.error("GCal delete failed for child micrometa:", e);
            }
          }
        }
      }

      const res = await fetch(`/api/metas/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMetas(prev => prev.filter(m => m.ID_Meta !== id));
        setMicrometas(prev => prev.filter(mm => mm.ID_Meta !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMeta = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Eliminar Meta",
      message: "¿Seguro que deseas eliminar esta meta y sus micrometas asociadas? Se borrarán también de Google Calendar si están sincronizadas.",
      onConfirm: () => executeDeleteMeta(id)
    });
  };

  const handleAddMicrometa = async (e: React.FormEvent, targetMetaId: string) => {
    e.preventDefault();
    if (!targetMetaId || !mmTitulo.trim()) return;

    const mmId = "mm-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
    const parseMonto = parseFloat(mmMonto) || 0;

    let googleEventId: string | null = null;
    const gToken = getValidGoogleToken();

    const metaObj = metas.find(m => m.ID_Meta === targetMetaId);
    const metaPilarName = metaObj ? metaObj.Pilar : "Personal";

    if (mmFecha && gToken) {
      if (gToken.startsWith("mock_google_token_")) {
        googleEventId = "mock-mm-evt-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
      } else {
        try {
          const calendarBody: any = {
            summary: `🏁 Micrometa: ${mmTitulo.trim()}`,
            description: `Pilar: ${metaPilarName} | Gasto: ${parseMonto}`,
            start: {
              dateTime: `${mmFecha}T08:00:00-06:00`
            },
            end: {
              dateTime: `${mmFecha}T09:00:00-06:00`
            },
            reminders: {
              useDefault: false,
              overrides: [
                { method: "popup", minutes: 0 }
              ]
            }
          };

          if (mmRecurrencia && mmRecurrencia !== "none") {
            const freq = mmRecurrencia === "diaria" ? "DAILY" : mmRecurrencia === "semanal" ? "WEEKLY" : "MONTHLY";
            calendarBody.recurrence = [`RRULE:FREQ=${freq};COUNT=${parseInt(mmRepeticiones) || 5}`];
          }

          const syncRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${gToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(calendarBody)
          });
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            googleEventId = syncData.id;
          }
        } catch (syncErr) {
          console.error("Google Calendar sync failed for Micrometa:", syncErr);
        }
      }
    }

    const mmObj: Micrometa = {
      ID_Micrometa: mmId,
      ID_Usuario: activeUser.ID_Usuario,
      ID_Meta: targetMetaId,
      Titulo: mmTitulo.trim(),
      Estado: "Pendiente",
      Genera_Gasto: mmGeneraGasto ? 1 : 0,
      Monto_Gasto: parseMonto,
      Gasto_Pendiente: (mmGeneraGasto && mmGastoPendiente) ? 1 : 0,
      ID_Tarjeta_Gasto: mmGeneraGasto && mmTarjetaId && mmTarjetaId !== "__balance__" ? mmTarjetaId : null,
      Fecha_Planificada: mmFecha || undefined,
      Sincronizar_Calendario: gToken && mmFecha ? 1 : 0,
      ID_Evento_Calendario: googleEventId,
      Correlaciones: mmCorrelaciones,
      Recurrencia: mmRecurrencia !== "none" ? mmRecurrencia : null
    };

    try {
      const res = await fetch("/api/micrometas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...mmObj,
          Repeticiones: parseInt(mmRepeticiones) || 1
        })
      });
      if (res.ok) {
        const fetchRes = await fetch(`/api/data?userId=${activeUser.ID_Usuario}`);
        if (fetchRes.ok) {
          const data = await fetchRes.json();
          setMicrometas(data.micrometas || []);
          await checkAndAutoUpdateMetaStatus(targetMetaId, data.micrometas || []);
        } else {
          const nextMms = [...micrometas, mmObj];
          setMicrometas(nextMms);
          await checkAndAutoUpdateMetaStatus(targetMetaId, nextMms);
        }
        setMmTitulo("");
        setMmGeneraGasto(false);
        setMmMonto("");
        setMmGastoPendiente(true);
        setMmTarjetaId("__balance__");
        setMmFecha("");
        setMmCorrelaciones([]);
        setMmRecurrencia("none");
        setMmRepeticiones("5");
        setAddingMmToMetaId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateMicrometaStatus = async (mm: Micrometa, newStatus: "Pendiente" | "Completada" | "Cancelada") => {
    try {
      const res = await fetch(`/api/micrometas/${mm.ID_Micrometa}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...mm,
          Estado: newStatus
        })
      });
      if (res.ok) {
        const data = await res.json();
        
        // Update local micrometa state
        const nextMms = micrometas.map(m => 
          m.ID_Micrometa === mm.ID_Micrometa 
            ? { ...m, Estado: newStatus, Gasto_Pendiente: data.gastoDeducido ? 0 : m.Gasto_Pendiente } 
            : m
        );
        setMicrometas(nextMms);
        await checkAndAutoUpdateMetaStatus(mm.ID_Meta, nextMms);

        // If expense balance was successfully deducted, reload accounts & Egresos in background
        if (data.gastoDeducido) {
          const fetchRes = await fetch(`/api/data?userId=${activeUser.ID_Usuario}`);
          if (fetchRes.ok) {
            const data = await fetchRes.json();
            setDeudas(data.deudas || []);
            setEgresos(data.egresos || []);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const executeDeleteMicrometa = async (id: string) => {
    try {
      const gToken = getValidGoogleToken();

      const mmObj = micrometas.find(m => m.ID_Micrometa === id);
      if (mmObj && mmObj.ID_Evento_Calendario && gToken && !gToken.startsWith("mock_google_token_")) {
        try {
          const isRecur = mmObj.ID_Evento_Calendario.includes("_");
          await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${mmObj.ID_Evento_Calendario}`, {
            method: isRecur ? "PATCH" : "DELETE",
            headers: { 
              Authorization: `Bearer ${gToken}`,
              ...(isRecur ? { "Content-Type": "application/json" } : {})
            },
            body: isRecur ? JSON.stringify({ status: "cancelled" }) : undefined
          });
        } catch (e) {
          console.error("GCal delete failed for micrometa:", e);
        }
      }

      const res = await fetch(`/api/micrometas/${id}`, { method: "DELETE" });
      if (res.ok) {
        const nextMms = micrometas.filter(m => m.ID_Micrometa !== id);
        setMicrometas(nextMms);
        if (mmObj) {
          await checkAndAutoUpdateMetaStatus(mmObj.ID_Meta, nextMms);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMicrometa = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Eliminar Micrometa",
      message: "¿Seguro que deseas eliminar esta micrometa? Se borrará también de Google Calendar si está sincronizada.",
      onConfirm: () => executeDeleteMicrometa(id)
    });
  };

  const handleToggleMmCorr = (pilId: string) => {
    setMmCorrelaciones(prev => 
      prev.includes(pilId) ? prev.filter(id => id !== pilId) : [...prev, pilId]
    );
  };

  const availableAccounts = useMemo(() => {
    return deudas.filter(d => d.ID_Usuario === activeUser.ID_Usuario);
  }, [deudas, activeUser.ID_Usuario]);

  const getNodeColor = (colorName?: string) => {
    const defaultColor = { 
      text: "text-sky-500", 
      bg: "bg-sky-500/10", 
      border: "border-sky-500/20", 
      progress: "bg-sky-500", 
      glow: "shadow-sky-500/10",
      hex: "#0ea5e9",
      isCustomHex: false
    };

    if (!colorName) return defaultColor;

    if (colorName.startsWith("#")) {
      return {
        text: "", 
        bg: "", 
        border: "", 
        progress: "", 
        glow: "",
        hex: colorName,
        isCustomHex: true
      };
    }

    switch(colorName) {
      case "green": return { 
        text: "text-emerald-500", 
        bg: "bg-emerald-500/10", 
        border: "border-emerald-500/20", 
        progress: "bg-emerald-500", 
        glow: "shadow-emerald-500/10",
        hex: "#10b981",
        isCustomHex: false
      };
      case "orange": return { 
        text: "text-orange-500", 
        bg: "bg-orange-500/10", 
        border: "border-orange-500/20", 
        progress: "bg-orange-500", 
        glow: "shadow-orange-500/10",
        hex: "#f97316",
        isCustomHex: false
      };
      case "purple": return { 
        text: "text-purple-500", 
        bg: "bg-purple-500/10", 
        border: "border-purple-500/20", 
        progress: "bg-purple-500", 
        glow: "shadow-purple-500/10",
        hex: "#a855f7",
        isCustomHex: false
      };
      case "red": return { 
        text: "text-rose-500", 
        bg: "bg-rose-500/10", 
        border: "border-rose-500/20", 
        progress: "bg-rose-500", 
        glow: "shadow-rose-500/10",
        hex: "#f43f5e",
        isCustomHex: false
      };
      case "blue": return { 
        text: "text-sky-500", 
        bg: "bg-sky-500/10", 
        border: "border-sky-500/20", 
        progress: "bg-sky-500", 
        glow: "shadow-sky-500/10",
        hex: "#0ea5e9",
        isCustomHex: false
      };
      default: return defaultColor;
    }
  };

  const renderMetasList = (pilarId: string, pilarNombre: string) => {
    const pilarMetas = metas.filter(m => m.Pilar === pilarId || m.Pilar === pilarNombre);

    return (
      <div className="mt-4 space-y-3 pl-2 sm:pl-4 border-l border-stone-200 dark:border-stone-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Metas SMART ({pilarMetas.length})
          </span>
          <button
            onClick={() => {
              setAddingMetaToPilarId(addingMetaToPilarId === pilarId ? null : pilarId);
              setMetaSmartText("");
              setMetaIndicador("");
              setMetaPresupuesto("");
              setMetaFecha("");
            }}
            className="text-[9px] font-bold text-teal-500 uppercase hover:underline cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir Meta</span>
          </button>
        </div>

        {/* Inline Meta Creation Form */}
        {addingMetaToPilarId === pilarId && (
          <form 
            onSubmit={(e) => handleAddMeta(e, pilarId)} 
            className={`p-4 rounded-2xl border space-y-3 animate-fadeIn ${
              darkMode ? "bg-stone-950/40 border-stone-850" : "bg-stone-50 border-stone-200"
            }`}
          >
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-stone-500">Meta SMART</label>
              <input 
                type="text" required placeholder="¿Qué vas a lograr?"
                className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none ${
                  darkMode ? "bg-stone-900 border-stone-850 text-white" : "bg-white border-stone-250 text-stone-900"
                }`}
                value={metaSmartText} onChange={(e) => setMetaSmartText(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-stone-500">Indicador de Éxito</label>
              <input 
                type="text" placeholder="ej. Completar racha de 80%"
                className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none ${
                  darkMode ? "bg-stone-900 border-stone-850 text-white" : "bg-white border-stone-250 text-stone-900"
                }`}
                value={metaIndicador} onChange={(e) => setMetaIndicador(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-stone-500 font-bold">Presupuesto ({symbol})</label>
                <input 
                  type="number" placeholder="0.00"
                  className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none ${
                    darkMode ? "bg-stone-900 border-stone-850 text-white" : "bg-white border-stone-250 text-stone-900"
                  }`}
                  value={metaPresupuesto} onChange={(e) => setMetaPresupuesto(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-stone-500">Fecha Límite</label>
                <input 
                  type="date"
                  className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none ${
                    darkMode ? "bg-stone-900 border-stone-850 text-white" : "bg-white border-stone-250 text-stone-900"
                  }`}
                  value={metaFecha} onChange={(e) => setMetaFecha(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button 
                type="button"
                onClick={() => setAddingMetaToPilarId(null)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border cursor-pointer ${
                  darkMode ? "border-stone-800 text-stone-400 hover:text-white" : "border-stone-300 text-stone-500 hover:text-stone-900"
                }`}
              >
                Cancelar
              </button>
              <button type="submit" className="px-4 py-1.5 bg-teal-500 hover:bg-teal-650 text-white font-bold rounded-xl text-[10px] uppercase cursor-pointer">
                Registrar Meta
              </button>
            </div>
          </form>
        )}

        {/* Goals list items */}
        {pilarMetas.length === 0 ? (
          <p className="text-[11px] text-stone-500 italic">No hay metas SMART registradas en este pilar.</p>
        ) : (
          <div className="space-y-3">
            {pilarMetas.map((meta) => {
              const isCompleted = meta.Estado === EstadoMeta.LOGRADO;
              const isExpanded = expandedMetaIds[meta.ID_Meta];
              const metaMicrometasAll = micrometas.filter(mm => mm.ID_Meta === meta.ID_Meta);
              const metaMicrometas = metaMicrometasAll.filter(mm => {
                if (!mm.Fecha_Planificada) return true;
                if (mm.Fecha_Planificada === todayStr) return true;
                if (mm.Fecha_Planificada > todayStr) return false;
                return mm.Estado === "Pendiente";
              });

              return (
                <div 
                  key={meta.ID_Meta} 
                  id={`meta-card-${meta.ID_Meta}`}
                  className={`p-4 rounded-[1.5rem] border transition-all duration-500 ${
                    localHighlightId === meta.ID_Meta
                      ? "ring-2 ring-teal-500 shadow-lg shadow-teal-500/20 scale-[1.01]"
                      : ""
                  } ${
                    isCompleted
                      ? darkMode ? "bg-stone-950/20 border-stone-900 opacity-80" : "bg-stone-50 border-stone-150 opacity-80"
                      : darkMode ? "bg-stone-950/60 border-stone-850" : "bg-stone-50/70 border-stone-200"
                  }`}
                >
                  <div className="flex items-start gap-2.5 justify-between">
                    <button
                      onClick={() => handleToggleMeta(meta)}
                      className="mt-0.5 text-stone-500 hover:text-teal-500 transition-all cursor-pointer"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-teal-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-stone-400" />
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0 mx-2">
                      <h5 className={`text-xs font-bold leading-normal ${
                        isCompleted ? "line-through text-stone-500" : darkMode ? "text-white" : "text-stone-900"
                      }`}>
                        {meta.Meta_SMART}
                      </h5>
                      <p className="text-[10px] text-stone-500 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span>🎯 Indicador: {meta.Indicador_Exito}</span>
                        {meta.Presupuesto_Asignado > 0 && (
                          <>
                            <span className="text-stone-300 dark:text-stone-700">|</span>
                            <span>Presupuesto:</span>
                            <span className="inline-flex font-mono">{formatAmount(meta.Presupuesto_Asignado)}</span>
                          </>
                        )}
                      </p>
                      {meta.Fecha_Meta && (
                        <p className="text-[9px] text-teal-500 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Meta: {meta.Fecha_Meta}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setExpandedMetaIds(prev => ({ ...prev, [meta.ID_Meta]: !prev[meta.ID_Meta] }));
                        }}
                        className={`text-[9px] font-bold uppercase px-2.5 py-1 border rounded-lg transition-all cursor-pointer ${
                          isExpanded 
                            ? "bg-teal-500/10 border-teal-500/30 text-teal-400" 
                            : "border-stone-300 dark:border-stone-800 text-stone-500 hover:border-stone-400"
                        }`}
                      >
                        {metaMicrometasAll.length > metaMicrometas.length 
                          ? `${metaMicrometas.length} de ${metaMicrometasAll.length}` 
                          : metaMicrometas.length} Submetas
                      </button>
                      
                      <button
                        onClick={() => handleDeleteMeta(meta.ID_Meta)}
                        className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded micrometas listing */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-850 space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between mb-1.5">
                        <h6 className="text-[9px] font-bold uppercase text-stone-400">Submetas / Progreso Diario</h6>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingMmToMetaId(addingMmToMetaId === meta.ID_Meta ? null : meta.ID_Meta);
                            setMmTitulo("");
                            setMmGeneraGasto(false);
                            setMmMonto("");
                            setMmTarjetaId("__balance__");
                            setMmFecha("");
                            setMmCorrelaciones([]);
                            setMmRecurrencia("none");
                            setMmRepeticiones("5");
                          }}
                          className="text-[9px] font-bold uppercase text-teal-500 flex items-center gap-0.5 hover:underline cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Agregar Submeta</span>
                        </button>
                      </div>

                      {/* Micrometa form drawer inline */}
                      {addingMmToMetaId === meta.ID_Meta && (
                        <form 
                          onSubmit={(e) => handleAddMicrometa(e, meta.ID_Meta)} 
                          className={`p-4 rounded-xl border animate-fadeIn space-y-3 ${
                            darkMode ? "bg-stone-900 border-stone-800" : "bg-white border-stone-200"
                          }`}
                        >
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold uppercase text-stone-500">Título de Submeta</label>
                            <input 
                              type="text" required placeholder="ej. Cotizar calzado de correr"
                              className={`w-full text-[11px] p-2 rounded-lg border focus:outline-none ${
                                darkMode ? "bg-stone-950 border-stone-800 text-white" : "bg-white border-stone-250 text-stone-900"
                              }`}
                              value={mmTitulo} onChange={(e) => setMmTitulo(e.target.value)}
                            />
                          </div>

                           <div className="space-y-1">
                            <label className="text-[8px] font-bold uppercase text-stone-500">Planificado Fecha</label>
                            <input 
                              type="date"
                              className={`w-full text-[11px] p-2 rounded-lg border focus:outline-none ${
                                darkMode ? "bg-stone-950 border-stone-800 text-white" : "bg-white border-stone-250 text-stone-900"
                              }`}
                              value={mmFecha} onChange={(e) => setMmFecha(e.target.value)}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold uppercase text-stone-500">Recurrencia</label>
                              <select
                                className={`w-full text-[11px] p-2 rounded-lg border focus:outline-none ${
                                  darkMode ? "bg-stone-950 border-stone-800 text-white" : "bg-white border-stone-250 text-stone-900"
                                }`}
                                value={mmRecurrencia}
                                onChange={(e) => setMmRecurrencia(e.target.value)}
                              >
                                <option value="none">Ninguna</option>
                                <option value="diaria">Diaria</option>
                                <option value="semanal">Semanal</option>
                                <option value="mensual">Mensual</option>
                              </select>
                            </div>

                            {mmRecurrencia !== "none" && (
                              <div className="space-y-1 animate-fadeIn">
                                <label className="text-[8px] font-bold uppercase text-stone-500">Repeticiones</label>
                                <input 
                                  type="number" min="1" max="100" required
                                  className={`w-full text-[11px] p-2 rounded-lg border focus:outline-none ${
                                    darkMode ? "bg-stone-950 border-stone-800 text-white" : "bg-white border-stone-250 text-stone-900"
                                  }`}
                                  value={mmRepeticiones}
                                  onChange={(e) => setMmRepeticiones(e.target.value)}
                                />
                              </div>
                            )}
                          </div>


                          {/* Gasto logic */}
                          <div className="p-2.5 rounded-lg border border-dashed border-stone-200 dark:border-stone-850 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-stone-500 uppercase">¿Genera Gasto Financiero?</span>
                              <input 
                                type="checkbox"
                                className="w-4 h-4 text-teal-555"
                                checked={mmGeneraGasto} onChange={(e) => setMmGeneraGasto(e.target.checked)}
                              />
                            </div>
                            
                            {mmGeneraGasto && (
                              <div className="space-y-2 animate-fadeIn">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-bold uppercase text-stone-500">Costo{currency ? ` (${currency})` : ""}</label>
                                    <input 
                                      type="number" required={mmGeneraGasto} placeholder="Monto"
                                      className={`w-full text-[11px] p-2 rounded-lg border focus:outline-none ${
                                        darkMode ? "bg-stone-950 border-stone-800 text-white" : "bg-white border-stone-250 text-stone-900"
                                      }`}
                                      value={mmMonto} onChange={(e) => setMmMonto(e.target.value)}
                                    />
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-bold uppercase text-stone-500 font-bold">Tarjeta/Cuenta</label>
                                    <select
                                      className={`w-full text-[11px] p-2 rounded-lg border focus:outline-none ${
                                        darkMode ? "bg-stone-950 border-stone-800 text-white" : "bg-white border-stone-250 text-stone-900"
                                      }`}
                                      value={mmTarjetaId} onChange={(e) => setMmTarjetaId(e.target.value)}
                                    >
                                      <option value="__balance__">💵 Balance / Efectivo</option>
                                      {availableAccounts.map(c => (
                                        <option key={c.ID_Instrumento} value={c.ID_Instrumento}>
                                          {c.Tipo === "Débito" ? "🏦" : "💳"} {c.Nombre_Tarjeta} (${c.Saldo_Disponible} disp.)
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <input 
                                    type="checkbox" id="mm-gasto-pend-inline"
                                    checked={mmGastoPendiente} onChange={(e) => setMmGastoPendiente(e.target.checked)}
                                  />
                                  <label htmlFor="mm-gasto-pend-inline" className="text-[8px] text-stone-500 font-bold uppercase">
                                    Quedará Pendiente hasta completarse
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Correlations checklist */}
                          <div className="space-y-1 pt-1.5 border-t border-stone-200 dark:border-stone-800">
                            <label className="text-[8px] font-bold uppercase text-stone-400 block mb-1">
                              Ligar a otros pilares
                            </label>
                            <div className="flex flex-wrap gap-1">
                              {pilares.filter(p => p.ID_Pilar !== pilarId).map(p => {
                                const isCorrSelected = mmCorrelaciones.includes(p.ID_Pilar);
                                return (
                                  <button
                                    key={p.ID_Pilar}
                                    type="button"
                                    onClick={() => handleToggleMmCorr(p.ID_Pilar)}
                                    className={`text-[8px] font-bold uppercase px-2.5 py-1 border rounded-lg transition-all cursor-pointer ${
                                      isCorrSelected 
                                        ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                                        : "border-stone-300 dark:border-stone-800 text-stone-500 hover:border-stone-400"
                                    }`}
                                  >
                                    {p.Nombre}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end pt-1">
                            <button 
                              type="button"
                              onClick={() => setAddingMmToMetaId(null)}
                              className={`px-2.5 py-1 rounded border text-[9px] font-bold uppercase cursor-pointer ${
                                darkMode ? "border-stone-700 text-stone-400 hover:text-white" : "border-stone-300 text-stone-500 hover:text-stone-900"
                              }`}
                            >
                              Cancelar
                            </button>
                            <button type="submit" className="px-3.5 py-1 bg-teal-500 text-white font-bold rounded text-[9px] uppercase cursor-pointer">
                              Guardar Submeta
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Micrometas list display */}
                      <div className="space-y-2">
                        {metaMicrometas.length === 0 ? (
                          <p className="text-[10px] text-stone-500 italic pl-1">No hay submetas configuradas.</p>
                        ) : (
                          metaMicrometas.map((mm) => {
                            const isMMCompleted = mm.Estado === "Completada";
                            const isMMCancelled = mm.Estado === "Cancelada";
                            const isAtrasada = !isMMCompleted && !isMMCancelled && mm.Fecha_Planificada && mm.Fecha_Planificada < todayStr;
                            const matchingCard = deudas.find(d => d.ID_Instrumento === mm.ID_Tarjeta_Gasto);

                            return (
                              <div key={mm.ID_Micrometa} className={`p-3 rounded-xl border text-[11px] leading-normal flex flex-col gap-2 transition-all ${
                                isMMCompleted ? "opacity-75 bg-stone-900/10 dark:bg-stone-950/20" 
                                : isMMCancelled ? "opacity-55 line-through bg-stone-500/5" 
                                : isAtrasada ? (darkMode ? "bg-rose-950/25 border-rose-900/40" : "bg-rose-50 border-rose-150")
                                : darkMode ? "bg-stone-900 border-stone-800" : "bg-white border-stone-200"
                              }`}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2 flex-1">
                                    <span className="mt-0.5">🏁</span>
                                    <div>
                                      <p className={`font-bold ${
                                        isMMCompleted ? "line-through text-stone-500" 
                                        : isMMCancelled ? "line-through text-stone-500" 
                                        : isAtrasada ? "text-rose-600 dark:text-rose-450 font-extrabold"
                                        : darkMode ? "text-stone-300" : "text-stone-700"
                                      }`}>
                                        {mm.Titulo}
                                      </p>
                                      
                                      {mm.Fecha_Planificada && (
                                        <p className="text-[8px] font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                                          <span className={isAtrasada ? "text-rose-650 dark:text-rose-400 font-bold" : "text-stone-550"}>
                                            Plan: {mm.Fecha_Planificada} {mm.Sincronizar_Calendario === 1 && "📅"}
                                          </span>
                                          {isAtrasada && (
                                            <span className="px-1 py-0.5 rounded bg-rose-500/10 text-rose-500 dark:text-rose-400 font-bold border border-rose-500/20 text-[7px] uppercase tracking-wider">
                                              ⚠️ Atrasada
                                            </span>
                                          )}
                                        </p>
                                      )}

                                      {mm.Genera_Gasto === 1 && (
                                        <div className="text-[9px] mt-1.5 font-semibold flex flex-wrap gap-1.5 items-center">
                                          <span className="text-amber-500 font-bold flex items-center">
                                            Gasto:&nbsp;{formatAmount(mm.Monto_Gasto)}
                                          </span>
                                          <span className={`text-[8px] uppercase px-1 rounded ${
                                            mm.Gasto_Pendiente === 1 
                                              ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" 
                                              : "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                                          }`}>
                                            {mm.Gasto_Pendiente === 1 ? "Pendiente" : "Deducido"}
                                          </span>
                                          {matchingCard && (
                                            <span className="text-stone-500 text-[8px] block">({matchingCard.Nombre_Tarjeta})</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Status Select Toggles */}
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <select
                                      className={`text-[9px] font-bold p-1 rounded-md border focus:outline-none cursor-pointer ${
                                        darkMode ? "bg-stone-950 border-stone-850 text-stone-400" : "bg-white border-stone-250 text-stone-700"
                                      }`}
                                      value={mm.Estado}
                                      onChange={(e) => handleUpdateMicrometaStatus(mm, e.target.value as any)}
                                    >
                                      <option value="Pendiente">Pendiente</option>
                                      <option value="Completada">Completada</option>
                                      <option value="Cancelada">Cancelada</option>
                                    </select>

                                    <button
                                      onClick={() => handleDeleteMicrometa(mm.ID_Micrometa)}
                                      className="p-1 text-rose-550 hover:bg-rose-500/10 rounded-md cursor-pointer animate-pulse"
                                      title="Eliminar Submeta"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Cross pilar correlations display */}
                                {Array.isArray(mm.Correlaciones) && mm.Correlaciones.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-1.5 border-t border-stone-200 dark:border-stone-850 items-center">
                                    <span className="text-[8px] uppercase text-stone-500 font-bold">Lazos:</span>
                                    {mm.Correlaciones.map(cId => {
                                      const matchPil = pilares.find(p => p.ID_Pilar === cId);
                                      if (!matchPil) return null;
                                      return (
                                        <span key={cId} className="text-[7.5px] font-bold uppercase bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">
                                          🔗 {matchPil.Nombre}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans text-left">
      
      {/* 1. Header Banner */}
      <div className={`p-6 rounded-[2rem] border ${
        darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
      } flex flex-col md:flex-row md:items-center justify-between gap-6`}>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-500/10 text-teal-500 rounded-2xl border border-teal-500/15">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className={`text-lg font-bold tracking-tight ${darkMode ? "text-white" : "text-stone-900"}`}>
              Ecosistema de Pilares del Bienestar
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Jerarquía estructurada e interactiva. Gestiona tus pilares, define conexiones y añade metas SMART y submetas financieras asociadas.
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => { setShowPilarForm(!showPilarForm); setShowCorrForm(false); setShowConnections(false); }}
            className={`py-2 px-3.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              showPilarForm
                ? "bg-stone-500/10 text-stone-400 border-stone-500/10"
                : "bg-teal-500 text-white border-transparent shadow-md hover:bg-teal-600"
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Agregar Pilar / Subpilar</span>
          </button>
          
          <button
            onClick={() => { setShowCorrForm(!showCorrForm); setShowPilarForm(false); setShowConnections(false); }}
            className={`py-2 px-3.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              showCorrForm
                ? "bg-stone-500/10 text-stone-400 border-stone-500/10"
                : "bg-indigo-500 text-white border-transparent shadow-md hover:bg-indigo-600"
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>Conectar / Correlacionar</span>
          </button>

          <button
            onClick={() => { setShowConnections(!showConnections); setShowPilarForm(false); setShowCorrForm(false); }}
            className={`py-2 px-3.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              showConnections
                ? "bg-stone-500/10 text-stone-400 border-stone-500/10"
                : "bg-stone-850 dark:bg-stone-800 text-white border-transparent shadow-md hover:bg-stone-750"
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>Lazos ({correlacionesPilares.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Drawer Forms */}
      {showPilarForm && (
        <div className={`p-6 rounded-[2rem] border animate-fadeIn ${
          darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-200 shadow-sm"
        }`}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-4 text-teal-500 flex items-center gap-1.5">
            <FolderPlus className="w-4 h-4" />
            <span>Registrar Nuevo Pilar o Subpilar</span>
          </h3>
          <form onSubmit={handleAddPilar} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Nombre del pilar</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Alimentación, Sueño, etc."
                  className={`w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all ${
                    darkMode ? "bg-stone-950 border-stone-850 text-white focus:border-teal-500/30" : "bg-white border-stone-200 text-stone-900 focus:border-teal-600/30"
                  }`}
                  value={newPilarNombre}
                  onChange={(e) => setNewPilarNombre(e.target.value)}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Depende de (Padre)</label>
                <select
                  className={`w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all ${
                    darkMode ? "bg-stone-950 border-stone-850 text-white focus:border-teal-500/30" : "bg-white border-stone-200 text-stone-900 focus:border-teal-600/30"
                  }`}
                  value={newPilarPadreId}
                  onChange={(e) => setNewPilarPadreId(e.target.value)}
                >
                  <option value="">Ninguno (Es pilar Raíz)</option>
                  {pilares.filter(p => !p.ID_Padre).map(p => (
                    <option key={p.ID_Pilar} value={p.ID_Pilar}>
                      {p.Nombre}
                    </option>
                  ))}
                </select>
              </div>
  
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">Color Visual del Pilar</label>
                <div className="flex flex-wrap items-center gap-3">
                  {/* Visual Preview Box */}
                  <div 
                    onClick={() => setShowColorPicker(true)}
                    className="w-10 h-10 rounded-xl border border-stone-200 dark:border-stone-800 transition-all shadow-inner flex items-center justify-center animate-fadeIn cursor-pointer hover:scale-105"
                    style={{ backgroundColor: newPilarColor.startsWith("#") ? newPilarColor : getNodeColor(newPilarColor).hex }}
                    title="Vista previa del color (Haga clic para personalizar)"
                  >
                    <span className="text-[9px] font-bold font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] text-white">
                      {(newPilarColor.startsWith("#") ? newPilarColor : getNodeColor(newPilarColor).hex).substring(1).toUpperCase()}
                    </span>
                  </div>
  
                  {/* Preset Color Grid */}
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {[
                      { val: "blue", hex: "#0ea5e9", label: "Azul" },
                      { val: "green", hex: "#10b981", label: "Verde" },
                      { val: "orange", hex: "#f97316", label: "Naranja" },
                      { val: "purple", hex: "#a855f7", label: "Morado" },
                      { val: "red", hex: "#f43f5e", label: "Rojo" },
                      { val: "#14b8a6", hex: "#14b8a6", label: "Turquesa" },
                      { val: "#6366f1", hex: "#6366f1", label: "Indigo" },
                      { val: "#ec4899", hex: "#ec4899", label: "Rosa" },
                      { val: "#eab308", hex: "#eab308", label: "Amarillo" },
                      { val: "#84cc16", hex: "#84cc16", label: "Lima" },
                      { val: "#06b6d4", hex: "#06b6d4", label: "Cian" }
                    ].map(c => {
                      const activeHex = newPilarColor.startsWith("#") ? newPilarColor : getNodeColor(newPilarColor).hex;
                      const isSelected = activeHex.toLowerCase() === c.hex.toLowerCase();
                      return (
                        <button
                          key={c.val}
                          type="button"
                          onClick={() => setNewPilarColor(c.val)}
                          className={`w-6 h-6 rounded-full border transition-all hover:scale-110 cursor-pointer ${
                            isSelected ? "border-white ring-2 ring-teal-500 scale-105" : "border-stone-300 dark:border-stone-850"
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.label}
                        />
                      );
                    })}
                  </div>
  
                  {/* Custom Color Input Wrapper */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-stone-500 font-medium font-mono">Libre:</span>
                    <button 
                      type="button"
                      onClick={() => setShowColorPicker(true)}
                      className="w-8 h-8 rounded-lg border border-stone-300 dark:border-stone-850 hover:scale-105 transition-all shadow-inner relative flex items-center justify-center cursor-pointer text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                      style={{ backgroundColor: newPilarColor.startsWith("#") ? newPilarColor : getNodeColor(newPilarColor).hex }}
                      title="Seleccionar color personalizado avanzado"
                    >
                      <span className="text-[18px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] font-bold">+</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Initial Metas Form Section */}
            <div className="space-y-3 pt-4 border-t border-stone-200 dark:border-stone-850 text-left">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                  Metas iniciales de este Pilar (mínimo una requerida)
                </label>
                <button
                  type="button"
                  onClick={() => setNewPilarMetas(prev => [...prev, ""])}
                  className="text-[9px] font-bold text-teal-555 uppercase hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Meta</span>
                </button>
              </div>
              
              <div className="space-y-2.5 max-w-2xl">
                {newPilarMetas.map((metaText, idx) => (
                  <div key={idx} className="flex items-center gap-2 animate-fadeIn">
                    <input
                      type="text"
                      required
                      placeholder={`ej. Meta SMART ${idx + 1}`}
                      className={`flex-1 text-xs p-3 rounded-2xl border focus:outline-none transition-all ${
                        darkMode ? "bg-stone-900 border-stone-850 text-white focus:border-teal-500/30" : "bg-white border-stone-200 text-stone-900 focus:border-teal-600/30"
                      }`}
                      value={metaText}
                      onChange={(e) => {
                        const next = [...newPilarMetas];
                        next[idx] = e.target.value;
                        setNewPilarMetas(next);
                      }}
                    />
                    {newPilarMetas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setNewPilarMetas(prev => prev.filter((_, i) => i !== idx))}
                        className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                        title="Eliminar Meta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" className="py-3 px-6 font-bold rounded-2xl bg-teal-500 hover:bg-teal-650 text-white text-xs cursor-pointer transition-all shadow-md">
                Insertar Pilar y Metas
              </button>
            </div>
          </form>
        </div>
      )}

      {showCorrForm && (
        <div className={`p-6 rounded-[2rem] border animate-fadeIn ${
          darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-200 shadow-sm"
        }`}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-4 text-indigo-500 flex items-center gap-1.5">
            <GitMerge className="w-4 h-4" />
            <span>Establecer Conexión o Correlación</span>
          </h3>
          <form onSubmit={handleAddCorrelation} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Pilar Origen (Sale Flecha)</label>
              <select
                required
                className={`w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all ${
                  darkMode ? "bg-stone-950 border-stone-850 text-white" : "bg-white border-stone-200 text-stone-900"
                }`}
                value={corrOrigenId}
                onChange={(e) => setCorrOrigenId(e.target.value)}
              >
                <option value="">-- Seleccionar --</option>
                {pilares.map(p => (
                  <option key={p.ID_Pilar} value={p.ID_Pilar}>
                    {p.Nombre} ({p.ID_Padre ? 'Subpilar' : 'Raíz'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Pilar Destino (Llega Flecha)</label>
              <select
                required
                className={`w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all ${
                  darkMode ? "bg-stone-950 border-stone-850 text-white" : "bg-white border-stone-200 text-stone-900"
                }`}
                value={corrDestinoId}
                onChange={(e) => setCorrDestinoId(e.target.value)}
              >
                <option value="">-- Seleccionar --</option>
                {pilares.map(p => (
                  <option key={p.ID_Pilar} value={p.ID_Pilar}>
                    {p.Nombre} ({p.ID_Padre ? 'Subpilar' : 'Raíz'})
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="py-3 px-5 font-bold rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs cursor-pointer transition-all shadow-md">
              Crear Enlace
            </button>
          </form>
        </div>
      )}

      {showConnections && (
        <div className={`p-6 rounded-[2rem] border animate-fadeIn space-y-4 ${
          darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between border-b pb-2 border-stone-200 dark:border-stone-850">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
              <Link className="w-4 h-4" />
              <span>Conexiones y Lazos del Ecosistema</span>
            </h3>
            <button 
              onClick={() => setShowConnections(false)}
              className="text-stone-400 hover:text-stone-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {correlacionesPilares.length === 0 ? (
            <p className="text-xs text-stone-500 italic">No hay lazos de dependencia configurados en este ecosistema.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {correlacionesPilares.map(c => {
                const orig = pilares.find(p => p.ID_Pilar === c.ID_Origen);
                const dest = pilares.find(p => p.ID_Pilar === c.ID_Destino);
                if (!orig || !dest) return null;
                return (
                  <div 
                    key={c.ID_Correlacion}
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                      darkMode ? "bg-stone-950 border-stone-850 text-stone-300" : "bg-stone-50 border-stone-200 text-stone-700"
                    }`}
                  >
                    <span className="font-bold text-teal-500">{orig.Nombre}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                    <span className="font-bold text-indigo-500">{dest.Nombre}</span>
                    
                    <button
                      onClick={() => handleDeleteCorrelation(c.ID_Correlacion)}
                      className="ml-1 p-0.5 text-rose-500 hover:bg-rose-550/10 rounded cursor-pointer"
                      title="Eliminar Conexión"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Bottom Metrics & charts panel */}
      <div className={`p-6 rounded-[2.5rem] border ${
        darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
      } space-y-6`}>
        <div>
          <h3 className={`text-base font-bold flex items-center gap-2 ${darkMode ? "text-white" : "text-stone-900"}`}>
            <span>📈 Estadísticas y Avance del Ecosistema</span>
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Visualización gráfica en tiempo real. Monitorea el progreso por metas específicas de pilar y la tasa global de éxito.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          
          {/* Chart 1: Progress per Pillar (Horizontal BarChart) */}
          <div className="space-y-3">
            <h4 className={`text-xs font-bold uppercase tracking-wider text-stone-400`}>
              Progreso por Pilar / Subpilar
            </h4>
            
            {pilarChartData.length === 0 ? (
              <div className={`p-10 border border-dashed rounded-3xl text-center text-xs text-stone-500 italic ${darkMode ? "bg-stone-950/20 border-stone-850" : "bg-stone-50/50 border-stone-200"}`}>
                No hay metas registradas con avance para mostrar gráficos.
              </div>
            ) : (
              <div className="w-full h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={pilarChartData} 
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <XAxis type="number" domain={[0, 100]} stroke={darkMode ? "#57534e" : "#a8a29e"} fontSize={9} />
                    <YAxis dataKey="name" type="category" stroke={darkMode ? "#57534e" : "#a8a29e"} fontSize={9} width={75} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: darkMode ? "#1c1917" : "#ffffff",
                        borderColor: darkMode ? "#292524" : "#e7e5e4",
                        color: darkMode ? "#ffffff" : "#000000",
                        fontSize: "10px",
                        borderRadius: "12px"
                      }}
                      formatter={(value: any) => [`${value}%`, "Progreso"]}
                    />
                    <Bar dataKey="Progreso %" radius={[0, 6, 6, 0]} barSize={12}>
                      {pilarChartData.map((entry, index) => {
                        const colors = getNodeColor(entry.color);
                        return <Cell key={`cell-${index}`} fill={colors.hex} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 2: General progress donut */}
          <div className="flex flex-col items-center justify-center space-y-3 relative">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 self-start md:self-center">
              Progreso General del Ecosistema
            </h4>

            <div className="relative w-full max-w-[200px] h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={generalChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={80}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                  >
                    {generalChartData.map((entry: any, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Donut Center Label Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className={`text-3xl font-extrabold ${darkMode ? "text-white" : "text-stone-900"}`}>
                  {overallStats.pct}%
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-stone-500 mt-0.5">
                  Completado
                </span>
                <span className="text-[9px] text-stone-400 mt-0.5">
                  {overallStats.completed} / {overallStats.total} Metas
                </span>
              </div>
            </div>

            {/* Micro details legend */}
            <div className="flex gap-4 text-[10px] font-semibold">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <span className={darkMode ? "text-stone-300" : "text-stone-605"}>Logradas: {overallStats.completed}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${darkMode ? "bg-stone-800" : "bg-stone-200"}`} />
                <span className={darkMode ? "text-stone-400" : "text-stone-500"}>Pendientes: {overallStats.total - overallStats.completed}</span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 3. Hierarchical List Tree Layout */}
      <div className="space-y-6">
        {rootPilares.map((root) => {
          const cMap = getNodeColor(root.Color);
          const stats = getPilarAndChildrenProgress(root.ID_Pilar);
          const isCollapsed = collapsedPilarIds[root.ID_Pilar] !== false;
          const subpilares = getSubpilares(root.ID_Pilar);

          return (
            <div 
              key={root.ID_Pilar}
              className={`p-6 rounded-[2.5rem] border transition-all ${
                darkMode ? "bg-stone-900/20 border-stone-900/60" : "bg-white border-stone-150 shadow-sm"
              }`}
            >
              {/* Root Pillar Header Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-150 dark:border-stone-850">
                <div className="flex items-center gap-3">
                  <div 
                    className={`p-2.5 rounded-2xl border ${cMap.isCustomHex ? "" : `${cMap.bg} ${cMap.border}`}`}
                    style={cMap.isCustomHex ? { backgroundColor: `${cMap.hex}1a`, borderColor: `${cMap.hex}33` } : undefined}
                  >
                    <Target 
                      className={`w-5 h-5 ${cMap.isCustomHex ? "" : cMap.text}`} 
                      style={cMap.isCustomHex ? { color: cMap.hex } : undefined}
                    />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold flex items-center gap-2 ${darkMode ? "text-white" : "text-stone-900"}`}>
                      <span>{root.Nombre}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-stone-100 dark:bg-stone-900 text-stone-500 border border-stone-200 dark:border-stone-800">Pilar</span>
                    </h3>
                    
                    {/* Overall Progress for Root Pillar + Subpillars */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-24 sm:w-36 h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${cMap.isCustomHex ? "" : cMap.progress}`} 
                          style={cMap.isCustomHex ? { width: `${stats.pct}%`, backgroundColor: cMap.hex } : { width: `${stats.pct}%` }} 
                        />
                      </div>
                      <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">
                        {stats.pct}% ({stats.completed}/{stats.total} metas)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  {/* Delete button (allows deleting any root pilar) */}
                  {true && (
                    <button
                      onClick={() => handleDeletePilar(root.ID_Pilar)}
                      className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl cursor-pointer"
                      title="Eliminar Pilar"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  )}

                  {/* Collapse trigger */}
                  <button
                    onClick={() => togglePilarCollapse(root.ID_Pilar)}
                    className={`p-2 border rounded-xl cursor-pointer transition-all ${
                      darkMode ? "border-stone-850 text-stone-400 hover:text-white" : "border-stone-200 text-stone-500 hover:text-stone-900"
                    }`}
                  >
                    {isCollapsed ? <ChevronDown className="w-4.5 h-4.5" /> : <ChevronUp className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Area */}
              {!isCollapsed && (
                <div className="mt-6 space-y-6 animate-slideIn">
                  
                  {/* Direct metas on the Root Pilar */}
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                      Metas directas del Pilar {root.Nombre}
                    </h4>
                    {renderMetasList(root.ID_Pilar, root.Nombre)}
                  </div>

                  {/* Nested Subpillars list */}
                  {subpilares.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-stone-150 dark:border-stone-850">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Subpilares de {root.Nombre}
                      </h4>

                      <div className="grid grid-cols-1 gap-4">
                        {subpilares.map((sub) => {
                          const subStats = pilarProgress[sub.ID_Pilar] || { total: 0, completed: 0, pct: 0 };
                          const subMap = getNodeColor(sub.Color);
                          const isSubCustom = true; // Permite borrar cualquier subpilar (por ejemplo: Moto, Escolar, etc.) si el usuario no lo necesita en su ecosistema

                          return (
                            <div 
                              key={sub.ID_Pilar}
                              className={`p-5 rounded-[2rem] border ${
                                darkMode ? "bg-stone-950/20 border-stone-850" : "bg-stone-50/40 border-stone-200"
                              }`}
                            >
                              <div className="flex items-center justify-between pb-3 border-b border-dashed border-stone-200 dark:border-stone-800">
                                <div>
                                  <h4 className={`text-sm font-bold flex items-center gap-1.5 ${darkMode ? "text-stone-200" : "text-stone-850"}`}>
                                    <span>{sub.Nombre}</span>
                                    <span className="text-[8px] font-semibold text-stone-500 uppercase">Subpilar</span>
                                  </h4>
                                  
                                  {/* Subpilar progress bar */}
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="w-16 sm:w-28 h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full ${subMap.isCustomHex ? "" : subMap.progress}`} 
                                        style={subMap.isCustomHex ? { width: `${subStats.pct}%`, backgroundColor: subMap.hex } : { width: `${subStats.pct}%` }} 
                                      />
                                    </div>
                                    <span className="text-[9px] text-stone-500 font-bold">
                                      {subStats.pct}% ({subStats.completed}/{subStats.total} metas)
                                    </span>
                                  </div>
                                </div>

                                {isSubCustom && (
                                  <button
                                    onClick={() => handleDeletePilar(sub.ID_Pilar)}
                                    className="p-1.5 text-rose-500 hover:bg-rose-550/10 rounded-lg cursor-pointer"
                                    title="Eliminar Subpilar"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>

                              {/* Metas list inside this subpilar */}
                              {renderMetasList(sub.ID_Pilar, sub.Nombre)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>

      {completingMeta && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-4">
          <div className={`w-full max-w-md rounded-[2.5rem] border shadow-2xl p-6 relative transition-all text-left ${
            darkMode ? "bg-[#18181b] border-stone-800 text-white" : "bg-white border-stone-200 text-stone-900"
          }`}>
            <h3 className="text-sm font-bold uppercase tracking-wider text-teal-500 mb-2">
              🎯 Meta Lograda: Descontar Presupuesto
            </h3>
            <p className="text-[11px] text-stone-500 mb-4">
              La meta <strong>"{completingMeta.Meta_SMART}"</strong> tiene un presupuesto de <strong>{formatAmount(completingMeta.Presupuesto_Asignado)}</strong>. Selecciona el origen del gasto y la vinculación final.
            </p>

            <div className="space-y-4">
              {/* Account selection */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-stone-500 block">Cuenta o Tarjeta de Origen</label>
                <select
                  value={selectedCardIdForMeta}
                  onChange={(e) => setSelectedCardIdForMeta(e.target.value)}
                  className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none cursor-pointer ${
                    darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-250 text-stone-700"
                  }`}
                >
                  <option value="">-- Seleccionar Cuenta --</option>
                  {deudas.map(c => (
                    <option key={c.ID_Instrumento} value={c.ID_Instrumento}>
                      {c.Nombre_Tarjeta} ({formatAmountText(c.Saldo_Disponible)} disp)
                    </option>
                  ))}
                </select>
              </div>

              {/* Connection Type Selection */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-stone-500 block">Ligar Gasto a:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                    <input
                      type="radio"
                      name="connectionType"
                      checked={connectionType === "pilar"}
                      onChange={() => setConnectionType("pilar")}
                      className="w-4 h-4 text-teal-550"
                    />
                    <span>Un Pilar</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                    <input
                      type="radio"
                      name="connectionType"
                      checked={connectionType === "meta"}
                      onChange={() => setConnectionType("meta")}
                      className="w-4 h-4 text-teal-555"
                    />
                    <span>Otra Meta</span>
                  </label>
                </div>
              </div>

              {/* Dynamic Connection Dropdown */}
              {connectionType === "pilar" ? (
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500 block">Seleccionar Pilar</label>
                  <select
                    value={selectedPillarIdForExpense}
                    onChange={(e) => setSelectedPillarIdForExpense(e.target.value)}
                    className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none cursor-pointer ${
                      darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-250 text-stone-700"
                    }`}
                  >
                    {pilares.map(p => (
                      <option key={p.ID_Pilar} value={p.ID_Pilar}>
                        {p.Nombre}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-stone-500 block">Seleccionar Meta Destino</label>
                  <select
                    value={selectedMetaIdForExpense}
                    onChange={(e) => setSelectedMetaIdForExpense(e.target.value)}
                    className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none cursor-pointer ${
                      darkMode ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-250 text-stone-700"
                    }`}
                  >
                    <option value="">-- Seleccionar Meta --</option>
                    {metas.filter(m => m.ID_Meta !== completingMeta.ID_Meta).map(m => (
                      <option key={m.ID_Meta} value={m.ID_Meta}>
                        🎯 {m.Meta_SMART.substring(0, 50)}...
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCompletingMeta(null)}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  darkMode ? "bg-stone-900 border-stone-800 text-stone-400 hover:text-white" : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmMetaCompletion}
                disabled={!selectedCardIdForMeta || (connectionType === "meta" && !selectedMetaIdForExpense)}
                className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-650 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar y Completar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Custom Confirm Dialog Component */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm" onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}></div>
          <div className={`relative p-6 rounded-[2rem] border max-w-md w-full shadow-2xl transition-all scale-100 ${
            darkMode ? "bg-stone-900 border-stone-850 text-white" : "bg-white border-stone-200 text-stone-900"
          }`}>
            <h3 className="text-sm font-bold uppercase tracking-wider text-rose-500 mb-2">{confirmDialog.title}</h3>
            <p className="text-xs text-stone-500 mb-6 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3 text-xs">
              <button
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className={`px-4 py-2 rounded-xl border font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer ${
                  darkMode ? "border-stone-800 text-stone-300" : "border-stone-250 text-stone-700"
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                  confirmDialog.onConfirm();
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md transition-all cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Custom Color Picker Component */}
      {showColorPicker && (
        <AdvancedColorPicker
          color={newPilarColor}
          onChange={(newHex) => setNewPilarColor(newHex)}
          onClose={() => setShowColorPicker(false)}
          darkMode={darkMode}
          getNodeColor={getNodeColor}
        />
      )}

    </div>
  );
}
