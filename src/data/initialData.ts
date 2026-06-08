import { 
  Ingreso, 
  Egreso, 
  Deuda, 
  MetaPilar,
  Usuario,
  AgendaEvento,
  CategoriaIngreso,
  CategoriaPilar,
  TipoGasto,
  TipoTarjeta,
  EstadoMeta,
  PlanSuscripcion,
  EstadoLicencia
} from "../types";

export const INITIAL_USUARIOS: Usuario[] = [
  {
    ID_Usuario: "user-salvador-gomez-11111",
    Nombre_Usuario: "Ing. Salvador Gómez",
    Gmail_Sincronizado: "salvador.gomez.dev@gmail.com",
    Correo_Google: "salvador.gomez.dev@gmail.com",
    Google_Calendar_ID: "salvador_gomez_cal_5p",
    Fecha_Registro: "2026-01-10",
    Plan_Suscripcion: PlanSuscripcion.PREMIUM_5P,
    Estado_Licencia: EstadoLicencia.ACTIVO,
    Tope_Amoroso_Porcentaje: 0.30,
    Salud_Personal_Base_Porcentaje: 0.20,
    Multiplicador_Amoroso: 0.30,
    Presupuesto_Salud_Personal: 0.20
  },
  {
    ID_Usuario: "user-beatriz-peralta-22222",
    Nombre_Usuario: "Lic. Beatriz Peralta",
    Gmail_Sincronizado: "beatriz.peralta.design@gmail.com",
    Correo_Google: "beatriz.peralta.design@gmail.com",
    Google_Calendar_ID: "beatriz_peralta_cal_5p",
    Fecha_Registro: "2026-03-15",
    Plan_Suscripcion: PlanSuscripcion.ELITE_MENTOR,
    Estado_Licencia: EstadoLicencia.ACTIVO,
    Tope_Amoroso_Porcentaje: 0.25,
    Salud_Personal_Base_Porcentaje: 0.15,
    Multiplicador_Amoroso: 0.25,
    Presupuesto_Salud_Personal: 0.15
  },
  {
    ID_Usuario: "user-carlos-mendoza-33333",
    Nombre_Usuario: "Carlos Mendoza (Demo Expirado)",
    Gmail_Sincronizado: "carlos.mendoza.demo@gmail.com",
    Correo_Google: "carlos.mendoza.demo@gmail.com",
    Google_Calendar_ID: "carlos_mendoza_cal_5p",
    Fecha_Registro: "2025-11-20",
    Plan_Suscripcion: PlanSuscripcion.STARTER,
    Estado_Licencia: EstadoLicencia.SUSPENDIDO,
    Tope_Amoroso_Porcentaje: 0.30,
    Salud_Personal_Base_Porcentaje: 0.20,
    Multiplicador_Amoroso: 0.30,
    Presupuesto_Salud_Personal: 0.20
  }
];

export const INITIAL_INGRESOS: Ingreso[] = [
  // --- SALVADOR GOMEZ ---
  {
    ID_Usuario: "user-salvador-gomez-11111",
    ID_Ingreso: "ing-1111",
    Fecha: "2026-06-01",
    Concepto: "Fórmula de Nómina Principal - Desarrollador Senior DevCorp",
    Categoria: CategoriaIngreso.NOMINA,
    Monto_Bruto: 3200.00,
    Monto_Neto: 3200.00,
    Cuenta_Destino: "CitibanChecking Débito"
  },
  {
    ID_Usuario: "user-salvador-gomez-11111",
    ID_Ingreso: "ing-1112",
    Fecha: "2026-06-05",
    Concepto: "Freelance - Taller de Arquitectura Cloud",
    Categoria: CategoriaIngreso.FREELANCE,
    Monto_Bruto: 950.00,
    Monto_Neto: 950.00,
    Cuenta_Destino: "CitibanChecking Débito"
  },

  // --- BEATRIZ PERALTA ---
  {
    ID_Usuario: "user-beatriz-peralta-22222",
    ID_Ingreso: "ing-2221",
    Fecha: "2026-06-02",
    Concepto: "Asesoría UX Mensual - Retainer Co",
    Categoria: CategoriaIngreso.FREELANCE,
    Monto_Bruto: 2400.00,
    Monto_Neto: 2400.00,
    Cuenta_Destino: "Banco Débito Principal"
  }
];

