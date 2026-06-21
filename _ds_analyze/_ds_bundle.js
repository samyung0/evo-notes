/* @ds-bundle: {"format":3,"namespace":"EvoNotesDesignSystem_aff30d","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Checkbox","sourcePath":"components/core/Checkbox.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"NoteCard","sourcePath":"components/core/NoteCard.jsx"},{"name":"ProgressBar","sourcePath":"components/core/ProgressBar.jsx"},{"name":"SegmentedControl","sourcePath":"components/core/SegmentedControl.jsx"},{"name":"Switch","sourcePath":"components/core/Switch.jsx"},{"name":"Tabs","sourcePath":"components/core/Tabs.jsx"},{"name":"DashboardScreen","sourcePath":"ui_kits/web-app/DashboardScreen.jsx"},{"name":"FlashcardsScreen","sourcePath":"ui_kits/web-app/FlashcardsScreen.jsx"},{"name":"QuizScreen","sourcePath":"ui_kits/web-app/QuizScreen.jsx"},{"name":"ScheduleScreen","sourcePath":"ui_kits/web-app/ScheduleScreen.jsx"},{"name":"Sidebar","sourcePath":"ui_kits/web-app/Sidebar.jsx"},{"name":"WorkspaceOpenScreen","sourcePath":"ui_kits/web-app/WorkspaceOpenScreen.jsx"},{"name":"WorkspacesScreen","sourcePath":"ui_kits/web-app/WorkspacesScreen.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"ba5cbc605fef","components/core/Badge.jsx":"457b07d12d60","components/core/Button.jsx":"126d7ac8786d","components/core/Card.jsx":"e2bbcd209e76","components/core/Checkbox.jsx":"bccb1f0ca075","components/core/Icon.jsx":"456705e6a6e0","components/core/IconButton.jsx":"ab8275225c53","components/core/Input.jsx":"44c2a6abbbd8","components/core/NoteCard.jsx":"c6cac7d415fa","components/core/ProgressBar.jsx":"b9588d516189","components/core/SegmentedControl.jsx":"40e3cc9cb543","components/core/Switch.jsx":"a452ae15e4d4","components/core/Tabs.jsx":"c85f0327a5bc","ui_kits/web-app/DashboardScreen.jsx":"8476bd0852a4","ui_kits/web-app/FlashcardsScreen.jsx":"0d549fd59978","ui_kits/web-app/QuizScreen.jsx":"4d3f9bcd375f","ui_kits/web-app/ScheduleScreen.jsx":"ca4a78ee3752","ui_kits/web-app/Sidebar.jsx":"37f98dba1764","ui_kits/web-app/WorkspaceOpenScreen.jsx":"1fb454fc98e5","ui_kits/web-app/WorkspacesScreen.jsx":"081e426e8986"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.EvoNotesDesignSystem_aff30d = window.EvoNotesDesignSystem_aff30d || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  xs: 24,
  sm: 30,
  md: 38,
  lg: 48
};

/** Round user avatar — image or monogram initials. */
function Avatar({
  src,
  name = '',
  size = 'md',
  style,
  ...rest
}) {
  const px = SIZES[size] || (typeof size === 'number' ? size : 38);
  const initials = name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      width: px,
      height: px,
      flex: `0 0 ${px}px`,
      borderRadius: '50%',
      overflow: 'hidden',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--ev-purple-soft)',
      color: 'var(--ev-purple-ink)',
      fontFamily: 'var(--ev-font-sans)',
      fontWeight: 700,
      fontSize: px * 0.36,
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : initials || '·');
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  neutral: {
    background: 'var(--ev-bg)',
    color: 'var(--ev-ink-soft)'
  },
  course: {
    background: 'var(--ev-info-soft)',
    color: 'var(--ev-info-ink)'
  },
  workspace: {
    background: 'var(--ev-warning-soft)',
    color: 'var(--ev-warning-ink)'
  },
  success: {
    background: 'var(--ev-success-soft)',
    color: 'var(--ev-success-ink)'
  },
  info: {
    background: 'var(--ev-info-soft)',
    color: 'var(--ev-info-ink)'
  },
  warning: {
    background: 'var(--ev-warning-soft)',
    color: 'var(--ev-warning-ink)'
  },
  error: {
    background: 'var(--ev-error-soft)',
    color: 'var(--ev-error-ink)'
  },
  purple: {
    background: 'var(--ev-purple-soft)',
    color: 'var(--ev-purple-ink)'
  },
  green: {
    background: 'var(--ev-green-soft)',
    color: 'var(--ev-green-ink)'
  },
  dark: {
    background: 'var(--ev-primary)',
    color: 'var(--ev-primary-content)'
  }
};

/** Small pill label — status, type tags, counts. */
function Badge({
  children,
  tone = 'neutral',
  uppercase = false,
  size = 'md',
  style,
  ...rest
}) {
  const t = TONES[tone] || TONES.neutral;
  const sm = size === 'sm';
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: sm ? '2px 8px' : '3px 10px',
      fontFamily: 'var(--ev-font-sans)',
      fontSize: sm ? 10 : 11,
      fontWeight: 700,
      lineHeight: 1.5,
      letterSpacing: uppercase ? '0.04em' : 0,
      textTransform: uppercase ? 'uppercase' : 'none',
      borderRadius: 'var(--ev-r-pill)',
      whiteSpace: 'nowrap',
      ...t,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Generic surface card. `interactive` adds a hover lift,
 * `dashed` renders the "new item" placeholder treatment.
 */
function Card({
  children,
  padding = 22,
  radius = 'var(--ev-r-lg)',
  interactive = false,
  raised = false,
  dashed = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: dashed ? 'transparent' : 'var(--ev-surface)',
      border: dashed ? '1.5px dashed var(--ev-border-strong)' : '1px solid var(--ev-border)',
      borderRadius: radius,
      padding,
      boxShadow: raised ? 'var(--ev-shadow-card)' : 'none',
      cursor: interactive ? 'pointer' : 'default',
      transition: 'box-shadow .18s ease, transform .12s ease, border-color .15s ease',
      ...style
    },
    onMouseEnter: interactive ? e => {
      e.currentTarget.style.boxShadow = 'var(--ev-shadow-card)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    } : undefined,
    onMouseLeave: interactive ? e => {
      e.currentTarget.style.boxShadow = raised ? 'var(--ev-shadow-card)' : 'none';
      e.currentTarget.style.transform = 'none';
    } : undefined
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Evo Notes line-icon set. Lucide-style geometry: 24x24 grid,
 * 1.8 stroke, round caps & joins, currentColor stroke.
 * Keeps the bundle self-contained (no CDN dependency).
 */
const PATHS = {
  dashboard: ['M3 3h7.5v7.5H3z', 'M13.5 3H21v7.5h-7.5z', 'M13.5 13.5H21V21h-7.5z', 'M3 13.5h7.5V21H3z'],
  workspaces: ['M12 3l9 4.5-9 4.5-9-4.5z', 'M3 12l9 4.5 9-4.5', 'M3 16.5l9 4.5 9-4.5'],
  practice: ['M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17z', 'M12 8a4 4 0 100 8 4 4 0 000-8z', 'M12 11.4a.6.6 0 100 1.2.6.6 0 000-1.2z'],
  schedule: ['M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z', 'M3 10h18', 'M8 3v4', 'M16 3v4'],
  files: ['M13.5 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8.5z', 'M13.5 3v5.5H19'],
  tasks: ['M4 4h16v16H4z', 'M8.5 12.3l2.4 2.4 4.6-5'],
  notes: ['M12 20h9', 'M16.5 3.5a2.05 2.05 0 113 3L7 19l-4 1 1-4z'],
  profile: ['M12 4.2a3.8 3.8 0 100 7.6 3.8 3.8 0 000-7.6z', 'M5.5 20.5a6.5 6.5 0 0113 0'],
  settings: ['M4 7.5h8', 'M16 7.5h4', 'M14 5.5a2 2 0 100 4 2 2 0 000-4z', 'M4 16.5h4', 'M12 16.5h8', 'M10 14.5a2 2 0 100 4 2 2 0 000-4z'],
  logout: ['M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  search: ['M11 4a7 7 0 100 14 7 7 0 000-14z', 'M21 21l-4-4'],
  bell: ['M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z', 'M10 20a2 2 0 004 0'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  chevronDown: ['M6 9l6 6 6-6'],
  chevronRight: ['M9 6l6 6-6 6'],
  chevronLeft: ['M15 6l-6 6 6 6'],
  arrowRight: ['M5 12h14', 'M13 6l6 6-6 6'],
  upload: ['M12 16V4', 'M7 9l5-5 5 5', 'M5 20h14'],
  send: ['M5 12h14', 'M13 6l6 6-6 6'],
  sparkles: ['M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z', 'M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z'],
  check: ['M5 12.5l4.5 4.5L19 6.5'],
  more: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
  moreVertical: ['M12 5h.01', 'M12 12h.01', 'M12 19h.01'],
  trash: ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13', 'M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3'],
  message: ['M21 12a8 8 0 01-11.3 7.3L4 21l1.7-5.7A8 8 0 1121 12z'],
  book: ['M4 5.5A2.5 2.5 0 016.5 3H19v15H6.5A2.5 2.5 0 004 20.5z', 'M4 20.5A2.5 2.5 0 016.5 18H19v3'],
  flashcards: ['M5 7h11a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z', 'M8 4h11a2 2 0 012 2v8'],
  quiz: ['M9.2 9a2.8 2.8 0 115.2 1.4c-.6 1-1.9 1.3-2.4 2.4', 'M12 17h.01', 'M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17z'],
  x: ['M6 6l12 12', 'M18 6L6 18'],
  filter: ['M3 5h18', 'M6 12h12', 'M10 19h4'],
  clock: ['M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17z', 'M12 7.5V12l3 2'],
  location: ['M12 21.5s7-5.7 7-11.2a7 7 0 10-14 0c0 5.5 7 11.2 7 11.2z', 'M12 7.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z']
};
function Icon({
  name,
  size = 18,
  strokeWidth = 1.8,
  color = 'currentColor',
  style,
  ...rest
}) {
  const ds = PATHS[name] || PATHS.dashboard;
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      display: 'block',
      flex: '0 0 auto',
      ...style
    }
  }, rest), ds.map((d, i) => /*#__PURE__*/React.createElement("path", {
    key: i,
    d: d
  })));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    padding: '9px 16px',
    fontSize: '0.8125rem',
    radius: 'var(--ev-r-md)',
    gap: 7,
    icon: 15
  },
  md: {
    padding: '12px 20px',
    fontSize: '0.875rem',
    radius: 'var(--ev-r-md)',
    gap: 8,
    icon: 16
  },
  lg: {
    padding: '15px 26px',
    fontSize: '0.9375rem',
    radius: 'var(--ev-r-lg)',
    gap: 9,
    icon: 18
  }
};
const VARIANTS = {
  primary: {
    background: 'var(--ev-primary)',
    color: 'var(--ev-primary-content)',
    border: '1px solid var(--ev-primary)'
  },
  accent: {
    background: 'var(--ev-purple)',
    color: 'var(--ev-purple-content)',
    border: '1px solid var(--ev-purple)'
  },
  outline: {
    background: 'var(--ev-white)',
    color: 'var(--ev-ink)',
    border: '1px solid var(--ev-border)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--ev-ink-soft)',
    border: '1px solid transparent'
  }
};

