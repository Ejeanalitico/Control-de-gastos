export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * SISTEMA DE RECONSTRUCCIÓN PERSONAL Y FINANZAS - ECOSISTEMA DE 5 PILARES
 * Google Apps Script Engine (Bidireccional y Automatizado)
 * =========================================================================
 * 
 * Instrucción de instalación:
 * 1. Desde tu Google Sheet, haz clic en Extensiones > Apps Script.
 * 2. Borra cualquier código existente y pega este archivo completo.
 * 3. En la pestaña "Configuración del proyecto" de Apps Script (icono engranaje),
 *    añade una Propiedad de Script llamada "GEMINI_API_KEY" con tu API Key.
 * 4. Ejecuta por primera vez la función setupDatabase() para crear y estructurar las hojas.
 * 5. Configura los activadores (Triggers) de reloj:
 *    - parseGmailInvoices -> Ejecución cada 12 horas.
 *    - syncFinancialCalendar -> Ejecución diaria o cada inicio de mes.
 *    - generateWeeklyInsights -> Ejecución semanal (ej. domingos noche).
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

/**
 * 1. setupDatabase()
 * Inicializa y formatea las 4 hojas de cálculo con el esquema exacto y color de cabeceras.
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const tables = [
    {
      name: "TABLA A: Ingresos",
      headers: ["ID_Ingreso", "Fecha", "Concepto", "Categoría", "Monto_Bruto", "Monto_Neto", "Cuenta_Destino"],
      color: "#0f766e" // Teal
    },
    {
      name: "TABLA B: Egresos",
      headers: ["ID_Egreso", "Fecha", "Concepto", "Categoría_Pilar", "Subcategoría", "Monto", "Metodo_Pago", "Tipo_Gasto"],
      color: "#4338ca" // Indigo
    },
    {
      name: "TABLA C: Deudas y TDC",
      headers: ["ID_Instrumento", "Nombre_Instrumento", "Tipo", "Balance_Total_Pendiente", "Pago_Mínimo_Mensual", "Pago_Para_No_Generar_Intereses", "Fecha_Corte", "Fecha_Límite_Pago", "Tasa_Interés_Anual"],
      color: "#be123c" // Rose/Red
    },
    {
      name: "TABLA D: Pilares de Reconstrucción",
      headers: ["ID_Meta", "Pilar", "Meta_SMART", "Indicador_Éxito", "Estado", "Presupuesto_Asignado"],
      color: "#b45309" // Amber
    }
  ];
  
  tables.forEach(t => {
    let sheet = ss.getSheetByName(t.name);
    if (!sheet) {
      sheet = ss.insertSheet(t.name);
    } else {
      sheet.clear();
    }
    
    // Inserta cabeceras
    const headerRange = sheet.getRange(1, 1, 1, t.headers.length);
    headerRange.setValues([t.headers]);
    headerRange.setBackground(t.color);
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    
    // Auto ajustar anchos
    sheet.setFrozenRows(1);
    for (let i = 1; i <= t.headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
  });
  
  SpreadsheetApp.getUi().alert("✅ Ecosistema de 5 Pilares: Base de datos estructurada con éxito.");
}

/**
 * 2. parseGmailInvoices()
 * Busca correos bancarios y académicos recientes en Gmail y los procesa usando Regex o Gemini.
 */
