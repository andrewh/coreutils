# The GNU Coreutils `cp` Command: Advanced File Copying with COW, Sparse Files, and Security Integration

## Introduction

The `cp` command is one of the most essential and advanced file manipulation utilities in the GNU coreutils suite. While conceptually simple—copying files and directories—the implementation incorporates advanced filesystem technologies, security frameworks, and performance optimisations that make it far more complex than its straightforward interface suggests.

### What is `cp`?

`cp` copies files and directories from source to destination, supporting extensive preservation of file attributes, advanced copying strategies, and integration with modern filesystem features:

```bash
cp file1.txt file2.txt                  # Simple file copy
cp -a source_dir dest_dir               # Archive copy preserving all attributes
cp --reflink=auto large_file backup     # Copy-on-write (COW) copy when supported
cp --sparse=always sparse_file copy     # Optimised sparse file handling
cp --preserve=xattr,context file dest   # Preserve extended attributes and SELinux context
cp -R --parents path/to/file dest       # Recursive copy preserving directory structure
```

The GNU implementation provides over 30 command-line options and integrates with ACLs, SELinux, extended attributes, and advanced filesystem features like copy-on-write and sparse file handling.

## Architecture Overview

The `cp` implementation uses a advanced two-tier architecture separating command-line processing from the core copying engine:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Command Line  │───→│   Option        │───→│   Copy Engine   │
│   Processing    │    │   Validation    │    │   Selection     │
│   (cp.c)        │    │   & Setup       │    │   (copy.c)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Argument      │    │   Copy Options  │    │   Copy Strategy │
│   Parsing       │    │   Structure     │    │   Dispatch      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                         ┌──────────────────────────────┼──────────────────────────────┐
                         ▼                              ▼                              ▼
              ┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
              │   Regular File  │           │   Directory     │           │   Special File  │
              │   Copy Engine   │           │   Recursion     │           │   Handling      │
              │   (copy_reg)    │           │   (copy_dir)    │           │   (symlinks,    │
              └─────────────────┘           └─────────────────┘           │    etc.)        │
                        │                             │                   └─────────────────┘
                        ▼                             ▼
              ┌─────────────────┐           ┌─────────────────┐
              │   Data Copy     │           │   Attribute     │
              │   Strategies    │           │   Preservation  │
              │   • COW/Reflink │           │   • ACLs        │
              │   • Sparse      │           │   • SELinux     │
              │   • Standard    │           │   • Timestamps  │
              └─────────────────┘           └─────────────────┘
```

## Core Data Structures

### Copy Options Structure

The implementation uses a comprehensive options structure that controls all aspects of copying behaviour:

```c
/* Comprehensive copy control structure */
struct cp_options
{
  enum backup_type backup_type;         /* Backup strategy */
  enum Dereference_symlink dereference; /* Symlink handling */
  enum Interactive interactive;         /* User interaction mode */
  enum Sparse_type sparse_mode;         /* Sparse file handling */
  enum Reflink_type reflink_mode;       /* Copy-on-write support */
  enum Update_type update;              /* Update behaviour */
  
  /* File attribute preservation flags */
  bool preserve_ownership;              /* User and group */
  bool preserve_mode;                   /* Permissions and ACLs */
  bool preserve_timestamps;             /* Access/modification times */
  bool preserve_links;                  /* Hard link preservation */
  bool preserve_xattr;                  /* Extended attributes */
  bool preserve_security_context;       /* SELinux context */
  
  /* Operational modes */
  bool recursive;                       /* Directory recursion */
  bool hard_link;                       /* Create hard links instead */
  bool symbolic_link;                   /* Create symbolic links */
  bool copy_as_regular;                 /* Copy special files as regular */
  bool data_copy_required;              /* Copy file data or just metadata */
  
  /* Behaviour modifiers */
  bool unlink_dest_before_opening;      /* Remove destination first */
  bool unlink_dest_after_failed_open;   /* Remove if open fails */
  bool one_file_system;                 /* Stay on same filesystem */
  bool verbose;                         /* Progress reporting */
  bool debug;                           /* Detailed operation reporting */
  
