/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  User,
  UserRole,
  UserStatus,
  Product,
  Customer,
  Order,
  OrderStatus,
  PaymentStatus,
  Delivery,
  DeliveryStatus,
  Complaint,
  ComplaintStatus,
  AuditLog
} from "./types";
import { db, auth } from "./firebase";
import { doc, getDocs, collection, writeBatch, deleteDoc } from "firebase/firestore";

// Seed Users
const initialUsers: User[] = [
  {
    userId: "USR-001",
    username: "admin",
    name: "Rufino N. Libranza Jr.",
    role: UserRole.Proprietor,
    status: UserStatus.Active
  },
  {
    userId: "USR-002",
    username: "staff",
    name: "Zian Wayne Matunding",
    role: UserRole.Staff,
    status: UserStatus.Active
  },
  {
    userId: "USR-003",
    username: "vincent",
    name: "Vincent Jon Libranza",
    role: UserRole.Staff,
    status: UserStatus.Active
  }
];

// Seed Products
const initialProducts: Product[] = [];

// Seed Customers
const initialCustomers: Customer[] = [];

// Seed Orders
const initialOrders: Order[] = [];

// Seed Deliveries
const initialDeliveries: Delivery[] = [];

// Seed Complaints
const initialComplaints: Complaint[] = [];

// Seed Audit Logs
const initialAuditLogs: AuditLog[] = [
  {
    logId: "LOG-601",
    username: "System",
    action: "System initialized with a clean offline database workspace.",
    timestamp: new Date().toISOString(),
    tableRef: "SYSTEM"
  }
];

// Run-once migration to immediately clean up previously cached mock data from active browser session
try {
  if (typeof window !== "undefined" && !localStorage.getItem("dmis_has_purged_mock_seeds_v1")) {
    localStorage.removeItem("dmis_products");
    localStorage.removeItem("dmis_customers");
    localStorage.removeItem("dmis_orders");
    localStorage.removeItem("dmis_deliveries");
    localStorage.removeItem("dmis_complaints");
    localStorage.removeItem("dmis_audit_logs");
    localStorage.setItem("dmis_has_purged_mock_seeds_v1", "true");
  }
} catch (e) {
  console.error("Failed clean-seed localStorage migration check:", e);
}

// Localstorage state manager for offline DMIS operations
export class LocalDB {
  static get<T>(key: string, initialData: T): T {
    try {
      const data = localStorage.getItem(`dmis_${key}`);
      if (!data) {
        localStorage.setItem(`dmis_${key}`, JSON.stringify(initialData));
        return initialData;
      }
      return JSON.parse(data);
    } catch {
      return initialData;
    }
  }

  static set<T>(key: string, data: T): void {
    try {
      localStorage.setItem(`dmis_${key}`, JSON.stringify(data));
    } catch (e) {
      console.error("Failed saving state: ", e);
    }
  }

  static reset() {
    try {
      const snapshot = {
        users: localStorage.getItem("dmis_users"),
        products: localStorage.getItem("dmis_products"),
        customers: localStorage.getItem("dmis_customers"),
        orders: localStorage.getItem("dmis_orders"),
        deliveries: localStorage.getItem("dmis_deliveries"),
        complaints: localStorage.getItem("dmis_complaints"),
        audit_logs: localStorage.getItem("dmis_audit_logs"),
        timestamp: new Date().toISOString()
      };
      localStorage.setItem("dmis_reset_backup", JSON.stringify(snapshot));
    } catch (e) {
      console.error("Failed creating pre-reset backup snapshot:", e);
    }

    // Keep only the backup and current active session, remove others
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("dmis_") && key !== "dmis_reset_backup" && key !== "dmis_logged_in_user") {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    location.reload();
  }

  static hasBackup(): boolean {
    try {
      const backupStr = localStorage.getItem("dmis_reset_backup");
      if (!backupStr) return false;
      const backup = JSON.parse(backupStr);
      return !!(backup.users || backup.products || backup.orders);
    } catch {
      return false;
    }
  }

