# 04 · Auditoría de backend (Fase 1, solo lectura)

> 03–04/11/2026, rama `auto/auditoria-integral` (`bfa7c18`). Fuentes: código de `src/app/api/v1/**`, los 8 `actions.ts` y la acción en línea de `notificaciones/page.tsx`; definiciones **en vivo** de las 37 funciones `SECURITY DEFINER` que puede ejecutar `authenticated` (`pg_get_functiondef` con `npx supabase db query --remote --read-only`); peticiones no destructivas a https://sr-conecta.vercel.app. No se hizo build, no se levantó servidor y no se creó ningún dato.

## 1. Diagnóstico inicial

El backend es delgado y coherente: cada Route Handler y cada Server Action valida la forma con zod y delega en **una** RPC que vuelve a validar identidad, rol, alcance, transición y límite de uso (ADR-018). Los errores de transporte se convierten en 503 con mensaje genérico; los rechazos de negocio viajan como `{status:'rejected', reason}`. Los secretos de máquina se comparan con SHA-256 + `timingSafeEqual`. **No se encontró ningún hallazgo P0 ni P1.** Lo encontrado es de autorización residual en una RPC (P2) y de contratos/robustez (P3).

## 2. Inventario revisado

| Pieza | Sesión | Origen (CSRF) | zod | RPC | Errores |
|---|---|---|---|---|---|
| `POST /reports` | `requireApiUser` (getClaims) | `isSameOrigin` | `trafficReportInput` | `create_traffic_report` (idempotente) | 503 genérico |
| `POST /reports/similar` | sí | sí | `similarReportsInput` | `find_similar_reports` | nunca falla (lista vacía) |
| `POST /requests` | sí | sí | `citizenRequestInput` | `create_citizen_request` (idempotente) | 503 |
| `POST /requests/:id/vote` | sí | sí | `z.uuid()` | `toggle_request_vote` | 503 |
| `POST /uploads/sign` | sí | sí | enum MIME | `request_upload` + `createSignedUploadUrl` | **sin try/catch** (B-03) |
| `POST /attachments` | sí | sí | entidad, uuid, path 10–200 | `register_attachment` | 503 |
| `POST /engagement` | anónimo | no aplica | sí | `track_engagement` (techo 2000/día) | 204 siempre |
| `GET /map/*`, `/search` | anónimo (cliente sin cookies) | — | bbox/layers; `q` 2–80 | `map_*`, `search_all`, `report_hotspots` | 503 |
| `GET /health` | público | — | — | `worker_queue_health` (service_role) | 503 |
| `POST /internal/jobs/run` | `Bearer JOBS_SECRET` | — | — | `worker_*` | 401 / 503 |
| `GET /cron/weekly-report` | `Bearer CRON_SECRET` | — | — | `weekly_report_begin/finish` | 401 / 503 |
| `GET /auth/callback` | PKCE | — | `safeNext` | `exchangeCodeForSession` | redirección a `/entrar` |
| Server Actions (admin, entrar, negocio, registrar, perfil, proponer, editar lugar/ruta, notificaciones) | cookies + RPC | protección de origen nativa de Next (sin `allowedOrigins` en producción) | sí, salvo los indicados en B-04 | 1 RPC por acción | `unavailable()` genérico |

## 3. Hallazgos

