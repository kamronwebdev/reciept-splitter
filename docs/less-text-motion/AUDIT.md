# Text audit: less text, more icons

Source: web screenshots of every screen (`before/`, made with `tools/shoot.mjs`) at 375×667 and 430×932,
light/dark, en/uz/ja, Large text, plus the i18n keys each screen uses.

Categories: **P** helper/description paragraph · **R** repeated explanation · **L** long label ·
**S** subtitle that repeats the title · **I** label that could be an icon · **D** sentence that could be data (chip/number).

Planned action: **remove** (moved to accessibilityLabel/Hint where useful) · **shorten** · **icon** · **chip** · **behind tap** (info button / expandable).

## Public / auth

| Screen | Text now | Kind | Action |
|---|---|---|---|
| Welcome | "Welcome! Let's get started" above the buttons | R | remove (the app name + buttons say it) |
| Welcome | "Already have an account?" above Sign in | R | remove |
| Welcome | feature label "Split Bills" | L | "Split" |
| Sign in | "Welcome back! Please sign in to continue" | P | remove |
| Sign in | "Don't have an account?" + "Create Account" | R | keep the link only: "Create account" |
| Create account | "Join us to start splitting bills with friends" | P | remove |
| Create account | "Already have an account?" + "Log in instead" | R | link only: "Sign in" |
| Forgot password | "Enter your email and we'll send you a 6-digit code to reset your password." | P | shorten: "We'll email you a 6-digit code." |
| Reset code | "We sent a 6-digit code to {{email}}. It expires in 15 minutes." | P | shorten: "Sent to {{email}}" (expiry moves to the error message when it happens) |
| New password | "Pick a strong password you have not used before." | P | remove (the checklist shows the rules) |

## Home

| Text now | Kind | Action |
|---|---|---|
| "Needs your attention" | L | "To do" |
| "You owe Sardorbek" row (sentence) | D | name as title + red amount + "You owe" chip (icon + word) |
| "1 friend request" | D | "Requests" + count badge |
| Recent row subtitle "Oct 9 · 2 people · you: 34 000 so'm" | D/L | "Oct 9" + people icon + "2"; your share stays as the amount when you're a participant |
| Empty state "Scan a receipt, choose who had what, and everyone sees their share." | P | remove; title + "Scan" button stay |
| "Scan receipt" button | – | keep (icon + label, primary) |
| "Enter manually" | – | keep (2 words) |
| "Recent receipts" | L | "Recent" |

## Notifications / Balances / Bills

| Screen | Text now | Kind | Action |
|---|---|---|---|
| Notifications | unread shown by a green dot only | color-only | dot + bold title + "Unread" in the a11y label |
| Notifications | "Read all" | – | keep |
| Balances | person subtitle "owes you 9 465 020 so'm" | D | chip "Owes you" / "You owe" (arrow icon + color + word), amount on the right |
| Balances | footer "Open a receipt to mark shares as paid." | P | remove → accessibilityHint of the rows |
| Balances | "Couldn't load balances." | – | keep (error) |
| Bills list | search "Search receipts or people" | L | "Search" |
| Bills list | "No receipts match your search." | L | "No results" |
| Bill detail | "Paid" / "Not paid" / "Paid the bill" as subtitle words | D | status chip: icon + color + word |
| Bill detail | footer "Turn on "Paid" when someone has paid you back." / "…after you've paid your share." | P | remove → accessibilityHint of the Paid toggle |
| Bill detail | "Oct 9, 2026, 06:30 · 3 people" | D | date + people icon + "3" |
| Nav titles | "Recent bills", "Bill details" | L | "Bills", "Bill" |

## Groups

| Screen | Text now | Kind | Action |
|---|---|---|---|
| Groups | footer "Scan a group's invite QR to join it." | R | remove |
| Groups | row "Join with a QR code" | L | "Join group" (scan icon) |
| Groups | row subtitle "6 members" | D | people icon + "6" (a11y "6 members") |
| Groups | empty "Create a group for people you often split bills with." | P | remove; title + "New group" button |
| Group detail | "6 members" under the name | D | people icon + "6" |
| Group detail | row "Invite with a QR code" | L/I | header QR icon button (owner), a11y "Invite with a QR code" |
| Group detail | footer "Swipe left on a member to remove them." | P | remove → accessibilityHint |
| Group detail | "Owner" text badge | D | chip with crown-like star icon + "Owner" |
| Group detail | per-friend "Add" buttons | I | "+" icon button (44pt), a11y "Add {{name}}" |
| Group detail | "Add from friends" | L | "Add friends" |
| Group detail | "All your friends are already in this group." | L | "No one to add" |
| Group detail | "Save name" | L | "Save" |
| New group | "Give the group a name, then add members." | P | remove |
| Group QR | "Valid for a limited time" + "Expires: …" | R | clock icon + "Expires …" |
| Group QR | "New QR code" | – | "New code" (refresh icon) |

## Friends