// TABLA C: Monedero e Instrumentos Financieros (TDC / Débito)
export const INITIAL_DEUDAS: Deuda[] = [
  // --- SALVADOR GOMEZ ---
  {
    ID_Usuario: "user-salvador-gomez-11111",
    ID_Instrumento: "card-salvador-citidebit",
    ID_Tarjeta: "card-salvador-citidebit",
    Nombre_Tarjeta: "Citi Checking Débito",
    Nombre_Instrumento: "Citi Checking Débito",
    Tipo: TipoTarjeta.DEBITO,
    Limite_Credito: 0,
    Saldo_Disponible: 4150.00, // Débito is actual cash/available money
    Saldo_Al_Corte: 0,
    Deuda_Actual: 0,
    Pago_Minimo: 0,
    Pago_Para_No_Generar_Intereses: 0,
    Fecha_Corte: 1,
    Fecha_Limite_Pago: 1,
    Tasa_Interes_Anual: 0,
    Balance_Total_Pendiente: 0,
    Pago_Minimo_Mensual: 0
  },
  {
    ID_Usuario: "user-salvador-gomez-11111",
    ID_Instrumento: "card-salvador-cititdc",
    ID_Tarjeta: "card-salvador-cititdc",
    Nombre_Tarjeta: "TDC Platino Citibank",
    Nombre_Instrumento: "TDC Platino Citibank",
    Tipo: TipoTarjeta.CREDITO,
    Limite_Credito: 10000.00,
    Saldo_Disponible: 5800.00, // Free limit line = 10000 - 4200
    Saldo_Al_Corte: 4200.00, // Deuda_Actual
    Deuda_Actual: 4200.00,
    Pago_Minimo: 180.00,
    Pago_Para_No_Generar_Intereses: 650.00,
    Fecha_Corte: 15,
    Fecha_Limite_Pago: 5,
    Tasa_Interes_Anual: 48.5,
    Balance_Total_Pendiente: 4200.00,
    Pago_Minimo_Mensual: 180.00
  },
  {
    ID_Usuario: "user-salvador-gomez-11111",
    ID_Instrumento: "card-salvador-santandertdc",
    ID_Tarjeta: "card-salvador-santandertdc",
    Nombre_Tarjeta: "TDC Santander Light",
    Nombre_Instrumento: "TDC Santander Light",
    Tipo: TipoTarjeta.CREDITO,
    Limite_Credito: 5000.00,
    Saldo_Disponible: 3100.00, // Free limit line = 5000 - 1900
    Saldo_Al_Corte: 1900.00, // Deuda_Actual
    Deuda_Actual: 1900.00,
    Pago_Minimo: 95.00,
    Pago_Para_No_Generar_Intereses: 550.00,
    Fecha_Corte: 12,
    Fecha_Limite_Pago: 2,
    Tasa_Interes_Anual: 42.0,
    Balance_Total_Pendiente: 1900.00,
    Pago_Minimo_Mensual: 95.00
  },

  // --- BEATRIZ PERALTA ---
  {
    ID_Usuario: "user-beatriz-peralta-22222",
    ID_Instrumento: "card-beatriz-deb",
    ID_Tarjeta: "card-beatriz-deb",
    Nombre_Tarjeta: "Banco Débito Principal",
    Nombre_Instrumento: "Banco Débito Principal",
    Tipo: TipoTarjeta.DEBITO,
    Limite_Credito: 0,
    Saldo_Disponible: 2980.00,
    Saldo_Al_Corte: 0,
    Deuda_Actual: 0,
    Pago_Minimo: 0,
    Pago_Para_No_Generar_Intereses: 0,
    Fecha_Corte: 1,
    Fecha_Limite_Pago: 1,
    Tasa_Interes_Anual: 0,
    Balance_Total_Pendiente: 0,
    Pago_Minimo_Mensual: 0
  },
  {
    ID_Usuario: "user-beatriz-peralta-22222",
    ID_Instrumento: "card-beatriz-tdc",
    ID_Tarjeta: "card-beatriz-tdc",
    Nombre_Tarjeta: "TDC BBVA Platinum",
    Nombre_Instrumento: "TDC BBVA Platinum",
    Tipo: TipoTarjeta.CREDITO,
    Limite_Credito: 8000.00,
    Saldo_Disponible: 6500.00, // Free limit line = 8000 - 1500
    Saldo_Al_Corte: 1500.00,
    Deuda_Actual: 1500.00,
    Pago_Minimo: 80.00,
    Pago_Para_No_Generar_Intereses: 350.00,
    Fecha_Corte: 8,
    Fecha_Limite_Pago: 28,
    Tasa_Interes_Anual: 39.9,
    Balance_Total_Pendiente: 1500.00,
    Pago_Minimo_Mensual: 80.00
  }
];

