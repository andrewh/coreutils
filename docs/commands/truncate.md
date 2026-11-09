# `truncate`: shrink or extend file size

Source: `src/truncate.c` (385 lines) · Tests: `tests/truncate/` ·
Manual: `info '(coreutils) truncate invocation'`

`truncate` shrinks or extends files to a specified size. If a file is larger,
extra data is lost. If shorter, it's extended with sparse holes (reading as zero).
Size can be specified absolutely or relative to the current size, with modifiers
like `+` (extend), `-` (reduce), `<` (at most), `>` (at least), `/` (round down),
and `%` (round up).

## Options

The table lists `longopts[]` (`src/truncate.c:47-56`) and the short-option
string `"cor:s:"`.

|| Option | Variables |
||---|---|
|| `-c`, `--no-create` | `no_create = true`: don't create files that don't exist |
|| `-o`, `--io-blocks` | `block_mode = true`: treat SIZE as IO blocks, not bytes |
|| `-r RFILE`, `--reference=RFILE` | `ref_file`: use RFILE's size as base |
|| `-s SIZE`, `--size=SIZE` | Set or adjust file size by SIZE |

## Code map

|| Function | Location | Role |
||---|---|---|
|| `main` | `src/truncate.c:201` | Option parsing, parse size, call `do_ftruncate` for each file |
|| `do_ftruncate` | `:107` | Apply size adjustment with `ftruncate` |
|| `usage` | `:62` | Help message |

## How it works

`main` parses options and the size specification (`src/truncate.c:201-385`):

1. **Option parsing:** Parse `-c`, `-o`, `-r`, and `-s`.
2. **Size parsing:** Parse the SIZE argument with optional prefix (`+`, `-`, `<`,
   `>`, `/`, `%`) to determine the relative mode (`rel_mode_t`).
3. **Reference file:** With `-r`, get the reference file's size.
4. **Processing:** For each file, call `do_ftruncate` to apply the size.

### Relative modes

The `rel_mode_t` enum defines size adjustment modes
(`src/truncate.c:58-59`):

- **`rm_abs`:** Absolute size (default)
- **`rm_rel`:** Relative adjustment (`+` or `-`)
- **`rm_min`:** At least (`>`) - `MAX(fsize, ssize)`
- **`rm_max`:** At most (`<`) - `MIN(fsize, ssize)`
- **`rm_rdn`:** Round down to multiple (`/`) - `fsize - fsize % ssize`
- **`rm_rup`:** Round up to multiple (`%`) - `fsize + (ssize - fsize % ssize)`

### Block mode

With `-o`, the size is multiplied by the file's block size
(`STP_BLKSIZE`) (`src/truncate.c:118-129`).

### Truncation

`do_ftruncate` computes the new size and calls `ftruncate`
(`src/truncate.c:130-198`). For relative modes, it gets the current file size
with `fstat` and applies the adjustment.

## Platform notes

`truncate` uses `fstat` to get file sizes and `ftruncate` to set sizes.
Block size is obtained from `STP_BLKSIZE` (typically 512 or 4096).

## Errors and exit status

- **Invalid size:** Error from size parsing
- **Overflow in block mode:** "overflow in X * Y byte blocks"
- **fstat failure:** "cannot fstat FILE"
- **Unusable size:** "FILE has unusable, apparently negative size"
- **Overflow extending:** "overflow extending size of file"
- **ftruncate failure:** "failed to truncate FILE at X bytes"

Exit status is 0 on success, 1 on any error.

## Tests

|| File | Covers |
||---|---|
|| `tests/truncate/truncate-parameters.sh` | Size parameter parsing |
|| `tests/truncate/truncate-relative.sh` | Relative size adjustments |
|| `tests/truncate/truncate-overflow.sh` | Overflow handling |
|| `tests/truncate/truncate-no-create-missing.sh` | `-c` option |
|| `tests/truncate/truncate-fifo.sh` | FIFO handling |
|| `tests/truncate/truncate-owned-by-other.sh` | Permission handling |
|| `tests/truncate/multiple-files.sh` | Multiple file processing |
|| `tests/truncate/truncate-dangling-symlink.sh` | Symlink handling |

## See also

- [fallocate](https://man7.org/linux/man-pages/man2/fallocate.2.html) for allocating space
