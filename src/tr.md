# tr.c - Character Translation and Transformation Engine

## Introduction and Core Purpose

The `tr` utility implements a advanced character translation and transformation engine featuring set operations (complement, squeeze, delete), Unicode and multi-byte character handling, and finite state machine-based processing. Beyond simple character mapping, tr provides advanced constructs for character classes, equivalence classes, and repeat specifications optimized for high-throughput text processing.

## Architecture Overview

### Core Data Structures

```c
/* Character translation table */
static char xlate[N_CHARS];              // 256-byte translation array

/* Set membership arrays */
static bool in_squeeze_set[N_CHARS];     // Characters to squeeze
static bool in_delete_set[N_CHARS];      // Characters to delete

/* Type system for specification elements */
enum Range_element_type {
    RE_NORMAL_CHAR,     // Simple character 'a'
    RE_RANGE,           // Range 'a-z' 
    RE_CHAR_CLASS,      // Character class '[:alpha:]'
    RE_EQUIV_CLASS,     // Equivalence class '[=a=]'
    RE_REPEATED_CHAR    // Repeat construct '[a*5]'
};

/* Unified construct representation */
struct List_element {
    enum Range_element_type type;
    struct List_element *next;
    union {
        unsigned char normal_char;
        struct { unsigned char first_char, last_char; } range;
        enum Char_class char_class;
        unsigned char equiv_code;
        struct { unsigned char the_repeated_char; count repeat_count; } repeated_char;
    } u;
};

/* Specification list with state management */
struct Spec_list {
    struct List_element *head;              // Dummy head node
    struct List_element *tail;              // Current position
    count state;                           // Traversal state
    count length;                          // Total expanded length
    size_t n_indefinite_repeats;          // Count of [c*] constructs
    struct List_element *indefinite_repeat_element;
    bool has_equiv_class;                  // Contains [=c=] constructs
    bool has_char_class;                   // Contains [:class:] constructs
    bool has_restricted_char_class;        // Contains non-upper/lower classes
};
```

### State Machine Architecture

The tr implementation employs a finite state machine for processing specification strings:

```c
/* State values for get_next() traversal */
#define BEGIN_STATE (UINTMAX_MAX - 1)      // Initialize traversal
#define NEW_ELEMENT (BEGIN_STATE + 1)       // Start new construct
#define REPEAT_COUNT_MAXIMUM BEGIN_STATE    // Maximum repeat count

/* Character classification for case conversion tracking */
enum Upper_Lower_class {
    UL_LOWER,   // From [:lower:] class
    UL_UPPER,   // From [:upper:] class  
    UL_NONE     // Not from case class
};
```

## Set Operations (Complement, Squeeze, Delete)

### Character Set Management

#### Complement Operation Implementation
```c
static void set_initialize(struct Spec_list *s, bool complement_this_set, bool *in_set) {
    int c;
    
    /* First pass: mark all characters in the specification */
    s->state = BEGIN_STATE;
    while ((c = get_next(s, nullptr)) != -1) {
        in_set[c] = true;
    }
    
    /* Complement operation: invert all 256 boolean values */
    if (complement_this_set) {
        for (size_t i = 0; i < N_CHARS; i++) {
            in_set[i] = (!in_set[i]);
        }
    }
}

/* Example: tr -c 'a-zA-Z' '*' 
   Complements letter set to include all non-letters */
static int card_of_complement(struct Spec_list *s) {
    int cardinality = N_CHARS;
    bool in_set[N_CHARS] = {0};
    
    s->state = BEGIN_STATE;
    while ((c = get_next(s, nullptr)) != -1) {
        if (!in_set[c]) {
            cardinality--;      // Reduce total for each unique character
            in_set[c] = true;
        }
    }
    return cardinality;
}
```

