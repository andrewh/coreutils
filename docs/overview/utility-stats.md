# Utility statistics

Source: `src/*.c` · Generated from commit `97017cfbd`

This page lists statistics for all coreutils utilities to help understand their complexity and characteristics. Click column headers to sort, and use the search box to filter.

| Utility | Lines of code | Category | Options | Shared modules | Test files |
|---------|---------------|----------|---------|----------------|------------|
| [`basename`](../commands/basename.md) | 215 | Files and directories | 3 | - | tests/misc/basename.sh |
| [`basenc`](../commands/basenc.md) | 1,838 | Text and data | 4 | - | tests/misc/basenc*.pl |
| [`cat`](../commands/cat.md) | 998 | Text and data | 8 | - | tests/cat/*.sh |
| [`chcon`](../commands/chcon.md) | 650 | Files and directories | 5 | - | tests/misc/chcon*.sh |
| [`chmod`](../commands/chmod.md) | 688 | Files and directories | 7 | - | tests/misc/chmod*.sh |
| [`chown`](../commands/chown.md) | 366 | Files and directories | 5 | chown-core.c | tests/misc/chown*.sh |
| [`chroot`](../commands/chroot.md) | 440 | Files and directories | 2 | - | tests/misc/chroot*.sh |
| [`cksum`](../commands/cksum.md) | 1,838 | Text and data | 1 | - | tests/misc/cksum*.sh |
| [`comm`](../commands/comm.md) | 504 | Text and data | 3 | - | tests/misc/comm*.sh |
| [`cp`](../commands/cp.md) | 1,337 | Files and directories | 12 | copy.c, remove.c | tests/cp/*.sh |
| [`csplit`](../commands/csplit.md) | 1,460 | Text and data | 5 | - | tests/misc/csplit*.sh |
| [`cut`](../commands/cut.md) | 1,524 | Text and data | 7 | - | tests/misc/cut*.sh |
| [`date`](../commands/date.md) | 820 | System and users | 7 | - | tests/misc/date*.sh |
| [`dd`](../commands/dd.md) | 2,574 | Files and directories | 13 | - | tests/dd/*.sh |
| [`df`](../commands/df.md) | 1,860 | File and disk information | 7 | - | tests/df/*.sh |
| [`dircolors`](../commands/dircolors.md) | 571 | Text and data | 6 | - | tests/misc/dircolors*.sh |
| [`dirname`](../commands/dirname.md) | 154 | Files and directories | 2 | - | tests/misc/dirname.sh |
| [`du`](../commands/du.md) | 1,214 | File and disk information | 6 | - | tests/du/*.sh |
| [`echo`](../commands/echo.md) | 286 | Text and data | 2 | - | tests/misc/echo*.sh |
| [`env`](../commands/env.md) | 1,268 | System and users | 3 | - | tests/misc/env*.sh |
| [`expand`](../commands/expand.md) | 245 | Text and data | 4 | expand-common.c | tests/misc/expand*.sh |
| [`expr`](../commands/expr.md) | 970 | Text and data | 0 | - | tests/misc/expr*.sh |
| [`factor`](../commands/factor.md) | 2,057 | Text and data | 0 | - | tests/misc/factor*.sh |
| [`fmt`](../commands/fmt.md) | 1,060 | Text and data | 6 | - | tests/misc/fmt*.sh |
| [`fold`](../commands/fold.md) | 349 | Text and data | 3 | - | tests/misc/fold*.sh |
| [`getlimits`](../commands/getlimits.md) | 225 | Shell helpers | 0 | - | tests/misc/getlimits.sh |
| [`groups`](../commands/groups.md) | 144 | System and users | 0 | - | tests/misc/groups*.sh |
| [`head`](../commands/head.md) | 1,080 | Text and data | 6 | - | tests/misc/head*.sh |
| [`hostid`](../commands/hostid.md) | 81 | System and users | 0 | - | tests/misc/hostid.sh |
| [`hostname`](../commands/hostname.md) | 112 | System and users | 0 | - | tests/misc/hostname*.sh |
| [`id`](../commands/id.md) | 464 | System and users | 2 | - | tests/misc/id*.sh |
| [`install`](../commands/install.md) | 1,114 | Files and directories | 8 | copy.c, remove.c | tests/install/*.sh |
| [`join`](../commands/join.md) | 1,231 | Text and data | 5 | - | tests/misc/join*.sh |
| [`kill`](../commands/kill.md) | 310 | System and users | 1 | - | tests/misc/kill*.sh |
| [`link`](../commands/link.md) | 91 | Files and directories | 0 | - | tests/misc/link*.sh |
| [`ln`](../commands/ln.md) | 713 | Files and directories | 4 | - | tests/ln/*.sh |
| [`logname`](../commands/logname.md) | 78 | System and users | 0 | - | tests/misc/logname.sh |
| [`ls`](../commands/ls.md) | 5,745 | File and disk information | 30 | - | tests/ls/*.sh |
| [`mkdir`](../commands/mkdir.md) | 319 | Files and directories | 3 | - | tests/misc/mkdir*.sh |
| [`mkfifo`](../commands/mkfifo.md) | 225 | Files and directories | 2 | - | tests/misc/mkfifo*.sh |
| [`mknod`](../commands/mknod.md) | 317 | Files and directories | 2 | - | tests/misc/mknod*.sh |
| [`mktemp`](../commands/mktemp.md) | 358 | Files and directories | 4 | - | tests/misc/mktemp*.sh |
| [`mv`](../commands/mv.md) | 573 | Files and directories | 4 | copy.c, remove.c | tests/mv/*.sh |
| [`nice`](../commands/nice.md) | 256 | System and users | 1 | - | tests/misc/nice*.sh |
| [`nl`](../commands/nl.md) | 661 | Text and data | 6 | - | tests/misc/nl*.sh |
| [`nohup`](../commands/nohup.md) | 229 | System and users | 0 | - | tests/misc/nohup*.sh |
| [`nproc`](../commands/nproc.md) | 137 | System and users | 0 | - | tests/misc/nproc*.sh |
| [`numfmt`](../commands/numfmt.md) | 1,754 | System and users | 7 | - | tests/misc/numfmt*.sh |
| [`od`](../commands/od.md) | 2,079 | Text and data | 10 | - | tests/misc/od*.sh |
| [`paste`](../commands/paste.md) | 553 | Text and data | 4 | - | tests/misc/paste*.sh |
| [`pathchk`](../commands/pathchk.md) | 421 | Text and data | 3 | - | tests/misc/pathchk*.sh |
| [`pinky`](../commands/pinky.md) | 617 | System and users | 2 | - | tests/misc/pinky*.sh |
| [`pr`](../commands/pr.md) | 2,908 | Text and data | 16 | - | tests/misc/pr*.sh |
| [`printenv`](../commands/printenv.md) | 197 | System and users | 0 | - | tests/misc/printenv*.sh |
| [`printf`](../commands/printf.md) | 777 | Shell helpers | 0 | - | tests/misc/printf*.sh |
| [`ptx`](../commands/ptx.md) | 2,049 | Text and data | 11 | - | tests/misc/ptx*.sh |
| [`pwd`](../commands/pwd.md) | 386 | Files and directories | 2 | - | tests/misc/pwd*.sh |
| [`readlink`](../commands/readlink.md) | 218 | Files and directories | 4 | - | tests/misc/readlink*.sh |
| [`realpath`](../commands/realpath.md) | 344 | Files and directories | 3 | - | tests/misc/realpath*.sh |
| [`rm`](../commands/rm.md) | 396 | Files and directories | 5 | remove.c | tests/rm/*.sh |
| [`rmdir`](../commands/rmdir.md) | 295 | Files and directories | 2 | - | tests/misc/rmdir*.sh |
| [`runcon`](../commands/runcon.md) | 273 | System and users | 2 | - | tests/misc/runcon*.sh |
| [`seq`](../commands/seq.md) | 731 | Shell helpers | 3 | - | tests/misc/seq*.sh |
| [`shred`](../commands/shred.md) | 1,339 | Files and directories | 10 | - | tests/misc/shred*.sh |
| [`shuf`](../commands/shuf.md) | 624 | Text and data | 3 | - | tests/misc/shuf*.sh |
| [`sleep`](../commands/sleep.md) | 145 | System and users | 2 | - | tests/misc/sleep*.sh |
| [`sort`](../commands/sort.md) | 5,173 | Text and data | 27 | - | tests/misc/sort*.sh |
| [`split`](../commands/split.md) | 1,770 | Text and data | 5 | - | tests/misc/split*.sh |
| [`stat`](../commands/stat.md) | 1,994 | File and disk information | 7 | - | tests/misc/stat*.sh |
| [`stty`](../commands/stty.md) | 2,484 | System and users | 25 | - | tests/misc/stty*.sh |
| [`sum`](../commands/sum.md) | 229 | Text and data | 0 | - | tests/misc/sum*.sh |
| [`sync`](../commands/sync.md) | 231 | System and users | 0 | - | tests/misc/sync*.sh |
| [`tac`](../commands/tac.md) | 592 | Text and data | 4 | - | tests/misc/tac*.sh |
| [`tail`](../commands/tail.md) | 2,596 | Text and data | 7 | - | tests/misc/tail*.sh |
| [`tee`](../commands/tee.md) | 343 | Text and data | 2 | - | tests/misc/tee*.sh |
| [`test`](../commands/test.md) | 899 | Shell helpers | 0 | - | tests/misc/test*.sh |
| [`timeout`](../commands/timeout.md) | 735 | System and users | 5 | - | tests/misc/timeout*.sh |
| [`touch`](../commands/touch.md) | 451 | Files and directories | 5 | - | tests/misc/touch*.sh |
| [`tr`](../commands/tr.md) | 1,908 | Text and data | 6 | - | tests/misc/tr*.sh |
| [`true`](../commands/true.md) | 73 | System and users | 0 | - | tests/misc/true.sh |
| [`truncate`](../commands/truncate.md) | 385 | Files and directories | 4 | - | tests/misc/truncate*.sh |
| [`tsort`](../commands/tsort.md) | 575 | Text and data | 0 | - | tests/misc/tsort*.sh |
| [`tty`](../commands/tty.md) | 137 | System and users | 0 | - | tests/misc/tty*.sh |
| [`uname`](../commands/uname.md) | 418 | System and users | 3 | - | tests/misc/uname*.sh |
| [`unexpand`](../commands/unexpand.md) | 343 | Text and data | 4 | expand-common.c | tests/misc/unexpand*.sh |
| [`uniq`](../commands/uniq.md) | 680 | Text and data | 5 | - | tests/misc/uniq*.sh |
| [`unlink`](../commands/unlink.md) | 86 | Files and directories | 0 | - | tests/misc/unlink*.sh |
| [`uptime`](../commands/uptime.md) | 205 | System and users | 0 | - | tests/misc/uptime*.sh |
| [`users`](../commands/users.md) | 147 | System and users | 0 | - | tests/misc/users*.sh |
| [`wc`](../commands/wc.md) | 1,071 | Text and data | 5 | - | tests/misc/wc*.sh |
| [`who`](../commands/who.md) | 846 | System and users | 4 | - | tests/misc/who*.sh |
| [`whoami`](../commands/whoami.md) | 86 | System and users | 0 | - | tests/misc/whoami.sh |
| [`yes`](../commands/yes.md) | 270 | System and users | 0 | - | tests/misc/yes*.sh |

## Notes

- **Lines of code**: Counted from `src/UTILITY.c` using `wc -l`
- **Category**: Based on the navigation structure in this documentation
- **Options**: Counted from `long_options[]` in each source file (excludes `--help` and `--version`)
- **Shared modules**: Key shared source files imported by the utility
- **Test files**: Representative test files from `tests/` (not exhaustive)

## See also

- [Command index](../commands/index.md)
- [Source layout](source-layout.md)
- [Program skeleton](program-skeleton.md)
