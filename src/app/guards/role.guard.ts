import { inject, Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const roleGuard: CanActivateFn = (route, state) => {
  const expectedRoles = route.data?.['roles'] as string[] || [];
  const userRole = localStorage.getItem('rol');

  if (expectedRoles.includes(userRole || '')) {
    return true;
  }

  const router = inject(Router);
  router.navigate(['/no-autorizado']);
  return false;
};
