# Guía de uso — Dashboard de Costes Medios

**Versión:** 1.0 · 28 de julio de 2026

Esta guía resume el significado de los datos mostrados y cómo usar los filtros.
Para el origen técnico de cada campo, ver `DICCIONARIO_DATOS.md`.

## 1. Dos modos de consulta

El dashboard distingue claramente entre:

- **Ver caché** (botón gris): sirve la última lectura guardada en
  `datos_costes_actualizados.json`, sin tocar el ERP. Es la vista por defecto.
  Se muestra como `CACHE` en la franja de confianza.
- **Consultar ERP ahora** (botón azul): ejecuta el extractor unificado contra
  Telematel ERP, actualiza la caché y sirve el resultado fresco. Se muestra como
  `ERP_LIVE`.

La franja superior indica siempre la **fecha de la última lectura** y la
**antigüedad de la caché**. Si la caché supera las 24 h, se avisa con un aviso
amarillo (“Caché antigua”) y se recomienda consultar el ERP.

## 2. Significado de cada dato

| Qué se muestra | Significado | Estado cuando no hay dato |
| --- | --- | --- |
| Descripción | Texto oficial del maestro de artículos (`galartic.dep_art`). | “Sin descripción oficial” si viene vacío. |
| Coste de ficha | Coste medio ponderado de la ficha del artículo (`galartic.cos_art`), ya calculado por el ERP. **No** se calcula ni deriva en el dashboard. | “Sin coste informado” (ámbar). El 0 nunca se presenta como coste válido. |
| Stock (alcance) | Existencias físicas reales en la empresa/delegación seleccionada. | “Sin existencias” (rojo). |
| Ubicaciones no mapeadas | Unidades cuya empresa/delegación no está en el maestro conocido. No se reparten con heurísticas. | Aviso en la ficha del artículo. |
| Grupo / Subgrupo | Código de grupo (`cod_grc`) y subgrupo (`cod_gru`) del maestro de artículos. No hay maestro separado de nombres: el código es el identificador mostrado. | “—” si no existe. |

## 3. Filtros jerárquicos

Los filtros siguen la jerarquía **Grupo de marca → Marca → Subgrupo**:

1. Al elegir **Grupo de marca**, solo se habilitan las marcas de ese grupo.
2. Al elegir **Marca**, solo se habilitan los subgrupos de esa marca dentro del grupo.
3. Cambiar un nivel superior limpia las selecciones incompatibles.

Otros filtros: **Empresa**, **Delegación** (delegación solo se habilita tras
elegir empresa), **Estado de stock**, **Rango de coste** (incluye “Sin coste
informado”) y **Búsqueda** por código, referencia, descripción oficial o marca.

Los chips de filtros activos permiten quitar uno a uno; “Limpiar todo” los
reinicia. El filtrado principal se aplica en el **servidor**, de modo que
tabla, KPI, detalle y Excel comparten exactamente el mismo alcance.

## 4. Exportar a Excel

“Exportar Excel” descarga exactamente las filas filtradas, con: código,
referencia, descripción oficial, marca, grupo, subgrupo, coste de ficha,
moneda, flags de sin coste / sin existencias, stock por cada ubicación, stock
total, valoración y **fecha de datos**.

## 5. Frescura y calidad

La franja de confianza muestra:

- **Modo** (CACHE / ERP_LIVE), **última lectura** y **antigüedad**.
- **% con coste** y **% con stock** sobre el total.
- **Unidades no mapeadas** (si las hay).
- Aviso de **caché antigua** cuando supera el umbral configurado (24 h por
  defecto; ajustable en `server/dbConnectorServer.js`, `CACHE_MAX_AGE_HOURS`).

## 6. Seguridad

Las credenciales ODBC (**DSN, usuario, password**) viven **solo en el servidor**
en el fichero `.env` (no versionado). El cliente no las contiene ni las expone.
El endpoint `/api/health` publica únicamente host, IP, driver y estado de la
caché.

## 7. Decisiones de negocio pendientes

Ver `DICCIONARIO_DATOS.md` §4. Resueltas hasta ahora:

- **Clasificación** (28/07/2026): Grupo = `galartic.cod_grc`, Subgrupo = `galartic.cod_gru`. Sin maestro de nombres; el código se sirve como nombre.
- **Coste** (28/07/2026): coste medio ponderado de la ficha, `galartic.cos_art`.

Pendiente: confirmar la **antigüedad máxima de la caché** (por defecto 24 h, ajustable en `CACHE_MAX_AGE_HOURS`).
