const core = require("@actions/core");
const toolCache = require("@actions/tool-cache");
const path = require("path");
const axios = require("axios");
const { execSync } = require('child_process');

async function installDockerCompose() {
  try {
    const commands = `
      sudo apt-get update &&
      sudo apt-get install -y ca-certificates curl &&
      sudo install -m 0755 -d /etc/apt/keyrings &&
      sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc &&
      sudo chmod a+r /etc/apt/keyrings/docker.asc &&
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "\${UBUNTU_CODENAME:-\$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null &&
      sudo apt-get update &&
      sudo apt-get install -y docker-compose-plugin &&
      docker compose --version
      `;
    
    execSync(commands, { stdio: 'inherit' });
    return true;
  } catch (error) {
    throw new Error(`Failed to install Docker Compose: ${error.message}`);
  }
}

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
    fileType: "zip",
    postInstall: async () => {
      core.info('Installing Docker Compose for builder-playground...');
      await installDockerCompose();
    }
  },
  "reth": {
    org: "paradigmxyz",
    binaryName: "reth",
    getAssetName: (version) => `reth-${version}-x86_64-unknown-linux-gnu.tar.gz`,
    fileType: "tar"
  },
  "op-reth": {
    org: "paradigmxyz",
    repo: "reth",
    binaryName: "op-reth",
    getAssetName: (version) => `op-reth-${version}-x86_64-unknown-linux-gnu.tar.gz`,
    fileType: "tar"
  }
};

async function main() {
  for (const nameKey of Object.keys(RELEASE_CONFIGS)) {
    const version = core.getInput(nameKey);
    try {
      await downloadRelease(nameKey, version);
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

async function downloadRelease(nameKey, version) {
  if (!version) {
    return;
  }

  const config = RELEASE_CONFIGS[nameKey];
  if (!config) {
    throw new Error(`No configuration found for ${nameKey}`);
  }

  let repoKey = config.repo || nameKey;
  try {
    const resolvedVersion = version === "latest" 
      ? await getLatestVersion(config.org, repoKey)
      : version;

    const assetName = config.getAssetName(resolvedVersion);
    const url = `https://github.com/${config.org}/${repoKey}/releases/download/${resolvedVersion}/${assetName}`;
    
    core.info(`Downloading ${nameKey} from: ${url}`);
    const pathToCLI = await downloadAndExtractTool(url, config.fileType);
    core.addPath(path.join(pathToCLI, "."));
    
    core.info(`Successfully installed ${nameKey} version ${resolvedVersion}`);

    if (config.postInstall) {
      await config.postInstall();
    }
  } catch (error) {
    throw new Error(`Failed to download ${nameKey}: ${error.message}`);
  }
}

module.exports = main;

if (require.main === module) {
  main();
}
