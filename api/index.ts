import express from "express";
import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";

const app = express();
app.use(express.json({ limit: "50mb" }));

const configFilePath = path.join(process.cwd(), "turso-config.json");

let rawUrl = process.env.TURSO_DATABASE_URL || "";
let rawToken = process.env.TURSO_AUTH_TOKEN || "";

if (!rawUrl && fs.existsSync(configFilePath)) {
  try {
    const fileContent = fs.readFileSync(configFilePath, "utf8");
    const parsed = JSON.parse(fileContent);
    if (parsed.databaseUrl) {
      rawUrl = parsed.databaseUrl.trim();
      rawToken = (parsed.authToken || "").trim();
      console.log(`[Vercel Serverless DB] Restored database connection URL from turso-config.json: ${rawUrl}`);
    }
  } catch (err) {
    console.error("[Vercel Serverless DB] Failed to read turso-config.json:", err);
  }
}

// Strip quotes
if (rawUrl) {
  if (rawUrl.startsWith('"') && rawUrl.endsWith('"')) {
    rawUrl = rawUrl.slice(1, -1).trim();
  } else if (rawUrl.startsWith("'") && rawUrl.endsWith("'")) {
    rawUrl = rawUrl.slice(1, -1).trim();
  }
}
if (rawToken) {
  if (rawToken.startsWith('"') && rawToken.endsWith('"')) {
    rawToken = rawToken.slice(1, -1).trim();
  } else if (rawToken.startsWith("'") && rawToken.endsWith("'")) {
    rawToken = rawToken.slice(1, -1).trim();
  }
}

let dbUrl = rawUrl || "file:local.db";
let dbAuthToken = rawToken || undefined;
let dbClientInstance: any = null;

function getDbClient() {
  if (!dbClientInstance) {
    dbClientInstance = createClient({
      url: dbUrl,
      authToken: dbAuthToken,
    });
  }
  return dbClientInstance;
}

// Transparent lazy evaluation proxy matching SQL execution API with retry
async function executeWithRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errMsg = err.message || String(err);
      const isTransient = 
        errMsg.includes("502") || 
        errMsg.includes("503") || 
        errMsg.includes("504") ||
        errMsg.includes("SERVER_ERROR") ||
        errMsg.includes("HttpServerError") ||
        errMsg.includes("socket hang up") ||
        errMsg.includes("ETIMEDOUT") ||
        errMsg.includes("ECONNRESET");

      if (isTransient && attempt < maxRetries) {
        const nextDelay = initialDelay * Math.pow(1.5, attempt - 1);
        console.warn(`[Vercel Serverless DB Retry] Transient error (attempt ${attempt}/${maxRetries}): ${errMsg}. Retrying in ${Math.round(nextDelay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, nextDelay));
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

async function checkAndSelfHealTable(tableName: string, createSql: string, expectedColumns: string[]) {
  const clientInst = getDbClient();
  try {
    // 1. Check if table exists
    const rowCountRes = await clientInst.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`) as any;
    if (rowCountRes.rows.length === 0) {
      console.log(`[Vercel Serverless DB] Table ${tableName} does not exist. Creating cleanly...`);
      await clientInst.execute(createSql);
      return;
    }

    // 2. Fetch column information
    const pragmaRes = await clientInst.execute(`PRAGMA table_info(${tableName})`) as any;
    const existingColumns = (pragmaRes.rows || []).map((row: any) => String(row.name).toLowerCase());
    
    // 3. Check if all expected columns exist (case-insensitive)
    const needsHeal = expectedColumns.some(col => !existingColumns.includes(col.toLowerCase()));
    
    if (needsHeal) {
      console.warn(`[Vercel Serverless DB] Schema mismatch detected for table ${tableName}. Recreating to align schemas...`);
      await clientInst.execute(`DROP TABLE IF EXISTS ${tableName}`);
      await clientInst.execute(createSql);
    }
  } catch (err) {
    console.error(`[Vercel Serverless DB] Self-healing check failed for table ${tableName}:`, err);
    // Fallback: try to create if not exists
    try {
      await clientInst.execute(createSql);
    } catch (e) {}
  }
}

