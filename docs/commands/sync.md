# `sync`: synchronize cached writes

Source: `src/sync.c` (231 lines) · Tests: `tests/misc/sync.sh` ·
Manual: `info '(coreutils) sync invocation'`

`sync` synchronizes cached writes to persistent storage. With no arguments, it
calls `sync()` to flush all filesystems. With file arguments and options, it can
sync specific files or their filesystems using `fsync`, `fdatasync`, or `syncfs`.

## Options

The table lists `long_options[]` (`src/sync.c:46-53`) and short options.

|| Option | Variable |
||---|---|
|| `-d`, `--data` | `arg_data = true` (sync only file data) |
|| `-f`, `--file-system` | `arg_file_system = true` (sync filesystems) |

## Code map

|| Function | Location | Role |
||---|---|---|
|| `main` | `src/sync.c:167` | Option parsing, choose mode, call `sync` or `sync_arg` for each file. |
|| `sync_arg` | `:87` | Open file, clear O_NONBLOCK, call fsync/fdatasync/syncfs, close. |
|| `usage` | `:55` | Help text. |

## How it works

The diagram shows the mode selection and sync flow.

```mermaid
flowchart TD
    A[Parse options] --> B{args_specified?}
    B -- no --> C{arg_data?}
    C -- yes --> D[error --data needs argument]
    D --> E[usage EXIT_FAILURE]
    C -- no --> F{arg_file_system and !HAVE_SYNCFS?}
    F -- yes --> G[mode = MODE_SYNC]
    F -- no --> H{arg_file_system?}
    H -- yes --> I[mode = MODE_FILE_SYSTEM]
    H -- no --> J{arg_data?}
    J -- yes --> K[mode = MODE_DATA]
    J -- no --> L[mode = MODE_FILE]
    B -- yes --> M{arg_data and arg_file_system?}
    M -- yes --> N[error cannot specify both]
    N --> E
    M -- no --> H
    G --> O{mode == MODE_SYNC?}
    I --> O
    K --> O
    L --> O
    O -- yes --> P[sync]
    O -- no --> Q[Loop over files]
    Q --> R[sync_arg mode file]
    R --> S{more files?}
    S -- yes --> Q
    S -- no --> T{return ok ? EXIT_SUCCESS : EXIT_FAILURE]
    P --> T
```

### Mode selection

`main` chooses the sync mode based on options and arguments
(`src/sync.c:205-220`):

- No arguments: `MODE_SYNC` (call global `sync()`)
- `--file-system` without `HAVE_SYNCFS`: `MODE_SYNC` (fallback)
- `--file-system` with `HAVE_SYNCFS`: `MODE_FILE_SYSTEM` (use `syncfs`)
- `--data`: `MODE_DATA` (use `fdatasync`)
- Files without `--data`: `MODE_FILE` (use `fsync`)

### File sync

`sync_arg` (`src/sync.c:87-164`) handles per-file syncing:

1. Opens the file with `O_RDONLY | O_NONBLOCK` (or `O_WRONLY` on AIX/CYGWIN)
2. Clears `O_NONBLOCK` with `fcntl`
3. Calls `fsync`, `fdatasync`, or `syncfs` based on mode
4. Closes the file

## Platform notes

- `syncfs` is Linux-only (guarded by `HAVE_SYNCFS`)
- On AIX and CYGWIN, `fsync` requires write access, so `sync_arg` opens with
  `O_WRONLY` in `MODE_FILE` (`src/sync.c:92-96`)
- `O_NONBLOCK` is used initially to avoid hanging on fifos

## Errors and exit status

- `--data` and `--file-system` together: `error (EXIT_FAILURE, 0, ...)`
- `--data` without arguments: `error (EXIT_FAILURE, 0, ...)`
- Open/sync/close errors: `error (0, errno, ...)` (sets `ok = false`)
- Final exit status is `EXIT_SUCCESS` if all operations succeeded, otherwise
  `EXIT_FAILURE`

## Tests

|| File | Covers |
||---|---|
|| `tests/misc/sync.sh` | Various sync modes, error cases. |

## See also

- None directly related