  /* Security and context */
  struct selabel_handle *set_security_context; /* SELinux label handle */
  bool require_preserve_context;        /* Fail if context not preserved */
  bool require_preserve_xattr;          /* Fail if xattrs not preserved */
  
  /* Hash tables for duplicate detection */
  Hash_table *dest_info;                /* Destination file tracking */
  Hash_table *src_info;                 /* Source file tracking */
};
```

### Directory Attribute Preservation

For the `--parents` option, the implementation uses a linked list to track directory attributes:

```c
struct dir_attr
{
  struct stat st;                       /* Original directory attributes */
  bool restore_mode;                    /* Whether to restore permissions */
  size_t slash_offset;                  /* Position in path */
  struct dir_attr *next;                /* Next directory in chain */
};
```

## Advanced Copying Strategies

### Copy-on-Write (COW) Implementation

The implementation includes advanced COW support for modern filesystems:

```c
/* Reflink/COW file cloning */
static inline int
clone_file (int dest_fd, int src_fd)
{
#ifdef FICLONE
  return ioctl (dest_fd, FICLONE, src_fd);
#else
  errno = ENOTSUP;
  return -1;
#endif
}

/* Copy strategy with COW fallback */
static bool
copy_with_reflink (int src_fd, int dest_fd, char const *src_name, 
                   char const *dst_name, const struct cp_options *x)
{
  /* Attempt COW copy first */
  if (x->reflink_mode != REFLINK_NEVER)
    {
      if (clone_file (dest_fd, src_fd) == 0)
        {
          copy_debug.reflink = COPY_DEBUG_YES;
          return true;
        }
      
      /* Handle COW failure */
      if (x->reflink_mode == REFLINK_ALWAYS)
        {
          copy_debug.reflink = COPY_DEBUG_UNSUPPORTED;
          error (0, errno, _("failed to clone %s from %s"),
                 quoteaf_n (0, dst_name), quoteaf_n (1, src_name));
          return false;
        }
      
      /* Fall back to standard copy */
      copy_debug.reflink = COPY_DEBUG_UNSUPPORTED;
    }
  else
    {
      copy_debug.reflink = COPY_DEBUG_NO;
    }
    
  /* Perform standard data copy */
  return standard_copy (src_fd, dest_fd, src_name, dst_name, x);
}
```

### Sparse File Optimisation

The sparse file implementation uses advanced hole detection and creation:

```c
/* Intelligent sparse file copying */
static bool
sparse_copy (int src_fd, int dest_fd, char **abuf, size_t buf_size,
             size_t hole_size, bool punch_holes, bool allow_reflink,
             char const *src_name, char const *dst_name,
             uintmax_t max_n_read, off_t *total_n_read,
             bool *last_write_made_hole)
{
  bool make_hole = false;
  off_t psize = 0;
  
  /* Use copy_file_range for non-sparse copying when allowed */
  if (!hole_size && allow_reflink)
    {
      while (max_n_read)
        {
          ssize_t copy_max = MIN (SSIZE_MAX, SIZE_MAX) >> 30 << 30;
          ssize_t n_copied = copy_file_range (src_fd, nullptr, dest_fd, nullptr,
                                            MIN (max_n_read, copy_max), 0);
          
          if (n_copied > 0)
            {
              copy_debug.offload = COPY_DEBUG_YES;
              max_n_read -= n_copied;
              *total_n_read += n_copied;
              continue;
            }
          
          /* Fall back on failure */
          if (n_copied < 0 && *total_n_read == 0 && is_CLONENOTSUP (errno))
            break;
        }
    }
  
  /* Standard sparse-aware copying */
  while (max_n_read)
    {
      if (!*abuf)
        *abuf = xalignalloc (getpagesize (), buf_size);
        
      char *buf = *abuf;
      ssize_t n_read = read (src_fd, buf, MIN (max_n_read, buf_size));
      
      if (n_read <= 0)
        break;
        
      /* Process buffer in chunks, detecting holes */
      size_t csize = hole_size ? hole_size : buf_size;
      char *cbuf = buf;
      
      while (n_read > 0)
        {
          csize = MIN (csize, n_read);
          
          /* Detect zero-filled regions (holes) */
          if (hole_size && csize)
            make_hole = is_nul (cbuf, csize);
          
          /* Handle transitions between data and holes */
          if (make_hole)
            {
              if (!create_hole (dest_fd, dst_name, punch_holes, csize))
                return false;
            }
          else
            {
              if (full_write (dest_fd, cbuf, csize) != csize)
                return false;
            }
          
          n_read -= csize;
          cbuf += csize;
        }
    }
  
  return true;
}