// TABLA D: Egresos / Gastos (Ligan a monederos y deudas)
export const INITIAL_EGRESOS: Egreso[] = [
  // --- SALVADOR GOMEZ ---
  {
    ID_Usuario: "user-salvador-gomez-11111",
    ID_Egreso: "egr-1111",
    ID_Actividad_Origen: null,
    ID_Tarjeta_Utilizada: "card-salvador-citidebit",
    Fecha: "2026-06-02",
    Concepto: "Renta de Departamento",
    Categoria_Pilar: CategoriaPilar.NECESIDAD_ESENCIAL,
    Subcategoria: "Vivienda Mensual",
    Monto: 1200.00,
    Metodo_Pago: "Citi Checking Débito",
    Tipo_Gasto: TipoGasto.FIJO
  },
  {
    ID_Usuario: "user-salvador-gomez-11111",
    ID_Egreso: "egr-1112",
    ID_Actividad_Origen: "act-1111", // linked to "Cita Médica Nutriólogo"
    ID_Tarjeta_Utilizada: "card-salvador-citidebit",
    Fecha: "2026-06-03",
    Concepto: "Inscripción Nutrición Integral",
    Categoria_Pilar: CategoriaPilar.SALUD,
    Subcategoria: "Control de Peso",
    Monto: 120.00,
    Metodo_Pago: "Citi Checking Débito",
    Tipo_Gasto: TipoGasto.VARIABLE
  },
  {
    ID_Usuario: "user-salvador-gomez-11111",
    ID_Egreso: "egr-1113",
    ID_Actividad_Origen: "act-1112", // linked to "Examen Certificación AWS"
    ID_Tarjeta_Utilizada: "card-salvador-cititdc",
    Fecha: "2026-06-05",
    Concepto: "Examen AWS Cloud practitioner",
    Categoria_Pilar: CategoriaPilar.LABORAL,
    Subcategoria: "Certificaciones",
    Monto: 180.00,
    Metodo_Pago: "TDC Platino Citibank",
    Tipo_Gasto: TipoGasto.VARIABLE
  },
  {
    ID_Usuario: "user-salvador-gomez-11111",
    ID_Egreso: "egr-1114",
    ID_Actividad_Origen: null,
    ID_Tarjeta_Utilizada: "card-salvador-cititdc",
    Fecha: "2026-06-06",
    Concepto: "Suscripción streaming Netflix + Spotify",
    Categoria_Pilar: CategoriaPilar.PERSONAL,
    Subcategoria: "Entretenimiento Mensual",
    Monto: 35.00,
    Metodo_Pago: "TDC Platino Citibank",
    Tipo_Gasto: TipoGasto.FIJO
  },
  {
    ID_Usuario: "user-salvador-gomez-11111",
    ID_Egreso: "egr-1115",
    ID_Actividad_Origen: "act-1113", // Linked to "Cena Romántica Aniversario"
    ID_Tarjeta_Utilizada: "card-salvador-cititdc",
    Fecha: "2026-06-07",
    Concepto: "Cena Romántica",
    Categoria_Pilar: CategoriaPilar.AMOROSO,
    Subcategoria: "Esparcimiento Social",
    Monto: 150.00,
    Metodo_Pago: "TDC Platino Citibank",
    Tipo_Gasto: TipoGasto.VARIABLE
  },

  // --- BEATRIZ PERALTA ---
  {
    ID_Usuario: "user-beatriz-peralta-22222",
    ID_Egreso: "egr-2221",
    ID_Actividad_Origen: null,
    ID_Tarjeta_Utilizada: "card-beatriz-deb",
    Fecha: "2026-06-03",
    Concepto: "Suscripción Mensual Cowork",
    Categoria_Pilar: CategoriaPilar.NECESIDAD_ESENCIAL,
    Subcategoria: "Renta de Escritorio",
    Monto: 500.00,
    Metodo_Pago: "Banco Débito Principal",
    Tipo_Gasto: TipoGasto.FIJO
  },
  {
    ID_Usuario: "user-beatriz-peralta-22222",
    ID_Egreso: "egr-2222",
    ID_Actividad_Origen: "act-2221", // linked to "Sesión Psicoterapia Semanal"
    ID_Tarjeta_Utilizada: "card-beatriz-deb",
    Fecha: "2026-06-04",
    Concepto: "Pago Sesión Terapia Emocional",
    Categoria_Pilar: CategoriaPilar.SALUD,
    Subcategoria: "Salud Mental",
    Monto: 130.00,
    Metodo_Pago: "Banco Débito Principal",
    Tipo_Gasto: TipoGasto.VARIABLE
  },
  {
    ID_Usuario: "user-beatriz-peralta-22222",
    ID_Egreso: "egr-2223",
    ID_Actividad_Origen: null,
    ID_Tarjeta_Utilizada: "card-beatriz-tdc",
    Fecha: "2026-06-05",
    Concepto: "Librería Francesa - Libros Gramática",
    Categoria_Pilar: CategoriaPilar.PERSONAL,
    Subcategoria: "Estudio Idiomas",
    Monto: 85.00,
    Metodo_Pago: "TDC BBVA Platinum",
    Tipo_Gasto: TipoGasto.VARIABLE
  }
];

