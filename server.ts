import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
        return res.status(500).json({ error: "GEMINI_API_KEY no está configurada en los secretos del servidor. Por favor setéala en Configuración." });
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
        model: "gemini-3.5-flash",
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
        return res.status(500).json({ error: "GEMINI_API_KEY no está configurada en los secretos del servidor." });
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
        model: "gemini-3.5-flash",
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
