import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { 
  initDatabase, 
  queryGet, 
  queryAll, 
  queryRun, 
  hashPassword 
} from "./db";

dotenv.config();

// Initialize the SQLite schema
initDatabase();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // === AUTHENTICATION ENDPOINTS ===

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Faltan datos obligatorios." });
      }

      const cleanEmail = email.trim().toLowerCase();
      const existing = await queryGet("SELECT * FROM usuarios WHERE Gmail_Sincronizado = ?", [cleanEmail]);
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
      const user: any = await queryGet("SELECT * FROM usuarios WHERE Gmail_Sincronizado = ?", [cleanEmail]);

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
      const metas = await queryAll("SELECT * FROM metas WHERE ID_Usuario = ?", [userId]);
      const eventosRaw = await queryAll("SELECT * FROM eventos WHERE ID_Usuario = ?", [userId]);

      const eventos = eventosRaw.map((ev: any) => ({
        ...ev,
        Requiere_Pago: ev.Requiere_Pago === 1,
        Alerta_Descalce: ev.Alerta_Descalce === 1
      }));

      res.json({ ingresos, egresos, deudas, metas, eventos });
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
      const { ID_Instrumento, ID_Usuario, ID_Tarjeta, Nombre_Tarjeta, Nombre_Instrumento, Tipo, Limite_Credito, Saldo_Disponible, Saldo_Al_Corte, Deuda_Actual, Pago_Minimo, Pago_Para_No_Generar_Intereses, Fecha_Corte, Fecha_Limite_Pago, Tasa_Interes_Anual, Balance_Total_Pendiente, Pago_Minimo_Mensual } = req.body;
      await queryRun(`
        INSERT INTO deudas (ID_Instrumento, ID_Usuario, ID_Tarjeta, Nombre_Tarjeta, Nombre_Instrumento, Tipo, Limite_Credito, Saldo_Disponible, Saldo_Al_Corte, Deuda_Actual, Pago_Minimo, Pago_Para_No_Generar_Intereses, Fecha_Corte, Fecha_Limite_Pago, Tasa_Interes_Anual, Balance_Total_Pendiente, Pago_Minimo_Mensual)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [ID_Instrumento, ID_Usuario, ID_Tarjeta, Nombre_Tarjeta, Nombre_Instrumento, Tipo, Limite_Credito, Saldo_Disponible, Saldo_Al_Corte, Deuda_Actual, Pago_Minimo, Pago_Para_No_Generar_Intereses, Fecha_Corte, Fecha_Limite_Pago, Tasa_Interes_Anual, Balance_Total_Pendiente, Pago_Minimo_Mensual]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/deudas/:id", async (req, res) => {
    try {
      const { Limite_Credito, Saldo_Disponible, Saldo_Al_Corte, Deuda_Actual, Pago_Minimo, Pago_Para_No_Generar_Intereses, Balance_Total_Pendiente } = req.body;
      await queryRun(`
        UPDATE deudas 
        SET Limite_Credito = ?, Saldo_Disponible = ?, Saldo_Al_Corte = ?, Deuda_Actual = ?, Pago_Minimo = ?, Pago_Para_No_Generar_Intereses = ?, Balance_Total_Pendiente = ?
        WHERE ID_Instrumento = ?
      `, [Limite_Credito, Saldo_Disponible, Saldo_Al_Corte, Deuda_Actual, Pago_Minimo, Pago_Para_No_Generar_Intereses, Balance_Total_Pendiente, req.params.id]);
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

  // Metas
  app.post("/api/metas", async (req, res) => {
    try {
      const { ID_Meta, ID_Usuario, Pilar, Meta_SMART, Indicador_Exito, Estado, Presupuesto_Asignado } = req.body;
      await queryRun(`
        INSERT INTO metas (ID_Meta, ID_Usuario, Pilar, Meta_SMART, Indicador_Exito, Estado, Presupuesto_Asignado)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [ID_Meta, ID_Usuario, Pilar, Meta_SMART, Indicador_Exito, Estado, Presupuesto_Asignado]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/metas/:id", async (req, res) => {
    try {
      await queryRun("DELETE FROM metas WHERE ID_Meta = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Eventos / Actividades
  app.post("/api/eventos", async (req, res) => {
    try {
      const { ID_Actividad, ID_Usuario, ID_Evento, Tipo_Agenda, Pilar, Pilar_Asociado, Titulo_Actividad, Titulo, Descripcion_Detallada, Descripcion, Fecha_Hora_Inicio, Fecha_Hora_Fin, Requiere_Pago, ID_Egreso_Asociado, Fecha, Tipo_Evento, Color, Alerta_Descalce } = req.body;
      await queryRun(`
        INSERT INTO eventos (ID_Actividad, ID_Usuario, ID_Evento, Tipo_Agenda, Pilar, Pilar_Asociado, Titulo_Actividad, Titulo, Descripcion_Detallada, Descripcion, Fecha_Hora_Inicio, Fecha_Hora_Fin, Requiere_Pago, ID_Egreso_Asociado, Fecha, Tipo_Evento, Color, Alerta_Descalce)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [ID_Actividad, ID_Usuario, ID_Evento, Tipo_Agenda, Pilar, Pilar_Asociado, Titulo_Actividad, Titulo, Descripcion_Detallada, Descripcion, Fecha_Hora_Inicio, Fecha_Hora_Fin, Requiere_Pago ? 1 : 0, ID_Egreso_Asociado, Fecha, Tipo_Evento, Color, Alerta_Descalce ? 1 : 0]);
      res.json({ success: true });
    } catch (err: any) {
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
        visualPayload         // Contains week, month, historical summary stats computed client-side
      } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Dynamic Fallback logic if no API key is set
        const totalIncomes = ingresos ? ingresos.reduce((s: number, i: any) => s + i.Monto_Neto, 0) : 4150.00;
        const totalExpenses = egresos ? egresos.reduce((s: number, e: any) => s + e.Monto, 0) : 1685.00;
        const netBalance = totalIncomes - totalExpenses;

        const mockText = `# Diagnóstico Inteligente de 5 Pilares: ${nombreUsuario || "Usuario Premium"} (Simulación Activa)

## 1. COMPORTAMIENTO TEMPORAL CRUZADO
* **Ingresos vs Egresos:** Has percibido **$${totalIncomes.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD** y gastado **$${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD** en el periodo actual. Tu balance neto es de **$${netBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD**.
* **Ritmo de los últimos 7 días:** Los egresos más significativos se concentran en Renta Mensual ($1,200.00 USD) y Esparcimiento Social ($150.00 USD). Tu flujo es positivo, pero tu capital líquido requiere ser resguardado ante fechas de pago próximas.
* **Actividades vs Costo:** Registras actividades con costo (Examen AWS, Nutriólogo) que impactan directamente tu cuenta de débito. Se recomienda balancear con más actividades recreativas o formativas sin costo del pilar Personal.

## 2. DETECCIÓN DE DESCALCES Y PUNTOS CRÍTICOS
* **Alerta de Vencimiento de Plásticos:**
  * **TDC Platino Citibank:** Deuda actual de **$4,200.00 USD** con fecha de corte el **día 15** y pago mínimo de **$180.00 USD**. Tienes fondos en tu cuenta de débito, pero liquidarla por completo comprometería tu flujo libre inmediato.
  * **TDC Santander Light:** Deuda de **$1,900.00 USD** con corte el **día 12**.
* **Riesgo detectado:** El total de deuda acumulada en plásticos ($6,100.00 USD) representa un ratio elevado sobre tu liquidez inmediata. Es fundamental estructurar los pagos para evitar cargos moratorios.

## 3. CONSEJOS Y PLAN DE ACCIÓN RECOMENDADO
1. **Paso 1 (Inmediato):** Transfiere **$650.00 USD** de tu cuenta de débito a la TDC Platino Citibank antes de su fecha límite de pago para mantener los intereses en 0%.
2. **Paso 2 (Mitigación):** Para la siguiente semana, congela cualquier gasto del pilar **Amoroso** o **Personal** (salidas recreativas), ya que excediste tu promedio de gastos en esa categoría en un 15% debido a la Cena Romántica.
3. **Paso 3 (Inversión de Crecimiento):** Dado que completaste tu Examen de Certificación AWS, busca vincular este logro académico a un incremento de tarifas en tus servicios freelance en el pilar **Laboral**.`;

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
      const { ingresos, egresos, deudas } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Dynamic Fallback logic if no API key is set
        const totalIncomes = ingresos ? ingresos.reduce((s: number, i: any) => s + i.Monto_Neto, 0) : 4150.00;
        const totalExpenses = egresos ? egresos.reduce((s: number, e: any) => s + e.Monto, 0) : 1685.00;
        const totalDebts = deudas ? deudas.filter((d: any) => d.Tipo === "Crédito").reduce((s: number, d: any) => s + d.Deuda_Actual, 0) : 6100.00;
        const debtIncomeRatio = totalIncomes > 0 ? ((totalDebts / totalIncomes) * 100).toFixed(1) : "0.0";
        const cashFlow = totalIncomes - totalExpenses;
        const totalMinPayments = deudas ? deudas.reduce((s: number, d: any) => s + d.Pago_Minimo, 0) : 275.00;
        const extraRemanente = Math.max(0, cashFlow - totalMinPayments);

        const mockText = `# Plan de Optimización de Deudas - Método Avalancha (Simulación Activa)

## 1. RATIO DEUDA / INGRESO ACTUAL
* **Deuda Consolidada Total:** **$${totalDebts.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD**.
* **Ingresos Netos del Mes:** **$${totalIncomes.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD**.
* **Ratio de Endeudamiento:** **${debtIncomeRatio}%**. Tu deuda total consolidada representa un porcentaje sustancial de tu ingreso neto mensual. Es crítico aplicar el plan de amortización acelerado.

## 2. ORDEN DE AVALANCHA (Mayor a Menor Tasa de Interés)
1. **TDC Platino Citibank:** Tasa de Interés Anual: **48.5%** | Deuda Actual: $4,200.00 USD | Pago Mínimo: $180.00 USD | No Generar Intereses: $650.00 USD.
2. **TDC Santander Light:** Tasa de Interés Anual: **42.0%** | Deuda Actual: $1,900.00 USD | Pago Mínimo: $95.00 USD | No Generar Intereses: $550.00 USD.

## 3. FLUJO DE CAJA Y REMANENTE DISPONIBLE
* **Ingresos Netos:** $${totalIncomes.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
* **Egresos Totales:** $${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
* **Flujo de Caja Libre:** **$${cashFlow.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD**
* **Pagos Mínimos Obligatorios:** $${totalMinPayments.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
* **Remanente Acelerador:** **$${extraRemanente.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD**

## 4. INSTRUCCIONES DE PAGO PARA ESTE PERIODO
* **TDC Santander Light (Tasa 42.0%):** Paga únicamente el mínimo de **$95.00 USD** para mantener tu cuenta al corriente.
* **TDC Platino Citibank (Tasa 48.5% - Cabeza de la Avalancha):** 
  * Realiza el pago para no generar intereses de **$650.00 USD**.
  * Adicionalmente, inyecta **$1,500.00 USD** del remanente libre directamente como abono a capital.
  * **Pago Total Sugerido para Citibank:** **$2,150.00 USD**.

## 5. SIMULACIÓN DE LIQUIDACIÓN ACELERADA vs PAGO MÍNIMO
* **Escenario A (Solo Pagos Mínimos):** Tardarás aproximadamente **38 meses** en liquidar ambas tarjetas y pagarás más de **$3,200.00 USD** en intereses acumulados.
* **Escenario B (Método Avalancha Acelerado):** Liquidarás la TDC Platino Citibank en **2 meses** y la TDC Santander Light en el **tercer mes**. Tiempo de liberación total: **3 meses**. Ahorro estimado en intereses: **$2,850.00 USD**.`;

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
