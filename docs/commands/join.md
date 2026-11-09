# `join`: join lines on a common field

Source: `src/join.c` (1231 lines) · Tests: `tests/join/` ·
Manual: `info '(coreutils) join invocation'`

`join` joins lines from two files on a common field. It reads both files sorted by the
join field, matches lines with equal join fields, and outputs the combined line.
Only lines that can be paired are output by default. With `-v`, unpairable lines can be
printed. Field separators can be specified for input and output.

## Options

Key options include:

|| Option | Purpose |
||---|---|
|| `-a FILENO` | Print unpairable lines from FILENO (1 or 2) |
|| `-e EMPTY` | Replace empty output fields with EMPTY |
|| `-i`, `--ignore-case` | Case-insensitive comparison |
|| `-j FIELD`, `--join=FIELD` | Join on FIELD (default 1) |
|| `-o FORMAT`, `-1 FIELD`, `-2 FIELD` | Specify output format |
|| `-t CHAR` | Input field separator (default whitespace) |
|| `-v FILENO` | Print unpairable lines from FILENO |
|| `--check-order` | Check input is sorted |
|| `--nocheck-order` | Don't check sorting |

## Code map

|| Function | Location | Role |
||---|---|---|
|| `main` | `src/join.c:527` | Option parsing, open files, call `join` |
|| `join` | `:440` | Main join loop, read and match lines |
|| `get_line` | `:237` | Read and parse a line into fields |
|| `prfield` | `:321` | Print a field from a line |
|| `prjoin` | `:357` | Print joined line with output format |
|| `check_order` | `:408` | Verify input is sorted |
|| `usage` | `:151` | Help message |

## How it works

`join` reads both files sorted by the join field (`src/join.c:440-526`):

1. **Read lines:** Read one line from each file.
2. **Compare join fields:** Compare the join fields of both lines.
3. **Match:** If equal, print the combined line and read next lines.
4. **Mismatch:** If file 1's field is less, read next line from file 1.
5. **File exhausted:** Handle remaining lines from the other file (unpairable).

### Field parsing

`get_line` splits lines into fields using the separator (whitespace by default,
or a single character with `-t`) (`src/join.c:237-318`). Fields are stored as
`struct field` with pointers into the line buffer.

### Output format

The output format is specified with `-o`, `-1`, and `-2` options
(`src/join.c:357-406`). The default is the join field followed by the rest of
each line.

## Platform notes

`join` uses `linebuffer` from gnulib. Locale-aware comparison uses
`xmemcoll` when `hard_LC_COLLATE` is true.

## Errors and exit status

- **Invalid field number:** Error from `xstrtoimax`
- **Invalid format:** Error from format parsing
- **File not sorted:** "file X is not sorted" (with `--check-order`)
- **File open failure:** Error from `quotef(FILE)`

Exit status is 0 on success, 1 on errors.

## Tests

|| File | Covers |
||---|---|
|| `tests/join/join.pl` | Various join scenarios |
|| `tests/join/join-utf8.sh` | UTF-8 handling |

## See also

- [comm](comm.md) for comparing sorted files line-by-line
