# `numfmt`: convert numbers from/to human-readable formats

Source: `src/numfmt.c` (1754 lines) · Tests: `tests/numfmt/` ·
Manual: `info '(coreutils) numfmt invocation'`

`numfmt` converts numbers between human-readable formats (like `1.5K`, `2M`) and
raw numbers. It supports SI (base 1000) and IEC (base 1024) scaling, rounding,
padding, and field selection. It can process entire lines or specific fields,
making it useful for formatting output from other commands.

## Options

Key options include:

|| Option | Purpose |
||---|---|
|| `--from=MODE` | Input scaling: none, auto, si, iec, iec-i |
|| `--to=MODE` | Output scaling: none, si, iec, iec-i |
|| `--from-unit=N` | Input unit size |
|| `--to-unit=N` | Output unit size |
|| `--round=METHOD` | Rounding: up, down, from-zero, towards-zero, nearest |
|| `--padding=N` | Pad output to N characters |
|| `--suffix=SUFFIX` | Add SUFFIX to output |
|| `--unit-separator=SEP` | Separator between number and unit |
|| `--grouping` | Group thousands with locale separator |
|| `-d DELIM`, `--delimiter=DELIM` | Field delimiter (default whitespace) |
|| `--field=N` | Process only field N |
|| `--header=N` | Skip N header lines |
|| `--format=FORMAT` | Output format (printf-style) |
|| `--invalid=MODE` | Handle invalid input: abort, fail, warn, ignore |
|| `-z`, `--zero-terminated` | NUL-terminated lines |

## Code map

|| Function | Location | Role |
||---|---|---|
|| `main` | `src/numfmt.c:1533` | Option parsing, read input, call `process_line` |
|| `process_line` | `:1468` | Split line into fields, call `process_field` |
|| `process_field` | `:1261` | Parse and convert a single number |
|| `str2num` | `:1182` | Parse string to number with scaling |
|| `num2str` | `:1049` | Convert number to string with scaling |
|| `usage` | `:1435` | Help message |

## How it works

`numfmt` reads input lines and processes specified fields (`src/numfmt.c:1533-1754`):

1. **Initialization:** Set up locale-specific decimal and thousands separators
   with `nl_langinfo` (`src/numfmt.c:1549-1557`).
2. **Option parsing:** Parse scaling modes, rounding, and field options.
3. **Processing:** For each line, split into fields and call `process_field`
   on the target field.
4. **Conversion:** `str2num` parses the input string with optional scaling
   (`src/numfmt.c:1182-1259`). `num2str` formats the output with scaling
   (`src/numfmt.c:1049-1180`).
5. **Output:** Reconstruct the line with the converted field.

### Scaling modes

Scaling modes are defined in the `scale_type` enum
(`src/numfmt.c:68-95`):

- **`scale_none`:** No scaling (raw numbers)
- **`scale_auto`:** Auto-detect from suffixes (input only)
- **`scale_SI`:** Base 1000 (K, M, G, T, P, E)
- **`scale_IEC`:** Base 1024 (Ki, Mi, Gi, Ti, Pi, Ei)
- **`scale_IEC_i`:** Base 1024 with required `i` suffix

### Rounding

Rounding methods are defined in the `round_type` enum
(`src/numfmt.c:98-115`):

- **`round_nearest`:** Round to nearest (default)
- **`round_up`:** Round toward positive infinity
- **`round_down`:** Round toward negative infinity
- **`round_from_zero`:** Round away from zero
- **`round_to_zero`:** Round toward zero

### Field processing

With `--field`, only the specified field is processed. The line is split using
the delimiter (whitespace by default, or a specific character with `-d`).

## Platform notes

`numfmt` uses locale-specific separators from `nl_langinfo`. Extended precision
floating point is enabled with `fpsetprec` on platforms that support it.

## Errors and exit status

- **Invalid scaling mode:** Error from `XARGMATCH`
- **Invalid rounding mode:** Error from `XARGMATCH`
- **Invalid unit size:** Error from `unit_to_umax`
- **Conversion failure:** Depends on `--invalid` mode (abort, fail, warn, ignore)

Exit status is 0 on success, 2 if some numbers failed to convert (unless
`--invalid=warn` or `--invalid=ignore`), 1 on other errors.

## Tests

|| File | Covers |
||---|---|
|| `tests/numfmt/numfmt.pl` | Various conversion scenarios |
|| `tests/numfmt/mb-non-utf8.sh` | Multi-byte character handling |

## See also

- [dd](dd.md) for data conversion with units
