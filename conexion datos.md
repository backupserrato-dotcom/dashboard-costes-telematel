# 🔌 Datos de Conexión a Base de Datos - TELEMATEL / Progress OpenEdge

Este documento contiene la información detallada de configuración, hosts, puertos, credenciales y métodos de acceso a las bases de datos del sistema **TELEMATEL / ERP** utilizadas en el proyecto de Analítica.

---

## 🔑 Credenciales Principales (Acceso ODBC SQL)

| Parámetro | Valor |
| :--- | :--- |
| **Usuario (`UID`)** | Configurado mediante `TLM_USER` |
| **Contraseña (`PWD`)** | Configurada mediante `TLM_PASSWORD` |
| **Servidor / Host (`HostName`)** | `dataserver` |
| **Driver ODBC** | `Progress OpenEdge 11.7 Driver` *(32-bit / 64-bit)* |
| **Esquema SQL Predeterminado** | `PUB` |

---

## 🗄️ Fuentes de Datos ODBC (DSNs Configurados)

### 1. Entorno Principal (Progress OpenEdge v11 - Producción / Analytics)

| Nombre DSN | Base de Datos | Host | Puerto SQL (ODBC) | Uso / Descripción |
| :--- | :--- | :--- | :--- | :--- |
| **`tlmplus1V11`** | `tlmplus1` | `dataserver` | `2613` | **BD Principal Transaccional (Empresas 01, 03, 04, 05)** — Ventas, Albaranes, Compras, Pedidos |
| **`tlmplusV11`** | `tlmplus` | `dataserver` | `2611` | **BD Maestra Compartida** — Maestros de Clientes, Empleados, Agentes, Proveedores, Marcas |
| **`tlmplus2V11`** | `tlmplus2` | `dataserver` | `2614` | **BD Secundaria / Histórica** |

> [!NOTE]
> Todos los DSNs de la versión 11 están registrados tanto en la arquitectura de **32-bit** como en **64-bit** del sistema operativo.

### 2. DSNs de Versiones Anteriores (Compatibilidad / Heredados)

| Nombre DSN | Driver | Puerto | Placa / Plataforma |
| :--- | :--- | :--- | :--- |
| `tlmplus1V10` | Progress OpenEdge 10.1B TMT Driver | Dynamic / 2603 | System 32-bit |
| `tlmplusV10` | Progress OpenEdge 10.1B TMT Driver | Dynamic / 2601 | System 32-bit |
| `tlmplus2V10` | Progress OpenEdge 10.1B TMT Driver | Dynamic / 2604 | System 32-bit |

---

## ⚡ Conexión Nativa ERP Progress (Parámetros `.pf`)

Para aplicaciones nativas de Progress OpenEdge (4GL / AppServer) o clientes `prowin.exe`:

| Base de Datos | Host | Puerto Socket Nativo | Protocolo | Nombre Lógico (`-ld`) |
| :--- | :--- | :--- | :--- | :--- |
| **`tlmplus`** | `dataserver` | `2601` | `TCP` | `tlmp-c` |
| **`tlmplus1`** | `dataserver` | `2603` | `TCP` | `tlmp-1` |
| **`tlmplus2`** | `dataserver` | `2604` | `TCP` | `tlmp-1` |
| **`bd-custom`** | `dataserver` | `2606` | `TCP` | `bd-custom` |

---

## 💻 Cadenas de Conexión y Ejemplos de Código

### Cadena de Conexión ODBC Estándar (PowerShell / .NET / C#)

```powershell
$connectionString = "DSN=tlmplus1V11;UID=$env:TLM_USER;PWD=$env:TLM_PASSWORD"
$conn = New-Object System.Data.Odbc.OdbcConnection($connectionString)
$conn.Open()
```

```csharp
string connString = "DSN=tlmplus1V11;UID=<usuario>;PWD=<secreto>;";
using (OdbcConnection conn = new OdbcConnection(connString)) {
    conn.Open();
    // Ejecutar consultas SQL
}
```

### Cadena de Conexión Completa sin DSN (Driver Directo)

```text
DRIVER={Progress OpenEdge 11.7 Driver};HOST=dataserver;PORT=2613;DB=tlmplus1;UID=<usuario>;PWD=<secreto>;
```

---

## 📊 Tablas Clave del ERP (Esquema `PUB`)

| Tabla | Nombre ERP | Descripción / Contenido | BD de Origen |
| :--- | :--- | :--- | :--- |
| `PUB.gvalcab` | Cabecera Albaranes | Albaranes de venta (ventas diarias, importes, clientes, vendedores) | `tlmplus1` |
| `PUB.gvallin` | Líneas Albaranes | Líneas detalladas de venta (marcas, referencias, unidades) | `tlmplus1` |
| `PUB.gmclien` | Maestro Clientes | Fichas de clientes (CIF, Razón Social, Dirección, Tipo/Nivel Descuento) | `tlmplus` |
| `PUB.gmempr` | Maestro Empresas | Fichas de proveedores | `tlmplus` |
| `PUB.gatavemp` | Maestro Empleados | Empleados / Usuarios del ERP | `tlmplus` |
| `PUB.gmvende` | Maestro Agentes | Agentes comerciales y representantes | `tlmplus` |
| `PUB.gfc_cab` | Facturas Compras | Facturas de compra registradas | `tlmplus1` |
| `PUB.gcp_cab` | Pedidos Compras | Pedidos a proveedores | `tlmplus1` |

---

## 📁 Rutas de Scripts de Extracción y Datos

- **Script de Ejecución de Consultas**: `Y:\ANALYTICS\TELEMATEL\scripts\ejecutar_consulta.ps1`
- **Script de Actualización Automática**: `Y:\ANALYTICS\TELEMATEL\scripts\actualizar_dashboard.ps1`
- **Carpeta de Consultas SQL**: `Y:\ANALYTICS\TELEMATEL\consultas`
- **Carpeta de Salida de Datos (.js / .csv)**: `Y:\ANALYTICS\TELEMATEL\datos`
- **Dashboard Web Principal**: `Y:\ANALYTICS\TELEMATEL\SerratoLuz\dashboard.html`
