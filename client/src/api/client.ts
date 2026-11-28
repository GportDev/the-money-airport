export const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

/** A failed request; `apiMessage` is the server's own message, when it sent one. */
export class ApiError extends Error {
	readonly status: number;
	readonly apiMessage: string | null;

	constructor(status: number, apiMessage: string | null) {
		super("Request failed");
		this.status = status;
		this.apiMessage = apiMessage;
	}
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`${apiUrl}${path}`, {
		credentials: "include",
		headers: { "Content-Type": "application/json", ...options?.headers },
		...options,
	});
	if (!res.ok) {
		throw new ApiError(res.status, await serverMessage(res));
	}
	const json = (await res.json()) as { data: T };
	return json.data;
}

async function serverMessage(res: Response) {
	try {
		const body = (await res.json()) as { message?: unknown };
		return typeof body.message === "string" ? body.message : null;
	} catch (_error) {
		return null;
	}
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