  static restoreBackup(): boolean {
    try {
      const backupStr = localStorage.getItem("dmis_reset_backup");
      if (!backupStr) return false;
      
      const backup = JSON.parse(backupStr);
      if (backup.users) localStorage.setItem("dmis_users", backup.users);
      if (backup.products) localStorage.setItem("dmis_products", backup.products);
      if (backup.customers) localStorage.setItem("dmis_customers", backup.customers);
      if (backup.orders) localStorage.setItem("dmis_orders", backup.orders);
      if (backup.deliveries) localStorage.setItem("dmis_deliveries", backup.deliveries);
      if (backup.complaints) localStorage.setItem("dmis_complaints", backup.complaints);
      if (backup.audit_logs) localStorage.setItem("dmis_audit_logs", backup.audit_logs);
      
      this.appendLog("System", "Restored previous custom session database from auto-backup.", "SYSTEM");
      return true;
    } catch (e) {
      console.error("Failed restoring backup:", e);
      return false;
    }
  }

  static exportAsJSON(): string {
    const dataObj = {
      users: this.getUsers(),
      products: this.getProducts(),
      customers: this.getCustomers(),
      orders: this.getOrders(),
      deliveries: this.getDeliveries(),
      complaints: this.getComplaints(),
      audit_logs: this.getAuditLogs(),
      exporter: "Sasa Portal DMIS",
      timestamp: new Date().toISOString()
    };
    return JSON.stringify(dataObj, null, 2);
  }

  static importFromJSON(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.users) this.setUsers(parsed.users);
      if (parsed.products) this.setProducts(parsed.products);
      if (parsed.customers) this.setCustomers(parsed.customers);
      if (parsed.orders) this.setOrders(parsed.orders);
      if (parsed.deliveries) this.setDeliveries(parsed.deliveries);
      if (parsed.complaints) this.setComplaints(parsed.complaints);
      if (parsed.audit_logs) this.setAuditLogs(parsed.audit_logs);
      
