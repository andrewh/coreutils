# Utility statistics

Source: `src/*.c` · Generated from commit `97017cfbd`

This page lists statistics for all coreutils utilities to help understand their complexity and characteristics.

| Utility | Lines of code | Category | Options | Shared modules | Test files |
|---------|---------------|----------|---------|----------------|------------|
| `basename` | 215 | Files and directories | 3 | - | tests/misc/basename.sh |
| `basenc` | 1,838 | Text and data | 4 | - | tests/misc/basenc*.pl |
| `cat` | 998 | Text and data | 8 | - | tests/cat/*.sh |
| `chcon` | 650 | Files and directories | 5 | - | tests/misc/chcon*.sh |
| `chmod` | 688 | Files and directories | 7 | - | tests/misc/chmod*.sh |
| `chown` | 366 | Files and directories | 5 | chown-core.c | tests/misc/chown*.sh |
| `chroot` | 440 | Files and directories | 2 | - | tests/misc/chroot*.sh |
| `cksum` | 1,838 | Text and data | 1 | - | tests/misc/cksum*.sh |
| `comm` | 504 | Text and data | 3 | - | tests/misc/comm*.sh |
| `cp` | 1,337 | Files and directories | 12 | copy.c, remove.c | tests/cp/*.sh |
| `csplit` | 1,460 | Text and data | 5 | - | tests/misc/csplit*.sh |
| `cut` | 1,524 | Text and data | 7 | - | tests/misc/cut*.sh |
| `date` | 820 | System and users | 7 | - | tests/misc/date*.sh |
| `dd` | 2,574 | Files and directories | 13 | - | tests/dd/*.sh |
| `df` | 1,860 | File and disk information | 7 | - | tests/df/*.sh |
| `dircolors` | 571 | Text and data | 6 | - | tests/misc/dircolors*.sh |
| `dirname` | 154 | Files and directories | 2 | - | tests/misc/dirname.sh |
| `du` | 1,214 | File and disk information | 6 | - | tests/du/*.sh |
| `echo` | 286 | Text and data | 2 | - | tests/misc/echo*.sh |
| `env` | 1,268 | System and users | 3 | - | tests/misc/env*.sh |
| `expand` | 245 | Text and data | 4 | expand-common.c | tests/misc/expand*.sh |
| `expr` | 970 | Text and data | 0 | - | tests/misc/expr*.sh |
| `factor` | 2,057 | Text and data | 0 | - | tests/misc/factor*.sh |
| `fmt` | 1,060 | Text and data | 6 | - | tests/misc/fmt*.sh |
| `fold` | 349 | Text and data | 3 | - | tests/misc/fold*.sh |
| `getlimits` | 225 | Shell helpers | 0 | - | tests/misc/getlimits.sh |
| `groups` | 144 | System and users | 0 | - | tests/misc/groups*.sh |
| `head` | 1,080 | Text and data | 6 | - | tests/misc/head*.sh |
| `hostid` | 81 | System and users | 0 | - | tests/misc/hostid.sh |
| `hostname` | 112 | System and users | 0 | - | tests/misc/hostname*.sh |
| `id` | 464 | System and users | 2 | - | tests/misc/id*.sh |
| `install` | 1,114 | Files and directories | 8 | copy.c, remove.c | tests/install/*.sh |
| `join` | 1,231 | Text and data | 5 | - | tests/misc/join*.sh |
| `kill` | 310 | System and users | 1 | - | tests/misc/kill*.sh |
| `link` | 91 | Files and directories | 0 | - | tests/misc/link*.sh |
| `ln` | 713 | Files and directories | 4 | - | tests/ln/*.sh |
| `logname` | 78 | System and users | 0 | - | tests/misc/logname.sh |
| `ls` | 5,745 | File and disk information | 30 | - | tests/ls/*.sh |
| `mkdir` | 319 | Files and directories | 3 | - | tests/misc/mkdir*.sh |
| `mkfifo` | 225 | Files and directories | 2 | - | tests/misc/mkfifo*.sh |
| `mknod` | 317 | Files and directories | 2 | - | tests/misc/mknod*.sh |
| `mktemp` | 358 | Files and directories | 4 | - | tests/misc/mktemp*.sh |
| `mv` | 573 | Files and directories | 4 | copy.c, remove.c | tests/mv/*.sh |
| `nice` | 256 | System and users | 1 | - | tests/misc/nice*.sh |
| `nl` | 661 | Text and data | 6 | - | tests/misc/nl*.sh |
| `nohup` | 229 | System and users | 0 | - | tests/misc/nohup*.sh |
| `nproc` | 137 | System and users | 0 | - | tests/misc/nproc*.sh |
| `numfmt` | 1,754 | System and users | 7 | - | tests/misc/numfmt*.sh |
| `od` | 2,079 | Text and data | 10 | - | tests/misc/od*.sh |
| `paste` | 553 | Text and data | 4 | - | tests/misc/paste*.sh |
| `pathchk` | 421 | Text and data | 3 | - | tests/misc/pathchk*.sh |
| `pinky` | 617 | System and users | 2 | - | tests/misc/pinky*.sh |
| `pr` | 2,908 | Text and data | 16 | - | tests/misc/pr*.sh |
| `printenv` | 197 | System and users | 0 | - | tests/misc/printenv*.sh |
| `printf` | 777 | Shell helpers | 0 | - | tests/misc/printf*.sh |
| `ptx` | 2,049 | Text and data | 11 | - | tests/misc/ptx*.sh |
| `pwd` | 386 | Files and directories | 2 | - | tests/misc/pwd*.sh |
| `readlink` | 218 | Files and directories | 4 | - | tests/misc/readlink*.sh |
| `realpath` | 344 | Files and directories | 3 | - | tests/misc/realpath*.sh |
| `rm` | 396 | Files and directories | 5 | remove.c | tests/rm/*.sh |
| `rmdir` | 295 | Files and directories | 2 | - | tests/misc/rmdir*.sh |
| `runcon` | 273 | System and users | 2 | - | tests/misc/runcon*.sh |
| `seq` | 731 | Shell helpers | 3 | - | tests/misc/seq*.sh |
| `shred` | 1,339 | Files and directories | 10 | - | tests/misc/shred*.sh |
| `shuf` | 624 | Text and data | 3 | - | tests/misc/shuf*.sh |
| `sleep` | 145 | System and users | 2 | - | tests/misc/sleep*.sh |
| `sort` | 5,173 | Text and data | 27 | - | tests/misc/sort*.sh |
| `split` | 1,770 | Text and data | 5 | - | tests/misc/split*.sh |
| `stat` | 1,994 | File and disk information | 7 | - | tests/misc/stat*.sh |
| `stty` | 2,484 | System and users | 25 | - | tests/misc/stty*.sh |
| `sum` | 229 | Text and data | 0 | - | tests/misc/sum*.sh |
| `sync` | 231 | System and users | 0 | - | tests/misc/sync*.sh |
| `tac` | 592 | Text and data | 4 | - | tests/misc/tac*.sh |
| `tail` | 2,596 | Text and data | 7 | - | tests/misc/tail*.sh |
| `tee` | 343 | Text and data | 2 | - | tests/misc/tee*.sh |
| `test` | 899 | Shell helpers | 0 | - | tests/misc/test*.sh |
| `timeout` | 735 | System and users | 5 | - | tests/misc/timeout*.sh |
| `touch` | 451 | Files and directories | 5 | - | tests/misc/touch*.sh |
| `tr` | 1,908 | Text and data | 6 | - | tests/misc/tr*.sh |
| `true` | 73 | System and users | 0 | - | tests/misc/true.sh |
| `truncate` | 385 | Files and directories | 4 | - | tests/misc/truncate*.sh |
| `tsort` | 575 | Text and data | 0 | - | tests/misc/tsort*.sh |
| `tty` | 137 | System and users | 0 | - | tests/misc/tty*.sh |
| `uname` | 418 | System and users | 3 | - | tests/misc/uname*.sh |
| `unexpand` | 343 | Text and data | 4 | expand-common.c | tests/misc/unexpand*.sh |
| `uniq` | 680 | Text and data | 5 | - | tests/misc/uniq*.sh |
| `unlink` | 86 | Files and directories | 0 | - | tests/misc/unlink*.sh |
| `uptime` | 205 | System and users | 0 | - | tests/misc/uptime*.sh |
| `users` | 147 | System and users | 0 | - | tests/misc/users*.sh |
| `wc` | 1,071 | Text and data | 5 | - | tests/misc/wc*.sh |
| `who` | 846 | System and users | 4 | - | tests/misc/who*.sh |
| `whoami` | 86 | System and users | 0 | - | tests/misc/whoami.sh |
| `yes` | 270 | System and users | 0 | - | tests/misc/yes*.sh |

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