#### Advanced Squeeze Algorithm
```c
static void squeeze_filter(char *buf, size_t size, size_t (*reader)(char *, size_t)) {
    const int NOT_A_CHAR = INT_MAX;
    int char_to_squeeze = NOT_A_CHAR;
    size_t i = 0, nr = 0;
    
    while (true) {
        if (i >= nr) {
            nr = reader(buf, size);
            if (nr == 0) break;
            i = 0;
        }
        
        size_t begin = i;
        
        if (char_to_squeeze == NOT_A_CHAR) {
            /* Optimized scan: step by 2 for non-squeeze characters */
            for (; i < nr && !in_squeeze_set[to_uchar(buf[i])]; i += 2) {
                continue;
            }
            
            /* Handle edge case: last character might be in squeeze set */
            if (i == nr && in_squeeze_set[to_uchar(buf[i - 1])]) {
                --i;
            }
            
            if (i >= nr) {
                /* No squeeze characters found - output entire segment */
                xwrite_stdout(&buf[begin], nr - begin);
            } else {
                /* Found squeeze character - begin squeeze mode */
                char_to_squeeze = buf[i];
                size_t out_len = i - begin + 1;
                
                /* Adjust for overstep in loop above */
                if (i > 0 && buf[i - 1] == char_to_squeeze) {
                    --out_len;
                }
                
                xwrite_stdout(&buf[begin], out_len);
                ++i;
            }
        }
        
        if (char_to_squeeze != NOT_A_CHAR) {
            /* Skip consecutive occurrences of squeeze character */
            for (; i < nr && buf[i] == char_to_squeeze; i++) {
                continue;
            }
            if (i < nr) {
                char_to_squeeze = NOT_A_CHAR;  // Exit squeeze mode
            }
        }
    }
}
```

This squeeze algorithm provides optimal performance by:
- **Vectorized scanning**: Steps by 2 characters when no squeeze chars present
- **State-based processing**: Maintains squeeze state across buffer boundaries
- **Minimal copying**: Outputs data directly without intermediate buffering

## Unicode and Multi-byte Character Handling

### Character Class Support

```c
/* Comprehensive character class implementation */
static bool is_char_class_member(enum Char_class char_class, unsigned char c) {
    switch (char_class) {
        case CC_ALNUM:  return isalnum(c);
        case CC_ALPHA:  return isalpha(c);
        case CC_BLANK:  return isblank(c);
        case CC_CNTRL:  return iscntrl(c);
        case CC_DIGIT:  return c_isdigit(c);    // Locale-independent
        case CC_GRAPH:  return isgraph(c);
        case CC_LOWER:  return islower(c);
        case CC_PRINT:  return isprint(c);
        case CC_PUNCT:  return ispunct(c);
        case CC_SPACE:  return isspace(c);
        case CC_UPPER:  return isupper(c);
        case CC_XDIGIT: return c_isxdigit(c);   // Locale-independent
        default: unreachable();
    }
}

/* Character class validation and lookup */
static enum Char_class look_up_char_class(char const *class_str, size_t len) {
    static char const *const char_class_name[] = {
        "alnum", "alpha", "blank", "cntrl", "digit", "graph",
        "lower", "print", "punct", "space", "upper", "xdigit"
    };
    
    for (enum Char_class i = 0; i < ARRAY_CARDINALITY(char_class_name); i++) {
        if (STREQ_LEN(class_str, char_class_name[i], len) &&
            strlen(char_class_name[i]) == len) {
            return i;
        }
    }
    return CC_NO_CLASS;
}
```

### Locale-Aware Case Conversion

