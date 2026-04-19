import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef,
  AfterViewChecked, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ChatService, ChatSession, ChatMessage } from '../../services/chat.service';
import { SocketService } from '../../services/socket.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inbox.component.html',
  styleUrls: ['./inbox.component.scss'],
})
export class InboxComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  sessions: ChatSession[] = [];
  selectedSession: ChatSession | null = null;
  messages: ChatMessage[] = [];
  newMessage = '';
  loading = false;
  sendingMessage = false;
  activeImage: string | null = null;  // lightbox
  agentEnabled = true;  // Global agent toggle
  togglingAgent = false;
  /** Mobile: 'list' shows sessions, 'chat' shows messages */
  mobileView: 'list' | 'chat' = 'list';

  private subs = new Subscription();
  private shouldScrollToBottom = false;

  constructor(
    private chatService: ChatService,
    private socketService: SocketService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    this.loadSessions();
    this.loadAgentStatus();

    // Real-time: new message
    this.subs.add(
      this.socketService.onChatNewMessage().subscribe((data: any) => {
        // Update selected chat if the message belongs to it
        if (this.selectedSession?.phone === data.phone) {
          this.messages.push({
            _id: Date.now().toString(),
            sessionPhone: data.phone,
            role: data.role,
            content: data.content,
            type: data.type ?? 'text',
            mediaUrl: data.mediaUrl ?? null,
            lat: data.lat ?? null,
            lng: data.lng ?? null,
            createdAt: data.timestamp ?? new Date().toISOString(),
          });
          this.shouldScrollToBottom = true;
          // Mark as read when already looking at the chat
          this.chatService.markRead(data.phone).subscribe();
        }
        // Refresh session list order
        this.loadSessions();
        this.cdr.detectChanges();
      })
    );

    // Real-time: session updated (unread count, AI toggle, last message)
    this.subs.add(
      this.socketService.onChatSessionUpdated().subscribe((updated: ChatSession) => {
        const idx = this.sessions.findIndex(s => s.phone === updated.phone);
        if (idx >= 0) {
          this.sessions[idx] = { ...this.sessions[idx], ...updated };
        } else {
          this.sessions.unshift(updated);
        }
        this.sessions = [...this.sessions].sort(
          (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );
        this.cdr.detectChanges();
      })
    );
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  loadSessions() {
    this.chatService.getSessions().pipe(
      switchMap(sessions => {
        if (!sessions.length) return of([]);
        // Enrich each session with client loyalty data in parallel
        const enriched$ = sessions.map(s =>
          this.chatService.getClientInfo(s.phone, s.clientName || 'Cliente').pipe(
            catchError(() => of(null))
          )
        );
        return forkJoin(enriched$).pipe(
          catchError(() => of(sessions.map(() => null))),
          switchMap(clientInfos => {
            sessions.forEach((s, i) => {
              const info = clientInfos[i];
              if (info) {
                s.clientName = info.name || s.clientName;
                s.loyaltyPoints = info.loyaltyPoints ?? 0;
                s.isVip = (info.loyaltyPoints ?? 0) >= 100;
              }
            });
            return of(sessions);
          })
        );
      })
    ).subscribe(sessions => {
      this.sessions = sessions;
      this.cdr.detectChanges();
    });
  }

  selectSession(session: ChatSession) {
    this.selectedSession = session;
    this.mobileView = 'chat'; // mobile: switch to chat panel
    this.loading = true;

    this.chatService.getMessages(session.phone).subscribe(msgs => {
      this.messages = msgs;
      this.loading = false;
      this.shouldScrollToBottom = true;
      this.cdr.detectChanges();
    });

    // Mark as read
    if (session.unreadCount > 0) {
      this.chatService.markRead(session.phone).subscribe(() => {
        if (this.selectedSession) this.selectedSession.unreadCount = 0;
        const idx = this.sessions.findIndex(s => s.phone === session.phone);
        if (idx >= 0) this.sessions[idx].unreadCount = 0;
        this.cdr.detectChanges();
      });
    }
  }

  goBackToList() {
    this.mobileView = 'list';
    this.selectedSession = null;
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.selectedSession || this.sendingMessage) return;

    const content = this.newMessage.trim();
    this.newMessage = '';
    this.sendingMessage = true;

    this.chatService.sendMessage(this.selectedSession.phone, content).subscribe({
      next: () => { this.sendingMessage = false; },
      error: () => { this.sendingMessage = false; },
    });
  }

  toggleAI(session: ChatSession) {
    const newState = !session.isAiActive;
    this.chatService.setAiMode(session.phone, newState).subscribe((updated: ChatSession) => {
      session.isAiActive = newState;
      if (this.selectedSession?.phone === session.phone) {
        this.selectedSession.isAiActive = newState;
      }
      this.cdr.detectChanges();
    });
  }

  private scrollToBottom() {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (_) {}
  }

  get totalUnread(): number {
    return this.sessions.reduce((acc, s) => acc + (s.unreadCount || 0), 0);
  }

  loadAgentStatus(): void {
    this.http.get<{ enabled: boolean }>(`${environment.apiUrl}/agent/status`).subscribe({
      next: (res) => {
        this.agentEnabled = res.enabled;
        this.cdr.detectChanges();
      },
      error: () => this.agentEnabled = true
    });
  }

  toggleGlobalAgent(): void {
    this.togglingAgent = true;
    const newState = !this.agentEnabled;
    this.http.patch<{ enabled: boolean }>(`${environment.apiUrl}/agent/status`, { enabled: newState }).subscribe({
      next: (res) => {
        this.agentEnabled = res.enabled;
        this.togglingAgent = false;
        this.cdr.detectChanges();
      },
      error: () => this.togglingAgent = false
    });
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return date.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' });
  }

  formatMessageTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  }

  // ─── Media helpers ──────────────────────────────────────────────────────────
  getMapsUrl(msg: ChatMessage): string {
    return `https://www.google.com/maps?q=${msg.lat},${msg.lng}`;
  }

  /** Proxy URL adds the Meta Bearer token — browsers can't do this natively */
  getProxyUrl(metaUrl: string): string {
    return this.chatService.getProxyUrl(metaUrl);
  }

  openImageModal(url: string): void {
    this.activeImage = this.chatService.getProxyUrl(url);
  }

  closeImageModal(): void {
    this.activeImage = null;
  }
}
