# Writing a page

Every command page uses the same headings in the same order, so readers
know where to look. If a section has nothing useful to say for a program,
leave it out. Do not fill it with general text.

## Rules

1. **Check every claim against the code.** Read the code before you write
   about a function, option or behaviour. Do not describe functions,
   options or checks that are not in the code.
2. **Quote real code only.** Copy code excerpts from the source and give the
   file and line, for example `src/head.c:789-823`. Shorten long excerpts
   with `...`, but do not rewrite them. To explain an idea without real
   code, use prose or a diagram.
3. **Prefer tables and diagrams to long prose.** A function table and one
   flowchart help more than pages of description.
4. **Keep it short.** Most pages should be 150 to 400 lines. Length does not
   make a page more useful.
5. **Link to tests.** Give real file names under `tests/`.

## Headings

```markdown
# `prog`: one-line summary

Source: `src/prog.c` (plus any shared modules) · Tests: `tests/prog/`
· Manual: `info '(coreutils) prog invocation'`

One paragraph: what the program does, and what is interesting about how
it does it.

## Options
Table of options from `long_options[]` and the short-option string.
Mark options that are undocumented or kept only for compatibility.

## Code map
Table: function | location | role.

## How it works
A Mermaid flowchart of main(), then subsections for each important
algorithm or decision. Quote real code.

## Platform notes
Configure checks, #ifdef branches, Linux-only system calls.

## Errors and exit status
The main diagnostics and when each exit status is used.

## Tests
The test files and what each one covers.

## See also
Links to related pages.
```

## Mermaid

Diagrams use fenced code blocks with the `mermaid` language tag. MkDocs
Material draws them in the browser. Put a short sentence before each
diagram that says what it shows.
