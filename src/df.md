# df.c - Filesystem Space Reporting System

## Introduction and Administrative Purpose

`df` (disk free) is an essential system monitoring utility that reports filesystem space usage across mounted filesystems. This implementation demonstrates advanced filesystem enumeration, mount point detection, and cross-platform filesystem integration. As a critical system monitoring tool, it provides administrators with real-time visibility into storage utilization and capacity planning data.

## Architecture Overview and Core Algorithms

### Mount Point Enumeration Strategy

The implementation employs a multi-stage approach for comprehensive filesystem discovery:

```c
mount_list = read_file_system_list((fs_select_list != nullptr ||
                                   fs_exclude_list != nullptr ||
                                   print_type || show_local_fs));
```

This design provides:
- Conditional metadata collection based on output requirements
- Efficient filtering of unwanted filesystem types
- Support for both local and remote filesystem detection
- Graceful handling of inaccessible mount points

### Duplicate Mount Detection

A advanced deduplication algorithm prevents double-counting of filesystems:

```c
static void filter_mount_list(bool devices_only) {
    struct devlist *device_list = nullptr;
    devlist_table = hash_initialize(mount_list_size, nullptr,
                                   devlist_hash, devlist_compare, nullptr);
}
```

The algorithm prioritizes mount entries based on:
- Real device names over pseudo-names
- Shorter mount paths (closer to filesystem root)
- Bind mount resolution for accurate reporting

### Field-Based Output System

The implementation features a flexible field-based output system:

```c
struct field_data_t {
    display_field_t field;
    char const *arg;
    field_type_t field_type;
    char const *caption;
    int width;
    bool align_right;
    bool used;
};
```

This design enables:
- Customizable output formats via `--output`
- Automatic column width calculation
- Internationalization support
- Consistent field alignment

## System Integration and Cross-Platform Abstractions

### Filesystem Statistics Abstraction

The implementation abstracts filesystem statistics through conditional compilation:

```c
#if USE_STATVFS
# define STRUCT_STATVFS struct statvfs
# define STATFS statvfs
#else
# define STRUCT_STATVFS struct statfs  
# define STATFS statfs
#endif
```

This approach provides:
- Optimal performance on each platform
- Consistent interface across operating systems
- Fallback mechanisms for limited platforms
- Support for both POSIX and BSD filesystem APIs

### Device Number Resolution

Advanced device resolution handles complex storage configurations:

```c
static struct devlist *devlist_for_dev(dev_t dev) {
    struct devlist dev_entry;
    dev_entry.dev_num = dev;
    
    struct devlist *found = hash_lookup(devlist_table, &dev_entry);
    return found ? found->seen_last : nullptr;
}
```

This mechanism correctly handles:
- LVM and device mapper configurations
- Multi-path storage setups
- Network filesystem identification
- Bind mount detection

### Mount Point Detection

Sophisticated mount point detection for arbitrary files:

```c
static void get_point(char const *point, const struct stat *statp) {
    char *resolved = canonicalize_file_name(point);
    if (resolved && resolved[0] == '/') {
        // Find containing mount point through hierarchy traversal
    }
}
```

The algorithm:
- Canonicalizes paths to resolve symbolic links
- Traverses directory hierarchy to find mount boundaries
- Handles special filesystems appropriately
- Provides fallback mechanisms for edge cases

## Performance Optimizations and Data Structures

### Automount Triggering

Strategic automount activation prevents stale data:

```c
static int automount_stat_err(char const *file, struct stat *st) {
    int fd = open(file, O_RDONLY | O_NOCTTY | O_NONBLOCK);
    if (fd < 0) {
        return stat(file, st) == 0 ? 0 : errno;
    }
    int err = fstat(fd, st) == 0 ? 0 : errno;
    close(fd);
    return err;
}
```

This approach:
- Triggers automounts for accurate statistics
- Avoids hanging on unresponsive network filesystems
- Provides fallback for inaccessible filesystems
- Minimizes system call overhead

### Hash-Based Deduplication

Efficient device tracking through hash tables:

```c
static size_t devlist_hash(void const *x, size_t table_size) {
    struct devlist const *p = x;
    return (uintmax_t) p->dev_num % table_size;
}
```

Benefits include:
- O(1) average-case lookup performance
- Automatic resize for large filesystem counts
- Memory-efficient storage
- Collision handling for edge cases

### Dynamic Table Management

Flexible output table management:

