# Plan auditado de continuidad en HOMELAB

Fecha de inicio: 24 de agosto de 2026

## Objetivo

Consolidar el dashboard de Costes en `C:\Homelab\projects\Costes`, validar el
despliegue activo en `http://192.168.1.116:3000` y dejar una publicación
reproducible sin perder los JSON operativos ni exponer las credenciales ODBC.

## Evidencias de partida

- Rama `main`, sincronizada con `origin/main`, con cambios locales aún no
  confirmados y tres JSON operativos actualizados.
- API activa: estado `ONLINE`, 47.742 registros de costes, 2.112 líneas de
  pedidos y caché no obsoleta del 24 de agosto de 2026.
- Calidad del código: lint correcto, 10 de 10 pruebas superadas y build de
  producción correcto.
- Dependencias: `npm audit --audit-level=moderate` informa 0 vulnerabilidades.
- Los cuatro scripts PowerShell operativos analizan correctamente.
- No se han encontrado credenciales reales versionadas; `.env` permanece fuera
  del repositorio.

## Plan y estado

### 1. Auditar el estado pendiente — COMPLETADO

- [x] Inventariar los cambios locales y distinguir código, documentación y
  datos operativos.
- [x] Buscar secretos, direcciones antiguas y rutas absolutas heredadas.
- [x] Revisar sintaxis de los scripts modificados.
- [x] Corregir las instrucciones operativas activas que aún apuntaban a
  `C:\Costes`. Las rutas `Y:\...` solo aparecen en `conexion datos.md`, que se
  conserva como referencia histórica y no participa en la ejecución.

### 2. Superar la puerta de calidad — COMPLETADO

- [x] `npm.cmd run lint`.
- [x] `npm.cmd test` (10/10).
- [x] `npm.cmd run build`.
- [x] `npm.cmd audit --audit-level=moderate` (0 vulnerabilidades).
- [x] `git diff --check` sin errores.

### 3. Corregir hallazgos reproducibles — COMPLETADO

- [x] Corregir el cálculo SHA-256 del cliente LAN, que fallaba porque
  `Get-FileHash` no está disponible en el PowerShell usado por `npm`.
- [x] Preservar `datos_costes_actualizados.json`,
  `datos_costes_calidad.json` y `datos_pedidos_pendientes.json`.
- [x] Repetir lint y pruebas después del cambio; el build de producción ya
  estaba validado y el cambio solo afecta al empaquetador PowerShell.

### 4. Validar el despliegue real — COMPLETADO

- [x] Consultar `/api/health` en el nodo local.
- [x] Ejecutar `scripts/comprobar-despliegue.ps1` contra la instancia activa:
  web 200, 47.742 costes, 2.112 pedidos y caché vigente.
- [x] Construir y verificar el ZIP del cliente LAN para `192.168.1.116`: contiene
  ejecutable, URL y guía, y su SHA-256 recalculado coincide con el publicado.
- [x] Revisar el registro sin iniciar otra extracción: actualización correcta
  a las 06:00 del 24 de agosto. Los nombres de tarea documentados no aparecen
  en este host y deben reconciliarse con el mecanismo real de programación.

### 5. Cerrar la auditoría y preparar publicación — COMPLETADO

- [x] Actualizar la auditoría con resultados, riesgos y evidencias.
- [x] Revisar el diff final separando datos operativos de cambios de código.
- [ ] Preparar rama `codex/...` y PR solo cuando se autorice publicar los
  cambios; no confirmar ni subir automáticamente.

## Criterios de aceptación

- La web y sus endpoints funcionales responden desde el nodo y desde la LAN.
- El servicio arranca sin sesión interactiva y la actualización diaria evita
  instancias simultáneas.
- No hay secretos en Git, frontend, documentación ni registros.
- No quedan instrucciones operativas que conduzcan a una topología retirada.
- Lint, pruebas, build, auditoría de dependencias y comprobación funcional
  terminan correctamente.
- Los JSON operativos quedan preservados y claramente separados del código.

## Cierre operativo

El instalador se ejecutó correctamente como administrador el 24 de agosto de
2026: registró las dos tareas como `SYSTEM`, configuró el firewall y superó la
comprobación funcional. Después de un reinicio autorizado, Node arrancó
automáticamente en diez segundos, `/api/health` devolvió `ONLINE` y la web LAN
respondió HTTP 200. Todos los criterios técnicos del plan quedan satisfechos.

## Riesgos que requieren decisión empresarial

- El acceso sigue siendo HTTP y no cifra el tráfico interno.
- El firewall limita la red, pero la aplicación no autentica usuarios.
- La caché JSON no aporta histórico transaccional ni concurrencia avanzada.
