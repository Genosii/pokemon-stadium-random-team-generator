// Generates real Game Boy .sav files (Gen 1: Red/Blue/Yellow, Gen 2: Gold/Silver/Crystal)
// containing the randomized "Fixed Team" as the save's party, so it can be loaded into
// an emulator (or flashcart) and used with Pokémon Stadium 1/2 via Transfer Pak.
//
// Byte offsets/structures below were reverse-engineered from the pret/pokered,
// pret/pokeyellow, pret/pokecrystal and pret/pokegold disassemblies, cross-checked
// against PKHeX's save/PKM source. See PR description for the full research notes.

const GEN1_CHAR_A = 0x80;
const TEXT_TERMINATOR = 0x50;
const TEXT_SPACE = 0x7F;

let saveItemData = {};
let saveDataPromise = null;

// Species and move data are already loaded by randomize.js (speciesData/moveIdData),
// so only the item IDs are fetched here, on first export.
function loadSaveData() {
  if (!saveDataPromise) {
    saveDataPromise = fetch('json/item_ids.json')
      .then(res => res.json())
      .then(items => { saveItemData = items; });
  }
  return saveDataPromise;
}

function normalizeMoveKey(move) {
  return move.toLowerCase().replace(/\s+/g, '');
}

// Encodes uppercase text into the Gen 1/2 charmap (A-Z, space), 0x50-terminated,
// padded with 0x50 for the remainder of the buffer.
function encodeGameText(str, maxLen) {
  const bytes = new Uint8Array(maxLen + 1);
  bytes.fill(TEXT_TERMINATOR);
  const upper = String(str).toUpperCase().slice(0, maxLen);
  for (let i = 0; i < upper.length; i++) {
    const c = upper[i];
    if (c === ' ') {
      bytes[i] = TEXT_SPACE;
    } else if (c >= 'A' && c <= 'Z') {
      bytes[i] = GEN1_CHAR_A + (c.charCodeAt(0) - 65);
    } else {
      bytes[i] = TEXT_SPACE; // unsupported character (digits/punctuation not needed here)
    }
  }
  bytes[upper.length] = TEXT_TERMINATOR;
  return bytes;
}

function writeUint16BE(buf, offset, val) {
  buf[offset] = (val >> 8) & 0xFF;
  buf[offset + 1] = val & 0xFF;
}

function writeUint24BE(buf, offset, val) {
  buf[offset] = (val >> 16) & 0xFF;
  buf[offset + 1] = (val >> 8) & 0xFF;
  buf[offset + 2] = val & 0xFF;
}

function packDvWord(atk, def, spd, spc) {
  return [((atk & 0xF) << 4) | (def & 0xF), ((spd & 0xF) << 4) | (spc & 0xF)];
}

// HP DV is never stored directly - it's derived from the low bit of the other four.
function deriveHpDv(atk, def, spd, spc) {
  return ((atk & 1) << 3) | ((def & 1) << 2) | ((spd & 1) << 1) | (spc & 1);
}

// Gen 1/2 shared stat formula (HP differs from other stats by +level+10 vs +5).
function calcStat(base, dv, statExp, level, isHp) {
  const b = Math.min(255, Math.ceil(Math.sqrt(statExp)));
  const bonus = Math.floor(b / 4);
  let stat = Math.floor(((base + dv) * 2 + bonus) * level / 100);
  stat += isHp ? (level + 10) : 5;
  return Math.min(999, stat);
}

// Max PP a move can hold with as many PP Ups (0-3) as fit in the 6-bit PP field.
function computePp(basePp) {
  let ppUps = 3;
  let pp = basePp + ppUps * Math.floor(basePp / 5);
  while (pp > 63 && ppUps > 0) {
    ppUps--;
    pp = basePp + ppUps * Math.floor(basePp / 5);
  }
  return { pp, ppUps };
}

// Standard Gen 1/2 EXP growth curves (only Fast/MediumFast/MediumSlow/Slow exist pre-Gen 3).
function expForLevel(level, growthRate) {
  const n = level;
  let exp;
  switch (growthRate) {
    case 'GROWTH_FAST': exp = 4 * Math.pow(n, 3) / 5; break;
    case 'GROWTH_MEDIUM_SLOW': exp = (6 / 5) * Math.pow(n, 3) - 15 * n * n + 100 * n - 140; break;
    case 'GROWTH_SLOW': exp = 5 * Math.pow(n, 3) / 4; break;
    case 'GROWTH_MEDIUM_FAST':
    default: exp = Math.pow(n, 3); break;
  }
  return Math.max(0, Math.floor(exp));
}

