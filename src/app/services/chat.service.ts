import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { retry, delay, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ChatSession {
  _id: string;
  phone: string;
  clientName: string;
  isAiActive: boolean;
  unreadCount: number;
  lastMessagePreview: string;
  lastMessageAt: string;
  // enriched client data
  loyaltyPoints?: number;
  isVip?: boolean;
}

export interface ChatMessage {
  _id: string;
  sessionPhone: string;
  role: 'user' | 'ai' | 'human';
  content: string;
  type: 'text' | 'audio' | 'image';
  createdAt: string;
}

// Retry config: 2 retries with increasing delays (1s, 2s)
const RETRY_CONFIG = {
  count: 2,
  delay: (error: any, retryCount: number) =>
    of(null).pipe(delay(retryCount * 1000)),
};

@Injectable({ providedIn: 'root' })
export class ChatService {
  private base = `${environment.apiUrl}/chat`;

  constructor(private http: HttpClient) {}

  getSessions(): Observable<ChatSession[]> {
    return this.http.get<ChatSession[]>(`${this.base}/sessions`).pipe(
      retry(RETRY_CONFIG),
      catchError(() => of([])),  // return empty list on full failure
    );
  }

  getMessages(phone: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.base}/sessions/${phone}/messages`).pipe(
      retry(RETRY_CONFIG),
      catchError(() => of([])),
    );
  }

  sendMessage(phone: string, content: string): Observable<any> {
    return this.http.post(`${this.base}/sessions/${phone}/send`, { content });
  }

  setAiMode(phone: string, isAiActive: boolean): Observable<any> {
    return this.http.patch(`${this.base}/sessions/${phone}/ai-mode`, { isAiActive });
  }

  markRead(phone: string): Observable<any> {
    return this.http.patch(`${this.base}/sessions/${phone}/read`, {});
  }

  getClientInfo(phone: string, name: string = 'Cliente'): Observable<{ clientId: string; name: string; loyaltyPoints: number; isVip: boolean }> {
    const publicBase = environment.apiUrl;
    return this.http.post<any>(`${publicBase}/public/clients/identify`, { phone, name }).pipe(
      retry(RETRY_CONFIG),
    );
  }
}
