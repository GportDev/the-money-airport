import { expect, test } from "@playwright/test";

test("health returns 200 when postgres is up", async ({ request }) => {
	const response = await request.get("http://localhost:3000/api/health");
	expect(response.status()).toBe(200);
	expect(await response.json()).toEqual({ data: { ok: true } });
});
