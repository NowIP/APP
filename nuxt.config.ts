// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	devtools: { enabled: true },
	modules: ['@nuxt/ui'],

	ssr: true,

	css: [
		'~/assets/css/main.css',
	],

	serverHandlers: process.env.NODE_ENV === 'development' && process.env.USE_DEV_PROXY === 'true' ? [
		{
			route: '/api/proxy/**',
			handler: './dev/proxy.ts'
		}
	] : [],

	nitro: {
		preset: 'bun'
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