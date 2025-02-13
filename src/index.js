const core = require("@actions/core");
const toolCache = require("@actions/tool-cache");
const path = require("path");
const axios = require("axios");

let repos = {
  "suave-geth": tryDownloadGoReleaser,
  "builder-playground": tryDownloadGoReleaser,
};

async function main() {
  for (let [repo, downloadFn] of Object.entries(repos)) {
    let version = core.getInput(repo);
    try {
      await downloadFn(repo, version);
    } catch (error) {
      core.setFailed(`Failed to download ${repo}: ${error}`);
    }
  }
}

async function tryDownloadGoReleaser(repo, version) {
  if (version == "") {
    return
  } else if (version == "latest") {
    core.info(`Fetching latest release for ${repo}`);
    const response = await axios.get(`https://api.github.com/repos/flashbots/${repo}/releases/latest`);
    version = response.data.tag_name;
  }

  const url = `https://github.com/flashbots/${repo}/releases/download/${version}/${repo}_${version}_linux_amd64.zip`;

  core.info(`Downloading ${repo} from: ${url}`);
  const pathToArchive = await toolCache.downloadTool(url);

  // Extract the archive onto host runner
  core.debug(`Extracting ${pathToArchive}`);
  const extract = url.endsWith(".zip") ? toolCache.extractZip : toolCache.extractTar;
  const pathToCLI = await extract(pathToArchive);

  // Expose the tool
  core.addPath(path.join(pathToCLI, "."));
}

module.exports = main;

if (require.main === module) {
  main();
}
