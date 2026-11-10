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

## Source code

`src/printenv.c:1`

```c
/* printenv -- print all or part of environment
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

/* Usage: printenv [variable...]

   If no arguments are given, print the entire environment.
   If one or more variable names are given, print the value of
   each one that is set, and nothing for ones that are not set.

   Exit status:
   0 if all variables specified were found
   1 if not
   2 if some other error occurred

   David MacKenzie and Richard Mlynarik */

#include <config.h>
#include <stdio.h>
#include <sys/types.h>
#include <getopt.h>

#include "argmatch.h"  /* argmatch($QUOTING_STYLE).  */
#include "system.h"
#include "printenv.h"
#include "xbinary-io.h"

/* Exit status for syntax errors, etc.  */
enum { PRINTENV_FAILURE = 2 };

/* The official name of this program (e.g., no 'g' prefix).  */
#define PROGRAM_NAME "printenv"

#define AUTHORS \
  proper_name ("David MacKenzie"), \
  proper_name ("Richard Mlynarik")

/* For long options that have no equivalent short option, use a
   non-character as a pseudo short option, starting with CHAR_MAX + 1.  */
enum
{
  QUOTING_STYLE_OPTION = CHAR_MAX + 1,
};

static struct option const longopts[] =
{
  {"null", no_argument, NULL, '0'},
  {"quoting-style", required_argument, NULL, QUOTING_STYLE_OPTION},
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
      printf (_("\
Usage: %s [OPTION] [VARIABLE]...\n\
Print the values of the specified environment VARIABLE(s).\n\
If no VARIABLE is specified, print name and value pairs for them all.\n\
\n\
"),
              program_name);
      oputs (_("\
  -0, --null\n\
         end each output line with NUL, not newline\n\
"));
      oputs (_("\
      --quoting-style=WORD\n\
         use quoting style WORD for names and values:\n\
           literal, locale, shell, shell-always,\n\
           shell-escape, shell-escape-always, c, escape\n\
"));
      oputs (HELP_OPTION_DESCRIPTION);
      oputs (VERSION_OPTION_DESCRIPTION);
      printf (USAGE_BUILTIN_WARNING, PROGRAM_NAME);
      emit_ancillary_info (PROGRAM_NAME);
    }
  exit (status);
}

int
main (int argc, char **argv)
{
  bool opt_nul_terminate_output = false;
  int quoting_style_opt = -1;

  initialize_main (&argc, &argv);
  set_program_name (argv[0]);
  setlocale (LC_ALL, "");
  bindtextdomain (PACKAGE, LOCALEDIR);
  textdomain (PACKAGE);

  initialize_exit_failure (PRINTENV_FAILURE);
  atexit (close_stdout);

  int optc;
  while ((optc = getopt_long (argc, argv, "+0", longopts, NULL)) != -1)
    {
      switch (optc)
        {
        case '0':
          opt_nul_terminate_output = true;
          quoting_style_opt = literal_quoting_style;
          break;
        case QUOTING_STYLE_OPTION:
          quoting_style_opt = XARGMATCH ("--quoting-style", optarg,
                                         quoting_style_args,
                                         quoting_style_vals);
          break;
        case_GETOPT_HELP_CHAR;
        case_GETOPT_VERSION_CHAR (PROGRAM_NAME, AUTHORS);
        default:
          usage (PRINTENV_FAILURE);
        }
    }

  bool quote_output = false;
  int qs = quoting_style_opt;
  if (qs < 0 && isatty (STDOUT_FILENO))
    {
      qs = getenv_quoting_style ();
      if (qs < 0)
        qs = shell_escape_quoting_style;
    }
  if (0 <= qs && qs != literal_quoting_style)
    {
      set_quoting_style (NULL, qs);
      quote_output = true;
    }

  idx_t const n_args = argc - optind;
  bool ok;
  char const terminator = opt_nul_terminate_output ? '\0' : '\n';

  if (opt_nul_terminate_output)
    xset_binary_mode (STDOUT_FILENO, O_BINARY);

  if (n_args <= 0)
    {
      for (char **env = environ; *env != NULL; ++env)
        print_envvar (*env, terminator, quote_output);
      ok = true;
    }
  else
    {
      int matches = 0;

      for (int i = optind; i < argc; ++i)
        {
          bool matched = false;

          /* 'printenv a=b' is silent, even if 'a=b=c' is in environ.  */
          if (strchr (argv[i], '='))
            continue;

          for (char **env = environ; *env; ++env)
            {
              char const *ep = *env;
              char const *ap = argv[i];
              while (*ep != '\0' && *ap != '\0' && *ep++ == *ap++)
                {
                  if (*ep == '=' && *ap == '\0')
                    {
                      char const *val = ep + 1;
                      fputs (quote_output ? quoteN (val) : val, stdout);
                      putchar (terminator);
                      matched = true;
                      break;
                    }
                }
            }

          matches += matched;
        }

      ok = (matches == argc - optind);
    }

  return ok ? EXIT_SUCCESS : EXIT_FAILURE;
}
```
