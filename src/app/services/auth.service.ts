import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:8080/api/v1/auth/login';

  constructor(private http: HttpClient) { }

  login(credenciales: any): Observable<any> {
    return this.http.post(this.apiUrl, credenciales);
  }
}