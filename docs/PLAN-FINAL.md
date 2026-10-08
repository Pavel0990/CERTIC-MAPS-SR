# Plan final: del 7 al 27 de octubre

El código está prácticamente terminado: las seis funcionalidades del reto funcionan en https://sr-conecta.vercel.app. Lo que falta para ganar es **contenido, prueba con personas reales y una demo ensayada**. Este plan reparte ese trabajo entre tres personas para avanzar en paralelo.

**Regla de oro: el código queda congelado.** Solo se cambia código para corregir lo que salga de la prueba con vecinos o un error real. Cada función nueva ahora es un riesgo para la demo.

| Persona | Frente | En una frase | ¿Programa? |
|---|---|---|---|
| **1** · ________ | **Contenido** | Que el mapa muestre la provincia de verdad: fotos, descripciones y rutas validadas | No: todo desde el panel |
| **2** · ________ | **Vecinos y UX** | Probar con personas reales y conseguir que lo que salga se corrija | Poco: anota y corrige textos |
| **3** · ________ | **Plataforma y demo** | Que nada se caiga el día de la demo y que la presentación salga perfecta | Sí: correcciones, cuentas y despliegue |

Fechas comunes:

| Semana | Hito |
|---|---|
| **Domingo 12/10** | Contenido principal cargado · Ronda 1 con vecinos hecha · Copias de seguridad activas |
| **Domingo 19/10** | Correcciones de la ronda 1 publicadas · Rutas validadas · Ronda 2 hecha |
| **Viernes 24/10** | Ensayos de la demo · Recorridos completos en teléfonos reales |
| **Lunes 27/10** | **Código congelado** · Video grabado · Revisión final |

---

## Persona 1 · Contenido

**Objetivo:** que un jurado de Santiago Rodríguez abra cualquier ficha y vea la provincia que conoce, no una lista sin fotos.

**Herramientas:**
- Cuenta de **administración** en la app: **Panel → Validaciones**, las fichas de **Lugares** y **Rutas** (botón **Editar**), y **Panel → Catálogos**.
- Teléfono con cámara.
- [Manual administrativo](manual-administrativo.md).

| # | Tarea | Hecho cuando… | Fecha |
|---|---|---|---|
| 1.1 | Elegir los **15 lugares más importantes** de la provincia: Presa de Monción, parques centrales, reservas, miradores, balnearios… Los que falten en la app se agregan con **Proponer un lugar** y se aprueban en el panel | Hay una lista de 15, todos en la app | 09/10 |
| 1.2 | Completar esos 15 lugares: **descripción** de 2–4 frases en lenguaje sencillo, **qué hay** (servicios, accesibilidad), **horario** si aplica y **al menos 1 foto propia** (no de internet: derechos de autor) | Ninguno dice "la descripción la completa el municipio" | 12/10 |
| 1.3 | Revisar los **84 negocios**: quitar o corregir los que ya no existen o están mal ubicados. Completar teléfono y horario de los **20 más conocidos** (colmados, farmacias, restaurantes del centro) | Ningún negocio cerrado aparece en el mapa | 15/10 |
| 1.4 | **Validar las 3 rutas** con alguien que las conozca o recorriéndolas. Corregir el trazado (**Editar**) o archivar las que no tengan sentido. Agregar **1 o 2 rutas reales** (senderos conocidos) con **Proponer una ruta**, dibujándolas o con un GPX del teléfono | Las rutas publicadas existen y se pueden hacer | 19/10 |
| 1.5 | Revisar los **catálogos** (**Panel → Catálogos**): ¿faltan tipos de alerta o de negocio que usen en la zona? | Los tipos coinciden con cómo habla la gente de allí | 19/10 |
| 1.6 | Preparar el **contenido de la demo**: 2–3 negocios con promoción activa y fotos, y un reporte real en la bandeja | Persona 3 lo confirma en el ensayo | 22/10 |

**No hace falta:** cargar los 84 negocios completos ni escribir textos largos. Mejor 15 fichas excelentes que 100 a medias.

---

## Persona 2 · Vecinos y UX

**Objetivo:** demostrar con datos que gente con poca experiencia digital puede usar la app (criterio de 20 puntos), y corregir lo que no entiendan.

**Herramientas:** la [guía de prueba con vecinos](prueba-con-vecinos.md) impresa, la URL pública y el teléfono **de cada vecino**.

