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
			apiUrl: process.env.NOWAPI_API_URL || 'http://localhost:3003',
		}
	},

	vite: {
		server: {
			allowedHosts: [
				"nowip-app-test.tun.is-on.net"
			]

		}
	}
});