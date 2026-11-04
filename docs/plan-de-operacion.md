# Plan de operación municipal

**Cómo el municipio opera y actualiza SR Conecta sin el equipo que la desarrolló.** Una página para el ayuntamiento y FUNDESER. Las instrucciones paso a paso están en el [manual del panel](manual-administrativo.md) (personal municipal) y en el [manual de despliegue](../DEPLOYMENT.md) (técnico).

---

## 1. Cuánto cuesta

| Servicio | Para qué | Costo hoy | Cuándo habría que pagar |
|---|---|---|---|
| Vercel (Hobby) | Publica la aplicación | **RD$0** | Si se quiere más de un administrador de la cuenta o uso comercial: plan Pro, unos US$20 al mes |
| Supabase (Free) | Base de datos, fotos e inicio de sesión | **RD$0** | Pasando de 500 MB de datos o 1 GB de fotos: plan Pro, unos US$25 al mes. Con el uso de la provincia eso tarda años |
| GitHub | Código, copias diarias y vigilancia | **RD$0** | Nunca para un repositorio público |
| OpenFreeMap y OpenStreetMap | Mapa base y datos abiertos | **RD$0** | Nunca: sin clave ni límite de visitas |
| Resend | Correos de acceso | **RD$0** | Pasando de 3.000 correos al mes |
| Cloudflare Turnstile | Captcha contra abusos | **RD$0** | Nunca |
| Dominio propio (opcional) | Una dirección fácil, como `srconecta.gob.do` | — | Unos US$12 al año (`.com`); el `.gob.do` lo gestiona el Estado |

**Total hoy: RD$0 al mes.** Precios de referencia de octubre de 2026; conviene revisarlos una vez al año.

## 2. Quién hace qué

| Persona | Qué hace | Cuánto tiempo |
|---|---|---|
| **Moderación** (1 por municipio) | Revisa la **Bandeja**: confirma alertas de tránsito y atiende los reportes de los vecinos | 15 minutos al día |
| **Administración municipal** (1 por municipio) | **Validaciones** de negocios, lugares, rutas y fotos; da el rol de moderación; descarga el informe semanal | 30 minutos a la semana |
| **Administración provincial** (FUNDESER) | Revisa el informe de la provincia; cuida los **Catálogos** (tipos de alerta, categorías de negocios y reportes); da el rol de administración municipal | 1 hora al mes |
| **Responsable técnico** (opcional; puede ser un estudiante del ITSC) | Tareas de la §4; solo si algo falla o hay que cambiar el código | 1 hora al mes |

Nadie necesita saber programar para las tres primeras filas: todo se hace desde el panel, en el teléfono o en la computadora.

## 3. Lo que se actualiza sin programar

Desde el panel (**Perfil → Panel municipal**):

- **Contenido:** negocios, lugares turísticos, rutas, fotos y promociones. Los propone cualquiera y el municipio los aprueba o los corrige.
- **Catálogos:** tipos de alerta de tránsito, categorías de negocios y de reportes. Se agregan o se renombran sin tocar código ([manual §8](manual-administrativo.md#8-catálogos-administración-provincial)).
- **Equipo:** dar y quitar roles cuando cambia el personal ([manual §6](manual-administrativo.md#6-equipo)).
- **Informe semanal:** se genera solo cada lunes y se descarga en PDF ([manual §5](manual-administrativo.md#5-informes-semanales)).

## 4. Lo que funciona solo, y cómo saber que va bien

| Qué | Cada cuánto | Qué mirar |
|---|---|---|
| Informe semanal en PDF | Los lunes | Que aparezca en **Panel → Informes** |
| Copia de seguridad cifrada de toda la base | Todos los días, 04:00 | GitHub → *Actions → backup* en verde |
| Vigilancia de la aplicación | Cada hora | GitHub → *Actions → uptime* en verde. Si falla, GitHub manda un correo |
| Vencimiento de alertas de tránsito viejas | Cada 15 minutos | Nada: es automático |
| Archivo de solicitudes cerradas y limpieza de datos | Todos los días, de madrugada | Nada: es automático |
| Avisos de seguridad de las dependencias | Cada semana | GitHub propone la actualización como *pull request* (Dependabot) |

**Revisión de 5 minutos, una vez a la semana:** abrir `https://sr-conecta.vercel.app/api/v1/health` (debe decir `"ok"`) y ver que *backup* y *uptime* estén en verde.

## 5. Si algo falla

| Síntoma | Qué hacer |
|---|---|
| La aplicación no abre | Vercel → *Deployments* → *Promote to Production* en la versión anterior. Tarda 1 minuto y no toca los datos ([despliegue §8](../DEPLOYMENT.md#8-operación-diaria)) |
| No llegan los correos de acceso | Supabase → *Authentication → SMTP Settings*: revisar la clave de Resend |
| `/api/v1/health` no dice `"ok"` | Supabase pausó la base por inactividad: entrar a Supabase y pulsar *Restore project* |
| Se borraron datos por error | Restaurar la copia diaria ([despliegue §8.1](../DEPLOYMENT.md#81-copias-de-seguridad)); la frase para descifrarla está en el gestor de contraseñas |
| Alguien publica contenido falso o abusivo | Panel → la ficha → **Rechazar**. Queda en la **Auditoría** quién hizo qué |

## 6. Antes de la entrega a FUNDESER

1. Las cuentas de GitHub, Supabase y Vercel pasan a la organización, con **al menos dos dueños** ([despliegue §9](../DEPLOYMENT.md#9-traspaso-a-cuentas-de-la-organización)).
2. Las claves y la frase de las copias van al gestor de contraseñas de la organización.
3. Una persona de cada ayuntamiento entra una vez, recibe su rol y hace sola una tarea real: atender un reporte y descargar el informe.
4. El equipo desarrollador sale de las cuentas y se cambian las contraseñas.

## 7. Cómo continuar el proyecto

El código es abierto (licencia MIT) y está documentado para que otro equipo lo continúe: arquitectura en [ARCHITECTURE.md](../ARCHITECTURE.md), base de datos en [DATABASE.md](../DATABASE.md), decisiones en [docs/decisions](decisions/) y seguridad en [SECURITY.md](../SECURITY.md). Cada cambio pasa por pruebas automáticas antes de publicarse.
