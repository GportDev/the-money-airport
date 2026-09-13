export const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`${apiUrl}${path}`, {
		credentials: "include",
		headers: { "Content-Type": "application/json", ...options?.headers },
		...options,
	});
	if (!res.ok) {
		throw new Error("Request failed");
	}
	const json = (await res.json()) as { data: T };
	return json.data;
}
