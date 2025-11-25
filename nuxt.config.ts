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
		public: {
			pocketbaseUrl: process.env.NOWAPI_API_URL || 'http://localhost:3003',
		}
	}

});