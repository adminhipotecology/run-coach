import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "langchain",
    "@langchain/core",
    "@langchain/anthropic",
    "@langchain/langgraph",
  ],
};

export default nextConfig;
