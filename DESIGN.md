# Museum Brutalism Design System

**적용 프로젝트**: Investment Advisor  
**버전**: 1.0  
**날짜**: 2026-02-18

---

## 🎨 Color Palette

### Primary Colors
| 이름 | Hex | 용도 |
|------|-----|------|
| **Lime** | `#D4F94E` | Primary CTA, Headings, Highlights |
| **Lime Dark** | `#A8C93E` | Hover states, Shadows |
| **Lime Light** | `#E8FF85` | Accents, Glows |

### Secondary Colors
| 이름 | Hex | 용도 |
|------|-----|------|
| **Pure White** | `#FFFFFF` | Body text, Card backgrounds |
| **Off White** | `#F5F5F5` | Secondary backgrounds |

### Background Colors
| 이름 | Hex | 용도 |
|------|-----|------|
| **Charcoal** | `#2A2A2A` | Main background |
| **Charcoal Light** | `#3A3A3A` | Card backgrounds, Hover states |
| **Charcoal Dark** | `#1A1A1A` | Borders, Deep shadows |

### Accent Colors
| 이름 | Hex | 용도 |
|------|-----|------|
| **Terracotta** | `#C45C3E` | Warnings, Bearish indicators |
| **Terracotta Dark** | `#A0452A` | Shadow variants |
| **Terracotta Light** | `#D97A5C` | Hover states |

---

## 🏗️ Design Principles

### 1. Brutalism Aesthetic
- **No rounded corners** - sharp edges everywhere
- **Thick borders** - 2-3px solid borders
- **Hard shadows** - offset box shadows, no blur
- **High contrast** - Lime vs Charcoal

### 2. Neo-Brutalism Enhancements
- **Interactive shadows** - shadows move on hover
- **3D press effect** - buttons press down when clicked
- **Color accents** - strategic use of terracotta for warnings

### 3. Material Design Layering
- **Elevation through shadow** - deeper = more shadow
- **Surface hierarchy** - clear visual layers
- **Motion feedback** - all interactions have visual response

---

## 📦 Component Styles

### Buttons
```css
/* Primary Button */
.bg-[#D4F94E] text-[#1A1A1A] font-black
border-2 border-[#1A1A1A]
shadow-[4px_4px_0px_0px_#1A1A1A]
hover:shadow-[6px_6px_0px_0px_#1A1A1A]
hover:translate-x-[-2px] hover:translate-y-[-2px]
active:translate-x-[2px] active:translate-y-[2px]
active:shadow-[2px_2px_0px_0px_#1A1A1A]
transition-all
```

### Cards
```css
/* Standard Card */
.bg-[#3A3A3A]
border-2 border-[#1A1A1A]
shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]
hover:translate-x-[-2px] hover:translate-y-[-2px]
hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)]

/* Highlighted Card */
.bg-[#2A2A2A]
border-2 border-[#D4F94E]
shadow-[6px_6px_0px_0px_#A8C93E]
```

### Inputs
```css
.bg-[#2A2A2A]
border-2 border-[#3A3A3A]
shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]
focus:border-[#D4F94E]
focus:shadow-[0_0_0_3px_rgba(212,249,78,0.2)]
```

### Typography
```css
/* Main Heading */
.font-black text-[#D4F94E]
drop-shadow-[2px_2px_0px_#1A1A1A]
letter-spacing: -0.02em
```

---

## 🎯 Score/Verdict Colors

| 판정 | 배경 | 텍스트 | 테두리 | 그림자 |
|------|------|--------|--------|--------|
| 강력 매수 | `#D4F94E` | `#1A1A1A` | `#1A1A1A` | `#A8C93E` |
| 매수 긍정 | `#E8FF85` | `#1A1A1A` | `#1A1A1A` | `#A8C93E` |
| 중립 | `#FFFFFF` | `#1A1A1A` | `#1A1A1A` | `#3A3A3A` |
| 매수 주의 | `#FED7AA` | `#1A1A1A` | `#1A1A1A` | `#C45C3E` |
| 과열 경고 | `#C45C3E` | `#FFFFFF` | `#1A1A1A` | `#A0452A` |

---

## 📁 Modified Files

1. `src/app/globals.css` - CSS variables, utility classes, animations
2. `src/app/layout.tsx` - Font weights, metadata
3. `src/app/page.tsx` - Component styling, colors, borders, shadows

---

## 🔧 Utility Classes

### Brutal Shadow
- `.brutal-shadow` - 6px offset shadow
- `.brutal-shadow-sm` - 4px offset shadow
- `.brutal-shadow-lg` - 8px offset shadow
- `.brutal-shadow-lime` - Lime colored shadow
- `.brutal-shadow-terracotta` - Terracotta colored shadow

### Brutal Border
- `.brutal-border` - 3px charcoal border
- `.brutal-border-lime` - 3px lime border
- `.brutal-border-terracotta` - 3px terracotta border

### Hover Effects
- `.brutal-hover` - Lift and expand shadow on hover

### Score Bars
- `.score-bar-high` - Lime gradient
- `.score-bar-medium` - Orange gradient
- `.score-bar-low` - Terracotta gradient

---

## 📱 Responsive Considerations

- Mobile: Reduce shadow offset (4px → 2px)
- Touch targets: Minimum 44px
- Font sizes: Scale down appropriately
- Spacing: Maintain visual hierarchy

---

## ♿ Accessibility

- **Contrast ratio**: All text meets WCAG AA (4.5:1)
- **Focus indicators**: Lime outline on all interactive elements
- **Reduced motion**: Respect prefers-reduced-motion
- **Screen readers**: Proper semantic HTML maintained

---

## 🚀 Future Enhancements

- [ ] Dark/Light mode toggle (currently dark only)
- [ ] Animation presets library
- [ ] Component documentation with Storybook
- [ ] Design tokens for Figma sync
