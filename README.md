# 7zTools

A Node.js tool to convert archive files (7z, rar, zip) containing game ROMs to CHD format for use with MAME and other emulators.

## Features

- Extracts various archive formats (7z, rar, zip, ecm)
- Converts game ROMs to CHD format
- Supports automatic cue file generation
- Handles nested archive structures
- Built with TypeScript and zx for robust shell operations

## Prerequisites

Before using this tool, you need to install the following system dependencies:

### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install -y p7zip-full p7zip-rar mame-tools unrar unzip
```

### macOS:
```bash
brew install p7zip mame-tools unrar unzip
```

### For ECM support:
You'll need to install the ECM tools from: https://github.com/kidoz/ecm

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd 7ztools
```

2. Install dependencies and initialize submodules:
```bash
npm install
```

**Note**: The `postinstall` script will automatically initialize all git submodules. If you need to manually initialize submodules, run:
```bash
npm run setup
```

3. Build the project:
```bash
npm run build
```

**Note**: The build process automatically:
- Initializes git submodules (via `postinstall` script)
- Builds ECM WASM modules (via `build:deps` script)
- Compiles TypeScript to JavaScript (via Vite)

## Code Quality

This project uses ESLint with TypeScript support to maintain code quality:

```bash
# Check for linting issues
npm run lint

# Automatically fix fixable issues
npm run lint:fix
```

## Creating a Single Executable

To create a single executable file that includes all dependencies:

```bash
npm run package
```

This will create a `dist-package/7z-to-chd.mjs` file that can be run directly:

```bash
node dist-package/7z-to-chd.mjs -s /path/to/source -o /path/to/output
```

## Usage

### Basic usage:
```bash
npm start -- -s /path/to/source/directory -o /path/to/output/directory
```

### With source removal:
```bash
npm start -- -s /path/to/source/directory -o /path/to/output/directory -r true
```

### Development mode (runs TypeScript directly):
```bash
npm run dev -- -s /path/to/source/directory -o /path/to/output/directory
```

### Command line options:
- `-s, --source, --source-dir`: Source directory containing archive files
- `-o, --output, --output-dir`: Output directory for CHD files
- `-r, --remove-source`: Remove source files after conversion (optional, default: false)

## Supported Formats

- **Input**: 7z, rar, zip, ecm
- **Output**: CHD (Compressed Hunks of Data)

## How it works

1. Scans the source directory for archive files
2. Extracts each archive to a temporary directory
3. Processes any nested ECM files
4. Converts .img files to .iso format
5. Generates or updates .cue files as needed
6. Creates CHD files using chdman
7. Cleans up temporary files

## Development

### CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment:

#### **CI Workflow** (`.github/workflows/ci.yml`)
- **Triggers**: Push to `main`/`develop` branches, Pull Requests
- **Platforms**: Ubuntu and macOS
- **Node.js Versions**: 20, 21
- **Package Managers**: Yarn and npm
- **Targets**:
  - ✅ **Linting**: ESLint with TypeScript and Unicorn rules
  - ✅ **Code Formatting**: Prettier check
  - ✅ **Spell Checking**: cspell for TypeScript files
  - ✅ **Testing**: Jest with coverage reporting
  - ✅ **Building**: TypeScript compilation
  - ✅ **Packaging**: Single executable creation
  - ✅ **Security Audit**: Dependency vulnerability scanning (yarn audit)
  - ✅ **Type Checking**: TypeScript type validation

#### **Release Workflow** (`.github/workflows/release.yml`)
- **Triggers**: GitHub Release publication
- **Actions**:
  - Builds and packages the project
  - Creates release assets (tar.gz and zip)
  - Uploads assets to GitHub Release

#### **Dependency Management** (`.github/dependabot.yml`)
- **Automated Updates**: Weekly dependency updates
- **Security**: Automatic security vulnerability scanning
- **Package Ecosystems**: npm and GitHub Actions

#### **Dependency Review** (`.github/workflows/dependency-review.yml`)
- **Security**: Reviews dependency changes in PRs
- **Severity**: Fails on moderate+ security issues

### Code Quality

The project uses ESLint with the following plugins:
- **@typescript-eslint**: TypeScript-specific linting rules
- **eslint-plugin-unicorn**: Additional best practices and code quality rules

The ESLint configuration includes:
- Recommended TypeScript rules
- Unicorn recommended rules with customizations for Node.js projects
- Custom rule overrides for project-specific needs

### Available scripts:
- `npm run setup`: Initialize all git submodules
- `npm run build`: Build dependencies and compile TypeScript to JavaScript
- `npm run build:deps`: Build ECM WASM modules (automatically run before main build)

- `npm run start`: Run the compiled JavaScript
- `npm run dev`: Run TypeScript directly with tsx
- `npm run clean`: Remove build artifacts
- `npm run package`: Create a single executable file using ncc
- `npm run lint`: Check code quality with ESLint and Unicorn rules
- `npm run lint:fix`: Fix automatically fixable ESLint issues
- `npm run test`: Run Jest tests
- `npm run test:watch`: Run tests in watch mode
- `npm run test:coverage`: Run tests with coverage reporting
- `npm run check-pretty`: Check code formatting with Prettier
- `npm run fix-pretty`: Fix code formatting with Prettier
- `npm run check-spell`: Check spelling with cspell
- `npm run audit`: Run security audit on dependencies
- `npm run audit:fix`: Run security audit and attempt to fix issues

### Project structure:
```
7ztools/
├── src/              # TypeScript source files
│   ├── 7z_to_chd.ts  # Main application
│   ├── logger.ts     # Logger module
│   ├── guard.ts      # Guard functions for validation
│   ├── cli.ts        # Command line interface module
│   ├── utils/        # Utility functions
│   │   ├── cue.ts    # CUE file creation utilities
│   │   ├── chd.ts    # CHD file creation utilities
│   │   └── file.ts   # File system operations utilities
│   └── archive/      # Archive handling module
│       ├── index.ts  # Archive factory and exports
│       ├── base.ts   # Base archive class and interface
│       ├── seven-zip.ts  # 7z archive implementation
│       ├── rar.ts    # RAR archive implementation
│       ├── zip.ts    # ZIP archive implementation
│       └── ecm.ts    # ECM archive implementation
├── dist/             # Compiled JavaScript output
├── dist-package/     # Single executable output (after npm run package)
├── scripts/          # Build scripts
├── package.json      # Project configuration
├── tsconfig.json     # TypeScript configuration
├── eslint.config.js  # ESLint configuration
├── .gitignore        # Git ignore rules
└── README.md         # This file
```

## License

MIT License - see LICENSE file for details. 