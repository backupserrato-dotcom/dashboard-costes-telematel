# Auditoría visual y depuración

Fecha: 12 de agosto de 2026

## Mejoras aplicadas

- Botones principales y secundarios con volumen, luz superior, sombra física y respuesta diferenciada al pulsar.
- Pestañas con estado activo accesible, relieve y marcador luminoso.
- Tarjetas KPI con profundidad, iluminación vinculada a cada indicador y animación respetuosa con `prefers-reduced-motion`.
- Paneles de gráficos con mejor separación del fondo y transición discreta al interactuar.
- Barras de ranking animadas desde su origen.
- Contenido del dashboard con entrada suave y foco de teclado claramente visible.
- Botones de detalle, filtros y paginación con estados hover, active, disabled y focus coherentes.

## Depuración realizada

- Eliminada la implementación histórica y duplicada de la ficha de artículo en `App.jsx`.
- Eliminado el estado React dedicado únicamente al hover de cada KPI; el efecto se resuelve con CSS.
- Retirados estilos en línea redundantes de las barras KPI.
- Centralizado el estilo de pestañas en clases reutilizables.
- Reducido el paquete JavaScript principal al retirar código muerto.

## Validaciones

- Análisis estático sin avisos.
- Cinco pruebas automatizadas superadas.
- Auditoría npm sin vulnerabilidades.
- Compilación de producción correcta.
- Navegación entre maestro y compras comprobada.
- Ficha de artículo abierta con datos reales.
- Consola del navegador sin errores.
- Soporte de reducción de movimiento preservado.

## Próximas mejoras recomendadas

1. Corregir definitivamente los textos antiguos con codificación incorrecta en algunos archivos fuente.
2. Extraer los estilos en línea restantes de Navbar y vistas de LISTIN 11.
3. Añadir pruebas visuales automáticas para escritorio y móvil.
4. Dividir el paquete de gráficos si el tiempo de carga crece con nuevas vistas.
