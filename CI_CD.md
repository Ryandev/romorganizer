# CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment.

## Workflows

### 1. CI (`ci.yml`)

**Triggers:** Push to main/develop, Pull requests to main/develop

**Purpose:** Run tests, linting, and build verification

**Jobs:**
- **test-and-build**: Runs on Ubuntu and macOS with Node.js 20/21 and yarn/npm
  - Installs dependencies
  - Runs linting (`yarn lint`)
  - Checks code formatting (`yarn pretty:check`)
- Checks spelling (`yarn spell:check`)
- Runs security audit (`yarn audit:check`)
  - Runs tests (excluding system-dependent tests)
  - Builds the project (`yarn build`)
  - Creates package (`yarn package`)
  - Uploads build artifacts

- **security**: Dedicated security audit job
- **type-check**: TypeScript type checking

### 2. Native Builds (`native-builds.yml`)

**Triggers:** 
- Push to main/develop (when source files change)
- Pull requests to main/develop (when source files change)
- Manual trigger (`workflow_dispatch`)

**Purpose:** Build native executables for all supported platforms

**Jobs:**
- **build-native**: Runs on Ubuntu and macOS
  - Installs dependencies
  - Runs tests
  - Builds native executables (`yarn build:native`)
  - Tests native executables
  - Uploads native build artifacts
  - Creates platform-specific archives

**Generated Artifacts:**
- Individual executables: `romorganizer-*`
- Platform archives: `romorganizer-linux.tar.gz`, `romorganizer-macos.tar.gz`
- Platform zip files: `romorganizer-linux.zip`, `romorganizer-macos.zip`

### 3. Release (`release.yml`)

**Triggers:** Release published

**Purpose:** Create and upload release assets

**Jobs:**
- **build-and-release**: Runs on Ubuntu
  - Installs dependencies
  - Runs tests
  - Builds the project
  - Creates package
  - Builds native executables
  - Creates release assets
  - Uploads all assets to GitHub release

**Release Assets:**
- `romorganizer-linux-x64.tar.gz` - Linux package
- `romorganizer-linux-x64.zip` - Linux package (zip)
- `romorganizer-native-all.tar.gz` - All native executables
- `romorganizer-native-all.zip` - All native executables (zip)
- Individual native executables for each platform

## Native Executables

The CI/CD pipeline builds native executables for the following platforms:

| Platform | Architecture | Executable |
|----------|--------------|------------|
| macOS | ARM64 (Apple Silicon) | `romorganizer-macos-arm64` |
| macOS | x64 (Intel) | `romorganizer-macos-x64` |
| Linux | ARM64 | `romorganizer-linux-arm64` |
| Linux | x64 | `romorganizer-linux-x64` |

## Artifacts

### CI Artifacts
- **dist-{os}-{package-manager}**: Build outputs and packages
- **native-builds-{platform}**: Native executables for each platform
- **native-archives-{platform}**: Compressed archives of native executables

### Release Artifacts
- Complete distribution packages
- All native executables in compressed archives
- Individual native executables for direct download

## Manual Triggers

You can manually trigger the native builds workflow:

1. Go to the Actions tab in GitHub
2. Select "Native Builds" workflow
3. Click "Run workflow"
4. Select the branch and click "Run workflow"

## Dependencies

The CI/CD pipeline requires:
- Node.js 20+ (for native builds)
- Yarn 4.6.0+
- Emscripten (for WASM compilation)
- System tools: p7zip, unrar, unzip, mame-tools

## Troubleshooting

### Common Issues

1. **Native build failures**: Check if Emscripten is properly installed
2. **WASM compilation errors**: Verify the ECM build scripts are working
3. **Artifact upload failures**: Check GitHub token permissions
4. **Test failures**: Some tests are excluded in CI due to system dependencies

### Debugging

- Check the Actions logs for detailed error messages
- Verify that all dependencies are properly installed
- Ensure the build environment has sufficient resources
- Check that file paths and permissions are correct

## Performance

- Native builds are only triggered when relevant files change
- Builds run in parallel across platforms
- Artifacts are cached for 30 days
- Tests are optimized to exclude system-dependent tests in CI 