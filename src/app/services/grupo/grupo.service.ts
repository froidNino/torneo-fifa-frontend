import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GrupoService {
  private apiUrl = 'http://localhost:8080/api/v1/groups';

  constructor(private http: HttpClient) { }


  obtenerResumenGeneral(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/summary`);
    
  }

  inscribirEquipo(groupId: string, equipoId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${groupId}/teams/${equipoId}`, {});
  }
}