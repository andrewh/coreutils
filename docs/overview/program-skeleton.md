# Program skeleton

Nearly every program in `src/` has the same outline. If you know the outline,
you can skip the boilerplate and find the logic that makes each program
different. The examples on this page come from `src/hostname.c` (112 lines)
and `src/head.c`.

## Outline of a program file

The order of a typical `src/PROGRAM.c` is:

1. `#include <config.h>` first, then system headers, then `"system.h"`, then
   gnulib headers such as `"quote.h"` or `"xdectoint.h"`.
2. `#define PROGRAM_NAME "head"` and `#define AUTHORS proper_name (...)`.
3. File-scope `static` variables for the option settings.
4. An `enum` of long-only options. These start at `CHAR_MAX + 1` so they
   cannot clash with a short option letter.
5. `static struct option const long_options[]` for `getopt_long`.
6. `void usage (int status)`, which prints `--help` or the "Try ... --help"
   hint and then calls `exit`.
7. Helper functions. Most return `bool`, where `true` means success.
8. `int main (int argc, char **argv)`.

## Start-up sequence

Every `main` starts with these lines (`src/hostname.c:77-83`):

```c
initialize_main (&argc, &argv);
set_program_name (argv[0]);
setlocale (LC_ALL, "");
bindtextdomain (PACKAGE, LOCALEDIR);
textdomain (PACKAGE);

atexit (close_stdout);
```

| Call | Purpose |
|---|---|
| `initialize_main` | A hook for platforms that must change `argv` (for example, wildcard expansion on VMS). It does nothing on POSIX systems. |
| `set_program_name` | Saves `argv[0]` for diagnostics (gnulib `progname`). |
| `setlocale`, `bindtextdomain`, `textdomain` | Turn on locale-aware behaviour and translated messages. |
| `atexit (close_stdout)` | When the program exits, close standard output and check for errors. If a write failed (for example the disk is full or the output is `/dev/full`), print a diagnostic and exit with a failure status. This is why most programs do not check each `printf`. |

`cp`, `mv`, `rm`, `ln` and `install` use `atexit (close_stdin)` in place of
`close_stdout`. They can read answers to `-i` prompts from standard input.
`close_stdin` also closes standard output, so write errors are still found.

## Option parsing

Two styles are used.

**Programs with no options of their own** (`hostname`, `uptime`, `logname`,
`whoami`, ...) call:

```c
parse_gnu_standard_options_only (argc, argv, PROGRAM_NAME, PACKAGE_NAME,
                                 Version, true, usage, AUTHORS,
                                 (char const *) NULL);
```

This gnulib function (`long-options.h`) handles only `--help` and
`--version`. It also accepts `--` and rejects any other option.

**All other programs** loop on `getopt_long`, as `src/head.c:1014-1061`
does:

```c
while ((c = getopt_long (argc, argv, "c:n:qvz0123456789",
                         long_options, NULL)) != -1)
  switch (c)
    {
    case 'c': ...
    case_GETOPT_HELP_CHAR;
    case_GETOPT_VERSION_CHAR (PROGRAM_NAME, AUTHORS);
    default:
      usage (EXIT_FAILURE);
    }
```

`src/system.h` gives the shared pieces:

| Macro | Expands to |
|---|---|
| `GETOPT_HELP_OPTION_DECL` | `"help", no_argument, NULL, GETOPT_HELP_CHAR` |
| `GETOPT_VERSION_OPTION_DECL` | `"version", no_argument, NULL, GETOPT_VERSION_CHAR` |
| `GETOPT_SELINUX_CONTEXT_OPTION_DECL` | `"context", optional_argument, NULL, 'Z'` |
| `case_GETOPT_HELP_CHAR` | `case GETOPT_HELP_CHAR: usage (EXIT_SUCCESS);` |
| `case_GETOPT_VERSION_CHAR(name, authors)` | Calls `version_etc` and exits with success. |

