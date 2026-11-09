# `dirname`: strip last component from file name

Source: `src/dirname.c` (154 lines) · Tests: `tests/misc/dirname.pl` ·
Manual: `info '(coreutils) dirname invocation'`

`dirname` prints the directory portion of each file name argument. It removes
the last non-slash component and any trailing slashes. If the name contains no
slashes, it prints `.`. The actual string manipulation is done by the gnulib
`dir_len` function.

## Options

The table lists `longopts[]` (`src/dirname.c:37-43`) and short options.

|| Option | Variable |
||---|---|
|| `-z`, `--zero` | `use_nuls = true` (separate output with NUL instead of newline) |

## Code map

|| Function | Location | Role |
||---|---|---|
|| `main` | `src/dirname.c:81` | Option parsing, quote style detection, loop over arguments calling `dir_len`. |
|| `usage` | `:45` | Help text with examples. |

## How it works

The diagram shows the main loop.

```mermaid
flowchart TD
    A[Parse options] --> B{stdout is a tty?<br/>and not -z}
    B -- yes --> C[Get quoting style from env]
    C --> D{quote style not literal?}
    D -- yes --> E[set quote_output true]
    D -- no --> F[Loop over args]
    E --> F
    B -- no --> F
    F --> G[Call dir_len on arg]
    G --> H{len == 0?}
    H -- yes --> I[output "."]
    H -- no --> J[output result with len bytes]
    I --> K{more args?}
    J --> K
    K -- yes --> F
    K -- no --> L[exit]
```

### Path manipulation

`main` calls the gnulib function `dir_len` (`src/dirname.c:136`) for each
argument. This function returns the length of the directory portion. If the
length is 0 (no slashes), `dirname` outputs `.` instead (`src/dirname.c:138-143`).

### Quoting

When output is to a terminal and `-z` is not used, `dirname` checks the
`QUOTING_STYLE` environment variable (`src/dirname.c:121-131`). If the style
is not `literal`, it enables quoting with `set_quoting_style` and wraps each
output in `quoteN_mem`.

## Platform notes

None significant. The program relies on gnulib for portability.

## Errors and exit status

- Missing operand: `error (0, 0, ...)` then `usage (EXIT_FAILURE)`
- Invalid option: `usage (EXIT_FAILURE)`
- Write failure: handled by `atexit (close_stdout)`

## Tests

|| File | Covers |
||---|---|
|| `tests/misc/dirname.pl` | Various path patterns, edge cases, `-z` option. |

## See also

- [realpath](realpath.md) (canonicalize paths)
