# Flag Match (Momma Snake)

A stateless, minimalist, pastel-themed flag matching single-page application (SPA) designed specifically for 4-year-olds and preschoolers.

## Features

- **Child-Friendly Gameplay**:
  - **Type A Questions (50%)**: Large flag prompt with 3 country name choices.
  - **Type B Questions (50%)**: Clear country name prompt with 3 flag choices (plus a speech button to sound out the country name).
  - Massive touch targets with soft feedback.
  - No double-tap zoom delay (`touch-action: manipulation`).
  - Font: Large, rounded **Nunito** sans-serif typography to aid sounding out letters.

- **Non-Punitive Feedback**:
  - **Correct**: Bright emerald highlight, soft harmonic chime via Web Audio API, 1.5s celebratory pause before next question.
  - **Incorrect**: Soft rose highlight with a gentle CSS shake and a subtle wooden pop sound. No harsh buzzers. Stays on screen until the child identifies the correct flag/name.

- **Spaced Repetition**:
  - Randomized country queue from a pool of 18 countries.
  - If incorrect on first try, the country is re-inserted 2 positions back in the queue to reinforce learning naturally.

- **Momma Snake Visual Progression**:
  - Starts as 2 segments (cute expressive head + tail).
  - Each correct answer (+1) feeds Momma Snake and adds a green body segment with a joyful pop animation.
  - Reaching **11 correct answers** triggers the full-width Momma Snake celebration with a happy undulating wiggle dance, confetti, and a clean "Play Again" button.

- **Zero Dependencies & Universal Flag SVGs**:
  - 18 custom-crafted, scalable vector SVG flags embedded directly in code.
  - Solves the Windows emoji issue where country flags render as two-letter country codes instead of colored flags.
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
