/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "images.pexels.com" },
			{ protocol: "https", hostname: "cdn.pixabay.com" },
			{ protocol: "https", hostname: "pixabay.com" },
			{ protocol: "https", hostname: "picsum.photos" },
			{ protocol: "https", hostname: "huggingface.co" },
		],
	},
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{ key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
					{ key: "Cross-Origin-Opener-Policy", value: "same-origin" },
				],
			},
		];
	},
};

export default nextConfig;
