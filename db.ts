import sqlite3 from "sqlite3";
import crypto from "crypto";
import path from "path";

const dbPath = path.join(process.cwd(), "database.sqlite");
const db = new sqlite3.Database(dbPath);

// Cryptographic Password Hashing using built-in Node.js crypto
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function seedUserPilares(userId: string) {
  const pilares = [
    // Raíces
    { id: `pilar-crecimiento-${userId}`, nombre: "Crecimiento", padre: null, color: "blue" },
    { id: `pilar-salud-${userId}`, nombre: "Salud", padre: null, color: "green" },
    { id: `pilar-economico-${userId}`, nombre: "Económico", padre: null, color: "orange" },
    { id: `pilar-entorno-${userId}`, nombre: "Entorno", padre: null, color: "purple" },
    
    // Subpilares de Crecimiento
    { id: `subpilar-escolar-${userId}`, nombre: "Escolar", padre: `pilar-crecimiento-${userId}`, color: "blue" },
    { id: `subpilar-laboral-${userId}`, nombre: "Laboral", padre: `pilar-crecimiento-${userId}`, color: "blue" },
    
    // Subpilares de Salud
    { id: `subpilar-descanso-${userId}`, nombre: "Descanso", padre: `pilar-salud-${userId}`, color: "green" },
    { id: `subpilar-alimentacion-${userId}`, nombre: "Alimentación", padre: `pilar-salud-${userId}`, color: "green" },
    
    // Subpilares de Económico
    { id: `subpilar-ingresos-${userId}`, nombre: "Ingresos", padre: `pilar-economico-${userId}`, color: "orange" },
    { id: `subpilar-ahorro-${userId}`, nombre: "Ahorro", padre: `pilar-economico-${userId}`, color: "orange" },
    { id: `subpilar-gasto-${userId}`, nombre: "Gasto", padre: `pilar-economico-${userId}`, color: "orange" },
    
    // Subpilares de Entorno
    { id: `subpilar-hogar-${userId}`, nombre: "Hogar", padre: `pilar-entorno-${userId}`, color: "purple" },
    { id: `subpilar-moto-${userId}`, nombre: "Moto", padre: `pilar-entorno-${userId}`, color: "purple" },
    { id: `subpilar-amigos-${userId}`, nombre: "Amigos", padre: `pilar-entorno-${userId}`, color: "purple" },
    { id: `subpilar-salidas-${userId}`, nombre: "Salidas", padre: `pilar-entorno-${userId}`, color: "purple" }
  ];

  pilares.forEach(p => {
    db.run(`
      INSERT OR IGNORE INTO pilares (ID_Pilar, ID_Usuario, Nombre, ID_Padre, Color)
      VALUES (?, ?, ?, ?, ?)
    `, [p.id, userId, p.nombre, p.padre, p.color]);
  });

  const correlaciones = [
    // Escolar <-> Laboral (bidireccional)
    { id: `corr-esc-lab-1-${userId}`, orig: `subpilar-escolar-${userId}`, dest: `subpilar-laboral-${userId}` },
    { id: `corr-esc-lab-2-${userId}`, orig: `subpilar-laboral-${userId}`, dest: `subpilar-escolar-${userId}` },

    // Laboral -> Ingresos
    { id: `corr-lab-ing-${userId}`, orig: `subpilar-laboral-${userId}`, dest: `subpilar-ingresos-${userId}` },

    // Laboral <-> Descanso (bidireccional)
    { id: `corr-lab-des-1-${userId}`, orig: `subpilar-laboral-${userId}`, dest: `subpilar-descanso-${userId}` },
    { id: `corr-lab-des-2-${userId}`, orig: `subpilar-descanso-${userId}`, dest: `subpilar-laboral-${userId}` },

    // Descanso <-> Alimentación (bidireccional)
    { id: `corr-des-ali-1-${userId}`, orig: `subpilar-descanso-${userId}`, dest: `subpilar-alimentacion-${userId}` },
    { id: `corr-des-ali-2-${userId}`, orig: `subpilar-alimentacion-${userId}`, dest: `subpilar-descanso-${userId}` },

    // Hogar -> Descanso, Hogar -> Gasto
    { id: `corr-hog-des-${userId}`, orig: `subpilar-hogar-${userId}`, dest: `subpilar-descanso-${userId}` },
    { id: `corr-hog-gas-${userId}`, orig: `subpilar-hogar-${userId}`, dest: `subpilar-gasto-${userId}` },

    // Moto -> Gasto, Moto -> Descanso
    { id: `corr-mot-gas-${userId}`, orig: `subpilar-moto-${userId}`, dest: `subpilar-gasto-${userId}` },
    { id: `corr-mot-des-${userId}`, orig: `subpilar-moto-${userId}`, dest: `subpilar-descanso-${userId}` },

    // Amigos -> Salidas, Amigos -> Gasto
    { id: `corr-ami-sal-${userId}`, orig: `subpilar-amigos-${userId}`, dest: `subpilar-salidas-${userId}` },
    { id: `corr-ami-gas-${userId}`, orig: `subpilar-amigos-${userId}`, dest: `subpilar-gasto-${userId}` },

    // Entorno -> Salidas
    { id: `corr-ent-sal-${userId}`, orig: `pilar-entorno-${userId}`, dest: `subpilar-salidas-${userId}` },

    // Salidas -> Descanso, Salidas -> Gasto
    { id: `corr-sal-des-${userId}`, orig: `subpilar-salidas-${userId}`, dest: `subpilar-descanso-${userId}` },
    { id: `corr-sal-gas-${userId}`, orig: `subpilar-salidas-${userId}`, dest: `subpilar-gasto-${userId}` },

    // Ingresos -> Ahorro -> Gasto
    { id: `corr-ing-aho-${userId}`, orig: `subpilar-ingresos-${userId}`, dest: `subpilar-ahorro-${userId}` },
    { id: `corr-aho-gas-${userId}`, orig: `subpilar-ahorro-${userId}`, dest: `subpilar-gasto-${userId}` }
  ];

  correlaciones.forEach(c => {
    db.run(`
      INSERT OR IGNORE INTO correlaciones_pilares (ID_Correlacion, ID_Usuario, ID_Origen, ID_Destino)
      VALUES (?, ?, ?, ?)
    `, [c.id, userId, c.orig, c.dest]);
  });
}

