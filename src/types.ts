/**
 * Types declarations for the Ecosistema de Crecimiento de 5 Pilares
 */

export enum CategoriaIngreso {
  NOMINA = "Nómina",
  FREELANCE = "Freelance",
  FOTOGRAFIA = "Fotografía",
  VENTA_ACTIVOS = "Venta Activos",
}

export enum CategoriaPilar {
  NECESIDAD_ESENCIAL = "Necesidad_Esencial",
  SALUD = "Salud",
  ESCOLAR = "Escolar",
  LABORAL = "Laboral",
  PERSONAL = "Personal",
  AMOROSO = "Amoroso",
  ECONOMICO = "Económico",
}

export enum MetodoPago {
  EFECTIVO = "Efectivo",
  DEBITO = "Débito",
  TDC = "TDC",
}

export enum TipoGasto {
  FIJO = "Fijo",
  VARIABLE = "Variable",
  HORMIGA = "Hormiga",
}

export enum PlanSuscripcion {
  STARTER = "Starter",
  PREMIUM_5P = "Premium_5P",
  ELITE_MENTOR = "Elite_Mentor",
}

export enum EstadoLicencia {
  ACTIVO = "Activo",
  SUSPENDIDO = "Suspendido",
  DEMO = "Demo",
}

export interface Usuario {
  ID_Usuario: string; // Primary Key UUID
  Nombre_Usuario: string;
  Gmail_Sincronizado: string;
  Correo_Google: string; // TABLA A
  Google_Calendar_ID: string;
  Fecha_Registro: string; // YYYY-MM-DD
  Plan_Suscripcion: PlanSuscripcion;
  Estado_Licencia: EstadoLicencia;
  Tope_Amoroso_Porcentaje: number; // TABLA A (Defecto: 0.30)
  Salud_Personal_Base_Porcentaje: number; // TABLA A (Defecto: 0.20)
  // Backward compatibility compatibility layer
  Multiplicador_Amoroso: number; 
  Presupuesto_Salud_Personal: number;
}

export interface Ingreso {
  ID_Usuario: string; // Foreign Key
  ID_Ingreso: string; // UUID
  Fecha: string; // YYYY-MM-DD
  Concepto: string;
  Categoria: CategoriaIngreso;
  Monto_Neto: number; // Net monthly income
  Monto_Bruto: number; // Kept matching Monto_Neto for backward compatibility
  Cuenta_Destino: string;
}

export enum TipoTarjeta {
  DEBITO = "Débito",
  CREDITO = "Crédito"
}

// Representing TABLA C: Monedero e Instrumentos Financieros
export interface Deuda {
  ID_Usuario: string; // Foreign Key
  ID_Instrumento: string; // maps/coexists with ID_Tarjeta
  ID_Tarjeta: string; // TABLA C
  Nombre_Tarjeta: string; // TABLA C
  Nombre_Instrumento: string; // Alias
  Tipo: TipoTarjeta; // "Débito" | "Crédito"
  Limite_Credito: number; // 0 if Débito
  Saldo_Disponible: number; // En Débito es dinero real; en Crédito es la línea libre
  Saldo_Al_Corte: number; // Deuda_Actual (0 if Débito)
  Deuda_Actual: number; // Alias (0 if Débito)
  Pago_Minimo: number; // 0 if Débito
  Pago_Para_No_Generar_Intereses: number; // 0 if Débito
  Fecha_Corte: number; // Día del mes: DD
  Fecha_Limite_Pago: number; // Día del mes: DD
  Tasa_Interes_Anual: number; // percentage value e.g. 45
  Pilar: CategoriaPilar;
  // Backward compatibility fields
  Balance_Total_Pendiente: number; 
  Pago_Minimo_Mensual: number;
}

// Representing TABLA D: Egresos / Gastos
export interface Egreso {
  ID_Usuario: string; // Foreign Key
  ID_Egreso: string;
  ID_Actividad_Origen?: string | null; // UUID, Nullable (TABLA D)
  ID_Tarjeta_Utilizada: string; // Foreing Key connected to TABLA C (TDC / Débito)
  Fecha: string; // YYYY-MM-DD
  Concepto: string;
  Categoria_Pilar: CategoriaPilar; // or Pilar
  Subcategoria: string;
  Monto: number;
  Metodo_Pago: string; // Alias for UI displaying Card name or Cash/Efectivo
  Tipo_Gasto: TipoGasto;
  Recurrente?: number; // 0 or 1
}

