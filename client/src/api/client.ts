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

const FILENAME = /filename="([^"]+)"/;
const REVOKE_DELAY_MS = 10_000;

/** Fetches a file from the API and hands it to the browser as a download. */
export async function downloadFile(path: string, fallbackName: string) {
	const res = await fetch(`${apiUrl}${path}`, { credentials: "include" });
	if (!res.ok) {
		throw new Error("Download failed");
	}
	const name = FILENAME.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? fallbackName;
	const url = URL.createObjectURL(await res.blob());
	const link = document.createElement("a");
	link.href = url;
	link.download = name;
	link.click();
	// Revoking right away can cancel the download before the browser has read the blob.
	window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
