---
tags: [proyecto, software, ficha-depurada]
origen: Piloto
actualizado: 2026-11-10
autorizada_para: [nube, local]
---

# Pulso (ficha depurada)

> Versión depurada para el piloto: sin rutas locales, enlaces, cifras de negocio, datos de clientes ni historial de publicaciones. La ficha oficial está en la bóveda privada.

## Qué es
App interna de operación de un negocio pequeño, separada de su tienda en línea. Módulos: resumen, ventas, inventario con fotos, compras, gastos, contactos y suplidores, deudas y abonos, reportes, caja, rendimiento y navegación móvil. Es una PWA con acceso privado.

## Stack
React 19, TypeScript, Vinext sobre Vite, Tailwind, Zod, Drizzle, Cloudflare Workers con D1.

## Reglas de negocio
- Moneda en centavos y zona horaria `America/Santo_Domingo`.
- La venta descuenta stock; la compra repone con costo promedio. La caja contrasta esperado y contado.
- El resultado de operación es ventas menos costo vendido y gastos operativos; no descuenta compras otra vez.
- Fuera de alcance: facturación fiscal, pagos integrados, multi-negocio, permisos de empleados y sincronización en tiempo real.

## Precauciones técnicas
- `GET /api/business` puede crear una fila si no existe: no usarlo como verificación de solo lectura sobre una base viva.
- Si una venta agota el tiempo de espera, consultar su ID antes de reintentar con los mismos datos.

## Flujo de desarrollo
- El usuario define la intención. **Codex coordina, conserva la decisión y valida.**
- **La IA local** propone parches solo en archivos o regiones autorizados, sin terminal ni herramientas.
- **Antigravity revisa y prueba**, sin corregir fuente ni cambiar permisos.
- **Hermes** queda como futuro operador, fuera del flujo de desarrollo.
- **Criterio de cierre:** un «SUCCESS» no reemplaza el diff aceptado, la revisión válida ni las pruebas sobre la misma huella. Máximo tres ciclos por encargo.

## Pendientes conocidos
- Comprobar hidratación y acceso en el navegador real.
- Implementar «mes calendario» como período distinto de «últimos 30 días».
- Completar instalabilidad PWA, sesión de operador y auditoría duradera.
