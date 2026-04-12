import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AgentService {
  private base = `${environment.apiUrl}/agent`;

  constructor(private http: HttpClient) {}

  getKnowledge(): Observable<{ content: string }> {
    return this.http.get<{ content: string }>(`${this.base}/knowledge`);
  }

  updateKnowledge(content: string): Observable<{ ok: boolean; message: string }> {
    return this.http.post<{ ok: boolean; message: string }>(`${this.base}/knowledge`, { content });
  }
}