```c
static void alloc_table_row(void) {
    if (nrows == nrows_alloc)
        table = xpalloc(table, &nrows_alloc, 1, -1, sizeof *table);
    table[nrows++] = xinmalloc(ncolumns, sizeof *table[0]);
}
```

This design provides:
- Automatic memory allocation
- Efficient table expansion
- Memory leak prevention
- Column-based data organization

## Cross-Platform Filesystem Support

### Filesystem Type Detection

Comprehensive filesystem type identification:

```c
static char const *human_fstype(STRUCT_STATVFS const *statfsbuf) {
    switch (statfsbuf->f_type) {
        case S_MAGIC_EXT2: return "ext2/ext3";
        case S_MAGIC_XFS: return "xfs";
        case S_MAGIC_NFS: return "nfs";
        // ... extensive filesystem type database
    }
}
```

The implementation recognizes:
- Over 100 different filesystem types
- Platform-specific filesystem variants
- Network and cluster filesystems
- Special-purpose filesystems (proc, sysfs, etc.)

### Human-Readable Output

Sophisticated size formatting with multiple standards:

```c
char *num = human_readable(output_block_size, buf, opts, 1, 1);
```

Features include:
- SI (powers of 1000) and binary (powers of 1024) units
- Automatic scaling for readability
- Locale-specific number formatting
- Customizable precision control

### Unicode and Locale Support

Comprehensive internationalization support:

```c
static void replace_invalid_chars(char *cell) {
    char32_t wc;
    size_t n = mbrtoc32(&wc, src, srcbytes, &mbstate);
    if (!c32iscntrl(wc)) {
        memmove(dst, src, n);
        dst += n;
    } else {
        *dst++ = '?';
    }
}
```

This ensures:
- Safe display of international filesystem names
- Proper handling of control characters
- Terminal compatibility across locales
- Consistent column alignment

## Security Considerations and Error Handling

### Access Control Validation

Careful privilege checking for filesystem access:

```c
if (get_fs_usage(stat_file, device, &fsu)) {
    if (process_all && (errno == EACCES || errno == ENOENT)) {
        // Provide placeholder values for inaccessible filesystems
        fsu.fsu_blocks = fsu.fsu_bfree = UINTMAX_MAX;
    }
}
```

This approach:
- Continues operation despite access restrictions
- Provides meaningful placeholder values
- Distinguishes between different error types
- Maintains security boundaries

### Input Validation

Robust validation of command-line arguments:

```c
if (STREQ(fs_incl->fs_name, fs_excl->fs_name)) {
    error(0, 0, _("file system type %s both selected and excluded"),
          quote(fs_incl->fs_name));
}
```

Validation includes:
- Conflicting option detection
- Filesystem type verification
- Output format validation
- Block size range checking

### Safe String Handling

Comprehensive protection against buffer overflows:

```c
static void replace_problematic_chars(char *cell) {
    static int tty_out = -1;
    if (tty_out < 0)
        tty_out = isatty(STDOUT_FILENO);
    
    (tty_out ? replace_invalid_chars : replace_control_chars)(cell);
}
```

## Testing and Validation Approaches

### Cross-Platform Testing

The test suite validates:
- Behavior across different operating systems
- Various filesystem types and configurations
- Network filesystem handling
- Error condition responses
- Output format consistency

### Performance Testing

Specialized performance tests ensure:
- Scalability with hundreds of mount points
- Efficient handling of slow network filesystems
- Minimal system resource usage
- Responsive operation under load

### Security Testing

Security validation includes:
- Access control enforcement
- Input sanitization verification
- Privilege escalation prevention
- Resource exhaustion resistance

## Integration with System Services

### Mount Table Integration

Seamless integration with system mount information:
- `/proc/mounts` on Linux systems
- `/etc/mtab` compatibility
- `getmntent()` system interface
- Platform-specific mount APIs

### Storage Management Integration

The utility integrates with:
- LVM (Logical Volume Management)
- Device mapper subsystem
- Multi-path storage configurations
- Network-attached storage systems

### Monitoring System Integration

Output formats support integration with:
- System monitoring tools (Nagios, Zabbix)
- Log analysis systems
- Capacity planning software
- Automated alerting systems

This implementation includes approach to filesystem monitoring, demonstrating advanced systems programming techniques while maintaining the simplicity and reliability essential for system administration tools. The careful balance of functionality, performance, and cross-platform compatibility makes it invaluable for both interactive use and automated system monitoring.