/* Efficient hole creation with fallocate support */
static bool
create_hole (int fd, char const *name, bool punch_holes, off_t size)
{
  off_t file_end = lseek (fd, size, SEEK_CUR);
  
  if (file_end < 0)
    return false;
  
  /* Use fallocate to punch holes when supported */
  if (punch_holes && punch_hole (fd, file_end - size, size) < 0)
    {
      error (0, errno, _("error deallocating %s"), quoteaf (name));
      return false;
    }
  
  return true;
}
```

## Security and Extended Attributes

### SELinux Integration

The implementation provides comprehensive SELinux support:

```c
/* Set SELinux security context for new files */
extern bool
set_process_security_ctx (char const *src_name, char const *dst_name,
                         mode_t mode, bool new_dst, const struct cp_options *x)
{
  if (x->set_security_context)
    {
      /* Use default context for new files */
      char *scontext;
      if (selabel_lookup (x->set_security_context, &scontext, dst_name, mode) == 0)
        {
          if (setfscreatecon (scontext) < 0)
            {
              error (0, errno, _("failed to set default file creation context to %s"),
                     quote (scontext));
              freecon (scontext);
              return false;
            }
          freecon (scontext);
        }
    }
  else if (x->preserve_security_context)
    {
      /* Preserve source context */
      char *scontext;
      if (getfilecon (src_name, &scontext) >= 0)
        {
          if (setfscreatecon (scontext) < 0 && x->require_preserve_context)
            {
              error (0, errno, _("failed to set default file creation context"));
              freecon (scontext);
              return false;
            }
          freecon (scontext);
        }
    }
  
  return true;
}