      this.appendLog("System", "Successfully imported external JSON database backup", "SYSTEM");
      return true;
    } catch (e) {
      console.error("JSON parse failure in DB import:", e);
      return false;
    }
  }

  static async syncArrayToFirestore(collName: string, localItems: any[], idKey: string) {
    const dbMode = typeof window !== "undefined" ? localStorage.getItem("dmis_db_mode") : "local";
    if (dbMode !== "cloud") {
      // In local offline mode, completely skip automatic background Firestore updates to ensure top performance
      return;
    }
    try {
      const batch = writeBatch(db);
      for (const item of localItems) {
        if (item && item[idKey]) {
          const docRef = doc(db, collName, item[idKey]);
          batch.set(docRef, item);
        }
      }
      await batch.commit();

      const snapshot = await getDocs(collection(db, collName));
      const localIds = new Set(localItems.map(x => x[idKey]));
      const deleteBatch = writeBatch(db);
      let needsDelete = false;
      snapshot.forEach(docSnap => {
        if (!localIds.has(docSnap.id)) {
          deleteBatch.delete(docSnap.ref);
          needsDelete = true;
        }
      });
      if (needsDelete) {
        await deleteBatch.commit();
      }
      console.log(`[Firestore Sync] Successfully synced and pruned remote collection: ${collName}`);
    } catch (e) {
      console.warn(`[Firestore Sync] Background database write failed for ${collName}:`, e);
    }
  }

  static async forceSyncAllToCloud(): Promise<boolean> {
    try {
      console.log("[LocalDB] Forcing complete cloud upload of local storage...");
      await this.syncArrayToFirestoreForce("users", this.getUsers(), "userId");
      await this.syncArrayToFirestoreForce("products", this.getProducts(), "productId");
      await this.syncArrayToFirestoreForce("customers", this.getCustomers(), "customerId");
      await this.syncArrayToFirestoreForce("orders", this.getOrders(), "orderId");
      await this.syncArrayToFirestoreForce("deliveries", this.getDeliveries(), "deliveryId");
      await this.syncArrayToFirestoreForce("complaints", this.getComplaints(), "complaintId");
      await this.syncArrayToFirestoreForce("audit_logs", this.getAuditLogs(), "logId");
      this.appendLog("System", "Uploaded all local offline database arrays to Firestore.", "SYSTEM");
      return true;
    } catch (e) {
      console.error("[LocalDB] Force sync upload failed:", e);
      throw e;
    }
  }

  static async forcePullAllFromCloud(): Promise<boolean> {
    try {
      console.log("[LocalDB] Forcing complete cloud pull to local storage...");
      const collections = [
        { name: "users", setter: (items: any) => this.set("users", items) },
        { name: "products", setter: (items: any) => this.set("products", items) },
        { name: "customers", setter: (items: any) => this.set("customers", items) },
        { name: "orders", setter: (items: any) => this.set("orders", items) },
        { name: "deliveries", setter: (items: any) => this.set("deliveries", items) },
        { name: "complaints", setter: (items: any) => this.set("complaints", items) },
        { name: "audit_logs", setter: (items: any) => this.set("audit_logs", items) },
      ];

      for (const col of collections) {
        const snapshot = await getDocs(collection(db, col.name));
        const cloudItems: any[] = [];
        snapshot.forEach(docSnap => {
          cloudItems.push(docSnap.data());
        });
        if (cloudItems.length > 0) {
          col.setter(cloudItems);
        }
      }
      this.appendLog("System", "Downloaded and merged cloud database schemas into local storage.", "SYSTEM");
      return true;
    } catch (e) {
      console.error("[LocalDB] Direct cloud pull failed:", e);
      throw e;
    }
  }

  private static async syncArrayToFirestoreForce(collName: string, localItems: any[], idKey: string) {
    const batch = writeBatch(db);
    for (const item of localItems) {
      if (item && item[idKey]) {
        const docRef = doc(db, collName, item[idKey]);
        batch.set(docRef, item);
      }
    }
    await batch.commit();

    const snapshot = await getDocs(collection(db, collName));
    const localIds = new Set(localItems.map(x => x[idKey]));
    const deleteBatch = writeBatch(db);
    let needsDelete = false;
    snapshot.forEach(docSnap => {
      if (!localIds.has(docSnap.id)) {
        deleteBatch.delete(docSnap.ref);
        needsDelete = true;
      }
    });
    if (needsDelete) {
      await deleteBatch.commit();
    }
    console.log(`[Firestore Sync Force] Successfully uploaded schema: ${collName}`);
  }

  // Typed getters/setters fully integrated into browser localStorage & Cloud Firestore
  static getUsers(): User[] {
    return this.get<User[]>("users", initialUsers);
  }
  static setUsers(users: User[]): void {
    this.set("users", users);
    this.syncArrayToFirestore("users", users, "userId");
  }

  static getProducts(): Product[] {
    return this.get<Product[]>("products", initialProducts);
  }
  static setProducts(products: Product[]): void {
    this.set("products", products);
    this.syncArrayToFirestore("products", products, "productId");
  }

  static getCustomers(): Customer[] {
    return this.get<Customer[]>("customers", initialCustomers);
  }
  static setCustomers(customers: Customer[]): void {
    this.set("customers", customers);
    this.syncArrayToFirestore("customers", customers, "customerId");
  }

  static getOrders(): Order[] {
    return this.get<Order[]>("orders", initialOrders);
  }
  static setOrders(orders: Order[]): void {
    this.set("orders", orders);
    this.syncArrayToFirestore("orders", orders, "orderId");
  }

  static getDeliveries(): Delivery[] {
    return this.get<Delivery[]>("deliveries", initialDeliveries);
  }
  static setDeliveries(deliveries: Delivery[]): void {
    this.set("deliveries", deliveries);
    this.syncArrayToFirestore("deliveries", deliveries, "deliveryId");
  }

  static getComplaints(): Complaint[] {
    return this.get<Complaint[]>("complaints", initialComplaints);
  }
  static setComplaints(complaints: Complaint[]): void {
    this.set("complaints", complaints);
    this.syncArrayToFirestore("complaints", complaints, "complaintId");
  }

  static getAuditLogs(): AuditLog[] {
    return this.get<AuditLog[]>("audit_logs", initialAuditLogs);
  }
  static setAuditLogs(logs: AuditLog[]): void {
    this.set("audit_logs", logs);
    this.syncArrayToFirestore("audit_logs", logs, "logId");
  }

  static appendLog(username: string, action: string, tableRef: string): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      logId: `LOG-${Date.now().toString().slice(-6)}`,
      username,
      action,
      timestamp: new Date().toISOString(),
      tableRef
    };
    logs.unshift(newLog); // Put news first
    this.setAuditLogs(logs);
  }
}