const STAT_EXP_MAX = 65535;
const MAX_DVS = { atk: 15, def: 15, spd: 15, spc: 15 };

// Stat Exp (EV) for a single stat: maxed by default, or randomized 0-65535 per stat
// independently when the "Randomize EVs" toggle is on.
function pickStatExp() {
  return randomizeEVs ? Math.floor(rng() * (STAT_EXP_MAX + 1)) : STAT_EXP_MAX;
}

// DVs are rolled when the team is generated (see randomize.js) so that the cards and
// the save agree on gender, shininess and Hidden Power's type.
function dvsFor(mon) {
  return mon.dvs || MAX_DVS;
}

function moveInfoFor(moveName) {
  return moveIdData[normalizeMoveKey(moveName)] || moveIdData['struggle'];
}

// --- Gen 1 (Red/Blue/Yellow) ---

const GEN1_CHECKSUM_START = 0x2598;
const GEN1_CHECKSUM_END = 0x3523; // exclusive
const GEN1_CHECKSUM_OFFSET = 0x3523;

function gen1Checksum(buf) {
  let sum = 0;
  for (let i = GEN1_CHECKSUM_START; i < GEN1_CHECKSUM_END; i++) sum = (sum + buf[i]) & 0xFF;
  return (~sum) & 0xFF;
}

function writeGen1PartyMon(buf, offset, mon, trainerId) {
  const sp = speciesData[mon.name];
  const dvs = dvsFor(mon);
  const hpDv = deriveHpDv(dvs.atk, dvs.def, dvs.spd, dvs.spc);
  const level = mon.level;
  const hpExp = pickStatExp();
  const atkExp = pickStatExp();
  const defExp = pickStatExp();
  const spdExp = pickStatExp();
  const spcExp = pickStatExp();

  const maxHp = calcStat(sp.hp, hpDv, hpExp, level, true);
  const atkStat = calcStat(sp.attack, dvs.atk, atkExp, level, false);
  const defStat = calcStat(sp.defense, dvs.def, defExp, level, false);
  const spdStat = calcStat(sp.speed, dvs.spd, spdExp, level, false);
  const spcStat = calcStat(sp.specialGen1, dvs.spc, spcExp, level, false);

  const moves = mon.moves.slice(0, 4);
  while (moves.length < 4) moves.push(null);
  const moveIds = moves.map(m => m ? (moveInfoFor(m).id || 0) : 0);

  buf[offset + 0x00] = sp.gen1Internal;
  writeUint16BE(buf, offset + 0x01, maxHp); // current HP
  buf[offset + 0x03] = level;
  buf[offset + 0x04] = 0; // status
  buf[offset + 0x05] = sp.type1;
  buf[offset + 0x06] = sp.type2;
  buf[offset + 0x07] = sp.catchRateGen1 != null ? sp.catchRateGen1 : sp.catchRate;
  for (let i = 0; i < 4; i++) buf[offset + 0x08 + i] = moveIds[i];
  writeUint16BE(buf, offset + 0x0C, trainerId);
  writeUint24BE(buf, offset + 0x0E, expForLevel(level, sp.growthRate));
  writeUint16BE(buf, offset + 0x11, hpExp); // HP EV
  writeUint16BE(buf, offset + 0x13, atkExp); // Attack EV
  writeUint16BE(buf, offset + 0x15, defExp); // Defense EV
  writeUint16BE(buf, offset + 0x17, spdExp); // Speed EV
  writeUint16BE(buf, offset + 0x19, spcExp); // Special EV
  const [dvHi, dvLo] = packDvWord(dvs.atk, dvs.def, dvs.spd, dvs.spc);
  buf[offset + 0x1B] = dvHi;
  buf[offset + 0x1C] = dvLo;
  for (let i = 0; i < 4; i++) {
    if (moveIds[i]) {
      const { pp, ppUps } = computePp(moveInfoFor(moves[i]).pp);
      buf[offset + 0x1D + i] = (ppUps << 6) | (pp & 0x3F);
    } else {
      buf[offset + 0x1D + i] = 0;
    }
  }
  buf[offset + 0x21] = level;
  writeUint16BE(buf, offset + 0x22, maxHp);
  writeUint16BE(buf, offset + 0x24, atkStat);
  writeUint16BE(buf, offset + 0x26, defStat);
  writeUint16BE(buf, offset + 0x28, spdStat);
  writeUint16BE(buf, offset + 0x2A, spcStat);
}

