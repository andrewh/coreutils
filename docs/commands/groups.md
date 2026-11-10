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

## Source code

`src/groups.c:1`

```c
/* groups -- print the groups a user is in
   Copyright (C) 1989-2026 Free Software Foundation, Inc.

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

/* Written by James Youngman based on id.c and groups.sh,
   which were written by Arnold Robbins and David MacKenzie. */

#include <config.h>
#include <stdio.h>
#include <sys/types.h>
#include <pwd.h>
#include <grp.h>
#include <getopt.h>

#include "system.h"
#include "group-list.h"
#include "quote.h"

/* The official name of this program (e.g., no 'g' prefix).  */
#define PROGRAM_NAME "groups"

#define AUTHORS \
  proper_name ("David MacKenzie"), \
  proper_name ("James Youngman")


static struct option const longopts[] =
{
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
      printf (_("Usage: %s [OPTION]... [USERNAME]...\n"), program_name);
      fputs (_("\
Print group memberships for each USERNAME or, if no USERNAME is specified, for\
\n\
the current process (which may differ if the groups database has changed).\n"),
             stdout);
      oputs (HELP_OPTION_DESCRIPTION);
      oputs (VERSION_OPTION_DESCRIPTION);
      emit_ancillary_info (PROGRAM_NAME);
    }
  exit (status);
}

int
main (int argc, char **argv)
{
  initialize_main (&argc, &argv);
  set_program_name (argv[0]);
  setlocale (LC_ALL, "");
  bindtextdomain (PACKAGE, LOCALEDIR);
  textdomain (PACKAGE);

  atexit (close_stdout);

  /* Processing the arguments this way makes groups.c behave differently to
     groups.sh if one of the arguments is "--".  */
  int optc;
  while ((optc = getopt_long (argc, argv, "", longopts, NULL)) != -1)
    {
      switch (optc)
        {
        case_GETOPT_HELP_CHAR;
        case_GETOPT_VERSION_CHAR (PROGRAM_NAME, AUTHORS);
        default:
          usage (EXIT_FAILURE);
        }
    }

  bool ok = true;
  if (optind == argc)
    {
      /* No arguments.  Divulge the details of the current process. */
      uid_t NO_UID = -1;
      gid_t NO_GID = -1;

      errno = 0;
      uid_t ruid = getuid ();
      if (ruid == NO_UID && errno)
        error (EXIT_FAILURE, errno, _("cannot get real UID"));

      errno = 0;
      gid_t egid = getegid ();
      if (egid == NO_GID && errno)
        error (EXIT_FAILURE, errno, _("cannot get effective GID"));

      errno = 0;
      gid_t rgid = getgid ();
      if (rgid == NO_GID && errno)
        error (EXIT_FAILURE, errno, _("cannot get real GID"));

      if (!print_group_list (NULL, ruid, rgid, egid, true, ' '))
        ok = false;
      putchar ('\n');
    }
  else
    {
      /* At least one argument.  Divulge the details of the specified users.  */
      for ( ; optind < argc; optind++)
        {
          struct passwd *pwd = getpwnam (argv[optind]);
          if (pwd == NULL)
            {
              error (0, 0, _("%s: no such user"), quote (argv[optind]));
              ok = false;
              continue;
            }
          uid_t ruid = pwd->pw_uid;
          gid_t rgid = pwd->pw_gid;
          gid_t egid = rgid;

          printf ("%s : ", argv[optind]);
          if (!print_group_list (argv[optind], ruid, rgid, egid, true, ' '))
            ok = false;
          putchar ('\n');

          if (ferror (stdout))
            write_error ();
        }
    }

  return ok ? EXIT_SUCCESS : EXIT_FAILURE;
}
```
