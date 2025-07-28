# The GNU Coreutils `who` Command: User Session Tracking and System State Analysis

## Introduction

The `who` command is a advanced system monitoring utility that provides comprehensive information about logged-in users, system boot time, and various system states. Far more than a simple user listing tool, it serves as a critical component for system administration, security monitoring, and user activity tracking. The implementation demonstrates advanced utmp/wtmp file processing, cross-platform compatibility, and efficient session management.

### What is `who`?

`who` displays information about users currently logged into the system, along with various system state indicators:

```bash
who                                  # Currently logged users
who -b                              # System boot time
who -r                              # Current runlevel
who -a                              # All available information
who am i                            # Current terminal session
```

The command processes system accounting files (utmp/wtmp) to provide real-time and historical system state information.

## Architecture Overview

The `who` implementation uses a advanced multi-stage processing pipeline:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Command Line  │───→│   UTMP File     │───→│   Entry         │
│    Parsing      │    │   Processing    │    │   Classification│
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Display      │    │   Session       │    │   Entry         │
│   Formatting    │    │   Analysis      │    │   Filtering     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Terminal     │◄───│     Output      │◄───│     System      │
│   Integration   │    │   Generation    │    │   State Data    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## UTMP/WTMP File Processing

### System Accounting Structures

The implementation processes standardised Unix accounting records:

```c
/* Enhanced utmp structure (gnulib abstraction) */
struct gl_utmp {
    short ut_type;                    /* Entry type */
    pid_t ut_pid;                     /* Process ID */
    char ut_line[UT_LINESIZE];        /* Terminal/device name */
    char ut_id[4];                    /* Terminal ID */
    char ut_user[UT_NAMESIZE];        /* Username */
    char ut_host[UT_HOSTSIZE];        /* Hostname */
    struct timespec ut_ts;            /* Timestamp */
    
    /* Extended information */
    struct {
        short e_termination;          /* Process termination status */
        short e_exit;                /* Process exit status */
    } ut_exit;
    
    /* Platform-specific extensions */
    int32_t ut_session;              /* Session ID */
    struct {
        int32_t tv_sec;              /* Seconds */
        int32_t tv_usec;             /* Microseconds */
    } ut_tv;
};

/* Entry type classification */
enum utmp_entry_type {
    EMPTY = 0,           /* Empty entry */
    RUN_LVL = 1,         /* Runlevel change */
    BOOT_TIME = 2,       /* System boot */
    NEW_TIME = 3,        /* Time change */
    OLD_TIME = 4,        /* Previous time */
    INIT_PROCESS = 5,    /* Process spawned by init */
    LOGIN_PROCESS = 6,   /* Login process */
    USER_PROCESS = 7,    /* User process */
    DEAD_PROCESS = 8,    /* Dead process */
    ACCOUNTING = 9       /* Accounting */
};
```

### Efficient File Reading

The implementation uses optimised file processing:

