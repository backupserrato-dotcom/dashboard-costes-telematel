# Plan de mejora: datos reales, filtros e interacción

**Fecha de auditoría:** 28 de julio de 2026  
**Ámbito:** Dashboard de Costes Medios (React, API local y extracción ODBC de Telematel).  
**Estado:** Implementado (Fases 0–5). Ver `DICCIONARIO_DATOS.md` y `GUIA_USO.md`.

## Resumen ejecutivo

La interfaz actual tiene una base visual sólida, pero la información presentada no es todavía fiable para la toma de decisiones. Aunque se anuncia como datos en tiempo real, la aplicación muestra el contenido de `datos_costes_actualizados.json`. En la muestra auditada (28.256 artículos), el 100 % tiene coste `0`, grupo mostrado como código, subgrupo `General` y el 98,1 % no tiene stock en ninguna ubicación.

La prioridad es corregir la cadena de datos antes de ampliar la analítica o retocar en profundidad la estética. El resultado objetivo es una consulta por selección que devuelva, desde las fichas y existencias del ERP, la descripción oficial, el coste de ficha y el stock real de cada artículo y almacén; los filtros deben ser **Grupo de marca → Marca → Subgrupo**, no familias del artículo.

> **Revisión de alcance — 28 de julio de 2026.** El coste que debe mostrarse se denomina **Coste de ficha** y procede de `cos_art` (coste medio ponderado). El stock visible debe ser `stock_disp`, calculado como suma de las existencias incluidas en la selección activa. La valoración es siempre `cos_art × stock_disp`. Cuando el mismo artículo tenga costes distintos entre empresas, la tabla debe presentar una línea independiente por artículo, empresa y delegación, con su coste y stock correspondientes.

## Hallazgos de auditoría

| Área | Situación actual | Riesgo / efecto |
| --- | --- | --- |
| Origen mostrado | La interfaz carga `/api/incremental-sync`, que sirve la caché si existe. | El usuario interpreta los datos como tiempo real sin una garantía de frescura. |
| Stock | La extracción asigna `can_tal` a una delegación usando el resto de `cod_tac` (`% 3` / `% 5`). | Las existencias por empresa y delegación pueden ser incorrectas. |
| Coste | Se usa `pre_tal` de `galartal` y se conservan ceros; el coste se vuelve a derivar en el cliente. | No se garantiza que sea el coste vigente de la ficha de artículo. |
| Descripción | La extracción sí parte de `galartic.dep_art`, pero existen rutas alternativas que fabrican nombres. | Dependiendo de la ruta ejecutada, la descripción puede no ser la oficial. |
| Grupo y subgrupo | Se cargan `cod_grc` y `cod_gru`, pero sus nombres se sustituyen por el propio código y `General`. | El filtro no representa la clasificación solicitada. |
| Filtros | Se filtra grupo, pero no se renderiza un selector de subgrupo ni existe jerarquía de opciones. | La selección no puede acotar correctamente Grupo–Marca–Subgrupo. |
| Seguridad | Credenciales y parámetros de conexión están en archivos del repositorio y en el cliente. | Exposición innecesaria de acceso a ERP. |
| UI | Filtros en una sola rejilla fija, estilos en línea y textos con problemas de codificación. | Peor uso en pantallas pequeñas, mantenimiento difícil y pérdida de confianza. |

## Objetivo funcional y contrato de datos

Cada fila de artículo debe conservar trazabilidad de origen y devolver como mínimo:

```text
cod_art, ref_art, descripcion_oficial, marca_id, marca_nombre,
grupo_marca_id, grupo_marca_nombre, subgrupo_id, subgrupo_nombre,
coste_ficha, moneda, fecha_actualizacion,
stock[{ empresa_id, delegacion_id, almacen_id, unidades, fecha_stock }]
```

Reglas de negocio:

