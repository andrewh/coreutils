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

## Source code

`src/sum.c:1`

```c
/* sum -- checksum and count the blocks in a file
   Copyright (C) 1986-2026 Free Software Foundation, Inc.

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

/* Like BSD sum or SysV sum -r, except like SysV sum if -s option is given. */

/* Written by Kayvan Aghaiepour and David MacKenzie. */

#include <config.h>

#include <stdio.h>
#include <sys/types.h>
#include <endian.h>
#include "system.h"
#include "human.h"
#include "sum.h"

/* Calculate the checksum and the size in bytes of stream STREAM.
   Return -1 on error, 0 on success.  */

int
bsd_sum_stream (FILE *stream, void *resstream, intmax_t *length)
{
  int ret = -1;
  idx_t sum;
  int checksum = 0;	/* The checksum mod 2^16. */
  intmax_t total_bytes = 0;	/* The number of bytes. */
  enum { buffer_length = 32768 };
  uint8_t *buffer = malloc (buffer_length);

  if (! buffer)
    return -1;

  /* Process file */
  while (true)
  {
    sum = 0;

    /* Read block */
    while (true)
    {
      size_t n = fread (buffer + sum, 1, buffer_length - sum, stream);
      if (n == 0)
        {
          if (ferror (stream))
            goto cleanup_buffer;
          goto final_process;
        }

      sum += n;

      if (buffer_length == sum)
        break;

      if (feof (stream))
        goto final_process;
    }

    for (size_t i = 0; i < sum; i++)
      {
        checksum = (checksum >> 1) + ((checksum & 1) << 15);
        checksum += buffer[i];
        checksum &= 0xffff;	/* Keep it within bounds. */
      }
    if (ckd_add (&total_bytes, total_bytes, sum))
      {
        errno = EOVERFLOW;
        goto cleanup_buffer;
      }
  }

final_process:;

  for (idx_t i = 0; i < sum; i++)
    {
      checksum = (checksum >> 1) + ((checksum & 1) << 15);
      checksum += buffer[i];
      checksum &= 0xffff;	/* Keep it within bounds. */
    }
  if (ckd_add (&total_bytes, total_bytes, sum))
    {
      errno = EOVERFLOW;
      goto cleanup_buffer;
    }

  memcpy (resstream, &checksum, sizeof checksum);
  *length = total_bytes;
  ret = 0;
cleanup_buffer:
  free (buffer);
  return ret;
}

/* Calculate the checksum and the size in bytes of stream STREAM.
   Return -1 on error, 0 on success.  */

int
sysv_sum_stream (FILE *stream, void *resstream, intmax_t *length)
{
  int ret = -1;
  idx_t sum;
  intmax_t total_bytes = 0;
  enum { buffer_length = 32768 };
  uint8_t *buffer = malloc (buffer_length);

  if (! buffer)
    return -1;

  /* The sum of all the input bytes, modulo (UINT_MAX + 1).  */
  unsigned int s = 0;

  /* Process file */
  while (true)
  {
    sum = 0;

    /* Read block */
    while (true)
    {
      size_t n = fread (buffer + sum, 1, buffer_length - sum, stream);
      if (n == 0)
        {
          if (ferror (stream))
            goto cleanup_buffer;
          goto final_process;
        }

      sum += n;

      if (buffer_length == sum)
        break;

      if (feof (stream))
        goto final_process;
    }

    for (size_t i = 0; i < sum; i++)
      s += buffer[i];
    if (total_bytes + sum < total_bytes)
      {
        errno = EOVERFLOW;
        goto cleanup_buffer;
      }
    total_bytes += sum;
  }

final_process:;

  for (size_t i = 0; i < sum; i++)
    s += buffer[i];
  if (total_bytes + sum < total_bytes)
    {
      errno = EOVERFLOW;
      goto cleanup_buffer;
    }
  total_bytes += sum;

  int r = (s & 0xffff) + ((s & 0xffffffff) >> 16);
  int checksum = (r & 0xffff) + (r >> 16);

  memcpy (resstream, &checksum, sizeof checksum);
  *length = total_bytes;
  ret = 0;
cleanup_buffer:
  free (buffer);
  return ret;
}

/* Print the checksum and size (in 1024 byte blocks) to stdout.
   If ARGS is true, also print the FILE name.  */

void
output_bsd (char const *file, MAYBE_UNUSED int binary_file, void const *digest,
            bool raw, MAYBE_UNUSED bool tagged, unsigned char delim, bool args,
            intmax_t length)
{
  if (raw)
    {
      /* Output in network byte order (big endian).  */
      uint16_t out_int = *(int *)digest;
      out_int = htobe16 (out_int);
      fwrite (&out_int, 1, 16/8, stdout);
      return;
    }

  char hbuf[LONGEST_HUMAN_READABLE + 1];
  printf ("%05d %5s", *(int *)digest,
          human_readable (length, hbuf, human_ceiling, 1, 1024));
  if (args)
    printf (" %s", file);
  putchar (delim);
}

/* Print the checksum and size (in 512 byte blocks) to stdout.
   If ARGS is true, also print the FILE name.  */

void
output_sysv (char const *file, MAYBE_UNUSED int binary_file,
             void const *digest, bool raw, MAYBE_UNUSED bool tagged,
             unsigned char delim, bool args, intmax_t length)
{
  if (raw)
    {
      /* Output in network byte order (big endian).  */
      uint16_t out_int = *(int *)digest;
      out_int = htobe16 (out_int);
      fwrite (&out_int, 1, 16/8, stdout);
      return;
    }

  char hbuf[LONGEST_HUMAN_READABLE + 1];
  printf ("%d %s", *(int *)digest,
          human_readable (length, hbuf, human_ceiling, 1, 512));
  if (args)
    printf (" %s", file);
  putchar (delim);
}
```