```c
/* Advanced case conversion with locale support */
static void validate_case_classes(struct Spec_list *s1, struct Spec_list *s2) {
    size_t n_upper = 0, n_lower = 0;
    
    /* Count locale-specific upper/lower characters */
    for (int i = 0; i < N_CHARS; i++) {
        if (isupper(i)) n_upper++;
        if (islower(i)) n_lower++;
    }
    
    /* Synchronized traversal of both specifications */
    s1->state = s2->state = BEGIN_STATE;
    
    while (c1 != -1 && c2 != -1) {
        enum Upper_Lower_class class_s1, class_s2;
        
        c1 = get_next(s1, &class_s1);
        c2 = get_next(s2, &class_s2);
        
        /* Validate case class alignment */
        if (s2_new_element && class_s2 != UL_NONE &&
            !(s1_new_element && class_s1 != UL_NONE)) {
            error(EXIT_FAILURE, 0,
                  _("misaligned [:upper:] and/or [:lower:] construct"));
        }
        
        /* Skip entire case classes efficiently */
        if (class_s2 != UL_NONE) {
            skip_construct(s1);
            skip_construct(s2);
            
            /* Adjust lengths to account for locale variations */
            s1->length -= (class_s1 == UL_UPPER ? n_upper : n_lower) - 1;
            s2->length -= (class_s2 == UL_UPPER ? n_upper : n_lower) - 1;
        }
    }
}

/* Runtime case conversion setup */
if (class_s1 == UL_LOWER && class_s2 == UL_UPPER) {
    /* Convert all lowercase to uppercase */
    for (int i = 0; i < N_CHARS; i++) {
        if (islower(i)) {
            xlate[i] = toupper(i);
        }
    }
} else if (class_s1 == UL_UPPER && class_s2 == UL_LOWER) {
    /* Convert all uppercase to lowercase */
    for (int i = 0; i < N_CHARS; i++) {
        if (isupper(i)) {
            xlate[i] = tolower(i);
        }
    }
}
```

## Finite State Machine Implementation

### Specification String Parsing

#### Advanced Escape Sequence Processing
```c
static bool unquote(char const *s, struct E_string *es) {
    size_t len = strlen(s);
    es->s = xmalloc(len);
    es->escaped = xcalloc(len, sizeof(es->escaped[0]));
    
    unsigned int j = 0;
    for (unsigned int i = 0; s[i]; i++) {
        if (s[i] == '\\') {
            es->escaped[j] = true;
            switch (s[i + 1]) {
                case '\\': es->s[j++] = '\\'; break;
                case 'a':  es->s[j++] = '\a'; break;
                case 'b':  es->s[j++] = '\b'; break;
                case 'f':  es->s[j++] = '\f'; break;
                case 'n':  es->s[j++] = '\n'; break;
                case 'r':  es->s[j++] = '\r'; break;
                case 't':  es->s[j++] = '\t'; break;
                case 'v':  es->s[j++] = '\v'; break;
                case '0' ... '7': {
                    /* Octal escape sequence parsing */
                    unsigned char c = s[i + 1] - '0';
                    if (s[i + 2] >= '0' && s[i + 2] <= '7') {
                        c = 8 * c + (s[i + 2] - '0');
                        ++i;
                        if (s[i + 2] >= '0' && s[i + 2] <= '7') {
                            if (8 * c + (s[i + 2] - '0') < N_CHARS) {
                                c = 8 * c + (s[i + 2] - '0');
                                ++i;
                            } else {
                                /* Warn about ambiguous 3-digit octal */
                                error(0, 0, _("warning: ambiguous octal escape"));
                            }
                        }
                    }
                    es->s[j++] = c;
                    break;
                }
                case '\0':
                    error(0, 0, _("warning: unescaped backslash at end"));
                    es->escaped[j] = false;
                    es->s[j++] = '\\';
                    i--;  /* Don't skip the NUL */
                    break;
                default:
                    es->s[j++] = s[i + 1];
                    break;
            }
            ++i;
        } else {
            es->s[j++] = s[i];
        }
    }
    es->len = j;
    return true;
}
```