| ID | Sev. | CVSS ≈ | Ubicación | Descripción y causa | Impacto | Escenario | Corrección propuesta | Verificación |
|---|---|---|---|---|---|---|---|---|
| **B-01** | **P2** | 4.3 (AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:L/A:N) | RPC `public.change_request_status`, `supabase/migrations/20260924120100_rpc_citizen.sql:240` (igual en vivo) | La regla `min_role='moderator'` acepta `r.assigned_to = v_uid and p_to in ('in_progress','resolved')` **sin comprobar que la persona siga siendo personal**. `revoke_role` (en vivo) borra el rol pero no limpia `citizen_requests.assigned_to`, y ninguna migración lo hace (`grep assigned_to`). | Un moderador destituido conserva la capacidad de pasar a «en proceso» y **cerrar como resuelta** cualquier consulta que tuviera asignada, con una nota libre que se envía al vecino como notificación («Resuelta: …»). Escalada vertical residual e integridad de datos públicos. | El moderador X tenía asignadas 5 consultas; el admin le quita el rol; X llama `POST /rest/v1/rpc/change_request_status` con su JWT, `p_expected_status='in_progress'`, `p_to='resolved'`, `p_note='…'`. Pasa (`assigned_to = v_uid`). Conoce los id porque los vio antes de perder el rol. | En la rama del asignado, exigir además `private.user_has_role(v_uid, array['moderator','municipal_admin'], r.municipality_id)`; y en `revoke_role` hacer `update citizen_requests set assigned_to = null where assigned_to = p_user_id and municipality_id = p_municipality_id and status in ('under_review','approved','in_progress')`. | Prueba nueva en `supabase/tests/run.mjs`: asignar → revocar → `change_request_status` debe devolver `forbidden`, y `assigned_to` debe quedar `NULL`. |
| B-02 | P3 | 2.7 | RPC `public.weekly_report_begin` (ejecutable por `authenticated`, comprobado con `has_function_privilege`) | Un administrador provincial puede llamarla directamente con `p_manual=true`, saltándose `request_weekly_report`: sin el límite `report_manual`, sin «semana cerrada» ni el rango de 52 semanas, y **sin encolar** `pdf_weekly`. | Versiones de informe huérfanas (sin PDF) y snapshots de KPI de semanas futuras; abuso solo por el rol más confiable. | `rpc('weekly_report_begin', {p_period_start:'2027-01-04', p_manual:true})` en bucle. | `revoke execute ... from authenticated` y dejarla solo a `service_role`; `request_weekly_report` (SECURITY DEFINER, mismo dueño) la sigue llamando. Añadirla a la lista de `security_audit.sql`. | `has_function_privilege('authenticated','public.weekly_report_begin(date,boolean)','execute')` = false; `npm run db:audit`. |
| B-03 | P3 | — | `src/app/api/v1/uploads/sign/route.ts:14` | Único handler con sesión sin `try/catch`: si `request_upload` falla por transporte, `asRpcResult` lanza y Next responde 500 sin el cuerpo `{error:{code,message}}` del contrato (§12.1). | Contrato inconsistente; el cliente (`media/client/photos.ts:38-43`) lo tolera (`.catch(() => ({}))`), así que no rompe la UI. | Supabase caído durante una subida. | Envolver en `try { … } catch { return errorResponse(503,'unavailable',…) }` como el resto. | Prueba unitaria con un cliente simulado que lanza. |
| B-04 | P3 | — | `src/app/(app)/admin/actions.ts:28-66,94`; `entrar/actions.ts:143` | `expected`, `to`, `category`, `role` y `code` llegan a la RPC sin zod (solo los id son `uuid`); `verifyCode` no valida `email`. Además `text(500).parse(note)` **lanza** dentro de `run()`, y una nota demasiado larga se devuelve como `unavailable` en vez de `invalid_field`. | Sin riesgo de seguridad (la RPC rechaza transiciones, roles y códigos inválidos), pero el contrato con el panel es engañoso («sin conexión» cuando el texto es largo). | Moderador pega una nota de 600 caracteres. | `z.enum([...])` para estados y roles, `z.string().max(40)` para `category`/`code`, `safeParse` de la nota con `rejected('invalid_field')`; `z.email()` en `verifyCode`. | Vitest de las acciones. |
| B-05 | P3 | 2.0 | RPC `create_promotion`, `propose_place`, `propose_route`, `set_business_hours`, `submit_business`, `update_place`, `update_route`, `save_catalog_item` (en vivo) | Siguen devolviendo `jsonb_build_object('detail', sqlerrm)` en los `exception when check_violation…`. SECURITY.md (21/10) lo corrigió solo en `update_business` y dejó «las demás para la próxima pasada». | Quien llama la API directamente ve nombres de restricciones y columnas. Las Server Actions **no** lo reenvían (`_content/action-result.ts:13-16` solo pasa `reason` y `message`). | `rpc('propose_place', {p_kind:'xx', …})` → `detail: new row … violates check constraint "tourism_places_kind_check"`. | Quitar `detail` (o registrarlo con `raise log`) en las 8 funciones. | `grep -c "sqlerrm" ` en `pg_get_functiondef` = 0 salvo el `if sqlerrm = 'last_active'`. |
| B-06 | P3 | — | `propose_place`, `propose_route`, `create_promotion` | No son idempotentes (a diferencia de reportes, consultas y negocios). Un doble envío por red lenta crea dos propuestas. | Duplicados en la bandeja de validaciones; acotado por `proposal_create` (5/día) y `business_update`. | Doble toque en «Enviar» con conexión lenta. | Añadir `p_idempotency_key` como en `submit_business`, o deshabilitar el botón mientras `useTransition` está pendiente (verificar en el front). | Prueba de base: misma clave dos veces → `duplicate:true`. |
| B-07 | P3 | — | `src/app/api/v1/health/route.ts` | Endpoint público que ejecuta una consulta con `service_role` en cada petición, sin caché. | Pequeña amplificación (cada GET anónimo = una consulta a la base); solo cifras agregadas (verificado: `{"status":"ok","queue":{…}}`). | Monitor externo o abuso con muchas peticiones. | `Cache-Control: public, s-maxage=30` (el monitor tolera 30 s) o límite en Vercel Firewall. | `curl -I` muestra la cabecera nueva. |