/** Primary text button with optional leading/trailing icons. */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth = false,
  disabled = false,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap,
      padding: s.padding,
      fontFamily: 'var(--ev-font-sans)',
      fontSize: s.fontSize,
      fontWeight: 600,
      lineHeight: 1,
      borderRadius: s.radius,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      width: fullWidth ? '100%' : 'auto',
      whiteSpace: 'nowrap',
      transition: 'filter .15s ease, transform .05s ease',
      ...v,
      ...style
    }
  }, rest), iconLeft && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconLeft,
    size: s.icon
  }), children, iconRight && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: s.icon
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Square checkbox with rounded corners. */
function Checkbox({
  checked = false,
  onChange,
  size = 18,
  tone = 'dark',
  style,
  ...rest
}) {
  const fill = tone === 'blue' ? 'var(--ev-info)' : tone === 'green' ? 'var(--ev-success)' : tone === 'purple' ? 'var(--ev-purple)' : 'var(--ev-primary)';
  return /*#__PURE__*/React.createElement("button", _extends({
    role: "checkbox",
    "aria-checked": checked,
    onClick: () => onChange && onChange(!checked),
    style: {
      width: size,
      height: size,
      flex: `0 0 ${size}px`,
      borderRadius: 5,
      border: `1.5px solid ${checked ? fill : 'var(--ev-border-strong)'}`,
      background: checked ? fill : 'var(--ev-white)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      padding: 0,
      transition: 'background .12s ease, border-color .12s ease',
      ...style
    }
  }, rest), checked && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: size * 0.72,
    color: "#fff",
    strokeWidth: 2.4
  }));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    box: 38,
    icon: 19,
    radius: 'var(--ev-r-sm)'
  },
  md: {
    box: 46,
    icon: 22,
    radius: 'var(--ev-r-md)'
  },
  lg: {
    box: 52,
    icon: 24,
    radius: 'var(--ev-r-md)'
  }
};
const VARIANTS = {
  dark: {
    background: 'var(--ev-primary)',
    color: 'var(--ev-primary-content)',
    border: '1px solid var(--ev-primary)'
  },
  accent: {
    background: 'var(--ev-purple)',
    color: 'var(--ev-purple-content)',
    border: '1px solid var(--ev-purple)'
  },
  outline: {
    background: 'var(--ev-white)',
    color: 'var(--ev-ink-soft)',
    border: '1px solid var(--ev-border)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--ev-ink-soft)',
    border: '1px solid transparent'
  }
};

/** Square icon-only button. Optional notification dot. */
function IconButton({
  icon,
  variant = 'outline',
  size = 'md',
  dot = false,
  disabled = false,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.outline;
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    style: {
      position: 'relative',
      width: s.box,
      height: s.box,
      flex: `0 0 ${s.box}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: s.radius,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'filter .15s ease',
      ...v,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.icon
  }), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: s.box * 0.21,
      right: s.box * 0.23,
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'var(--ev-error)',
      border: '1.5px solid var(--ev-white)'
    }
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Text input with optional leading icon. */
function Input({
  icon,
  value,
  placeholder = '',
  size = 'md',
  style,
  inputStyle,
  ...rest
}) {
  const pad = size === 'sm' ? '8px 11px' : '10px 13px';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      padding: pad,
      background: 'var(--ev-white)',
      border: '1px solid var(--ev-border)',
      borderRadius: 'var(--ev-r-sm)',
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 15,
    color: "var(--ev-ink-faint)"
  }), /*#__PURE__*/React.createElement("input", _extends({
    value: value,
    placeholder: placeholder,
    style: {
      flex: 1,
      minWidth: 0,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--ev-font-sans)',
      fontSize: size === 'sm' ? 13 : 13.5,
      color: 'var(--ev-ink)',
      ...inputStyle
    }
  }, rest)));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/NoteCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Sticky-style note card with a saturated or soft color fill.
 * Mirrors the dashboard "My notes" tiles.
 */
const THEMES = {
  green: {
    bg: 'var(--ev-green-note)',
    ink: '#222222',
    meta: 'rgba(34,34,34,.6)'
  },
  purple: {
    bg: 'var(--ev-purple)',
    ink: '#ffffff',
    meta: 'rgba(255,255,255,.78)'
  },
  greenSoft: {
    bg: 'var(--ev-green-soft)',
    ink: 'var(--ev-green-ink)',
    meta: 'rgba(60,82,48,.7)'
  },
  purpleSoft: {
    bg: 'var(--ev-purple-soft)',
    ink: 'var(--ev-purple-ink)',
    meta: 'rgba(91,74,168,.7)'
  }
};
function NoteCard({
  title,
  body,
  date,
  theme = 'green',
  onMenu,
  style,
  ...rest
}) {
  const t = THEMES[theme] || THEMES.green;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: t.bg,
      borderRadius: 'var(--ev-r-xl)',
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      minHeight: 150,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ev-font-sans)',
      fontWeight: 700,
      fontSize: '1rem',
      color: t.ink
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    onClick: onMenu,
    style: {
      marginLeft: 'auto',
      border: 'none',
      background: 'rgba(255,255,255,.35)',
      borderRadius: 'var(--ev-r-sm)',
      width: 26,
      height: 26,
      color: t.ink,
      cursor: 'pointer',
      fontSize: '0.875rem',
      lineHeight: 1
    }
  }, "\u22EF")), body && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'var(--ev-font-sans)',
      fontSize: '0.8438rem',
      lineHeight: 1.5,
      color: t.ink,
      opacity: 0.92
    }
  }, body), date && /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 'auto',
      fontFamily: 'var(--ev-font-sans)',
      fontSize: '0.7188rem',
      color: t.meta
    }
  }, date));
}
Object.assign(__ds_scope, { NoteCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/NoteCard.jsx", error: String((e && e.message) || e) }); }

// components/core/ProgressBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  green: 'var(--ev-success)',
  purple: 'var(--ev-purple)',
  blue: 'var(--ev-info)',
  amber: 'var(--ev-warning)',
  coral: 'var(--ev-error)',
  dark: 'var(--ev-primary)'
};

/** Slim horizontal progress / accuracy bar. */
function ProgressBar({
  value = 0,
  tone = 'green',
  height = 6,
  showLabel = false,
  style,
  ...rest
}) {
  const pct = Math.max(0, Math.min(100, value));
  const fill = TONES[tone] || TONES.green;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height,
      borderRadius: 'var(--ev-r-pill)',
      background: 'var(--ev-line)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${pct}%`,
      height: '100%',
      borderRadius: 'var(--ev-r-pill)',
      background: fill,
      transition: 'width .4s cubic-bezier(.2,.7,.2,1)'
    }
  })), showLabel && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ev-font-sans)',
      fontSize: '0.75rem',
      fontWeight: 700,
      color: 'var(--ev-ink-soft)',
      minWidth: 34,
      textAlign: 'right'
    }
  }, pct, "%"));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/core/SegmentedControl.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Pill segmented toggle — e.g. the Chat / Generate switch.
 * Controlled via `value` + `onChange(optionValue)`.
 */
function SegmentedControl({
  options = [],
  value,
  onChange,
  size = 'md',
  style,
  ...rest
}) {
  const sm = size === 'sm';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'inline-flex',
      background: 'var(--ev-white)',
      border: '1px solid var(--ev-border)',
      borderRadius: 'var(--ev-r-pill)',
      padding: 4,
      gap: 3,
      ...style
    }
  }, rest), options.map(opt => {
    const val = typeof opt === 'string' ? opt : opt.value;
    const label = typeof opt === 'string' ? opt : opt.label;
    const on = val === value;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      onClick: () => onChange && onChange(val),
      style: {
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--ev-font-sans)',
        fontSize: sm ? 12.5 : 14,
        fontWeight: 600,
        padding: sm ? '8px 15px' : '11px 19px',
        lineHeight: 1,
        borderRadius: 'var(--ev-r-pill)',
        color: on ? 'var(--ev-primary-content)' : 'var(--ev-ink-faint)',
        backgroundColor: on ? 'var(--ev-primary)' : 'transparent'
      }
    }, label);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/core/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Pill toggle switch. */
function Switch({
  checked = false,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    role: "switch",
    "aria-checked": checked,
    onClick: () => onChange && onChange(!checked),
    style: {
      width: 40,
      height: 24,
      flex: '0 0 40px',
      borderRadius: 'var(--ev-r-pill)',
      border: 'none',
      background: checked ? 'var(--ev-primary)' : 'var(--ev-border-strong)',
      position: 'relative',
      cursor: 'pointer',
      padding: 0,
      transition: 'background .18s ease',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: checked ? 19 : 3,
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: '0 1px 2px rgba(0,0,0,.25)',
      transition: 'left .18s cubic-bezier(.2,.7,.2,1)'
    }
  }));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Switch.jsx", error: String((e && e.message) || e) }); }

