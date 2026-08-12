# Plan de publicación web en la red interna

## Arquitectura objetivo

Un único equipo Windows actúa como servidor en `C:\Costes`. Solo ese equipo necesita el controlador ODBC, los DSN de Telematel y acceso al ERP. El resto de usuarios accede con un navegador y no necesita Node.js ni instalar la aplicación.

`Navegadores LAN → HTTP privado:3000 → API Node/Express → caché JSON → extractor PowerShell/ODBC → Telematel`

## 1. Preparar el servidor

1. Reservar una IP fija o reserva DHCP para el equipo servidor.
2. Confirmar que el perfil de red de Windows sea **Privado**.
3. Instalar el controlador Progress OpenEdge 11.7 ODBC x64.
4. Crear y probar los DSN `tlmplusV11` y `tlmplus1V11` con una cuenta ERP de solo lectura.

## 2. Configurar secretos

1. Copiar `.env.example` como `.env`.
2. Informar `TLM_USER` y `TLM_PASSWORD` en `C:\Costes\.env`.
3. No subir `.env` a GitHub ni compartirlo con clientes.
4. Usar una credencial exclusiva, de solo lectura y con rotación periódica.

## 3. Validar

1. Ejecutar `npm.cmd ci`.
2. Ejecutar `npm.cmd run lint` y `npm.cmd test`.
3. Ejecutar `npm.cmd audit --audit-level=moderate`.
4. Ejecutar `npm.cmd run build`.
5. Comprobar `http://127.0.0.1:3000/api/health`.
6. Lanzar una actualización ERP y revisar fecha, artículos y pedidos.

## 4. Instalar el servidor interno

Abrir PowerShell como administrador:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
& 'C:\Costes\scripts\instalar-servidor-red.ps1'
```

El instalador compila la interfaz, incluye un runtime de Node, registra el arranque automático como `SYSTEM`, abre el puerto 3000 solo para la subred privada y comprueba el servicio.

## 5. Publicar a usuarios

1. Crear un nombre DNS interno estable, por ejemplo `http://costes:3000`.
2. Hasta disponer de DNS, usar `http://192.168.1.57:3000` o la IP mostrada por el instalador.
3. Distribuir solo la URL; nunca credenciales ni copias de datos.
4. Probar desde otro equipo: carga, filtros, detalle, compras, LISTIN 11 y exportación.

## 6. Operación

1. Revisar diariamente la antigüedad de caché.
2. Copiar periódicamente los tres JSON y `.env` a una ubicación protegida.
3. Actualizar deteniendo la tarea, haciendo `git pull`, validando y ejecutando de nuevo el instalador.
4. Revisar mensualmente dependencias y alertas de GitHub.

## 7. Evolución recomendada

1. Añadir IIS con autenticación de Windows si no toda la LAN debe ver los datos.
2. Servir HTTPS con certificado interno.
3. Separar el extractor ODBC en una tarea programada y dejar la web en solo lectura.
4. Migrar JSON a SQLite o PostgreSQL si crecen volumen, concurrencia o histórico.
5. Añadir registros estructurados y alertas de caché obsoleta.

## Criterios de aceptación

- Arranca después de reiniciar Windows sin iniciar sesión.
- Un usuario LAN entra desde el navegador sin instalar software.
- Equipos fuera de la subred privada no acceden al puerto.
- Las credenciales no aparecen en GitHub, frontend ni registros.
- No se ejecutan dos actualizaciones ERP simultáneas.
- Lint, pruebas, compilación y auditoría terminan correctamente.
