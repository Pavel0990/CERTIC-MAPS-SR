# Reparto del trabajo: del 7 al 27 de octubre

El código está prácticamente terminado: las seis funcionalidades del reto funcionan en https://sr-conecta.vercel.app. Lo que falta para ganar es **contenido, prueba con personas reales y una demo ensayada**. Este reparto lo divide entre **dos personas** con una carga parecida (unas 30 horas cada una), para avanzar en paralelo sin pisarse.

**Regla de oro: el código queda congelado.** Solo se cambia código para corregir lo que salga de la prueba con vecinos o un error real.

| Persona | Frente | En una frase | Horas aprox. | ¿Programa? |
|---|---|---|---|---|
| **A** · ________ | **Contenido y presentación** | Que el mapa muestre la provincia de verdad y que la presentación lo cuente bien | ~30 h | No: todo desde el panel |
| **B** · ________ | **Vecinos, correcciones y plataforma** | Probar con personas reales, corregir lo que salga y que nada se caiga el día de la demo | ~29 h | Sí |

Las horas incluyen las tareas comunes (ensayos y reuniones), unas 5 h por persona.

**Ya hecho, no hay que repetirlo:**
- copia de seguridad diaria cifrada, activa y verificada;
- datos reales de OpenStreetMap;
- listados de negocios, lugares y rutas;
- pruebas E2E;
- documentación al día.

Fechas comunes:

| Fecha | Hito |
|---|---|
| **Domingo 12/10** | 15 lugares completos (A) · Ronda 1 con vecinos hecha (B) |
| **Domingo 19/10** | Rutas validadas (A) · Correcciones publicadas y ronda 2 hecha (B) |
| **Miércoles 22 y viernes 24/10** | **Ensayos de la demo, los dos juntos** |
| **Lunes 27/10** | **Código congelado** · Video grabado · Revisión final |

---

## Persona A · Contenido y presentación

**Objetivo:** que un jurado de Santiago Rodríguez abra cualquier ficha y reconozca su provincia, y que la presentación explique el proyecto en pocos minutos.

**Herramientas:**
- Cuenta de **administración** en la app: **Panel → Validaciones** y **Catálogos**, y el botón **Editar** en las fichas de lugares y rutas.
- Teléfono con cámara.
- [Manual administrativo](manual-administrativo.md).

