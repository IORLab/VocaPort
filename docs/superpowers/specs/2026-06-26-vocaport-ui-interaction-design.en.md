# VocaPort UI And Interaction Design

> Chinese version (中文版): [2026-06-26-vocaport-ui-interaction-design.zh.md](/Users/jay/Code/VocaPort/docs/superpowers/specs/2026-06-26-vocaport-ui-interaction-design.zh.md)

> Reading note: higher-difficulty words, design-heavy terms, and abstract concepts are glossed in Chinese when they most affect reading flow.

**Status (状态):** Experience direction is confirmed; this document does not enter implementation-level design yet.

**Scope (范围):** Phase 1 UI, visual style, information architecture, and interaction flows.

**Out of scope (暂不包含):** Rust/WASM/Tauri architecture, storage design, module contracts, code organization, and implementation details.

## 1. Product Positioning

**Product name:** `VocaPort`

**Subtitle:** Connect vocabulary, practice, and progress.

**Positioning statement (定位描述):** A vocabulary learning application that starts from deck import, centers daily practice, and supports both relaxed habit-building and high-intensity study.

## 2. Experience Goals

- Make the first import smooth enough that users feel immediate certainty (确定感) after success.
- Make daily study light enough that users want to come back every day.
- Provide a dedicated mode for high-intensity study without splitting the product into two separate systems.
- Make the product feel like a learning tool first, not an admin panel and not a marketing homepage.
- Reserve room for future extension (扩展) without letting extension distract from the study mainline.

## 3. Core Design Principles

- **Easy to start, easy to return to the main path.** Users should always know the next meaningful action.
- **One screen, one primary task.** Every page needs a clear main action.
- **Light gamification (轻游戏化), not childish.** The product should feel encouraging, but never noisy or juvenile (幼稚化).
- **Focus mode is a shell switch, not a second product.** It changes presentation and rhythm, not learning-data semantics.
- **Progress must be perceptible (可感知的).** Users should keep feeling mastery, completion, and accumulation.
- **Configuration is a secondary path.** Settings and advanced options must not interrupt the study flow.

## 4. Visual Direction

VocaPort should feel like a modern learning product: quietly motivating, visually structured, restrained (克制的), and stable.

### 4.1 Brand Keywords

- calm
- modular (模块化的)
- encouraging
- structured
- steadily growing

### 4.2 Visual Character

- generous rounded corners
- enough whitespace
- mist-like light backgrounds instead of hard white slabs
- accent colors reserved for progress and primary actions
- very limited illustration use
- icons centered on cards, nodes, connections, and progress

### 4.3 Styles To Avoid

- overly childish or cartoon-like education-product styling
- aggressive celebratory gamification
- cold data-dashboard aesthetics
- content-feed or entertainment-homepage pacing

## 5. Study Modes

Phase 1 uses one learning engine with two presentation modes.

### 5.1 Growth Mode

**Default mode**

Used for daily study, light check-ins, and habit building.

**Traits**

- visibly shows streaks
- provides a light sense of goal and completion
- uses softer success feedback
- allows slightly richer motion
- feels friendlier for short sessions

### 5.2 Focus Mode

Used for high-intensity study, longer card sessions, and lower-distraction practice.

**Traits**

- visibly reduced animation
- lower visual stimulation (刺激)
- higher information density
- faster question turnover
- more direct copywriting

### 5.3 What Mode Switching Changes

- color intensity
- motion intensity
- page density
- copy tone
- answer rhythm
- home-page information priority

### 5.4 What Mode Switching Does Not Change

- deck data
- review records
- progress semantics
- question content
- scheduling outcome
- study history

## 6. Information Architecture

Phase 1 uses a study-first information architecture.

### 6.1 Top-Level Areas

1. `Home`
2. `Review`
3. `Library`
4. `Progress`
5. `More`

### 6.2 Structural Notes

- `Home` is the motivational and navigational entry point.
- `Review` is the fastest route into active study.
- `Library` manages imported decks and deck details.
- `Progress` visualizes pace, load, and mastery.
- `More` keeps secondary settings away from the mainline.

## 7. Navigation Design

### 7.1 Mobile / Android

- bottom navigation for primary areas
- large central emphasis on `Review`
- compact top bar with quick mode switch and import trigger where needed
- avoid deep nested navigation whenever possible

### 7.2 Desktop / Web

- left-side navigation rail or column
- `Review` remains visually dominant
- `Home` and `Progress` should have stronger dashboard-style breathing room
- secondary actions can live in header space without overwhelming the layout

## 8. Page Design

## 8.1 Home

The home page is the emotional anchor (情绪锚点) and the easiest way back into the next meaningful action.

### Page Skeleton

- greeting / mode identity
- today’s target or suggested action
- quick jump into review
- short progress snapshot
- recent deck or current deck

### Key Components

- streak block
- daily goal block
- review CTA
- current deck summary
- compact progress chips
- resume-session entry when one exists

### First-Time Empty State

- make import the obvious first action
- explain what happens after import
- avoid showing too many empty containers

### Mode Differences

- Growth Mode: warmer pacing, stronger celebration, softer copy
- Focus Mode: denser layout, less motion, more direct prompts

## 8.2 Review

The review page is the highest-priority execution surface.

### Page Skeleton

