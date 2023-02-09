const nextConfig = {
	reactStrictMode: true,
	env: {
		HOST: process.env.HOST,
		PORT: process.env.PORT,
		NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_API_KEY: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_API_KEY
	},
	eslint: {
		// Warning: This allows production builds to successfully complete even if
		// your project has ESLint errors.
		ignoreDuringBuilds: true
	}
}

module.exports = nextConfig
