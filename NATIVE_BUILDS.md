# Native Builds

This project includes native executable builds for multiple platforms using yao-pkg.

## Available Executables

The following native executables are available:

| Platform | Architecture | File | Size |
|----------|--------------|------|------|
| macOS | ARM64 (Apple Silicon) | `romorganizer-macos-arm64` | 48MB |
| macOS | x64 (Intel) | `romorganizer-macos-x64` | 54MB |
| Linux | ARM64 | `romorganizer-linux-arm64` | 53MB |
| Linux | x64 | `romorganizer-linux-x64` | 55MB |

## Building Native Executables

To build the native executables:

```bash
yarn build:native
```

This will:
1. Build all dependencies (including WASM modules)
2. Create a CommonJS bundle optimized for yao-pkg
3. Package the application into native executables for all supported platforms

## Usage

The native executables work exactly like the Node.js version:

```bash
# Show help
./romorganizer-macos-arm64 --help

# Compress files
./romorganizer-macos-arm64 compress -s ./input -o ./output

# Verify files
./romorganizer-macos-arm64 verify -s ./input -d ./datfile.dat -c ./cuesheets.zip
```

## Features

- **Self-contained**: No Node.js installation required
- **Cross-platform**: Works on macOS and Linux
- **WASM support**: Includes ECM/UNECM WASM modules
- **Full functionality**: All features of the Node.js version

## Technical Details

- Built with yao-pkg (fork of pkg)
- Uses CommonJS bundle for compatibility
- Includes all dependencies and WASM files
- Optimized for each target platform

## Automated Builds

Native executables are automatically built by the GitHub Actions CI/CD pipeline:

- **On every push/PR**: Native builds are triggered when source files change
- **On releases**: All native executables are included as release assets
- **Manual builds**: Can be triggered manually from the Actions tab

The CI/CD pipeline builds executables for all supported platforms and makes them available as:
- Individual executables for direct download
- Platform-specific archives (tar.gz and zip)
- Complete archives with all executables

See [CI_CD.md](CI_CD.md) for detailed information about the build pipeline. 