# `printenv`: print environment variables

Source: `src/printenv.c` (197 lines) · Tests: `tests/misc/printenv.sh` ·
Manual: `info '(coreutils) printenv invocation'`

`printenv` prints the values of environment variables. With no arguments, it
prints all name=value pairs. With variable names, it prints the value of each
that is set. It supports NUL-terminated output and quoting styles.

## Options

The table lists `longopts[]` (`src/printenv.c:57-64`) and short options.

|| Option | Variable |
||---|---|
|| `-0`, `--null` | `opt_nul_terminate_output = true` (NUL-terminated output) |
|| `--quoting-style=WORD` | `quoting_style_opt` (set quoting style) |

## Code map

|| Function | Location | Role |
||---|---|---|
|| `main` | `src/printenv.c:99` | Option parsing, quoting setup, loop over environ or specific variables. |
|| `usage` | `:66` | Help text. |

## How it works

The diagram shows the two modes.

```mermaid
flowchart TD
    A[Parse options] --> B[Set up quoting style]
    B --> C{n_args <= 0?}
    C -- yes --> D[Loop over environ]
    D --> E[print_envvar each]
    E --> F[ok = true]
    C -- no --> G[Loop over variable names]
    G --> H{contains '='?}
    H -- yes --> I[skip]
    H -- no --> J[Loop over environ]
    J --> K{name matches?}
    K -- yes --> L[fputs value]
    L --> M[matched = true]
    K -- no --> N{more env entries?}
    M --> N
    N -- yes --> J
    N -- no --> O{more variable names?}
    I --> O
    O -- yes --> G
    O -- no --> P[ok = matches == n_args]
    P --> Q{return ok ? EXIT_SUCCESS : EXIT_FAILURE]
    F --> Q
```

### Quoting

`main` sets up quoting based on options and environment
(`src/printenv.c:134-146`):

- `-0` implies `literal_quoting_style`
- If not set and stdout is a tty, check `QUOTING_STYLE` environment variable
- Default to `shell_escape_quoting_style` for ttys
- If the style is not `literal`, enable quoting with `set_quoting_style`

### All variables mode

With no arguments, `main` loops through `environ` and calls `print_envvar`
(gnulib) for each entry (`src/printenv.c:155-159`).

### Specific variables mode

With arguments, `main` loops through each variable name
(`src/printenv.c:161-194`):

1. Skips names containing `=` (silent)
2. Loops through `environ` to find a matching entry
3. For a match, prints the value (with quoting if enabled)
4. Counts matches and sets `ok` to true only if all variables were found

## Platform notes

None significant. Relies on standard `environ` variable.

## Errors and exit status

|| Status | Condition |
||---|---|
|| 0 | All specified variables were found (or no variables specified) |
|| 1 | Some specified variables were not found |
|| 2 | Usage error (set via `initialize_exit_failure`) |

## Tests

|| File | Covers |
||---|---|
|| `tests/misc/printenv.sh` | Basic functionality, `-0` option, quoting styles. |

## See also

- [env](env.md) (run program in modified environment)
