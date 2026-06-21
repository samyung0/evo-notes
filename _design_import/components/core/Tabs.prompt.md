Underline tab bar — switch between courses on Practice, or sections within a page.

```jsx
<Tabs
  tabs={['Biology 101', 'Calculus II', 'World History']}
  value={course}
  onChange={setCourse}
/>
```

Accepts plain strings or `{value,label}`.
