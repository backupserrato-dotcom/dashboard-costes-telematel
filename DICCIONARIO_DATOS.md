# Diccionario de datos — Dashboard de Costes Medios (Telematel GoManage ERP)

**Versión:** 1.0 (propuesta para validación por el responsable ERP)
**Fecha:** 28 de julio de 2026
**Ambito:** Origen oficial de cada campo mostrado en el dashboard.

> Los mapeos marcados como **[PENDIENTE DE VALIDACIÓN]** son propuestas realizadas
> por Analíticos. Deben ser confirmados por el responsable ERP antes de considerar
> los datos como fuente única de decisión. Las decisiones pendientes están listadas
> al final.

## 1. Contrato de datos por artículo

Cada fila devuelta por la API al cliente expone estos campos, todos trazables a una
tabla/columna del ERP:

| Campo API | Tabla ERP | Columna ERP | Observaciones |
| --- | --- | --- | --- |
| `cod_art` | `PUB.galartic` | `cod_art` | Clave única del maestro de artículos. |
| `ref_art` | `PUB.galartic` | `ref_art` | Referencia de fabricante. Si viene vacía, se deja `''` (no se inventa con el código). |
| `descripcion_oficial` (`nom_art`) | `PUB.galartic` | `dep_art` | **Única descripción mostrada.** Nunca se construye a partir de marca + referencia. |
| `marca_id` (`cod_mar`) | `PUB.galartic` | `mar_art` | Código de marca (clave foránea a `PUB.galmarca`). |
| `marca_nombre` (`nom_mar`) | `PUB.galmarca` | `nom_mar` | Descripción oficial de marca (JOIN por `mar_art = cod_mar`). |
| `grupo_marca_id` (`cod_grc`) | `PUB.galartic` | `cod_grc` | **Confirmado por negocio.** Código de grupo de marca. |
| `grupo_marca_nombre` (`nom_grc`) | `PUB.galartic` | `cod_grc` | No existe maestro separado de nombres: el código se sirve como nombre. No se inventa el literal "General". |
| `subgrupo_id` (`cod_gru`) | `PUB.galartic` | `cod_gru` | **Confirmado por negocio.** Código de subgrupo. |
| `subgrupo_nombre` (`nom_gru`) | `PUB.galartic` | `cod_gru` | No existe maestro separado de nombres: el código se sirve como nombre. |
| `coste_ficha` (`cos_med`) | `PUB.galartic` | `cos_art` | **Confirmado por negocio.** Coste medio ponderado que ya vive en la ficha del artículo. Se lee tal cual; no se calcula ni deriva. |
| `moneda` | — | — | EUR asumido. [PENDIENTE] confirmar si existen artículos en otra moneda. |
| `cos_ul` | — | — | Alias legacy de la UI. Se sirve igual que `coste_ficha` (no se deriva). |
| `fecha_actualizacion` | `meta` | `fecha` | Fecha de la última lectura contra ERP (generada por el extractor). |
| `stock[].empresa_id` / `delegacion_id` | `PUB.galardel` | `cod_Ent` / `cod_del` | **Confirmado.** Claves reales de ubicación en la misma tabla que el coste. |
| `stock[].unidades` (`stock_disp`) | `PUB.galardel` | `sre_art` | **Confirmado por negocio (29/07/2026).** Stock disponible por empresa/delegación. |
| `stock[].fecha_stock` | `meta` | `fecha` | Fecha de lectura. |

## 2. Estados de calidad (flags)

Cada artículo lleva marcas explícitas para no confundir “0” con un dato válido:

- `sin_coste`: `coste_ficha` no informado o `0`. En la UI se muestra “Sin coste informado”, **no** `0 €`.
- `sin_stock`: total de existencias = 0. En la UI se muestra “Sin existencias”.
- `ubicacion_no_mapeada`: alguna unidad no pudo asignarse a una empresa/delegación conocida (clave real ausente). Se conserva el registro y se reporta en el indicador de calidad.

## 3. Modos de consulta

- **Consultar ERP ahora:** ejecuta el extractor unificado en servidor y refresca la caché. Se muestra como “Tiempo real” con hora de lectura.
- **Ver última caché:** sirve `datos_costes_actualizados.json` sin tocar el ERP. Se etiqueta como “Caché” con su fecha de modificación. Nunca se presenta la caché como tiempo real.

## 4. Decisiones pendientes de negocio

1. ~~Campo oficial exacto del **coste de ficha**.~~ **Resuelto (28/07/2026):** `galartic.cos_art` (coste medio ponderado de la ficha).
2. ~~Tabla/vista que vincula cada existencia con empresa, delegación y almacén de forma inequívoca.~~ **Resuelto (29/07/2026):** `galardel` con `cod_Ent`/`cod_del` contiene coste (`cos_art`) y stock (`sre_art`) por empresa/delegación en una sola tabla.
3. ~~Maestros oficiales para **nombre de grupo de marca** y **nombre de subgrupo**.~~ **Resuelto (28/07/2026):** Grupo = `galartic.cod_grc`, Subgrupo = `galartic.cod_gru`. No hay maestro separado de nombres; el código se sirve como nombre.
4. Antigüedad máxima aceptable de la caché antes de alerta o bloqueo de exportación (por defecto: 24 h en `CACHE_MAX_AGE_HOURS`).

## 5. Ubicaciones conocidas (maestro de empresa/delegación)

| empresa_id | empresa_nombre | delegación_id | delegación_nombre |
| --- | --- | --- | --- |
| 03 | 03 San Pedro | 00 | 00 Electricidad |
| 03 | 03 San Pedro | 10 | 10 Fontanería |
| 04 | 04 Estepona | 00 | 00 Electricidad |
| 04 | 04 Estepona | 10 | 10 Fontanería |
| 05 | 05 Marbella | 00 | 00 Marbella |

> Las unidades cuya `empresa_id`/`delegacion_id` no esté en esta tabla se marcan
> `ubicacion_no_mapeada` y se suman aparte, sin repartirse con heurísticas.