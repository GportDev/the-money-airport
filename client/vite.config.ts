import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
	envDir: path.resolve(fileURLToPath(new URL(".", import.meta.url)), ".."),
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: [
			{
				find: "@",
				replacement: srcDir,
			},
		],
	},
	server: {
		port: 5173,
		strictPort: true,
	},
});
