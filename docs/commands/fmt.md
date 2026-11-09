# `fmt`: simple text formatter

Source: `src/fmt.c` (1060 lines) · Tests: `tests/fmt/` ·
Manual: `info '(coreutils) fmt invocation'`

`fmt` reformats text to fit within a specified width (default 75). It breaks
lines at word boundaries, preferring to break at sentence endings and avoiding
widows and orphans. It uses dynamic programming to find the optimal line
breaks based on configurable costs for various break types.

## Options

Key options include:

|| Option | Purpose |
||---|---|
|| `-WIDTH`, `--width=WIDTH` | Maximum line width (default 75) |
|| `-g GOAL`, `--goal=GOAL` | Target width (default 93% of WIDTH) |
|| `-c`, `--crown-margin` | Preserve indentation of first two lines |
|| `-t`, `--tagged-paragraph` | Indent first line differently |
|| `-p`, `--prefix` | Preserve leading whitespace |
|| `-s`, `--split-only` | Split long lines, don't join short ones |
|| `-u`, `--uniform-spacing` | One space between words, two after sentences |

## Code map

|| Function | Location | Role |
||---|---|---|
|| `main` | `src/fmt.c:860` | Option parsing, read paragraphs, call `fmt_paragraph` |
|| `fmt_paragraph` | `:819` | Format a paragraph using dynamic programming |
|| `put_paragraph` | `:739` | Output the formatted paragraph |
|| `get_line` | `:638` | Read and parse a line into words |
|| `usage` | `:620` | Help message |

## How it works

`fmt` reads input as paragraphs (separated by blank lines) and formats each
paragraph (`src/fmt.c:860-858`):

1. **Reading:** `get_line` reads lines and splits them into words
   (`src/fmt.c:638-737`). Each word has attributes like whether it ends in
   punctuation or starts with a parenthesis.
2. **Optimization:** `fmt_paragraph` uses dynamic programming to find the
   optimal set of line breaks (`src/fmt.c:819-857`). It computes the cost of
   breaking at each position based on:
   - Line length deviation from goal width
   - Raggedness (difference between adjacent line lengths)
   - Sentence breaks (bonus)
   - Widows/orphans (cost)
3. **Output:** `put_paragraph` outputs the formatted lines with proper
   indentation (`src/fmt.c:739-816`).

### Cost model

The cost model is defined with macros (`src/fmt.c:52-104`):

- **`LINE_COST`:** Base cost per line
- **`SHORT_COST(n)`:** Cost of being n characters from goal width
- **`RAGGED_COST(n)`:** Cost of raggedness between adjacent lines
- **`WIDOW_COST(n)`:** Cost of breaking after first word of sentence
- **`ORPHAN_COST(n)`:** Cost of breaking before last word of sentence
- **`SENTENCE_BONUS`:** Bonus for breaking at sentence end

### Word structure

Each word is stored in a `WORD` struct (`src/fmt.c:130-148`) with:
- Text pointer and length
- Space size after the word
- Flags: paren, period, punct, final
- Computed fields: line_length, best_cost, next_break

## Platform notes

`fmt` uses a fixed buffer size (`MAXWORDS = 1000`, `MAXCHARS = 5000`) for
paragraphs. Longer paragraphs are handled by flushing and continuing.

## Errors and exit status

- **Invalid width:** Error from `xdectoint`
- **Invalid goal:** Error from `xdectoint`
- **Paragraph too long:** "paragraph too long" (continues with partial formatting)

Exit status is 0 on success, 1 on errors.

## Tests

|| File | Covers |
||---|---|
|| `tests/fmt/base.pl` | Basic formatting |
|| `tests/fmt/width.sh` | Width option |
|| `tests/fmt/goal-option.sh` | Goal option |
|| `tests/fmt/long-line.sh` | Long line handling |
|| `tests/fmt/non-space.sh` | Non-space characters |

## See also

- [fold](fold.md) for simple line wrapping