```c
/* High-performance utmp file reading */
static void
process_utmp_file(char const *filename, int options)
{
    idx_t n_users;
    struct gl_utmp *utmp_buf;
    
    /* Read entire file efficiently */
    if (read_utmp(filename, &n_users, &utmp_buf, options) != 0) {
        error(EXIT_FAILURE, errno, "%s", quotef(filename));
    }
    
    /* Process entries based on requested information */
    if (short_list) {
        /* Quick user count mode */
        list_entries_who(n_users, utmp_buf);
    } else {
        /* Full information processing */
        scan_entries(n_users, utmp_buf);
    }
    
    free(utmp_buf);
}

/* Optimised entry scanning with type filtering */
static void
scan_entries(idx_t n, struct gl_utmp const *utmp_buf)
{
    char *ttyname_b = nullptr;
    time_t boottime = TYPE_MINIMUM(time_t);
    
    /* Handle "who am i" mode */
    if (my_line_only) {
        ttyname_b = ttyname(STDIN_FILENO);
        if (!ttyname_b) return;
        
        /* Strip /dev/ prefix */
        if (STRNCMP_LIT(ttyname_b, "/dev/") == 0) {
            ttyname_b += sizeof "/dev/" - 1;
        }
    }
    
    /* Process each entry */
    while (n--) {
        /* Filter by terminal if requested */
        if (!my_line_only || str_endswith(utmp_buf->ut_line, ttyname_b)) {
            /* Process different entry types */
            if (need_users && IS_USER_PROCESS(utmp_buf)) {
                print_user(utmp_buf, boottime);
            } else if (need_runlevel && UT_TYPE_RUN_LVL(utmp_buf)) {
                print_runlevel(utmp_buf);
            } else if (need_boottime && UT_TYPE_BOOT_TIME(utmp_buf)) {
                print_boottime(utmp_buf);
            } else if (need_clockchange && UT_TYPE_NEW_TIME(utmp_buf)) {
                print_clockchange(utmp_buf);
            } else if (need_initspawn && UT_TYPE_INIT_PROCESS(utmp_buf)) {
                print_initspawn(utmp_buf);
            } else if (need_login && UT_TYPE_LOGIN_PROCESS(utmp_buf)) {
                print_login(utmp_buf);
            } else if (need_deadprocs && UT_TYPE_DEAD_PROCESS(utmp_buf)) {
                print_deadprocs(utmp_buf);
            }
        }
        
        /* Track boot time for idle calculations */
        if (UT_TYPE_BOOT_TIME(utmp_buf)) {
            boottime = utmp_buf->ut_ts.tv_sec;
        }
        
        utmp_buf++;
    }
}
```

## User Session Analysis

### Comprehensive Session Information

The implementation provides detailed session analysis:

```c
/* Advanced user session processing */
static void
print_user(struct gl_utmp const *utmp_ent, time_t boottime)
{
    struct stat stats;
    time_t last_change;
    char mesg;                        /* Message status indicator */
    char idlestr[IDLESTR_LEN + 1];   /* Idle time string */
    static char *hoststr;             /* Hostname buffer */
    
    /* Extract device name from ut_line */
    char *line = utmp_ent->ut_line;
    char *space = strchr(line, ' ');
    line = space ? space + 1 : line;
    
    /* Determine terminal device path */
    int dirfd;
    if (IS_ABSOLUTE_FILE_NAME(line)) {
        dirfd = AT_FDCWD;
    } else {
        /* Use cached /dev directory handle */
        static int dev_dirfd;
        if (!dev_dirfd) {
            dev_dirfd = open("/dev", O_PATHSEARCH | O_DIRECTORY);
            if (dev_dirfd < 0) {
                dev_dirfd = AT_FDCWD - 1;
            }
        }
        dirfd = dev_dirfd;
    }
    
    /* Get terminal status and message permissions */
    if (AT_FDCWD <= dirfd && fstatat(dirfd, line, &stats, 0) == 0) {
        mesg = is_tty_writable(&stats) ? '+' : '-';
        last_change = stats.st_atime;
    } else {
        mesg = '?';
        last_change = 0;
    }
    
    /* Calculate idle time */
    if (last_change) {
        sprintf(idlestr, "%.*s", IDLESTR_LEN, 
                idle_string(last_change, boottime));
    } else {
        sprintf(idlestr, "  ?");
    }
    
    /* Process hostname and display information */
    process_hostname_display(utmp_ent, &hoststr);
    
    /* Generate formatted output */
    print_line(utmp_ent->ut_user, mesg, utmp_ent->ut_line,
               time_string(utmp_ent), idlestr, 
               get_pid_string(utmp_ent),
               hoststr ? hoststr : "", "");
}
```

### Terminal State Analysis

