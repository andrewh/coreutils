# `test`: evaluate file and string conditions

Source: `src/test.c` (899 lines) · Tests: `tests/test/` ·
Manual: `info '(coreutils) test invocation'`

`test` evaluates expressions and returns exit status 0 (true) or 1 (false). It
can test file properties, string comparisons, integer comparisons, and logical
operations. The `[` command is a synonym for `test` requiring a final `]` argument.

## Options

No options besides `--help` and `--version` (only honored by `[`, not `test`).

## Code map

|| Function | Location | Role |
||---|---|---|
|| `main` | `src/test.c:837` | Initialize, check for `]` with `[`, call `posixtest` |
|| `posixtest` | `:677` | Parse and evaluate expression based on argument count |
|| `unary_operator` | `:191` | Evaluate unary operators (`-b`, `-d`, `-f`, etc.) |
|| `binary_operator` | `:372` | Evaluate binary operators (`-eq`, `-gt`, `=`, etc.) |
|| `two_arguments` | `:475` | Handle 2-argument expressions |
|| `three_arguments` | `:489` | Handle 3-argument expressions |
|| `expr` | `:562` | Parse expression with `and` and `or` |
|| `term` | `:553` | Parse term with unary operators |
|| `and` | `:544` | Parse `&&` (logical AND) |
|| `or` | `:536` | Parse `||` (logical OR) |
|| `usage` | `:752` | Help message |

## How it works

`test` parses expressions recursively based on the number of arguments
(`src/test.c:837-899`):

1. **Initialization:** Set up argument list and position.
2. **Bracket check:** For `[`, verify the last argument is `]`.
3. **Parsing:** Call `posixtest` which dispatches based on argument count:
   - 1 argument: Test if non-empty
   - 2 arguments: Handle unary operators or negation
   - 3 arguments: Handle binary operators
   - 4+ arguments: Parse with `expr` for logical operations
4. **Evaluation:** Recursively evaluate the expression tree.
5. **Result:** Exit with 0 (true) or 1 (false).

### Unary operators

File test operators (`src/test.c:191-369`):

- `-b FILE`: Block device
- `-c FILE`: Character device
- `-d FILE`: Directory
- `-e FILE`: Exists
- `-f FILE`: Regular file
- `-g FILE`: Set-group-ID
- `-G FILE`: Owned by effective group ID
- `-h FILE`, `-L FILE`: Symbolic link
- `-k FILE: Sticky bit
- `-L STRING`: Length of string
- `-O FILE`: Owned by effective user ID
- `-p FILE`: Named pipe
- `-r FILE`: Readable
- `-s FILE`: Non-empty
- `-S FILE`: Socket
- `-t FD`: Terminal
- `-u FILE`: Set-user-ID
- `-w FILE`: Writable
- `-x FILE`: Executable

### Binary operators

Comparison operators (`src/test.c:372-472`):

- **String:** `=`, `==`, `!=`, `<`, `>`
- **Integer:** `-eq`, `-ne`, `-ge`, `-gt`, `-le`, `-lt`
- **File:** `-ef` (same file), `-nt` (newer than), `-ot` (older than)

### Logical operators

- `&&`: Logical AND (short-circuit)
- `||`: Logical OR (short-circuit)
- `!`: Logical NOT

## Platform notes

`test` can be compiled as a standalone program (`TEST_STANDALONE`) or as a
shell builtin. The standalone version uses `exit`; the builtin uses `longjmp`.

## Errors and exit status

- **Missing argument:** "missing argument after X"
- **Missing `]`:** "missing ]"
- **Extra argument:** "extra argument X"
- **Syntax error:** Exit status 2

Exit status: 0 (true), 1 (false), 2 (syntax error).

## Tests

|| File | Covers |
||---|---|
|| `tests/test/test.pl` | Various test expressions |
|| `tests/test/test-N.sh` | `-N` operator |
|| `tests/test/test-file.sh` | File tests |
|| `tests/test/test-diag.pl` | Diagnostic output |

## See also

- [expr](expr.md) for arithmetic and string expressions
