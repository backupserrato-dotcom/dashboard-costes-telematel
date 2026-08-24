# Auditoría para publicación en red interna

Fecha inicial: 12 de agosto de 2026

Revalidación: 24 de agosto de 2026

## Resultado

El proyecto funciona como aplicación web interna desde `C:\Homelab\projects\Costes`. El frontend y la API comparten el mismo servidor y la conexión ODBC queda exclusivamente en el equipo anfitrión.

## Verificaciones realizadas

- Compilación de producción correcta.
- Análisis estático sin avisos.
- Cinco pruebas automatizadas superadas.
- Auditoría npm sin vulnerabilidades conocidas.
- Servicio accesible mediante `127.0.0.1` y `192.168.1.116`.
- Caché válida: 47.520 filas y 2.295 líneas de pedidos.
- Auditoría ODBC real: 29.769 artículos consultados en Telematel.
- Cabeceras CSP, `nosniff`, anti-iframe, privacidad de referencia y permisos restrictivos activas.

## Revalidación en HOMELAB

- Lint correcto, 10 de 10 pruebas superadas y build de producción correcto.
- `npm audit --audit-level=moderate`: 0 vulnerabilidades.
- Comprobación funcional: web HTTP 200, API `ONLINE`, 47.742 registros de
  costes, 2.112 líneas de pedidos y caché no obsoleta.
- Actualización ERP registrada correctamente el 24 de agosto a las 06:00, sin
  iniciar una segunda extracción durante la auditoría.
- Cliente LAN generado con la URL `http://192.168.1.116:3000`; contenido y
  SHA-256 verificados.
- Corregida la dependencia de `Get-FileHash` en el empaquetador, incompatible
  con el PowerShell disponible en este nodo.

## Hallazgos corregidos

1. Las credenciales ODBC estaban incluidas como valores predeterminados en código, documentación y Docker.
2. CORS permitía llamadas desde cualquier origen.
3. Dos usuarios podían iniciar simultáneamente extracciones ERP costosas.
4. El endpoint de auditoría no interpretaba JSON multilínea y mostraba un falso modo de caché.
5. El puerto era fijo y no admitía configuración mediante entorno.
6. Un script conservaba una ruta absoluta a la antigua unidad `Y:`.
7. `nanoid` tenía una vulnerabilidad alta corregida en la versión 3.3.18.
8. No existía un procedimiento reproducible para arranque automático y firewall LAN.

## Riesgos pendientes de decisión empresarial

- HTTP no cifra el tráfico. Para datos sensibles se recomienda IIS/HTTPS con certificado interno.
- Actualmente cualquier usuario de la subred autorizado por el firewall puede visualizar los datos. Añadir autenticación de Windows si se requieren grupos de acceso.
- Los JSON son adecuados para el volumen actual, pero no ofrecen histórico, transacciones ni concurrencia avanzada.
- El servidor depende de que Windows conserve una IP estable o un nombre DNS interno.

## Instalación administrativa

El 24 de agosto de 2026 se ejecutó `scripts/instalar-servidor-red.ps1` desde
PowerShell como administrador. El instalador completó dependencias, build,
registro de tareas, regla de firewall y comprobación funcional sin errores.

Las tareas se registraron como `SYSTEM`, por lo que no son enumerables desde la
sesión de auditoría no elevada. La prueba controlada de reinicio se completó el
24 de agosto de 2026: Windows arrancó a las 13:35:50 y `node.exe` comenzó a
escuchar en `0.0.0.0:3000` a las 13:36:00. Después del reinicio, la API quedó
`ONLINE`, la web respondió HTTP 200 desde la LAN y la caché permaneció vigente.