```c
/* Terminal message capability detection */
static bool
is_tty_writable(struct stat const *pstat)
{
#ifdef TTY_GROUP_NAME
    /* Verify TTY group ownership for security */
    struct group *ttygr = getgrnam(TTY_GROUP_NAME);
    if (!ttygr || (pstat->st_gid != ttygr->gr_gid)) {
        return false;
    }
#endif
    
    /* Check group write permission */
    return pstat->st_mode & S_IWGRP;
}

/* Intelligent idle time calculation */
static char const *
idle_string(time_t when, time_t boottime)
{
    static time_t now = TYPE_MINIMUM(time_t);
    
    /* Cache current time for efficiency */
    if (now == TYPE_MINIMUM(time_t)) {
        time(&now);
    }
    
    int seconds_idle;
    
    /* Validate time range and calculate idle duration */
    if (boottime < when && when <= now
        && !ckd_sub(&seconds_idle, now, when)
        && seconds_idle < 24 * 60 * 60) {
        
        if (seconds_idle < 60) {
            return "  .  ";  /* Active within last minute */
        } else {
            /* Format as HH:MM */
            static char idle_hhmm[IDLESTR_LEN];
            sprintf(idle_hhmm, "%02d:%02d",
                   seconds_idle / (60 * 60),
                   (seconds_idle % (60 * 60)) / 60);
            return idle_hhmm;
        }
    }
    
    return _(" old ");  /* Older than 24 hours or invalid */
}
```

## Hostname Processing and Network Integration

### Advanced Hostname Resolution

The implementation supports advanced hostname processing:

```c
/* Comprehensive hostname and display handling */
static void
process_hostname_display(struct gl_utmp const *utmp_ent, char **hoststr)
{
    static idx_t hostlen;
    
#if HAVE_STRUCT_XTMP_UT_HOST
    if (utmp_ent->ut_host[0]) {
        char *host = nullptr;
        char *display = nullptr;
        char *ut_host = utmp_ent->ut_host;
        
        /* Extract X11 display information */
        display = strchr(ut_host, ':');
        if (display) {
            *display++ = '\0';
        }
        
        /* Perform DNS lookup if requested */
        if (*ut_host && do_lookup) {
            host = canon_host(ut_host);
        }
        
        if (!host) {
            host = ut_host;
        }
        
        /* Format hostname with display */
        if (display) {
            idx_t needed = strlen(host) + strlen(display) + 4;
            if (hostlen < needed) {
                free(*hoststr);
                *hoststr = xpalloc(nullptr, &hostlen, needed - hostlen, -1, 1);
            }
            char *p = *hoststr;
            *p++ = '(';
            p = stpcpy(p, host);
            *p++ = ':';
            strcpy(stpcpy(p, display), ")");
        } else {
            idx_t needed = strlen(host) + 3;
            if (hostlen < needed) {
                free(*hoststr);
                *hoststr = xpalloc(nullptr, &hostlen, needed - hostlen, -1, 1);
            }
            char *p = *hoststr;
            *p++ = '(';
            strcpy(stpcpy(p, host), ")");
        }
        
        /* Clean up canonicalised hostname */
        if (host != ut_host) {
            free(host);
        }
    } else {
        /* Ensure empty hostname buffer */
        if (hostlen < 1) {
            *hoststr = xpalloc(*hoststr, &hostlen, 1, -1, 1);
        }
        **hoststr = '\0';
    }
#endif
}

/* DNS canonical name resolution */
static char *
resolve_canonical_hostname(char const *hostname)
{
    if (!do_lookup || !hostname || !*hostname) {
        return nullptr;
    }
    
    /* Use gnulib's canon_host for reliable resolution */
    char *canonical = canon_host(hostname);
    
    /* Validate resolved name */
    if (canonical && strcmp(canonical, hostname) == 0) {
        /* No change from canonical resolution */
        free(canonical);
        canonical = nullptr;
    }
    
    return canonical;
}
```

## System State Reporting

### Boot Time and System Events

