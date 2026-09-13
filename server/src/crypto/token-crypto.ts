import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export function encryptToken(plain: string, hexKey: string) {
	const key = Buffer.from(hexKey, "hex");
	if (key.length !== 32) {
		throw new Error("ENCRYPTION_KEY must be 64 hex characters");
	}
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptToken(payload: string, hexKey: string) {
	const key = Buffer.from(hexKey, "hex");
	const buf = Buffer.from(payload, "base64");
	const iv = buf.subarray(0, 12);
	const tag = buf.subarray(12, 28);
	const encrypted = buf.subarray(28);
	const decipher = createDecipheriv("aes-256-gcm", key, iv);
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