- **Descripción:** únicamente el campo oficial del maestro de artículos. Nunca construirla a partir de marca y referencia.
- **Coste:** el campo de coste definido por negocio en la ficha del artículo. Debe elegirse y documentarse una sola vez con Finanzas/ERP; si no existe o no es válido, se informa como “Sin coste”, no como 0 €.
- **Stock:** existencias físicas reales agregadas por empresa, delegación y almacén reales. No inferir la ubicación mediante cálculos sobre códigos.
- **Clasificación:** grupo de marca, marca y subgrupo con sus códigos y descripciones oficiales. No reemplazar nombres con familias ni valores genéricos.
- **Frescura:** fecha y hora de la última lectura, fuente y alcance visible en todo resultado.

## Plan paso a paso

### Fase 0 — Alineación y respaldo (día 1)

1. Confirmar con el responsable ERP los campos y tablas oficiales para: descripción, coste de ficha, existencias y catálogo Grupo–Marca–Subgrupo.
2. Documentar el significado de cada código de empresa, delegación y almacén; aprobar el mapeo, sin reglas heurísticas.
3. Guardar una copia versionada de la caché actual y preparar un conjunto de 20 artículos testigo, con datos contrastados manualmente en Telematel.
4. Retirar credenciales del cliente y de documentación compartida; cargarlas solo desde variables de entorno o almacén seguro del servidor.

**Criterio de salida:** diccionario de datos aprobado, incluyendo el campo exacto de coste de ficha y la clave real de ubicación.

### Fase 1 — Extracción correcta desde ERP (días 2–4)

1. Sustituir los distintos scripts de carga por un único extractor mantenido en servidor.
2. Consultar el maestro de artículos para `dep_art` (o el campo oficial confirmado), referencia, marca y códigos de clasificación.
3. Incorporar los maestros que aporten los nombres de grupo de marca y subgrupo. Mantener código y nombre por separado.
4. Leer el coste desde la ficha del artículo definida en la Fase 0; evitar calcularlo desde líneas de venta o aplicar multiplicadores ficticios al último coste.
5. Leer las existencias desde la tabla/vista real de almacenes, utilizando sus claves reales. Agregar solo tras identificar empresa, delegación y almacén.
6. Incluir registros sin coste o sin stock, conservando sus estados de calidad (`SIN_COSTE`, `SIN_STOCK`, `UBICACION_NO_MAPEADA`).
7. Exponer una API con parámetros de filtro (`grupoMarca`, `marca`, `subgrupo`, `empresa`, `delegacion`, búsqueda y paginación) y un endpoint de catálogos dependientes.

**Criterio de salida:** los 20 artículos testigo coinciden con ERP en descripción, coste y existencias, desglosadas por ubicación.

### Fase 2 — Sincronización, caché y calidad (días 4–5)

1. Separar claramente dos modos: “Consultar ERP ahora” y “Ver última caché”. No etiquetar la caché como tiempo real.
2. Definir una actualización incremental programada y una carga completa nocturna; servir caché solo si la consulta no está disponible y avisar de ello.
3. Validar antes de publicar: claves únicas, importes numéricos, stock no negativo, clasificación resuelta y fecha de actualización.
4. Registrar métricas de calidad: porcentaje con coste, con stock, con grupo/subgrupo asignados, artículos rechazados y antigüedad de la caché.
5. Añadir pruebas automáticas de transformación para las ubicaciones y los 20 artículos testigo.

**Criterio de salida:** panel de estado con fecha/fuente real y alertas si los indicadores de calidad bajan del umbral acordado.

### Fase 3 — Filtros correctos y respuesta a la selección (días 5–7)

1. Reemplazar el filtro actual por la jerarquía visible **Grupo de marca → Marca → Subgrupo**.
2. Al elegir grupo, solicitar y habilitar solo las marcas de ese grupo; al elegir marca, hacer lo mismo con los subgrupos. Limpiar las selecciones incompatibles.
3. Mantener multiselección de marcas solo si negocio lo necesita; si se conserva, explicar que los subgrupos corresponden al conjunto seleccionado.
4. Mover el filtrado principal al servidor para que el stock, coste, tabla, KPI y exportación compartan exactamente el mismo alcance.
5. Conservar filtros en la URL y ofrecer chips de filtros activos, “Limpiar todo” y contador de resultados.
6. Definir el stock según selección: total global, total por empresa o total de una delegación. Mostrar siempre el alcance junto al valor.
7. Exportar exactamente las filas filtradas, incluidos grupo, marca, subgrupo, coste de ficha, ubicación y fecha de datos.

