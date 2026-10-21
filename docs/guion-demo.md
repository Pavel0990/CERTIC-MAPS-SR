# Guion de la demo (25 minutos)

Demo en vivo del 28 al 30/11/2026, con datos reales. Este guion reparte el tiempo según los criterios de evaluación e incluye el plan B por si algo falla.

**Quién:** dos personas. Una habla y la otra maneja los teléfonos y la computadora.
**Equipo:**
- **Teléfono A:** vecino, con la sesión iniciada y la app instalada en la pantalla de inicio.
- **Teléfono B:** moderador.
- **Computadora:** panel municipal, con la cuenta de administración provincial, y la presentación (6 diapositivas) abierta en otra pestaña.
- **Proyector**, y el **video de respaldo** en una memoria USB y descargado en la computadora.

---

## Antes de empezar (el día anterior y 30 minutos antes)

- [ ] `https://sr-conecta.vercel.app/api/v1/health` responde `"status":"ok"`.
- [ ] Hacer una copia de seguridad (`npm run backup`).
- [ ] Recorrer los flujos de "Prueba completa a mano" (abajo) en un teléfono real.
- [ ] Iniciar la sesión en los dos teléfonos y en la computadora. El código del correo puede tardar: no lo dejes para el momento de la demo.
- [ ] Generar el informe PDF de la semana anterior (**Panel → Informes → Generar ahora**) y comprobar que se descarga.
- [ ] Ver que la bandeja tenga al menos un reporte real pendiente, para mostrar cómo se atiende.
- [ ] Llevar el teléfono cargado y un punto de acceso móvil propio. No dependas del wifi del lugar.
- [ ] Probar el video de respaldo en el proyector.

## Guion

El tiempo sigue el peso de cada criterio de la rúbrica (100 puntos → 25 minutos, unos 15 segundos por punto). Cuando un bloque sirve a dos criterios, sus minutos se reparten entre ambos.

| Criterio | Puntos | Minutos que le tocan | Minutos en este guion |
|---|---|---|---|
| Funcionalidad (MVP) | 25 | 6¼ | 6½ |
| UX/UI para baja alfabetización digital | 20 | 5 | 5 |
| Innovación | 20 | 5 | 5 |
| Impacto territorial | 15 | 3¾ | 4 |
| Sostenibilidad | 10 | 2½ | 2 |
| Código y documentación | 10 | 2½ | 2½ |

Las diapositivas (6) están en la presentación de claude.ai: ábrela en la computadora antes de empezar.

| Min | Qué se muestra | Qué se dice | Criterio |
|---|---|---|---|
| 0–2 | **Diapositivas 1 y 2** (problema y solución), luego la portada en el teléfono A, proyectado | El problema: la información de la provincia está dispersa y el vecino no sabe a quién avisar. Seis cosas que resuelve, en los 3 municipios | Impacto territorial |
| 2–6 | **Mapa** y luego **Negocios / Lugares / Rutas** en lista: filtrar por municipio, abrir una ficha, **Llamar** y **Cómo llegar** | "Datos reales de la provincia: 84 negocios, presas y parques, rutas trazadas sobre caminos reales. Y en lista, para quien no se maneja con mapas" | MVP (F1–F3), UX |
| 6–9 | **Reportar** un bache en 3 toques, con foto | "Sin escribir mucho. La foto se limpia sola: no guarda dónde vives" | MVP (F4–F5), UX |
| 9–12 | **Teléfono B (moderador):** llega el aviso. Bandeja → **Publicar en el mapa**. En el teléfono A aparece la alerta **en vivo**, sin recargar | "Tiempo real: el vecino de al lado ya lo ve" | Innovación |
| 12–13 | Teléfono A: **Actividad**. El reporte cambió de estado y llega la notificación | "El vecino sabe qué pasó con lo que reportó" | MVP, UX |
| 13–14 | Quitar la señal del teléfono A y abrir el mapa y **Reportar** | "Sin señal en la loma, el reporte se guarda y se envía solo al volver" | Innovación |
| 14–17 | **Computadora:** Panel → Resumen (indicadores **por municipio**), Bandeja (asignar responsable), Validaciones (aprobar un negocio) | "Cada ayuntamiento ve lo que pasa en sus comunidades y lo atiende desde aquí" | MVP, impacto territorial |
| 17–19 | **Informes → Descargar PDF**. Auditoría | "Cada lunes se genera solo. Cada descarga queda registrada" | MVP (F6), innovación |
| 19–20 | **Diapositiva 6:** resultados de la prueba con vecinos | "Lo probaron [__] vecinos sin ayuda: de [__]/35 a [__]/35 tareas" | UX |
| 20–22 | **Catálogos:** agregar un tipo de reporte en vivo y mostrarlo en el teléfono. **Diapositiva 5** (costos y traspaso) | "Si mañana necesitan reportar 'animales en la vía', lo agregan ellos. Hoy cuesta US$0 al mes y las cuentas pasan a la organización" | Sostenibilidad |
| 22–25 | **Diapositivas 3 y 4** (arquitectura y seguridad), código abierto en GitHub (MIT), documentación y pruebas. Cierre con la diapositiva 6 | "173 pruebas de la base de datos, con ataques directos incluidos. Se lo puede quedar FUNDESER". Cierre: "un vecino que avisa, un ayuntamiento que responde" | Código y documentación, impacto territorial |

