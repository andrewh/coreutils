# `sum`: checksum and count blocks in a file

Source: `src/sum.c` (229 lines) · Tests: `tests/cksum/` ·
Manual: `info '(coreutils) sum invocation'`

`sum` computes a checksum and counts the blocks in a file. It supports two
algorithms: BSD (default) and System V (with `-r` or `-s`). The BSD algorithm
uses a 16-bit rotating checksum, while System V uses a simple byte sum modulo
2^32. Both output the checksum and the block count (512-byte blocks).

## Options

|| Option | Purpose |
||---|---|
|| `-r` | Use System V algorithm (default with `-s`) |
|| `-s` | Use System V algorithm (with 512-byte blocks) |

## Code map

|| Function | Location | Role |
||---|---|---|
|| `bsd_sum_stream` | `src/sum.c:34` | Compute BSD checksum and byte count |
|| `sysv_sum_stream` | `src/sum.c:110` | Compute System V checksum and byte count |

## How it works

`sum` is built from `cksum.c` with `HASH_ALGO_SUM` defined. It calls the
appropriate stream function from `sum.c`:

### BSD algorithm

`bsd_sum_stream` computes a 16-bit rotating checksum
(`src/sum.c:34-104`):

1. Read the file in 32 KB blocks.
2. For each byte, rotate the checksum right by 1 bit (with wraparound) and add
   the byte value.
3. Keep the checksum within 16 bits with `& 0xffff`.
4. Output the checksum (5 digits) and block count.

The rotation formula is: `checksum = (checksum >> 1) + ((checksum & 1) << 15)`.

### System V algorithm

`sysv_sum_stream` computes a simple byte sum modulo 2^32
(`src/sum.c:110-229`):

1. Read the file in 32 KB blocks.
2. Sum all bytes.
3. Keep the sum within 32 bits with modulo `UINT_MAX + 1`.
4. Output the checksum and byte count.

With `-s`, the byte count is divided by 512 for block count.

## Platform notes

`sum` uses a 32 KB buffer for reading. The System V algorithm uses `unsigned int`
for the sum, which is at least 32 bits.

## Errors and exit status

- **File read failure:** Error from `fread`
- **Overflow:** Error from `ckd_add`

Exit status is 0 on success, 1 on errors.

## Tests

|| File | Covers |
||---|---|
|| `tests/cksum/sum.pl` | Basic sum functionality |
|| `tests/cksum/sum-sysv.sh` | System V algorithm |

## See also

- [cksum](cksum.md) for CRC checksums
