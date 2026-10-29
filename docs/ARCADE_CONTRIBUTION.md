# Arcade Game Studio — Complete 6-Phase Specification

## Rough Sketch of the Idea:
1. - When the user is in Athenaeum > Decks, have the top-right button be "Contribute Deck". - When the user is in Athenaeum > Arcades, have the top-right button be "Contribute Arcade". - Contribute Deck should work exactly the same as the ex-"Contribute to Athenaeum button". - For Contribute Arcade's modal, see 2. 2. Contribute Arcade's modal - An overview of the contribution flow a. Contribute Arcade to World b. Have an arcade in mind? The great time to see it live is... now! c. Select Project
2. I want to have an in-built code editor in Flush. A code editor opens with a tutorial and help button at the top-right. The code editor is in Typescript. There is a preview at the left and the code on the right. Works only on Desktop. The tutorial has three choices: Whackacard, Build A Skyscraper, and Matching Magic. The left shows the working arcade and its code on the right. There is an explanation on every line of the code that explains to the user how to code their own arcade. The Help opens a modal that gives the user help on useful materials and tutorials to learn Typescript or AI (lol) links (note: I do not want AI plugins or external plugins). Okay. The user has to code their arcade logic and design from scratch in the code editor. There is a run button for the user to test. The first time the user clicks Run, Flush prompts them to select an existing deck from their collection and no EXP or whatever is gained -- it is simply to test if the game works. Note that the user should code everything in that single file. Including coloring, design, sounds, images, etc. The user can upload files to use it in their arcade. They can save their unfinished project to return to next time. They can create a new project even if they have unfinished projects. Once done, there is a button to publish their project. They have to fill in the details: Select Project, Arcade Title and Description. Just these three (no images). It gets uploaded to Athenaeum (used to be known as World). The display is just like published decks. Published arcades (after clicking in) have Overview, Code (shows the full code and files if any), MIT licensed (this license, right? or let the user choose or no license?), Mods, Manage, and Suggestions. Non-owners can report the game (to Flush admins) or add a suggestion (these will be sent to Mods) The user can click Add Arcade. When done so, they can see the Arcade in the /arcades page. They can play it using the deck of their choice and it should work/display just as well as the native Whackacard, Build the Skyscraper, and Matching Magic *and* just the same as the devs/owner coded and previewed it in their preview. I do not want templates building. All runs in a sandbox where required. For example, when the user previews their pre-published arcade and when others use their arcade. Safety is always guaranteed.


This is the **complete, detailed, accurate** roadmap for building Flush's Arcade Game Studio. 

## Overview: What You're Building

| Feature | Description |
|---------|-------------|
| **Athenaeum Contribution** | Separate "Contribute Deck" (existing) and "Contribute Arcade" buttons |
| **In-browser IDE** | Monaco editor (VS Code) inside Flush |
| **TypeScript compiler** | Compiles user code in real-time |
| **Sandboxed preview** | iframe with MessageChannel communication |
| **Project management** | Save, load, delete, multiple projects |
| **Asset management** | Upload images, sounds, fonts |
| **Publishing** | Submit games to Athenaeum |
| **Community features** | Ratings, suggestions, mods, reporting |
| **Installation** | Users add games to their Arcade page |

**Key Security Principle:** User games NEVER directly call reward functions (`addGems`, `updateStreak`, etc.). Games only report answers and final score. Flush wrapper handles all rewards, validation, and database updates.

---

## Phase 1: Editor Foundation (Week 1-2)

### What to Build

| Component | Description |
|-----------|-------------|
| `/studio` route | Desktop-only, mobile redirect |
| Split layout | Left: preview, Right: Monaco editor |
| Monaco integration | TypeScript language support |
| Basic sandbox | iframe with `sandbox` attributes |
| Run button | Compile and execute user code |
| Save/Load | localStorage for Phase 1 |
| Template code | Starter TypeScript with Flush API |

### What to Prompt MeDo

```markdown
## Phase 1: Arcade Game Studio — Editor Foundation

Build the initial editor for Flush's Arcade Game Studio.

### 1. New Route
- Add `/studio` route (Desktop only)
- On mobile, redirect to simple page: "Use desktop to create arcade games"

### 2. Layout (Split Screen)
- Left panel (40% width): Live preview area
- Right panel (60% width): Monaco editor

### 3. Monaco Editor Integration
- Load Monaco from CDN: `https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js`
- Set language to TypeScript
- Editor theme: matches Flush's current theme and dark/light mode
- Note: user codes entire arcade in ONE single file (like MatchingGame.tsx, WhackacardGame.tsx, SkyscraperGame.tsx)

### 4. Initial Template Code

Provide this starting code in the editor:

```typescript
// Flush Arcade Game Template
// Your game must implement the FlushArcadeGame interface

