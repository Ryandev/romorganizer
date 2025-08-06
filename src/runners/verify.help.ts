export const VERIFY_HELP_TEXT = `
romorganizer verify - Verify CHD files against DAT file

Usage: romorganizer verify [options]

Required Options:
  -s, --source-dir <path>     Source directory containing CHD files to verify
  -d, --dat-file <path>       DAT file for validation (supports .dat and .zip files)
  -c, --cuesheets-file <path> Cuesheets zip file containing master .cue files

Optional Options:
  -t, --temp-dir <path>       Temporary directory for processing (default: system temp)
  -n, --rename                Rename source files to game name from DAT file
  -f, --force                 Force re-verification even if metadata.json exists
  -h, --help                  Show this help message

Examples:
  romorganizer verify -s ./input -d ./datfile.dat -c ./cuesheets.zip
  romorganizer verify --source-dir ./input --dat-file ./datfile.zip --cuesheets-file ./cuesheets.zip --rename
  romorganizer verify --source-dir ./input --dat-file ./datfile.dat --cuesheets-file ./cuesheets.zip --force
`;
