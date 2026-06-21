White surface container — workspaces, files, stats, list rows all sit on `Card`. `interactive` adds a hover lift; `dashed` is the "new item" tile.

```jsx
<Card interactive padding={17}>…workspace…</Card>
<Card dashed>+ New course / workspace</Card>
<Card raised>…floating panel…</Card>
```

Default radius is `--ev-r-lg` (16px); bump to `--ev-r-xl` for hero panels.
