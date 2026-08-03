# Plan de proyecto: Dashboard local «Costes Medios»

## 1. Alcance definitivo

El dashboard funcionará **exclusivamente en modo local**. No se realizarán conexiones en tiempo real con el ERP ni llamadas a la API de Telematel desde el navegador.

Los datos se leerán desde los ficheros o base de datos local que se encuentren en la carpeta compartida del proyecto. Cualquier sincronización con el ERP será un proceso externo y separado del dashboard.

### Acceso en red

- Equipo que aloja el dashboard: `192.168.1.4`.
- Todos los terminales con acceso a la carpeta compartida podrán abrir el dashboard.
- El servidor local deberá escuchar en la interfaz de red, no solo en `localhost`.
- Puerto previsto: `3001` en desarrollo; fijar y documentar el puerto definitivo para uso compartido.
- URL de acceso prevista: `http://192.168.1.4:<puerto>`.
- La disponibilidad depende de permisos de carpeta, firewall de Windows y conectividad de la red local.

## 2. Datos y ámbito

Se mantienen las cinco combinaciones de empresa y delegación:

| Empresa | Delegación | Clave |
|---|---|---|
| 03 San Pedro | 00 Electricidad | `03-00` |
| 03 San Pedro | 10 Fontanería | `03-10` |
| 04 Estepona | 00 Electricidad | `04-00` |
| 04 Estepona | 10 Fontanería | `04-10` |
| 05 Marbella | 00 Marbella | `05-00` |

Campos mínimos del modelo local:

- Marca: `cod_mar`, `nom_mar`.
- Artículo: `cod_art`, `ref_art`.
- Empresa y delegación.
- Stock real: `stk_act`.
- Coste del artículo: `cos_med`.

El campo `cod_art` se mostrará como **Código Telematel** y `ref_art` como **Referencia artículo**.

## 3. Nueva pestaña: `MARCA`

La navegación incorporará una pestaña visible llamada exactamente **MARCA**.

### Filtro de marcas

- Desplegable o selector multiselección alimentado por las marcas existentes en los datos locales.
- Permitirá seleccionar una o varias marcas.
- Incluirá búsqueda dentro del selector, opción «Seleccionar todas» y opción «Limpiar».
- Al cambiar la selección, las dos tablas se recalcularán usando exclusivamente esas marcas.
- Si no se selecciona ninguna marca, se mostrará el estado «Seleccione al menos una marca» y no se presentarán totales ambiguos.

### Tabla 1 — Detalle por empresa y delegación

Una fila por combinación de artículo, empresa y delegación. Orden y columnas obligatorias:

| Orden | Columna | Campo / regla |
|---:|---|---|
| 1 | Código Telematel | `cod_art` |
| 2 | Referencia artículo | `ref_art` |
| 3 | Empresa | empresa asociada al registro |
| 4 | Delegación | delegación asociada al registro |
| 5 | Stock real | `stk_act` |
| 6 | Coste artículo | `cos_med` |

La tabla tendrá ordenación, paginación y exportación. El stock debe mostrarse aunque sea cero para conservar la trazabilidad de las cinco ubicaciones.

### Tabla 2 — Resumen consolidado

Una fila por artículo, agregada para todas las empresas y delegaciones seleccionadas por el filtro de marca. Orden y columnas obligatorias:

| Orden | Columna | Cálculo |
|---:|---|---|
| 1 | Código Telematel | `cod_art` |
| 2 | Referencia artículo | `ref_art` |
| 3 | Stock total | `SUM(stk_act)` de las cinco ubicaciones |
| 4 | Coste total unitario | `valor total del stock / stock total` |

Fórmula exacta del coste consolidado:

```text
coste_consolidado = SUM(stock_real × coste_articulo) / SUM(stock_real)
```

Si el stock total es cero, el coste consolidado se mostrará como `—` y no se dividirá entre cero. El valor debe calcularse con suficiente precisión y redondearse solo en la presentación.

## 4. Arquitectura local

```text
Ficheros / base de datos local
  -> adaptador de datos local
  -> normalización de marcas, artículos, empresas y delegaciones
  -> filtro multiselección MARCA
  -> Tabla 1: detalle por ubicación
  -> Tabla 2: resumen consolidado
  -> exportación XLSX
```

Se eliminarán del flujo principal:

- Test de conexión a `193.168.1.3`.
- Estado «Online ERP».
- Botón «Sincronizar ERP».
- Credenciales y Basic Auth en frontend.
- Dependencia funcional del endpoint `/health`.

La pestaña de diagnóstico, si se conserva, deberá describir únicamente el estado del dataset local, fecha de carga, número de registros y ruta lógica de origen.

## 5. Componentes previstos

```text
src/
├── services/
│   └── localDataService.js       # Carga, normalización y agregaciones locales
├── components/
│   ├── Navbar.jsx                 # Incluye la pestaña MARCA
│   ├── BrandMultiSelect.jsx       # Selector multiselección de marcas
│   ├── BrandDetailTable.jsx       # Tabla 1
│   ├── BrandSummaryTable.jsx      # Tabla 2
│   └── LocalStatusView.jsx        # Estado del dataset local
└── App.jsx                        # Estado de pestaña, marcas y datos
```