// components/core/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Underline tab bar — section / course switcher. */
function Tabs({
  tabs = [],
  value,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      gap: 4,
      borderBottom: '1px solid var(--ev-line)',
      ...style
    }
  }, rest), tabs.map(t => {
    const val = typeof t === 'string' ? t : t.value;
    const label = typeof t === 'string' ? t : t.label;
    const on = val === value;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      onClick: () => onChange && onChange(val),
      style: {
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontFamily: 'var(--ev-font-sans)',
        fontSize: '0.8438rem',
        fontWeight: on ? 700 : 500,
        color: on ? 'var(--ev-ink)' : 'var(--ev-ink-faint)',
        padding: '8px 12px',
        marginBottom: -1,
        borderBottom: on ? '2px solid var(--ev-primary)' : '2px solid transparent',
        transition: 'color .15s ease'
      }
    }, label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Sidebar.jsx
try { (() => {
/**
 * Evo Notes app sidebar — an inset rounded card (brand lockup, primary nav,
 * secondary nav, footer). Items use the primary ink; the active item becomes
 * a solid dark pill with white text. `collapsed` renders a 60px icon rail
 * with the same inset-card treatment and fixed item sizing (no layout shift).
 */
const PRIMARY = [{
  key: 'dashboard',
  label: 'Dashboard',
  icon: 'dashboard'
}, {
  key: 'workspaces',
  label: 'Workspaces',
  icon: 'workspaces'
}, {
  key: 'quiz',
  label: 'Quiz',
  icon: 'quiz'
}, {
  key: 'schedule',
  label: 'Calendar',
  icon: 'schedule'
}];
const SECONDARY = [{
  key: 'flashcards',
  label: 'Flashcards',
  icon: 'flashcards'
}, {
  key: 'files',
  label: 'Files',
  icon: 'files'
}, {
  key: 'tasks',
  label: 'Tasks',
  icon: 'tasks',
  badge: '3'
}, {
  key: 'notes',
  label: 'Notes',
  icon: 'notes',
  badge: '2'
}];
const FOOTER = [{
  key: 'profile',
  label: 'Profile',
  icon: 'profile'
}, {
  key: 'settings',
  label: 'Settings',
  icon: 'settings'
}, {
  key: 'logout',
  label: 'Log out',
  icon: 'logout'
}];
function LogoMark({
  size = 36
}) {
  const u = size / 36;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      flex: `0 0 ${size}px`,
      borderRadius: 10 * u,
      background: 'var(--ev-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size * 0.62,
    height: size * 0.62,
    viewBox: "0 0 36 36",
    fill: "none"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "9",
    width: "14",
    height: "3.6",
    rx: "1.8",
    fill: "#ffffff"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "16.2",
    width: "10",
    height: "3.6",
    rx: "1.8",
    fill: "#aef07f"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "23.4",
    width: "14",
    height: "3.6",
    rx: "1.8",
    fill: "#ffffff"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "25.5",
    cy: "18",
    r: "2.1",
    fill: "#8c7bd9"
  })));
}
function Row({
  item,
  active,
  collapsed,
  onNavigate
}) {
  const on = item.key === active;
  if (collapsed) {
    return /*#__PURE__*/React.createElement("button", {
      onClick: () => onNavigate && onNavigate(item.key),
      title: item.label,
      style: {
        width: 40,
        height: 40,
        flex: '0 0 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--ev-r-md)',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        background: on ? 'var(--ev-primary)' : 'transparent',
        color: on ? '#fff' : 'var(--ev-ink)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: item.icon,
      size: 19,
      color: on ? '#fff' : 'var(--ev-ink)'
    }));
  }
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onNavigate && onNavigate(item.key),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 13,
      width: '100%',
      padding: '10px 12px',
      borderRadius: 'var(--ev-r-md)',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--ev-font-sans)',
      fontSize: '0.9688rem',
      textAlign: 'left',
      fontWeight: on ? 700 : 500,
      color: on ? '#fff' : 'var(--ev-ink)',
      background: on ? 'var(--ev-primary)' : 'transparent'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: item.icon,
    size: 21,
    color: on ? '#fff' : 'var(--ev-ink)'
  }), /*#__PURE__*/React.createElement("span", null, item.label), item.badge && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      minWidth: 26,
      height: 26,
      padding: '0 8px',
      boxSizing: 'border-box',
      borderRadius: 'var(--ev-r-pill)',
      background: on ? 'rgba(255,255,255,.30)' : 'var(--ev-purple)',
      color: '#fff',
      fontSize: '0.8438rem',
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, item.badge));
}
function Sidebar({
  active = 'dashboard',
  collapsed = false,
  onNavigate,
  style
}) {
  if (collapsed) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        width: 60,
        flex: '0 0 60px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '16px 0',
        margin: 10,
        marginRight: 0,
        background: 'var(--ev-bg-sage)',
        border: 'none',
        borderRadius: 'var(--ev-r-2xl)',
        fontFamily: 'var(--ev-font-sans)',
        ...style
      }
    }, /*#__PURE__*/React.createElement(LogoMark, {
      size: 36
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 8
      }
    }), PRIMARY.map(i => /*#__PURE__*/React.createElement(Row, {
      key: i.key,
      item: i,
      active: active,
      collapsed: true,
      onNavigate: onNavigate
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 26,
        height: 1,
        background: 'var(--ev-line)',
        margin: '6px 0'
      }
    }), SECONDARY.map(i => /*#__PURE__*/React.createElement(Row, {
      key: i.key,
      item: i,
      active: active,
      collapsed: true,
      onNavigate: onNavigate
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 'auto'
      }
    }), /*#__PURE__*/React.createElement(Row, {
      item: FOOTER[1],
      active: active,
      collapsed: true,
      onNavigate: onNavigate
    }));
  }
  const SectionLabel = ({
    children
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '0.7188rem',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--ev-ink-faint)',
      padding: '0 12px',
      margin: '0 0 6px'
    }
  }, children);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 222,
      flex: '0 0 222px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 10px',
      margin: 10,
      marginRight: 0,
      background: 'var(--ev-bg-sage)',
      border: 'none',
      borderRadius: 'var(--ev-r-2xl)',
      fontFamily: 'var(--ev-font-sans)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      padding: '4px 8px 18px'
    }
  }, /*#__PURE__*/React.createElement(LogoMark, {
    size: 36
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 800,
      fontSize: '1.125rem',
      color: 'var(--ev-ink)',
      letterSpacing: '-0.01em'
    }
  }, "Evo Notes")), /*#__PURE__*/React.createElement(SectionLabel, null, "General"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }
  }, PRIMARY.map(i => /*#__PURE__*/React.createElement(Row, {
    key: i.key,
    item: i,
    active: active,
    onNavigate: onNavigate
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 16
    }
  }), /*#__PURE__*/React.createElement(SectionLabel, null, "Tools"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }
  }, SECONDARY.map(i => /*#__PURE__*/React.createElement(Row, {
    key: i.key,
    item: i,
    active: active,
    onNavigate: onNavigate
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto'
    }
  }), /*#__PURE__*/React.createElement(SectionLabel, null, "Others"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }
  }, FOOTER.map(i => /*#__PURE__*/React.createElement(Row, {
    key: i.key,
    item: i,
    active: active,
    onNavigate: onNavigate
  }))));
}
Object.assign(__ds_scope, { Sidebar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/DashboardScreen.jsx
try { (() => {
const WORKSPACES = [{
  name: 'Biology 101',
  meta: 'Course · 12 Files · 6 Chapters ',
  tags: ['Cells', 'Genetics'],
  icon: 'book',
  accent: 'var(--ev-green-note)',
  iconColor: '#222222'
}, {
  name: 'Recipes notebook',
  meta: 'Workspace · 10 Files',
  tags: ['Cooking', 'Recipes'],
  icon: 'workspaces',
  accent: 'var(--ev-purple)',
  iconColor: '#ffffff'
}];
const TASKS = [{
  label: 'Finish Cell biology quiz',
  meta: 'Biology 101',
  done: false
}, {
  label: 'Review linear equations',
  meta: 'Math',
  done: false
}, {
  label: 'Read Chapter 5 notes',
  meta: 'Workspace 1',
  done: true
}];
const WEEK = [{
  d: 'Mon',
  n: 15
}, {
  d: 'Tue',
  n: 16
}, {
  d: 'Wed',
  n: 17
}, {
  d: 'Thu',
  n: 18
}, {
  d: 'Fri',
  n: 19,
  today: true
}, {
  d: 'Sat',
  n: 20
}, {
  d: 'Sun',
  n: 21
}];
const EVENTS = [{
  time: '8:30',
  title: 'Math',
  meta: 'Room B3 · 124',
  range: '8:30 — 9:20',
  icon: 'book',
  tag: null,
  accent: 'var(--ev-green-note)',
  iconColor: '#222222'
}, {
  time: '10:30',
  title: 'Biology',
  meta: 'Room B2 · 158',
  range: '10:30 — 11:20',
  icon: 'practice',
  tag: null,
  accent: 'var(--ev-purple)',
  iconColor: '#ffffff'
}, {
  time: '2:00',
  title: 'Study group',
  meta: 'Library · Floor 2',
  range: '14:00 — 15:00',
  icon: 'workspaces',
  tag: 'Group',
  accent: 'var(--ev-green-note)',
  iconColor: '#222222'
}];

/** Striped illustration placeholder for a hero banner. */
function BannerPlaceholder() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 168,
      borderRadius: 'var(--ev-r-xl)',
      overflow: 'hidden',
      position: 'relative',
      background: 'repeating-linear-gradient(135deg, var(--ev-purple-soft) 0 14px, var(--ev-purple-softer) 14px 28px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '0.8125rem',
      color: 'var(--ev-purple-ink)',
      background: 'var(--ev-white)',
      padding: '7px 14px',
      borderRadius: 'var(--ev-r-pill)',
      letterSpacing: '0.02em'
    }
  }, "illustration / banner"));
}

