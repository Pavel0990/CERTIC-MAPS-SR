# ADR-015 · Despliegue en Vercel + Supabase con cuentas de la organización

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 23/09/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §13.2 |

## Contexto

El ganador transfiere la plataforma a FUNDESER. Nada puede depender de cuentas personales.

## Decisión

Vercel (Hobby en una cuenta con email de la organización para la demo; Team Pro en producción) + Supabase (organización Free en la demo, Pro en producción).

## Alternativas descartadas

- VPS con Docker (Coolify)
- Netlify
- Cloudflare
- Supabase autoalojado

## Consecuencias

**A favor:**

- Cero servidores que operar, previews por PR, rollback instantáneo.

**En contra:**

- Costo por miembro en Vercel Pro; Hobby es no comercial y con cron diario.
- En Supabase Pro cada proyecto paga su cómputo.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Lock-in de plataforma | Next.js y Supabase son portables; autoalojamiento documentado en Fase 3. |
| Cuentas personales | Prohibidas desde el día uno. |
