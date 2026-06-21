Rounded pill toggle for 2–3 mutually exclusive modes — the workspace `Chat / Generate` switch, difficulty pickers, etc.

```jsx
<SegmentedControl
  options={['Chat', 'Generate']}
  value={mode}
  onChange={setMode}
/>
```

Accepts plain strings or `{value,label}`. `size="sm"` for inline use.
