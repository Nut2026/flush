# PROJECT_DOCUMENTATION.md
## Flush – Gamified Flashcard Web App
**Tagline:** Study smart. Play hard.
**Platform:** MeDo (no-code full-stack web app builder)
**Target:** Hackathon-winning submission + functional single-player learning tool

---

## 1. PROJECT OVERVIEW

Flush is a fully gamified flashcard web application where each user has their own private database. All progress, decks, gems, badges, and game scores are tied to that user only. There are no community decks, no global leaderboards, and no ability to see other users' profiles. The app is designed to make studying feel like playing a game, with rewards, progression systems, and playable games that reinforce learning.

**Core Philosophy:** Every correct answer, completed goal, or high score earns something visible and fun.

---

## 2. TECH STACK & CONSTRAINTS

| Aspect | Requirement |
|--------|-------------|
| Platform | MeDo (no-code full-stack web app builder) |
| Database | Per-user private database (Supabase via MeDo) |
| Authentication | Email/password login for registered users. Guest mode available for anonymous access (progress not saved) |
| AI | LLM plugin from MeDo marketplace (ERNIE) – 100 calls daily limit |
| Deployment | Public URL (one-click from MeDo) |
| Device Support | Desktop, tablet, mobile (responsive) |
| Data Persistence | All registered user data persists across sessions |

**Reminder:** No cross-user data access. Leaderboards compare user only to themselves. No "publish deck" feature. No "browse other users" feature.

---

## 3. USER FLOWS & PAGES

### 3.1 Authentication Flow
- Landing page: Sign Up / Log In
- After login: Redirect to Dashboard
- **Guest mode:** Guest user is limited only to the 5 pre-created starter decks. Progress is NOT stored. Guest users see a banner: *"Sign up to save your progress"*. On signup, guest data is NOT merged. User starts fresh.

### 3.2 Dashboard (Home Page)
- Welcome message with username and profile picture (circle with gradient background + chosen letter/number)
- Current streak display (fire emoji + number of days)
- Today's 3 daily goals with checkboxes
- Total gems owned (prominently displayed)
- "Quick Resume" – last studied deck
- "Recommended" – deck with lowest mastery cards (if any)
- Navigation: Dashboard, Study, Store, Profile

### 3.3 Deck Library Page
- List of all user's decks (grid or list view)
- Each deck shows: title, subject badge, difficulty badge, card count
- Buttons per deck: Flashcards, Test, Games, Edit Deck, Delete Deck
- "Create New Deck" button at top
- "AI Generate Flashcards" button (opens modal)
- All AI functions have a daily limit of 100 calls

### 3.4 Deck Editor Page
- Edit deck title, subject, difficulty
- List all flashcards in deck (sortable/reorderable)
- Each flashcard shows: front text, back text, edit/delete buttons
- "Add Flashcard" button (new front/back fields)
- "Save Deck" button (persists changes)
- "Study This Deck" shortcut button

### 3.5 Study Session Page (Traditional Flashcards)
- Shows one card at a time (front side initially)
- User selects mode: Front → Back OR Back → Front
- Click card or press spacebar to flip
- After flip: shows back side + "Got it right" and "Need review" buttons
- Progress bar: X cards remaining in current session
- End of session summary: "You mastered X cards, Y need more practice"
- Option to restart session or return to dashboard

### 3.6 Test Page (Typed Answer Quiz)
- User selects a deck
- Mode is **Front → Back only** (no AI fuzzy matching – exact string matching, case insensitive)
- User selects number of questions (a quarter of the deck, half, three quarters, or all cards)
  - Rounded down to nearest whole number (minimum 1 question)
- For each question: show prompt (text on the front card), text input field, submit button
- After each answer: immediate feedback (correct/incorrect, show correct answer)
- **Total test timer:** Maximum time = 1 minute × number of questions. Timer starts when first question appears. If time runs out, test ends automatically with score based on completed questions. Timer displayed prominently (MM:SS format). Warning color change when 30 seconds remain.
- End of test: score (X/Y), high score, percentage, gems earned (if 80%+)
- If user terminates early, score is calculated based on completed questions. Gem rewards only apply if score meets threshold (80%+ of completed questions). No penalty for early termination.
- Option to retry or return to dashboard

### 3.7 Games Page
- Shows 3 game cards: Whack-a-Card, Build the Skyscraper, Matching Magic
- Each game shows: deck selector dropdown, current high score for that deck, "Play" button
- Display remaining free tokens for today (3 tokens daily)
- If tokens = 0, show "Play for 5 gems" button
- After game ends: show score, whether high score was beaten (ties do NOT count as beating), gems earned (15 if beats high score)

