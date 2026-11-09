# Building and testing

This page shows how to build coreutils from a Git checkout, rebuild one
program, and run one test. The source for these steps is `README-hacking`,
`HACKING` and `tests/local.mk`.

## First build from Git

A Git checkout does not include generated files such as `configure` or the
gnulib modules in `lib/`. `./bootstrap` makes them. It needs Autoconf,
Automake, Gettext, Git, Gperf, Texinfo and others. `README-prereq` lists
the versions.

```sh
./bootstrap                  # fetch gnulib, run autoreconf
./configure --quiet          # add --disable-gcc-warnings if -Werror trips
make -j"$(nproc)"            # on macOS: make -j"$(sysctl -n hw.ncpu)"
```

`make -f cfg.mk` runs all three steps. A build from Git turns on many GCC
warnings and makes them errors. If a new compiler adds a warning, use
`./configure --disable-gcc-warnings` or `make WERROR_CFLAGS=`.

Useful `configure` options:

| Option | Effect |
|---|---|
| `--enable-install-program=hostname,uptime,arch,kill` | Build programs that are off by default. |
| `--enable-no-install-program=PROG,...` | Skip programs. |
| `--enable-single-binary[=shebangs\|symlinks\|hardlinks]` | Build one multi-call `src/coreutils` binary. |
| `--without-selinux`, `--disable-acl`, `--disable-xattr` | Turn off optional features. |

## Rebuilding one program

```sh
make src/head
./src/head --version
```

The programs are built in `src/` and are not installed. Tests run them from
there.

## Running tests

Tests are shell scripts (`.sh`) or Perl scripts (`.pl`, and `.xpl` for
Perl's taint mode). Most are in `tests/PROGRAM/`. They are listed in
`all_tests` in `tests/local.mk`. Automake's parallel test harness runs them.

Run one test:

```sh
make check TESTS=tests/head/head-c.sh VERBOSE=yes SUBDIRS=.
```

`SUBDIRS=.` skips the gnulib tests in `gnulib-tests/`. `VERBOSE=yes` prints
the test log if the test fails.

Run every test for one program:

```sh
make check TESTS="$(echo tests/sort/*.sh tests/sort/*.pl)" SUBDIRS=.
```

Other targets and variables:

| Command or variable | Effect |
|---|---|
| `make check` | All tests, including gnulib's. |
| `make check RUN_EXPENSIVE_TESTS=yes` | Also run slow tests (`expensive_` in the script). |
| `make check RUN_VERY_EXPENSIVE_TESTS=yes` | Also run very slow tests. |
| `sudo env PATH="$PATH" NON_ROOT_USERNAME=$USER make check-root` | Tests that need root (`all_root_tests`). |
| `DEBUG=yes` | More output from Perl tests. |
| `make syntax-check` | Style and policy checks from `cfg.mk` and gnulib's `maint.mk`. |

### Shell test layout

A shell test starts like this (`tests/head/head-c.sh`):

```sh
. "${srcdir=.}/tests/init.sh"; path_prepend_ ./src
print_ver_ head
getlimits_

echo abc > in || framework_failure_
(head -c1; head -c1) < in > out || fail=1
compare exp out || fail=1

Exit $fail
```

The helpers come from `tests/init.sh` (copied from gnulib) and `init.cfg`:

| Helper | Purpose |
|---|---|
| `print_ver_ PROG` | Print the version. The test is skipped if `PROG` was not built. |
| `path_prepend_ ./src` | Put the programs you just built first on `PATH`. |
| `getlimits_` | Set variables such as `$SSIZE_MAX` and `$UINTMAX_OFLOW` from `src/getlimits`. |
| `framework_failure_` | The test setup failed (status 99, "hard error"). |
| `skip_ "reason"` | Skip the test (status 77). |
| `fail=1` | Mark a failure but keep going. |
| `compare exp out` | Like `cmp`, but prints a diff on failure. |
| `returns_ N cmd ...` | Pass only if `cmd` exits with status `N`. |
| `require_root_`, `require_selinux_`, `require_valgrind_`, ... | Skip the test unless the condition holds. |

### Perl test layout

Perl tests (for example `tests/misc/basename.pl`) make a table of cases and
pass it to `run_tests` from `tests/Coreutils.pm`:

```perl
my @Tests =
    (
     ['fail-1', {ERR => "$prog: missing operand\n"}, {EXIT => 1}],
     ['a', qw(d/f), {OUT => 'f'}],
    );
my $fail = run_tests ($program_name, $prog, \@Tests, $save_temps, $verbose);
```

Each case names the arguments, input files (`IN`), and the expected standard
output (`OUT`), standard error (`ERR`) and exit status (`EXIT`).

## Changing code

Before you send a patch, read `HACKING`. The main rules are:

- GNU coding style, spaces (no tabs) in C, 80 columns.
- Every user-visible change needs a `NEWS` entry and an update to
  `doc/coreutils.texi`. A behaviour change also needs a test.
- Commit messages hold the ChangeLog entry. Begin the summary line with
  `program: ` (for example `head: fix ...`). Each changed file goes in a
  `* src/head.c (function): ...` line.
- Run `make syntax-check` and the tests for the program you changed.
