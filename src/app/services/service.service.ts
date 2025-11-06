import { environment } from '../../environments/environment';
import { Usuario } from '../interface';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
  private inventarioUrl = `${environment.apiUrl}${environment.endpoints.inventario || '/inventario'}`;

  private http = inject(HttpClient);

  constructor() { }

  // ✅ Función para añadir el token automáticamente
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token || ''}`,
    });
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Error en la solicitud:', error);
    let errorMessage = 'Ocurrió un error desconocido';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = error.error?.message || `Código: ${error.status}\nMensaje: ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }

  // ✅ LOGIN (no requiere token)
  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.authUrl}/login`, credentials);
  }

  // ✅ Obtener todos los usuarios (requiere token)
  getUsers(): Observable<{ docs: Usuario[], totalDocs: number }> {
    return this.http.get<{ docs: Usuario[], totalDocs: number }>(this.baseUrl, {
      headers: this.getAuthHeaders()
    });
  }

  getUserById(id: string): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.baseUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  createUser(data: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/create`, data, {
      headers: this.getAuthHeaders(),
      reportProgress: true,
      observe: 'response'
    }).pipe(catchError(this.handleError));
  }

  registerPublicUser(user: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/create`, user).pipe(
      catchError(this.handleError)
    );
  }

  updateUser(userId: string, data: any, isFormData = false): Observable<any> {
    let headers = this.getAuthHeaders();

    if (!isFormData) {
      headers = headers.set('Content-Type', 'application/json');
    }

    return this.http.put(`${this.baseUrl}/${userId}`, data, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  registrarEstudiantesMasivo(estudiantes: any[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/create-masivo`, estudiantes, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // ✅ Registro de administrador (requiere token)
  registerAdmin(user: Partial<Usuario> & { password: string }): Observable<any> {
    return this.http.post(`${this.authUrl}/register-admin`, user, {
      headers: this.getAuthHeaders()
    });
  }

  // ✅ Nueva función para obtener inventario (protegida)
  getInventario(): Observable<any> {
    return this.http.get(`${this.inventarioUrl}`, {
      headers: this.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }
}
