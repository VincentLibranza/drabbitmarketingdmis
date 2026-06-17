import express from "express";
import { createClient } from "@libsql/client";

const app = express();
app.use(express.json({ limit: "20mb" })); // Reduced limit for safety

// 1. GET CREDENTIALS SAFELY
const getUrl = () => (process.env.TURSO_DATABASE_URL || "").trim().replace(/['"]/g, '');
const getToken = () => (process.env.TURSO_AUTH_TOKEN || "").trim().replace(/['"]/g, '');

// 2. LAZY CLIENT GENERATOR
// This prevents the function from crashing if the URL is missing
const getClient = () => {
  const url = getUrl();
  if (!url || !url.startsWith("libsql")) {
    throw new Error("Invalid or missing TURSO_DATABASE_URL");
  }
  return createClient({
    url: url,
    authToken: getToken(),
  });
};

// 3. STATUS ENDPOINT (Safe - won't crash)
app.get("/api/db/status", (req, res) => {
  const url = getUrl();
  res.json({
    connected: !!url && url.startsWith("libsql"),
    url_preview: url ? url.substring(0, 15) + "..." : "MISSING",
    env: "Vercel Serverless"
  });
});

// 4. PULL ENDPOINT (Safe - uses try/catch)
app.get("/api/db/pull", async (req, res) => {
  try {
    const client = getClient();
    const tables = ['users', 'products', 'customers', 'orders', 'order_items', 'invoices', 'deliveries', 'complaints', 'audit_logs'];
    
    const results = await Promise.all(
      tables.map(t => client.execute(`SELECT * FROM ${t}`).catch(() => ({ rows: [] })))
    );

    const data: any = {};
    tables.forEach((name, i) => { data[name] = results[i].rows; });
    
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Pull Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. PUSH ENDPOINT
app.post("/api/db/push", async (req, res) => {
  const { table, rows } = req.body;
  if (!table || !Array.isArray(rows)) return res.status(400).json({ error: "Invalid data" });

  try {
    const client = getClient();
    await client.execute(`DELETE FROM ${table}`);

    if (rows.length > 0) {
      const keys = Object.keys(rows[0]);
      const columns = keys.join(", ");
      const placeholders = keys.map(() => "?").join(", ");
      const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
      
      const stmts = rows.map(row => ({
        sql,
        args: keys.map(k => row[k] ?? null)
      }));

      await client.batch(stmts, "write");
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Push Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

export default app;
//added