# `cksum` and the `*sum` programs: checksums and digests

Source: `src/cksum.c` (1925 lines), `src/cksum_crc.c`, `src/sum.c`,
`src/blake2/`, `src/cksum_pclmul.c`, `src/cksum_avx2.c`,
`src/cksum_avx512.c`, `src/cksum_vmull.c` · Tests: `tests/cksum/` ·
Manual: `info '(coreutils) cksum invocation'`

One source file, `src/cksum.c`, builds ten programs. `src/local.mk`
compiles it again for each one with a different `-DHASH_ALGO_*` macro:

| Program | Macro | Algorithms |
|---|---|---|
| `cksum` | `HASH_ALGO_CKSUM` | All of them, chosen with `-a`. The default is `crc`. |
| `sum` | `HASH_ALGO_SUM` | `bsd` (default) or `sysv` (`-s`). |
| `md5sum`, `sha1sum`, `sha224sum`, `sha256sum`, `sha384sum`, `sha512sum` | `HASH_ALGO_MD5`, ... | One fixed digest. |
| `b2sum` | `HASH_ALGO_BLAKE2` | BLAKE2b, with optional `-l` length. |

The digest code itself is in gnulib (`md5`, `sha1`, `sha256`, `sha512`,
`sha3`, `sm3`, `crc`) and in `src/blake2/`. `cksum.c` handles options,
output formats, and `--check`.

In the single-binary build, `md5sum` and the `sha*sum` programs are not
compiled separately. For example, `src/coreutils-md5sum.c` sets
`cksum_algorithm = md5` and calls `cksum`'s main. When `main` sees an
algorithm other than `crc` at start-up, it sets `legacy_mode` and uses the
old option table (`legacy_long_options`) and untagged output
(`src/cksum.c:1589-1596`).

## `cksum` algorithms

`algorithm_args[]` and the tables after it (`src/cksum.c:349-376`) list what `-a`/`--algorithm`
accepts:

| Name | Tag | Bits | Stream function |
|---|---|---|---|
| `bsd`, `sysv` | `BSD`, `SYSV` | 16 | `bsd_sum_stream`, `sysv_sum_stream` (`src/sum.c`) |
| `crc` | `CRC` | 32 | `crc_sum_stream`: the POSIX `cksum` CRC (`src/cksum_crc.c`) |
| `crc32b` | `CRC32B` | 32 | `crc32b_sum_stream`: the CRC-32 used by zlib and gzip, from gnulib `crc` |
| `md5`, `sha1` | | 128, 160 | gnulib |
| `sha224` … `sha512` | | 224 … 512 | gnulib. These names are kept for compatibility (comment: "Legacy naming"). |
| `sha2` | `SHA2` | 224/256/384/512 | `sha2_sum_stream`, with `-l` choosing the size |
| `sha3` | `SHA3` | 224/256/384/512 | `sha3_sum_stream`, with `-l` choosing the size |
| `blake2b` | `BLAKE2b` | up to 512 | `blake2b_sum_stream`, with `-l` choosing the size |
| `sm3` | `SM3` | 256 | gnulib `sm3` |

## Options

Most options are shared, but some exist only in some programs (`#if
HASH_ALGO_*` around `long_options[]`, `src/cksum.c:440-491`):

| Option | Programs | Effect |
|---|---|---|
| `-a`, `--algorithm=TYPE` | `cksum` | Choose the algorithm. |
| `-l`, `--length=BITS` | `cksum`, `b2sum` | Digest length for `blake2b`, `sha2` and `sha3`. |
| `-c`, `--check` | all except `sum` | Read digests from files and check them (`digest_check`). |
| `--ignore-missing`, `--quiet`, `--status`, `--strict`, `-w`, `--warn` | with `-c` | Change how `--check` reports problems. |
| `--tag` / `--untagged` | `--tag` all; `--untagged` `cksum` | BSD-style `ALGO (file) = digest` lines, or GNU-style `digest  file` lines. Tagged output is the default for `cksum` (`prefix_tag = HASH_ALGO_CKSUM`) and untagged for the others. Tagged output cannot be combined with `--text`. |
| `--base64`, `--raw` | `cksum` | Print the digest in base64, or as raw bytes. |
| `-z`, `--zero` | all except `sum` | End output lines with NUL, and do not escape file names. |
| `-b`, `--binary`, `-t`, `--text` | all except `sum` | Binary or text mode (`*` or space before the name in untagged output). Marked deprecated in `long_options[]`. |
| `-r`, `-s`/`--sysv` | `sum` | BSD or System V algorithm. |
| `--debug` | `cksum` | Report which CRC code was chosen. |

