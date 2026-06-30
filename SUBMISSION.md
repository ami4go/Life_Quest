# LifeQuest AI — Vibe2Ship Submission Document

**Team / Author:** ami4go
**Hackathon:** Vibe2Ship 2026

| Submission Item | Link |
|---|---|
| **Deployed Application** | https://lifequest-ai-adfe7.web.app |
| **GitHub Repository** | https://github.com/ami4go/LifeQuest |

---

## 1. Problem Statement Selected

**The Last-Minute Life Saver.**

Students, professionals, and entrepreneurs frequently miss deadlines, assignments, meetings, and important commitments. Existing productivity tools rely on **passive reminders** that are easy to ignore and do little to help users actually *complete* their tasks.

The challenge is to build an **AI-powered productivity companion** that proactively assists users in **planning, prioritizing, and completing tasks before deadlines are missed** — moving beyond reminders toward meaningful action.

---

## 2. Solution Overview

**LifeQuest AI** reframes productivity as a role-playing game. Instead of nagging the user, it converts a real-life goal into a structured game world — **missions, quests, XP, ranks, coins, and PvP duels** — and places **Google Gemini at the center as an autonomous agent** that does the work a passive reminder never could.

When a user enters a goal and deadline, Gemini **decomposes** it into a personalized mission tree of small, achievable quests, calibrated to the user's diagnosed *procrastination archetype*. From there, the AI continuously assists:

- It **plans the user's day** to hit the nearest deadlines.
- It **verifies submitted work** with multimodal evaluation and rewards quality.
- It **intervenes when avoidance is detected**, diagnosing *why* and restructuring the task.
- It **decides fair penalties** for dropped tasks based on difficulty and the user's history.
- It **recognizes off-platform achievements** (certificates, contests) and rewards them — sometimes secretly.

The result is a companion that doesn't just remind users of deadlines, but actively makes **starting and finishing** feel rewarding — directly targeting the root cause of missed deadlines.

---

## 3. Key Features

**AI / Agentic capabilities (Gemini-powered):**
- **AI Goal Decomposition** — turns a goal + deadline (typed or spoken) into a structured mission tree of difficulty-rated, time-estimated quests.
- **Archetype Engine** — an 8-question onboarding diagnoses the user's procrastination type; the AI tailors quests and tips to that failure mode.
- **AI Daily Planner** — prioritizes the day to beat the closest deadlines with archetype-aware guidance.
- **AI Proof Verification** — multimodal evaluation of uploaded work (image/PDF/text), scored 1–5 with actionable feedback and XP/coin rewards.
- **Anti-Avoidance Intervention** — detects repeated avoidance, diagnoses the cause, and restructures the quest to lower the barrier to start.
- **AI-Decided Penalties** — computes a fair HP/coin loss from task complexity and the user's track record.
- **Certificate AI Scoring** — verifies certificates and awards 1–500 coins by significance.
- **Secret Achievement Agent** — quietly tracks contest/hackathon activity and unlocks hidden badges + boosts.

**Gamification & engagement:**
- Quests dashboard with **Priority / All / Completed** sections, auto-sorted by deadline and points.
- **Focus Lock** — stake XP on a deadline (+50% on time, −25% if missed).
- **Duels Arena** — challenge friends with custom or AI-generated challenges; AI-evaluated submissions; a live **scorecard** (Player × Task × Submission × Score); instant winner resolution.
- **Coins economy & rewards** store with Total Earned / Spent / Remaining and full history.
- **Badges system** with Unlocked, Locked, and a **"Redemption Arc"** to cancel penalty badges via earned antidote badges.
- **Global leaderboard**, **real-time notifications**, **accent theming**, **voice input**, and a polished mobile-first UI.

---

## 4. Technologies Used

- **Frontend:** React 19, Vite 8, React Router 7
- **UI:** Custom CSS design system, `lucide-react` icon set
- **AI SDK:** `@google/genai` (Google Gemini)
- **Backend / Platform:** Firebase Authentication, Cloud Firestore (real-time), Firebase Hosting
- **Web APIs:** Web Speech API (voice goal entry)

---

## 5. Google Technologies Utilized

- **Google Gemini API (`gemini-2.5-flash`)** — the agentic core of the product. Every intelligent action (goal decomposition, work evaluation, day planning, penalty decisions, anti-avoidance, certificate scoring, duel-challenge generation) is a structured Gemini call, using both **text and vision** (multimodal) capabilities.
- **Firebase (Google Cloud):**
  - **Firebase Authentication** with **Google Sign-In (OAuth 2.0)** for one-tap onboarding.
  - **Cloud Firestore** for real-time data (quests, duels, coins, badges, notifications) streamed via live listeners.
  - **Firebase Hosting** for the deployed, publicly accessible production build.
- **Google AI Studio** — used to design, test, and iterate on the Gemini prompts that drive each AI agent in the app.

---

*LifeQuest AI — turning the dread of a deadline into the dopamine of a quest.*
