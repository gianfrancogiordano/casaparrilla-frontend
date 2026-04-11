import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

// ─── Supplier ─────────────────────────────────────────────────────
export interface Supplier {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  address?: string;
  ingredientsSupplied: string[];
  notes?: string;
  active: boolean;
}

// ─── Purchase Order ───────────────────────────────────────────────
export interface PurchaseItem {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unitMeasure: string;
  unitCost: number;
  subtotal: number;
}

export interface PurchaseOrder {
  _id: string;
  supplierId: any;
  date: string;
  items: PurchaseItem[];
  total: number;
  status: 'Pendiente' | 'Confirmada' | 'Cancelada';
  createdBy?: any;
  notes?: string;
  createdAt?: string;
}

// ─── Summary ──────────────────────────────────────────────────────
export interface PurchaseSummary {
  totalCompras: number;
  cantidadOrdenes: number;
  proveedores: { nombre: string; total: number; cantidad: number }[];
  ingredientes: { nombre: string; total: number; cantidadComprada: number; unidad: string }[];
}

@Injectable({ providedIn: 'root' })
export class PurchasesService {
  private readonly API = `${environment.apiUrl}/purchases`;

  constructor(private http: HttpClient) {}

  // ─── Proveedores ──────────────────────────────────────────────────
  getSuppliers(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(`${this.API}/suppliers`);
  }

  getSupplier(id: string): Observable<Supplier> {
    return this.http.get<Supplier>(`${this.API}/suppliers/${id}`);
  }

  createSupplier(supplier: Partial<Supplier>): Observable<Supplier> {
    return this.http.post<Supplier>(`${this.API}/suppliers`, supplier);
  }

  updateSupplier(id: string, supplier: Partial<Supplier>): Observable<Supplier> {
    return this.http.patch<Supplier>(`${this.API}/suppliers/${id}`, supplier);
  }

  deleteSupplier(id: string): Observable<Supplier> {
    return this.http.delete<Supplier>(`${this.API}/suppliers/${id}`);
  }

  // ─── Órdenes de Compra ────────────────────────────────────────────
  getPurchases(): Observable<PurchaseOrder[]> {
    return this.http.get<PurchaseOrder[]>(this.API);
  }

  getPurchase(id: string): Observable<PurchaseOrder> {
    return this.http.get<PurchaseOrder>(`${this.API}/${id}`);
  }

  createPurchase(purchase: any): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(this.API, purchase);
  }

  updatePurchase(id: string, purchase: any): Observable<PurchaseOrder> {
    return this.http.patch<PurchaseOrder>(`${this.API}/${id}`, purchase);
  }

  deletePurchase(id: string): Observable<PurchaseOrder> {
    return this.http.delete<PurchaseOrder>(`${this.API}/${id}`);
  }

  confirmPurchase(id: string): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.API}/${id}/confirm`, {});
  }

  cancelPurchase(id: string): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.API}/${id}/cancel`, {});
  }

  getSummary(from?: string, to?: string): Observable<PurchaseSummary> {
    let url = `${this.API}/summary`;
    const params: string[] = [];
    if (from) params.push(`from=${from}`);
    if (to) params.push(`to=${to}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.http.get<PurchaseSummary>(url);
  }
}
