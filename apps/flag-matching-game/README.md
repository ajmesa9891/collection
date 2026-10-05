# Flag Match (Momma Snake)

A stateless, minimalist, pastel-themed flag matching single-page application (SPA) designed specifically for 4-year-olds and preschoolers.

## Features

- **Child-Friendly & Distraction-Free**:
  - Zero unnecessary headers or text banners to keep focus on the matching activity.
  - Discreet, optional sound toggle.
  - Large, rounded **Nunito** sans-serif typography to aid sounding out letters.
  - Massive touch targets with `touch-action: manipulation` to prevent double-tap zoom lag.

- **50/50 Question Types**:
  - **Type A**: Large flag prompt with 3 country name choices.
  - **Type B**: Clear country name prompt with 3 flag choices (plus a speech button to sound out the country name).

- **Non-Punitive Feedback**:
  - **Correct**: Bright emerald highlight, soft harmonic chime via Web Audio API, 1.5s celebratory pause before next question.
  - **Incorrect**: Soft rose highlight with a gentle CSS shake and a subtle wooden pop sound. No harsh buzzers. Stays on screen until the child identifies the correct flag/name.

- **Spaced Repetition**:
  - Randomized country queue from a pool of 18 countries.
  - If incorrect on first try, the country is re-inserted 2 positions back in the queue to reinforce learning naturally.

- **Momma Snake Visual Progression (Mobile-Optimized)**:
  - 13 segments (Head + 11 body slots + Tail) visible on a compact bottom track that fits 100% on any mobile screen.
  - Unfilled slots are shown as soft dashed gray circles so the child can clearly see their progress towards the goal.
  - Each correct answer fills the next slot with bright emerald green and pops into place.

- **Momma Snake on a Nest Win Celebration**:
  - Reaching **11 correct answers** triggers the victory screen featuring an animated illustration of **Momma Snake cozy on her nest**, gently bobbing and wagging her tail with floating love hearts.
  - Responsive vector illustration that fits comfortably on any phone screen.
  - "Play Again" button cleanly resets state.

- **Universal Vector SVG Flags**:
  - 18 custom-crafted, scalable vector SVG flags embedded directly in code.
  - Solves the Windows emoji limitation where country flags render as two-letter country codes instead of colored flags.
  - No backend, no local storage, works 100% offline.

## Target Countries

1. Spain
2. Argentina
3. France
4. England
5. Norway
6. Italy
7. Mexico
8. Colombia
9. Venezuela
10. United States
11. Canada
12. Japan
13. South Korea
14. Switzerland
15. Sweden
16. Morocco
17. Brazil
18. Portugal
