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

    // 11. Prestamos (Loans) Table
    db.run(`
      CREATE TABLE IF NOT EXISTS prestamos (
        ID_Prestamo TEXT PRIMARY KEY,
        ID_Usuario TEXT,
        Monto_Prestado REAL NOT NULL,
        Monto_A_Pagar REAL NOT NULL,
        Fecha_Inicio TEXT NOT NULL,
        Fecha_Limite TEXT NOT NULL,
        FOREIGN KEY(ID_Usuario) REFERENCES usuarios(ID_Usuario) ON DELETE CASCADE
      )
    `);

    // Execute safe run-time migrations for eventos, micrometas and egresos
    db.run("ALTER TABLE eventos ADD COLUMN Gasto_Pendiente INTEGER DEFAULT 0", () => {});
    db.run("ALTER TABLE eventos ADD COLUMN Monto_Gasto REAL DEFAULT 0", () => {});
    db.run("ALTER TABLE eventos ADD COLUMN ID_Tarjeta_Gasto TEXT", () => {});
    db.run("ALTER TABLE eventos ADD COLUMN Tipo_Gasto TEXT", () => {});
    db.run("ALTER TABLE eventos ADD COLUMN Recurrencia TEXT", () => {});
    db.run("ALTER TABLE eventos ADD COLUMN ID_Padre_Recurrente TEXT", () => {});

    db.run("ALTER TABLE micrometas ADD COLUMN Recurrencia TEXT", () => {});
    db.run("ALTER TABLE micrometas ADD COLUMN ID_Padre_Recurrente TEXT", () => {});
    db.run("ALTER TABLE egresos ADD COLUMN Recurrente INTEGER DEFAULT 0", () => {});

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