// Representing Loans / Préstamos
export interface Prestamo {
  ID_Prestamo: string;
  ID_Usuario: string;
  Monto_Prestado: number;
  Monto_A_Pagar: number;
  Fecha_Inicio: string; // YYYY-MM-DD
  Fecha_Limite: string; // YYYY-MM-DD
}

export enum EstadoMeta {
  BLOQUEADO = "Bloqueado",
  EN_PROCESO = "En Proceso",
  LOGRADO = "Logrado",
}

export interface MetaPilar {
  ID_Usuario: string; // Foreign Key
  ID_Meta: string;
  Pilar: string; // Dynamic Pilar ID or static CategoriaPilar string
  Meta_SMART: string;
  Indicador_Exito: string;
  Estado: EstadoMeta;
  Presupuesto_Asignado: number;
  Fecha_Meta?: string; // YYYY-MM-DD
  Sincronizar_Calendario?: number; // 0 or 1
  ID_Evento_Calendario?: string | null;
}

export interface Pilar {
  ID_Pilar: string;
  ID_Usuario: string;
  Nombre: string;
  ID_Padre: string | null;
  Color?: string;
}

export interface CorrelacionPilar {
  ID_Correlacion: string;
  ID_Usuario: string;
  ID_Origen: string;
  ID_Destino: string;
}

export interface Micrometa {
  ID_Micrometa: string;
  ID_Usuario: string;
  ID_Meta: string;
  Titulo: string;
  Estado: "Pendiente" | "Completada" | "Cancelada";
  Genera_Gasto: number; // 0 or 1
  Monto_Gasto: number;
  Gasto_Pendiente: number; // 0 or 1
  ID_Tarjeta_Gasto?: string | null;
  Fecha_Planificada?: string; // YYYY-MM-DD
  Sincronizar_Calendario?: number; // 0 or 1
  ID_Evento_Calendario?: string | null;
  Correlaciones?: string[]; // Array of connected Pilar IDs
  Recurrencia?: string | null;
  ID_Padre_Recurrente?: string | null;
}

export interface CorrelacionMicrometa {
  ID_Correlacion: string;
  ID_Usuario: string;
  ID_Micrometa: string;
  ID_Pilar: string;
}

// Representing TABLA E: Registro de Actividades y Agenda (Conexión Dual con Egresos)
export interface AgendaEvento {
  ID_Usuario: string; // Foreign Key
  ID_Evento: string; // maps/coexists with ID_Actividad
  ID_Actividad: string; // PK UUID
  Tipo_Agenda: "Cita_Médica" | "Agenda_Laboral" | "Agenda_Personal" | "Control_Escolar"; // TABLA E
  Pilar: CategoriaPilar; // Fijo: Salud, Escolar, Laboral, Personal, Amoroso (TABLA E)
  Pilar_Asociado: CategoriaPilar; // Alias
  Titulo_Actividad: string; // TABLA E
  Titulo: string; // Alias
  Descripcion_Detallada: string; // TABLA E
  Descripcion: string; // Alias
  Fecha_Hora_Inicio: string; // Timestamp ISO datetime-local
  Fecha_Hora_Fin: string; // Timestamp ISO datetime-local
  Requiere_Pago: boolean; // Sí/No (TABLA E)
  ID_Egreso_Asociado?: string | null; // UUID, Nullable
  // UI Display and visual parameters coexisting gracefully
  Fecha: string; // YYYY-MM-DD extracted for calendars
  Tipo_Evento: "Corte de Tarjeta" | "Límite de Pago" | "Hito de Meta" | "Bloque Académico" | "Sesión Mentoría" | "Evaluación Mínima"; // UI Type
  Color: "red" | "orange" | "blue" | "green" | "purple" | "indigo";
  Alerta_Descalce: boolean;
  Gasto_Pendiente?: boolean;
  Monto_Gasto?: number;
  ID_Tarjeta_Gasto?: string | null;
  Tipo_Gasto?: TipoGasto;
  Recurrencia?: string | null;
  ID_Padre_Recurrente?: string | null;
}

