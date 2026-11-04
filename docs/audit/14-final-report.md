# 14 · Informe final de la auditoría integral

> 03–04/11/2026 · Rama `auto/auditoria-integral` sobre `bfa7c18` · Documentos de trabajo en `docs/audit/00` a `13`.

## A. Estado general

- **Punto de partida:** la app estaba en producción, con pruebas en verde y revisiones de seguridad previas (17/10 y 21/10). No había un inventario único ni una revisión cruzada.
- **Resultado:** se corrigieron 14 hallazgos confirmados y se dejan los pendientes, cada uno con su motivo.
- **Alcance:** 28 pantallas, 15 rutas de API, 11 módulos, 33 migraciones, cada política RLS y función `SECURITY DEFINER` en vivo, 40 documentos Markdown y 6 workflows.
- **Agentes:**
  - 4 auditores en paralelo: arquitectura con frontend y documentación; backend con seguridad; base de datos con DevOps; UI/UX con accesibilidad y rendimiento.
  - 1 auditor independiente para la revisión cruzada.
  - La coordinación, la priorización y las correcciones las hizo la sesión principal.
- **Pruebas ejecutadas:** ver `07-qa-audit.md`.
  - Lint y tipos sin errores.
  - 154 pruebas unitarias, 8 de fronteras y **207 de la base** (7 nuevas).
  - Build correcto y **32 E2E**.
  - 86 análisis de axe y responsive en 30 pantallas × 6 anchos (320–1920 px).

## B. Resultados

- **No hay hallazgos P0.**
- **P1 (3):**
  - F-01: los fallos de la base se mostraban como «Nada pendiente» (corregido).
  - D-01 y D-02: cifras falsas en DATABASE.md y en el guion de la demo (corregidas).
  - DB-01: staging es también producción, y las cuentas de prueba entran en los indicadores (necesita al dueño).
- **Vulnerabilidades:** ninguna explotable sin una cuenta del personal.
  - S-01 (P2, escalamiento vertical): un moderador al que le quitaban el rol seguía actuando sobre sus consultas asignadas. Corregido.
  - S-02 (P2, disponibilidad): el captcha no está activado, así que alguien podría agotar los límites de envío de códigos. Necesita la cuenta de Cloudflare.
- **Datos:**
  - DB-02: las alertas vencidas sin aprobar contaban como publicadas. Corregido.
  - DB-04: la administración veía la IP y el navegador de los vecinos. Corregido.
  - DB-05: moderación lee perfiles de toda la provincia. Queda como decisión pendiente.
- **Lo verificado como correcto:**
  - RLS en todas las tablas; un visitante sin sesión solo ejecuta 5 RPC;
  - CSRF, secretos internos comparados en tiempo constante y `?next=` seguro;
  - cabeceras y CSP;
  - `npm audit` de producción limpio;
  - ningún secreto en el repositorio;
  - 0 desbordes, foco atrapado y devuelto en las hojas, y CLS < 0,1.

## C. Correcciones

El detalle de cada corrección está en `13-corrections-registry.md`: archivo, causa, solución y prueba.

**Resumen:** migración `20261104120000_audit_review_fixes` (S-01, DB-02, DB-04, N-02); F-01 a F-04; A-01; WCAG 2.4.11; foco visible del «?»; aviso de la bandeja limitada a 100; N-01, N-05 y N-07; y la documentación.

## D. Puntuación final (0–5)

| Área | Antes | Después | Motivo |
|---|---|---|---|
| Arquitectura | 4 | 4 | Sólida; quedan duplicaciones menores (A-02..A-04) |
| Frontend | 3,5 | 4 | Errores visibles en vez de vacíos, y acciones resistentes a cortes de red |
| Backend | 4,5 | 4,5 | Sin cambios de contrato |
| UI/UX | 4 | 4 | Lo pendiente está en archivos de los PR #25 y #26 |
| Base de datos | 4 | 4,5 | Conteos honestos, IP fuera del panel, asignaciones con rol |
| Seguridad | 4 | 4,5 | S-01 cerrado; S-02 depende del captcha |
| QA | 4 | 4,5 | 7 pruebas nuevas de la base y revisión cruzada |
| Rendimiento | 3,5 | 3,5 | El JS inicial y las fuentes siguen pendientes |
| Accesibilidad | 4 | 4 | Foco visible y no tapado; MapLibre en inglés pendiente |
| DevOps | 3 | 3 | Depende de cuentas y secretos |
| Documentación | 3,5 | 4 | Cifras al día y sin instrucciones que no sirven |

## E. Pendientes

- **Necesitan la autorización o las cuentas del dueño:**
  - aplicar la migración en staging (`npm run backup` → `npx supabase db push --remote --dry-run` → `--remote`);
  - activar el captcha (S-02) y crear el Supabase de producción (DB-01);
  - copiar Storage en la copia de seguridad (DB-03);
  - poner los secretos de GitHub (OPS-02/03), cambiar la rama de producción de Vercel (OPS-04) y activar Sentry (OPS-06);
  - decidir el alcance de los perfiles para moderación (DB-05).
- **Después de fusionar los PR #25 y #26** (sus archivos):
  - fuentes `latin` y sin precarga;
  - `priority` en la foto de portada;
  - MapLibre en español y el tamaño del botón de atribución;
  - foco del buscador.
- **De menor impacto:**
  - identificar la importación compartida que trae el cliente de Supabase al JS inicial;
  - idempotencia de las propuestas (F-05);
  - errores de los formularios asociados a cada campo;
  - `find_similar_reports` lento en los picos (DB-06);
  - A-02..A-04 y los P3 de cada informe.

## F. Veredicto

**APPROVED WITH OBSERVATIONS.** Las correcciones están verificadas con pruebas y con la revisión cruzada, y no quedan fallos críticos. Los pendientes se clasifican en dos grupos:
- **No críticos:** los que se resuelven en código.
- **De operación:** los que dependen de cuentas o de la autorización del dueño.

Para publicar falta que el dueño autorice aplicar la migración y fusionar el PR.