### 3.8 Store Page
- Game Tokens (5 gems each)
- Streak Freeze (15 gems each)
- Streak Wager (25 gems each)
- Themes section (list of purchasable themes with preview)
- AI Hint (3 gems per hint, max 5 per day)
- Each item shows: name, preview on hover, gem cost, "Buy" button
- "Equip" button appears next to owned themes
- User's current gems shown at top

### 3.9 Profile Page
- Editable username (min 3 chars, max 20 chars, no special chars)
- Editable profile picture:
  - Background: User selects from **12 preset gradient colors** (not a color wheel)
  - Foreground: Single character (A-Z, 0-9) user chooses
  - No gem cost – free personalization feature
  - Displayed as 48x48px circle
- Profile shows up to 3 user-selected badges
- Statistics section:
  - Total gems earned (lifetime)
  - Total cards studied (lifetime)
  - Longest streak
  - Decks mastered (all cards at mastery level 5+)
  - Total gems earned from "cards studied" bonus
- Your Leaderboard section (personal self-comparison):
  - Best streak: 14 days (achieved on Jan 15)
  - Most cards studied in a week: 342 (week of Jan 5–11)
  - Most cards studied in a month: [data]
  - Most gems in a day: 85 (achieved on Jan 10)
  - Best test score: 100% (Spanish Verbs, Jan 12)
  - Best Whack-a-Card score: [high score + deck name + date]
  - Best Build-the-Skyscraper score: [high score + deck name + date]
  - Best Matching Magic score: [high score + deck name + date]
- Personal records update immediately when new high scores are achieved
- "Export My Data" button (downloads user data as JSON)
- "Delete My Account" button (permanently deletes all user data)
- Sign Out button
- Share profile on social media (user chooses which section to show, or all)

---

## 4. FLASHCARD SYSTEM DETAILS

### 4.1 Deck Properties
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| title | string | yes | Max 50 chars |
| subject | enum | yes | Math, Science, English, Languages, Other |
| difficulty | enum | yes | Beginner, Intermediate, Advanced |
| created_at | timestamp | auto | |
| updated_at | timestamp | auto | |

**Limits:** Soft limit: 500 flashcards per user. Warning shown at 400. Hard limit: 1000 (enforced by UI, not database).

### 4.2 Flashcard Properties
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| front_text | string | yes | Max 500 chars |
| back_text | string | yes | Max 500 chars |
| mastery_level | integer (1–6) | auto | 1=New,2=Learning,3=Familiar,4=Good,5=Great,6=Mastered |
| times_reviewed | integer | auto | Increments each time card is studied |
| last_reviewed_at | timestamp | auto | |

### 4.3 Mastery Progression
- Each "Got it right" in study mode: mastery_level increases by 1 (capped at 6)
- Each "Need review": mastery_level decreases by 1 (minimum 1)
- Mastery level influences test question selection (lower mastery cards appear more often)

### 4.4 Study Modes
- **Study Session Page:** Two-way (Front → Back AND Back → Front)
- **Test Page:** One-way (Front → Back only – exact string matching, case insensitive)
- **Games (Whack-a-Card, Build the Skyscraper):** Two-way (user selects mode before playing)

### 4.5 Starter Decks (Pre-loaded for every new user)
Five decks created by default and copied into each user's database at signup. These five decks are the only decks guest users can interact with (progress NOT stored):

1. **Math: Algebra Basics** (Beginner) – 10 cards (e.g., "x + 5 = 10" / "x = 5")
2. **Science: Periodic Table** (Beginner) – 10 cards (e.g., "Symbol for Gold" / "Au")
3. **English: Vocabulary** (Beginner) – 10 cards (e.g., "Define: Benevolent" / "Kindly")
4. **Languages: Spanish Greetings** (Beginner) – 8 cards (e.g., "Hello" / "Hola")
5. **Other: World Capitals** (Intermediate) – 10 cards (e.g., "Capital of France" / "Paris")

---

## 5. TEST SYSTEM DETAILS

### 5.1 Typed Answer Test Rules
- No multiple choice – user must type answer
- **No AI fuzzy matching** – exact string matching, case insensitive ("Paris" = "paris")
- Each test question is one flashcard
- Questions are selected randomly, weighted by lower mastery levels
- Test can be terminated early (score counted only for completed questions; gem rewards apply if score meets threshold of completed questions)
- Total test timer: maximum time = 1 minute × number of questions. Timer starts when first question appears. If time runs out before completing all questions, test ends automatically with score based on completed questions. Timer displayed prominently (MM:SS format). Warning color change when 30 seconds remain.

### 5.2 Test Scoring & Rewards
| Score Range | Gems Earned |
|-------------|--------------|
| Below 80% | 0 gems |
| 80% – 89% | 5 gems |
| 90% – 100% | 10 gems |

