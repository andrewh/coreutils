# `chroot`: run command with different root directory

Source: `src/chroot.c` (440 lines) · Tests: `tests/chroot/` ·
Manual: `info '(coreutils) chroot invocation'`

`chroot` changes the root directory for a command using the `chroot` system
call, then changes to `/` inside that new root, and optionally sets user and group
credentials before executing the command. It looks up user and group
information both before and after the `chroot` call to handle different NSS
configurations inside the chroot.

## Options

The table lists `long_opts[]` (`src/chroot.c:54-62`) and the short-option
string `"+"`.

|| Option | Variables |
||---|---|
|| `--userspec=USER:GROUP` | `userspec`: user and group specification |
|| `--groups=G_LIST` | `groups`: comma-separated supplementary groups |
|| `--skip-chdir` | `skip_chdir`: skip `chdir` to `/` after chroot |

## Code map

|| Function | Location | Role |
||---|---|---|
|| `main` | `src/chroot.c:218` | Option parsing, user/group lookup (twice), `chroot`, `chdir`, set credentials, `execvp` |
|| `parse_additional_groups` | `:93` | Parse comma-separated group list to GID array |
|| `is_root` | `:169` | Check if a path resolves to `/` |
|| `usage` | `:178` | Help message |

## How it works

```mermaid
flowchart TD
    A[parse options] --> B[get NEWROOT from argv]
    B --> C[is_root NEWROOT?]
    C -- yes --> D[skip pre-chroot user lookup]
    C -- no --> E{userspec?}
    E -- yes --> F[parse_user_spec outside chroot]
    E -- no --> G{uid set and no groups or gid unset?}
    G -- yes --> H[getpwuid, infer gid and username]
    G -- no --> I{groups specified?}
    I -- yes --> J[parse_additional_groups outside chroot]
    I -- no --> K{xgetgroups for username]
    F --> L
    H --> L
    J --> L
    K --> L
    D --> M[chroot NEWROOT]
    L --> M
    M --> N{skip_chdir?}
    N -- no --> O[chdir /]
    N -- yes --> P
    O --> P{command given?}
    P -- no --> Q[run SHELL -i]
    P -- yes --> R[use argv command]
    Q --> S
    R --> S{userspec?}
    S -- yes --> T[parse_user_spec_warn inside chroot]
    S -- no --> U{uid set and no groups or gid unset or gid inferred?}
    U -- yes --> V[getpwuid inside chroot, set gid and username]
    U -- no --> W
    T --> W{groups specified?}
    W -- yes --> X[parse_additional_groups inside chroot]
    W -- no --> Y{no groups and gid set and username?}
    Y -- yes --> Z[xgetgroups inside chroot]
    Y -- no --> AA[use pre-chroot GIDs]
    X --> AB[use in-gids or out-gids]
    Z --> AB
    AA --> AB
    V --> AB
    AB --> AC[setgroups]
    AC --> AD[setgid]
    AD --> AE[setuid]
    AE --> AF[execvp command]
```

### Dual user/group lookup

User and group information is looked up twice (`src/chroot.c:296-420`):

1. **Before `chroot`:** Loads NSS plugins and provides fallback values if the
   chroot lacks a working user database.
2. **After `chroot`:** Redoes the lookup with the chroot's `/etc/passwd` and
   `/etc/group`. This is the primary reason `chroot` has `--userspec` instead of
   delegating to `su` or `sudo`.

For `--userspec`, `parse_user_spec` is called before `chroot` with errors
ignored (`src/chroot.c:304`). After `chroot`, `parse_user_spec_warn` is called
with errors reported (`src/chroot.c:365-368`). For supplementary groups,
`parse_additional_groups` is called before `chroot` with `show_errors=false`,
and after with `show_errors=true` unless the pre-chroot lookup succeeded
(`src/chroot.c:394-399`).

### Group list parsing

`parse_additional_groups` splits the comma-separated list with `strtok`
(`src/chroot.c:102`). Each token is parsed:

- First, try `xstrtoumax` to parse as a numeric GID.
- If the string has a `+` suffix, treat it as a group name instead.
- If numeric parsing fails, look up the name with `getgrnam`.
- If the name is numeric but exists as a group, use the group's GID.

The function allocates a GID array with `xpalloc` and returns it in `*pgids`
(`src/chroot.c:93-162`). An empty list is an error.

### Supplementary groups from user

If `--groups` is not given but a user is specified, `chroot` calls
`xgetgroups` to get the user's supplementary groups (`src/chroot.c:329-333`
before chroot, `src/chroot.c:405-419` after). This requires `HAVE_SETGROUPS`.

### Command execution

