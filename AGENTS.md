# Coding Rules

- Always enclose the bodies of `if`, `else if`, and `else` branches in braces, even when they contain only one statement.
- Place the opening brace on the same line as the condition or `else`, the indented body on separate lines, and the closing brace on its own line.
- Do not use conditional statements without braces, including early returns.

## Language

- Write all code comments, documentation, README files, API descriptions, and other explanatory text in project files in English.

## Imports

- Prefer the `@/` alias, which maps to `src/`, over relative paths for project imports. Preserve the existing dependency boundaries between engine and game code.
