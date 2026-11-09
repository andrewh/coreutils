# `true`: exit with a status code indicating success

Source: `src/true.c` (with `src/true.h`) · Tests: `tests/misc/false-status.sh` · Manual: `info '(coreutils) true invocation'`

`true` does nothing and returns a successful exit status (0). It is the simplest coreutils program, sharing its source with `false` through a mode variable. It recognizes `--help` and `--version` only when they are the sole argument, to avoid interfering with its typical use in shell scripts.

## Options

| Option | Description |
|--------|-------------|
| `--help` | Display help and exit (only if sole argument) |
| `--version` | Output version information (only if sole argument) |

All other arguments are ignored.

## Code map

| Function | Location | Role |
|----------|----------|------|
| `main` | `src/true.c:47-73` | Check for --help/--version, then return EXIT_STATUS |
| `usage` | `src/true.c:28-45` | Print usage message |

## How it works

The main function checks for `--help` or `--version` only when exactly one argument is provided.

```mermaid
flowchart TD
    A[main] --> B{argc == 2?}
    B -->|No| C[Return EXIT_STATUS immediately]
    B -->|Yes| D[Initialize locale and atexit]
    D --> E{argv[1] == --help?}
    E -->|Yes| F[Call usage EXIT_STATUS]
    E -->|No| G{argv[1] == --version?}
    G -->|Yes| H[Call version_etc]
    G -->|No| C
    H --> C
    C --> I[Exit with EXIT_STATUS]
```

### Exit status

The exit status is determined by the `true_mode` variable, which is set externally (the same source file builds both `true` and `false`):

```c
#define EXIT_STATUS (true_mode != TRUE_TRUE)
#define PROGRAM_NAME (true_mode == TRUE_TRUE ? "true" : "false")
```

For `true`, `true_mode` is `TRUE_TRUE`, so `EXIT_STATUS` is `EXIT_SUCCESS` (0). For `false`, `EXIT_STATUS` is `EXIT_FAILURE` (1).

### Minimal initialization

The program only calls `initialize_main`, `set_program_name`, locale functions, and `atexit(close_stdout)` when processing `--help` or `--version`. This avoids unnecessary overhead when used in shell scripts, where `true` is typically called with no arguments.

## Platform notes

- No platform-specific code
- The same source builds both `true` and `false` binaries through external configuration
- Uses `close_stdout` to detect write errors, which can cause `true` to exit with failure if `--help` or `--version` output cannot be written

## Errors and exit status

| Condition | Exit status |
|-----------|-------------|
| Normal operation (true) | EXIT_SUCCESS (0) |
| Normal operation (false) | EXIT_FAILURE (1) |
| Write error on --help/--version | EXIT_FAILURE (via close_stdout) |

## Tests

| Test file | Coverage |
|-----------|----------|
| `tests/misc/false-status.sh` | Tests that true exits nonzero when it can't write --help or --version |

The program is also used extensively throughout the test suite as a simple no-op command.

## See also

- [`false`](test.md) - Exit with failure status (same source, different mode)
- [`test`](test.md) - Shell conditional expression builtin
