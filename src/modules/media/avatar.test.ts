import { beforeAll, describe, expect, it } from 'vitest';

// avatar.ts lee la URL de Supabase de las variables públicas al cargarse
let avatarPath: typeof import('./avatar').avatarPath;
let avatarUrl: typeof import('./avatar').avatarUrl;
beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://ejemplo.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'clave-publica-de-prueba-0123456789';
  ({ avatarPath, avatarUrl } = await import('./avatar'));
});

describe('foto de perfil', () => {
  const uid = '65be3adf-253b-4fff-9150-c77306a234ad';

  it('una sola ruta por persona: {uid}.webp', () => {
    expect(avatarPath(uid)).toBe(`${uid}.webp`);
  });

  it('URL pública con la versión, para que la CDN la cachee y cada foto nueva sea otra URL', () => {
    expect(avatarUrl(uid, 3)).toBe(`https://ejemplo.supabase.co/storage/v1/object/public/avatars/${uid}.webp?v=3`);
  });

  it('sin versión no hay foto', () => {
    expect(avatarUrl(uid, null)).toBeNull();
    expect(avatarUrl(uid, undefined)).toBeNull();
    expect(avatarUrl(uid, 0)).toBeNull();
  });
});
