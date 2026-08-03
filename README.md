# Dashboard Costes Medios, Compras & LISTIN 11 — Telematel ERP Integration

Sistema unificado de análisis de costes medios, valoración de inventario, gestión de compras a proveedores y costes unificados por sección para conductores de cable (LISTIN 11). Conectado directamente a las bases de datos de **Telematel OpenEdge 11.7 (Progress ODBC)**.

---

## 🚀 Características Principales

- **📊 Maestro de Artículos & Costes Medios**: Consolidación en tiempo real de más de 47.000 líneas de detalle y 28.200 referencias únicas entre las empresas `03 San Pedro`, `04 Estepona` y `05 Marbella`.
- **🛍️ Gestión de Compras Real (`gcpplin` + `gcppcab`)**: Monitoreo de 3.000+ líneas de pedidos de compra pendientes a proveedores con desglose de unidades pedidas, servidas, pendientes y cálculo neto exacto contemplando divisores de precio (`cuea_lpp`, por 1.000m o 100u) y triples descuentos acumulados.
- **⚡ Pestaña LISTIN 11 (Grupo 1L / Subgrupo 11)**:
  - **Tabla 1**: Lista unificada de precios y costes entre todas las empresas.
  - **Tabla 2**: Algoritmo de **costes unificados por sección** para conductores flexibles unipolares (secciones `1`, `1.5`, `2.5`, `4`, `6`, `10`, `16`, `25`, `35 mm²`), calculando la media ponderada de existencias y asignando el mismo coste por metro a todos los colores (*azul, marrón, negro, gris, amarillo/verde*).
- **🏢 Desglose por Delegaciones**: Matriz interactiva de stock y costes por almacén.
- **📥 Exportación Avanzada a Excel**: Generación de informes multichoja (`.xlsx`) en 1 clic.

---

## 🛠️ Requisitos Técnicos

- **Node.js**: v18.x o superior
- **Docker & Docker Compose**: (Para despliegue en contenedor)
- **Base de datos ERP**: Progress OpenEdge 11.7 (DSN ODBC `tlmplusV11` / `tlmplus1V11`)

---

## 🐳 Despliegue con Docker para Red Interna (LAN)

Para ejecutar la aplicación dentro de la red local de la empresa y permitir el acceso a otros equipos de la red:

### 1. Construir y Arrancar con Docker Compose
```bash
docker-compose up --build -d
```

### 2. Acceso desde otros equipos de la red
Abre cualquier navegador en un ordenador de la red interna e ingresa:
```
http://<IP-DEL-SERVIDOR>:3000
```
*(Ejemplo: `http://192.168.1.3:3000`)*

---

## 💻 Desarrollo y Ejecución Local sin Docker

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Compilar el Frontend
```bash
npm run build
```

### 3. Iniciar el Servidor Unificado
```bash
node server/dbConnectorServer.js
```
El servidor se iniciará en `http://localhost:3000`.

---

## 🐙 Repositorio y Control de Versiones con GitHub

### Subir el código a GitHub:
```bash
# 1. Inicializar repositorio git (si no está inicializado)
git init

# 2. Añadir todos los archivos
git add .

# 3. Hacer commit inicial
git commit -m "feat: Dashboard Costes Medios, Gestión Compras y LISTIN 11 (Grupo 1L-11)"

# 4. Vincular con tu repositorio de GitHub y subir
git remote add origin https://github.com/TU_USUARIO/dashboard-costes-telematel.git
git branch -M main
git push -u origin main
```

---

## 📐 Estructura del Proyecto

```
y:/ANALYTICS/COSTES/
├── Dockerfile                      # Multistage Docker build configuration
├── docker-compose.yml              # Production compose for LAN deployment
├── server/
│   ├── dbConnectorServer.js        # Servidor Express API + Servidor de estáticos en port 3000
│   └── extraccion_unificada.ps1    # Extractor PowerShell ODBC para Telematel ERP
├── src/
│   ├── App.jsx                     # Componente principal y gestión de pestañas
│   ├── components/
│   │   ├── Listin11View.jsx        # Pestaña LISTIN 11 (Tabla 1 y Tabla 2 unificada)
│   │   ├── PurchasingManagementTable.jsx # Tabla de Gestión de Compras a Proveedores
│   │   ├── ArticlesTable.jsx       # Maestro de artículos
│   │   ├── UnifiedCostTable.jsx    # Tabla de coste unificado
│   │   ├── DelegationsBreakdown.jsx# Desglose por empresas y delegaciones
│   │   └── FilterBar.jsx           # Barra de filtros multinivel y reactivos
│   └── services/
│       └── liveDbClient.js         # Cliente de API y utilidades de cálculo
├── datos_costes_actualizados.json  # Dataset maestro de artículos y existencias
├── datos_pedidos_pendientes.json   # Dataset oficial de compras a proveedores (gcpplin/gcppcab)
└── datos_costes_calidad.json      # Métricas de auditoría de calidad de datos
```

---

## 🛡️ Licencia y Propiedad
Desarrollado para uso interno analítico ERP Telematel. Todos los derechos reservados.
