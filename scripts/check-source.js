import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  });
}

const files = [...filesIn('src'), ...filesIn('scripts'), ...filesIn('tests'), 'vite.config.js', 'playwright.config.js'];
let failed = false;
for (const file of files.filter((path) => path.endsWith('.js'))) {
  const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (check.status !== 0) {
    process.stderr.write(check.stderr);
    failed = true;
  }
  const spelling = file === 'scripts/check-source.js' ? null : readFileSync(file, 'utf8').match(/\b(colour|colours|centre|centred|behaviour|neighbour|grey|catalogue|dialogue|defence|licence|analyse|initialise|normalise|summarise|organise|optimise|customise)\b/gi);
  if (spelling) {
    console.error(`${file}: use American English: ${spelling.join(', ')}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log(`Checked JavaScript syntax and American English in ${files.length} source files.`);
