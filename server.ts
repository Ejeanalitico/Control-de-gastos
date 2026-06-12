import express from "express";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { 
  initDatabase, 
  queryGet, 
  queryAll, 
  queryRun, 
  hashPassword,
  seedUserPilares
} from "./db";

dotenv.config();
dotenv.config({ path: ".env.local" });

// Initialize the SQLite schema
initDatabase();

// Helper to shift date for recurrence (weekly, monthly, yearly)
function getFutureDate(baseDateStr: string, index: number, frequency: string): { dateStr: string, dateTimeStr: string } {
  const parts = baseDateStr.split("T");
  const dateOnly = parts[0];
  const timeOnly = parts[1] || "08:00";
  
  const d = new Date(dateOnly + "T" + timeOnly);
  
  if (frequency === "semanal") {
    d.setDate(d.getDate() + index * 7);
  } else if (frequency === "mensual") {
    d.setMonth(d.getMonth() + index);
  } else if (frequency === "anual") {
    d.setFullYear(d.getFullYear() + index);
  }
  
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  
  return {
    dateStr: `${yyyy}-${mm}-${dd}`,
    dateTimeStr: `${yyyy}-${mm}-${dd}T${hh}:${min}`
  };
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // === CONFIGURATION ENDPOINT ===
  app.get("/api/config", (req, res) => {
    res.json({
      googleClientId: process.env.GOOGLE_CLIENT_ID || ""
    });
  });

  app.get("/api/detect-currency", async (req, res) => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const gRes = await fetch("https://ipapi.co/json/", { signal: controller.signal });
      clearTimeout(id);
      if (gRes.ok) {
        const data: any = await gRes.json();
        return res.json({ currency: "" });
      }
    } catch (err) {
      // Silently ignore rate limits/CORS errors on server, default to empty
    }
    res.json({ currency: "" });
  });

  // === AUTHENTICATION ENDPOINTS ===

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Faltan datos obligatorios." });
      }

      const cleanEmail = email.trim().toLowerCase();
      const existing = await queryGet(
        "SELECT * FROM usuarios WHERE LOWER(TRIM(Gmail_Sincronizado)) = LOWER(TRIM(?)) OR LOWER(TRIM(Correo_Google)) = LOWER(TRIM(?))",
        [cleanEmail, cleanEmail]
      );
      if (existing) {
        return res.status(400).json({ error: "El correo ya está registrado." });
      }

      const userId = "user-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now();
      const passHash = hashPassword(password);

      // Create user
      await queryRun(`
        INSERT INTO usuarios (ID_Usuario, Nombre_Usuario, Gmail_Sincronizado, Password_Hash, Correo_Google, Google_Calendar_ID, Fecha_Registro, Plan_Suscripcion, Estado_Licencia, Tope_Amoroso_Porcentaje, Salud_Personal_Base_Porcentaje)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Premium_5P', 'Activo', 0.30, 0.20)
      `, [userId, name, cleanEmail, passHash, cleanEmail, `cal_5p_${userId}`, new Date().toISOString().split("T")[0]]);

      // Seed flowchart nodes and correlations
      seedUserPilares(userId);

      const user = await queryGet("SELECT ID_Usuario, Nombre_Usuario, Gmail_Sincronizado, Correo_Google, Plan_Suscripcion, Estado_Licencia, Tope_Amoroso_Porcentaje, Salud_Personal_Base_Porcentaje FROM usuarios WHERE ID_Usuario = ?", [userId]);
      res.json({ user });
    } catch (error: any) {
      console.error("Error in registration:", error);
      res.status(500).json({ error: error.message || "Ocurrió un error al registrar al usuario." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email y contraseña requeridos." });
      }

      const cleanEmail = email.trim().toLowerCase();
      const user: any = await queryGet(
        "SELECT * FROM usuarios WHERE LOWER(TRIM(Gmail_Sincronizado)) = LOWER(TRIM(?)) OR LOWER(TRIM(Correo_Google)) = LOWER(TRIM(?))",
        [cleanEmail, cleanEmail]
      );

      if (!user) {
        return res.status(400).json({ error: "Las credenciales no coinciden." });
      }

      const inputHash = hashPassword(password);
      if (user.Password_Hash !== inputHash) {
        return res.status(400).json({ error: "Las credenciales no coinciden." });
      }

      // Exclude hash from return payload
      const { Password_Hash, ...userClean } = user;
      res.json({ user: userClean });
    } catch (error: any) {
      console.error("Error in login:", error);
      res.status(500).json({ error: error.message || "Ocurrió un error al iniciar sesión." });
    }
  });

  // Google OAuth Login / Registration Endpoint
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Token de Google requerido." });
      }

      let email = "";
      let name = "";

      if (token.startsWith("mock_google_token_")) {
        email = "desarrollo@pilar5.local";
        name = "Usuario Mock Local";
      } else {
        const gRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!gRes.ok) {
          return res.status(400).json({ error: "El token de Google no es válido o ha expirado." });
        }

        const info = await gRes.json();
        if (!info.email) {
          return res.status(400).json({ error: "El token de Google no contiene una dirección de correo válida." });
        }

        email = info.email.trim().toLowerCase();
        name = info.name || "Usuario Google";
      }

      console.log("[DEBUG] Google User Info Email:", email);

      let user: any = await queryGet(
        "SELECT * FROM usuarios WHERE LOWER(TRIM(Gmail_Sincronizado)) = LOWER(TRIM(?)) OR LOWER(TRIM(Correo_Google)) = LOWER(TRIM(?))",
        [email, email]
      );
      console.log("[DEBUG] user found in DB:", user);

      if (!user) {
        const userId = "user-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now();
        const passHash = hashPassword(crypto.randomBytes(16).toString("hex"));

        await queryRun(`
          INSERT INTO usuarios (ID_Usuario, Nombre_Usuario, Gmail_Sincronizado, Password_Hash, Correo_Google, Google_Calendar_ID, Fecha_Registro, Plan_Suscripcion, Estado_Licencia, Tope_Amoroso_Porcentaje, Salud_Personal_Base_Porcentaje)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'Premium_5P', 'Activo', 0.30, 0.20)
        `, [userId, name, email, passHash, email, `cal_5p_${userId}`, new Date().toISOString().split("T")[0]]);

        // Seed flowchart nodes and correlations
        seedUserPilares(userId);

        user = await queryGet("SELECT * FROM usuarios WHERE ID_Usuario = ?", [userId]);
      }

      const { Password_Hash, ...userClean } = user;
      res.json({ user: userClean });
    } catch (error: any) {
      console.error("Error in Google Login / Register:", error);
      res.status(500).json({ error: error.message || "Error al autenticar con Google." });
    }
  });

  // Google OAuth Link Account Endpoint
  app.post("/api/auth/google/link", async (req, res) => {
    try {
      const { userId, token } = req.body;
      if (!userId || !token) {
        return res.status(400).json({ error: "userId y token de Google son obligatorios." });
      }

      let googleEmail = "";
      let originalEmailToShow = "";

      if (token.startsWith("mock_google_token_")) {
        googleEmail = "desarrollo@pilar5.local";
        originalEmailToShow = "desarrollo@pilar5.local";
      } else {
        // Verify token is valid and get Google user profile
        const gRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!gRes.ok) {
          return res.status(400).json({ error: "El token de Google no es válido o ha expirado." });
        }

        const info = await gRes.json();
        if (!info.email) {
          return res.status(400).json({ error: "El perfil de Google no contiene un correo válido." });
        }

        googleEmail = info.email.trim().toLowerCase();
        originalEmailToShow = info.email;
      }

      // Check if this Google email is already linked or registered to ANOTHER user account
      const duplicateUser = await queryGet(
        "SELECT * FROM usuarios WHERE (LOWER(TRIM(Gmail_Sincronizado)) = LOWER(TRIM(?)) OR LOWER(TRIM(Correo_Google)) = LOWER(TRIM(?))) AND ID_Usuario != ?",
        [googleEmail, googleEmail, userId]
      );

      if (duplicateUser) {
        return res.status(400).json({
          error: `Esta cuenta de Google (${originalEmailToShow}) ya está vinculada a otro perfil de usuario en el sistema. Para evitar duplicaciones, desvincúlala primero de esa cuenta.`
        });
      }

      // Update current user's Google email
      await queryRun(
        "UPDATE usuarios SET Correo_Google = ? WHERE ID_Usuario = ?",
        [googleEmail, userId]
      );

      // Return updated user clean details
      const user: any = await queryGet("SELECT * FROM usuarios WHERE ID_Usuario = ?", [userId]);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado." });
      }

      const { Password_Hash, ...userClean } = user;
      res.json({ success: true, user: userClean });
    } catch (error: any) {
      console.error("Error in Google Link:", error);
      res.status(500).json({ error: error.message || "Error al vincular cuenta de Google." });
    }
  });

  // Google OAuth Unlink Account Endpoint
  app.post("/api/auth/google/unlink", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId es obligatorio." });
      }

      await queryRun(
        "UPDATE usuarios SET Correo_Google = NULL WHERE ID_Usuario = ?",
        [userId]
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error in Google Unlink:", error);
      res.status(500).json({ error: error.message || "Error al desvincular cuenta de Google." });
    }
  });

  // Reset Application Data for a specific user
  app.post("/api/auth/reset", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId es obligatorio." });
      }

      await queryRun("DELETE FROM ingresos WHERE ID_Usuario = ?", [userId]);
      await queryRun("DELETE FROM egresos WHERE ID_Usuario = ?", [userId]);
      await queryRun("DELETE FROM deudas WHERE ID_Usuario = ?", [userId]);
      await queryRun("DELETE FROM metas WHERE ID_Usuario = ?", [userId]);
      await queryRun("DELETE FROM eventos WHERE ID_Usuario = ?", [userId]);
      await queryRun("DELETE FROM micrometas WHERE ID_Usuario = ?", [userId]);
      await queryRun("DELETE FROM correlaciones_pilares WHERE ID_Usuario = ?", [userId]);
      await queryRun("DELETE FROM correlaciones_micrometas WHERE ID_Usuario = ?", [userId]);
      await queryRun("DELETE FROM pilares WHERE ID_Usuario = ?", [userId]);

      // Re-seed essential structure
      seedUserPilares(userId);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error in resetting application data:", error);
      res.status(500).json({ error: error.message || "Error al restablecer los datos de la cuenta." });
    }
  });


  // Update User Profile details
  app.put("/api/usuarios/:id", async (req, res) => {
    try {
      const { Nombre_Usuario, Correo_Google, Gmail_Sincronizado, Tope_Amoroso_Porcentaje, Salud_Personal_Base_Porcentaje } = req.body;
      await queryRun(`
        UPDATE usuarios
        SET Nombre_Usuario = ?, Correo_Google = ?, Gmail_Sincronizado = ?, Tope_Amoroso_Porcentaje = ?, Salud_Personal_Base_Porcentaje = ?
        WHERE ID_Usuario = ?
      `, [
        Nombre_Usuario || null,
        Correo_Google || null,
        Gmail_Sincronizado || null,
        parseFloat(Tope_Amoroso_Porcentaje) || 0.30,
        parseFloat(Salud_Personal_Base_Porcentaje) || 0.20,
        req.params.id
      ]);
      const updated = await queryGet("SELECT ID_Usuario, Nombre_Usuario, Gmail_Sincronizado, Correo_Google, Plan_Suscripcion, Estado_Licencia, Tope_Amoroso_Porcentaje, Salud_Personal_Base_Porcentaje FROM usuarios WHERE ID_Usuario = ?", [req.params.id]);
      res.json({ success: true, user: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reset / Change Password
  app.put("/api/usuarios/:id/password", async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user: any = await queryGet("SELECT * FROM usuarios WHERE ID_Usuario = ?", [req.params.id]);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado." });
      }

      const currentHash = hashPassword(currentPassword);
      if (user.Password_Hash !== currentHash) {
        return res.status(400).json({ error: "La contraseña actual es incorrecta." });
      }

      const newHash = hashPassword(newPassword);
      await queryRun("UPDATE usuarios SET Password_Hash = ? WHERE ID_Usuario = ?", [newHash, req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === DATA FETCH ENDPOINT ===

  app.get("/api/data", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "userId requerido." });
      }

      // === MANTENIMIENTO DE RECURRENCIAS EN CALIENTE ===
      const maintToday = new Date();
      const maintYyyy = maintToday.getFullYear();
      const maintMm = String(maintToday.getMonth() + 1).padStart(2, '0');
      const maintDd = String(maintToday.getDate()).padStart(2, '0');
      const maintTodayStr = `${maintYyyy}-${maintMm}-${maintDd}`;

      const mmsToMaint = await queryAll<any>(
        "SELECT * FROM micrometas WHERE ID_Usuario = ? AND Recurrencia IS NOT NULL AND Recurrencia != 'none'", 
        [userId]
      );

      for (const mm of mmsToMaint) {
        if (!mm.Fecha_Planificada) continue;

        if (mm.Estado === "Completada" && mm.Fecha_Planificada < maintTodayStr) {
          if (mm.ID_Padre_Recurrente || mm.ID_Micrometa.includes("-rec-")) {
            await queryRun("DELETE FROM micrometas WHERE ID_Micrometa = ?", [mm.ID_Micrometa]);
            await queryRun("DELETE FROM correlaciones_micrometas WHERE ID_Micrometa = ?", [mm.ID_Micrometa]);
            await queryRun("DELETE FROM eventos WHERE ID_Actividad = ?", [`evt-micrometa-${mm.ID_Micrometa}`]);
          } else {
            const nextDate = getFutureDate(mm.Fecha_Planificada, 1, mm.Recurrencia);
            await queryRun(
              "UPDATE micrometas SET Fecha_Planificada = ?, Estado = 'Pendiente' WHERE ID_Micrometa = ?",
              [nextDate.dateStr, mm.ID_Micrometa]
            );
            const updatedOriginal = {
              ...mm,
              Fecha_Planificada: nextDate.dateStr,
              Estado: 'Pendiente'
            };
            const metaObj: any = await queryGet("SELECT Pilar FROM metas WHERE ID_Meta = ?", [mm.ID_Meta]);
            const metaPilar = metaObj ? metaObj.Pilar : "Personal";
            await syncMicrometaToEventsTable(updatedOriginal, metaPilar);
          }
        } 
        else if (mm.Estado === "Pendiente" && mm.Fecha_Planificada < maintTodayStr) {
          const originalId = mm.ID_Padre_Recurrente || mm.ID_Micrometa;
          const existsActive = await queryGet(
            "SELECT 1 FROM micrometas WHERE ID_Usuario = ? AND (ID_Micrometa = ? OR ID_Padre_Recurrente = ?) AND Fecha_Planificada >= ?",
            [userId, originalId, originalId, maintTodayStr]
          );

          if (!existsActive) {
            const recMmId = `${originalId}-rec-${Date.now()}`;
            await queryRun(`
              INSERT INTO micrometas (ID_Micrometa, ID_Usuario, ID_Meta, Titulo, Estado, Genera_Gasto, Monto_Gasto, Gasto_Pendiente, ID_Tarjeta_Gasto, Fecha_Planificada, Sincronizar_Calendario, ID_Evento_Calendario, Recurrencia, ID_Padre_Recurrente)
              VALUES (?, ?, ?, ?, 'Pendiente', ?, ?, ?, ?, ?, ?, NULL, ?, ?)
            `, [
              recMmId, 
              userId, 
              mm.ID_Meta, 
              mm.Titulo, 
              mm.Genera_Gasto === 1 ? 1 : 0, 
              mm.Monto_Gasto || 0, 
              mm.Gasto_Pendiente === 1 ? 1 : 0, 
              mm.ID_Tarjeta_Gasto || null, 
              maintTodayStr, 
              mm.Sincronizar_Calendario === 1 ? 1 : 0, 
              mm.Recurrencia, 
              originalId
            ]);

            const parentCorrs = await queryAll<any>("SELECT ID_Pilar FROM correlaciones_micrometas WHERE ID_Micrometa = ?", [mm.ID_Micrometa]);
            for (const c of parentCorrs) {
              const corrId = "corr-mm-" + Math.random().toString(36).substring(2, 9) + "-rec-maint-" + Date.now();
              await queryRun(`
                INSERT INTO correlaciones_micrometas (ID_Correlacion, ID_Usuario, ID_Micrometa, ID_Pilar)
                VALUES (?, ?, ?, ?)
              `, [corrId, userId, recMmId, c.ID_Pilar]);
            }

            const clonedMmObj = {
              ID_Micrometa: recMmId,
              ID_Usuario: userId,
              Titulo: mm.Titulo,
              Estado: 'Pendiente',
              Genera_Gasto: mm.Genera_Gasto === 1 ? 1 : 0,
              Monto_Gasto: mm.Monto_Gasto || 0,
              Fecha_Planificada: maintTodayStr,
              Sincronizar_Calendario: mm.Sincronizar_Calendario === 1 ? 1 : 0
            };
            const metaObj: any = await queryGet("SELECT Pilar FROM metas WHERE ID_Meta = ?", [mm.ID_Meta]);
            const metaPilar = metaObj ? metaObj.Pilar : "Personal";
            await syncMicrometaToEventsTable(clonedMmObj, metaPilar);
          }
        }
      }

      const ingresos = await queryAll("SELECT * FROM ingresos WHERE ID_Usuario = ?", [userId]);
      const egresos = await queryAll("SELECT * FROM egresos WHERE ID_Usuario = ?", [userId]);
      const deudas = await queryAll("SELECT * FROM deudas WHERE ID_Usuario = ?", [userId]);
      const eventosRaw = await queryAll("SELECT * FROM eventos WHERE ID_Usuario = ?", [userId]);

      const pilares = await queryAll("SELECT * FROM pilares WHERE ID_Usuario = ?", [userId]);
      const correlacionesPilares = await queryAll("SELECT * FROM correlaciones_pilares WHERE ID_Usuario = ?", [userId]);
      const micrometasRaw = await queryAll("SELECT * FROM micrometas WHERE ID_Usuario = ?", [userId]);
      const corrMicrometas = await queryAll("SELECT * FROM correlaciones_micrometas WHERE ID_Usuario = ?", [userId]);

      const micrometas = micrometasRaw.map((mm: any) => {
        const matchingCorr = corrMicrometas.filter((c: any) => c.ID_Micrometa === mm.ID_Micrometa);
        return {
          ...mm,
          Genera_Gasto: mm.Genera_Gasto === 1 ? 1 : 0,
          Gasto_Pendiente: mm.Gasto_Pendiente === 1 ? 1 : 0,
          Sincronizar_Calendario: mm.Sincronizar_Calendario === 1 ? 1 : 0,
          Correlaciones: matchingCorr.map((c: any) => c.ID_Pilar)
        };
      });

      const metas = (await queryAll("SELECT * FROM metas WHERE ID_Usuario = ?", [userId])).map((m: any) => ({
        ...m,
        Sincronizar_Calendario: m.Sincronizar_Calendario === 1 ? 1 : 0
      }));

      const eventos = eventosRaw.map((ev: any) => ({
        ...ev,
        Requiere_Pago: ev.Requiere_Pago === 1,
        Alerta_Descalce: ev.Alerta_Descalce === 1,
        Gasto_Pendiente: ev.Gasto_Pendiente === 1
      }));

      res.json({ ingresos, egresos, deudas, metas, eventos, pilares, correlacionesPilares, micrometas });
    } catch (error: any) {
      console.error("Error fetching data:", error);
      res.status(500).json({ error: error.message || "Ocurrió un error al obtener los datos." });
    }
  });

  // === CRUD ENDPOINTS ===

  // Ingresos
  app.post("/api/ingresos", async (req, res) => {
    try {
      const { ID_Ingreso, ID_Usuario, Fecha, Concepto, Categoria, Monto_Neto, Monto_Bruto, Cuenta_Destino } = req.body;
      await queryRun(`
        INSERT INTO ingresos (ID_Ingreso, ID_Usuario, Fecha, Concepto, Categoria, Monto_Neto, Monto_Bruto, Cuenta_Destino)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [ID_Ingreso, ID_Usuario, Fecha, Concepto, Categoria, Monto_Neto, Monto_Bruto, Cuenta_Destino]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/ingresos/:id", async (req, res) => {
    try {
      await queryRun("DELETE FROM ingresos WHERE ID_Ingreso = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Egresos
  app.post("/api/egresos", async (req, res) => {
    try {
      const { ID_Egreso, ID_Usuario, ID_Actividad_Origen, ID_Tarjeta_Utilizada, Fecha, Concepto, Categoria_Pilar, Subcategoria, Monto, Metodo_Pago, Tipo_Gasto } = req.body;
      await queryRun(`
        INSERT INTO egresos (ID_Egreso, ID_Usuario, ID_Actividad_Origen, ID_Tarjeta_Utilizada, Fecha, Concepto, Categoria_Pilar, Subcategoria, Monto, Metodo_Pago, Tipo_Gasto)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [ID_Egreso, ID_Usuario, ID_Actividad_Origen, ID_Tarjeta_Utilizada, Fecha, Concepto, Categoria_Pilar, Subcategoria, Monto, Metodo_Pago, Tipo_Gasto]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/egresos/:id", async (req, res) => {
    try {
      await queryRun("DELETE FROM egresos WHERE ID_Egreso = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Deudas (Tarjetas)
  app.post("/api/deudas", async (req, res) => {
    try {
      const { ID_Instrumento, ID_Usuario, ID_Tarjeta, Nombre_Tarjeta, Nombre_Instrumento, Tipo, Limite_Credito, Saldo_Disponible, Saldo_Al_Corte, Deuda_Actual, Pago_Minimo, Pago_Para_No_Generar_Intereses, Fecha_Corte, Fecha_Limite_Pago, Tasa_Interes_Anual, Balance_Total_Pendiente, Pago_Minimo_Mensual, Pilar } = req.body;
      await queryRun(`
        INSERT INTO deudas (ID_Instrumento, ID_Usuario, ID_Tarjeta, Nombre_Tarjeta, Nombre_Instrumento, Tipo, Limite_Credito, Saldo_Disponible, Saldo_Al_Corte, Deuda_Actual, Pago_Minimo, Pago_Para_No_Generar_Intereses, Fecha_Corte, Fecha_Limite_Pago, Tasa_Interes_Anual, Balance_Total_Pendiente, Pago_Minimo_Mensual, Pilar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [ID_Instrumento, ID_Usuario, ID_Tarjeta, Nombre_Tarjeta, Nombre_Instrumento, Tipo, Limite_Credito, Saldo_Disponible, Saldo_Al_Corte, Deuda_Actual, Pago_Minimo, Pago_Para_No_Generar_Intereses, Fecha_Corte, Fecha_Limite_Pago, Tasa_Interes_Anual, Balance_Total_Pendiente, Pago_Minimo_Mensual, Pilar || 'Económico']);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/deudas/:id", async (req, res) => {
    try {
      const { Limite_Credito, Saldo_Disponible, Saldo_Al_Corte, Deuda_Actual, Pago_Minimo, Pago_Para_No_Generar_Intereses, Balance_Total_Pendiente, Fecha_Corte, Fecha_Limite_Pago, Tasa_Interes_Anual, Pilar } = req.body;
      await queryRun(`
        UPDATE deudas 
        SET Limite_Credito = ?, Saldo_Disponible = ?, Saldo_Al_Corte = ?, Deuda_Actual = ?, Pago_Minimo = ?, Pago_Para_No_Generar_Intereses = ?, Balance_Total_Pendiente = ?, Fecha_Corte = ?, Fecha_Limite_Pago = ?, Tasa_Interes_Anual = ?, Pilar = ?
        WHERE ID_Instrumento = ?
      `, [Limite_Credito, Saldo_Disponible, Saldo_Al_Corte, Deuda_Actual, Pago_Minimo, Pago_Para_No_Generar_Intereses, Balance_Total_Pendiente, Fecha_Corte, Fecha_Limite_Pago, Tasa_Interes_Anual, Pilar || 'Económico', req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/deudas/:id", async (req, res) => {
    try {
      await queryRun("DELETE FROM deudas WHERE ID_Instrumento = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === HELPERS FOR METAS/MICROMETAS CALENDAR SYNC ===
  async function syncMetaToEventsTable(meta: any) {
    const eventId = `evt-meta-${meta.ID_Meta}`;
    if (meta.Sincronizar_Calendario === 1 && meta.Fecha_Meta) {
      let color = "indigo";
      const pilarObj: any = await queryGet("SELECT Color FROM pilares WHERE ID_Pilar = ? OR Nombre = ?", [meta.Pilar, meta.Pilar]);
      if (pilarObj && pilarObj.Color) {
        color = pilarObj.Color;
      }
      
      const exists = await queryGet("SELECT 1 FROM eventos WHERE ID_Actividad = ?", [eventId]);
      if (exists) {
        await queryRun(`
          UPDATE eventos
          SET Titulo_Actividad = ?, Titulo = ?, Descripcion_Detallada = ?, Descripcion = ?, Fecha_Hora_Inicio = ?, Fecha_Hora_Fin = ?, Fecha = ?, Color = ?, Pilar = ?, Pilar_Asociado = ?
          WHERE ID_Actividad = ?
        `, [
          `🎯 Meta: ${meta.Meta_SMART}`,
          `🎯 Meta: ${meta.Meta_SMART}`,
          `Indicador: ${meta.Indicador_Exito} | Presupuesto: ${meta.Presupuesto_Asignado}`,
          `Indicador: ${meta.Indicador_Exito} | Presupuesto: ${meta.Presupuesto_Asignado}`,
          `${meta.Fecha_Meta}T09:00`,
          `${meta.Fecha_Meta}T10:00`,
          meta.Fecha_Meta,
          color,
          meta.Pilar,
          meta.Pilar,
          eventId
        ]);
      } else {
        await queryRun(`
          INSERT INTO eventos (ID_Actividad, ID_Usuario, ID_Evento, Tipo_Agenda, Pilar, Pilar_Asociado, Titulo_Actividad, Titulo, Descripcion_Detallada, Descripcion, Fecha_Hora_Inicio, Fecha_Hora_Fin, Requiere_Pago, ID_Egreso_Asociado, Fecha, Tipo_Evento, Color, Alerta_Descalce)
          VALUES (?, ?, ?, 'Agenda_Personal', ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, 'Hito de Meta', ?, 0)
        `, [
          eventId,
          meta.ID_Usuario,
          meta.ID_Evento_Calendario || eventId,
          meta.Pilar,
          meta.Pilar,
          `🎯 Meta: ${meta.Meta_SMART}`,
          `🎯 Meta: ${meta.Meta_SMART}`,
          `Indicador: ${meta.Indicador_Exito} | Presupuesto: ${meta.Presupuesto_Asignado}`,
          `Indicador: ${meta.Indicador_Exito} | Presupuesto: ${meta.Presupuesto_Asignado}`,
          `${meta.Fecha_Meta}T09:00`,
          `${meta.Fecha_Meta}T10:00`,
          meta.Fecha_Meta,
          color
        ]);
      }
    } else {
      await queryRun("DELETE FROM eventos WHERE ID_Actividad = ?", [eventId]);
    }
  }

  async function syncMicrometaToEventsTable(micrometa: any, metaPilar: string) {
    const eventId = `evt-micrometa-${micrometa.ID_Micrometa}`;
    if (micrometa.Sincronizar_Calendario === 1 && micrometa.Fecha_Planificada) {
      let color = "green";
      const pilarObj: any = await queryGet("SELECT Color FROM pilares WHERE ID_Pilar = ? OR Nombre = ?", [metaPilar, metaPilar]);
      if (pilarObj && pilarObj.Color) {
        color = pilarObj.Color;
      }

      const exists = await queryGet("SELECT 1 FROM eventos WHERE ID_Actividad = ?", [eventId]);
      if (exists) {
        await queryRun(`
          UPDATE eventos
          SET Titulo_Actividad = ?, Titulo = ?, Descripcion_Detallada = ?, Descripcion = ?, Fecha_Hora_Inicio = ?, Fecha_Hora_Fin = ?, Fecha = ?, Color = ?, Pilar = ?, Pilar_Asociado = ?, Requiere_Pago = ?
          WHERE ID_Actividad = ?
        `, [
          `🏁 Micrometa: ${micrometa.Titulo}`,
          `🏁 Micrometa: ${micrometa.Titulo}`,
          `Gasto: ${micrometa.Monto_Gasto} (Estado: ${micrometa.Estado})`,
          `Gasto: ${micrometa.Monto_Gasto} (Estado: ${micrometa.Estado})`,
          `${micrometa.Fecha_Planificada}T08:00`,
          `${micrometa.Fecha_Planificada}T09:00`,
          micrometa.Fecha_Planificada,
          color,
          metaPilar,
          metaPilar,
          micrometa.Genera_Gasto === 1 ? 1 : 0,
          eventId
        ]);
      } else {
        await queryRun(`
          INSERT INTO eventos (ID_Actividad, ID_Usuario, ID_Evento, Tipo_Agenda, Pilar, Pilar_Asociado, Titulo_Actividad, Titulo, Descripcion_Detallada, Descripcion, Fecha_Hora_Inicio, Fecha_Hora_Fin, Requiere_Pago, ID_Egreso_Asociado, Fecha, Tipo_Evento, Color, Alerta_Descalce)
          VALUES (?, ?, ?, 'Agenda_Personal', ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'Hito de Meta', ?, 0)
        `, [
          eventId,
          micrometa.ID_Usuario,
          micrometa.ID_Evento_Calendario || eventId,
          metaPilar,
          metaPilar,
          `🏁 Micrometa: ${micrometa.Titulo}`,
          `🏁 Micrometa: ${micrometa.Titulo}`,
          `Gasto: ${micrometa.Monto_Gasto} (Estado: ${micrometa.Estado})`,
          `Gasto: ${micrometa.Monto_Gasto} (Estado: ${micrometa.Estado})`,
          `${micrometa.Fecha_Planificada}T08:00`,
          `${micrometa.Fecha_Planificada}T09:00`,
          micrometa.Genera_Gasto === 1 ? 1 : 0,
          micrometa.Fecha_Planificada,
          color
        ]);
      }
    } else {
      await queryRun("DELETE FROM eventos WHERE ID_Actividad = ?", [eventId]);
    }
  }

  // === PILARES Y CORRELACIONES ===
  app.post("/api/pilares", async (req, res) => {
    try {
      const { ID_Pilar, ID_Usuario, Nombre, ID_Padre, Color } = req.body;
      await queryRun(`
        INSERT INTO pilares (ID_Pilar, ID_Usuario, Nombre, ID_Padre, Color)
        VALUES (?, ?, ?, ?, ?)
      `, [ID_Pilar, ID_Usuario, Nombre, ID_Padre || null, Color || null]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/pilares/:id", async (req, res) => {
    try {
      const pilarId = req.params.id;

      // Find all subpilar IDs
      const subpilares = await queryAll<{ ID_Pilar: string }>(
        "SELECT ID_Pilar FROM pilares WHERE ID_Padre = ?",
        [pilarId]
      );
      const allPilarIds = [pilarId, ...subpilares.map(p => p.ID_Pilar)];

      // Cascade delete metas, micrometas, and events for all these pilares
      for (const pid of allPilarIds) {
        const metasToDelete = await queryAll<{ ID_Meta: string }>(
          "SELECT ID_Meta FROM metas WHERE Pilar = ?",
          [pid]
        );
        for (const meta of metasToDelete) {
          const metaId = meta.ID_Meta;
          await queryRun("DELETE FROM eventos WHERE ID_Actividad = ?", [`evt-meta-${metaId}`]);
          
          const micrometas = await queryAll<{ ID_Micrometa: string }>(
            "SELECT ID_Micrometa FROM micrometas WHERE ID_Meta = ?",
            [metaId]
          );
          for (const mm of micrometas) {
            await queryRun("DELETE FROM eventos WHERE ID_Actividad = ?", [`evt-micrometa-${mm.ID_Micrometa}`]);
            await queryRun("DELETE FROM correlaciones_micrometas WHERE ID_Micrometa = ?", [mm.ID_Micrometa]);
          }
          await queryRun("DELETE FROM micrometas WHERE ID_Meta = ?", [metaId]);
          await queryRun("DELETE FROM metas WHERE ID_Meta = ?", [metaId]);
        }
      }

      // Delete the pilares and their subpilares
      await queryRun("DELETE FROM pilares WHERE ID_Pilar = ?", [pilarId]);
      await queryRun("DELETE FROM pilares WHERE ID_Padre = ?", [pilarId]);

      // Delete correlaciones for all these pilares
      for (const pid of allPilarIds) {
        await queryRun(
          "DELETE FROM correlaciones_pilares WHERE ID_Origen = ? OR ID_Destino = ?",
          [pid, pid]
        );
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  app.post("/api/pilares/correlaciones", async (req, res) => {
    try {
      const { ID_Correlacion, ID_Usuario, ID_Origen, ID_Destino } = req.body;
      await queryRun(`
        INSERT INTO correlaciones_pilares (ID_Correlacion, ID_Usuario, ID_Origen, ID_Destino)
        VALUES (?, ?, ?, ?)
      `, [ID_Correlacion, ID_Usuario, ID_Origen, ID_Destino]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/pilares/correlaciones/:id", async (req, res) => {
    try {
      await queryRun("DELETE FROM correlaciones_pilares WHERE ID_Correlacion = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === METAS ===
  app.post("/api/metas", async (req, res) => {
    try {
      const { ID_Meta, ID_Usuario, Pilar, Meta_SMART, Indicador_Exito, Estado, Presupuesto_Asignado, Fecha_Meta, Sincronizar_Calendario, ID_Evento_Calendario } = req.body;
      await queryRun(`
        INSERT INTO metas (ID_Meta, ID_Usuario, Pilar, Meta_SMART, Indicador_Exito, Estado, Presupuesto_Asignado, Fecha_Meta, Sincronizar_Calendario, ID_Evento_Calendario)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [ID_Meta, ID_Usuario, Pilar, Meta_SMART, Indicador_Exito, Estado, Presupuesto_Asignado, Fecha_Meta || null, Sincronizar_Calendario ? 1 : 0, ID_Evento_Calendario || null]);
      
      const createdMeta = { ID_Meta, ID_Usuario, Pilar, Meta_SMART, Indicador_Exito, Estado, Presupuesto_Asignado, Fecha_Meta, Sincronizar_Calendario: Sincronizar_Calendario ? 1 : 0, ID_Evento_Calendario };
      await syncMetaToEventsTable(createdMeta);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/metas/:id", async (req, res) => {
    try {
      const { Meta_SMART, Pilar, Indicador_Exito, Estado, Presupuesto_Asignado, Fecha_Meta, Sincronizar_Calendario, ID_Evento_Calendario } = req.body;
      const metaId = req.params.id;
      const mm: any = await queryGet("SELECT * FROM metas WHERE ID_Meta = ?", [metaId]);
      if (!mm) {
        return res.status(404).json({ error: "Meta no encontrada." });
      }

      const finalPilar = Pilar !== undefined ? Pilar : mm.Pilar;

      await queryRun(`
        UPDATE metas
        SET Meta_SMART = ?, Pilar = ?, Indicador_Exito = ?, Estado = ?, Presupuesto_Asignado = ?, Fecha_Meta = ?, Sincronizar_Calendario = ?, ID_Evento_Calendario = ?
        WHERE ID_Meta = ?
      `, [Meta_SMART, finalPilar, Indicador_Exito, Estado, parseFloat(Presupuesto_Asignado) || 0, Fecha_Meta || null, Sincronizar_Calendario ? 1 : 0, ID_Evento_Calendario || null, metaId]);
      
      const updatedMeta = { ID_Meta: metaId, ID_Usuario: mm.ID_Usuario, Pilar: finalPilar, Meta_SMART, Indicador_Exito, Estado, Presupuesto_Asignado, Fecha_Meta, Sincronizar_Calendario: Sincronizar_Calendario ? 1 : 0, ID_Evento_Calendario };
      await syncMetaToEventsTable(updatedMeta);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/metas/:id", async (req, res) => {
    try {
      const metaId = req.params.id;
      await queryRun("DELETE FROM eventos WHERE ID_Actividad = ?", [`evt-meta-${metaId}`]);
      
      const micrometas = await queryAll<any>("SELECT ID_Micrometa FROM micrometas WHERE ID_Meta = ?", [metaId]);
      for (const mm of micrometas) {
        await queryRun("DELETE FROM eventos WHERE ID_Actividad = ?", [`evt-micrometa-${mm.ID_Micrometa}`]);
        await queryRun("DELETE FROM correlaciones_micrometas WHERE ID_Micrometa = ?", [mm.ID_Micrometa]);
      }
      await queryRun("DELETE FROM micrometas WHERE ID_Meta = ?", [metaId]);
      await queryRun("DELETE FROM metas WHERE ID_Meta = ?", [metaId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === MICROMETAS ===
  app.post("/api/micrometas", async (req, res) => {
    try {
      const { ID_Micrometa, ID_Usuario, ID_Meta, Titulo, Estado, Genera_Gasto, Monto_Gasto, Gasto_Pendiente, ID_Tarjeta_Gasto, Fecha_Planificada, Sincronizar_Calendario, Correlaciones, Recurrencia, Repeticiones, ID_Evento_Calendario } = req.body;
      await queryRun(`
        INSERT INTO micrometas (ID_Micrometa, ID_Usuario, ID_Meta, Titulo, Estado, Genera_Gasto, Monto_Gasto, Gasto_Pendiente, ID_Tarjeta_Gasto, Fecha_Planificada, Sincronizar_Calendario, ID_Evento_Calendario, Recurrencia, ID_Padre_Recurrente)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [ID_Micrometa, ID_Usuario, ID_Meta, Titulo, Estado || 'Pendiente', Genera_Gasto ? 1 : 0, parseFloat(Monto_Gasto) || 0, Gasto_Pendiente ? 1 : 0, ID_Tarjeta_Gasto || null, Fecha_Planificada || null, Sincronizar_Calendario ? 1 : 0, ID_Evento_Calendario || null, Recurrencia || null, null]);

      if (Array.isArray(Correlaciones)) {
        for (const pilId of Correlaciones) {
          const corrId = "corr-mm-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
          await queryRun(`
            INSERT INTO correlaciones_micrometas (ID_Correlacion, ID_Usuario, ID_Micrometa, ID_Pilar)
            VALUES (?, ?, ?, ?)
          `, [corrId, ID_Usuario, ID_Micrometa, pilId]);
        }
      }

      const meta: any = await queryGet("SELECT * FROM metas WHERE ID_Meta = ?", [ID_Meta]);
      const metaPilar = meta ? meta.Pilar : "Personal";

      const createdMm = {
        ID_Micrometa,
        ID_Usuario,
        Titulo,
        Estado: Estado || 'Pendiente',
        Genera_Gasto: Genera_Gasto ? 1 : 0,
        Monto_Gasto: parseFloat(Monto_Gasto) || 0,
        Fecha_Planificada,
        Sincronizar_Calendario: Sincronizar_Calendario ? 1 : 0
      };
      await syncMicrometaToEventsTable(createdMm, metaPilar);

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/micrometas/:id", async (req, res) => {
    try {
      const micrometaId = req.params.id;
      const { Titulo, Estado, Genera_Gasto, Monto_Gasto, Gasto_Pendiente, ID_Tarjeta_Gasto, Fecha_Planificada, Sincronizar_Calendario, Correlaciones, ID_Evento_Calendario } = req.body;
      
      const mm: any = await queryGet("SELECT * FROM micrometas WHERE ID_Micrometa = ?", [micrometaId]);
      if (!mm) {
        return res.status(404).json({ error: "Micrometa no encontrada." });
      }

      const meta: any = await queryGet("SELECT * FROM metas WHERE ID_Meta = ?", [mm.ID_Meta]);
      const metaPilar = meta ? meta.Pilar : "Personal";

      let nextGastoPendiente = Gasto_Pendiente ? 1 : 0;

      // Expense deduction check: state transitioned to "Completada" and has pending expense
      if (Estado === "Completada" && Genera_Gasto === 1 && mm.Gasto_Pendiente === 1 && nextGastoPendiente === 1 && ID_Tarjeta_Gasto) {
        const card: any = await queryGet("SELECT * FROM deudas WHERE ID_Instrumento = ?", [ID_Tarjeta_Gasto]);
        if (card) {
          const parseMonto = parseFloat(Monto_Gasto) || 0;
          if (parseMonto > 0) {
            const egresoId = "egr-mm-" + Math.random().toString(36).substring(2, 9);
            // 1. Insert Egreso
            await queryRun(`
              INSERT INTO egresos (ID_Egreso, ID_Usuario, ID_Actividad_Origen, ID_Tarjeta_Utilizada, Fecha, Concepto, Categoria_Pilar, Subcategoria, Monto, Metodo_Pago, Tipo_Gasto)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              egresoId,
              mm.ID_Usuario,
              null,
              ID_Tarjeta_Gasto,
              new Date().toISOString().split("T")[0],
              `Micrometa: ${Titulo}`,
              metaPilar,
              "Metas",
              parseMonto,
              card.Nombre_Tarjeta,
              "Variable"
            ]);

            // 2. Deduct from Card
            if (card.Tipo === "Crédito") {
              const nextDeuda = card.Deuda_Actual + parseMonto;
              await queryRun(`
                UPDATE deudas
                SET Deuda_Actual = ?, Saldo_Disponible = ?, Balance_Total_Pendiente = ?
                WHERE ID_Instrumento = ?
              `, [nextDeuda, card.Limite_Credito - nextDeuda, nextDeuda, ID_Tarjeta_Gasto]);
            } else {
              const nextDisponible = card.Saldo_Disponible - parseMonto;
              await queryRun(`
                UPDATE deudas
                SET Saldo_Disponible = ?
                WHERE ID_Instrumento = ?
              `, [nextDisponible, ID_Tarjeta_Gasto]);
            }

            // Mark as no longer pending
            nextGastoPendiente = 0;
          }
        }
      }

      // Update Micrometa
      await queryRun(`
        UPDATE micrometas
        SET Titulo = ?, Estado = ?, Genera_Gasto = ?, Monto_Gasto = ?, Gasto_Pendiente = ?, ID_Tarjeta_Gasto = ?, Fecha_Planificada = ?, Sincronizar_Calendario = ?, ID_Evento_Calendario = ?
        WHERE ID_Micrometa = ?
      `, [
        Titulo,
        Estado,
        Genera_Gasto ? 1 : 0,
        parseFloat(Monto_Gasto) || 0,
        nextGastoPendiente,
        ID_Tarjeta_Gasto || null,
        Fecha_Planificada || null,
        Sincronizar_Calendario ? 1 : 0,
        ID_Evento_Calendario !== undefined ? ID_Evento_Calendario : (mm.ID_Evento_Calendario || null),
        micrometaId
      ]);

      // Update Micrometa Correlations
      await queryRun("DELETE FROM correlaciones_micrometas WHERE ID_Micrometa = ?", [micrometaId]);
      if (Array.isArray(Correlaciones)) {
        for (const pilId of Correlaciones) {
          const corrId = "corr-mm-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
          await queryRun(`
            INSERT INTO correlaciones_micrometas (ID_Correlacion, ID_Usuario, ID_Micrometa, ID_Pilar)
            VALUES (?, ?, ?, ?)
          `, [corrId, mm.ID_Usuario, micrometaId, pilId]);
        }
      }

      // Sync to Calendar
      const updatedMm = {
        ID_Micrometa: micrometaId,
        ID_Usuario: mm.ID_Usuario,
        Titulo,
        Estado,
        Genera_Gasto: Genera_Gasto ? 1 : 0,
        Monto_Gasto: parseFloat(Monto_Gasto) || 0,
        Fecha_Planificada,
        Sincronizar_Calendario: Sincronizar_Calendario ? 1 : 0,
        ID_Evento_Calendario: ID_Evento_Calendario !== undefined ? ID_Evento_Calendario : mm.ID_Evento_Calendario
      };
      await syncMicrometaToEventsTable(updatedMm, metaPilar);

      res.json({ success: true, gastoDeducido: (nextGastoPendiente === 0 && Gasto_Pendiente === 1) });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/micrometas/:id", async (req, res) => {
    try {
      const mmId = req.params.id;
      await queryRun("DELETE FROM eventos WHERE ID_Actividad = ?", [`evt-micrometa-${mmId}`]);
      await queryRun("DELETE FROM correlaciones_micrometas WHERE ID_Micrometa = ?", [mmId]);
      await queryRun("DELETE FROM micrometas WHERE ID_Micrometa = ?", [mmId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Eventos / Actividades
  app.post("/api/eventos", async (req, res) => {
    try {
      const { 
        ID_Actividad, ID_Usuario, ID_Evento, Tipo_Agenda, Pilar, Pilar_Asociado, 
        Titulo_Actividad, Titulo, Descripcion_Detallada, Descripcion, 
        Fecha_Hora_Inicio, Fecha_Hora_Fin, Requiere_Pago, ID_Egreso_Asociado, 
        Fecha, Tipo_Evento, Color, Alerta_Descalce,
        Gasto_Pendiente, Monto_Gasto, ID_Tarjeta_Gasto, Tipo_Gasto,
        Recurrencia, Repeticiones
      } = req.body;

      // 1. Insert parent event
      await queryRun(`
        INSERT INTO eventos (
          ID_Actividad, ID_Usuario, ID_Evento, Tipo_Agenda, Pilar, Pilar_Asociado, 
          Titulo_Actividad, Titulo, Descripcion_Detallada, Descripcion, 
          Fecha_Hora_Inicio, Fecha_Hora_Fin, Requiere_Pago, ID_Egreso_Asociado, 
          Fecha, Tipo_Evento, Color, Alerta_Descalce,
          Gasto_Pendiente, Monto_Gasto, ID_Tarjeta_Gasto, Tipo_Gasto, Recurrencia, ID_Padre_Recurrente
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        ID_Actividad, ID_Usuario, ID_Evento, Tipo_Agenda, Pilar, Pilar_Asociado, 
        Titulo_Actividad, Titulo, Descripcion_Detallada, Descripcion, 
        Fecha_Hora_Inicio, Fecha_Hora_Fin, Requiere_Pago ? 1 : 0, ID_Egreso_Asociado, 
        Fecha, Tipo_Evento, Color, Alerta_Descalce ? 1 : 0,
        Gasto_Pendiente ? 1 : 0, parseFloat(Monto_Gasto) || 0, ID_Tarjeta_Gasto || null, Tipo_Gasto || null,
        Recurrencia || null, null
      ]);

      // 2. Generate recurrence events if applicable
      const reps = parseInt(Repeticiones) || 1;
      if (Recurrencia && Recurrencia !== "none" && reps > 1) {
        for (let i = 1; i < reps; i++) {
          const nextStart = getFutureDate(Fecha_Hora_Inicio, i, Recurrencia);
          let nextEndStr = "";
          if (Fecha_Hora_Fin) {
            const nextEnd = getFutureDate(Fecha_Hora_Fin, i, Recurrencia);
            nextEndStr = nextEnd.dateTimeStr;
          }
          const recActId = `${ID_Actividad}-rec-${i}`;
          const recGastoPendiente = Requiere_Pago ? 1 : 0;
          
          await queryRun(`
            INSERT INTO eventos (
              ID_Actividad, ID_Usuario, ID_Evento, Tipo_Agenda, Pilar, Pilar_Asociado, 
              Titulo_Actividad, Titulo, Descripcion_Detallada, Descripcion, 
              Fecha_Hora_Inicio, Fecha_Hora_Fin, Requiere_Pago, ID_Egreso_Asociado, 
              Fecha, Tipo_Evento, Color, Alerta_Descalce,
              Gasto_Pendiente, Monto_Gasto, ID_Tarjeta_Gasto, Tipo_Gasto, Recurrencia, ID_Padre_Recurrente
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            recActId, ID_Usuario, recActId, Tipo_Agenda, Pilar, Pilar_Asociado, 
            Titulo_Actividad, Titulo, Descripcion_Detallada, Descripcion, 
            nextStart.dateTimeStr, nextEndStr, Requiere_Pago ? 1 : 0, null, 
            nextStart.dateStr, Tipo_Evento, Color, 0,
            recGastoPendiente, parseFloat(Monto_Gasto) || 0, ID_Tarjeta_Gasto || null, Tipo_Gasto || null,
            null, ID_Actividad
          ]);
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error creating event:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/eventos/:id/pagar", async (req, res) => {
    try {
      const eventId = req.params.id;
      const ev: any = await queryGet("SELECT * FROM eventos WHERE ID_Actividad = ?", [eventId]);
      if (!ev) {
        return res.status(404).json({ error: "Actividad no encontrada." });
      }

      if (ev.ID_Egreso_Asociado) {
        return res.json({ success: true, alreadyPaid: true });
      }

      const parseMonto = parseFloat(ev.Monto_Gasto) || 0;
      const cardId = ev.ID_Tarjeta_Gasto;

      if (!cardId) {
        return res.status(400).json({ error: "Esta actividad no tiene tarjeta asociada." });
      }

      const card: any = await queryGet("SELECT * FROM deudas WHERE ID_Instrumento = ?", [cardId]);
      if (!card) {
        return res.status(404).json({ error: "La tarjeta de pago no existe." });
      }

      // 1. Deduct amount from card
      if (card.Tipo === "Crédito") {
        const nextDeuda = card.Deuda_Actual + parseMonto;
        await queryRun(`
          UPDATE deudas
          SET Deuda_Actual = ?, Saldo_Disponible = ?, Balance_Total_Pendiente = ?
          WHERE ID_Instrumento = ?
        `, [nextDeuda, card.Limite_Credito - nextDeuda, nextDeuda, cardId]);
      } else {
        const nextDisponible = card.Saldo_Disponible - parseMonto;
        await queryRun(`
          UPDATE deudas
          SET Saldo_Disponible = ?
          WHERE ID_Instrumento = ?
        `, [nextDisponible, cardId]);
      }

      // 2. Insert Egreso
      const egresoId = "egr-evt-" + Math.random().toString(36).substring(2, 9);
      await queryRun(`
        INSERT INTO egresos (ID_Egreso, ID_Usuario, ID_Actividad_Origen, ID_Tarjeta_Utilizada, Fecha, Concepto, Categoria_Pilar, Subcategoria, Monto, Metodo_Pago, Tipo_Gasto)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        egresoId,
        ev.ID_Usuario,
        eventId,
        cardId,
        new Date().toISOString().split("T")[0],
        ev.Titulo_Actividad || ev.Titulo || "Gasto de Actividad",
        ev.Pilar || "Personal",
        "Agenda / Calendario",
        parseMonto,
        card.Nombre_Tarjeta,
        ev.Tipo_Gasto || "Variable"
      ]);

      // 3. Update Event: set Gasto_Pendiente = 0, ID_Egreso_Asociado = egresoId
      await queryRun(`
        UPDATE eventos
        SET Gasto_Pendiente = 0, ID_Egreso_Asociado = ?
        WHERE ID_Actividad = ?
      `, [egresoId, eventId]);

      res.json({ success: true, gastoDeducido: true });
    } catch (err: any) {
      console.error("Error paying event:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/eventos/:id", async (req, res) => {
    try {
      const { 
        Titulo_Actividad, Titulo, Pilar, Pilar_Asociado, Descripcion_Detallada, 
        Descripcion, Fecha_Hora_Inicio, Fecha_Hora_Fin, Color, Fecha,
        Gasto_Pendiente, Monto_Gasto, ID_Tarjeta_Gasto, Tipo_Gasto, ID_Evento
      } = req.body;
      const finalFecha = Fecha || (Fecha_Hora_Inicio ? Fecha_Hora_Inicio.slice(0, 10) : null);
      
      const existing: any = await queryGet("SELECT ID_Evento FROM eventos WHERE ID_Actividad = ?", [req.params.id]);
      const finalEventId = ID_Evento !== undefined ? ID_Evento : (existing ? existing.ID_Evento : null);

      await queryRun(`
        UPDATE eventos 
        SET Titulo_Actividad = ?, Titulo = ?, Pilar = ?, Pilar_Asociado = ?, 
            Descripcion_Detallada = ?, Descripcion = ?, Fecha_Hora_Inicio = ?, Fecha_Hora_Fin = ?, 
            Color = ?, Fecha = ?, Gasto_Pendiente = ?, Monto_Gasto = ?, 
            ID_Tarjeta_Gasto = ?, Tipo_Gasto = ?, ID_Evento = ?
        WHERE ID_Actividad = ?
      `, [
        Titulo_Actividad || null, Titulo || null, Pilar || null, Pilar_Asociado || null, 
        Descripcion_Detallada || null, Descripcion || null, Fecha_Hora_Inicio || null, Fecha_Hora_Fin || null, 
        Color || null, finalFecha, 
        Gasto_Pendiente !== undefined ? (Gasto_Pendiente ? 1 : 0) : 0, 
        parseFloat(Monto_Gasto) || 0, ID_Tarjeta_Gasto || null, Tipo_Gasto || null,
        finalEventId,
        req.params.id
      ]);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error in PUT /api/eventos/:id:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/eventos/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "IDs no válidos o vacíos." });
      }
      const placeholders = ids.map(() => "?").join(",");
      await queryRun(`DELETE FROM eventos WHERE ID_Actividad IN (${placeholders})`, ids);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error in bulk delete:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/eventos/:id", async (req, res) => {
    try {
      await queryRun("DELETE FROM eventos WHERE ID_Actividad = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // === AUDIT ENDPOINTS (PRESERVED GEMINI AI) ===

  // API Route: Auditoría Semanal de 5 Pilares con Gemini (Consolidación Multi-Temporal Inteligente)
  app.post("/api/audit", async (req, res) => {
    try {
      const { 
        idUsuario,
        nombreUsuario,
        configuracionUsuario, // TABLA A (Tope_Amoroso, Salud_Personal)
        ingresos,             // TABLA B (Monto_Neto)
        tarjetas,             // TABLA C (Monedero, Líneas, Saldos, Cortes, Límites)
        egresos,              // TABLA D (Conexiones y montos)
        actividades,          // TABLA E (Agenda con Requiere_Pago)
        visualPayload,        // Contains week, month, historical summary stats computed client-side
        currency
      } = req.body;

      const generateFallbackAudit = () => {
        const totalIncomes = ingresos ? ingresos.reduce((s: number, i: any) => s + i.Monto_Neto, 0) : 0;
        const totalExpenses = egresos ? egresos.reduce((s: number, e: any) => s + e.Monto, 0) : 0;
        const netBalance = totalIncomes - totalExpenses;
        
        const getCurrencySymbol = (code: string) => {
          if (code === "EUR") return "€";
          if (code === "GBP") return "£";
          return "$";
        };
        const symbol = getCurrencySymbol(currency || "");
        const fmt = (val: number) => `${symbol}${val.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

        const activeTDCs = (tarjetas || []).filter((t: any) => t.Tipo === "Crédito" || t.Tipo === "credito");
        const totalTDCDeudas = activeTDCs.reduce((s: number, t: any) => s + (t.Deuda_Actual || t.Balance_Total_Pendiente || 0), 0);
        const totalDebts = (tarjetas || []).reduce((s: number, t: any) => s + (t.Deuda_Actual || t.Balance_Total_Pendiente || 0), 0);
        const totalDebitBalance = (tarjetas || []).filter((t: any) => t.Tipo === "Débito" || t.Tipo === "debito").reduce((s: number, t: any) => s + (t.Saldo_Disponible || 0), 0);
        
        const savingsRate = totalIncomes > 0 ? ((netBalance / totalIncomes) * 100) : 0;

        // --- SECTION 1: COMPORTAMIENTO TEMPORAL CRUZADO ---
        let cashFlowText = "";
        if (totalIncomes === 0 && totalExpenses === 0) {
          cashFlowText = `⚠️ **Sin Registro de Flujo:** No se han detectado transacciones en el periodo evaluado. Tu balance neto es de **${fmt(0)}**. Sin datos de ingresos o gastos, el ecosistema financiero no puede calcular tu tasa de ahorro real ni programar amortizaciones efectivas.`;
        } else if (totalIncomes > 0 && totalExpenses === 0) {
          cashFlowText = `📈 **Tasa de Ahorro Teórica del 100%:** Has percibido **${fmt(totalIncomes)}** con **${fmt(0)}** egresos registrados. Esto genera un balance neto de **${fmt(netBalance)}**. *Advertencia de Subregistro:* Un gasto nulo es estadísticamente improbable en un entorno activo; asegúrate de registrar tus egresos fijos (vivienda, servicios) y variables para evitar un sesgo positivo en tu diagnóstico.`;
        } else if (totalIncomes === 0 && totalExpenses > 0) {
          cashFlowText = `🚨 **Déficit Absoluto de Flujo:** Registras un gasto acumulado de **${fmt(totalExpenses)}** sin ingresos declarados. Tu balance neto es negativo: **${fmt(netBalance)}**. Esto representa una descapitalización activa que requiere financiamiento mediante pasivos o el uso urgente de fondos de reserva.`;
        } else {
          const statusIcon = netBalance >= 0 ? "✓" : "🚨";
          const statusLabel = netBalance >= 0 ? "Superávit Financiero" : "Déficit Neto";
          cashFlowText = `${statusIcon} **${statusLabel}:** Percibiste **${fmt(totalIncomes)}** y gastaste **${fmt(totalExpenses)}**, dejando un balance neto de **${fmt(netBalance)}**. Tu **Tasa de Ahorro es del ${savingsRate.toFixed(1)}%**. ${
            savingsRate >= 20 
              ? "Cumples con el umbral óptimo recomendado de ahorro (>20%)." 
              : savingsRate >= 10 
                ? "Tu ahorro es moderado (10-20%), se sugiere optimizar gastos hormiga para elevar la resiliencia." 
                : "Tu tasa de ahorro es crítica (<10%). Tu capacidad para amortizar deuda o invertir en metas de largo plazo está comprometida."
          }`;
        }

        // 1.2 Ritmo de Actividades y Agenda
        let activitiesText = "";
        const paidActivities = (actividades || []).filter((a: any) => a.Requiere_Pago);
        const activityCount = (actividades || []).length;
        if (activityCount === 0) {
          activitiesText = `⚠️ **Sin Bloques de Crecimiento en Agenda:** No tienes actividades agendadas en tu calendario. Un ecosistema balanceado requiere vincular tu tiempo con acciones específicas en tus pilares (Salud, Crecimiento, Entorno, Económico) para evitar desvíos temporales.`;
        } else {
          activitiesText = `✓ **Agenda Activa (${activityCount} Actividades):** Tienes **${activityCount} bloques de tiempo** planificados. De estos, **${paidActivities.length} actividades** implican desembolso financiero directo, acumulando un gasto proyectado de **${fmt(paidActivities.reduce((s: number, a: any) => s + (a.Monto_Gasto || a.Monto || 0), 0))}**.`;
        }

        // 1.3 Distribución de Pilares
        let pilaresText = "";
        const expenseByPilar: Record<string, number> = {};
        (egresos || []).forEach((e: any) => {
          const pil = e.Categoria_Pilar || "Sin Asignar";
          expenseByPilar[pil] = (expenseByPilar[pil] || 0) + e.Monto;
        });
        const sortedPilars = Object.entries(expenseByPilar).sort((a,b) => b[1] - a[1]);
        if (sortedPilars.length > 0) {
          pilaresText = `📊 **Distribución de Consumo:** Tu pilar con mayor concentración de egresos es **${sortedPilars[0][0]}** con un gasto de **${fmt(sortedPilars[0][1])}** (${((sortedPilars[0][1] / totalExpenses) * 100).toFixed(1)}% del total).`;
          if (sortedPilars.length > 1) {
            pilaresText += ` Seguido por **${sortedPilars[1][0]}** con **${fmt(sortedPilars[1][1])}**.`;
          }
        } else {
          pilaresText = `📊 **Distribución de Consumo:** No se registran gastos asignados a Pilares. Se recomienda categorizar tus egresos para entender el balance real de tus pilares de crecimiento.`;
        }

        // --- SECTION 2: DETECCIÓN DE DESCALCES Y PUNTOS CRÍTICOS ---
        // 2.1 Descalce Temporal (Liquidez vs Agenda)
        let liquidityMatchText = "";
        const totalProjectedPaid = paidActivities.reduce((s: number, a: any) => s + (a.Monto_Gasto || a.Monto || 0), 0);
        if (totalProjectedPaid > 0) {
          if (totalDebitBalance >= totalProjectedPaid) {
            liquidityMatchText = `✓ **Suficiencia de Liquidez:** Tus cuentas de débito tienen un saldo disponible de **${fmt(totalDebitBalance)}**, suficiente para cubrir el gasto proyectado de tu agenda de **${fmt(totalProjectedPaid)}**.`;
          } else {
            const def = totalProjectedPaid - totalDebitBalance;
            liquidityMatchText = `🚨 **Descalce de Liquidez Inmediata:** Tu saldo en cuentas de débito (**${fmt(totalDebitBalance)}**) es insuficiente para cubrir los desembolsos de las actividades agendadas (**${fmt(totalProjectedPaid)}**). Presentas un déficit de **${fmt(def)}** que ocurrirá en las fechas programadas si no inyectas capital o reajustas la agenda.`;
          }
        } else {
          liquidityMatchText = `✓ **Sin Desembolsos Agendados:** No hay actividades en el calendario que requieran pago inmediato en este periodo.`;
        }

        // 2.2 Riesgo de Deudas y Plásticos
        let debtsRiskText = "";
        const tdcDebtRatio = totalIncomes > 0 ? (totalTDCDeudas / totalIncomes) : 0;
        if (activeTDCs.length === 0) {
          debtsRiskText = `✓ **Cartera Libre de Pasivos Financieros:** No se registran tarjetas de crédito con deuda activa. Tu nivel de riesgo por financiamiento bancario directo es **bajo (0%)**.`;
        } else {
          const alertBadge = tdcDebtRatio > 0.40 ? "⚠️ **Riesgo Crítico:**" : "✓ **Riesgo Controlado:**";
          debtsRiskText = `${alertBadge} Tu ratio de deuda en tarjetas de crédito respecto a tus ingresos mensuales es del **${(tdcDebtRatio * 100).toFixed(1)}%**. Deuda consolidada de tarjetas: **${fmt(totalTDCDeudas)}**. ${
            tdcDebtRatio > 0.40 
              ? "Excedes el límite de apalancamiento saludable (40%). Tus ingresos están fuertemente comprometidos con el pago de pasivos financieros." 
              : "Tu endeudamiento se encuentra dentro de un margen manejable respecto a tus ingresos mensuales."
          }`;
        }

        // --- SECTION 3: CONSEJOS Y PLAN DE ACCIÓN RECOMENDADO ---
        const steps = [];
        if (totalIncomes === 0) {
          steps.push("**Registrar Base de Ingresos:** Ingresa tus percepciones netas en la pestaña 'Mis Datos' para habilitar las matrices de asignación porcentual.");
        }
        if (totalExpenses === 0) {
          steps.push("**Mapear Egresos Reales:** Agrega tus egresos fijos y variables. Sin esto, es imposible medir tu tasa de ahorro y detectar fugas de capital.");
        }
        if (activeTDCs.length > 0) {
          const highestTDC = [...activeTDCs].sort((a,b) => (b.Tasa_Interes_Anual || 0) - (a.Tasa_Interes_Anual || 0))[0];
          steps.push(`**Ejecutar Plan Avalancha en Tarjeta '${highestTDC.Nombre_Tarjeta}':** Enfoca tu remanente neto de **${fmt(Math.max(0, netBalance))}** para abonar a esta tarjeta (tasa del **${highestTDC.Tasa_Interes_Anual}%**), mientras mantienes los pagos mínimos de las demás.`);
        } else if (netBalance > 0) {
          steps.push(`**Construcción del Fondo de Ahorro:** Destina tu balance mensual libre de **${fmt(netBalance)}** a un fondo de liquidez equivalente a 3 meses de tus gastos proyectados.`);
        }
        if (totalProjectedPaid > totalDebitBalance) {
          steps.push(`**Reprogramación de Eventos por Descalce:** Cancela o pospone las actividades pagadas de tu agenda que causan el déficit de **${fmt(totalProjectedPaid - totalDebitBalance)}** hasta tener liquidez en débito.`);
        }
        if (activityCount === 0) {
          steps.push("**Planificar Crecimiento en Agenda:** Agrega al menos 2 actividades en tu calendario para esta semana (ej. tiempo de estudio o chequeo de salud) para estructurar tu agenda del ecosistema.");
        }
        if (steps.length < 3) {
          steps.push("**Vincular Metas a Micrometas:** Asegúrate de que cada meta SMART de tus pilares principales esté dividida en micrometas accionables de corto plazo con fechas límite claras.");
        }

        return `# Diagnóstico Inteligente de 5 Pilares: ${nombreUsuario || "Usuario Premium"} (Simulación Activa)

## 1. COMPORTAMIENTO TEMPORAL CRUZADO
* **Balance de Flujo de Caja:** ${cashFlowText}
* **Análisis de Agenda y Hábitos:** ${activitiesText}
* **Distribución de Pilares:** ${pilaresText}

## 2. DETECCIÓN DE DESCALCES Y PUNTOS CRÍTICOS
* **Descalce de Agenda vs Liquidez:** ${liquidityMatchText}
* **Riesgo Consolidado de Deudas:** ${debtsRiskText}

## 3. CONSEJOS Y PLAN DE ACCIÓN RECOMENDADO
A continuación se detalla tu plan de optimización de acuerdo a tu perfil de datos actual:
${steps.slice(0, 3).map((s, idx) => `${idx + 1}. **Paso ${idx + 1}:** ${s}`).join("\n")}
`;
      };
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
        return res.json({ text: generateFallbackAudit() });
      }

      try {
        // Inicialización perezosa de GoogleGenAI con User-Agent de AI Studio
        const ai = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const prompt = `
Eres el Consultor Estratégico y Auditor de Vida del usuario activo (${nombreUsuario || "Usuario Premium"}). Tu tarea es analizar el bloque de datos relacional y multi-temporal que se te proporciona (Última semana vs Mes vs Histórico) y realizar un desglose hiper-personalizado sin inventar datos en absoluto.

=== TABLA A: CONFIGURACIÓN DE USUARIO (AISLAMIENTO LOGICO) ===
- ID_Usuario: ${idUsuario}
- Configuración de topes y presupuestos base: ${JSON.stringify(configuracionUsuario || {}, null, 2)}

=== TABLA B: INGRESOS NETOS (PERCEPCIONES) ===
${JSON.stringify(ingresos || [], null, 2)}

=== TABLA C: MONEDERO E INSTRUMENTOS FINANCIEROS ===
${JSON.stringify(tarjetas || [], null, 2)}

=== TABLA D: EGRESOS / GASTOS ===
${JSON.stringify(egresos || [], null, 2)}

=== TABLA E: REGISTRO DE ACTIVIDADES Y AGENDA ===
${JSON.stringify(actividades || [], null, 2)}

=== HORIZONTES METRICOS DE TIEMPO CONSOLIDADOS ===
${JSON.stringify(visualPayload || {}, null, 2)}

==================================================
TU TAREA COGNITIVA PRINCIPAL:
Genera un output altamente analítico estructurado ESTRICTAMENTE en tres secciones independientes:

1. COMPORTAMIENTO TEMPORAL CRUZADO:
   - Compara los gastos y actividades de la última semana contra la media del mes actual y su comportamiento histórico. 
   - Destaca de forma explícita si el ritmo de gasto de los últimos 7 días pone en riesgo el pago de las fechas límite de las tarjetas que vencen este mes (Tabla C).
   - Analiza el balance entre actividades productivas sin costo registradas vs gastos realizados en los pilares.

2. DETECCIÓN DE DESCALCES Y PUNTOS CRÍTICOS:
   - Evalúa si hay eventos o citas agendadas a futuro (Tabla E) que requieran liquidez inmediata y compárala con el saldo disponible en sus cuentas de débito (Tabla C).
   - Si la deuda actual de las tarjetas supera el umbral seguro basado en sus ingresos históricos, enciende una alerta cuantitativa explícita.

3. CONSEJOS Y SOLUCIONES PROPUESTAS:
   - Responde de forma proactiva a posibles dudas del usuario basándote en su historial.
   - Da un plan de acción sugerido de 3 pasos para la siguiente semana (ej: 'Para cubrir el pago de tu tarjeta X que vence en 5 días sin generar intereses, congela los gastos del Pilar Amoroso durante esta semana, ya que en los últimos 7 días has excedido tu promedio histórico en esa categoría en un 15%').

Escribe tu respuesta con un tono súper asertivo y de consultoría ejecutiva, con subtítulos claros y formato de Markdown impecable y limpio.

⚠️ REGLA CRÍTICA DE FORMATO: Al escribir cantidades de dinero, usa ÚNICAMENTE el símbolo $ seguido del número (ej: $17,875.72). NUNCA escribas códigos de moneda como USD, MXN, EUR ni ningún otro después del número. Esto es obligatorio en todo el reporte.
`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });

        res.json({ text: response.text });
      } catch (geminiErr: any) {
        console.warn("Fallo en Gemini API, utilizando fallback local para Auditoría:", geminiErr);
        res.json({ text: generateFallbackAudit() });
      }
    } catch (error: any) {
      console.error("Error general en /api/audit:", error);
      res.status(500).json({ error: error.message || "Ocurrió un error al procesar la auditoría." });
    }
  });

  // API Route: Optimizador de Deudas (Método Avalancha)
  app.post("/api/optimize", async (req, res) => {
    try {
      const { ingresos, deudas, egresos, currency } = req.body;
      
      const generateFallbackOptimize = () => {
        const totalIncomes = ingresos ? ingresos.reduce((s: number, i: any) => s + i.Monto_Neto, 0) : 0;
        const totalExpenses = egresos ? egresos.reduce((s: number, e: any) => s + e.Monto, 0) : 0;
        
        const getCurrencySymbol = (code: string) => {
          if (code === "EUR") return "€";
          if (code === "GBP") return "£";
          return "$";
        };
        const symbol = getCurrencySymbol(currency || "");
        const fmt = (val: number) => `${symbol}${val.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

        const activeTDCs = (deudas || []).filter((d: any) => d.Tipo === "Crédito" || d.Tipo === "credito");
        const totalDebts = activeTDCs.reduce((s: number, d: any) => s + (d.Deuda_Actual || d.Balance_Total_Pendiente || 0), 0);
        const debtIncomeRatio = totalIncomes > 0 ? ((totalDebts / totalIncomes) * 100).toFixed(1) : "0.0";
        const cashFlow = totalIncomes - totalExpenses;
        const totalMinPayments = activeTDCs.reduce((s: number, d: any) => s + (d.Pago_Minimo || 0), 0);
        const extraRemanente = Math.max(0, cashFlow - totalMinPayments);

        const sortedTDCs = [...activeTDCs].sort((a: any, b: any) => (b.Tasa_Interes_Anual || 0) - (a.Tasa_Interes_Anual || 0));

        let orderText = "";
        let instructionText = "";
        let statsAnalysis = "";
        
        if (sortedTDCs.length > 0) {
          orderText = sortedTDCs.map((t: any, idx: number) => {
            return `${idx + 1}. **${t.Nombre_Tarjeta} (Pilar: ${t.Pilar || 'Económico'}):** Tasa de Interés Anual: **${t.Tasa_Interes_Anual || 0}%** | Deuda Actual: ${fmt(t.Deuda_Actual || t.Balance_Total_Pendiente || 0)} | Pago Mínimo: ${fmt(t.Pago_Minimo || 0)}.`;
          }).join("\n");

          instructionText = sortedTDCs.map((t: any, idx: number) => {
            if (idx === 0) {
              const totalSug = (t.Pago_Para_No_Generar_Intereses || t.Pago_Minimo || 0) + extraRemanente;
              return `* **${t.Nombre_Tarjeta} (Tasa ${t.Tasa_Interes_Anual || 0}% - CABEZA DE AVALANCHA):**
    * Paga su pago mínimo obligatorio de **${fmt(t.Pago_Minimo || 0)}** (o para no generar intereses de **${fmt(t.Pago_Para_No_Generar_Intereses || 0)}**).
    * Adicionalmente, inyecta el remanente acelerador completo de **${fmt(extraRemanente)}** directamente a esta tarjeta.
    * **Pago total sugerido: ${fmt(totalSug)}**.`;
            } else {
              return `* **${t.Nombre_Tarjeta} (Tasa ${t.Tasa_Interes_Anual || 0}%):** Paga únicamente su mínimo de **${fmt(t.Pago_Minimo || 0)}** para mantener tu cuenta al corriente.`;
            }
          }).join("\n");

          const payoffMin = totalMinPayments > 0 ? Math.ceil(totalDebts / (totalMinPayments * 1.1)) : 0;
          const payoffAvalanche = (cashFlow) > 0 ? Math.ceil(totalDebts / cashFlow) : 0;

          statsAnalysis = `* **Escenario A (Solo Pagos Mínimos):** Tardarás aproximadamente **${payoffMin} meses** en liquidar todas las tarjetas y pagarás considerables intereses acumulados.
* **Escenario B (Método Avalancha Acelerado):** Liquidarás todo en aproximadamente **${payoffAvalanche || 1} meses**. Ahorrarás una cantidad importante en intereses bancarios.`;
        } else {
          orderText = "* **Sin pasivos financieros registrados:** No tienes tarjetas de crédito registradas en el sistema. Tu deuda es cero.";
          instructionText = "* **Fondo de Ahorro y Crecimiento:** Tu flujo de caja neto no requiere ser destinado a pagos de intereses. Puedes reasignar este excedente a tus metas de Crecimiento o Salud.";
          statsAnalysis = "* No hay deudas pendientes que liquidar.";
        }

        return `# Plan de Optimización de Deudas - Método Avalancha (Simulación Activa)
 
## 1. RATIO DEUDA / INGRESO ACTUAL
* **Deuda Consolidada Total:** **${fmt(totalDebts)}**.
* **Ingresos Netos del Mes:** **${fmt(totalIncomes)}**.
* **Ratio de Endeudamiento:** **${debtIncomeRatio}%**. ${parseFloat(debtIncomeRatio) > 40 ? "Tu deuda consolidada es elevada frente a tus ingresos. Aplica la avalancha con urgencia." : "Tu nivel de apalancamiento es manejable, pero liquidarlo ahorrará intereses."}
 
## 2. ORDEN DE AVALANCHA (Mayor a Menor Tasa de Interés)
${orderText}
 
## 3. FLUJO DE CAJA Y REMANENTE DISPONIBLE
* **Ingresos Netos:** ${fmt(totalIncomes)}
* **Egresos Totales:** ${fmt(totalExpenses)}
* **Flujo de Caja Libre:** **${fmt(cashFlow)}**
* **Pagos Mínimos Obligatorios:** ${fmt(totalMinPayments)}
* **Remanente Acelerador:** **${fmt(extraRemanente)}**
 
## 4. INSTRUCCIONES DE PAGO PARA ESTE PERIODO
${instructionText}
 
## 5. SIMULACIÓN DE LIQUIDACIÓN ACELERADA vs PAGO MÍNIMO
${statsAnalysis}`;
      };

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
        return res.json({ text: generateFallbackOptimize() });
      }

      try {
        const ai = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const prompt = `
Actúa como un Arquitecto de Finanzas de Élite y experto en el Método de Avalancha de Deudas (ordenado de mayor a menor tasa de interés).
Analiza los datos reales del usuario para armar una estrategia perfecta:

=== TABLA A: INGRESOS ===
${JSON.stringify(ingresos, null, 2)}

=== TABLA B: EGRESOS ===
${JSON.stringify(egresos, null, 2)}

=== TABLA C: INSTRUMENTOS DE DEUDA Y TDC ===
${JSON.stringify(deudas, null, 2)}

==================================================
TU TAREA COGNITIVA:
1. DETECTAR EL RATIO DEUDA/INGRESO ACTUAL: Suma todo el Balance Total Pendiente de las deudas y calcula qué porcentaje representa del ingreso neto mensual del usuario.
2. CALCULAR LIQUIDEZ Y REMANENTE: Calcula el flujo de caja del mes (Ingresos Netos - Gastos/Egresos Totales). Determina el efectivo remanente para amortizar deuda por encima de los pagos mínimos.
3. ORDEN ESTRICTO POR TASA DE INTERÉS (AVALANCHA): Ordena todos los instrumentos de deuda de mayor interés anual (%) a menor.
4. INSTRUCCIÓN CONCRETA DE PAGO PARA ESTE PERIODO:
   - Para cada deuda, indica el monto exacto a pagar (pago mínimo obligatorio).
   - Para la deuda con la tasa de interés más alta (la cabeza de la avalancha), indica el monto extra sugerido del remanente que se le inyectará de forma acelerada.
5. CONSIDERACIONES DE CALENDARIO: Alerta sobre las Fechas de Corte y Fechas Límites de Pago de cada instrumento para planificar la liquidez temporal.
6. TABLA COMPARATIVA DE TIEMPOS DE LIQUIDACIÓN: Simula en cuántos meses aproximados saldrá de deudas si inyecta este remanente acelerado vs si solo paga el mínimo estático.

Redacta un reporte en Markdown que sea visualmente impactante, preciso y lleno de valor estructurado.

⚠️ REGLA CRÍTICA DE FORMATO: Al escribir cantidades de dinero, usa ÚNICAMENTE el símbolo $ seguido del número (ej: $1,007.75). NUNCA escribas códigos de moneda como USD, MXN, EUR ni ningún otro después del número. Esto es obligatorio en todo el reporte.
`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });

        res.json({ text: response.text });
      } catch (geminiErr: any) {
        console.warn("Fallo en Gemini API, utilizando fallback local para Deudas:", geminiErr);
        res.json({ text: generateFallbackOptimize() });
      }
    } catch (error: any) {
      console.error("Error general en /api/optimize:", error);
      res.status(500).json({ error: error.message || "Ocurrió un error al procesar el plan de avalancha." });
    }
  });

  // Configuración de servidor para desarrollo y producción
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[Vite] Middleware de desarrollo montado");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("[Servidor] Servidor estático de producción configurado");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor activo corriendo correctamente en el puerto ${PORT}`);
  });
}

startServer();
