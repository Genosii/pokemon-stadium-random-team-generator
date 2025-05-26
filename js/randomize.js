const MODES = {
  s1Gym: { name: "Gym Leader Castle" },
  s1Poke: { name: "Poké Cup" },
  s1Prime: { name: "Prime Cup" },
  s1Pika: { name: "Pika Cup" },
  s1Petit: { name: "Petit Cup" },
  s2Gym: { name: "Gym Leader Castle" },
  s2Poke: { name: "Poké Cup" },
  s2Prime: { name: "Prime Cup" },
  s2Challenge: { name: "Challenge Cup" },
  s2Petit: { name: "Petit Cup" }
};

const PETIT_CUP_POKEMON = [
  "bulbasaur", "charmander", "squirtle", "caterpie", "weedle", "pidgey", "rattata", "spearow", "ekans", "pikachu",
  "sandshrew", "nidoranf", "nidoranm", "clefairy", "vulpix", "jigglypuff", "zubat", "oddish", "paras", "diglett",
  "meowth", "psyduck", "growlithe", "poliwag", "abra", "machop", "bellsprout", "geodude", "magnemite", "farfetchd",
  "shellder", "gastly", "krabby", "voltorb", "exeggcute", "cubone", "koffing", "horsea", "goldeen", "magikarp",
  "ditto", "eevee", "omanyte", "kabuto", "dratini"
];

const PIKA_CUP_POKEMON = [
  "bulbasaur","ivysaur","charmander","charmeleon","squirtle","wartortle","caterpie","metapod","butterfree","weedle",
  "kakuna","beedrill","pidgey","pidgeotto","rattata","raticate","spearow","fearow","ekans","pikachu","raichu",
  "sandshrew","nidoranf","nidorina","nidoqueen","nidoranm","nidorino","nidoking","clefairy","clefable","vulpix",
  "ninetales","jigglypuff","wigglytuff","zubat","oddish","paras","parasect","venonat","diglett","dugtrio","meowth",
  "psyduck","golduck","mankey","growlithe","arcanine","poliwag","poliwhirl","poliwrath","abra","kadabra","alakazam",
  "machop","machamp","bellsprout","tentacool","tentacruel","geodude","ponyta","slowpoke","slowbro","magnemite",
  "farfetchd","doduo","seel","dewgong","shellder","cloyster","gastly","haunter","gengar","onix","drowzee","krabby",
  "kingler","voltorb","electrode","exeggcute","exeggutor","cubone","hitmonlee","hitmonchan","lickitung","koffing",
  "rhyhorn","rhydon","chansey","tangela","horsea","seadra","goldeen","staryu","starmie","mrmime","scyther","jynx",
  "pinsir","magikarp","gyarados","lapras","ditto","porygon","omanyte","kabuto","dratini","dragonair"
];

// Gen 2 move exclusion list for Stadium 1
const GEN2_MOVE_EXCLUSIONS = [
  "Aeroblast","Ancient Power","Attract","Baton Pass","Beat Up","Belly Drum","Bone Rush","Charm","Conversion 2","Cotton Spore","Cross Chop","Crunch","Curse","Destiny Bond","Detect","Dragon Breath","Dynamic Punch","Encore","Endure","Extreme Speed","False Swipe","Feint Attack","Flail","Flame Wheel","Foresight","Frustration","Fury Cutter","Future Sight","Giga Drain","Heal Bell","Hidden Power","Icy Wind","Iron Tail","Lock-On","Mach Punch","Magnitude","Mean Look","Megahorn","Metal Claw","Milk Drink","Mind Reader","Mirror Coat","Moonlight","Morning Sun","Mud-Slap","Nightmare","Octazooka","Outrage","Pain Split","Perish Song","Powder Snow","Present","Protect","Psych Up","Pursuit","Rain Dance","Rapid Spin","Return","Reversal","Rock Smash","Rollout","Sacred Fire","Safeguard","Sandstorm","Scary Face","Shadow Ball","Sketch","Sleep Talk","Sludge Bomb","Snore","Spark","Spider Web","Spikes","Spite","Steel Wing","Sunny Day","Swagger","Sweet Kiss","Sweet Scent","Synthesis","Thief","Triple Kick","Twister","Vital Throw","Whirlpool","Zap Cannon"
].map(m => m.toLowerCase().replace(/\s+/g, ""));

