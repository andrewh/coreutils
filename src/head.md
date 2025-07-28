# head.c - Efficient Line-Based Text Extraction

## Introduction and Core Purpose

The `head` utility extracts the first portion of files or streams, providing both line-based and byte-based modes with advanced optimization strategies for different input types. Unlike simple sequential reading, head implements advanced algorithms for efficient handling of large files and complex elision scenarios (outputting all but the last N units).

## Architecture Overview

### Core Data Structures

```c
enum Copy_fd_status {
    COPY_FD_OK = 0,
    COPY_FD_READ_ERROR,
    COPY_FD_UNEXPECTED_EOF
};

enum header_mode {
    multiple_files, always, never
};
```

The implementation distinguishes between two primary operation modes:
- **Forward extraction**: Output first N lines/bytes
- **Reverse elision**: Output all but last N lines/bytes (negative arguments)

### Algorithm Selection Strategy

Head employs dynamic algorithm selection based on input characteristics:

1. **Pipe/Stream Mode**: Uses buffered sequential reading with linked-list management
2. **Regular File Mode**: Leverages file size information and seeking for optimization
3. **Mixed Mode**: Automatically detects file type and switches algorithms

## Performance Optimizations and Data Structures

### Buffer Management for Optimal Performance

#### 1. Adaptive Buffer Sizing
```c
#ifndef HEAD_TAIL_PIPE_READ_BUFSIZE
# define HEAD_TAIL_PIPE_READ_BUFSIZE BUFSIZ
#endif

#ifndef HEAD_TAIL_PIPE_BYTECOUNT_THRESHOLD
# define HEAD_TAIL_PIPE_BYTECOUNT_THRESHOLD 1024 * 1024
#endif
```

The implementation uses adaptive buffer sizing with threshold-based algorithm selection:
- Small elisions (< 1MB): Double-buffering for time efficiency
- Large elisions: Single-buffer approach to conserve memory

#### 2. Double-Buffer Strategy for Small Elisions
```c
if (n_elide <= HEAD_TAIL_PIPE_BYTECOUNT_THRESHOLD) {
    idx_t n_to_read = READ_BUFSIZE + n_elide;
    char *b[2];
    b[0] = xnmalloc (2, n_to_read);
    b[1] = b[0] + n_to_read;
    
    for (i = false; ! eof ; i = !i) {
        // Alternate between buffers for continuous processing
    }
}
```

This approach enables overlapped I/O processing, reducing latency in streaming scenarios.

### Ring Buffer Implementation for Line Tracking

#### Line Buffer Management
```c
struct linebuffer {
    char buffer[BUFSIZ + 1];
    size_t nbytes;
    size_t nlines;
    struct linebuffer *next;
};
```

The linked-list buffer system provides:
- **Dynamic allocation**: Buffers allocated only as needed
- **Memory compaction**: Intelligent reuse of freed buffers
- **Line counting optimization**: Cached line counts per buffer

#### Optimized Line Counting Algorithm
```c
char *buffer_end = tmp->buffer + n_read;
*buffer_end = line_end;
char const *p = tmp->buffer;
while ((p = rawmemchr (p, line_end)) < buffer_end) {
    ++p;
    ++tmp->nlines;
}
```

Uses `rawmemchr` with sentinel character for vectorized line counting, significantly faster than byte-by-byte scanning.

### File Seeking Optimizations

#### Regular File Optimization Strategy
```c
static bool elide_tail_lines_seekable(char const *pretty_filename, int fd,
                                     uintmax_t n_lines,
                                     off_t start_pos, off_t size) {
    // Backward seeking from end of file
    off_t pos = size;
    bytes_read = (pos - start_pos) % BUFSIZ;
    if (bytes_read == 0) bytes_read = BUFSIZ;
    pos -= bytes_read;
}
```

For regular files, head implements reverse scanning:
1. **Block-aligned reads**: Positions reads on BUFSIZ boundaries
2. **Backward scanning**: Scans from end to find the Nth newline
3. **Minimal copying**: Outputs data directly without intermediate buffering

## Unicode and Multi-byte Character Support

### Locale-Aware Processing

The implementation respects locale settings but operates primarily at the byte level:

```c
static char line_end = '\n';  // Configurable via -z option

// Zero-terminated mode support
if (line_end == '\0') {
    // Process NUL-terminated records
}
```