/** Evo Notes dashboard — white inset cards on a light page, streak intro + tasks/schedule rail. */
function DashboardScreen({
  onNavigate
}) {
  const [tasks, setTasks] = React.useState(TASKS);
  const toggle = i => setTasks(t => t.map((x, j) => j === i ? {
    ...x,
    done: !x.done
  } : x));
  const cardShell = {
    background: 'var(--ev-surface)',
    borderRadius: 'var(--ev-r-2xl)',
    boxShadow: 'var(--ev-shadow-card)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100%',
      background: 'var(--ev-bg-page)',
      fontFamily: 'var(--ev-font-sans)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Sidebar, {
    active: "dashboard",
    onNavigate: onNavigate
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      margin: '10px 0 10px 10px',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...cardShell,
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '30px 32px',
      gap: 26,
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '1.875rem',
      fontWeight: 800,
      color: 'var(--ev-ink)',
      letterSpacing: '-0.02em',
      lineHeight: 1.15
    }
  }, "Seems like you just started"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '1.125rem',
      color: 'var(--ev-ink-soft)',
      marginTop: 8
    }
  }, "Take a look around \u2014 your workspaces, notes and streaks will show up here.")), /*#__PURE__*/React.createElement(BannerPlaceholder, null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: '1.25rem',
      fontWeight: 800,
      color: 'var(--ev-ink)'
    }
  }, "Recent workspace"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontSize: '0.9375rem',
      color: 'var(--ev-ink-faint)',
      cursor: 'pointer'
    },
    onClick: () => onNavigate && onNavigate('workspaces')
  }, "All workspaces \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, WORKSPACES.map(w => /*#__PURE__*/React.createElement("div", {
    key: w.name,
    style: {
      background: 'var(--ev-surface)',
      border: '1px solid var(--ev-border)',
      borderRadius: 'var(--ev-r-xl)',
      padding: 20,
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    },
    onClick: () => onNavigate && onNavigate('workspaces')
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 48,
      height: 48,
      borderRadius: 'var(--ev-r-lg)',
      background: w.accent,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: w.icon,
    size: 26,
    color: w.iconColor
  })), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "more",
    size: 22,
    color: "var(--ev-ink)",
    style: {
      marginLeft: 'auto'
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '1.125rem',
      fontWeight: 700,
      color: 'var(--ev-ink)'
    }
  }, w.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '0.875rem',
      color: 'var(--ev-ink-soft)',
      marginTop: 4
    }
  }, w.meta), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 10
    }
  }, w.tags.map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      fontSize: '0.875rem',
      fontWeight: 600,
      color: 'var(--ev-ink)'
    }
  }, "#", t)))))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: '1.25rem',
      fontWeight: 800,
      color: 'var(--ev-ink)'
    }
  }, "Thinking Space"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontSize: '0.9375rem',
      color: 'var(--ev-ink-faint)',
      cursor: 'pointer'
    }
  }, "See all \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.NoteCard, {
    theme: "green",
    title: "Math conspect",
    body: "A linear equation has the form ax + b = c, where a, b and c are constants.",
    date: "May 05, 2025"
  }), /*#__PURE__*/React.createElement(__ds_scope.NoteCard, {
    theme: "purple",
    title: "Biology conspect",
    body: "A cell is the basic structural and functional unit of all living organisms.",
    date: "Apr 29, 2025"
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 360,
      flex: '0 0 360px',
      margin: 10,
      marginLeft: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: 'var(--ev-bg-sage)',
      borderRadius: 'var(--ev-r-2xl)',
      padding: '10px 12px 10px 16px'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "search",
    variant: "dark"
  }), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "bell",
    variant: "accent",
    dot: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      height: 54,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      borderRadius: 'var(--ev-r-pill)',
      padding: '0 16px 0 7px',
      background: 'var(--ev-white)',
      boxShadow: 'var(--ev-shadow-xs)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: "Kate Malone",
    src: "avatars/student.svg",
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.9063rem',
      fontWeight: 700,
      color: 'var(--ev-ink)',
      lineHeight: 1.1
    }
  }, "Kate Malone"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.7813rem',
      color: 'var(--ev-ink-faint)'
    }
  }, "Class 9A")), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronDown",
    size: 16,
    color: "var(--ev-ink-faint)",
    style: {
      marginLeft: 2
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      ...cardShell,
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 18px',
      gap: 20,
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    style: {
      margin: '0 0 14px',
      fontSize: '1.25rem',
      fontWeight: 800,
      color: 'var(--ev-ink)'
    }
  }, "Tasks"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, tasks.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: t.label,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      cursor: 'pointer'
    },
    onClick: () => toggle(i)
  }, /*#__PURE__*/React.createElement(__ds_scope.Checkbox, {
    checked: t.done,
    tone: "purple",
    size: 22,
    onChange: () => toggle(i)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '0.9375rem',
      fontWeight: 600,
      color: t.done ? 'var(--ev-ink-faint)' : 'var(--ev-ink)',
      textDecoration: t.done ? 'line-through' : 'none'
    }
  }, t.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '0.8125rem',
      color: 'var(--ev-ink-faint)'
    }
  }, t.meta)))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("h4", {
    style: {
      margin: 0,
      fontSize: '1.25rem',
      fontWeight: 800,
      color: 'var(--ev-ink)'
    }
  }, "Jun 2026"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 'var(--ev-r-sm)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronLeft",
    size: 18,
    color: "var(--ev-ink-soft)"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 'var(--ev-r-sm)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronRight",
    size: 18,
    color: "var(--ev-ink-soft)"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: 4,
      marginBottom: 18
    }
  }, WEEK.map(w => /*#__PURE__*/React.createElement("div", {
    key: w.n,
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.7813rem',
      color: 'var(--ev-ink-faint)',
      fontWeight: 600
    }
  }, w.d), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 'var(--ev-r-md)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.9375rem',
      fontWeight: 700,
      background: w.today ? 'var(--ev-primary)' : 'transparent',
      color: w.today ? '#fff' : 'var(--ev-ink)'
    }
  }, w.n)))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '0.9375rem',
      fontWeight: 700,
      color: 'var(--ev-ink)',
      marginBottom: 12
    }
  }, "Today, Fri"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, EVENTS.map((e, ei) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: e.title
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.7813rem',
      color: '#222222',
      fontWeight: 700,
      width: 42,
      flex: '0 0 42px',
      paddingTop: 14
    }
  }, e.time), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      background: 'var(--ev-bg-soft)',
      borderRadius: 'var(--ev-r-lg)',
      padding: 14,
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      flex: '0 0 34px',
      borderRadius: '50%',
      background: e.accent,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: e.icon,
    size: 18,
    color: e.iconColor
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.9375rem',
      fontWeight: 700,
      color: 'var(--ev-ink)'
    }
  }, e.title), e.tag && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.75rem',
      fontWeight: 600,
      color: 'var(--ev-purple-ink)',
      background: 'var(--ev-purple-soft)',
      padding: '2px 9px',
      borderRadius: 'var(--ev-r-pill)'
    }
  }, e.tag), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronRight",
    size: 15,
    color: "var(--ev-ink-faint)",
    style: {
      marginLeft: 'auto'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '0.8125rem',
      color: 'var(--ev-ink-faint)',
      marginTop: 3
    }
  }, e.meta), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '0.8125rem',
      color: 'var(--ev-ink-faint)',
      marginTop: 2
    }
  }, e.range)))), ei === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      margin: '-1px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.75rem',
      fontWeight: 800,
      color: '#222222',
      letterSpacing: '0.01em',
      width: 42,
      flex: '0 0 42px'
    }
  }, "Now"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: '#222222',
      flex: '0 0 7px'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 2,
      background: '#222222',
      borderRadius: 1
    }
  }))))))))));
}
Object.assign(__ds_scope, { DashboardScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/DashboardScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/FlashcardsScreen.jsx
try { (() => {
const DECKS = [{
  name: 'Cell biology',
  workspace: 'Biology 101',
  cards: 32,
  known: 80,
  bg: 'var(--ev-green-soft)',
  ic: 'var(--ev-green-ink)'
}, {
  name: 'Genetics',
  workspace: 'Biology 101',
  cards: 24,
  known: 60,
  bg: 'var(--ev-purple-soft)',
  ic: 'var(--ev-purple-ink)'
}, {
  name: 'Evolution',
  workspace: 'Biology 101',
  cards: 18,
  known: 35,
  bg: 'var(--ev-warning-soft)',
  ic: 'var(--ev-warning-ink)'
}, {
  name: 'Limits',
  workspace: 'Calculus II',
  cards: 28,
  known: 72,
  bg: 'var(--ev-info-soft)',
  ic: 'var(--ev-info-ink)'
}, {
  name: 'Integrals',
  workspace: 'Calculus II',
  cards: 20,
  known: 45,
  bg: 'var(--ev-green-soft)',
  ic: 'var(--ev-green-ink)'
}, {
  name: 'Ancient era',
  workspace: 'World History',
  cards: 16,
  known: 58,
  bg: 'var(--ev-purple-soft)',
  ic: 'var(--ev-purple-ink)'
}];

/** Flashcards — deck library, moved out of the former Practice screen. */
function FlashcardsScreen({
  onNavigate
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100%',
      background: 'var(--ev-surface)',
      fontFamily: 'var(--ev-font-sans)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Sidebar, {
    active: "flashcards",
    onNavigate: onNavigate
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '26px 30px',
      gap: 22,
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: '1.625rem',
      fontWeight: 800,
      color: 'var(--ev-ink)',
      letterSpacing: '-0.02em'
    }
  }, "Flashcards"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "New deck",
    style: {
      marginLeft: 'auto',
      width: 46,
      height: 46,
      flex: '0 0 46px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--ev-bg)',
      border: 'none',
      borderRadius: 'var(--ev-r-md)',
      cursor: 'pointer',
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "plus",
    size: 22,
    color: "var(--ev-ink)"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16
    }
  }, DECKS.map(d => /*#__PURE__*/React.createElement(__ds_scope.Card, {
    key: d.name,
    padding: 18,
    radius: "var(--ev-r-xl)",
    interactive: true,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 'var(--ev-r-lg)',
      background: d.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "flashcards",
    size: 22,
    color: d.ic
  })), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "more",
    size: 22,
    color: "var(--ev-ink)",
    style: {
      marginLeft: 'auto'
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '1.0625rem',
      fontWeight: 700,
      color: 'var(--ev-ink)'
    }
  }, d.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '0.8125rem',
      color: 'var(--ev-ink-faint)',
      marginTop: 4
    }
  }, d.workspace)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '0.8125rem',
      color: 'var(--ev-ink-faint)',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", null, d.cards, " cards"), /*#__PURE__*/React.createElement("span", null, d.known, "% known")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 5,
      borderRadius: 'var(--ev-r-pill)',
      background: 'var(--ev-line)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${d.known}%`,
      height: '100%',
      background: 'var(--ev-success)'
    }
  }))))))));
}
Object.assign(__ds_scope, { FlashcardsScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/FlashcardsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/QuizScreen.jsx
try { (() => {
const QUIZZES = [{
  id: 'q1',
  name: 'Cell biology basics',
  workspace: 'Biology 101',
  questions: 12,
  chapters: 'Ch.1, Ch.2',
  created: 'Created 2d ago',
  accent: 'var(--ev-green-note)',
  iconColor: '#222222'
}, {
  id: 'q2',
  name: 'Evolution drill',
  workspace: 'Biology 101',
  questions: 8,
  chapters: 'Ch.4',
  created: 'Created 4d ago',
  accent: 'var(--ev-warning)',
  iconColor: '#222222'
}, {
  id: 'q3',
  name: 'Limits & derivatives',
  workspace: 'Calculus II',
  questions: 15,
  chapters: 'Ch.1–Ch.3',
  created: 'Created 1w ago',
  accent: 'var(--ev-info)',
  iconColor: '#222222'
}, {
  id: 'q4',
  name: 'Ancient civilizations',
  workspace: 'World History',
  questions: 10,
  chapters: 'Ch.1, Ch.2',
  created: 'Created 1w ago',
  accent: 'var(--ev-purple)',
  iconColor: '#ffffff'
}, {
  id: 'q5',
  name: 'Genetics review',
  workspace: 'Biology 101',
  questions: 20,
  chapters: 'Ch.2, Ch.3',
  created: 'Created 2w ago',
  accent: 'var(--ev-green-note)',
  iconColor: '#222222'
}];
const ATTEMPTS = [{
  id: 'a1',
  quiz: 'Mixed review',
  workspace: 'Biology 101',
  chapters: 'Ch.1, Ch.2',
  score: '8/10',
  pct: 80,
  date: 'Apr 18, 2026'
}, {
  id: 'a2',
  quiz: 'Evolution drill',
  workspace: 'Biology 101',
  chapters: 'Ch.4',
  score: '3/8',
  pct: 38,
  date: 'Apr 16, 2026'
}, {
  id: 'a3',
  quiz: 'Ecology check',
  workspace: 'Biology 101',
  chapters: 'Ch.5, Ch.6',
  score: '6/10',
  pct: 60,
  date: 'Apr 12, 2026'
}, {
  id: 'a4',
  quiz: 'Limits & derivatives',
  workspace: 'Calculus II',
  chapters: 'Ch.1–Ch.3',
  score: '13/15',
  pct: 87,
  date: 'Apr 10, 2026'
}, {
  id: 'a5',
  quiz: 'Ancient civilizations',
  workspace: 'World History',
  chapters: 'Ch.1, Ch.2',
  score: '7/10',
  pct: 70,
  date: 'Apr 5, 2026'
}];
const MENU_ITEMS = [{
  key: 'details',
  label: 'View details',
  icon: 'files'
}, {
  key: 'retry',
  label: 'Retry quiz',
  icon: 'clock'
}, {
  key: 'edit',
  label: 'Edit quiz',
  icon: 'notes'
}, {
  key: 'hide',
  label: 'Hide',
  icon: 'minus'
}];
function scoreTone(p) {
  return p >= 70 ? 'var(--ev-success-ink)' : p >= 55 ? 'var(--ev-warning-ink)' : 'var(--ev-error-ink)';
}
function scoreBg(p) {
  return p >= 70 ? 'var(--ev-success-soft)' : p >= 55 ? 'var(--ev-warning-soft)' : 'var(--ev-error-soft)';
}

/** Left-aligned filter / sort control used above both views. */
function FilterSort() {
  const btn = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '9px 12px',
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--ev-r-md)',
    fontFamily: 'var(--ev-font-sans)',
    fontSize: '0.8438rem',
    fontWeight: 600,
    color: 'var(--ev-ink)',
    cursor: 'pointer'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: btn
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "filter",
    size: 16,
    color: "var(--ev-ink)"
  }), "Filter"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: btn
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronDown",
    size: 16,
    color: "var(--ev-ink)"
  }), "Sort"));
}

/** Three-dot row action menu. */
function RowMenu({
  open,
  onToggle
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "More actions",
    onClick: onToggle,
    style: {
      width: 34,
      height: 34,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: open ? 'var(--ev-bg)' : 'transparent',
      border: '1px solid',
      borderColor: open ? 'var(--ev-border)' : 'transparent',
      borderRadius: 'var(--ev-r-sm)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "moreVertical",
    size: 20,
    strokeWidth: 3.4,
    color: "var(--ev-ink)"
  })), open && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 'calc(100% + 6px)',
      right: 0,
      zIndex: 20,
      width: 184,
      background: 'var(--ev-white)',
      border: '1px solid var(--ev-border)',
      borderRadius: 'var(--ev-r-md)',
      boxShadow: 'var(--ev-shadow-card)',
      padding: 6
    }
  }, MENU_ITEMS.map(m => /*#__PURE__*/React.createElement("button", {
    key: m.key,
    type: "button",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      width: '100%',
      padding: '9px 11px',
      background: 'transparent',
      border: 'none',
      borderRadius: 'var(--ev-r-sm)',
      cursor: 'pointer',
      fontFamily: 'var(--ev-font-sans)',
      fontSize: '0.875rem',
      fontWeight: 500,
      color: m.key === 'hide' ? 'var(--ev-error-ink)' : 'var(--ev-ink)',
      textAlign: 'left'
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = 'var(--ev-bg)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = 'transparent';
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: m.icon,
    size: 16,
    color: m.key === 'hide' ? 'var(--ev-error-ink)' : 'var(--ev-ink-faint)'
  }), m.label))));
}

