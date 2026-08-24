# Continuar el proyecto Costes en el homelab

La copia de trabajo está en `C:\homelab\projects\Costes` y la instancia activa
en el nodo está en `C:\Homelab\projects\Costes`.

## Acceso

- URL de clientes y del nodo: `http://192.168.1.116:3000`
- API de estado: `/api/health`

El servicio escucha directamente en el nodo `HOMELAB` (`192.168.1.116`). Las antiguas
referencias a la pasarela `192.168.1.57`, ICS y `192.168.137.10` están retiradas.

## Servicio y actualización

El 24 de agosto de 2026 se ejecutó correctamente el instalador elevado y se
registraron estas tareas como `SYSTEM`:

- `Dashboard Costes Telematel`: servidor Node.js al arrancar Windows.
- `Dashboard Costes Telematel Actualizacion Diaria`: extracción ERP diaria a las 06:00.

La sesión no elevada no puede enumerarlas. La persistencia quedó validada tras
el reinicio controlado del 24 de agosto de 2026: Node arrancó automáticamente,
`/api/health` devolvió `ONLINE` y la web LAN respondió HTTP 200.

La actualización manual puede iniciarse desde PowerShell elevado con:

```powershell
Start-ScheduledTask -TaskName 'Dashboard Costes Telematel Actualizacion Diaria'
```

El registro queda en `actualizacion-erp-diaria.log`. No deben ejecutarse dos
actualizaciones simultáneas contra el ERP.

## Desarrollo y publicación

1. Trabajar en `C:\homelab\projects\Costes` y revisar antes `git status`.
2. Preservar los JSON de datos modificados; son datos operativos, no cambios de código.
3. Usar `npm.cmd test`, `npm.cmd run lint` y `npm.cmd run build`.
4. Publicar cualquier modificación en GitHub mediante una rama y un PR.
5. Copiar los archivos validados al nodo mediante WinRM y reiniciar la tarea del servidor si procede.
6. Verificar `/api/health`, la página principal y una actualización ERP real.

## Seguridad y copias

Las credenciales ODBC permanecen exclusivamente en `.env` en el nodo y no se
deben copiar al repositorio ni al navegador. El nodo utiliza los DSN de sistema
`tlmplusV11` y `tlmplus1V11` para el ERP `192.168.1.3`.

El proyecto se incluye en la copia diaria del homelab, almacenada en
`C:\ProgramData\Homelab\backups` con retención de siete archivos
`homelab-*.tar.gz`. La prueba completa de restauración debe ejecutarse desde una
sesión elevada porque actualiza `C:\ProgramData\Homelab\health`.