### 5.3 Test Modes
| Mode | Prompt Example | Expected Answer Example |
|------|----------------|-------------------------|
| Front → Back | "Capital of France" | "Paris" |

---

## 6. GEM ECONOMY DETAILS

### 6.1 Gem Earning Rules (Complete Table)

| Action | Gems | Frequency Limit |
|--------|------|----------------|
| Complete a daily goal | 5–10 (varies) | Once per goal per day |
| Complete ALL 3 daily goals | 20 bonus | Once per day |
| Score 80–89% on typed test | 5 | Per test (unlimited) |
| Score 90–100% on typed test | 10 | Per test (unlimited) |
| Beat high score in any game (ties do NOT count) | 15 | Per game per deck (each time record breaks) |
| For every 50 cards studied in one day | 5 | Per 50 cards in a day |
| Maintain 3-day streak | 10 | One-time each milestone |
| Maintain 7-day streak | 50 | One-time each milestone |
| Maintain 14-day streak | 100 | One-time each milestone |
| Maintain 30-day streak | 200 | One-time each milestone |

### 6.2 Gem Spending Rules

| Item Category | Item Name | Gem Cost |
|---------------|-----------|----------|
| Themes | Default (free) | 0 |
| Themes | Forest | 50 |
| Themes | Midnight Galaxy | 80 |
| Themes | Sunset | 60 |
| Themes | Mint | 40 |
| Themes | Ninja | 70 |
| Themes | Chocolate | 40 |
| Themes | Cotton Candy | 45 |
| Themes | Cyberpunk | 90 |
| Themes | Sakura | 70 |
| Themes | Ocean | 65 |
| Themes | Royal | 100 |
| Themes | Aurora | 100 |
| Game Token | Plays one game once | 5 per token |
| Streak Freeze | Keeps streak intact for one day even if absent. Only one can be active at a time. | 15 per freeze |
| Streak Wager | Bet 25 gems → win 60 if streak maintained for 14 days | 25 |
| AI Hint | Provides a hint for current test question | 3 per hint (max 5 per day) |

### How Streak Freeze Works
- User purchases Streak Freeze from store
- User must activate manually BEFORE missing a day
- Once activated, protects streak for **one missed day only**
- Freeze is consumed after use
- Only one freeze can be active at any time
- If user misses a day without an active freeze, streak resets to 0

### How Streak Wager Works
When a user buys a Streak Wager:
1. They pay **25 gems** upfront
2. They must maintain their daily streak for **14 consecutive days**
3. If successful → they receive **60 gems** (35 gem profit)
4. If streak breaks → they lose the 25 gems (no refund)
5. Only one active wager at a time
6. If user already has an active wager, cannot purchase another until current wager completes or fails

This creates a fun gambling-like mechanic that encourages daily engagement.

---

### Theme 1: Default (Free)
**Price:** 0 gems 
**Vibe:** Clean, professional, balanced
| Element | Color Code | Description |
|---------|------------|-------------|
| Background (dark mode) | `#1E1E2E` | Dark slate |
| Background (light mode) | `#F8F9FA` | Off-white |
| Card background (dark) | `#2D2D3A` | Slightly lighter than bg |
| Card background (light) | `#FFFFFF` | Pure white |
| Primary text (dark) | `#E0E0E0` | Light gray |
| Primary text (light) | `#2D2D2D` | Dark gray |
| Secondary text (dark) | `#A0A0B0` | Muted gray |
| Secondary text (light) | `#6C757D` | Muted dark gray |
| Accent color | `#B026FF` | Neon purple |
| Button background | `#B026FF` | Neon purple |
| Button text | `#FFFFFF` | White |
| Border color | `#3D3D4A` | Subtle divider |
| Success color | `#00C9A7` | Mint green |
| Warning color | `#FFB800` | Amber |
| Error color | `#FF4444` | Red |

---

### Theme 2: Forest (50 gems)
**Price:** 50 gems 
**Vibe:** Natural, grounded, focus-enhancing
| Element | Color Code | Description |
|---------|------------|-------------|
| Background (dark mode) | `#1A2F1D` | Deep forest green |
| Background (light mode) | `#E8F0E8` | Soft sage |
| Card background (dark) | `#2A4030` | Medium forest |
| Card background (light) | `#FFFFFF` | White |
| Primary text (dark) | `#E8F0E8` | Soft sage |
| Primary text (light) | `#1A2F1D` | Deep forest |
| Accent color | `#D4AF37` | Gold |
| Button background | `#D4AF37` | Gold |
| Button text | `#1A2F1D` | Deep forest |
| Border color | `#3D5A40` | Muted green |

---

