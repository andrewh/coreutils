# GNU coreutils internals

This documentation describes the internal implementation of GNU coreutils programs. Each page documents where a program's code lives, what its key functions do, and which tests verify it. This material is for developers working with the C source code. It complements but does not replace the official user manual, which is available via `info coreutils` and generated from `doc/coreutils.texi`.

!!! note "Status of these notes"
    These notes are not part of upstream GNU coreutils. Each page was checked
    against the sources at commit `97017cfbd`. Function names and line numbers
    (for example `src/head.c:1040`) refer to that commit. Line numbers drift
    as upstream changes, so search for the function name if a number is off.

    If a page and the code disagree, the code is correct. The authoritative
    description of what a program does is its `--help` output and the
    Texinfo manual.

## Where to start

| If you want to... | Read |
|---|---|
| Find your way around the tree | [Source layout](overview/source-layout.md) |
| Understand the boilerplate every program shares | [Program skeleton](overview/program-skeleton.md) |
| Learn the shared modules (`copy.c`, `remove.c`, `system.h`, gnulib) | [Shared infrastructure](overview/shared-infrastructure.md) |
| Build one program and run its tests | [Building and testing](overview/build-and-test.md) |
| Read about one program | [Command index](commands/index.md) |
| Add or fix a page | [Writing a page](overview/page-template.md) |

## Browsing these docs locally

Run this command from the top of the repository. You need
[uv](https://docs.astral.sh/uv/) but no global Python packages:

```sh
uvx --with-requirements docs/requirements.txt mkdocs serve
```

Then open <http://127.0.0.1:8000/>. To build a static copy in `site/`, use
`mkdocs build` in place of `mkdocs serve`.
