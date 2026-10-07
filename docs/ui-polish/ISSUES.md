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