/** Quiz — workspace-style inset surface with All quizzes / Past attempts tabs. */
function QuizScreen({
  onNavigate
}) {
  const [tab, setTab] = React.useState('all');
  const [openMenu, setOpenMenu] = React.useState(null);
  const NOTCH_W = 340,
    NOTCH_H = 94,
    NOTCH_R = 28;
  const blockBase = {
    position: 'absolute',
    background: 'var(--ev-surface)',
    borderRadius: 'var(--ev-r-2xl)'
  };
  const TABS = [{
    key: 'all',
    label: 'All quizzes'
  }, {
    key: 'past',
    label: 'Past attempts'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100%',
      background: 'var(--ev-bg-page)',
      fontFamily: 'var(--ev-font-sans)'
    },
    onClick: () => setOpenMenu(null)
  }, /*#__PURE__*/React.createElement(__ds_scope.Sidebar, {
    active: "quiz",
    onNavigate: onNavigate
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      margin: 10,
      display: 'flex',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.04)) drop-shadow(0 12px 32px rgba(0,0,0,.05))'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...blockBase,
      top: 0,
      left: 0,
      bottom: 0,
      width: 'calc(100% - ' + NOTCH_W + 'px)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...blockBase,
      top: NOTCH_H + 'px',
      left: 0,
      right: 0,
      bottom: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: NOTCH_H - NOTCH_R + 'px',
      left: 'calc(100% - ' + NOTCH_W + 'px)',
      width: NOTCH_R,
      height: NOTCH_R,
      background: 'radial-gradient(circle ' + NOTCH_R + 'px at top right, transparent ' + (NOTCH_R - 0.5) + 'px, var(--ev-surface) ' + NOTCH_R + 'px)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '28px 30px',
      gap: 20,
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 54,
      paddingRight: NOTCH_W
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: '1.625rem',
      fontWeight: 800,
      color: 'var(--ev-ink)',
      letterSpacing: '-0.02em'
    }
  }, "Quizzes"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "New quiz",
    style: {
      marginLeft: 'auto',
      width: 46,
      height: 46,
      flex: '0 0 46px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--ev-bg)',
      border: 'none',
      borderRadius: 'var(--ev-r-md)',
      cursor: 'pointer',
      padding: 0,
      transition: 'border-color .15s ease'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "plus",
    size: 22,
    color: "var(--ev-ink)"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignSelf: 'stretch',
      borderBottom: '1px solid var(--ev-line)'
    }
  }, TABS.map(t => {
    const on = t.key === tab;
    return /*#__PURE__*/React.createElement("button", {
      key: t.key,
      type: "button",
      onClick: () => setTab(t.key),
      style: {
        position: 'relative',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--ev-font-sans)',
        fontSize: '0.9063rem',
        fontWeight: on ? 700 : 500,
        padding: '8px 14px',
        marginBottom: -1,
        background: 'transparent',
        color: on ? 'var(--ev-ink)' : 'var(--ev-ink-soft)',
        transition: 'color .15s ease'
      }
    }, on && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--ev-bg)',
        border: '1px solid var(--ev-border)',
        borderRadius: 'var(--ev-r-md)',
        zIndex: -1
      }
    }), t.label, on && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: 4,
        right: 4,
        bottom: 0,
        height: 2,
        background: 'var(--ev-ink)',
        borderRadius: 2
      }
    }));
  })), tab === 'all' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: -12
    }
  }, /*#__PURE__*/React.createElement(FilterSort, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16
    }
  }, QUIZZES.map(q => /*#__PURE__*/React.createElement(__ds_scope.Card, {
    key: q.id,
    padding: 20,
    radius: "var(--ev-r-xl)",
    interactive: true,
    style: {
      background: 'var(--ev-surface)',
      border: '1px solid var(--ev-border)',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 48,
      height: 48,
      borderRadius: 'var(--ev-r-lg)',
      background: q.accent,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "quiz",
    size: 26,
    color: q.iconColor
  })), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "more",
    size: 22,
    color: "var(--ev-ink)",
    style: {
      marginLeft: 'auto'
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '1.125rem',
      fontWeight: 700,
      color: 'var(--ev-ink)'
    }
  }, q.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      fontSize: '0.875rem',
      color: 'var(--ev-ink)',
      fontWeight: 600,
      marginTop: 5
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "book",
    size: 15,
    color: "var(--ev-ink)"
  }), q.workspace), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '0.875rem',
      color: 'var(--ev-ink-soft)',
      marginTop: 4
    }
  }, q.questions, " questions \xB7 ", q.chapters), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '0.8125rem',
      color: 'var(--ev-ink-soft)',
      marginTop: 12
    }
  }, q.created)))), /*#__PURE__*/React.createElement(__ds_scope.Card, {
    padding: 20,
    radius: "var(--ev-r-xl)",
    interactive: true,
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      color: 'var(--ev-ink-faint)',
      minHeight: 150
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "plus",
    size: 22
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.875rem',
      fontWeight: 500
    }
  }, "New quiz")))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Input, {
    icon: "search",
    placeholder: "Search attempts\u2026",
    style: {
      width: 280,
      padding: '10px 13px',
      borderRadius: 'var(--ev-r-md)'
    }
  }), /*#__PURE__*/React.createElement(FilterSort, null)), /*#__PURE__*/React.createElement(__ds_scope.Card, {
    padding: 0,
    style: {
      overflow: 'visible'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      padding: '13px 20px',
      background: 'var(--ev-bg)',
      borderBottom: '1px solid var(--ev-line)',
      borderTopLeftRadius: 'var(--ev-r-lg)',
      borderTopRightRadius: 'var(--ev-r-lg)',
      fontSize: '0.75rem',
      fontWeight: 700,
      color: 'var(--ev-ink-faint)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 2.2
    }
  }, "Quiz"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1.8
    }
  }, "Workspace"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      textAlign: 'center'
    }
  }, "Chapters"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      textAlign: 'center'
    }
  }, "Score"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1.3
    }
  }, "Date"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: '0 0 220px',
      textAlign: 'left'
    }
  }, "Action")), ATTEMPTS.map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      padding: '13px 20px',
      borderBottom: i < ATTEMPTS.length - 1 ? '1px solid var(--ev-line)' : 'none',
      fontSize: '0.9063rem'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 2.2,
      fontWeight: 500,
      color: 'var(--ev-ink)'
    }
  }, a.quiz), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1.8,
      fontWeight: 500,
      color: 'var(--ev-ink-soft)'
    }
  }, a.workspace), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      textAlign: 'center',
      fontWeight: 500,
      color: 'var(--ev-ink-soft)'
    }
  }, a.chapters), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: '0.8125rem',
      color: scoreTone(a.pct),
      background: scoreBg(a.pct),
      padding: '4px 11px',
      borderRadius: 'var(--ev-r-pill)'
    }
  }, a.score)), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1.3,
      fontWeight: 500,
      color: 'var(--ev-ink-faint)'
    }
  }, a.date), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: '0 0 220px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: 'transparent',
      border: 'none',
      padding: '6px 8px',
      fontFamily: 'var(--ev-font-sans)',
      fontSize: '0.875rem',
      fontWeight: 600,
      color: 'var(--ev-ink)',
      cursor: 'pointer'
    }
  }, "Check result", /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "arrowRight",
    size: 16,
    color: "var(--ev-ink)"
  })), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement(RowMenu, {
    open: openMenu === a.id,
    onToggle: () => setOpenMenu(openMenu === a.id ? null : a.id)
  })))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 10,
      right: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: 'var(--ev-bg-sage)',
      borderRadius: 'var(--ev-r-2xl)',
      padding: '10px 12px 10px 16px'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "search",
    variant: "dark"
  }), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "bell",
    variant: "accent",
    dot: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 54,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      borderRadius: 'var(--ev-r-pill)',
      padding: '0 16px 0 7px',
      background: 'var(--ev-white)',
      boxShadow: 'var(--ev-shadow-xs)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: "Kate Malone",
    src: "avatars/student.svg",
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.9063rem',
      fontWeight: 700,
      color: 'var(--ev-ink)',
      lineHeight: 1.1
    }
  }, "Kate Malone"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.7813rem',
      color: 'var(--ev-ink-faint)'
    }
  }, "Class 9A")), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronDown",
    size: 16,
    color: "var(--ev-ink-faint)",
    style: {
      marginLeft: 2
    }
  })))));
}
Object.assign(__ds_scope, { QuizScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/QuizScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/ScheduleScreen.jsx
try { (() => {
const MUTED = 'var(--ev-ink-faint)';
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MINI = [[25, 26, 27, 28, 29, 30, 31], [1, 2, 3, 4, 5, 6, 7], [8, 9, 10, 11, 12, 13, 14], [15, 16, 17, 18, 19, 20, 21], [22, 23, 24, 25, 26, 27, 28], [29, 30, 1, 2, 3, 4, 5]];

// Labels — user-assignable colors for calendar events.
// dark === text reads white on the fill; otherwise black.
const LABELS = [{
  name: 'Biology',
  color: 'var(--ev-info)',
  dark: false
}, {
  name: 'Genetics',
  color: 'var(--ev-purple)',
  dark: true
}, {
  name: 'Study',
  color: 'var(--ev-success)',
  dark: false
}, {
  name: 'Workshop',
  color: 'var(--ev-error)',
  dark: false
}, {
  name: 'Lunch',
  color: 'var(--ev-warning)',
  dark: false
}];
const LABEL_MAP = Object.fromEntries(LABELS.map(l => [l.name, l]));
const WEEK = [{
  day: 'Mon',
  full: 'Monday',
  date: 11
}, {
  day: 'Tue',
  full: 'Tuesday',
  date: 12
}, {
  day: 'Wed',
  full: 'Wednesday',
  date: 13
}, {
  day: 'Thu',
  full: 'Thursday',
  date: 14
}, {
  day: 'Fri',
  full: 'Friday',
  date: 15
}, {
  day: 'Sat',
  full: 'Saturday',
  date: 16
}, {
  day: 'Sun',
  full: 'Sunday',
  date: 17
}];
const TODAY_COL = 1; // Tuesday 12

// col 0-6, s/e in decimal hours, t title, time label, loc, labels[]
const EVENTS = [{
  id: 'e1',
  col: 0,
  s: 8,
  e: 9,
  t: 'Biology',
  time: '08:00 – 09:00',
  loc: 'Room B2 · 158',
  labels: ['Biology']
}, {
  id: 'e2',
  col: 0,
  s: 10.5,
  e: 12,
  t: 'User flow lab',
  time: '10:30 – 12:00',
  loc: 'Lab 4',
  labels: ['Study']
}, {
  id: 'e3',
  col: 0,
  s: 14,
  e: 15.5,
  t: 'Reading',
  time: '14:00 – 15:30',
  loc: 'Library',
  labels: ['Study']
}, {
  id: 'e4',
  col: 1,
  s: 8.5,
  e: 10.5,
  t: 'Project work',
  time: '08:30 – 10:30',
  loc: 'Room A1',
  labels: []
}, {
  id: 'e5',
  col: 1,
  s: 10.75,
  e: 12.25,
  t: 'Design review',
  time: '10:45 – 12:15',
  loc: 'Room B2 · 158',
  labels: ['Genetics', 'Biology']
}, {
  id: 'e6',
  col: 1,
  s: 14,
  e: 15.5,
  t: 'Workshop',
  time: '14:00 – 15:30',
  loc: 'Studio',
  labels: ['Workshop']
}, {
  id: 'e7',
  col: 2,
  s: 8,
  e: 9,
  t: 'Math',
  time: '08:00 – 09:00',
  loc: 'Room B3 · 124',
  labels: []
}, {
  id: 'e8',
  col: 2,
  s: 9.5,
  e: 11.5,
  t: 'Meetup prep',
  time: '09:30 – 11:30',
  loc: 'Hub',
  labels: ['Study']
}, {
  id: 'e9',
  col: 2,
  s: 12,
  e: 13,
  t: 'Lunch break',
  time: '12:00 – 13:00',
  loc: 'Cafeteria',
  labels: ['Lunch']
}, {
  id: 'e10',
  col: 3,
  s: 8,
  e: 10,
  t: 'Retrospective',
  time: '08:00 – 10:00',
  loc: 'Room A1',
  labels: []
}, {
  id: 'e11',
  col: 3,
  s: 16,
  e: 17,
  t: 'Reading',
  time: '16:00 – 17:00',
  loc: 'Library',
  labels: ['Study']
}, {
  id: 'e12',
  col: 4,
  s: 8,
  e: 9,
  t: 'English',
  time: '08:00 – 09:00',
  loc: 'Room C2',
  labels: []
}, {
  id: 'e13',
  col: 4,
  s: 9.5,
  e: 11.5,
  t: 'Revision block',
  time: '09:30 – 11:30',
  loc: 'Library',
  labels: ['Study']
}, {
  id: 'e14',
  col: 4,
  s: 13,
  e: 15,
  t: 'Workshop',
  time: '13:00 – 15:00',
  loc: 'Studio',
  labels: ['Workshop']
}, {
  id: 'e15',
  col: 6,
  s: 9,
  e: 10,
  t: 'Reading',
  time: '09:00 – 10:00',
  loc: 'Home',
  labels: ['Study']
}, {
  id: 'e16',
  col: 6,
  s: 12,
  e: 13,
  t: 'Lunch break',
  time: '12:00 – 13:00',
  loc: 'Home',
  labels: ['Lunch']
}];
const HEADER_H = 52;
const START_HOUR = 0; // 12 AM
const END_HOUR = 24; // 12 AM next day — full day
const HOUR_H = 62; // px per hour — min height so events stay legible
const NOW_HOUR = 10.5; // current-time indicator position
const HOURS = Array.from({
  length: END_HOUR - START_HOUR + 1
}, (_, i) => START_HOUR + i);
const GRID_H = (END_HOUR - START_HOUR) * HOUR_H;
function fmtHour(h) {
  const m = h % 24;
  const ap = m < 12 ? 'AM' : 'PM';
  let hh = m % 12;
  if (hh === 0) hh = 12;
  return `${hh} ${ap}`;
}

/** Event fill + ink: first label's color fills the whole block; unlabeled = dark grey + black. */
function eventLook(ev) {
  if (ev.labels.length) {
    const l = LABEL_MAP[ev.labels[0]];
    return {
      bg: l.color,
      ink: l.dark ? '#ffffff' : 'var(--ev-ink)',
      chipBg: l.dark ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.12)'
    };
  }
  return {
    bg: 'var(--ev-bg-deep)',
    ink: 'var(--ev-ink)',
    chipBg: 'rgba(0,0,0,.10)'
  };
}
function MiniCal() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--ev-surface)',
      borderRadius: 'var(--ev-r-lg)',
      padding: 16,
      boxShadow: 'var(--ev-shadow-xs)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '6px 13px',
      borderRadius: 'var(--ev-r-md)',
      border: '1px solid var(--ev-border)',
      background: 'var(--ev-surface)',
      cursor: 'pointer',
      fontFamily: 'var(--ev-font-sans)',
      fontSize: '0.9375rem',
      fontWeight: 600,
      color: 'var(--ev-ink)',
      letterSpacing: '-0.01em'
    }
  }, "September, 2025"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 'var(--ev-r-sm)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronLeft",
    size: 18,
    color: "var(--ev-ink-soft)"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 'var(--ev-r-sm)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronRight",
    size: 18,
    color: "var(--ev-ink-soft)"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: 2,
      marginBottom: 4
    }
  }, DOW.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      textAlign: 'center',
      fontSize: '0.7188rem',
      fontWeight: 700,
      color: MUTED
    }
  }, d))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: 2
    }
  }, MINI.flat().map((d, i) => {
    const muted = i < 6 || i > 32;
    const today = d === 11 && i > 6 && i < 21;
    const sel = d === 17 && i > 6 && i < 28;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        aspectRatio: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.7813rem',
        fontWeight: today || sel ? 700 : 500,
        color: today ? '#fff' : muted ? MUTED : 'var(--ev-ink-soft)',
        background: today ? 'var(--ev-primary)' : 'transparent',
        border: sel ? '1.5px solid var(--ev-primary)' : '1.5px solid transparent',
        borderRadius: 'var(--ev-r-md)',
        cursor: 'pointer'
      }
    }, d);
  })));
}
function LabelsCard({
  hidden,
  onToggle
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--ev-surface)',
      borderRadius: 'var(--ev-r-lg)',
      padding: 16,
      boxShadow: 'var(--ev-shadow-xs)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 13
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronDown",
    size: 16,
    color: "var(--ev-ink-soft)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.9375rem',
      fontWeight: 800,
      color: 'var(--ev-ink)'
    }
  }, "Labels"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 24,
      height: 24,
      borderRadius: 'var(--ev-r-sm)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "moreVertical",
    size: 18,
    strokeWidth: 3.4,
    color: "var(--ev-ink-soft)"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 11,
      paddingLeft: 22
    }
  }, LABELS.map(l => {
    const off = hidden.has(l.name);
    return /*#__PURE__*/React.createElement("div", {
      key: l.name,
      onClick: () => onToggle(l.name),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 14,
        height: 14,
        flex: '0 0 14px',
        borderRadius: 5,
        boxSizing: 'border-box',
        background: off ? 'transparent' : l.color,
        border: `1.5px solid ${l.color}`
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '0.875rem',
        fontWeight: 500,
        color: off ? 'var(--ev-ink-faint)' : l.color,
        flex: 1
      }
    }, l.name));
  })));
}