`GETOPT_HELP_CHAR` and `GETOPT_VERSION_CHAR` are `CHAR_MIN - 2` and
`CHAR_MIN - 3`, so they cannot clash with real option characters.

Some programs also accept an obsolete syntax before `getopt_long` runs.
For example, `head -5` and `head -5c` are handled by hand at
`src/head.c:946-1012`. Then `argv` is shifted so that `getopt_long` never
sees the old-style argument.

## `--help` output

`usage()` prints text with `printf`, `oputs` and `oprintf` (all in
`src/system.h`). `oputs` prints one option description. When
`MANUAL_URL` or `BOLD_MAN_REFS` is defined at build time and standard output
is a terminal, it can add bold text and hyperlinks to the manual. Shared notes
come from helpers such as `emit_stdin_note()`, `emit_mandatory_arg_note()`,
`emit_size_note()` and `emit_backup_suffix_note()`. `emit_ancillary_info()`
prints the bug-report address and the `info '(coreutils) PROGRAM
invocation'` line.

The man pages are made from this output, so `usage()` is the
source of the man page text too.

## Diagnostics and quoting

Programs report errors with gnulib's `error (status, errnum, format, ...)`.
A status of `0` prints the message and continues. A non-zero status prints
the message and exits.

File names in messages are always quoted with one of these macros from
`src/system.h`:

| Macro | Quoting style | Use |
|---|---|---|
| `quoteaf (name)` | `shell_escape_always_quoting_style` | When the name is surrounded by other words, as in `cannot open 'x y' for reading`. |
| `quotef (name)` | `shell_escape_quoting_style`, also quotes colons | When the name comes before a colon, as in `x: file has shrunk too much`. |
| `quote (str)` | gnulib `quote` | For strings that are not file names, such as bad option values. |

Messages are marked for translation with `_("...")`. `N_("...")` marks a
string without translating it at that point.

## Exit status

| Value | Meaning |
|---|---|
| `EXIT_SUCCESS` (0) | Success. |
| `EXIT_FAILURE` (1) | Any error, for most programs. |
| 2 or 3 | Serious trouble, in programs where 1 has another meaning. Examples: `ls` (`LS_FAILURE` = 2; 1 means a minor problem), `sort` (`SORT_FAILURE` = 2; 1 means `-c` found disorder), `test` and `expr` (2 for errors, 3 for `expr` internal errors), `tty` (`TTY_WRITE_ERROR` = 3). |
| `EXIT_TIMEDOUT` (124) | `timeout` only. |
| `EXIT_CANCELED` (125) | `env`, `nice`, `stdbuf`, `timeout`, `chroot`, `runcon`: the program failed before it could run the command. `nohup` uses 125 or 127, depending on `POSIXLY_CORRECT`. |
| `EXIT_CANNOT_INVOKE` (126) | The command was found but could not be run. |
| `EXIT_ENOENT` (127) | The command was not found. |

When a program's failure status is not 1, `main` calls
`initialize_exit_failure (STATUS)` early. For example, `sort` passes
`SORT_FAILURE` and `env` passes `EXIT_CANCELED`. This sets gnulib's
`exit_failure` variable. Then gnulib's "x" functions (such as `xmalloc`) and
`close_stdout` exit with that status when they fail.

`main` usually ends with `main_exit (status)` or `return status`.
`main_exit` is the same as `return` unless the build defines `lint`. Then it
calls `exit`, which stops some sanitizer warnings.

## Memory and integers

- `xmalloc`, `xnmalloc`, `xcharalloc`, `xstrdup` and friends (gnulib
  `xalloc`) never return `NULL`. On failure they print "memory exhausted"
  and exit.
- Sizes and counts use `idx_t` (a signed `ptrdiff_t`) in new code, so that
  overflow can be detected. `ckd_add`, `ckd_sub` and `ckd_mul` (from
  `<stdckdint.h>`) do arithmetic that reports overflow.
- Numbers on the command line are parsed with `xdectoumax`, `xnumtoumax`
  or `xstrtoumax`, which accept suffixes such as `K`, `M` and `KiB`.