### Theme 3: Midnight Galaxy (80 gems)
**Price:** 80 gems 
**Vibe:** Cosmic, mysterious, immersive
| Element | Color Code | Description |
|---------|------------|-------------|
| Background | `#0B0B1A` | Deep space blue-black |
| Card background | `#1A1A3A` | Nebula purple-blue |
| Primary text | `#E0E0FF` | Star white with blue tint |
| Secondary text | `#A0A0D0` | Muted lavender |
| Accent color | `#00D4FF` | Electric cyan |
| Button background | `#00D4FF` | Electric cyan |
| Button text | `#0B0B1A` | Deep space |
| Border color | `#2A2A5A` | Subtle nebula |
| **Special effect** | Stars | Small white dots scattered on background |

---

### Theme 4: Sunset (60 gems)
**Price:** 60 gems 
**Vibe:** Warm, energetic, cozy
| Element | Color Code | Description |
|---------|------------|-------------|
| Background (dark) | `#2D1B2E` | Deep dusk purple |
| Background (light) | `#FFF0E6` | Soft peach cream |
| Card background (dark) | `#3D2538` | Warm plum |
| Card background (light) | `#FFFFFF` | White |
| Primary text (dark) | `#FFD6B0` | Soft orange |
| Primary text (light) | `#4A2B3A` | Deep plum |
| Accent color | `#FF6B6B` | Coral pink |
| Button background | `#FF6B6B` | Coral pink |
| Button text | `#2D1B2E` | Deep dusk |
| Border color | `#5A3D50` | Muted mauve |

---

### Theme 5: Mint (40 gems)
**Price:** 40 gems 
**Vibe:** Fresh, clean, refreshing
| Element | Color Code | Description |
|---------|------------|-------------|
| Background (dark) | `#1A2E2A` | Deep mint |
| Background (light) | `#E8F5F2` | Soft mint cream |
| Card background (dark) | `#2A453F` | Medium mint |
| Card background (light) | `#FFFFFF` | White |
| Primary text (dark) | `#C8E6DF` | Light mint |
| Primary text (light) | `#1A2E2A` | Deep mint |
| Accent color | `#00C9A7` | Mint green |
| Button background | `#00C9A7` | Mint green |
| Button text | `#1A2E2A` | Deep mint |
| Border color | `#3D5E55` | Muted sage |

---

### Theme 6: Ninja (70 gems)
**Price:** 70 gems 
**Vibe:** Stealthy, sharp, dangerous
| Element | Color Code | Description |
|---------|------------|-------------|
| Background | `#121212` | Pure black |
| Card background | `#1E1E1E` | Dark gray |
| Primary text | `#E0E0E0` | Light gray |
| Secondary text | `#A0A0A0` | Mid gray |
| Accent color | `#CC0000` | Blood red |
| Button background | `#CC0000` | Blood red |
| Button text | `#121212` | Black |
| Border color | `#333333` | Subtle dark gray |
| **Special effect** | Red glow | Buttons and active states have subtle red glow |

---

### Theme 7: Chocolate (40 gems)
**Price:** 40 gems 
**Vibe:** Warm, cozy, sweet
| Element | Color Code | Description |
|---------|------------|-------------|
| Background (dark) | `#2C1A0E` | Dark chocolate |
| Background (light) | `#F5ECE0` | Milk cream |
| Card background (dark) | `#3D2618` | Milk chocolate |
| Card background (light) | `#FFFFFF` | White |
| Primary text (dark) | `#F0E0C8` | Caramel cream |
| Primary text (light) | `#2C1A0E` | Dark chocolate |
| Accent color | `#C4A265` | Caramel gold |
| Button background | `#C4A265` | Caramel gold |
| Button text | `#2C1A0E` | Dark chocolate |
| Border color | `#5A3D28` | Muted brown |

---

### Theme 8: Cotton Candy (45 gems)
**Price:** 45 gems 
**Vibe:** Cute, dreamy, pastel
| Element | Color Code | Description |
|---------|------------|-------------|
| Background (dark) | `#2D1B3D` | Deep lavender |
| Background (light) | `#FFEDFA` | Soft pink cream |
| Card background (dark) | `#3D2A50` | Muted purple |
| Card background (light) | `#FFFFFF` | White |
| Primary text (dark) | `#FFD4E8` | Soft pink |
| Primary text (light) | `#4A2D5A` | Deep lavender |
| Accent color | `#87CEEB` | Baby blue |
| Secondary accent | `#FFB6C1` | Light pink |
| Button background | Gradient `#FFB6C1` → `#87CEEB` | Pink to blue |
| Button text | `#2D1B3D` | Deep lavender |
| Border color | `#D4A5D4` | Soft mauve |

---