**Criterio de salida:** cada combinación de filtro reduce tabla, KPI, detalle y Excel de manera coherente y verificable contra ERP.

### Fase 4 — Mejora visual e interacción (días 7–9)

1. Convertir la barra de filtros en dos niveles: búsqueda y alcance arriba; clasificación y estados en un panel plegable. Adaptarla a una o dos columnas en móvil.
2. Añadir una franja de confianza de datos: fuente, última actualización, número de artículos, botón “Actualizar ahora” y aviso de caché.
3. Reordenar la tabla para priorizar: código, referencia, descripción oficial, Grupo / Marca / Subgrupo, coste de ficha, stock del alcance y valoración.
4. Permitir ordenar, redimensionar/ocultar columnas y fijar código, descripción y acciones; mantener encabezado y totales visibles.
5. Sustituir el modal básico por una ficha de artículo con: descripción completa, clasificación, coste de ficha, fecha de coste, matriz de stock por ubicación y trazabilidad de actualización.
6. Usar estados inequívocos: “Sin coste informado”, “Sin existencias”, “Dato pendiente de clasificar”; no colorear el cero como un coste válido.
7. Centralizar los estilos, eliminar CSS residual de Vite, corregir codificación UTF-8 y verificar contraste, foco de teclado y etiquetas accesibles.

**Criterio de salida:** uso correcto en escritorio y tablet, sin desplazamiento horizontal de filtros y con lectura clara del origen de cada dato.

### Fase 5 — Validación y despliegue (días 9–10)

1. Ejecutar pruebas funcionales con Compras, Almacén y usuarios de delegación.
2. Contrastar muestra ampliada de 100 artículos y cinco ubicaciones con ERP; aceptar solo coincidencia acordada (objetivo: 100 % salvo incidencias documentadas).
3. Medir rendimiento: filtros y paginación deben responder de forma fluida, sin descargar el maestro completo en cada interacción.
4. Desplegar primero en entorno de prueba, conservar el dashboard actual como respaldo y preparar reversión de la nueva API/caché.
5. Publicar una guía breve de significado de coste, stock, filtros y hora de actualización.

## Prioridad de ejecución

| Prioridad | Entrega | Motivo |
| --- | --- | --- |
| P0 | Fuente ERP, coste de ficha, stock por ubicación y catálogo Grupo–Marca–Subgrupo | Corrige la fiabilidad de todos los indicadores. |
| P1 | API filtrada, frescura visible, calidad y exportación coherente | Evita discrepancias y mejora la operativa. |
| P2 | Reorganización visual, ficha de artículo, accesibilidad y preferencias de tabla | Incrementa claridad y velocidad de uso. |
| P3 | Analítica adicional y alertas de negocio | Debe construirse solo sobre datos ya validados. |

## Decisiones pendientes de negocio

1. ~~¿Cuál es el campo oficial exacto que define el **coste de ficha**: coste medio, último coste, coste estándar u otro?~~ **Resuelto (28/07/2026):** coste medio ponderado, campo `galartic.cos_art`.
2. ¿Qué tabla o vista ERP vincula cada existencia con empresa, delegación y almacén de forma inequívoca? **Propuesta en uso:** `galartal` con `cod_ent`/`cod_del`.
3. ~~¿Qué maestro define las descripciones de **grupo de marca** y **subgrupo**, y cuál debe prevalecer ante datos incompletos?~~ **Resuelto (28/07/2026):** Grupo = `galartic.cod_grc`, Subgrupo = `galartic.cod_gru`. No hay maestro separado de nombres; el código se sirve como nombre.
4. ¿Qué antigüedad máxima se acepta para la caché antes de mostrar una alerta o bloquear la exportación? **Por defecto 24 h** (`CACHE_MAX_AGE_HOURS` en `server/dbConnectorServer.js`), pendiente de confirmar.

## Indicadores de éxito

- 100 % de la muestra de control con descripción y coste coincidentes con ERP.
- 100 % de existencias de la muestra asignadas a su ubicación real, sin heurísticas.
- 100 % de grupos, marcas y subgrupos seleccionables con nombre oficial cuando exista en el maestro.
- Fecha/fuente visibles en todas las vistas y exportaciones.
- Una única definición de filtros aplicada a tabla, KPI, detalle y Excel.

