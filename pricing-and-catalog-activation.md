# Pricing, escenarios y activación del catálogo

## Objetivo

El backoffice puede configurar costos, proyectar la rentabilidad de un período,
calcular un precio sugerido para una variante, aprobarlo como precio final y
activar el producto para la venta.

Todas las rutas administrativas requieren autenticación de administrador y se
exponen bajo `/api/v1`.

## Conceptos

### Costos directos

Son costos que se aplican a cada unidad o pedido:

- Costo de la oferta del proveedor.
- Packaging.
- Subsidio de envío.
- Comisión de Mercado Pago.
- IVA de la comisión de Mercado Pago.
- Impuestos porcentuales.
- Otros costos variables.

### Costos fijos

Son costos mensuales independientes de la cantidad vendida:

- Depósito.
- Monotributo.
- Otros costos cargados como `FIXED_MONTHLY`.

Los costos fijos se usan en los escenarios y también pueden distribuirse en el
precio sugerido mediante un escenario.

## Configuración de Mercado Pago

Listar tarifas:

```http
GET /api/v1/admin/pricing/payment-fees
```

La migración inicial crea la tarifa `MERCADOPAGO / CHECKOUT_PRO` de
acreditación inmediata con `6.29%` y `21%` de IVA.

Seleccionar una tarifa:

```http
POST /api/v1/admin/pricing/payment-fees/{scheduleId}/select
```

Esto crea o actualiza un borrador de reglas. Para hacerla efectiva:

```http
POST /api/v1/admin/pricing/rules/activate
```

No se debe mostrar la tarifa como activa en el frontend hasta completar la
activación de las reglas.

## Costos operativos

Listar costos:

```http
GET /api/v1/admin/pricing/operating-costs
```

Crear un costo fijo mensual:

```http
POST /api/v1/admin/pricing/operating-costs
```

```json
{
  "name": "Depósito",
  "type": "FIXED_MONTHLY",
  "amount": "220000.00",
  "currency": "ARS"
}
```

Tipos disponibles:

- `FIXED_MONTHLY`: costo mensual.
- `PER_ORDER`: costo por pedido.
- `PER_UNIT`: costo por unidad.
- `PERCENT_OF_SALE`: porcentaje sobre la venta.

Para desactivar un costo se debe usar `PATCH` y enviar `active: false`; no hace
falta eliminar registros históricos.

## Escenarios

Crear el escenario inicial:

```http
POST /api/v1/admin/pricing/scenarios
```

```json
{
  "name": "Primer mes",
  "periodStart": "2026-08-01T00:00:00.000Z",
  "periodEnd": "2026-09-01T00:00:00.000Z",
  "ordersSource": "MANUAL",
  "projectedOrders": 20,
  "averageItemsPerOrder": "1.00"
}
```

Para usar los pedidos reales del período anterior:

```json
{
  "ordersSource": "PREVIOUS_PERIOD",
  "projectedOrders": 20
}
```

Si todavía no hay pedidos anteriores, el backend usa `projectedOrders` como
fallback.

Obtener el análisis:

```http
GET /api/v1/admin/pricing/scenarios/{scenarioId}/analysis
```

El análisis devuelve:

- `ordersUsed`: pedidos usados para la proyección.
- `averageSalePricePerUnit`: precio medio del catálogo analizado.
- `averageVariableCostPerUnit`: costo variable medio.
- `averageContributionPerOrder`: aporte después de costos variables.
- `fixedMonthlyCosts`: suma de costos fijos.
- `projectedRevenue`: facturación proyectada.
- `projectedOperatingResult`: resultado después de costos fijos.
- `breakEvenOrders`: pedidos necesarios para cubrir costos fijos.
- `breakEvenRevenue`: facturación necesaria para llegar al equilibrio.

El promedio inicial se calcula sobre variantes activas con precio y la oferta
activa más económica. Cuando haya suficiente historial, conviene evolucionar a
un promedio ponderado por el mix real de ventas.

## Calcular precio sugerido

Sin costos fijos asignados:

```http
POST /api/v1/admin/pricing/calculate
```

```json
{
  "variantId": "VARIANT_UUID",
  "supplierOfferId": "SUPPLIER_OFFER_UUID"
}
```

Para incluir los costos fijos distribuidos según un escenario:

```json
{
  "variantId": "VARIANT_UUID",
  "supplierOfferId": "SUPPLIER_OFFER_UUID",
  "scenarioId": "SCENARIO_UUID"
}
```

El backend calcula:

```text
costo fijo por unidad = costos fijos mensuales /
                        (pedidos del escenario * productos promedio por pedido)
```

Ese importe aparece en `breakdown.fixedMonthlyAllocation` y forma parte del
costo efectivo usado para calcular `recommendedPrice` y `commercialPrice`.

El frontend debe mostrar ambos precios:

- `recommendedPrice`: precio matemático mínimo recomendado.
- `commercialPrice`: precio redondeado a terminación comercial, actualmente
  `990`.

## Guardar una revisión y aplicar el precio

Para generar una revisión persistida:

```http
POST /api/v1/admin/variants/{variantId}/recalculate-price
```

```json
{
  "supplierOfferId": "SUPPLIER_OFFER_UUID",
  "scenarioId": "SCENARIO_UUID"
}
```

Enviar `supplierOfferId` fija esa oferta como preferida de la variante y evita
que la revisión se aplique con otra oferta diferente.

Aplicar el precio:

```http
POST /api/v1/admin/variants/{variantId}/apply-price
```

```json
{
  "pricingReviewId": "REVIEW_UUID",
  "activateProduct": true
}
```

La activación exige categoría, marca e imagen activas, además de al menos una
variante activa con SKU y precio mayor que cero. Si alguna condición falla, no
se aplica el precio ni se activa el producto.

## Flujo recomendado del frontend

1. Cargar reglas, tarifas y costos.
2. Seleccionar la tarifa de Mercado Pago y activar las reglas.
3. Crear o seleccionar un escenario mensual.
4. Mostrar el análisis de rentabilidad y el punto de equilibrio.
5. En cada variante, permitir seleccionar una oferta del proveedor.
6. Solicitar el precio sugerido enviando `scenarioId`.
7. Mostrar desglose y pedir confirmación.
8. Crear la revisión con `recalculate-price`.
9. Aplicar la revisión con `activateProduct: true`.
10. Refrescar producto y variante desde `GET /api/v1/admin/products/{id}`.

El frontend no debe recalcular comisiones, IVA, márgenes ni punto de equilibrio.
Debe mostrar los resultados del backend y manejar errores de validación de
publicación.

## Estados recomendados en la interfaz

- `Sin precio`: la variante no tiene precio final.
- `Precio sugerido`: existe un cálculo, todavía no aprobado.
- `Revisión pendiente`: existe una revisión persistida.
- `Precio aplicado`: el precio ya fue escrito en la variante.
- `Producto activo`: el producto está disponible en el catálogo público.
- `No publicable`: falta imagen, SKU, marca, categoría o precio.

La web pública solo debe consumir productos activos y precios aplicados. No
debe conocer costos de proveedores, costos fijos ni credenciales de Mercado
Pago.
