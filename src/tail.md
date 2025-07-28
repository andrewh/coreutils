# tail.c - Advanced Following Algorithms and File Monitoring

## Introduction and Core Purpose

The `tail` utility implements advanced algorithms for extracting the last portion of files and continuously monitoring file changes. Beyond simple end-of-file processing, tail provides real-time file following with intelligent rotation detection, multiple monitoring backends, and optimized handling of both regular files and streams.

## Architecture Overview

### Core Data Structures

```c
struct File_spec {
    char *name;                    // File path or "-" for stdin
    off_t size;                   // Cached file size
    struct timespec mtime;        // Last modification time
    dev_t dev;                    // Device number
    ino_t ino;                    // Inode number
    mode_t mode;                  // File mode/type
    bool ignore;                  // Skip this file permanently
    bool remote;                  // Remote filesystem flag
    bool tailable;                // File is readable and appropriate type
    int fd;                       // Open file descriptor (-1 if closed)
    int errnum;                   // Last errno value
    int blocking;                 // Non-blocking I/O state
#if HAVE_INOTIFY
    int wd;                       // inotify watch descriptor
    int parent_wd;                // Parent directory watch descriptor
    size_t basename_start;        // Offset to filename in path
#endif
    uintmax_t n_unchanged_stats;  // Consecutive unchanged stat results
};

enum Follow_mode {
    Follow_name = 1,              // Follow by filename (handle rotation)
    Follow_descriptor = 2         // Follow by file descriptor
};
```

### Algorithm Selection Strategy

Tail employs multiple algorithms based on input characteristics and follow mode:

1. **Regular file with known size**: Backward seeking algorithm
2. **Pipes and streams**: Ring buffer with dynamic allocation
3. **Follow mode**: Event-driven monitoring with fallback polling
4. **Multiple files**: Coordinated monitoring with I/O multiplexing

## Performance Optimizations and Data Structures

### Ring Buffer Implementation for Line Tracking

#### Linked List Buffer System for Pipes
```c
struct linebuffer {
    char buffer[BUFSIZ];
    size_t nbytes;               // Bytes used in this buffer
    size_t nlines;               // Newlines in this buffer
    struct linebuffer *next;     // Next buffer in chain
};

static bool pipe_lines(char const *pretty_filename, int fd, uintmax_t n_lines,
                      uintmax_t *read_pos) {
    LBUFFER *first, *last, *tmp;
    size_t total_lines = 0;
    
    // Dynamically allocate buffers as needed
    first = last = xmalloc (sizeof (LBUFFER));
    
    while (safe_read(fd, tmp->buffer, BUFSIZ) > 0) {
        // Count newlines efficiently
        for (char *p = tmp->buffer; p < buffer_end; p = memchr(p, '\n', remaining)) {
            ++tmp->nlines;
            ++p;
        }
        
        // Link buffer and possibly reuse old ones
        if (total_lines > n_lines) {
            // Output and free oldest buffer
            xwrite_stdout(first->buffer, first->nbytes);
            tmp = first;
            first = first->next;
            total_lines -= tmp->nlines;
            // Reuse the buffer structure
        }
    }
}
```

This ring buffer approach provides:
- **Constant memory usage**: Memory bounded by the number of lines to track
- **Dynamic sizing**: Adapts to varying line lengths and input rates
- **Efficient reuse**: Minimizes allocation/deallocation overhead

#### Character Buffer for Byte Mode
```c
struct charbuffer {
    char buffer[BUFSIZ];
    size_t nbytes;
    struct charbuffer *next;
};

// Similar ring buffer approach but tracks bytes instead of lines
```

### File Rotation Detection and Handling

#### Inode and Device Tracking
```c
static bool check_fspec(struct File_spec *fspec, bool blocking_read) {
    struct stat stats;
    
    if (fstat(fspec->fd, &stats) != 0) {
        // File may have been deleted or moved
        fspec->errnum = errno;
        fspec->tailable = false;
        return false;
    }
    
    // Check if file has been replaced (rotation)
    if (stats.st_ino != fspec->ino || stats.st_dev != fspec->dev) {
        // File was rotated - need to reopen
        return reopen_file(fspec);
    }
    
    // Update cached metadata
    fspec->size = stats.st_size;
    fspec->mtime = get_stat_mtime(&stats);
    return true;
}
```

#### Advanced Following Algorithms (-f option)

