export const RENAME_HELP_TEXT = `
romorganizer rename - Rename CHD files based on DAT file matches

Usage: romorganizer rename [options]

Required Options:
  -s, --source-dir <path>     Source directory containing CHD files to rename
  -d, --dat-file <path>       DAT file for validation (supports .dat and .zip files)
  -c, --cuesheets-file <path> Cuesheets zip file containing master .cue files

Optional Options:
  -t, --temp-dir <path>       Temporary directory for processing (default: system temp)
  -f, --force                 Force re-renaming even if metadata.json exists
  -h, --help                  Show this help message

Examples:
  romorganizer rename -s ./input -d ./datfile.dat -c ./cuesheets.zip
  romorganizer rename --source-dir ./input --dat-file ./datfile.zip --cuesheets-file ./cuesheets.zip
  romorganizer rename --source-dir ./input --dat-file ./datfile.dat --cuesheets-file ./cuesheets.zip --force
`;
