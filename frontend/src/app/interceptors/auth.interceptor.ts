import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();
  const esLogin = req.url.includes('/api/auth/login');

  // No inyectamos el token en las peticiones al endpoint de login
  const authReq = (!esLogin && token)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      // Un 401 en el login es "credenciales inválidas", no una sesión expirada:
      // no debe disparar el logout/redirect, sino dejar que el componente lo maneje.
      if (error instanceof HttpErrorResponse && error.status === 401 && !esLogin) {
        authService.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