#### Construct Recognition and Parsing
```c
static bool build_spec_list(const struct E_string *es, struct Spec_list *result) {
    char const *p = es->s;
    
    /* Main parsing loop - handles multi-character constructs */
    for (size_t i = 0; i + 2 < es->len; /* incremented in loop */) {
        if (es_match(es, i, '[')) {
            bool matched_multi_char_construct = false;
            
            if (es_match(es, i + 1, ':') || es_match(es, i + 1, '=')) {
                /* Character class [:name:] or equivalence class [=c=] */
                size_t closing_delim_idx;
                if (find_closing_delim(es, i + 2, p[i + 1], &closing_delim_idx)) {
                    size_t opnd_str_len = closing_delim_idx - (i + 2);
                    char const *opnd_str = p + i + 2;
                    
                    if (p[i + 1] == ':') {
                        /* Character class processing */
                        if (!append_char_class(result, opnd_str, opnd_str_len)) {
                            /* Handle malformed class - might be [c*n] construct */
                            if (star_digits_closebracket(es, i + 2)) {
                                goto try_bracketed_repeat;
                            }
                            /* Report error for invalid class */
                            char *tmp = make_printable_str(opnd_str, opnd_str_len);
                            error(0, 0, _("invalid character class %s"), quote(tmp));
                            free(tmp);
                            return false;
                        }
                    } else {
                        /* Equivalence class processing */
                        if (!append_equiv_class(result, opnd_str, opnd_str_len)) {
                            /* Similar error handling for equivalence classes */
                        }
                    }
                    matched_multi_char_construct = true;
                    i = closing_delim_idx + 2;
                    continue;
                }
            }
            
        try_bracketed_repeat:
            /* Handle [c*n] repeat constructs */
            unsigned char char_to_repeat;
            count repeat_count;
            size_t closing_bracket_idx;
            
            int err = find_bracketed_repeat(es, i + 1, &char_to_repeat,
                                          &repeat_count, &closing_bracket_idx);
            if (err == 0) {
                append_repeated_char(result, char_to_repeat, repeat_count);
                matched_multi_char_construct = true;
                i = closing_bracket_idx + 1;
            }
            
            if (matched_multi_char_construct) continue;
        }
        
        /* Handle range constructs a-z */
        if (es_match(es, i + 1, '-')) {
            if (!append_range(result, p[i], p[i + 2])) {
                return false;
            }
            i += 3;
        } else {
            /* Normal character */
            append_normal_char(result, p[i]);
            ++i;
        }
    }
    
    /* Handle remaining characters */
    for (; i < es->len; i++) {
        append_normal_char(result, p[i]);
    }
    
    return true;
}
```

### State Machine Traversal

#### Stateful Specification Expansion
```c
static int get_next(struct Spec_list *s, enum Upper_Lower_class *class) {
    struct List_element *p;
    
    if (class) *class = UL_NONE;
    
    if (s->state == BEGIN_STATE) {
        s->tail = s->head->next;
        s->state = NEW_ELEMENT;
    }
    
    p = s->tail;
    if (p == nullptr) return -1;
    
    switch (p->type) {
        case RE_NORMAL_CHAR:
            s->tail = p->next;
            s->state = NEW_ELEMENT;
            return p->u.normal_char;
            
        case RE_RANGE:
            if (s->state == NEW_ELEMENT) {
                s->state = p->u.range.first_char;
            } else {
                ++(s->state);
            }
            
            if (s->state == p->u.range.last_char) {
                s->tail = p->next;
                s->state = NEW_ELEMENT;
            }
            return s->state;
            
        case RE_CHAR_CLASS:
            /* Set class information for caller */
            if (class && (p->u.char_class == CC_LOWER || p->u.char_class == CC_UPPER)) {
                *class = (p->u.char_class == CC_LOWER) ? UL_LOWER : UL_UPPER;
            }
            
            if (s->state == NEW_ELEMENT) {
                /* Find first character in class */
                for (int i = 0; i < N_CHARS; i++) {
                    if (is_char_class_member(p->u.char_class, i)) {
                        s->state = i;
                        break;
                    }
                }
            }
            
            /* Find next character in class */
            for (int i = s->state + 1; i < N_CHARS; i++) {
                if (is_char_class_member(p->u.char_class, i)) {
                    s->state = i;
                    return s->state - 1;  /* Return previous character */
                }
            }
            
            /* End of class reached */
            s->tail = p->next;
            s->state = NEW_ELEMENT;
            return s->state;
            
        case RE_REPEATED_CHAR:
            if (p->u.repeated_char.repeat_count == 0) {
                /* [c*] with no count - skip to next element */
                s->tail = p->next;
                s->state = NEW_ELEMENT;
                return get_next(s, class);  /* Recursive call */
            }
            
            if (s->state == NEW_ELEMENT) {
                s->state = 0;
            }
            ++(s->state);
            
            if (s->state == p->u.repeated_char.repeat_count) {
                s->tail = p->next;
                s->state = NEW_ELEMENT;
            }
            return p->u.repeated_char.the_repeated_char;
            
        case RE_EQUIV_CLASS:
            /* Simple equivalence class (single character) */
            s->tail = p->next;
            s->state = NEW_ELEMENT;
            return p->u.equiv_code;
    }
    
    unreachable();
}
```