export const INITIAL_METAS: MetaPilar[] = [
  // --- SALVADOR GOMEZ ---
  {
    ID_Usuario: "user-salvador-gomez-11111",
    ID_Meta: "meta-s1",
    Pilar: CategoriaPilar.PERSONAL,
    Meta_SMART: "Meditar 15 minutos diarios por las mañanas y leer 1 libro mensual de crecimiento.",
    Indicador_Exito: "Racha de 90% días meditando en app de hábitos",
    Estado: EstadoMeta.EN_PROCESO,
    Presupuesto_Asignado: 0.00
  },
  {
    ID_Usuario: "user-salvador-gomez-11111",
    ID_Meta: "meta-s2",
    Pilar: CategoriaPilar.ESCOLAR,
    Meta_SMART: "Completar tesis del Máster Tecnológico con promedio mínimo de 9.2 antes de fin de año.",
    Indicador_Exito: "Asesor de tesis autoriza los capítulos 1 y 2",
    Estado: EstadoMeta.EN_PROCESO,
    Presupuesto_Asignado: 600.00
  },
  {
    ID_Usuario: "user-salvador-gomez-11111",
    ID_Meta: "meta-s3",
    Pilar: CategoriaPilar.SALUD,
    Meta_SMART: "Reducir el porcentaje de grasa y colesterol asistiendo con nutriólogo mensualmente.",
    Indicador_Exito: "Biometría hemática con niveles de lípidos normales",
    Estado: EstadoMeta.EN_PROCESO,
    Presupuesto_Asignado: 120.00
  },
  {
    ID_Usuario: "user-salvador-gomez-11111",
    ID_Meta: "meta-s4",
    Pilar: CategoriaPilar.LABORAL,
    Meta_SMART: "Conseguir certificación AWS Solution Architect Professional.",
    Indicador_Exito: "Certificado digital oficial emitido por AWS",
    Estado: EstadoMeta.EN_PROCESO,
    Presupuesto_Asignado: 180.00
  },

  // --- BEATRIZ PERALTA ---
  {
    ID_Usuario: "user-beatriz-peralta-22222",
    ID_Meta: "meta-b1",
    Pilar: CategoriaPilar.PERSONAL,
    Meta_SMART: "Aprender el nivel B1 de francés utilizando cursos interactivos Duolingo.",
    Indicador_Exito: "Nivel certificado por prueba diagnóstica interna",
    Estado: EstadoMeta.EN_PROCESO,
    Presupuesto_Asignado: 0.00
  },
  {
    ID_Usuario: "user-beatriz-peralta-22222",
    ID_Meta: "meta-b2",
    Pilar: CategoriaPilar.SALUD,
    Meta_SMART: "Mejorar postura lumbar mediante sesiones de pilates clínicas semanales.",
    Indicador_Exito: "Asistencia de 10 clases al mes sin dolor",
    Estado: EstadoMeta.EN_PROCESO,
    Presupuesto_Asignado: 130.00
  }
];

