# Style Specifications

## Theme System

- The default UI theme is "tui" (terminal-style).
- All shared components accept a `variant?: "glass" | "tui"` prop, defaulting to `"tui"`:
  - `PageContainer`, `PageHeader`, `ContentCard`, `ExpandableSection`, `FormInput`, `SourceArticleCard`, `SourceMessageCard`

## Text Inputs

- Must use high-contrast colors: dark text on light background.
- If input background is white (the default), text must be dark (e.g., #000 or similar).
- Use `high-contrast-input` class (in `src/app/globals.css`) for text inputs/textareas/selects.

**Example:**
```tsx
<input className="w-full p-2 border rounded high-contrast-input" placeholder="..." />
<textarea className="w-full p-3 border rounded high-contrast-input" rows={4} />
```