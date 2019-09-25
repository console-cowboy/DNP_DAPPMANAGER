import fs from "fs";
import path from "path";
import params from "../params";

/*
 * Generates file paths given a set of parameters. This tool helps
 * reduce the possiblity of fileNotFound errors acting as a unique
 * source of truth for locating files.
 *
 * It returns paths for this files
 * - packageRepoDir
 * - manifest
 * - dockerCompose
 * - envFile
 * - image
 *
 * Core DNPs and regular DNPs are located in different folders.
 * That's why there is an isCore flag. Also the "Smart" functions
 * try to guess if the requested package is a core or not.
 */

// Define paths

export function packageRepoDir(dnpName: string, isCore: boolean): string {
  return getRepoDirPath(dnpName, isCore);
}

export function manifest(dnpName: string, isCore: boolean): string {
  return path.join(
    getRepoDirPath(dnpName, isCore),
    getManifestName(dnpName, isCore)
  );
}

export function dockerCompose(dnpName: string, isCore: boolean): string {
  return getDockerComposePath(dnpName, isCore);
}

export function dockerComposeSmart(dnpName: string): string {
  // First check for core docker-compose
  const DOCKERCOMPOSE_PATH = getDockerComposePath(dnpName, true);
  if (fs.existsSync(DOCKERCOMPOSE_PATH)) return DOCKERCOMPOSE_PATH;
  // Then check for dnp docker-compose
  return getDockerComposePath(dnpName, false);
}

export function envFile(dnpName: string, isCore: boolean): string {
  return getEnvFilePath(dnpName, isCore);
}

export function envFileSmart(dnpName: string, isCore: boolean): string {
  if (isCore) return getEnvFilePath(dnpName, true);
  // First check for core docker-compose
  const ENV_FILE_PATH = getEnvFilePath(dnpName, true);
  if (fs.existsSync(ENV_FILE_PATH)) return ENV_FILE_PATH;
  // Then check for dnp docker-compose
  return getEnvFilePath(dnpName, false);
}

export function image(
  dnpName: string,
  imageName: string,
  isCore: boolean
): string {
  if (!imageName) throw Error("imageName must be defined");
  return path.join(getRepoDirPath(dnpName, isCore), imageName);
}

// Helper functions

function getDockerComposePath(dnpName: string, isCore: boolean): string {
  return path.join(
    getRepoDirPath(dnpName, isCore),
    getDockerComposeName(dnpName, isCore)
  );
}

function getEnvFilePath(dnpName: string, isCore: boolean): string {
  return path.join(getRepoDirPath(dnpName, isCore), `${dnpName}.env`);
}

function getRepoDirPath(dnpName: string, isCore: boolean): string {
  if (isCore) return params.DNCORE_DIR;
  return path.join(params.REPO_DIR, dnpName);
}

function getDockerComposeName(dnpName: string, isCore: boolean): string {
  if (isCore) {
    verifyDnpName(dnpName);
    const dnpShortName = (dnpName || "").split(".")[0];
    return `docker-compose-${dnpShortName}.yml`;
  } else {
    return "docker-compose.yml";
  }
}

function getManifestName(dnpName: string, isCore: boolean): string {
  if (isCore) {
    verifyDnpName(dnpName);
    const dnpShortName = (dnpName || "").split(".")[0];
    return `dappnode_package-${dnpShortName}.json`;
  } else {
    return "dappnode_package.json";
  }
}

// Utils

function verifyDnpName(dnpName: string): void {
  if (typeof dnpName !== "string")
    throw Error(
      `dnpName must be a string, but it's ${typeof dnpName}: ${JSON.stringify(
        dnpName
      )}`
    );
}