The implementation tracks various system state changes:

```c
/* System boot time reporting */
static void
print_boottime(struct gl_utmp const *utmp_ent)
{
    print_line("", ' ', _("system boot"),
               time_string(utmp_ent), "", "", "", "");
}

/* Runlevel change tracking */
static void
print_runlevel(struct gl_utmp const *utmp_ent)
{
    static char *runlevline, *comment;
    
    /* Extract runlevel information from ut_pid */
    unsigned char last = utmp_ent->ut_pid / 256;
    unsigned char curr = utmp_ent->ut_pid % 256;
    
    /* Format current runlevel */
    if (!runlevline) {
        runlevline = xmalloc(strlen(_("run-level")) + 3);
    }
    sprintf(runlevline, "%s %c", _("run-level"), curr);
    
    /* Format previous runlevel */
    if (!comment) {
        comment = xmalloc(strlen(_("last=")) + 2);
    }
    sprintf(comment, "%s%c", _("last="), (last == 'N') ? 'S' : last);
    
    print_line("", ' ', runlevline, time_string(utmp_ent),
               "", "", c_isprint(last) ? comment : "", "");
}

/* Process termination tracking */
static void
print_deadprocs(struct gl_utmp const *utmp_ent)
{
    static char *exitstr;
    char *comment = make_id_equals_comment(utmp_ent);
    
    /* Format exit status information */
    if (!exitstr) {
        exitstr = xmalloc(strlen(_("term="))
                         + INT_STRLEN_BOUND(utmp_ent->ut_exit.e_termination) + 1
                         + strlen(_("exit="))
                         + INT_STRLEN_BOUND(utmp_ent->ut_exit.e_exit)
                         + 1);
    }
    sprintf(exitstr, "%s%d %s%d", 
           _("term="), utmp_ent->ut_exit.e_termination,
           _("exit="), utmp_ent->ut_exit.e_exit);
    
    print_line("", ' ', utmp_ent->ut_line,
               time_string(utmp_ent), "", 
               get_pid_string(utmp_ent), comment, exitstr);
    free(comment);
}

/* Clock change detection */
static void
print_clockchange(struct gl_utmp const *utmp_ent)
{
    print_line("", ' ', _("clock change"),
               time_string(utmp_ent), "", "", "", "");
}
```

## Advanced Output Formatting

### Flexible Display Layout

The implementation provides advanced output formatting:

```c
/* Comprehensive line formatting with field alignment */
static void
print_line(char const *user, const char state,
           char const *line, char const *time_str, 
           char const *idle, char const *pid,
           char const *comment, char const *exitstr)
{
    static char mesg[3] = { ' ', 'x', '\0' };
    char *buf;
    char x_idle[1 + IDLESTR_LEN + 1];
    char x_pid[1 + INT_STRLEN_BOUND(pid_t) + 1];
    char *x_exitstr;
    int err;
    
    /* Format message state indicator */
    mesg[1] = state;
    
    /* Format idle time field */
    if (include_idle && !short_output && strlen(idle) < sizeof x_idle - 1) {
        sprintf(x_idle, " %-6s", idle);
    } else {
        *x_idle = '\0';
    }
    
    /* Format process ID field */
    if (!short_output && strlen(pid) < sizeof x_pid - 1) {
        sprintf(x_pid, " %10s", pid);
    } else {
        *x_pid = '\0';
    }
    
    /* Format exit status field */
    x_exitstr = xmalloc(include_exit ? 1 + MAX(12, strlen(exitstr)) + 1 : 1);
    if (include_exit) {
        sprintf(x_exitstr, " %-12s", exitstr);
    } else {
        *x_exitstr = '\0';
    }
    
    /* Construct complete formatted line */
    err = asprintf(&buf,
                   "%-8s"     /* Username */
                   "%s"       /* Message state */
                   " %-12s"   /* Terminal line */
                   " %-*s"    /* Timestamp */
                   "%s"       /* Idle time */
                   "%s"       /* Process ID */
                   " %-8s"    /* Comment/hostname */
                   "%s"       /* Exit status */
                   ,
                   user ? user : "   .",
                   include_mesg ? mesg : "",
                   line,
                   time_format_width,
                   time_str,
                   x_idle,
                   x_pid,
                   comment,
                   x_exitstr);
    
    if (err == -1) {
        xalloc_die();
    }
    
    /* Remove trailing spaces for clean output */
    char *p = buf + strlen(buf);
    while (*--p == ' ') {
        /* empty */;
    }
    *(p + 1) = '\0';
    
    puts(buf);
    free(buf);
    free(x_exitstr);
}

/* Intelligent time formatting */
static char const *
time_string(struct gl_utmp const *utmp_ent)
{
    static char buf[INT_STRLEN_BOUND(intmax_t) + sizeof "-%m-%d %H:%M"];
    struct tm *tmp = localtime(&utmp_ent->ut_ts.tv_sec);
    
    if (tmp) {
        strftime(buf, sizeof buf, time_format, tmp);
        return buf;
    } else {
        /* Fallback for invalid timestamp */
        return timetostr(utmp_ent->ut_ts.tv_sec, buf);
    }
}
```

