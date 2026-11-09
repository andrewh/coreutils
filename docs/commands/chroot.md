# `chroot`: run command with different root directory

Source: `src/chroot.c` (440 lines) · Tests: `tests/chroot/` ·
Manual: `info '(coreutils) chroot invocation'`

`chroot` changes the root directory for a command using the `chroot` system
call, then changes to `/` inside that new root, and optionally sets user and group
credentials before executing the command. It looks up user and group
information both before and after the `chroot` call to handle different NSS
configurations inside the chroot.

## Options

The table lists `long_opts[]` (`src/chroot.c:54-62`) and the short-option
string `"+"`.

|| Option | Variables |
||---|---|
|| `--userspec=USER:GROUP` | `userspec`: user and group specification |
|| `--groups=G_LIST` | `groups`: comma-separated supplementary groups |
|| `--skip-chdir` | `skip_chdir`: skip `chdir` to `/` after chroot |

## Code map

|| Function | Location | Role |
||---|---|---|
|| `main` | `src/chroot.c:218` | Option parsing, user/group lookup (twice), `chroot`, `chdir`, set credentials, `execvp` |
|| `parse_additional_groups` | `:93` | Parse comma-separated group list to GID array |
|| `is_root` | `:169` | Check if a path resolves to `/` |
|| `usage` | `:178` | Help message |

## How it works

```mermaid
flowchart TD
    A[parse options] --> B[get NEWROOT from argv]
    B --> C[is_root NEWROOT?]
    C -- yes --> D[skip pre-chroot user lookup]
    C -- no --> E{userspec?}
    E -- yes --> F[parse_user_spec outside chroot]
    E -- no --> G{uid set and no groups or gid unset?}
    G -- yes --> H[getpwuid, infer gid and username]
    G -- no --> I{groups specified?}
    I -- yes --> J[parse_additional_groups outside chroot]
    I -- no --> K{xgetgroups for username]
    F --> L
    H --> L
    J --> L
    K --> L
    D --> M[chroot NEWROOT]
    L --> M
    M --> N{skip_chdir?}
    N -- no --> O[chdir /]
    N -- yes --> P
    O --> P{command given?}
    P -- no --> Q[run SHELL -i]
    P -- yes --> R[use argv command]
    Q --> S
    R --> S{userspec?}
    S -- yes --> T[parse_user_spec_warn inside chroot]
    S -- no --> U{uid set and no groups or gid unset or gid inferred?}
    U -- yes --> V[getpwuid inside chroot, set gid and username]
    U -- no --> W
    T --> W{groups specified?}
    W -- yes --> X[parse_additional_groups inside chroot]
    W -- no --> Y{no groups and gid set and username?}
    Y -- yes --> Z[xgetgroups inside chroot]
    Y -- no --> AA[use pre-chroot GIDs]
    X --> AB[use in-gids or out-gids]
    Z --> AB
    AA --> AB
    V --> AB
    AB --> AC[setgroups]
    AC --> AD[setgid]
    AD --> AE[setuid]
    AE --> AF[execvp command]
```

### Dual user/group lookup

User and group information is looked up twice (`src/chroot.c:296-420`):

1. **Before `chroot`:** Loads NSS plugins and provides fallback values if the
   chroot lacks a working user database.
2. **After `chroot`:** Redoes the lookup with the chroot's `/etc/passwd` and
   `/etc/group`. This is the primary reason `chroot` has `--userspec` instead of
   delegating to `su` or `sudo`.

For `--userspec`, `parse_user_spec` is called before `chroot` with errors
ignored (`src/chroot.c:304`). After `chroot`, `parse_user_spec_warn` is called
with errors reported (`src/chroot.c:365-368`). For supplementary groups,
`parse_additional_groups` is called before `chroot` with `show_errors=false`,
and after with `show_errors=true` unless the pre-chroot lookup succeeded
(`src/chroot.c:394-399`).

### Group list parsing

`parse_additional_groups` splits the comma-separated list with `strtok`
(`src/chroot.c:102`). Each token is parsed:

- First, try `xstrtoumax` to parse as a numeric GID.
- If the string has a `+` suffix, treat it as a group name instead.
- If numeric parsing fails, look up the name with `getgrnam`.
- If the name is numeric but exists as a group, use the group's GID.

The function allocates a GID array with `xpalloc` and returns it in `*pgids`
(`src/chroot.c:93-162`). An empty list is an error.

### Supplementary groups from user

If `--groups` is not given but a user is specified, `chroot` calls
`xgetgroups` to get the user's supplementary groups (`src/chroot.c:329-333`
before chroot, `src/chroot.c:405-419` after). This requires `HAVE_SETGROUPS`.

### Command execution

After setting credentials, `main` calls `execvp` (`src/chroot.c:435`). If no
command is given, it runs `$SHELL -i` (default `/bin/sh -i`) by modifying `argv`
directly (`src/chroot.c:344-358`). On exec failure, it returns `EXIT_ENOENT`
(127) for `ENOENT`, otherwise `EXIT_CANNOT_INVOKE` (126).

## Platform notes

`chroot` requires the `chroot` system call, which is not available on all
systems. Platforms without `setgroups` use a stub that returns success for
clearing groups but `ENOTSUP` for setting them (`src/chroot.c:64-82`).
`--skip-chdir` is allowed only when NEWROOT is already `/` (`src/chroot.c:288`).

## Errors and exit status

- **Missing NEWROOT:** "missing operand"
- **`chroot` failure:** "cannot change root directory to NEWROOT" (exit 125)
- **`chdir` failure:** "cannot chdir to root directory" (exit 125)
- **Invalid group:** "invalid group GROUP"
- **Invalid group list:** "invalid group list G_LIST"
- **User/group lookup failure:** Diagnosed by `parse_user_spec_warn`
- **`setgroups` failure:** "failed to set supplemental groups" (exit 125)
- **`setgid` failure:** "failed to set group-ID" (exit 125)
- **`setuid` failure:** "failed to set user-ID" (exit 125)
- **Exec failure:** "failed to run command" (exit 126 for most errors, 127 for ENOENT)

## Tests

|| File | Covers |
||---|---|
|| `tests/chroot/chroot-credentials.sh` | User and group credential changes |
|| `tests/chroot/chroot-fail.sh` | Error cases and invalid options |

## See also

- [env](env.md) for setting environment variables
- [su](https://man7.org/linux/man-pages/man1/su.1.html) (external) for changing users
