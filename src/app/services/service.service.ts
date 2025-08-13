
import { environment } from '../../environments/environment';
import { Usuario } from '../interface';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { forkJoin } from 'rxjs';



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

  private handleError(error: HttpErrorResponse) {
    console.error('Error en la solicitud:', error);
    let errorMessage = 'Ocurrió un error desconocido';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Código: ${error.status}\nMensaje: ${error.message}`;
      if (error.error?.message) {
        errorMessage = error.error.message;
      }
    }
    return throwError(() => new Error(errorMessage));
  }

  createUser(data: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/create`, data, {
      reportProgress: true,
      observe: 'response'
    }).pipe(
      catchError(this.handleError)
    );
  }

  registerPublicUser(user: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/create`, user).pipe(
      catchError(this.handleError)
    );
  }

updateUser(userId: string, data: any, isFormData = false): Observable<any> {
  const token = localStorage.getItem('token');
  const headers: any = {
    Authorization: `Bearer ${token || ''}`
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  return this.http.put(`${this.baseUrl}/${userId}`, data, { headers }).pipe(
    catchError(this.handleError) // Asegúrate de manejar los errores aquí también
  );
}

registrarEstudiantesMasivo(estudiantes: any[]): Observable<any> {
  return this.http.post(`${this.baseUrl}/create-masivo`, estudiantes).pipe(
    catchError(this.handleError)
  );
}



  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.authUrl}/login`, credentials);
  }

registerAdmin(user: Partial<Usuario> & { password: string }): Observable<any> {
    const token = localStorage.getItem('token'); // or wherever you store your JWT
    const headers = {
        Authorization: `Bearer ${token}`
    };

    return this.http.post(`${this.authUrl}/register-admin`, user, { headers });
}

}