interface FlushAPI {
  // Get the next question from user's deck
  getQuestion(): Promise<{front: string, back: string, notes?: string}>;
  
  // Submit whether user's answer was correct
  submitAnswer(correct: boolean): Promise<void>;
  
  // Submit final score at game end
  submitScore(score: number): Promise<void>;
  
  // Log message for debugging (appears in console)
  log(message: string): void;
}

interface FlushArcadeGame {
  init(api: FlushAPI): void;
  start(): void;
  update(deltaTime: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  onAnswer(correct: boolean): void;
  getScore(): number;
}

class MyArcade implements FlushArcadeGame {
  private api: FlushAPI;
  private score: number = 0;
  private canvas: HTMLCanvasElement;
  
  init(api: FlushAPI) {
    this.api = api;
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  }
  
  async start() {
    const question = await this.api.getQuestion();
    this.api.log(`Got question: ${question.front}`);
  }
  
  update(deltaTime: number) {
    // Game logic here
  }
  
  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#1E1E2E';
    ctx.fillRect(0, 0, 800, 600);
    ctx.fillStyle = '#B026FF';
    ctx.font = '24px sans-serif';
    ctx.fillText('Your game here!', 20, 50);
  }
  
  onAnswer(correct: boolean) {
    if (correct) this.score += 100;
  }
  
  getScore(): number {
    return this.score;
  }
}

// Required: Export the game class
export default MyArcade;
```

### 5. Preview Sandbox

- Create sandboxed iframe in left panel
- iframe attributes: `sandbox="allow-scripts allow-same-origin allow-modals"`
- Set up MessageChannel for communication
- Parent sends questions, receives answers

### 6. Tutorial Button

- Top-right corner: "Tutorial" button
- Opens modal with three example games: Whackacard, Build the Skyscraper, Matching Magic
- Each example shows working arcade (left) and its annotated code (right)
- Code includes line-by-line explanations of how each part works

### 7. Help Button

- "Help" button next to Tutorial
- Opens modal with:
  - TypeScript basics (variables, functions, classes)
  - Flush API documentation
  - Links to external TypeScript tutorials (no AI plugins or external API calls)

### 8. Run Button

- Top toolbar: Run button (▶ icon)
- On click: compile TypeScript code using TypeScript compiler
- **First run prompts user to select a deck from their collection**
- No EXP, gems, or rewards earned during preview/testing
- Send compiled JavaScript to iframe
- Iframe executes code and starts game

### 9. Save/Load (LocalStorage)

- Save current editor content to localStorage
- Load from localStorage on page load
- "New Project" button resets to template

### 10. Phase 1 Success Criteria
- [ ] `/studio` route exists
- [ ] Monaco editor loads with TypeScript
- [ ] Tutorial shows three example games with annotated code
- [ ] Help modal contains documentation
- [ ] Run button compiles and runs code in iframe
- [ ] Preview shows "Your game here!" message
- [ ] Code saves to localStorage and reloads
```

### Database Schema (Phase 1)
None — localStorage only.

---

## Phase 2: Sandbox & Game API

### What to Build

| Component | Description |
|-----------|-------------|
| Real game API | Pass actual deck data to sandbox |
| Canvas rendering | Game renders to canvas element |
| Answer submission | Send answers back to Flush |
| Score tracking | Return score to Flush |
| Asset loading | Images, sounds via Blob URLs |

### What to Prompt MeDo

```markdown
## Phase 2: Arcade Game Studio — Sandbox & Game API

### 1. Game API Implementation

Implement the FlushAPI that the sandbox receives:

```typescript
interface FlushAPI {
  getQuestion(): Promise<{front: string, back: string, notes?: string}>;
  submitAnswer(correct: boolean): Promise<void>;
  submitScore(score: number): Promise<void>;
  log(message: string): void;
}
```

The parent app provides this API via MessageChannel.
```

**IMPORTANT SECURITY NOTE:** The following functions are **NEVER** exposed to user games:
- `addGems`
- `updateStreak`
- `addExp`
- `upsertGameHighScore`
- `checkAndAwardBadges`
- `checkAndCompleteDailyGoals`
- `recordGamePlayed`
- `syncFireClub`
- `recordRobinEarlyAction`

All reward calculations happen in the wrapper code that calls the game, not inside the game itself.

### 2. Deck Selection for Preview

