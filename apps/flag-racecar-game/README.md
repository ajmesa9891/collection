# Flag Racer (Grand Prix Track)

A child-friendly, racecar-themed flag matching single-page application (SPA) designed for 4-year-olds and preschoolers.

## Highlights & Mechanics

- **Screen-Surrounding Racetrack Perimeter**:
  - The racetrack surrounds the entire screen with asphalt, red-and-white rumble strip kerbs, yellow dashed centerlines, and a checkered start/finish gantry.
  - Occupies the entire viewport without requiring any vertical scrolling (`h-screen overflow-hidden`).
  - Starts in the lower-left corner and travels clockwise around the perimeter: **Right** along the bottom &rarr; **Up** along the right side &rarr; **Left** along the top &rarr; **Down** along the left side &rarr; crosses the **Finish Line** at the lower-left!
  - **Pixel-Perfect Centering**: The car sprite is rendered directly inside the circuit SVG group, ensuring it remains exactly centered on the yellow dashed track centerline throughout all straightaways and corners.
  
- **Race Progression**:
  - **Scale**: 40 spots total from start to finish line.
  - **Correct Answer**: Car animates moving forward **+4 spots**, triggers an accelerating Ferrari engine rev sound (`VROOOOM!`), with animated exhaust flames and speed streaks.
  - **Wrong Answer**: Car moves backward **-1 spot**, triggers a realistic tire screech & crash impact sound, with bumper wobble and tire smoke.
  - Reaching spot 40 triggers the Grand Prix victory celebration!

- **Toddler-Friendly Design**:
  - Big touch targets, rounded Nunito typography, and high contrast.
  - 50/50 Question Mix:
    - **Type A**: Flag displayed &rarr; 3 country name choices.
    - **Type B**: Country name badge with sound-out (`🗣️`) button &rarr; 3 flag choices.
  - Non-punitive spaced repetition: Missed flags are automatically re-inserted 2 steps later in the queue to build confidence.

- **Audio Engine (Authentic Racing Sounds & Background Music)**:
  - **Forward Movement Sound**: Always plays authentic **Tire Spin & Drive-Off** (`./vroom_driveaway.mp3`) with engine rev, tire chirp, and peel-out acceleration!
  - **Background Music (`./happy.mp3`)**: Cheerful, upbeat arcade soundtrack tuned to a gentle, kid-friendly lower volume (`0.20` vs `0.90` for SFX).
  - **Realistic Crash / Skid (`./crash.mp3`)**: Tire screech and gentle bumper bump when answering incorrectly (-1 spot).
  - **Grand Prix Victory Celebration**:
    - **Extended Finish Line Crossing Sprint**: Car blasts across the checkered line and down the straightaway in an extended, high-speed victory sprint with glowing exhaust flames and double speed streaks.
    - **Flashing Gantry & Waving Flags**: Checkered starting gantry lights up in gold.
    - **Kids Cheering Audio (`./cheer.mp3`)**: Cheering kids & applause accompanied by celebratory Grand Prix trumpet fanfare!
    - **Multi-Staged Fireworks**: Vibrant fireworks bursts sparkle across the racetrack and sky.
    - **Podium Modal & Confetti Shower**: Golden bouncing trophy and 75+ fluttering ribbons of colorful confetti.
  - Built-in Web Audio synthesis fallbacks to guarantee audio reliability in all environments.
  - Independent **Music (`🎵`)** and **SFX (`🔊` / `🔇`)** toggles. All preferences saved automatically in `localStorage`.

- **Universal Vector Flags (26 Countries)**:
  - Includes all 18 flags from the previous game plus 8 newly requested flags:
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
    19. Australia
    20. Germany
    21. Greece
    22. Ecuador
    23. Ireland
    24. Uruguay
    25. Ghana
    26. Croatia
