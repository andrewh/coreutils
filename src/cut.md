# cut.c - Field and Character Extraction Algorithms

## Introduction and Core Purpose

The `cut` utility implements advanced field and character extraction algorithms with support for multi-byte character encodings, customizable delimiters, and memory-efficient streaming processing. Beyond simple field selection, cut provides complement operations, output delimiter transformation, and locale-aware field separation optimized for large datasets.

## Architecture Overview

### Core Data Structures

```c
/* Field range management from set-fields.h */
struct field_range_pair {
    uintmax_t lo;        // Start of range (1-based)
    uintmax_t hi;        // End of range (inclusive)
};

/* Global processing state */
static struct field_range_pair *current_rp;  // Current range being processed
static char *field_1_buffer;                 // Buffer for first field processing
static size_t field_1_bufsize;              // Size of field_1_buffer
static bool suppress_non_delimited;         // -s option: skip lines without delimiters
static bool complement;                      // --complement: invert selection
static unsigned char delim;                 // Field delimiter character
static unsigned char line_delim = '\n';     // Line delimiter (configurable with -z)
static char *output_delimiter_string;       // Custom output delimiter
static size_t output_delimiter_length;      // Length of output delimiter
```

### Operation Modes

Cut operates in two primary modes:
1. **Character/Byte Mode** (`-c`, `-b`): Extract character or byte ranges
2. **Field Mode** (`-f`): Extract delimited fields with advanced delimiter handling

## Field Extraction Algorithms

### Advanced Field Processing Architecture

#### First Field Buffer Strategy
```c
/* The first field requires special handling for -s semantics */
static void process_first_field(FILE *stream, bool buffer_first_field) {
    if (field_idx == 1 && buffer_first_field) {
        ssize_t len = getndelim2(&field_1_buffer, &field_1_bufsize, 0,
                                GETNLINE_NO_LIMIT, delim, line_delim, stream);
        
        /* Check if field is delimited or extends to end of line */
        if (to_uchar(field_1_buffer[len - 1]) != delim) {
            if (suppress_non_delimited) {
                /* Skip non-delimited lines when -s is specified */
                return;
            } else {
                /* Output entire line for non-delimited input */
                xwrite_stdout(field_1_buffer, len);
                return;
            }
        }
        
        /* Output first field if selected */
        if (print_kth(1)) {
            xwrite_stdout(field_1_buffer, len - 1);  // Exclude delimiter
            found_any_selected_field = true;
        }
    }
}
```

This advanced first-field handling enables correct implementation of the `-s` flag semantics while maintaining efficient streaming.

#### Memory-Efficient Field Extraction
```c
static void cut_fields(FILE *stream) {
    int c;
    uintmax_t field_idx = 1;
    bool found_any_selected_field = false;
    
    current_rp = frp;  // Initialize field range pointer
    
    while (true) {
        bool output_this_field = print_kth(field_idx);
        
        if (output_this_field) {
            if (found_any_selected_field) {
                /* Output delimiter between selected fields */
                xwrite_stdout(output_delimiter_string, output_delimiter_length);
            }
            found_any_selected_field = true;
            
            /* Extract field character by character */
            while ((c = getc(stream)) != delim && c != line_delim && c != EOF) {
                putchar(c);
            }
        } else {
            /* Skip non-selected field efficiently */
            while ((c = getc(stream)) != delim && c != line_delim && c != EOF) {
                /* Consume characters without output */
            }
        }
        
        /* Handle field transitions and line endings */
        if (c == delim) {
            next_item(&field_idx);
        } else if (c == line_delim || c == EOF) {
            /* Process end of line */
            if (found_any_selected_field || 
                !(suppress_non_delimited && field_idx == 1)) {
                putchar(line_delim);
            }
            if (c == EOF) break;
            
            /* Reset for next line */
            field_idx = 1;
            current_rp = frp;
            found_any_selected_field = false;
        }
    }
}
```

### Range Processing Optimization

#### Efficient Range Traversal
```c
/* Increment field/byte index and advance range pointer if necessary */
static inline void next_item(uintmax_t *item_idx) {
    (*item_idx)++;
    if ((*item_idx) > current_rp->hi) {
        current_rp++;  // Move to next range
    }
}

/* Check if current position should be output */
static inline bool print_kth(uintmax_t k) {
    return current_rp->lo <= k;
}

/* Check if current position starts a new range */
static inline bool is_range_start_index(uintmax_t k) {
    return k == current_rp->lo;
}
```

