# `pinky`: print user information

Source: `src/pinky.c` (617 lines) · Tests: (none) ·
Manual: `info '(coreutils) pinky invocation'`

`pinky` prints user information from the utmp database. It is a lightweight
version of `finger` that displays login time, tty, host, and optionally the
full name, plan/project files, and idle time. With `-l`, it uses long format
showing more details.

## Options

The table lists `longopts[]` (`src/pinky.c:86-92`) and the short-option
string `"lmw"`.

|| Option | Variables |
||---|---|
|| `-l` | `do_short_format = false`: long format |
|| `-m` | Ignored (for compatibility) |
|| `-w` | Ignored (for compatibility) |
|| `--lookup` | `do_lookup = true`: canonicalize hostnames via DNS |

## Code map

|| Function | Location | Role |
||---|---|---|
|| `main` | `src/pinky.c:529` | Option parsing, read utmp, print entries |
|| `scan_entries` | `:417` | Scan utmp entries and print matching users |
|| `print_entry` | `:341` | Print a single utmp entry |
|| `print_long` | `:274` | Print long format with gecos, plan, project, home, shell |
|| `create_fullname` | `:113` | Expand `&` in gecos to username |
|| `usage` | `:224` | Help message |

## How it works

`main` reads the utmp database with `readutmp` and calls `scan_entries`
(`src/pinky.c:529-583`). For each entry matching the specified users (or all if
none specified), it calls `print_entry` or `print_long` depending on the format.

### Short format

Short format prints: login, tty, host, and time (`src/pinky.c:341-408`).

### Long format

Long format additionally prints: full name (from gecos with `&` expansion),
idle time, comment, project, plan, home directory, and shell
(`src/pinky.c:274-339`). The plan and project files are read from
`~/.plan` and `~/.project`.

### Name expansion

`create_fullname` expands `&` in the gecos field to the username
(`src/pinky.c:113-150`), capitalizing the first character.

## Platform notes

`pinky` uses `readutmp` from gnulib for utmp access. `ut_host` is only
available on systems with `HAVE_STRUCT_XTMP_UT_HOST`.

## Errors and exit status

- **Utmp read failure:** Error from `readutmp`

Exit status is 0 on success, 1 on errors.

## Tests

No dedicated test files exist for `pinky`.

## See also

- [who](who.md) for similar user information
