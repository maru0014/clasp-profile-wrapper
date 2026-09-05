import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const PROJECT_PROFILE_FILE = '.clasp-user';
const PROFILE_PATTERN = /^[a-zA-Z0-9._-]+$/;

function readValue(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch (error) {
    if (error?.code === 'ENOENT') return '';
    throw error;
  }
}

export function getGlobalProfileFile() {
  const baseDir =
    process.platform === 'win32'
      ? process.env.APPDATA ||
        path.join(os.homedir(), 'AppData', 'Roaming')
      : process.env.XDG_CONFIG_HOME ||
        path.join(os.homedir(), '.config');

  return path.join(
    baseDir,
    'clasp-profile-wrapper',
    'active-user'
  );
}

export function resolveProfile(cwd = process.cwd()) {
  const environment =
    process.env.CLASP_ACTIVE_PROFILE?.trim();

  if (environment) {
    return {
      name: environment,
      source: 'environment'
    };
  }

  const projectFile = path.join(
    cwd,
    PROJECT_PROFILE_FILE
  );
  const project = readValue(projectFile);

  if (project) {
    return {
      name: project,
      source: 'project',
      file: projectFile
    };
  }

  const globalFile = getGlobalProfileFile();
  const global = readValue(globalFile);

  if (global) {
    return {
      name: global,
      source: 'global',
      file: globalFile
    };
  }

  return null;
}

export function writeProfile(
  name,
  {
    local = false,
    cwd = process.cwd()
  } = {}
) {
  if (!PROFILE_PATTERN.test(name)) {
    throw new Error(
      `Invalid profile name: ${name}`
    );
  }

  const filePath = local
    ? path.join(cwd, PROJECT_PROFILE_FILE)
    : getGlobalProfileFile();

  fs.mkdirSync(path.dirname(filePath), {
    recursive: true
  });

  fs.writeFileSync(filePath, `${name}\n`, {
    encoding: 'utf8',
    mode: 0o600
  });

  return filePath;
}