### Theme 9: Cyberpunk (90 gems)
**Price:** 90 gems 
**Vibe:** Futuristic, glitchy, intense
| Element | Color Code | Description |
|---------|------------|-------------|
| Background | `#0A0A0F` | Almost black |
| Card background | `#1A1A2E` | Dark navy |
| Primary text | `#E0E0E0` | Light gray |
| Secondary text | `#A0A0D0` | Muted lavender |
| Accent color 1 | `#00D4FF` | Electric cyan |
| Accent color 2 | `#FF006E` | Neon pink |
| Button background | Gradient `#00D4FF` → `#FF006E` | Cyan to pink |
| Button text | `#0A0A0F` | Almost black |
| Border color | `#00D4FF` | Electric cyan |
| **Special effect** | Glow | Buttons and cards have neon glow on hover |

---

### Theme 10: Sakura (70 gems)
**Price:** 70 gems 
**Vibe:** Elegant, calm, seasonal, feminine
| Element | Color Code | Description |
|---------|------------|-------------|
| Background (dark) | `#2D1B2A` | Deep cherry blossom |
| Background (light) | `#FFF5F8` | Soft blossom cream |
| Card background (dark) | `#3D2A3A` | Muted rose |
| Card background (light) | `#FFFFFF` | White |
| Primary text (dark) | `#FFE0E8` | Soft blossom |
| Primary text (light) | `#4A2A3A` | Deep cherry |
| Accent color | `#FFB7C5` | Cherry blossom pink |
| Button background | `#FFB7C5` | Cherry blossom pink |
| Button text | `#2D1B2A` | Deep cherry |
| Border color | `#D4A0B0` | Muted rose |
| **Special effect** | Petals | Subtle falling petal animation (optional) |

---

### Theme 11: Ocean (65 gems)
**Price:** 65 gems 
**Vibe:** Deep, mysterious, serene, calming
| Element | Color Code | Description |
|---------|------------|-------------|
| Background (dark) | `#0D2B3E` | Deep ocean blue |
| Background (light) | `#E0F0F5` | Soft sea foam |
| Card background (dark) | `#1A4A5A` | Teal blue |
| Card background (light) | `#FFFFFF` | White |
| Primary text (dark) | `#D0F0F0` | Light aqua |
| Primary text (light) | `#0D2B3E` | Deep ocean |
| Secondary text (dark) | `#90C0D0` | Muted aqua |
| Secondary text (light) | `#3A6B7A` | Muted teal |
| Accent color | `#FF6B4A` | Coral orange |
| Button background | `#FF6B4A` | Coral orange |
| Button text | `#0D2B3E` | Deep ocean |
| Border color | `#2A6A80` | Mid aqua |
| **Special effect** | Ripple | Subtle ripple animation on hover |

---

### Theme 12: Royal (100 gems)
**Price:** 100 gems 
**Vibe:** Regal, luxurious, powerful, premium
| Element | Color Code | Description |
|---------|------------|-------------|
| Background (dark) | `#1A0A2E` | Deep royal purple |
| Background (light) | `#F0E8FF` | Soft lavender cream |
| Card background (dark) | `#2D1A4A` | Regal plum |
| Card background (light) | `#FFFFFF` | White |
| Primary text (dark) | `#FFD700` | Gold |
| Primary text (light) | `#1A0A2E` | Deep purple |
| Secondary text (dark) | `#D4AF37` | Metallic gold |
| Secondary text (light) | `#5A3D8A` | Muted purple |
| Accent color | `#9B59B6` | Amethyst |
| Button background | `#FFD700` | Gold |
| Button text | `#1A0A2E` | Deep purple |
| Border color | `#D4AF37` | Metallic gold |
| **Special effect** | Shine | Subtle gold shimmer on borders and buttons |

---

### Theme 13: Aurora (100 gems)
**Price:** 100 gems 
**Vibe:** Magical, dreamy, ethereal, flagship premium
| Element | Color Code/Specification | Description |
|---------|--------------------------|-------------|
| Background gradient | `linear-gradient(135deg, #0F2027 → #203A43 → #2C5364)` | Deep arctic night |
| Card background | `rgba(0, 0, 0, 0.6)` with `backdrop-filter: blur(10px)` | Frosted glass |
| Primary text | `#FFFFFF` | Pure white |
| Secondary text | `#D0E0E0` | Soft arctic mist |
| Accent color 1 | `#00FF88` | Neon mint |
| Accent color 2 | `#00D4FF` | Electric cyan |
| Accent color 3 | `#B026FF` | Neon purple |
| Button background | Gradient `#00FF88` → `#00D4FF` → `#B026FF` | Flowing aurora |
| Button text | `#0F2027` | Deep arctic |
| Border color | `rgba(255, 255, 255, 0.2)` | Subtle white |
| **Special effect 1** | Animated gradient | Background slowly shifts colors over 10 seconds |
| **Special effect 2** | Aurora waves | Subtle waving light effect on hover |
| **Special effect 3** | Glass morphism | Frosted glass effect on cards |

