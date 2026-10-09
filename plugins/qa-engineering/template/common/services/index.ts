/**
 * Service barrel — export every API service class from here so specs import one path.
 *
 *   import { OrderService } from '../../../../../common/services';
 *
 * Naming convention in specs: use the plural domain noun, never `svc`, and never shadow
 * the service with its own list result:
 *
 *   const orders    = new OrderService(apis.orders, profile.testTenantId);
 *   const orderList = await orders.list();   // ✅
 *   const orders    = await orders.list();   // ❌ shadows the service
 *
 * Add your module's service here as you create it (see AGENTS.md §6 and modules/README.md):
 *
 *   export { OrderService } from './orders.service';
 *   export type { OrderRef, OrderRecord } from './orders.service';
 */
export {};
