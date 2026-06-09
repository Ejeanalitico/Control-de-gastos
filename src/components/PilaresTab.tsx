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
  Info
} from "lucide-react";
import { 
  MetaPilar, 
  Pilar, 
  CorrelacionPilar, 
  Micrometa, 
  Deuda, 
  Usuario, 
  EstadoMeta 
} from "../types";

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
  setEgresos
}: PilaresTabProps) {
  
  const [selectedPilarId, setSelectedPilarId] = useState<string | null>(null);

  // Form States - Dynamic Pilar Creator
  const [newPilarNombre, setNewPilarNombre] = useState("");
  const [newPilarPadreId, setNewPilarPadreId] = useState("");
  const [newPilarColor, setNewPilarColor] = useState("blue");
  const [showPilarForm, setShowPilarForm] = useState(false);

  // Form States - New Correlation Creator
  const [corrOrigenId, setCorrOrigenId] = useState("");
  const [corrDestinoId, setCorrDestinoId] = useState("");
  const [showCorrForm, setShowCorrForm] = useState(false);

  // Form States - Meta Creator
  const [metaSmartText, setMetaSmartText] = useState("");
  const [metaIndicador, setMetaIndicador] = useState("");
  const [metaPresupuesto, setMetaPresupuesto] = useState("");
  const [metaFecha, setMetaFecha] = useState("");
  const [metaSincronizar, setMetaSincronizar] = useState(false);
  const [showMetaForm, setShowMetaForm] = useState(false);

  // Form States - Micrometa Creator
  const [expandedMetaId, setExpandedMetaId] = useState<string | null>(null);
  const [mmTitulo, setMmTitulo] = useState("");
  const [mmGeneraGasto, setMmGeneraGasto] = useState(false);
  const [mmMonto, setMmMonto] = useState("");
  const [mmGastoPendiente, setMmGastoPendiente] = useState(true);
  const [mmTarjetaId, setMmTarjetaId] = useState("");
  const [mmFecha, setMmFecha] = useState("");
  const [mmSincronizar, setMmSincronizar] = useState(false);
  const [mmCorrelaciones, setMmCorrelaciones] = useState<string[]>([]);
  const [showMmForm, setShowMmForm] = useState(false);

  const getCurrencySymbol = (code: string) => {
    if (code === "EUR") return "€";
    if (code === "GBP") return "£";
    return "$";
  };
  const symbol = getCurrencySymbol(currency);

  // Node placement coordinate mapper
  const getCoordinates = (nodeId: string, parentId: string | null, index: number) => {
    const initialCoords: Record<string, { x: number; y: number }> = {
      'pilar-crecimiento': { x: 15, y: 30 },
      'pilar-salud': { x: 38, y: 30 },
      'pilar-economico': { x: 61, y: 30 },
      'pilar-entorno': { x: 84, y: 30 },
      'subpilar-escolar': { x: 10, y: 120 },
      'subpilar-laboral': { x: 22, y: 120 },
      'subpilar-descanso': { x: 32, y: 220 },
      'subpilar-alimentacion': { x: 48, y: 220 },
      'subpilar-hogar': { x: 69, y: 100 },
      'subpilar-moto': { x: 70, y: 170 },
      'subpilar-amigos': { x: 83, y: 170 },
      'subpilar-ingresos': { x: 48, y: 310 },
      'subpilar-ahorro': { x: 62, y: 310 },
      'subpilar-gasto': { x: 74, y: 310 },
      'subpilar-salidas': { x: 32, y: 400 }
    };

    // Strip user suffix e.g. "pilar-crecimiento-user-..." or dynamic postfixes to identify default nodes
    const baseId = nodeId.replace(/-user-.*$/, "").replace(/-[a-z0-9]{9,15}$/, "");
    if (initialCoords[baseId]) {
      return initialCoords[baseId];
    }

    // Dynamic placement calculations for user-created nodes
    if (parentId) {
      const parentBase = parentId.replace(/-user-.*$/, "").replace(/-[a-z0-9]{9,15}$/, "");
      const parentCoord = initialCoords[parentBase] || { x: 50, y: 30 };
      // Place offset below parent
      return { x: Math.max(5, Math.min(95, parentCoord.x + (index * 8 - 4))), y: parentCoord.y + 90 };
    } else {
      // Root custom node placement in columns
      return { x: 5 + ((index + 1) * 16) % 90, y: 460 + Math.floor(index / 5) * 60 };
    }
  };

  // Node indexing to arrange offsets of dynamic columns
  const pilarCoordinates = useMemo(() => {
    const coords: Record<string, { x: number; y: number }> = {};
    const rootCount: Record<string, number> = {};
    
    // Sort so parents are registered first
    const sorted = [...pilares].sort((a, b) => (a.ID_Padre ? 1 : 0) - (b.ID_Padre ? 1 : 0));
    
    sorted.forEach((p, idx) => {
      const parentId = p.ID_Padre;
      let count = 0;
      if (parentId) {
        rootCount[parentId] = (rootCount[parentId] || 0) + 1;
        count = rootCount[parentId];
      } else {
        rootCount['root'] = (rootCount['root'] || 0) + 1;
        count = rootCount['root'];
      }
      coords[p.ID_Pilar] = getCoordinates(p.ID_Pilar, parentId, count);
    });
    
    return coords;
  }, [pilares]);

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

  // Selected node details helper
  const selectedPilar = useMemo(() => {
    if (!selectedPilarId) return null;
    return pilares.find(p => p.ID_Pilar === selectedPilarId) || null;
  }, [selectedPilarId, pilares]);

  // Selected pilar's goals
  const selectedPilarMetas = useMemo(() => {
    if (!selectedPilar) return [];
    return metas.filter(m => m.Pilar === selectedPilar.ID_Pilar || m.Pilar === selectedPilar.Nombre);
  }, [selectedPilar, metas]);

  // --- ACTIONS ---

  const handleAddPilar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPilarNombre.trim()) return;

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
        setPilares(prev => [...prev, pilarObj]);
        setNewPilarNombre("");
        setNewPilarPadreId("");
        setShowPilarForm(false);
        setSelectedPilarId(newId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePilar = async (pilarId: string) => {
    if (!window.confirm("¿Seguro que deseas borrar este pilar/subpilar? Se eliminarán también sus subpilares y metas asociadas.")) return;

    try {
      const res = await fetch(`/api/pilares/${pilarId}`, { method: "DELETE" });
      if (res.ok) {
        setPilares(prev => prev.filter(p => p.ID_Pilar !== pilarId && p.ID_Padre !== pilarId));
        setCorrelacionesPilares(prev => prev.filter(c => c.ID_Origen !== pilarId && c.ID_Destino !== pilarId));
        setMetas(prev => prev.filter(m => m.Pilar !== pilarId));
        setSelectedPilarId(null);
      }
    } catch (err) {
      console.error(err);
    }
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCorrelation = async (corrId: string) => {
    try {
      const res = await fetch(`/api/pilares/correlaciones/${corrId}`, { method: "DELETE" });
      if (res.ok) {
        setCorrelacionesPilares(prev => prev.filter(c => c.ID_Correlacion !== corrId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPilar || !metaSmartText.trim()) return;

    const newId = "meta-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
    const parsePres = parseFloat(metaPresupuesto) || 0;

    let googleEventId: string | null = null;
    const gToken = localStorage.getItem(`pilar5_g_token_${activeUser.ID_Usuario}`);
    const isConnected = localStorage.getItem(`pilar5_g_connected_${activeUser.ID_Usuario}`);

    if (metaFecha && gToken && isConnected === "true") {
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
            description: `Pilar: ${selectedPilar.Nombre} | Indicador: ${metaIndicador.trim()} | Presupuesto: ${parsePres}`,
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
      Pilar: selectedPilar.ID_Pilar,
      Meta_SMART: metaSmartText.trim(),
      Indicador_Exito: metaIndicador.trim() || "Por definir",
      Estado: EstadoMeta.EN_PROCESO,
      Presupuesto_Asignado: parsePres,
      Fecha_Meta: metaFecha || undefined,
      Sincronizar_Calendario: isConnected === "true" || metaSincronizar ? 1 : 0,
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
        setMetaSincronizar(false);
        setShowMetaForm(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleMeta = async (meta: MetaPilar) => {
    const nextStatus = meta.Estado === EstadoMeta.LOGRADO ? EstadoMeta.EN_PROCESO : EstadoMeta.LOGRADO;
    
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

  const handleDeleteMeta = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta meta y sus micrometas asociadas?")) return;

    try {
      const gToken = localStorage.getItem(`pilar5_g_token_${activeUser.ID_Usuario}`);
      const isConnected = localStorage.getItem(`pilar5_g_connected_${activeUser.ID_Usuario}`);

      if (gToken && isConnected === "true" && !gToken.startsWith("mock_google_token_")) {
        // 1. Delete Meta Google Calendar event
        const metaObj = metas.find(m => m.ID_Meta === id);
        if (metaObj && metaObj.ID_Evento_Calendario) {
          try {
            await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${metaObj.ID_Evento_Calendario}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${gToken}` }
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
              await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${mm.ID_Evento_Calendario}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${gToken}` }
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

  const handleAddMicrometa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedMetaId || !mmTitulo.trim()) return;

    const mmId = "mm-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
    const parseMonto = parseFloat(mmMonto) || 0;

    let googleEventId: string | null = null;
    const gToken = localStorage.getItem(`pilar5_g_token_${activeUser.ID_Usuario}`);
    const isConnected = localStorage.getItem(`pilar5_g_connected_${activeUser.ID_Usuario}`);

    const metaObj = metas.find(m => m.ID_Meta === expandedMetaId);
    const metaPilarName = metaObj ? metaObj.Pilar : "Personal";

    if (mmFecha && gToken && isConnected === "true") {
      if (gToken.startsWith("mock_google_token_")) {
        googleEventId = "mock-mm-evt-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
      } else {
        try {
          const syncRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${gToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            summary: `🏁 Micrometa: ${mmTitulo.trim()}`,
            description: `Pilar: ${metaPilarName} | Gasto: ${parseMonto}`,
            start: {
              dateTime: `${mmFecha}T10:00:00-06:00`
            },
            end: {
              dateTime: `${mmFecha}T11:00:00-06:00`
            }
          })
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
      ID_Meta: expandedMetaId,
      Titulo: mmTitulo.trim(),
      Estado: "Pendiente",
      Genera_Gasto: mmGeneraGasto ? 1 : 0,
      Monto_Gasto: parseMonto,
      Gasto_Pendiente: (mmGeneraGasto && mmGastoPendiente) ? 1 : 0,
      ID_Tarjeta_Gasto: mmGeneraGasto ? mmTarjetaId : null,
      Fecha_Planificada: mmFecha || undefined,
      Sincronizar_Calendario: isConnected === "true" || mmSincronizar ? 1 : 0,
      ID_Evento_Calendario: googleEventId,
      Correlaciones: mmCorrelaciones
    };

    try {
      const res = await fetch("/api/micrometas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mmObj)
      });
      if (res.ok) {
        const fetchRes = await fetch(`/api/data?userId=${activeUser.ID_Usuario}`);
        if (fetchRes.ok) {
          const data = await fetchRes.json();
          setMicrometas(data.micrometas || []);
        } else {
          setMicrometas(prev => [...prev, mmObj]);
        }
        setMmTitulo("");
        setMmGeneraGasto(false);
        setMmMonto("");
        setMmGastoPendiente(true);
        setMmTarjetaId("");
        setMmFecha("");
        setMmSincronizar(false);
        setMmCorrelaciones([]);
        setShowMmForm(false);
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
        setMicrometas(prev => prev.map(m => 
          m.ID_Micrometa === mm.ID_Micrometa 
            ? { ...m, Estado: newStatus, Gasto_Pendiente: data.gastoDeducido ? 0 : m.Gasto_Pendiente } 
            : m
        ));

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

  const handleDeleteMicrometa = async (id: string) => {
    try {
      const gToken = localStorage.getItem(`pilar5_g_token_${activeUser.ID_Usuario}`);
      const isConnected = localStorage.getItem(`pilar5_g_connected_${activeUser.ID_Usuario}`);

      const mmObj = micrometas.find(m => m.ID_Micrometa === id);
      if (mmObj && mmObj.ID_Evento_Calendario && gToken && isConnected === "true" && !gToken.startsWith("mock_google_token_")) {
        try {
          await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${mmObj.ID_Evento_Calendario}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${gToken}` }
          });
        } catch (e) {
          console.error("GCal delete failed for micrometa:", e);
        }
      }

      const res = await fetch(`/api/micrometas/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMicrometas(prev => prev.filter(m => m.ID_Micrometa !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle micrometa correlations checkbox selection
  const handleToggleMmCorr = (pilId: string) => {
    setMmCorrelaciones(prev => 
      prev.includes(pilId) ? prev.filter(id => id !== pilId) : [...prev, pilId]
    );
  };

  // Filter accounts suitable for micrometa deductions (Debit and Credit)
  const availableAccounts = useMemo(() => {
    return deudas.filter(d => d.ID_Usuario === activeUser.ID_Usuario);
  }, [deudas, activeUser.ID_Usuario]);

  // Color helper for node visuals
  const getNodeColor = (colorName?: string) => {
    switch(colorName) {
      case "green": return { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", progress: "bg-emerald-500", glow: "shadow-emerald-500/10" };
      case "orange": return { text: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", progress: "bg-orange-500", glow: "shadow-orange-500/10" };
      case "purple": return { text: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20", progress: "bg-purple-500", glow: "shadow-purple-500/10" };
      case "red": return { text: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20", progress: "bg-rose-500", glow: "shadow-rose-500/10" };
      case "blue":
      default: return { text: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/20", progress: "bg-sky-500", glow: "shadow-sky-500/10" };
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans text-left">
      
      {/* 1. Header Banner */}
      <div className={`p-6 rounded-[2rem] border ${
        darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-sm"
      } flex flex-col md:flex-row md:items-center justify-between gap-6`}>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-500/10 text-teal-500 rounded-2xl border border-teal-500/15">
            <Target className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className={`text-lg font-bold tracking-tight ${darkMode ? "text-white" : "text-stone-900"}`}>
              Ecosistema de Pilares del Bienestar
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Organigrama dinámico e interactivo. Agrega pilares, define dependencias, crea metas SMART y vincula micrometas financieras.
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => { setShowPilarForm(!showPilarForm); setShowCorrForm(false); }}
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
            onClick={() => { setShowCorrForm(!showCorrForm); setShowPilarForm(false); }}
            className={`py-2 px-3.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              showCorrForm
                ? "bg-stone-500/10 text-stone-400 border-stone-500/10"
                : "bg-indigo-500 text-white border-transparent shadow-md hover:bg-indigo-600"
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>Conectar / Correlacionar</span>
          </button>
        </div>
      </div>

      {/* 2. Forms drawers */}
      {showPilarForm && (
        <div className={`p-6 rounded-[2rem] border animate-fadeIn ${
          darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-200 shadow-sm"
        }`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 text-teal-500`}>
            Registrar Nuevo Pilar o Subpilar
          </h3>
          <form onSubmit={handleAddPilar} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
                {pilares.map(p => (
                  <option key={p.ID_Pilar} value={p.ID_Pilar}>
                    {p.Nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Color Visual</label>
              <select
                className={`w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all ${
                  darkMode ? "bg-stone-950 border-stone-850 text-white focus:border-teal-500/30" : "bg-white border-stone-200 text-stone-900 focus:border-teal-600/30"
                }`}
                value={newPilarColor}
                onChange={(e) => setNewPilarColor(e.target.value)}
              >
                <option value="blue">Azul (Crecimiento)</option>
                <option value="green">Verde (Salud)</option>
                <option value="orange">Naranja (Económico)</option>
                <option value="purple">Morado (Entorno)</option>
                <option value="red">Rojo (Urgente)</option>
              </select>
            </div>

            <button type="submit" className="py-3 px-5 font-bold rounded-2xl bg-teal-500 hover:bg-teal-600 text-white text-xs cursor-pointer transition-all shadow-md">
              Insertar Pilar
            </button>
          </form>
        </div>
      )}

      {showCorrForm && (
        <div className={`p-6 rounded-[2rem] border animate-fadeIn ${
          darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-200 shadow-sm"
        }`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 text-indigo-500`}>
            Establecer Conexión o Correlación
          </h3>
          <form onSubmit={handleAddCorrelation} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Pilar Origen (Sale Flecha)</label>
              <select
                required
                className={`w-full text-xs p-3 rounded-2xl border focus:outline-none transition-all ${
                  darkMode ? "bg-stone-950 border-stone-850 text-white focus:border-teal-500/30" : "bg-white border-stone-200 text-stone-900 focus:border-teal-600/30"
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
                  darkMode ? "bg-stone-950 border-stone-850 text-white focus:border-teal-500/30" : "bg-white border-stone-200 text-stone-900 focus:border-teal-600/30"
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

      {/* 3. Main Workspace Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Interactive SVG Flowchart Graph */}
        <div className="lg:col-span-2 relative">
          
          <div className={`p-4 rounded-[2.5rem] border overflow-x-auto select-none ${
            darkMode ? "bg-stone-900/20 border-stone-900" : "bg-white border-stone-150 shadow-sm"
          }`}>
            
            <div className="relative min-w-[850px] h-[520px]">
              
              {/* SVG Connector lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <defs>
                  <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={darkMode ? "#78716c" : "#a8a29e"} />
                  </marker>
                </defs>

                {/* Draw dynamic correlation lines */}
                {correlacionesPilares.map((c) => {
                  const orig = pilarCoordinates[c.ID_Origen];
                  const dest = pilarCoordinates[c.ID_Destino];
                  if (!orig || !dest) return null;

                  // Resolve color path matching pilar colors
                  const p1 = pilares.find(p => p.ID_Pilar === c.ID_Origen);
                  let stroke = "rgba(120, 113, 108, 0.4)";
                  if (p1?.Color === "blue") stroke = "rgba(14, 165, 233, 0.45)";
                  if (p1?.Color === "green") stroke = "rgba(16, 185, 129, 0.45)";
                  if (p1?.Color === "orange") stroke = "rgba(249, 115, 22, 0.45)";
                  if (p1?.Color === "purple") stroke = "rgba(168, 85, 247, 0.45)";
                  if (p1?.Color === "red") stroke = "rgba(244, 63, 94, 0.45)";

                  // Calculate simple mid-height curve offsets or straight offsets
                  // Origin center: x = x%, y = y + 25px. Dest center: x = x%, y = ypx
                  return (
                    <g key={c.ID_Correlacion}>
                      <line 
                        x1={`${orig.x}%`} 
                        y1={`${orig.y + 25}px`} 
                        x2={`${dest.x}%`} 
                        y2={`${dest.y}px`} 
                        stroke={stroke} 
                        strokeWidth="2.5" 
                        strokeDasharray={c.ID_Origen.includes("pilar-") && c.ID_Destino.includes("pilar-") ? "none" : "3,3"}
                        markerEnd="url(#arrow)" 
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Render dynamic node cards absolutely positioned */}
              {pilares.map((p) => {
                const coord = pilarCoordinates[p.ID_Pilar] || { x: 50, y: 50 };
                const cMap = getNodeColor(p.Color);
                const stats = pilarProgress[p.ID_Pilar] || { total: 0, completed: 0, pct: 0 };
                const isSelected = selectedPilarId === p.ID_Pilar;

                return (
                  <div
                    key={p.ID_Pilar}
                    onClick={() => setSelectedPilarId(p.ID_Pilar)}
                    style={{
                      left: `${coord.x}%`,
                      top: `${coord.y}px`,
                      transform: "translate(-50%, 0px)"
                    }}
                    className={`absolute z-10 w-[140px] rounded-2xl border p-3 cursor-pointer transition-all duration-300 ${
                      isSelected 
                        ? `${cMap.border} ring-2 ring-teal-500 scale-105 shadow-xl ${cMap.glow} bg-white dark:bg-stone-900`
                        : `${cMap.border} ${cMap.bg} hover:border-teal-500 bg-white/70 dark:bg-stone-900/60 backdrop-blur-sm shadow-sm`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`text-[10px] font-bold truncate ${darkMode ? "text-white" : "text-stone-850"}`}>
                        {p.Nombre}
                      </span>
                      {p.ID_Padre && (
                        <span className="text-[8px] text-stone-500 uppercase font-semibold">Sub</span>
                      )}
                    </div>
                    
                    {/* Tiny Progress Bar */}
                    <div className="w-full h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden mb-1">
                      <div className={`h-full ${cMap.progress}`} style={{ width: `${stats.pct}%` }} />
                    </div>
                    
                    <div className="flex items-center justify-between text-[8px] text-stone-500 font-bold uppercase tracking-widest">
                      <span>{stats.pct}%</span>
                      <span>{stats.completed}/{stats.total} metas</span>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>
          
          <div className="mt-2 text-right">
            <span className="text-[9px] text-stone-500 uppercase tracking-widest font-bold">
              💡 Tip: Haz clic sobre un pilar o subpilar para ver, inyectar metas o correlaciones.
            </span>
          </div>
        </div>

        {/* Right Side: Selected Node Inspector Drawer */}
        <div className="lg:col-span-1">
          {selectedPilar ? (
            <div className={`p-6 rounded-[2.5rem] border ${
              darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-150 shadow-md animate-slideIn"
            } space-y-6`}>
              
              {/* Header Details */}
              <div className="border-b pb-4 border-stone-200 dark:border-stone-850 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${getNodeColor(selectedPilar.Color).bg} ${getNodeColor(selectedPilar.Color).text}`}>
                      {selectedPilar.ID_Padre ? 'Subpilar' : 'Pilar Raíz'}
                    </span>
                    <span className="text-stone-500 text-[10px]">Color: {selectedPilar.Color}</span>
                  </div>
                  <h3 className={`text-base font-bold mt-1 ${darkMode ? "text-white" : "text-stone-900"}`}>
                    {selectedPilar.Nombre}
                  </h3>
                </div>
                
                {/* Delete button for custom pillars only */}
                {selectedPilar.ID_Pilar.startsWith("pilar-") && !["pilar-crecimiento", "pilar-salud", "pilar-economico", "pilar-entorno"].includes(selectedPilar.ID_Pilar.replace(/-user-.*$/, "")) && (
                  <button
                    onClick={() => handleDeletePilar(selectedPilar.ID_Pilar)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-all"
                    title="Borrar Pilar Completo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Goals module */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Metas SMART ({selectedPilarMetas.length})
                  </h4>
                  <button
                    onClick={() => setShowMetaForm(!showMetaForm)}
                    className="text-[9px] font-bold text-teal-500 uppercase hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Añadir Meta</span>
                  </button>
                </div>

                {/* Meta creation form */}
                {showMetaForm && (
                  <form onSubmit={handleAddMeta} className={`p-4 rounded-2xl border space-y-3 ${
                    darkMode ? "bg-stone-950/40 border-stone-850" : "bg-stone-50 border-stone-200"
                  }`}>
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
                        <label className="text-[9px] font-bold uppercase text-stone-500">Presupuesto</label>
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
                    <div className="flex items-center gap-2 py-1">
                      <input 
                        type="checkbox" id="meta-sync-cal"
                        className="w-4 h-4 text-teal-500"
                        checked={metaSincronizar} onChange={(e) => setMetaSincronizar(e.target.checked)}
                      />
                      <label htmlFor="meta-sync-cal" className="text-[10px] font-bold text-stone-500 uppercase tracking-wide">
                        Conectar al calendario
                      </label>
                    </div>
                    <button type="submit" className="w-full py-2 bg-teal-500 hover:bg-teal-650 text-white font-bold rounded-xl text-[10px] uppercase">
                      Registrar Meta
                    </button>
                  </form>
                )}

                {/* Goals display and micrometas */}
                <div className="space-y-3">
                  {selectedPilarMetas.length === 0 ? (
                    <p className="text-xs text-stone-500 italic py-4">No hay metas SMART registradas en este pilar.</p>
                  ) : (
                    selectedPilarMetas.map((meta) => {
                      const isCompleted = meta.Estado === EstadoMeta.LOGRADO;
                      const isExpanded = expandedMetaId === meta.ID_Meta;
                      const metaMicrometas = micrometas.filter(mm => mm.ID_Meta === meta.ID_Meta);

                      return (
                        <div key={meta.ID_Meta} className={`p-4 rounded-2xl border transition-all ${
                          isCompleted
                            ? darkMode ? "bg-stone-950/20 border-stone-900 opacity-80" : "bg-stone-50 border-stone-150 opacity-80"
                            : darkMode ? "bg-stone-950/60 border-stone-850" : "bg-stone-50/70 border-stone-200"
                        }`}>
                          <div className="flex items-start gap-2.5 justify-between">
                            <button
                              onClick={() => handleToggleMeta(meta)}
                              className="mt-0.5 text-stone-500 hover:text-teal-500 transition-all cursor-pointer"
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-4.5 h-4.5 text-teal-500" />
                              ) : (
                                <Circle className="w-4.5 h-4.5 text-stone-400" />
                              )}
                            </button>
                            
                            <div className="flex-1 min-w-0">
                              <h5 className={`text-xs font-bold leading-normal truncate ${
                                isCompleted ? "line-through text-stone-500" : darkMode ? "text-white" : "text-stone-900"
                              }`}>
                                {meta.Meta_SMART}
                              </h5>
                              <p className="text-[9px] text-stone-500 mt-1">
                                🎯 Indicador: {meta.Indicador_Exito} 
                                {meta.Presupuesto_Asignado > 0 && ` | Presupuesto: ${symbol}${meta.Presupuesto_Asignado}`}
                              </p>
                              {meta.Fecha_Meta && (
                                <p className="text-[8px] text-teal-500 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-0.5">
                                  <Calendar className="w-2.5 h-2.5" />
                                  <span>Meta: {meta.Fecha_Meta}</span>
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setExpandedMetaId(isExpanded ? null : meta.ID_Meta)}
                                className={`text-[9px] font-bold uppercase px-2 py-0.5 border rounded-lg transition-all ${
                                  isExpanded 
                                    ? "bg-teal-500/10 border-teal-500/30 text-teal-400" 
                                    : "border-stone-300 dark:border-stone-800 text-stone-500"
                                }`}
                              >
                                {metaMicrometas.length} mm
                              </button>
                              
                              <button
                                onClick={() => handleDeleteMeta(meta.ID_Meta)}
                                className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Expanded micrometas listing */}
                          {isExpanded && (
                            <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-850 space-y-3 animate-fadeIn">
                              <div className="flex items-center justify-between mb-1.5">
                                <h6 className="text-[9px] font-bold uppercase text-stone-400">Micrometas / Progreso</h6>
                                <button
                                  type="button"
                                  onClick={() => setShowMmForm(!showMmForm)}
                                  className="text-[8px] font-bold uppercase text-teal-500 flex items-center gap-0.5 hover:underline cursor-pointer"
                                >
                                  <PlusCircle className="w-2.5 h-2.5" />
                                  <span>Agregar Micrometa</span>
                                </button>
                              </div>

                              {/* Micrometa form drawer */}
                              {showMmForm && (
                                <form onSubmit={handleAddMicrometa} className={`p-3.5 rounded-xl border ${
                                  darkMode ? "bg-stone-900 border-stone-850" : "bg-white border-stone-200"
                                } space-y-2.5`}>
                                  
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-bold uppercase text-stone-500">Título Micrometa</label>
                                    <input 
                                      type="text" required placeholder="ej. Cotizar calzado de correr"
                                      className={`w-full text-[11px] p-2 rounded-lg border focus:outline-none ${
                                        darkMode ? "bg-stone-950 border-stone-800 text-white" : "bg-white border-stone-250 text-stone-900"
                                      }`}
                                      value={mmTitulo} onChange={(e) => setMmTitulo(e.target.value)}
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
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
                                    
                                    <div className="flex items-center gap-1.5 pt-4">
                                      <input 
                                        type="checkbox" id="mm-sync-cal"
                                        checked={mmSincronizar} onChange={(e) => setMmSincronizar(e.target.checked)}
                                      />
                                      <label htmlFor="mm-sync-cal" className="text-[9px] font-bold text-stone-500 uppercase">
                                        Calendario
                                      </label>
                                    </div>
                                  </div>

                                  {/* Gasto logic */}
                                  <div className="p-2.5 rounded-lg border border-dashed border-stone-200 dark:border-stone-800 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-bold text-stone-500 uppercase">¿Genera Gasto?</span>
                                      <input 
                                        type="checkbox"
                                        checked={mmGeneraGasto} onChange={(e) => setMmGeneraGasto(e.target.checked)}
                                      />
                                    </div>
                                    
                                    {mmGeneraGasto && (
                                      <div className="space-y-2 animate-fadeIn">
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                            <label className="text-[8px] font-bold uppercase text-stone-500">Costo ({currency})</label>
                                            <input 
                                              type="number" required={mmGeneraGasto} placeholder="Monto"
                                              className={`w-full text-[11px] p-2 rounded-lg border focus:outline-none ${
                                                darkMode ? "bg-stone-950 border-stone-800 text-white" : "bg-white border-stone-250 text-stone-900"
                                              }`}
                                              value={mmMonto} onChange={(e) => setMmMonto(e.target.value)}
                                            />
                                          </div>
                                          
                                          <div className="space-y-1">
                                            <label className="text-[8px] font-bold uppercase text-stone-500 font-bold">Tarjeta/Cuenta Descontar</label>
                                            <select
                                              required={mmGeneraGasto}
                                              className={`w-full text-[11px] p-2 rounded-lg border focus:outline-none ${
                                                darkMode ? "bg-stone-950 border-stone-800 text-white" : "bg-white border-stone-250 text-stone-900"
                                              }`}
                                              value={mmTarjetaId} onChange={(e) => setMmTarjetaId(e.target.value)}
                                            >
                                              <option value="">-- Cuenta --</option>
                                              {availableAccounts.map(c => (
                                                <option key={c.ID_Instrumento} value={c.ID_Instrumento}>
                                                  {c.Nombre_Tarjeta} (${c.Saldo_Disponible})
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <input 
                                            type="checkbox" id="mm-gasto-pend"
                                            checked={mmGastoPendiente} onChange={(e) => setMmGastoPendiente(e.target.checked)}
                                          />
                                          <label htmlFor="mm-gasto-pend" className="text-[8px] text-stone-500 font-bold uppercase">
                                            Quedará Pendiente hasta completarse
                                          </label>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Correlations checklist */}
                                  <div className="space-y-1 pt-1.5 border-t border-stone-200 dark:border-stone-800">
                                    <label className="text-[8px] font-bold uppercase text-stone-400 block mb-1">
                                      Correlacionar con otros pilares
                                    </label>
                                    <div className="flex flex-wrap gap-1">
                                      {pilares.filter(p => p.ID_Pilar !== selectedPilar.ID_Pilar).map(p => {
                                        const isCorrSelected = mmCorrelaciones.includes(p.ID_Pilar);
                                        return (
                                          <button
                                            key={p.ID_Pilar}
                                            type="button"
                                            onClick={() => handleToggleMmCorr(p.ID_Pilar)}
                                            className={`text-[8px] font-bold uppercase px-2 py-1 border rounded-lg transition-all ${
                                              isCorrSelected 
                                                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                                                : "border-stone-300 dark:border-stone-800 text-stone-500"
                                            }`}
                                          >
                                            {p.Nombre}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <button type="submit" className="w-full py-2 bg-teal-500 text-white font-bold rounded-lg text-[9px] uppercase">
                                    Guardar Micrometa
                                  </button>
                                </form>
                              )}

                              {/* Micrometas list display */}
                              <div className="space-y-2">
                                {metaMicrometas.map((mm) => {
                                  const isMMCompleted = mm.Estado === "Completada";
                                  const isMMCancelled = mm.Estado === "Cancelada";
                                  const matchingCard = deudas.find(d => d.ID_Instrumento === mm.ID_Tarjeta_Gasto);

                                  return (
                                    <div key={mm.ID_Micrometa} className={`p-3 rounded-xl border text-[11px] leading-normal flex flex-col gap-2 ${
                                      isMMCompleted ? "opacity-75 bg-stone-900/10 dark:bg-stone-950/20" 
                                      : isMMCancelled ? "opacity-55 line-through bg-stone-500/5" 
                                      : darkMode ? "bg-stone-900 border-stone-800" : "bg-white border-stone-200"
                                    }`}>
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-2 flex-1">
                                          <span className="mt-0.5">🏁</span>
                                          <div>
                                            <p className={`font-bold ${
                                              isMMCompleted ? "line-through text-stone-500" 
                                              : isMMCancelled ? "line-through text-stone-500" 
                                              : darkMode ? "text-stone-300" : "text-stone-750"
                                            }`}>
                                              {mm.Titulo}
                                            </p>
                                            
                                            {mm.Fecha_Planificada && (
                                              <p className="text-[8px] font-mono text-stone-500 mt-0.5">
                                                Plan: {mm.Fecha_Planificada} {mm.Sincronizar_Calendario === 1 && "📅"}
                                              </p>
                                            )}

                                            {mm.Genera_Gasto === 1 && (
                                              <div className="text-[9px] mt-1 font-semibold flex flex-wrap gap-1.5 items-center">
                                                <span className="text-amber-500">
                                                  Gasto: {symbol}{mm.Monto_Gasto} 
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
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                          <select
                                            className={`text-[9px] font-bold p-1 rounded-md border focus:outline-none ${
                                              darkMode ? "bg-stone-950 border-stone-800 text-stone-400" : "bg-white border-stone-250 text-stone-700"
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
                                            className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-md cursor-pointer"
                                            title="Eliminar Micrometa"
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
                                              <span key={cId} className="text-[7.5px] font-bold uppercase bg-indigo-500/10 text-indigo-400 px-1 rounded">
                                                🔗 {matchPil.Nombre}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}

                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })
                  )}
                </div>

              </div>

            </div>
          ) : (
            <div className={`p-10 rounded-[2.5rem] border text-center ${
              darkMode ? "bg-stone-900/10 border-stone-900" : "bg-stone-100/50 border-stone-200"
            } space-y-4`}>
              <HelpCircle className="w-8 h-8 mx-auto text-stone-500" />
              <div>
                <h4 className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-stone-300" : "text-stone-700"}`}>
                  Inspector de Nodos
                </h4>
                <p className="text-[11px] text-stone-500 leading-normal mt-1 max-w-xs mx-auto">
                  Haz clic sobre cualquier caja del diagrama de flujo de pilares del bienestar para gestionar sus metas SMART, micrometas y configurar sus flujos financieros.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
