# Command index

Each page follows the layout in [Writing a page](../overview/page-template.md):
options, a code map, how the program works (with diagrams), errors and
exit status, and the tests. The table lists the programs covered so far,
grouped by what they do.

| Group | Program | Main source | What is interesting |
|---|---|---|---|
| Files and directories | [chmod](chmod.md) | `src/chmod.c` | Modes that look like options (`chmod -w`), umask "surprise" check |
| | [chown, chgrp](chown.md) | `src/chown.c`, `src/chown-core.c` | One source, two programs; race-free `--from` |
| | [cp](cp.md) | `src/cp.c` + `src/copy.c` | Reflink, `copy_file_range`, `SEEK_HOLE`, hard-link tracking |
| | [install](install.md) | `src/install.c` + `src/copy.c` | `-C` compare, strip, owner before mode |
| | [ln](ln.md) | `src/ln.c`, `src/force-link.c` | Atomic replacement through a temporary name |
| | [mkdir](mkdir.md) | `src/mkdir.c` | Two umasks for `-p`, gnulib `mkdir-p` and `savewd` |
| | [mv](mv.md) | `src/mv.c` + `src/copy.c` + `src/remove.c` | Rename first, copy and remove across devices |
| | [rm](rm.md) | `src/rm.c`, `src/remove.c` | `fts` walk, two prompts per directory, root protection |
| | [touch](touch.md) | `src/touch.c` | "Now" needs only write permission |
| | [dd](dd.md) | `src/dd.c` | Private open flags, partial reads, sparse output |
| Text and data | [cat](cat.md) | `src/cat.c` | `copy_file_range`, `splice`, sentinel loop |
| | [cksum and *sum](cksum.md) | `src/cksum.c`, `src/cksum_crc.c` | Ten programs from one source, SIMD CRC |
| | [cut](cut.md) | `src/cut.c`, `src/set-fields.c` | Range list, multibyte field search |
| | [head](head.md) | `src/head.c` | Eliding the tail of pipes and files |
| | [od](od.md) | `src/od.c` | One `tspec` per format, repeated-line `*` |
| | [sort](sort.md) | `src/sort.c` | External merge sort with threads |
| | [split](split.md) | `src/split.c` | Suffix odometer, `--filter`, temporary copy for `-n` |
| | [tail](tail.md) | `src/tail.c` | inotify or polling, closed-reader detection |
| | [tee](tee.md) | `src/tee.c` | `--output-error` modes, `iopoll` |
| | [tr](tr.md) | `src/tr.c` | 256-entry tables (bytes only) |
| | [wc](wc.md) | `src/wc.c` | Four loops, SIMD line counting |
| File and disk information | [df](df.md) | `src/df.c` | Removing duplicate mounts, safe mount lookup |
| | [du](du.md) | `src/du.c` | Totals by depth, hard links counted once |
| | [ls, dir, vdir](ls.md) | `src/ls.c` | Avoiding `stat`, column layout |
| | [stat](stat.md) | `src/stat.c` | `statx` masks, file system type table |
| System and users | [date](date.md) | `src/date.c` | `parse_datetime`, C-locale formats |
| | [hostname](hostname.md) | `src/hostname.c` | Smallest program; no options |
| | [id](id.md) | `src/id.c` | Group lists, security context |
| | [uname, arch](uname.md) | `src/uname.c` | Two programs, platform-specific fields |
| | [uptime](uptime.md) | `src/uptime.c` | Boot time from `readutmp` |
| | [who](who.md) | `src/who.c` | utmp records, idle time |
| Shell helpers | [printf](printf.md) | `src/printf.c` | Rebuilding formats with `j`/`L` |
| | [seq](seq.md) | `src/seq.c` | Decimal-string fast path |
| | [stdbuf](stdbuf.md) | `src/stdbuf.c`, `src/libstdbuf.c` | `LD_PRELOAD` constructor |

## Programs not yet covered

There are about 100 programs in `build-aux/gen-lists-of-programs.sh`.
These pages cover the ones listed above. To add one, follow
[Writing a page](../overview/page-template.md) and add it to the `nav`
section of `mkdocs.yml`.
