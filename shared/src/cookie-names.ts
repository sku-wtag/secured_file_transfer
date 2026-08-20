export function sessionCookieName(isProduction: boolean): string {
  return isProduction ? '__Host-session' : 'session';
}

export function csrfCookieName(isProduction: boolean): string {
  return isProduction ? '__Host-csrf' : 'csrf';
}

export const CSRF_HEADER_NAME = 'X-CSRF-Token';
