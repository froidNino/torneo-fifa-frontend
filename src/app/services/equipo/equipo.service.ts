import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EquipoService {
  private apiUrl = 'http://localhost:8080/api/v1/teams';

  constructor(private http: HttpClient) { }

  obtenerEquipos(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
  // Envía el resultado del partido al backend
  registrarPartido(datosPartido: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/match`, datosPartido);
  }
}