- When user clicks Run, prompt to select a deck from their collection
- Show deck selector modal (same as Arcade page)
- Use selected deck's flashcards as question source

### 3. Sandbox iframe Content

- Create HTML page with canvas element (`<canvas id="game-canvas" width="800" height="600">`)
- Inject user's compiled code
- Game renders to canvas
- Game can request questions via `getQuestion()`

### 4. MessageChannel Protocol

**Parent → Game:**
- `{type: 'INIT', deck: Flashcard[]}` - Send deck data
- `{type: 'QUESTION', data: Flashcard}` - Send next question

**Game → Parent:**
- `{type: 'GET_QUESTION'}` - Request next question
- `{type: 'ANSWER', correct: boolean}` - Submit answer
- `{type: 'SCORE', score: number}` - Submit final score
- `{type: 'LOG', message: string}` - Debug log

### 5. Asset Loading

- Add "Upload Asset" button in toolbar
- Supported: PNG, JPG, WEBP, SVG (images), MP3, OGG (sounds), WOFF2 (fonts)
- Assets converted to Blob URLs and passed to iframe
- Assets listed in sidebar for reference

### 6. Score Validation (Security)

- Game reports `submitScore(score)`
- Flush validates score is within reasonable range (0-999999)
- High score comparison happens server-side
- Gems awarded based on validated score, NOT raw user input

### 7. Phase 2 Success Criteria
- [ ] Game receives deck data from selected deck
- [ ] Game can request and receive questions
- [ ] Game can submit answers
- [ ] Game can submit final score
- [ ] Game can render to canvas
- [ ] Assets can be uploaded and used in game
- [ ] User cannot directly call reward functions
```

---

## Phase 3: Project Management (Week 4-6)

### What to Build

| Component | Description |
|-----------|-------------|
| Supabase `arcade_projects` table | Store project metadata and code |
| Save/Load from database | Multi-project support |
| Project list | Sidebar with all user's projects |
| Delete project | Confirm and remove |
| New project | Create from template |

### What to Prompt MeDo

```markdown
## Phase 3: Arcade Game Studio — Project Management

### 1. Database Table

Create `arcade_projects` table:

```sql
CREATE TABLE arcade_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  title VARCHAR(100) NOT NULL,
  code_content TEXT NOT NULL,
  assets_metadata JSONB DEFAULT '[]',
  last_saved TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_arcade_projects_user ON arcade_projects(user_id);
CREATE INDEX idx_arcade_projects_last_saved ON arcade_projects(last_saved);
```

### 2. Project Sidebar

- Left side of editor (collapsible): list of user's projects
- Shows project title and last saved date
- Click to load project into editor
- "New Project" button at top

### 3. Save Functionality

- Auto-save every 30 seconds (only if changed)
- Manual save button (Ctrl+S / Cmd+S)
- Save project title, code, and asset references

### 4. Project Title

- Editable in sidebar or header
- Default: "Untitled Arcade"

### 5. Delete Project

- Confirm modal before deletion
- Soft delete (set is_deleted = TRUE)

### 6. Load Project

- On page load, fetch user's projects (is_deleted = FALSE)
- Load most recent project automatically
- If no projects, create default "Untitled Arcade" with template code

