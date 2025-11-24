// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	devtools: { enabled: true },
	modules: ['@nuxt/ui'],

	ssr: true,

	css: [
		'~/assets/css/main.css',
	],

	nitro: {
		preset: 'bun'
	},

	runtimeConfig: {
		pocketbaseApiKey: process.env.POCKETBASE_API_KEY,
		public: {
			pocketbaseUrl: process.env.POCKETBASE_URL || 'http://127.0.0.1:8090'
		}
	}

});