##### 1. Descriptor Following (Default)
```c
// Follow the open file descriptor even if file is renamed/deleted
static bool follow_descriptor(struct File_spec *f, size_t n_files) {
    while (true) {
        for (size_t i = 0; i < n_files; i++) {
            if (f[i].tailable) {
                uintmax_t bytes_read = dump_remainder(print_headers, 
                                                     f[i].name, f[i].fd, 
                                                     COPY_TO_EOF);
                f[i].size += bytes_read;
                if (bytes_read) f[i].n_unchanged_stats = 0;
            }
        }
        
        // Intelligent polling with backoff
        poll_files(f, n_files);
    }
}
```

##### 2. Name Following (Handle Rotation)
```c
// Reopen files by name to handle log rotation
static bool follow_name(struct File_spec *f, size_t n_files) {
    while (true) {
        for (size_t i = 0; i < n_files; i++) {
            if (f[i].tailable || reopen_inaccessible_files) {
                // Check if file still exists at this name
                struct stat stats;
                if (stat(f[i].name, &stats) == 0) {
                    if (f[i].fd >= 0 && 
                        (stats.st_ino != f[i].ino || stats.st_dev != f[i].dev)) {
                        // File was rotated - close old, open new
                        close(f[i].fd);
                        f[i].fd = open(f[i].name, O_RDONLY);
                        f[i].ino = stats.st_ino;
                        f[i].dev = stats.st_dev;
                    }
                }
                
                // Read new data
                dump_remainder(print_headers, f[i].name, f[i].fd, COPY_TO_EOF);
            }
        }
        
        poll_files(f, n_files);
    }
}
```

### Optimized Backward Seeking for Regular Files

#### Block-Aligned Reverse Reading
```c
static bool file_lines(char const *pretty_filename, int fd, struct stat const *sb,
                      uintmax_t n_lines, off_t start_pos, off_t end_pos,
                      uintmax_t *read_pos) {
    char buffer[BUFSIZ];
    off_t pos = end_pos;
    
    // Set up block-aligned reading from end
    ptrdiff_t bytes_read = (pos - start_pos) % BUFSIZ;
    if (bytes_read == 0) bytes_read = BUFSIZ;
    pos -= bytes_read;
    
    // Read backwards through file
    while (n_lines > 0) {
        xlseek(fd, pos, SEEK_SET, pretty_filename);
        bytes_read = safe_read(fd, buffer, 
                              pos > start_pos ? BUFSIZ : pos - start_pos);
        
        // Scan backward for newlines
        for (idx_t n = bytes_read; n > 0; ) {
            char const *nl = memrchr(buffer, '\n', n);
            if (nl == nullptr) break;
            
            n = nl - buffer;
            if (--n_lines == 0) {
                // Found the starting position
                if (start_pos < pos) {
                    copy_fd(fd, pos - start_pos);  // Copy prefix
                }
                xwrite_stdout(buffer, n + 1);     // Output remainder
                return true;
            }
        }
        
        if (pos == start_pos) return true;  // Not enough lines
        pos -= BUFSIZ;
    }
}
```

This algorithm provides O(n) performance for finding the last N lines in regular files, dramatically faster than sequential reading for large files.

## Event-Driven File Monitoring

### Inotify Integration (Linux)

```c
#if HAVE_INOTIFY
static int inotify_fd = -1;
static Hash_table *wd_to_fspec;

static bool setup_inotify(struct File_spec *f, size_t n_files) {
    inotify_fd = inotify_init();
    if (inotify_fd < 0) return false;
    
    for (size_t i = 0; i < n_files; i++) {
        if (f[i].tailable) {
            // Watch the file itself
            f[i].wd = inotify_add_watch(inotify_fd, f[i].name, 
                                       IN_MODIFY | IN_ATTRIB | IN_DELETE_SELF);
            
            // For name following, also watch parent directory
            if (follow_mode == Follow_name) {
                char *parent = dirname(f[i].name);
                f[i].parent_wd = inotify_add_watch(inotify_fd, parent,
                                                  IN_CREATE | IN_MOVED_TO);
            }
            
            // Add to hash table for quick lookup
            hash_insert(wd_to_fspec, &f[i]);
        }
    }
    return true;
}

static void handle_inotify_events(struct File_spec *f, size_t n_files) {
    char buffer[4096];
    ssize_t len = read(inotify_fd, buffer, sizeof(buffer));
    
    for (char *ptr = buffer; ptr < buffer + len; ) {
        struct inotify_event *event = (struct inotify_event *)ptr;
        struct File_spec *fspec = hash_lookup(wd_to_fspec, &event->wd);
        
        if (event->mask & IN_MODIFY) {
            // File was modified - read new data
            dump_remainder(print_headers, fspec->name, fspec->fd, COPY_TO_EOF);
        } else if (event->mask & IN_DELETE_SELF) {
            // File was deleted
            fspec->tailable = false;
            close(fspec->fd);
            fspec->fd = -1;
        } else if (event->mask & (IN_CREATE | IN_MOVED_TO)) {
            // New file appeared (possible rotation)
            reopen_file(fspec);
        }
        
        ptr += sizeof(struct inotify_event) + event->len;
    }
}
#endif
```

