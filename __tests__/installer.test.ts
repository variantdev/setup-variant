import io = require('@actions/io');
import fs = require('fs');
import os = require('os');
import path = require('path');
import nock = require('nock');

const toolDir = path.join(__dirname, 'runner', 'tools');
const tempDir = path.join(__dirname, 'runner', 'temp');
const dataDir = path.join(__dirname, 'data');

process.env['RUNNER_TOOL_CACHE'] = toolDir;
process.env['RUNNER_TEMP'] = tempDir;
import * as installer from '../src/installer';

const IS_WINDOWS = process.platform === 'win32';

describe('installer tests', () => {
  beforeAll(async () => {
    await io.rmRF(toolDir);
    await io.rmRF(tempDir);
  }, 100000);

  afterAll(async () => {
    try {
      await io.rmRF(toolDir);
      await io.rmRF(tempDir);
    } catch {
      console.log('Failed to remove test directories');
    }
  }, 100000);

  it('Acquires version of variant if no matching version is installed', async () => {
    await installer.getVariant('0.35.1');
    const variantDir = path.join(toolDir, 'variant', '0.35.1', os.arch());
    const binDir = path.join(variantDir);

    expect(fs.existsSync(`${variantDir}.complete`)).toBe(true);
    if (IS_WINDOWS) {
      expect(fs.existsSync(path.join(binDir, 'variant.exe'))).toBe(true);
    } else {
      expect(fs.existsSync(path.join(binDir, 'variant'))).toBe(true);
    }
  }, 100000);

  describe('the latest release of a variant version', () => {
    beforeEach(() => {
      nock('https://api.github.com')
        .get('/repos/mumoshu/variant/releases')
        .replyWithFile(200, path.join(dataDir, 'variant-release-dl.json'));
    });

    afterEach(() => {
      nock.cleanAll();
      nock.enableNetConnect();
    });

    it('Acquires latest release version of variant 0.35 if using 0.35 and no matching version is installed', async () => {
      await installer.getVariant('0.35');
      const variantDir = path.join(toolDir, 'variant', '0.35.1', os.arch());
      const binDir = path.join(variantDir);

      expect(fs.existsSync(`${variantDir}.complete`)).toBe(true);
      if (IS_WINDOWS) {
        expect(fs.existsSync(path.join(binDir, 'variant.exe'))).toBe(true);
      } else {
        expect(fs.existsSync(path.join(binDir, 'variant'))).toBe(true);
      }
    }, 100000);

    it('Acquires latest release version of go 0.35 if using 0.35.x and no matching version is installed', async () => {
      await installer.getVariant('0.35.x');
      const variantDir = path.join(toolDir, 'variant', '0.35.1', os.arch());
      const binDir = path.join(variantDir);

      expect(fs.existsSync(`${variantDir}.complete`)).toBe(true);
      if (IS_WINDOWS) {
        expect(fs.existsSync(path.join(binDir, 'variant.exe'))).toBe(true);
      } else {
        expect(fs.existsSync(path.join(binDir, 'variant'))).toBe(true);
      }
    }, 100000);

    it('Acquires latest release version of variant if using 0.x and no matching version is installed', async () => {
      await installer.getVariant('0.x');
      const variantDir = path.join(toolDir, 'variant', '0.35.1', os.arch());
      const binDir = path.join(variantDir);

      expect(fs.existsSync(`${variantDir}.complete`)).toBe(true);
      if (IS_WINDOWS) {
        expect(fs.existsSync(path.join(binDir, 'variant.exe'))).toBe(true);
      } else {
        expect(fs.existsSync(path.join(binDir, 'variant'))).toBe(true);
      }
    }, 100000);
  });

  it('Throws if no location contains correct variant version', async () => {
    let thrown = false;
    try {
      await installer.getVariant('1000.0');
    } catch {
      thrown = true;
    }
    expect(thrown).toBe(true);
  });

  it('Uses version of variant installed in cache', async () => {
    const variantDir: string = path.join(
      toolDir,
      'variant',
      '250.0.0',
      os.arch()
    );
    await io.mkdirP(variantDir);
    fs.writeFileSync(`${variantDir}.complete`, 'hello');
    // This will throw if it doesn't find it in the cache (because no such version exists)
    await installer.getVariant('250.0');
    return;
  });

  it('Doesnt use version of variant that was only partially installed in cache', async () => {
    const variantDir: string = path.join(
      toolDir,
      'variant',
      '251.0.0',
      os.arch()
    );
    await io.mkdirP(variantDir);
    let thrown = false;
    try {
      // This will throw if it doesn't find it in the cache (because no such version exists)
      await installer.getVariant('251.0');
    } catch {
      thrown = true;
    }
    expect(thrown).toBe(true);
    return;
  });
});
