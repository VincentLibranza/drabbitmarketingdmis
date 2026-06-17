import express from "express";
import { createClient } from "@libsql/client";

const app = express();
app.use(express.json({ limit: "50mb" }));

// 1. GET CREDENTIALS
const url = (process.env.TURSO_DATABASE_URL || "").trim().replace(/['"]/g, '');
const token = (process.env.TURSO_AUTH_TOKEN || "").trim().replace(/['"]/g, '');

// 2. INITIALIZE CLIENT
const client = createClient({
  url: url || "",
  authToken: token,
});

// 3. API ROUTES
app.get("/api/db/status", (req, res) => {
  res.json({
    connected: !!url && url.startsWith("libsql"),
    isVercel: true,
    url_preview: url ? url.substring(0, 15) + "..." : "MISSING"
  });
});

app.get("/api/db/pull", async (req, res) => {
  if (!url) return res.status(500).json({ error: "DB URL Missing" });
  try {
    // ERD 9-Table Query
    const tables = ['users', 'products', 'customers', 'orders', 'order_items', 'invoices', 'deliveries', 'complaints', 'audit_logs'];
    const results = await Promise.all(tables.map(t => client.execute(`SELECT * FROM ${t}`).catch(() => ({ rows: [] }))));
    const data: any = {};
    tables.forEach((name, i) => { data[name] = results[i].rows; });
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
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
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default app;