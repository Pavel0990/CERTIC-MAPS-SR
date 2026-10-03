# Manual del panel municipal

Guía para el personal de los ayuntamientos y de la provincia que usa SR Conecta: quién puede hacer qué, cómo atender lo que llega y cómo sacar el informe semanal.

El panel está en **Perfil → Panel municipal**, o directamente en `/admin`. Funciona en la computadora y en el teléfono.

---

## 1. Roles: quién puede hacer qué

| Acción | Moderación | Administración municipal | Administración provincial |
|---|:---:|:---:|:---:|
| Ver la bandeja y atender alertas de tránsito y reportes de vecinos | ✅ su municipio | ✅ su municipio | ✅ toda la provincia |
| Aprobar negocios, lugares, rutas, promociones y fotos | ✅ | ✅ | ✅ |
| Ver los indicadores del **Resumen** | — | ✅ su municipio | ✅ provincia y cada municipio |
| Descargar el informe semanal en PDF | — | ✅ | ✅ |
| Generar una versión nueva del informe | — | — | ✅ |
| Dar o quitar el rol de moderación | — | ✅ su municipio | ✅ |
| Dar o quitar el rol de administración municipal | — | — | ✅ |
| Ver la auditoría | — | ✅ | ✅ |

- **La administración provincial no se da desde la app.** La crea el equipo técnico con un script revisado (ver [DEPLOYMENT.md](../DEPLOYMENT.md) §5). Así nadie puede darse más poder a sí mismo.
- Para recibir un rol, la persona tiene que haber entrado al menos una vez a la aplicación con su correo.

## 2. Resumen

La primera pantalla muestra **Tu trabajo hoy**: cuántas alertas y reportes esperan respuesta, con un acceso directo a la bandeja.

Si eres administración, debajo ves los indicadores de los últimos 7 días:

- reportes recibidos, resueltos y abiertos ahora;
- tiempo de respuesta;
- tránsito por tipo;
- negocios activos y turismo publicado;
- personas nuevas;
- **lo que más piden los vecinos**: los reportes públicos con más apoyos.

Son exactamente las mismas cifras que salen en el PDF semanal.

## 3. Bandeja

Aquí llega todo lo que envían los vecinos. Se actualiza sola cada 30 segundos. Usa los filtros de **Estado** y **Municipio** para concentrarte en lo pendiente.

Cada cambio que haces le llega al vecino como aviso, en la campana y, si las activó, como notificación en su teléfono.

### 3.1 Alertas de tránsito

| Si la alerta está… | Puedes | Qué pasa |
|---|---|---|
| Por confirmar | **Publicar en el mapa** | Todos la ven en el mapa en vivo y se avisa a los vecinos del municipio |
| Publicada | **Verificar** | Queda marcada como confirmada por el municipio |
| Publicada o verificada | **Ya se resolvió** | Sale del mapa |
| Cualquiera | **Descartar** (con motivo) | No aparece; quien la envió ve el motivo |
| Cualquiera | **Pasar a obra municipal** | Se crea un reporte de obra (por ejemplo, un bache que no se arregla solo) en la sección de reportes |

Las alertas también caducan solas según su tipo, para que el mapa no muestre problemas viejos.

### 3.2 Reportes y consultas de los vecinos

El camino normal es: **Recibido → En revisión → Aprobado → En proceso → Resuelto**.

| Paso | Botón | Nota |
|---|---|---|
| Empezar | **Empezar revisión** | El vecino sabe que alguien lo está mirando |
| Aceptar | **Aprobar** | Confirma que el municipio lo va a atender |
| Asignar | **Asignar responsable…** | Obligatorio antes de empezar el trabajo. Puedes asignar a cualquier persona del personal de ese municipio |
| Trabajar | **Empezar el trabajo** | Pasa a "En proceso" |
| Cerrar | **Marcar resuelto** | Pide una nota para el vecino. Explica qué se hizo |
| Rechazar | **No procede** | Pide el motivo, que verá el vecino |
| Guardar | **Archivar** | Solo administración y solo para los resueltos. Además, se archivan solos a los 30 días |

- **Mostrar en el mapa / Quitar del mapa.** Un reporte público aparece en el mapa y los vecinos pueden **apoyarlo**. Así se ve qué piden más.
- Nunca se publica el nombre de quien reportó ni sus fotos. Las fotos de evidencia solo las ven el autor y el personal.

## 4. Validaciones

Lo que la gente propone para el mapa espera aquí hasta que alguien del municipio lo revisa.

| Qué | Aprobar | Otras opciones |
|---|---|---|
| **Negocios** | **Aprobar negocio**: aparece en el mapa y el dueño pasa a tener su panel de comercio | **No aprobar** (con motivo); **Suspender** a uno ya aprobado: sale del mapa y se pausan sus promociones |
| **Lugares propuestos** | **Publicar**: aparece en el mapa | **No aprobar** (con motivo) |
| **Rutas propuestas** | **Publicar**: el trazado aparece en el mapa | **No aprobar** (con motivo) |
| **Promociones** | **Aprobar promoción**: se muestra en la ficha del negocio durante sus fechas | **No aprobar** |
| **Fotos** | **Aprobar foto**: se publica en la ficha | **No aprobar** |

Antes de aprobar:

- revisa que el lugar esté bien ubicado y que las fotos no muestren caras ni matrículas;
- revisa que los datos de contacto sean de un negocio, no de una persona particular.

Todas las fotos llegan ya sin datos ocultos: no guardan la ubicación GPS ni el modelo del teléfono.

## 5. Informes semanales

- **Cada lunes** se genera solo un PDF con las cifras de la semana anterior, de lunes a domingo, en hora de República Dominicana. La administración recibe un aviso cuando está listo.
- **Descargar PDF**: cada descarga queda registrada en la auditoría. El enlace dura 5 minutos.
- **Generar ahora** (solo administración provincial): elige una semana ya terminada y crea una **versión nueva** con las cifras de ese momento. Las versiones anteriores no se borran. Sirve, por ejemplo, si se corrigieron datos de esa semana.
- El informe tiene:
  - un resumen;
  - tránsito por tipo;
  - lo más apoyado por los vecinos;
  - negocios y turismo;
  - una tabla por municipio.

  No incluye datos personales.

## 6. Equipo

1. Busca a la persona por su nombre.
2. Elige el rol (**Moderación** o **Administración municipal**) y el municipio.
3. Toca **Dar el rol**.

Para quitar un rol, usa **Quitar** en la lista de personal actual. No puedes quitarte un rol a ti mismo; pídeselo a otra persona con permiso.

## 7. Auditoría

Registro de todo lo que hace el personal: quién, cuándo, qué y con qué resultado. Incluye los intentos que fueron **denegados**. Nadie lo puede editar ni borrar, tampoco la administración. Filtra por tipo (roles, reportes, tránsito, revisiones, negocios, informes, cuentas) para encontrar algo rápido.

## 8. Buenas prácticas

- **Responde rápido, aunque sea para decir "En revisión".** Que el vecino vea movimiento es lo que más confianza da.
- **Escribe los motivos y las notas en lenguaje sencillo.** Los lee el vecino, no un técnico.
- **Avisos del panel en el teléfono.** Cada vez que llega algo nuevo de tu municipio recibes un aviso en la campana. Para que también suene en el teléfono: **Perfil → Notificaciones en este dispositivo → Activar**. En iPhone, primero instala la app desde *Compartir → Añadir a pantalla de inicio*.
- **Cierra tu sesión en computadoras compartidas** con **Perfil → Salir de mi cuenta**. Se borran las páginas guardadas y las notificaciones de tu cuenta en ese equipo.
