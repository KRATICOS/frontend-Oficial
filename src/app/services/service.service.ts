import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Usuario } from '../interface';



export interface LoginResponse {
  message: string;
  token: string;
  usuario: Usuario;
}


@Injectable({
  providedIn: 'root'
})
export class ServiceService {
  private baseUrl = `${environment.apiUrl}${environment.endpoints.usuario}`;
  private authUrl = `${environment.apiUrl}${environment.endpoints.auth}`;

  private http = inject(HttpClient);

  constructor() { }

  getUsers(): Observable<{ docs: Usuario[], totalDocs: number }> {
    return this.http.get<{ docs: Usuario[], totalDocs: number }>(this.baseUrl);
  }

  getUserById(id: string): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.baseUrl}/${id}`);
  }

  createUser(data: FormData): Observable<any> {
    return this.http.post(`${environment.apiUrl}${environment.endpoints.usuario}/create`, data);
  }

  registerPublicUser(user: FormData): Observable<any> {
    return this.http.post(`${environment.apiUrl}${environment.endpoints.usuario}/create`, user);
  }

  updateUser(userId: string, data: any, isFormData = false): Observable<any> {
    const token = localStorage.getItem('token');
    const headers: any = {
      Authorization: `Bearer ${token || ''}`
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    return this.http.put(`${this.baseUrl}/${userId}`, data, { headers });
  }



  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.authUrl}/login`, credentials);
  }

  registerAdmin(user: Partial<Usuario> & { password: string }): Observable<any> {
    return this.http.post(`${this.authUrl}/register-admin`, user);
  }

}