### User Count and Summary Modes

```c
/* Efficient user counting with summary display */
static void
list_entries_who(idx_t n, struct gl_utmp const *utmp_buf)
{
    idx_t entries = 0;
    char const *separator = "";
    
    /* Count and display active users */
    while (n--) {
        if (IS_USER_PROCESS(utmp_buf)) {
            char *trimmed_name;
            
            /* Extract and clean username */
            trimmed_name = extract_trimmed_name(utmp_buf);
            
            printf("%s%s", separator, trimmed_name);
            free(trimmed_name);
            separator = " ";
            entries++;
        }
        utmp_buf++;
    }
    
    /* Display summary count */
    printf(_("\n# users=%td\n"), entries);
}

/* Column header generation */
static void
print_heading(void)
{
    print_line(_("NAME"), ' ', _("LINE"), _("TIME"), _("IDLE"),
               _("PID"), _("COMMENT"), _("EXIT"));
}
```

## Performance Optimisations

### Efficient File Processing

The implementation optimises for various performance scenarios:

```c
/* Optimised utmp reading strategies */
static void
optimise_utmp_processing(char const *filename, int *options)
{
    struct stat file_stat;
    
    /* Analyse file characteristics for optimisation */
    if (stat(filename, &file_stat) == 0) {
        /* Large files benefit from selective reading */
        if (file_stat.st_size > LARGE_UTMP_THRESHOLD) {
            if (short_list) {
                *options |= READ_UTMP_USER_PROCESS;
            }
        }
        
        /* Recent files might be in cache */
        time_t now = time(nullptr);
        if (now - file_stat.st_mtime < RECENT_FILE_THRESHOLD) {
            *options |= READ_UTMP_CHECK_PIDS;
        }
    }
}

/* Memory-efficient entry processing */
static void
process_entries_efficiently(idx_t n, struct gl_utmp const *utmp_buf)
{
    /* Pre-filter entries to reduce processing overhead */
    idx_t active_entries = 0;
    
    /* Count relevant entries first */
    for (idx_t i = 0; i < n; i++) {
        if (entry_matches_criteria(&utmp_buf[i])) {
            active_entries++;
        }
    }
    
    /* Allocate processing buffer if needed */
    if (active_entries > PROCESSING_THRESHOLD) {
        use_buffered_processing = true;
    }
}
```

### Network Operation Optimisation

