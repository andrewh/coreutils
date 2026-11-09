# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the GNU coreutils project, which contains the union of GNU fileutils, sh-utils, and textutils packages. It provides the core UNIX utilities like `ls`, `cat`, `cp`, `sort`, `grep`, `wc`, and many others that form the foundation of Unix-like systems.

## Build System and Commands

### Initial Setup
```bash
# Bootstrap the build system (for git checkouts)
./bootstrap

# Configure the build
./configure

# Build everything
make

# Install (usually as root)
make install
```

### Common Development Commands

**Building:**
- `make` - Build all programs
- `make -j$(nproc)` - Build with parallel jobs
- `make src/PROGRAM` - Build a specific program (e.g., `make src/ls`)

**Testing:**
- `make check` - Run all tests
- `make check TESTS=tests/CATEGORY/test-name.sh VERBOSE=yes SUBDIRS=.` - Run specific test
- `make check-expensive` - Run expensive tests
- `make check-very-expensive` - Run very expensive tests

**Quality Checks:**
- `make syntax-check` - Run style and policy checks
- `make distcheck` - Comprehensive build and test verification

**Single Test Execution:**
```bash
# Run a specific test in isolation
make check TESTS=tests/misc/test-name.sh VERBOSE=yes SUBDIRS=.

# For perl tests, add DEBUG=yes for more detail
make check TESTS=tests/misc/test-name.pl VERBOSE=yes DEBUG=yes SUBDIRS=.
```

### Test Environment Variables
- `VERBOSE=yes` - Verbose test output
- `RUN_EXPENSIVE_TESTS=yes` - Run expensive tests
- `RUN_VERY_EXPENSIVE_TESTS=yes` - Run very expensive tests
- `SHELL=/bin/sh` - Shell to use for tests
- `NON_ROOT_USERNAME=nobody` - Non-root user for tests

## Code Architecture

### Source Organization
- **`src/`** - Main program source files (one `.c` file per utility) plus
  shared modules such as `copy.c`, `remove.c`, `chown-core.c`
- **`lib/`** - Gnulib modules, populated by `./bootstrap` (nearly empty in a
  fresh clone)
- **`gl/`** - Coreutils-specific modules packaged gnulib-style
  (`targetdir`, `xfts`, `root-dev-ino`, `randint`, ...)
- **`gnulib/`** - Gnulib git submodule
- **`tests/`** - Comprehensive test suite organized by utility
- **`man/`** - Man page templates (auto-generated from `--help`)
- **`doc/`** - Texinfo documentation (the user manual)
- **`docs/`** - Source-level internals notes, built with MkDocs (fork only)

### Key Architectural Patterns

**Single Binary Option:**
- Configure with `--enable-single-binary` to compile all tools into one binary
- Uses symlinks or shebangs to provide individual program interfaces
- Reduces overall binary size and memory footprint

**Program Structure:**
- Each utility in `src/PROGRAM.c` follows similar patterns
- Common includes: `config.h`, `system.h`, utility-specific headers
- Shared functionality in `src/` modules (e.g., `copy.c` for cp/mv/install)
- Option parsing with `getopt_long`, or `parse_gnu_standard_options_only`
  for programs with no options of their own (coreutils does not use argp)

**Core Shared Components:**
- `src/system.h` - System-dependent definitions for all coreutils
- `src/copy.c`, `src/copy-file-data.c` / `src/copy.h` - File copying
  (used by cp, mv, install)
- `src/remove.c` - Recursive removal (used by rm, mv)
- `lib/` - Portable utility functions imported from gnulib

### Program Categories
- **File operations:** `cp`, `mv`, `rm`, `ln`, `install`
- **Text processing:** `cat`, `sort`, `uniq`, `cut`, `tr`, `head`, `tail`
- **Directory listing:** `ls`, `dir`, `vdir`
- **File info:** `stat`, `wc`, `cksum`, `du`, `df`
- **System info:** `uname`, `whoami`, `groups`, `id`

## Testing Strategy

**Test Types:**
- Shell scripts (`.sh`) for most functional testing
- Perl scripts (`.pl`) for complex test scenarios
- Tainted Perl scripts (`.xpl`) for security-sensitive tests

**Test Organization:**
- Tests grouped by utility in `tests/UTILITY/`
- Shared test utilities in `tests/` (e.g., `Coreutils.pm`, `CuSkip.pm`)
- Root-only tests clearly marked and separated

**Test Execution Framework:**
- Automake test harness with custom log compilers
- Parallel test execution support
- Detailed failure reporting with `VERBOSE=yes`

## Development Workflow

### Code Style
- Space-only indentation (no tabs except in Makefiles)
- GNU coding standards compliance
- Curly braces required for multi-line blocks
- Maximum 80-column line length

### Commit Requirements
- ChangeLog entries in commit messages (not separate files)
- One-line summary + blank line + detailed description
- Format: `program_name: change-description` or `category: change-description`
- Reference bug-introducing commits when fixing bugs

### Build Dependencies
- Requires autotools (autoconf, automake)
- Gnulib for portable library functions
- Perl for test suite (optional but recommended)
- A modern C compiler (the code uses C23 features such as `ckd_add` and
  `unreachable`, with gnulib supplying fallbacks for older compilers)

## Special Considerations

### Hardware Optimizations
- SIMD optimizations for specific operations (cksum, wc)
- Runtime CPU feature detection for optimal performance
- Conditional compilation based on hardware capabilities

### Portability
- Extensive use of gnulib for cross-platform compatibility
- Configure-time feature detection
- Graceful degradation when features unavailable

### Single Binary Mode
- Alternative compilation mode combining all utilities
- Useful for embedded systems or minimal installations
- Maintains full functionality with reduced storage requirements

## Internals Documentation (docs/)

This fork has MkDocs notes on how each program works, in `docs/`
(config in `mkdocs.yml`, pinned deps in `docs/requirements.txt`).

- Preview: `uvx --with-requirements docs/requirements.txt mkdocs serve`
- Verify: `uvx --with-requirements docs/requirements.txt mkdocs build --strict`
  (fails on broken links or anchors)
- Every claim must be checked against the source; quote real code only,
  with `src/FILE.c:LINE` references. Line numbers refer to the commit named
  in `docs/index.md`. Follow `docs/overview/page-template.md` for new pages
  and add them to `nav` in `mkdocs.yml`.