function buildGen1Save(team) {
  const buf = new Uint8Array(0x8000);
  const trainerId = Math.floor(rng() * 65536);
  const trainerName = 'STADIUM';

  buf.set(encodeGameText(trainerName, 7), 0x2598);

  team.forEach(mon => {
    const dex = speciesData[mon.name].dex;
    const byteIdx = Math.floor((dex - 1) / 8);
    const bitIdx = (dex - 1) % 8;
    buf[0x25A3 + byteIdx] |= (1 << bitIdx); // Pokédex owned
    buf[0x25B6 + byteIdx] |= (1 << bitIdx); // Pokédex seen
  });

  buf[0x25CA] = 0xFF; // empty bag item list terminator
  buf[0x25F6] = TEXT_TERMINATOR; // empty rival name
  writeUint16BE(buf, 0x2605, trainerId);

  buf[0x2F2C] = team.length; // party count
  team.forEach((mon, i) => { buf[0x2F2D + i] = speciesData[mon.name].gen1Internal; });
  buf[0x2F2D + team.length] = 0xFF;

  team.forEach((mon, i) => {
    writeGen1PartyMon(buf, 0x2F34 + 44 * i, mon, trainerId);
    buf.set(encodeGameText(trainerName, 7), 0x303C + 11 * i);
    buf.set(encodeGameText(mon.name, 10), 0x307E + 11 * i);
  });

  buf[GEN1_CHECKSUM_OFFSET] = gen1Checksum(buf);
  return buf;
}

// --- Gen 2 (Gold/Silver/Crystal) ---

const GEN2_OFFSETS = {
  crystal: {
    playerName: 0x200B, checkValue1: 0x2008, tid: 0x2009,
    momName: 0x2016, rivalName: 0x2021, redName: 0x202C, greenName: 0x2037,
    party: 0x2865, dexCaught: 0x2A27, dexSeen: 0x2A47,
    checksumStart: 0x2009, checksumEndInclusive: 0x2B82, checksumOffset: 0x2D0D
  },
  goldsilver: {
    playerName: 0x200B, checkValue1: 0x2008, tid: 0x2009,
    momName: 0x2016, rivalName: 0x2021, redName: 0x202C, greenName: 0x2037,
    party: 0x288A, dexCaught: 0x2A4C, dexSeen: 0x2A6C,
    checksumStart: 0x2009, checksumEndInclusive: 0x2D68, checksumOffset: 0x2D69
  }
};

function gen2Checksum(buf, start, endExclusive) {
  let sum = 0;
  for (let i = start; i < endExclusive; i++) sum = (sum + buf[i]) & 0xFFFF;
  return sum;
}