```c
/* Efficient hostname lookup management */
static void
optimise_hostname_lookups(void)
{
    /* Implement DNS lookup caching */
    static struct hostname_cache {
        char *address;
        char *canonical;
        time_t cached_time;
    } *cache = nullptr;
    static size_t cache_size = 0;
    
    /* Configure DNS timeout for responsiveness */
    if (do_lookup) {
        set_dns_timeout(DNS_LOOKUP_TIMEOUT);
        
        /* Pre-allocate cache for common case */
        if (!cache) {
            cache_size = HOSTNAME_CACHE_SIZE;
            cache = xcalloc(cache_size, sizeof *cache);
        }
    }
}
```

## Cross-Platform Compatibility

### System-Specific Adaptations

The implementation handles various Unix variants:

```c
/* Platform-specific utmp handling */
static void
handle_platform_utmp_differences(void)
{
    /* Linux-specific optimisations */
#ifdef __linux__
    /* Use efficient utmpx functions when available */
    if (have_utmpx_support()) {
        use_utmpx_interface = true;
    }
#endif

    /* BSD-specific adaptations */
#ifdef BSD
    /* Handle BSD utmp format variations */
    adjust_for_bsd_utmp_format();
#endif

    /* Solaris-specific features */
#ifdef __sun
    /* Utilise Solaris extended utmp features */
    enable_solaris_extensions();
#endif

    /* AIX-specific handling */
#ifdef _AIX
    /* AIX has different utmp semantics */
    configure_aix_utmp_processing();
#endif
}

/* Consistent time handling across platforms */
static void
normalise_timestamp_handling(void)
{
    /* Handle different timestamp precision */
    if (time_format_width == 0) {
        /* Determine optimal time format based on locale */
        if (hard_locale(LC_TIME)) {
            time_format = "%Y-%m-%d %H:%M";
            time_format_width = 4 + 1 + 2 + 1 + 2 + 1 + 2 + 1 + 2;
        } else {
            time_format = "%b %e %H:%M";
            time_format_width = 3 + 1 + 2 + 1 + 2 + 1 + 2;
        }
    }
}
```

## Security and Privacy Considerations

### Access Control and Privacy

The implementation includes privacy and security features:

```c
/* Secure utmp file access */
static bool
verify_utmp_file_access(char const *filename)
{
    struct stat file_stat;
    
    /* Verify file permissions and ownership */
    if (stat(filename, &file_stat) != 0) {
        return false;
    }
    
    /* Check for appropriate permissions */
    if (!(file_stat.st_mode & S_IRUSR) ||
        (file_stat.st_mode & (S_IWGRP | S_IWOTH))) {
        warn_unsafe_utmp_permissions(filename);
    }
    
    /* Verify reasonable file size */
    if (file_stat.st_size > MAX_REASONABLE_UTMP_SIZE) {
        warn_large_utmp_file(filename);
    }
    
    return true;
}

/* Privacy-aware hostname display */
static void
apply_privacy_filters(char *hostname)
{
    /* Option to sanitise hostnames for privacy */
    if (privacy_mode) {
        /* Replace or mask sensitive hostname information */
        sanitise_hostname_for_privacy(hostname);
    }
    
    /* Limit hostname length to prevent overflow attacks */
    if (strlen(hostname) > MAX_SAFE_HOSTNAME_LENGTH) {
        hostname[MAX_SAFE_HOSTNAME_LENGTH] = '\0';
        warn_truncated_hostname();
    }
}
```

## Error Handling and Diagnostics

### Comprehensive Error Management