// Schema setup (ERD Compliant with Local Setup)
async function initSchema() {
  if (!dbUrl || dbUrl === "file:local.db") return;

  const tablesToVerify = [
    {
      name: "users",
      columns: ["userId", "username", "name", "role", "status"],
      sql: `CREATE TABLE IF NOT EXISTS users (
        userId TEXT PRIMARY KEY,
        username TEXT,
        name TEXT,
        role TEXT,
        status TEXT
      )`
    },
    {
      name: "products",
      columns: ["productId", "productName", "category", "unitPrice", "stockQuantity", "reorderThreshold"],
      sql: `CREATE TABLE IF NOT EXISTS products (
        productId TEXT PRIMARY KEY,
        productName TEXT,
        category TEXT,
        unitPrice REAL,
        stockQuantity INTEGER,
        reorderThreshold INTEGER
      )`
    },
    {
      name: "customers",
      columns: ["customerId", "customerName", "contact", "address", "email", "tin"],
      sql: `CREATE TABLE IF NOT EXISTS customers (
        customerId TEXT PRIMARY KEY,
        customerName TEXT,
        contact TEXT,
        address TEXT,
        email TEXT,
        tin TEXT
      )`
    },
    {
      name: "orders",
      columns: ["orderId", "orderRefNo", "customerId", "orderDate", "status", "paymentStatus", "totalAmount", "dueDate", "items"],
      sql: `CREATE TABLE IF NOT EXISTS orders (
        orderId TEXT PRIMARY KEY,
        orderRefNo TEXT,
        customerId TEXT,
        orderDate TEXT,
        status TEXT,
        paymentStatus TEXT,
        totalAmount REAL,
        dueDate TEXT,
        items TEXT
      )`
    },
    {
      name: "deliveries",
      columns: ["deliveryId", "orderId", "scheduledDate", "deliveryDate", "status", "assignedDriver"],
      sql: `CREATE TABLE IF NOT EXISTS deliveries (
        deliveryId TEXT PRIMARY KEY,
        orderId TEXT,
        scheduledDate TEXT,
        deliveryDate TEXT,
        status TEXT,
        assignedDriver TEXT
      )`
    },
    {
      name: "complaints",
      columns: ["complaintId", "customerId", "productId", "description", "status", "resolution", "dateLogged"],
      sql: `CREATE TABLE IF NOT EXISTS complaints (
        complaintId TEXT PRIMARY KEY,
        customerId TEXT,
        productId TEXT,
        description TEXT,
        status TEXT,
        resolution TEXT,
        dateLogged TEXT
      )`
    },
    {
      name: "audit_logs",
      columns: ["logId", "username", "action", "timestamp", "tableRef"],
      sql: `CREATE TABLE IF NOT EXISTS audit_logs (
        logId TEXT PRIMARY KEY,
        username TEXT,
        action TEXT,
        timestamp TEXT,
        tableRef TEXT
      )`
    },
    {
      name: "invoices",
      columns: ["invoiceId", "orderId", "invoiceDate", "totalAmount", "paymentStatus", "dueDate"],
      sql: `CREATE TABLE IF NOT EXISTS invoices (
        invoiceId TEXT PRIMARY KEY,
        orderId TEXT,
        invoiceDate TEXT,
        totalAmount REAL,
        paymentStatus TEXT,
        dueDate TEXT
      )`
    }
  ];

  try {
    for (const table of tablesToVerify) {
      await checkAndSelfHealTable(table.name, table.sql, table.columns);
    }
  } catch (err: any) {
    console.error("Failed to verify/self-heal tables in initSchema:", err);
  }
}

// Double mapped endpoints to support both stripped (Vercel) and non-stripped paths
app.get(["/api/db/status", "/db/status"], (req, res) => {
  let maskedUrl = dbUrl;
  if (dbUrl.startsWith("libsql://")) {
    const parts = dbUrl.replace("libsql://", "").split(".");
    const firstPart = parts[0] ? (parts[0].length > 6 ? parts[0].substring(0, 3) + "***" + parts[0].slice(-2) : "***") : "***";
    maskedUrl = `libsql://${firstPart}.${parts.slice(1).join(".")}`;
  }
  res.json({ 
    isRemote: !!dbUrl && dbUrl.startsWith("libsql"), 
    databaseUrl: maskedUrl,
    rawDatabaseUrl: dbUrl
  });
});

