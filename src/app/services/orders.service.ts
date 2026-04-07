import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
  sentToCocina?: boolean;
  requiresKitchen?: boolean;
}

export interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  table: string;
  waiterId: any;
  clientId?: any; // New field for VIP client
  customerPhone?: string;
  deliveryAddress?: string;
  items: OrderItem[];
  totals: { subtotal: number; taxes: number; total: number };
  paymentInfo: { status: string; method?: string };
  createdAt: string;
}

export interface CreateOrderPayload {
  orderNumber: string;
  status: string;
  orderType: string;
  table: string;
  waiterId: string;
  items: OrderItem[];
  totals: { subtotal: number; taxes: number; total: number };
  customerPhone?: string;
  deliveryAddress?: string;
  clientId?: string;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly API = `${environment.apiUrl}/orders`;
  constructor(private http: HttpClient) {}

  getAll(): Observable<Order[]> {
    return this.http.get<Order[]>(this.API);
  }

  getOpenOrderByTable(tableNumber: string): Observable<Order | null> {
    return this.http.get<Order | null>(`${this.API}/mesa/${tableNumber}`);
  }

  createOrder(payload: CreateOrderPayload): Observable<Order> {
    return this.http.post<Order>(this.API, payload);
  }

  addItemToOrder(orderId: string, item: Partial<OrderItem>): Observable<Order> {
    return this.http.post<Order>(`${this.API}/${orderId}/items`, item);
  }

  removeItemFromOrder(orderId: string, itemIndex: number): Observable<Order> {
    return this.http.delete<Order>(`${this.API}/${orderId}/items/${itemIndex}`);
  }

  updateOrderStatus(orderId: string, status: string): Observable<Order> {
    return this.http.patch<Order>(`${this.API}/${orderId}`, { status });
  }

  sendToKitchen(orderId: string): Observable<Order> {
    return this.http.post<Order>(`${this.API}/${orderId}/send-to-kitchen`, {});
  }

  payOrder(orderId: string, paymentMethod: 'Efectivo' | 'Pago Movil' | 'Binance' | 'Bancolombia' | 'Zelle'): Observable<Order> {
    return this.http.post<Order>(`${this.API}/${orderId}/pay`, { paymentMethod });
  }

  cancelOrder(orderId: string): Observable<Order> {
    return this.http.delete<Order>(`${this.API}/${orderId}`);
  }

  linkClientToOrder(orderId: string, clientId: string): Observable<Order> {
    return this.http.patch<Order>(`${this.API}/${orderId}/client`, { clientId });
  }
}
