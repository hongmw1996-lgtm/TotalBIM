import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "#lodash": "lodash-es"
    }
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "#lodash": "lodash-es"
    };

    return config;
  }
};

export default nextConfig;
