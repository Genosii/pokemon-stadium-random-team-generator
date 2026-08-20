# pokemon-stadium-random-team-generator
A web tool to generate a randomized team of 6 Pokemon and a battle team of 3 Pokemon with legal moves in Stadium 1 and 2.

To-do:
- Fix mobile quirks (specifics to be listed)
- Shrink the sprite payload (233MB of GIFs, ~2.5MB per generated team - WebP would cut it ~80%)
- Add the missing Challenge Cup button (s2Challenge and its asset exist but nothing links to it)
- Add assets/favicon.png (currently 404s on every page load)
- Disable "Generate Battle Team" until a full team exists (it silently does nothing)
- Improve background for Stadium 2 nav buttons
- Explore different hover effects and animations
- Add more Unown forms
- Delete redundant JS
- Optimize CSS

Maybe later:
- Version-aware legality (e.g. a level 15 Slowbro is legal in Yellow but not Red/Blue)
- Port the randomizer into Stadium itself (see notes on the Challenge Cup generator)

✅ Add toggle for animated gen 5 sprites and tradeback moves
✅ Export team button for easy imports (downloads a real Red/Blue/Yellow or Gold/Silver/Crystal .sav with the Fixed Team in the party, for use in Stadium via Transfer Pak)
✅ Moveset styles: Chaos (ignores learnsets), Legal, and Stadium (STAB + coverage + support + filler)
✅ Randomize IVs/EVs toggles, and Hidden Power's type derived from DVs
✅ Seed field so a team can be copied, shared and rebuilt exactly
✅ Pool filters: no legendaries, final evolutions only, mono-type team
✅ Legality fixes: real gender ratios, and per-species minimum levels from evolution
   and wild-encounter data (no more level 51 Dragonite or Machamp in Pika Cup)