/* Set security context on existing files */
extern bool
set_file_security_ctx (char const *dst_name, bool recurse, const struct cp_options *x)
{
  if (x->preserve_security_context || x->set_security_context)
    {
      char *scontext = nullptr;
      
      if (x->preserve_security_context)
        {
          /* Use preserved context */
          /* Implementation depends on source context storage */
        }
      else if (x->set_security_context)
        {
          /* Use default context for file type */
          struct stat st;
          if (stat (dst_name, &st) == 0)
            {
              if (selabel_lookup (x->set_security_context, &scontext,
                                dst_name, st.st_mode) < 0)
                scontext = nullptr;
            }
        }
      
      if (scontext)
        {
          if (setfilecon (dst_name, scontext) < 0)
            {
              if (x->require_preserve_context)
                {
                  error (0, errno, _("failed to set security context %s for %s"),
                         quote_n (0, scontext), quote_n (1, dst_name));
                  freecon (scontext);
                  return false;
                }
            }
          freecon (scontext);
        }
    }
  
  return true;
}
```

### Extended Attributes (xattr) Handling

```c
#if USE_XATTR
/* Copy extended attributes from source to destination */
static bool
copy_xattrs (char const *src_name, char const *dst_name, 
             const struct cp_options *x)
{
  if (!x->preserve_xattr)
    return true;
  
  ssize_t list_size = listxattr (src_name, nullptr, 0);
  if (list_size < 0)
    {
      if (errno == ENOTSUP && !x->require_preserve_xattr)
        return true;
      
      error (0, errno, _("failed to get attributes of %s"), quoteaf (src_name));
      return !x->require_preserve_xattr;
    }
  
  if (list_size == 0)
    return true;
  
  char *attr_list = xmalloc (list_size);
  if (listxattr (src_name, attr_list, list_size) != list_size)
    {
      error (0, errno, _("failed to get attributes of %s"), quoteaf (src_name));
      free (attr_list);
      return !x->require_preserve_xattr;
    }
  
  /* Copy each attribute */
  char *attr_name = attr_list;
  while (attr_name < attr_list + list_size)
    {
      ssize_t attr_size = getxattr (src_name, attr_name, nullptr, 0);
      if (attr_size >= 0)
        {
          char *attr_value = xmalloc (attr_size);
          if (getxattr (src_name, attr_name, attr_value, attr_size) == attr_size)
            {
              if (setxattr (dst_name, attr_name, attr_value, attr_size, 0) < 0)
                {
                  if (!x->reduce_diagnostics || errno != ENOTSUP)
                    error (0, errno, _("failed to preserve extended attributes"));
                  
                  if (x->require_preserve_xattr)
                    {
                      free (attr_value);
                      free (attr_list);
                      return false;
                    }
                }
            }
          free (attr_value);
        }
      
      /* Move to next attribute name */
      attr_name += strlen (attr_name) + 1;
    }
  
  free (attr_list);
  return true;
}
#endif
```

### Access Control List (ACL) Support

```c
/* Copy ACLs using libacl integration */
static bool
copy_acls (char const *src_name, char const *dst_name, mode_t mode,
           const struct cp_options *x)
{
  if (!x->preserve_mode)
    return true;
  
#if USE_ACL
  /* Use xcopy_acl for comprehensive ACL copying */
  if (xcopy_acl (src_name, -1, dst_name, -1, mode) != 0)
    {
      error (0, errno, _("preserving permissions for %s"), quoteaf (dst_name));
      return !x->require_preserve;
    }
#else
  /* Fall back to basic mode setting */
  if (chmod (dst_name, mode) != 0)
    {
      error (0, errno, _("setting permissions for %s"), quoteaf (dst_name));
      return !x->require_preserve;
    }
#endif
  
  return true;
}
```

## Directory Traversal and Recursion

### Recursive Copy Implementation

The implementation uses advanced recursion with cycle detection:

```c
/* Recursive directory copying with safety checks */
static bool
copy_dir (char const *src_name_in, char const *dst_name_in, 
          int dst_dirfd, char const *dst_relname, bool new_dst,
          const struct stat *src_sb, struct dir_list *ancestors,
          const struct cp_options *x, bool *first_dir_created_per_command_line_arg)
{
  char *name_space;
  char *namep;
  struct cp_options non_command_line_options = *x;
  bool ok = true;
  
  /* Check for directory cycles */
  struct dir_list *curr;
  for (curr = ancestors; curr != nullptr; curr = curr->parent)
    {
      if (curr->ino == src_sb->st_ino && curr->dev == src_sb->st_dev)
        {
          error (0, 0, _("cannot copy a directory, %s, into itself, %s"),
                 quoteaf_n (0, src_name_in), quoteaf_n (1, dst_name_in));
          return false;
        }
    }
  
  /* Create destination directory if needed */
  if (new_dst)
    {
      mode_t src_mode = src_sb->st_mode;
      mode_t omitted_permissions = (src_mode
                                    & (x->preserve_ownership ? S_IRWXG | S_IRWXO
                                       : x->preserve_mode ? S_IWGRP | S_IWOTH
                                       : 0));
      
      mode_t mkdir_mode = src_mode & ~omitted_permissions;
      if (mkdirat (dst_dirfd, dst_relname, mkdir_mode) != 0)
        {
          error (0, errno, _("cannot create directory %s"), quoteaf (dst_name_in));
          return false;
        }
      
      /* Set initial permissions for safety */
      if (lchmodat (dst_dirfd, dst_relname, mkdir_mode | S_IRWXU) != 0)
        {
          error (0, errno, _("setting permissions for %s"), quoteaf (dst_name_in));
          return false;
        }
    }
  
  /* Read directory contents */
  name_space = savedir (src_name_in, SAVEDIR_SORT_FASTREAD);
  if (name_space == nullptr)
    {
      error (0, errno, _("cannot access %s"), quoteaf (src_name_in));
      return false;
    }
  
  /* Add current directory to ancestor list */
  struct dir_list this_dir;
  this_dir.parent = ancestors;
  this_dir.ino = src_sb->st_ino;
  this_dir.dev = src_sb->st_dev;
  
  /* Copy each file in directory */
  non_command_line_options.one_file_system = x->one_file_system;
  
  for (namep = name_space; *namep != '\0'; namep += strlen (namep) + 1)
    {
      bool local_copy_into_self;
      char *src_name = file_name_concat (src_name_in, namep, nullptr);
      char *dst_name = file_name_concat (dst_name_in, namep, nullptr);
      
      ok &= copy_internal (src_name, dst_name, dst_dirfd, namep,
                          -1, src_sb, &this_dir, &non_command_line_options,
                          false, first_dir_created_per_command_line_arg,
                          &local_copy_into_self, nullptr);
      
      free (src_name);
      free (dst_name);
    }
  
  free (name_space);
  
  /* Restore directory attributes after copying contents */
  if (ok && x->preserve_timestamps)
    {
      struct timespec timespec[2];
      timespec[0] = get_stat_atime (src_sb);
      timespec[1] = get_stat_mtime (src_sb);
      
      if (utimensat (dst_dirfd, dst_relname, timespec, 0) != 0)
        {
          error (0, errno, _("failed to preserve times for %s"), 
                 quoteaf (dst_name_in));
          ok = false;
        }
    }
  
  return ok;
}
```

### Parent Directory Creation (`--parents`)

```c
/* Create parent directories for --parents option */
static bool
make_dir_parents_private (char const *const_dir, size_t src_offset,
                          int dst_dirfd, char const *verbose_fmt_string,
                          struct dir_attr **attr_list, bool *new_dst,
                          const struct cp_options *x)
{
  struct stat stats;
  char *dir;
  char *src;
  idx_t dirlen = dir_len (const_dir);
  
  *attr_list = nullptr;
  
  /* Check if parent already exists */
  if (dirlen <= src_offset)
    return true;
  
  ASSIGN_STRDUPA (dir, const_dir);
  src = dir + src_offset;
  
  /* Create missing intermediate directories */
  char *slash = src;
  while (*slash == '/')
    slash++;
  
  while ((slash = strchr (slash, '/')))
    {
      *slash = '\0';
      
      /* Check if directory exists */
      bool missing_dir = fstatat (dst_dirfd, src, &stats, 0) != 0;
      
      if (missing_dir)
        {
          /* Get source directory attributes */
          struct stat src_st;
          if (stat (src, &src_st) != 0)
            {
              error (0, errno, _("failed to get attributes of %s"), quoteaf (src));
              return false;
            }
          
          /* Store attributes for later restoration */
          struct dir_attr *new = xmalloc (sizeof *new);
          new->st = src_st;
          new->slash_offset = slash - dir;
          new->restore_mode = false;
          new->next = *attr_list;
          *attr_list = new;
          
          /* Create directory with safe permissions */
          mode_t src_mode = src_st.st_mode;
          mode_t omitted_permissions = src_mode & (x->preserve_ownership 
                                                  ? S_IRWXG | S_IRWXO 
                                                  : S_IWGRP | S_IWOTH);
          mode_t mkdir_mode = src_mode & ~omitted_permissions;
          
          if (mkdirat (dst_dirfd, src, mkdir_mode) != 0)
            {
              error (0, errno, _("cannot make directory %s"), quoteaf (dir));
              return false;
            }
          
          *new_dst = true;
        }
      
      *slash++ = '/';
      while (*slash == '/')
        slash++;
    }
  
  return true;
}
```

## Performance Optimisations

### Buffer Management and Alignment

```c
/* Optimal buffer allocation for copying */
static size_t
get_copy_buffer_size (int src_fd, int dst_fd)
{
  struct stat src_st, dst_st;
  size_t buf_size = DEFAULT_BUFFER_SIZE;
  
  /* Use optimal block sizes from file system */
  if (fstat (src_fd, &src_st) == 0)
    buf_size = MAX (buf_size, io_blksize (src_st));
    
  if (fstat (dst_fd, &dst_st) == 0)
    buf_size = MAX (buf_size, io_blksize (dst_st));
  
  /* Align to page boundary for better performance */
  size_t page_size = getpagesize ();
  buf_size = (buf_size + page_size - 1) & ~(page_size - 1);
  
  /* Cap at reasonable maximum */
  return MIN (buf_size, MAX_BUFFER_SIZE);
}