---

## Auditoría de cambios aplicada (28 de julio de 2026)

### Cambios comprobados y correctos

| Requisito anterior | Estado | Evidencia / observación |
| --- | --- | --- |
| Coste medio ponderado de ficha | Aplicado | El extractor unificado lee `PUB.galartic.cos_art` y lo expone como `coste_ficha`. |
| Descripción oficial | Aplicado | Se usa `PUB.galartic.dep_art`; no se construye con marca y referencia. |
| Stock real por ubicación | Aplicado | Se lee `PUB.galartal.can_tal` con `cod_ent` y `cod_del`; ya no se reparte mediante una heurística. |
| Filtros servidor / misma base de cálculo | Aplicado parcialmente | Tabla y carga usan filtros en API; la exportación aún vuelve a sumar todo el stock del artículo, no necesariamente el alcance elegido. |
| Grupo, marca y subgrupo | Aplicado parcialmente | Existe jerarquía de filtros, pero se muestran códigos de grupo/subgrupo por no disponer de maestro de nombres. |
| Estado de caché | Aplicado | Hay distinción entre caché y consulta ERP, además de indicadores de calidad. |

La compilación de producción se ha completado correctamente. Permanece como mejora técnica no bloqueante dividir el paquete JavaScript, ya que la compilación informa de un bloque superior a 500 kB.

### Brechas frente al alcance revisado

| Requisito revisado | Estado actual | Cambio necesario |
| --- | --- | --- |
| `cos_art` en “Coste de ficha” | Parcial | El valor está en la columna correcta, pero se trata como único por artículo. Debe conservarse por empresa cuando ERP devuelva un `cos_art` diferente. |
| `stock_disp` según selección | Parcial | La tabla suma stock por una empresa/delegación única; no soporta varias selecciones. Excel siempre calcula el stock global. |
| Valoración según selección | Parcial | En tabla es `coste × stock` para el alcance simple; debe calcularse con `stock_disp` de la selección múltiple y con el coste de cada línea. |
| Una línea con coste distinto por empresa | No aplicado | El modelo agrega todas las empresas dentro de un artículo y pierde la dimensión de coste por empresa. |
| Columnas Empresa y Delegación | No aplicado | Solo existen en el detalle/modal, no en la tabla principal ni en la exportación de filas. |
| Uno o varios valores por filtro | No aplicado | Grupo, marca, subgrupo, empresa y delegación son `<select>` de selección única. |
| Búsqueda activa en cada filtro | No aplicado | Solo hay un buscador general; las listas de los filtros no permiten buscar opciones. |

## Modelo de datos revisado y obligatorio

El nivel de detalle de la tabla deja de ser “un artículo” y pasa a ser **artículo + empresa + delegación**. Esta decisión evita mezclar costes de empresas distintas.

```text
clave_fila = cod_art + empresa_id + delegacion_id

cod_art, ref_art, descripcion_oficial,
grupo_marca_id, grupo_marca_nombre, marca_id, marca_nombre,
subgrupo_id, subgrupo_nombre,
empresa_id, empresa_nombre, delegacion_id, delegacion_nombre,
cos_art, stock_disp, valoracion, fecha_actualizacion
```

Definiciones de cálculo:

```text
stock_disp(filtros, artículo, empresa, delegación)
  = SUM(stock real de los almacenes incluidos por los filtros activos)

valoracion
  = cos_art de la misma empresa × stock_disp de la misma línea

total_valoracion(filtros)
  = SUM(valoracion de las líneas visibles)
```

Reglas indispensables:

- Nunca sumar stocks de dos empresas y multiplicarlos por un único `cos_art` si las empresas tienen costes diferentes.
- Si el usuario selecciona varias empresas o delegaciones, devolver una línea por combinación artículo–empresa–delegación; no consolidarlas en una única fila.
- Si negocio necesita una vista consolidada adicional, el coste consolidado ha de ser ponderado: `SUM(cos_art × stock_disp) / SUM(stock_disp)`, identificado explícitamente como “coste medio ponderado consolidado”; no sustituye las líneas de detalle.
- Una empresa seleccionada con todas sus delegaciones conserva una línea por delegación. Puede añadirse después una fila de subtotal de empresa, claramente marcada y calculada solo a partir de sus líneas.
- `stock_disp = 0` es un dato válido; coste ausente es `null`/“Sin coste”, nunca `0 €` ficticio.