After setting credentials, `main` calls `execvp` (`src/chroot.c:435`). If no
command is given, it runs `$SHELL -i` (default `/bin/sh -i`) by modifying `argv`
directly (`src/chroot.c:344-358`). On exec failure, it returns `EXIT_ENOENT`
(127) for `ENOENT`, otherwise `EXIT_CANNOT_INVOKE` (126).

## Platform notes

`chroot` requires the `chroot` system call, which is not available on all
systems. Platforms without `setgroups` use a stub that returns success for
clearing groups but `ENOTSUP` for setting them (`src/chroot.c:64-82`).
`--skip-chdir` is allowed only when NEWROOT is already `/` (`src/chroot.c:288`).

## Errors and exit status

- **Missing NEWROOT:** "missing operand"
- **`chroot` failure:** "cannot change root directory to NEWROOT" (exit 125)
- **`chdir` failure:** "cannot chdir to root directory" (exit 125)
- **Invalid group:** "invalid group GROUP"
- **Invalid group list:** "invalid group list G_LIST"
- **User/group lookup failure:** Diagnosed by `parse_user_spec_warn`
- **`setgroups` failure:** "failed to set supplemental groups" (exit 125)
- **`setgid` failure:** "failed to set group-ID" (exit 125)
- **`setuid` failure:** "failed to set user-ID" (exit 125)
- **Exec failure:** "failed to run command" (exit 126 for most errors, 127 for ENOENT)

## Tests

|| File | Covers |
||---|---|
|| `tests/chroot/chroot-credentials.sh` | User and group credential changes |
|| `tests/chroot/chroot-fail.sh` | Error cases and invalid options |

## See also

