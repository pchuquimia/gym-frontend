# Cuándo se pide volver a iniciar sesión

Se limpia el acceso y se muestra un aviso con el motivo cuando el servidor
confirma una sesión vencida, ausente, inválida o revocada, una cuenta no
disponible o el final de un acceso demo. Un 401 de credenciales incorrectas
(login o cambio de contraseña) no debe cerrar una sesión válida.

Errores de conexión, timeouts, límites de solicitudes (429), permisos (403)
y errores temporales de servidor (5xx) no borran el acceso guardado. Esto no
autoriza operaciones sin conexión: el servidor sigue validando cada petición.

La comprobación ocurre al abrir la app, volver a ella, recuperar internet y
cada dos minutos mientras está abierta. Las comprobaciones en segundo plano
se agrupan durante 30 segundos; recuperar internet fuerza una nueva.
También se verifica al restaurar una página desde la caché de navegación
(`pageshow`). Un GET/HEAD con `AUTH_SESSION_MISSING` se reintenta una sola vez
leyendo de nuevo las credenciales antes de cerrar el acceso; no se repiten
escrituras ni rechazos por tokens vencidos, inválidos o revocados.

Al finalizar el acceso se guarda un respaldo local del entrenamiento en curso
asociado al usuario, se pausa su reloj y se limpian los datos visibles de esa
cuenta. Al ingresar de nuevo con la misma cuenta se restaura ese respaldo. No
se conserva la contraseña ni se presenta el respaldo como guardado en servidor.

Las respuestas de una sesión anterior no pueden cerrar el acceso nuevo ni
restaurar el usuario después de salir. Los fallos temporales tampoco activan
el acceso automático de administrador del entorno de desarrollo.

## Duración y revocación

El backend fija la caducidad del token con `COOKIE_EXPIRES` (7 días por defecto).
No hay renovación automática ni temporizador de cierre por inactividad.
«Mantener mi sesión iniciada» guarda el token en almacenamiento persistente y
la cookie con fecha de expiración; sin marcarlo se usa almacenamiento de sesión
y una cookie de sesión. Cerrar una pestaña no equivale siempre a cerrar el
navegador; la restauración de cookies depende del navegador.
La opción aparece marcada por defecto en el formulario de acceso y puede
desmarcarse en dispositivos compartidos. Esto no amplía la caducidad del token
ni convierte automáticamente una sesión anterior en persistente. Al desmarcarla,
el formulario explica que abrir de nuevo el navegador puede requerir otro acceso.
Los fallos de lectura/escritura de localStorage y sessionStorage se manejan por
separado; un almacén bloqueado no impide usar el otro, y el token recuperado
se conserva en memoria mientras esa página siga abierta.

También pueden invalidarse accesos por recuperar la contraseña, cambiarla
desde otra sesión, cerrar otros dispositivos, desactivar/eliminar la cuenta
o superar los diez accesos conservados en el servidor. Reiniciar el backend
no cierra una sesión válida si se mantienen la clave de firma y los registros.

El backend distingue fallos de validación temporal (503) de fallos de identidad
(401) y usa códigos `AUTH_*` para explicar el motivo. Mantiene compatibilidad
con el antiguo mensaje «No autenticado» durante el despliegue de ambos clientes.