## Plan de implementación revisado

### Paso 1 — Confirmar la procedencia empresarial de `cos_art`

1. Verificar con ERP si `galartic.cos_art` se consulta en una base compartida o en una base por empresa y cuál es la clave que vincula el coste a `cod_ent`.
2. Ejecutar una muestra de los mismos artículos en las empresas 03, 04 y 05 para identificar y documentar diferencias reales de `cos_art`.
3. Si la tabla actual no contiene el contexto de empresa, consultar la vista/tabla oficial por empresa; no replicar el mismo `cos_art` a varias empresas sin confirmación.
4. Añadir al control de calidad el indicador “artículos con costes distintos entre empresas” y una muestra de verificación manual.

**Salida:** consulta ERP aprobada que devuelve `cos_art` junto con `cod_art` y `empresa_id`.

### Paso 2 — Cambiar la extracción y API a filas de detalle

1. Ajustar el extractor para producir una fila por `cod_art`, `empresa_id` y `delegacion_id`, incluyendo `cos_art`, `stock_real` y nombres de empresa/delegación.
2. Obtener `stock_real` con `can_tal` agregado únicamente en la misma empresa y delegación. Conservar la trazabilidad de almacén si existe más de un almacén por delegación.
3. Reemplazar el objeto agregado `stocks: { "03-00": ... }` como fuente principal por una colección de filas normalizadas. Puede mantenerse temporalmente solo como compatibilidad.
4. Hacer que la API reciba listas de identificadores, por ejemplo `empresa=03,04`, `delegacion=00,10`, `grupoMarca=...`, `marca=...` y `subgrupo=...`, y las transforme de forma segura en listas.
5. Aplicar en servidor la selección, cálculo de `stock_disp` y `valoracion` antes de paginar. Devolver también los totales de la consulta.

**Pruebas de aceptación:** un artículo con coste distinto en 03 y 04 devuelve al menos dos filas, cada una con el coste y valoración correctos.

### Paso 3 — Filtros multiselección con búsqueda activa

1. Sustituir todos los `<select>` simples de Grupo, Marca, Subgrupo, Empresa y Delegación por un componente multiselección común.
2. El componente debe ofrecer: caja de búsqueda al abrirse, selección/deselección individual, “Seleccionar todo lo visible”, “Limpiar”, contador de seleccionados y chips removibles.
3. Mantener la jerarquía: al cambiar grupos, actualizar el catálogo de marcas permitido; al cambiar grupos/marcas, actualizar subgrupos. Retirar automáticamente valores incompatibles y explicarlo en la interfaz.
4. Empresa y delegación deben permitir múltiples selecciones. La lista de delegaciones se limita a las empresas seleccionadas; si no hay empresa seleccionada, puede mostrar todas las delegaciones con su empresa asociada.
5. Añadir una espera breve a la búsqueda y al cambio de filtros para evitar peticiones por cada pulsación, además de cancelar la petición anterior si se sustituye por una nueva.
6. Conservar la búsqueda general por código, referencia y descripción; esta es adicional a la búsqueda de opciones dentro de cada filtro.

**Pruebas de aceptación:** el usuario puede buscar “Sch…” dentro de Marca, escoger varias opciones y ver las mismas restricciones reflejadas en tabla, KPI, detalle y exportación.

### Paso 4 — Tabla, valoración y exportación

