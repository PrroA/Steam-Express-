import fs from 'fs';
import path from 'path';

const scanTargets = [
  'README.md',
  'README.INTERVIEW.md',
  'server.ts',
  'docs',
  'pages',
  'components',
  'hooks',
  'utils',
  'services',
  'backend',
  'e2e',
  '__tests__',
];

const sourceFilePattern = /\.(tsx?|jsx?|md)$/;
const mojibakePattern = /[\uFFFD\u0080-\u009F\uF000-\uF8FF]/u;

function collectFiles(target: string): string[] {
  const absoluteTarget = path.join(process.cwd(), target);
  if (!fs.existsSync(absoluteTarget)) return [];

  const stat = fs.statSync(absoluteTarget);
  if (stat.isFile()) {
    return sourceFilePattern.test(absoluteTarget) ? [absoluteTarget] : [];
  }

  return fs.readdirSync(absoluteTarget, { withFileTypes: true }).flatMap((entry) => {
    const nextTarget = path.join(target, entry.name);
    if (entry.isDirectory()) return collectFiles(nextTarget);
    return sourceFilePattern.test(entry.name) ? [path.join(process.cwd(), nextTarget)] : [];
  });
}

describe('text encoding guard', () => {
  test('source and docs do not contain common mojibake characters', () => {
    const findings = scanTargets
      .flatMap(collectFiles)
      .flatMap((file) =>
        fs
          .readFileSync(file, 'utf8')
          .split(/\r?\n/)
          .flatMap((line, index) =>
            mojibakePattern.test(line)
              ? [`${path.relative(process.cwd(), file)}:${index + 1}: ${line.trim()}`]
              : []
          )
      );

    expect(findings).toEqual([]);
  });
});
