import express from "express";
import { createClient } from "@libsql/client";

const app = express();
app.use(express.json({ limit: "50mb" }));

const url = (process.env.TURSO_DATABASE_URL || "").trim().replace(/['"]/g, '');
const token = (process.env.TURSO_AUTH_TOKEN || "").trim().replace(/['"]/g, '');
const client = createClient({ url: url || "", authToken: token });

// Status check (Super Fast)
app.get("/api/db/status", (req, res) => {
  res.json({ isRemote: !!url && url.startsWith("libsql") });
});

// Faster Pull (Removed the manual schema check)
app.get("/api/db/pull", async (req, res) => {
  try {
    const tables = ['users', 'products', 'customers', 'orders', 'deliveries', 'complaints', 'audit_logs'];
    const results = await Promise.all(tables.map(t => client.execute(`SELECT * FROM ${t}`).catch(() => ({ rows: [] }))));
    const data: any = {};
    tables.forEach((name, i) => { data[name] = results[i].rows; });
    res.json({ success: true, data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Universal Push
app.post("/api/db/push", async (req, res) => {
  const { table, rows } = req.body;
  try {
    // Clear and batch re-insert
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