/* Memory-aligned buffer allocation */
static char *
allocate_copy_buffer (size_t size)
{
  /* Use page-aligned allocation for better I/O performance */
  return xalignalloc (getpagesize (), size);
}
```

### File System Hints and Optimisations

```c
/* Provide hints to the kernel about access patterns */
static void
setup_copy_hints (int src_fd, int dst_fd, const struct cp_options *x)
{
  /* Hint sequential access for source */
  fadvise (src_fd, FADVISE_SEQUENTIAL);
  
  /* For large files, hint that source won't be accessed again */
  if (!x->preserve_timestamps && !x->preserve_links)
    fadvise (src_fd, FADVISE_NOREUSE);
  
  /* Hint random access for destination if we'll set timestamps */
  if (x->preserve_timestamps)
    fadvise (dst_fd, FADVISE_RANDOM);
}
```

## Error Handling and Edge Cases

### Comprehensive Error Recovery

```c
/* Robust error handling during copy operations */
static bool
handle_copy_errors (char const *src_name, char const *dst_name,
                   const struct cp_options *x, int error_code)
{
  switch (error_code)
    {
    case ENOSPC:
      error (0, error_code, _("failed to copy %s to %s: insufficient space"),
             quoteaf_n (0, src_name), quoteaf_n (1, dst_name));
      return false;
      
    case EDQUOT:
      error (0, error_code, _("failed to copy %s to %s: quota exceeded"),
             quoteaf_n (0, src_name), quoteaf_n (1, dst_name));
      return false;
      
    case EXDEV:
      /* Cross-device link attempt - expected for hard links */
      if (x->hard_link)
        {
          error (0, error_code, _("cannot create hard link %s to %s"),
                 quoteaf_n (0, dst_name), quoteaf_n (1, src_name));
          return false;
        }
      break;
      
    case ELOOP:
      error (0, error_code, _("cannot copy %s: too many symbolic links"),
             quoteaf (src_name));
      return false;
      
    case EMLINK:
      error (0, error_code, _("cannot create link %s"), quoteaf (dst_name));
      return false;
      
    default:
      error (0, error_code, _("failed to copy %s to %s"),
             quoteaf_n (0, src_name), quoteaf_n (1, dst_name));
      return false;
    }
  
  return true;
}

