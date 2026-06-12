import React, { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  HardDrive, 
  RefreshCw, 
  UploadCloud, 
  Trash2, 
  FileText, 
  Plus, 
  Check, 
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Loader2,
  Lock,
  User,
  ExternalLink,
  Sparkles
} from "lucide-react";
import { Usuario, AgendaEvento, Ingreso, Egreso, Deuda, MetaPilar, CategoriaPilar } from "../types";

interface WorkspaceSyncTabProps {
  darkMode: boolean;
  activeUser: Usuario;
  eventos: AgendaEvento[];
  ingresos: Ingreso[];
  egresos: Egreso[];
  deudas: Deuda[];
  metas: MetaPilar[];
  setEventos: React.Dispatch<React.SetStateAction<AgendaEvento[]>>;
  googleClientId: string;
}

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  size?: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

export default function WorkspaceSyncTab({
  darkMode,
  activeUser,
  eventos,
  ingresos,
  egresos,
  deudas,
  metas,
  setEventos,
  googleClientId
}: WorkspaceSyncTabProps) {
  // Sync state
  const [accessToken, setAccessToken] = useState<string>(() => {
    return localStorage.getItem(`pilar5_g_token_${activeUser.ID_Usuario}`) || "";
  });
  const [isConnected, setIsConnected] = useState<boolean>(() => {
    return !!localStorage.getItem(`pilar5_g_connected_${activeUser.ID_Usuario}`);
  });
  
  // Google User Info Simulated/Fetched
  const [googleUser, setGoogleUser] = useState<{ name: string; email: string; picture?: string } | null>(() => {
    const saved = localStorage.getItem(`pilar5_g_user_${activeUser.ID_Usuario}`);
    return saved ? JSON.parse(saved) : null;
  });

  // API Call states
  const [loadingCalendar, setLoadingCalendar] = useState<boolean>(false);
  const [loadingDrive, setLoadingDrive] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Lists fetched from real Google APIs
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);

  // Form states for creating custom files/events
  const [newCalendarTitle, setNewCalendarTitle] = useState("");
  const [newCalendarDate, setNewCalendarDate] = useState("2026-06-08");
  const [newCalendarDesc, setNewCalendarDesc] = useState("");
  const [newCalendarPilar, setNewCalendarPilar] = useState<CategoriaPilar>(CategoriaPilar.SALUD);

  const [newDriveFileName, setNewDriveFileName] = useState("");
  const [newDriveFileContent, setNewDriveFileContent] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleGoogleOAuthDirect = () => {
    const clientId = googleClientId.trim();
    const redirectUri = window.location.origin + "/";
    const scope = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.profile email openid https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=consent`;

    window.location.href = authUrl;
  };

  // Connect Google simulating/with real tokens
  useEffect(() => {
    if (accessToken) {
      localStorage.setItem(`pilar5_g_token_${activeUser.ID_Usuario}`, accessToken);
    } else {
      localStorage.removeItem(`pilar5_g_token_${activeUser.ID_Usuario}`);
    }
  }, [accessToken, activeUser.ID_Usuario]);

  useEffect(() => {
    if (isConnected) {
      localStorage.setItem(`pilar5_g_connected_${activeUser.ID_Usuario}`, "true");
    } else {
      localStorage.removeItem(`pilar5_g_connected_${activeUser.ID_Usuario}`);
    }
  }, [isConnected, activeUser.ID_Usuario]);

  useEffect(() => {
    if (googleUser) {
      localStorage.setItem(`pilar5_g_user_${activeUser.ID_Usuario}`, JSON.stringify(googleUser));
    } else {
      localStorage.removeItem(`pilar5_g_user_${activeUser.ID_Usuario}`);
    }
  }, [googleUser, activeUser.ID_Usuario]);

  // Load real files and calendar if access token is available on mount
  useEffect(() => {
    if (isConnected && accessToken) {
      fetchGoogleDriveFiles();
      fetchGoogleCalendarEvents();
    }
  }, [isConnected, accessToken]);



  const handleDisconnect = async () => {
    if (window.confirm("¿Seguro que deseas desconectar tu cuenta de Google Workspace del SaaS?")) {
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
      setDriveFiles([]);
      setGoogleEvents([]);
      setSyncStatus("Desconectado de Google Workspace.");
      setSyncError(null);
      localStorage.removeItem(`pilar5_g_token_${activeUser.ID_Usuario}`);
      localStorage.removeItem(`pilar5_g_connected_${activeUser.ID_Usuario}`);
      localStorage.removeItem(`pilar5_g_user_${activeUser.ID_Usuario}`);
      localStorage.removeItem(`pilar5_g_expires_at_${activeUser.ID_Usuario}`);
    }
  };

  // Helper to clear stale/expired Google tokens silently
  const clearExpiredGoogleToken = async () => {
    try {
      await fetch("/api/auth/google/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: activeUser.ID_Usuario })
      });
    } catch (err) {
      console.error("Error unlinking expired Google from server:", err);
    }
    setAccessToken("");
    setIsConnected(false);
    setGoogleUser(null);
    setDriveFiles([]);
    setGoogleEvents([]);
    localStorage.removeItem(`pilar5_g_token_${activeUser.ID_Usuario}`);
    localStorage.removeItem(`pilar5_g_connected_${activeUser.ID_Usuario}`);
    localStorage.removeItem(`pilar5_g_user_${activeUser.ID_Usuario}`);
    localStorage.removeItem(`pilar5_g_expires_at_${activeUser.ID_Usuario}`);
  };

  // Google Calendar Integration Actions
  const fetchGoogleCalendarEvents = async (customToken?: string) => {
    const token = customToken || accessToken;
    const expiresAt = localStorage.getItem(`pilar5_g_expires_at_${activeUser.ID_Usuario}`);
    if (token) {
      const isExpired = expiresAt ? Date.now() > parseInt(expiresAt) : false;
      if (isExpired) {
        clearExpiredGoogleToken();
        return;
      }
    }
    if (!token) return;

    setLoadingCalendar(true);
    try {
      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=15", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        
        const deletedKey = `pilar5_deleted_gcal_${activeUser.ID_Usuario}`;
        const deletedList: string[] = JSON.parse(localStorage.getItem(deletedKey) || "[]");

        // Sweep and delete stale Google Calendar events that the user deleted locally
        for (const item of items) {
          if (item.status !== "cancelled" && deletedList.includes(item.id)) {
            console.log(`[SYNC] Auto-deleting stale Google Calendar event from Google account: ${item.id}`);
            try {
              const isRecur = item.id.includes("_");
              await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${item.id}`, {
                method: isRecur ? "PATCH" : "DELETE",
                headers: { 
                  Authorization: `Bearer ${token}`,
                  ...(isRecur ? { "Content-Type": "application/json" } : {})
                },
                body: isRecur ? JSON.stringify({ status: "cancelled" }) : undefined
              });
            } catch (err) {
              console.error("Auto-delete stale Google event failed:", err);
            }
          }
        }

        const remainingItems = items.filter((it: any) => it.status !== "cancelled" && !deletedList.includes(it.id));

        setGoogleEvents(remainingItems.map((it: any) => ({
          id: it.id,
          summary: it.summary || "Sin Título",
          description: it.description || "",
          start: it.start,
          end: it.end
        })));
      } else if (res.status === 401) {
        // Token expired — auto-disconnect silently
        clearExpiredGoogleToken();
      } else if (res.status === 403) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error?.message || "Acceso prohibido (403). Verifica que la API de Google Calendar esté activa en Google Cloud Console y hayas marcado la casilla de permisos al iniciar sesión.";
        setSyncError(`Error Google Calendar: ${errMsg}`);
      } else {
        setGoogleEvents([]);
      }
    } catch {
      setGoogleEvents([]);
    } finally {
      setLoadingCalendar(false);
    }
  };

  // Push local event to Google Calendar (Real API + backup simulation)
  const handlePushEventToGoogle = async (ev: AgendaEvento) => {
    const confirmed = window.confirm(
      `¿Deseas exportar y agendar "${ev.Titulo_Actividad}" en tu Google Calendar real? Esto sincronizará la fecha y recordatorios.`
    );
    if (!confirmed) return;

    if (!accessToken) {
      alert("Debes conectar tu cuenta de Google Workspace primero.");
      return;
    }

    setLoadingCalendar(true);
    setSyncError(null);
    try {
      const startDateTime = ev.Fecha_Hora_Inicio ? `${ev.Fecha_Hora_Inicio}:00` : `${ev.Fecha}T09:00:00`;
      const endDateTime = ev.Fecha_Hora_Fin ? `${ev.Fecha_Hora_Fin}:00` : `${ev.Fecha}T10:00:00`;

      const bodyPayload = {
        summary: ev.Titulo_Actividad || ev.Titulo,
        description: `[Ecosistema 5 Pilares SaaS] Pilar: ${ev.Pilar}. Diagnóstico: ${ev.Descripcion_Detallada || ev.Descripcion}.`,
        start: {
          dateTime: startDateTime,
          timeZone: "UTC"
        },
        end: {
          dateTime: endDateTime,
          timeZone: "UTC"
        },
        colorId: ev.Color === "red" ? "11" : ev.Color === "green" ? "2" : ev.Color === "blue" ? "1" : "5"
      };

      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(bodyPayload)
      });

      if (!res.ok) {
        throw new Error(`Error en servidor Google Calendar: ${res.statusText}`);
      }

      const createdGEvent = await res.json();
      
      // Save Google Calendar event ID to SQLite
      await fetch(`/api/eventos/${ev.ID_Actividad}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ev,
          ID_Evento: createdGEvent.id
        })
      });

      setEventos(prev => prev.map(item => item.ID_Actividad === ev.ID_Actividad ? { ...item, ID_Evento: createdGEvent.id } : item));
      setSyncStatus(`¡Sincronizado! Evento "${ev.Titulo_Actividad}" exportado con éxito a Google Calendar.`);
      fetchGoogleCalendarEvents();
      alert(`🎉 ¡Evento agendado en tu Google Calendar real!`);
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || "No se pudo agendar el evento en Google Calendar.");
    } finally {
      setLoadingCalendar(false);
    }
  };

  // Bidirectional Import from Google Calendar to 5 Pilares Local Agenda
  const handleImportGoogleEvents = async () => {
    if (googleEvents.length === 0) {
      alert("No hay eventos en Google Calendar disponibles para importar.");
      return;
    }

    const confirmed = window.confirm(
      `¿Deseas importar ${googleEvents.length} eventos desde Google Calendar a tu Consola de Gobierno local?`
    );
    if (!confirmed) return;

    const imported: AgendaEvento[] = googleEvents.map((g, idx) => {
      const rawStart = g.start?.dateTime || g.start?.date || "2026-06-08T09:00";
      const isoDate = rawStart.slice(0, 10);
      const uuid = `imported-evt-${Date.now()}-${idx}`;

      return {
        ID_Usuario: activeUser.ID_Usuario,
        ID_Evento: g.id, // SAVE THE REAL GOOGLE CALENDAR EVENT ID!
        ID_Actividad: uuid,
        Tipo_Agenda: "Agenda_Personal",
        Pilar: CategoriaPilar.PERSONAL,
        Pilar_Asociado: CategoriaPilar.PERSONAL,
        Titulo_Actividad: `🔌 [Importado] ${g.summary}`,
        Titulo: `🔌 [Importado] ${g.summary}`,
        Descripcion_Detallada: g.description || "Inyectado bidireccionalmente desde Google Calendar.",
        Descripcion: g.description || "Inyectado bidireccionalmente desde Google Calendar.",
        Fecha_Hora_Inicio: rawStart.slice(0, 16),
        Fecha_Hora_Fin: (g.end?.dateTime || rawStart).slice(0, 16),
        Requiere_Pago: false,
        ID_Egreso_Asociado: null,
        Fecha: isoDate,
        Tipo_Evento: "Sesión Mentoría",
        Color: "indigo",
        Alerta_Descalce: false
      };
    });

    // Save to server SQLite DB
    try {
      for (const ev of imported) {
        await fetch("/api/eventos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ev)
        });
      }
      setEventos((prev) => [...prev, ...imported]);
      setSyncStatus(`Se importaron exitosamente ${imported.length} actividades.`);
      alert(`👍 ¡Importación completa! Se inyectaron ${imported.length} eventos a tu Agenda Local.`);
    } catch (err: any) {
      console.error("Error saving imported events:", err);
      alert("Ocurrió un error al persistir los eventos importados en la base de datos.");
    }
  };

  // Add custom manual calendar event directly to Google via POST
  const handleAddNewGoogleCalendarEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCalendarTitle) return;

    if (!accessToken) {
      alert("Debes conectar tu cuenta de Google Workspace primero.");
      return;
    }

    setLoadingCalendar(true);
    try {
      const payload = {
        summary: newCalendarTitle,
        description: newCalendarDesc,
        start: { dateTime: `${newCalendarDate}T10:00:00`, timeZone: "UTC" },
        end: { dateTime: `${newCalendarDate}T11:00:00`, timeZone: "UTC" }
      };

      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Error en el servidor de Google");

      setSyncStatus(`¡Se creó exitosamente el evento "${newCalendarTitle}"!`);
      setNewCalendarTitle("");
      setNewCalendarDesc("");
      fetchGoogleCalendarEvents();
    } catch (err: any) {
      setSyncError(err.message || "Fallo al crear evento.");
    } finally {
      setLoadingCalendar(false);
    }
  };


  // --- GOOGLE DRIVE FILE SYSTEM ACTIONS ---
  const fetchGoogleDriveFiles = async (customToken?: string) => {
    const token = customToken || accessToken;
    const expiresAt = localStorage.getItem(`pilar5_g_expires_at_${activeUser.ID_Usuario}`);
    if (token) {
      const isExpired = expiresAt ? Date.now() > parseInt(expiresAt) : false;
      if (isExpired) {
        clearExpiredGoogleToken();
        return;
      }
    }
    if (!token) return;

    setLoadingDrive(true);
    try {
      const res = await fetch("https://www.googleapis.com/drive/v3/files?pageSize=12&fields=nextPageToken,files(id,name,mimeType,createdTime,size)", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDriveFiles(data.files || []);
      } else if (res.status === 401) {
        // Token expired — auto-disconnect silently
        clearExpiredGoogleToken();
      } else if (res.status === 403) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error?.message || "Acceso prohibido (403). Verifica que la API de Google Drive esté activa en Google Cloud Console y hayas marcado la casilla de permisos al iniciar sesión.";
        setSyncError(`Error Google Drive: ${errMsg}`);
      } else {
        setDriveFiles([]);
      }
    } catch {
      setDriveFiles([]);
    } finally {
      setLoadingDrive(false);
    }
  };

  // Export 5 Pilares Report to Google Drive in beautiful Markdown format
  const handleExportMarkdownReport = async () => {
    const confirmed = window.confirm(
      "¿Seguro que deseas generar y escribir el informe integral de 5 Pilares directamente en tu Google Drive?"
    );
    if (!confirmed) return;

    // Build gorgeous report content
    const totalIncomes = ingresos.reduce((s, i) => s + i.Monto_Neto, 0);
    const totalExpenses = egresos.reduce((s, e) => s + e.Monto, 0);
    const netSavings = totalIncomes - totalExpenses;
    const activeDebts = deudas.filter(d => d.Tipo === "Crédito").reduce((s, d) => s + d.Deuda_Actual, 0);

    const reportContent = `# DIAGNÓSTICO INTEGRAL DE 5 PILARES - SAAS CONTROL
Auditoría generada a la fecha local: ${new Date().toLocaleDateString()}
Usuario Activo: ${activeUser.Nombre_Usuario} (${activeUser.Gmail_Sincronizado})
Plan de Suscripción: ${activeUser.Plan_Suscripcion}
Aislamiento Lógico UUID: ${activeUser.ID_Usuario}

## 1. BALANCE GENERAL DE LIQUIDEZ Y FINANZAS (HORIZONTES)
- Ingresos Totales Registrados: $${totalIncomes.toFixed(2)}
- Egresos Consolidados del Periodo: $${totalExpenses.toFixed(2)}
- Balance / Flujo Neto Mensual: $${netSavings.toFixed(2)}
- Deuda Consolidada en Plásticos (TDC): $${activeDebts.toFixed(2)}

## 2. METAS SMART REGISTRADAS (TABLA METAS)
${metas.map((m, idx) => `${idx + 1}. [${m.Pilar}] SMART: "${m.Meta_SMART}" - Estado: ${m.Estado} (Asignado: $${m.Presupuesto_Asignado})`).join("\n")}

## 3. ACTIVIDADES CONTROLADAS (TABLA AGENDA)
${eventos.map((e, idx) => `- [${e.Fecha}] ${e.Titulo_Actividad} (${e.Pilar}) - Requiere Pago: ${e.Requiere_Pago ? "Sí" : "No"}`).join("\n")}

---
SaaS Ecosistema 5 Pilares - Automatización Inteligente con Google Workspace & Gemini Cloud AI.
`;

    if (!accessToken) {
      alert("Debes conectar tu cuenta de Google Workspace primero.");
      return;
    }

    setLoadingDrive(true);
    setSyncError(null);
    try {
      // Step 1: Create Google Drive File Metadata
      const metadataResponse = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: `5_Pilares_SaaS_Report_${activeUser.Nombre_Usuario.replace(/\s+/g, "_")}.md`,
          mimeType: "text/markdown"
        })
      });

      if (!metadataResponse.ok) {
        throw new Error("Fallo al crear metadatos del archivo en Drive.");
      }

      const fileData = await metadataResponse.json();
      const fileId = fileData.id;

      // Step 2: Upload Text/Markdown content inside the created File
      const contentResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "text/markdown"
        },
        body: reportContent
      });

      if (!contentResponse.ok) {
        throw new Error("Fallo al inyectar el contenido Markdown del informe.");
      }

      setSyncStatus(`¡Excelente! Archivo Markdown creado y subido con éxito a tu Google Drive.`);
      fetchGoogleDriveFiles();
      alert(`🎉 El reporte "5_Pilares_SaaS_Report_${activeUser.Nombre_Usuario.replace(/\s+/g, "_")}.md" se ha guardado exitosamente en tu Google Drive.`);
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || "No se pudo crear el reporte Markdown en Google Drive.");
    } finally {
      setLoadingDrive(false);
    }
  };

  // Upload custom file name & content manually to Google Drive
  const handleCreateCustomDriveFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriveFileName) return;

    const confirmed = window.confirm(
      `¿Deseas subir el archivo "${newDriveFileName}" a Google Drive con este contenido escrito?`
    );
    if (!confirmed) return;

    if (!accessToken) {
      alert("Debes conectar tu cuenta de Google Workspace primero.");
      return;
    }

    setLoadingDrive(true);
    try {
      const metadataRes = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: newDriveFileName,
          mimeType: "text/plain"
        })
      });

      if (!metadataRes.ok) throw new Error("Fallo al escribir metadatos");
      const fileMeta = await metadataRes.json();

      const mediaRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileMeta.id}?uploadType=media`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "text/plain"
        },
        body: newDriveFileContent
      });

      if (!mediaRes.ok) throw new Error("Fallo al escribir el cuerpo");

      setSyncStatus(`Archivo "${newDriveFileName}" subido con éxito.`);
      setNewDriveFileName("");
      setNewDriveFileContent("");
      fetchGoogleDriveFiles();
    } catch (err: any) {
      setSyncError(err.message || "Fallo en la subida.");
    } finally {
      setLoadingDrive(false);
    }
  };

  // Delete Google Drive File with mandatory explicit confirmation
  const handleDeleteDriveFile = async (fileId: string, fileName: string) => {
    // MANDATORY confirmation dialogue requested by security guidelines
    const confirmed = window.confirm(
      `⚠ ALERTA DE SEGURIDAD ⚠\n¿Deseas eliminar permanentemente el archivo "${fileName}" de tu Google Drive?\nEsta acción no se puede deshacer de ninguna forma.`
    );
    if (!confirmed) return;

    if (!accessToken) {
      alert("Debes conectar tu cuenta de Google Workspace primero.");
      return;
    }

    setLoadingDrive(true);
    setSyncError(null);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!res.ok) {
        throw new Error(`Error de eliminación de Google Drive: ${res.statusText}`);
      }

      setSyncStatus(`Archivo "${fileName}" borrado exitosamente de Google Drive.`);
      fetchGoogleDriveFiles();
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || "No se pudo eliminar el archivo.");
    } finally {
      setLoadingDrive(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Title block */}
      <div className={`p-6 rounded-3xl border ${
        darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-200"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-500/10 text-teal-500 rounded-2xl border border-teal-500/15">
              <HardDrive className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className={`text-lg font-sans font-bold leading-tight ${darkMode ? "text-white" : "text-stone-900"}`}>
                Sincronización Avanzada Google Workspace
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Vincula tu cuenta de Google para agendar recordatorios del plan en Google Calendar y respaldar diagnósticos en Google Drive con total aislamiento lógico.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                className="py-1.5 px-3.5 rounded-xl border border-rose-500/20 text-rose-500 bg-rose-500/5 hover:bg-rose-500 hover:text-white text-xs font-semibold tracking-wide transition-all cursor-pointer"
              >
                Desconectar Cuenta Google
              </button>
            ) : (
              <div className="flex flex-wrap gap-2 items-center">
                {/* Real Google OAuth Connection */}
                <button
                  onClick={handleGoogleOAuthDirect}
                  className="py-1.5 px-3.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold tracking-wide transition-all cursor-pointer shadow-md shadow-teal-500/15 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Conectar Google Workspace</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Messages */}
        {syncStatus && (
          <div className="mt-4 p-3 rounded-xl bg-teal-500/10 text-teal-400 text-xs flex items-center gap-2 border border-teal-500/20 font-medium">
            <Check className="w-4 h-4 text-teal-500 flex-shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}
        {syncError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2 border border-rose-500/20 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <span>{syncError}</span>
          </div>
        )}



        {/* Logged in User Badge */}
        {isConnected && googleUser && (
          <div className="mt-5 flex items-center justify-between p-3.5 rounded-2xl bg-teal-500/5 border border-teal-500/10">
            <div className="flex items-center gap-3">
              <img
                src={googleUser.picture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                alt={googleUser.name}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full border border-teal-500/20 object-cover"
              />
              <div>
                <p className={`text-xs font-bold truncate ${darkMode ? "text-white" : "text-stone-900"}`}>
                  {googleUser.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-stone-500 font-medium font-mono">{googleUser.email}</span>
                  <span className="text-[9px] text-teal-400 font-bold uppercase tracking-widest bg-teal-500/10 px-1.5 py-0.5 rounded ml-2">Integridades Sincronizadas</span>
                </div>
              </div>
            </div>

            <div className="text-right text-[10px] text-stone-500 leading-normal hidden sm:block">
              <p className="font-bold">Google Calendar &amp; Drive</p>
              <p>Autorizados con consentimiento del usuario final</p>
            </div>
          </div>
        )}
      </div>


      {!isConnected ? null : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* GOOGLE CALENDAR CONTROLLER PANEL */}
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${
            darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-200"
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-stone-100 dark:border-stone-850">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-indigo-400" />
                  <h3 className={`font-bold text-xs uppercase tracking-wider ${darkMode ? "text-white" : "text-stone-900"}`}>
                    Sincronizador Google Calendar
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleImportGoogleEvents}
                    disabled={loadingCalendar}
                    className="py-1 px-2 text-[10px] font-bold border rounded-lg bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-400 transition-all cursor-pointer disabled:opacity-55"
                    title="Importar eventos externos hacia la agenda local"
                  >
                    Importar hacia Agenda Local
                  </button>
                  <button
                    onClick={() => fetchGoogleCalendarEvents()}
                    disabled={loadingCalendar}
                    className="p-1 text-stone-500 hover:text-teal-400 transition-all cursor-pointer"
                  >
                    {loadingCalendar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Push Local Event List */}
              <div className="space-y-2.5">
                <p className="text-[11px] text-stone-500 font-medium">
                  👉 **Tus actividades agendadas en local (Consola de Gobierno):** Presiona para agendar o exportar el evento de forma instantánea a tu Google Calendar:
                </p>
                
                {eventos.length === 0 ? (
                  <p className="text-[10px] text-stone-600 italic py-2">No hay eventos locales registrados.</p>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {eventos.map((ev) => (
                      <div
                        key={ev.ID_Evento}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                          darkMode ? "bg-stone-950/60 border-stone-850" : "bg-stone-50 border-stone-200"
                        }`}
                      >
                        <div className="truncate pr-3 flex-1">
                          <p className={`font-semibold truncate ${darkMode ? "text-stone-200" : "text-stone-800"}`}>
                            {ev.Titulo_Actividad}
                          </p>
                          <div className="flex items-center gap-1.5 text-[9px] text-stone-500 mt-1 font-mono">
                            <span className="px-1 py-0.5 rounded bg-stone-500/10 text-stone-400">{ev.Pilar}</span>
                            <span>📅 {ev.Fecha}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handlePushEventToGoogle(ev)}
                          className="py-1 px-2.5 text-[10px] font-bold rounded-lg bg-teal-500/10 hover:bg-teal-500 text-teal-400 hover:text-white transition-all cursor-pointer flex items-center gap-1 border border-teal-500/10 hover:border-teal-500"
                        >
                          <span>Exportar</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Google Calendar Real Events view */}
              <div className="pt-3 border-t border-stone-100 dark:border-stone-850 space-y-2">
                <h4 className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-stone-400" : "text-stone-600"}`}>
                  Eventos Activos Registrados en Google Calendar
                </h4>

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {googleEvents.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-[10px] text-stone-500">No se encontraron eventos en la cuenta de Google conectada.</p>
                    </div>
                  ) : (
                    googleEvents.map((g) => (
                      <div
                        key={g.id}
                        className={`p-2 rounded-xl border-l-[3px] flex items-center justify-between text-[11px] ${
                          darkMode ? "bg-stone-950/30 border-stone-850 border-l-teal-500" : "bg-stone-100/50 border-stone-200 border-l-teal-600"
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className={`font-semibold truncate ${darkMode ? "text-stone-300" : "text-stone-700"}`}>
                            {g.summary}
                          </p>
                          <p className="text-[9px] text-stone-500 mt-0.5 font-mono">
                            ⏱ {(g.start?.dateTime || g.start?.date || "").replace("T", " ").replace("Z", "")}
                          </p>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-stone-600 uppercase bg-stone-500/10 px-1 py-0.5 rounded">
                          Calendar
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Manual ADD event form */}
            <form onSubmit={handleAddNewGoogleCalendarEvent} className="pt-4 border-t border-stone-100 dark:border-stone-850 mt-4 space-y-3">
              <h4 className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-stone-400" : "text-stone-600"}`}>
                Añadir Cita Pronta a Google Calendar
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Título (ej: Cita Médica de Control)"
                  value={newCalendarTitle}
                  onChange={(e) => setNewCalendarTitle(e.target.value)}
                  className={`text-[11px] px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-1 ${
                    darkMode ? "bg-stone-950 border-stone-850 text-white placeholder-stone-600 focus:ring-teal-500/40" : "bg-stone-50 border-stone-200 text-stone-800 focus:ring-teal-600"
                  }`}
                />
                <input
                  type="date"
                  required
                  value={newCalendarDate}
                  onChange={(e) => setNewCalendarDate(e.target.value)}
                  className={`text-[11px] px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-1 ${
                    darkMode ? "bg-stone-950 border-stone-850 text-white focus:ring-teal-500/40" : "bg-stone-50 border-stone-200 text-stone-800 focus:ring-teal-600"
                  }`}
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Notas adicionales (opcional)"
                  value={newCalendarDesc}
                  onChange={(e) => setNewCalendarDesc(e.target.value)}
                  className={`flex-1 text-[11px] px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-1 ${
                    darkMode ? "bg-stone-950 border-stone-850 text-white placeholder-stone-600 focus:ring-teal-500/40" : "bg-stone-50 border-stone-200 text-stone-800 focus:ring-teal-600"
                  }`}
                />
                <button
                  type="submit"
                  disabled={loadingCalendar}
                  className="py-1.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir</span>
                </button>
              </div>
            </form>
          </div>


          {/* GOOGLE DRIVE PANEL */}
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${
            darkMode ? "bg-stone-900/40 border-stone-900" : "bg-white border-stone-200"
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-stone-100 dark:border-stone-850">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-teal-400 animate-pulse" />
                  <h3 className={`font-bold text-xs uppercase tracking-wider ${darkMode ? "text-white" : "text-stone-900"}`}>
                    Explorador Google Drive &amp; Respaldos
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportMarkdownReport}
                    disabled={loadingDrive}
                    className="py-1 px-2.2 text-[10px] font-bold border rounded-lg bg-teal-500/10 hover:bg-teal-500 hover:text-white text-teal-400 transition-all cursor-pointer disabled:opacity-55 flex items-center gap-1"
                    title="Exportar diagnóstico de 5 pilares como documento de Drive"
                  >
                    <UploadCloud className="w-3 h-3" />
                    <span>Documentar Reporte (.md)</span>
                  </button>
                  <button
                    onClick={() => fetchGoogleDriveFiles()}
                    disabled={loadingDrive}
                    className="p-1 text-stone-500 hover:text-teal-400 transition-all cursor-pointer"
                  >
                    {loadingDrive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Google Drive File list display */}
              <div className="space-y-2">
                <p className="text-[11px] text-stone-500 font-medium">
                  📦 **Explorador de Archivos de tu Drive o Entorno de Aislamiento:**
                </p>

                <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                  {driveFiles.length === 0 ? (
                    <div className="py-8 text-center bg-stone-100/10 dark:bg-stone-950/20 rounded-2xl border border-dashed border-stone-850/60 flex flex-col items-center justify-center">
                      <FileText className="w-7 h-7 text-stone-600 mb-2" />
                      <p className="text-[10px] text-stone-500">No hay archivos resguardados en Google Drive de este cliente.</p>
                    </div>
                  ) : (
                    driveFiles.map((f) => (
                      <div
                        key={f.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                          darkMode ? "bg-stone-950/60 border-stone-850 hover:bg-stone-950" : "bg-stone-50 border-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        <div className="truncate pr-3 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-stone-300 truncate font-mono">
                              {f.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-stone-500 mt-1 font-mono">
                            <span>Mime: {f.mimeType.split(".").pop()?.split("/").pop()}</span>
                            {f.createdTime && (
                              <span>• ⏱ {f.createdTime.slice(0,10)}</span>
                            )}
                            {f.size && (
                              <span>• 💾 {(parseInt(f.size)/1024).toFixed(1)} KB</span>
                            )}
                          </div>
                        </div>

                        {/* File Action Deck */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteDriveFile(f.id, f.name)}
                            className="p-1 px-2.2 rounded bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 transition-all cursor-pointer border border-rose-500/10"
                            title="Eliminar archivo permanentemente de Drive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Custom file creation manually */}
            <form onSubmit={handleCreateCustomDriveFile} className="pt-4 border-t border-stone-100 dark:border-stone-850 mt-4 space-y-3">
              <h4 className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-stone-400" : "text-stone-600"}`}>
                Escribir / Subir una Nota Rápida (.txt) a Drive
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nombre de archivo (ej: Balance_Fijo_Junio.txt)"
                  value={newDriveFileName}
                  onChange={(e) => setNewDriveFileName(e.target.value)}
                  className={`text-[11px] px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-1 flex-1 ${
                    darkMode ? "bg-stone-950 border-stone-850 text-white placeholder-stone-600 focus:ring-teal-500/40" : "bg-stone-50 border-stone-200 text-stone-800 focus:ring-teal-600"
                  }`}
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Escribe el cuerpo de tu nota o recordatorio..."
                  value={newDriveFileContent}
                  onChange={(e) => setNewDriveFileContent(e.target.value)}
                  className={`flex-1 text-[11px] px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-1 ${
                    darkMode ? "bg-stone-950 border-stone-850 text-white placeholder-stone-600 focus:ring-teal-500/40" : "bg-stone-50 border-stone-200 text-stone-800 focus:ring-teal-600"
                  }`}
                />
                <button
                  type="submit"
                  disabled={loadingDrive}
                  className="py-1.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Subir</span>
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* Security Framework disclaimer */}
      <div className={`p-4 rounded-2xl border flex gap-3 ${
        darkMode ? "bg-amber-950/10 border-amber-900/20 text-amber-500" : "bg-amber-50 border-amber-250 text-amber-800"
      }`}>
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold">🔑 Mecanismos de Aislamiento &amp; Privacidad:</p>
          <p className="text-[11px] leading-relaxed">
            Todas las operaciones con la API de Google son encriptadas con cifrado asimétrico y se realizan bajo el consentimiento explícito del inquilino autenticado mediante OAuth2 (Tabla A). El sistema restringe el acceso de cualquier otro inquilino multi-tenant del SaaS de forma absoluta.
          </p>
        </div>
      </div>
    </div>
  );
}
