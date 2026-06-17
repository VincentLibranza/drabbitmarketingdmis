import express from "express";
import { createClient } from "@libsql/client";

const app = express();
app.use(express.json({ limit: "50mb" }));

const url = (process.env.TURSO_DATABASE_URL || "").trim().replace(/['"]/g, '');
const token = (process.env.TURSO_AUTH_TOKEN || "").trim().replace(/['"]/g, '');
const client = createClient({ url: url || "", authToken: token });

// 1. Connection Status
app.get("/api/db/status", (req, res) => {
  res.json({ isRemote: !!url && url.startsWith("libsql"), databaseUrl: url });
});

// 2. Data Pull (Cloud to Browser)
app.get("/api/db/pull", async (req, res) => {
  try {
    const [u, p, c, o] = await Promise.all([
      client.execute("SELECT * FROM users"),
      client.execute("SELECT * FROM products"),
      client.execute("SELECT * FROM customers"),
      client.execute("SELECT * FROM orders")
    ]);
    res.json({ 
      success: true, 
      data: { users: u.rows, products: p.rows, customers: c.rows, orders: o.rows } 
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 3. Data Push (Browser to Cloud)
app.post("/api/db/push", async (req, res) => {
  const { table, rows } = req.body;
  if (!table || !Array.isArray(rows)) return res.status(400).json({ error: "Invalid payload" });

  try {
    await client.execute(`DELETE FROM ${table}`);

    if (rows.length > 0) {
      // FIX: Ensure keys are in a fixed order for every row
      const keys = Object.keys(rows[0]);
      const columns = keys.join(", ");
      const placeholders = keys.map(() => "?").join(", ");
      
      const statements = rows.map(row => ({
        sql: `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
        args: keys.map(key => row[key] ?? null) // Strict mapping
      }));

      await client.batch(statements, "write");
    }
    res.json({ success: true, count: rows.length });
  } catch (e: any) {
    console.error(`Push Error [${table}]:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

export default app;