export async function listOrders(token: string) {
  const res = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}