## Performance Optimizations

### Translation Table Architecture

#### Direct Lookup Translation
```c
/* 256-byte translation table for O(1) character mapping */
static void setup_translation_table(struct Spec_list *s1, struct Spec_list *s2) {
    /* Initialize identity mapping */
    for (int i = 0; i < N_CHARS; i++) {
        xlate[i] = i;
    }
    
    /* Build mapping from synchronized traversal */
    s1->state = s2->state = BEGIN_STATE;
    
    int c1, c2;
    enum Upper_Lower_class class_s1, class_s2;
    
    while (true) {
        c1 = get_next(s1, &class_s1);
        c2 = get_next(s2, &class_s2);
        
        if (c1 == -1 || c2 == -1) break;
        
        if (class_s1 == UL_LOWER && class_s2 == UL_UPPER) {
            /* Bulk case conversion */
            for (int i = 0; i < N_CHARS; i++) {
                if (islower(i)) xlate[i] = toupper(i);
            }
            skip_construct(s1);
            skip_construct(s2);
        } else {
            /* Individual character mapping */
            xlate[c1] = c2;
        }
    }
}

/* High-performance translation with streaming I/O */
static size_t read_and_xlate(char *buf, size_t size) {
    size_t bytes_read = plain_read(buf, size);
    
    /* Vectorized translation using lookup table */
    for (size_t i = 0; i < bytes_read; i++) {
        buf[i] = xlate[to_uchar(buf[i])];
    }
    
    return bytes_read;
}
```

### Memory-Efficient Streaming Processing

```c
/* Streaming delete operation */
static size_t read_and_delete(char *buf, size_t size) {
    size_t n_saved;
    
    do {
        size_t nr = plain_read(buf, size);
        if (nr == 0) return 0;
        
        /* First pass: find first character to delete */
        size_t i;
        for (i = 0; i < nr && !in_delete_set[to_uchar(buf[i])]; i++) {
            continue;
        }
        n_saved = i;
        
        /* Second pass: compact non-deleted characters */
        for (++i; i < nr; i++) {
            if (!in_delete_set[to_uchar(buf[i])]) {
                buf[n_saved++] = buf[i];
            }
        }
    } while (n_saved == 0);  /* Ensure we return some data */
    
    return n_saved;
}
```

## Code Examples: Key Implementations

### Complex Operation Composition
```c
/* Example: tr -cs 'a-zA-Z0-9' '\n' */
/* Complement alphanumeric set, delete, and squeeze to newlines */

int main(int argc, char **argv) {
    /* Parse: -c (complement), -s (squeeze), -d (delete implied) */
    complement = true;
    squeeze_repeats = true;
    delete = true;
    
    /* Set up complement of alphanumeric characters for deletion */
    set_initialize(s1, complement, in_delete_set);
    
    /* Set up newline character for squeezing */
    set_initialize(s2, false, in_squeeze_set);
    
    /* Combined delete and squeeze operation */
    squeeze_filter(io_buf, sizeof(io_buf), read_and_delete);
}
```

### Efficient Repeat Construct Handling
```c
/* Handle [c*n] constructs with automatic string balancing */
static void resolve_indefinite_repeats(struct Spec_list *s2, count len_s1) {
    if (len_s1 >= s2->length && s2->n_indefinite_repeats == 1) {
        /* Expand [c*] to make s2 same length as s1 */
        s2->indefinite_repeat_element->u.repeated_char.repeat_count =
            len_s1 - s2->length;
        s2->length = len_s1;
    }
}
```

This comprehensive finite state machine architecture enables tr to handle complex character transformations efficiently while maintaining the composability and performance characteristics expected in Unix text processing environments.