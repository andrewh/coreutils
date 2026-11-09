# `stty`: change and print terminal line settings

Source: `src/stty.c` (2484 lines) · Tests: `tests/stty/` ·
Manual: `info '(coreutils) stty invocation'`

`stty` changes and prints terminal line settings. It can display settings in
human-readable form (`-a`) or stty-readable form (`-g`). It controls baud rate,
line discipline, special characters, and various terminal modes (input, output,
control, local). Settings can be applied to a specified device with `-F`.

## Options

|| Option | Purpose |
||---|---|
|| `-a`, `--all` | Print all current settings in human-readable form |
|| `-g`, `--save` | Print all current settings in stty-readable form |
|| `-F DEVICE`, `--file=DEVICE` | Open and use DEVICE instead of stdin |

## Code map

|| Function | Location | Role |
||---|---|---|
|| `main` | `src/stty.c:1309` | Option parsing, get/set terminal settings |
|| `set_mode` | `:1245` | Apply terminal settings from arguments |
|| `display_all` | `:679` | Print all settings in human-readable form |
|| `display_recoverable` | `:828` | Print settings in stty-readable form |
|| `display_speed` | `:904` | Print baud rate |
|| `string_to_baud` | `:443` | Convert baud rate string to speed |
|| `set_speed` | `:471` | Set input/output baud rate |
|| `usage` | `:1159` | Help message |

## How it works

`stty` manipulates the `struct termios` structure to control terminal behavior
(`src/stty.c:1309-1380`):

1. **Initialization:** Get current terminal settings with `tcgetattr`.
2. **Option parsing:** Parse settings arguments (e.g., `echo`, `-echo`, `9600`).
3. **Modification:** Apply settings to the `termios` structure with
   `set_mode` (`src/stty.c:1245-1306`).
4. **Application:** Apply changes with `tcsetattr`.
5. **Display:** With `-a` or `-g`, display settings without modifying.

### Setting categories

Settings are organized into categories:

- **Control modes:** Baud rate, character size, stop bits, parity
- **Input modes:** Input processing (ICRNL, IGNCR, etc.)
- **Output modes:** Output processing (OPOST, ONLCR, etc.)
- **Local modes:** Echo, canonical mode, signal handling
- **Special characters:** Interrupt, quit, erase, kill, EOF, etc.

### Baud rate

Baud rates are set with `set_speed` (`src/stty.c:471-524`). The `cfsetispeed`
and `cfsetospeed` functions set input and output speeds. Common rates include
9600, 19200, 38400, 57600, 115200.

## Platform notes

`stty` uses POSIX `termios` functions. Platform-specific constants are defined
for systems that use different names (e.g., `VWERSE` vs `VWERASE` on AIX).
Control character defaults are defined for systems that don't provide them.

## Errors and exit status

- **Invalid argument:** "invalid argument X"
- **Invalid baud rate:** "invalid baud rate X"
- **Invalid line discipline:** "invalid line discipline X"
- **Device open failure:** Error from `open`
- **tcsetattr failure:** Error from `tcsetattr`

Exit status is 0 on success, 1 on errors.

## Tests

|| File | Covers |
||---|---|
|| `tests/stty/stty.sh` | Basic stty operations |
|| `tests/stty/stty-invalid.sh` | Invalid arguments |
|| `tests/stty/stty-pairs.sh` | Paired settings |
|| `tests/stty/stty-row-col.sh` | Row/column settings |
|| `tests/stty/stty-save-speed.sh` | Save and restore speed |
|| `tests/stty/bad-speed.sh` | Invalid baud rates |

## See also

- [tset](https://man7.org/linux/man-pages/man1/tset.1.html) for terminal initialization
