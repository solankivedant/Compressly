---
name: next-session
description: Start the next build session for Compressly. Finds the first unticked session in docs/IMPLEMENTATION_PLAN.md (or the one named in the arguments), gathers the matching design, requirements and architecture context, and proposes a short build plan with a phone checklist. Use when Vedant says "next", "what's next", "start session X.Y" or opens a new work session.
argument-hint: "[session id, e.g. 1.5]"
---

# Next session

1. Open `docs/IMPLEMENTATION_PLAN.md`. If `$ARGUMENTS` names a session id, use it. Otherwise pick the **first unticked session** in the earliest phase that isn't finished. A 🔶 session (built, waiting for the phone check) comes first: ask Vedant for the result before starting anything new.
2. Check `docs/DESIGN.md` §12 "Next" for any feature note Vedant wrote. A note there overrides or refines the plan row.
3. Read only the relevant sections:
   - SRS.md rows for the FR/NFR ids in the session row
   - DESIGN.md sections for screens, copy, presets or rules
   - ARCHITECTURE.md sections for where the code goes (and §6–7 if the session touches the engine)
4. Check the current state: `git status`, `git log --oneline -5`, and skim the files you'll touch.
5. Reply to Vedant with:
   - **Session:** id and name
   - **What I'll build:** 2–4 plain-language lines
   - **Files:** new and changed, short list
   - **How you'll check it on the phone:** 3–6 bullet steps
   - **Safety:** "touches originals: yes/no". If yes, `/safety-test` will run before commit
   - **Decisions I made:** any default you picked (one line each)
6. Then build it, following CLAUDE.md's workflow. Don't wait for approval unless a decision changes the product or the safety design.
