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
  const timeOnly = parts[1] || "10:00";
  
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
  const PORT = 3000;

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
        return res.json({ currency: data.currency || "USD" });
      }
    } catch (err) {
      // Silently ignore rate limits/CORS errors on server, default to USD
    }
    res.json({ currency: "USD" });
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

      // Provision default Debit account (Tabla C)
      await queryRun(`
        INSERT INTO deudas (ID_Instrumento, ID_Usuario, ID_Tarjeta, Nombre_Tarjeta, Nombre_Instrumento, Tipo, Limite_Credito, Saldo_Disponible, Saldo_Al_Corte, Deuda_Actual, Pago_Minimo, Pago_Para_No_Generar_Intereses, Fecha_Corte, Fecha_Limite_Pago, Tasa_Interes_Anual, Balance_Total_Pendiente, Pago_Minimo_Mensual)
        VALUES (?, ?, ?, 'SaaS Débito Ahorro', 'SaaS Débito Ahorro', 'Débito', 0, 3000.00, 0, 0, 0, 0, 1, 1, 0, 0, 0)
      `, [`card-${userId}-debit`, userId, `card-${userId}-debit`]);

      // Provision default Credit account (Tabla C)
      await queryRun(`
        INSERT INTO deudas (ID_Instrumento, ID_Usuario, ID_Tarjeta, Nombre_Tarjeta, Nombre_Instrumento, Tipo, Limite_Credito, Saldo_Disponible, Saldo_Al_Corte, Deuda_Actual, Pago_Minimo, Pago_Para_No_Generar_Intereses, Fecha_Corte, Fecha_Limite_Pago, Tasa_Interes_Anual, Balance_Total_Pendiente, Pago_Minimo_Mensual)
        VALUES (?, ?, ?, 'TDC Oro Premium', 'TDC Oro Premium', 'Crédito', 5000.00, 5000.00, 0, 0, 0, 0, 10, 30, 42.0, 0, 0)
      `, [`card-${userId}-credit`, userId, `card-${userId}-credit`]);

      // Provision default Metas
      await queryRun(`
        INSERT INTO metas (ID_Meta, ID_Usuario, Pilar, Meta_SMART, Indicador_Exito, Estado, Presupuesto_Asignado)
        VALUES (?, ?, 'Salud', 'Realizar entrenamiento cardiovascular de 30 minutos, 4 veces por semana.', 'Régimen del gimnasio certificado en bitácora', 'En Proceso', 80.00)
      `, [`meta-${userId}-1`, userId]);

      await queryRun(`
        INSERT INTO metas (ID_Meta, ID_Usuario, Pilar, Meta_SMART, Indicador_Exito, Estado, Presupuesto_Asignado)
        VALUES (?, ?, 'Escolar', 'Completar la certificación técnica de Desarrollo Frontend Full-Stack.', 'Certificado académico emitido', 'En Proceso', 250.00)
      `, [`meta-${userId}-2`, userId]);

      // Provision default Events (Corte / Pago alarms)
      await queryRun(`
        INSERT INTO eventos (ID_Actividad, ID_Usuario, ID_Evento, Tipo_Agenda, Pilar, Pilar_Asociado, Titulo_Actividad, Titulo, Descripcion_Detallada, Descripcion, Fecha_Hora_Inicio, Fecha_Hora_Fin, Requiere_Pago, ID_Egreso_Asociado, Fecha, Tipo_Evento, Color, Alerta_Descalce)
        VALUES (?, ?, ?, 'Agenda_Personal', 'Económico', 'Económico', '✂️ Corte de Tarjeta: TDC Oro Premium', '✂️ Corte de Tarjeta: TDC Oro Premium', 'Fecha de corte del plástico. Liquidar remanente recomendado.', 'Fecha de corte del plástico. Liquidar remanente recomendado.', '2026-06-10T09:00', '2026-06-10T10:00', 0, NULL, '2026-06-10', 'Corte de Tarjeta', 'orange', 0)
      `, [`evt-${userId}-corte`, userId, `evt-${userId}-corte`]);

      await queryRun(`
        INSERT INTO eventos (ID_Actividad, ID_Usuario, ID_Evento, Tipo_Agenda, Pilar, Pilar_Asociado, Titulo_Actividad, Titulo, Descripcion_Detallada, Descripcion, Fecha_Hora_Inicio, Fecha_Hora_Fin, Requiere_Pago, ID_Egreso_Asociado, Fecha, Tipo_Evento, Color, Alerta_Descalce)
        VALUES (?, ?, ?, 'Agenda_Personal', 'Económico', 'Económico', '⚠️ Fecha Límite: Pagar TDC Oro Premium', '⚠️ Fecha Límite: Pagar TDC Oro Premium', 'Riesgo alto de intereses moratorios si no se inyecta liquidez.', 'Riesgo alto de intereses moratorios si no se inyecta liquidez.', '2026-06-30T09:00', '2026-06-30T10:00', 0, NULL, '2026-06-30', 'Límite de Pago', 'red', 0)
      `, [`evt-${userId}-pago`, userId, `evt-${userId}-pago`]);

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

      console.log("[DEBUG] Google User Info Email:", info.email);
      const email = info.email.trim().toLowerCase();
      const name = info.name || "Usuario Google";

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

        // Provision default Debit account (includes new Pilar field)
        await queryRun(`
          INSERT INTO deudas (ID_Instrumento, ID_Usuario, ID_Tarjeta, Nombre_Tarjeta, Nombre_Instrumento, Tipo, Limite_Credito, Saldo_Disponible, Saldo_Al_Corte, Deuda_Actual, Pago_Minimo, Pago_Para_No_Generar_Intereses, Fecha_Corte, Fecha_Limite_Pago, Tasa_Interes_Anual, Balance_Total_Pendiente, Pago_Minimo_Mensual, Pilar)
          VALUES (?, ?, ?, 'SaaS Débito Ahorro', 'SaaS Débito Ahorro', 'Débito', 0, 3000.00, 0, 0, 0, 0, 1, 1, 0, 0, 0, 'Económico')
        `, [`card-${userId}-debit`, userId, `card-${userId}-debit`]);

        // Provision default Credit account
        await queryRun(`
          INSERT INTO deudas (ID_Instrumento, ID_Usuario, ID_Tarjeta, Nombre_Tarjeta, Nombre_Instrumento, Tipo, Limite_Credito, Saldo_Disponible, Saldo_Al_Corte, Deuda_Actual, Pago_Minimo, Pago_Para_No_Generar_Intereses, Fecha_Corte, Fecha_Limite_Pago, Tasa_Interes_Anual, Balance_Total_Pendiente, Pago_Minimo_Mensual, Pilar)
          VALUES (?, ?, ?, 'TDC Oro Premium', 'TDC Oro Premium', 'Crédito', 5000.00, 5000.00, 0, 0, 0, 0, 10, 30, 42.0, 0, 0, 'Económico')
        `, [`card-${userId}-credit`, userId, `card-${userId}-credit`]);

        // Provision default Metas
        await queryRun(`
          INSERT INTO metas (ID_Meta, ID_Usuario, Pilar, Meta_SMART, Indicador_Exito, Estado, Presupuesto_Asignado)
          VALUES (?, ?, 'Salud', 'Realizar entrenamiento cardiovascular de 30 minutos, 4 veces por semana.', 'Régimen del gimnasio certificado en bitácora', 'En Proceso', 80.00)
        `, [`meta-${userId}-1`, userId]);

        await queryRun(`
          INSERT INTO metas (ID_Meta, ID_Usuario, Pilar, Meta_SMART, Indicador_Exito, Estado, Presupuesto_Asignado)
          VALUES (?, ?, 'Escolar', 'Completar la certificación técnica de Desarrollo Frontend Full-Stack.', 'Certificado académico emitido', 'En Proceso', 250.00)
        `, [`meta-${userId}-2`, userId]);

        // Provision default Events (Corte / Pago alarms)
        await queryRun(`
          INSERT INTO eventos (ID_Actividad, ID_Usuario, ID_Evento, Tipo_Agenda, Pilar, Pilar_Asociado, Titulo_Actividad, Titulo, Descripcion_Detallada, Descripcion, Fecha_Hora_Inicio, Fecha_Hora_Fin, Requiere_Pago, ID_Egreso_Asociado, Fecha, Tipo_Evento, Color, Alerta_Descalce)
          VALUES (?, ?, ?, 'Agenda_Personal', 'Económico', 'Económico', '✂️ Corte de Tarjeta: TDC Oro Premium', '✂️ Corte de Tarjeta: TDC Oro Premium', 'Fecha de corte del plástico. Liquidar remanente recomendado.', 'Fecha de corte del plástico. Liquidar remanente recomendado.', '2026-06-10T09:00', '2026-06-10T10:00', 0, NULL, '2026-06-10', 'Corte de Tarjeta', 'orange', 0)
        `, [`evt-${userId}-corte`, userId, `evt-${userId}-corte`]);

        await queryRun(`
          INSERT INTO eventos (ID_Actividad, ID_Usuario, ID_Evento, Tipo_Agenda, Pilar, Pilar_Asociado, Titulo_Actividad, Titulo, Descripcion_Detallada, Descripcion, Fecha_Hora_Inicio, Fecha_Hora_Fin, Requiere_Pago, ID_Egreso_Asociado, Fecha, Tipo_Evento, Color, Alerta_Descalce)
          VALUES (?, ?, ?, 'Agenda_Personal', 'Económico', 'Económico', '⚠️ Fecha Límite: Pagar TDC Oro Premium', '⚠️ Fecha Límite: Pagar TDC Oro Premium', 'Riesgo alto de intereses moratorios si no se inyecta liquidez.', 'Riesgo alto de intereses moratorios si no se inyecta liquidez.', '2026-06-30T09:00', '2026-06-30T10:00', 0, NULL, '2026-06-30', 'Límite de Pago', 'red', 0)
        `, [`evt-${userId}-pago`, userId, `evt-${userId}-pago`]);

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

      const googleEmail = info.email.trim().toLowerCase();

      // Check if this Google email is already linked or registered to ANOTHER user account
      const duplicateUser = await queryGet(
        "SELECT * FROM usuarios WHERE (LOWER(TRIM(Gmail_Sincronizado)) = LOWER(TRIM(?)) OR LOWER(TRIM(Correo_Google)) = LOWER(TRIM(?))) AND ID_Usuario != ?",
        [googleEmail, googleEmail, userId]
      );

      if (duplicateUser) {
        return res.status(400).json({
          error: `Esta cuenta de Google (${info.email}) ya está vinculada a otro perfil de usuario en el sistema. Para evitar duplicaciones, desvincúlala primero de esa cuenta.`
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
          `${micrometa.Fecha_Planificada}T10:00`,
          `${micrometa.Fecha_Planificada}T11:00`,
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
      // Borrar pilar
      await queryRun("DELETE FROM pilares WHERE ID_Pilar = ?", [pilarId]);
      // Borrar subpilares hijos
      await queryRun("DELETE FROM pilares WHERE ID_Padre = ?", [pilarId]);
      // Borrar correlaciones
      await queryRun("DELETE FROM correlaciones_pilares WHERE ID_Origen = ? OR ID_Destino = ?", [pilarId, pilarId]);
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
      const { Meta_SMART, Indicador_Exito, Estado, Presupuesto_Asignado, Fecha_Meta, Sincronizar_Calendario, ID_Evento_Calendario } = req.body;
      const metaId = req.params.id;
      const mm: any = await queryGet("SELECT * FROM metas WHERE ID_Meta = ?", [metaId]);
      if (!mm) {
        return res.status(404).json({ error: "Meta no encontrada." });
      }

      await queryRun(`
        UPDATE metas
        SET Meta_SMART = ?, Indicador_Exito = ?, Estado = ?, Presupuesto_Asignado = ?, Fecha_Meta = ?, Sincronizar_Calendario = ?, ID_Evento_Calendario = ?
        WHERE ID_Meta = ?
      `, [Meta_SMART, Indicador_Exito, Estado, parseFloat(Presupuesto_Asignado) || 0, Fecha_Meta || null, Sincronizar_Calendario ? 1 : 0, ID_Evento_Calendario || null, metaId]);
      
      const updatedMeta = { ID_Meta: metaId, ID_Usuario: mm.ID_Usuario, Pilar: mm.Pilar, Meta_SMART, Indicador_Exito, Estado, Presupuesto_Asignado, Fecha_Meta, Sincronizar_Calendario: Sincronizar_Calendario ? 1 : 0, ID_Evento_Calendario };
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

      // Recurrent Micrometas Generation
      const reps = parseInt(Repeticiones) || 1;
      if (Recurrencia && Recurrencia !== "none" && reps > 1 && Fecha_Planificada) {
        for (let i = 1; i < reps; i++) {
          const nextStart = getFutureDate(Fecha_Planificada, i, Recurrencia);
          const recMmId = `${ID_Micrometa}-rec-${i}`;
          const recGastoPendiente = Genera_Gasto ? 1 : 0;

          await queryRun(`
            INSERT INTO micrometas (ID_Micrometa, ID_Usuario, ID_Meta, Titulo, Estado, Genera_Gasto, Monto_Gasto, Gasto_Pendiente, ID_Tarjeta_Gasto, Fecha_Planificada, Sincronizar_Calendario, ID_Evento_Calendario, Recurrencia, ID_Padre_Recurrente)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [recMmId, ID_Usuario, ID_Meta, Titulo, 'Pendiente', Genera_Gasto ? 1 : 0, parseFloat(Monto_Gasto) || 0, recGastoPendiente, ID_Tarjeta_Gasto || null, nextStart.dateStr, Sincronizar_Calendario ? 1 : 0, null, null, ID_Micrometa]);

          if (Array.isArray(Correlaciones)) {
            for (const pilId of Correlaciones) {
              const corrId = "corr-mm-" + Math.random().toString(36).substring(2, 9) + "-rec-" + i + "-" + Date.now();
              await queryRun(`
                INSERT INTO correlaciones_micrometas (ID_Correlacion, ID_Usuario, ID_Micrometa, ID_Pilar)
                VALUES (?, ?, ?, ?)
              `, [corrId, ID_Usuario, recMmId, pilId]);
            }
          }

          const recMmCreated = {
            ID_Micrometa: recMmId,
            ID_Usuario,
            Titulo,
            Estado: 'Pendiente',
            Genera_Gasto: Genera_Gasto ? 1 : 0,
            Monto_Gasto: parseFloat(Monto_Gasto) || 0,
            Fecha_Planificada: nextStart.dateStr,
            Sincronizar_Calendario: Sincronizar_Calendario ? 1 : 0
          };
          await syncMicrometaToEventsTable(recMmCreated, metaPilar);
        }
      }

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
              `, [nextDeuda, Math.max(0, card.Limite_Credito - nextDeuda), nextDeuda, ID_Tarjeta_Gasto]);
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
        `, [nextDeuda, Math.max(0, card.Limite_Credito - nextDeuda), nextDeuda, cardId]);
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
        Gasto_Pendiente, Monto_Gasto, ID_Tarjeta_Gasto, Tipo_Gasto
      } = req.body;
      const finalFecha = Fecha || (Fecha_Hora_Inicio ? Fecha_Hora_Inicio.slice(0, 10) : null);
      
      await queryRun(`
        UPDATE eventos 
        SET Titulo_Actividad = ?, Titulo = ?, Pilar = ?, Pilar_Asociado = ?, 
            Descripcion_Detallada = ?, Descripcion = ?, Fecha_Hora_Inicio = ?, Fecha_Hora_Fin = ?, 
            Color = ?, Fecha = ?, Gasto_Pendiente = ?, Monto_Gasto = ?, 
            ID_Tarjeta_Gasto = ?, Tipo_Gasto = ?
        WHERE ID_Actividad = ?
      `, [
        Titulo_Actividad || null, Titulo || null, Pilar || null, Pilar_Asociado || null, 
        Descripcion_Detallada || null, Descripcion || null, Fecha_Hora_Inicio || null, Fecha_Hora_Fin || null, 
        Color || null, finalFecha, 
        Gasto_Pendiente !== undefined ? (Gasto_Pendiente ? 1 : 0) : 0, 
        parseFloat(Monto_Gasto) || 0, ID_Tarjeta_Gasto || null, Tipo_Gasto || null,
        req.params.id
      ]);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error in PUT /api/eventos/:id:", err);
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
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Dynamic Fallback logic if no API key is set
        const totalIncomes = ingresos ? ingresos.reduce((s: number, i: any) => s + i.Monto_Neto, 0) : 0;
        const totalExpenses = egresos ? egresos.reduce((s: number, e: any) => s + e.Monto, 0) : 0;
        const netBalance = totalIncomes - totalExpenses;
        
        const getCurrencySymbol = (code: string) => {
          if (code === "EUR") return "€";
          if (code === "GBP") return "£";
          return "$";
        };
        const symbol = getCurrencySymbol(currency || "USD");
        const fmt = (val: number) => `${symbol}${val.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency || "USD"}`;

        // Get active credit cards (tarjetas with type 'Crédito')
        const activeTDCs = (tarjetas || []).filter((t: any) => t.Tipo === "Crédito" || t.Tipo === "credito");
        const totalTDCDeudas = activeTDCs.reduce((s: number, t: any) => s + (t.Deuda_Actual || t.Balance_Total_Pendiente || 0), 0);

        // Analyze descriptions of activities
        const activityDetailsList = (actividades || []).filter((act: any) => act.Descripcion_Detallada || act.Descripcion);
        let activitiesAnalysis = "";
        if (activityDetailsList.length > 0) {
          activitiesAnalysis = activityDetailsList.slice(0, 4).map((act: any) => {
            const desc = act.Descripcion_Detallada || act.Descripcion;
            const pilarName = act.Pilar || "Personal";
            return `* **Actividad '${act.Titulo_Actividad || act.Titulo}' (${pilarName}):** La descripción indica "${desc}". Se asocia al pilar de crecimiento y ${act.Requiere_Pago ? `implica un egreso de ${fmt(act.Monto || 0)}` : 'no implica gastos directos'}.`;
          }).join("\n");
        } else {
          activitiesAnalysis = "* No se encontraron descripciones detalladas en las actividades de la semana para evaluar.";
        }

        // Analyze credit cards cut-off and payment limit dates
        let tdcAnalysis = "";
        let steps = [];
        if (activeTDCs.length > 0) {
          tdcAnalysis = activeTDCs.map((t: any) => {
            return `  * **${t.Nombre_Tarjeta} (Pilar: ${t.Pilar || 'Económico'}):** Deuda actual de **${fmt(t.Deuda_Actual || 0)}** con corte el **día ${t.Fecha_Corte}** y límite de pago el **día ${t.Fecha_Limite_Pago}**. Pago mínimo obligatorio: **${fmt(t.Pago_Minimo || 0)}** (No generar intereses: **${fmt(t.Pago_Para_No_Generar_Intereses || 0)}**).`;
          }).join("\n");

          const primaryTDC = activeTDCs[0];
          const noInterestPay = primaryTDC.Pago_Para_No_Generar_Intereses || primaryTDC.Deuda_Actual || 0;
          steps.push(`1. **Paso 1 (Inmediato):** Transfiere **${fmt(noInterestPay)}** de tu cuenta de débito principal a la tarjeta **${primaryTDC.Nombre_Tarjeta}** (Pilar ${primaryTDC.Pilar || 'Económico'}) antes de su fecha límite (día **${primaryTDC.Fecha_Limite_Pago}**).`);
          
          if (activeTDCs.length > 1) {
            steps.push(`2. **Paso 2 (Mitigación):** Paga el mínimo de **${fmt(activeTDCs[1].Pago_Minimo || 0)}** para tu tarjeta **${activeTDCs[1].Nombre_Tarjeta}** para evitar intereses moratorios, y utiliza tu flujo de caja neto de **${fmt(netBalance)}** para amortizar capital.`);
          } else {
            steps.push(`2. **Paso 2 (Mitigación):** Con tu balance neto de **${fmt(netBalance)}**, congela consumos discrecionales y evita acumular nuevos pasivos.`);
          }
        } else {
          tdcAnalysis = "* No tienes tarjetas de crédito activas registradas en tu cartera.";
          steps.push(`1. **Paso 1 (Inmediato):** Tu balance está libre de pasivos bancarios. Sigue construyendo tu flujo neto.`);
          steps.push(`2. **Paso 2 (Mitigación):** Mantén tus cuentas de débito líquidas para tus actividades programadas.`);
        }

        // Add growth pilar analysis
        const expenseByPilar: Record<string, number> = {};
        (egresos || []).forEach((e: any) => {
          expenseByPilar[e.Categoria_Pilar] = (expenseByPilar[e.Categoria_Pilar] || 0) + e.Monto;
        });
        const highestPilar = Object.entries(expenseByPilar).sort((a,b) => b[1] - a[1])[0];
        const pilarAdvice = highestPilar 
          ? `Tu pilar con mayor consumo de capital en este periodo es **${highestPilar[0]}** con un gasto de **${fmt(highestPilar[1])}**.`
          : "No tienes gastos registrados en pilares en este periodo.";
        
        steps.push(`3. **Paso 3 (Inversión de Crecimiento):** ${pilarAdvice} Vincula tu agenda de actividades con bloques de estudio o entrenamiento que no impacten tu liquidez.`);

        const mockText = `# Diagnóstico Inteligente de 5 Pilares: ${nombreUsuario || "Usuario Premium"} (Simulación Activa)

## 1. COMPORTAMIENTO TEMPORAL CRUZADO
* **Ingresos vs Egresos:** Has percibido **${fmt(totalIncomes)}** y gastado **${fmt(totalExpenses)}** en el periodo actual. Tu balance neto es de **${fmt(netBalance)}**.
* **Ritmo de actividades analizadas (Descripciones de Actividades):**
${activitiesAnalysis}
* **Balance de Pilares:** ${pilarAdvice}

## 2. DETECCIÓN DE DESCALCES Y PUNTOS CRÍTICOS
* **Alerta de Vencimiento de Plásticos (TDC Activas):**
${tdcAnalysis}
* **Riesgo detectado:** El total de deuda acumulada en plásticos es de **${fmt(totalTDCDeudas)}**. ${totalTDCDeudas > totalIncomes ? "⚠️ Tu nivel de deuda de tarjetas supera tus ingresos mensuales actuales. Esto representa un riesgo alto." : "✓ Tu nivel de deuda acumulada está bajo control relativo frente a tus ingresos mensuales."}

## 3. CONSEJOS Y PLAN DE ACCIÓN RECOMENDADO
${steps.join("\n")}`;

        return res.json({ text: mockText });
      }

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
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Error llamando API de Gemini:", error);
      res.status(500).json({ error: error.message || "Ocurrió un error al procesar la auditoría con Gemini." });
    }
  });

  // API Route: Optimizador de Deudas (Método Avalancha)
  app.post("/api/optimize", async (req, res) => {
    try {
      const { ingresos, deudas, egresos, currency } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Dynamic Fallback logic if no API key is set
        const totalIncomes = ingresos ? ingresos.reduce((s: number, i: any) => s + i.Monto_Neto, 0) : 0;
        const totalExpenses = egresos ? egresos.reduce((s: number, e: any) => s + e.Monto, 0) : 0;
        
        const getCurrencySymbol = (code: string) => {
          if (code === "EUR") return "€";
          if (code === "GBP") return "£";
          return "$";
        };
        const symbol = getCurrencySymbol(currency || "USD");
        const fmt = (val: number) => `${symbol}${val.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency || "USD"}`;

        const activeTDCs = (deudas || []).filter((d: any) => d.Tipo === "Crédito" || d.Tipo === "credito");
        const totalDebts = activeTDCs.reduce((s: number, d: any) => s + (d.Deuda_Actual || d.Balance_Total_Pendiente || 0), 0);
        const debtIncomeRatio = totalIncomes > 0 ? ((totalDebts / totalIncomes) * 100).toFixed(1) : "0.0";
        const cashFlow = totalIncomes - totalExpenses;
        const totalMinPayments = activeTDCs.reduce((s: number, d: any) => s + (d.Pago_Minimo || 0), 0);
        const extraRemanente = Math.max(0, cashFlow - totalMinPayments);

        // Sort TDCs by interest rate descending (Avalanche)
        const sortedTDCs = [...activeTDCs].sort((a: any, b: any) => (b.Tasa_Interes_Anual || 0) - (a.Tasa_Interes_Anual || 0));

        let orderText = "";
        let instructionText = "";
        
        if (sortedTDCs.length > 0) {
          orderText = sortedTDCs.map((t: any, idx: number) => {
            return `${idx + 1}. **${t.Nombre_Tarjeta} (Pilar: ${t.Pilar || 'Económico'}):** Tasa de Interés Anual: **${t.Tasa_Interes_Anual || 0}%** | Deuda Actual: ${fmt(t.Deuda_Actual || t.Balance_Total_Pendiente || 0)} | Pago Mínimo: ${fmt(t.Pago_Minimo || 0)}.`;
          }).join("\n");

          instructionText = sortedTDCs.map((t: any, idx: number) => {
            if (idx === 0) {
              const totalSug = (t.Pago_Para_No_Generar_Intereses || t.Pago_Minimo || 0) + extraRemanente;
              return `* **${t.Nombre_Tarjeta} (Tasa ${t.Tasa_Interes_Anual || 0}% - Cabeza de la Avalancha):**
    * Paga su pago mínimo obligatorio de **${fmt(t.Pago_Minimo || 0)}** (o pago para no generar intereses de **${fmt(t.Pago_Para_No_Generar_Intereses || 0)}**).
    * Adicionalmente, inyecta el remanente acelerador completo de **${fmt(extraRemanente)}** directamente a esta tarjeta.
    * **Pago total sugerido: ${fmt(totalSug)}**.`;
            } else {
              return `* **${t.Nombre_Tarjeta} (Tasa ${t.Tasa_Interes_Anual || 0}%):** Paga únicamente su mínimo de **${fmt(t.Pago_Minimo || 0)}** para mantener tu cuenta al corriente.`;
            }
          }).join("\n");
        } else {
          orderText = "* No tienes tarjetas de crédito registradas para clasificar.";
          instructionText = "* No se requieren pagos de amortización acelerada.";
        }

        // payoff simulation
        const payoffMin = totalMinPayments > 0 ? Math.ceil(totalDebts / (totalMinPayments * 1.1)) : 0;
        const payoffAvalanche = (cashFlow) > 0 ? Math.ceil(totalDebts / cashFlow) : 0;

        const mockText = `# Plan de Optimización de Deudas - Método Avalancha (Simulación Activa)
 
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
${payoffMin > 0 ? `* **Escenario A (Solo Pagos Mínimos):** Tardarás aproximadamente **${payoffMin} meses** en liquidar todas las tarjetas y pagarás considerables intereses acumulados.
* **Escenario B (Método Avalancha Acelerado):** Liquidarás todo en aproximadamente **${payoffAvalanche || 1} meses**. Ahorrarás una cantidad importante en intereses bancarios.` : "* No hay deudas que liquidar."}`;

        return res.json({ text: mockText });
      }

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
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Error llamando API de Gemini para Deudas:", error);
      res.status(500).json({ error: error.message || "Ocurrió un error al procesar el plan de avalancha con Gemini." });
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