## 4. Verificado como correcto (con su prueba)

- **CSRF en Route Handlers**: `POST /api/v1/reports` con `Origin: https://evil.example` → **403** en producción; sin sesión → **401** `not_authenticated` (curl, 04/11).
- **Secretos de máquina**: `GET /cron/weekly-report` sin cabecera → 401; `POST /internal/jobs/run` con `Bearer x` → 401. `hasBearer` compara SHA-256 con `timingSafeEqual` (`src/lib/internal-auth.ts:12-13`); `CRON_SECRET` y `JOBS_SECRET` exigen ≥ 32 caracteres (`src/config/server-env.ts:7-8`).
- **Sesión**: `getClaims()` (firma del JWT) en `requireApiUser`, `getViewer`, `saveProfile`, `savePreferences` y el proxy; nunca `getSession()`.
- **Idempotencia** de reportes, consultas y negocios: búsqueda previa por `(autor, idempotency_key)` y `exception when unique_violation` que devuelve el existente (definiciones en vivo de `create_traffic_report`, `create_citizen_request`, `submit_business`). La cola offline reenvía la misma clave (`src/lib/outbox.ts:77-78`) y saca el ítem antes de subir fotos.
- **Transacciones**: cada caso de uso es una sola RPC (una transacción). El único flujo de varios pasos (firmar → PUT → registrar) es seguro ante cortes: permiso de un solo uso (`request_upload`, `upload_grants`), registro que exige ruta propia, objeto existente, MIME y tamaño ≤ 5 MB, y limpieza a 24 h.
- **Concurrencia**: compare-and-set por estado (`moderate_traffic_report`, `change_request_status`, `review_content`) y por `version` (`update_business/place/route`); `worker_claim_jobs` con `SKIP LOCKED`.
- **Errores**: todos los handlers salvo B-03 devuelven `{error:{code,message}}` con `no-store`; los Server Actions devuelven mensajes simples (`unavailable()`); `instrumentation.ts` registra sin cabeceras, cookies, cuerpo ni query string (`src/lib/error-report.ts:2-3,34`).
- **Límites de tamaño**: zod acota todos los textos (500/1000/2000), el horario a 21 filas, las rutas a 2–5000 puntos en la base, las fotos a 5 MB (bucket `file_size_limit=5242880` en vivo) y los avatares a 64 KB; las Server Actions tienen el límite por defecto de Next (1 MB).
- **Contrato con la cola offline**: 401 → «requiere iniciar sesión», 429/5xx/408 → reintento, rechazo → aviso visible (`outbox.ts:86-99`), coherente con `httpStatusFor` (`src/lib/http.ts:7-21`).

## 5. No verificado

- La protección de origen nativa de las Server Actions en producción con una sesión real (requiere una cuenta; solo se verificó que no hay `serverActions.allowedOrigins` fuera de desarrollo, `next.config.ts:30`).
- Comportamiento bajo carga (no se hicieron pruebas de volumen, por regla).
- El worker con imágenes maliciosas reales (solo lectura de `process-image.ts`: magic bytes, 40 MP, sin metadatos; tiene sus pruebas unitarias).

## 6. Puntuación: **4,5 / 5**

Validación doble (zod + RPC) en todas las entradas, sesión verificada por firma, CSRF por origen probado en vivo, idempotencia y compare-and-set bien resueltos y errores sin detalles internos en la app. Resta medio punto por B-01 (autorización residual tras revocar un rol, reproducible leyendo la función en vivo) y por los detalles de contrato B-03 a B-06.
