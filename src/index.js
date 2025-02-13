const core = require("@actions/core");
const toolCache = require("@actions/tool-cache");
const path = require("path");
const axios = require("axios");

// Configuration for different releases
const RELEASE_CONFIGS = {
  "suave-geth": {
    org: "flashbots",
    binaryName: "suave-geth",
    getAssetName: (version) => `suave-geth_${version}_linux_amd64.zip`,
    fileType: "zip"
  },
  "builder-playground": {
    org: "flashbots",
    binaryName: "builder-playground",
    getAssetName: (version) => `builder-playground_${version}_linux_amd64.zip`,
    fileType: "zip"
  },
  "reth": {
    org: "paradigmxyz",
    binaryName: "reth",
    getAssetName: (version) => `reth-${version}-x86_64-unknown-linux-gnu.tar.gz`,
    fileType: "tar"
  },
  "op-reth": {
    org: "paradigmxyz",
    binaryName: "op-reth",
    getAssetName: (version) => `op-reth-${version}-x86_64-unknown-linux-gnu.tar.gz`,
    fileType: "tar"
  }
};

async function main() {
  for (const repoKey of Object.keys(RELEASE_CONFIGS)) {
    const version = core.getInput(repoKey);
    try {
      await downloadRelease(repoKey, version);
    } catch (error) {
      core.setFailed(error.message);
    }
  }
}

async function getLatestVersion(org, repo) {
  core.info(`Fetching latest release for ${repo}`);
  const response = await axios.get(`https://api.github.com/repos/${org}/${repo}/releases/latest`);
  return response.data.tag_name;
}

async function downloadAndExtractTool(url, fileType) {
  core.info(`Downloading from: ${url}`);
  const pathToArchive = await toolCache.downloadTool(url);
  
  core.debug(`Extracting ${pathToArchive}`);
  const extract = fileType === "zip" ? toolCache.extractZip : toolCache.extractTar;
  return await extract(pathToArchive);
}

async function downloadRelease(repoKey, version) {
  if (!version) {
    return;
  }

  const config = RELEASE_CONFIGS[repoKey];
  if (!config) {
    throw new Error(`No configuration found for ${repoKey}`);
  }

  try {
    const resolvedVersion = version === "latest" 
      ? await getLatestVersion(config.org, repoKey)
      : version;

    const assetName = config.getAssetName(resolvedVersion);
    const url = `https://github.com/${config.org}/${repoKey}/releases/download/${resolvedVersion}/${assetName}`;
    
    core.info(`Downloading ${repoKey} from: ${url}`);
    const pathToCLI = await downloadAndExtractTool(url, config.fileType);
    core.addPath(path.join(pathToCLI, "."));
    
    core.info(`Successfully installed ${repoKey} version ${resolvedVersion}`);
  } catch (error) {
    throw new Error(`Failed to download ${repoKey}: ${error.message}`);
  }
}

module.exports = main;

if (require.main === module) {
  main();
}
