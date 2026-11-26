import { prepareSanitizedStagingArtifacts } from "../tests/browser/staging-artifact-safety.mjs";

const inputDir = process.env.STAGING_ARTIFACT_INPUT_DIR ?? "tests/browser/test-results/staging-browser";
const outputDir = process.env.STAGING_ARTIFACT_OUTPUT_DIR ?? ".wrangler/staging-safe-artifacts";
const secrets = [process.env.STAGING_ROOM_TOKEN].filter(Boolean);

prepareSanitizedStagingArtifacts({ inputDir, outputDir, secrets })
  .then((files) => {
    console.log(JSON.stringify({ phase: "staging_artifact_prepare", ok: true, fileCount: files.length, files }));
  })
  .catch(() => {
    console.error("staging artifact preparation failed closed");
    process.exitCode = 1;
  });
