# ADR-021 · Descarga del PDF con auditoría obligatoria

| Estado | Fecha | Referencia |
|---|---|---|
| Aceptada | 25/09/2026 | [ARCHITECTURE.md](../../ARCHITECTURE.md) §9.6, §10.9 |

## Contexto

La v1.x decía que las descargas del PDF se auditan, pero ninguna pieza lo hacía, y la URL firmada se iba a crear con `service_role` dentro de un request de usuario, contra ADR-018.

## Decisión

El servidor llama `authorize_report_download(run_id)` con el JWT del administrador: valida el rol, registra `report.download` en `audit_logs` y devuelve la ruta. La política de Storage `reports_pdf_read_after_audit` solo deja leer el PDF a quien registró esa descarga en los últimos 5 minutos. La URL firmada (5 min) se crea con el JWT del usuario.

## Alternativas descartadas

- Firmar con `service_role` y auditar desde Next.js (auditoría opcional, contra ADR-018)
- No auditar las descargas

## Consecuencias

**A favor:**

- La auditoría no se puede saltar: sin rastro no hay lectura.
- Sin `service_role` en requests de usuario.

**En contra:**

- Una consulta extra a `audit_logs` al firmar la URL (indexada por actor).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| La política de Storage no se evalúa igual en Supabase real | Verificarlo en la semana 1 (ARCHITECTURE.md §20). |