- [env](env.md) for setting environment variables
- [su](https://man7.org/linux/man-pages/man1/su.1.html) (external) for changing users

## Source code

`src/chroot.c:1`

```c
/* chroot -- run command or shell with special root directory
   Copyright (C) 1995-2026 Free Software Foundation, Inc.

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

/* Written by Roland McGrath.  */

#include <config.h>
#include <getopt.h>
#include <stdio.h>
#include <sys/types.h>
#include <pwd.h>
#include <grp.h>

#include "system.h"
#include "ignore-value.h"
#include "mgetgroups.h"
#include "quote.h"
#include "userspec.h"
#include "xstrtol.h"

/* The official name of this program (e.g., no 'g' prefix).  */
#define PROGRAM_NAME "chroot"

#define AUTHORS proper_name ("Roland McGrath")

#ifndef MAXGID
# define MAXGID GID_T_MAX
#endif

static inline bool uid_unset (uid_t uid) { return uid == (uid_t) -1; }
static inline bool gid_unset (gid_t gid) { return gid == (gid_t) -1; }
#define uid_set(x) (!uid_unset (x))
#define gid_set(x) (!gid_unset (x))

enum
{
  GROUPS = UCHAR_MAX + 1,
  USERSPEC,
  SKIP_CHDIR
};

static struct option const long_opts[] =
{
  {"groups", required_argument, NULL, GROUPS},
  {"userspec", required_argument, NULL, USERSPEC},
  {"skip-chdir", no_argument, NULL, SKIP_CHDIR},
  {GETOPT_HELP_OPTION_DECL},
  {GETOPT_VERSION_OPTION_DECL},
  {NULL, 0, NULL, 0}
};

#if ! HAVE_SETGROUPS
/* At least Interix lacks supplemental group support.  */
static int
setgroups (size_t size, MAYBE_UNUSED gid_t const *list)
{
  if (size == 0)
    {
      /* Return success when clearing supplemental groups
         as ! HAVE_SETGROUPS should only be the case on
         platforms that don't support supplemental groups.  */
      return 0;
    }
  else
    {
      errno = ENOTSUP;
      return -1;
    }
}
#endif

/* Determine the group IDs for the specified supplementary GROUPS,
   which is a comma separated list of supplementary groups (names or numbers).
   Allocate an array for the parsed IDs and store it in PGIDS,
   which may be allocated even on parse failure.
   Update the number of parsed groups in PN_GIDS on success.
   Upon any failure return nonzero, and issue diagnostic if SHOW_ERRORS is true.
   Otherwise return zero.  */

static int
parse_additional_groups (char const *groups, GETGROUPS_T **pgids,
                         idx_t *pn_gids, bool show_errors)
{
  GETGROUPS_T *gids = NULL;
  idx_t n_gids_allocated = 0;
  idx_t n_gids = 0;
  char *buffer = xstrdup (groups);
  int ret = 0;

  for (char const *tmp = strtok (buffer, ","); tmp;
       tmp = strtok (NULL, ","))
    {
      struct group *g;
      uintmax_t value;

      if (xstrtoumax (tmp, NULL, 10, &value, "") == LONGINT_OK
          && value <= MAXGID)
        {
          while (isspace (to_uchar (*tmp)))
            tmp++;
          if (*tmp != '+')
            {
              /* Handle the case where the name is numeric.  */
              g = getgrnam (tmp);
              if (g != NULL)
                value = g->gr_gid;
            }
          /* Flag that we've got a group from the number.  */
          g = (struct group *) (intptr_t) ! NULL;
        }
      else
        {
          g = getgrnam (tmp);
          if (g != NULL)
            value = g->gr_gid;
        }

      if (g == NULL)
        {
          ret = -1;

          if (show_errors)
            {
              error (0, errno, _("invalid group %s"), quote (tmp));
              continue;
            }

          break;
        }

      if (n_gids == n_gids_allocated)
        gids = xpalloc (gids, &n_gids_allocated, 1, -1, sizeof *gids);
      gids[n_gids++] = value;
    }

  if (ret == 0 && n_gids == 0)
    {
      if (show_errors)
        error (0, 0, _("invalid group list %s"), quote (groups));
      ret = -1;
    }

  *pgids = gids;

  if (ret == 0)
    *pn_gids = n_gids;

  free (buffer);
  return ret;
}

/* Return whether the passed path is equivalent to "/".
   Note we don't compare against get_root_dev_ino() as "/"
   could be bind mounted to a separate location.  */

static bool
is_root (char const *dir)
{
  char *resolved = canonicalize_file_name (dir);
  bool is_res_root = resolved && streq ("/", resolved);
  free (resolved);
  return is_res_root;
}

void
usage (int status)
{
  if (status != EXIT_SUCCESS)
    emit_try_help ();
  else
    {
      printf (_("\
Usage: %s [OPTION]... NEWROOT [COMMAND [ARG]...]\n"), program_name);

      fputs (_("\
Run COMMAND with root directory set to NEWROOT.\n\
\n\
"), stdout);

      oputs (_("\
      --groups=G_LIST\n\
         specify supplementary groups as g1,g2,..,gN\n\
"));
      oputs (_("\
      --userspec=USER:GROUP\n\
         specify user and group (ID or name) to use\n\
"));
      oprintf (_("\
      --skip-chdir\n\
         do not change working directory to %s\n\
"), quoteaf ("/"));

      oputs (HELP_OPTION_DESCRIPTION);
      oputs (VERSION_OPTION_DESCRIPTION);
      fputs (_("\
\n\
If no command is given, run '\"$SHELL\" -i' (default: '/bin/sh -i').\n\
"), stdout);
      emit_exec_status (PROGRAM_NAME);
      emit_ancillary_info (PROGRAM_NAME);
    }
  exit (status);
}

int
main (int argc, char **argv)
{
  int c;

  /* Input user and groups spec.  */
  char *userspec = NULL;
  char const *username = NULL;
  char const *groups = NULL;
  bool skip_chdir = false;

  /* Parsed user and group IDs.  */
  uid_t uid = -1;
  gid_t gid = -1;
  /* Whether GID was inferred from UID outside the chroot,
     in which case a look-up inside the chroot takes precedence.  */
  bool gid_inferred = false;
  GETGROUPS_T *out_gids = NULL;
  idx_t n_gids = 0;

  initialize_main (&argc, &argv);
  set_program_name (argv[0]);
  setlocale (LC_ALL, "");
  bindtextdomain (PACKAGE, LOCALEDIR);
  textdomain (PACKAGE);

  initialize_exit_failure (EXIT_CANCELED);
  atexit (close_stdout);

  while ((c = getopt_long (argc, argv, "+", long_opts, NULL)) != -1)
    {
      switch (c)
        {
        case USERSPEC:
          {
            userspec = optarg;
            /* Treat 'user:' just like 'user'
               as we lookup the primary group by default
               (and support doing so for UIDs as well as names.  */
            idx_t userlen = strlen (userspec);
            if (userlen && userspec[userlen - 1] == ':')
              userspec[userlen - 1] = '\0';
            break;
          }

        case GROUPS:
          groups = optarg;
          break;

        case SKIP_CHDIR:
          skip_chdir = true;
          break;

        case_GETOPT_HELP_CHAR;

        case_GETOPT_VERSION_CHAR (PROGRAM_NAME, AUTHORS);

        default:
          usage (EXIT_CANCELED);
        }
    }

  if (argc <= optind)
    {
      error (0, 0, _("missing operand"));
      usage (EXIT_CANCELED);
    }

  char const *newroot = argv[optind];
  bool is_oldroot = is_root (newroot);

  if (! is_oldroot && skip_chdir)
    {
      error (0, 0, _("option --skip-chdir only permitted if NEWROOT is old %s"),
             quoteaf ("/"));
      usage (EXIT_CANCELED);
    }

  if (! is_oldroot)
    {
      /* We have to look up users and groups twice.
        - First, outside the chroot to load potentially necessary passwd/group
          parsing plugins (e.g. NSS);
        - Second, inside chroot to redo parsing in case IDs are different.
          Within chroot lookup is the main justification for having
          the --user option supported by the chroot command itself.  */
      if (userspec)
        ignore_value (parse_user_spec (userspec, &uid, &gid, NULL, NULL));

      /* If no gid is supplied or looked up, do so now.
        Also lookup the username for use with getgroups.  */
      if (uid_set (uid) && (! groups || gid_unset (gid)))
        {
          const struct passwd *pwd;
          if ((pwd = getpwuid (uid)))
            {
              if (gid_unset (gid))
                {
                  gid = pwd->pw_gid;
                  gid_inferred = true;
                }
              /* Copy, as the look-up inside the chroot reuses PWD's
                 storage, even when it fails.  */
              username = xstrdup (pwd->pw_name);
            }
        }

      if (groups && *groups)
        ignore_value (parse_additional_groups (groups, &out_gids, &n_gids,
                                               false));
#if HAVE_SETGROUPS
      else if (! groups && gid_set (gid) && username)
        {
          int ngroups = xgetgroups (username, gid, &out_gids);
          if (0 < ngroups)
            n_gids = ngroups;
        }
#endif
    }

  if (chroot (newroot) != 0)
    error (EXIT_CANCELED, errno, _("cannot change root directory to %s"),
           quoteaf (newroot));

  if (! skip_chdir && chdir ("/"))
    error (EXIT_CANCELED, errno, _("cannot chdir to root directory"));

  if (argc == optind + 1)
    {
      /* No command.  Run an interactive shell.  */
      char *shell = getenv ("SHELL");
      if (shell == NULL)
        shell = bad_cast ("/bin/sh");
      argv[0] = shell;
      argv[1] = bad_cast ("-i");
      argv[2] = NULL;
    }
  else
    {
      /* The following arguments give the command.  */
      argv += optind + 1;
    }

  /* Attempt to set all three: supplementary groups, group ID, user ID.
     Diagnose any failures.  If any have failed, exit before execvp.  */
  if (userspec)
    {
      bool warn;
      char const *err = parse_user_spec_warn (userspec, &uid, &gid,
                                              NULL, NULL, &warn);
      if (err)
        error (warn ? 0 : EXIT_CANCELED, 0, "%s", (err));
    }

  /* If no gid is supplied or looked up, do so now.
     Also lookup the username for use with getgroups.  */
  if (uid_set (uid) && (! groups || gid_unset (gid) || gid_inferred))
    {
      const struct passwd *pwd;
      if ((pwd = getpwuid (uid)))
        {
          if (gid_unset (gid) || gid_inferred)
            gid = pwd->pw_gid;
          username = pwd->pw_name;
        }
      else if (gid_unset (gid))
        {
          error (EXIT_CANCELED, errno,
                 _("no group specified for unknown uid: %ju"),
                 (uintmax_t) uid);
        }
    }

  GETGROUPS_T *gids = out_gids;
  GETGROUPS_T *in_gids = NULL;
  if (groups && *groups)
    {
      if (parse_additional_groups (groups, &in_gids, &n_gids, !n_gids) != 0)
        {
          if (! n_gids)
            return EXIT_CANCELED;
          /* else look-up outside the chroot worked, then go with those.  */
        }
      else
        gids = in_gids;
    }
#if HAVE_SETGROUPS
  else if (! groups && gid_set (gid) && username)
    {
      int ngroups = xgetgroups (username, gid, &in_gids);
      if (ngroups <= 0)
        {
          if (! n_gids)
            error (EXIT_CANCELED, errno,
                   _("failed to get supplemental groups"));
          /* else look-up outside the chroot worked, then go with those.  */
        }
      else
        {
          n_gids = ngroups;
          gids = in_gids;
        }
    }
#endif

  if ((uid_set (uid) || groups) && setgroups (n_gids, gids) != 0)
    error (EXIT_CANCELED, errno, _("failed to set supplemental groups"));

  free (in_gids);
  free (out_gids);

  if (gid_set (gid) && setgid (gid))
    error (EXIT_CANCELED, errno, _("failed to set group-ID"));

  if (uid_set (uid) && setuid (uid))
    error (EXIT_CANCELED, errno, _("failed to set user-ID"));

  /* Execute the given command.  */
  execvp (argv[0], argv);

  int exit_status = errno == ENOENT ? EXIT_ENOENT : EXIT_CANNOT_INVOKE;
  error (0, errno, _("failed to run command %s"), quote (argv[0]));
  return exit_status;
}
```
