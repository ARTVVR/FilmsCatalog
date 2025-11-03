import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Log error without blocking UI with alert
      if (error.status !== 0) {
        console.error('HTTP error:', error.status, error.message);
      }
      // Silent fail for better UX - errors are handled in components
      return throwError(() => error);
    }),
  );
};