/** Calendar — week view: floating planning cards beside a scrollable white day-grid card. */
function ScheduleScreen({
  onNavigate
}) {
  const [view, setView] = React.useState('Week');
  const [selected, setSelected] = React.useState(EVENTS.find(e => e.id === 'e5'));
  const [hidden, setHidden] = React.useState(() => new Set());
  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, (NOW_HOUR - START_HOUR) * HOUR_H - 130);
  }, []);
  const toggle = name => setHidden(prev => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name);else next.add(name);
    return next;
  });
  const isVisible = ev => ev.labels.length === 0 || ev.labels.some(n => !hidden.has(n));
  const NOTCH_W = 340,
    NOTCH_H = 88,
    NOTCH_R = 28;
  const blockBase = {
    position: 'absolute',
    background: 'var(--ev-surface)',
    borderRadius: 'var(--ev-r-2xl)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100%',
      background: 'var(--ev-bg-page)',
      fontFamily: 'var(--ev-font-sans)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Sidebar, {
    active: "schedule",
    onNavigate: onNavigate
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      margin: 10,
      display: 'flex',
      gap: 12,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 268,
      flex: '0 0 268px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement(MiniCal, null), /*#__PURE__*/React.createElement(LabelsCard, {
    hidden: hidden,
    onToggle: toggle
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      position: 'relative',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.04)) drop-shadow(0 12px 32px rgba(0,0,0,.05))'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...blockBase,
      top: 0,
      left: 0,
      bottom: 0,
      width: 'calc(100% - ' + NOTCH_W + 'px)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...blockBase,
      top: NOTCH_H + 'px',
      left: 0,
      right: 0,
      bottom: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: NOTCH_H - NOTCH_R + 'px',
      left: 'calc(100% - ' + NOTCH_W + 'px)',
      width: NOTCH_R,
      height: NOTCH_R,
      background: 'radial-gradient(circle ' + NOTCH_R + 'px at top right, transparent ' + (NOTCH_R - 0.5) + 'px, var(--ev-surface) ' + NOTCH_R + 'px)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '28px 30px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 54,
      paddingRight: NOTCH_W,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: '1.625rem',
      fontWeight: 800,
      color: 'var(--ev-ink)',
      letterSpacing: '-0.02em',
      whiteSpace: 'nowrap'
    }
  }, "September 2025"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "New event",
    style: {
      marginLeft: 'auto',
      width: 46,
      height: 46,
      flex: '0 0 46px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--ev-bg)',
      border: 'none',
      borderRadius: 'var(--ev-r-md)',
      cursor: 'pointer',
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "plus",
    size: 22,
    color: "var(--ev-ink)"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      gap: 6
    }
  }, ['Month', 'Week', 'Day'].map(v => {
    const on = v === view;
    return /*#__PURE__*/React.createElement("button", {
      key: v,
      onClick: () => setView(v),
      style: {
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--ev-font-sans)',
        fontSize: '0.875rem',
        fontWeight: 600,
        padding: '7px 16px',
        borderRadius: 'var(--ev-r-md)',
        background: on ? 'var(--ev-primary)' : 'transparent',
        color: on ? 'var(--ev-primary-content)' : 'var(--ev-ink-soft)'
      }
    }, v);
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flex: `0 0 ${HEADER_H}px`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      flex: '0 0 56px'
    }
  }), WEEK.map((d, ci) => {
    const today = ci === TODAY_COL;
    return /*#__PURE__*/React.createElement("div", {
      key: ci,
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '0.75rem',
        color: MUTED,
        fontWeight: 600
      }
    }, d.day), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '1.0625rem',
        fontWeight: 800,
        color: today ? 'var(--ev-ink)' : 'var(--ev-ink-soft)'
      }
    }, d.date));
  })), /*#__PURE__*/React.createElement("div", {
    ref: scrollRef,
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      overflowX: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      position: 'relative',
      height: GRID_H
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      flex: '0 0 56px',
      position: 'relative'
    }
  }, HOURS.map(h => /*#__PURE__*/React.createElement("span", {
    key: h,
    style: {
      position: 'absolute',
      top: (h - START_HOUR) * HOUR_H,
      left: 0,
      width: 46,
      textAlign: 'right',
      transform: h === START_HOUR ? 'none' : 'translateY(-50%)',
      fontSize: '0.6875rem',
      fontWeight: 600,
      color: MUTED
    }
  }, fmtHour(h)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      position: 'relative',
      display: 'flex'
    }
  }, WEEK.map((d, ci) => {
    const today = ci === TODAY_COL;
    return /*#__PURE__*/React.createElement("div", {
      key: ci,
      style: {
        flex: 1,
        position: 'relative',
        background: today ? 'var(--ev-bg-soft)' : 'transparent',
        borderRadius: today ? 'var(--ev-r-xl)' : 0
      }
    }, EVENTS.filter(e => e.col === ci && isVisible(e)).map(ev => {
      const look = eventLook(ev);
      const top = (ev.s - START_HOUR) * HOUR_H;
      const height = (ev.e - ev.s) * HOUR_H;
      const inset = today ? 6 : 3;
      return /*#__PURE__*/React.createElement("div", {
        key: ev.id,
        onClick: () => setSelected(ev),
        style: {
          position: 'absolute',
          top,
          height,
          left: inset,
          right: inset,
          zIndex: 2,
          background: look.bg,
          color: look.ink,
          borderRadius: 'var(--ev-r-md)',
          padding: '6px 9px',
          overflow: 'hidden',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--ev-shadow-xs)',
          boxSizing: 'border-box',
          outline: selected && selected.id === ev.id ? '2px solid var(--ev-ink)' : 'none',
          outlineOffset: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '0.75rem',
          fontWeight: 700,
          lineHeight: 1.2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }
      }, ev.t), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '0.625rem',
          fontWeight: 600,
          opacity: 0.78,
          lineHeight: 1.25
        }
      }, ev.time));
    }));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1,
      pointerEvents: 'none',
      background: `repeating-linear-gradient(to bottom, var(--ev-border) 0, var(--ev-border) 1px, transparent 1px, transparent ${HOUR_H}px)`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: (NOW_HOUR - START_HOUR) * HOUR_H,
      height: 0,
      borderTop: '2px dashed var(--ev-ink)',
      zIndex: 5,
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: (NOW_HOUR - START_HOUR) * HOUR_H,
      height: 0,
      left: `calc(${TODAY_COL} * 100% / 7)`,
      width: 'calc(100% / 7)',
      borderTop: '2px solid var(--ev-ink)',
      zIndex: 6,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: -3,
      top: -5,
      width: 9,
      height: 9,
      borderRadius: '50%',
      background: 'var(--ev-ink)'
    }
  })))))), selected && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 150,
      right: 8,
      width: 300,
      zIndex: 6,
      background: 'var(--ev-white)',
      borderRadius: 'var(--ev-r-lg)',
      boxShadow: 'var(--ev-shadow-raised)',
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '1.0625rem',
      fontWeight: 800,
      color: 'var(--ev-ink)'
    }
  }, selected.t), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "notes",
    variant: "ghost",
    size: "sm"
  }), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "x",
    variant: "ghost",
    size: "sm",
    onClick: () => setSelected(null)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 11,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: '0.875rem',
      color: 'var(--ev-ink)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "schedule",
    size: 16,
    color: "var(--ev-ink)"
  }), " ", WEEK[selected.col].full, " ", WEEK[selected.col].date, ", September"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: '0.875rem',
      color: 'var(--ev-ink)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "clock",
    size: 16,
    color: "var(--ev-ink)"
  }), " ", selected.time), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: '0.875rem',
      color: 'var(--ev-ink)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "location",
    size: 16,
    color: "var(--ev-ink)"
  }), " ", selected.loc)), selected.labels.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 16,
      flexWrap: 'wrap'
    }
  }, selected.labels.map(n => {
    const l = LABEL_MAP[n];
    return /*#__PURE__*/React.createElement("span", {
      key: n,
      style: {
        fontSize: '0.6875rem',
        fontWeight: 700,
        color: l.dark ? '#fff' : 'var(--ev-ink)',
        background: l.color,
        padding: '4px 11px',
        borderRadius: 'var(--ev-r-pill)'
      }
    }, n);
  })), /*#__PURE__*/React.createElement("button", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      width: '100%',
      padding: '11px 16px',
      borderRadius: 'var(--ev-r-md)',
      border: 'none',
      cursor: 'pointer',
      background: 'var(--ev-primary)',
      color: 'var(--ev-primary-content)',
      fontFamily: 'var(--ev-font-sans)',
      fontSize: '0.875rem',
      fontWeight: 700
    }
  }, "Add note")))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      right: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: 'var(--ev-bg-sage)',
      borderRadius: 'var(--ev-r-2xl)',
      padding: '10px 12px 10px 16px'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "search",
    variant: "dark"
  }), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "bell",
    variant: "accent",
    dot: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 54,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      borderRadius: 'var(--ev-r-pill)',
      padding: '0 16px 0 7px',
      background: 'var(--ev-white)',
      boxShadow: 'var(--ev-shadow-xs)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: "Kate Malone",
    src: "avatars/student.svg",
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.9063rem',
      fontWeight: 700,
      color: 'var(--ev-ink)',
      lineHeight: 1.1
    }
  }, "Kate Malone"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.7813rem',
      color: 'var(--ev-ink-faint)'
    }
  }, "Class 9A")), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronDown",
    size: 16,
    color: "var(--ev-ink-faint)",
    style: {
      marginLeft: 2
    }
  })))));
}
Object.assign(__ds_scope, { ScheduleScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/ScheduleScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/WorkspaceOpenScreen.jsx
try { (() => {
const CHAPTERS = [{
  id: 1,
  name: 'Ch. 1 · Cell biology',
  open: true,
  count: 3,
  files: [{
    name: 'Cell structure.pdf',
    active: true
  }, {
    name: 'Organelles.docx'
  }, {
    name: 'Mitosis notes.md'
  }]
}, {
  id: 2,
  name: 'Ch. 2 · Genetics',
  open: true,
  count: 2,
  files: [{
    name: 'DNA replication.pdf'
  }, {
    name: 'Punnett squares.png'
  }]
}, {
  id: 3,
  name: 'Ch. 3 · Ecology',
  open: false,
  count: 6,
  files: []
}];
function MenuItem({
  icon,
  label,
  danger,
  onClick
}) {
  const [hover, setHover] = React.useState(false);
  const color = danger ? 'var(--ev-error-ink)' : 'var(--ev-ink)';
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      width: '100%',
      padding: '8px 10px',
      border: 'none',
      cursor: 'pointer',
      borderRadius: 'var(--ev-r-sm)',
      textAlign: 'left',
      fontFamily: 'var(--ev-font-sans)',
      fontSize: '0.85rem',
      fontWeight: 600,
      color,
      background: hover ? 'var(--ev-bg)' : 'transparent'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 15,
    color: color
  }), " ", label);
}
function SourceFile({
  f
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 10px 8px 24px',
      borderRadius: 'var(--ev-r-sm)',
      cursor: 'pointer',
      background: f.active ? 'var(--ev-bg)' : 'transparent'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "files",
    size: 15,
    color: "var(--ev-primary)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.9219rem',
      color: 'var(--ev-ink)',
      fontWeight: f.active ? 600 : 500,
      flex: 1,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis'
    }
  }, f.name));
}
function ChatPanel({
  accent,
  accentText
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      alignSelf: 'flex-end',
      maxWidth: '82%',
      background: 'var(--ev-primary)',
      color: '#fff',
      borderRadius: '14px 14px 4px 14px',
      padding: '11px 14px',
      fontSize: '0.875rem',
      lineHeight: 1.45
    }
  }, "Explain the difference between mitosis and meiosis."), /*#__PURE__*/React.createElement("div", {
    style: {
      alignSelf: 'flex-start',
      maxWidth: '92%',
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--ev-white)',
      border: '1px solid var(--ev-border)',
      borderRadius: '14px 14px 14px 4px',
      padding: 14,
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: 'var(--ev-ink-soft)'
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--ev-ink)'
    }
  }, "Mitosis"), " produces two genetically identical diploid cells for growth and repair. ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--ev-ink)'
    }
  }, "Meiosis"), " produces four genetically distinct haploid gametes for reproduction, via crossing over and two divisions."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap'
    }
  }, ['Cell structure.pdf', 'Mitosis notes.md'].map(s => /*#__PURE__*/React.createElement("span", {
    key: s,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: '0.7744rem',
      color: 'var(--ev-info-ink)',
      background: 'var(--ev-info-soft)',
      padding: '4px 10px',
      borderRadius: 'var(--ev-r-pill)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "files",
    size: 11
  }), s))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 16px 18px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      border: '1px solid var(--ev-border)',
      borderRadius: 'var(--ev-r-md)',
      padding: '7px 7px 7px 14px',
      background: 'var(--ev-white)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.9587rem',
      color: 'var(--ev-ink-soft)',
      flex: 1
    }
  }, "Ask about your sources\u2026"), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "send",
    variant: "dark",
    size: "sm",
    style: {
      background: accent,
      borderColor: accent,
      color: accentText
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '0.7744rem',
      color: 'var(--ev-ink-faint)',
      marginTop: 8,
      textAlign: 'center'
    }
  }, "Answers grounded in this workspace's sources \xB7 GraphRAG")));
}
function GeneratePanel() {
  const outputs = [['Summary', 'files'], ['Flashcards', 'flashcards'], ['Quiz', 'quiz']];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '0.9587rem',
      fontWeight: 800,
      color: 'var(--ev-ink)',
      letterSpacing: '-0.01em'
    }
  }, "Make stuff happen"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 10
    }
  }, outputs.map(([label, ic]) => /*#__PURE__*/React.createElement("button", {
    key: label,
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      aspectRatio: '1 / 1',
      border: 'none',
      background: 'var(--ev-white)',
      borderRadius: 'var(--ev-r-xl)',
      padding: 12,
      cursor: 'pointer',
      transition: 'box-shadow .18s ease, transform .12s ease'
    },
    onMouseEnter: e => {
      e.currentTarget.style.boxShadow = 'var(--ev-shadow-card)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.transform = 'none';
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: ic,
    size: 22,
    color: "var(--ev-ink)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontFamily: 'Fustat',
      fontWeight: 800,
      color: 'var(--ev-ink)',
      letterSpacing: '-0.01em'
    }
  }, label)))));
}