| Screen | Text now | Kind | Action |
|---|---|---|---|
| Friends | "Friend requests" row | L | "Requests" |
| Friends | search "Search your friends" | L | "Search" |
| Friends | footer "Swipe left on a friend to remove them." | P | remove → accessibilityHint |
| Friends | empty "No friends yet. Scan a friend's QR code or show them yours." | P | "No friends yet" (the Scan QR / My QR tiles are right above) |
| Friends | "No friends match your search" | L | "No results" |
| Add by ID | "Or add someone in person" | L | "In person" |
| Add by ID | "No one found with this ID" | L | "Not found" |
| My QR | "Friends scan this code to add you" | S | "Scan to add me" |
| My QR | "This code doesn't expire. Reset it if you shared it by mistake." (always on screen) | P | behind the info button (it's also in the reset confirmation) |
| Scan QR (camera) | "Light", "Choose from photos" labelled buttons | I | icon-only (flash / photo) with labels in a11y |
| Scan QR (camera) | "Point the camera at a friend's QR code" | L | "Point at a QR code" |
| Scan QR (permission) | "The camera is only used to scan QR codes. You can also choose a screenshot of a QR code from your photos." | P | "Only used to scan QR codes." |
| Scan QR (permission) | "Allow camera access", "Choose from photos" | L | "Allow camera", "From photos" |
| Scan result | "You're now friends!" + "{{name}} is in your friends list." | R | animated check + "Friends!" + name |
| Scan result | "This is your own QR code. Show it to a friend so they can scan it." | P | remove ("That's you" stays) |
| Scan result | "You are already friends." under "Already friends" | R | remove |
| Scan result | "You already sent a request. Scanning in person adds them right away." | P | "Request sent" |
| Scan result | error bodies ("This QR code is not a friend or group invite. Ask your friend to open Friends → My QR.") | P | one short line each |

## Profile / Settings

| Screen | Text now | Kind | Action |
|---|---|---|---|
| Profile | "My QR code" button | L | "My QR" (QR icon) |
| Profile | "Your activity" header over the numbers | S | remove (numbers + labels speak) |
| Profile | "Change email" / "Change password" next to "EMAIL" / "PASSWORD" | R | "Change" |
| Profile | danger warning paragraph (shown after "Delete account") | P (destructive) | keep one shorter sentence |
| Profile | email form "Enter your current password to confirm." | P | remove (the field is labelled) |
| Settings | theme hint "System follows your phone and updates automatically." | P | remove |
| Settings | "Choose the language used across the app." | P | remove |

## Receipt flow

| Screen | Text now | Kind | Action |
|---|---|---|---|
| Scan (permission) | "The camera is only used to photograph your receipt so the items can be read. You can also pick a photo from the gallery or type the items yourself." | P | "Only used to read your receipt." |
| Scan (permission) | "Choose from gallery", "Enter items manually", "Allow camera access" | L | "Gallery", "Type items", "Allow camera" |
| Scan (camera) | "Fit the whole receipt in the frame, good light" | L | "Fit the whole receipt" |
| Scan (camera) | flash "On/Off" text next to the bolt | I | icon-only (state in a11y) |
| Processing | "Preparing the photo…", "Uploading…", "Reading items…" + spinners | – | keep the words, replace spinners with a progress animation |
| Items | title "Review items" | L | "Items" |
| Items | "Tap to edit" | P | a11y hint only |
| Items | "Fees, tax and discounts" / "Add fee, tax or discount" | L | "Fees & tax" / "Add fee" |
| Items | mismatch "The items add up to X less than the receipt total. Check the items, or use the calculated total." | P | warning icon + "X less than the receipt" + "Use calculated" |
| Items | "Next: choose people" | L | "Next" (arrow icon); full text in a11y |
| Items | "Add at least one item to continue." | L | "Add an item" |
| People | title "Who is splitting?" | L | "People" |
| People | "Search people and groups" | L | "Search" |
| People | "Select at least 2 people to split the bill." | L | "Pick 2+ people" |
| People | "Next: split items (4 people)" | L | "Next" + people icon + count |
| People | empty "Add friends to split the bill with them, or let them scan your QR code." | P | remove (title + 2 buttons stay) |
| People | "1 members" (not pluralized) | bug | people icon + count |
| Split | title "Split items" | L | "Split" |
| Split | "Split everything equally" | L | "Split equally" |
| Split | fee mode explanation sentences always under the toggle | P | behind an info button |
| Split | "Assign every item to finish (2 left)." under "Unassigned: …" | R | remove; "2 left" chip on the Finish row, a11y hint |
| Split | "Some items still need people. They are highlighted below." | P | "Assign highlighted items" |
| Summary | "Every share adds up to the total" / "Shares do not add up to the total" | D | check / warning icon + "Adds up" / "Doesn't add up" |
| Summary | "What they had" / "Hide details" | I | chevron (expand/collapse), words in a11y |

## Icons-only (with accessibilityLabel and 44pt target)

Already icon-only: notifications bell, settings gear, groups "+", search fields, close/clear, swipe delete.
New: group invite QR (header), flash + gallery in both scanners, "Add" friend to group (+), expand/collapse in summary,
fee-mode info, My QR info.

## Unused i18n keys (to delete)

`features.scanDesc/splitDesc/calculateDesc`, `welcome.newUser/newUserDesc/message/existingUser`, `auth.confirmPassword`,
`auth.loginError`, `auth.registerError`, `common.welcome/loading/error/success/confirm/continue`, `friends.add/searchPlaceholder/send/loading/error`,
`friends.qr.requestsCount/addHint`, `home.header.greeting`, `home.scan.cta`, `home.actions.*`, `home.features.title`,
`navigation.mainMenu`, `navigation.tabs.*`, `navigation.scanInvite/friendQr/scanReceipt/participants/itemsSplit/finish`,
`settings.account.*` — plus every key that becomes unused after the changes above.
