import tailwind from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import sitemap from "@astrojs/sitemap"

// https://astro.build/config
export default defineConfig({
    site: "https://cr.yuramedia.com",
    base: "/",
    trailingSlash: "never",
    output: "static",
    build: {
        format: "directory"
    },
    integrations: [sitemap()],
    vite: {
        plugins: [tailwind()]
    }
})