```c
/* Robust error handling for file operations */
static void
handle_utmp_processing_errors(char const *filename, int error_code)
{
    switch (error_code) {
        case ENOENT:
            /* Handle missing utmp file gracefully */
            if (strcmp(filename, UTMP_FILE) == 0) {
                error(0, 0, _("warning: %s does not exist"), quotef(filename));
                suggest_alternative_utmp_files();
            } else {
                error(EXIT_FAILURE, error_code, "%s", quotef(filename));
            }
            break;
            
        case EACCES:
            error(EXIT_FAILURE, error_code, 
                  _("cannot read %s: insufficient permissions"), quotef(filename));
            break;
            
        case EISDIR:
            error(EXIT_FAILURE, error_code, 
                  _("%s is a directory"), quotef(filename));
            break;
            
        default:
            error(EXIT_FAILURE, error_code, "%s", quotef(filename));
            break;
    }
}

/* Diagnostic information for troubleshooting */
static void
provide_diagnostic_information(void)
{
    if (verbose_mode) {
        /* Display information about utmp file processing */
        printf(_("Using utmp file: %s\n"), UTMP_FILE);
        printf(_("Using wtmp file: %s\n"), WTMP_FILE);
        
        /* Display processing statistics */
        printf(_("Processed %zu entries\n"), total_entries_processed);
        printf(_("Found %zu user sessions\n"), user_sessions_found);
    }
}
```

## Testing and Quality Assurance

### Comprehensive Test Coverage

The `who` implementation includes extensive testing:

```bash
# Basic functionality tests
who                                  # Current users
who -a                              # All information
who -b                              # Boot time
who -q                              # User count only
who am i                            # Current session

# System state tests
who -r                              # Runlevel
who -d                              # Dead processes
who -p                              # Init processes
who -t                              # Clock changes

# Output format tests
who -H                              # With heading
who -T                              # Message status
who -u                              # Idle times
who --lookup                        # DNS resolution

# Edge cases
who /nonexistent 2>/dev/null        # Missing file
who /dev/null                       # Empty file
who -m                              # My line only
```

### Performance Benchmarks

The implementation is optimised for various scenarios:

- **Large utmp files**: Efficient reading and filtering
- **Network hostname resolution**: Configurable DNS timeouts
- **Terminal width adaptation**: Dynamic formatting
- **Multiple information types**: Selective processing

## Integration with System Administration

### System Monitoring Integration

```c
/* Integration with system monitoring tools */
static void
support_monitoring_integration(void)
{
    /* Machine-readable output format */
    if (machine_readable_output) {
        set_output_format_json();
    }
    
    /* Syslog integration for security monitoring */
    if (log_access_attempts) {
        log_who_invocation();
    }
    
    /* Integration with systemd journal */
    if (systemd_journal_available()) {
        enable_journal_correlation();
    }
}

/* Support for configuration management */
static void
apply_system_configuration(void)
{
    /* Read system-wide who configuration */
    char const *config_file = "/etc/who.conf";
    if (access(config_file, R_OK) == 0) {
        apply_configuration_file(config_file);
    }
    
    /* Apply user-specific configuration */
    char const *user_config = get_user_config_file();
    if (user_config && access(user_config, R_OK) == 0) {
        apply_configuration_file(user_config);
    }
}
```

## Conclusion

The `who` implementation includes system monitoring tool with comprehensive session tracking capabilities. Technical features include:

1. **Advanced utmp/wtmp processing**: Efficient handling of system accounting files
2. **Comprehensive session analysis**: Detailed user and system state tracking
3. **Network integration**: Hostname resolution and display formatting
4. **Cross-platform compatibility**: Support for various Unix variants and accounting systems
5. **Performance optimisation**: Efficient file processing and memory management
6. **Security awareness**: Privacy controls and access validation

The codebase demonstrates good systems programming practices:
- Efficient file processing with minimal memory overhead
- Robust error handling for system file operations
- Cross-platform abstraction for accounting file formats
- Performance optimisation for network operations
- Comprehensive security and privacy considerations

For system administrators and monitoring professionals, this implementation provides:
- Comprehensive user session tracking capabilities
- System state monitoring and change detection
- Integration with modern security and monitoring frameworks
- Flexible output formatting for automation and analysis
- Historical system state analysis capabilities

The `who` command demonstrates how fundamental system monitoring tools can provide both simple user information and advanced system state analysis while maintaining good performance and reliability across diverse Unix-like systems.