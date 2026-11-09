# `groups`: print group memberships

Source: `src/groups.c` (144 lines) · Tests: `tests/groups/` ·
Manual: `info '(coreutils) groups invocation'`

`groups` prints the groups that a user belongs to. With no arguments, it prints
the groups for the current process. With one or more usernames, it prints the
groups for each specified user. The actual group lookup is done by the gnulib
`print_group_list` function.

## Options

No options other than `--help` and `--version`. Uses `getopt_long` with empty
short options (`src/groups.c:80-89`).

## Code map

|| Function | Location | Role |
||---|---|---|
|| `main` | `src/groups.c:67` | Get current or specified user's IDs, call `print_group_list`. |
|| `usage` | `:46` | Help text. |

## How it works

The diagram shows the two modes.

```mermaid
flowchart TD
    A[Parse options] --> B{optind == argc?}
    B -- yes --> C[No args - current process]
    C --> D[getuid, getegid, getgid]
    D --> E[print_group_list NULL]
    E --> F[putchar newline]
    B -- no --> G[Loop over usernames]
    G --> H[getpwnam username]
    H --> I{pwd == NULL?}
    I -- yes --> J[error no such user]
    I -- no --> K[printf username]
    K --> L[print_group_list username]
    L --> M[putchar newline]
    J --> N{more args?}
    M --> N
    N -- yes --> G
    N -- no --> O{return ok ? EXIT_SUCCESS : EXIT_FAILURE]
    F --> O
```

### Current process mode

With no arguments, `main` gets the real UID, effective GID, and real GID
(`src/groups.c:99-111`), then calls `print_group_list` with NULL as the username
(`src/groups.c:113`).

### Specified user mode

With arguments, `main` loops through each username (`src/groups.c:120-140`):

1. Calls `getpwnam` to look up the password entry
2. If not found, prints an error and continues
3. If found, prints the username, then calls `print_group_list` with the
   username and the user's UID/GID

The `print_group_list` function (gnulib) handles the actual group lookup and
formatting.

## Platform notes

None significant. Relies on POSIX `getuid`, `getgid`, `getegid`, `getpwnam`.

## Errors and exit status

- Cannot get real/real/effective ID: `error (EXIT_FAILURE, errno, ...)`
- No such user: `error (0, 0, ...)` (continues, sets `ok = false`)
- Write failure: `write_error()` (continues, sets `ok = false`)
- Final exit status is `EXIT_SUCCESS` if all operations succeeded, otherwise
  `EXIT_FAILURE`

## Tests

|| File | Covers |
||---|---|
|| `tests/groups/groups-version.sh` | `--version` option. |
|| `tests/groups/groups-process-all.sh` | Current process groups. |
|| `tests/groups/groups-dash.sh` | Username arguments. |

## See also

- [id](id.md) (print user and group IDs)
- [whoami](whoami.md) (print effective user name)
