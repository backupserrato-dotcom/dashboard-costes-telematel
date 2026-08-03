# Scripts obsoletos — NO USAR

Estos scripts fueron reemplazados por `../extraccion_unificada.ps1` y se conservan
aquí solo como referencia histórica. **No deben ejecutarse.**

## Por qué son obsoletos

- **Heurísticas de ubicación (%3/%5):** repartían el stock entre delegaciones
  usando el resto de `cod_tac`, lo que producía existencias incorrectas.
  El extractor unificado usa las claves reales `cod_ent`/`cod_del` de `galartal`.
- **Coste derivado/ficticio:** algunos inventaban `cos_med * 1.05` o tomaban
  `pre_tal`/`cos_abl` como coste. El coste medio ponderado se lee ahora de la
  ficha del artículo (`galartic.cos_art`), confirmado por negocio.
- **Descripción fabricada:** construían el nombre como `marca - Ref xxx`.
  El extractor unificado usa la descripción oficial `galartic.dep_art`.
- **Clasificación incorrecta:** asignaban `nom_grc` al código y `nom_gru` a
  "General". Ahora Grupo = `cod_grc` y Subgrupo = `cod_gru` (confirmado).

## Script activo

- `../extraccion_unificada.ps1` — único extractor mantenido.
- `../auditar_descarga.ps1` — auditoría (fallback, raramente usado).
