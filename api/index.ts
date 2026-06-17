import express from "express";
import { createClient } from "@libsql/client";

const app = express();
app.use(express.json({ limit: "50mb" }));

// 1. GET CREDENTIALS
const url = (process.env.TURSO_DATABASE_URL || "").trim().replace(/['"]/g, '');
const token = (process.env.TURSO_AUTH_TOKEN || "").trim().replace(/['"]/g, '');
const client = createClient({ url: url || "", authToken: token });

// 2. CONNECTION STATUS (This is what controls the banner)
app.get("/api/db/status", (req, res) => {
  res.json({ 
    isRemote: !!url && url.startsWith("libsql"), 
    databaseUrl: url 
  });
});

// 3. UNIVERSAL PULL (Gets all 9 tables from ERD)
app.get("/api/db/pull", async (req, res) => {
  try {
    const tables = ['users', 'products', 'customers', 'orders', 'order_items', 'invoices', 'deliveries', 'complaints', 'audit_logs'];
    const results = await Promise.all(tables.map(t => client.execute(`SELECT * FROM ${t}`).catch(() => ({ rows: [] }))));
    const data: any = {};
    tables.forEach((name, i) => { data[name] = results[i].rows; });
    res.json({ success: true, data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 4. UNIVERSAL PUSH (Saves browser data to Cloud automatically)
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