### Character vs Byte Mode Distinction

- **Byte mode** (`-c`): Operates on raw bytes, locale-independent
- **Line mode** (`-n`): Respects line terminators, supports custom delimiters
- **Character mode**: Currently aliased to byte mode (historical POSIX compatibility)

## Memory Management Strategies

### Memory Allocation Patterns

#### 1. Lazy Buffer Allocation
```c
if (n_array_alloc == i) {
    b = xpalloc (b, &n_array_alloc, 1, MIN (n_bufs, PTRDIFF_MAX),
                 sizeof *b);
}
if (! buffered_enough) {
    b[i] = xmalloc (READ_BUFSIZE);
    n_alloc = i + 1;
}
```

Buffers are allocated incrementally, avoiding large upfront memory allocation for small inputs.

#### 2. Circular Buffer Reuse
For large elisions, the implementation maintains a circular array of buffers, reusing memory as data is processed and output.

#### 3. Automatic Memory Management
```c
while (first) {
    tmp = first->next;
    free (first);
    first = tmp;
}
```

Comprehensive cleanup ensures no memory leaks in long-running or repeated operations.

## Error Handling and Edge Cases

### Robust File State Management

```c
static enum Copy_fd_status copy_fd(int src_fd, uintmax_t n_bytes) {
    while (0 < n_bytes) {
        ptrdiff_t n_read = safe_read (src_fd, buf, n_to_read);
        if (n_read < 0) return COPY_FD_READ_ERROR;
        if (n_read == 0 && n_bytes != 0) return COPY_FD_UNEXPECTED_EOF;
        // Handle partial reads and interrupted system calls
    }
}
```

### Edge Case Handling

1. **File shrinkage detection**: Handles files that shrink during processing
2. **Interrupted reads**: Robust handling of EINTR and partial reads
3. **Seeking failures**: Graceful fallback to sequential processing
4. **Memory exhaustion**: Clean error reporting and resource cleanup

## Integration with Unix Pipeline Philosophy

### Stream Processing Design

Head is designed as a filter that preserves Unix pipeline semantics:

```c
// Preserve original file position when possible
if (0 <= current_pos && elseek (fd, desired_pos, SEEK_SET, filename) < 0)
    ok = false;
```

### Binary vs Text Mode Handling

```c
xset_binary_mode (STDOUT_FILENO, O_BINARY);
if (is_stdin) {
    xset_binary_mode (STDIN_FILENO, O_BINARY);
}
```

Explicit binary mode ensures consistent behavior across platforms, essential for processing binary data or mixed content.

### Signal Safety and Interruption Handling

The implementation uses safe I/O functions (`safe_read`, `full_read`) that properly handle signal interruption and partial operations.

## Code Examples: Key Implementations

### Efficient Byte Copying with Bounded Read
```c
static bool head_bytes(char const *filename, int fd, uintmax_t bytes_to_write) {
    char buffer[BUFSIZ];
    while (bytes_to_write) {
        size_t bytes_to_read = MIN(bytes_to_write, BUFSIZ);
        ptrdiff_t bytes_read = safe_read (fd, buffer, bytes_to_read);
        if (bytes_read <= 0) break;
        xwrite_stdout (buffer, bytes_read);
        bytes_to_write -= bytes_read;
    }
    return true;
}
```

### Line-Aware Processing with Position Tracking
```c
static bool head_lines(char const *filename, int fd, uintmax_t lines_to_write) {
    char buffer[BUFSIZ];
    while (lines_to_write) {
        ptrdiff_t bytes_read = safe_read (fd, buffer, BUFSIZ);
        idx_t bytes_to_write = 0;
        
        while (bytes_to_write < bytes_read) {
            if (buffer[bytes_to_write++] == line_end && --lines_to_write == 0) {
                // Seek back if we've read too far
                off_t n_bytes_past_EOL = bytes_read - bytes_to_write;
                if (lseek (fd, -n_bytes_past_EOL, SEEK_CUR) < 0) {
                    // Handle non-seekable files gracefully
                }
                break;
            }
        }
        xwrite_stdout (buffer, bytes_to_write);
    }
    return true;
}
```

This approach demonstrates head's commitment to efficiency while maintaining correctness across diverse input types and processing scenarios.