import express from "express";
import { createClient } from "@libsql/client";

const app = express();
app.use(express.json({ limit: "50mb" }));

const url = (process.env.TURSO_DATABASE_URL || "").trim().replace(/['"]/g, '');
const token = (process.env.TURSO_AUTH_TOKEN || "").trim().replace(/['"]/g, '');
const client = createClient({ url: url || "", authToken: token });

// Schema setup (ERD Compliant)
async function initSchema() {
  if (!url) return;
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
  for (const s of sqls) await client.execute(s);
}

app.get("/api/db/status", (req, res) => {
  res.json({ isRemote: !!url && url.startsWith("libsql"), databaseUrl: url });
});

app.get("/api/db/pull", async (req, res) => {
  try {
    await initSchema();
    const tables = ['users', 'products', 'customers', 'orders', 'order_items', 'invoices', 'deliveries', 'complaints', 'audit_logs'];
    const data: any = {};
    for (const t of tables) {
      const r = await client.execute(`SELECT * FROM ${t}`);
      data[t] = r.rows;
    }
    res.json({ success: true, data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/db/push", async (req, res) => {
  const { table, rows } = req.body;
  try {
    await client.execute(`DELETE FROM ${table}`);
    if (rows && rows.length > 0) {
      const keys = Object.keys(rows[0]);
      const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`;
      const stmts = rows.map(r => ({ sql, args: keys.map(k => r[k] ?? null) }));
      await client.batch(stmts, "write");
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
