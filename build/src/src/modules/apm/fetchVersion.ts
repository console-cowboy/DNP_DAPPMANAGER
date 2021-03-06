import { ethers } from "ethers";
import { ApmRepoVersionReturn, ApmVersionRaw } from "./types";
import * as repoContract from "../../contracts/repository";
import { parseApmVersionReturn, toApmVersionArray } from "./apmUtils";
import semver from "semver";

/**
 * Fetch a specific version of an APM repo
 * @param name "bitcoin.dnp.dappnode.eth"
 * @param version "0.2.4"
 */
export async function fetchVersion(
  provider: ethers.providers.Provider,
  name: string,
  version?: string
): Promise<ApmVersionRaw> {
  const repo = new ethers.Contract(name, repoContract.abi, provider);

  const res: ApmRepoVersionReturn =
    version && semver.valid(version)
      ? await repo.getBySemanticVersion(toApmVersionArray(version))
      : await repo.getLatest();
  return parseApmVersionReturn(res);
}