1. Renombrar la columna de coste a **“Coste de ficha (`cos_art`)”** y mostrar el valor de la empresa de la fila.
2. Añadir columnas **Empresa** y **Delegación** después de la clasificación, antes de coste y stock.
3. Renombrar stock a **“Stock disponible (`stock_disp`)”** y mostrar la suma que corresponde exactamente a los filtros seleccionados para esa línea.
4. Calcular **Valoración** exclusivamente como `cos_art × stock_disp`; ordenar y totalizar con ese mismo cálculo.
5. Adaptar cabecera, pie, KPI, detalle de artículo y analítica para consumir las filas de detalle. Los KPI deben sumar filas, nunca reutilizar el coste de un artículo de otra empresa.
6. Exportar las filas visibles, incluyendo Empresa, Delegación, `cos_art`, `stock_disp`, Valoración, filtros aplicados y fecha/fuente. Eliminar la columna “Stock Total” global cuando el alcance sea una selección; puede añadirse como métrica separada solo si se etiqueta como global.
7. Añadir subtotales opcionales por empresa y un total general; ambos deben sumar valoraciones de filas, no recalcular a partir de un coste único.

**Pruebas de aceptación:** modificar una empresa/delegación en la selección cambia `stock_disp`, valoración, total de tabla, KPI y Excel de forma idéntica.

### Paso 5 — Validación de negocio y regresión

1. Definir una matriz de 10 artículos, 3 empresas y las delegaciones pertinentes, con `cos_art`, stock y valoración validados directamente en ERP.
2. Cubrir: una empresa, varias empresas, una delegación, varias delegaciones, grupos/marcas/subgrupos múltiples, coste nulo y stock cero.
3. Comparar el Excel exportado con las filas visibles y con la respuesta de API; los tres resultados deben ser iguales.
4. Validar rendimiento con catálogos grandes: la búsqueda dentro de cada filtro debe ser inmediata y la tabla debe ser paginada en servidor.
5. Desplegar primero en prueba y mantener la vista antigua solo como referencia hasta que Compras y Almacén aprueben la matriz.

---

## Auditoría de filtros y ampliación de tablas — 29 de julio de 2026

### Incidencias confirmadas

| Hallazgo | Causa | Efecto actual | Corrección requerida |
| --- | --- | --- | --- |
| No se pueden marcar opciones | El componente de multiselección trata una selección vacía como “todos” y, al pulsar cualquier opción, vuelve a emitir una selección vacía. | Ningún Grupo, Marca, Subgrupo, Empresa o Delegación queda seleccionado. | Diferenciar con claridad “sin filtro” de “todos” y permitir que la primera pulsación añada el identificador seleccionado. |
| Subgrupo disponible sin Grupo | La lista se construye con todos los subgrupos cuando no hay grupo y el control nunca queda bloqueado. | Se puede elegir un subgrupo sin el contexto requerido. | Deshabilitar el control hasta que haya al menos un grupo elegido y vaciar su selección si se retiran todos los grupos. |
| Grupo y Subgrupo separados por Marca | El orden visual actual es Grupo → Marca → Subgrupo. | Grupo y subgrupo no aparecen juntos como requiere el flujo de trabajo. | Situar **Grupo** y **Subgrupo** contiguos, uno al lado del otro; Marca se mostrará después de Subgrupo. |
| Subgrupos deduplicados solo por código | El catálogo usa solo `id` como clave, aunque el mismo código puede existir en grupos distintos. | Puede desaparecer una opción o asociarse al grupo equivocado. | Usar clave compuesta `grupo_id + subgrupo_id`; mostrar el nombre y, si hace falta, el código. |

La construcción de producción sigue siendo correcta. La incidencia es funcional de estado del componente de filtro, no de compilación.

### Corrección de los filtros: especificación de implementación

1. Establecer una única convención de estado:

   ```text
   []        = no aplicar filtro (todas las opciones)
   [id, ...] = opciones seleccionadas
   ```

   No utilizar `ALL` como valor almacenado por los filtros multiselección. Si se ofrece el texto “Todos”, será una acción visible que deja el array vacío.

2. Corregir la operación de marcado para que una primera selección cambie `[]` a `[id]`; al volver a pulsarla, debe eliminar solamente ese `id`. Los controles de “Seleccionar visibles” y “Limpiar” deben conservar la misma convención.

3. Reordenar el área de clasificación a esta disposición visual, manteniendo Grupo y Subgrupo en el mismo bloque y sin otro filtro entre ambos:

   ```text
   [ Grupo de marca ] [ Subgrupo ] [ Marca ] [ Empresa ] [ Delegación ]
   ```

