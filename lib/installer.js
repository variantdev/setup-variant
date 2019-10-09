"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load tempDirectory before it gets wiped by tool-cache
let tempDirectory = process.env['RUNNER_TEMPDIRECTORY'] || '';
const core = __importStar(require("@actions/core"));
const tc = __importStar(require("@actions/tool-cache"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const util = __importStar(require("util"));
const semver = __importStar(require("semver"));
const restm = __importStar(require("typed-rest-client/RestClient"));
let osPlat = os.platform();
let osArch = os.arch();
let ownerRepo = 'mumoshu/variant';
let toolName = 'variant';
if (!tempDirectory) {
    let baseLocation;
    if (process.platform === 'win32') {
        // On windows use the USERPROFILE env variable
        baseLocation = process.env['USERPROFILE'] || 'C:\\';
    }
    else {
        if (process.platform === 'darwin') {
            baseLocation = '/Users';
        }
        else {
            baseLocation = '/home';
        }
    }
    tempDirectory = path.join(baseLocation, 'actions', 'temp');
}
function getVariant(version) {
    return __awaiter(this, void 0, void 0, function* () {
        const selected = yield determineVersion(version);
        if (selected) {
            version = selected;
        }
        // check cache
        let toolPath;
        toolPath = tc.find(toolName, normalizeVersion(version));
        if (!toolPath) {
            // download, extract, cache
            toolPath = yield acquireVariant(version);
            core.debug('Variant tool is cached under ' + toolPath);
        }
        // In case the executable resides in ./bin
        // toolPath = path.join(toolPath, 'bin');
        //
        // prepend the tools path. instructs the agent to prepend for future tasks
        //
        core.addPath(toolPath);
    });
}
exports.getVariant = getVariant;
function acquireVariant(version) {
    return __awaiter(this, void 0, void 0, function* () {
        //
        // Download - a tool installer intimately knows how to get the tool (and construct urls)
        //
        let fileName = getFileName(version);
        let downloadUrl = getDownloadUrl(fileName);
        let downloadPath = null;
        try {
            downloadPath = yield tc.downloadTool(downloadUrl);
        }
        catch (error) {
            core.debug(error);
            throw `Failed to download version ${version}: ${error}`;
        }
        //
        // Extract
        //
        let extPath = tempDirectory;
        if (!extPath) {
            throw new Error('Temp directory not set');
        }
        if (osPlat == 'win32') {
            extPath = yield tc.extractZip(downloadPath);
        }
        else {
            extPath = yield tc.extractTar(downloadPath);
        }
        //
        // Install into the local tool cache - node extracts with a root folder that matches the fileName downloaded
        //
        const toolRoot = path.join(extPath);
        version = normalizeVersion(version);
        return yield tc.cacheDir(toolRoot, toolName, version);
    });
}
function getFileName(version) {
    const platform = osPlat == 'win32' ? 'windows' : osPlat;
    const arch = osArch == 'x64' ? 'amd64' : '386';
    const ext = osPlat == 'win32' ? 'zip' : 'tar.gz';
    const filename = util.format('download/v%s/variant_%s_%s_%s.%s', version, version, platform, arch, ext);
    return filename;
}
function getDownloadUrl(filename) {
    return util.format('https://github.com/%s/releases/%s', ownerRepo, filename);
}
// This function is required to convert the version 1.10 to 1.10.0.
// Because caching utility accept only sementic version,
// which have patch number as well.
function normalizeVersion(version) {
    const versionPart = version.split('.');
    if (versionPart[1] == null) {
        //append minor and patch version if not available
        return version.concat('.0.0');
    }
    else {
        // handle beta and rc: 1.10beta1 => 1.10.0-beta1, 1.10rc1 => 1.10.0-rc1
        if (versionPart[1].includes('beta') || versionPart[1].includes('rc')) {
            versionPart[1] = versionPart[1]
                .replace('beta', '.0-beta')
                .replace('rc', '.0-rc');
            return versionPart.join('.');
        }
    }
    if (versionPart[2] == null) {
        //append patch version if not available
        return version.concat('.0');
    }
    else {
        // handle beta and rc: 1.8.5beta1 => 1.8.5-beta1, 1.8.5rc1 => 1.8.5-rc1
        if (versionPart[2].includes('beta') || versionPart[2].includes('rc')) {
            versionPart[2] = versionPart[2]
                .replace('beta', '-beta')
                .replace('rc', '-rc');
            return versionPart.join('.');
        }
    }
    return version;
}
function determineVersion(version) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!version.endsWith('.x')) {
            const versionPart = version.split('.');
            if (versionPart[1] == null || versionPart[2] == null) {
                return yield getLatestVersion(version.concat('.x'));
            }
            else {
                return version;
            }
        }
        return yield getLatestVersion(version);
    });
}
function getLatestVersion(version) {
    return __awaiter(this, void 0, void 0, function* () {
        // clean .x syntax: 1.10.x -> 1.10
        const trimmedVersion = version.slice(0, version.length - 2);
        const versions = yield getPossibleVersions(trimmedVersion);
        core.debug(`evaluating ${versions.length} versions`);
        if (version.length === 0) {
            throw new Error('unable to get latest version');
        }
        core.debug(`matched: ${versions[0]}`);
        return versions[0];
    });
}
function getAvailableVersions() {
    return __awaiter(this, void 0, void 0, function* () {
        let rest = new restm.RestClient(util.format('setup-%s', toolName));
        let tags = (yield rest.get(util.format('https://api.github.com/repos/%s/releases', ownerRepo))).result || [];
        return tags.map(tag => tag.tag_name.replace(/^v/, ''));
    });
}
function getPossibleVersions(version) {
    return __awaiter(this, void 0, void 0, function* () {
        const versions = yield getAvailableVersions();
        const possibleVersions = versions.filter(v => v.startsWith(version));
        const versionMap = new Map();
        possibleVersions.forEach(v => versionMap.set(normalizeVersion(v), v));
        return Array.from(versionMap.keys())
            .sort(semver.rcompare)
            .map(v => versionMap.get(v));
    });
}
