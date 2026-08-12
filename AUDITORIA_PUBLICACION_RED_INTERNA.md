# Auditoría para publicación en red interna

Fecha: 12 de agosto de 2026

## Resultado

El proyecto puede funcionar como aplicación web interna desde `C:\Costes`. El frontend y la API comparten el mismo servidor y la conexión ODBC queda exclusivamente en el equipo anfitrión.

## Verificaciones realizadas

- Compilación de producción correcta.
- Análisis estático sin avisos.
- Cinco pruebas automatizadas superadas.
- Auditoría npm sin vulnerabilidades conocidas.
- Servicio accesible mediante `127.0.0.1` y `192.168.1.57`.
- Caché válida: 47.520 filas y 2.295 líneas de pedidos.
- Auditoría ODBC real: 29.769 artículos consultados en Telematel.
- Cabeceras CSP, `nosniff`, anti-iframe, privacidad de referencia y permisos restrictivos activas.

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

## Bloqueo administrativo local

La sesión utilizada para preparar el proyecto no tiene privilegios de administrador. Por ello no se puede crear desde esta sesión la regla de Firewall ni la tarea de arranque como `SYSTEM`. El script `scripts/instalar-servidor-red.ps1` realiza ambas acciones y debe ejecutarse una vez desde PowerShell abierto como administrador.