app.post(["/api/db/configure", "/db/configure"], async (req, res) => {
  const { databaseUrl, authToken } = req.body;
  if (!databaseUrl) {
    return res.status(400).json({ error: "TURSO_DATABASE_URL is required." });
  }

  try {
    const testClient = createClient({
      url: databaseUrl,
      authToken: authToken || undefined,
    });
    await testClient.execute("SELECT 1");

    // Persist configuration
    dbClientInstance = testClient;
    dbUrl = databaseUrl;
    dbAuthToken = authToken || undefined;

    try {
      fs.writeFileSync(
        configFilePath,
        JSON.stringify({ databaseUrl, authToken }, null, 2),
        "utf8"
      );
    } catch (saveErr) {
      console.error("[Vercel Serverless DB] Failed saving config file:", saveErr);
    }

    await initSchema();

    let maskedUrl = databaseUrl;
    if (databaseUrl.startsWith("libsql://")) {
      const parts = databaseUrl.replace("libsql://", "").split(".");
      const firstPart = parts[0] ? (parts[0].length > 6 ? parts[0].substring(0, 3) + "***" + parts[0].slice(-2) : "***") : "***";
      maskedUrl = `libsql://${firstPart}.${parts.slice(1).join(".")}`;
    }

    res.json({
      success: true,
      message: "Successfully connected to cloud Turso database!",
      connectionType: "Turso Cloud Database",
      databaseUrl: maskedUrl,
      isRemote: true
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function autoParseJson(val: any) {
  if (typeof val === "string" && (val.startsWith("[") || val.startsWith("{"))) {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

const SCHEMA_COLUMNS: Record<string, string[]> = {
  users: ["userId", "username", "name", "role", "status"],
  products: ["productId", "productName", "category", "unitPrice", "stockQuantity", "reorderThreshold"],
  customers: ["customerId", "customerName", "contact", "address", "email", "tin"],
  orders: ["orderId", "orderRefNo", "customerId", "orderDate", "status", "paymentStatus", "totalAmount", "dueDate", "items"],
  deliveries: ["deliveryId", "orderId", "scheduledDate", "deliveryDate", "status", "assignedDriver"],
  complaints: ["complaintId", "customerId", "productId", "description", "status", "resolution", "dateLogged"],
  audit_logs: ["logId", "username", "action", "timestamp", "tableRef"],
  invoices: ["invoiceId", "orderId", "invoiceDate", "totalAmount", "paymentStatus", "dueDate"]
};

app.get(["/api/db/pull", "/db/pull"], async (req, res) => {
  try {
    await initSchema();
    const tables = ['users', 'products', 'customers', 'orders', 'deliveries', 'complaints', 'audit_logs', 'invoices'];
    const data: any = {};
    for (const t of tables) {
      try {
        const r = await executeWithRetry(() => getDbClient().execute(`SELECT * FROM ${t}`)) as any;
        const expectedCols = SCHEMA_COLUMNS[t] || [];
        
        const rows = (r.rows || []).map((row: any) => {
          const parsedRow: any = {};
          
          // Row helper lookup in all lowercase
          const rowLower: any = {};
          for (const key of Object.keys(row)) {
            rowLower[key.toLowerCase()] = autoParseJson(row[key]);
          }

          // Format to desired casing
          for (const expectedCol of expectedCols) {
            const lowKey = expectedCol.toLowerCase();
            if (row[expectedCol] !== undefined) {
              parsedRow[expectedCol] = autoParseJson(row[expectedCol]);
            } else if (rowLower[lowKey] !== undefined) {
              parsedRow[expectedCol] = rowLower[lowKey];
            } else {
              parsedRow[expectedCol] = null;
            }
          }

          // Include any extra/unmapped keys with original casing as backup
          for (const key of Object.keys(row)) {
            const exists = expectedCols.some(c => c.toLowerCase() === key.toLowerCase());
            if (!exists) {
              parsedRow[key] = autoParseJson(row[key]);
            }
          }

          return parsedRow;
        });
        
        data[t] = rows;
      } catch (tableErr: any) {
        console.warn(`[Vercel Serverless DB] Table query failed for t: ${t}, returning []`, tableErr);
        data[t] = [];
      }
    }
    res.json({ success: true, data });
  } catch (e: any) { 
    res.status(500).json({ error: e.message }); 
  }
});

app.post(["/api/db/push", "/db/push"], async (req, res) => {
  const { table, rows } = req.body;
  try {
    const clientInst = getDbClient();
    await executeWithRetry(() => clientInst.execute(`DELETE FROM ${table}`));
    if (rows && rows.length > 0) {
      const allowedCols = SCHEMA_COLUMNS[table];
      // Only keep keys that are valid columns in our schema definitions
      const keys = Object.keys(rows[0]).filter(k => !allowedCols || allowedCols.includes(k));
      
      const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`;
      const stmts = rows.map(r => ({
        sql,
        args: keys.map(k => {
          const val = r[k];
          if (val !== null && typeof val === "object") {
            return JSON.stringify(val);
          }
          return val ?? null;
        })
      }));
      await executeWithRetry(() => clientInst.batch(stmts, "write"));
    }
    res.json({ success: true });
  } catch (e: any) { 
    res.status(500).json({ error: e.message }); 
  }
});

app.post(["/api/db/reset", "/db/reset"], async (req, res) => {
  try {
    const clientInst = getDbClient();
    await executeWithRetry(() => clientInst.batch([
      "DROP TABLE IF EXISTS users",
      "DROP TABLE IF EXISTS products",
      "DROP TABLE IF EXISTS customers",
      "DROP TABLE IF EXISTS orders",
      "DROP TABLE IF EXISTS deliveries",
      "DROP TABLE IF EXISTS complaints",
      "DROP TABLE IF EXISTS audit_logs",
      "DROP TABLE IF EXISTS invoices"
    ], "write"));
    
    await initSchema();
    res.json({ success: true, message: "Database tables dropped and reset to baseline!" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
