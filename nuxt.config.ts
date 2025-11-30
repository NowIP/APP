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
		preset: 'bun',

		devProxy: process.env.USE_DEV_PROXY === "true" ? {
			"/api/proxy": {
				target: process.env.DEV_PROXY_TARGET || "https://api.nowip.is-on.net",
				changeOrigin: true
			}
		} : {}
	},

	runtimeConfig: {
		public: {
			apiUrl: process.env.NOWIP_API_URL || 'http://localhost:3003',
			isSignupEnabled: process.env.NOWIP_APP_ENABLE_SIGNUP === 'true' ? true : false,
			baseDNSDomain: process.env.NOWIP_DNS_DOMAIN || 'dyn.is-on.net'
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