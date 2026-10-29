# Requirements Document

## 1. Application Overview

**Application Name:** Flush

**Tagline:** Study smart. Play hard.

**Description:** Flush is a fully gamified flashcard web application where users create and study flashcards through traditional study sessions, typed answer tests, and three mini-games. Users can publish decks to a public marketplace (Athenaeum), rate and moderate content, compete in 1v1 Arena matches, climb Tier rankings and Arena League leaderboards, and receive in-app notifications. Each user has a private database with personal progress tracking. The application features a gem-based economy, daily goals, streak system, badges, clans, purchasable themes, Skills, Charms, and a public deck marketplace with moderation capabilities.

**Core Philosophy:** Every correct answer, completed goal, or high score earns something visible and fun.

**Platform:** Web application (desktop, tablet, mobile responsive, minimum width 320px)

**Language Support:** English UI only (language toggle temporarily removed, code preserved)

**Theme:** Dark mode default with light mode toggle option

## 2. Users and Usage Scenarios

**Target Users:**
- Students preparing for exams
- Language learners building vocabulary
- Professionals memorizing work-related information
- Content creators sharing educational decks
- Competitive learners seeking 1v1 Arena matches
- Anyone seeking gamified learning experience

**Core Usage Scenarios:**
- Create custom flashcard decks for various subjects
- Publish decks to Athenaeum marketplace and earn gems
- Purchase and study decks from other users
- Rate and report deck content
- Moderate published decks as owner or invited mod
- Study flashcards through traditional flip-card sessions
- Test knowledge through typed answer quizzes
- Play arcade games to reinforce learning
- Compete in 1v1 Arena matches using own decks
- Track progress through streaks, badges, clans, Tiers, Arena Leagues, and statistics
- Compete on clan weekly leaderboards and Arena League rankings
- Earn and spend gems in the in-app economy
- Purchase and equip Skills and Charms for Arena and personal study
- Receive in-app notifications for mod invites, admin messages, deck updates, and rewards
- Customize learning experience with themes and avatar frames
- Join clans and earn rewards through consistent learning

**User Modes:**
- Registered users: Full access with persistent data storage
- Guest users: Limited to 5 starter decks, in-memory state only, can browse Athenaeum but cannot purchase/upload/rate/report/accept mod invites

### 2.1 Guest Banner Text Per Page

**Base:** \"👋 You are previewing as a Guest. Sign up or log in to kickstart your progress!\"

**Athenaeum:** \"👋 You are previewing as a Guest. Sign up or log in to be part of the Athenaeum!\"

**My Decks:** \"👋 You are previewing as a Guest. Sign up or log in to unlock your full card-tential!\"

**Trade:** \"👋 You are previewing as a Guest. Sign up or log in to Glow alongside your gems!\"

**Board:** \"👋 You are previewing as a Guest. Sign up or log in to customise your avatars, badges, and so much more!\"

**Arena:** \"👋 You are previewing as a Guest. Sign up or log in to compete in the Arena!\"

### 2.2 Guest Lock Interaction Rules

**General Behavior:**
- Only top banners redirect to login page
- All other locked feature clicks do NOT navigate anywhere
- GuestLock wrapper component: darkens content, shows tooltip/popover on hover (desktop) or tap (mobile) with message \"Sign Up or Log In to [action]\"
- Tooltip/popover must stay fully visible on small/mobile screens (no clipping)
- Click on locked element does nothing

**Base:**
- Daily Goals: already darkened with hover tooltip, remove click-to-signup navigation

**Athenaeum:**
- Lock \"Contribute to Athenaeum\" button with GuestLock
- Lock all deck cards with GuestLock (guests can search/filter but cannot open deck detail pages)

**My Decks:**
- Lock \"Smart Generate\" button with GuestLock
- Lock \"Create Deck\" button with GuestLock