### Polling Fallback with Adaptive Timing

```c
static void poll_files(struct File_spec *f, size_t n_files) {
    static bool polling_failed = false;
    
#if HAVE_INOTIFY
    if (!polling_failed) {
        struct pollfd pfd = { .fd = inotify_fd, .events = POLLIN };
        int ready = poll(&pfd, 1, 1000);  // 1 second timeout
        
        if (ready > 0) {
            handle_inotify_events(f, n_files);
            return;
        } else if (ready < 0) {
            polling_failed = true;  // Fall back to stat-based polling
        }
    }
#endif
    
    // Stat-based polling with exponential backoff
    static struct timespec delay = { .tv_sec = 1, .tv_nsec = 0 };
    static int unchanged_iterations = 0;
    
    bool any_changed = false;
    for (size_t i = 0; i < n_files; i++) {
        if (check_fspec(&f[i], false)) {
            any_changed = true;
        }
    }
    
    if (!any_changed) {
        unchanged_iterations++;
        if (unchanged_iterations > 5) {
            // Increase delay up to maximum
            if (delay.tv_sec < 60) delay.tv_sec *= 2;
        }
    } else {
        unchanged_iterations = 0;
        delay.tv_sec = 1;  // Reset to fast polling
    }
    
    xnanosleep(&delay);
}
```

## Performance Optimizations for Large Files

### Linux-Specific Optimizations

```c
#if defined __linux__ || defined __ANDROID__
static bool is_local_filesystem(int fd) {
    struct statfs fs_stats;
    if (fstatfs(fd, &fs_stats) != 0) return true;  // Assume local if unknown
    
    // Use optimized algorithms for local filesystems
    return fs_is_local(fs_stats.f_type);
}

static void optimize_for_filesystem(struct File_spec *fspec) {
    if (is_local_filesystem(fspec->fd)) {
        // Enable readahead for local files
        posix_fadvise(fspec->fd, 0, 0, POSIX_FADV_SEQUENTIAL);
    } else {
        // Disable prefetch for network filesystems
        posix_fadvise(fspec->fd, 0, 0, POSIX_FADV_RANDOM);
        fspec->remote = true;
    }
}
#endif
```

### Memory-Efficient Streaming

```c
static uintmax_t dump_remainder(bool want_header, char const *pretty_filename,
                               int fd, uintmax_t n_bytes) {
    char buffer[BUFSIZ];
    uintmax_t n_written = 0;
    
    while (n_bytes > 0) {
        size_t n_to_read = MIN(n_bytes, sizeof(buffer));
        ptrdiff_t n_read = safe_read(fd, buffer, n_to_read);
        
        if (n_read <= 0) break;
        
        xwrite_stdout(buffer, n_read);
        n_written += n_read;
        n_bytes -= n_read;
    }
    
    return n_written;
}
```

This streaming approach ensures constant memory usage regardless of file size.

## Integration with Unix Pipeline Philosophy

### Signal-Safe Operation

```c
static volatile sig_atomic_t interrupted = 0;

static void handle_sigint(int sig) {
    interrupted = 1;
}

// In main loop:
if (interrupted) {
    // Clean shutdown - close files, remove watches
    cleanup_and_exit();
}
```

### Pipe-Aware Behavior

```c
static bool monitor_output = false;

static bool check_output_alive(void) {
    if (!monitor_output) return true;
    
    // Check if stdout is a pipe and reader is still alive
    if (isapipe(STDOUT_FILENO)) {
        char dummy;
        ssize_t result = write(STDOUT_FILENO, &dummy, 0);
        if (result < 0 && errno == EPIPE) {
            return false;  // Reader has terminated
        }
    }
    return true;
}
```

This intelligent pipe monitoring allows tail to exit gracefully when the reader terminates, preventing resource waste in pipeline scenarios.