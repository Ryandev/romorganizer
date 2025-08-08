export const RENAME_HELP_TEXT = `
romorganizer rename - Rename CHD files based on metadata.json files

Usage: romorganizer rename [options]

Required Options:
  -s, --source-dir <path>     Source directory containing CHD files to rename

Optional Options:
  -f, --force                 Force overwrite if target file already exists
  -h, --help                  Show this help message

Examples:
  romorganizer rename -s ./input
  romorganizer rename --source-dir ./input --force

Note: This command requires metadata.json files to be present (created by the verify command).
Files without metadata.json will be skipped.
`;
