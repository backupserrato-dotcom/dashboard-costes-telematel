# Plan de Cambio de Proyecto: Dashboard "Costes Medios" Telematel

Este documento detalla la hoja de ruta y la configuración autoritativa para migrar el **Dashboard de Costes Medios** a una **conexión directa en tiempo real via ODBC** a la base de datos de producción de Telematel GoManage (Progress OpenEdge v11) según la configuración especificada en `conexion datos.md`.

---

## 1. Parámetros de Conexión Autorizados (`conexion datos.md`)

| Parámetro | Valor Verificado en Sistema |
| :--- | :--- |
| **Driver ODBC** | `Progress OpenEdge 11.7 Driver` *(32-bit y 64-bit)* |
| **Host / Servidor** | `dataserver` / IP `192.168.1.3` |
| **Usuario (`UID`)** | `userSQL` |
| **Contraseña (`PWD`)** | `userSQL` |
| **Esquema SQL** | `PUB` |
| **DSN Transaccional (`tlmplus1V11`)** | Puerto `2613` — Albaranes, Líneas, Costes por Delegación (`PUB.gvallin`) |
| **DSN Maestros (`tlmplusV11`)** | Puerto `2611` — Maestro de Artículos (`PUB.galartic`) y Marcas (`PUB.galmarca`) |

---

## 2. Alcance Organizativo (Empresas y Delegaciones)

- **Empresa 03 (San Pedro)**: Delegación `00` (Electricidad), `10` (Fontanería)
- **Empresa 04 (Estepona)**: Delegación `00` (Electricidad), `10` (Fontanería)
- **Empresa 05 (Marbella)**: Delegación `00` (Marbella)

---

## 3. Hoja de Ruta de Cambios (Paso a Paso)

### Paso 1: Configurar el Servicio de Extracción ODBC Backend (`server/odbcBridgeServer.js`)
- Crear un servicio escuchando en `http://localhost:5000`.
- Ejecutar la consulta de extracción SQL a la base de datos `tlmplus1V11`:
  ```sql
  SELECT 
    l.cod_art, 
    l.ref_art, 
    l.nom_mar, 
    l.cos_abl AS cos_med, 
    l.cod_ent, 
    l.cod_del 
  FROM PUB.gvallin l 
  WHERE l.cod_ent IN (3, 4, 5)
  ```
- Retornar respuesta en JSON mediante el endpoint `/api/live-costes-odbc`.

### Paso 2: Conectar el Frontend React al Conector ODBC (`src/services/odbcLiveClient.js`)
- Recopilar automáticamente los datos reales del puente ODBC al abrir la página web (`useEffect` en montaje del componente `App.jsx`).
- Calcular los indicadores KPI ejecutivos (Coste Medio Ponderado, Valoración Total de Inventario, Unidades en Stock).

### Paso 3: Actualizar Vistas y Componentes del Dashboard (`src/components/`)
- **`ArticlesTable.jsx`**: Mostrar artículos reales, referencias de fabricantes (ej. SOBIME, IBIDE, ALIAXIS, MAXGE, FAMATEL, RAMON SOLER) y costes.
- **`DelegationsBreakdown.jsx`**: Desglose de existencias por San Pedro (`03-00`, `03-10`), Estepona (`04-00`, `04-10`) y Marbella (`05-00`).
- **`Navbar.jsx`**: Indicador de estado `Conectado a DSN tlmplus1V11 (userSQL@dataserver)` y botón de sincronización directa.

### Paso 4: Verificación y Despliegue
- Validar el build de producción con `npm run build`.
- Iniciar el servidor web y el puente ODBC en `http://localhost:3000`.

---

## 4. Archivos Modificados en el Proyecto

- **[implementation_plan.md](file:///C:/Users/Adrian/.gemini/antigravity/brain/e33ae7c0-4be5-4cf3-a56e-af85732a2c09/implementation_plan.md)**: Plan detallado de arquitectura.
- **[PLAN_CAMBIO_DASHBOARD_TELEMATEL.md](file:///y:/ANALYTICS/COSTES/PLAN_CAMBIO_DASHBOARD_TELEMATEL.md)**: Hoja de ruta del cambio.
- **[conexion datos.md](file:///y:/ANALYTICS/COSTES/conexion%20datos.md)**: Fichero autoritativo de credenciales y DSNs ODBC.
