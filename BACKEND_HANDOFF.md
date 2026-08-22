# Pendientes de API para completar el backoffice

Este documento describe exclusivamente contratos faltantes o incompletos detectados al integrar el frontend. El backoffice usa el prefijo `/api/v1`, autenticación `Bearer` con rol `ADMIN` y espera errores JSON con `message`.

## 1. Resumen operativo del dashboard

`GET /api/v1/admin/dashboard/summary`

Debe calcular los indicadores en el servidor sobre el catálogo completo, no sólo sobre la página cargada por el cliente.

```json
{
  "activeProducts": 24,
  "variantsWithoutPrice": 3,
  "pendingPricingReviews": 5,
  "variantsWithoutSupplier": 2,
  "averageMarginPercent": 27.4,
  "alerts": [
    {
      "type": "LOW_MARGIN",
      "productId": "uuid",
      "variantId": "uuid",
      "label": "Excellent Adult · 15 kg",
      "currentMargin": 18,
      "targetMargin": 25
    }
  ]
}
```

El margen debe usar la misma oferta preferida y la misma estructura de costos que pricing. Una variante sin oferta activa no debe computarse como margen cero.

## 2. Consulta global de inventario

`GET /api/v1/admin/inventory?q=&page=1&perPage=25`

Respuesta paginada:

```json
{
  "items": [
    {
      "variantId": "uuid",
      "productId": "uuid",
      "productName": "Excellent Adult",
      "sku": "EXC-ADULT-15",
      "presentation": "15 kg",
      "onHand": 20,
      "reserved": 3,
      "available": 17
    }
  ],
  "meta": { "page": 1, "perPage": 25, "total": 1, "totalPages": 1 }
}
```

`q` debe buscar por producto, SKU y presentación. `available` siempre debe ser derivado por el backend.

## 3. Ajuste seguro de inventario

`POST /api/v1/admin/variants/:variantId/inventory/adjustments`

```json
{ "quantityDelta": -2, "reason": "Rotura de envase" }
```

Respuesta:

```json
{ "variantId": "uuid", "onHand": 18, "reserved": 3, "available": 15 }
```

Requisitos:

- operación transaccional y atómica;
- bloquear el registro de inventario durante el ajuste;
- no permitir que `onHand` resulte negativo ni menor que `reserved`;
- crear un movimiento `ADJUSTMENT` con cantidad, motivo y administrador;
- las reservas no se editan manualmente: sólo cambian por reserva, liberación, cancelación o despacho de pedidos;
- aceptar idempotency key si el resto de los comandos administrativos ya usa ese patrón.

El historial existente `GET /api/v1/admin/variants/:variantId/inventory/movements` debe devolver `id`, `variantId`, `orderId`, `type`, `quantity`, `reason` y `createdAt`, ordenado de más reciente a más antiguo.

## 4. Cola global de revisiones de precios

`GET /api/v1/admin/pricing/reviews?status=PENDING&q=&page=1&perPage=25`

Debe ser paginado y enriquecido para evitar cargar todo el catálogo y unirlo en el navegador. Cada item debe incluir, además del `PricingReview` actual:

```json
{
  "id": "uuid",
  "variantId": "uuid",
  "supplierOfferId": "uuid",
  "status": "PENDING",
  "recommendedPrice": "82400.00",
  "commercialPrice": "82490.00",
  "createdAt": "2026-08-22T12:00:00.000Z",
  "appliedAt": null,
  "product": { "id": "uuid", "name": "Excellent Adult" },
  "variant": { "sku": "EXC-ADULT-15", "presentation": "15 kg", "salePrice": "79990.00" },
  "currentMarginPercent": "27.40",
  "breakdown": {}
}
```

`q` debe buscar producto y SKU. Al aplicar una revisión, el backend debe validar que sigue vigente y devolver `409` si cambió la oferta, las reglas o la revisión ya fue aplicada/sustituida.

## 5. Historial de reglas de precio

`GET /api/v1/admin/pricing/rules/history`

Debe devolver todas las versiones ordenadas por `version DESC`, incluyendo `createdAt` y `activatedAt`. Sólo puede existir una versión `ACTIVE`; activar un borrador debe reemplazar la activa y ejecutarse en una transacción.

## 6. Comprobante de pago

`POST /api/v1/admin/orders/:orderId/payments/:paymentId/proof/upload`

Recibe `multipart/form-data` con `file`. No requiere `Content-Type` manual desde el navegador.

Debe:

- validar que el pago pertenece al pedido;
- aceptar los MIME definidos por negocio para comprobantes y aplicar un límite documentado;
- guardar en bucket privado;
- persistir la ruta interna, no una URL firmada;
- devolver el pedido completo con `payments[].proofUrl` resuelta temporalmente;
- registrar la acción en auditoría.

## 7. Clientes y creación manual de pedidos

- La unicidad/reutilización de clientes por email debe normalizar `trim + lowercase` en el servidor.
- Al crear una orden con `customerId`, validar que el cliente esté activo.
- Si la creación permite datos de invitado, no crear una cuenta de usuario implícita.
- La creación del pedido, líneas, precios capturados y reserva de stock debe ser transaccional.
- El detalle debe devolver `availableTransitions` calculadas en backend para que el frontend no replique la máquina de estados.
- Cancelar una orden debe liberar reservas de manera idempotente.
- Registrar pago y transición de estado deben rechazar estados incompatibles con `409` y no aceptar importes negativos o superiores a lo permitido por negocio.

## 8. Auditoría administrativa consultable

`GET /api/v1/admin/audit-logs?q=&method=&statusCode=&dateFrom=&dateTo=&page=1&perPage=25`

Respuesta paginada con:

```json
{
  "items": [
    {
      "id": "uuid",
      "actorUserId": "uuid",
      "action": "product.update",
      "method": "PATCH",
      "path": "/api/v1/admin/products/uuid",
      "statusCode": 200,
      "metadata": {},
      "createdAt": "2026-08-22T12:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "perPage": 25, "total": 1, "totalPages": 1 }
}
```

La auditoría debe registrar comandos administrativos exitosos y fallidos relevantes, sin guardar access tokens, refresh tokens, contraseñas, secretos, archivos ni datos de tarjeta. `metadata` debe contener identificadores y cambios seguros para diagnóstico.

## 9. Consistencia de respuestas y OpenAPI

- Estandarizar listas grandes como `{ items, meta }` con `page`, `perPage`, `total` y `totalPages`.
- Mantener arrays simples sólo para referencias pequeñas si esa decisión queda documentada.
- Documentar cuerpos y respuestas reales de todos los endpoints anteriores en OpenAPI.
- Los errores deben devolver al menos `{ "message": "..." }`; validaciones múltiples pueden devolver `message: string[]`.
- Los endpoints de medios deben resolver URLs firmadas en lectura y nunca exponer la clave secreta ni una ruta pública del bucket.
- Todas las rutas `/admin` deben exigir rol `ADMIN` también en backend; ocultarlas en React no es control de acceso.

## Criterio de cierre para el agente de backend

El backend queda listo para este frontend cuando los endpoints 1, 2, 3, 4, 6 y 8 están disponibles con los contratos anteriores, el historial de reglas incluye fechas, y el OpenAPI refleja fielmente paginación, estados, multipart y errores. No se requiere modificar el frontend para simular esos resultados: ante un endpoint faltante, éste muestra el error real de la API.