export function initDatabase() {
  db.serialize(() => {
    // 1. Usuarios Table
    db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        ID_Usuario TEXT PRIMARY KEY,
        Nombre_Usuario TEXT NOT NULL,
        Gmail_Sincronizado TEXT UNIQUE NOT NULL,
        Password_Hash TEXT NOT NULL,
        Correo_Google TEXT,
        Google_Calendar_ID TEXT,
        Fecha_Registro TEXT,
        Plan_Suscripcion TEXT,
        Estado_Licencia TEXT,
        Tope_Amoroso_Porcentaje REAL DEFAULT 0.30,
        Salud_Personal_Base_Porcentaje REAL DEFAULT 0.20
      )
    `);

    // 2. Ingresos Table
    db.run(`
      CREATE TABLE IF NOT EXISTS ingresos (
        ID_Ingreso TEXT PRIMARY KEY,
        ID_Usuario TEXT,
        Fecha TEXT,
        Concepto TEXT,
        Categoria TEXT,
        Monto_Neto REAL,
        Monto_Bruto REAL,
        Cuenta_Destino TEXT,
        FOREIGN KEY(ID_Usuario) REFERENCES usuarios(ID_Usuario) ON DELETE CASCADE
      )
    `);

    // 3. Deudas (Tarjetas/Monederos) Table
    db.run(`
      CREATE TABLE IF NOT EXISTS deudas (
        ID_Instrumento TEXT PRIMARY KEY,
        ID_Usuario TEXT,
        ID_Tarjeta TEXT,
        Nombre_Tarjeta TEXT,
        Nombre_Instrumento TEXT,
        Tipo TEXT,
        Limite_Credito REAL,
        Saldo_Disponible REAL,
        Saldo_Al_Corte REAL,
        Deuda_Actual REAL,
        Pago_Minimo REAL,
        Pago_Para_No_Generar_Intereses REAL,
        Fecha_Corte INTEGER,
        Fecha_Limite_Pago INTEGER,
        Tasa_Interes_Anual REAL,
        Balance_Total_Pendiente REAL,
        Pago_Minimo_Mensual REAL,
        Pilar TEXT DEFAULT 'Económico',
        FOREIGN KEY(ID_Usuario) REFERENCES usuarios(ID_Usuario) ON DELETE CASCADE
      )
    `, () => {
      // Execute safe run-time migration to add Pilar column if table already exists in existing installations
      db.run("ALTER TABLE deudas ADD COLUMN Pilar TEXT DEFAULT 'Económico'", () => {});
    });

    // 4. Egresos Table
    db.run(`
      CREATE TABLE IF NOT EXISTS egresos (
        ID_Egreso TEXT PRIMARY KEY,
        ID_Usuario TEXT,
        ID_Actividad_Origen TEXT,
        ID_Tarjeta_Utilizada TEXT,
        Fecha TEXT,
        Concepto TEXT,
        Categoria_Pilar TEXT,
        Subcategoria TEXT,
        Monto REAL,
        Metodo_Pago TEXT,
        Tipo_Gasto TEXT,
        FOREIGN KEY(ID_Usuario) REFERENCES usuarios(ID_Usuario) ON DELETE CASCADE
      )
    `);

    // 5. Metas Table
    db.run(`
      CREATE TABLE IF NOT EXISTS metas (
        ID_Meta TEXT PRIMARY KEY,
        ID_Usuario TEXT,
        Pilar TEXT,
        Meta_SMART TEXT,
        Indicador_Exito TEXT,
        Estado TEXT,
        Presupuesto_Asignado REAL,
        FOREIGN KEY(ID_Usuario) REFERENCES usuarios(ID_Usuario) ON DELETE CASCADE
      )
    `, () => {
      // Execute safe run-time migration for calendar properties
      db.run("ALTER TABLE metas ADD COLUMN Fecha_Meta TEXT", () => {});
      db.run("ALTER TABLE metas ADD COLUMN Sincronizar_Calendario INTEGER DEFAULT 0", () => {});
      db.run("ALTER TABLE metas ADD COLUMN ID_Evento_Calendario TEXT", () => {});
    });

    // 6. Eventos / Actividades Table
    db.run(`
      CREATE TABLE IF NOT EXISTS eventos (
        ID_Actividad TEXT PRIMARY KEY,
        ID_Usuario TEXT,
        ID_Evento TEXT,
        Tipo_Agenda TEXT,
        Pilar TEXT,
        Pilar_Asociado TEXT,
        Titulo_Actividad TEXT,
        Titulo TEXT,
        Descripcion_Detallada TEXT,
        Descripcion TEXT,
        Fecha_Hora_Inicio TEXT,
        Fecha_Hora_Fin TEXT,
        Requiere_Pago INTEGER, -- Boolean stored as 0 or 1
        ID_Egreso_Asociado TEXT,
        Fecha TEXT,
        Tipo_Evento TEXT,
        Color TEXT,
        Alerta_Descalce INTEGER, -- Boolean stored as 0 or 1
        FOREIGN KEY(ID_Usuario) REFERENCES usuarios(ID_Usuario) ON DELETE CASCADE
      )
    `);

    // 7. Pilares Table
    db.run(`
      CREATE TABLE IF NOT EXISTS pilares (
        ID_Pilar TEXT PRIMARY KEY,
        ID_Usuario TEXT,
        Nombre TEXT NOT NULL,
        ID_Padre TEXT,
        Color TEXT,
        FOREIGN KEY(ID_Usuario) REFERENCES usuarios(ID_Usuario) ON DELETE CASCADE
      )
    `);

    // 8. Correlaciones Pilares Table
    db.run(`
      CREATE TABLE IF NOT EXISTS correlaciones_pilares (
        ID_Correlacion TEXT PRIMARY KEY,
        ID_Usuario TEXT,
        ID_Origen TEXT NOT NULL,
        ID_Destino TEXT NOT NULL,
        FOREIGN KEY(ID_Usuario) REFERENCES usuarios(ID_Usuario) ON DELETE CASCADE,
        FOREIGN KEY(ID_Origen) REFERENCES pilares(ID_Pilar) ON DELETE CASCADE,
        FOREIGN KEY(ID_Destino) REFERENCES pilares(ID_Pilar) ON DELETE CASCADE
      )
    `);

    // 9. Micrometas Table
    db.run(`
      CREATE TABLE IF NOT EXISTS micrometas (
        ID_Micrometa TEXT PRIMARY KEY,
        ID_Usuario TEXT,
        ID_Meta TEXT,
        Titulo TEXT NOT NULL,
        Estado TEXT DEFAULT 'Pendiente',
        Genera_Gasto INTEGER DEFAULT 0,
        Monto_Gasto REAL DEFAULT 0,
        Gasto_Pendiente INTEGER DEFAULT 0,
        ID_Tarjeta_Gasto TEXT,
        Fecha_Planificada TEXT,
        Sincronizar_Calendario INTEGER DEFAULT 0,
        ID_Evento_Calendario TEXT,
        FOREIGN KEY(ID_Usuario) REFERENCES usuarios(ID_Usuario) ON DELETE CASCADE,
        FOREIGN KEY(ID_Meta) REFERENCES metas(ID_Meta) ON DELETE CASCADE
      )
    `);

    // 10. Correlaciones Micrometas Table
    db.run(`
      CREATE TABLE IF NOT EXISTS correlaciones_micrometas (
        ID_Correlacion TEXT PRIMARY KEY,
        ID_Usuario TEXT,
        ID_Micrometa TEXT NOT NULL,
        ID_Pilar TEXT NOT NULL,
        FOREIGN KEY(ID_Usuario) REFERENCES usuarios(ID_Usuario) ON DELETE CASCADE,
        FOREIGN KEY(ID_Micrometa) REFERENCES micrometas(ID_Micrometa) ON DELETE CASCADE
      )
    `);
    // Execute safe run-time migrations for eventos and micrometas
    db.run("ALTER TABLE eventos ADD COLUMN Gasto_Pendiente INTEGER DEFAULT 0", () => {});
    db.run("ALTER TABLE eventos ADD COLUMN Monto_Gasto REAL DEFAULT 0", () => {});
    db.run("ALTER TABLE eventos ADD COLUMN ID_Tarjeta_Gasto TEXT", () => {});
    db.run("ALTER TABLE eventos ADD COLUMN Tipo_Gasto TEXT", () => {});
    db.run("ALTER TABLE eventos ADD COLUMN Recurrencia TEXT", () => {});
    db.run("ALTER TABLE eventos ADD COLUMN ID_Padre_Recurrente TEXT", () => {});

    db.run("ALTER TABLE micrometas ADD COLUMN Recurrencia TEXT", () => {});
    db.run("ALTER TABLE micrometas ADD COLUMN ID_Padre_Recurrente TEXT", () => {});

    // Seed Initial User (Salvador Gómez) if database is empty
    db.get("SELECT COUNT(*) as count FROM usuarios", (err, row: any) => {
      if (err) {
        console.error("Error checking usuarios count:", err);
        return;
      }
      if (row.count === 0) {
        console.log("Seeding initial user and database entries...");
        const defaultHash = hashPassword("password123");

        // Seed Users
        db.run(`
          INSERT INTO usuarios (ID_Usuario, Nombre_Usuario, Gmail_Sincronizado, Password_Hash, Correo_Google, Google_Calendar_ID, Fecha_Registro, Plan_Suscripcion, Estado_Licencia, Tope_Amoroso_Porcentaje, Salud_Personal_Base_Porcentaje)
          VALUES ('user-salvador-gomez-11111', 'Ing. Salvador Gómez', 'salvador.gomez.dev@gmail.com', ?, 'salvador.gomez.dev@gmail.com', 'salvador_gomez_cal_5p', '2026-01-10', 'Premium_5P', 'Activo', 0.30, 0.20)
        `, [defaultHash]);

        db.run(`
          INSERT INTO usuarios (ID_Usuario, Nombre_Usuario, Gmail_Sincronizado, Password_Hash, Correo_Google, Google_Calendar_ID, Fecha_Registro, Plan_Suscripcion, Estado_Licencia, Tope_Amoroso_Porcentaje, Salud_Personal_Base_Porcentaje)
          VALUES ('user-beatriz-peralta-22222', 'Lic. Beatriz Peralta', 'beatriz.peralta.design@gmail.com', ?, 'beatriz.peralta.design@gmail.com', 'beatriz_peralta_cal_5p', '2026-03-15', 'Elite_Mentor', 'Activo', 0.25, 0.15)
        `, [defaultHash], () => {
          // Seed flowchart nodes and correlations
          seedUserPilares('user-salvador-gomez-11111');
          seedUserPilares('user-beatriz-peralta-22222');
        });

        // Seed Ingresos
        db.run(`
          INSERT INTO ingresos (ID_Ingreso, ID_Usuario, Fecha, Concepto, Categoria, Monto_Neto, Monto_Bruto, Cuenta_Destino)
          VALUES ('ing-1111', 'user-salvador-gomez-11111', '2026-06-01', 'Fórmula de Nómina Principal - Desarrollador Senior DevCorp', 'Nómina', 3200.00, 3200.00, 'Citi Checking Débito')
        `);
        db.run(`
          INSERT INTO ingresos (ID_Ingreso, ID_Usuario, Fecha, Concepto, Categoria, Monto_Neto, Monto_Bruto, Cuenta_Destino)
          VALUES ('ing-1112', 'user-salvador-gomez-11111', '2026-06-05', 'Freelance - Taller de Arquitectura Cloud', 'Freelance', 950.00, 950.00, 'Citi Checking Débito')
        `);

        // Seed Deudas (Cards)
        db.run(`
          INSERT INTO deudas (ID_Instrumento, ID_Usuario, ID_Tarjeta, Nombre_Tarjeta, Nombre_Instrumento, Tipo, Limite_Credito, Saldo_Disponible, Saldo_Al_Corte, Deuda_Actual, Pago_Minimo, Pago_Para_No_Generar_Intereses, Fecha_Corte, Fecha_Limite_Pago, Tasa_Interes_Anual, Balance_Total_Pendiente, Pago_Minimo_Mensual)
          VALUES ('card-salvador-citidebit', 'user-salvador-gomez-11111', 'card-salvador-citidebit', 'Citi Checking Débito', 'Citi Checking Débito', 'Débito', 0, 4150.00, 0, 0, 0, 0, 1, 1, 0, 0, 0)
        `);
        db.run(`
          INSERT INTO deudas (ID_Instrumento, ID_Usuario, ID_Tarjeta, Nombre_Tarjeta, Nombre_Instrumento, Tipo, Limite_Credito, Saldo_Disponible, Saldo_Al_Corte, Deuda_Actual, Pago_Minimo, Pago_Para_No_Generar_Intereses, Fecha_Corte, Fecha_Limite_Pago, Tasa_Interes_Anual, Balance_Total_Pendiente, Pago_Minimo_Mensual)
          VALUES ('card-salvador-cititdc', 'user-salvador-gomez-11111', 'card-salvador-cititdc', 'TDC Platino Citibank', 'TDC Platino Citibank', 'Crédito', 10000.00, 5800.00, 4200.00, 4200.00, 180.00, 650.00, 15, 5, 48.5, 4200.00, 180.00)
        `);
        db.run(`
          INSERT INTO deudas (ID_Instrumento, ID_Usuario, ID_Tarjeta, Nombre_Tarjeta, Nombre_Instrumento, Tipo, Limite_Credito, Saldo_Disponible, Saldo_Al_Corte, Deuda_Actual, Pago_Minimo, Pago_Para_No_Generar_Intereses, Fecha_Corte, Fecha_Limite_Pago, Tasa_Interes_Anual, Balance_Total_Pendiente, Pago_Minimo_Mensual)
          VALUES ('card-salvador-santandertdc', 'user-salvador-gomez-11111', 'card-salvador-santandertdc', 'TDC Santander Light', 'TDC Santander Light', 'Crédito', 5000.00, 3100.00, 1900.00, 1900.00, 95.00, 550.00, 12, 2, 42.0, 1900.00, 95.00)
        `);

        // Seed Egresos
        db.run(`
          INSERT INTO egresos (ID_Egreso, ID_Usuario, ID_Actividad_Origen, ID_Tarjeta_Utilizada, Fecha, Concepto, Categoria_Pilar, Subcategoria, Monto, Metodo_Pago, Tipo_Gasto)
          VALUES ('egr-1111', 'user-salvador-gomez-11111', NULL, 'card-salvador-citidebit', '2026-06-02', 'Renta de Departamento', 'Necesidad_Esencial', 'Vivienda Mensual', 1200.00, 'Citi Checking Débito', 'Fijo')
        `);
        db.run(`
          INSERT INTO egresos (ID_Egreso, ID_Usuario, ID_Actividad_Origen, ID_Tarjeta_Utilizada, Fecha, Concepto, Categoria_Pilar, Subcategoria, Monto, Metodo_Pago, Tipo_Gasto)
          VALUES ('egr-1112', 'user-salvador-gomez-11111', 'act-1111', 'card-salvador-citidebit', '2026-06-03', 'Inscripción Nutrición Integral', 'Salud', 'Control de Peso', 120.00, 'Citi Checking Débito', 'Variable')
        `);
        db.run(`
          INSERT INTO egresos (ID_Egreso, ID_Usuario, ID_Actividad_Origen, ID_Tarjeta_Utilizada, Fecha, Concepto, Categoria_Pilar, Subcategoria, Monto, Metodo_Pago, Tipo_Gasto)
          VALUES ('egr-1113', 'user-salvador-gomez-11111', 'act-1112', 'card-salvador-cititdc', '2026-06-05', 'Examen AWS Cloud practitioner', 'Laboral', 'Certificaciones', 180.00, 'TDC Platino Citibank', 'Variable')
        `);
        db.run(`
          INSERT INTO egresos (ID_Egreso, ID_Usuario, ID_Actividad_Origen, ID_Tarjeta_Utilizada, Fecha, Concepto, Categoria_Pilar, Subcategoria, Monto, Metodo_Pago, Tipo_Gasto)
          VALUES ('egr-1114', 'user-salvador-gomez-11111', NULL, 'card-salvador-cititdc', '2026-06-06', 'Suscripción streaming Netflix + Spotify', 'Personal', 'Entretenimiento Mensual', 35.00, 'TDC Platino Citibank', 'Fijo')
        `);
        db.run(`
          INSERT INTO egresos (ID_Egreso, ID_Usuario, ID_Actividad_Origen, ID_Tarjeta_Utilizada, Fecha, Concepto, Categoria_Pilar, Subcategoria, Monto, Metodo_Pago, Tipo_Gasto)
          VALUES ('egr-1115', 'user-salvador-gomez-11111', 'act-1113', 'card-salvador-cititdc', '2026-06-07', 'Cena Romántica', 'Amoroso', 'Esparcimiento Social', 150.00, 'TDC Platino Citibank', 'Variable')
        `);

        // Seed Metas
        db.run(`
          INSERT INTO metas (ID_Meta, ID_Usuario, Pilar, Meta_SMART, Indicador_Exito, Estado, Presupuesto_Asignado)
          VALUES ('meta-s1', 'user-salvador-gomez-11111', 'Personal', 'Meditar 15 minutos diarios por las mañanas y leer 1 libro mensual de crecimiento.', 'Racha de 90% días meditando en app de hábitos', 'En Proceso', 0.00)
        `);
        db.run(`
          INSERT INTO metas (ID_Meta, ID_Usuario, Pilar, Meta_SMART, Indicador_Exito, Estado, Presupuesto_Asignado)
          VALUES ('meta-s2', 'user-salvador-gomez-11111', 'Escolar', 'Completar tesis del Máster Tecnológico con promedio mínimo de 9.2 antes de fin de año.', 'Asesor de tesis autoriza los capítulos 1 y 2', 'En Proceso', 600.00)
        `);
        db.run(`
          INSERT INTO metas (ID_Meta, ID_Usuario, Pilar, Meta_SMART, Indicador_Exito, Estado, Presupuesto_Asignado)
          VALUES ('meta-s3', 'user-salvador-gomez-11111', 'Salud', 'Reducir el porcentaje de grasa y colesterol asistiendo con nutriólogo mensualmente.', 'Biometría hemática con niveles de lípidos normales', 'En Proceso', 120.00)
        `);
        db.run(`
          INSERT INTO metas (ID_Meta, ID_Usuario, Pilar, Meta_SMART, Indicador_Exito, Estado, Presupuesto_Asignado)
          VALUES ('meta-s4', 'user-salvador-gomez-11111', 'Laboral', 'Conseguir certificación AWS Solution Architect Professional.', 'Certificado digital oficial emitido por AWS', 'En Proceso', 180.00)
        `);

        // Seed Eventos
        db.run(`
          INSERT INTO eventos (ID_Actividad, ID_Usuario, ID_Evento, Tipo_Agenda, Pilar, Pilar_Asociado, Titulo_Actividad, Titulo, Descripcion_Detallada, Descripcion, Fecha_Hora_Inicio, Fecha_Hora_Fin, Requiere_Pago, ID_Egreso_Asociado, Fecha, Tipo_Evento, Color, Alerta_Descalce)
          VALUES ('act-1111', 'user-salvador-gomez-11111', 'act-1111', 'Cita_Médica', 'Salud', 'Salud', '🩺 Cita Médica Nutriólogo', '🩺 Cita Médica Nutriólogo', 'Evaluación corporal mensual e indicaciones de régimen semanal.', 'Evaluación corporal mensual e indicaciones de régimen semanal.', '2026-06-03T09:00', '2026-06-03T10:00', 1, 'egr-1112', '2026-06-03', 'Sesión Mentoría', 'green', 0)
        `);
        db.run(`
          INSERT INTO eventos (ID_Actividad, ID_Usuario, ID_Evento, Tipo_Agenda, Pilar, Pilar_Asociado, Titulo_Actividad, Titulo, Descripcion_Detallada, Descripcion, Fecha_Hora_Inicio, Fecha_Hora_Fin, Requiere_Pago, ID_Egreso_Asociado, Fecha, Tipo_Evento, Color, Alerta_Descalce)
          VALUES ('act-1112', 'user-salvador-gomez-11111', 'act-1112', 'Control_Escolar', 'Laboral', 'Laboral', '🚀 Examen Certificación AWS', '🚀 Examen Certificación AWS', 'Examen de certificación AWS Solution Architect Cloud Practitioner.', 'Examen de certificación AWS Solution Architect Cloud Practitioner.', '2026-06-05T14:30', '2026-06-05T17:00', 1, 'egr-1113', '2026-06-05', 'Bloque Académico', 'blue', 0)
        `);
        db.run(`
          INSERT INTO eventos (ID_Actividad, ID_Usuario, ID_Evento, Tipo_Agenda, Pilar, Pilar_Asociado, Titulo_Actividad, Titulo, Descripcion_Detallada, Descripcion, Fecha_Hora_Inicio, Fecha_Hora_Fin, Requiere_Pago, ID_Egreso_Asociado, Fecha, Tipo_Evento, Color, Alerta_Descalce)
          VALUES ('act-1113', 'user-salvador-gomez-11111', 'act-1113', 'Agenda_Personal', 'Amoroso', 'Amoroso', '🍷 Cena Romántica Aniversario', '🍷 Cena Romántica Aniversario', 'Cena de aniversario en Bistro Francés.', 'Cena de aniversario en Bistro Francés.', '2026-06-07T20:00', '2026-06-07T22:30', 1, 'egr-1115', '2026-06-07', 'Evaluación Mínima', 'purple', 0)
        `);
        db.run(`
          INSERT INTO eventos (ID_Actividad, ID_Usuario, ID_Evento, Tipo_Agenda, Pilar, Pilar_Asociado, Titulo_Actividad, Titulo, Descripcion_Detallada, Descripcion, Fecha_Hora_Inicio, Fecha_Hora_Fin, Requiere_Pago, ID_Egreso_Asociado, Fecha, Tipo_Evento, Color, Alerta_Descalce)
          VALUES ('act-1114', 'user-salvador-gomez-11111', 'act-1114', 'Agenda_Laboral', 'Escolar', 'Escolar', '📚 Sesión de Estudio de Tesis', '📚 Sesión de Estudio de Tesis', 'Bloque intensivo de redacción de metodología de tesis en biblioteca.', 'Bloque intensivo de redacción de metodología de tesis en biblioteca.', '2026-06-08T10:00', '2026-06-08T12:00', 0, NULL, '2026-06-08', 'Bloque Académico', 'blue', 0)
        `);
      }
    });
  });
}

// Helpers to run DB queries in Promise wrapper
export function queryGet<T>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

export function queryAll<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export function queryRun(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