| # | Tarea | Hecho cuando… | Fecha |
|---|---|---|---|
| 2.1 | Conseguir **5–6 vecinos variados**: una persona mayor, alguien que casi solo usa WhatsApp, un comerciante, un joven, alguien de Monción o Villa Los Almácigos | Agenda cerrada | 08/10 |
| 2.2 | **Ronda 1** siguiendo la guía: no ayudar, tomar tiempos y anotar palabras que no entienden | 5 hojas llenas | 11/10 |
| 2.3 | Pasar las hojas a la tabla de **Resultados** de la guía y hacer la **lista de problemas** ordenada por cuántas personas los tuvieron. Cada problema: qué vio, qué esperaba, qué hizo | Lista entregada a Persona 3 como *issues* de GitHub (uno por problema, etiqueta `ux`) | 12/10 |
| 2.4 | **Textos:** proponer el texto nuevo de cada palabra que confundió (botones, avisos, estados) | Cada *issue* de texto trae su texto propuesto | 13/10 |
| 2.5 | Probar los recorridos en **teléfonos reales**: un Android barato con datos móviles y un iPhone con la app instalada (push y modo sin conexión). Sigue la tabla "Prueba completa a mano" del [guion de la demo](guion-demo.md#prueba-completa-a-mano-teléfono-real) | Tabla con ✅ o el problema encontrado | 17/10 |
| 2.6 | **Ronda 2** con 3–5 personas **distintas**, después de las correcciones | Comparación ronda 1 vs. ronda 2 (p. ej. "de 22/35 a 31/35 tareas sin ayuda") | 19/10 |
| 2.7 | Preparar para la demo **2–3 citas** de vecinos y fotos de la prueba, con su permiso | Persona 3 las incluye en la presentación | 22/10 |

**Esto es lo que más puntos da:** decir en la demo "lo probamos con 10 vecinos y corregimos esto" pesa mucho más que cualquier función nueva.

---

## Persona 3 · Plataforma y demo

**Objetivo:** que la plataforma sea estable y esté a nombre de la organización, que lo de Persona 2 se corrija rápido y que la demo salga sin sorpresas.

**Herramientas:**
- El repositorio y la carpeta del proyecto;
- acceso a GitHub, Vercel y Supabase;
- [DEPLOYMENT.md](../DEPLOYMENT.md) y el [guion de la demo](guion-demo.md).

| # | Tarea | Hecho cuando… | Fecha |
|---|---|---|---|
| 3.1 | **Unificar cuentas.** Una sola cuenta de Vercel (la del equipo CERTIC SR MAPS), borrar los proyectos sobrantes y que **nadie publique a mano** (`vercel deploy --prod`). Solo publica `main` desde GitHub | `npx vercel whoami` muestra la cuenta correcta en todas las computadoras | 09/10 |
| 3.2 | **Activar las copias de seguridad:** secretos `SUPABASE_DB_URL` y `BACKUP_PASSPHRASE`, y la variable `BACKUP_ENABLED=true` en GitHub. Guardar la frase en un lugar seguro. Ejecutarlo una vez a mano | Hay un artefacto cifrado en *Actions → backup* | 10/10 |
| 3.3 | **Pasar las cuentas a la organización** (DEPLOYMENT §9): GitHub, Supabase, Vercel, correo. Si no hay tiempo para todo, al menos invitar a una segunda persona como dueña en cada una | Ningún servicio depende de una sola persona | 15/10 |
| 3.4 | **Corregir los *issues* `ux`** de Persona 2, por orden de gravedad. Si un cambio trae migración: primero `db push`, después `main`. Antes de cada push: `npm run check`, `npm run test:db` y, con la app corriendo, `npm run test:e2e` | *Issues* cerrados con su commit | 17/10 |
| 3.5 | **Mantener Supabase despierto.** El plan gratuito se pausa tras unos 7 días sin uso. Revisar `/api/v1/health` 2 veces por semana, o pasar a Pro (25 US$) solo para octubre | La web nunca amanece pausada | Continuo |
| 3.6 | **Presentación:** 5–6 diapositivas de apoyo (problema, solución, arquitectura en un dibujo, costos, datos abiertos, resultados de la prueba con vecinos). El resto es la app en vivo | Diapositivas listas | 21/10 |
| 3.7 | **Dos ensayos** completos de 25 minutos con cronómetro, siguiendo el [guion](guion-demo.md), con Persona 1 y Persona 2 de público. Ajustar el guion | Cabe en 25 min con margen | 22/10 y 24/10 |
| 3.8 | **Grabar el video de respaldo** (unos 12 min) con la versión final. Subirlo como no listado y guardarlo en una memoria USB | Video en dos lugares | 26/10 |
| 3.9 | **Congelar y revisar** el 27/10: `main` en verde, copia de seguridad del día, salud "ok", sesiones iniciadas en los teléfonos de la demo | Lista "Antes de empezar" del guion completa | 27/10 |

**Opcional, solo si sobra tiempo:**
- dominio propio + Resend para el correo;
- captcha en el inicio de sesión ([SECURITY.md](../SECURITY.md)).

---

## Cómo nos coordinamos

- **Un solo lugar para las tareas:** los *issues* de GitHub, con etiquetas `contenido`, `ux` y `plataforma`. Cada persona cierra los suyos.
- **Reunión de 15 minutos** los lunes y jueves: qué terminé, qué sigue y qué me bloquea.
- **Dependencias:**
  - Persona 2 entrega problemas → Persona 3 los corrige → Persona 2 los vuelve a probar en la ronda 2.
  - Persona 1 deja listo el contenido de la demo → Persona 3 lo usa en el guion.
- **Nadie toca la base de datos a mano** (SQL Editor) ni publica en Vercel desde su computadora. El contenido se edita desde el panel de la app; el código entra por `main`.
- **Antes de cambios grandes de datos:** `npm run backup`, lo hace Persona 3.
