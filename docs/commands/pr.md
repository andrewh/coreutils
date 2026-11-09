# `pr`: convert text files for printing

Source: `src/pr.c` (2908 lines) · Tests: `tests/pr/` ·
Manual: `info '(coreutils) pr invocation'`

`pr` converts text files for printing with columnar and page formatting. It
supports multi-column output, page numbering, headers, and form feed handling.
Columns can be printed across (`-a`) or down (default). It balances lines across
columns to produce equal-length pages.

## Options

Key options include:

|| Option | Purpose |
||---|---|
|| `+PAGE[:LAST]` | Print pages from PAGE to LAST |
|| `-COLS`, `--columns=COLS` | Number of columns |
|| `-a`, `--across` | Print columns across |
|| `-c`, `--show-control-chars` | Show nonprintable as control prefixes |
|| `-d`, `--double-space` | Double space output |
|| `-h HEADER`, `--header=HEADER` | Use HEADER as page header |
|| `-l`, `--length=PAGE_LENGTH` | Set page length |
|| `-n`, --number-lines` | Line numbering |
|| `-o MARGIN`, --output-margin=MARGIN | Set output margin |
|| `-s CHAR`, --separator=CHAR | Column separator |
|| `-t`, --omit-header | Omit page/line headers |
|| `-w PAGE_WIDTH`, --width=PAGE_WIDTH | Page width |
|| `-J`, --join-lines | Merge full lines, no truncation |
|| `-S`, --sep-string=STRING | Custom separator |
|| `-W PAGE_WIDTH`, --width=PAGE_WIDTH | Truncate to PAGE_WIDTH |

## Code map

|| Function | Location | Role |
||---|---|---|
|| `main` | `src/pr.c:2364` | Option parsing, initialize, call `pr_files` |
|| `pr_files` | `:2278` | Process each file, handle page ranges |
|| `pr_page` | `:2246` | Print one page with columns |
|| `init_state` | `:2095` | Initialize column state |
|| `print_page` | `:1970` | Print a page with headers and columns |
|| `print_line` | `:1674` | Print a line with padding and separators |
|| `usage` | `:639` | Help message |

## How it works

`pr` reads input files and formats them into columns (`src/pr.c:2364-2355`):

1. **Initialization:** Set up column widths and separators based on options.
2. **Reading:** Read lines and distribute them across columns.
3. **Balancing:** Balance lines across columns to produce equal-length pages
   (unless `-a` is used).
4. **Output:** Print each page with headers, footers, and line numbers.

### Column balancing

With multiple columns (not `-a`), `pr` balances the number of lines in each
column to ensure equal-length pages. Form feeds in the input trigger page breaks.

### Headers

Each page has a header with the file name, date, and page number. This can be
customized with `-h` or omitted with `-t`.

## Platform notes

`pr` uses POSIX line printer conventions. Form feed handling (`\f`) triggers
page breaks.

## Errors and exit status

- **Invalid page range:** Error from option parsing
- **Invalid column count:** Error from option parsing
- **File read failure:** Error message

Exit status is 0 on success, 1 on errors.

## Tests

Many test files in `tests/pr/` cover various column configurations and edge cases.

## See also

- [fmt](fmt.md) for text formatting