/* Handle interrupted system calls gracefully */
static bool
retry_on_interrupt (int (*operation)(void *), void *arg, 
                   char const *operation_name)
{
  int attempts = 0;
  const int max_attempts = 10;
  
  while (attempts < max_attempts)
    {
      if (operation (arg) == 0)
        return true;
      
      if (errno != EINTR)
        break;
      
      attempts++;
      /* Brief pause to avoid busy waiting */
      usleep (1000 * attempts);
    }
  
  error (0, errno, _("failed to complete %s after %d attempts"),
         operation_name, attempts);
  return false;
}
```

### File Replacement Race Condition Handling

```c
/* Safely handle file replacement during copying */
static bool
safe_file_replacement (char const *src_name, char const *dst_name,
                      int dst_dirfd, char const *dst_relname,
                      const struct cp_options *x)
{
  /* Check if source file changed during copy */
  struct stat src_sb_before, src_sb_after;
  
  if (stat (src_name, &src_sb_before) != 0)
    return false;
  
  /* Perform the copy operation */
  bool copy_result = perform_actual_copy (src_name, dst_name, dst_dirfd, 
                                         dst_relname, x);
  
  if (!copy_result)
    return false;
  
  /* Verify source file didn't change */
  if (stat (src_name, &src_sb_after) == 0)
    {
      if (!psame_inode (&src_sb_before, &src_sb_after))
        {
          error (0, 0, _("skipping file %s, as it was replaced while being copied"),
                 quoteaf (src_name));
          return false;
        }
    }
  
  return true;
}
```

## Command-Line Interface and Option Processing

### Sophisticated Option Parsing

```c
/* Comprehensive option validation and setup */
static void
validate_copy_options (struct cp_options *x)
{
  /* Validate incompatible option combinations */
  if (x->hard_link && x->symbolic_link)
    error (EXIT_FAILURE, 0, _("cannot make both hard and symbolic links"));
  
  if (x->reflink_mode == REFLINK_ALWAYS && x->sparse_mode != SPARSE_AUTO)
    error (EXIT_FAILURE, 0, _("--reflink can be used only with --sparse=auto"));
  
  /* Set up derived options */
  if (x->interactive == I_ALWAYS_SKIP)
    x->update = UPDATE_NONE;
  
  /* Configure default dereference behaviour */
  if (x->dereference == DEREF_UNDEFINED)
    {
      if (x->recursive && !x->hard_link)
        x->dereference = DEREF_NEVER;  /* Compatible with FreeBSD */
      else
        x->dereference = DEREF_ALWAYS;
    }
  
  /* Disable reflink with sparse=never for compatibility */
  if (x->reflink_mode == REFLINK_AUTO && x->sparse_mode == SPARSE_NEVER)
    x->reflink_mode = REFLINK_NEVER;
}

