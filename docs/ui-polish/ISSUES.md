# UI polish — issues found (before) and what was done

Screenshots: `before/<screen>.jpg` and `after/<screen>.jpg`, each showing 5 configurations side by side:
`en-light-375` · `en-light-430` · `ja-dark-375` · `uz-dark-430-L` · `uz-light-375-L`
(375×667 = iPhone SE, 430×932 = iPhone Pro Max, `-L` = Large text). Test data: a 30-character name, a long
group name, 12 friends, a 12 345 678 so'm item with a very long name, many notifications.

## Found in the "before" pass

### Everywhere (shared components)
1. **Text size tokens ignored with a custom font** — `fontSize="$N"` stayed unresolved when the font is
   Inter/Nunito/Manrope at the default text size, so titles rendered tiny in English/Uzbek (login, register,
   welcome, …) while Japanese (system font) and Large text looked right.
2. **Names wrap in lists** — friend, group, member, receipt and notification titles wrapped to 2 lines
   (rows grew unevenly); long names also pushed amounts.
3. **Amounts are not fixed-width** — money used proportional digits and could wrap or be squeezed next to a long
   name (balance card, receipt detail, history).
4. **Dates in Uzbek** — `toLocaleDateString('uz')` printed "M10 7" in history, balances and receipt detail.
5. **Buttons** — heights 36/44/50 with ad-hoc paddings; small buttons were 36pt; labels could be cut.
6. **Inputs** — height came from a size token (~44), adornments (eye / clear) not on one axis with the text.
7. **Icons** — mixed direct Lucide imports with different stroke widths/sizes, filled colored tiles behind every
   settings/list icon and a filled circle behind empty-state icons; emoji used as icons (📷 ➕ 💰, ✓).
8. **Spacing** — section gaps 16/20/24 depending on the screen; form screens used a 20pt side margin.

### Screen by screen
- **Welcome** (375×667): the feature row overlaps the "Welcome! Let's get started" heading; emoji icons in
  filled tiles; screen not scrollable.
- **Login / Register / Forgot**: titles tiny (issue 1); 20pt margins.
- **Home**: balance card amounts overflow the card in Uzbek + Large text at 375 ("170 000 so'm" clipped);
  dates "M10 7"; recent receipt subtitle wraps.
- **Balances**: receipt names wrap to 2 lines next to amounts; Uzbek dates.
- **Receipt detail**: name and amount in one string ("Gulnora Abdurahmonova · 4 732 510 so'm") wraps and the
  amount gets cut; the "Paid" switch label wraps under the switch in Uzbek.
- **Notifications**: the "Read all" header action in Uzbek ("Hammasini o'qish") is clipped at the right edge.
- **History**: Uzbek dates; rows of unequal height.
- **Groups / Group detail / Friends / Requests**: long names wrap; group avatar initials include digits ("T2").
- **Review items**: the long item name is centered instead of left-aligned; "3 × 4 115 226 so'm" wraps in
  Japanese/Uzbek.
- **People step**: the selected-group check mark is a "✓" text glyph.
- **Settings / Profile**: colored icon tiles; long email wraps under the name.

> Note on `before/`: the Japanese column (`ja-dark-375`) of the logged-in screens shows the Welcome screen because
> that run hit the backend's login rate limit (a test artifact, not an app bug). The `after/` set has all five.

## Fixed (after)

### Shared components and tokens
- **Spacing**: Tamagui space tokens remapped to the 4/8/12/16/24/32 grid (`tamagui.config.ts`); the v3 preset was
  2/7/13/18/24/32, so every `$2/$3/$4` gap and padding in the app was off-grid. `src/shared/theme/spacing.ts` holds
  `SPACE`, `SCREEN_MARGIN` (16), `SECTION_GAP` (24), `CONTROL_HEIGHT` (50/44/34, input 50), `RADIUS`.
  `Screen`, `ScreenFormContainer` and `ScreenContainer` use them (form screens: 20 → 16pt margins).
- **Text sizes**: `$N` size tokens are always resolved to pixels with the app fonts (issue 1).
- **Button**: fixed heights 50/44/34, one corner radius, centered icon + label, label never cut (optional 2-line
  secondary).
- **Input**: 50pt field, 16pt padding, label 8pt above, helper/error 8pt below, eye/clear centered in a 44pt slot.
- **ListRow / ListSection**: everything on one vertical axis; titles/subtitles one line with ellipsis
  (`minWidth: 0`, the text column is the only part that shrinks); trailing content never shrinks; separators start
  at the text.
- **Money**: tabular digits, right-aligned, never wraps/truncates; used in Home, balance card, balances, history,
  receipt detail and review items.
- **HeaderButton**: one header action (text or icon), 44pt target, same edge inset on every platform (Cancel,
  Read all, New group +, Settings).
- **Icons**: one `<AppIcon name>` registry (SF Symbols on iOS, Lucide elsewhere), outline, secondary gray by default,
  brand green only for primary meaning, red only for destructive. Sizes: 16–20 rows/inputs, 22 header, 28 empty
  states. No colored tiles behind row icons, no filled circles behind empty-state icons, no emoji icons.
- **Section**: no empty card when a section is only a header.
- **CheckToggle**: compact 44pt on/off (announced as a switch) for dense rows.
- **Dates**: `shortDate` / `dateTime` print Uzbek dates as "7-okt" / "7-okt 2026, 19:39".

### Screens
- **Welcome**: scrollable, no overlap at 375×667; outline feature icons; full-width actions above the safe area;
  compact language pill; Title 1 app name (Japanese fits on one line).
- **Login / Register / Forgot**: proper title sizes; 16pt margins; 50pt fields and buttons.
- **Home**: balance card as two lines (label shrinks, amount fixed) — no overflow with Large text; one-line rows;
  "You owe …" amount right-aligned and never cut.
- **Balances / History**: one-line names next to fixed amounts; Uzbek dates.
- **Receipt detail**: name / status + items / amount / check toggle on one axis; amount never cut.
- **Notifications**: "Read all" fits in Uzbek ("O'qildi"); text left-aligned.
- **Friends / Requests / Search / Groups / Group detail / New group**: one-line names; initials skip numbers ("TB").
- **Review items**: names left-aligned, max 2 lines; price line one line; tabular amounts.
- **People step**: check mark is an icon, not a "✓" glyph.
- **Profile**: email on one line (middle ellipsis); empty danger-zone card removed.
- **Accessibility**: every icon-only button has a label and a 44pt target; steppers say "Decrease / Increase, <name>".

## Not fixed / limits
- **iOS-only behaviour was not seen**: native tab bar, SF Symbols rendering, large titles collapsing, keyboard and
  home-indicator insets on a real iPhone. All screenshots are react-native-web in Chromium at iPhone sizes.
- **Receipt detail at 375pt with Large text and 7-digit amounts**: the name gets very short ("No…"). The amount and
  toggle are kept whole by design; a stacked layout would change the screen too much for a polish pass.
- **Horizontal chip rows** (selected people on the People step, the totals bar on Split) scroll sideways by
  design, so the last chip is cut at the edge.
- **Native header titles on web** are smaller than iOS large titles (large titles are iOS-only).

## Re-running
`tools/seed.mjs` creates the long-value test data, `tools/shoot.mjs <outDir>` takes the screenshots
(web build served on :8096, API on :3992), `tools/montage.sh <dir> <out>` builds the side-by-side images.
The paths inside are from the sandbox (Playwright from `/opt/node-tools`); adjust them for your machine.
