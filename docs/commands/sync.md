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

## Source code

`src/sync.c:1`

```c
/* sync - update the super block
   Copyright (C) 1994-2026 Free Software Foundation, Inc.

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <https://www.gnu.org/licenses/>.  */

/* Written by Jim Meyering */

#include <config.h>
#include <getopt.h>
#include <stdio.h>
#include <sys/types.h>

#include "system.h"
#include "assure.h"

/* The official name of this program (e.g., no 'g' prefix).  */
#define PROGRAM_NAME "sync"

#define AUTHORS                                 \
  proper_name ("Jim Meyering"),                 \
  proper_name ("Giuseppe Scrivano")

#ifndef HAVE_SYNCFS
# define HAVE_SYNCFS 0
#endif

enum sync_mode
{
  MODE_FILE,
  MODE_DATA,
  MODE_FILE_SYSTEM,
  MODE_SYNC
};

static struct option const long_options[] =
{
  {"data", no_argument, NULL, 'd'},
  {"file-system", no_argument, NULL, 'f'},
  {GETOPT_HELP_OPTION_DECL},
  {GETOPT_VERSION_OPTION_DECL},
  {NULL, 0, NULL, 0}
};

void
usage (int status)
{
  if (status != EXIT_SUCCESS)
    emit_try_help ();
  else
    {
      printf (_("Usage: %s [OPTION] [FILE]...\n"), program_name);
      fputs (_("\
Synchronize cached writes to persistent storage\n\
\n\
If one or more files are specified, sync only them,\n\
or their containing file systems.\n\
\n\
"), stdout);

      oputs (_("\
  -d, --data             sync only file data, no unneeded metadata\n\
"));
      oputs (_("\
  -f, --file-system      sync the file systems that contain the files\n\
"));
      oputs (HELP_OPTION_DESCRIPTION);
      oputs (VERSION_OPTION_DESCRIPTION);
      emit_ancillary_info (PROGRAM_NAME);
    }
  exit (status);
}

/* Sync the specified FILE, or file systems associated with FILE.
   Return 1 on success.  */

static bool
sync_arg (enum sync_mode mode, char const *file)
{
  int open_flags = O_RDONLY | O_NONBLOCK;

#if defined _AIX || defined __CYGWIN__
  /* AIX 7.1, CYGWIN 2.9.0, fsync requires write access to file.  */
  if (mode == MODE_FILE)
    open_flags = O_WRONLY | O_NONBLOCK;
#endif

  /* Note O_PATH might be supported with syncfs(),
     though as of Linux 3.18 is not.  */
  int fd = open (file, open_flags);
  if (fd < 0)
    {
      /* Use the O_RDONLY errno, which is significant
         with directories for example.  */
      int rd_errno = errno;
      if (open_flags != (O_WRONLY | O_NONBLOCK))
        fd = open (file, O_WRONLY | O_NONBLOCK);
      if (fd < 0)
        {
          error (0, rd_errno, _("error opening %s"), quoteaf (file));
          return false;
        }
    }

  bool ret = true;
  /* We used O_NONBLOCK above to not hang with fifos,
     so reset that here.  */
  int fdflags = fcntl (fd, F_GETFL);
  if (fdflags == -1
      || fcntl (fd, F_SETFL, fdflags & ~O_NONBLOCK) < 0)
    {
      error (0, errno, _("couldn't reset non-blocking mode %s"),
             quoteaf (file));
      ret = false;
    }

  if (ret)
    {
      int sync_status = -1;

      switch (mode)
        {
        case MODE_DATA:
          sync_status = fdatasync (fd);
          break;

        case MODE_FILE:
          sync_status = fsync (fd);
          break;

        case MODE_FILE_SYSTEM:
#if HAVE_SYNCFS
          sync_status = syncfs (fd);
          break;
#endif
        case MODE_SYNC: default:
          affirm (false);
        }

      if (sync_status < 0)
        {
          error (0, errno, _("error syncing %s"), quoteaf (file));
          ret = false;
        }
    }

  if (close (fd) < 0)
    {
      error (0, errno, _("failed to close %s"), quoteaf (file));
      ret = false;
    }

  return ret;
}

int
main (int argc, char **argv)
{
  bool arg_data = false, arg_file_system = false;
  bool ok = true;

  initialize_main (&argc, &argv);
  set_program_name (argv[0]);
  setlocale (LC_ALL, "");
  bindtextdomain (PACKAGE, LOCALEDIR);
  textdomain (PACKAGE);

  atexit (close_stdout);

  int c;
  while ((c = getopt_long (argc, argv, "df", long_options, NULL))
         != -1)
    {
      switch (c)
        {
        case 'd':
          arg_data = true;
          break;

        case 'f':
          arg_file_system = true;
          break;

        case_GETOPT_HELP_CHAR;

        case_GETOPT_VERSION_CHAR (PROGRAM_NAME, AUTHORS);

        default:
          usage (EXIT_FAILURE);
        }
    }

  bool args_specified = optind < argc;

  if (arg_data && arg_file_system)
    error (EXIT_FAILURE, 0,
           _("cannot specify both --data and --file-system"));

  if (!args_specified && arg_data)
    error (EXIT_FAILURE, 0, _("--data needs at least one argument"));

  enum sync_mode mode;
  if (! args_specified || (arg_file_system && ! HAVE_SYNCFS))
    mode = MODE_SYNC;
  else if (arg_file_system)
    mode = MODE_FILE_SYSTEM;
  else if (! arg_data)
    mode = MODE_FILE;
  else
    mode = MODE_DATA;

  if (mode == MODE_SYNC)
    sync ();
  else
    {
      for (; optind < argc; optind++)
        ok &= sync_arg (mode, argv[optind]);
    }

  return ok ? EXIT_SUCCESS : EXIT_FAILURE;
}
```
