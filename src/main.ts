#!/usr/bin/env node
import { Command } from 'commander';
import spawn from 'cross-spawn';
import * as fs from 'node:fs';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { ReadableStream } from 'node:stream/web';
import path from 'path';
import yauzl from 'yauzl';

import config from '@src/config.json';

const templateUrl = config.templateUrl;
const templateZippedPath = config.pathToRemove;

const program = new Command();

program.requiredOption('-n, --name <string>', 'The name of the project');
program.requiredOption(
  '-tu, --template-url <string>',
  'The URL of the zipped project to download',
);
program.option('-pu, --project-url <string>', 'The repository of the template');
program.option(
  '-par, --path-to-remove <string>',
  'The path to exclude from zip extraction',
);

program.parse();

const options = program.opts();
const projectName = options.name;
const templateUrlToDownload = options.templateUrl;
const projectUrl = options.projectUrl;
const pathToRemove = options.pathToRemove;

const currentDir = process.cwd();
const projectDir = path.resolve(currentDir, projectName);
const zipPath = path.join(projectDir, 'template.zip');
const packageJsonPath = path.join(projectDir, 'package.json');
const configFilePath = path.join(projectDir, 'src/config.json');

function getDownloadedFilePath(fileName: string): string {
  return fileName.replace(templateZippedPath, '');
}

(async () => {
  fs.mkdirSync(projectDir);

  const stream = fs.createWriteStream(zipPath);
  const { body } = await fetch(templateUrl);
  await finished(Readable.fromWeb(body as ReadableStream).pipe(stream));

  const unzipDir = projectDir;

  await new Promise((resolve) => {
    yauzl.open(
      zipPath,
      { lazyEntries: true, decodeStrings: true, autoClose: true },
      (err, zipfile) => {
        if (err) {
          console.log('Zip file failed to open');
          throw err;
        }

        zipfile.readEntry();

        zipfile.on('end', () => {
          resolve(null);
        });

        zipfile.on('entry', function (entry) {
          if (/\/$/.test(entry.fileName)) {
            const dir = path.join(
              unzipDir,
              getDownloadedFilePath(entry.fileName),
            );
            console.log('Creating directory:', dir);
            fs.mkdirSync(dir, {
              recursive: true,
            });
            zipfile.readEntry();
          } else {
            zipfile.openReadStream(entry, function (streamErr, readStream) {
              if (streamErr) {
                console.log('Zip file stream error');
                throw streamErr;
              }
              readStream.on('end', function () {
                zipfile.readEntry();
              });

              const filePath = path.join(
                unzipDir,
                getDownloadedFilePath(entry.fileName),
              );

              console.log('Creating file:', filePath);

              const writeStream = fs.createWriteStream(filePath);

              readStream.pipe(writeStream);
            });
          }
        });
      },
    );
  });

  fs.rmSync(zipPath);

  const packageJson = require(packageJsonPath);
  const configFile = require(configFilePath);

  const newPackageJson = { ...packageJson };
  const newConfigFile = { ...configFile };

  newPackageJson.name = projectName;
  newPackageJson.bin = {
    [projectName]: './main.js',
  };

  if (projectUrl) {
    newPackageJson.repository = {
      url: projectUrl,
    };
  }

  newConfigFile.templateUrl = templateUrlToDownload;
  newConfigFile.pathToRemove = pathToRemove || '';

  fs.writeFileSync(packageJsonPath, JSON.stringify(newPackageJson, null, 2));
  fs.writeFileSync(configFilePath, JSON.stringify(newConfigFile, null, 2));

  spawn.sync('npm', ['install'], { stdio: 'inherit', cwd: projectDir });
  spawn.sync('git', ['init'], { stdio: 'inherit', cwd: projectDir });

  spawn.sync('npm', ['run', 'prettier']);
  spawn.sync('git', ['add', '.'], { stdio: 'inherit', cwd: projectDir });
  spawn.sync('git', ['commit', '-m', '"Initial commit"'], {
    stdio: 'inherit',
    cwd: projectDir,
  });

  console.log(`Project created in ${projectDir}`);
})().then(() => {
  process.exit(0);
});
