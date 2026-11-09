# `timeout`: run a command with bounded time

Source: `src/timeout.c` (735 lines) · Tests: `tests/timeout/` ·
Manual: `info '(coreutils) timeout invocation'`

`timeout` runs a command with a time limit. If the command doesn't complete
within the specified duration, it sends a signal (default `SIGTERM`). With
`-k`, it can send `SIGKILL` after a grace period if the command doesn't exit.
It can run in the foreground or background and preserve the command's exit status.

## Options

The table lists `long_options[]` (`src/timeout.c:97-107`) and the short-option
string `"fk:ps:v"`.

|| Option | Variables |
||---|---|
|| `-f`, `--foreground` | `foreground = true`: run in foreground, not as process group leader |
|| `-k DURATION`, `--kill-after=DURATION` | `kill_after`: send SIGKILL after DURATION if command survives |
|| `-p`, `--preserve-status` | `preserve_status = true`: preserve command's exit status on timeout |
|| `-s SIGNAL`, `--signal=SIGNAL` | `term_signal`: signal to send on timeout (default SIGTERM) |
|| `-v`, `--verbose` | `verbose = true`: diagnose timeouts |

## Code map

|| Function | Location | Role |
||---|---|---|
|| `main` | `src/timeout.c:552` | Option parsing, fork, set timeout, wait for child |
|| `settimeout` | `:115` | Set up timer using `timer_settime` or `setitimer` |
|| `cleanup` | `:224` | Signal handler to send signals to monitored process |
|| `send_sig` | `:182` | Send signal to process or process group |
|| `block_signals` | `:495` | Block signals before fork |
|| `disable_core_dumps` | `:531` | Disable core dumps for timeout process |
|| `usage` | `:299` | Help message |

## How it works

`timeout` forks a child process to run the command and sets up a timer
(`src/timeout.c:552-735`):

1. **Option parsing:** Parse timeout duration, signal, and other options.
2. **Signal setup:** Block signals before fork with `block_signals`
   (`src/timeout.c:495-526`).
3. **Fork:** Fork to create the monitored child process.
4. **Child:** Reset signal mask, exec the command. With `PR_SET_PDEATHSIG`,
   set parent death signal (`src/timeout.c:652-671`).
5. **Parent:** Set up timer with `settimeout` (`src/timeout.c:115-178`), wait for
   child.
6. **Timeout:** If the timer expires, `cleanup` sends the configured signal
   (`src/timeout.c:224-297`). With `-k`, a second timer sends `SIGKILL`.
7. **Exit:** Return the child's exit status, or 124 on timeout (unless `-p`).

### Timer setup

`settimeout` uses `timer_settime` for nanosecond resolution if available,
falling back to `setitimer` for microsecond resolution (`src/timeout.c:119-180`).

### Signal handling

The `cleanup` handler sends signals to the monitored process and process group
(`src/timeout.c:224-297`). It handles the case where the command becomes a
group leader. With `-f`, signals are sent only to the monitored process, not
the group.

### Exit status

Exit status is the command's exit status by default. On timeout:
- Default: 124
- With `-p`: Preserved status (command's status if available, otherwise 124)
- With `-k` and SIGKILL: 128 + 9 = 137

## Platform notes

`timeout` uses `timer_settime` on platforms that support it. It uses `prctl`
with `PR_SET_PDEATHSIG` on Linux to ensure the child is killed if the parent
dies unexpectedly. Core dumps are disabled with `prctl` or `setrlimit`.

## Errors and exit status

- **Invalid duration:** Error from `parse_duration`
- **Invalid signal:** Error from `operand2sig`
- **Fork failure:** "fork system call failed"
- **Exec failure:** Exit status 126
- **Command not found:** Exit status 127

Exit status: 0 on success, 124 on timeout, 125 on internal error, 126 on
execution failure, 127 on command not found.

## Tests

|| File | Covers |
||---|---|
|| `tests/timeout/timeout.sh` | Basic timeout functionality |
|| `tests/timeout/timeout-parameters.sh` | Parameter parsing |
|| `tests/timeout/timeout-large-parameters.sh` | Large parameter handling |
|| `tests/timeout/timeout-group.sh` | Process group handling |
|| `tests/timeout/timeout-blocked.pl` | Blocked signal handling |
|| `tests/timeout/init-parent.sh` | Parent death handling |

## See also

- [kill](kill.md) for sending signals