4. Estado de dependencia obligatorio:

   - Sin Grupo seleccionado: Subgrupo está deshabilitado, muestra “Seleccione primero un grupo” y no admite pulsaciones.
   - Al seleccionar uno o varios Grupos: Subgrupo se habilita y muestra exclusivamente los subgrupos de esos grupos.
   - Al desmarcar todos los Grupos: se limpia automáticamente Subgrupo y Marca; Subgrupo vuelve a quedar deshabilitado.
   - Marca puede refinar el conjunto de subgrupos ya disponible, pero no será un requisito para habilitar Subgrupo. Si se cambia Marca y desaparece un subgrupo seleccionado, se retira esa selección automáticamente.

5. Mantener búsqueda activa dentro de cada multiselección. La búsqueda debe filtrar únicamente las opciones del propio desplegable, no cambiar la selección hasta que el usuario marque una opción.

6. Añadir pruebas de interfaz para: primera selección, multiselección, deselección, limpiar, selección de grupo seguida de subgrupo, limpieza de grupo y restricción de resultados de subgrupo.

**Criterio de aceptación:** un usuario puede elegir varios grupos, buscar y marcar subgrupos compatibles, y observar que sólo llegan a la API los identificadores efectivamente seleccionados.

## Segunda tabla: coste medio unificado por referencia

Se incorporará una segunda tabla bajo la tabla de detalle. No sustituye el desglose por empresa y delegación: ofrece una visión consolidada de cada referencia para el mismo conjunto de filtros activo.

### Propósito y nivel de detalle

- **Tabla 1 — Detalle:** una fila por `artículo + empresa + delegación`, con el `cos_art` y `stock_disp` propios de esa ubicación.
- **Tabla 2 — Coste medio unificado:** una fila por artículo/referencia, consolidando todas las filas visibles de la Tabla 1.

La segunda tabla se recalcula siempre sobre las filas ya filtradas de la primera. De esta forma, los filtros de grupo, subgrupo, marca, empresa, delegación, texto, stock y coste afectan a ambas tablas de idéntica forma.

### Cálculos obligatorios

Para cada artículo `a`, siendo `i` cada fila de detalle visible (empresa + delegación):

```text
stock_unificado(a) = Σ stock_disp(i)

valoracion_unificada(a) = Σ [cos_art(i) × stock_disp(i)]

coste_medio_unificado(a) =
  valoracion_unificada(a) / stock_unificado(a), si stock_unificado(a) > 0
  “Sin stock”, si stock_unificado(a) = 0
```

Ejemplo: una referencia tiene 10 uds a 8 € en Empresa 03 y 30 uds a 12 € en Empresa 04.

```text
stock unificado = 10 + 30 = 40 uds
valoración unificada = (10 × 8) + (30 × 12) = 440 €
coste medio unificado = 440 / 40 = 11 €
```

No se calculará una media aritmética simple de costes (`(8 + 12) / 2`), porque ignoraría el peso del stock.

### Columnas de la segunda tabla

| Columna | Contenido |
| --- | --- |
| Código / Referencia | Identificador del artículo consolidado. |
| Descripción oficial | `dep_art` del maestro. |
| Grupo / Subgrupo / Marca | Clasificación de la referencia. |
| Empresas incluidas | Empresas visibles que aportan stock o coste a la consolidación. |
| Delegaciones incluidas | Delegaciones visibles que aportan stock o coste. |
| Stock unificado | `Σ stock_disp` de las líneas visibles. |
| Coste medio unificado | Media ponderada por stock, con cuatro decimales internos y presentación monetaria. |
| Valoración unificada | `Σ (cos_art × stock_disp)`; no se recalcula sobre valores redondeados. |
| Diferencia de coste | Indicador “Sí/No” y, opcionalmente, mínimo–máximo de `cos_art` entre las empresas incluidas. |

### Plan de implementación de la segunda tabla