| # | Tarea | Hecho cuando… | Fecha | Horas |
|---|---|---|---|---|
| A1 | Elegir los **15 lugares más importantes**: Presa de Monción, parques centrales, reservas, miradores, balnearios… Los que falten se agregan con **Proponer un lugar** y se aprueban en el panel | Lista de 15, todos en la app | 09/10 | 2 |
| A2 | Completar esos 15 lugares con: **descripción** de 2–4 frases en lenguaje sencillo, **qué hay** (servicios, accesibilidad), **horario** si aplica y **al menos 1 foto propia** (no de internet, por derechos de autor) | Ninguno dice "la descripción la completa el municipio" | 12/10 | 7 |
| A3 | Revisar los **84 negocios**: quitar o corregir los que no existen o están mal ubicados. Completar teléfono y horario de los **20 más conocidos** (colmados, farmacias, restaurantes del centro) | Ningún negocio cerrado aparece en el mapa | 15/10 | 4 |
| A4 | **Validar las 3 rutas** con alguien que las conozca o recorriéndolas: corregir el trazado (**Editar**) o archivarlas. Agregar **1 o 2 rutas reales** con **Proponer una ruta**, dibujándolas o con un GPX del teléfono | Las rutas publicadas existen y se pueden hacer | 19/10 | 4 |
| A5 | Revisar los **catálogos** (**Panel → Catálogos**): ¿faltan tipos de alerta o de negocio que se usen en la zona? | Los tipos coinciden con cómo habla la gente de allí | 19/10 | 1 |
| A6 | **Probar en teléfonos reales**: un Android barato con datos móviles y un iPhone con la app instalada (push y modo sin conexión). Usar la tabla "Prueba completa a mano" del [guion](guion-demo.md#prueba-completa-a-mano-teléfono-real) y abrir un *issue* para B por cada fallo | Tabla con ✅ o el problema encontrado | 17/10 | 3 |
| A7 | Preparar el **contenido de la demo**: 2–3 negocios con promoción activa y fotos, y un reporte real en la bandeja | Comprobado en el primer ensayo | 22/10 | 2 |
| A8 | **Presentación**: 5–6 diapositivas de apoyo (problema, solución, arquitectura en un dibujo, costos, datos abiertos y los resultados de la prueba con vecinos que le pasa B). El resto es la app en vivo | Diapositivas listas para el primer ensayo | 21/10 | 2 |

**No hace falta** completar los 84 negocios ni escribir textos largos. Mejor 15 fichas excelentes que 100 a medias.

---

## Persona B · Vecinos, correcciones y plataforma

**Objetivo:** demostrar con datos que gente con poca experiencia digital usa la app (criterio de 20 puntos), corregir lo que no entienda y dejar la plataforma estable y a nombre de la organización.

**Herramientas:**
- La [guía de prueba con vecinos](prueba-con-vecinos.md) impresa.
- El repositorio, y acceso a GitHub, Vercel y Supabase.
- [DEPLOYMENT.md](../DEPLOYMENT.md) y el [guion de la demo](guion-demo.md).

| # | Tarea | Hecho cuando… | Fecha | Horas |
|---|---|---|---|---|
| B1 | Conseguir **5–6 vecinos variados**: una persona mayor, alguien que casi solo usa WhatsApp, un comerciante, un joven, alguien de Monción o Villa Los Almácigos | Agenda cerrada | 08/10 | 1 |
| B2 | Hacer la **ronda 1** siguiendo la guía: no ayudar, tomar tiempos y anotar las palabras que no entienden | 5 hojas llenas | 11/10 | 4 |
| B3 | Pasar las hojas a **Resultados** y abrir un *issue* por problema (etiqueta `ux`): ordenados por cuántas personas lo tuvieron y, si es de palabras, con el **texto nuevo** propuesto | Lista de *issues* priorizada | 13/10 | 2 |
| B4 | **Corregir los *issues*** `ux` y los que abra A en A6, por gravedad. Si un cambio trae migración: primero `db push`, después `main`. Antes de cada push: `npm run check`, `npm run test:db` y `npm run test:e2e` | *Issues* cerrados con su commit | 17/10 | 7 |
| B5 | Hacer la **ronda 2** con 3–5 personas **distintas**, después de las correcciones, y pasarle los resultados a A para la presentación | Comparación ronda 1 frente a ronda 2 (p. ej. "de 22/35 a 31/35 tareas sin ayuda") | 19/10 | 3 |
| B6 | **Cuentas:** una sola cuenta de Vercel (la del equipo), sin proyectos sobrantes ni publicaciones a mano. Compartir las cuentas con la organización ([DEPLOYMENT.md §9](../DEPLOYMENT.md#9-traspaso-a-cuentas-de-la-organización)): al menos dos dueños en GitHub, Supabase y Vercel | Ningún servicio depende de una sola persona | 15/10 | 2 |
| B7 | **Mantener Supabase despierto** (el plan gratuito se pausa tras unos 7 días sin uso): revisar `/api/v1/health` dos veces por semana y que la copia diaria siga en verde en *Actions → backup* | La web nunca amanece pausada | Continuo | 1 |
| B8 | **Grabar el video de respaldo** (unos 12 minutos) con la versión final. Subirlo como no listado y guardarlo en una memoria USB | Video en dos lugares | 26/10 | 3 |
| B9 | **Congelar y revisar** el 27/10: `main` en verde, copia del día, salud "ok", sesiones iniciadas en los teléfonos de la demo | Lista "Antes de empezar" del guion completa | 27/10 | 1 |

**Opcional, solo si sobra tiempo:**
- dominio propio y Resend para el correo;
- captcha en el inicio de sesión ([SECURITY.md](../SECURITY.md)).

---

## Juntos (A y B)

| # | Tarea | Fecha | Horas cada uno |
|---|---|---|---|
| J1 | **Dos ensayos completos** de 25 minutos con cronómetro, siguiendo el [guion](guion-demo.md). Uno habla y el otro maneja los teléfonos y la computadora; el guion se ajusta después de cada ensayo | 22/10 y 24/10 | 3 |
| J2 | Reunión de 15 minutos los **lunes y jueves**: qué terminé, qué sigue y qué me bloquea | Toda la etapa | 2 |

## Cómo nos coordinamos

- **Un solo lugar para las tareas:** los *issues* de GitHub, con las etiquetas `contenido` (A), `ux` y `plataforma` (B). Cada persona cierra los suyos.
- **Dependencias:**
  - B entrega los resultados de los vecinos → A los usa en la presentación (A8).
  - A encuentra fallos en los teléfonos (A6) → B los corrige (B4).
  - A deja listo el contenido de la demo (A7) → se prueba en el primer ensayo (J1).
- **Una sola sesión de trabajo por carpeta.** Quien programe (B) trabaja en su propia rama o en su propia carpeta: dos sesiones a la vez en la misma carpeta pueden pisarse.
- **Sin cambios por fuera de la app:** nadie toca la base a mano (SQL Editor) ni publica en Vercel desde su computadora. El contenido se edita desde el panel; el código entra por `main`.
- **Antes de cambios grandes de datos:** `npm run backup` (lo hace B).

---

## Reglas técnicas (para quien toque código)

**Ramas:** `main` es la rama principal y la de producción. Cada persona trabaja en su rama y entra por pull request:

```bash
git fetch origin
git switch -c fix/<tema> origin/main
# … cambios …
git fetch origin && git rebase origin/main
npm run check          # lint + tipos + unitarias + fronteras de módulos
npm run test:db        # si tocaste migraciones
npm run test:e2e       # con npm run dev corriendo
```

- **Pull requests pequeños:** uno por problema. Nunca `push --force` a `main` ni a la rama de otra persona.
- **Secretos:** solo en `.env.local`. Nunca en el chat, el código ni los commits.

**Publicación (Vercel):**

| Cuando se sube a… | Vercel hace… |
|---|---|
| `main` | Publica en **https://sr-conecta.vercel.app** |
| cualquier otra rama | Crea una **vista previa** privada; el enlace aparece en el PR |

- **No publiques a mano** con `npx vercel deploy --prod`: sube a GitHub y Vercel publica solo.
- **Migraciones:** se aplican primero a la base (`npx supabase db push`, antes con `--dry-run`) y **después** se sube el código a `main`.

**Archivos compartidos:**

| Archivo | Regla |
|---|---|
| `supabase/migrations/*` | Nunca editar una ya aplicada. Se crea una nueva con `npx supabase migration new <nombre>`, con su prueba en `supabase/tests/run.mjs` |
| `src/types/database.ts` | No editar a mano: `npm run db:types` |
| `package.json` / `package-lock.json` | Avisar antes de agregar una dependencia |
| `src/lib/vocabulary.ts` | Solo **agregar** líneas al final de cada lista |

---

## Historial

- **Frente A, contenido (A1–A7):** fichas, alta y panel de negocio, propuestas y edición. Completado el 02/10/2026.
- **Frente B, plataforma (B1–B7):** worker, PDF, PWA, push, despliegue y documentación. Completado entre el 02/10 y el 05/10/2026. Con él quedaron también los catálogos editables, los datos reales de OpenStreetMap, los listados, las pruebas E2E y las copias de seguridad.
- **Plan de tres personas (07/10/2026):** reemplazado el mismo día por este reparto entre dos.

El detalle de los repartos anteriores está en el historial de git de este archivo.