// TABLA E: Registro de Actividades y Agenda (Conexión Dual con Egresos)
export const INITIAL_EVENTOS: AgendaEvento[] = [
  // --- SALVADOR GOMEZ ---
  {
    ID_Usuario: "user-salvador-gomez-11111",
    ID_Evento: "act-1111",
    ID_Actividad: "act-1111",
    Tipo_Agenda: "Cita_Médica",
    Pilar: CategoriaPilar.SALUD,
    Pilar_Asociado: CategoriaPilar.SALUD,
    Titulo_Actividad: "🩺 Cita Médica Nutriólogo",
    Titulo: "🩺 Cita Médica Nutriólogo",
    Descripcion_Detallada: "Evaluación corporal mensual e indicaciones de régimen semanal.",
    Descripcion: "Evaluación corporal mensual e indicaciones de régimen semanal.",
    Fecha_Hora_Inicio: "2026-06-03T09:00",
    Fecha_Hora_Fin: "2026-06-03T10:00",
    Requiere_Pago: true,
    ID_Egreso_Asociado: "egr-1112",
    Fecha: "2026-06-03",
    Tipo_Evento: "Sesión Mentoría",
    Color: "green",
    Alerta_Descalce: false
  },
  {
    ID_Usuario: "user-salvador-gomez-11111",
    ID_Evento: "act-1112",
    ID_Actividad: "act-1112",
    Tipo_Agenda: "Control_Escolar",
    Pilar: CategoriaPilar.LABORAL,
    Pilar_Asociado: CategoriaPilar.LABORAL,
    Titulo_Actividad: "🚀 Examen Certificación AWS",
    Titulo: "🚀 Examen Certificación AWS",
    Descripcion_Detallada: "Examen de certificación AWS Solution Architect Cloud Practitioner.",
    Descripcion: "Examen de certificación AWS Solution Architect Cloud Practitioner.",
    Fecha_Hora_Inicio: "2026-06-05T14:30",
    Fecha_Hora_Fin: "2026-06-05T17:00",
    Requiere_Pago: true,
    ID_Egreso_Asociado: "egr-1113",
    Fecha: "2026-06-05",
    Tipo_Evento: "Bloque Académico",
    Color: "blue",
    Alerta_Descalce: false
  },
  {
    ID_Usuario: "user-salvador-gomez-11111",
    ID_Evento: "act-1113",
    ID_Actividad: "act-1113",
    Tipo_Agenda: "Agenda_Personal",
    Pilar: CategoriaPilar.AMOROSO,
    Pilar_Asociado: CategoriaPilar.AMOROSO,
    Titulo_Actividad: "🍷 Cena Romántica Aniversario",
    Titulo: "🍷 Cena Romántica Aniversario",
    Descripcion_Detallada: "Cena de aniversario en Bistro Francés.",
    Descripcion: "Cena de aniversario en Bistro Francés.",
    Fecha_Hora_Inicio: "2026-06-07T20:00",
    Fecha_Hora_Fin: "2026-06-07T22:30",
    Requiere_Pago: true,
    ID_Egreso_Asociado: "egr-1115",
    Fecha: "2026-06-07",
    Tipo_Evento: "Evaluación Mínima",
    Color: "purple",
    Alerta_Descalce: false
  },
  {
    ID_Usuario: "user-salvador-gomez-11111",
    ID_Evento: "act-1114",
    ID_Actividad: "act-1114",
    Tipo_Agenda: "Agenda_Laboral",
    Pilar: CategoriaPilar.ESCOLAR,
    Pilar_Asociado: CategoriaPilar.ESCOLAR,
    Titulo_Actividad: "📚 Sesión de Estudio de Tesis",
    Titulo: "📚 Sesión de Estudio de Tesis",
    Descripcion_Detallada: "Bloque intensivo de redacción de metodología de tesis en biblioteca.",
    Descripcion: "Bloque intensivo de redacción de metodología de tesis en biblioteca.",
    Fecha_Hora_Inicio: "2026-06-08T10:00",
    Fecha_Hora_Fin: "2026-06-08T12:00",
    Requiere_Pago: false,
    ID_Egreso_Asociado: null,
    Fecha: "2026-06-08",
    Tipo_Evento: "Bloque Académico",
    Color: "blue",
    Alerta_Descalce: false
  },

  // --- BEATRIZ PERALTA ---
  {
    ID_Usuario: "user-beatriz-peralta-22222",
    ID_Evento: "act-2221",
    ID_Actividad: "act-2221",
    Tipo_Agenda: "Cita_Médica",
    Pilar: CategoriaPilar.SALUD,
    Pilar_Asociado: CategoriaPilar.SALUD,
    Titulo_Actividad: "🧠 Sesión Psicoterapia Semanal",
    Titulo: "🧠 Sesión Psicoterapia Semanal",
    Descripcion_Detallada: "Coaching y enfoque terapéutico emocional con terapeuta clínico.",
    Descripcion: "Coaching y enfoque terapéutico emocional con terapeuta clínico.",
    Fecha_Hora_Inicio: "2026-06-04T16:00",
    Fecha_Hora_Fin: "2026-06-04T17:00",
    Requiere_Pago: true,
    ID_Egreso_Asociado: "egr-2222",
    Fecha: "2026-06-04",
    Tipo_Evento: "Sesión Mentoría",
    Color: "green",
    Alerta_Descalce: false
  }
];
