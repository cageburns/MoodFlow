# AI Development Log

## Purpose

This document records significant AI-assisted work on MoodFlow.

Each important entry should include:

- date;
- stage;
- AI tool;
- model;
- agent role;
- task;
- representative prompts;
- files or decisions produced;
- verification and tests;
- problems or corrections;
- human decision.

Trivial corrections do not require separate entries.

---

## Entry 1: Initial project planning

**Date:** 2026-06-21  
**Stage:** Planning  
**AI tool:** ChatGPT  
**Model:** GPT-5.5 Thinking  
**Agent role:** Planning agent

### Task

Create initial planning documentation for a mood-tracking application using TIDAL for music suggestions.

### Representative prompt

> Act as the planning agent for this project. The project is called MoodFlow. It will allow users to log mood, intensity, energy, and an optional note; receive music suggestions that match or change the mood; and view mood history in charts.

### Files produced

- `docs/project-plan.md`
- `docs/requirements.md`
- `docs/architecture.md`
- `docs/ai-development-log.md`

### Evaluation

The initial plan established the stack, modules, testing approach, and project scope.

### Human decision

Retain:

- HTML, CSS, and JavaScript frontend;
- Node.js and Express backend;
- SQLite;
- Chart.js;
- rule-based recommendation logic.

---

## Entry 2: Planning optimization and TIDAL authentication design

**Date:** 2026-06-21  
**Stage:** Planning refinement  
**AI tool:** ChatGPT  
**Model:** GPT-5.5 Thinking  
**Agent role:** Planning and architecture agent

### Task

Make the planning files easier for coding agents to execute and add user-driven TIDAL authorization.

### Result

The revised plan added:

- locked version 1 decisions;
- phase acceptance checks;
- coding-agent execution rules;
- a TIDAL OAuth feasibility phase;
- hosted user login;
- server-side token handling.

### Evaluation

The plan was implementation-ready, but TIDAL authorization introduced a large subsystem involving:

- OAuth callbacks;
- PKCE;
- sessions;
- token refresh;
- login cancellation;
- reconnection.

### Human decision

Reconsider the music provider because authentication risk could consume too much of the assignment.

---

## Entry 3: Music-provider comparison

**Date:** 2026-06-21  
**Stage:** Architecture decision  
**AI tool:** ChatGPT  
**Model:** GPT-5.5 Thinking  
**Agent role:** Solution advisor

### Task

Compare TIDAL, regular YouTube, YouTube Music, and a Last.fm plus YouTube combination.

### Result

The comparison identified:

- TIDAL: clean catalogue and account integration, but substantial OAuth complexity;
- YouTube Music: no official public developer API for the planned use;
- Last.fm plus YouTube: cleaner metadata, but two integrations and additional ranking work;
- YouTube: one search integration, no user login, and direct embedded playback.

### Human decision

Use regular YouTube for version 1.

Keep the architecture provider-aware, but do not add a generalized provider interface unless another provider is actually implemented.

---

## Entry 4: YouTube planning rewrite

**Date:** 2026-06-21  
**Stage:** Final planning  
**AI tool:** ChatGPT  
**Model:** GPT-5.5 Thinking  
**Agent role:** Planning and architecture agent

### Task

Replace TIDAL with YouTube throughout the planning documents.

Keep the documents:

- detailed;
- manageable;
- understandable to coding agents;
- executable in independent phases.

### Representative prompt

> Redo the planning files with YouTube replacing TIDAL. Keep the files as detailed as possible without becoming overwhelming, and keep them understandable for coding agents.

### Verification performed

Official Google developer documentation was checked for:

- public YouTube Data API search;
- search filters;
- Boolean query exclusions;
- embeddable and externally playable result filters;
- search quota;
- IFrame playback;
- player events and requirements.

### Files produced

Updated:

- `docs/project-plan.md`
- `docs/requirements.md`
- `docs/architecture.md`
- `docs/ai-development-log.md`

### Main architecture changes

Removed:

- TIDAL login UI;
- OAuth;
- PKCE;
- server sessions;
- access and refresh tokens;
- token renewal.

Added:

- server-side YouTube API key;
- YouTube result filtering and ranking;
- quota-conscious caching;
- embedded IFrame playback;
- player event and error handling;
- a YouTube feasibility spike.

### Evaluation

The YouTube design keeps the technically interesting parts of MoodFlow while reducing fragile authentication work.

The largest remaining risks are:

- inconsistent public search results;
- the daily search quota;
- videos becoming unavailable or non-embeddable.

These risks are isolated in the search, ranking, cache, and player modules.

### Human decision

Approve YouTube as the version 1 music provider.

---

## Template for future entries

## Entry N: [Activity name]

**Date:**  
**Stage:**  
**AI tool:**  
**Model:**  
**Agent role:**

### Task

### Representative prompts

### Files or changes produced

### Verification and tests

### Problems or corrections

### Evaluation

### Human decision
