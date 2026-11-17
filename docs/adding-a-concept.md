# Adding a concept

Preferred: `/add-concept <natural-language request>` in Claude Code (research → proposal → approval → implementation → QA).

Manual:
```bash
npm run new-concept -- b-tree "B-Tree" data-structures/b-tree
```
Then replace every `TODO(concept)`, write domain logic + tests, compose the `View` from `src/primitives`, and run `npm run typecheck && npm test && npm run build`. The concept appears in the sidebar automatically.