## 6. Criterios de aceptación

1. El dashboard abre desde un terminal autorizado usando `192.168.1.4` y el puerto documentado.
2. La aplicación no intenta conectarse al ERP ni contiene credenciales necesarias para funcionar.
3. La pestaña se llama `MARCA` y permite seleccionar una o varias marcas.
4. La Tabla 1 muestra exactamente las seis columnas solicitadas y una fila por ubicación.
5. La Tabla 2 suma el stock de todas las empresas y delegaciones sin duplicar artículos.
6. El coste de la Tabla 2 usa la fórmula de coste ponderado por stock indicada arriba.
7. Los artículos sin stock no generan división por cero.
8. Ambas tablas responden al mismo filtro de marcas y muestran totales coherentes.
9. La exportación contiene una hoja de detalle y otra de resumen.

## 7. Verificación de conexiones solicitadas

| Conexión / relación | Verificación requerida | Resultado esperado |
|---|---|---|
| Terminal → `192.168.1.4` | Abrir URL desde otro terminal autorizado | Dashboard accesible |
| Dashboard → datos locales | Cargar dataset sin red ERP | Datos disponibles en modo local |
| Marca → artículos | Seleccionar varias marcas | Solo aparecen sus referencias |
| Artículo → ubicación | Validar las cinco claves `03-00`, `03-10`, `04-00`, `04-10`, `05-00` | Una fila por ubicación |
| Detalle → resumen | Comparar sumas por artículo | Stock consolidado exacto |
| Stock + coste → coste consolidado | Recalcular muestra manualmente | Coincidencia con la fórmula |

## 8. Puesta en marcha local

```bash
npm run build
npm run dev -- --host 0.0.0.0 --port 3001
```

Antes de habilitar el uso compartido, comprobar el firewall para el puerto elegido, permisos de lectura de la carpeta y acceso desde un segundo terminal. El plan no contempla publicación en Internet ni acceso fuera de la red local.

## 9. Depuración actual y calidad visual

### Incidencia corregida: catálogo incompleto de marcas

El selector de marcas no debe construirse a partir de los artículos ya filtrados. Eso hacía que desaparecieran marcas al combinar empresa, delegación, grupo, stock o búsqueda. El catálogo debe derivarse siempre del dataset local completo y ordenarse de forma estable por nombre.

**Limitación detectada:** el proyecto actual contiene un dataset local de ejemplo con 9 marcas (`MAR-01` a `MAR-09`). El código no puede mostrar marcas que no estén cargadas en ese dataset. Para disponer de todas las marcas reales del ERP hay que sustituir `LOCAL_DATASET` por el fichero local completo y conservar `getBrands()` como fuente única del selector.

Regresión obligatoria:

1. Cargar el dashboard sin filtros y registrar el número total de marcas.
2. Aplicar empresa, delegación y stock.
3. Confirmar que el selector conserva exactamente el mismo catálogo de marcas.
4. Seleccionar una marca y verificar que solo cambian las filas y los totales, no las opciones disponibles.

### Criterios de visualización

- Mantener encabezados de tabla visibles durante el desplazamiento.
- Usar filas alternas, separación suficiente y contraste AA para texto y datos numéricos.
- Alinear cantidades y costes a la derecha; conservar códigos y referencias en tipografía monoespaciada.
- Mostrar estados vacíos claros y no dejar tablas sin contexto.
- Mantener el selector de marcas visible, con contador de seleccionadas y acciones «Todas» / «Limpiar» cuando se complete la multiselección.
- Comprobar la vista en 1280 px, 1024 px y móvil antes de cerrar la tarea.

## 10. Seguimiento de ejecución

| Bloque | Estado | Observación |
|---|---|---|
| Modo local y acceso por `192.168.1.4` | Completado | La interfaz ya no necesita el ERP para abrirse. |
| Pestaña `MARCA` | Completado | Incluye multiselección y dos tablas. |
| Catálogo completo de marcas | Bloqueado por datos | El código está preparado, pero falta colocar el fichero local real con todas las marcas. |
| Selector multiselección | Completado | «Seleccionar todas» usa todo el catálogo, aunque haya una búsqueda activa. |
| Coste ponderado y consolidación | Completado | Validado mediante `getSummaryRows()`. |
| Calidad visual | En curso | Pendiente revisión visual en los tres tamaños definidos. |

### Próxima acción necesaria

Colocar en la carpeta compartida el fichero local completo de artículos, con al menos `cod_art`, `ref_art`, `cod_mar`, `nom_mar`, `cos_med` y las cinco existencias. Al incorporarlo al adaptador local, `getBrands()` poblará automáticamente todas las marcas y las tablas se actualizarán sin cambios en la interfaz.
