/**
 * Defensa CSRF (§10.1), además de las cookies SameSite=Lax: una petición que cambia datos con la cookie de sesión
 * tiene que venir de esta misma web. Los navegadores mandan `Origin` en todo POST; si falta (cliente que no es
 * un navegador), se rechaza solo cuando el navegador declara que viene de otro sitio (`Sec-Fetch-Site`).
 */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return request.headers.get('sec-fetch-site') !== 'cross-site';
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const own = [new URL(request.url).host, request.headers.get('x-forwarded-host'), request.headers.get('host')];
  return own.some((h) => !!h && h === host);
}