**Athenaeum > Clans:**
- Lock Fire Clan with GuestLock (tooltip: \"Sign Up or Log In to join the Fire Clan\")
- Lock Ace Clan with GuestLock (tooltip: \"Sign Up or Log In to climb the Ace Leaderboard\")
- Lock Robin Clan with GuestLock (tooltip: \"Sign Up or Log In to climb the Robin Leaderboard\")

**Trade:**
- Lock every item with GuestLock:
  + Power-ups: \"Sign Up or Log In to equip [name]\"
  + Skills: \"Sign Up or Log In to equip [name]\"
  + Charms: \"Sign Up or Log In to equip [name]\"
  + Lifetime Themes: \"Sign Up or Log In to apply [name]\"

**Board:**
- Lock Statistics section with GuestLock (tooltip: \"Sign Up or Log In to see your Statistics\")
- Lock Personal Bests section with GuestLock (tooltip: \"Sign Up or Log In to admire your Personal Bests\")
- Lock Badges section with GuestLock (tooltip: \"Sign Up or Log In to prize your Badges\"), also blur all badges
- Profile picture circle: no darkening, but hover/tap shows tooltip \"Sign Up or Log In to explore your avatar\"

**Arena:**
- Lock entire Arena feature with GuestLock

### 2.3 Guest Deck UI and Data Fixes

**Base Deck Cards:**
- Remove Edit button
- Replace with Eye icon button → navigate to ViewDeck
- Clicking empty card area also opens ViewDeck
- Lock account-exclusive features inside ViewDeck with GuestLock

**My Decks Deck Cards:**
- Match exact same style and functionality as Base deck cards (same component)

**Guest Card Data:**
- STARTER_GUEST_DECKS must include full flashcard arrays
- ViewDeck, Study, Test, and Arcade all read from the same data source
- Fix bug: View shows \"No cards\" but Study/Test/Arcade work — unify data path

**History Section:**
- Hide History section entirely for Guest users in Study/Test/Arcade pages
- Keep History section visible for authenticated users

## 3. Page Structure and Functionality

### Page Hierarchy

```
Flush Application
├── Landing Page (Unauthenticated)
│   ├── Sign Up
│   ├── Log In
│   └── Sign in with Google
├── Base (Home)
├── Athenaeum (Public Deck Marketplace)
│   ├── Decks Tab
│   │   ├── Browse Decks
│   │   ├── Search and Filter
│   │   ├── View Deck Details
│   │   └── Purchase Deck
│   ├── Arcades Tab (Empty for now)
│   ├── My Contributions Tab
│   │   ├── Upload Deck
│   │   └── Manage Published Decks
│   │       ├── Edit Deck Details
│   │       ├── Publish New Version
│   │       ├── View Reports
│   │       ├── Invite Mods
│   │       └── Remove Mods
│   ├── Tiers Tab
│   └── Clans Tab
│       ├── Fire Clan
│       ├── Ace Clan (with Weekly Leaderboard)
│       └── Robin Clan (with Weekly Leaderboard)
├── My Decks (Deck Library)
│   ├── Create New Deck
│   ├── Smart Generate Flashcards (Modal)
│   ├── View Deck
│   ├── Check for Updates (Purchased Decks)
│   └── Deck Editor
│       └── Add/Edit/Delete Flashcards
├── Study Session
│   └── Games Button (Access to Arcade)
├── Test Page
├── Arcade Page (Accessible via Study Page)
│   ├── Whackacard
│   ├── Build the Skyscraper
│   └── Matching Magic
├── Arena (1v1 Multiplayer)
│   ├── Deck Selection
│   ├── Skills/Charms Customization
│   ├── Matchmaking
│   ├── Live Match Screen
│   └── Post-Match Summary
├── Trade (Store)
│   ├── Power-ups
│   ├── Skills
│   ├── Charms
│   └── Lifetime Themes
├── Board (Profile)
│   ├── Edit Username
│   ├── Edit Profile Picture
│   ├── Edit Avatar Frame
│   ├── Select Displayed Badges
│   ├── View Statistics
│   ├── Personal Bests
│   ├── Share Scroll (Modal)
│   ├── Export Data
│   ├── Delete Account
│   └── Flail (Notifications)
│       └── Notification Dropdown
└── My Scroll (Customise My Public Board)
```

### 3.1 Landing Page

**Purpose:** Entry point for unauthenticated users

**Functionality:**
- Display application branding
- Hero subtitle: animated flipping card that cycles through words: fun/addictive/unstoppable/impressive/realistic
- Text reads: \"The next gen of gamified flashcards. All to make learning [word].\"
- Word changes with card-flip animation on a rounded rectangle
- Below animated line: \"Study smart. Play hard.\"
- Plain text ticker: \"Cards · World · Clans · Eggs · Glow · Mods · Smart · Boards · Stay Flushed for more!\"
- Sign Up button
- Log In button
- Sign in with Google button
- Guest mode access option with banner: \"Sign up to save your progress\"
- Note on login page: \"Continue with email or Google\"

**Post-Authentication:**
- Redirect to Base after successful login
- Guest users start with 5 pre-created starter decks

### 3.2 Base (Home Page)

**Purpose:** Central hub showing user progress and quick actions

**Functionality:**
- Display welcome message with username
- Show profile picture (circle with gradient background and chosen character)
- Display current streak (emoji + number of days)
- Streak emoji logic:
  + Active streak: 🔥
  + Streak broken (user had streak, missed a day with no Streak Stall equipped): ❄ on first return, then 🥚 on subsequent days
  + Streak count resets to 0 when broken
  + Fire Clan progress bar resets to 0, user returns to Level 1
- Show today's 3 daily goals with checkboxes (auto-completed when conditions met)
- Each daily goal displays a visual progress bar showing current progress toward goal completion
- Display total gems owned prominently
- Quick Resume section: link to last studied deck
- Recommended section: link to deck with lowest mastery cards (if any)
- \"View All\" button in My Decks section leads to /decks
- Navigation bar with links to: Base, Athenaeum, My Decks, Arena, Trade (all visible on mobile bottom nav)
- Bell icon in header with unread dot badge (opens Flail notification dropdown)
- Dark/light mode toggle in collapsed sidebar (vertically stacked, center-aligned)
- Sign Out button only in Board page
- User avatar picture visible in left sidebar (desktop) or top-left corner in header (mobile), clicking navigates to Board page

**Guest User Deck Cards:**
- Remove Edit button
- Replace with Eye icon button → navigate to ViewDeck
- Clicking empty card area also opens ViewDeck

**URL Route:** /base

### 3.3 Athenaeum (Public Deck Marketplace)

**Purpose:** Browse, search, purchase, and upload public decks; view Tier rankings and clan leaderboards

**Functionality:**
- Subtitle: \"Meet the community of ambitious and generous Flushers! Why not join them?\"
- Three main toggle groups:
  1. Decks / Arcades / My Contributions
  2. Tiers / Clans

**Decks Tab:**
- Display all public decks in grid or list view
- Each deck card shows: title, description, version, creator username, mod usernames, price, upload date, last modified date, download count, average rating (1-5 stars)
- Search bar for deck title or creator username
- Filter options: subject, difficulty, price range, rating
- Sort options: newest, most downloaded, highest rated, lowest price
- Clicking deck card opens View Deck Details page
- Guest users can browse/view/search but cannot purchase/upload/rate/report
- Guest users: all deck cards locked with GuestLock
- Published decks have unique URLs using deck title slug (e.g., /athenaeum/decks/my-deck-title)
- Deck titles must be unique case-insensitively

**Arcades Tab:**
- Empty section for now

**My Contributions Tab:**
- \"Contribute to Athenaeum\" button at top (opens upload modal)
- Display user's published decks
- Manage Published Decks functionality

**Upload Deck Modal:**
- Select deck from user's private decks
- Set price (4-500 gems)
- Enter description (max 200 characters, required)
- Subject and difficulty auto-filled from deck properties
- Cannot upload deck with same title as existing public deck (case-insensitive)
- Deck title cannot be changed after publish
- Confirm button to publish deck

**View Deck Details Page:**
- Display deck title, description, version, creator username, mod usernames, price, upload date, last modified date, download count, average rating
- Preview first 3 flashcards (front and back only, no notes)
- \"Purchase\" button (disabled if user is creator or already owns deck)
- Guest users see sign-up modal when clicking Purchase
- After purchase: deck copied as static snapshot to user's library
- Buyer pays full price, platform donation calculated: if price <= 4 gems, no donation; if price > 4 gems, donation = ceil(price * 0.2), seller receives price - donation
- Donation gems disappear from economy
- After purchase and completing one Study/Test/Arcade session: rating modal appears (1-5 stars, one rating per user per deck, cannot change)
- Clicking creator's avatar navigates to their Public Scroll (their customizations)

**Manage Published Decks (Owner/Mod View):**
- \"Reports\" tab visible only to owner and mods
- Edit deck details (description, subject, difficulty, but NOT title)
- Publish new version button (requires 10+ edits since last publish AND 0 unresolved card reports)
- Invite mods by username (sends in-app notification)
- Remove mods button (owner only)
- View card-level reports with moderation queue
- View deck status: public, archived, banned

**Tiers Tab:**
- Display 13 Tier levels from lowest to highest:
  1. Pin (0 EXP)
  2. Clip (500 EXP)
  3. Eraser (1,500 EXP)
  4. Sharpener (4,000 EXP)
  5. Scissors (10,000 EXP)
  6. Ruler (25,000 EXP)
  7. Protractor (60,000 EXP)
  8. Compass (150,000 EXP)
  9. Highlighter (400,000 EXP)
  10. Notebook (1,000,000 EXP)
  11. Stapler (2,500,000 EXP)
  12. Calculator (5,000,000 EXP)
  13. Laminator (13,000,000 EXP)
- Each Tier shows: name, EXP threshold, unlocked perks
- Display user's current Tier based on their total EXP
- User's current Tier highlighted

**Tier Perks:**
- Clip: unlock avatar frame section + 4 avatar frame colors in Edit Avatar
- Eraser: unlock invisible avatar option (empty space, no background/frame/character)
- Sharpener: unlock 5 profile badge display (instead of 3)
- Scissors: unlock setting to apply a different theme during Study/Test/Arcade vs. everywhere else (2-layer theme)
- Ruler: 5–50 gems Geode
- Protractor: 10–100 gems Geode
- Compass: 7× 7–70 gems Geode
- Highlighter: Shiny (animated sheen) avatar frame
- Notebook: 3-layer theme setting (Study/Test/Arcade + Edit/View Deck + everywhere else)
- Stapler: unlock 10 profile badges (instead of 5)
- Calculator: 12% discount on all gem purchases in Trade
- Laminator: Shiny entire avatar

**Clans Tab:**
- Rewards section at top: displays pending rewards if any
- Each pending reward shows Geode count and \"Break\" button
- Clicking \"Break\" opens rock-smash animation in center of page
- Animation: user taps/clicks to smash rock, rock splits into two halves, gems burst out, message floats up from middle and fades: \"You earned X gems!\"
- Animation closes after 4 seconds or next click
- If multiple Geodes for one reward: after breaking first, show \"Another\" button
- User can close window; remaining Geodes stay in pending rewards with \"X Left\" label
- Pending rewards never expire
- Three clans listed (top to bottom): Fire Clan, Ace Clan, Robin Clan
- Each clan card shows: clan name, unlock status, progress bar to next level, current level
- Ace Clan and Robin Clan display weekly leaderboards
- Guest users: Fire Clan, Ace Clan, Robin Clan locked with GuestLock

**URL Routes:**
- /athenaeum/decks
- /athenaeum/arcades
- /athenaeum/contributions
- /athenaeum/tiers
- /athenaeum/clans
- /athenaeum/decks/[deck-title-slug] (for published decks)

### 3.4 My Decks (Deck Library Page)

**Purpose:** Manage all user's flashcard decks

**Functionality:**
- Display all user's decks in grid or list view
- Each deck card shows: title, subject badge (Tech badge displays cyan color consistently), difficulty badge, card count
- Purchased decks show \"Check for Updates\" button in deck options
- Clicking empty space of deck card opens View Deck page
- Action buttons per deck: Flashcards, Test, Arcade, Edit Deck, Delete Deck
- \"Create New Deck\" button at top
- \"Smart Generate Flashcards\" button (opens modal)
- Soft limit warning at 400 flashcards total, hard limit at 1000 (enforced by UI)
- Guest users: \"Smart Generate\" and \"Create Deck\" buttons locked with GuestLock
- Guest users: deck cards match Base style (Eye icon button, no Edit button)

**Starter Decks (5 pre-loaded for new users):**
1. Math: Algebra Basics (Beginner) – 10 cards
2. Science: Periodic Table (Beginner) – 10 cards
3. English: Vocabulary (Beginner) – 10 cards
4. Languages: Spanish Greetings (Beginner) – 8 cards
5. Other: World Capitals (Intermediate) – 10 cards

**URL Route:** /decks

### 3.5 View Deck Page

**Purpose:** View deck contents in read-only mode with optional reordering

**Functionality:**
- Display deck title, subject badge (Tech badge displays cyan color consistently), difficulty badge, card count (read-only)
- Toggle switch labeled \"Lock Cards\" to the left of \"Flashcards\" title (default OFF)
- When toggle OFF: user can drag flashcards to reorder, card numbering updates automatically
- When toggle ON: cards cannot be rearranged
- List all flashcards in deck (numbered)
- Each flashcard row shows: front text, back text, notes text
- Clicking a flashcard opens enlarged read-only modal displaying front, back, and notes text
- No Save, Smart Generate, Add Card, Edit, or Delete buttons
- \"Back to Library\" button
- Guest users: account-exclusive features locked with GuestLock

### 3.6 Deck Editor Page

**Purpose:** Create and modify deck properties and flashcards

**Functionality:**
- Edit deck title (max 50 characters, required)
- Select subject: Math, Science, English, Languages, Tech, Other
- Select difficulty: Beginner, Intermediate, Advanced
- \"Flashcards\" section header with \"Add Flashcard\" button and \"Smart Generate\" button on the same horizontal level to the right
- List all flashcards in deck (sortable/reorderable)
- User can click and drag any flashcard up/down to reorder, card numbering updates automatically after reorder
- Each flashcard row shows: front text, back text, notes text, edit button, delete button
- \"Save Deck\" button
- \"Study This Deck\" shortcut button
- Edit counter tracks changes since last publish (for published decks)

**Flashcard Properties:**
- front_text (max 500 characters, required)
- back_text (max 500 characters, required)
- notes (max 1000 characters, optional)
- mastery_level (1-6: 1=New, 2=Learning, 3=Familiar, 4=Good, 5=Great, 6=Mastered)
- times_reviewed (auto-tracked)
- last_reviewed_at (auto-tracked)

### 3.7 Study Session Page

**Purpose:** Traditional flashcard study with flip interaction

**Functionality:**
- User selects study mode before starting: Front→Back OR Back→Front
- Display one card at a time (front side initially)
- Click card or press spacebar to flip
- After flip, show card back and notes (if present)
- Show two buttons: \"Got it right\" and \"Need review\"
- Progress bar showing X cards remaining
- End of session summary: \"You mastered X cards, Y need more practice\", display total EXP earned
- Options: Restart session or Return to Base
- Smart Generate button available in Study page with same upload options as Deck Editor
- \"Games\" button to access Arcade page
- Guest users: hide History section entirely
- Charms active in background (Want: +1 EXP per minute spent, Tree: +3 EXP per question, Chit: random pop-up message every 10 cards)

**Mastery Progression:**
- \"Got it right\": mastery_level +1 (capped at 6), +1 EXP
- \"Need review\": mastery_level -1 (minimum 1), +1 EXP

**Keyboard Shortcuts:**
- Spacebar: flip card
- Left/Right arrow: previous/next card

### 3.8 Test Page

**Purpose:** Typed answer quiz to test knowledge

**Functionality:**
- Front→Back mode only (notes ignored)
- User selects number of questions: quarter, half, three quarters, or all (rounded down, minimum 1)
- For each question: show prompt, text input field, submit button
- Answer matching: exact string match, case insensitive
- Immediate feedback after each answer (correct/incorrect, show correct answer if wrong)
- Total test timer: 1 minute × number of questions, displayed as MM:SS
- Timer warning: color change at 30 seconds remaining
- If time runs out: test ends automatically, score based on completed questions
- Early termination option: score calculated on completed questions
- Smart Hint button (costs 3 gems, max 5 hints per day)
- End of test display: score (X/Y), high score, percentage, gems earned, total EXP earned
- Options: Retry test or Return to Base
- Guest users: hide History section entirely
- Charms active in background (Want: +1 EXP per minute spent, Tree: +3 EXP per question, Chit: random pop-up message every 10 cards)

**Scoring and Rewards:**
- Below 80%: 0 gems
- 80-89%: 5 gems
- 90-100%: 10 gems
- Gem rewards apply if 80%+ of completed questions correct (for early termination)
- Every completed question (right or wrong): +2 EXP

**Question Selection:**
- Questions weighted by lower mastery levels (lower mastery cards appear more often)

**Keyboard Shortcuts:**
- Enter: submit answer (first press), move to next question (second press)
- Esc: close modal

### 3.9 Arcade Page

**Purpose:** Access three mini-games for gamified learning

**Functionality:**
- Accessible via \"Games\" button on Study Session page (removed from main navigation)
- Display 3 game cards: Whackacard, Build the Skyscraper, Matching Magic
- Each game card shows: deck selector dropdown, current global high score for game type, \"Play\" button
- Display remaining free tokens for today (3 tokens daily, reset at user's local midnight)
- If tokens = 0: show \"Play for 5 gems\" button instead
- After game ends: show score, whether global high score was beaten (ties do NOT count as beating), gems earned (15 if beats high score), total EXP earned (+5 EXP per completed game)
- Guest users: hide History section entirely
- Charms active in background (Want: +1 EXP per minute spent, Tree: +3 EXP per question, Chit: random pop-up message every 10 cards)

#### 3.9.1 Whackacard

**Gameplay:**
- User picks mode before playing: Front→Back OR Back→Front (notes ignored)
- Duration: 60 seconds
- 3×3 holes grid
- Cards spawn at rate of 1 every 2 seconds (max 3 on screen simultaneously)
- Randomly select a question, randomly generate answer options (correct + incorrect from other cards), randomly position correct answer among options
- User clicks correct answer
- +10 points for correct answer, -5 points for wrong answer (score cannot go below 0)
- Global high score saved per game type across all decks (ties don't count)

#### 3.9.2 Build the Skyscraper

**Gameplay:**
- User picks mode before playing: Front→Back OR Back→Front (notes ignored)
- 10 seconds per question
- Game ends after 3 wrong answers
- Score = number of correct answers (represents skyscraper height)
- Visual skyscraper with stacked blocks
- Shake animation on wrong answer
- Global high score saved per game type across all decks (ties don't count)

**Keyboard Shortcuts:**
- Enter: submit answer

#### 3.9.3 Matching Magic

**Gameplay:**
- Grid auto-scales based on deck size (notes ignored):
  - Less than 8 cards: disabled, show message \"Need at least 8 cards in this deck to play Matching Magic. Please add more flashcards!\"
  - 8-17 cards: 4×4 grid (8 randomly selected pairs)
  - 18+ cards: 6×6 grid (18 randomly selected pairs)
- Timer starts on first flip
- User flips two cards to find matching pairs
- Card flip animation, clicks disabled during animation
- Score = (total pairs / time in seconds) × 1000 (minimum 1 second for scoring)
- Global high score saved per game type across all decks (ties don't count)

### 3.10 Arena (1v1 Multiplayer)

**Purpose:** Competitive 1v1 matches using user's own deck

**Functionality:**

**Deck Requirement:**
- Deck must have minimum 30 cards to be used in Arena

**Pre-Match Screen:**
- User selects which deck to use (minimum 30 cards)
- User customizes active Skills (up to 4) and Charms (up to 2) before matchmaking starts
- \"Start Matchmaking\" button

**Matchmaking:**
- System locates an active user (like Chess.com random matching)
- No Tier restrictions
- Matching algorithm: calculates average number of characters in Front + Back across the entire deck; matches users whose deck average character lengths are nearly the same (fair typing time)

**Match Flow:**
- When connected, split screen: user on one side, opponent on other side (opponent's live screen visible)
- Center animation: shows current Tier and Arena League of both users, rotating small→large→still animation, plus their chosen Skills/Charms
- Countdown: 3, 2, 1 before match starts
- Each user has 100 HP health bar
- Questions are in Test (type-answer) format using the user's chosen deck, randomly mixing Front→Back and Back→Front directions
- Every correct answer deals 5 HP base damage to opponent's health bar
- Wrong answers: show \"incorrect\" message but do NOT reveal the correct answer
- Skills: user picks one skill after every correct answer (in addition to standard damage)
- Charms: always active in background (Want: deals 1 HP extra damage per correct answer, Tree: heals 3 HP per correct answer, Chit: opponent's screen receives a random pop-up message every 10 questions of theirs)
- 5-second minimum per question: if answered in under 5 seconds, user must wait for the timer to expire
- Program randomly chooses card and randomly determines direction each question
- Winner = first to knock opponent's HP to 0
- Handle Draw edge case (both reach 0 simultaneously)
- User can see opponent's progress, answers, correct/wrong, skill selection, charm live

**Post-Match Screen:**
- Total match duration
- Questions answered correctly/wrongly for each user
- Winner declaration
- Trophies gained/lost
- Skills/Charms used summary

**Arena Leagues (separate from Tiers):**
- Leagues are based on Trophies (Trophies CAN be lost, unlike EXP/Tiers which are permanent)
- Trophies can be converted to gems
- 13 Leagues: Sting (0–99), Grip (100–249), Void (250–499), Grind (500–899), Blade (900–1399), Surge (1400–1999), Gaze (2000–2749), Vector (2750–3599), Blaze (3600–4599), Canon (4600–5999), Keystone (6000–7499), Apex (7500–9499), Zenith (9500+)

**Guest Users:**
- Lock entire Arena feature with GuestLock

**URL Route:** /arena

### 3.11 Trade (Store) Page

**Purpose:** Purchase items using gems

**Functionality:**
- Display user's current gems at top
- List purchasable items with: name, preview on hover, gem cost, \"Buy\" button
- \"Equip\" button for owned themes
- Theme equipped toast notification uses title case (e.g., \"Ocean Theme Equipped\")
- Guest users: all items locked with GuestLock
  + Power-ups: \"Sign Up or Log In to equip [name]\"
  + Skills: \"Sign Up or Log In to equip [name]\"
  + Charms: \"Sign Up or Log In to equip [name]\"
  + Lifetime Themes: \"Sign Up or Log In to apply [name]\"
- Empty state message: \"No active events right now — be sure to check back soon!\"
- Calculator Tier perk: 12% discount on all gem purchases

**Available Items:**

**Power-ups:**
- Game Tokens: 5 gems each, provides one additional arcade play
- Streak Stall: 15 gems each, must activate manually BEFORE missing a day, protects streak for 7 consecutive missed days, consumed after use, only one active at a time, description: \"Protects your streak for up to 7 missed days. Use it or lose it.\"
- Streak Slap: 25 gems upfront, maintain daily streak for 7 consecutive days → receive 60 gems (35 gem profit), streak breaks → lose 25 gems (no refund), only one active wager at a time, description: \"Bet 25💎 and win 60💎 if streak holds 7 days. Else...\"
- Smart Hint: 3 gems per hint, max 5 per day, used during Test Page

**Skills (can only be used during Arena matches, user can purchase infinite skills but can only equip 4 at once, only one can be chosen per correct answer, add extra damage on top of base damage):**
- Flash: Next correct answer deals +5 damage
- Dirt: Next correct answer deals double damage to opponents. If the next answer is incorrect, deals the double damage to self
- Draft: Sacrifice 15 HP to block the next hit completely
- Review: Heals 25 HP. Can only be used once per match
- Dust: Grey particles rain down on opponent's screen for 3 seconds to distract/buy time
- Borrow: Randomly picks a Skill from your unequipped collection (except another Borrow). Can only be used once per match

**Charms (can be equipped during personal Study/Test/Arcade AND in Arenas, always active in the background, user can equip up to 2 at once):**
- Want: In Arena: deals 1 HP extra damage per correct answer. In Study/Test/Arcade: adds 1 EXP per minute spent
- Tree: In Arena: heals 3 HP per correct answer. In Study/Test/Arcade: adds 3 EXP to each question
- Chit: In Study/Test/Arcade: random pop-up message every 10 cards. In Arena: opponent's screen receives a random pop-up message every 10 questions of theirs

**Lifetime Themes (13 total):**
- Default (free)
- Forest (50 gems)
- Midnight Galaxy (80 gems)
- Sunset (60 gems)
- Mint (40 gems)
- Ninja (70 gems)
- Chocolate (40 gems)
- Cotton Candy (45 gems)
- Cyberpunk (90 gems)
- Sakura (70 gems)
- Ocean (65 gems)
- Royal (100 gems)
- Aurora (100 gems)

**URL Route:** /trade

### 3.12 Board (Profile Page)

**Purpose:** Manage user settings, view statistics, and personal achievements

**Functionality:**

**Editable Information:**
- Username (min 3, max 20 characters, no special characters)
- Profile picture: 12 preset gradient backgrounds + single character (A-Z, 0-9), displayed as 48×48px circle
- Avatar frame (unlocked at Clip Tier): 4 avatar frame colors, Shiny frame (unlocked at Highlighter Tier), Shiny entire avatar (unlocked at Laminator Tier)
- Invisible avatar option (unlocked at Eraser Tier): empty space, no background/frame/character
- Select up to 3 badges to display on profile (default), 5 badges (unlocked at Sharpener Tier), 10 badges (unlocked at Stapler Tier)
- \"Save Badge Selection\" button only appears when user has changed badge selection
- Remove all label/tooltip hover text on background and character choices in Edit Avatar (no names like \"Sakura\", \"Aurora\", \"Tree\", \"Fern\" etc.)

**Statistics Section (read-only, auto-calculated):**
- Total gems earned (lifetime)
- Total cards studied (lifetime)
- Longest streak
- Decks mastered (all cards mastery level ≥ 5)
- Total tests taken
- Average test score
- Total arcade games played
- Total gems spent
- Total gems from card bonuses
- Total Arena matches played
- Arena win rate

**Personal Bests (self-comparison):**
- Best Streak + date
- Best Test Score + deck + date
- Most Cards Studied (Week)
- Arcade High Scores:
  - Whackacard: [score]
  - Skyscraper: [score]
  - Matching: [score]
- Arena Best Win Streak

**Badge Display:**
- Locked badges are BLURRED until earned
- Each locked badge shows a Hint (5 words or fewer, focus on theme or emotion, NOT direct action/numbers/description/titles)
- Hints only visible for logged-in users, not guests
- Guest users: all badges remain blurred forever
- User can select up to 3 badges to display on profile (default), 5 badges (unlocked at Sharpener Tier), 10 badges (unlocked at Stapler Tier)

**Actions:**
- Share Scroll button (opens modal with formatted text preview + \"Copy to Clipboard\" button, user can choose which section to include via checkboxes, unselected sections disappear smoothly, option to download as image file)
- \"Export My Data\" button (downloads JSON file)
- \"Delete My Account\" button (permanently deletes all data)
- Sign Out button
- Dark/light mode toggle
- Theme settings: 2-layer theme (unlocked at Scissors Tier), 3-layer theme (unlocked at Notebook Tier)

**Guest Users:**
- Statistics section locked with GuestLock (tooltip: \"Sign Up or Log In to see your Statistics\")
- Personal Bests section locked with GuestLock (tooltip: \"Sign Up or Log In to admire your Personal Bests\")
- Badges section locked with GuestLock (tooltip: \"Sign Up or Log In to prize your Badges\"), all badges blurred
- Profile picture circle: no darkening, hover/tap shows tooltip \"Sign Up or Log In to explore your avatar\"

**Profile Picture Gradient Presets (12):**
1. Sunset (Orange→Pink)
2. Ocean (Blue→Teal)
3. Forest (Green→Lime)
4. Royal (Purple→Gold)
5. Mint (Mint→White)
6. Cyberpunk (Cyan→Pink)
7. Sakura (Pink→White)
8. Midnight (Navy→Purple)
9. Aurora (Green→Cyan→Purple)
10. Chocolate (Brown→Caramel)
11. Cotton Candy (Pink→Blue)
12. Default (Purple→Blue)

**URL Route:** /board

### 3.13 My Scroll (Customise My Public Board)

**Purpose:** Customize public profile appearance

**Functionality:**
- Edit public profile display settings
- Select which sections to show publicly
- Customize badge display order
- Other users clicking your avatar navigate to your Public Scroll (your customizations)

**URL Route:** /my-scroll

### 3.14 Smart Generate Flashcards Modal

**Purpose:** Generate flashcards using AI based on topic or uploaded content

**Functionality:**
- Input field: Topic (required)
- File upload support: PDF, image, TXT, DOCX
- Number selector: 5-15 cards (default 5)
- Deck selector: Choose existing deck or create new
- Checkbox: \"Generate card notes for you?\" (if checked: AI generates Front, Back, and Notes; if unchecked: AI generates only Front and Back)
- Generate button
- Preview generated cards before saving (Front, Back, and Notes fields are directly editable text boxes in preview modal)
- Confirm button to save cards to deck
- Cancel button
- Daily limit: 200 AI calls total (shared with Smart Hints)
- Error handling: retry once on invalid JSON, then show \"AI unavailable\" message

**AI Generation Rules:**
- Back field: concise and straight-to-the-point
- Notes field (if enabled): longer and explanatory

### 3.15 Flail (In-App Notification System)

**Purpose:** Receive and manage in-app notifications

**Functionality:**
- Bell icon in header with unread dot badge
- Clicking bell opens dropdown labeled \"Your Flail\" (not \"Inbox\")
- Display 5 most recent notifications
- Each notification has \"Done reading\" button to mark as read
- Notification types:
  - Mod Invitations: accept/reject buttons, permanent until acted on
  - Admin Messages: reading archives after 30 days
  - Version update notifications for purchased decks
  - Leaderboard reward notifications
  - Welcome message sent on signup

**Welcome Message (sent on signup):**
- Greeting with username
- Feature intro: gems, clans, athenaeum, easter eggs
- Links to features

**Guest User Behavior:**
- Guest users cannot receive notifications
- Restricted actions (purchase/upload/rate/report/accept mod invites) trigger sign-up modal

### 3.16 Deck Version Control & Sync

**Purpose:** Track deck versions and sync updates for purchased decks

**Functionality:**
- Version field format: v1.0, v1.1, ... v2.0 (increments 0.1, rolls over at .9)
- Publish new version requires: 10+ edits since last publish AND 0 unresolved card reports
- Edit counter resets on publish
- Notification sent to all deck owners/mods on new version publish
- Buyers receive notification and can sync via \"Check for Updates\" button in deck options
- Sync modal shows: added cards, removed cards, edited cards
- User confirms sync
- Old cards retain mastery if matched by front+back text exactly
- New cards start at mastery level 1

### 3.17 Rating & Reporting System

**Purpose:** Rate purchased decks and report inappropriate content

**Functionality:**

**Rating:**
- After purchase and completing one Study/Test/Arcade session: rating modal appears
- User rates 1-5 stars
- One rating per user per deck, cannot change
- Average rating displayed on deck card in Athenaeum

**Card-Level Reporting:**
- 9 categories: Offensive Language, Incorrect Information, Spam, Duplicate, Inappropriate Content, Copyright Violation, Low Quality, Misleading, Other
- Report submitted to moderation queue visible to owner and mods
- Owner/mods can resolve reports
- Auto-archive at 50 unresolved card reports: status changed to archived, removed from Athenaeum, notifies owner/mods, returns to public on new version publish

**Deck-Level Reporting:**
- 6 categories: Offensive Content, Spam, Misleading Description, Copyright Violation, Low Quality, Other
- Warning modal before submit
- Report submitted to admin-only queue
- Auto-ban at 30 deck reports: status changed to banned, permanent removal, notifies owner/mods, appeal goes to admin queue

**Guest User Behavior:**
- Guest users cannot rate or report
- Restricted actions trigger sign-up modal

### 3.18 Mod System

**Purpose:** Invite mods to help manage published decks

**Functionality:**
- Deck owner invites mods by username
- In-app notification sent to invited user (permanent until action)
- Invited user can accept or reject
- Mods can: add/edit/delete cards, modify deck details except title, resolve reports
- Owner can remove mods
- Reports tab in published deck visible to owner/mods only
- Mod usernames displayed on deck card in Athenaeum

**Guest User Behavior:**
- Guest users cannot accept mod invites
- Restricted actions trigger sign-up modal

### 3.19 History and Clear History

**Purpose:** Track and manage user activity history

**Functionality:**
- Study history: tied to specific deck only
- Test history: tied to specific deck only
- Arcade history: shows across ALL decks and game types
- Clear History button permanently deletes history from database (not just UI)
- Clearing history removes visible entries but does NOT remove high scores or long-term tracking data
- Guest users: History section hidden entirely in Study/Test/Arcade pages

### 3.20 Desktop Layout

**Purpose:** Optimize desktop user experience

**Functionality:**
- Sticky footer at the bottom of the screen (not bottom of page)
- Footer fixed on the left side alongside the fixed sidebar
- Only the right-side content area scrolls
- Left sidebar + footer remain always accessible and unchanged
- In navigation sidebar, show gems, streak, EXP, trophies in a single line
- If sufficient empty space exists between Trade nav item and the footer, show a box displaying the user's current Tier and Arena League
- If insufficient space, hide the box

### 3.21 Mobile Layout

**Purpose:** Optimize mobile user experience

**Functionality:**
- User avatar picture visible in top-left corner in header
- Clicking avatar navigates to Board page
- Bottom navigation bar with links to: Base, Athenaeum, My Decks, Arena, Trade
- In the mobile header, show gems, streak, EXP, trophies to the left of the Flail notification bell

## 4. Business Rules and Logic

### 4.1 Authentication and User Management

**Registration:**
- User provides email and password OR signs in with Google
- Default username: \"Learner123\"
- Default profile: gradient background (Default preset) + character \"L\"
- Default gems: 0
- Default streak: 0 days
- Default theme: Dark mode, Default (Free) theme
- Default EXP: 0 (starts in Pin Tier)
- Default Trophies: 0 (starts in Sting Arena League)
- 5 starter decks automatically created
- Welcome message sent to Flail

**Login:**
- User provides email and password OR signs in with Google
- Redirect to Base on success
- Restore last-used theme

**Logout:**
- Revert theme to Default (Free) theme

**Google Sign-In:**
- Sign in with Google button on Login and Sign Up pages
- After auth, redirect to Base
- Auto-create account from Google profile data
- Link existing accounts with same email
- Note on login page: \"Continue with email or Google\"

**Guest Mode:**
- In-memory state only
- 5 starter decks available (clean copies with full flashcard arrays)
- Progress NOT stored
- Banner displayed per page (see section 2.1)
- On signup: guest data NOT merged, user starts fresh
- Can browse Athenaeum but cannot purchase/upload/rate/report/accept mod invites
- Restricted actions trigger sign-up modal
- Locked to Default (Free) theme
- GuestLock wrapper: darkens content, shows tooltip/popover on hover (desktop) or tap (mobile), tooltip/popover must stay fully visible on small/mobile screens (no clipping), click does nothing

### 4.2 Public Deck Marketplace

**Upload Deck:**
- User selects deck from private library
- Set price (4-500 gems)
- Enter description (max 200 characters, required)
- Subject and difficulty auto-filled from deck properties
- Cannot upload deck with same title as existing public deck (case-insensitive)
- Deck title cannot be changed after publish
- Deck published with version v1.0
- Published deck gets unique URL using deck title slug

**Purchase Deck:**
- Buyer pays full price
- Platform donation: if price <= 4 gems, no donation; if price > 4 gems, donation = ceil(price * 0.2)
- Seller receives: price - donation
- Donation gems disappear from economy
- Deck copied as static snapshot to buyer's library
- Users cannot buy own deck
- Download count increments

**Rating:**
- After purchase and completing one Study/Test/Arcade session: rating modal appears
- User rates 1-5 stars
- One rating per user per deck, cannot change
- Average rating displayed on deck card in Athenaeum

**Deck Version Control:**
- Version format: v1.0, v1.1, ... v2.0 (increments 0.1, rolls over at .9)
- Publish new version requires: 10+ edits since last publish AND 0 unresolved card reports
- Edit counter resets on publish
- Notification sent to all deck owners/mods on new version publish
- Buyers receive notification and can sync via \"Check for Updates\" button
- Sync modal shows: added cards, removed cards, edited cards
- User confirms sync
- Old cards retain mastery if matched by front+back text exactly
- New cards start at mastery level 1

**Deck Status:**
- Public: visible in Athenaeum
- Archived: removed from Athenaeum, notifies owner/mods, returns to public on new version publish
- Banned: permanent removal, notifies owner/mods, appeal goes to admin queue

### 4.3 Rating & Reporting System

**Card-Level Reporting:**
- 9 categories: Offensive Language, Incorrect Information, Spam, Duplicate, Inappropriate Content, Copyright Violation, Low Quality, Misleading, Other
- Report submitted to moderation queue visible to owner and mods
- Owner/mods can resolve reports
- Auto-archive at 50 unresolved card reports: status changed to archived, removed from Athenaeum, notifies owner/mods, returns to public on new version publish

**Deck-Level Reporting:**
- 6 categories: Offensive Content, Spam, Misleading Description, Copyright Violation, Low Quality, Other
- Warning modal before submit
- Report submitted to admin-only queue
- Auto-ban at 30 deck reports: status changed to banned, permanent removal, notifies owner/mods, appeal goes to admin queue

### 4.4 Mod System

**Invite Mods:**
- Deck owner invites mods by username
- In-app notification sent to invited user (permanent until action)
- Invited user can accept or reject

**Mod Permissions:**
- Add/edit/delete cards
- Modify deck details except title
- Resolve reports

**Remove Mods:**
- Owner can remove mods

**Reports Tab:**
- Visible to owner and mods only

### 4.5 Streak System

**Streak Maintenance:**
- Streak increments by 1 when user studies on consecutive days
- \"Study\" defined as: completing at least one study session, test, or arcade game
- Daily reset occurs at user's local browser timezone midnight
- Missing a day resets streak to 0 (unless Streak Stall active)
- When user starts or continues a streak, show top-right toast notification congratulating them (e.g., \"7-day streak!\") using same style as goal completion notifications

**Streak Break Logic:**
- When user had streak, missed a day with no Streak Stall equipped, on return:
  + Emoji changes: 🔥 → ❄ (first return) → 🥚 (subsequent days)
  + Streak count resets to 0
  + Fire Clan progress bar resets to 0
  + User returns to Level 1 in Fire Clan

**Streak Stall:**
- Must be activated manually BEFORE missing a day
- Protects streak for 7 consecutive missed days
- Consumed after use
- Only one can be active at a time
- Description: \"Protects your streak for up to 7 missed days. Use it or lose it.\"

**Streak Slap:**
- Pay 25 gems upfront
- Track 7 consecutive days of streak maintenance
- Success: receive 60 gems (35 gem profit)
- Failure: lose 25 gems (no refund)
- Only one active wager at a time
- Description: \"Bet 25💎 and win 60💎 if streak holds 7 days. Else...\"

**Streak Milestones (one-time gem rewards):**
- 3-day streak: 10 gems
- 7-day streak: 50 gems
- 14-day streak: 100 gems
- 30-day streak: 200 gems

### 4.6 Daily Goals System

**Goal Generation:**
- 3 new goals generated at user's local midnight
- Goals auto-complete when conditions met (not manually checkable)
- Each goal displays visual progress bar showing current progress toward completion

**Goal Pool:**
- Study 20 cards (5 gems)
- Study 40 cards (8 gems)
- Study 60 cards (10 gems)
- Complete 1 typed test (5 gems)
- Complete 3 typed tests (10 gems)
- Score 80% on a test (8 gems)
- Score 100% on a test (10 gems)
- Study 3 different decks (8 gems)
- Earn 15 gems (10 gems)
- Play 1 arcade game (5 gems)
- Beat any high score (10 gems)

### 4.7 EXP & Gems System

**EXP Earning:**
- Study: every \"Got it right\" = 1 EXP, every \"Need review\" = 1 EXP
- Test: every completed question (right or wrong) = 2 EXP
- Arcade: every completed game = 5 EXP
- Want charm: +1 EXP per minute in Study/Test/Arcade
- Tree charm: +3 EXP per question in Study/Test/Arcade
- EXP total shown on Session Complete page
- EXP determines Tier (permanent, cannot be lost)

**Gem Earning:**
- Complete a daily goal: 5-10 gems (varies by goal), once per goal per day
- Test scores: ≥80% = 5 gems, ≥90% = 10 gems, 100% = most gems, per test (unlimited)
- Beat global high score in any arcade game: 15 gems, per game type (each time record breaks, ties do NOT count)
- Beat Deck Best in arcade: gems earned
- Maintain 3-day streak: 10 gems (one-time milestone)
- Maintain 7-day streak: 50 gems (one-time milestone)
- Maintain 14-day streak: 100 gems (one-time milestone)
- Maintain 30-day streak: 200 gems (one-time milestone)
- Clan rewards: Geodes from Fire Clan, Ace Clan, Robin Clan (random gem amounts per level)
- Clan weekly leaderboard rewards: 1st golden geode (100-200 gems), 2nd silver geode (70-100 gems), 3rd bronze geode (50-70 gems)
- Sell decks in Athenaeum: price - platform donation
- Arena matches: gems earned based on match outcome
- Convert Trophies to gems

**Spending Gems:**
- Game Token: 5 gems
- Streak Stall: 15 gems
- Streak Slap: 25 gems
- Smart Hint: 3 gems (max 5 per day)
- Skills: gem cost per skill
- Charms: gem cost per charm
- Lifetime Themes: 40-100 gems (Default theme free)
- Purchase decks from Athenaeum: 4-500 gems
- Calculator Tier perk: 12% discount on all gem purchases in Trade

**Platform Donation:**
- If price <= 4 gems: no donation
- If price > 4 gems: donation = ceil(price * 0.2)
- Seller receives: price - donation
- Donation gems disappear from economy

### 4.8 Tier System

**Tier Levels (13 total, lowest to highest):**
1. Pin (0 EXP)
2. Clip (500 EXP)
3. Eraser (1,500 EXP)
4. Sharpener (4,000 EXP)
5. Scissors (10,000 EXP)
6. Ruler (25,000 EXP)
7. Protractor (60,000 EXP)
8. Compass (150,000 EXP)
9. Highlighter (400,000 EXP)
10. Notebook (1,000,000 EXP)
11. Stapler (2,500,000 EXP)
12. Calculator (5,000,000 EXP)
13. Laminator (13,000,000 EXP)

**Tier Progression:**
- User's Tier determined by total EXP
- EXP earned through various activities (studying, testing, arcade games)
- Tier displayed in Athenaeum > Tiers tab
- User's current Tier highlighted
- EXP is permanent and cannot be lost

**Tier Perks:**
- Clip: unlock avatar frame section + 4 avatar frame colors in Edit Avatar
- Eraser: unlock invisible avatar option (empty space, no background/frame/character)
- Sharpener: unlock 5 profile badge display (instead of 3)
- Scissors: unlock setting to apply a different theme during Study/Test/Arcade vs. everywhere else (2-layer theme)
- Ruler: 5–50 gems Geode
- Protractor: 10–100 gems Geode
- Compass: 7× 7–70 gems Geode
- Highlighter: Shiny (animated sheen) avatar frame
- Notebook: 3-layer theme setting (Study/Test/Arcade + Edit/View Deck + everywhere else)
- Stapler: unlock 10 profile badges (instead of 5)
- Calculator: 12% discount on all gem purchases in Trade
- Laminator: Shiny entire avatar

### 4.9 Arena League System

**Arena Leagues (13 total, based on Trophies):**
1. Sting (0–99)
2. Grip (100–249)
3. Void (250–499)
4. Grind (500–899)
5. Blade (900–1399)
6. Surge (1400–1999)
7. Gaze (2000–2749)
8. Vector (2750–3599)
9. Blaze (3600–4599)
10. Canon (4600–5999)
11. Keystone (6000–7499)
12. Apex (7500–9499)
13. Zenith (9500+)

**Arena League Progression:**
- User's Arena League determined by total Trophies
- Trophies earned through Arena matches
- Trophies CAN be lost (unlike EXP/Tiers which are permanent)
- Trophies can be converted to gems
- Arena League displayed in Arena page and Athenaeum > Tiers tab

### 4.10 Badge System

**Badge Triggers (11 total, all one-time):**
- First Deck: Create first deck
- Card Master: Create 50 flashcards total
- Test Ace: Get 100% on any typed test
- 3-Day Streak: Study 3 consecutive days
- 7-Day Streak: Study 7 consecutive days
- 14-Day Streak: Study 14 consecutive days
- 30-Day Streak: Study 30 consecutive days
- Gem Hoarder: Accumulate 200 gems (not spent)
- Game Winner: Beat any global high score in any arcade game
- Perfect Week: Complete all daily goals for 7 consecutive days
- Master of All: Achieve mastery level 6 on 50 cards

**Badge Display:**
- User can select up to 3 badges to display on profile (default), 5 badges (unlocked at Sharpener Tier), 10 badges (unlocked at Stapler Tier)
- Badge unlocked: modal popup with confetti burst animation
- Locked badges are BLURRED until earned
- Each locked badge shows a Hint (5 words or fewer, focus on theme or emotion, NOT direct action/numbers/description/titles)
- Hints only visible for logged-in users, not guests
- Guest users: all badges remain blurred forever

### 4.11 Game Token System

**Free Tokens:**
- 3 free tokens daily
- Reset at user's local midnight

**Paid Tokens:**
- When free tokens = 0, user can play for 5 gems per game
- No daily limit on paid plays

### 4.12 AI Usage Limits

**Daily Limits:**
- 200 total AI calls per day (shared between flashcard generation and hints)
- Smart Hints: max 5 per day
- Reset at user's local midnight

**Smart Flashcard Generation:**
- Prompt format: \"Generate N flashcards about [topic]. Return as JSON array with objects containing 'front', 'back', and optionally 'notes' keys.\"
- Back field: concise and straight-to-the-point
- Notes field (if enabled): longer and explanatory
- Preview cards before saving (Front, Back, and Notes fields are directly editable text boxes)
- Error handling: retry once on invalid JSON, then show \"AI unavailable\" message

**Smart Hints:**
- Available during Test Page
- Generates contextual hint for current flashcard
- Cost: 3 gems each
- Hint button disabled if daily limit reached or insufficient gems

### 4.13 Clans System

**Fire Clan:**
- Unlock requirement: 3-day minimum streak
- Lock condition: streak dies (user kicked out, clan locks again)
- Progress metric: consecutive days with streak maintained
- Reward levels: 3, 7, 14, 28, 42, 56, 70, 84, 98, 112... (adds 14 after 28)
- When streak breaks: Fire Clan progress bar resets to 0, user returns to Level 1

**Ace Clan:**
- Unlock requirement: 3 separate 100% test scores on 3 different decks
- Same deck multiple times does not count
- No time limit
- Permanently unlocked once achieved
- Progress metric: number of unique decks with 100% test score
- Reward levels: 3, 7, 14, 28, 42, 56, 70, 84, 98, 112... (adds 14 after 28)
- Weekly leaderboard: most 100% test scores on unique decks
- Top 7 displayed, if user outside top 7 show top 7 + rows above/below user
- Weekly reset Monday 0:00 local time
- Top 3 weekly rewards: 1st golden geode (100-200 gems), 2nd silver geode (70-100 gems), 3rd bronze geode (50-70 gems)

**Robin Clan:**
- Unlock requirement: 3 total actions (studying cards, taking tests, or playing arcade games) completed before 6 AM local time
- Permanently unlocked once achieved
- Progress metric: number of early morning actions
- Reward levels: 3, 7, 14, 28, 42, 56, 70, 84, 98, 112... (adds 14 after 28)
- Weekly leaderboard: most early-morning actions before 6 AM
- Top 7 displayed, if user outside top 7 show top 7 + rows above/below user
- Weekly reset Monday 0:00 local time
- Top 3 weekly rewards: 1st golden geode (100-200 gems), 2nd silver geode (70-100 gems), 3rd bronze geode (50-70 gems)

**Reward Structure:**
- Level 3: 1 Geode (random 1-10 gems)
- Level 7: 2 Geodes (each 2-11 gems)
- Level 14: 3 Geodes (each 3-12 gems)
- Level 28: 4 Geodes (each 4-13 gems)
- Pattern continues: +1 Geode and +1 to min/max gem range per tier

**Geode Breaking:**
- Pending rewards displayed in Rewards section at top of Clans page
- User clicks \"Break\" button to open rock-smash animation
- User taps/clicks to smash rock
- Rock splits into two halves, gems burst out
- Message floats up from middle and fades: \"You earned X gems!\"
- Animation closes after 4 seconds or next click
- Multiple Geodes: after breaking first, show \"Another\" button
- User can close window; remaining Geodes stay in pending rewards with \"X Left\" label
- Pending rewards never expire

### 4.14 Skills System

**Skills:**
- Can only be used during Arena matches
- User can purchase infinite skills but can only equip 4 at once during Arena matches
- Only one can be chosen per correct answer
- Add extra damage on top of base damage

**Available Skills:**
- Flash: Next correct answer deals +5 damage
- Dirt: Next correct answer deals double damage to opponents. If the next answer is incorrect, deals the double damage to self
- Draft: Sacrifice 15 HP to block the next hit completely
- Review: Heals 25 HP. Can only be used once per match
- Dust: Grey particles rain down on opponent's screen for 3 seconds to distract/buy time
- Borrow: Randomly picks a Skill from your unequipped collection (except another Borrow). Can only be used once per match

### 4.15 Charms System

**Charms:**
- Can be equipped during personal Study/Test/Arcade AND in Arenas
- Always active in the background
- User can equip up to 2 at once

**Available Charms:**
- Want: In Arena: deals 1 HP extra damage per correct answer. In Study/Test/Arcade: adds 1 EXP per minute spent
- Tree: In Arena: heals 3 HP per correct answer. In Study/Test/Arcade: adds 3 EXP to each question
- Chit: In Study/Test/Arcade: random pop-up message every 10 cards. In Arena: opponent's screen receives a random pop-up message every 10 questions of theirs

### 4.16 Theme System

**Theme Application:**
- User purchases theme from Trade (Store)
- User equips theme from Trade (Store) or Board
- Theme applies to entire application UI
- Preference persisted to user profile (localStorage for guests)
- Theme equipped toast notification uses title case (e.g., \"Ocean Theme Equipped\")
- On logout: revert theme to Default (Free) theme
- On re-login: restore last-used theme
- Guest users: locked to Default (Free) theme
- New accounts: start on Default (Free) theme
- 2-layer theme setting (unlocked at Scissors Tier): apply different theme during Study/Test/Arcade vs. everywhere else
- 3-layer theme setting (unlocked at Notebook Tier): Study/Test/Arcade + Edit/View Deck + everywhere else

**Theme Details:**
- Default (free): Dark Slate #1E1E2E / Off-white #F8F9FA, Neon Purple #B026FF accent
- Forest (50 gems): Deep forest green, Gold accent
- Midnight Galaxy (80 gems): Deep space, Electric cyan, star dots effect
- Sunset (60 gems): Dusk purple/peach, Coral pink accent
- Mint (40 gems): Deep mint, Mint green accent
- Ninja (70 gems): Pure black, Blood red accent, red glow effect on buttons
- Chocolate (40 gems): Dark chocolate, Caramel gold accent
- Cotton Candy (45 gems): Deep lavender, pink-to-blue gradient buttons
- Cyberpunk (90 gems): Almost black, dual neon cyan+pink accents, glow effect on hover
- Sakura (70 gems): Deep cherry blossom, cherry blossom pink accent, optional falling petals
- Ocean (65 gems): Deep ocean blue, Coral orange accent, ripple animation on hover
- Royal (100 gems): Deep royal purple, Gold text/accent, gold shimmer effect
- Aurora (100 gems): Arctic night gradient bg, frosted glass cards, flowing aurora button gradient, animated background shift, glassmorphism

### 4.17 Dark/Light Mode

**Functionality:**
- Toggle in collapsed sidebar (vertically stacked, center-aligned)
- Dark mode default
- Preference persisted to user profile (localStorage for guests)

### 4.18 Social Sharing

**Scroll Sharing:**
- Opens modal with formatted text preview (from \"Board\" heading through Badges section)
- User can choose which section to include via checkboxes
- Unselected sections disappear smoothly
- \"Copy to Clipboard\" button
- Option to download as image file
- No image generation

### 4.19 Data Management

**Export Data:**
- Downloads JSON file containing all user data

**Delete Account:**
- Permanently deletes all user data
- Requires confirmation

### 4.20 History Management

**History Tracking:**
- Study history: tied to specific deck only
- Test history: tied to specific deck only
- Arcade history: shows across ALL decks and game types

**Clear History:**
- Permanently deletes history from database (not just UI)
- Clearing history removes visible entries but does NOT remove high scores or long-term tracking data

**Guest Users:**
- History section hidden entirely in Study/Test/Arcade pages

### 4.21 Arcade High Score System

**Global High Scores:**
- High scores are global per game type across ALL decks
- Each arcade game has ONE global high score
- A score from Deck B does not count as a new high score if a higher score exists from Deck A
- Ties do NOT count as beating high score

### 4.22 In-App Notification System (Flail)

**Notification Types:**
- Mod Invitations: accept/reject buttons, permanent until acted on
- Admin Messages: reading archives after 30 days
- Version update notifications for purchased decks
- Leaderboard reward notifications
- Welcome message sent on signup

**Welcome Message:**
- Greeting with username
- Feature intro: gems, clans, athenaeum, easter eggs
- Links to features

**Notification Management:**
- Bell icon in header with unread dot badge
- Clicking bell opens dropdown labeled \"Your Flail\"
- Display 5 most recent notifications
- Each notification has \"Done reading\" button to mark as read

### 4.23 Admin Role

**Admin Permissions:**
- View deck-level reports
- Ban decks
- Ban users
- Send mass notifications
- Admin role exists in database (role = 'admin')
- Detailed admin features in future update

### 4.24 Subject Badge Color Fix

**Tech Badge Color:**
- Tech subject badge displays cyan color consistently across all pages (Base, My Decks, View Deck)
- Fix ensures color consistency throughout application

### 4.25 Avatar Click Navigation Fix

**Avatar Click Behavior:**
- Clicking logged-in user's own avatar navigates to Board page
- Clicking another user's avatar navigates to THEIR Public Scroll (their customizations)

## 5. Exceptions and Edge Cases

| Scenario | Handling |
|----------|----------|
| User attempts to create deck exceeding 1000 flashcard limit | Block creation, show error message |
| User reaches 400 flashcards total | Show warning message |
| User attempts to play Matching Magic with less than 8 cards | Disable game, show message: \"Need at least 8 cards in this deck to play Matching Magic. Please add more flashcards!\" |
| User runs out of time during test | Test ends automatically, score based on completed questions |
| User terminates test early | Score calculated on completed questions, gem rewards apply if 80%+ correct |
| User attempts to use Smart Hint without sufficient gems | Hint button disabled, show insufficient gems message |
| User reaches daily AI limit (200 calls) | Disable AI features, show limit reached message |
| User reaches daily Smart Hint limit (5 hints) | Hint button disabled, show limit reached message |
| User attempts to play arcade game without tokens and insufficient gems | Disable play button, show insufficient tokens/gems message |
| User attempts to purchase item without sufficient gems | Disable buy button, show insufficient gems message |
| User attempts to activate Streak Stall when one already active | Disable purchase, show message: \"You already have an active Streak Stall\" |
| User attempts to start Streak Slap when one already active | Disable purchase, show message: \"You already have an active Streak Slap\" |
| Smart flashcard generation returns invalid JSON | Retry once, if fails again show \"AI unavailable\" message |
| User closes tab/logs out in guest mode | All progress discarded, no recovery |
| Guest user signs up | Guest data NOT merged, user starts fresh with new account |
| User beats own high score with same score (tie) | Does NOT count as beating high score, no gem reward |
| User attempts to edit username with special characters | Block input, show error message |
| User attempts to edit username with less than 3 or more than 20 characters | Block save, show error message |
| User attempts to add flashcard exceeding 500 character limit | Block input at 500 characters |
| User attempts to add deck title exceeding 50 character limit | Block input at 50 characters |
| User deletes deck | Confirm deletion, permanently remove deck and all associated flashcards |
| User deletes account | Confirm deletion, permanently remove all user data |
| User's streak dies while in Fire Clan | User kicked out of Fire Clan, clan locks again until 3-day streak re-established, Fire Clan progress bar resets to 0, user returns to Level 1 |
| User attempts to access locked clan | Show unlock requirements message |
| User closes Geode breaking animation before breaking all Geodes | Remaining Geodes stay in pending rewards with \"X Left\" label |
| User attempts to rearrange flashcards in View Deck with \"Lock Cards\" toggle ON | Cards cannot be dragged, no reordering allowed |
| User clicks deck card action buttons (Flashcards, Test, Arcade, Edit Deck, Delete Deck) | Navigate to corresponding page, do NOT open View Deck |
| User clicks empty space of deck card | Open View Deck page |
| User changes badge selection in Board | \"Save Badge Selection\" button appears |
| User does not change badge selection in Board | \"Save Badge Selection\" button does not appear |
| User clears history | History permanently deleted from database, high scores and long-term tracking data remain |
| User achieves high score in Whackacard with Deck A, then plays with Deck B and gets lower score | Score from Deck B does not count as new high score |
| User attempts to upload deck with same title as existing public deck (case-insensitive) | Block upload, show error message |
| User attempts to change deck title after publish | Block edit, show error message |
| User attempts to purchase own deck | Disable purchase button, show message |
| Guest user attempts to purchase/upload/rate/report/accept mod invite | Show sign-up modal |
| User attempts to publish new version without 10+ edits | Disable publish button, show message |
| User attempts to publish new version with unresolved card reports | Disable publish button, show message |
| Deck reaches 50 unresolved card reports | Auto-archive: status changed to archived, removed from Athenaeum, notifies owner/mods |
| Deck reaches 30 deck reports | Auto-ban: status changed to banned, permanent removal, notifies owner/mods |
| User attempts to rate deck without completing Study/Test/Arcade session | Rating modal does not appear |
| User attempts to change rating after submission | Rating cannot be changed |
| User attempts to sync purchased deck without new version available | \"Check for Updates\" button shows \"Up to date\" |
| User syncs purchased deck with new version | Old cards retain mastery if matched by front+back text exactly, new cards start at mastery level 1 |
| User receives mod invitation while in guest mode | Cannot accept, restricted action triggers sign-up modal |
| User receives notification while offline | Notification stored, displayed when user comes online |
| Admin messages older than 30 days | Automatically archived after reading |
| User attempts to view deck-level reports without admin role | Access denied |
| User attempts to ban deck/user without admin role | Access denied |
| Guest user clicks locked feature (not top banner) | GuestLock shows tooltip/popover (must stay fully visible on small/mobile screens), click does nothing |
| Guest user hovers/taps locked feature | Tooltip/popover appears with message \"Sign Up or Log In to [action]\" (must stay fully visible on small/mobile screens) |
| Guest user clicks top banner | Redirect to login page |
| Guest user clicks Base deck card empty area | Navigate to ViewDeck |
| Guest user clicks Base deck card Eye icon | Navigate to ViewDeck |
| Guest user views ViewDeck | Account-exclusive features locked with GuestLock |
| Guest user data bug: ViewDeck shows \"No cards\" | Fix: STARTER_GUEST_DECKS must include full flashcard arrays, unify data path |
| User logs out | Theme reverts to Default (Free) |
| User re-logs in | Theme restores to last-used theme |
| New account created | Theme starts on Default (Free), EXP starts at 0 (Pin Tier), Trophies start at 0 (Sting Arena League) |
| Tech badge displays wrong color in Base or View Deck | Fix: ensure Tech badge displays cyan color consistently across all pages |
| User clicks avatar picture on desktop | Navigate to Board page |
| User clicks avatar picture on mobile | Navigate to Board page |
| User clicks another user's avatar | Navigate to THEIR Public Scroll (their customizations) |
| User attempts to use deck with less than 30 cards in Arena | Disable deck selection, show message: \"Deck must have minimum 30 cards to be used in Arena\" |
| User attempts to equip more than 4 Skills in Arena | Disable equip button, show message: \"You can only equip 4 Skills at once\" |
| User attempts to equip more than 2 Charms | Disable equip button, show message: \"You can only equip 2 Charms at once\" |
| Arena match ends in Draw (both reach 0 HP simultaneously) | Display Draw message, calculate Trophies accordingly |
| User attempts to use Borrow skill when no unequipped skills available | Skill disabled, show message: \"No unequipped skills available\" |
| User attempts to use Review skill more than once per match | Skill disabled after first use |
| User attempts to use Borrow skill more than once per match | Skill disabled after first use |
| Calculator Tier perk applied | 12% discount on all gem purchases in Trade |
| User unlocks Clip Tier | Avatar frame section + 4 avatar frame colors unlocked in Edit Avatar |
| User unlocks Eraser Tier | Invisible avatar option unlocked |
| User unlocks Sharpener Tier | 5 profile badge display unlocked |
| User unlocks Scissors Tier | 2-layer theme setting unlocked |
| User unlocks Ruler Tier | 5–50 gems Geode awarded |
| User unlocks Protractor Tier | 10–100 gems Geode awarded |
| User unlocks Compass Tier | 7× 7–70 gems Geode awarded |
| User unlocks Highlighter Tier | Shiny avatar frame unlocked |
| User unlocks Notebook Tier | 3-layer theme setting unlocked |
| User unlocks Stapler Tier | 10 profile badges unlocked |
| User unlocks Calculator Tier | 12% discount on all gem purchases in Trade |
| User unlocks Laminator Tier | Shiny entire avatar unlocked |

## 6. Acceptance Criteria

1. User visits Landing Page, sees animated flipping card cycling through words (fun/addictive/unstoppable/impressive/realistic) with text \"The next gen of gamified flashcards. All to make learning [word].\", subtitle \"Study smart. Play hard.\" below, and plain text ticker \"Cards · World · Clans · Eggs · Glow · Mods · Smart · Boards · Stay Flushed for more!\"
2. Guest user browses Base, sees banner \"👋 You are previewing as a Guest. Sign up or log in to kickstart your progress!\", Daily Goals darkened with hover tooltip (no click navigation), deck cards show Eye icon (no Edit button), clicking empty card area opens ViewDeck
3. Guest user browses Athenaeum, sees banner \"👋 You are previewing as a Guest. Sign up or log in to be part of the Athenaeum!\", \"Contribute to Athenaeum\" button and all deck cards locked with GuestLock (hover shows tooltip fully visible on small/mobile screens, click does nothing)
4. Guest user browses My Decks, sees banner \"👋 You are previewing as a Guest. Sign up or log in to unlock your full card-tential!\", \"Smart Generate\" and \"Create Deck\" buttons locked with GuestLock, deck cards match Base style
5. Guest user browses Athenaeum > Clans, Fire Clan, Ace Clan, Robin Clan locked with GuestLock (hover shows tooltips fully visible on small/mobile screens: \"Sign Up or Log In to join the Fire Clan\", \"Sign Up or Log In to climb the Ace Leaderboard\", \"Sign Up or Log In to climb the Robin Leaderboard\")
6. Guest user browses Trade, sees banner \"👋 You are previewing as a Guest. Sign up or log in to Glow alongside your gems!\", all items locked with GuestLock (Power-ups: \"Sign Up or Log In to equip [name]\", Skills: \"Sign Up or Log In to equip [name]\", Charms: \"Sign Up or Log In to equip [name]\", Lifetime Themes: \"Sign Up or Log In to apply [name]\")
7. Guest user browses Board, sees banner \"👋 You are previewing as a Guest. Sign up or log in to customise your avatars, badges, and so much more!\", Statistics, Personal Bests, Badges sections locked with GuestLock (hover shows tooltips fully visible on small/mobile screens), all badges blurred, profile picture circle shows tooltip on hover (no darkening)
8. Guest user browses Arena, sees banner \"👋 You are previewing as a Guest. Sign up or log in to compete in the Arena!\", entire Arena feature locked with GuestLock
9. Guest user opens ViewDeck from Base or My Decks, sees full flashcard data (no \"No cards\" bug), History section hidden in Study/Test/Arcade pages
10. User registers account, logs in, theme starts on Default (Free), EXP starts at 0 (Pin Tier), Trophies start at 0 (Sting Arena League), logs out, theme reverts to Default (Free), re-logs in, theme restores to last-used theme
11. User purchases theme from Trade, equips theme, sees toast notification \"[Theme Name] Theme Equipped\" in title case, theme applies to entire application UI
12. User views Athenaeum > Tiers tab, sees 13 Tier levels with names, EXP thresholds, and unlocked perks, user's current Tier highlighted based on total EXP
13. User views Athenaeum > Clans tab, sees Fire Clan, Ace Clan, Robin Clan with unlock requirements and weekly leaderboards
14. User clicks avatar picture on desktop (left sidebar) or mobile (top-left header), navigates to Board page
15. User clicks another user's avatar, navigates to THEIR Public Scroll (their customizations)
16. User views Tech badge in Base, My Decks, and View Deck, sees consistent cyan color across all pages
17. User views locked badges in Board, sees Hints (5 words or fewer, focus on theme or emotion) for each locked badge (logged-in users only)
18. User purchases Streak Stall from Trade, activates before missing a day, streak protected for 7 consecutive missed days, description: \"Protects your streak for up to 7 missed days. Use it or lose it.\"
19. User purchases Streak Slap from Trade, maintains streak for 7 consecutive days, receives 60 gems (35 gem profit), description: \"Bet 25💎 and win 60💎 if streak holds 7 days. Else...\"
20. User views Trade page, sees empty state message \"No active events right now — be sure to check back soon!\"
21. User views Athenaeum > Decks tab, sees subtitle \"Meet the community of ambitious and generous Flushers! Why not join them?\"
22. User views Athenaeum > Arcades tab, sees empty section (placeholder for future content)
23. User had streak, missed a day with no Streak Stall equipped, on return sees emoji change 🔥 → ❄ (first return) → 🥚 (subsequent days), streak count resets to 0, Fire Clan progress bar resets to 0, user returns to Level 1 in Fire Clan
24. User navigates to /decks (My Decks page), \"View All\" button in Base → My Decks leads to /decks
25. User navigates to /arena (Arena page), sees stadium icon in navigation between Athenaeum and Trade
26. User selects deck with minimum 30 cards in Arena, customizes active Skills (up to 4) and Charms (up to 2), starts matchmaking
27. User completes Arena match, sees post-match screen with total match duration, questions answered correctly/wrongly, winner declaration, Trophies gained/lost, Skills/Charms used summary
28. User views Trade page, sees Skills section (below Power-ups, above Charms) with 6 Skills: Flash, Dirt, Draft, Review, Dust, Borrow
29. User views Trade page, sees Charms section (below Skills, above Your Themes) with 3 Charms: Want, Tree, Chit
30. User completes Study session, sees total EXP earned on Session Complete page
31. User completes Test, sees total EXP earned on Session Complete page
32. User completes Arcade game, sees total EXP earned on Session Complete page
33. User views desktop sidebar, sees gems, streak, EXP, trophies in a single line, if sufficient space shows box displaying current Tier and Arena League
34. User views mobile header, sees gems, streak, EXP, trophies to the left of Flail notification bell
35. User unlocks Clip Tier, sees avatar frame section + 4 avatar frame colors in Edit Avatar
36. User unlocks Eraser Tier, sees invisible avatar option in Edit Avatar
37. User unlocks Sharpener Tier, can select up to 5 profile badges
38. User unlocks Scissors Tier, can apply different theme during Study/Test/Arcade vs. everywhere else (2-layer theme)
39. User unlocks Ruler Tier, receives 5–50 gems Geode
40. User unlocks Protractor Tier, receives 10–100 gems Geode
41. User unlocks Compass Tier, receives 7× 7–70 gems Geode
42. User unlocks Highlighter Tier, sees Shiny avatar frame in Edit Avatar
43. User unlocks Notebook Tier, can apply 3-layer theme setting (Study/Test/Arcade + Edit/View Deck + everywhere else)
44. User unlocks Stapler Tier, can select up to 10 profile badges
45. User unlocks Calculator Tier, sees 12% discount on all gem purchases in Trade
46. User unlocks Laminator Tier, sees Shiny entire avatar in Edit Avatar
47. User views Edit Avatar, sees no label/tooltip hover text on background and character choices (no names like \"Sakura\", \"Aurora\", \"Tree\", \"Fern\" etc.)

## 7. Out of Scope for This Release

- Community decks or deck sharing between users (beyond Athenaeum marketplace)
- Global leaderboards or competitive features (beyond clan weekly leaderboards and Arena League rankings)
- Ability to view other users' profiles (beyond Public Scroll)
- Spaced repetition algorithm (SRS)
- Offline mode or progressive web app (PWA) features
- Audio pronunciation for flashcards
- Image upload for flashcard content
- Collaborative deck editing (beyond mod system)
- Social features (friends, following, messaging)
- Third-party integrations (Anki, Quizlet import)
- Advanced analytics or learning insights
- Customizable daily goal selection
- Multiple language support for flashcard content (language toggle temporarily removed)
- Video or multimedia flashcard content
- Deck templates or pre-made content marketplace (beyond Athenaeum)
- Achievements beyond the 11 defined badges
- Custom badge creation
- Gem gifting or trading
- Subscription or premium features
- Mobile native apps (iOS/Android)
- Browser extension
- API for third-party developers
- Detailed admin features (view deck-level reports, ban decks, ban users, send mass notifications)
- Appeal system for banned decks
- Deck versioning beyond v2.0
- Deck collaboration tools
- Deck analytics for creators
- Revenue sharing or monetization features
- Deck licensing or copyright management
- Deck categories or tags beyond subject and difficulty
- Deck recommendations based on user behavior
- Deck bundles or collections
- Deck previews beyond first 3 flashcards
- Deck comments or reviews beyond ratings
- Deck bookmarking or wishlists
- Deck trending or featured sections
- Deck search by content or keywords
- Deck import/export between users
- Deck cloning or forking
- Deck permissions or access control
- Deck expiration or time-limited access
- Deck refunds or returns
- Deck discounts or promotions
- Deck gifting to other users
- Deck subscriptions or recurring payments
- Forever Flushies (removed from Trade)
- Language toggle UI (temporarily removed, code preserved)
- Detailed Arena matchmaking algorithm tuning
- Arena spectator mode
- Arena replays
- Arena tournaments
- Arena team matches
- Arena custom rules
- Arena practice mode
- Arena ranking decay
- Arena seasonal resets
- Arena rewards beyond Trophies
- Skills/Charms trading or gifting
- Skills/Charms crafting or upgrading
- Skills/Charms rarity tiers
- Skills/Charms cooldown timers
- Skills/Charms combo effects
- Skills/Charms visual effects customization
- Skills/Charms balance patches
- Skills/Charms meta analysis
- Skills/Charms usage statistics
- Skills/Charms leaderboards