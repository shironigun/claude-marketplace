export async function fetchLeads() {
  const response = await fetch('/api/leads');
  return response.json();
}
