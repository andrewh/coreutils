# Overview

This section covers what all coreutils programs share. Read it before the
per-command pages, because those pages assume you know these terms.

- [Source layout](source-layout.md): the directories in the tree and how a
  program's source files are listed in `src/local.mk`.
- [Program skeleton](program-skeleton.md): the start-up code, option
  parsing, `--help`/`--version`, error reporting and exit statuses that
  nearly every program uses.
- [Shared infrastructure](shared-infrastructure.md): the modules that more
  than one program links, such as `copy.c`, `remove.c` and `ioblksize.h`,
  and the gnulib modules they depend on.
- [Building and testing](build-and-test.md): how to bootstrap, build one
  program, run one test, and run the style checks.
- [Writing a page](page-template.md): the layout every command page uses.