---

## 7. BADGES & STREAKS DETAILS

### 7.1 Badges (Achievements)

| Badge Name | Trigger | One-time |
|------------|---------|----------|
| First Deck | Create first deck | Yes |
| Card Master | Create 50 flashcards total | Yes |
| Test Ace | Get 100% on a typed test (any deck) | Yes |
| 3-Day Streak | Study 3 consecutive days | Yes |
| 7-Day Streak | Study 7 consecutive days | Yes |
| 14-Day Streak | Study 14 consecutive days | Yes |
| 30-Day Streak | Study 30 consecutive days | Yes |
| Gem Hoarder | Accumulate 200 gems (not spent) | Yes |
| Game Winner | Beat any high score in any game | Yes |
| Perfect Week | Complete all daily goals for 7 consecutive days | Yes |
| Master of All | Achieve mastery level 6 on 50 cards | Yes |

### 7.2 Badge Display Rules
- Profile shows up to 3 user-selected badges
- Badge selection interface shows all earned badges with checkboxes
- Maximum 3 selected at any time

### 7.3 Streak Club Rules
- Streak counts consecutive days with ANY study activity:
  - Studied at least 1 card in Study mode OR
  - Completed at least 1 typed test OR
  - Played at least 1 game
- Streak resets to 0 if a day passes with zero study activity AND no active Streak Freeze
- Streak displayed on Dashboard and Profile
- Streak milestones award gems automatically (see 6.1)
- **Streak Freeze:** User purchases and must activate manually BEFORE missing a day. Once activated, protects streak for one missed day only. Freeze is consumed after use. Only one freeze can be active at any time.

---

## 8. DAILY GOALS DETAILS