### 7. Phase 3 Success Criteria
- [ ] Projects saved to Supabase
- [ ] Projects load from Supabase
- [ ] Multiple projects supported
- [ ] Project switching works
- [ ] Delete project removes from list
- [ ] Auto-save works
```

### Database Schema (Phase 3)

```sql
arcade_projects
- id (UUID, PK)
- user_id (UUID, FK to users)
- title (VARCHAR(100))
- code_content (TEXT)
- assets_metadata (JSONB)
- last_saved (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- is_deleted (BOOLEAN)
```

---

## Phase 4: Publishing System (Week 6-8)

### What to Build

| Component | Description |
|-----------|-------------|
| Athenaeum contribution buttons | Separate "Contribute Deck" and "Contribute Arcade" |
| Contribute Arcade modal | Select existing project, fill title/description |
| `arcade_games` table | Store published games |
| Athenaeum > Arcades | Browse published games |
| Install system | Add games to user's Arcade page |
| Game rendering | Published games run in sandbox |

### What to Prompt MeDo

```markdown
## Phase 4: Arcade Game Studio — Publishing System

### 1. Athenaeum Contribution Buttons

- In **Athenaeum > Decks**: top-right button = "Contribute Deck" (existing functionality, unchanged)
- In **Athenaeum > Arcades**: top-right button = "Contribute Arcade" (new)

### 2. Contribute Arcade Modal

**Modal Header:**
- Title: "Contribute Arcade to Athenaeum"
- Subtitle: "Have an arcade in mind? The great time to see it live is... now!"

**Modal Content:**
- Step 1: Select Project (dropdown of user's saved projects from arcade_projects)
- Step 2: Arcade Title (required, max 100 chars)
- Step 3: Description (required, max 500 chars, explains how to play)
- Step 4: License dropdown: MIT, All Rights Reserved, GPL-3.0
  - Information icon for each license to help non-dev users choose

**Publish Action:**
- On publish: copy project to `arcade_games` table
- User can update published game (creates new version)

### 3. Database Tables

Create `arcade_games` table:

```sql
CREATE TABLE arcade_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) NOT NULL,
  project_id UUID REFERENCES arcade_projects(id),
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  license VARCHAR(50) DEFAULT 'MIT',
  code_content TEXT NOT NULL,
  assets_metadata JSONB DEFAULT '[]',
  install_count INT DEFAULT 0,
  rating_sum INT DEFAULT 0,
  rating_count INT DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_installed_games (
  user_id UUID REFERENCES users(id),
  game_id UUID REFERENCES arcade_games(id),
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, game_id)
);
```

### 4. Athenaeum > Arcades

- Display all published games (is_published = TRUE)
- Sort by install count (default) or newest
- Each card shows: title, creator username, description, install count, rating (lightning bolts)

### 5. Game Detail Page

- Route: `/arcade-game/:gameId`
- Tabs: Overview, Code, Mods, Manage (owner only), Suggestions
- Code tab shows full TypeScript code and asset list
- "Add Arcade" button (adds to user's installed games)

### 6. Install Functionality

- Clicking "Add Arcade" adds entry to `user_installed_games`
- Installed games appear in `/arcades` page
- Games stored in separate section: "Community Arcades"

### 7. Play Installed Game

- User selects deck, clicks play
- Game loads in sandbox, receives deck data
- Scores recorded like native games
- Games cannot directly call reward functions (enforced by API)

### 8. Phase 4 Success Criteria
- [ ] "Contribute Arcade" button appears in Athenaeum > Arcades
- [ ] Contribute Arcade modal works
- [ ] Games can be published to arcade_games
- [ ] Published games appear in Athenaeum
- [ ] Users can install games
- [ ] Installed games appear in Arcade page
- [ ] Installed games can be played with any deck
```

### Database Schema (Phase 4)

```sql
arcade_games
- id (UUID, PK)
- creator_id (UUID, FK to users)
- project_id (UUID, FK to arcade_projects)
- title (VARCHAR(100))
- description (TEXT)
- license (VARCHAR(50))
- code_content (TEXT)
- assets_metadata (JSONB)
- install_count (INT)
- rating_sum (INT)
- rating_count (INT)
- is_published (BOOLEAN)
- created_at, updated_at

user_installed_games
- user_id (UUID, FK to users)
- game_id (UUID, FK to arcade_games)
- installed_at (TIMESTAMPTZ)
```

---

## Phase 5: Community Features (just like Decks but Mods can modify code. Mods can only publish after moderator approval. There is a backup of the code that supports the last published version, i.e. before all the potential edits happened.)

### What to Build

| Component | Description |
|-----------|-------------|
| Ratings (lightning bolts) | Rate published games |
| Suggestions | Users can suggest improvements |
| Reporting | Flag inappropriate games |
| Mods system | Game owners can add moderators |
| Admin panel | Moderate reports and suggestions |

### What to Prompt MeDo

```markdown
## Phase 5: Arcade Game Studio — Community Features

### 1. Database Tables

```sql
-- Ratings for published games
CREATE TABLE arcade_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES arcade_games(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, game_id)
);

-- Suggestions for games
CREATE TABLE arcade_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES arcade_games(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Reports for games (admin only)
CREATE TABLE arcade_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES arcade_games(id) NOT NULL,
  reporter_id UUID REFERENCES users(id) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Mods for games
CREATE TABLE arcade_mods (
  game_id UUID REFERENCES arcade_games(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(20) DEFAULT 'mod',
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  PRIMARY KEY (game_id, user_id)
);
```

### 2. Ratings (Lightning Bolts)

- Game detail page shows lightning bolts (1-5)
- Users who installed game can rate it
- Clicking lightning bolt sets rating
- Rating updates instantly, shows average

### 3. Suggestions

- "Suggestions" tab in game detail page
- Users can add suggestions (textarea, max 500 chars)
- Suggestions appear in list for owner/mods
- Owner/mods can mark as resolved

### 4. Reporting

- "Report" button on game page
- Modal with reason: Inappropriate, Spam, Malicious Code, Other
- Reports go to `arcade_reports` table
- Admin sees pending reports in admin panel

### 5. Mods System

- Owner can invite other users to become mods (by username)
- Invited user receives Flail notification
- Mods can: resolve suggestions
- Owners can remove mods anytime

### 6. Admin Panel

- View pending reports
- View pending suggestions
- Actions: Dismiss report, Hide game, Warn user, Ban game

### 7. Phase 5 Success Criteria
- [ ] Users can rate published games (1-5 lightning bolts)
- [ ] Users can add suggestions
- [ ] Users can report games
- [ ] Owners can add mods
- [ ] Mods can resolve suggestions
- [ ] Admin can view and act on reports

---

## Phase 6: Polish & Optimization (Week 10-12)

### What to Build

| Component | Description |
|-----------|-------------|
| Performance monitoring | Detect infinite loops, memory leaks |
| Resource limits | CPU, memory caps for sandbox |
| Error reporting | Friendly error messages for users |
| Export/Import | Download project as zip, upload zip |
| Score tracking | Record scores from community games |

### What to Prompt MeDo

```markdown
## Phase 6: Arcade Game Studio — Polish & Optimization

### 1. Performance Monitoring

- Detect infinite loops: if game doesn't yield within 5 seconds, terminate
- Memory monitoring: if game exceeds 256MB, terminate
- Show user-friendly message: "Game stopped due to performance issues"

### 2. Resource Limits (Sandbox)

- Restrict frame rate to 60fps maximum
- Limit canvas size to 800x600 (stretch to fit)
- Limit sound channels to 5 simultaneous
- Block WebGL (canvas only)

### 3. Error Reporting

- Compilation errors: show line number and error message inline
- Runtime errors: catch and display in preview panel
- Error messages should be readable (not just stack traces)

### 4. Export/Import Project

- Export: download project as zip containing:
  - `code.ts` (TypeScript file)
  - `assets/` folder (images, sounds, fonts)
  - `project.json` (metadata)
- Import: upload zip to create new project

### 5. Score Tracking for Community Games

- When user plays installed game, record score
- Score stored in `game_sessions` table with game_id
- High scores tracked globally per game (optional)
- Daily/weekly leaderboards for each game

### 6. Version History

- Save snapshots of project on publish
- Users can revert to previous version
- Store in `arcade_project_versions` table

### 7. Phase 6 Success Criteria
- [ ] Performance monitoring prevents infinite loops
- [ ] Errors display user-friendly messages
- [ ] Export/Import works
- [ ] Scores from community games are recorded
- [ ] Version history works
```

---

## Summary: All Phases at a Glance

| Phase | Focus | Deliverable | Database Tables | Approx Time |
|-------|-------|-------------|-----------------|-------------|
| **1** | Editor foundation | Monaco editor, split layout, tutorial, help, localStorage | None | Week 1-2 |
| **2** | Sandbox & Game API | Real API, canvas rendering, assets | None | Week 2-4 |
| **3** | Project management | Supabase storage, multi-project | `arcade_projects` | Week 4-6 |
| **4** | Publishing system | Contribute Arcade, publish, install | `arcade_games`, `user_installed_games` | Week 6-8 |
| **5** | Community features | Ratings, suggestions, mods, reporting | `arcade_ratings`, `arcade_suggestions`, `arcade_reports`, `arcade_mods` | Week 8-10 |
| **6** | Polish & optimization | Performance, error handling, export | `arcade_project_versions` | Week 10-12 |

---

## Security Summary (Critical)

| What User Games CAN Do | What User Games CANNOT Do |
|------------------------|---------------------------|
| Request questions from deck | ❌ Call `addGems` |
| Submit answer correctness | ❌ Call `updateStreak` |
| Submit final score | ❌ Call `addExp` |
| Render to canvas | ❌ Access other users' data |
| Upload assets (images, sounds) | ❌ Modify high scores directly |
| Log debug messages | ❌ Access localStorage/cookies |
| | ❌ Make arbitrary network requests |

**All reward calculations happen in Flush's wrapper, not in user code.** Games only report what happened; Flush decides rewards.

---

## How to Use This Document

1. **Send Phase 1 prompt to MeDo**
2. **Test Phase 1** — make sure editor works
3. **Send Phase 2 prompt** — add real game API
4. **Test Phase 2** — verify sandbox works
5. **Continue through Phase 6**

Each phase builds on the previous one. Do not skip phases.