function writeGen2PartyMon(buf, offset, mon, trainerId) {
  const sp = speciesData[mon.name];
  const dvs = dvsFor(mon);
  const hpDv = deriveHpDv(dvs.atk, dvs.def, dvs.spd, dvs.spc);
  const level = mon.level;
  const hpExp = pickStatExp();
  const atkExp = pickStatExp();
  const defExp = pickStatExp();
  const spdExp = pickStatExp();
  const spcExp = pickStatExp(); // shared Stat Exp for both SpAtk and SpDef, like the real games

  const maxHp = calcStat(sp.hp, hpDv, hpExp, level, true);
  const atkStat = calcStat(sp.attack, dvs.atk, atkExp, level, false);
  const defStat = calcStat(sp.defense, dvs.def, defExp, level, false);
  const spdStat = calcStat(sp.speed, dvs.spd, spdExp, level, false);
  const spaStat = calcStat(sp.spAttack, dvs.spc, spcExp, level, false);
  const spdefStat = calcStat(sp.spDefense, dvs.spc, spcExp, level, false);

  const itemId = mon.item != null && saveItemData[mon.item] != null ? saveItemData[mon.item] : 0;

  const moves = mon.moves.slice(0, 4);
  while (moves.length < 4) moves.push(null);
  const moveIds = moves.map(m => m ? (moveInfoFor(m).id || 0) : 0);

  buf[offset + 0x00] = sp.dex; // Gen 2 species byte = National Dex number directly
  buf[offset + 0x01] = itemId;
  for (let i = 0; i < 4; i++) buf[offset + 0x02 + i] = moveIds[i];
  writeUint16BE(buf, offset + 0x06, trainerId);
  writeUint24BE(buf, offset + 0x08, expForLevel(level, sp.growthRate));
  writeUint16BE(buf, offset + 0x0B, hpExp); // HP EV
  writeUint16BE(buf, offset + 0x0D, atkExp); // Attack EV
  writeUint16BE(buf, offset + 0x0F, defExp); // Defense EV
  writeUint16BE(buf, offset + 0x11, spdExp); // Speed EV
  writeUint16BE(buf, offset + 0x13, spcExp); // Special EV (shared SpA/SpD)
  const [dvHi, dvLo] = packDvWord(dvs.atk, dvs.def, dvs.spd, dvs.spc);
  buf[offset + 0x15] = dvHi;
  buf[offset + 0x16] = dvLo;
  for (let i = 0; i < 4; i++) {
    if (moveIds[i]) {
      const { pp, ppUps } = computePp(moveInfoFor(moves[i]).pp);
      buf[offset + 0x17 + i] = (ppUps << 6) | (pp & 0x3F);
    } else {
      buf[offset + 0x17 + i] = 0;
    }
  }
  buf[offset + 0x1B] = 70; // friendship
  buf[offset + 0x1C] = 0; // pokerus
  buf[offset + 0x1D] = 0; // caught data hi (Crystal-only field, harmless zeroed)
  buf[offset + 0x1E] = 0; // caught data lo
  buf[offset + 0x1F] = level;
  buf[offset + 0x20] = 0; // status
  buf[offset + 0x21] = 0; // unused
  writeUint16BE(buf, offset + 0x22, maxHp); // current HP (full health)
  writeUint16BE(buf, offset + 0x24, maxHp);
  writeUint16BE(buf, offset + 0x26, atkStat);
  writeUint16BE(buf, offset + 0x28, defStat);
  writeUint16BE(buf, offset + 0x2A, spdStat);
  writeUint16BE(buf, offset + 0x2C, spaStat);
  writeUint16BE(buf, offset + 0x2E, spdefStat);
}

function buildGen2Save(team, versionKey) {
  const off = GEN2_OFFSETS[versionKey === 'crystal' ? 'crystal' : 'goldsilver'];
  const buf = new Uint8Array(0x8000);
  const trainerId = Math.floor(rng() * 65536);
  const trainerName = 'STADIUM';

  buf.set(encodeGameText(trainerName, 7), off.playerName);
  buf[off.checkValue1] = 0x63;
  writeUint16BE(buf, off.tid, trainerId);
  buf[off.momName] = TEXT_TERMINATOR;
  buf[off.rivalName] = TEXT_TERMINATOR;
  buf[off.redName] = TEXT_TERMINATOR;
  buf[off.greenName] = TEXT_TERMINATOR;

  team.forEach(mon => {
    const dex = speciesData[mon.name].dex;
    const byteIdx = Math.floor((dex - 1) / 8);
    const bitIdx = (dex - 1) % 8;
    buf[off.dexCaught + byteIdx] |= (1 << bitIdx);
    buf[off.dexSeen + byteIdx] |= (1 << bitIdx);
  });

  buf[off.party] = team.length;
  team.forEach((mon, i) => { buf[off.party + 1 + i] = speciesData[mon.name].dex; });
  buf[off.party + 7] = 0xFF;

  const structBase = off.party + 8;
  const otBase = off.party + 0x128;
  const nickBase = off.party + 0x16A;

  team.forEach((mon, i) => {
    writeGen2PartyMon(buf, structBase + 48 * i, mon, trainerId);
    buf.set(encodeGameText(trainerName, 7), otBase + 11 * i);
    buf.set(encodeGameText(mon.name, 10), nickBase + 11 * i);
  });

  const checksum = gen2Checksum(buf, off.checksumStart, off.checksumEndInclusive + 1);
  buf[off.checksumOffset] = checksum & 0xFF; // little-endian
  buf[off.checksumOffset + 1] = (checksum >> 8) & 0xFF;

  return buf;
}

