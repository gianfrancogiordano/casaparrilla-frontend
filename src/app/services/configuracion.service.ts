import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface Configuracion {
  _id: string;
  nombreRestaurante: string;
  monedaPrincipal: string;
  tasaCambioUsdBs: number;
  tasaCambioUsdCop: number;
  cantidadMesas: number;
  direccion?: string;
  telefono?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly API = `${environment.apiUrl}/configuracion`;
  constructor(private http: HttpClient) {}

  get(): Observable<Configuracion> {
    return this.http.get<Configuracion>(this.API);
  }

  update(data: Partial<Configuracion>): Observable<Configuracion> {
    return this.http.patch<Configuracion>(this.API, data);
  }
}