### 8.1 Goal Generation Rules
- 3 new goals generated at midnight (user's local time)
- Goals are randomly selected from this pool:

| Goal Description | Gem Reward |
|------------------|------------|
| Study 20 cards | 5 |
| Study 40 cards | 8 |
| Study 60 cards | 10 |
| Complete 1 typed test | 5 |
| Complete 3 typed tests | 10 |
| Score 80% or higher on a test | 8 |
| Score 100% on a test | 10 |
| Study 3 different decks | 8 |
| Earn 15 gems | 10 |
| Play 1 game | 5 |
| Beat any high score | 10 |

### 8.2 Goal Completion Rules
- Goals are marked complete automatically when conditions met
- User cannot manually mark complete
- "All goals complete" bonus (20 gems) awarded when all 3 goals show complete
- Unclaimed bonus does not expire but can only be claimed once per day

---

## 9. GAMES DETAILS

### 9.1 Game Token System
- Every user gets 3 free tokens daily (reset at midnight)
- Each game play costs 1 token
- If tokens = 0, play costs 5 gems
- Tokens do not roll over to next day

### 9.2 Game 1: Whack-a-Card
**Description:** Cards pop up from holes. Each card displays a question from a flashcard. User must click the card showing the correct answer to whack it.

**Parameters:**
- Duration: 60 seconds
- Grid: 3x3 holes
- Spawn rate: 1 new card every 2 seconds (max 3 on screen)
- Question source: Selected deck
- User selects mode before playing: Front → Back OR Back → Front
- Scoring: +10 points per correct whack, -5 points for incorrect whack (cannot go below 0)
- High score: Saved per deck (ties do NOT count as beating high score)

**UI Requirements:**
- Timer countdown display
- Current score display
- Card holes as clickable divs
- Questions appear on card bubbles

### 9.3 Game 2: Build the Skyscraper
**Description:** A question appears. User types the correct answer. Each correct answer adds a block to the skyscraper. Wrong answer shakes the tower and adds no block.

**Parameters:**
- Time limit per question: 10 seconds
- User selects mode before playing: Front → Back OR Back → Front
- No limit on total questions (game continues until user quits or gets 3 wrong)
- After 3 wrong answers: game ends
- Skyscraper height = number of correct answers
- High score: Saved per deck (tallest skyscraper, ties do NOT count as beating high score)

**UI Requirements:**
- Visual skyscraper (stacked rectangles or blocks)
- Current question display
- Text input field
- Submit button or Enter key
- Shake animation on wrong answer

### 9.4 Game 3: Matching Magic
**Description:** Grid of facedown cards. Each pair = one flashcard (front text on one card, back text on its match). User flips two cards at a time to match front with back.

**Parameters:**
- Grid size: 4x4 (8 pairs) – expandable to 6x6 if deck has 18+ cards
- Timer starts on first flip
- Matched cards disappear or stay flipped
- Final score = (total pairs / time in seconds) × 1000 (minimum time = 1 second for scoring)
- High score: Saved per deck (highest final score, ties do NOT count as beating high score)

**UI Requirements:**
- Card flip animation
- Disable clicks during animation
- Match detection (front must match with its specific back)
- Timer display
- Moves counter

---

## 10. AI FEATURES DETAILS

### 10.1 AI Flashcard Generation
**Trigger:** User clicks "AI Generate Flashcards" button on Deck Library page

**Input Modal:**
- Topic (text field, required) – e.g., "French irregular verbs"
- Number of cards (dropdown: 5–15) – default 5
- Select existing deck to add to, or "Create new deck"
- Max 100 calls daily (resets at midnight)

**AI Processing:**
1. Send prompt to LLM plugin (ERNIE)
2. Prompt format: `Generate N flashcards about [topic]. Return as JSON array with objects containing "front" and "back" keys. Front should be a question or term. Back should be the answer or definition.`
3. Parse JSON response
4. Validate each card (non-empty front/back, reasonable length)
5. Display preview to user for approval
6. User confirms → cards saved to selected deck

**Error Handling:**
- If AI returns invalid JSON: retry once, then fallback to "AI unavailable" message
- If AI returns empty or nonsense: show error, allow user to retry

### 10.2 AI Hints
**Trigger:** User clicks "Hint" button during Test

**Function:** LLM generates a contextual hint for the current flashcard

**Example:**
- Flashcard: Front="Capital of France", Back="Paris"
- Hint: "It starts with P and is known as the City of Light"

**Cost & Limits:**
- Each hint costs **3 gems**
- Maximum **5 hints per day** (resets at midnight)
- User can purchase hints individually (3 gems each time) or buy upfront (still 3 gems per hint)
- Unused hints do NOT roll over to next day
- Hint button is disabled if user has reached daily limit or has insufficient gems

**Performance:** Hint button calls AI on demand (no auto-generation)

---

## 11. PROFILE & PERSONALIZATION

### 11.1 Profile Fields

| Field | Editable | Notes |
|-------|----------|-------|
| Username | Yes | Min 3 chars, max 20 chars, no special chars |
| Profile Picture | Yes | Background: 12 preset gradient colors (no color wheel). Foreground: single character (A-Z, 0-9). No gem cost. |
| Displayed badges | Yes | Max 3 from earned badges |
| Selected theme | Yes | From owned themes only |

**Profile Picture Gradient Presets (12 colors):**
1. Sunset (Orange → Pink)
2. Ocean (Blue → Teal)
3. Forest (Green → Lime)
4. Royal (Purple → Gold)
5. Mint (Mint → White)
6. Cyberpunk (Cyan → Pink)
7. Sakura (Pink → White)
8. Midnight (Navy → Purple)
9. Aurora (Green → Cyan → Purple)
10. Chocolate (Brown → Caramel)
11. Cotton Candy (Pink → Blue)
12. Default (Purple → Blue)

### 11.2 Statistics (Read-only, auto-calculated)

| Statistic | Calculation |
|-----------|-------------|
| Total gems earned | Sum of all gems earned (lifetime) |
| Total cards studied | Sum of all study sessions (cards flipped) |
| Longest streak | Max consecutive days with study activity |
| Decks mastered | Decks where all cards have mastery_level ≥ 5 |
| Total tests taken | Count of test sessions completed |
| Average test score | Average of all test scores (percentage) |
| Total games played | Count of game sessions played |
| Total gems spent | Sum of all gem purchases |
| Total gems from card bonuses | Sum of "every 50 cards studied" bonuses |

### 11.3 Personal Leaderboard (Self-Comparison)

Personal records update immediately when new high scores are achieved.

| Record | What It Shows |
|--------|----------------|
| Best streak | Longest streak + date achieved |
| Most gems in a day | Highest gems earned in single day + date |
| Best test score | Highest percentage + deck name + date |
| Most cards studied in a week | Highest weekly card count + week range |
| Best Whack-a-Card score | High score + deck name + date |
| Best Build-the-Skyscraper score | High score + deck name + date |
| Best Matching Magic score | High score + deck name + date |

### 11.4 Data Export & Deletion
- **Export My Data:** Downloads user data as JSON file (decks, flashcards, progress, settings)
- **Delete My Account:** Permanently deletes all user data from database. User is signed out and account removed.

---

## 12. DESIGN & UI SPECIFICATIONS

### 12.1 Visual Style Guide

| Element | Specification |
|---------|---------------|
| Primary brand color | Neon Purple (#B026FF) |
| Secondary color | Electric Blue (#00D4FF) |
| Accent color | Coral Pink (#FF6B6B) |
| Background (dark mode) | Dark Slate (#1E1E2E) |
| Background (light mode) | Off-white (#F8F9FA) |
| Text (dark mode) | Light Gray (#E0E0E0) |
| Text (light mode) | Dark Gray (#2D2D2D) |
| Success color | Mint Green (#00C9A7) |
| Warning color | Amber (#FFB800) |
| Error color | Red (#FF4444) |
| Font family | Inter or Poppins (sans-serif) |

### 12.2 Theming
- Default theme (always free): Dark Slate base + Neon Purple accents
- Purchasable themes change background and accent colors (see Section 6.2 for full theme list)
- Dark/light mode toggle available in all themes
- **Language selection dropdown** available at all times (English / Chinese)
  - Changes UI text only (not flashcard content)
  - AI prompts still sent in English

### 12.3 Animations

| Interaction | Animation |
|-------------|-----------|
| Card flip | 0.3s 3D rotation (preserve-3d) |
| Gem earned | +10 floats up, fades out over 1s, sparkle particle effect |
| Badge unlocked | Modal popup with confetti burst |
| Streak maintained | Fire emoji bounce animation |
| Correct answer (test) | Green flash on input field, checkmark icon |
| Wrong answer (test) | Red shake on input field (0.1s left/right) |
| Game: Whack | Card squish animation on click |
| Game: Skyscraper block | Block slides up into place |
| Game: Match | Card flip + fade out on match |
| Page transition | Fade (0.2s) |

### 12.4 Layout Requirements
- Bottom navigation bar on mobile (Dashboard, Study, Store, Profile)
- Side navigation on desktop (collapsible)
- All pages must be usable on 320px width (iPhone SE)
- Touch targets minimum 44x44px
- Card decks displayed in responsive grid (1 column on mobile, 2–3 columns on tablet, 3–4 columns on desktop)

### 12.5 Keyboard Shortcuts

| Shortcut | Action | Page |
|----------|--------|------|
| Spacebar | Flip card | Study Session Page |
| Left arrow | Previous card | Study Session Page |
| Right arrow | Next card | Study Session Page |
| Enter | Submit answer | Test Page, Build the Skyscraper |
| Esc | Close modal | Any modal |

---

## 13. DATA STRUCTURE (PER-USER DATABASE)

### Table: users
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| email | string | Unique, from auth |
| username | string | Editable, default "Learner123" |
| profile_gradient | string | One of 12 preset gradient IDs |
| profile_character | string | Single character (A-Z, 0-9) |
| gems | integer | Default 0 |
| streak_days | integer | Default 0 |
| streak_freeze_active | boolean | Default false |
| streak_wager_active | boolean | Default false |
| streak_wager_start_date | date | Nullable |
| last_study_date | date | Nullable |
| join_date | timestamp | Auto on signup |
| selected_theme | string | Default "default" |
| displayed_badges | array | Max 3 badge IDs |

### Table: decks
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| title | string | Required |
| subject | enum | Math, Science, English, Languages, Other |
| difficulty | enum | Beginner, Intermediate, Advanced |
| created_at | timestamp | Auto |
| updated_at | timestamp | Auto |

### Table: flashcards
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| deck_id | UUID | Foreign key to decks |
| front_text | text | Required, max 500 |
| back_text | text | Required, max 500 |
| mastery_level | integer | 1–6, default 1 |
| times_reviewed | integer | Default 0 |
| last_reviewed_at | timestamp | Nullable |

### Table: badges
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| badge_name | string | From badge list |
| earned_at | timestamp | Auto |

### Table: owned_items
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| item_type | enum | theme |
| item_name | string | Theme name |
| purchased_at | timestamp | Auto |

### Table: game_high_scores
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| game_name | enum | whackacard, skyscraper, matching |
| deck_id | UUID | Foreign key to decks |
| high_score | integer | Highest score achieved |
| achieved_at | timestamp | Auto |

### Table: daily_goals
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| date | date | YYYY-MM-DD |
| goal1 | string | Goal description |
| goal2 | string | Goal description |
| goal3 | string | Goal description |
| goal1_complete | boolean | Default false |
| goal2_complete | boolean | Default false |
| goal3_complete | boolean | Default false |
| all_complete_bonus_claimed | boolean | Default false |

### Table: test_results
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| deck_id | UUID | Foreign key to decks |
| score_percent | integer | 0–100 |
| questions_correct | integer | |
| questions_total | integer | |
| date | timestamp | Auto |

### Table: ai_usage
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| date | date | YYYY-MM-DD |
| flashcard_generations | integer | Default 0 |
| hints_used | integer | Default 0 |

---

**End of PROJECT_DOCUMENTATION.md**