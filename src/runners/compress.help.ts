export const COMPRESS_HELP_TEXT = `
romorganizer compress - Convert archive files to CHD format

Usage: romorganizer compress [options]

Required Options:
  -s, --source-dir <path>     Source directory containing files to compress
  -o, --output-dir <path>     Output directory for compressed CHD files

Optional Options:
  -t, --temp-dir <path>       Temporary directory for processing (default: system temp)
  -r, --remove-source         Remove source files after successful compression
  -u, --use-dat-file-name     Use DAT file name for output files
  -n, --rename                Rename source files to game name from DAT file
  -w, --overwrite             Overwrite existing output files
  -h, --help                  Show this help message

Examples:
  romorganizer compress -s ./input -o ./output
  romorganizer compress --source-dir ./input --output-dir ./output --remove-source
  romorganizer compress --source-dir ./input --output-dir ./output --overwrite
`;
