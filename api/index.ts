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

// Schema setup (ERD Compliant)
async function initSchema() {
  if (!dbUrl || dbUrl === "file:local.db") return;
  const sqls = [
    `CREATE TABLE IF NOT EXISTS users (UserID TEXT PRIMARY KEY, Username TEXT, Password TEXT, Role TEXT, Status TEXT)`,
    `CREATE TABLE IF NOT EXISTS products (ProdID TEXT PRIMARY KEY, ProdName TEXT, Category TEXT, UnitPrice REAL, StockQty INTEGER, MinLevel INTEGER)`,
    `CREATE TABLE IF NOT EXISTS customers (CustID TEXT PRIMARY KEY, CustName TEXT, Contact TEXT, Address TEXT, Email TEXT)`,
    `CREATE TABLE IF NOT EXISTS orders (OrdID TEXT PRIMARY KEY, OrdRefNo TEXT, CustID TEXT, OrdDate TEXT, Status TEXT, UserID TEXT)`,
    `CREATE TABLE IF NOT EXISTS order_items (ItemID TEXT PRIMARY KEY, OrdID TEXT, ProdID TEXT, Quantity INTEGER, UnitPrice REAL)`,
    `CREATE TABLE IF NOT EXISTS invoices (InvID TEXT PRIMARY KEY, OrdID TEXT, InvDate TEXT, TotalAmt REAL, PayStatus TEXT)`,
    `CREATE TABLE IF NOT EXISTS deliveries (DelID TEXT PRIMARY KEY, OrdID TEXT, SchDate TEXT, DelDate TEXT, Status TEXT)`,
    `CREATE TABLE IF NOT EXISTS complaints (ComplID TEXT PRIMARY KEY, CustID TEXT, Description TEXT, Status TEXT, Resolution TEXT)`,
    `CREATE TABLE IF NOT EXISTS audit_logs (LogID TEXT PRIMARY KEY, UserID TEXT, Action TEXT, Timestamp TEXT, TableRef TEXT)`
  ];
  for (const s of sqls) {
    try {
      await executeWithRetry(() => getDbClient().execute(s));
    } catch (err) {
      console.error(`[Vercel Serverless DB] Error creating table statement: ${s}`, err);
    }
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

app.get(["/api/db/pull", "/db/pull"], async (req, res) => {
  try {
    await initSchema();
    const tables = ['users', 'products', 'customers', 'orders', 'order_items', 'invoices', 'deliveries', 'complaints', 'audit_logs'];
    const data: any = {};
    for (const t of tables) {
      try {
        const r = await executeWithRetry(() => getDbClient().execute(`SELECT * FROM ${t}`)) as any;
        data[t] = r.rows || [];
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
      const keys = Object.keys(rows[0]);
      const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`;
      const stmts = rows.map(r => ({ sql, args: keys.map(k => r[k] ?? null) }));
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
      "DROP TABLE IF EXISTS order_items",
      "DROP TABLE IF EXISTS invoices",
      "DROP TABLE IF EXISTS deliveries",
      "DROP TABLE IF EXISTS complaints",
      "DROP TABLE IF EXISTS audit_logs"
    ], "write"));
    
    await initSchema();
    res.json({ success: true, message: "Database tables dropped and reset to baseline!" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