This range management system provides O(1) lookup for determining field selection, enabling efficient processing of complex range specifications like "1,3-5,7,10-".

## Character and Byte Extraction

### Streaming Character Processing
```c
static void cut_bytes(FILE *stream) {
    uintmax_t byte_idx = 0;
    bool print_delimiter = false;
    current_rp = frp;
    
    while (true) {
        int c = getc(stream);
        
        if (c == line_delim) {
            putchar(c);
            /* Reset state for new line */
            byte_idx = 0;
            print_delimiter = false;
            current_rp = frp;
        } else if (c == EOF) {
            if (byte_idx > 0) putchar(line_delim);
            break;
        } else {
            next_item(&byte_idx);
            
            if (print_kth(byte_idx)) {
                /* Handle custom output delimiter for byte ranges */
                if (output_delimiter_string != output_delimiter_default) {
                    if (print_delimiter && is_range_start_index(byte_idx)) {
                        xwrite_stdout(output_delimiter_string, output_delimiter_length);
                    }
                    print_delimiter = true;
                }
                putchar(c);
            }
        }
    }
}
```

## Delimiter Processing and Multi-byte Character Support

### Advanced Delimiter Handling

#### Custom Delimiter Support
```c
/* Support for single-character delimiters including NUL */
static void parse_delimiter(char const *delim_arg) {
    if (delim_arg[0] != '\0' && delim_arg[1] != '\0') {
        error(EXIT_FAILURE, 0, _("the delimiter must be a single character"));
    }
    delim = delim_arg[0];  // Supports NUL delimiter when delim_arg is ""
}

/* Handle special case where delimiter equals line delimiter */
static void handle_newline_delimiter(FILE *stream) {
    if (delim == line_delim && c == delim) {
        /* With -d$'\n', don't treat final newline as field delimiter */
        int last_c = getc(stream);
        if (last_c != EOF) {
            ungetc(last_c, stream);
        } else {
            c = last_c;  // EOF case
        }
    }
}
```

#### Output Delimiter Transformation
```c
/* Flexible output delimiter configuration */
static void setup_output_delimiter(void) {
    if (output_delimiter_string == nullptr) {
        /* Default: use input delimiter as output delimiter */
        output_delimiter_default[0] = delim;
        output_delimiter_string = output_delimiter_default;
        output_delimiter_length = 1;
    } else {
        /* Custom output delimiter (including empty string for NUL) */
        output_delimiter_length = (output_delimiter_string[0] == '\0') 
                                 ? 1 : strlen(output_delimiter_string);
    }
}
```

### Locale-Aware Field Separation

The implementation respects locale settings for character classification while maintaining byte-level precision:

```c
/* Character vs. byte mode distinction */
static bool byte_mode = false;

/* Currently, character mode is aliased to byte mode for compatibility */
switch (optc) {
    case 'b':
    case 'c':
        byte_mode = true;
        FALLTHROUGH;
    case 'f':
        /* Field mode processing */
        break;
}
```

## Memory Management Strategies

### Adaptive Buffer Management

#### Dynamic Field Buffer Allocation
```c
/* First field buffer grows as needed */
static void ensure_field_buffer_capacity(size_t required_size) {
    if (field_1_bufsize < required_size) {
        field_1_buffer = xrealloc(field_1_buffer, required_size);
        field_1_bufsize = required_size;
    }
}

/* Cleanup on exit */
static void cleanup_buffers(void) {
    free(field_1_buffer);
    field_1_buffer = nullptr;
    field_1_bufsize = 0;
}
```

#### Streaming Processing Architecture
Cut employs a streaming architecture that processes input character-by-character or field-by-field without requiring the entire input to be buffered in memory. This approach enables processing of arbitrarily large files with constant memory usage.

### Range Set Management

The field and character ranges are managed through the `set-fields.h` module, which provides:

```c
/* Range specification parsing and optimization */
void set_fields(char const *fieldstr, unsigned int options);

/* Global range array populated by set_fields */
extern struct field_range_pair *frp;

/* Options for range processing */
#define SETFLD_ERRMSG_USE_POS  1  // Use "position" instead of "field" in errors
#define SETFLD_COMPLEMENT      2  // Invert the selection
```

## Error Handling and Edge Cases