/* Parse preserve attribute specifications */
static void
decode_preserve_arg (char const *arg, struct cp_options *x, bool on_off)
{
  enum File_attribute
    {
      PRESERVE_MODE,      PRESERVE_TIMESTAMPS,
      PRESERVE_OWNERSHIP, PRESERVE_LINK,
      PRESERVE_CONTEXT,   PRESERVE_XATTR,
      PRESERVE_ALL
    };
    
  static char const *const preserve_args[] =
    {
      "mode", "timestamps", "ownership", "links", 
      "context", "xattr", "all", nullptr
    };
  
  char *arg_writable = xstrdup (arg);
  char *s = arg_writable;
  
  do
    {
      char *comma = strchr (s, ',');
      if (comma)
        *comma++ = 0;
      
      enum File_attribute val = XARGMATCH (on_off ? "--preserve" : "--no-preserve",
                                          s, preserve_args, preserve_vals);
      
      switch (val)
        {
        case PRESERVE_MODE:
          x->preserve_mode = on_off;
          x->explicit_no_preserve_mode = !on_off;
          break;
          
        case PRESERVE_TIMESTAMPS:
          x->preserve_timestamps = on_off;
          break;
          
        case PRESERVE_OWNERSHIP:
          x->preserve_ownership = on_off;
          break;
          
        case PRESERVE_LINK:
          x->preserve_links = on_off;
          break;
          
        case PRESERVE_CONTEXT:
          x->require_preserve_context = on_off;
          x->preserve_security_context = on_off;
          break;
          
        case PRESERVE_XATTR:
          x->preserve_xattr = on_off;
          x->require_preserve_xattr = on_off;
          break;
          
        case PRESERVE_ALL:
          x->preserve_mode = x->preserve_timestamps = on_off;
          x->preserve_ownership = x->preserve_links = on_off;
          x->explicit_no_preserve_mode = !on_off;
          x->preserve_xattr = on_off;
          
          /* SELinux context only if enabled */
          if (selinux_enabled)
            x->preserve_security_context = on_off;
          break;
        }
      
      s = comma;
    }
  while (s);
  
  free (arg_writable);
}
```

## Integration with System Components

### Hash Table Management for Duplicate Detection

```c
/* Initialise destination info hash table */
void
dest_info_init (struct cp_options *x)
{
  x->dest_info = hash_initialize (DEST_INFO_INITIAL_CAPACITY,
                                  nullptr, triple_hash, triple_compare, 
                                  triple_free);
  if (!x->dest_info)
    xalloc_die ();
}