- current prompt
- options area
- lightweight progress indicator
- minimal supporting information

### Key Components

- question card
- option grid or list
- answer feedback area
- next-question transition
- mark-too-hard action
- view-details action

### Design Rules

- keep the main task dominant
- do not expose secondary settings during answering
- maintain stable spatial positions for core actions
- when resuming a session, keep the prompt, option order, and remaining count unchanged

### Mode Differences

- Growth Mode: softer transitions, more celebratory correctness feedback
- Focus Mode: faster transitions, less decorative motion, denser information

## 8.3 Library

The library page manages decks without turning into an admin tool.

### Page Skeleton

- deck list
- deck summary
- import entry
- simple filtering or sorting if needed

### Deck List Information

- deck name
- total cards
- due cards
- last activity
- import source

### Deck Detail Information

- basic metadata
- current progress snapshot
- import history summary
- duplicate / update summary
- reset progress entry

## 8.4 Import Wizard

Import is important enough to deserve a guided multi-step flow.

### Fixed Four-Step Flow

1. choose file
2. preview fields
3. confirm mapping
4. complete import

### Step Notes

- Step 1 should feel fast and low-friction (低摩擦).
- Step 2 should show detected entry count, media count, imported review-history count, and whether the structure looks complex.
- Step 3 should only ask for decisions that genuinely matter: lemma, meaning, example, image, and audio mapping.
- Step 4 should return a strong completion signal and a direct path to study.

### Import Design Requirements

- make progress visible
- surface warnings clearly but calmly
- distinguish an exact duplicate file from a new version of the same deck
- never bury the main next action after success

## 8.5 Progress

The progress page should make improvement legible (可读、可理解), not turn into a noisy analytics center.

### Page Skeleton

- overview
- trend
- workload
- history

### Overview Content

- mastered cards
- current streak
- session count
- today’s completion

### Trend Content

- progress over time
- review consistency
- momentum signals

### Workload Content

- due load
- new card pressure
- upcoming review density

### History Content

- recent sessions
- recent resets
- notable milestones

### Mode Differences

- Growth Mode: stronger celebration and softer framing
- Focus Mode: more compressed, more direct, more analytical

## 8.6 More

The `More` area collects secondary settings without stealing attention from study.

### Phase 1 Content

- mode switch
- import history
- reset progress actions
- module settings entry
- basic preferences

### Later Extensible Directions

- plugin marketplace
- additional quiz modes
- richer media services
- advanced study preferences

## 9. Core User Flows

## 9.1 First-Time User Main Flow

1. open app
2. see empty but guided home state
3. enter import flow
4. complete `.apkg` import
5. land on a success state with direct review CTA
6. start first study session

### Flow Goal

Convert uncertainty into confidence quickly.

## 9.2 Returning Daily Flow

1. open app
2. see today’s next action
3. if an unfinished session exists, resume it first
4. enter review with one tap
5. finish a short session
6. leave with a feeling of completion

### Flow Goal

Minimize friction and reinforce habit rhythm.

## 9.3 High-Intensity Study Flow

1. open app
2. switch or stay in Focus Mode
3. enter review directly
4. continue through longer sessions with reduced distraction

### Flow Goal

Sustain concentration without overdesigning the interface.

## 9.4 Exception And Recovery Flow

Exception states include:

- import failure
- unsupported field mapping
- empty library
- missing media
- partially mapped review history
- interrupted session
- reset request

### Recovery Strategy

- explain the problem in plain language
- offer one clear recovery action
- avoid blame-heavy wording
- summarize partial-history import gaps without blocking the whole flow
- if the session is resumed, preserve the prompt, option order, and remaining count
- use different warnings for exact duplicate files versus same-deck updates
- return users to the mainline as fast as possible

## 10. Micro-Interaction Direction

### 10.1 Correct Feedback

- immediate but not explosive
- enough reward to feel progress
- never block the next action for too long

### 10.2 Incorrect Feedback

- clear and honest
- non-punitive (非惩罚性的)
- redirect attention to the next attempt

### 10.3 Mode Switching

- should feel deliberate (有意图的), not decorative
- update rhythm, density, and tone coherently (连贯地)

### 10.4 Loading States

- calm
- readable
- informative enough to preserve confidence

### 10.5 Empty States

- educational without being verbose
- clear next action
- visually simple

## 11. Copy Tone

### 11.1 Growth Mode

- warmer
- encouraging
- slightly more human and companion-like

### 11.2 Focus Mode

- direct
- short
- lower emotional color

## 12. Usability And Accessibility Baseline

- mobile and desktop layouts must both remain legible
- tap targets need comfortable spacing
- major actions need obvious visual hierarchy
- color cannot be the only meaning carrier
- reduced-motion users should not lose product function

## 13. UI Items Explicitly Out Of Scope In Phase 1

- fully decorative mascot systems
- heavy illustration storytelling
- complex achievement pages
- social leaderboards
- theme explosion with many visual skins

## 14. Summary

Phase 1 UI should feel like a focused learning product with two rhythms:

- a lighter growth rhythm for habit building
- a denser focus rhythm for serious study

The UI should always privilege (优先保障) the study mainline, keep navigation understandable, and reserve room for later extension without letting “future extensibility (可扩展性)” overwhelm the present learning experience.