## Code map

| Function | Location | Role |
|---|---|---|
| `main` | `src/cksum.c:1577` | Options, choose the algorithm, a loop over files (or `--check`). |
| `digest_file` | `:1196` | Open the file (or stdin), call the algorithm's stream function. |
| `output_file` | `:1263` | Print `digest  name` or `ALGO (name) = digest`, in hex or base64. Escape names that contain `\` or newline. |
| `digest_check` | `:1376` | `--check`: read each line, find the algorithm, digest the file, compare. |
| `algorithm_from_tag` | `:876` | Find the algorithm from a tag such as `SHA256` or `BLAKE2b-256`. |
| `filename_unescape`, `problematic_chars` | `:736`, `:719` | Handle escaped file names in check files and output. |
| `crc_sum_stream` | `src/cksum_crc.c:282` | Choose the fastest CRC code once, then run it. |
| `cksum_slice8` | `src/cksum_crc.c:226` | Portable CRC with eight 256-entry tables ("slice-by-8"). |
| `pclmul_supported`, `avx2_supported`, `avx512_supported`, `vmull_supported` | `src/cksum_crc.c:143-222` | Run-time CPU checks for the SIMD CRC versions. |

## How it works

### The POSIX CRC

`crc_sum_stream()` picks a function the first time it is called, in this
order: AVX-512, AVX2, PCLMUL (x86), VMULL (ARM), then `cksum_slice8`
(`src/cksum_crc.c:282-296`):

```c
static cksum_fp_t cksum_fp;
if (! cksum_fp)
  cksum_fp = avx512_supported ();
if (! cksum_fp)
  cksum_fp = avx2_supported ();
if (! cksum_fp)
  cksum_fp = pclmul_supported ();
if (! cksum_fp)
  cksum_fp = vmull_supported ();
if (! cksum_fp)
  cksum_fp = cksum_slice8;
```

Each `*_supported` function returns `NULL` if the build did not include
that version or if `cpu_supports()` says the CPU lacks the instructions.
With `--debug` it prints, for example, `using avx2 hardware support`.

After the data, the POSIX algorithm also feeds in the **length** of the
input, one byte at a time, and then inverts the result
(`src/cksum_crc.c:304-306`). This is why `crc` and `crc32b` give
different answers.

The slice-by-8 tables are in `src/crctab.c`. The build generates that file
by compiling `cksum_crc.c` with `-DCRCTAB` and running the result
(`src/local.mk:632-645`). The code between `#ifdef CRCTAB` and `#else` is
the table generator.

### `--check`

`digest_check` reads each line of each check file. It accepts both the
GNU format (`HEX  NAME` or `HEX *NAME`) and the tagged format (`ALGO (NAME)
= HEX`), and base64 digests. A line that starts with `\` has an escaped
file name. For each line it digests the named file and compares the result
with `hex_equal`. It counts lines that are badly formatted, digests that do
not match, and files that cannot be read, and prints a summary warning for
each count unless `--status` is given.

## Errors and exit status

The exit status is 1 if any file could not be read, or (with `--check`) if
any digest did not match, a file was missing (unless `--ignore-missing`),
a line was badly formatted with `--strict`, or no valid line was found.

## Tests

| File | Covers |
|---|---|
| `tests/cksum/cksum.sh`, `cksum-a.sh` | Default CRC and `-a` for each algorithm. |
| `tests/cksum/cksum-c.sh` | `--check` with each format. |
| `tests/cksum/cksum-base64.pl`, `cksum-base64-untagged.sh`, `cksum-raw.sh` | Output encodings. |
| `tests/cksum/cksum-sha3.sh`, `b2sum.sh` | Variable-length digests. |
| `tests/cksum/md5sum.pl`, `sha*sum.pl`, `sm3sum.pl`, `sha1sum-vec.pl` | Known test vectors. |
| `tests/cksum/md5sum-newline.pl`, `md5sum-bsd.sh` | File names with newlines, and BSD-format input. |
| `tests/cksum/md5sum-parallel.sh` | Several files at once. |
| `tests/cksum/sum.pl`, `sum-sysv.sh` | `sum`. |

## See also

- [wc](wc.md): the other program with SIMD code chosen at run time.
- [Source layout](../overview/source-layout.md#how-a-programs-sources-are-listed)
  for the build rules.