**Si vas tarde:** acorta primero Validaciones (14–17) y el recorrido por las listas (2–6). No recortes la alerta en vivo ni los resultados de los vecinos: son los criterios de más peso que no se ven en ningún otro momento.

## Plan B

| Si falla… | Haz esto |
|---|---|
| La red del lugar | Punto de acceso del teléfono. Si tampoco hay, **video de respaldo** |
| El correo del código no llega | Las sesiones ya están iniciadas. Si se cerró una: `node --env-file=.env.local scripts/staging-test-users.mjs --otp <correo>` en la computadora |
| La alerta en vivo no aparece | Recargar el mapa (es el mismo dato). Explicar que llega por Realtime |
| Vercel o Supabase caídos | Video de respaldo y diapositiva de arquitectura. Comprobar `/api/v1/health` |
| El PDF no se genera | Descargar el de la semana anterior, generado el día antes |

## Video de respaldo

Grábalo **después** de la última corrección, siguiendo este guion completo (unos 12 minutos, sin la parte de GitHub):
- usa la grabación de pantalla del teléfono y de la computadora;
- añade voz o subtítulos;
- súbelo como no listado a YouTube **y** guárdalo en una memoria USB.

## Prueba completa a mano (teléfono real)

`npm run test:e2e` (Playwright) prueba solo, en un navegador, los listados públicos y el recorrido 1→2: vecino reporta, moderador publica, sale en el mapa. Lo demás depende del teléfono (GPS, cámara, push, quitar la señal) y se prueba **a mano** antes de la demo y después de cada cambio grande:

| # | Recorrido | Resultado esperado |
|---|---|---|
| 1 | Vecino reporta una alerta de tránsito con foto | Aparece en **Actividad** como "Por confirmar". La foto se ve, sin datos de ubicación |
| 2 | El moderador la ve en la **Bandeja** (le llega aviso) → **Publicar en el mapa** | Aparece en el mapa del vecino sin recargar. Los vecinos del municipio reciben aviso |
| 3 | Vecino reporta un problema (p. ej. basura) | Moderador: **Empezar revisión → Aprobar → Asignar → Empezar el trabajo → Marcar resuelto**. El vecino recibe un aviso en cada paso |
| 4 | Comerciante registra su negocio | Le aparece en **Validaciones** al moderador → **Aprobar**. Sale en el mapa y en **Negocios**. El dueño ve **Mi negocio** |
| 5 | Sin señal: reportar | Se guarda. Al volver la señal se envía solo y aparece el aviso "Enviamos el reporte…" |
| 6 | Administración provincial: **Generar ahora** el informe | En segundos aparece la versión nueva y se descarga |
| 7 | Push: **Perfil → Activar** en Android y cambiar el estado de un reporte | Llega la notificación con la app cerrada |
