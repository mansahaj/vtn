# 🏒 FanSync – Live Social Layer for Ice Hockey Games

## Victoria Data Society Hackathon Project

Event: [https://www.meetup.com/victoria-data/events/313409633/](https://www.meetup.com/victoria-data/events/313409633/)

---

## 🚀 Overview

**FanSync** is a real-time, in-arena social web app designed to improve the live ice hockey experience.

It solves two key problems observed during hockey matches:

1. **Minority-team fans feel isolated** when one team has significantly fewer supporters in attendance.
2. **Fans miss critical moments** (goals, penalties, power plays) when they leave their seats for concessions or washroom breaks.
 
FanSync creates a live digital layer inside the arena that:    

* Connects fans by team and section
* Provides real-time team-based chat
* Tracks and visualizes crowd energy
* Automatically generates a “Catch Up” timeline when fans return
* Simulates hockey event detection and replay alerts

This is a hackathon prototype with simulated real-time game data.

---

## 🎯 Problem Statement

### 1️⃣ Social Isolation for Minority Fans

During away-heavy games, minority supporters:

* Feel disconnected
* Engage less
* Contribute less to arena atmosphere

FanSync clusters fans digitally by team and section to build micro-communities and restore belonging.

---

### 2️⃣ Missed Moments During Live Games

Fans frequently:

* Leave seats during play
* Miss goals or major penalties
* Miss live replay

FanSync detects major hockey events and provides a **Catch Up timeline with replay previews** when the fan returns.

---

## 🏟️ Target Context

This app is specifically designed for **ice hockey games**.

All terminology, UI elements, and game logic must reflect hockey:

* Periods (not quarters)
* Goals
* Penalties (2-minute minor, power play)
* Faceoffs
* Big saves
* Rink, puck, slapshot, crease
* Intermission

No references to soccer, basketball, or other sports.

---

## 🧩 Core Features (MVP)

### 1️⃣ Join Game (Onboarding)

* Select Team: Home or Away
* Enter Section (e.g., Section 104, Row G)
* Optional Nickname
* Store session in localStorage
* Route to Live Game

---

### 2️⃣ Live Game Dashboard

#### Scoreboard

* Home vs Away score
* Period (1 / 2 / 3)
* Time remaining
* LIVE indicator

#### Crowd Energy Meter

* Large circular gauge displaying decibel level (simulated)
* Label: Low / Moderate / High Intensity
* Indicator: +X% vs average

Energy is influenced by:

* Goals (large spike)
* Penalties (moderate spike)
* Big saves
* Chat message volume
* Basic sentiment detection (positive/negative words)

---

#### Highlights Feed

Real-time cards for:

* GOAL
* PENALTY
* POWER PLAY START
* BIG SAVE
* ENERGY SPIKE

Each highlight includes:

* Timestamp (e.g., 12:44 P2)
* Short description
* Replay button (modal with placeholder animation)

---

### 3️⃣ Catch Up Screen

Title:
“While you were away”

Subtitle:
“Here’s what you missed in the last 15 minutes.”

Displays:

* Vertical event timeline
* Goal events
* Penalties
* Energy spikes
* Substitutions (optional)

Each event includes:

* Period/time
* Description
* “Watch Replay” modal button

Includes:

* “Jump to Live” button

---

### 4️⃣ Social – Team Fan Zone

Separate chat rooms:

* Home Fan Zone
* Away Fan Zone

Features:

* Real-time message feed
* Avatars (generated initials)
* Timestamps
* Online count (simulated)
* Special “SHOUT” message type (highlighted card)
* Chant starter option

Purpose:

* Connect minority fans
* Encourage digital cheering
* Increase engagement

---

### 5️⃣ Profile / Settings

* Change team
* Toggle notifications
* Privacy toggle (section visibility)
* Leave game

---

## ⚙️ Game Event Simulation Engine

Since we do not have live arena data, implement a simulated game engine that emits hockey events every 20–60 seconds.

Possible events:

* GOAL (home or away)
* PENALTY (2-minute minor)
* POWER PLAY START / END
* BIG SAVE
* ICING
* PERIOD END

Each event must:

* Update score (if goal)
* Update highlights feed
* Affect crowd energy
* Appear in Catch Up timeline
* Optionally post system message to chat

---

## 🔁 Real-Time Updates

Preferred:

* WebSockets (Socket.io)

Acceptable:

* Server-Sent Events
* Polling fallback

The UI must update without page refresh.

---

## 🎨 Design Requirements

* Mobile-first
* light mode (deep navy background)
* light blue accent
* Rounded card components
* Large typography for GOAL events
* Subtle glow effects for energy meter
* Smooth transitions

UI must match provided mockups in `/mockups/` directory.

Use hockey-themed icons:

* Puck
* Stick
* Whistle
* Lightning bolt (energy)
* Goal light indicator

No non-hockey imagery.

---

## 🏗️ Suggested Tech Stack

Frontend:

* Next.js (App Router) + TypeScript
* Tailwind CSS

Backend:

* Next.js API routes or Express

Real-time:

* Socket.io

Storage:

* In-memory (hackathon scope)
* localStorage for user session

---

## 📁 Suggested Project Structure

/app

* /join
* /live
* /catchup
* /social
* /profile

/components

* Scoreboard.tsx
* EnergyGauge.tsx
* HighlightCard.tsx
* TimelineEvent.tsx
* ChatRoom.tsx
* BottomNav.tsx

/lib

* gameEngine.ts
* energyCalculator.ts
* mockData.ts

---

## 🧠 User Flow

1. User enters arena
2. Opens FanSync
3. Selects team + section
4. Lands on Live Game dashboard
5. Chats in Fan Zone
6. A goal happens
7. Energy spikes
8. User leaves temporarily
9. Returns → sees Catch Up screen
10. Watches replay → rejoins live chat

---

## ✅ Acceptance Criteria

* User can join as Home or Away
* Score updates automatically
* Energy meter responds to events
* Highlights update in real-time
* Catch Up timeline shows last 15 minutes of events
* Replay modal works
* Chat messages appear in real time
* Entire app remains hockey-consistent

---

## 🏆 Pitch Summary

FanSync is a live social infrastructure layer for ice hockey arenas.

It ensures:

* No fan feels alone
* No moment is missed
* Crowd energy is visible
* Engagement is amplified

Connecting Every Fan. Every Moment.