/** Opened workspace — NotebookLM-style: sources card · open file · AI card (Chat / Generate). */
function WorkspaceOpenScreen({
  onBack,
  initialMode = 'Chat'
}) {
  const [mode, setMode] = React.useState(initialMode);
  const [menuFor, setMenuFor] = React.useState(null);
  // Each workspace has a randomly-assigned accent (matches its icon background on the Workspaces grid).
  // Dark accents (e.g. purple) read white; lighter accents read black.
  const ws = {
    name: 'Biology 101',
    accent: 'var(--ev-green-note)',
    darkAccent: false
  };
  const wsText = ws.darkAccent ? '#ffffff' : 'var(--ev-ink)';
  const wsTextSoft = ws.darkAccent ? 'rgba(255,255,255,0.78)' : 'var(--ev-ink-soft)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100%',
      gap: 10,
      padding: 10,
      boxSizing: 'border-box',
      background: 'var(--ev-bg-sage)',
      fontFamily: 'var(--ev-font-sans)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 278,
      flex: '0 0 278px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: ws.accent,
      borderRadius: 'var(--ev-r-lg)',
      padding: '16px 16px 16px',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onBack,
    style: {
      fontSize: '0.885rem',
      color: wsTextSoft,
      fontWeight: 600,
      marginBottom: 8,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronLeft",
    size: 13,
    color: wsTextSoft
  }), " Workspaces"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '1.45rem',
      fontWeight: 800,
      color: wsText
    }
  }, ws.name)), /*#__PURE__*/React.createElement("button", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      width: '100%',
      marginTop: 14,
      padding: '8px 16px',
      borderRadius: '14px',
      border: '1px solid var(--ev-border)',
      background: 'var(--ev-white)',
      cursor: 'pointer',
      fontFamily: 'var(--ev-font-sans)',
      fontWeight: 700,
      fontSize: '0.875rem',
      color: 'var(--ev-ink)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "plus",
    size: 15,
    color: "var(--ev-ink-soft)"
  }), " Add source")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--ev-bg-soft)',
      borderRadius: 'var(--ev-r-lg)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: '12px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '0.72rem',
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: 'var(--ev-ink-faint)',
      padding: '2px 10px 6px'
    }
  }, "Content"), CHAPTERS.map(ch => /*#__PURE__*/React.createElement("div", {
    key: ch.id
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      padding: '8px 10px',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: ch.open ? 'chevronDown' : 'chevronRight',
    size: 14,
    color: "var(--ev-ink)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '1.02rem',
      fontWeight: 700,
      color: ch.open ? 'var(--ev-ink)' : 'var(--ev-ink-faint)'
    }
  }, ch.name), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      position: 'relative'
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setMenuFor(menuFor === ch.id ? null : ch.id),
    style: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      padding: 4,
      borderRadius: 'var(--ev-r-sm)',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "moreVertical",
    size: 20,
    strokeWidth: 3.4,
    color: "var(--ev-ink)"
  })), menuFor === ch.id && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    onClick: () => setMenuFor(null),
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 9
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: 4,
      minWidth: 138,
      zIndex: 10,
      background: 'var(--ev-white)',
      border: '1px solid var(--ev-border)',
      borderRadius: 'var(--ev-r-md)',
      boxShadow: 'var(--ev-shadow-raised)',
      padding: 5,
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement(MenuItem, {
    icon: "notes",
    label: "Rename",
    onClick: () => setMenuFor(null)
  }), /*#__PURE__*/React.createElement(MenuItem, {
    icon: "trash",
    label: "Delete",
    danger: true,
    onClick: () => setMenuFor(null)
  }))))), ch.open && ch.files.map(f => /*#__PURE__*/React.createElement(SourceFile, {
    key: f.name,
    f: f
  })))), /*#__PURE__*/React.createElement("button", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      width: '100%',
      marginTop: 6,
      padding: '8px 16px',
      borderRadius: '14px',
      border: '1px solid var(--ev-border)',
      background: 'var(--ev-white)',
      cursor: 'pointer',
      fontFamily: 'var(--ev-font-sans)',
      fontWeight: 700,
      fontSize: '0.85rem',
      color: 'var(--ev-ink)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "plus",
    size: 15,
    color: "var(--ev-ink-soft)"
  }), " Add chapter")))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--ev-surface)',
      borderRadius: 'var(--ev-r-lg)',
      boxShadow: 'var(--ev-shadow-card)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '16px 22px 14px',
      borderBottom: '1px solid var(--ev-line)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 'var(--ev-r-xs)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "files",
    size: 16,
    color: "var(--ev-primary)"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '1.0694rem',
      fontWeight: 700,
      color: 'var(--ev-ink)'
    }
  }, "Cell structure.pdf"), /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "neutral"
  }, "Ch. 1"), /*#__PURE__*/React.createElement("button", {
    style: {
      marginLeft: 'auto',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      padding: 4,
      borderRadius: 'var(--ev-r-sm)',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "more",
    size: 20,
    strokeWidth: 3.4,
    color: "var(--ev-ink)"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: '14px 24px 24px',
      maxWidth: 700,
      margin: '0 auto',
      width: '100%',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: '1.9912rem',
      fontWeight: 800,
      color: 'var(--ev-ink)',
      letterSpacing: '-0.02em',
      margin: '0 0 18px'
    }
  }, "Cell structure"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '1rem',
      lineHeight: 1.7,
      color: 'var(--ev-ink-soft)',
      margin: '0 0 18px'
    }
  }, "The cell is the basic structural and functional unit of all living organisms. Every cell is bounded by a plasma membrane that regulates what enters and leaves, maintaining the internal environment distinct from its surroundings."), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 180,
      borderRadius: 'var(--ev-r-lg)',
      background: 'var(--ev-bg)',
      border: '1px solid var(--ev-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--ev-ink-ghost)',
      fontSize: '0.9587rem',
      margin: '6px 0 18px'
    }
  }, "Figure 1.1 \u2014 Eukaryotic cell diagram"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '1rem',
      lineHeight: 1.7,
      color: 'var(--ev-ink-soft)',
      margin: 0
    }
  }, "Eukaryotic cells contain membrane-bound organelles, including the nucleus, which houses genetic material. The cytoplasm suspends these organelles and is the site of many metabolic reactions essential to the cell's survival."))), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 380,
      flex: '0 0 380px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: 'var(--ev-bg-soft)',
      borderRadius: 'var(--ev-r-lg)',
      padding: '10px 12px 10px 16px',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "search",
    variant: "dark"
  }), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "bell",
    variant: "accent",
    dot: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      height: 54,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      borderRadius: 'var(--ev-r-pill)',
      padding: '0 16px 0 7px',
      background: 'var(--ev-white)',
      boxShadow: 'var(--ev-shadow-xs)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: "Kate Malone",
    src: "avatars/student.svg",
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.9063rem',
      fontWeight: 700,
      color: 'var(--ev-ink)',
      lineHeight: 1.1
    }
  }, "Kate Malone"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.7813rem',
      color: 'var(--ev-ink-faint)'
    }
  }, "Class 9A")), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronDown",
    size: 16,
    color: "var(--ev-ink-faint)",
    style: {
      marginLeft: 2
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--ev-bg-soft)',
      borderRadius: 'var(--ev-r-lg)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.SegmentedControl, {
    size: "sm",
    options: ['Chat', 'Generate'],
    value: mode,
    onChange: setMode
  }), /*#__PURE__*/React.createElement("button", {
    style: {
      marginLeft: 'auto',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      padding: 4,
      borderRadius: 'var(--ev-r-sm)',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "moreVertical",
    size: 20,
    strokeWidth: 3.4,
    color: "var(--ev-ink)"
  }))), mode === 'Chat' ? /*#__PURE__*/React.createElement(ChatPanel, {
    accent: ws.accent,
    accentText: wsText
  }) : /*#__PURE__*/React.createElement(GeneratePanel, null))));
}
Object.assign(__ds_scope, { WorkspaceOpenScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/WorkspaceOpenScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/WorkspacesScreen.jsx
try { (() => {
const ITEMS = [{
  id: 'bio',
  name: 'Biology 101',
  type: 'course',
  meta: '6 chapters · 24 files',
  tags: ['Cells', 'Genetics'],
  when: 'last opened 2d ago',
  accent: 'var(--ev-green-note)',
  iconColor: '#222222'
}, {
  id: 'ws1',
  name: 'Workspace 1',
  type: 'workspace',
  meta: '10 files',
  tags: ['Cooking', 'Recipes'],
  when: 'last opened 5h ago',
  accent: 'var(--ev-purple)',
  iconColor: '#ffffff'
}, {
  id: 'calc',
  name: 'Calculus II',
  type: 'course',
  meta: '8 chapters · 31 files',
  tags: ['Limits', 'Integrals'],
  when: 'last opened 1w ago',
  accent: 'var(--ev-info)',
  iconColor: '#222222'
}, {
  id: 'hist',
  name: 'World History',
  type: 'course',
  meta: '5 chapters · 18 files',
  tags: ['Ancient', 'Modern'],
  when: 'last opened 3d ago',
  accent: 'var(--ev-warning)',
  iconColor: '#222222'
}, {
  id: 'read',
  name: 'Reading list',
  type: 'workspace',
  meta: '14 files',
  tags: ['Essays', 'Fiction'],
  when: 'last opened 2w ago',
  accent: 'var(--ev-purple)',
  iconColor: '#ffffff'
}];

/** Search that collapses to an icon button and expands on press. */
function ExpandingSearch() {
  const [open, setOpen] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      width: open ? 280 : 46,
      transition: 'width .22s ease'
    },
    onBlur: e => {
      if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
    }
  }, open ? /*#__PURE__*/React.createElement(__ds_scope.Input, {
    autoFocus: true,
    icon: "search",
    placeholder: "Search workspaces\u2026",
    style: {
      width: '100%',
      padding: '11px 14px',
      borderRadius: 'var(--ev-r-md)'
    },
    inputStyle: {
      fontSize: '0.9375rem'
    }
  }) : /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "search",
    variant: "outline",
    size: "md",
    onClick: () => setOpen(true)
  }));
}

