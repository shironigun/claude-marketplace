export const listOrders = () =>
  fetch('/api/orders').then((r) => r.json());
export const getOrder = (id: string) =>
  fetch(`/api/orders/${id}`).then((r) => r.json());
