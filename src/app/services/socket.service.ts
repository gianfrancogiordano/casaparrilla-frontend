import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private orderCreatedSubject = new Subject<any>();
  private orderUpdatedSubject = new Subject<any>();
  private chatNewMessageSubject = new Subject<any>();
  private chatSessionUpdatedSubject = new Subject<any>();

  constructor() {
    this.socket = io(environment.apiUrl);

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    this.socket.on('order_created', (data) => {
      this.orderCreatedSubject.next(data);
    });

    this.socket.on('order_updated', (data) => {
      this.orderUpdatedSubject.next(data);
    });

    // ─── WhatsApp Inbox events ───────────────────────────────────────────────
    this.socket.on('chat:new_message', (data) => {
      this.chatNewMessageSubject.next(data);
    });

    this.socket.on('chat:session_updated', (data) => {
      this.chatSessionUpdatedSubject.next(data);
    });
  }

  onOrderCreated(): Observable<any> {
    return this.orderCreatedSubject.asObservable();
  }

  onOrderUpdated(): Observable<any> {
    return this.orderUpdatedSubject.asObservable();
  }

  onChatNewMessage(): Observable<any> {
    return this.chatNewMessageSubject.asObservable();
  }

  onChatSessionUpdated(): Observable<any> {
    return this.chatSessionUpdatedSubject.asObservable();
  }

  emit(event: string, data: any) {
    this.socket.emit(event, data);
  }
}