/** Workspaces grid — entry point before opening a course/workspace. */
function WorkspacesScreen({
  onNavigate,
  onOpen
}) {
  const shown = ITEMS;
  // The white surface is built from two overlapping rounded blocks (left column + bottom strip).
  // Their convex top-right corners form a notch with rounded edges that curve outward, leaving
  // room for the floating top bar in the top-right corner.
  const NOTCH_W = 340,
    NOTCH_H = 94,
    NOTCH_R = 28;
  const blockBase = {
    position: 'absolute',
    background: 'var(--ev-surface)',
    borderRadius: 'var(--ev-r-2xl)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100%',
      background: 'var(--ev-bg-page)',
      fontFamily: 'var(--ev-font-sans)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Sidebar, {
    active: "workspaces",
    onNavigate: onNavigate
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      margin: 10,
      display: 'flex',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.04)) drop-shadow(0 12px 32px rgba(0,0,0,.05))'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...blockBase,
      top: 0,
      left: 0,
      bottom: 0,
      width: 'calc(100% - ' + NOTCH_W + 'px)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...blockBase,
      top: NOTCH_H + 'px',
      left: 0,
      right: 0,
      bottom: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: NOTCH_H - NOTCH_R + 'px',
      left: 'calc(100% - ' + NOTCH_W + 'px)',
      width: NOTCH_R,
      height: NOTCH_R,
      background: 'radial-gradient(circle ' + NOTCH_R + 'px at top right, transparent ' + (NOTCH_R - 0.5) + 'px, var(--ev-surface) ' + NOTCH_R + 'px)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '28px 30px',
      gap: 22,
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 54,
      paddingRight: NOTCH_W
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: '1.625rem',
      fontWeight: 800,
      color: 'var(--ev-ink)',
      letterSpacing: '-0.02em'
    }
  }, "Workspaces"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "New workspace",
    style: {
      marginLeft: 'auto',
      width: 46,
      height: 46,
      flex: '0 0 46px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--ev-bg)',
      border: 'none',
      borderRadius: 'var(--ev-r-md)',
      cursor: 'pointer',
      padding: 0,
      transition: 'border-color .15s ease'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "plus",
    size: 22,
    color: "var(--ev-ink)"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      marginRight: 8,
      padding: '4px 0px 0px',
      fontSize: '0.9375rem',
      color: 'var(--ev-ink)',
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, "Recent ", /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronDown",
    size: 15
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16
    }
  }, shown.map(it => /*#__PURE__*/React.createElement(__ds_scope.Card, {
    key: it.id,
    padding: 20,
    radius: "var(--ev-r-xl)",
    interactive: true,
    onClick: () => onOpen && onOpen(it),
    style: {
      background: 'var(--ev-surface)',
      border: '1px solid var(--ev-border)',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 48,
      height: 48,
      borderRadius: 'var(--ev-r-lg)',
      background: it.accent,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: it.type === 'course' ? 'book' : 'workspaces',
    size: 26,
    color: it.iconColor
  })), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "more",
    size: 22,
    color: "var(--ev-ink)",
    style: {
      marginLeft: 'auto'
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '1.125rem',
      fontWeight: 700,
      color: 'var(--ev-ink)'
    }
  }, it.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '0.875rem',
      color: 'var(--ev-ink-soft)',
      marginTop: 4
    }
  }, it.meta), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 10
    }
  }, it.tags.map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      fontSize: '0.875rem',
      fontWeight: 600,
      color: 'var(--ev-ink)'
    }
  }, "#", t)))))), /*#__PURE__*/React.createElement(__ds_scope.Card, {
    padding: 20,
    radius: "var(--ev-r-xl)",
    interactive: true,
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      color: 'var(--ev-ink-faint)',
      minHeight: 150
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "plus",
    size: 22
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.875rem',
      fontWeight: 500
    }
  }, "New workspace")))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 10,
      right: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: 'var(--ev-bg-sage)',
      borderRadius: 'var(--ev-r-2xl)',
      padding: '10px 12px 10px 16px'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "search",
    variant: "dark"
  }), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "bell",
    variant: "accent",
    dot: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 54,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      borderRadius: 'var(--ev-r-pill)',
      padding: '0 16px 0 7px',
      background: 'var(--ev-white)',
      boxShadow: 'var(--ev-shadow-xs)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: "Kate Malone",
    src: "avatars/student.svg",
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.9063rem',
      fontWeight: 700,
      color: 'var(--ev-ink)',
      lineHeight: 1.1
    }
  }, "Kate Malone"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.7813rem',
      color: 'var(--ev-ink-faint)'
    }
  }, "Class 9A")), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevronDown",
    size: 16,
    color: "var(--ev-ink-faint)",
    style: {
      marginLeft: 2
    }
  })))));
}
Object.assign(__ds_scope, { WorkspacesScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/WorkspacesScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.NoteCard = __ds_scope.NoteCard;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.DashboardScreen = __ds_scope.DashboardScreen;

__ds_ns.FlashcardsScreen = __ds_scope.FlashcardsScreen;

__ds_ns.QuizScreen = __ds_scope.QuizScreen;

__ds_ns.ScheduleScreen = __ds_scope.ScheduleScreen;

__ds_ns.Sidebar = __ds_scope.Sidebar;

__ds_ns.WorkspaceOpenScreen = __ds_scope.WorkspaceOpenScreen;

__ds_ns.WorkspacesScreen = __ds_scope.WorkspacesScreen;

})();