### Robust Stream Processing

```c
static bool cut_file(char const *file, void (*cut_stream)(FILE *)) {
    FILE *stream;
    
    if (STREQ(file, "-")) {
        stream = stdin;
        have_read_stdin = true;
    } else {
        stream = fopen(file, "r");
        if (stream == nullptr) {
            error(0, errno, "%s", quotef(file));
            return false;
        }
    }
    
    /* Optimize for sequential access */
    fadvise(stream, FADVISE_SEQUENTIAL);
    
    cut_stream(stream);
    
    /* Proper error handling for file operations */
    int err = errno;
    if (!ferror(stream)) err = 0;
    
    if (STREQ(file, "-")) {
        clearerr(stream);  // Clear EOF flag for stdin
    } else if (fclose(stream) == EOF) {
        err = errno;
    }
    
    if (err) {
        error(0, err, "%s", quotef(file));
        return false;
    }
    
    return true;
}
```

### Input Validation and Error Recovery

```c
/* Comprehensive option validation */
static void validate_options(void) {
    if (!spec_list_string) {
        error(EXIT_FAILURE, 0, 
              _("you must specify a list of bytes, characters, or fields"));
    }
    
    if (byte_mode) {
        if (delim_specified) {
            error(EXIT_FAILURE, 0,
                  _("an input delimiter may be specified only when operating on fields"));
        }
        
        if (suppress_non_delimited) {
            error(EXIT_FAILURE, 0,
                  _("suppressing non-delimited lines makes sense only when operating on fields"));
        }
    }
}
```

## Integration with Unix Pipeline Philosophy

### Stream-Oriented Design

Cut is designed as a pure filter that preserves Unix pipeline semantics:

```c
/* Standard input/output handling */
int main(int argc, char **argv) {
    /* ... option processing ... */
    
    void (*cut_stream)(FILE *) = byte_mode ? cut_bytes : cut_fields;
    
    if (optind == argc) {
        /* No files specified - read from stdin */
        return cut_file("-", cut_stream) ? EXIT_SUCCESS : EXIT_FAILURE;
    } else {
        /* Process each specified file */
        bool ok = true;
        for (; optind < argc; optind++) {
            ok &= cut_file(argv[optind], cut_stream);
        }
        return ok ? EXIT_SUCCESS : EXIT_FAILURE;
    }
}
```

### Binary Data Handling

Cut handles binary data correctly by operating at the byte level and avoiding locale-specific transformations:

```c
/* Open files in text mode (default) but handle binary data correctly */
stream = fopen(file, "r");

/* Character processing respects byte boundaries */
while ((c = getc(stream)) != EOF) {
    /* Process each byte individually */
}
```

## Code Examples: Key Implementations

### Efficient Range-Based Selection
```c
/* Example: Process "1,3-5,8-" range specification */
static void demonstrate_range_processing(void) {
    /* Ranges are pre-sorted and merged by set_fields() */
    /* frp contains: {1,1}, {3,5}, {8,UINTMAX_MAX} */
    
    current_rp = frp;
    for (uintmax_t pos = 1; pos <= input_length; pos++) {
        if (print_kth(pos)) {
            /* This position is selected - process it */
            process_item(pos);
            
            if (is_range_start_index(pos) && pos > 1) {
                /* Output separator for new ranges */
                output_range_separator();
            }
        }
        next_item(&pos);
    }
}
```

### Field Delimiter Edge Case Handling
```c
/* Handle complex delimiter scenarios */
static void process_field_with_edge_cases(FILE *stream) {
    int prev_c = 0;
    
    while ((c = getc(stream)) != delim && c != line_delim && c != EOF) {
        if (output_this_field) {
            putchar(c);
        }
        prev_c = c;
    }
    
    /* Special handling for newline delimiter */
    if (delim == line_delim && c == delim) {
        int lookahead = getc(stream);
        if (lookahead != EOF) {
            ungetc(lookahead, stream);
        } else {
            c = lookahead;  // Treat EOF after delimiter appropriately
        }
    }
    
    /* Ensure proper line termination */
    if (c == line_delim || (c == EOF && prev_c != line_delim)) {
        if (output_any_field) {
            putchar(line_delim);
        }
    }
}
```

This comprehensive architecture makes cut a powerful and efficient tool for field extraction while maintaining the simplicity and composability expected in Unix text processing pipelines.