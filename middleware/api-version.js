const semver = require('semver');
const { AppError } = require('./error-handler');

const CURRENT_VERSION = '1.0.0';
const SUPPORTED_VERSIONS = ['1.0.0'];

const parseVersion = (version) => {
  // Handle v1, v1.0, v1.0.0 formats
  if (version.startsWith('v')) {
    version = version.slice(1);
  }
  if (version.split('.').length === 1) {
    version = `${version}.0.0`;
  } else if (version.split('.').length === 2) {
    version = `${version}.0`;
  }
  return version;
};

const versionCheck = (req, res, next) => {
  // Get version from URL (/v1/...) or header (Accept: application/vnd.feedio.v1+json)
  let version = 'v1'; // Default to v1

  // Check URL version
  const urlVersion = req.path.split('/')[1];
  if (urlVersion && urlVersion.startsWith('v')) {
    version = urlVersion;
  }

  // Check header version (takes precedence over URL)
  const acceptHeader = req.get('Accept');
  if (acceptHeader && acceptHeader.includes('application/vnd.feedio.')) {
    const match = acceptHeader.match(/application\/vnd\.feedio\.v(\d+(\.\d+)?(\.\d+)?)\+json/);
    if (match) {
      version = `v${match[1]}`;
    }
  }

  // Parse and validate version
  const parsedVersion = parseVersion(version);
  if (!semver.valid(parsedVersion)) {
    return next(new AppError(400, 'Invalid API version specified'));
  }

  // Check if version is supported
  if (!SUPPORTED_VERSIONS.some(v => semver.satisfies(parsedVersion, v))) {
    return next(
      new AppError(
        400,
        `API version ${version} is not supported. Supported versions: ${SUPPORTED_VERSIONS.map(v => `v${v}`).join(', ')}`
      )
    );
  }

  // Add version info to request
  req.apiVersion = parsedVersion;
  
  // Add version to response header
  res.set('X-API-Version', `v${parsedVersion}`);
  
  // If it's an older version, add deprecation notice if needed
  if (semver.lt(parsedVersion, CURRENT_VERSION)) {
    res.set('X-API-Deprecated', 'true');
    res.set(
      'X-API-Deprecation-Info',
      `This API version will be discontinued. Please upgrade to v${CURRENT_VERSION}`
    );
  }

  next();
};

module.exports = {
  versionCheck,
  CURRENT_VERSION,
  SUPPORTED_VERSIONS
}; 