const rawBuildSha = process.env.NEXT_PUBLIC_BUILD_SHA?.trim() ?? "";

export const BUILD_SHA = rawBuildSha || "development";
export const BUILD_LABEL = BUILD_SHA === "development" ? "DEV" : BUILD_SHA.slice(0, 7);
