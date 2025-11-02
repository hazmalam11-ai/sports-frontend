export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}${url}`, options);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