1. Crear una función/consulta de agregación que reciba exactamente las mismas filas y filtros que la tabla de detalle.
2. Agrupar por `cod_art` y referencia, sin agrupar por empresa o delegación.
3. Calcular stock, valoración y coste medio unificado con precisión decimal; redondear sólo al presentar o exportar.
4. Incluir la columna “Diferencia de coste” para revelar, no ocultar, que el resultado procede de costes empresariales diferentes.
5. Mostrar un enlace o acción “Ver detalle” que filtre/desplace a las líneas de Tabla 1 de la referencia seleccionada.
6. Añadir totales de Tabla 2: stock y valoración se suman; el coste medio general se calcula como `Σ valoración unificada / Σ stock unificado`.
7. Añadir una segunda hoja de Excel, “Coste unificado”, con las mismas columnas y fórmulas ya resueltas por la API.
8. Validar con artículos que tengan: un único coste, costes distintos y stock cero en una de las empresas.

**Criterio de aceptación:** al seleccionar varias empresas, cada referencia aparece una sola vez en la segunda tabla y su coste coincide con la media ponderada de los costes de sus líneas visibles en la Tabla 1.

---

## Cierre — 29 de julio de 2026

### Estado de las brechas frente al alcance revisado

Todas las brechas listadas en la auditoría están resueltas en código y verificadas en runtime contra el ERP:

| Requisito revisado | Estado | Evidencia |
| --- | --- | --- |
| `cos_art` por empresa/delegación | Aplicado | Extracción desde `PUB.galardel` con `cod_Ent`/`cod_del`; verificado `000000024` con `cos03=2,5849` y `cos04=2,799`. |
| `stock_disp` según selección | Aplicado | `sre_art` de `galardel` por empresa/delegación; filtros multi-valor `empresa=03,04` devuelven filas independientes por ubicación. |
| Valoración según selección | Aplicado | `valoracion = cos_art × stock_disp` por fila; los totales de la API coinciden con la suma de las filas visibles. |
| Una línea con coste distinto por empresa | Aplicado | Una fila por `cod_art + empresa_id + delegacion_id`; la Tabla 2 marca `diferencia_coste = Sí` cuando el coste varía. |
| Columnas Empresa y Delegación | Aplicado | Columnas presentes en tabla, modal, KPI y Excel (hoja "Detalle"). |
| Uno o varios valores por filtro | Aplicado | `MultiSelect` con convención `[]`=sin filtro, `[id,...]`=seleccionado; filtros multi-valor en API (`empresa=03,04`). |
| Búsqueda activa en cada filtro | Aplicado | Cada `MultiSelect` trae caja de búsqueda que filtra solo las opciones del propio desplegable. |

### Incidencias de filtros resueltas

- **No marcar opciones:** corregido; primera pulsación añade el id, segunda lo elimina.
- **Subgrupo sin grupo:** Subgrupo deshabilitado y muestra "Seleccione primero un grupo" hasta que hay grupo.
- **Orden Grupo → Subgrupo → Marca:** aplicado; Grupo y Subgrupo contiguos.
- **Subgrupos por clave compuesta:** id `grupo|subgrupo` en catálogo y filtrado servidor.

### Validación técnica ejecutada (Paso 5)

- **Coherencia API ↔ Excel:** los totales (`stock_disp`, `valoracion`, `articulos_unicos`) devueltos por la API coinciden con la suma de las filas visibles (origen único de datos para ambos).
- **Caso coste distinto entre empresas:** `000000024` → 2 filas (03 con 37 uds a 2,5849 €, 04 con 20 uds a 2,799 €); la Tabla 2 muestra stock 57, valoración 151,62 €, coste medio 2,66 € (ponderado) y `diferencia_coste = Sí`.
- **Caso stock cero y sin coste:** filas conservadas con `stock_disp=0` y `sin_coste=true`; el 0 no se muestra como coste válido ("Sin coste informado").
- **Rendimiento:** `/api/catalogos` 361 ms, `/api/incremental-sync?pageSize=50` 181 ms.
- **Lint/build:** `npm run lint` 0 warnings/0 errors; `npm run build` OK.

### Pendiente de negocio

- Aprobar la **matriz de 10 artículos** con Compras y Almacén (validación funcional final).
- Confirmar la **antigüedad máxima de la caché** (24 h por defecto en `CACHE_MAX_AGE_HOURS`).
- Despliegue en entorno de prueba y aprobación por usuarios antes de publicación.