function parseGmailInvoices() {
  const query = 'subject:("Compra" OR "Retiro" OR "Transferencia" OR "Estado de Cuenta" OR "Pago realizado" OR "Factura" OR "Inscripción") "UVM" OR "compra" OR "retiro" OR "monto"';
  const threads = GmailApp.search(query, 0, 15); // Los últimos 15 hilos
  
  if (threads.length === 0) {
    Logger.log("No se encontraron correos nuevos con facturas o alertas.");
    return;
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetEgresos = ss.getSheetByName("TABLA B: Egresos");
  const sheetDeudas = ss.getSheetByName("TABLA C: Deudas y TDC");
  
  const existingIds = getExistingColumnValues(sheetEgresos, 1);
  const geminiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  
  threads.forEach(thread => {
    const messages = thread.getMessages();
    messages.forEach(msg => {
      const msgId = msg.getId();
      // Evitar duplicados analizando si el Id de mensaje de Gmail o fecha coincide
      if (existingIds.indexOf(msgId) !== -1) return; 
      
      const bodyText = msg.getPlainBody();
      const date = Utilities.formatDate(msg.getDate(), Session.getScriptTimeZone(), "yyyy-MM-dd");
      const subject = msg.getSubject();
      
      let parsed = null;
      if (geminiKey) {
        // Modo Élite: Parsear contenido con Gemini API del correo
        parsed = parseBodyWithGemini(bodyText, subject, date, geminiKey);
      } else {
        // Fallback: Expresiones regulares básicas
        parsed = parseBodyWithRegex(bodyText, subject, date);
      }
      
      if (parsed && parsed.monto > 0) {
        // Insertar en la Tabla B: Egresos
        const newUid = Utilities.getUuid();
        sheetEgresos.appendRow([
          newUid, 
          parsed.fecha, 
          parsed.concepto, 
          parsed.categoriaPilar, 
          parsed.subcategoria, 
          parsed.monto, 
          parsed.metodoPago, 
          parsed.tipoGasto
        ]);
        Logger.log("Egreso Auto-Registrado desde Gmail: " + parsed.concepto + " por $" + parsed.monto);
      }
    });
  });
}

/**
 * Helper: Parseo de correos con Gemini API de Google
 */
function parseBodyWithGemini(bodyContent, subject, dateFallback, apiKey) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
  
  const systemInstruction = 
    "Eres un extractor de datos bancarios de correos electrónicos. Tu meta es procesar " +
    "la alerta bancaria o factura escolar y devolver un objeto JSON estructurado exacto. " +
    "Determina los pilares correctos según el gasto: Necesidad_Esencial, Salud, Escolar, Laboral, Personal, Amoroso. " +
    "Analiza el método de pago (si contiene terminación de tarjeta, guárdala como 'TDC_nombre'), y clasifica el gasto como 'Fijo', 'Variable' o 'Hormiga'.";

  const prompt = \`
Analiza el correo:
Asunto: \${subject}
Fecha por defecto: \${dateFallback}
Cuerpo del correo:
\${bodyContent.substring(0, 3000)}

Devuelve estrictamente un objeto JSON plano sin formato especial de bloque de código, que contenga exactamente estos campos:
{
  "fecha": "YYYY-MM-DD",
  "concepto": "Nombre del comercio o descripción corta",
  "categoriaPilar": "Necesidad_Esencial|Salud|Escolar|Laboral|Personal|Amoroso",
  "subcategoria": "Descripción corta adicional",
  "monto": 0.00,
  "metodoPago": "Débito|Efectivo|TDC_Visa|TDC_Mastercard",
  "tipoGasto": "Fijo|Variable|Hormiga"
}
\`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  try {
    const options = {
      method: "POST",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(url, options);
    const jsonStr = JSON.parse(response.getContentText()).candidates[0].content.parts[0].text;
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    Logger.log("Error al procesar con Gemini, usando Regex: " + e.toString());
    return parseBodyWithRegex(bodyContent, subject, dateFallback);
  }
}

/**
 * Helper: Parseo básico por expresiones regulares como Fallback
 */
function parseBodyWithRegex(body, subject, dateFallback) {
  let monto = 0;
  // Regex común de montos: $120.50 o MXN 300
  const montoMatch = body.match(/\\$[\\s]*([\\d,]+\\.\\d{2})/);
  if (montoMatch) {
    monto = parseFloat(montoMatch[1].replace(/,/g, ""));
  }
  
  let concepto = "Cargo Bancario Detectado";
  const comercioMatch = body.match(/(?:en|de|compra en|comercio)\\s+([A-Za-z0-9\\s]{3,25})/i);
  if (comercioMatch) {
    concepto = comercioMatch[1].trim();
  } else if (subject) {
    concepto = subject;
  }
  
  // Categorización básica basada en conceptos comunes
  let pilar = "Personal";
  let gastotipo = "Variable";
  if (body.match(/UVM|colegiatura|examen|rectoria/i)) {
    pilar = "Escolar";
    gastotipo = "Fijo";
  } else if (body.match(/supermercado|renta|cfe|agua|gas|walmart/i)) {
    pilar = "Necesidad_Esencial";
    gastotipo = "Fijo";
  } else if (body.match(/farmacia|doctor|clinica|hospital|consultorio/i)) {
    pilar = "Salud";
  }
  
  return {
    fecha: dateFallback,
    concepto: concepto,
    categoriaPilar: pilar,
    subcategoria: "Registro Automático Gmail",
    monto: monto,
    metodoPago: "Débito",
    tipoGasto: gastotipo
  };
}

/**
 * 3. syncFinancialCalendar()
 * Crea alertas correspondientes de pago en Google Calendar y programa bloques de tiempo de prioridades académicas/laborales.
 */
function syncFinancialCalendar() {
  const calendarName = "Reconstrucción y Finanzas 5 Pilares";
  let cal = CalendarApp.getCalendarsByName(calendarName)[0];
  if (!cal) {
    cal = CalendarApp.createCalendar(calendarName);
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetDeudas = ss.getSheetByName("TABLA C: Deudas y TDC");
  const sheetMetas = ss.getSheetByName("TABLA D: Pilares de Reconstrucción");
  const sheetIngresos = ss.getSheetByName("TABLA A: Ingresos");
  
  const deudasData = sheetDeudas.getDataRange().getValues();
  const ingresoData = sheetIngresos.getDataRange().getValues();
  
  // Limpiar eventos existentes del mes en curso para no duplicar
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const oldEvents = cal.getEvents(startOfMonth, endOfMonth);
  oldEvents.forEach(ev => ev.deleteEvent());
  
  // Obtener fecha del siguiente ingreso para alerta de descalce
  let proximoIngresoDia = 15; // Estimación estándar quincena
  if (ingresoData.length > 1) {
    const ultimoIngresoFecha = new Date(ingresoData[ingresoData.length - 1][1]);
    proximoIngresoDia = ultimoIngresoFecha.getDate();
  }
  
  // A. Registrar deudas y tarjetas (Color ROJO)
  for (let i = 1; i < deudasData.length; i++) {
    const row = deudasData[i];
    const nombre = row[1];
    const balance = row[3];
    const min = row[4];
    const noGen = row[5];
    const fechaCorteDia = parseInt(row[6]);
    const fechaLimiteDia = parseInt(row[7]);
    
    if (!fechaLimiteDia) continue;
    
    // Crear fecha de límite de pago de este mes
    const limiteDate = new Date(now.getFullYear(), now.getMonth(), fechaLimiteDia);
    let title = "⚠️ PAGAR " + nombre + " - Min: $" + min + " / No Gen. Int: $" + noGen;
    
    // Alerta de descalce temporal (si el pago límite ocurre antes de la fecha estimada de ingreso)
    if (fechaLimiteDia < proximoIngresoDia) {
      title = "[ALERTA DE DESCALCE] " + title;
      const desc = "Atención: La fecha límite de pago ($" + noGen + ") ocurre antes de la inyección de efectivo estimada de tu nómina o cobro.";
      const event = cal.createAllDayEvent(title, limiteDate, { description: desc });
      event.setColor(CalendarApp.EventColor.RED);
    } else {
      const event = cal.createAllDayEvent(title, limiteDate);
      event.setColor(CalendarApp.EventColor.RED);
    }
    
    // Registrar también la fecha de corte
    const corteDate = new Date(now.getFullYear(), now.getMonth(), fechaCorteDia);
    const corteEvent = cal.createAllDayEvent("✂️ Corte de Tarjeta: " + nombre + " (Pendiente: $" + balance + ")", corteDate);
    corteEvent.setColor(CalendarApp.EventColor.ORANGE);
  }
  
  // B. Time blocking de Educación/Laboral (Color AZUL)
  const metasData = sheetMetas.getDataRange().getValues();
  for (let j = 1; j < metasData.length; j++) {
    const row = metasData[j];
    const pilar = row[1];
    const meta = row[2];
    const estado = row[4];
    
    if ((pilar === "Escolar" || pilar === "Laboral") && estado === "En Proceso") {
      // Buscar hitos de exámenes o entregas dentro de la meta SMART (ejemplo básico: si se menciona fecha en formato DD/MM)
      const dateMatch = meta.match(/(\\d{2})\\/(\\d{2})/);
      if (dateMatch) {
        const d = parseInt(dateMatch[1]);
        const m = parseInt(dateMatch[2]) - 1; // Base 0
        const studyDate = new Date(now.getFullYear(), m, d);
        if (studyDate >= startOfMonth && studyDate <= endOfMonth) {
          // Crear bloque de estudio de 2 horas (18:00 a 20:00)
          const startTime = new Date(now.getFullYear(), m, d, 18, 0, 0);
          const endTime = new Date(now.getFullYear(), m, d, 20, 0, 0);
          const block = cal.createEvent("📘 BLOQUE ACADÉMICO / LABORAL - Preparación Hito", startTime, endTime, {
            description: "Enfoque inamovible de 2 horas para hito de meta SMART: " + meta
          });
          block.setColor(CalendarApp.EventColor.BLUE);
        }
      }
    }
  }
  
  if (SpreadsheetApp.getUi) {
    SpreadsheetApp.getUi().alert("📆 Sincronización de Google Calendar completa en el Calendario: " + calendarName);
  }
}

/**
 * 4. generateWeeklyInsights()
 * Recopila todos los datos de las hojas, pide un reporte consolidado con Gemini y escribe el Google Doc de la semana.
 */
function generateWeeklyInsights() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rawIngresos = ss.getSheetByName("TABLA A: Ingresos").getDataRange().getValues();
  const rawEgresos = ss.getSheetByName("TABLA B: Egresos").getDataRange().getValues();
  const rawDeudas = ss.getSheetByName("TABLA C: Deudas y TDC").getDataRange().getValues();
  const rawMetas = ss.getSheetByName("TABLA D: Pilares de Reconstrucción").getDataRange().getValues();
  
  const weeklySummary = {
    ingresos: processValues(rawIngresos),
    egresos: processValues(rawEgresos),
    deudas: processValues(rawDeudas),
    metas: processValues(rawMetas)
  };
  
  const geminiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  let insightText = "Lamentablemente, no tienes configurada la clave GEMINI_API_KEY en las propiedades del script para generar reflexiones automáticas semanalmente.";
  
  if (geminiKey) {
    insightText = queryGeminiForDoc(weeklySummary, geminiKey);
  }
  
  // Crear Documento de Google con fecha
  const weekNumber = getWeekNumber(new Date());
  const year = new Date().getFullYear();
  const docTitle = "Status_Reconstrucción_Semana_" + weekNumber + "_" + year;
  
  const doc = DocumentApp.create(docTitle);
  const body = doc.getBody();
  
  body.appendParagraph("==================================================\\n" + 
                     "     SISTEMA DE RECONSTRUCCIÓN PERSONAL Y FINANZAS   \\n" + 
                     "          REPORTE EXTRAORDINARIO SEMANAL             \\n" + 
                     "==================================================").setHeading(DocumentApp.ParagraphHeading.HEADING1).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  body.appendParagraph("Fecha de Generación: " + new Date().toLocaleString()).setItalic(true);
  
  body.appendHorizontalRule();
  body.appendParagraph("Análisis Generativo del Ecosistema").setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(insightText);
  
  body.appendHorizontalRule();
  body.appendParagraph("📙 SECCIÓN DE DIARIO INTIMO EN BLANCO (Personal & Amoroso/Social)").setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph("¿Cómo manejaste tus impulsos emocionales de consumo esta semana? (Reflexión obligatoria de 5 minutos):");
  body.appendParagraph("_________________________________________________________________________________\\n" +
                     "_________________________________________________________________________________\\n" +
                     "_________________________________________________________________________________");
                     
  body.appendParagraph("\\n¿Cuál es el estado de tu relación o círculo amoroso/social en consonancia con tus metas financieras hoy?:");
  body.appendParagraph("_________________________________________________________________________________\\n" +
                     "_________________________________________________________________________________");
                     
  doc.saveAndClose();
  
  if (SpreadsheetApp.getUi) {
    SpreadsheetApp.getUi().alert("📄 Reporte Semanal Generado con éxito en tu Google Drive con el nombre: " + docTitle);
  }
}

/**
 * Helper: Query Gemini para generar reporte formal en Google Docs
 */
function queryGeminiForDoc(summaryData, apiKey) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
  
  const prompt = \`
Genera un análisis semanal de status de reconstrucción personal para este usuario de finanzas y vida.
Analiza sus tablas:
Ingresos: \${JSON.stringify(summaryData.ingresos, null, 1)}
Egresos de la semana: \${JSON.stringify(summaryData.egresos, null, 1)}
Deudas pendientes: \${JSON.stringify(summaryData.deudas, null, 1)}
Metas de vida: \${JSON.stringify(summaryData.metas, null, 1)}

Redacta de forma académica, asertiva y ejecutiva:
1. Resumen de Flujo de Caja real con el ratio de endeudamiento del mes.
2. Estado de control de fugas (gastos de tipo 'Hormiga' acumulados).
3. Evaluaciones de cada pilar (Salud, Escolar, Laboral, Personal, Amoroso).
4. Un mensaje directo para levantar el ánimo del usuario instándolo a apegarse a las reglas del ecosistema de 5 pilares.

Escribe el texto limpio, sin marcas de código Markdown de bloques de código (como tres acentos invertidos), ideal para pegarse directamente en un documento de Google.
\`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  try {
    const options = {
      method: "POST",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    return result.candidates[0].content.parts[0].text;
  } catch (e) {
    return "Error generando insights con Gemini: " + e.toString() + "\\n\\nUtiliza los datos en tu Google Sheet para rellenar este reporte de forma manual.";
  }
}

// Helpers adicionales de bajo nivel de Apps Script
function processValues(rawValues) {
  if (rawValues.length <= 1) return [];
  const headers = rawValues[0];
  const items = [];
  for (let i = 1; i < rawValues.length; i++) {
    const r = rawValues[i];
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx];
    });
    items.push(obj);
  }
  return items;
}

function getExistingColumnValues(sheet, colNum) {
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  return sheet.getRange(2, colNum, lastRow - 1, 1).getValues().map(r => r[0].toString());
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}
`;
