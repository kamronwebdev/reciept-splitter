# Less text, more motion

Branch `feature/less-text-motion` (from `fix/ui-polish`). No new features, no flow changes.

- `AUDIT.md`: the text audit, per screen, done before any change.
- `before/`, `after/`: one image per screen. Each image puts five setups side by side: en light 375×667, en light 430×932,
  uz light 375 Large text, uz dark 430 Large text, ja dark 375.
- `motion/`: frame strips recorded in the browser (40–50ms apart):
  - `tab-switch-stagger.jpg`: tab switch.
  - `sheet-open.jpg`: the sheet opening.
  - `summary-success-paid.jpg`: the summary's success check, then marking a share paid.
  - `reduce-motion.jpg`: the same steps with Reduce Motion on.
- `tools/`: scripts to recreate everything:
  - `seed.mjs`: demo data.
  - `shoot.mjs`: all screens.
  - `montage.sh`: builds the side-by-side images.
  - `motion.mjs`: the frame strips; `node motion.mjs reduce` records them with Reduce Motion on.
  - `quick.mjs`: one screen.

## Text: before → after

| Screen | Before | After |
|---|---|---|
| Welcome | "Welcome! Let's get started", "Already have an account?", "Split Bills" | removed, removed, "Split" |
| Sign in | "Welcome back! Please sign in to continue", "Don't have an account?" | removed; only the "Create Account" link stays |
| Create account | "Join us to start splitting bills with friends", "Already have an account?" | removed; only the "Sign In" link stays |
| Forgot / reset | "Enter your email and we'll send you a 6-digit code…", "We sent a 6-digit code to X. It expires in 15 minutes.", "Pick a strong password…" | "We'll email you a 6-digit code.", "Sent to X", removed (the checklist shows the rules) |
| Home | "Needs your attention", "1 friend request", "You owe Sardorbek", "Recent receipts", empty-state paragraph | "To do", "Requests" + badge, name + red **↗ You owe** chip, "Recent", title + Scan button only |
| Receipt rows (Home, Bills) | "Oct 9 · 2 people · you: 34 000 so'm · Settled" | "Oct 9" 👥2 ✓ under the name; your share (person icon) under the total |
| Notifications | unread = green dot | dot + bold text; "Unread" is part of the screen-reader label |
| Balances | "owes you 9 465 020 so'm" subtitle, "Open a receipt to mark shares as paid." footer | **↙ Owes you** / **↗ You owe** chip + amount on the right (counts up); the footer is now the rows' accessibility hint |
| Bill detail | "Paid" / "Not paid" / "Paid the bill" words, two explanation footers, "3 people" | **✓ Paid** / **⌛ Not paid** / **💳 Payer** chips, footers moved into the toggle's accessibility hint, 👥3 |
| Bills | "Recent bills" / "Bill details", "Search receipts or people", "No receipts match your search." | "Bills" / "Bill", "Search", "No results" |
| Groups | "6 members", "Join with a QR code" + footer, empty-state paragraph | 👥6, "Join group" (no footer), title + button |
| Group detail | "6 members", "Invite with a QR code" row, "Owner" text, swipe-hint footer, "Add" buttons, "Add from friends", "All your friends are already in this group.", "Save name" | 👥6, QR icon in the header, **👑 Owner** chip, swipe hint moved into the accessibility hint, "+" icon buttons (labelled "Add {name}"), "Add friends", "No one to add", "Save" |
| New group / Group QR | "Give the group a name, then add members.", "Valid for a limited time · Expires: …", "New QR code" | removed, 🕒 "Expires …", ⟳ "New code" |
| Friends | "Friend requests", "Search your friends", swipe-hint footer, "No friends yet. Scan a friend's QR code or show them yours." | "Requests", "Search", hint moved into the accessibility hint, "No friends yet" |
| Requests / Add by ID | "Requested" text, "Or add someone in person", "No one found with this ID", status words | **⌛ Pending** chip, "In person", "Not found", status chips (You / ✓ Friend / ⌛ Requested / ↙ Incoming) |
| My QR | "Friends scan this code to add you", always-visible "This code doesn't expire…", 3 labelled tiles | "Scan to add me", the note behind an ⓘ button, Share (icon + word) plus icon-only Save and Copy |
| QR scanner | "Point the camera at a friend's QR code", "Choose from photos" pill, 2-sentence permission text | "Point at a QR code", icon-only photo button, "Only used to scan QR codes." |
| Scan result | "You're now friends!" + "{name} is in your friends list.", self/friends/pending sentences, long error bodies | animated ✓ + "Friends!" + the person; status chips; one short line per error |
| Profile / Settings | "Your activity", "Change email" / "Change password", "My QR code", 3-sentence delete warning, theme hint, language description, email-form helper | removed, "Change", "My QR" (QR icon), 1 sentence, removed, removed, removed |
| Receipt scan | 2-sentence permission text, "Choose from gallery", "Enter items manually", "Allow camera access", "Fit the whole receipt in the frame, good light", flash "On / Off" text | "Only used to read your receipt.", "Gallery", "Type items", "Allow camera", "Fit the whole receipt", icon-only flash (state is in the label) |
| Items | "Review items", "Fees, tax and discounts", "Add fee, tax or discount", 2-sentence mismatch, "Next: choose people", "Add at least one item to continue." | "Items", "Fees & tax", "Add fee", "X less than the receipt", 👥 "Next", "Add an item" |
| People | "Who is splitting?", "Search people and groups", "Select at least 2 people to split the bill.", "Next: split items (4 people)", "1 members", empty-state paragraph | "People", "Search", "Pick 2+ people", 👥 "Next · 4", 👥1, removed |
| Split | "Split items", "Split everything equally", fee-mode sentence always shown, "Assign every item to finish (2 left).", "Everything is assigned" | "Split", "Split equally", the sentence behind ⓘ, **⌛ 2 left** chip (+ the Finish button's label), ✓ "All assigned" |
| Summary | "Every share adds up to the total", "What they had" / "Hide details", "Paid" / "Not paid" + switch | ✓ **Adds up** chip, a chevron (the words became the accessibility hint), status chip + check toggle |

i18n: en, uz and ja now have exactly the same keys; the en file went from 756 to 680 lines. Every key that was already
unused, or became unused, is deleted.

## Where each animation is used

All animations live in `splitter-frontend/src/shared/ui/motion/`. They run on the UI thread (Reanimated), take
150–300ms, and use springs with no overshoot. None of them block input.

| Primitive | Used in |
|---|---|
| `PressableScale`: scales to 0.97 on press (0.98 for full-width rows); light haptic on primary actions | every `Button`, every pressable `ListRow`, BalanceCard, Home avatar / bell / group chips, Friends Scan QR / My QR tiles, request accept / decline, "+" add-to-group, My QR save / copy, QR photo button, receipt shutter, People QR links, Summary person cards, notification rows |
| `Appear`: fade + 8pt slide up, 30ms apart, first 8 items only, on mount only (never on refresh) | every `ListSection` row; Home cards; Friends tiles; group header; Group QR; My QR card; receipt items, friends and split cards; Summary cards; processing steps; empty states |
| `listLayout` / `listExiting`: removed rows fade out and the rest slide up; added rows animate in | friends list, group members, add-to-group candidates, groups list, friend requests, notifications (fade out), receipt items and fees, selected-people chips |
| `AnimatedNumber` / `<Money animated>` | Home and Balances totals (count up from 0 the first time), per-person balances, Split running totals, Items calculated total, Summary total (from 0), Profile stats |
| `SuccessCheck`: circle scales in, then the check draws | Summary after Finish (with haptic), friend added (QR), group joined (QR), Paid toggle in bill detail and Summary (only when you tap it, not for shares that were already paid) |
| `Shimmer` | every list skeleton (`ListSkeleton`), Balance card loading, Group QR loading, My QR loading (replaces a spinner) |
| `BottomSheet` spring | all sheets: action sheet (Android / web), item editor, currency, avatar, QR result. Opens with a spring and closes in 180ms; the content stays visible while it closes |
| Tab cross-fade | JS tabs (Android / web) |
| `Pulse` | receipt camera frame and QR scanner frame while waiting; receipt icon while processing |
| `IndeterminateBar` | processing ("reading items"; fills with the real fraction during upload), QR "checking…" / "joining…" |
| `Pop` | count badges when the number changes, selection checkboxes (people, groups, new-group members), processing step checks |

### Reduce Motion

- `useReducedMotion()` / `ReduceMotion.System` everywhere:
  - Pressed elements don't scale.
  - Lists fade in without sliding.
  - Layout changes and numbers jump straight to the end.
  - The check appears with a short fade and isn't drawn.
- No shimmer, pulse, gliding progress bar or badge pop.
- Sheets fade instead of sliding, and tabs switch instantly.
- Checked in the browser (`motion/reduce-motion.jpg`).

## Checks

- `npm run typecheck` (tsc) passes; `npm test` passes (13 suites, 79 tests).
- Every screen and config in `after/` was shot on the web build with no console or page errors, including the run with
  reduced motion.

## Limits and what is not done

- **iPhone not verified.** There is no device or simulator here. Everything was checked on the web build; use the checklist below.
- **Tab cross-fade is Android / web only.** iOS uses the system tab bar (`NativeTabs`), which has no cross-fade option, so
  it keeps the native switch.
- **Navigation is unchanged.** Stack pushes and modals keep their native transitions.
- **Counting numbers re-render on the JS side.** `AnimatedNumber` times the count on the UI thread, but the text itself
  is re-rendered by React, once per frame for ≤300ms and only when the rounded value changes. Animating text natively
  would need a `TextInput` hack, which breaks with custom fonts and Large text.
- **Ambient loops are slower than 300ms.** Shimmer, pulse and the progress bar run 1.1–1.4s cycles. They never move
  layout (opacity / transform only), and with Reduce Motion they are off or still.
- **The check isn't drawn on web.** The stroke animation is native-only; on web the check pops in already drawn.
- **Narrow screens with Large text.** In bill detail at 375pt, names truncate to a few letters and the status chip word
  truncates. The icon and color stay, and the full status is in the accessibility label.
- **Kept on purpose:**
  - the "Hello," greeting on Home;
  - error messages (shortened only where they repeated the title);
  - destructive confirmations;
  - permission explanations, cut to one line.

## Manual test checklist (iPhone)

1. **Home**: cards and rows fade up one after another on first open; pull to refresh does **not** replay it. Balance amounts count up once.
2. Press and hold a button, a list row, a card, the bell: each shrinks slightly, springs back on release, and the action happens right away.
3. **Friends**: swipe a friend → Remove → the row fades out and the rows below slide up. Accept a request in Requests → same.
4. **Groups → a group** (as owner): tap ＋ next to a friend → they move to Members smoothly; the QR icon at the top right opens the invite.
5. **Friends → Scan QR**: the frame breathes; scan a friend's code → Add → a green check draws itself (with a haptic).
6. **Scan receipt**: the shutter presses in; after the photo, the receipt icon breathes and the bar glides while "Reading items…".
7. **Items**: add an item → it fades in; swipe to delete → it fades out and the list closes the gap.
8. **People**: select / unselect → the checkbox pops and the chips at the top animate in and out.
9. **Split**: "Split equally" → the person totals count to their new values, and "2 left" turns into "✓ All assigned".
10. **Finish**: the summary check draws itself with a success haptic, and the total counts up. Tap the circle next to a person → it draws a check and the chip turns **✓ Paid**.
11. Long-press a friend: the native iOS action sheet (unchanged). Edit an item: the sheet slides up without bouncing and slides down in about 0.2s.
12. Badges: get a new notification or request → the badge pops once.
13. **Settings → Accessibility → Motion → Reduce Motion ON**, then repeat 1–10:
    - nothing slides, scales, pulses or shimmers;
    - lists and sheets only fade;
    - numbers jump straight to the final value;
    - the check appears without drawing;
    - every action still works.
14. Repeat in **dark mode**, with each font (Inter, Nunito, Manrope), with Text size **Large**, and in **uz** and **ja**. Check that
    nothing overlaps (chips truncate, amounts never do).
15. VoiceOver: icon-only buttons are announced by name (flash, gallery, save, copy, QR, ＋ Add {name}, ⓘ). Status chips read
    their word. Rows whose explanation was removed read it as their hint.
