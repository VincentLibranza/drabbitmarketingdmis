/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  Proprietor = "Proprietor",
  Staff = "Staff"
}

export enum UserStatus {
  Active = "Active",
  Inactive = "Inactive"
}

export interface User {
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  status: UserStatus;
}

export enum OrderStatus {
  Pending = "Pending",
  Confirmed = "Confirmed",
  Dispatched = "Dispatched",
  Delivered = "Delivered",
  Cancelled = "Cancelled"
}

export enum PaymentStatus {
  Unpaid = "Unpaid",
  Partial = "Partial",
  Paid = "Paid"
}

export interface Order {
  orderId: string;
  orderRefNo: string;
  customerId: string;
  orderDate: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  dueDate: string;
  items: OrderItem[];
}

export interface OrderItem {
  itemId: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface Product {
  productId: string;
  productName: string;
  category: string;
  unitPrice: number;
  stockQuantity: number;
  reorderThreshold: number;
}

export interface Customer {
  customerId: string;
  customerName: string;
  contact: string;
  address: string;
  email: string;
  tin?: string;
}

export interface Invoice {
  invoiceId: string;
  orderId: string;
  invoiceDate: string;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  dueDate: string;
}

export enum DeliveryStatus {
  Pending = "Pending",
  InTransit = "In Transit",
  Delivered = "Delivered"
}

export interface Delivery {
  deliveryId: string;
  orderId: string;
  scheduledDate: string;
  deliveryDate?: string;
  status: DeliveryStatus;
  assignedDriver: string;
}

export enum ComplaintStatus {
  Open = "Open",
  InProgress = "In Progress",
  Resolved = "Resolved"
}

export interface Complaint {
  complaintId: string;
  customerId: string;
  productId?: string;
  description: string;
  status: ComplaintStatus;
  resolution?: string;
  dateLogged: string;
}

export interface AuditLog {
  logId?: string;
  username?: string;
  action?: string;
  timestamp?: string;
  tableRef?: string;
  LogID?: string;
  UserID?: string;
  userId?: string;
  Action?: string;
  Timestamp?: string;
  TableRef?: string;
}