function downloadSaveFile(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let selectedVersion = 'red';

function closeVersionSelect() {
  const select = document.getElementById('export-version');
  if (!select) return;
  select.classList.remove('open');
  select.querySelector('.version-select-trigger').setAttribute('aria-expanded', 'false');
}

function openVersionSelect(focusOption) {
  const select = document.getElementById('export-version');
  select.classList.add('open');
  select.querySelector('.version-select-trigger').setAttribute('aria-expanded', 'true');
  if (focusOption) {
    const active = select.querySelector('.version-select-option.active') || select.querySelector('.version-select-option');
    if (active) active.focus();
  }
}

// Arrow keys/Enter/Escape, matching what a native select gives for free
function handleVersionSelectKeys(e) {
  const select = document.getElementById('export-version');
  const options = [...select.querySelectorAll('.version-select-option')];
  const isOpen = select.classList.contains('open');
  const current = options.indexOf(document.activeElement);

  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!isOpen) return openVersionSelect(true);
    const next = e.key === 'ArrowDown'
      ? Math.min(current + 1, options.length - 1)
      : Math.max(current - 1, 0);
    options[next < 0 ? 0 : next].focus();
  } else if (isOpen && (e.key === 'Enter' || e.key === ' ') && current >= 0) {
    e.preventDefault();
    options[current].click();
  } else if (e.key === 'Escape' && isOpen) {
    closeVersionSelect();
    select.querySelector('.version-select-trigger').focus();
  } else if (e.key === 'Tab' && isOpen) {
    closeVersionSelect();
  }
}

function setSelectedVersion(value, label) {
  const select = document.getElementById('export-version');
  selectedVersion = value;
  select.querySelector('.version-select-label').textContent = label;
  select.querySelectorAll('.version-select-option').forEach(opt => {
    const isActive = opt.dataset.value === value;
    opt.classList.toggle('active', isActive);
    opt.setAttribute('aria-selected', isActive);
  });
}

function populateExportVersions(mode) {
  const select = document.getElementById('export-version');
  if (!select) return;
  const list = select.querySelector('.version-select-list');
  list.innerHTML = '';
  const options = mode.startsWith('s1')
    ? [['red', 'Pokémon Red'], ['blue', 'Pokémon Blue'], ['yellow', 'Pokémon Yellow']]
    : [['crystal', 'Pokémon Crystal'], ['gold', 'Pokémon Gold'], ['silver', 'Pokémon Silver']];
  options.forEach(([value, label]) => {
    const li = document.createElement('li');
    li.className = 'version-select-option';
    li.dataset.value = value;
    li.textContent = label;
    li.setAttribute('role', 'option');
    li.tabIndex = -1;
    li.addEventListener('click', () => {
      setSelectedVersion(value, label);
      closeVersionSelect();
      select.querySelector('.version-select-trigger').focus();
    });
    list.appendChild(li);
  });
  closeVersionSelect();
  setSelectedVersion(options[0][0], options[0][1]);
}

document.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.getElementById('btn-export-save');
  if (!exportBtn) return;

  const versionSelect = document.getElementById('export-version');
  const trigger = versionSelect.querySelector('.version-select-trigger');

  populateExportVersions(currentMode);

  trigger.addEventListener('click', () => {
    if (versionSelect.classList.contains('open')) {
      closeVersionSelect();
    } else {
      openVersionSelect(false);
    }
  });

  // Close when clicking away
  document.addEventListener('click', (e) => {
    if (!versionSelect.contains(e.target)) closeVersionSelect();
  });
  versionSelect.addEventListener('keydown', handleVersionSelectKeys);

  exportBtn.addEventListener('click', async () => {
    if (!currentFixedTeam.length) {
      alert('Randomize a full team first.');
      return;
    }
    exportBtn.disabled = true;
    try {
      await loadSaveData();
      const version = selectedVersion;
      const isGen2 = currentMode.startsWith('s2');
      const bytes = isGen2 ? buildGen2Save(currentFixedTeam, version) : buildGen1Save(currentFixedTeam);
      downloadSaveFile(bytes, `pokemon_${version}_stadium_team.sav`);
    } finally {
      exportBtn.disabled = false;
    }
  });
});