// Helper: get only Gen 1-legal moves for Stadium 1
function getLegalStadium1Moves(pokemonName) {
  const poke = pokemonData[pokemonName];
  if (!poke || !poke.learnset) return [];
  // pokemon_data.json: {pokemon: {learnset: {move: [methods]}}}
  const learnset = poke.learnset;
  // Only allow moves:
  // - Not in GEN2_MOVE_EXCLUSIONS
  // - That have a Gen 1 learn method (method starts with '1')
  return Object.keys(learnset).filter(move => {
    const moveKey = move.toLowerCase().replace(/\s+/g, "");
    if (GEN2_MOVE_EXCLUSIONS.includes(moveKey)) return false;
    const methods = learnset[move];
    if (!Array.isArray(methods)) return false;
    return methods.some(m => m.startsWith('1'));
  });
}

let pokemonData = {};
let moveData = {};
let currentMode = 's1gym';
let currentFixedTeam = [];

function getMoveType(move) {
  let normalized = move.toLowerCase().replace(/\s+/g, "");
  
  // Special case for Hidden Power - assign random type
  if (normalized === "hiddenpower") {
    const types = [
      "fighting", "flying", "poison", "ground", 
      "rock", "bug", "ghost", "steel", "fire", 
      "water", "grass", "electric", "psychic", "ice", 
      "dragon", "dark"
    ];
    return types[Math.floor(Math.random() * types.length)];
  }
  
  return moveData?.moveTypes?.[normalized]?.type?.toLowerCase() || "normal";
}

function getRandomLevel() {
  return Math.floor(Math.random() * 96) + 5; // 5-100 inclusive
}

function getLevelForMode(mode) {
  if (mode === 's1Petit' || mode === 's2Petit') {
    return Math.floor(Math.random() * 6) + 25; // 25-30
  }
  if (mode === 's1Pika') {
    return Math.floor(Math.random() * 6) + 15; // 15-20
  }
  if (mode === 's1Poke' || mode === 's2Poke') {
    return Math.floor(Math.random() * 6) + 50; // 50-55
  }
  if (mode === 's1Prime' || mode === 's2Prime') {
    return 100;
  }
  // Default: 5-100
  return Math.floor(Math.random() * 96) + 5;
}

function getRandomGender(name) {
  // Genderless Pokémon (e.g., Magnemite, Voltorb, etc.)
  const genderless = [
    'magnemite', 'magneton', 'voltorb', 'electrode', 'staryu', 'starmie', 'ditto', 'porygon', 'articuno', 'zapdos', 'moltres', 'mewtwo', 'mew',
    'unown', 'wobbuffet', 'lugia', 'hooh', 'celebi'
  ];
  if (genderless.includes(name)) return ' | — | ';
  return Math.random() < 0.5 ? ' | ♂ | ' : ' | ♀ | ';
}

