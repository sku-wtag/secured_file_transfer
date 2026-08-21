export interface AuthTokenSearch {
  uid?: string;
  token?: string;
}

function optionalStringParam(search: Record<string, unknown>, key: string): string | undefined {
  const value = search[key];
  return typeof value === 'string' ? value : undefined;
}

export function validateAuthTokenSearch(search: Record<string, unknown>): AuthTokenSearch {
  const uid = optionalStringParam(search, 'uid');
  const token = optionalStringParam(search, 'token');
  return { ...(uid !== undefined ? { uid } : {}), ...(token !== undefined ? { token } : {}) };
}
