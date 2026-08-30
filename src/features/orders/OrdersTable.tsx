import { ChevronRight } from "lucide-react";
import type { Order } from "../../types";
import { OperationBadge } from "../../shared/components";
import { dateTime, money } from "../../shared/formatters";
import { orderLabel } from "./constants";

export function OrdersTable({ orders, openOrder }: { orders: Order[]; openOrder: (id: string) => void }) { return <div className="table-wrap"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Pago</th><th>Estado</th><th>Fecha</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.id} tabIndex={0} onClick={() => openOrder(order.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openOrder(order.id); }}><td className="mono">#{order.id.slice(0, 8)}</td><td><strong>{order.contactName}</strong><br /><small>{order.contactEmail}</small></td><td className="strong-cell">{money(order.total)}</td><td><OperationBadge value={orderLabel[order.paymentStatus] || order.paymentStatus} tone={order.paymentStatus === 'PAID' ? 'success' : 'warning'} /></td><td><OperationBadge value={orderLabel[order.status]} tone={order.status === 'CANCELLED' ? 'danger' : order.status === 'DELIVERED' ? 'success' : 'neutral'} /></td><td>{dateTime(order.createdAt)}</td><td><ChevronRight size={17} /></td></tr>)}</tbody></table></div> }