function getRandomItem(pokemonName) {
  // Always return "No Item" for Stadium 1 modes
  if (currentMode.startsWith('s1')) return "No Item";
  
  // List of all possible items for Stadium 2
  const items = [
    'Berry', 'Bitter Berry', 'Burnt Berry', 'Gold Berry', 'Ice Berry', 'Mint Berry', 'Miracle Berry', 'Mystery Berry', 'PrzCure Berry', 'PsnCure Berry',
    'Berserk Gene', 'Black Belt', 'Black Glasses', 'BrightPowder', 'Charcoal', 'Dragon Fang', 'Focus Band', 'Hard Stone', "King's Rock", 'Leftovers', 'Light Ball',
    'Lucky Punch', 'Magnet', 'Metal Coat', 'Metal Powder', 'Miracle Seed', 'Mystic Water', 'NeverMeltIce', 'No Item', 'Pink Bow', 'Poison Barb', 'Polkadot Bow',
    'Quick Claw', 'Scope Lens', 'Sharp Beak', 'Silver Powder', 'Soft Sand', 'Spell Tag', 'Stick', 'Thick Club', 'Twisted Spoon', 'Berry Juice'
  ];

  // Special item rules for Stadium 2
  if (pokemonName === 'pikachu') return 'Light Ball';
  if (pokemonName === 'chansey') return 'Lucky Punch';
  if (pokemonName === 'ditto') return 'Metal Powder';
  if (pokemonName === 'farfetchd') return 'Stick';
  if (pokemonName === 'marowak') return 'Thick Club';

  // Remove special items from pool for other Pokémon
  const filtered = items.filter(item => {
    if (['Light Ball', 'Lucky Punch', 'Metal Powder', 'Stick', 'Thick Club'].includes(item)) return false;
    return true;
  });
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function renderTeam(team, containerId, showMoves = true) {
  const container = document.getElementById(containerId);
  const oldCards = Array.from(container.querySelectorAll('.pokemon-card'));

  if (oldCards.length) {
    // Animate old cards out
    oldCards.forEach((card, i) => {
      setTimeout(() => card.classList.add('slide-out'), i * 50);
    });
    // Wait for animation, then clear and add new cards
    setTimeout(() => {
      container.innerHTML = '';
      revealNewCards();
    }, 100 + oldCards.length * 50);
  } else {
    // No old cards, just reveal new ones
    container.innerHTML = '';
    revealNewCards();
  }

  function revealNewCards() {
    const isBattle = containerId === 'battle-team';
    team.forEach(poke => {
      let movesHtml = '';
      let nameHtml = '';
      // Extra info
      const level = poke.level || getRandomLevel();
      const gender = poke.gender || getRandomGender(poke.name);
      // Extra info row - removed noItem check since we want to show "No Item" for Stadium 1
      let extraInfoHtml = `
        <div class="poke-extra-info">
          <span title="Level">Lv. ${level}</span>
          <span title="Gender">${gender}</span>
          ${poke.item ? `<span title=\"Held Item\">${poke.item}</span>` : ''}
        </div>`;

      // Moves row (now always below extra info)
      if (showMoves) {
        nameHtml = `
          <div class="profile-name-container">
            <div class="profile-name${poke.shiny ? ' shiny' : ''}">${poke.name ? poke.name.toUpperCase() : ''}</div>
          </div>
        `;
        const moves = Array.isArray(poke.moves) ? poke.moves.map(move => {
          const moveKey = move.toLowerCase().replace(/\s+/g, "");
          const moveObj = moveData?.moveTypes?.[moveKey];
          return `<div class="move-box type-${getMoveType(move)}">${moveObj && moveObj.display ? moveObj.display : move}</div>`;
        }).join('') : '';
        movesHtml = `
          <div class="moves-section moves-grid" style="margin-top:8px;">
            ${moves}
          </div>
        `;
      }
      // Only render if poke.name and poke.dex are valid
      if (poke.name && poke.dex) {
        container.innerHTML += `
          <div class="pokemon-card${isBattle ? ' battle-card' : ''}">
            ${!isBattle ? nameHtml : ''}
            <div class="profile-bg">
              <div class="profile-img-mask">
                <img src="assets/${poke.shiny ? 'shiny' : 'normal'}-models/${poke.dex}.gif" alt="${poke.name}">
              </div>
            </div>
            <div class="card-info-moves">
              ${!isBattle ? extraInfoHtml : ''}
              ${!isBattle ? movesHtml : ''}
            </div>
          </div>
        `;
      }
    });

    // Animate reveal
    const cards = container.querySelectorAll('.pokemon-card');
    cards.forEach(card => void card.offsetWidth);
    setTimeout(() => {
    cards.forEach((card, i) => {
      setTimeout(() => card.classList.add('reveal'), i * 80);
    });
  }, 10);
  }
}

function randomSample(arr, n) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function filterPokemonForMode(mode) {
  // Helper to check if a Pokémon is Gen 2 (dex 152–251)
  function isGen2(name) {
    const dex = pokemonData[name]?.dex;
    return dex >= 152 && dex <= 251;
  }

  // List of Pokémon only available in s2Petit (Petit Cup, Stadium 2)
  const S2PETIT_ONLY = [
    "chikorita", "cyndaquil", "totodile", "sentret", "hoothoot", "ledyba", "spinarak", "chinchou",
    "pichu", "cleffa", "igglybuff", "togepi", "natu", "mareep", "marill", "hoppip", "sunkern", 
    "wooper", "pineco", "snubbull", "teddiursa", "slugma", "swinub", "remoraid", "houndour", 
    "phanpy", "tyrogue", "smoochum", "elekid", "magby", "larvitar"
  ];

  if (mode === 's1Petit') {
    // Stadium 1 Petit Cup: filter out Gen 2 Pokémon and s2Petit-only Pokémon
    return PETIT_CUP_POKEMON.filter(name =>
      pokemonData[name]?.learnset &&
      typeof pokemonData[name].learnset === 'object' &&
      !isGen2(name) &&
      !S2PETIT_ONLY.includes(name)
    );
  }
  if (mode === 's2Petit') {
    // Stadium 2 Petit Cup: allow all PETIT_CUP_POKEMON and S2PETIT_ONLY Pokémon
    return PETIT_CUP_POKEMON.concat(S2PETIT_ONLY).filter((name, idx, arr) =>
      arr.indexOf(name) === idx && // deduplicate
      pokemonData[name]?.learnset && typeof pokemonData[name].learnset === 'object'
    );
  }
  if (mode === 's1Pika') {
    // Stadium 1 Pika Cup: filter out Gen 2 Pokémon
    return PIKA_CUP_POKEMON.filter(name =>
      pokemonData[name]?.learnset &&
      typeof pokemonData[name].learnset === 'object' &&
      !isGen2(name)
    );
  }
  if (mode === 's1Poke') {
    // Stadium 1 Poké Cup: filter out Gen 2 Pokémon and Mew/Mewtwo
    return Object.keys(pokemonData)
      .filter(name =>
        name !== 'mewtwo' &&
        name !== 'mew' &&
        pokemonData[name]?.learnset &&
        typeof pokemonData[name].learnset === 'object' &&
        !isGen2(name)
      );
  }
  if (mode === 's1Prime' || mode === 's1Gym') {
    // Stadium 1 Prime Cup and Gym Leader Castle: allow Mewtwo and Mew, but filter out Gen 2 Pokémon
    return Object.keys(pokemonData)
      .filter(name =>
        pokemonData[name]?.learnset &&
        typeof pokemonData[name].learnset === 'object' &&
        !isGen2(name)
      );
  }
  if (mode === 's2Petit') {
    // Stadium 2 Petit Cup: allow all
    return PETIT_CUP_POKEMON.filter(name =>
      pokemonData[name]?.learnset && typeof pokemonData[name].learnset === 'object'
    );
  }
  if (mode === 's2Pika') {
    // Stadium 2 Pika Cup: allow all
    return PIKA_CUP_POKEMON.filter(name =>
      pokemonData[name]?.learnset && typeof pokemonData[name].learnset === 'object'
    );
  }
  if (mode === 's2Poke') {
    // Stadium 2 Poké Cup: exclude Mewtwo, Mew, Lugia, Ho-oh, Celebi
    return Object.keys(pokemonData)
      .filter(name =>
        name !== 'mewtwo' &&
        name !== 'mew' &&
        name !== 'lugia' &&
        name !== 'hooh' &&
        name !== 'celebi' &&
        pokemonData[name]?.learnset &&
        typeof pokemonData[name].learnset === 'object'
      );
  }
  if (mode === 's2Prime' || mode === 's2Gym' || mode === 's2Challenge') {
    // Stadium 2 Prime/Gym/Challenge: allow all
    return Object.keys(pokemonData)
      .filter(name =>
        pokemonData[name]?.learnset &&
        typeof pokemonData[name].learnset === 'object'
      );
  }
  // Default: all Pokémon with a learnset
  return Object.keys(pokemonData).filter(name =>
    pokemonData[name]?.learnset && typeof pokemonData[name].learnset === 'object'
  );
}

// Simplify getMoveInheritance function since moves are already inherited
const moveCache = new Map();
function getMoveInheritance(pokemonName, currentMode) {
  const cacheKey = `${pokemonName}_${currentMode}`;
  if (moveCache.has(cacheKey)) return moveCache.get(cacheKey);

  if (!pokemonData[pokemonName] || !pokemonData[pokemonName].learnset) {
    console.error(`No learnset found for ${pokemonName}`);
    return ["Struggle"];
  }

  let moves;
  if (pokemonName.toLowerCase() === 'smeargle') {
    moves = Object.keys(moveData.moveTypes);
  } else if (currentMode.startsWith('s1')) {
    moves = getLegalStadium1Moves(pokemonName);
  } else {
    moves = Object.keys(pokemonData[pokemonName].learnset);
  }
  
  if (!moves || moves.length === 0) {
    console.warn(`No moves found for ${pokemonName}, defaulting to Struggle`);
    moves = ["Struggle"];
  }

  moveCache.set(cacheKey, moves);
  return moves;
}

function randomSample(arr, n) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function filterPokemonForMode(mode) {
  // Helper to check if a Pokémon is Gen 2 (dex 152–251)
  function isGen2(name) {
    const dex = pokemonData[name]?.dex;
    return dex >= 152 && dex <= 251;
  }

  // List of Pokémon only available in s2Petit (Petit Cup, Stadium 2)
  const S2PETIT_ONLY = [
    "chikorita", "cyndaquil", "totodile", "sentret", "hoothoot", "ledyba", "spinarak", "chinchou",
    "pichu", "cleffa", "igglybuff", "togepi", "natu", "mareep", "marill", "hoppip", "sunkern", 
    "wooper", "pineco", "snubbull", "teddiursa", "slugma", "swinub", "remoraid", "houndour", 
    "phanpy", "tyrogue", "smoochum", "elekid", "magby", "larvitar"
  ];

  if (mode === 's1Petit') {
    // Stadium 1 Petit Cup: filter out Gen 2 Pokémon and s2Petit-only Pokémon
    return PETIT_CUP_POKEMON.filter(name =>
      pokemonData[name]?.learnset &&
      typeof pokemonData[name].learnset === 'object' &&
      !isGen2(name) &&
      !S2PETIT_ONLY.includes(name)
    );
  }
  if (mode === 's2Petit') {
    // Stadium 2 Petit Cup: allow all PETIT_CUP_POKEMON and S2PETIT_ONLY Pokémon
    return PETIT_CUP_POKEMON.concat(S2PETIT_ONLY).filter((name, idx, arr) =>
      arr.indexOf(name) === idx && // deduplicate
      pokemonData[name]?.learnset && typeof pokemonData[name].learnset === 'object'
    );
  }
  if (mode === 's1Pika') {
    // Stadium 1 Pika Cup: filter out Gen 2 Pokémon
    return PIKA_CUP_POKEMON.filter(name =>
      pokemonData[name]?.learnset &&
      typeof pokemonData[name].learnset === 'object' &&
      !isGen2(name)
    );
  }
  if (mode === 's1Poke') {
    // Stadium 1 Poké Cup: filter out Gen 2 Pokémon and Mew/Mewtwo
    return Object.keys(pokemonData)
      .filter(name =>
        name !== 'mewtwo' &&
        name !== 'mew' &&
        pokemonData[name]?.learnset &&
        typeof pokemonData[name].learnset === 'object' &&
        !isGen2(name)
      );
  }
  if (mode === 's1Prime' || mode === 's1Gym') {
    // Stadium 1 Prime Cup and Gym Leader Castle: allow Mewtwo and Mew, but filter out Gen 2 Pokémon
    return Object.keys(pokemonData)
      .filter(name =>
        pokemonData[name]?.learnset &&
        typeof pokemonData[name].learnset === 'object' &&
        !isGen2(name)
      );
  }
  if (mode === 's2Petit') {
    // Stadium 2 Petit Cup: allow all
    return PETIT_CUP_POKEMON.filter(name =>
      pokemonData[name]?.learnset && typeof pokemonData[name].learnset === 'object'
    );
  }
  if (mode === 's2Pika') {
    // Stadium 2 Pika Cup: allow all
    return PIKA_CUP_POKEMON.filter(name =>
      pokemonData[name]?.learnset && typeof pokemonData[name].learnset === 'object'
    );
  }
  if (mode === 's2Poke') {
    // Stadium 2 Poké Cup: exclude Mewtwo, Mew, Lugia, Ho-oh, Celebi
    return Object.keys(pokemonData)
      .filter(name =>
        name !== 'mewtwo' &&
        name !== 'mew' &&
        name !== 'lugia' &&
        name !== 'hooh' &&
        name !== 'celebi' &&
        pokemonData[name]?.learnset &&
        typeof pokemonData[name].learnset === 'object'
      );
  }
  if (mode === 's2Prime' || mode === 's2Gym' || mode === 's2Challenge') {
    // Stadium 2 Prime/Gym/Challenge: allow all
    return Object.keys(pokemonData)
      .filter(name =>
        pokemonData[name]?.learnset &&
        typeof pokemonData[name].learnset === 'object'
      );
  }
  // Default: all Pokémon with a learnset
  return Object.keys(pokemonData).filter(name =>
    pokemonData[name]?.learnset && typeof pokemonData[name].learnset === 'object'
  );
}

function isValidLevelSum(levels, maxSum) {
  const sum = levels.reduce((a, b) => a + b, 0);
  return sum <= maxSum;
}

function isShiny() {
  // 1/8192 chance, only in Stadium 2
  return Math.floor(Math.random() * 50) === 0;
}

function randomizeFullTeam() {
  const pool = filterPokemonForMode(currentMode);
  
  // Get mode configuration first
  const modeConfig = {
    's1Petit': { min: 25, max: 30, sum: 80, fixed: 26 },
    's2Petit': { min: 25, max: 30, sum: 80, fixed: 26 },
    's1Pika': { min: 15, max: 20, sum: 50, fixed: 16 },
    's1Poke': { min: 50, max: 55, sum: 155, fixed: 51 },
    's2Poke': { min: 50, max: 55, sum: 155, fixed: 51 },
    's1Prime': { level: 100 },
    's2Prime': { level: 100 },
    's1Gym': { level: 100 },
    's2Gym': { level: 100 }
  }[currentMode];
  
  // Add debug logging
  console.log(`Pool size for ${currentMode}: ${pool.length} Pokemon`);
  if (pool.length < 6) {
    console.error(`Not enough Pokemon in pool for ${currentMode}. Only found ${pool.length} Pokemon.`);
    return;
  }

  // Retry logic for team generation
  let attempts = 0;
  let team;
  
  while (attempts < 3) {
    team = randomSample(pool, 6).map(name => {
      // Validate required data
      if (!pokemonData[name] || !pokemonData[name].dex) {
        console.error(`Missing data for Pokemon: ${name}`);
        return null;
      }
      
      // Get moves with validation
      const movePool = getMoveInheritance(name, currentMode);
      if (!movePool || movePool.length === 0) {
        console.error(`No valid moves for ${name}`);
        return null;
      }
      
      const moves = randomSample(movePool, 4);
      while (moves.length < 4) moves.push("Struggle");
      
      // Add shiny property for Stadium 2
      const isShinyPokemon = currentMode.startsWith('s2') && isShiny();
      
      return {
        name,
        dex: pokemonData[name].dex,
        moves,
        level: modeConfig?.fixed || modeConfig?.level || getLevelForMode(currentMode),
        gender: getRandomGender(name),
        item: getRandomItem(name),
        shiny: isShinyPokemon
      };
    }).filter(p => p !== null);

    // Check if we got 6 valid Pokémon
    if (team.length === 6) break;
    
    attempts++;
    console.warn(`Retry ${attempts}: Got ${team.length} Pokemon instead of 6`);
  }

  // If still no valid team after retries, show error
  if (!team || team.length < 6) {
    console.error('Failed to generate valid team after retries');
    return;
  }

  // Validate level sums for restricted modes
  if (modeConfig?.sum && !isValidLevelSum(team.map(p => p.level), modeConfig.sum)) {
    team.forEach(p => p.level = modeConfig.fixed);
  }

  currentFixedTeam = team;
  renderTeam(team, 'fixed-team');
  document.getElementById('battle-team').innerHTML = '';
}

function generateBattleTeam() {
  if (!currentFixedTeam.length) return;
  let team = [];
  if (["s1Petit","s2Petit","s1Pika","s1Poke","s2Poke"].includes(currentMode)) {
    let levelSumMax = 80;
    if (currentMode === "s1Pika") levelSumMax = 50;
    if (currentMode === "s1Poke" || currentMode === "s2Poke") levelSumMax = 155;
    // Try to find a valid combination
    const indices = [0,1,2,3,4,5];
    let found = false;
    for (let i = 0; i < 4; i++) {
      for (let j = i+1; j < 5; j++) {
        for (let k = j+1; k < 6; k++) {
          const sum = currentFixedTeam[i].level + currentFixedTeam[j].level + currentFixedTeam[k].level;
          if (sum <= levelSumMax) {
            team = [currentFixedTeam[i], currentFixedTeam[j], currentFixedTeam[k]];
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (found) break;
    }
    if (!team.length) {
      // fallback: just pick first 3
      team = currentFixedTeam.slice(0,3);
    }
    renderTeam(team, 'battle-team', false);
  } else {
    const battleTeam = randomSample(currentFixedTeam, 3);
    renderTeam(battleTeam, 'battle-team', false);
  }
}

function setMode(mode) {
  if (!MODES.hasOwnProperty(mode)) {
    console.warn('Invalid mode:', mode);
    return;
  }
  
  // Animate transition
  const landing = document.getElementById('landing-page');
  const generator = document.getElementById('generator-page');
  
  landing.classList.add('fade-out');
  
  // Wait for fade out before showing generator
  setTimeout(() => {
    landing.classList.add('hidden');
    generator.classList.remove('hidden');
    
    // Trigger reflow
    void generator.offsetWidth;
    
    // Fade in generator
    generator.classList.add('fade-in');
    document.getElementById('sidebar-toggle').classList.remove('hidden-on-landing');
    
    currentMode = mode;
    
    // Update titles
    if (mode.startsWith('s2')) {
      document.querySelector('.title-row h1').textContent = "Pokémon Stadium 2";
    } else {
      document.querySelector('.title-row h1').textContent = "Pokémon Stadium";
    }
    document.getElementById('subtitle').textContent = MODES[mode].name;
    
    // Clear teams
    document.getElementById('fixed-team').innerHTML = '';
    document.getElementById('battle-team').innerHTML = '';
    currentFixedTeam = [];
    
    // Update active state
    document.querySelectorAll('.nav-btn').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.mode === mode)
    );
  }, 400); // Match CSS transition duration
}

document.addEventListener('DOMContentLoaded', () => {
  Promise.all([
    fetch('json/pokemon_data.json').then(res => res.json()).catch(() => ({})),
    fetch('json/pokemon_moves.json').then(res => res.json()).catch(() => ({}))
  ]).then(([pokeData, moveJson]) => {
    if (!pokeData || !moveJson) {
      console.error('Failed to load required data');
      return;
    }
    pokemonData = pokeData;
    moveData = moveJson;
    // Remove initial setMode call - let user pick from landing page
  });

  document.getElementById('btn-fixed-team').onclick = randomizeFullTeam;
  document.getElementById('btn-battle-team').onclick = generateBattleTeam;
  
  // Update nav button click handlers 
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
      setMode(btn.dataset.mode);
      if (sidebar.classList.contains('active')) {
        closeSidebar();
      }
    };
  });

  // Sidebar hamburger logic
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const openBtn = document.getElementById('sidebar-toggle');
  const closeBtn = document.getElementById('sidebar-close');

  function openSidebar() {
    sidebar.classList.add('active');
    overlay.classList.add('active');
    openBtn.classList.add('active'); // <-- This is correct if openBtn is the button
  }
  function closeSidebar() {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    openBtn.classList.remove('active'); // <-- This is correct if openBtn is the button
  }

  openBtn.addEventListener('click', function() {
    if (sidebar.classList.contains('active')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });
  overlay.addEventListener('click', closeSidebar);
});