/* Track destination files to prevent overwrites */
static bool
record_file (Hash_table *ht, char const *filename, struct stat const *sb)
{
  struct F_triple *ent = xmalloc (sizeof *ent);
  ent->name = xstrdup (filename);
  ent->st_ino = sb->st_ino;
  ent->st_dev = sb->st_dev;
  
  struct F_triple *ent_from_table = hash_insert (ht, ent);
  if (ent_from_table == nullptr)
    {
      /* Hash table insert failed */
      triple_free (ent);
      xalloc_die ();
    }
  
  if (ent_from_table != ent)
    {
      /* Duplicate found */
      triple_free (ent);
      return false;
    }
  
  return true;
}
```

### Backup File Management

```c
/* Create backup of destination file when requested */
static bool
create_backup (char const *dst_name, const struct cp_options *x)
{
  if (x->backup_type == no_backups)
    return true;
  
  char *backup_name = find_backup_file_name (AT_FDCWD, dst_name, x->backup_type);
  if (!backup_name)
    {
      error (0, errno, _("cannot determine backup filename for %s"), 
             quoteaf (dst_name));
      return false;
    }
  
  /* Rename existing file to backup name */
  if (rename (dst_name, backup_name) != 0)
    {
      int saved_errno = errno;
      free (backup_name);
      error (0, saved_errno, _("cannot backup %s"), quoteaf (dst_name));
      return false;
    }
  
  if (x->verbose)
    printf (_("created backup %s\n"), quoteaf (backup_name));
  
  free (backup_name);
  return true;
}
```

## Testing and Quality Assurance

### Debug Information and Tracing

```c
/* Debug information structure */
static struct copy_debug
{
  enum copy_debug_val offload;           /* Copy offload status */
  enum copy_debug_val reflink;           /* COW status */
  enum copy_debug_val sparse_detection;  /* Sparse file handling */
} copy_debug;

/* Output debug information when requested */
static void
emit_debug (const struct cp_options *x)
{
  if (!x->debug)
    return;
  
  if (!x->hard_link && !x->symbolic_link && x->data_copy_required)
    {
      printf ("copy offload: %s, reflink: %s, sparse detection: %s\n",
              copy_debug_string (copy_debug.offload),
              copy_debug_string (copy_debug.reflink),
              copy_debug_sparse_string (copy_debug.sparse_detection));
    }
}
```

### Comprehensive Test Coverage

The `cp` implementation undergoes extensive testing covering:

```bash
# Basic functionality
cp file1 file2                          # Simple copy
cp -r dir1 dir2                         # Recursive copy
cp -a source dest                       # Archive copy

# Advanced features
cp --reflink=always file clone          # COW copy testing
cp --sparse=always sparse_file copy     # Sparse file handling
cp --preserve=all,xattr file dest       # Attribute preservation

# Security contexts
cp --preserve=context file dest         # SELinux context
cp -Z file dest                         # Default context

# Edge cases
cp /dev/null empty_file                 # Special files
cp file file                            # Self-copy detection
cp -l file hardlink                     # Hard link creation

# Error conditions
cp /nonexistent dest 2>/dev/null        # Missing source
cp file /readonly/dest 2>/dev/null      # Permission denied
cp very_large_file /full_fs 2>/dev/null # No space left
```

## Conclusion

The `cp` implementation includes several important file manipulation techniques:

1. **Advanced copying strategies**: COW/reflink support, sparse file optimisation, and copy offload
2. **Comprehensive security integration**: SELinux contexts, ACLs, and extended attributes
3. **Sophisticated recursion**: Safe directory traversal with cycle detection
4. **Performance optimisation**: Memory-aligned buffers, filesystem hints, and efficient algorithms
5. **Robust error handling**: Graceful failure recovery and race condition prevention
6. **Extensive attribute preservation**: Timestamps, ownership, permissions, and extended metadata

The codebase demonstrates good engineering practices:
- Modular architecture separating concerns clearly
- Comprehensive option validation and error handling
- Platform-independent abstractions with optimal implementations
- Security-conscious design preventing privilege escalation
- Extensive testing and validation frameworks

For systems programmers and file system developers, this implementation provides examples of:
- Modern filesystem feature integration (COW, sparse files, extended attributes)
- Security framework integration (SELinux, ACLs)
- High-performance file I/O with copy offload and memory management
- Safe recursive operations with cycle detection
- Comprehensive metadata preservation across diverse systems

The `cp` command demonstrates how Unix utilities can evolve to leverage modern filesystem capabilities while maintaining backward compatibility and providing comprehensive file manipulation features.