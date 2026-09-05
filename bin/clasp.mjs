#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  listLoggedInProfiles,
  resolveProfile,
  writeProfile
} from '../lib/profile.mjs';

const args = process.argv.slice(2);
const [command, ...commandArgs] = args;

if (command === 'switch') {
  const localScope = commandArgs.includes('--local');
  const globalScope = commandArgs.includes('--global');
  const values = commandArgs.filter(
    value =>
      !['--local', '--global'].includes(value)
  );
  const name = values[0];

  if (
    !name ||
    values.length > 1 ||
    (localScope && globalScope)
  ) {
    console.error(
      'Usage: clasp switch <name> ' +
      '[--local|--global]'
    );
    process.exit(1);
  }

  try {
    const loggedIn = listLoggedInProfiles();

    if (!loggedIn.includes(name)) {
      console.error(
        `Warning: '${name}' is not logged in yet. ` +
        `Run: clasp login --user ${name}`
      );
    }

    const filePath = writeProfile(name, {
      local: localScope
    });
    const scope = localScope
      ? 'project'
      : 'global';

    console.log(
      `Switched clasp profile to '${name}' ` +
      `(${scope})`
    );
    console.log(filePath);
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (command === 'profiles') {
  const loggedIn = listLoggedInProfiles();
  const active = resolveProfile();

  if (loggedIn.length === 0) {
    console.log(
      'No logged-in profiles found. ' +
      'Run: clasp login --user <name>'
    );
    process.exit(0);
  }

  for (const name of loggedIn) {
    const marker =
      active?.name === name ? '*' : ' ';
    console.log(`${marker} ${name}`);
  }

  console.log('');
  console.log(
    active
      ? `Active: ${active.name} (${active.source})`
      : 'Active: (not configured)'
  );
  process.exit(0);
}

if (command === 'whoami') {
  const profile = resolveProfile();

  if (!profile) {
    console.error(
      'clasp profile is not configured.'
    );
    process.exit(1);
  }

  console.log(
    `${profile.name} (${profile.source})`
  );
  process.exit(0);
}

const hasExplicitUser = args.some(
  value =>
    value === '--user' ||
    value === '-u' ||
    value.startsWith('--user=')
);

const hasAlternativeAuth = args.some(
  value =>
    value === '--adc' ||
    value === '--auth' ||
    value.startsWith('--auth=')
);

const isInformational =
  args.length === 0 ||
  args.some(value =>
    ['--help', '-h', '--version', '-v']
      .includes(value)
  );

let forwardedArgs = args;

if (
  !hasExplicitUser &&
  !hasAlternativeAuth &&
  !isInformational
) {
  const profile = resolveProfile();

  if (!profile) {
    console.error(
      'clasp profile is not configured. ' +
      'Run: clasp switch <name>'
    );
    process.exit(1);
  }

  forwardedArgs = [
    '--user',
    profile.name,
    ...args
  ];
}

let claspEntry;

try {
  claspEntry = fileURLToPath(
    import.meta.resolve('@google/clasp')
  );
} catch {
  console.error(
    'Bundled @google/clasp could not be resolved.'
  );
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [claspEntry, ...forwardedArgs],
  {
    stdio: 'inherit',
    env: process.env
  }
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
