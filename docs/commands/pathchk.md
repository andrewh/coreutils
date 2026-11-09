# `pathchk`: check file name validity

Source: `src/pathchk.c` (421 lines) · Tests: (none) ·
Manual: `info '(coreutils) path invocation'`

`pathchk` diagnoses invalid or non-portable file names. It checks whether names
are valid for the current file system and optionally for POSIX portability. With
`-p`, it checks for most POSIX systems. With `-P` or `--portability`, it checks
for empty names and leading `-`.

## Options

The table lists `longopts[]` (`src/pathchk.c:72-78`) and the short-option
string `"pP"`.

|| Option | Variables |
||---|---|
|| `-p` | `check_basic_portability = true`: check for most POSIX systems |
|| `-P` | `check_extra_portability = true`: check for empty names and leading `-` |
|| `--portability` | Both `check_basic_portability` and `check_extra_portability` |

## Code map

|| Function | Location | Role |
||---|---|---|
|| `main` | `src/pathchk.c:110` | Option parsing, call `validate_file_name` for each name |
|| `validate_file_name` | `:156` | Check name validity and portability |
|| `usage` | `:81` | Help message |

## How it works

`main` calls `validate_file_name` for each argument
(`src/pathchk.c:110-176`). `validate_file_name` checks:

1. **Empty name:** Reports "empty file name" if the string is empty.
2. **Leading `-`: With `-P`, reports "leading '-' in NAME".
3. **Path length:** Checks against `PATH_MAX` from `pathconf`.
4. **Component length:** Checks each component against `NAME_MAX` from `pathconf`.
5. **Invalid characters:** Checks for characters not valid in file names
   (portability check).

The checks use `pathconf` when available, with fallback minimum values from
POSIX (`_POSIX_PATH_MAX` = 256, `_POSIX_NAME_MAX` = 14).

## Platform notes

`pathchk` uses `pathconf` when available (`HAVE_PATHCONF`). Fallback values
are used on systems without it. The X/Open minimums are used when available
(`_XOPEN_PATH_MAX`, `_XOPEN_NAME_MAX`).

## Errors and exit status

- **Empty file name:** "empty file name"
- **Leading `-`: "leading '-' in NAME"
- **Path too long:** "limit %d exceeded by length %d of NAME"
- **Component too long:** "limit %d exceeded by length %d of NAME"

Exit status is 0 if all names are valid, 1 if any are invalid.

## Tests

No dedicated test files exist for `pathchk`.

## See also

- [dirname](dirname.md) and [basename](https://man7.org/linux/man-pages/man1/basename.1.html) for path component handling
