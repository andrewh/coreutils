# `shred`: overwrite files to make data recovery harder

Source: `src/shred.c` (1339 lines) · Tests: `tests/shred/` ·
Manual: `info '(coreutils) shred invocation'`

`shred` overwrites files and devices to make it harder to recover data. It uses
multiple passes with specific patterns (random, 1-bit, 2-bit, 3-bit, 4-bit) to
defeat data recovery techniques. It can optionally remove the file after
shredding, with name obfuscation to hide the original filename.

## Options

Key options include:

|| Option | Purpose |
||---|---|
|| `-f`, `--force` | Force shredding, chmod files if necessary |
|| `-n N`, `--iterations=N` | Number of overwrite passes (default 3) |
|| `-s N`, `--size=N` | Shred only first N bytes |
|| `-u`, `--remove` | Remove file after shredding |
|| `--remove=wipe` | Obfuscate name before unlink |
|| `--remove=wipesync` | Obfuscate name, syncing each byte |
|| `-v`, `--verbose` | Print progress |
|| `-x`, `--exact` | Don't round up file size |
|| `-z`, `--zero` | Add a final zero pass |
|| `--random-source=FILE` | Get random bytes from FILE |

## Code map

|| Function | Location | Role |
||---|---|---|
|| `main` | `src/shred.c:1230` | Option parsing, initialize RNG, call `wipename` for each file |
|| `wipename` | `:1143` | Open file, call `do_wipefd`, optionally remove file |
|| `do_wipefd` | `:846` | Perform the actual wiping passes on a file descriptor |
|| `dopass` | `:585` | Perform a single wipe pass with a pattern |
|| `genpattern` | `:726` | Generate random wipe pass pattern |
|| `wipename` | `:1036` | Remove file with name obfuscation |
|| `usage` | `:170` | Help message |

## How it works

`shred` overwrites files using multiple passes (`src/shred.c:1230-1339`):

1. **Pattern generation:** `genpattern` generates a sequence of patterns based
   on the number of passes (`src/shred.c:726-785`). The patterns include
   random passes, 1-bit patterns (0x000, 0xFFF), 2-bit patterns (0x555, 0xAAA),
   3-bit patterns, and 4-bit patterns.
2. **Wiping:** For each file, `do_wipefd` performs the passes
   (`src/shred.c:846-1189`). Each pass calls `dopass` to write the pattern.
3. **Zero fill:** With `-z`, a final pass writes zeros.
4. **Removal:** With `-u`, the file is removed with `wipename`, which renames
   it multiple times with random names before unlinking
   (`src/shred.c:1036-1213`).

### Pass patterns

The default pass sequence uses patterns designed to defeat magnetic storage
recovery (`src/shred.c:700-717`):

- **Random passes:** Begin, middle, and end
- **1-bit:** 0x000, 0xFFF
- **2-bit:** 0x555, 0xAAA
- **3-bit:** Six patterns
- **4-bit:** Twelve patterns
- **Phase-altered:** Patterns with the first bit per block flipped

### Sector alignment

Writes are aligned to 512-byte sectors (`SECTOR_SIZE`) to handle write failures
gracefully (`src/shred.c:107-109`).

## Platform notes

`shred` uses `randint` from gnulib for random number generation. The random
source can be specified with `--random-source`. On Linux, it uses tape drive
ioctls if available (`HAVE_SYS_MTIO_H`).

## Errors and exit status

- **Invalid passes:** Error from `xdectoumax`
- **Invalid size:** Error from `xdectoumax`
- **File open failure:** Error from `open`
- **Write failure:** Error from `write`

Exit status is 0 on success, 1 on any error.

## Tests

|| File | Covers |
||---|---|
|| `tests/shred/shred-passes.sh` | Pass count |
|| `tests/shred/shred-size.sh` | Size option |
|| `tests/shred/shred-exact.sh` | Exact mode |
|| `tests/shred/shred-remove.sh` | File removal |
|| `tests/shred/chmod-race.sh` | Race condition handling |
|| `tests/shred/unlink-race.sh` | Unlink race |
|| `tests/shred/fifo.sh` | FIFO handling |
|| `tests/shred/failed-close.sh` | Close failure |
|| `tests/shred/verbose-quote.sh` | Verbose output |

## See also

- [rm](rm.md) for simple file removal
