// Harvest Moon: Friends of Mineral Town — Complete ASCII Engine

import { Screen, CellTag, FxExtra, FxKind, BoxStyle, EmoteKind, PaletteMode } from './screen';
import { COMPACT_MIN_COLS, MIN_ROWS, isCompact, fitMessages, fitText, reflowPages, wrapLines } from './compact';
import { fencePost } from './chrome';
import {
  GameMap,
  build_farm,
  build_town,
  build_mountain,
  build_beach,
  build_woods,
  build_ridge,
  build_river,
  build_point,
  build_grove,
  link_regions,
  build_house,
  build_interior,
  build_house_upgraded,
  build_mine,
} from './map';
import {
  SECS_PER_10MIN,
  SAVE_KEY,
  SEASONS,
  WEEKDAYS,
  SEASON_COL,
  WEATHER_COL,
  CROPS,
  FORAGE,
  FORAGE_GLYPH,
  ITEMS,
  BARN_CAP,
  ANIMALS,
  WOOL_DAYS,
  COW_NAMES,
  SHEEP_NAMES,
  TOOLS,
  UPGRADABLE,
  LEVELS,
  LEVEL_COL,
  UPGRADE,
  CAN_CAP,
  OBJ_GLYPH,
  HOURS,
  BUILDINGS,
  NPCS,
  SPOUSE_LINES,
  FESTIVALS,
  BIRTHDAYS,
  FEST_SPOTS,
  TILES,
  INTERIOR_LAYOUTS,
  EXPANSIONS,
  BUILD_DAYS,
  UTENSILS,
  FRUITS,
  RECIPES,
  DIRS,
  OK_KEYS,
  CANCEL_KEYS,
  SPOUSE_POS,
  HOUSE_WAKE,
  LOGO,
  pkey,
  clamp,
  fmt_time,
  fmt_hour,
  BOOKS,
  HELP,
  SPRITES,
  TV_SHOPPING_ITEMS,
  HEART_EVENTS,
  RIVAL_PAIRS,
  REGION_FORAGE,
  REGION_CATCH,
  LOOKOUT_VIEW,
  LOOKOUT_STAMINA,
  LOOKOUT_FATIGUE,
  HOLLOW_LUCK_CHANCE,
  DIG_CAP,
  DIG_MAPS,
  DIG_ORES,
  DIG_RELICS,
  NIGHT_SURPRISE_CHANCE,
  STAR_GEMS,
  LIGHTHOUSE_INTRO,
  LIGHTHOUSE_LOG,
  TIDE_POOL_TEXT,
} from './constants';
import {
  CoordSet,
  parseCoordKey,
  py_len,
  py_range,
  py_slice,
  py_item,
  py_in,
  py_dict_get,
  py_dict_items,
  py_del,
  py_pop,
  py_rng,
  py_sum,
  py_sorted,
  py_next,
  py_add,
  py_eq,
  enumerate,
  py_iter,
  py_wrap,
  py_mult,
} from './runtime_helpers';
import {
  getMaxStamina,
  getToolArea,
  calculateStaminaSpend,
  getHeartInfo,
  calculateGiftPoints,
  getEggQuality,
  getMilkQuality,
  getWoolQuality,
  convertWithMaker,
  rollSpringMineDrop,
  rollLakeMineDrop,
  CURSED_TOOL_FLOORS,
  GODDESS_JEWEL_FLOORS,
  KAPPA_JEWEL_FLOORS,
  checkSecretCropUnlock,
  WON_EXCLUSIVE_CROPS,
  BASKET_CAPACITY,
  getBasketTotal,
  rollRegionCatch,
  rollStoneSkips,
} from './rules';

export interface VillagerRequest {
  id: number;
  npc: string;
  item: string;
  qty: number;
  reward: number;
  deadline: number;
}

export const MASTERY_DISCIPLINES = ['farming', 'foraging', 'fishing', 'mining', 'ranching'] as const;
export type MasteryDiscipline = (typeof MASTERY_DISCIPLINES)[number];
export const MASTERY_RANKS = [
  { name: 'Novice', xp: 0 },
  { name: 'Adept', xp: 25 },
  { name: 'Expert', xp: 75 },
  { name: 'Master', xp: 175 },
  { name: 'Legend', xp: 350 },
] as const;
export const MASTERY_LABELS: Record<MasteryDiscipline, string> = {
  farming: 'Farming',
  foraging: 'Foraging',
  fishing: 'Fishing',
  mining: 'Mining',
  ranching: 'Ranching',
};
export const MASTERY_REWARD_ITEMS: Record<MasteryDiscipline, string> = {
  farming: 'Turnip Seeds',
  foraging: 'Black Grass',
  fishing: 'Large Fish',
  mining: 'Copper',
  ranching: 'Chicken Feed',
};

/** Every outdoor map, for weather and wetness bookkeeping. */
const OUTDOOR_MAPS = ['farm', 'town', 'mountain', 'beach', 'woods', 'ridge', 'river', 'point', 'grove'];
/** Forage spots spawned per map each day (winter thins the inland ones). */
const FORAGE_TARGET: Record<string, number> = { mountain: 11, beach: 4, woods: 10, ridge: 8, river: 6, point: 4, grove: 8 };

export class Game {
  [key: string]: any;

  scr!: Screen;
  started: boolean = false;
  running: boolean = true;
  autostart: boolean = false;
  msgs: [string, string][] = [];
  maps: Record<string, GameMap> = {};
  last: number = 0;
  acc: number = 0.0;
  npc_acc: number = 0.0;
  passing_out: boolean = false;
  interiors: Record<string, any> = {};
  interior_bid: Record<string, string> = {};
  indoor_npcs: Record<string, any> = {};
  _fest_saved: Record<string, any> | null = null;
  modal_depth: number = 0;
  /** True while text_input() waits for typed text (touch UI shows a keyboard field). */
  typing: boolean = false;
  /**
   * Called the moment a text prompt opens. The key that opens a prompt reaches it through promise
   * steps only, so this still runs inside the player's tap: iOS opens the keyboard only for a
   * focus() made there.
   */
  onTyping: (() => void) | null = null;
  /** Compact (phone) layout only: show the status panel as an overlay ('p'). */
  show_panel: boolean = false;
  /** Set while the game menu is open: the clock, crops and villagers wait. */
  paused: boolean = false;

  name: string = 'Pete';
  farm: string = 'Moon';
  year: number = 1;
  season: number = 0;
  day: number = 1;
  minutes: number = 360;
  weather: string = 'Sunny';
  tomorrow: string = 'Sunny';
  gold: number = 500;
  stamina: number = 150;
  max_stamina: number = 150;
  fatigue: number = 0;
  power_berries: number = 0;
  berry_sources: string[] = [];
  has_mystic_berry: boolean = false;

  inv: Record<string, number> = {};
  held: string | null = null;
  tool: string = 'Hoe';
  levels: Record<string, number> = {};
  tool_exp: Record<string, number> = {};
  cursed_uses: Record<string, number> = {};
  cursed_days: Record<string, number> = {};
  cursed_blesses: Record<string, number> = {};
  water: number = 30;
  upgrading: [string, number] | null = null;

  tilled: CoordSet = new CoordSet();
  wet: CoordSet = new CoordSet();
  crops: Record<string, [string, number]> = {};
  objs: Record<string, Record<string, string>> = { farm: {}, mine: {} };
  hp: Record<string, number> = {};
  forage: Record<string, Record<string, string>> = { mountain: {}, beach: {} };
  bin: Record<string, number> = {};
  basket: Record<string, number> = {};
  shipped_counts: Record<string, number> = {};
  zack_paid_today: boolean = false;

  chickens: number = 0;
  chicken_aff: number = 20;
  chicken_fest_won: boolean = false;
  outdoor_hours: number = 0;
  animals_grazing: boolean = false;
  incubator_days: number = 0;
  fed: number = 0;
  eggs: number = 0;

  dog_aff: number = 20;
  dog_frisbee_dist: number = 15;
  horse_aff: number = 20;
  horse_grown: boolean = true;
  riding_horse: boolean = false;
  medals: number = 50;

  friend: Record<string, number> = {};
  sprite_aff: Record<string, number> = {};
  sprite_jobs: Record<string, { task: string; days: number; skill: number }> = {};
  heart_events_seen: string[] = [];
  rival_events_seen: string[] = [];
  talked: Set<string> = new Set();
  gifted: Set<string> = new Set();

  married: string | null = null;
  marriage_day: number = -1;
  child_name: string | null = null;
  child_days: number = 0;

  shipped_total: number = 0;
  steps: number = 0;
  fish_caught: Record<string, number> = {};
  goddess_gifts: number = 0;
  kappa_gifts: number = 0;
  goddess_jewels: number = 0;
  kappa_jewels: number = 0;
  truth_jewels: number = 0;
  honey_picked: boolean = false;
  vase_flower: string | null = null;
  fireplace_lit: boolean = false;
  tv_watched_saturday: string | null = null;
  tv_order: [string, number] | null = null;
  makers: string[] = [];
  museum: string[] = [];
  museum_rewards: number[] = [];
  requests: VillagerRequest[] = [];
  next_request_id: number = 1;
  requests_done: number = 0;
  mastery_xp: Record<string, number> = {};
  mastery_claimed: string[] = [];

  prayed: boolean = false;
  fest_wins: string[] = [];
  fest_attended: boolean = false;
  fest_declined: boolean = false;
  npc_pos: Record<string, [number, number]> = {};
  fx: (FxExtra & { kind: FxKind; map: string; x: number; y: number; born: number; life: number })[] = [];
  shake_fx: { born: number; strength: number } | null = null;
  warp_fx: { born: number; duration: number } | null = null;
  wetness: Record<string, number> = {};
  mine_type: 'spring' | 'lake' = 'spring';
  mine_floor: number = 0;
  max_spring_floor: number = 0;
  max_lake_floor: number = 0;
  ladder: [number, number] | null = null;
  mapname: string = 'house';
  show_minimap: boolean = false;
  px: number = 1;
  py: number = 2;
  face: [number, number] = [0, -1];
  /** Eased camera top-left, in map cells. Null means snap on the next frame. */
  cam_x: number | null = null;
  cam_y: number | null = null;
  animals: any[] = [];
  house_flags: string[] = [];
  project: [string, number] | null = null;
  bathed: boolean = false;
  /** Outer-region landmarks. The *_day fields hold an absday(), so they lapse on their own overnight. */
  lookout_day: number = -1;
  hollow_luck_day: number = -1;
  skip_best: number = 0;
  lighthouse_log: number = 0;
  lighthouse_day: number = -1;

  SAVE_FIELDS = [
    'name', 'farm', 'year', 'season', 'day', 'minutes', 'weather', 'tomorrow', 'gold',
    'stamina', 'max_stamina', 'fatigue', 'power_berries', 'berry_sources', 'has_mystic_berry',
    'inv', 'held', 'tool', 'levels', 'tool_exp', 'cursed_uses', 'cursed_days', 'cursed_blesses',
    'water', 'upgrading', 'bin', 'basket', 'shipped_counts', 'chickens', 'chicken_aff', 'chicken_fest_won',
    'outdoor_hours', 'animals_grazing', 'incubator_days', 'fed', 'eggs', 'dog_aff', 'dog_frisbee_dist',
    'horse_aff', 'horse_grown', 'medals', 'friend', 'sprite_aff', 'sprite_jobs',
    'heart_events_seen', 'rival_events_seen', 'married', 'marriage_day', 'child_name', 'child_days',
    'shipped_total', 'steps', 'fish_caught', 'goddess_gifts', 'kappa_gifts',
    'goddess_jewels', 'kappa_jewels', 'truth_jewels', 'vase_flower', 'makers',
    'museum', 'museum_rewards',
    'requests', 'next_request_id', 'requests_done',
    'mastery_xp', 'mastery_claimed',
    'fest_wins', 'house_flags', 'project', 'max_spring_floor', 'max_lake_floor',
    // barn animals, and today's once-per-day flags (a mid-day save/load must not reset them)
    'animals', 'talked', 'gifted', 'honey_picked', 'prayed', 'bathed', 'fireplace_lit',
    'tv_watched_saturday', 'zack_paid_today', 'fest_attended', 'fest_declined',
    // outer-region landmarks
    'lookout_day', 'hollow_luck_day', 'skip_best', 'lighthouse_log', 'lighthouse_day',
  ];

  constructor(scr: Screen, autostart: boolean = false) {
    this.scr = scr;
    this.autostart = autostart;
    this.started = false;
    this.running = true;
    this.msgs = [];
    this.maps = {
      farm: build_farm(),
      town: build_town(),
      mountain: build_mountain(),
      beach: build_beach(),
      woods: build_woods(),
      ridge: build_ridge(),
      river: build_river(),
      point: build_point(),
      grove: build_grove(),
      house: build_house(),
    };
    link_regions(this.maps);
    this.last = Date.now() / 1000;
    this.acc = 0.0;
    this.npc_acc = 0.0;
    this.passing_out = false;
    this.build_interiors();
  }

  setBodyState(state: 'title' | 'playing' | 'paused') {
    if (typeof document !== 'undefined' && document.body) {
      document.body.dataset.state = state;
    }
  }

  new_game(name: string, farm: string): void {
    this.name = name;
    this.farm = farm;
    this.year = 1;
    this.season = 0;
    this.day = 1;
    this.minutes = 6 * 60;
    this.weather = 'Sunny';
    this.tomorrow = this.roll_weather(0, 2);
    this.gold = 500;
    this.power_berries = 0;
    this.berry_sources = [];
    this.has_mystic_berry = false;
    this.max_stamina = getMaxStamina(0);
    this.stamina = this.max_stamina;
    this.fatigue = 0;
    this.inv = { 'Turnip Seeds': 2, 'Pedometer': 1 };
    this.held = null;
    this.tool = 'Hoe';
    this.levels = Object.fromEntries(UPGRADABLE.map((t) => [t, 0]));
    this.tool_exp = Object.fromEntries(UPGRADABLE.map((t) => [t, 0]));
    this.cursed_uses = {};
    this.cursed_days = {};
    this.cursed_blesses = {};
    this.water = CAN_CAP[0];
    this.upgrading = null;
    this.tilled = new CoordSet();
    this.wet = new CoordSet();
    this.crops = {};
    this.objs = { farm: {}, mine: {} };
    this.hp = {};
    this.forage = { mountain: {}, beach: {} };
    this.bin = {};
    this.basket = {};
    this.shipped_counts = {};
    this.zack_paid_today = false;
    this.chickens = 0;
    this.chicken_aff = 20;
    this.chicken_fest_won = false;
    this.outdoor_hours = 0;
    this.animals_grazing = false;
    this.incubator_days = 0;
    this.fed = 0;
    this.eggs = 0;
    this.dog_aff = 25;
    this.dog_frisbee_dist = 15;
    this.horse_aff = 25;
    this.horse_grown = true;
    this.riding_horse = false;
    this.medals = 50;
    this.friend = Object.fromEntries(Object.keys(NPCS).map((n) => [n, 0]));
    this.sprite_aff = Object.fromEntries(SPRITES.map((s) => [s.name, 15]));
    this.sprite_jobs = Object.fromEntries(
      SPRITES.map((s) => [s.name, { task: 'none', days: 0, skill: 10 }])
    );
    this.heart_events_seen = [];
    this.rival_events_seen = [];
    this.talked = new Set();
    this.gifted = new Set();
    this.married = null;
    this.marriage_day = -1;
    this.child_name = null;
    this.child_days = 0;
    this.shipped_total = 0;
    this.steps = 0;
    this.fish_caught = {};
    this.goddess_gifts = 0;
    this.kappa_gifts = 0;
    this.goddess_jewels = 0;
    this.kappa_jewels = 0;
    this.truth_jewels = 0;
    this.honey_picked = false;
    this.vase_flower = null;
    this.fireplace_lit = false;
    this.tv_watched_saturday = null;
    this.tv_order = null;
    this.makers = [];
    this.museum = [];
    this.museum_rewards = [];
    this.requests = [];
    this.next_request_id = 1;
    this.requests_done = 0;
    this.mastery_xp = Object.fromEntries(MASTERY_DISCIPLINES.map((d) => [d, 0]));
    this.mastery_claimed = [];
    this.lookout_day = -1;
    this.hollow_luck_day = -1;
    this.skip_best = 0;
    this.lighthouse_log = 0;
    this.lighthouse_day = -1;
    this.prayed = false;
    this.fest_wins = [];
    this.fest_attended = false;
    this.fest_declined = false;
    this.npc_pos = {};
    this.fx = [];
    this.shake_fx = null;
    this.wetness = Object.fromEntries(OUTDOOR_MAPS.map((m) => [m, 0]));
    this.mine_type = 'spring';
    this.mine_floor = 0;
    this.max_spring_floor = 0;
    this.max_lake_floor = 0;
    this.ladder = null;
    this.mapname = 'house';
    this.show_minimap = false;
    [this.px, this.py] = HOUSE_WAKE;
    this.face = [0, -1];
    this.cam_x = null;
    this.cam_y = null;

    const rng = py_rng();
    const m = this.maps['farm'];
    for (let y = 0; y < m.h; y++) {
      for (let x = 0; x < m.w; x++) {
        if (m.t[y][x] === 'field') {
          const r = rng.random();
          const kind =
            r < 0.12
              ? 'weed'
              : r < 0.19
                ? 'stone'
                : r < 0.25
                  ? 'branch'
                  : r < 0.262
                    ? 'stump'
                    : r < 0.274
                      ? 'boulder'
                      : null;
          if (kind) {
            this.objs['farm'][pkey(x, y)] = kind;
            if (kind === 'stump' || kind === 'boulder') {
              this.hp[pkey(x, y)] = 6;
            }
          }
        }
      }
    }
    this.spawn_forage();
    this.spawn_digs();
    this.animals = [];
    this.init_carpentry();
    this.started = true;
    this.setBodyState('playing');
  }

  get map(): GameMap {
    return this.maps[this.mapname];
  }

  absday(year: number | null = null, season: number | null = null, day: number | null = null): number {
    const y = year === null ? this.year : year;
    const s = season === null ? this.season : season;
    const d = day === null ? this.day : day;
    return (y - 1) * 120 + s * 30 + d - 1;
  }

  get weekday(): number {
    return this.absday() % 7;
  }

  get season_name(): string {
    return SEASONS[this.season];
  }

  date_str(): string {
    return `${this.season_name} ${this.day} (${WEEKDAYS[this.weekday]}), Year ${this.year}`;
  }

  roll_weather(season: number, day: number): string {
    if (day === 1 || FESTIVALS[`${season},${day}`]) {
      return 'Sunny';
    }
    const r = py_rng().random();
    if (season === 3) {
      if (r < 0.04) return 'Blizzard';
      return r < 0.28 ? 'Snow' : 'Sunny';
    }
    if (season === 1 && r < 0.04) {
      return 'Typhoon';
    }
    return r < [0.2, 0.12, 0.15][season] ? 'Rain' : 'Sunny';
  }

  msg(text: string, col: string = '05'): void {
    this.msgs.push([text, col]);
    this.msgs = py_slice(this.msgs, -30, null);
  }

  give(item: string, n: number = 1): void {
    this.inv[item] = (this.inv[item] || 0) + n;
  }

  take(item: string, n: number = 1): void {
    if (!this.inv[item]) return;
    this.inv[item] -= n;
    if (this.inv[item] <= 0) {
      delete this.inv[item];
      if (this.held === item) {
        this.held = null;
      }
    }
  }

  give_power_berry(source: string): boolean {
    if (this.berry_sources.includes(source) || this.power_berries >= 10) {
      return false;
    }
    this.berry_sources.push(source);
    this.power_berries += 1;
    this.max_stamina = getMaxStamina(this.power_berries);
    this.stamina = this.max_stamina;
    this.fatigue = 0;
    this.msg(`You ate a Power Berry! Max Stamina +10 (${this.max_stamina})!`, '0A');
    return true;
  }

  give_truth_jewel(source: string): boolean {
    const key = `truth:${source}`;
    if (this.berry_sources.includes(key) || this.truth_jewels >= 9) {
      return false;
    }
    this.berry_sources.push(key);
    this.truth_jewels += 1;
    this.give('Truth Jewel', 1);
    if (this.truth_jewels >= 9) {
      this.take('Truth Jewel', 9);
      this.give('Gem of Truth', 1);
      this.msg('All 9 Jewels combined into the GEM OF TRUTH! Exact Stamina/Fatigue unlocked!', '0C');
    } else {
      this.msg(`Found a Jewel of Truth! (${this.truth_jewels}/9)`, '0C');
    }
    return true;
  }

  snapshot(): Record<string, any> {
    const d: Record<string, any> = {};
    for (const k of this.SAVE_FIELDS) {
      d[k] = (this as any)[k];
    }
    d['tilled'] = Array.from(this.tilled);
    d['wet'] = Array.from(this.wet);
    d['crops'] = { ...this.crops };
    d['objs'] = { ...this.objs.farm };
    d['hp'] = { ...this.hp };
    d['forage'] = { ...this.forage };
    return d;
  }

  save(slot: number = 1): void {
    const d = this.snapshot();
    try {
      if (typeof localStorage !== 'undefined') {
        const key = slot === 2 ? `${SAVE_KEY}-2` : SAVE_KEY;
        localStorage.setItem(key, JSON.stringify(d));
      }
    } catch (e) {
      console.error('Save failed', e);
    }
  }

  export_save(): void {
    if (typeof document === 'undefined') {
      this.msg('Save export is only available in the browser.', '08');
      return;
    }
    const data = JSON.stringify(this.snapshot(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hrvstmn-${this.farm.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-y${this.year}s${this.season + 1}d${this.day}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.msg('Farm exported as a save file.', '0B');
  }

  async import_save(): Promise<void> {
    if (typeof document === 'undefined') {
      this.msg('Save import is only available in the browser.', '08');
      return;
    }
    const file = await new Promise<File | null>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.style.display = 'none';
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.oncancel = () => resolve(null);
      document.body.appendChild(input);
      input.click();
    });
    if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      if (!d || typeof d !== 'object' || typeof d.name !== 'string' || !Array.isArray(d.tilled)) {
        throw new Error('That does not look like an HRVSTMN save file.');
      }
      this.applySaveData(d);
      this.save(1);
      this.msg('Farm imported into Diary Slot 1.', '0B');
    } catch (e: any) {
      await this.say(e?.message || 'Could not read that save file.', null);
    }
  }

  applySaveData(d: Record<string, any>): void {
    this.new_game(d.name || 'Pete', d.farm || 'Moon');
    for (const k of this.SAVE_FIELDS) {
      if (k in d) {
        (this as any)[k] = d[k];
      }
    }
    for (const n of Object.keys(NPCS)) {
      if (!(n in this.friend)) {
        this.friend[n] = 0;
      }
    }
    for (const s of SPRITES) {
      if (!(s.name in this.sprite_aff)) {
        this.sprite_aff[s.name] = 15;
      }
      if (!(s.name in this.sprite_jobs)) {
        this.sprite_jobs[s.name] = { task: 'none', days: 0, skill: 10 };
      }
    }
    this.tilled = new CoordSet(d.tilled || []);
    this.wet = new CoordSet(d.wet || []);
    this.crops = { ...(d.crops || {}) };
    this.objs.farm = { ...(d.objs || {}) };
    this.hp = { ...(d.hp || {}) };
    this.forage = { mountain: {}, beach: {}, ...(d.forage || {}) };
    this.prune_forage();
    this.max_stamina = getMaxStamina(this.power_berries || 0) + (this.house_flags.includes('Big Bed') ? 20 : 0);
    this.stamina = Math.min(this.max_stamina, d.stamina ?? this.max_stamina);
    this.rebuild_house();
    this.cam_x = null;
    this.cam_y = null;
    this.setBodyState('playing');
  }

  load(slot: number = 1): void {
    let jsonStr = '';
    try {
      if (typeof localStorage !== 'undefined') {
        const key = slot === 2 ? `${SAVE_KEY}-2` : SAVE_KEY;
        jsonStr = localStorage.getItem(key) || '';
      }
    } catch (e) {
      console.error('Load failed', e);
    }
    if (!jsonStr) {
      throw new Error(`No save file in Slot ${slot}`);
    }
    this.applySaveData(JSON.parse(jsonStr));
  }

  async run(): Promise<void> {
    if (this.autostart) {
      this.new_game('Pete', 'Moon');
      this.msg('Welcome to Mineral Town! Use Arrows/WASD to move, SPACE to use tool, X to act.', '0B');
      this.render();
      this.scr.flush();
    } else {
      this.setBodyState('title');
      await this.title();
    }
    this.last = Date.now() / 1000;
    while (this.running) {
      let k = await this.scr.getKey(1 / 20);
      while (k && this.running) {
        await this.handle(k);
        k = await this.scr.getKey(0);
      }
      await this.update();
      this.render();
      this.scr.flush();
    }
  }

  async update(): Promise<void> {
    const now = Date.now() / 1000;
    const dt = this.paused ? 0 : Math.min(now - this.last, 0.25);
    this.last = now;
    if (this.fx.length) this.fx = this.fx.filter((f) => now - f.born < f.life);
    if (!this.map.indoor) {
      this.acc += dt;
      while (this.acc >= SECS_PER_10MIN) {
        this.acc -= SECS_PER_10MIN;
        await this.advance(10);
      }
    }
    this.npc_acc += dt;
    if (this.npc_acc > 0.7) {
      this.npc_acc = 0;
      this.move_npcs();
    }
  }

  process_zack_pickup(): number {
    let total = 0;
    for (const [item, qty] of Object.entries(this.bin)) {
      const price = ITEMS[item] ? ITEMS[item][0] : 0;
      total += price * qty;
      this.shipped_counts[item] = (this.shipped_counts[item] || 0) + qty;
    }
    if (total > 0) {
      this.gold += total;
      this.shipped_total += total;
      this.bin = {};
    }
    return total;
  }

  async advance(mins: number): Promise<void> {
    const before = this.minutes;
    this.minutes += mins;

    // Equipped Gem of the Goddess / Gem of the Kappa passive regeneration
    if (this.held === 'Gem of the Goddess' || this.inv['Gem of the Goddess']) {
      this.stamina = Math.min(this.max_stamina, this.stamina + 2);
    }
    if (this.held === 'Gem of the Kappa' || this.inv['Gem of the Kappa']) {
      this.fatigue = Math.max(0, this.fatigue - 2);
    }

    // 5:00 PM (17:00) Zack shipping pickup
    if (before < 17 * 60 && this.minutes >= 17 * 60 && !this.zack_paid_today) {
      this.zack_paid_today = true;
      const earned = this.process_zack_pickup();
      if (earned > 0) {
        this.msg(`5:00 PM: Zack picked up your shipment! +${earned}G.`, '09');
      }
    }

    if (before < 18 * 60 && 18 * 60 <= this.minutes) {
      this.msg('The sun is setting. Shops are closing soon.', '09');
    }
    if (before < 24 * 60 && 24 * 60 <= this.minutes) {
      this.fatigue = Math.min(100, this.fatigue + 10);
      this.msg("It's midnight. Staying up late builds Fatigue!", '08');
    }
    if (this.minutes >= 26 * 60) {
      await this.pass_out("It's 2:00 AM... you collapse from exhaustion where you stand.");
      return;
    }
    this.update_npcs();
  }

  async handle(k: string): Promise<void> {
    if (k in DIRS) {
      const [dx, dy] = DIRS[k];
      await this.move(dx, dy);
      if (this.riding_horse && this.mapname === 'farm') {
        await this.move(dx, dy);
      }
    } else if (k === 'space' || k === 'z') {
      await this.use_tool();
    } else if (k === 'x' || k === 'e' || k === 'enter') {
      await this.interact();
    } else if (k === 'tab') {
      this.cycle_tool(1);
    } else if (k === 'btab') {
      this.cycle_tool(-1);
    } else if (k.length === 1 && '123456'.includes(k)) {
      const t = TOOLS[Number(k) - 1];
      if (this.levels[this.tool] === 5 && this.tool !== t) {
        this.msg(`Your ${this.tool} is CURSED and cannot be unequipped! Visit Carter at Church.`, '08');
      } else if (this.upgrading && this.upgrading[0] === t) {
        this.msg(`Saibara is still working on your ${t}.`, '08');
      } else {
        this.tool = t;
      }
    } else if (k === 'i') {
      await this.rucksack();
    } else if (k === 'm') {
      await this.ranch_summary();
    } else if (k === 'H') {
      // Shift+H: plain 'h' is vim-style movement (hjkl) and is handled above
      this.whistle_horse();
    } else if (k === 'b') {
      this.ring_grazing_bell();
    } else if (k === 't') {
      if (this.inv['Teleport Stone']) {
        await this.use_teleport_stone();
      } else {
        this.msg('Unearth the Teleport Stone on Floor 255 of the Spring Mine to warp anywhere!');
      }
    } else if (k === 'y' || k === 'Y') {
      await this.today_panel();
    } else if (k === 'n' || k === 'N') {
      this.show_minimap = !this.show_minimap;
      this.msg(`Minimap ${this.show_minimap ? 'shown' : 'hidden'}.`, '0C');
    } else if (k === 'V') {
      const order: PaletteMode[] = ['mono', 'duotone', 'isotope'];
      const labels: Record<PaletteMode, string> = {
        mono: 'Contour Mono',
        duotone: 'Seasonal Duotone',
        isotope: 'Full Isotope',
      };
      const next = order[(order.indexOf(this.scr.paletteMode) + 1) % order.length];
      this.scr.setPaletteMode(next);
      this.msg(`Palette: ${labels[next]} (Shift+V)`, '0C');
    } else if (k === 'p') {
      // Narrow screens hide the side panel; 'p' (touch INFO) overlays it. Wide screens always show it.
      if (isCompact(this.scr.w)) this.show_panel = !this.show_panel;
    } else if (k === 'r' || k === 'R') {
      await this.relationships();
    } else if (k === '?') {
      await this.show_lines('Help & Controls', HELP);
    } else if (k === 'esc') {
      await this.pause_menu();
    } else if (k === 'Q' || k === 'ctrl-c') {
      await this.quit_prompt();
    }
  }

  whistle_horse(): void {
    if (this.mapname !== 'farm') {
      this.msg('Your horse stays on your farm. Whistle (Shift+H) while outdoors on your farm!');
      return;
    }
    this.riding_horse = !this.riding_horse;
    this.horse_aff = Math.min(100, this.horse_aff + 1);
    this.fx_add('emote', this.px, this.py, 0.9, { emote: this.riding_horse ? 'heart' : 'note' });
    if (this.riding_horse) {
      this.msg('Wheeeet! Your horse gallops to your side! Riding at 2x speed! (Press Shift+H to dismount)', '09');
    } else {
      this.msg('You dismount and pat your horse.', '0B');
    }
  }

  ring_grazing_bell(): void {
    if (this.mapname !== 'farm') {
      this.msg('Ring the Grazing Bell (B) while on your farm to call animals outside/inside!');
      return;
    }
    if (this.chickens === 0 && this.animals.length === 0) {
      this.msg('You do not have any chickens or barn livestock yet.');
      return;
    }
    if (!this.animals_grazing) {
      if (this.weather !== 'Sunny') {
        this.fx_add('emote', this.px, this.py, 0.9, { emote: 'alert' });
        this.msg('Keep your animals indoors during Rain or Snow so they stay happy!', '08');
        return;
      }
      this.animals_grazing = true;
      this.outdoor_hours += 10;
      this.fed = this.chickens;
      this.chicken_aff = Math.min(100, this.chicken_aff + 2);
      for (const a of this.animals) {
        a.fed = true;
        a.aff = Math.min(100, a.aff + 2);
      }
      this.fx_add('emote', this.px, this.py, 0.9, { emote: 'note' });
      this.msg(`Ding-a-ling! Your animals come outside to graze in the sunshine! (+Outdoor hours: ${this.outdoor_hours}h)`, '0B');
    } else {
      this.animals_grazing = false;
      this.fx_add('emote', this.px, this.py, 0.9, { emote: 'note' });
      this.msg('Ding-a-ling! Your chickens and livestock return safely to the Coop and Barn.', '0C');
    }
  }

  async pause_menu(): Promise<void> {
    this.setBodyState('paused');
    const opts = [
      'Resume',
      'Today’s Plan (y)',
      'Villager Notes (r)',
      'Rucksack (i)',
      'Ranch Summary & Memo (m)',
      'Achievements & Journal',
      'Farm Mastery',
      'Save Diary — Slot 1',
      'Save Diary — Slot 2',
      'Load Diary — Slot 1',
      'Load Diary — Slot 2',
      `Graphics: High-res Detail ${this.scr.hires ? 'On' : 'Off'}`,
      `Accessible Cues: ${this.scr.accessibleCues ? 'On' : 'Off'}`,
      'Export Save File',
      'Import Save File',
    ];
    if (this.inv['Teleport Stone']) {
      opts.push('Use Teleport Stone');
    }
    opts.push('Help (?)', 'Quit');

    const sel = await this.menu('Diary & Pause Menu', opts);
    this.setBodyState('playing');
    if (sel === null || opts[sel] === 'Resume') return;
    const choice = opts[sel];
    if (choice === 'Rucksack (i)') {
      await this.rucksack();
    } else if (choice === 'Today’s Plan (y)') {
      await this.today_panel();
    } else if (choice === 'Villager Notes (r)') {
      await this.relationships();
    } else if (choice === 'Ranch Summary & Memo (m)') {
      await this.ranch_summary();
    } else if (choice === 'Achievements & Journal') {
      await this.achievements_page();
    } else if (choice === 'Farm Mastery') {
      await this.mastery_page();
    } else if (choice === 'Save Diary — Slot 1') {
      this.save(1);
      this.msg('Saved game in Diary Slot 1.', '0B');
    } else if (choice === 'Save Diary — Slot 2') {
      this.save(2);
      this.msg('Saved game in Diary Slot 2.', '0B');
    } else if (choice === 'Load Diary — Slot 1') {
      try {
        this.load(1);
        this.msg('Loaded Diary Slot 1.', '0C');
      } catch (e: any) {
        await this.say(e.message || 'No save in Slot 1.');
      }
    } else if (choice === 'Load Diary — Slot 2') {
      try {
        this.load(2);
        this.msg('Loaded Diary Slot 2.', '0C');
      } catch (e: any) {
        await this.say(e.message || 'No save in Slot 2.');
      }
    } else if (choice === 'Export Save File') {
      this.export_save();
    } else if (choice === 'Import Save File') {
      await this.import_save();
    } else if (choice.startsWith('Graphics: High-res Detail')) {
      this.scr.setHires(!this.scr.hires);
      this.msg(`High-res ground detail: ${this.scr.hires ? 'On' : 'Off'}.`, '0C');
    } else if (choice.startsWith('Accessible Cues')) {
      this.scr.accessibleCues = !this.scr.accessibleCues;
      this.msg(`Accessible state cues: ${this.scr.accessibleCues ? 'On' : 'Off'}.`, '0C');
    } else if (choice === 'Use Teleport Stone') {
      await this.use_teleport_stone();
    } else if (choice === 'Help (?)') {
      await this.show_lines('Help & Controls', HELP);
    } else if (choice === 'Quit') {
      await this.quit_prompt();
    }
  }

  async use_teleport_stone(): Promise<void> {
    const dests: [string, string, number, number][] = [
      ['Farmhouse', 'house', 7, 5],
      ['Farm Field', 'farm', 14, 10],
      ['Rose Square (Town)', 'town', 36, 14],
      ['Mineral Beach Pier', 'beach', 32, 10],
      ["Mother's Hill Hot Spring", 'mountain', 8, 14],
      ['Goddess Pond & Spring Mine', 'mountain', 50, 6],
      ['Lake Mine Island (Mother\'s Hill Lake)', 'mountain', 14, 6],
      ['Cedar Hollow Clearing', 'woods', 44, 19],
      ['Skyline Ridge Lookout', 'ridge', 32, 3],
      ['Willow Bend Bridge', 'river', 30, 12],
      ['Lighthouse Point', 'point', 40, 12],
      ["Ironwood Grove (Saibara's Forge)", 'grove', 22, 18],
    ];
    const sel = await this.menu(
      'Teleport Stone — Warp Where?',
      dests.map((d) => d[0])
    );
    if (sel !== null) {
      const [label, mp, x, y] = dests[sel];
      this.riding_horse = false;
      this.warp(mp, x, y, [0, 1]);
      this.msg(`Warped to ${label}!`, '0C');
    }
  }

  async quit_prompt(): Promise<void> {
    if (await this.confirm('Save to Slot 1 and Quit?')) {
      this.save(1);
      this.running = false;
    }
  }

  npc_at(x: number, y: number, mapname: string | null = null): string | null {
    const mp = mapname || this.mapname;
    for (const [n, p] of Object.entries(this.npc_pos)) {
      if (p[0] === x && p[1] === y && NPCS[n]?.where && NPCS[n].where[0] === mp) {
        return n;
      }
    }
    const indoor = this.indoor_npc_at(x, y, mp);
    if (indoor) return indoor;
    if (mp === 'house' && this.married && x === SPOUSE_POS[0] && y === SPOUSE_POS[1]) {
      return this.married;
    }
    return null;
  }

  walkable(mapname: string, x: number, y: number, for_npc: boolean = false): boolean {
    const m = this.maps[mapname];
    if (!m || !m.inside(x, y)) return false;
    const t = m.tile(x, y);
    // In Winter, Mother's Hill Lake water forms a frozen ice bridge from the south shore to the Lake Mine island!
    if (mapname === 'mountain' && this.season === 3 && t === 'water' && x >= 13 && x <= 17 && y >= 7 && y <= 14) {
      return true;
    }
    if (!TILES[t] || !TILES[t][3]) {
      return false;
    }
    const key = pkey(x, y);
    if ((this.objs[mapname] && key in this.objs[mapname]) || (this.forage[mapname] && key in this.forage[mapname])) {
      return false;
    }
    if (for_npc && (key in m.warps || (this.tilled.has(key) && mapname === 'farm'))) {
      return false;
    }
    return true;
  }

  is_out(n: string): boolean {
    if (this.fest_is_out(n) !== null) {
      return true;
    }
    const d = NPCS[n];
    if (!d || !d.out || n === this.married) {
      return false;
    }
    // Kai is mainly around in Summer unless married or high hearts
    if (n === 'Kai' && this.season !== 1 && (this.friend['Kai'] || 0) < 60) {
      return false;
    }
    if (this.weather !== 'Sunny' && !d.rain) {
      return false;
    }
    const [a, b] = d.out;
    return a * 60 <= this.minutes && this.minutes < b * 60;
  }

  update_npcs(): void {
    this.fest_sync();
    for (const [n, d] of Object.entries(NPCS)) {
      if (this.is_out(n)) {
        if (!(n in this.npc_pos) && d.where) {
          const [mp, ax, ay] = d.where;
          const spot = this.free_spot(mp, ax, ay);
          if (spot) {
            this.npc_pos[n] = spot;
          }
        }
      } else {
        delete this.npc_pos[n];
      }
    }
    this.update_indoor_npcs();
  }

  free_spot(mp: string, x: number, y: number): [number, number] | null {
    for (let r = 0; r < 7; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (
            this.walkable(mp, px, py) &&
            !this.npc_at(px, py, mp) &&
            !(mp === this.mapname && px === this.px && py === this.py)
          ) {
            return [px, py];
          }
        }
      }
    }
    return null;
  }

  move_npcs(): void {
    for (const [n, [x, y]] of Object.entries(this.npc_pos)) {
      const where = NPCS[n]?.where;
      if (!where) continue;
      const [mp, ax, ay] = where;
      if (mp !== this.mapname || py_rng().random() > 0.45) continue;
      const [dx, dy] = py_rng().choice([
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]);
      const [nx, ny] = [x + dx, y + dy];
      if (Math.abs(nx - ax) > 4 || Math.abs(ny - ay) > 3) continue;
      if (this.walkable(mp, nx, ny, true) && !this.npc_at(nx, ny) && !(nx === this.px && ny === this.py)) {
        this.npc_pos[n] = [nx, ny];
      }
    }
    this.move_indoor_npcs();
  }

  fx_add(kind: FxKind, x: number, y: number, life: number = 0.55, extra: FxExtra = {}): void {
    const born = Date.now() / 1000;
    this.fx.push({ kind, map: this.mapname, x, y, born, life: life + (extra.delay ?? 0), seed: (this.fx_seq = (this.fx_seq + 1) % 997), ...extra });
    if (this.fx.length > 36) this.fx.shift();
  }

  fx_seq: number = 0;

  /** Game feel for a tool striking something: a flash, and for heavy blows a shake. */
  fx_hit(x: number, y: number, strength: number): void {
    this.fx_add('flash', x, y, 0.14);
    if (strength > 0) this.shake_fx = { born: Date.now() / 1000, strength };
  }

  /** Something breaks: a beat of hit-pause, then debris flies and the reward floats up. */
  fx_break(x: number, y: number, stuff: 'stone' | 'wood' | 'plant', text?: string, strength: number = 1): void {
    this.fx_hit(x, y, strength);
    this.fx_add('debris', x, y, 0.55, { stuff, delay: 0.12 });
    if (text) this.fx_add('text', x, y, 1.1, { text, delay: 0.12 });
  }

  target(): [number, number] {
    return [this.px + this.face[0], this.py + this.face[1]];
  }

  async move(dx: number, dy: number): Promise<void> {
    this.face = [dx, dy];
    const [nx, ny] = [this.px + dx, this.py + dy];
    const m = this.map;
    if (!m.inside(nx, ny)) return;
    const key = pkey(nx, ny);
    if (key in m.doors) {
      await this.enter(m.doors[key]);
      return;
    }
    if (!this.walkable(this.mapname, nx, ny) || this.npc_at(nx, ny)) {
      return;
    }
    this.px = nx;
    this.py = ny;
    this.steps += 1;
    if (this.steps === 1000 || this.steps === 10000) {
      this.msg(`Pedometer milestone: ${this.steps} steps! The Harvest Goddess applauds your diligence!`, '0C');
    }
    await this.fest_check();
    if (key in m.warps) {
      const [mp, wx, wy] = m.warps[key];
      this.riding_horse = false;
      this.warp(mp, wx, wy);
    } else if (m.tile(nx, ny) === 'down') {
      this.enter_mine(this.mine_floor + 1, this.mine_type);
    } else if (m.tile(nx, ny) === 'up') {
      if (this.mine_type === 'lake') {
        this.warp('mountain', 15, 9, [0, 1]);
      } else {
        this.warp('mountain', 52, 5, [0, 1]);
      }
      this.msg('You climb back out into the fresh air.');
    }
  }

  warp(mp: string, x: number, y: number, face: [number, number] | null = null): void {
    const prev = this.mapname;
    this.mapname = mp;
    this.px = x;
    this.py = y;
    if (face) this.face = face;
    this.cam_x = null;
    this.cam_y = null;
    if (this.started && prev !== mp) {
      this.warp_fx = { born: Date.now() / 1000, duration: 0.22 };
    }
    this.update_npcs();
    if (!this.map.indoor) {
      this.msg(`~ ${this.map.title} ~`, '0C');
    }
  }

  async enter(door: string): Promise<void> {
    if (door === 'house_in') {
      this.riding_horse = false;
      this.warp('house', 7, 5, [0, -1]);
    } else if (door === 'house_out') {
      this.warp('farm', 8, 6, [0, 1]);
    } else if (door === 'coop') {
      await this.coop();
    } else if (door === 'barn') {
      await this.barn();
    } else if (door === 'mine') {
      await this.prompt_mine_entry('spring');
    } else if (door === 'lakemine') {
      await this.prompt_mine_entry('lake');
    } else if (door === 'sprites') {
      await this.sprite_hut_menu();
    } else if (door === 'kai_shack') {
      await this.kai_shack_menu();
    } else {
      await this.visit(door);
    }
  }

  async prompt_mine_entry(mineType: 'spring' | 'lake'): Promise<void> {
    const maxF = mineType === 'lake' ? this.max_lake_floor : this.max_spring_floor;
    if (maxF >= 10 || this.goddess_gifts >= 30) {
      const floors = [1, 10, 29, 50, 100, 200, 255].filter((f) => f === 1 || f <= maxF + 20 || this.goddess_gifts >= 30);
      const sel = await this.menu(
        `${mineType === 'lake' ? 'Lake Mine' : 'Spring Mine'} Elevator`,
        floors.map((f) => `Floor B${f}F`)
      );
      if (sel !== null) {
        this.enter_mine(floors[sel], mineType);
      }
    } else {
      this.enter_mine(1, mineType);
    }
  }

  enter_mine(floor: number, mineType: 'spring' | 'lake' = 'spring'): void {
    this.mine_type = mineType;
    this.mine_floor = Math.min(255, floor);
    if (mineType === 'spring') {
      this.max_spring_floor = Math.max(this.max_spring_floor, this.mine_floor);
    } else {
      this.max_lake_floor = Math.max(this.max_lake_floor, this.mine_floor);
    }
    const m = build_mine(this.mine_floor, this.objs, mineType);
    this.maps['mine'] = m;
    // Find hidden ladder coordinate
    let ladderPos: [number, number] | null = null;
    for (let y = 0; y < m.h; y++) {
      for (let x = 0; x < m.w; x++) {
        if (m.t[y][x] === 'down') {
          ladderPos = [x, y];
          break;
        }
      }
    }
    this.ladder = ladderPos;
    this.mapname = 'mine';
    this.px = 3;
    this.py = 3;
    this.face = [1, 0];
    this.msg(`${m.title}. Smash rocks with Hammer or dig soil with Hoe!`, '0C');
  }

  tool_list(): string[] {
    const tools = TOOLS.filter((t) => !(this.upgrading && this.upgrading[0] === t));
    const seeds = py_sorted(Object.keys(this.inv).filter((i) => i.endsWith(' Seeds')));
    return [...tools, ...seeds];
  }

  cycle_tool(d: number): void {
    if (this.levels[this.tool] === 5) {
      this.msg(`Your ${this.tool} is CURSED and stuck to your hand! Visit Carter at the Church.`, '08');
      return;
    }
    const tl = this.tool_list();
    if (!tl.length) return;
    const i = tl.includes(this.tool) ? tl.indexOf(this.tool) : 0;
    const nextIdx = ((i + d) % tl.length + tl.length) % tl.length;
    this.tool = tl[nextIdx];
  }

  area(): [number, number][] {
    const lvl = this.levels[this.tool] ?? 0;
    return getToolArea(this.tool, lvl, this.px, this.py, this.face);
  }

  record_tool_use(t: string): void {
    if (!UPGRADABLE.includes(t)) return;
    this.tool_exp[t] = Math.min(400, (this.tool_exp[t] || 0) + 5);
    if (this.levels[t] === 5 && (t === 'Fishing Rod' || t === 'Axe')) {
      this.cursed_uses[t] = (this.cursed_uses[t] || 0) + 1;
      if (this.cursed_uses[t] >= 25) {
        this.levels[t] = 6;
        this.msg(`A divine light lifts the curse! Your Cursed ${t} is now a BLESSED ${t}!`, '0B');
      }
    }
  }

  async spend(n: number): Promise<void> {
    const isCursed = this.levels[this.tool] === 5;
    const res = calculateStaminaSpend(this.stamina, this.fatigue, n, {
      weather: this.map.indoor ? 'Sunny' : this.weather,
      minutes: this.minutes,
      hasMysticBerry: this.has_mystic_berry,
      isCursedTool: isCursed,
    });
    const prevStam = this.stamina;
    const prevFat = this.fatigue;
    this.stamina = res.stamina;
    this.fatigue = res.fatigue;

    if (res.fainted) {
      await this.pass_out('Your Fatigue hit 100! You turn blue and collapse from exhaustion...');
    } else if (res.warning === 'exhausted' && prevFat < 80 && this.fatigue >= 80) {
      this.msg("You're turning blue with Fatigue! Eat, visit the Hot Spring, or sleep!", '08');
    } else if (res.warning === 'tired' && prevStam > 30 && this.stamina <= 30) {
      this.msg("You're getting tired. Eat something or soak in the Hot Spring.", '09');
    }
  }

  async use_tool(): Promise<void> {
    const t = this.tool;
    if (!this.tool_list().includes(t)) {
      this.tool = 'Hoe';
      return;
    }
    const [tx, ty] = this.target();
    const pKey = pkey(tx, ty);
    const m = this.map;
    const objs = this.objs[this.mapname] || {};
    const obj = objs[pKey];
    const tile = m.tile(tx, ty);

    if (t.endsWith(' Seeds')) {
      await this.sow(t, [tx, ty]);
      return;
    }

    this.record_tool_use(t);
    if (t === 'Watering Can') this.fx_add('splash', tx, ty);
    else if (['Hoe', 'Hammer', 'Axe', 'Sickle'].includes(t)) {
      this.fx_add('dust', tx, ty);
      // the swing itself, in the tool's tier colour (copper, silver, gold...)
      this.fx_add('swing', tx, ty, 0.2, { dir: [this.face[0], this.face[1]], tier: this.levels[t] || 0 });
    }

    if (t === 'Sickle') {
      let cutCount = 0;
      let fodderGained = 0;
      for (const [qx, qy] of this.area()) {
        const qk = pkey(qx, qy);
        if (objs[qk] === 'weed') {
          delete objs[qk];
          // each cut weed blinks, then scatters leaves after a beat
          this.fx_add('flash', qx, qy, 0.12);
          this.fx_add('debris', qx, qy, 0.45, { stuff: 'plant', delay: 0.08 });
          cutCount += 1;
        } else if (this.mapname === 'farm' && this.crops[qk] && this.crops[qk][0] === 'Grass') {
          const [, age] = this.crops[qk];
          if (age >= CROPS['Grass'][2]) {
            this.crops[qk][1] = CROPS['Grass'][2] - CROPS['Grass'][3];
            fodderGained += 1;
          }
        }
      }
      if (fodderGained > 0) {
        this.give('Fodder', fodderGained);
        this.msg(`Cut pasture grass! +${fodderGained} Fodder.`, '0B');
      } else if (cutCount > 0) {
        this.msg(`Swish! Cut ${cutCount} weed${cutCount > 1 ? 's' : ''}.`);
      } else if (this.mapname === 'farm' && this.crops[pKey]) {
        this.msg("Careful! That's a growing crop.");
        return;
      }
      await this.spend(2);
    } else if (t === 'Hoe') {
      if (obj === 'dig') {
        this.dig_up(tx, ty);
        await this.spend(2);
        return;
      }
      if (this.mapname === 'mine') {
        await this.mine_dig(tx, ty);
        await this.spend(2);
        return;
      }
      if (this.mapname !== 'farm') {
        this.msg('You can only till soil on your farm (or dig in the mines).');
      } else if (this.season === 3) {
        this.msg('The ground is frozen solid in Winter.');
      } else {
        let n = 0;
        for (const [qx, qy] of this.area()) {
          const qk = pkey(qx, qy);
          if (this.maps['farm'].tile(qx, qy) === 'field' && !objs[qk] && !this.tilled.has(qk)) {
            this.tilled.add(qk);
            if (this.weather === 'Rain' || this.weather === 'Typhoon') {
              this.wet.add(qk);
            }
            n += 1;
            // 2% chance to unearth the Farm Field Power Berry!
            if (!this.berry_sources.includes('farm_hoe') && py_rng().random() < 0.03) {
              this.give_power_berry('farm_hoe');
            }
          }
        }
        if (!n && obj) {
          this.msg(`There's a ${obj} in the way.`);
        }
      }
      await this.spend(2);
    } else if (t === 'Hammer') {
      if (obj === 'starrock') {
        delete objs[pKey];
        const gem = py_rng().choice(STAR_GEMS);
        this.give('Star Fragment');
        this.give(gem);
        this.fx_break(tx, ty, 'stone', undefined, 1);
        this.fx_add('sparkle', tx, ty, 0.9);
        this.msg(`The fallen star cracks open: a Star Fragment and a ${gem}!`, '0A');
      } else if (obj === 'stone') {
        delete objs[pKey];
        this.fx_break(tx, ty, 'stone', undefined, 0);
        this.msg('Crack! The stone shatters.');
      } else if (obj === 'boulder') {
        if ((this.levels['Hammer'] || 0) < 1) {
          this.msg('This boulder is too big. Upgrade your Hammer.');
        } else {
          this.hp[pKey] = (this.hp[pKey] ?? 6) - (1 + (this.levels['Hammer'] || 0));
          if (this.hp[pKey] <= 0) {
            delete objs[pKey];
            delete this.hp[pKey];
            this.give('Stone', 1);
            this.fx_break(tx, ty, 'stone', '+1', 2);
            this.msg('BOOM! The boulder breaks apart.');
          } else {
            this.fx_hit(tx, ty, 1);
            this.msg('Clang! The boulder cracks.');
          }
        }
      } else if (obj === 'rock') {
        delete objs[pKey];
        this.fx_break(tx, ty, 'stone', undefined, 0);
        const drop = this.mine_drop();
        if (drop) {
          this.give(drop);
          this.msg(`You found ${drop}!`, '0C');
        }
        if (this.ladder && tx === this.ladder[0] && ty === this.ladder[1]) {
          m.set(tx, ty, 'down');
          this.msg("There's a ladder hidden under the rock!", '0A');
        }
      } else if (this.mapname === 'farm' && this.tilled.has(pKey) && !this.crops[pKey]) {
        this.tilled.delete(pKey);
        this.wet.delete(pKey);
        this.msg('You flattened the tilled soil.');
      }
      await this.spend(2);
    } else if (t === 'Axe') {
      if (obj === 'branch') {
        delete objs[pKey];
        this.give('Lumber');
        this.fx_break(tx, ty, 'wood', '+1', 0);
        this.msg('Chop! +1 Lumber.');
      } else if (obj === 'stump') {
        if ((this.levels['Axe'] || 0) < 1) {
          this.msg('This stump is too tough. Upgrade your Axe to Copper+.');
        } else {
          this.hp[pKey] = (this.hp[pKey] ?? 6) - (1 + (this.levels['Axe'] || 0));
          if (this.hp[pKey] <= 0) {
            delete objs[pKey];
            delete this.hp[pKey];
            this.give('Lumber', 6);
            this.fx_break(tx, ty, 'wood', '+6', 2);
            this.msg('The stump splits! +6 Lumber.', '09');
          } else {
            this.fx_hit(tx, ty, 1);
            this.msg('Thunk!');
          }
        }
      } else if (tile === 'tree') {
        this.msg('This tree is too big to chop down.');
      }
      await this.spend(2);
    } else if (t === 'Watering Can') {
      const cap = CAN_CAP[this.levels['Watering Can'] || 0];
      if (tile === 'water' || tile === 'fountain' || tile === 'pond') {
        this.water = cap;
        this.msg(`You fill the watering can. (${cap}/${cap})`, '0D');
        return;
      }
      if (this.water <= 0) {
        this.msg('The watering can is empty. Refill it at a pond or stream.', '08');
        return;
      }
      this.water -= 1;
      if (this.mapname === 'farm') {
        for (const [qx, qy] of this.area()) {
          const qk = pkey(qx, qy);
          if (this.tilled.has(qk)) {
            this.wet.add(qk);
          }
        }
      }
      await this.spend(2);
    } else if (t === 'Fishing Rod') {
      if (tile === 'water' || tile === 'pond') {
        await this.fish();
      } else {
        this.msg('You need to face water to cast your Fishing Rod.');
      }
    }
  }

  async mine_dig(tx: number, ty: number): Promise<void> {
    const m = this.map;
    if (m.tile(tx, ty) !== 'mfloor') {
      this.msg('Nothing to dig here.');
      return;
    }
    const f = this.mine_floor;
    this.mastery_add('mining');
    // Check if Lake Mine floor has a Cursed Tool
    if (this.mine_type === 'lake' && CURSED_TOOL_FLOORS[f]) {
      const cTool = CURSED_TOOL_FLOORS[f];
      if ((this.levels[cTool] || 0) === 4 && py_rng().random() < 0.35) {
        this.levels[cTool] = 5;
        this.msg(`Unearthed the CURSED ${cTool.toUpperCase()}! Bring it to Carter at the Church to bless!`, '0E');
        return;
      }
    }
    // Check Power Berries in mines
    if (this.mine_type === 'spring' && f === 100 && !this.berry_sources.includes('spring_100')) {
      this.give_power_berry('spring_100');
      return;
    }
    if (this.mine_type === 'lake' && f === 19 && !this.berry_sources.includes('lake_19')) {
      this.give_power_berry('lake_19');
      return;
    }
    // Check Spring Mine Floor 255 Teleport Stone
    if (this.mine_type === 'spring' && f === 255 && !this.inv['Teleport Stone']) {
      this.give('Teleport Stone', 1);
      this.msg('Unearthed the legendary TELEPORT STONE on Floor 255!', '0C');
      return;
    }
    // Check Goddess / Kappa Jewels
    if (this.mine_type === 'spring' && (GODDESS_JEWEL_FLOORS as readonly number[]).includes(f) && this.goddess_jewels < 9 && py_rng().random() < 0.4) {
      this.goddess_jewels += 1;
      if (this.goddess_jewels >= 9) {
        this.give('Gem of the Goddess', 1);
        this.msg('All 9 Goddess Jewels united into the GEM OF THE GODDESS!', '0C');
      } else {
        this.msg(`Found a Goddess Jewel! (${this.goddess_jewels}/9)`, '0C');
      }
      return;
    }
    if (this.mine_type === 'lake' && (KAPPA_JEWEL_FLOORS as readonly number[]).includes(f) && this.kappa_jewels < 9 && py_rng().random() < 0.4) {
      this.kappa_jewels += 1;
      if (this.kappa_jewels >= 9) {
        this.give('Gem of the Kappa', 1);
        this.msg('All 9 Kappa Jewels united into the GEM OF THE KAPPA!', '0B');
      } else {
        this.msg(`Found a Kappa Jewel! (${this.kappa_jewels}/9)`, '0B');
      }
      return;
    }
    const r = py_rng().random();
    if (r < 0.22 && f < 255) {
      m.set(tx, ty, 'down');
      this.msg('Your Hoe uncovered a hidden staircase down (>)', '0A');
    } else if (r < 0.48) {
      this.give('Black Grass', 1);
      this.msg('Dug up Black Grass! (+15 Stamina if eaten)', '0B');
    } else if (r < 0.65) {
      const coins = py_rng().randint(10, 50);
      this.gold += coins;
      this.msg(`Dug up ${coins}G in old coins!`, '09');
    } else {
      this.msg('You dig the mine soil, but find nothing.');
    }
  }

  mine_drop(): string | null {
    const allBlessed = UPGRADABLE.every((t) => (this.levels[t] || 0) >= 6);
    const rngPct = py_rng().random() * 100;
    if (this.mine_type === 'lake') {
      return rollLakeMineDrop(this.mine_floor, rngPct);
    }
    return rollSpringMineDrop(this.mine_floor, allBlessed, rngPct);
  }

  async sow(bag: string, p: [number, number]): Promise<void> {
    const crop = bag.slice(0, -6);
    if (this.mapname !== 'farm') {
      this.msg('You can only plant seeds on your farm.');
      return;
    }
    const cropSeason = CROPS[crop][0];
    if (crop !== 'Grass' && cropSeason !== this.season_name) {
      this.msg(`${crop} won't grow in ${this.season_name}.`, '08');
      return;
    }
    let n = 0;
    for (const dx of [-1, 0, 1]) {
      for (const dy of [-1, 0, 1]) {
        const qk = pkey(p[0] + dx, p[1] + dy);
        if (this.tilled.has(qk) && !this.crops[qk]) {
          this.crops[qk] = [crop, 0];
          n += 1;
        }
      }
    }
    if (!n) {
      this.msg('Seeds need empty tilled soil. Use the Hoe first.');
      return;
    }
    this.take(bag);
    this.msg(`You sowed ${crop} seeds on ${n} tile${n > 1 ? 's' : ''}.`, '0B');
    if (!this.inv[bag]) {
      this.tool = 'Watering Can';
    }
    await this.spend(1);
  }

  async fish(): Promise<void> {
    const wait = py_rng().uniform(1.0, 3.2);
    const start = Date.now() / 1000;
    let bite: number | null = null;
    let result: string | null = null;
    while (result === null) {
      const now = Date.now() / 1000;
      if (bite === null && now - start >= wait) {
        bite = now;
      }
      if (bite !== null && now - bite > 0.95) {
        result = 'miss';
        break;
      }
      const [W, H] = [this.scr.w, this.scr.h];
      const draw = () => {
        const [bx, by] = [Math.floor((W - 34) / 2), Math.floor(H / 2) - 3];
        this.scr.box(bx, by, 34, 5, '0D', '00', 'Fishing');
        if (bite === null) {
          const dots = '.'.repeat(1 + (Math.floor((now - start) * 2) % 3));
          this.scr.put(bx + 3, by + 2, `~ ~ o ~ ~   waiting${dots}`, '0D');
        } else {
          this.scr.put(bx + 3, by + 2, '~ ~ O ~ ~   !! BITE !! SPACE', '08', '00', true);
        }
      };
      this.render();
      draw();
      this.scr.flush();
      const k = await this.scr.getKey(0.05);
      if (k) {
        if (CANCEL_KEYS.has(k)) {
          result = 'quit';
        } else if (bite === null) {
          result = 'early';
        } else {
          result = 'catch';
        }
      }
    }
    this.last = Date.now() / 1000;
    if (result === 'catch') {
      const caught = this.roll_catch();
      const [tx, ty] = this.target();
      this.give(caught);
      this.fx_add('splash', tx, ty, 0.7);
      if (ITEMS[caught]?.[2] === 'fish') {
        this.fish_caught[caught] = (this.fish_caught[caught] || 0) + 1;
        this.mastery_add('fishing');
      }
      if (caught === REGION_CATCH[this.mapname]?.rare) {
        this.fx_add('sparkle', tx, ty, 0.9);
        this.msg(`A rare catch: ${caught}!`, '0C');
      } else {
        this.msg(`You caught a ${caught}!`, '0C');
      }
    } else if (result === 'early') {
      this.msg('You reeled in too early.');
    } else if (result === 'miss') {
      this.msg('It got away...');
    }
    await this.spend(3);
  }

  /** What bites here: Willow Bend and Lighthouse Point have their own tables; elsewhere the valley-wide odds. */
  roll_catch(): string {
    const rodLvl = this.levels['Fishing Rod'] || 0;
    const table = REGION_CATCH[this.mapname];
    if (table) {
      return rollRegionCatch(table, { season: this.season, weather: this.weather, rodLvl }, () => py_rng().random());
    }
    const r = py_rng().random();
    if (this.mapname === 'mine' && this.mine_type === 'lake' && this.mine_floor === 9) return 'Coelacanth';
    if (this.mapname === 'beach' && rodLvl >= 4 && r < 0.12) {
      if (this.season === 3 && !this.berry_sources.includes('ocean_fish')) {
        this.give_power_berry('ocean_fish');
      }
      return this.season === 1 ? 'Pirate Treasure' : this.season === 2 ? 'Fossil of Ancient Fish' : 'Squid';
    }
    if (rodLvl >= 3 && r < 0.08) return this.mapname === 'mountain' ? 'Carp' : 'Catfish';
    if (r < 0.06) return py_rng().choice(['Boot', 'Empty Can']);
    if (r < 0.25 + rodLvl * 0.08) return 'Large Fish';
    if (r < 0.6) return 'Medium Fish';
    return 'Small Fish';
  }

  async interact(): Promise<void> {
    const [tx, ty] = this.target();
    const pKey = pkey(tx, ty);
    const m = this.map;
    const n = this.npc_at(tx, ty);
    if (n) {
      await this.talk(n);
      return;
    }
    if (pKey in m.doors) {
      await this.enter(m.doors[pKey]);
      return;
    }
    if (pKey in m.warps) {
      const [mp, wx, wy] = m.warps[pKey];
      this.riding_horse = false;
      this.warp(mp, wx, wy);
      return;
    }
    // Check if interacting with outdoor Dog or Horse on the farm
    if (this.mapname === 'farm') {
      if (tx === 21 && ty === 6) {
        await this.dog_menu();
        return;
      }
      if (!this.riding_horse && tx === 25 && ty === 6) {
        await this.horse_menu();
        return;
      }
    }
    const tile = m.tile(tx, ty);
    const here = this.objs[this.mapname]?.[pKey];
    if (here === 'dig') {
      this.msg('The soil here is wriggling. Something is buried! Dig it up with your Hoe.', '0A');
      return;
    }
    if (here === 'starrock') {
      this.msg('A fallen star, still warm to the touch. Crack it open with your Hammer.', '0A');
      return;
    }

    // Hot Spring on Mother's Hill (either standing in or facing 'spring')
    if (tile === 'spring' || m.tile(this.px, this.py) === 'spring') {
      if (this.held === 'Egg') {
        this.take('Egg', 1);
        this.give('Spa-Boiled Egg', 1);
        this.msg('You tossed an Egg into the Hot Spring: Spa-Boiled Egg!', '09');
        return;
      }
      this.stamina = Math.min(this.max_stamina, this.stamina + 80);
      this.fatigue = Math.max(0, this.fatigue - 40);
      await this.advance(60);
      await this.say('Ahh... you soak in the Mother\'s Hill Hot Spring for an hour. (+80 Stamina, -40 Fatigue!)', 'Hot Spring');
      return;
    }

    // Cedar Hollow's mossy pond and Lighthouse Point's tide pools are not the Goddess Pond
    if (tile === 'pond' && this.mapname !== 'mountain') {
      if (this.mapname === 'woods') await this.hollow_offering();
      else await this.say(TIDE_POOL_TEXT, 'Tide Pool');
      return;
    }

    // Goddess Pond Offering
    if (tile === 'pond') {
      if (!this.held) {
        await this.say('The Goddess Pond shimmers. Hold an item from your Rucksack (i) and press X to make an offering!', 'Goddess Pond');
        return;
      }
      const item = this.held;
      if (item === 'Blue Feather') {
        await this.propose('Harvest Goddess');
        return;
      }
      this.take(item, 1);
      this.goddess_gifts += 1;
      this.friend['Harvest Goddess'] = clamp((this.friend['Harvest Goddess'] || 0) + 5, 0, 100);
      await this.say(`Tadaaa! Thank you for the ${item}! (Total offerings: ${this.goddess_gifts})`, 'Harvest Goddess');
      if (this.goddess_gifts === 10) {
        this.give_power_berry('goddess_10');
        await this.say('For 10 offerings, please accept this Power Berry!', 'Harvest Goddess');
      } else if (this.goddess_gifts === 20) {
        this.give('White Grass', 1);
        await this.say('For 20 offerings, here is a sacred White Grass and the Mine Elevator blessing!', 'Harvest Goddess');
      }
      return;
    }

    // Mother's Hill Lake Cucumber Offering to Kappa
    if (this.mapname === 'mountain' && tile === 'water' && this.held === 'Cucumber') {
      this.take('Cucumber', 1);
      this.kappa_gifts += 1;
      if (this.kappa_gifts >= 10 && !this.has_mystic_berry) {
        this.has_mystic_berry = true;
        await this.say('...You brought 10 Cucumbers. Eat this Mystic Blue Berry. Rain and snow will never tire you again.', 'Kappa');
        this.msg("Obtained Kappa's Mystic Blue Berry! Zero fatigue from rain/snow!", '0C');
      } else {
        await this.say(`...Kappa emerges from the lake, munches your Cucumber, and vanishes. (${this.kappa_gifts}/10 for Mystic Berry)`, 'Kappa');
      }
      return;
    }

    // Willow Bend: skip a flat stone across the river
    if (this.mapname === 'river' && tile === 'water') {
      await this.skip_stone();
      return;
    }

    // Farm Crop Harvesting
    if (this.mapname === 'farm' && pKey in this.crops) {
      const [crop, age] = this.crops[pKey];
      const [days, regrow] = [CROPS[crop][2], CROPS[crop][3]];
      if (age >= days) {
        if (crop === 'Grass') {
          this.msg('Use your Sickle to cut ripe pasture Grass into Fodder.');
          return;
        }
        if (this.held === 'Basket' && getBasketTotal(this.basket) < BASKET_CAPACITY) {
          this.basket[crop] = (this.basket[crop] || 0) + 1;
          this.msg(`Harvested ${crop} into Basket (${getBasketTotal(this.basket)}/${BASKET_CAPACITY})!`, '0B');
        } else {
          this.give(crop);
          this.msg(`You harvested a ${crop}!`, '0B');
        }
        if (regrow) {
          this.crops[pKey][1] = days - regrow;
        } else {
          delete this.crops[pKey];
        }
        this.mastery_add('farming');
        this.fx_add('sparkle', tx, ty, 0.7);
      } else {
        this.msg(`${crop}: ${days - age} more day${days - age > 1 ? 's' : ''} to go.${this.wet.has(pKey) ? '' : ' (needs water)'}`);
      }
      return;
    }

    // Forage Pickup
    const fr = this.forage[this.mapname] || {};
    if (pKey in fr) {
      const item = py_pop(fr, pKey);
      this.give(item);
      this.mastery_add('foraging');
      if (this.hollow_luck_day === this.absday() && py_rng().random() < HOLLOW_LUCK_CHANCE) {
        this.give(item);
        this.fx_add('sparkle', tx, ty, 0.7);
        this.msg(`You picked up ${item}, and found a second one beside it! (Hollow luck)`, '0B');
      } else {
        this.msg(`You picked up ${item}.`, '0B');
      }
      return;
    }

    // Farm Honey/Apple Tree, Doghouse, Horse Stable, Mill, Trash Can, Inn Phone
    const signId = m.signs[pKey];
    if (signId === 'honey_tree' || (this.mapname === 'farm' && tile === 'tree' && tx === 7 && ty === 6)) {
      if (this.honey_picked) {
        await this.say('Bees buzz happily around the farm tree. Come back tomorrow for more Honey!', 'Farm Tree');
      } else {
        this.honey_picked = true;
        this.give('Honey', 1);
        let msgTxt = 'You gathered sweet Honey from the farm tree!';
        if (this.season === 2) {
          const appleType = py_rng().random() < 0.15 ? 'SUGDW Apple' : 'Apple';
          this.give(appleType, 1);
          msgTxt += ` An ${appleType} also dropped!`;
        }
        this.msg(msgTxt, '09');
      }
      return;
    }
    if (signId === 'doghouse' || tile === 'doghouse') {
      await this.dog_menu();
      return;
    }
    if (signId === 'stable' || tile === 'stable') {
      await this.horse_menu();
      return;
    }
    if (signId === 'mill' || tile === 'mill') {
      await this.mill_menu();
      return;
    }
    if (signId === 'trash' || tile === 'trash') {
      await this.trash_can_menu();
      return;
    }
    if (signId === 'inn_phone' || tile === 'phone') {
      await this.inn_phone_menu();
      return;
    }
    if (signId === 'ridge_lookout') {
      await this.ridge_lookout();
      return;
    }
    if (signId === 'lighthouse_log') {
      await this.lighthouse_read();
      return;
    }

    if (tile === 'bin') {
      await this.ship();
    } else if (tile === 'bed') {
      if (await this.confirm('Go to sleep for the night? (Saves to Slot 1)')) {
        await this.new_day('sleep');
      }
    } else if (tile === 'tv') {
      await this.tv_menu();
    } else if (tile === 'cal') {
      const left = 30 - this.day;
      const nxt = SEASONS[(this.season + 1) % 4];
      await this.say(`Today is ${this.date_str()}. ${left} day${left !== 1 ? 's' : ''} until ${nxt}.`, 'Calendar');
      await this.fest_calendar();
    } else if (tile === 'counter' || tile === 'bookcase') {
      await this.interior_interact(tile, [tx, ty]);
    } else if (tile === 'kitchen' || tile === 'bath' || tile === 'shelf' || tile === 'vase' || tile === 'fireplace') {
      await this.use_furniture(tile);
    } else if (tile === 'sign') {
      let text = m.signs[pKey] || '';
      if (text === 'farm') {
        text = `${this.farm.toUpperCase()} FARM — Owner: ${this.name}`;
      } else if (text === 'request_board') {
        await this.request_menu();
        return;
      }
      await this.say(text, 'Sign');
    } else if (this.held) {
      this.msg(`You're holding ${this.held}. Face someone and press X to give it.`);
    }
  }

  // ---------------------------------------------------------------- outer-region landmarks

  /** Skyline Ridge lookout: the view reads tomorrow's weather, and once a day the cold air revives you. */
  async ridge_lookout(): Promise<void> {
    let text = `${this.lookout_scene()} ${LOOKOUT_VIEW[this.tomorrow] || LOOKOUT_VIEW.Sunny}`;
    if (this.lookout_day !== this.absday()) {
      this.lookout_day = this.absday();
      this.stamina = Math.min(this.max_stamina, this.stamina + LOOKOUT_STAMINA);
      this.fatigue = Math.max(0, this.fatigue - LOOKOUT_FATIGUE);
      text += ` The thin, cold air clears your head. (+${LOOKOUT_STAMINA} Stamina, -${LOOKOUT_FATIGUE} Fatigue)`;
    }
    await this.say(text, 'Skyline Ridge Lookout');
  }

  lookout_scene(): string {
    const h = Math.floor(this.minutes / 60);
    if (h < 9) return 'Morning mist is lifting off the valley below.';
    if (h < 17) return 'The whole valley lies below you: the farm, the town, the river and the sea.';
    if (h < 20) return 'The valley glows gold in the evening light.';
    return 'Far below, the lights of town twinkle in the dark.';
  }

  /** Lighthouse Point: the old keeper's log, one new page a day. The last page leaves a keepsake. */
  async lighthouse_read(): Promise<void> {
    const total = LIGHTHOUSE_LOG.length;
    const fresh = this.lighthouse_log < total && this.lighthouse_day !== this.absday();
    if (fresh) {
      this.lighthouse_log += 1;
      this.lighthouse_day = this.absday();
    }
    const page = clamp(this.lighthouse_log, 1, total);
    const intro = page === 1 ? `${LIGHTHOUSE_INTRO}\n` : '';
    const more = this.lighthouse_log < total ? '\n(The next page is stuck fast with salt. Come back tomorrow.)' : '';
    const lamp = this.weather === 'Rain' || this.weather === 'Typhoon' ? '\nHigh above you, the old lamp is turning.' : '';
    await this.say(`${intro}${LIGHTHOUSE_LOG[page - 1]}${more}${lamp}`, `Keeper's Log ${page}/${total}`);
    if (fresh && this.lighthouse_log === total) {
      this.give('Sea Glass');
      this.msg('Tucked behind the last page: a smooth piece of green Sea Glass.', '0C');
    }
  }

  /** Cedar Hollow's mossy pond: give back something that grew wild for a lucky day of foraging. */
  async hollow_offering(): Promise<void> {
    if (this.hollow_luck_day === this.absday()) {
      await this.say('Rings are still spreading from your last gift. The Hollow is listening; come back tomorrow.', 'Mossy Pond');
      return;
    }
    const item = this.held;
    if (!item || ITEMS[item]?.[2] !== 'forage') {
      await this.say('Moss-green water, very still. Folk say the Hollow smiles on anyone who gives back something that grew wild. Hold a forage item and press X.', 'Mossy Pond');
      return;
    }
    this.take(item, 1);
    this.hollow_luck_day = this.absday();
    const [tx, ty] = this.target();
    this.fx_add('sparkle', tx, ty, 0.9);
    await this.say(`You drop the ${item} into the pond. It sinks without a ripple... then the whole pond shivers. Today, wild things seem to find you. (Lucky foraging until tonight)`, 'Mossy Pond');
  }

  /** Willow Bend: skip a flat stone across the river and try to beat your record. */
  async skip_stone(): Promise<void> {
    const calm = this.weather !== 'Rain' && this.weather !== 'Typhoon';
    const n = rollStoneSkips(() => py_rng().random(), calm);
    const [tx, ty] = this.target();
    this.fx_add('splash', tx, ty, 0.6);
    this.fx_add('text', tx, ty, 1.1, { text: `${n}x` });
    if (n > this.skip_best) {
      this.skip_best = n;
      this.msg(`Skip, skip, skip... ${n} skip${n === 1 ? '' : 's'}! A new Willow Bend record!`, '0C');
    } else {
      this.msg(`Your stone skips ${n} time${n === 1 ? '' : 's'}. (Record: ${this.skip_best})`, '0D');
    }
    await this.spend(1);
  }

  async dog_menu(): Promise<void> {
    if (!this.berry_sources.includes('truth:doghouse')) {
      this.give_truth_jewel('doghouse');
    }
    const h = Math.floor(this.dog_aff / 10);
    const bar = `[${'#'.repeat(h)}${'.'.repeat(10 - h)}]`;
    const opts = ['Pet & Hug Dog', 'Play Fetch with Dog Ball', 'Practice Beach Frisbee', 'Leave'];
    const sel = await this.menu(`Doghouse — Dog ${bar} (Max Frisbee: ${this.dog_frisbee_dist}m)`, opts);
    if (sel === 0) {
      this.dog_aff = Math.min(100, this.dog_aff + 3);
      this.fx_add('emote', 21, 6, 1.0, { emote: 'heart' });
      this.msg('Woof! Your dog wags its tail happily! (+Affection)', '0B');
    } else if (sel === 1) {
      if (!this.inv['Dog Ball']) {
        await this.say('Buy a Dog Ball from Won at Zack\'s Beach House to play fetch!', 'Doghouse');
      } else {
        this.dog_aff = Math.min(100, this.dog_aff + 5);
        this.fx_add('emote', 21, 6, 1.0, { emote: 'heart' });
        this.msg('Your dog chases the Dog Ball and brings it right back! Woof!', '0B');
      }
    } else if (sel === 2) {
      if (!this.inv['Frisbee']) {
        await this.say('Buy a Frisbee from Won at Zack\'s Beach House to train for Beach Day (Summer 1)!', 'Doghouse');
      } else {
        const gain = py_rng().randint(2, 6);
        this.dog_frisbee_dist = Math.min(95, this.dog_frisbee_dist + gain);
        this.dog_aff = Math.min(100, this.dog_aff + 4);
        this.fx_add('emote', 21, 6, 1.0, { emote: 'note' });
        this.msg(`Great catch! Your dog's Frisbee record is now ${this.dog_frisbee_dist}m!`, '0C');
      }
    }
  }

  async horse_menu(): Promise<void> {
    if (!this.berry_sources.includes('truth:stable')) {
      this.give_truth_jewel('stable');
    }
    const h = Math.floor(this.horse_aff / 10);
    const bar = `[${'#'.repeat(h)}${'.'.repeat(10 - h)}]`;
    const opts = [
      'Talk & Pat Horse',
      'Brush Horse',
      this.riding_horse ? 'Dismount Horse' : 'Ride Horse (Fast Movement)',
      'Ship Items via Saddlebags',
      'Leave',
    ];
    const sel = await this.menu(`Horse Stable — Horse ${bar}`, opts);
    if (sel === 0) {
      this.horse_aff = Math.min(100, this.horse_aff + 3);
      this.fx_add('emote', 25, 6, 1.0, { emote: 'heart' });
      this.msg('Neigh! Your horse nuzzles your shoulder.', '0B');
    } else if (sel === 1) {
      if (!this.inv['Brush']) {
        await this.say('Buy a Brush from Saibara or Barley to groom your horse.', 'Stable');
      } else {
        this.horse_aff = Math.min(100, this.horse_aff + 5);
        this.fx_add('emote', 25, 6, 1.0, { emote: 'heart' });
        this.msg("You brushed your horse's coat until it gleams!", '0B');
      }
    } else if (sel === 2) {
      this.riding_horse = !this.riding_horse;
      this.fx_add('emote', this.px, this.py, 0.9, { emote: this.riding_horse ? 'heart' : 'note' });
      this.msg(this.riding_horse ? 'You mount your horse! Double speed on the farm!' : 'You dismount your horse.', '09');
    } else if (sel === 3) {
      await this.ship();
    }
  }

  async mill_menu(): Promise<void> {
    const cornCount = this.inv['Corn'] || 0;
    if (cornCount <= 0) {
      await this.say('Water Mill: Place 1 Corn here to grind it into 30 bags of Chicken Feed! (You have 0 Corn.)', 'Water Mill');
      return;
    }
    if (await this.confirm(`Grind 1 Corn into 30 Chicken Feed? (You have ${cornCount} Corn)`)) {
      this.take('Corn', 1);
      this.give('Chicken Feed', 30);
      this.msg('The millstone turns: 1 Corn ground into +30 Chicken Feed!', '09');
    }
  }

  async trash_can_menu(): Promise<void> {
    const trashItems = ['Boot', 'Empty Can', 'Fish Bones'].filter((i) => (this.inv[i] || 0) > 0);
    if (!trashItems.length) {
      await this.say('Rose Square Trash Can: Dispose of fished-up Boots and Empty Cans here so you never litter!', 'Trash Can');
      return;
    }
    for (const item of trashItems) {
      const q = this.inv[item];
      this.take(item, q);
    }
    this.msg('You properly disposed of your fishing trash in the plaza bin!', '0B');
  }

  async tv_menu(): Promise<void> {
    const is444 = Math.floor(this.minutes / 60) % 12 === 4 && this.minutes % 60 === 40;
    if (is444) {
      await this.say('4:44...4:44...4:44... The TV screen flickers with eerie static before returning to normal!', 'TV (4:44)');
    }
    const sel = await this.menu('Farmhouse Television — Choose Channel', [
      'Ch 1 (Left): Weather Forecast',
      'Ch 2 (Up): Mineral Town News & Calendar',
      'Ch 3 (Right): Variety, Cooking Show (Tue) & TV Shopping (Sat)',
      'Ch 4 (Down): Life on the Farm Guide',
      'Turn Off',
    ]);
    if (sel === 0) {
      await this.say(`Tomorrow's weather forecast for Mineral Town: ${this.tomorrow}! Plan your watering and animals accordingly.`, 'Weather Channel');
    } else if (sel === 1) {
      await this.say(`Mineral Town News:${this.fest_news() || ' All is peaceful in Mineral Town today.'}`, 'News Channel');
    } else if (sel === 2) {
      if (this.season === 0 && this.day <= 5) {
        const win = py_rng().random() < 0.7;
        if (win) {
          this.give('Relaxation Tea Leaves', 1);
          await this.say('Harvest Goddess New Year High-Low Gameshow! You guessed right and won Relaxation Tea Leaves!', 'TV Gameshow');
        } else {
          await this.say('Harvest Goddess New Year High-Low Gameshow! So close—try again tomorrow!', 'TV Gameshow');
        }
        return;
      }
      if (this.weekday === 1) {
        // Tuesday: The Delicious Hour
        const dish = py_rng().choice(Object.keys(RECIPES));
        await this.say(`Welcome to THE DELICIOUS HOUR! Today's featured recipe: ${this.recipe_line(dish)}! Try cooking it in your Kitchen!`, 'Cooking Show');
      } else if (this.weekday === 5) {
        // Saturday: TV Shopping Network
        const nextItem = TV_SHOPPING_ITEMS.find(([name]) => {
          if (name === 'Power Berry') return !this.berry_sources.includes('tv_shopping');
          return !this.inv[name] && !this.house_flags.includes(name);
        });
        if (!nextItem) {
          await this.say('TV Shopping Network: You have bought every single item in our catalog! Thank you!', 'TV Shopping');
        } else {
          this.tv_watched_saturday = nextItem[0];
          await this.say(
            `Welcome to SATURDAY TV SHOPPING! Today's special is the ${nextItem[0]} for just ${nextItem[1]}G! (${nextItem[2]}) Use the Telephone at Doug's Inn to order!`,
            'TV Shopping'
          );
        }
      } else {
        const show = py_rng().choice([
          'Star Lillia: Space Princess',
          'Mechabot Ultror',
          'The Samurai Farmer Chronicles',
          'Fairy & Me: Episode 14',
        ]);
        await this.say(`You watch an exciting episode of '${show}'.`, 'Variety Channel');
      }
    } else if (sel === 3) {
      await this.say(py_rng().choice(BOOKS), 'Life on the Farm');
    }
  }

  async inn_phone_menu(): Promise<void> {
    if (this.tv_order) {
      await this.say(`Zack is already delivering your ${this.tv_order[0]} soon!`, 'Inn Telephone');
      return;
    }
    const nextItem = TV_SHOPPING_ITEMS.find(([name]) => {
      if (name === 'Power Berry') return !this.berry_sources.includes('tv_shopping');
      return !this.inv[name] && !this.house_flags.includes(name);
    });
    if (!nextItem) {
      await this.say('TV Shopping: You already own everything we sell!', 'Inn Telephone');
      return;
    }
    const [itemName, price, desc] = nextItem;
    if (await this.confirm(`Order ${itemName} (${price}G + 10G call)? ${desc}`)) {
      if (this.gold < price + 10) {
        await this.say(`You need ${price + 10}G total to place this order.`, 'Inn Telephone');
        return;
      }
      this.gold -= price + 10;
      this.tv_order = [itemName, this.absday() + 2];
      await this.say(`Thank you for ordering the ${itemName}! Zack will deliver it to your farmhouse in 2 days!`, 'TV Shopping');
    }
  }

  hearts(n: string): [string, string] {
    const info = getHeartInfo(this.friend[n] || 0);
    return [`${info.bar} ${info.label}`, info.color];
  }

  async check_heart_and_rival_events(n: string): Promise<void> {
    const aff = this.friend[n] || 0;
    const events = HEART_EVENTS[n];
    if (events) {
      const thresholds: [number, number][] = [
        [10, 0], // Black
        [25, 1], // Purple
        [45, 2], // Blue
        [65, 3], // Yellow
      ];
      for (const [req, idx] of thresholds) {
        const key = `${n}:${idx}`;
        if (aff >= req && !this.heart_events_seen.includes(key)) {
          this.heart_events_seen.push(key);
          this.friend[n] = clamp(aff + 5, 0, 100);
          await this.say(events[idx], `${n} — Heart Event`);
          if (n === 'Karen' && idx === 0) {
            this.give('Grass Seeds', 1);
          }
          break;
        }
      }
    }

    for (const [bride, rival, scene] of RIVAL_PAIRS) {
      if ((n === bride || n === rival) && this.married !== bride && this.married !== rival) {
        const rKey = `${bride}:${rival}`;
        if (!this.rival_events_seen.includes(rKey) && (this.friend[rival] || 0) >= 15) {
          this.rival_events_seen.push(rKey);
          await this.say(`Rival Event (${bride} & ${rival}): ${scene}`, 'Rival Event');
          break;
        }
      }
    }
  }

  async talk(n: string): Promise<void> {
    if (await this.fest_talk(n)) {
      return;
    }
    const d = NPCS[n];
    if (!d) return;
    const npcSpot: [number, number] | null =
      this.npc_pos[n] && NPCS[n]?.where?.[0] === this.mapname
        ? this.npc_pos[n]
        : this.indoor_npcs[n]?.map === this.mapname
          ? this.indoor_npcs[n].pos
          : n === this.married && this.mapname === 'house'
            ? SPOUSE_POS
            : null;
    const emitNpcEmote = (emote: EmoteKind) => {
      if (npcSpot) this.fx_add('emote', npcSpot[0], npcSpot[1], 1.1, { emote });
    };
    if (this.held) {
      const item = this.held;
      if (item === 'Blue Feather') {
        await this.propose(n);
        return;
      }
      if (this.gifted.has(n)) {
        emitNpcEmote('note');
        await this.say('You already gave me something today. Thank you, though!', n);
        return;
      }
      this.take(item);
      let pref: 'love' | 'like' | 'neutral' | 'hate' = 'neutral';
      let line = `Oh, a ${item}? For me? Thanks.`;
      if (d.loves.includes(item)) {
        pref = 'love';
        line = `Oh! ${item}! I love this! Thank you so much!`;
      } else if (d.likes.includes(item)) {
        pref = 'like';
        line = `A ${item}? Thank you, that's really nice.`;
      } else if (d.hates.includes(item)) {
        pref = 'hate';
        line = `...A ${item}? I don't really like this.`;
      }
      const isBday = this.birthdays().includes(n);
      const pts = calculateGiftPoints(pref, isBday, false);
      if (isBday) {
        line += pts > 0 ? ' And on my birthday! You remembered! (5x Bonus!)' : ' ...On my birthday, too.';
      }
      this.friend[n] = clamp((this.friend[n] || 0) + pts, 0, 100);
      this.gifted.add(n);
      emitNpcEmote(pref === 'love' ? 'heart' : pref === 'hate' ? 'cross' : 'note');
      await this.say(line, n);
      await this.check_heart_and_rival_events(n);
      return;
    }

    let line = '';
    if (n === this.married && this.mapname === 'house') {
      line = py_rng().choice(SPOUSE_LINES);
      if (this.child_name) {
        line += ` Little ${this.child_name} is growing so fast!`;
      }
      emitNpcEmote('heart');
    } else {
      const f = this.friend[n] || 0;
      const tier = f < 30 ? 0 : f < 70 ? 1 : 2;
      line = py_rng().choice(d.lines[tier]);
      emitNpcEmote(f >= 60 ? 'heart' : 'note');
    }
    if (!this.talked.has(n)) {
      this.talked.add(n);
      this.friend[n] = clamp((this.friend[n] || 0) + 2, 0, 100);
    }
    await this.say(line, n);
    await this.check_heart_and_rival_events(n);
  }

  async propose(n: string): Promise<void> {
    const d = NPCS[n];
    if (!d?.bach) {
      await this.say('What a beautiful Blue Feather! You should give it to someone special.', n);
    } else if (this.married) {
      await this.say("You're already married! Go home to your family.", n);
    } else if (!this.house_flags.includes('Big Bed')) {
      await this.say('A Blue Feather...? I care for you too, but your house needs a Big Bed before we can wed!', n);
    } else if ((this.friend[n] || 0) < 90) {
      await this.say("A Blue Feather...? I'm sorry. My heart isn't at Red yet—let's grow closer first.", n);
    } else {
      this.take('Blue Feather');
      await this.say('A Blue Feather...! Is this... a proposal? YES! Of course, yes!', n);
      await this.say('A week later, the whole town gathers at the Church.', null);
      await this.say(`Pastor Carter: Do you, ${this.name}, take ${n} to be your spouse?`, null);
      await this.say(`You say 'I do.' The bells of Mineral Town ring out for ${this.name} and ${n}!`, null);
      this.married = n;
      this.marriage_day = this.absday();
      delete this.npc_pos[n];
      await this.say(`${n} has moved into your farmhouse. Congratulations!`, null);
    }
  }

  async ship(): Promise<void> {
    while (true) {
      const basketCount = getBasketTotal(this.basket);
      const items = py_sorted(Object.keys(this.inv)).filter((i) => ITEMS[i] && ITEMS[i][0] > 0);
      if (!items.length && basketCount === 0) {
        await this.say('You have nothing shippable in your rucksack or Basket.', 'Shipping Bin');
        return;
      }
      const opts: string[] = [];
      if (basketCount > 0) {
        const bVal = py_sum(
          Object.entries(this.basket).map(([i, q]) => (ITEMS[i] ? ITEMS[i][0] : 0) * q)
        );
        opts.push(`Empty Harvest Basket into Bin (${basketCount}/${BASKET_CAPACITY} items — ${bVal}G)`);
      }
      opts.push(...items.map((i) => `${i} x${this.inv[i]} (${ITEMS[i][0]}G each)`), 'Done');
      const pending = py_sum(
        Object.entries(this.bin).map(([i, q]) => (ITEMS[i] ? ITEMS[i][0] : 0) * q)
      );
      const sel = await this.menu(`Shipping Bin  (in bin: ${pending}G — pickup at 5PM)`, opts);
      if (sel === null || opts[sel] === 'Done') {
        return;
      }
      if (basketCount > 0 && sel === 0) {
        for (const [bItem, bQty] of Object.entries(this.basket)) {
          this.bin[bItem] = (this.bin[bItem] || 0) + bQty;
        }
        this.basket = {};
        this.msg(`Dumped all ${basketCount} items from your Basket into the Shipping Bin!`, '09');
        continue;
      }
      const itemIdx = basketCount > 0 ? sel - 1 : sel;
      const item = items[itemIdx];
      const q = await this.ask_qty(`Ship how many ${item}?`, this.inv[item], ITEMS[item][0], 'Value');
      if (q) {
        this.take(item, q);
        this.bin[item] = (this.bin[item] || 0) + q;
        this.msg(`Shipped ${q} ${item}. Zack collects at 5:00 PM.`, '09');
      }
    }
  }

  async rucksack(): Promise<void> {
    while (true) {
      const items = py_sorted(Object.keys(this.inv));
      if (!items.length) {
        await this.say('Your rucksack is empty.', null);
        return;
      }
      const basketTotal = getBasketTotal(this.basket);
      const opts = items.map((i) => {
        if (i === 'Basket') {
          return `${i === this.held ? '>' : ' '} Basket (${basketTotal}/${BASKET_CAPACITY} items)`;
        }
        return `${i === this.held ? '>' : ' '} ${i} x${this.inv[i]}`;
      });
      const info = (s: number) => {
        const i = items[s];
        if (i === 'Basket') {
          const contents = Object.entries(this.basket)
            .map(([k, v]) => `${k} x${v}`)
            .join(', ');
          return [
            `  Holds up to ${BASKET_CAPACITY} shippable items (${basketTotal}/${BASKET_CAPACITY} full)`,
            `  Contents: ${contents || 'Empty — Hold Basket while harvesting crops!'}`,
          ];
        }
        const [sell, eat, cat] = ITEMS[i] || [0, 0, 'item'];
        const parts = [cat];
        if (sell) parts.push(`ships ${sell}G`);
        if (eat) parts.push(`${eat > 0 ? '+' : ''}${eat} stamina`);
        return [`  ${parts.join(', ')}`];
      };
      const sel = await this.menu('Rucksack', opts, 0, info);
      if (sel === null) return;
      const item = items[sel];
      const sub = [this.held === item ? 'Put away' : 'Hold (to gift / offer / use)'];
      if (ITEMS[item] && ITEMS[item][1] !== 0) {
        sub.push('Eat');
      }
      if (item !== 'Basket' && this.inv['Basket'] && ITEMS[item]?.[0] > 0 && basketTotal < BASKET_CAPACITY) {
        sub.push(`Put in Basket (${basketTotal}/${BASKET_CAPACITY})`);
      }
      if (item === 'Teleport Stone') {
        sub.push('Teleport');
      }
      sub.push('Cancel');
      const s2 = await this.menu(item, sub);
      if (s2 === null || sub[s2] === 'Cancel') continue;
      if (sub[s2] === 'Eat') {
        this.take(item);
        const gain = ITEMS[item][1];
        this.stamina = clamp(this.stamina + gain, 0, this.max_stamina);
        if (item.includes('Turbojolt') || item === 'Elli Leaves' || item === 'Relaxation Tea' || item === 'White Grass') {
          this.fatigue = Math.max(0, this.fatigue - 35);
        }
        this.msg(`You ate the ${item}. (${gain >= 0 ? '+' : ''}${gain} Stamina)`, '0B');
      } else if (sub[s2].startsWith('Put in Basket')) {
        const space = BASKET_CAPACITY - basketTotal;
        const maxPut = Math.min(space, this.inv[item]);
        const q = maxPut === 1 ? 1 : await this.ask_qty(`Put how many ${item} in Basket?`, maxPut, ITEMS[item][0], 'Value');
        if (q > 0) {
          this.take(item, q);
          this.basket[item] = (this.basket[item] || 0) + q;
          this.msg(`Placed ${q} ${item} into your Basket (${getBasketTotal(this.basket)}/${BASKET_CAPACITY}).`, '09');
        }
      } else if (sub[s2] === 'Teleport') {
        await this.use_teleport_stone();
        return;
      } else if (sub[s2] === 'Put away') {
        this.held = null;
        this.msg(`You put away the ${item}.`);
      } else {
        this.held = item;
        this.msg(
          item === 'Basket'
            ? `Holding Basket (${basketTotal}/${BASKET_CAPACITY}). Harvest crops with X to fill it automatically!`
            : `You hold the ${item}. Face someone or a pond and press X.`
        );
        return;
      }
    }
  }

  async coop(): Promise<void> {
    while (true) {
      const info = [
        `  Chickens: ${this.chickens}/${this.coop_cap()}   Fed: ${this.fed}   Affection: ${this.chicken_aff}/100`,
        `  Eggs waiting: ${this.eggs}   Incubator: ${this.incubator_days > 0 ? `${this.incubator_days}d left` : 'Empty'}   Feed: ${this.inv['Chicken Feed'] || 0}`,
      ];
      const opts = [
        'Fill feed boxes',
        'Collect eggs (Quality based on affection)',
        'Place Egg in Incubator (3 days to hatch)',
      ];
      if (this.makers.includes('Mayonnaise Maker')) {
        opts.push('Use Mayonnaise Maker (Egg -> Mayonnaise)');
      }
      opts.push('Grazing / Outdoor Bell (+Outdoor Hours)', 'Leave');
      const sel = await this.menu('Chicken Coop', opts, 0, info);
      if (sel === null || opts[sel] === 'Leave') return;
      const act = opts[sel];
      if (act === 'Fill feed boxes') {
        if (!this.chickens) {
          await this.say('The coop is empty. Lillia sells chickens at the Poultry Farm.', null);
          continue;
        }
        const n = Math.min(this.chickens - this.fed, this.inv['Chicken Feed'] || 0);
        if (this.fed >= this.chickens) {
          await this.say('Every feed box is already full.', null);
        } else if (!n) {
          await this.say("You're out of Chicken Feed. Buy it at the Poultry Farm or grind Corn in the Mill!", null);
        } else {
          this.take('Chicken Feed', n);
          this.fed += n;
          this.chicken_aff = Math.min(100, this.chicken_aff + 2);
          this.msg(`You filled ${n} feed box${n > 1 ? 'es' : ''}. Cluck cluck!`, '09');
        }
      } else if (act.startsWith('Collect eggs')) {
        if (this.eggs > 0) {
          const eggType = getEggQuality(this.chicken_aff, this.chicken_fest_won, this.outdoor_hours, py_rng().random());
          this.give(eggType, this.eggs);
          this.msg(`Collected ${this.eggs} x ${eggType}!`, '07');
          this.mastery_add('ranching');
          this.eggs = 0;
        } else {
          await this.say('No eggs waiting right now.', null);
        }
      } else if (act.startsWith('Place Egg in Incubator')) {
        if (this.incubator_days > 0) {
          await this.say(`An egg is already incubating (${this.incubator_days} day(s) until it hatches!).`, null);
        } else if (this.chickens >= this.coop_cap()) {
          await this.say('Your coop is at full capacity!', null);
        } else {
          const eggItem = ['Egg', 'Good Egg', 'High Egg', 'Golden Egg', 'P Egg'].find((e) => (this.inv[e] || 0) > 0);
          if (!eggItem) {
            await this.say('You need an Egg in your rucksack to place on the Incubator.', null);
          } else {
            this.take(eggItem, 1);
            this.incubator_days = 3;
            this.msg(`Placed ${eggItem} in the Incubator! A chick will hatch in 3 days.`, '09');
          }
        }
      } else if (act.startsWith('Use Mayonnaise Maker')) {
        const eggItem = ['X Egg', 'P Egg', 'Golden Egg', 'High Egg', 'Good Egg', 'Egg'].find((e) => (this.inv[e] || 0) > 0);
        if (!eggItem) {
          await this.say('You have no Eggs in your rucksack to put into the Mayonnaise Maker.', null);
        } else {
          const res = convertWithMaker(eggItem);
          if (res) {
            const q = this.inv[eggItem];
            this.take(eggItem, q);
            this.give(res.output, q);
            this.msg(`Mayonnaise Maker produced ${q} x ${res.output}!`, '0A');
          }
        }
      } else if (act.startsWith('Grazing')) {
        if (this.weather !== 'Sunny') {
          await this.say('Only let chickens outside on Sunny days! Rain makes them unhappy.', null);
        } else {
          this.outdoor_hours += 10;
          this.chicken_aff = Math.min(100, this.chicken_aff + 3);
          this.fed = this.chickens;
          this.msg(`Your chickens grazed happily outside! (Outdoor hours: ${this.outdoor_hours}h, all fed!)`, '0B');
        }
      }
    }
  }

  barn_cap(): number {
    return this.house_flags.includes('Barn Expansion') ? 16 : BARN_CAP;
  }

  animal_line(a: any): string {
    const h = Math.floor(a.aff / 10);
    const status: string[] = [];
    if (!a.fed) status.push('hungry');
    if (a.kind === 'cow' && a.ready) status.push('milk ready');
    if (a.kind === 'sheep' && a.wool >= WOOL_DAYS) status.push('wool ready');
    if (a.pregnantDays > 0) status.push(`pregnant (${a.pregnantDays}d)`);
    const kind = ANIMALS[a.kind][0];
    return `${a.name} ${kind} [${'#'.repeat(h)}${'.'.repeat(10 - h)}] ${status.join(', ')}`;
  }

  async barn(): Promise<void> {
    while (true) {
      const unfed = this.animals.filter((a) => !a.fed).length;
      const tools = ['Milker', 'Clippers', 'Brush', 'Bell', 'Miracle Potion']
        .filter((t) => this.inv[t])
        .join(', ');
      const info = [
        `  Animals: ${this.animals.length}/${this.barn_cap()}   Hungry: ${unfed}   Fodder: ${this.inv['Fodder'] || 0}`,
        `  Tools: ${tools || 'none'}   Makers: ${this.makers.filter((m) => m !== 'Mayonnaise Maker').join(', ') || 'none'}`,
      ];
      const opts = [
        'Fill fodder boxes',
        'Ring Grazing Bell (Graze Outside in Sun)',
        ...this.animals.map((a) => this.animal_line(a)),
      ];
      if (this.makers.includes('Cheese Maker')) {
        opts.push('Use Cheese Maker (Milk -> Cheese)');
      }
      if (this.makers.includes('Yarn Maker')) {
        opts.push('Use Yarn Maker (Wool -> Yarn)');
      }
      opts.push('Leave');
      const sel = await this.menu('Livestock Barn', opts, 0, info);
      if (sel === null || opts[sel] === 'Leave') return;
      const choice = opts[sel];
      if (choice === 'Fill fodder boxes') {
        await this.barn_feed();
      } else if (choice.startsWith('Ring Grazing Bell')) {
        if (this.weather !== 'Sunny') {
          await this.say('Keep cows and sheep inside during bad weather!', null);
        } else {
          this.outdoor_hours += 10;
          for (const a of this.animals) {
            a.fed = true;
            a.aff = Math.min(100, a.aff + 2);
          }
          this.msg(`Your livestock grazed in the pasture! (Outdoor hours: ${this.outdoor_hours}h)`, '0B');
        }
      } else if (choice.startsWith('Use Cheese Maker')) {
        const mItem = ['X Milk', 'P Milk', 'Golden Milk', 'Large Milk', 'Medium Milk', 'Small Milk', 'Milk'].find(
          (i) => (this.inv[i] || 0) > 0
        );
        if (!mItem) {
          await this.say('You have no Milk in your rucksack.', null);
        } else {
          const res = convertWithMaker(mItem);
          if (res) {
            const q = this.inv[mItem];
            this.take(mItem, q);
            this.give(res.output, q);
            this.msg(`Cheese Maker produced ${q} x ${res.output}!`, '09');
          }
        }
      } else if (choice.startsWith('Use Yarn Maker')) {
        const wItem = ['X Wool', 'P Wool', 'Golden Wool', 'Large Wool', 'Good Wool', 'Wool'].find(
          (i) => (this.inv[i] || 0) > 0
        );
        if (!wItem) {
          await this.say('You have no Wool in your rucksack.', null);
        } else {
          const res = convertWithMaker(wItem);
          if (res) {
            const q = this.inv[wItem];
            this.take(wItem, q);
            this.give(res.output, q);
            this.msg(`Yarn Maker spun ${q} x ${res.output}!`, '0E');
          }
        }
      } else {
        const animalIdx = sel - 2;
        if (this.animals[animalIdx]) {
          await this.animal_care(this.animals[animalIdx]);
        }
      }
    }
  }

  async barn_feed(): Promise<void> {
    if (!this.animals.length) {
      await this.say('The barn is empty. Barley sells cows and sheep at Yodel Ranch.', null);
      return;
    }
    const hungry = this.animals.filter((a) => !a.fed);
    if (!hungry.length) {
      await this.say('Every fodder box is already full.', null);
      return;
    }
    const n = Math.min(hungry.length, this.inv['Fodder'] || 0);
    if (!n) {
      await this.say("You're out of Fodder. Buy it at Yodel Ranch or cut pasture Grass with your Sickle!", null);
      return;
    }
    this.take('Fodder', n);
    for (const a of hungry.slice(0, n)) {
      a.fed = true;
    }
    this.msg(`You filled ${n} fodder box${n > 1 ? 'es' : ''}. Moo!`, '09');
  }

  async animal_care(a: any): Promise<void> {
    while (true) {
      const name = a.name;
      const opts = ['Talk'];
      if (this.inv['Brush']) opts.push('Brush');
      if (a.kind === 'cow' && this.inv['Milker']) opts.push('Milk');
      if (a.kind === 'sheep' && this.inv['Clippers']) opts.push('Shear');
      if (this.inv['Miracle Potion'] && !a.pregnantDays) opts.push('Use Miracle Potion (Breed)');
      opts.push('Back');
      const sel = await this.menu(this.animal_line(a), opts);
      if (sel === null || opts[sel] === 'Back') return;
      const act = opts[sel];
      if (act === 'Talk') {
        if (a.talked) {
          await this.say(`${name} looks at you contentedly.`, name);
        } else {
          a.talked = true;
          a.aff = Math.min(100, a.aff + 2);
          const sound = a.kind === 'cow' ? 'Moooo!' : 'Baaaa!';
          this.mastery_add('ranching');
          await this.say(`${sound} ${name} seems happy to see you.`, name);
        }
      } else if (act === 'Brush') {
        if (a.brushed) {
          await this.say(`${name}'s coat is already shiny.`, name);
        } else {
          a.brushed = true;
          a.aff = Math.min(100, a.aff + 3);
          this.msg(`You brushed ${name}. ${name} looks pleased!`, '0B');
          this.mastery_add('ranching');
          await this.spend(1);
        }
      } else if (act === 'Milk') {
        if (!a.ready) {
          await this.say(`${name} has no milk right now. Feed ${name} today and try tomorrow.`, null);
        } else {
          a.ready = false;
          a.aff = Math.min(100, a.aff + 2);
          const item = getMilkQuality(a.aff, Boolean(a.wonFestival), this.outdoor_hours, py_rng().random());
          this.give(item);
          this.msg(`You milked ${name}: ${item}!`, '07');
          this.mastery_add('ranching');
          await this.spend(2);
        }
      } else if (act === 'Shear') {
        if (a.wool < WOOL_DAYS) {
          const left = WOOL_DAYS - a.wool;
          await this.say(`${name}'s wool needs ${left} more well-fed day${left > 1 ? 's' : ''} to grow back.`, null);
        } else {
          a.wool = 0;
          a.aff = Math.min(100, a.aff + 2);
          const item = getWoolQuality(a.aff, Boolean(a.wonFestival), this.outdoor_hours, py_rng().random());
          this.give(item);
          this.msg(`You sheared ${name}: ${item}!`, '07');
          this.mastery_add('ranching');
          await this.spend(2);
        }
      } else if (act.startsWith('Use Miracle Potion')) {
        if (this.animals.length >= this.barn_cap()) {
          await this.say('Your barn is full!', null);
        } else {
          this.take('Miracle Potion', 1);
          a.pregnantDays = 7;
          this.msg(`${name} is now expecting! A newborn will arrive in 7 days!`, '0A');
        }
      }
      if (this.mapname === 'house') return;
    }
  }

  async buy_animal(kind: string): Promise<void> {
    const [label, price] = ANIMALS[kind];
    if (this.animals.length >= this.barn_cap()) {
      await this.say('Your barn is full!', 'Barley');
      return;
    }
    if (this.gold < price) {
      await this.say(`A ${label.toLowerCase()} is ${price}G. Come back when you've saved up.`, 'Barley');
      return;
    }
    if (!(await this.confirm(`Buy a ${label.toLowerCase()} for ${price}G?`))) return;
    const names = kind === 'cow' ? COW_NAMES : SHEEP_NAMES;
    const taken = new Set(this.animals.map((a) => a.name));
    const defName = names.find((n) => !taken.has(n)) || `${label}${this.animals.length + 1}`;
    const name = (await this.text_input(`Name your ${label.toLowerCase()}:`, defName)).slice(0, 10);
    this.gold -= price;
    this.animals.push({
      name,
      kind,
      aff: 15,
      fed: false,
      ready: false,
      wool: 0,
      talked: false,
      brushed: false,
      wonFestival: false,
      pregnantDays: 0,
    });
    await this.say(`${name} will be waiting in your barn. Fill the fodder box every day!`, 'Barley');
  }

  async buy_barn_tool(item: string, price: number): Promise<void> {
    if (this.inv[item]) {
      await this.say(`You already have a ${item}.`, 'Barley');
    } else if (this.gold < price) {
      await this.say(`The ${item} is ${price}G.`, 'Barley');
    } else if (await this.confirm(`Buy a ${item} for ${price}G?`)) {
      this.gold -= price;
      this.give(item);
      this.msg(`Bought a ${item}.`, '09');
    }
  }

  barn_new_day(report: string[]): void {
    let hungry = 0;
    const newBabies: any[] = [];
    for (const a of this.animals) {
      if (a.pregnantDays > 0) {
        a.pregnantDays -= 1;
        if (a.pregnantDays === 0 && this.animals.length + newBabies.length < this.barn_cap()) {
          const babyName = `${a.name}Jr`.slice(0, 10);
          newBabies.push({
            name: babyName,
            kind: a.kind,
            aff: 30,
            fed: true,
            ready: false,
            wool: 0,
            talked: false,
            brushed: false,
            wonFestival: false,
            pregnantDays: 0,
          });
          report.push(`${a.name} gave birth to ${babyName} in the barn!`);
        }
      }
      if (a.fed) {
        if (a.kind === 'cow') {
          a.ready = true;
        } else {
          a.wool = Math.min(WOOL_DAYS, a.wool + 1);
        }
      } else {
        hungry += 1;
        a.aff = Math.max(0, a.aff - 5);
      }
      a.fed = false;
      a.talked = false;
      a.brushed = false;
    }
    this.animals.push(...newBabies);
    if (hungry) {
      report.push(`${hungry} barn animal${hungry > 1 ? 's' : ''} went hungry yesterday.`);
    }
  }

  async sprite_hut_menu(): Promise<void> {
    while (true) {
      const opts = [
        ...SPRITES.map((s) => {
          const aff = this.sprite_aff[s.name] || 0;
          const hearts = Math.floor(aff / 10);
          const job = this.sprite_jobs[s.name] || { task: 'none', days: 0, skill: 10 };
          const jobTxt = job.days > 0 ? `${job.task} (${job.days}d)` : 'idle';
          return `${s.name} (${s.colorName}) [${'#'.repeat(hearts)}${'.'.repeat(10 - hearts)}] — ${jobTxt}`;
        }),
        'Leave Sprite Hut',
      ];
      const sel = await this.menu('Harvest Sprite Hut (Willow Bend)', opts);
      if (sel === null || sel === SPRITES.length) return;
      const sp = SPRITES[sel];
      await this.sprite_interact(sp);
    }
  }

  async sprite_interact(sp: (typeof SPRITES)[number]): Promise<void> {
    const sName = sp.name;
    while (true) {
      const aff = this.sprite_aff[sName] || 0;
      const job = this.sprite_jobs[sName] || { task: 'none', days: 0, skill: 10 };
      const opts = [
        'Talk',
        `Give Held Item (${this.held || 'none'})`,
        'Give Flour from Rucksack (+8 Affection)',
        'Hire for Farm Work (Requires 3+ Hearts)',
        'Play Sprite Mini-Game (+Skill & Affection)',
        'Back',
      ];
      const sel = await this.menu(`${sName} (${sp.colorName} Sprite) — Skill: ${job.skill}%`, opts);
      if (sel === null || opts[sel] === 'Back') return;
      if (sel === 0) {
        this.sprite_aff[sName] = Math.min(100, aff + 2);
        await this.say(
          `Budum! I'm ${sName}! I love Flour, Honey, Bread, and ${sp.grass}! At 3 hearts I can help on your farm!`,
          sName
        );
      } else if (sel === 1) {
        if (!this.held) {
          await this.say('Hold an item in your Rucksack first, or choose Give Flour!', sName);
        } else {
          const item = this.held;
          this.take(item, 1);
          const bonus = item === sp.grass || item === 'Flour' || item === 'Honey' ? 10 : 4;
          this.sprite_aff[sName] = Math.min(100, aff + bonus);
          await this.say(`Yay! Thank you for the ${item}! (+${bonus} Friendship!)`, sName);
        }
      } else if (sel === 2) {
        if (!this.inv['Flour']) {
          await this.say('Buy Flour at Jeff\'s Supermarket (50G) to gift the Harvest Sprites!', sName);
        } else {
          this.take('Flour', 1);
          this.sprite_aff[sName] = Math.min(100, aff + 10);
          this.msg(`${sName} loves the Flour! (+10 Friendship)`, '0B');
        }
      } else if (sel === 3) {
        if ((this.sprite_aff[sName] || 0) < 30) {
          await this.say(`You need at least 3 Hearts (30 Friendship) before ${sName} will work on your farm!`, sName);
          continue;
        }
        const taskSel = await this.menu(`Hire ${sName} for which task?`, [
          'Water Crops (1, 3, or 7 days)',
          'Harvest Crops to Bin (1, 3, or 7 days)',
          'Care for Animals (1, 3, or 7 days)',
          'Cancel',
        ]);
        if (taskSel === null || taskSel === 3) continue;
        const durSel = await this.menu('Hire for how many days?', ['1 Day', '3 Days', '7 Days']);
        if (durSel === null) continue;
        const days = [1, 3, 7][durSel];
        const task = ['Watering', 'Harvesting', 'Animals'][taskSel];
        this.sprite_jobs[sName] = { task, days, skill: job.skill };
        await this.say(`Leave the ${task.toLowerCase()} to me for the next ${days} day(s), boss! Budum!`, sName);
      } else if (sel === 4) {
        const score = await this.fest_mash(3.5, 14, `${sName}'s Farm Training Game`);
        job.skill = Math.min(100, job.skill + (score >= 14 ? 8 : 3));
        this.sprite_aff[sName] = Math.min(100, (this.sprite_aff[sName] || 0) + 4);
        await this.say(
          `That was fun! My work skill is now ${job.skill}%! (${score} pts)`,
          sName
        );
      }
    }
  }

  async kai_shack_menu(): Promise<void> {
    if (this.season !== 1) {
      await this.say("Kai's Seaside Lodge is closed until Summer.", null);
      return;
    }
    const sel = await this.menu(`Kai's Seaside Lodge   ${this.gold}G`, [
      'Eat Roasted Corn (150G, +35 Stamina)',
      'Eat Kai\'s Baked Pineapple (300G, +70 Stamina)',
      'Talk to Kai',
      'Leave',
    ]);
    if (sel === 0 && this.gold >= 150) {
      this.gold -= 150;
      this.stamina = Math.min(this.max_stamina, this.stamina + 35);
      await this.say('Hot off the grill! (+35 Stamina)', 'Kai');
    } else if (sel === 1 && this.gold >= 300) {
      this.gold -= 300;
      this.stamina = Math.min(this.max_stamina, this.stamina + 70);
      await this.say('Sweet tropical pineapple! (+70 Stamina)', 'Kai');
    } else if (sel === 2) {
      await this.talk('Kai');
    }
  }

  async visit(bid: string): Promise<void> {
    if (!(await this.building_open(bid))) return;
    if (bid in this.interiors) {
      this.enter_interior(bid);
      return;
    }
    await this.shop_menu(bid);
  }

  async building_open(bid: string): Promise<boolean> {
    if (await this.fest_closed(bid)) return false;
    const name = BUILDINGS[bid];
    const [o, c, closed] = HOURS[bid];
    if (closed.includes(this.weekday) || !(o * 60 <= this.minutes && this.minutes < c * 60)) {
      const days = py_sorted(closed)
        .map((d: number) => WEEKDAYS[d])
        .join(', ');
      await this.say(
        `The ${name} is closed. Open ${fmt_hour(o)} - ${fmt_hour(c)}${days ? `, closed ${days}` : ''}.`,
        null
      );
      return false;
    }
    return true;
  }

  async shop_menu(bid: string, people_fn: (() => string[]) | null = null): Promise<void> {
    const name = BUILDINGS[bid];
    while (true) {
      const people = people_fn
        ? people_fn()
        : Object.entries(NPCS)
            .filter(([n, d]) => d.home === bid && !this.is_out(n) && n !== this.married)
            .map(([n]) => n);
      const shop = await this.shop_options(bid);
      const opts = [...shop.map((s: any) => s[0]), ...people.map((p) => `Talk to ${p}`), 'Leave'];
      const sel = await this.menu(`${name}   ${this.gold}G`, opts);
      if (sel === null || sel === opts.length - 1) return;
      if (sel < shop.length) {
        await shop[sel][1]();
      } else {
        await this.talk(people[sel - shop.length]);
      }
    }
  }

  build_interiors(): void {
    this.interiors = {};
    this.interior_bid = {};
    this.indoor_npcs = {};
    for (const [mname, m] of Object.entries(this.maps)) {
      for (const [coordKey, bid] of Object.entries(m.doors)) {
        if (!(bid in INTERIOR_LAYOUTS) || bid in this.interiors) continue;
        const [dx, dy] = parseCoordKey(coordKey);
        const front =
          ([
            [0, 1],
            [0, -1],
            [1, 0],
            [-1, 0],
          ] as [number, number][])
            .map(([ox, oy]): [number, number] => [dx + ox, dy + oy])
            .find(([fx, fy]) => TILES[m.tile(fx, fy)]?.[3]) || [dx, dy + 1];
        const [im, entry, spots] = build_interior(bid, [mname, front[0], front[1]]);
        this.maps[im.name] = im;
        this.interiors[bid] = { map: im.name, entry, spots };
        this.interior_bid[im.name] = bid;
      }
    }
  }

  enter_interior(bid: string): void {
    const info = this.interiors[bid];
    this.riding_horse = false;
    this.warp(info.map, info.entry[0], info.entry[1], [0, -1]);
    this.msg(`You step into the ${BUILDINGS[bid]}.`, '0C');
  }

  keeper_of(bid: string): string | null {
    return (
      Object.entries(NPCS)
        .filter(([, d]) => d.home === bid && !d.out)
        .map(([n]) => n)[0] || null
    );
  }

  update_indoor_npcs(): void {
    for (const [n, d] of Object.entries(NPCS)) {
      const info = this.interiors[d.home];
      if (!info || this.is_out(n) || n === this.married) {
        delete this.indoor_npcs[n];
        continue;
      }
      if (n in this.indoor_npcs) continue;
      const bid = d.home;
      const keeper = this.keeper_of(bid);
      const residents = Object.entries(NPCS)
        .filter(([r, rd]) => rd.home === bid && r !== keeper)
        .map(([r]) => r);
      const spots = info.spots;
      let pos: [number, number] | null = null;
      let fixed = false;
      if (n === keeper && 'k' in spots) {
        pos = spots['k'];
        fixed = true;
      } else {
        const i = residents.indexOf(n);
        pos = spots[String(i + 1)] || null;
        if (!pos || this.npc_at(pos[0], pos[1], info.map)) {
          const anchor = spots['1'] || info.entry;
          pos = this.free_spot(info.map, anchor[0], anchor[1]);
        }
        fixed = false;
      }
      if (pos) {
        this.indoor_npcs[n] = { map: info.map, pos, home: pos, fixed };
      }
    }
  }

  indoor_npc_at(x: number, y: number, mapname: string): string | null {
    for (const [n, d] of Object.entries(this.indoor_npcs)) {
      if (d.map === mapname && d.pos[0] === x && d.pos[1] === y && n !== this.married) {
        return n;
      }
    }
    return null;
  }

  move_indoor_npcs(): void {
    for (const [, d] of Object.entries(this.indoor_npcs)) {
      if (d.map !== this.mapname || d.fixed || py_rng().random() > 0.35) continue;
      const [[x, y], [hx, hy]] = [d.pos, d.home];
      const [dx, dy] = py_rng().choice([
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]);
      const [nx, ny] = [x + dx, y + dy];
      if (Math.abs(nx - hx) > 2 || Math.abs(ny - hy) > 2) continue;
      const entry = this.interiors[this.interior_bid[d.map]]?.entry;
      if (entry && nx === entry[0] && ny === entry[1]) continue;
      if (this.walkable(d.map, nx, ny, true) && !this.npc_at(nx, ny) && !(nx === this.px && ny === this.py)) {
        d.pos = [nx, ny];
      }
    }
  }

  async interior_interact(tile: string, p: [number, number]): Promise<void> {
    const bid = this.interior_bid[this.mapname];
    if (tile === 'bookcase') {
      if (bid === 'library' && !this.berry_sources.includes('truth:library')) {
        this.give_truth_jewel('library');
      }
      await this.say(py_rng().choice(BOOKS), 'Book');
      return;
    }
    if (!bid) return;
    const behind = this.npc_at(p[0] + this.face[0], p[1] + this.face[1]);
    await this.shop_menu(bid, () => (behind ? [behind] : []));
  }

  async shop_options(bid: string): Promise<[string, () => Promise<void>][]> {
    if (bid === 'supermarket') {
      return [
        ['Buy seasonal seeds', () => this.buy_seeds()],
        ['Buy Flour (50G)', () => this.buy('Flour', 50)],
        ['Buy Oil (50G)', () => this.buy('Oil', 50)],
        ['Buy Curry Powder (50G)', () => this.buy('Curry Powder', 50)],
        ['Buy Rice (100G)', () => this.buy('Rice', 100)],
        ['Buy Bread (100G)', () => this.buy('Bread', 100)],
        ['Buy Chocolate (100G)', () => this.buy('Chocolate', 100)],
        ['Buy Basket (5000G)', () => this.buy('Basket', 5000, 1)],
        ['Buy Blue Feather (1000G)', () => this.buy('Blue Feather', 1000, 1)],
        ['Buy Kitchen Utensils', () => this.buy_kitchen_goods()],
      ];
    }
    if (bid === 'zack') {
      return [
        ["Won's Rare Seeds & Exotic Goods", () => this.won_shop()],
      ];
    }
    if (bid === 'winery') {
      return [
        ['Buy Wine (300G)', () => this.buy('Wine', 300)],
        ['Buy Grape Juice (200G)', () => this.buy('Grape Juice', 200)],
      ];
    }
    if (bid === 'carpenter') {
      return [
        ['Buy Lumber (50G)', () => this.buy('Lumber', 50)],
        ['Buy Golden Lumber (100,000G)', () => this.buy('Golden Lumber', 100000)],
        ['Order a House / Farm Expansion', () => this.order_expansion()],
      ];
    }
    if (bid === 'poultry') {
      return [
        ['Buy a Chicken (1500G)', () => this.buy_chicken()],
        ['Buy Chicken Feed (10G)', () => this.buy('Chicken Feed', 10)],
        ['Buy Animal Medicine (1000G)', () => this.buy('Animal Medicine', 1000)],
      ];
    }
    if (bid === 'blacksmith') {
      return [
        ['Upgrade a Tool (Copper -> Mythic)', () => this.upgrade_tool()],
        ['Order Maker Machine (20,000G + Adamantite)', () => this.order_maker()],
        ['Forge Orichalc Jewelry (1000G + Orichalc)', () => this.forge_jewelry()],
      ];
    }
    if (bid === 'inn') {
      return [
        ['Eat Doug\'s Lunch (300G, +50 Stamina)', () => this.inn_lunch()],
        ['Use Inn Telephone (Order Saturday TV Shopping)', () => this.inn_phone_menu()],
      ];
    }
    if (bid === 'clinic') {
      return [
        ['Get a Medical Checkup (10G)', () => this.checkup()],
        ['Buy Bodigizer (500G, +100 Stamina)', () => this.buy('Bodigizer', 500)],
        ['Buy Bodigizer XL (1000G, +150 Stamina)', () => this.buy('Bodigizer XL', 1000)],
        ['Buy Turbojolt (1000G, -50 Fatigue)', () => this.buy('Turbojolt', 1000)],
        ['Buy Turbojolt XL (2000G, -100 Fatigue)', () => this.buy('Turbojolt XL', 2000)],
      ];
    }
    if (bid === 'library') {
      return [['Read a Farming Book', () => this.say(py_rng().choice(BOOKS), 'Book')]];
    }
    if (bid === 'museum') {
      return [
        ['Donate an item', () => this.museum_donate()],
        ['View the collection', () => this.museum_book()],
      ];
    }
    if (bid === 'church') {
      return [
        ['Pray at the Altar', () => this.pray()],
        ['Enter Confession Booth (Bless Cursed Tools / Confess)', () => this.confession_booth()],
      ];
    }
    if (bid === 'mayor') {
      return [
        ['Ask about your Farm & Exchange Medals', () => this.farm_report()],
      ];
    }
    if (bid === 'yodel') {
      return [
        ['Buy a Cow (5000G)', () => this.buy_animal('cow')],
        ['Buy a Sheep (4000G)', () => this.buy_animal('sheep')],
        ['Buy Fodder (20G)', () => this.buy('Fodder', 20)],
        ['Buy Milk (150G)', () => this.buy('Milk', 150)],
        ['Buy Milker (2000G)', () => this.buy_barn_tool('Milker', 2000)],
        ['Buy Clippers (1800G)', () => this.buy_barn_tool('Clippers', 1800)],
        ['Buy Brush (800G)', () => this.buy_barn_tool('Brush', 800)],
        ['Buy Bell (500G)', () => this.buy_barn_tool('Bell', 500)],
        ['Buy Miracle Potion (3000G)', () => this.buy('Miracle Potion', 3000)],
      ];
    }
    return [];
  }

  async won_shop(): Promise<void> {
    const items: [string, number, number][] = [
      ['Cabbage Seeds', 500, 99],
      ['Pineapple Seeds', 1000, 99],
      ['Green Pepper Seeds', 150, 99],
      ['Moondrop Flower Seeds', 300, 99],
      ['Toy Flower Seeds', 400, 99],
      ['Pink Cat Flower Seeds', 300, 99],
      ['Magic Red Flower Seeds', 600, 99],
      ['Dog Ball', 100, 1],
      ['Frisbee', 5000, 1],
      ['Record Player', 2000, 1],
      ['SUGDW Apple', 500, 10],
      ['Jewel of Truth (50,000G)', 50000, 1],
    ];
    const sel = await this.menu(
      `Won's Exotic Shop   ${this.gold}G`,
      items.map(([name, p]) => `${name} (${p}G)`)
    );
    if (sel === null) return;
    const [name, price, lim] = items[sel];
    if (name.startsWith('Jewel of Truth')) {
      if (this.gold < price) {
        await this.say('Hehehe! Come back when you have 50,000G!', 'Won');
      } else {
        this.gold -= price;
        this.give_truth_jewel('won_shop');
      }
      return;
    }
    await this.buy(name, price, lim);
  }

  async order_maker(): Promise<void> {
    const makers = [
      ['Mayonnaise Maker', 'Coop Expansion', 'Converts Eggs into Mayonnaise in the Coop.'],
      ['Cheese Maker', 'Barn Expansion', 'Converts Milk into Cheese in the Barn.'],
      ['Yarn Maker', 'Barn Expansion', 'Converts Wool into Yarn in the Barn.'],
    ];
    const sel = await this.menu(
      'Saibara — Order Maker (20,000G + 1 Adamantite)',
      makers.map(([m]) => `${m} ${this.makers.includes(m) ? '(Built)' : ''}`)
    );
    if (sel === null) return;
    const [mName, req, desc] = makers[sel];
    if (this.makers.includes(mName)) {
      await this.say(`You already have a ${mName}.`, 'Saibara');
    } else if (!this.house_flags.includes(req)) {
      await this.say(`Have Gotz build the ${req} first so there's room for the ${mName}!`, 'Saibara');
    } else if (this.gold < 20000 || (this.inv['Adamantite'] || 0) < 1) {
      await this.say('I need 20,000G and 1 Adamantite from the Spring Mine (Floor 10+).', 'Saibara');
    } else {
      this.gold -= 20000;
      this.take('Adamantite', 1);
      this.makers.push(mName);
      await this.say(`Done! I installed the ${mName} for you. (${desc})`, 'Saibara');
    }
  }

  async forge_jewelry(): Promise<void> {
    const pieces = ['Necklace', 'Earrings', 'Bracelet', 'Brooch'];
    const sel = await this.menu(
      'Saibara — Forge Orichalc Jewelry (1000G + 1 Orichalc)',
      pieces.map((p) => `${p} (1000G + 1 Orichalc)`)
    );
    if (sel === null) return;
    const piece = pieces[sel];
    if (this.gold < 1000 || (this.inv['Orichalc'] || 0) < 1) {
      await this.say('Bring me 1000G and 1 Orichalc from the Spring Mine (Floor 10+).', 'Saibara');
    } else {
      this.gold -= 1000;
      this.take('Orichalc', 1);
      this.give(piece, 1);
      this.msg(`Saibara forged a ${piece}! Bachelorettes love jewelry!`, '0A');
    }
  }

  async confession_booth(): Promise<void> {
    const opts = [
      'Remove Equipped Cursed Tool (1000G)',
      'Bless Cursed Hoe or Watering Can (1000G)',
      'Confess: Forgive me for littering / neglecting animals',
      'Confess: I want to marry the Harvest Goddess',
      'Leave Booth',
    ];
    const sel = await this.menu('Church Confession Booth', opts);
    if (sel === null || sel === 4) return;
    if (sel === 0) {
      if (this.levels[this.tool] !== 5) {
        await this.say('You do not currently have a Cursed Tool stuck to your hand.', 'Carter');
      } else if (this.gold < 1000) {
        await this.say('A 1000G donation is required to lift the binding curse.', 'Carter');
      } else {
        this.gold -= 1000;
        this.tool = 'Hoe';
        await this.say('May the Goddess cleanse this curse! You can freely switch tools again.', 'Carter');
      }
    } else if (sel === 1) {
      const cursedTarget = ['Hoe', 'Watering Can'].find((t) => this.levels[t] === 5);
      if (!cursedTarget) {
        await this.say('You have no Cursed Hoe or Cursed Watering Can needing blessing. (Sickle/Hammer bless after 10 days; Rod/Axe after 25 uses!)', 'Carter');
      } else if (this.gold < 1000) {
        await this.say('Blessing requires a 1000G offering.', 'Carter');
      } else {
        this.gold -= 1000;
        this.cursed_blesses[cursedTarget] = (this.cursed_blesses[cursedTarget] || 0) + 5;
        if (this.cursed_blesses[cursedTarget] >= 10) {
          this.levels[cursedTarget] = 6;
          await this.say(`The curse is gone forever! Your ${cursedTarget} is now a BLESSED ${cursedTarget}!`, 'Carter');
        } else {
          await this.say(`I have prayed over your ${cursedTarget} (${this.cursed_blesses[cursedTarget]}/10 blessings). Bless it once more to complete the ritual!`, 'Carter');
        }
      }
    } else if (sel === 2) {
      for (const n of Object.keys(this.friend)) {
        this.friend[n] = clamp(this.friend[n] + 2, 0, 100);
      }
      await this.say('The Harvest Goddess forgives you. (+2 Villager Friendship!)', 'Carter');
    } else if (sel === 3) {
      this.friend['Harvest Goddess'] = clamp((this.friend['Harvest Goddess'] || 0) + 10, 0, 100);
      await this.say('You have my blessing! Present the Blue Feather at the Goddess Pond when her heart is Red!', 'Carter');
    }
  }

  async buy(item: string, price: number, limit: number = 99): Promise<void> {
    const maxq = Math.min(limit, Math.floor(this.gold / price));
    if (maxq <= 0) {
      await this.say("You can't afford that.", null);
      return;
    }
    const q = await this.ask_qty(`Buy how many ${item}?`, maxq, price, 'Cost');
    if (q) {
      this.gold -= q * price;
      this.give(item, q);
      this.msg(`Bought ${q} ${item} for ${q * price}G.`, '09');
    }
  }

  async buy_seeds(): Promise<void> {
    const crops = Object.entries(CROPS)
      .filter(([c, d]) => (d[0] === this.season_name || d[0] === 'All') && !WON_EXCLUSIVE_CROPS.has(c))
      .map(([c]) => c);
    if (!crops.length) {
      await this.say('Nothing grows outdoors in Winter, dear. Come back in Spring!', 'Jeff');
      return;
    }
    const opts = crops.map((c) => {
      const gate = checkSecretCropUnlock(c, this.shipped_counts);
      return `${c} Seeds (${CROPS[c][1]}G)${gate.unlocked ? '' : ' [LOCKED — Ship 100 each]'}`;
    });
    const info = (s: number) => {
      const c = crops[s];
      const d = CROPS[c];
      const regrow = d[3] ? `, regrows every ${d[3]}d` : '';
      const gate = checkSecretCropUnlock(c, this.shipped_counts);
      const lines = [`  ${d[2]} days to grow${regrow} — ships for ${d[4]}G each (sows 3x3)`];
      if (gate.progressText) {
        lines.push(`  Unlock Gate: ${gate.progressText}`);
      } else {
        lines.push('  Rare exotic & flower seeds are also sold by Won at Mineral Beach!');
      }
      return lines;
    };
    const sel = await this.menu(`Jeff's Supermarket Seeds   ${this.gold}G`, opts, 0, info);
    if (sel !== null) {
      const c = crops[sel];
      const gate = checkSecretCropUnlock(c, this.shipped_counts);
      if (!gate.unlocked) {
        await this.say(
          `We will stock ${c} Seeds as soon as you ship 100 of each seasonal crop! (${gate.progressText})`,
          'Jeff'
        );
        return;
      }
      await this.buy(`${c} Seeds`, CROPS[c][1]);
    }
  }

  async buy_chicken(): Promise<void> {
    if (this.chickens >= this.coop_cap()) {
      await this.say('Your coop is full!', 'Lillia');
    } else if (this.gold < 1500) {
      await this.say("A chicken is 1500G. Come back when you've saved up.", 'Lillia');
    } else if (await this.confirm('Buy a chicken for 1500G?')) {
      this.gold -= 1500;
      this.chickens += 1;
      await this.say('Rick will bring it to your coop. Remember to fill its feed box!', 'Lillia');
    }
  }

  async upgrade_tool(): Promise<void> {
    if (this.upgrading) {
      await this.say(`I'm still working on your ${this.upgrading[0]}. Hmph. Patience.`, 'Saibara');
      return;
    }
    const opts: string[] = [];
    for (const t of UPGRADABLE) {
      const lvl = this.levels[t] || 0;
      const exp = this.tool_exp[t] || 0;
      if (lvl >= 7) {
        opts.push(`${t} (Mythic — MAXED)`);
      } else if (lvl === 6) {
        opts.push(`${t} (Blessed) -> Mythic (50,000G + 1 Mythic Stone)`);
      } else if (lvl === 5) {
        opts.push(`${t} (Cursed — Bless at Church first)`);
      } else if (lvl === 4) {
        opts.push(`${t} (Mystrile — Find Cursed in Lake Mine)`);
      } else {
        const [cost, ore] = UPGRADE[lvl + 1];
        opts.push(`${t} -> ${LEVELS[lvl + 1]} (${cost}G + 1 ${ore}, Exp: ${exp}%)`);
      }
    }
    const sel = await this.menu('Saibara — Upgrade Which Tool?', opts);
    if (sel === null) return;
    const t = UPGRADABLE[sel];
    const lvl = this.levels[t] || 0;
    if (lvl === 6) {
      if (this.gold < 50000 || (this.inv['Mythic Stone'] || 0) < 1) {
        await this.say('To forge a Mythic tool I need 50,000G and 1 Mythic Stone from the Spring Mine!', 'Saibara');
        return;
      }
      this.gold -= 50000;
      this.take('Mythic Stone', 1);
      this.levels[t] = 7;
      await this.say(`Behold my masterwork! Your ${t} is now a MYTHIC ${t}!`, 'Saibara');
      return;
    }
    if (lvl >= 4) {
      await this.say('To go beyond Mystrile, unearth the Cursed Tools in the Winter Lake Mine and have Carter bless them!', 'Saibara');
      return;
    }
    const [cost, ore] = UPGRADE[lvl + 1];
    if (this.gold < cost || (this.inv[ore] || 0) < 1) {
      await this.say(`I need ${cost}G and ${ore} ore from the Spring Mine on Mother's Hill.`, 'Saibara');
      return;
    }
    this.gold -= cost;
    this.take(ore, 1);
    this.upgrading = [t, this.absday() + 1];
    if (this.tool === t) {
      this.tool = TOOLS.find((other) => other !== t) || 'Sickle';
    }
    await this.say(`Leave your ${t} with me. It'll be ready tomorrow morning. Hmph.`, 'Saibara');
  }

  async inn_lunch(): Promise<void> {
    if (this.gold < 300) {
      await this.say('Lunch is 300G, friend.', 'Doug');
      return;
    }
    this.gold -= 300;
    this.stamina = Math.min(this.max_stamina, this.stamina + 50);
    this.fatigue = Math.max(0, this.fatigue - 15);
    await this.say("Here you go — Doug's special! (+50 Stamina, -15 Fatigue)", 'Doug');
  }

  async checkup(): Promise<void> {
    if (this.gold >= 10) this.gold -= 10;
    const s = this.stamina;
    const f = this.fatigue;
    const verdict =
      s > 90 && f < 25
        ? "You're in peak physical condition!"
        : f < 60
          ? "You're a bit fatigued. Don't overwork in the rain."
          : "You're dangerously exhausted! Take a Turbojolt or soak in the Hot Spring!";
    await this.say(`Strength: ${s}/${this.max_stamina} | Fatigue: ${f}/100. ${verdict}`, 'Doctor');
  }

  async pray(): Promise<void> {
    if (this.prayed) {
      await this.say('You sit quietly in the pews. Your mind is at peace.', null);
      return;
    }
    this.prayed = true;
    this.stamina = Math.min(this.max_stamina, this.stamina + 15);
    this.fatigue = Math.max(0, this.fatigue - 10);
    await this.say('You pray at the altar. You feel a gentle warmth. (+15 Stamina, -10 Fatigue)', null);
  }

  async farm_report(): Promise<void> {
    const sel = await this.menu(`Mayor Thomas   (Your Medals: ${this.medals})`, [
      'View Farm & Villager Report',
      'Exchange 900 Medals for Power Berry',
      'Exchange 1000 Medals for Jewel of Truth',
      'Back',
    ]);
    if (sel === 0) {
      await this.ranch_summary();
    } else if (sel === 1) {
      if (this.medals < 900) {
        await this.say(`You have ${this.medals} medals. Win more at the Spring & Fall Horse Races!`, 'Thomas');
      } else if (this.give_power_berry('medals_900')) {
        this.medals -= 900;
      } else {
        await this.say('You already claimed the Medal Power Berry!', 'Thomas');
      }
    } else if (sel === 2) {
      if (this.medals < 1000) {
        await this.say(`You need 1000 medals (you have ${this.medals}).`, 'Thomas');
      } else if (this.give_truth_jewel('medals_1000')) {
        this.medals -= 1000;
      } else {
        await this.say('You already claimed this Jewel of Truth!', 'Thomas');
      }
    }
  }

  crop_water_count(): number {
    return Object.keys(this.crops).filter((k) => !this.wet.has(k)).length;
  }

  animal_feed_count(): number {
    return this.animals.filter((a) => !a.fed).length + Math.max(0, this.chickens - this.fed);
  }

  ready_livestock_count(): number {
    return (
      this.animals.filter((a) => (a.kind === 'cow' && a.ready) || (a.kind === 'sheep' && a.wool >= WOOL_DAYS)).length +
      (this.eggs > 0 ? 1 : 0)
    );
  }

  today_lines(): string[] {
    const lines: string[] = [];
    const now = this.minutes;
    const binValue = py_sum(Object.entries(this.bin).map(([i, q]) => (ITEMS[i] ? ITEMS[i][0] : 0) * q));
    const cutoff = 17 * 60;
    const until = Math.max(0, cutoff - now);
    const hh = Math.floor(until / 60);
    const mm = until % 60;
    const ship =
      this.zack_paid_today
        ? 'Zack already collected today’s shipment.'
        : now >= cutoff
          ? 'Zack has gone home; shipments roll over to tomorrow.'
          : `Zack collects at 5:00 PM (${hh}h ${mm.toString().padStart(2, '0')}m from now).`;

    lines.push(`  ${this.date_str()} — ${this.weather}`);
    lines.push(`  Tomorrow: ${this.tomorrow}`);
    lines.push('');
    lines.push(`  Ship   ${binValue ? `${binValue}G waiting` : 'empty'}`);
    lines.push(`         ${ship}`);
    lines.push(`  Water  ${this.crop_water_count()} crop${this.crop_water_count() === 1 ? '' : 's'} still dry`);
    lines.push(`  Feed   ${this.animal_feed_count()} animal${this.animal_feed_count() === 1 ? '' : 's'} still hungry`);
    lines.push(`  Ready  ${this.ready_livestock_count()} product${this.ready_livestock_count() === 1 ? '' : 's'} to collect`);
    lines.push(`  Museum ${this.museum.length}/${this.museum_total()} donated`);
    if (this.requests.length) {
      const r = this.requests[0];
      const extra = this.requests.length > 1 ? ` (+${this.requests.length - 1} more)` : '';
      lines.push(`  Board  ${r.npc} needs ${r.qty} × ${r.item}${extra}`);
    }
    lines.push('');
    const bdays = this.birthdays();
    if (bdays.length) lines.push(`  Birthday today: ${bdays.join(', ')} (5× gift bonus!)`);
    const bdayTomorrow = this.birthdays(1);
    if (bdayTomorrow.length) lines.push(`  Birthday tomorrow: ${bdayTomorrow.join(', ')}`);
    const fest = this.fest_on();
    if (fest) lines.push(`  Festival: ${fest[0]} at Rose Square (${fmt_hour(fest[1])}–${fmt_hour(fest[2])})`);
    const festTomorrow = this.fest_on(1);
    if (festTomorrow) lines.push(`  Tomorrow’s festival: ${festTomorrow[0]}`);
    if (!bdays.length && !bdayTomorrow.length && !fest && !festTomorrow) lines.push('  No birthdays or festivals today.');
    lines.push('');
    if (this.stamina <= 30 || this.fatigue >= 80) {
      lines.push('  Rest: stamina is low. Eat, soak at the Hot Spring, or sleep early.');
    } else {
      lines.push('  Plan: clear weeds, water crops, care for animals, then ship before 5 PM.');
    }
    return lines;
  }

  async today_panel(): Promise<void> {
    await this.show_lines('Today on the Farm', this.today_lines());
  }

  async relationships(): Promise<void> {
    const names = Object.keys(NPCS).sort((a, b) => (this.friend[b] || 0) - (this.friend[a] || 0));
    const groups: string[][] = [];
    for (const n of names) {
      const d = NPCS[n];
      const h = this.hearts(n);
      const where = d.where ? this.maps[d.where[0]]?.title || d.where[0] : 'Indoors';
      const hours = d.out ? `${fmt_hour(d.out[0])}–${fmt_hour(d.out[1])}` : 'all day';
      const loves = (d.loves || []).slice(0, 3).join(', ') || '—';
      groups.push([
        `  ${n.padEnd(16)} ${h[0]}${d.bach ? '  ♡ eligible' : ''}`,
        `    loves: ${loves}`,
        `    usually: ${where}, ${hours}`,
      ]);
    }
    const pages: string[][] = [];
    for (let i = 0; i < groups.length; i += 6) {
      pages.push(groups.slice(i, i + 6).flat());
    }
    await this.show_pages('Villager Notes', pages);
  }

  tool_cost(): number {
    const [tx, ty] = this.target();
    const tile = this.map.tile(tx, ty);
    if (this.tool.endsWith(' Seeds')) return 1;
    if (this.tool === 'Fishing Rod') return tile === 'water' || tile === 'pond' ? 3 : 0;
    if (this.tool === 'Watering Can') {
      if (tile === 'water' || tile === 'fountain' || tile === 'pond') return 0;
      if (this.water <= 0) return 0;
    }
    return 2;
  }

  action_preview(): { cost: number; faint: boolean } {
    const cost = this.tool_cost();
    if (cost <= 0) return { cost, faint: false };
    const res = calculateStaminaSpend(this.stamina, this.fatigue, cost, {
      weather: this.map.indoor ? 'Sunny' : this.weather,
      minutes: this.minutes,
      hasMysticBerry: this.has_mystic_berry,
      isCursedTool: this.levels[this.tool] === 5,
    });
    return { cost, faint: res.fainted };
  }

  /** What the big touch button should do for the tile the player is facing. */
  context_action(): { key: 'x' | 'space' | 'enter'; label: string } {
    if (this.typing) return { key: 'enter', label: 'DONE' };
    if (this.modal_depth > 0) return { key: 'space', label: 'OK' };
    const [tx, ty] = this.target();
    const pKey = pkey(tx, ty);
    const m = this.map;
    if (this.npc_at(tx, ty)) return { key: 'x', label: 'TALK' };
    if (pKey in m.doors || pKey in m.warps) return { key: 'x', label: 'ENTER' };
    if (this.mapname === 'farm' && ((tx === 21 && ty === 6) || (!this.riding_horse && tx === 25 && ty === 6))) {
      return { key: 'x', label: 'CARE' };
    }
    const tile = m.tile(tx, ty);
    if (tile === 'spring') return { key: 'x', label: 'SOAK' };
    if (tile === 'pond') return { key: 'x', label: this.mapname === 'point' ? 'LOOK' : 'OFFER' };
    if (this.mapname === 'farm' && pKey in this.crops) {
      const [crop, age] = this.crops[pKey];
      if (age < CROPS[crop][2] && this.tool === 'Watering Can' && !this.wet.has(pKey)) return { key: 'space', label: 'WATER' };
      return { key: 'x', label: age >= CROPS[crop][2] ? 'HARVEST' : 'CHECK' };
    }
    if (pKey in (this.forage[this.mapname] || {})) return { key: 'x', label: 'PICK' };
    const obj = this.objs[this.mapname]?.[pKey];
    if (obj === 'dig') return this.tool === 'Hoe' ? { key: 'space', label: 'DIG' } : { key: 'x', label: 'LOOK' };
    if (obj === 'starrock') return this.tool === 'Hammer' ? { key: 'space', label: 'CRACK' } : { key: 'x', label: 'LOOK' };
    if (tile === 'bin') return { key: 'x', label: 'SHIP' };
    if (tile === 'bed') return { key: 'x', label: 'SLEEP' };
    if (tile === 'tv') return { key: 'x', label: 'WATCH' };
    if (tile === 'cal') return { key: 'x', label: 'CALENDAR' };
    if (['counter', 'bookcase', 'kitchen', 'bath', 'shelf', 'vase', 'fireplace', 'sign', 'doghouse', 'stable', 'mill', 'trash', 'phone'].includes(tile)) {
      return { key: 'x', label: 'USE' };
    }
    if (this.tool === 'Fishing Rod' && (tile === 'water' || tile === 'pond')) return { key: 'space', label: 'CAST' };
    if (this.mapname === 'river' && tile === 'water' && this.tool !== 'Watering Can') return { key: 'x', label: 'SKIP' };
    const short = this.tool.endsWith(' Seeds') ? this.tool.slice(0, -6) : this.tool;
    return { key: 'space', label: short.length > 7 ? 'USE' : `USE ${short.toUpperCase()}` };
  }

  museum_categories(): [string, string][] {
    return [
      ['Fish', 'fish'],
      ['Ore', 'ore'],
      ['Forage', 'forage'],
      ['Crops', 'crop'],
      ['Relics', 'relic'],
    ];
  }

  museum_pool(category: string | null = null): string[] {
    const excluded = new Set(['Junk Ore', 'Boot', 'Empty Can', 'Failed Dish']);
    const cats = this.museum_categories();
    const allowed = new Set(category ? cats.filter(([, c]) => c === category).map(([, c]) => c) : cats.map(([, c]) => c));
    return py_sorted(
      Object.entries(ITEMS)
        .filter(([name, d]) => allowed.has(d[2]) && !excluded.has(name))
        .map(([name]) => name)
    );
  }

  museum_total(): number {
    return this.museum_pool().length;
  }

  async museum_reward_check(): Promise<void> {
    const milestones: [number, number, string, number][] = [
      [5, 500, 'Flour', 3],
      [10, 1000, 'Basket', 1],
      [20, 2000, 'Diamond', 1],
      [30, 5000, 'Diamond', 2],
    ];
    for (const [need, gold, item, qty] of milestones) {
      if (this.museum.length >= need && !this.museum_rewards.includes(need)) {
        this.museum_rewards.push(need);
        this.gold += gold;
        this.give(item, qty);
        await this.say(
          `Museum milestone: ${need} donations! The town fund awards ${gold}G and ${qty} × ${item}.`,
          'Curator'
        );
      }
    }
  }

  async museum_donate(): Promise<void> {
    const pool = new Set(this.museum_pool());
    const items = py_sorted(
      Object.keys(this.inv).filter((i) => pool.has(i) && !this.museum.includes(i) && (this.inv[i] || 0) > 0)
    );
    if (!items.length) {
      await this.say(
        this.museum.length >= this.museum_total()
          ? 'The collection is complete! Every fish, ore, forage item and crop is on display.'
          : 'Bring me a fish, ore, forage item or crop that is not already on display.',
        'Curator'
      );
      return;
    }
    const sel = await this.menu(
      `Donate to the Museum   ${this.museum.length}/${this.museum_total()}`,
      [...items.map((i) => `${i}  x${this.inv[i]}`), 'Leave']
    );
    if (sel === null || sel >= items.length) return;
    const item = items[sel];
    this.take(item, 1);
    this.museum.push(item);
    this.msg(`${item} added to the museum collection! (${this.museum.length}/${this.museum_total()})`, '0B');
    await this.museum_reward_check();
  }

  async museum_book(): Promise<void> {
    const pages: string[][] = [];
    for (const [label, category] of this.museum_categories()) {
      const all = this.museum_pool(category);
      const got = new Set(this.museum.filter((i) => all.includes(i)));
      let page = [`  ${label} — ${got.size}/${all.length} donated`];
      for (const item of all) {
        if (page.length >= 18) {
          pages.push(page);
          page = [`  ${label} (continued)`];
        }
        page.push(`    ${got.has(item) ? '[x]' : '[ ]'} ${item}`);
      }
      pages.push(page);
    }
    await this.show_pages('Museum Collection', pages);
  }

  request_pool(): string[] {
    const crops = Object.keys(CROPS).filter((c) => c !== 'Grass' && CROPS[c][0] === this.season);
    const extras = Object.keys(ITEMS).filter((i) => ITEMS[i][2] === 'forage' || ITEMS[i][2] === 'fish');
    return py_sorted([...crops, ...extras]);
  }

  request_refresh(count: number = 3): number {
    const rng = py_rng();
    const npcs = py_sorted(Object.keys(NPCS).filter((n) => n !== 'Curator'));
    const pool = this.request_pool();
    let added = 0;
    while (this.requests.length < count && this.requests.length < 3) {
      const used = new Set(this.requests.map((r) => r.npc));
      const available = npcs.filter((n) => !used.has(n));
      const npc = rng.choice(available.length ? available : npcs);
      const item = rng.choice(pool);
      if (!npc || !item) break;
      const qty = rng.randint(1, 3);
      const price = Math.max(1, Number(ITEMS[item]?.[0]) || 40);
      this.requests.push({
        id: this.next_request_id++,
        npc,
        item,
        qty,
        reward: Math.max(100, price * qty * 2 + 50),
        deadline: this.absday() + 3,
      });
      added++;
    }
    return added;
  }

  request_day(report: string[]): void {
    const today = this.absday();
    const expired = this.requests.filter((r) => r.deadline < today);
    this.requests = this.requests.filter((r) => r.deadline >= today);
    if (expired.length) {
      report.push(`${expired.length} request${expired.length === 1 ? '' : 's'} expired at the Rose Square board.`);
    }
    if (this.requests.length < 3) {
      const added = this.request_refresh(3);
      if (added) report.push(`${added} new request${added === 1 ? '' : 's'} appeared at the Rose Square board.`);
    }
  }

  request_deliver(index: number): string | null {
    const request = this.requests[index];
    if (!request) return null;
    if ((this.inv[request.item] || 0) < request.qty) {
      return `You need ${request.qty} × ${request.item} for ${request.npc}.`;
    }
    this.take(request.item, request.qty);
    this.gold += request.reward;
    this.friend[request.npc] = clamp((this.friend[request.npc] || 0) + 5, 0, 100);
    this.requests_done += 1;
    this.fx_add('coin', this.px, this.py, 0.8);
    this.fx_add('text', this.px, this.py, 1.1, { text: `+${request.reward}G` });
    this.requests.splice(index, 1);
    return `${request.npc} got ${request.qty} × ${request.item}! You earned ${request.reward}G and +5 friendship.`;
  }

  async request_menu(): Promise<void> {
    if (!this.requests.length) this.request_refresh(3);
    if (!this.requests.length) {
      await this.say('The request board is empty today. Check again tomorrow morning.', 'Rose Square');
      return;
    }
    const labels = this.requests.map((r) => {
      const days = Math.max(0, r.deadline - this.absday());
      return `${r.npc}: ${r.qty} × ${r.item} — ${r.reward}G (${days}d left)`;
    });
    const sel = await this.menu('Rose Square Request Board', [...labels, 'Leave']);
    if (sel === null || sel >= this.requests.length) return;
    const request = this.requests[sel];
    const result = this.request_deliver(sel);
    if (result === null) return;
    if (result.startsWith('You need')) {
      await this.say(result, 'Rose Square');
      return;
    }
    await this.say(result, request.npc);
  }

  achievement_list(): { name: string; desc: string; done: boolean; progress: string }[] {
    const fish = py_sum(Object.values(this.fish_caught));
    const maxFriend = Math.max(0, ...Object.values(this.friend));
    const gems = this.goddess_jewels + this.kappa_jewels + this.truth_jewels;
    return [
      { name: 'First Shipment', desc: 'Ship your first item to Zack', done: this.shipped_total > 0, progress: `${this.shipped_total}G shipped` },
      { name: 'Market Regular', desc: 'Ship 10,000G worth of goods', done: this.shipped_total >= 10000, progress: `${Math.min(10000, this.shipped_total)}/10000G` },
      { name: 'Angler', desc: 'Catch 10 fish', done: fish >= 10, progress: `${Math.min(10, fish)}/10 fish` },
      { name: 'Mine Explorer', desc: 'Reach floor 25 of the Spring Mine', done: this.max_spring_floor >= 25, progress: `floor ${Math.min(25, this.max_spring_floor)}/25` },
      { name: 'Deep Earth', desc: 'Reach floor 100 of the Spring Mine', done: this.max_spring_floor >= 100, progress: `floor ${Math.min(100, this.max_spring_floor)}/100` },
      { name: 'Museum Patron', desc: 'Donate 10 items to the museum', done: this.museum.length >= 10, progress: `${Math.min(10, this.museum.length)}/10 donated` },
      { name: 'Complete Collection', desc: 'Complete the museum collection', done: this.museum.length >= this.museum_total(), progress: `${this.museum.length}/${this.museum_total()} donated` },
      { name: 'Good Neighbor', desc: 'Complete 5 Rose Square requests', done: this.requests_done >= 5, progress: `${Math.min(5, this.requests_done)}/5 requests` },
      { name: 'Beloved', desc: 'Reach 80 friendship with a villager', done: maxFriend >= 80, progress: `${maxFriend}/80 hearts` },
      { name: 'Festival Star', desc: 'Win 3 festivals', done: this.fest_wins.length >= 3, progress: `${Math.min(3, this.fest_wins.length)}/3 wins` },
      { name: 'Homestead', desc: 'Complete 3 house or farm upgrades', done: this.house_flags.length >= 3, progress: `${Math.min(3, this.house_flags.length)}/3 upgrades` },
      { name: 'Family', desc: 'Marry and welcome a child', done: !!this.married && !!this.child_name, progress: this.child_name ? 'family complete' : this.married ? 'married' : 'not yet' },
      { name: 'Rancher', desc: 'Own 8 animals', done: this.animals.length >= 8, progress: `${Math.min(8, this.animals.length)}/8 animals` },
      { name: 'Gem Hunter', desc: 'Collect 9 gems across the mines', done: gems >= 9, progress: `${Math.min(9, gems)}/9 gems` },
    ];
  }

  async achievements_page(): Promise<void> {
    const list = this.achievement_list();
    const done = list.filter((a) => a.done).length;
    const pages: string[][] = [];
    let page = [`  ${done}/${list.length} unlocked`];
    for (const a of list) {
      if (page.length >= 18) {
        pages.push(page);
        page = ['  Achievements (continued)'];
      }
      page.push(`  ${a.done ? '[x]' : '[ ]'} ${a.name} — ${a.desc}  (${a.progress})`);
    }
    pages.push(page);
    await this.show_pages('Achievements & Journal', pages);
  }

  mastery_level(discipline: MasteryDiscipline): number {
    const xp = this.mastery_xp[discipline] || 0;
    let level = 0;
    for (let i = 0; i < MASTERY_RANKS.length; i++) {
      if (xp >= MASTERY_RANKS[i].xp) level = i;
    }
    return level;
  }

  mastery_add(discipline: MasteryDiscipline, amount: number = 1): void {
    if (!MASTERY_DISCIPLINES.includes(discipline)) return;
    const before = this.mastery_level(discipline);
    this.mastery_xp[discipline] = (this.mastery_xp[discipline] || 0) + amount;
    const after = this.mastery_level(discipline);
    for (let level = before + 1; level <= after; level++) {
      const key = `${discipline}:${level}`;
      if (this.mastery_claimed.includes(key)) continue;
      this.mastery_claimed.push(key);
      this.mastery_reward(discipline, level);
    }
  }

  mastery_reward(discipline: MasteryDiscipline, level: number): void {
    const gold = [0, 250, 500, 1000, 2000][level] || 0;
    const item = MASTERY_REWARD_ITEMS[discipline];
    const qty = level >= 3 ? 2 : 1;
    this.gold += gold;
    this.give(item, qty);
    this.msg(
      `Mastery: ${MASTERY_LABELS[discipline]} reached ${MASTERY_RANKS[level].name}! +${gold}G and ${qty} × ${item}.`,
      '0C'
    );
  }

  async mastery_page(): Promise<void> {
    const lines: string[] = ['  Keep doing a discipline to earn XP and rank rewards.'];
    for (const discipline of MASTERY_DISCIPLINES) {
      const level = this.mastery_level(discipline);
      const xp = this.mastery_xp[discipline] || 0;
      const next = MASTERY_RANKS[level + 1];
      const progress = next ? `${Math.min(xp, next.xp)}/${next.xp} XP` : `${xp} XP (max)`;
      lines.push(
        `  ${MASTERY_LABELS[discipline].padEnd(9)} ${MASTERY_RANKS[level].name.padEnd(7)} ${progress}`
      );
    }
    lines.push('');
    lines.push('  Rewards: 250G / 500G / 1000G / 2000G plus seeds, forage, fish, ore or feed.');
    await this.show_pages('Farm Mastery', [lines]);
  }

  async ranch_summary(): Promise<void> {
    const degPts =
      this.shipped_total / 100 +
      this.power_berries * 100 +
      Object.values(this.friend).reduce((a, b) => a + b, 0) +
      this.fest_wins.length * 150 +
      this.steps / 10;
    const rankTitle =
      degPts >= 5000
        ? 'Supreme Farm King'
        : degPts >= 2000
          ? 'Veteran Ranch Master'
          : degPts >= 800
            ? 'Skilled Mineral Farmer'
            : 'Apprentice Farmer';

    const toolLines = UPGRADABLE.map(
      (t) => `  ${t.padEnd(13)}: ${LEVELS[this.levels[t] || 0].padEnd(9)} (Exp: ${this.tool_exp[t] || 0}%)`
    );
    const spriteLines = SPRITES.map((s) => {
      const j = this.sprite_jobs[s.name] || { task: 'none', days: 0, skill: 10 };
      return `  ${s.name.padEnd(7)} (${s.colorName.padEnd(6)}): ${this.sprite_aff[s.name] || 0}/100 Aff | Skill ${j.skill}% | ${j.days ? `${j.task} (${j.days}d)` : 'Idle'}`;
    });
    const bestFriends = py_sorted(
      Object.entries(this.friend).map(([n, v]): [number, string] => [-v, n])
    )
      .slice(0, 6)
      .map(([, n]) => `  ${n.padEnd(16)} ${this.hearts(n)[0]}`);

    const lines = [
      `  Rank: ${rankTitle} (${Math.floor(degPts)} pts)   Steps: ${this.steps}`,
      `  Strength: ${this.stamina}/${this.max_stamina}   Fatigue: ${this.fatigue}/100   Power Berries: ${this.power_berries}/10 ${this.has_mystic_berry ? '+ Mystic Berry' : ''}`,
      `  Gold: ${this.gold}G   Total Shipped: ${this.shipped_total}G   Medals: ${this.medals}`,
      `  Jewels — Goddess: ${this.goddess_jewels}/9 | Kappa: ${this.kappa_jewels}/9 | Truth: ${this.truth_jewels}/9`,
      `  Mines — Spring B${this.max_spring_floor}F | Lake B${this.max_lake_floor}F | Fish Caught: ${Object.keys(this.fish_caught).length} types`,
      `  Spouse: ${this.married || 'Unmarried'}   Child: ${this.child_name || '-'}   Heart Events: ${this.heart_events_seen.length}`,
      '  --- Tools ---',
      ...toolLines,
      '  --- Harvest Sprites ---',
      ...spriteLines,
      '  --- Top Relationships ---',
      ...bestFriends,
    ];
    await this.show_lines('Ranch Summary & Completion Memo', lines);
  }

  fest_date(offset: number = 0): [number, number] {
    const n = this.day - 1 + offset;
    return [(this.season + Math.floor(n / 30)) % 4, (n % 30) + 1];
  }

  fest_on(offset: number = 0): [string, number, number, string] | null {
    const [s, d] = this.fest_date(offset);
    return FESTIVALS[`${s},${d}`] || null;
  }

  fest_active(): [string, number, number, string] | null {
    const f = this.fest_on();
    return f && f[1] * 60 <= this.minutes && this.minutes < f[2] * 60 ? f : null;
  }

  birthdays(offset: number = 0): string[] {
    const when = this.fest_date(offset);
    return Object.entries(BIRTHDAYS)
      .filter(([, d]) => d[0] === when[0] && d[1] === when[1])
      .map(([n]) => n);
  }

  fest_sync(): void {
    const f = this.fest_active();
    const saved = this._fest_saved;
    if (f && saved === null) {
      this._fest_saved = Object.fromEntries(Object.entries(NPCS).map(([n, d]) => [n, d.where]));
      const names = Object.keys(NPCS);
      for (let i = 0; i < names.length; i++) {
        const n = names[i];
        const [x, y] = FEST_SPOTS[i % FEST_SPOTS.length];
        NPCS[n].where = ['town', x, y];
      }
      this.npc_pos = {};
      if (!this.fest_attended) {
        this.msg(`The ${f[0]} has begun in Rose Square!`, '0A');
      }
    } else if (!f && saved !== null) {
      for (const [n, w] of Object.entries(saved)) {
        if (NPCS[n]) NPCS[n].where = w;
      }
      this._fest_saved = null;
      this.npc_pos = {};
    }
  }

  fest_is_out(n: string): boolean | null {
    if (n === this.married || !this.fest_active()) {
      return null;
    }
    return true;
  }

  async fest_check(): Promise<void> {
    const f = this.fest_active();
    if (!f || this.mapname !== 'town' || this.fest_attended || this.fest_declined) {
      return;
    }
    if (!(29 <= this.px && this.px <= 43 && 8 <= this.py && this.py <= 19)) {
      return;
    }
    if (await this.confirm(`The ${f[0]} is underway! Join in?`)) {
      await this.fest_run(f);
    } else {
      this.fest_declined = true;
      this.msg("Talk to Mayor Thomas when you're ready to join in.");
    }
  }

  async fest_talk(n: string): Promise<boolean> {
    const f = this.fest_active();
    if (n !== 'Thomas' || !f || this.held || this.fest_attended) {
      return false;
    }
    if (await this.confirm(`Join the ${f[0]}?`)) {
      await this.fest_run(f);
      return true;
    }
    return false;
  }

  async fest_run(f: [string, number, number, string]): Promise<void> {
    const [name, , end, kind] = f;
    this.fest_attended = true;
    await this.say(`Welcome, everyone, to the ${name}! Ho ho!`, 'Thomas');
    const fn = (this as any)[`fest_ev_${kind}`];
    if (typeof fn === 'function') {
      await fn.call(this);
    }
    this.minutes = Math.max(this.minutes, end * 60);
    await this.say(`The ${name} draws to a close, and everyone heads home.`, null);
    this.update_npcs();
    this.last = Date.now() / 1000;
  }

  fest_new_day(report: string[]): void {
    this.fest_attended = false;
    this.fest_declined = false;
    const f = this.fest_on();
    if (f) {
      report.push(`Today is the ${f[0]}! Head to Rose Square between ${fmt_hour(f[1])} and ${fmt_hour(f[2])}.`);
    }
    const t = this.fest_on(1);
    if (t) {
      report.push(`Tomorrow is the ${t[0]}.`);
    }
    for (const n of this.birthdays()) {
      report.push(`It's ${n}'s birthday today! A gift gives 5x Friendship!`);
    }
  }

  async fest_closed(bid: string): Promise<boolean> {
    const f = this.fest_on();
    if (!f || bid === 'church' || bid === 'sprites') {
      return false;
    }
    await this.say(`A sign on the door: 'Closed today for the ${f[0]}. See you in Rose Square!'`, null);
    return true;
  }

  fest_news(): string {
    const parts: string[] = [];
    const f = this.fest_on();
    if (f) {
      parts.push(`Today: ${f[0]} in Rose Square, ${fmt_hour(f[1])}-${fmt_hour(f[2])}.`);
    }
    const t = this.fest_on(1);
    if (t) {
      parts.push(`Tomorrow: ${t[0]}.`);
    }
    for (const n of this.birthdays()) {
      parts.push(`Happy birthday to ${n}!`);
    }
    for (const n of this.birthdays(1)) {
      parts.push(`Tomorrow is ${n}'s birthday.`);
    }
    return parts.length ? '  ' + parts.join(' ') : '';
  }

  async fest_calendar(): Promise<void> {
    const lines: string[] = [];
    for (let off = 0; off < 31; off++) {
      const [s, d] = this.fest_date(off);
      const when = off === 0 ? 'today' : off === 1 ? 'tomorrow' : `in ${off}d`;
      const f = FESTIVALS[`${s},${d}`];
      if (f) {
        lines.push(` ${SEASONS[s]} ${d}  ${when}  ${f[0]}`);
      }
      for (const n of this.birthdays(off)) {
        lines.push(` ${SEASONS[s]} ${d}  ${when}  ${n}'s birthday`);
      }
    }
    await this.show_lines('Upcoming Events & Birthdays', lines.slice(0, 14));
  }

  fest_bachs(): string[] {
    return Object.entries(NPCS)
      .filter(([, d]) => d.bach)
      .map(([n]) => n);
  }

  fest_bond(n: string, pts: number): void {
    this.friend[n] = clamp((this.friend[n] || 0) + pts, 0, 100);
  }

  async fest_pick(title: string, names: string[]): Promise<string | null> {
    const opts = [...names.map((n) => `${n} ${this.hearts(n)[0]}`), 'No one'];
    const sel = await this.menu(title, opts);
    return sel !== null && sel < names.length ? names[sel] : null;
  }

  fest_win(name: string): void {
    if (!this.fest_wins.includes(name)) {
      this.fest_wins.push(name);
    }
  }

  async fest_ev_newyear(): Promise<void> {
    await this.say("Let's welcome the new year together! Doug made rice cakes (mochi) for everyone!", 'Thomas');
    this.stamina = this.max_stamina;
    this.fatigue = 0;
    this.give('Rice', 3);
    for (const n of Object.keys(NPCS)) {
      this.fest_bond(n, 3);
    }
    await this.say('You share rice cakes and good wishes with the whole town. (+3 Rice, Stamina restored!)', null);
  }

  async fest_ev_goddess(): Promise<void> {
    await this.say('Every spring the young women of town dance to thank the Harvest Goddess.', 'Thomas');
    const n = await this.fest_pick('Who do you dance with / cheer for?', this.fest_bachs());
    if (n) {
      this.fest_bond(n, 8);
      await this.say(`You share the Spring Goddess Dance with ${n}!`, null);
    }
    this.give('Strawberry Seeds');
    await this.say("A warm breeze carries the Goddess's blessing. You receive Strawberry Seeds!", null);
  }

  async fest_ev_spring_thanks(): Promise<void> {
    await this.say('Spring Thanksgiving! Give homemade Cookies or Chocolate to someone special!', 'Thomas');
    const n = await this.fest_pick('Give a Thanksgiving treat to...', this.fest_bachs());
    if (n) {
      this.fest_bond(n, 10);
      await this.say(`Thank you so much! These are delicious! (+10 Friendship with ${n})`, n);
    }
  }

  async fest_ev_horserace(): Promise<void> {
    await this.say('Welcome to the Mineral Town Horse Races! Bet on horses for Medals or race your own steed!', 'Thomas');
    const sel = await this.menu('Horse Race Options', [
      'Race Your Own Horse (Win a Power Berry + 200 Medals!)',
      'Bet 100G on Favorite (Win 150 Medals)',
      'Bet 500G on Longshot (Win 600 Medals)',
    ]);
    if (sel === 0) {
      const rival = py_rng().randint(14, 24);
      const score = await this.fest_mash(4.5, rival, 'Mineral Town Derby');
      if (score >= rival) {
        this.medals += 200;
        this.fest_win('Horse Race');
        this.give_power_berry('horse_race');
        await this.say(`Your horse thunders across the finish line in 1st place! (+200 Medals & Power Berry!)`, 'Thomas');
      } else {
        this.medals += 30;
        await this.say(`A close race! You take 2nd place and earn 30 Medals. (${score} vs ${rival})`, 'Thomas');
      }
    } else if (sel === 1 && this.gold >= 100) {
      this.gold -= 100;
      this.medals += 150;
      await this.say('Your horse won! You collect +150 Medals!', 'Thomas');
    } else if (sel === 2 && this.gold >= 500) {
      this.gold -= 500;
      this.medals += 600;
      await this.say('What an upset! The longshot wins! You collect +600 Medals!', 'Thomas');
    }
  }

  async fest_ev_cooking(): Promise<void> {
    await this.say('Welcome to the Cooking Festival! The renowned Gourmet will judge your finest dish!', 'Thomas');
    const dishes = Object.keys(this.inv).filter((i) => ITEMS[i]?.[2] === 'dish' && i !== 'Failed Dish');
    if (!dishes.length) {
      await this.say('You have no cooked dishes in your rucksack to enter. Next year, cook something in your Kitchen!', 'Gourmet');
      return;
    }
    const sel = await this.menu('Enter which dish for the Gourmet?', dishes);
    if (sel === null) return;
    const dish = dishes[sel];
    this.take(dish, 1);
    const staminaVal = ITEMS[dish][1] || 20;
    if (staminaVal >= 30 || py_rng().random() < 0.7) {
      this.fest_win('Cooking Festival');
      this.gold += 1000;
      for (const n of Object.keys(NPCS)) this.fest_bond(n, 5);
      await this.say(`Gourmet: 'MAGNIFICENT! The aroma of ${this.name}'s ${dish} is divine! First prize!' (+1000G)`, 'Gourmet');
    } else {
      await this.say(`Gourmet: 'Hmm, a decent ${dish}, though Ann's entry edges it out today!'`, 'Gourmet');
    }
  }

  async fest_ev_beach(): Promise<void> {
    await this.say('Beach Day & the Dog Frisbee Contest! Let us see how far your dog can catch the Frisbee!', 'Thomas');
    if (!this.inv['Frisbee']) {
      await this.say('You need a Frisbee (sold by Won at Zack\'s Beach House) to compete!', 'Thomas');
      return;
    }
    const throwDist = this.dog_frisbee_dist + py_rng().randint(10, 35);
    if (throwDist >= 45) {
      this.fest_win('Beach Frisbee');
      this.give_power_berry('beach_frisbee');
      await this.say(`Incredible! Your dog leaps and catches the Frisbee at ${throwDist}m! First Prize: Power Berry!`, 'Thomas');
    } else {
      this.dog_frisbee_dist += 10;
      await this.say(`Your dog catches it at ${throwDist}m! Practice at your Doghouse to beat the 45m record!`, 'Thomas');
    }
  }

  async fest_ev_cowfest(): Promise<void> {
    await this.say('The Cow Festival! Barley and I will judge the healthiest, happiest cow in Mineral Town!', 'Thomas');
    const cows = this.animals.filter((a) => a.kind === 'cow');
    if (!cows.length) {
      await this.say('You have no cows to enter this year.', null);
      return;
    }
    const bestCow = cows.reduce((a, b) => (a.aff >= b.aff ? a : b));
    if (bestCow.aff >= 70 || py_rng().random() < 0.6) {
      bestCow.wonFestival = true;
      bestCow.aff = 100;
      this.fest_win('Cow Festival');
      await this.say(`First Prize goes to ${bestCow.name}! ${bestCow.name} will now produce GOLDEN MILK (and P/X Milk with outdoor grazing)!`, 'Thomas');
    } else {
      bestCow.aff = Math.min(100, bestCow.aff + 15);
      await this.say(`${bestCow.name} takes 2nd place! Brush and talk to her daily to win next year!`, 'Barley');
    }
  }

  async fest_ev_sheepfest(): Promise<void> {
    await this.say('The Sheep Festival! Let us judge the fluffiest wool in Mineral Town!', 'Thomas');
    const sheep = this.animals.filter((a) => a.kind === 'sheep');
    if (!sheep.length) {
      await this.say('You have no sheep to enter this year.', null);
      return;
    }
    const bestSheep = sheep.reduce((a, b) => (a.aff >= b.aff ? a : b));
    if (bestSheep.aff >= 70 || py_rng().random() < 0.6) {
      bestSheep.wonFestival = true;
      bestSheep.aff = 100;
      this.fest_win('Sheep Festival');
      await this.say(`First Prize goes to ${bestSheep.name}! ${bestSheep.name} will now produce GOLDEN WOOL (and P/X Wool with grazing)!`, 'Thomas');
    } else {
      bestSheep.aff = Math.min(100, bestSheep.aff + 15);
      await this.say(`${bestSheep.name} takes runner-up honors!`, 'Barley');
    }
  }

  async fest_ev_music(): Promise<void> {
    await this.say('Everyone gathers at the Church for the Autumn Music Festival!', 'Carter');
    const n = await this.fest_pick('Perform alongside...', this.fest_bachs());
    if (n) {
      this.fest_bond(n, 8);
      await this.say(`The ocarina, organ, and flute fill the sanctuary with gentle harmony alongside ${n}.`, null);
    }
  }

  async fest_ev_pumpkin(): Promise<void> {
    await this.say('Happy Pumpkin Festival! May and Stu knock on your door hoping for sweet treats!', 'May');
    if (this.inv['Chocolate'] || this.inv['Cake'] || this.inv['Cookies']) {
      this.fest_bond('May', 8);
      this.fest_bond('Popuri', 5);
      await this.say('Yay! Thank you for the sweets!', 'May');
    } else {
      this.give('Chocolate', 2);
      await this.say('Chef the Harvest Sprite shares Chocolate with you and the kids!', null);
    }
  }

  async fest_ev_winter_req(): Promise<void> {
    await this.say("Ho ho! It's my annual Winter Request! Can you share a gift from your rucksack?", 'Thomas');
    const items = Object.keys(this.inv);
    if (items.length > 0) {
      this.give('Golden Lumber', 1);
      this.gold += 500;
      await this.say('Splendid! As promised, here is a piece of GOLDEN LUMBER and 500G! Ho ho!', 'Thomas');
    } else {
      await this.say('Ah, your rucksack is empty! Next year, keep a crop or forage item handy!', 'Thomas');
    }
  }

  async fest_ev_stocking(): Promise<void> {
    await this.say('On Starry Night Eve, Mayor Thomas sneaks down the chimney while you sleep...', null);
    const gift = py_rng().choice(['Diamond', 'Pink Diamond', 'Alexandrite', 'Mythic Stone']);
    this.give(gift, 1);
    await this.say(`You check your Stocking on Winter 25 morning and find a ${gift}!`, null);
  }

  async fest_mash(duration: number, rival: number, title: string): Promise<number> {
    const start = Date.now() / 1000;
    let n = 0;
    let last: string | null = null;
    const [W, H] = [this.scr.w, this.scr.h];
    while (true) {
      const el = Date.now() / 1000 - start;
      if (el >= duration) break;
      const draw = () => {
        const [bx, by] = [Math.floor((W - 50) / 2), Math.floor(H / 2) - 4];
        this.scr.box(bx, by, 50, 7, '0D', '00', title);
        const bar = 32;
        const you = Math.min(bar, Math.floor((n * bar) / Math.max(1, rival + 8)));
        const them = Math.min(bar, Math.floor((Math.floor((rival * el) / duration) * bar) / Math.max(1, rival + 8)));
        this.scr.put(bx + 2, by + 2, `You   [${'#'.repeat(you)}${'.'.repeat(bar - you)}]`, '0B');
        this.scr.put(bx + 2, by + 3, `Rival [${'#'.repeat(them)}${'.'.repeat(bar - them)}]`, '08');
        this.scr.put(bx + 2, by + 5, `LEFT / RIGHT or SPACE!   ${(duration - el).toFixed(1)}s`, '07', '00', true);
      };
      this.render();
      draw();
      this.scr.flush();
      const k = await this.scr.getKey(0.03);
      if (k && ['left', 'a', 'h', 'right', 'd', 'l', 'space', 'x'].includes(k)) {
        const side = ['left', 'a', 'h'].includes(k) ? 'L' : k === 'space' || k === 'x' ? (last === 'L' ? 'R' : 'L') : 'R';
        if (side !== last) {
          n += 1;
          last = side;
        }
      }
    }
    this.last = Date.now() / 1000;
    return n;
  }

  async fest_ev_sumo(): Promise<void> {
    await this.say("Chicken Sumo! Each farmer's hen tries to push the other out of the ring!", 'Thomas');
    if (!this.chickens) {
      await this.say("You don't have a chicken to enter, so you watch Rick's hen win again.", null);
      return;
    }
    const rival = py_rng().randint(14, 24);
    await this.say('Cheer your hen on by pressing LEFT/RIGHT or SPACE rapidly!', 'Rick');
    const score = await this.fest_mash(4.5, rival, 'Chicken Sumo');
    if (score >= rival) {
      this.gold += 500;
      this.chicken_fest_won = true;
      this.chicken_aff = 100;
      this.give('Chicken Feed', 10);
      this.fest_win('Chicken Sumo');
      this.fest_bond('Rick', 4);
      await this.say(
        `Your hen shoves Rick's hen clean out of the ring! Your hens now lay GOLDEN EGGS! (+500G)`,
        'Thomas'
      );
    } else {
      this.fest_bond('Rick', 1);
      await this.say(`Rick's hen holds the ring. Better luck next year! (${score} vs ${rival})`, 'Rick');
    }
  }

  async fest_ev_egghunt(): Promise<void> {
    await this.say('Eggs are hidden in nine flower bushes around the square. You get three peeks. Find two or more to win!', 'Thomas');
    const eggs = new Set(py_rng().sample(py_range(9), 3));
    const opened = new Set<number>();
    let cur = 4;
    let tries = 3;
    let found = 0;
    const [W, H] = [this.scr.w, this.scr.h];
    while (tries > 0) {
      const draw = () => {
        const [bx, by] = [Math.floor((W - 36) / 2), Math.floor(H / 2) - 6];
        this.scr.box(bx, by, 36, 11, '0D', '00', `Egg Hunt  peeks left: ${tries}`);
        for (let i = 0; i < 9; i++) {
          const [cx, cy] = [bx + 5 + (i % 3) * 10, by + 2 + Math.floor(i / 3) * 2];
          const [txt, fg] = opened.has(i) ? (eggs.has(i) ? ['( o )', '07'] : ['(   )', '02']) : ['(***)', '0B'];
          this.scr.put(cx, cy, txt, fg, i === cur ? '01' : '00', i === cur);
        }
        this.scr.put(bx + 3, by + 9, 'arrows move, X to search', '02');
      };
      const k = await this.modal(draw);
      if (k in DIRS) {
        const [dx, dy] = DIRS[k];
        cur = clamp((cur % 3) + dx, 0, 2) + 3 * clamp(Math.floor(cur / 3) + dy, 0, 2);
      } else if (OK_KEYS.has(k) && !opened.has(cur)) {
        opened.add(cur);
        tries -= 1;
        if (eggs.has(cur)) {
          found += 1;
          this.msg('You found an egg!', '07');
        }
      } else if (CANCEL_KEYS.has(k)) {
        break;
      }
    }
    if (found) this.give('Egg', found);
    if (found >= 2) {
      this.gold += 300;
      this.fest_win('Egg Hunt');
      await this.say(`You found ${found} eggs! First prize: 300G — and you keep the eggs!`, 'Thomas');
    } else {
      this.fest_bond('May', 2);
      await this.say(`You found ${found} egg${found !== 1 ? 's' : ''}. May found the most and wins this year!`, 'Thomas');
    }
  }

  async fest_companion(ask: string, scene: string, line: string): Promise<void> {
    const names = this.fest_bachs().filter((n) => n !== this.married);
    if (this.married) {
      names.unshift(this.married);
    }
    const n = await this.fest_pick(ask, names);
    if (!n) {
      await this.say(scene, null);
    } else if ((this.friend[n] || 0) >= 10 || n === this.married) {
      this.fest_bond(n, 8);
      await this.say(`${scene} ${n} stays by your side the whole time.`, null);
      await this.say(line, n);
    } else {
      this.fest_bond(n, 1);
      await this.say('Sorry, I promised to spend tonight with my family.', n);
      await this.say(scene, null);
    }
  }

  async fest_ev_fireworks(): Promise<void> {
    await this.fest_companion(
      'Watch the fireworks with...',
      'BOOM! Fireworks bloom over Mineral Beach in red, blue and pink.',
      "Wow... they're beautiful. I'm glad I'm watching them with you."
    );
  }

  async fest_ev_moon(): Promise<void> {
    await this.fest_companion(
      'View the full moon on Mother\'s Hill with...',
      "The full autumn moon rises over Mother's Hill, round and bright.",
      'The moon is so pretty tonight. ...So is the company.'
    );
  }

  async fest_ev_harvest(): Promise<void> {
    await this.say('Everyone adds an ingredient to the giant pot! Then we all share the Harvest Stew!', 'Thomas');
    const items = py_sorted(Object.keys(this.inv)).filter((i) =>
      ['crop', 'forage', 'fish', 'animal', 'dish'].includes(ITEMS[i]?.[2])
    );
    const sel = items.length ? await this.menu('Add what to the pot?', [...items, 'Nothing']) : null;
    if (sel === null || sel >= items.length) {
      await this.say("Everyone else's ingredients make a fine stew anyway.", null);
    } else {
      const item = items[sel];
      this.take(item);
      const pts = (ITEMS[item]?.[0] || 0) >= 100 ? 4 : 2;
      for (const n of Object.keys(NPCS)) {
        this.fest_bond(n, pts);
      }
      await this.say(`Your ${item} makes the stew delicious! Everyone in town thanks you.`, null);
    }
    this.stamina = this.max_stamina;
    this.fatigue = 0;
    await this.say("You eat until you're full. (Stamina & Fatigue restored)", null);
  }

  async fest_ev_thanks(): Promise<void> {
    await this.say("Winter Thanksgiving! People who care about you bring homemade treats!", 'Thomas');
    const givers = this.fest_bachs().filter((n) => (this.friend[n] || 0) >= 25 || n === this.married);
    for (const n of givers) {
      const treat = (this.friend[n] || 0) >= 50 ? 'Chocolate Cake' : 'Chocolate';
      this.give(treat);
      await this.say(`Happy Thanksgiving! I brought you ${treat}!`, n);
    }
    if (!givers.length) {
      await this.say('No one brought you a cake this year... Befriend the villagers for next year!', null);
    }
  }

  async fest_ev_starry(): Promise<void> {
    await this.fest_companion(
      'Spend Starry Night dinner with...',
      'Snow falls softly outside as candles glow around the dinner table.',
      "They say a wish made on Starry Night always comes true. I already know what I'll wish for."
    );
  }

  async fest_ev_nye(): Promise<void> {
    await this.say(`Another year in Mineral Town comes to an end! Let's eat buckwheat noodles, ${this.name}!`, 'Thomas');
    this.stamina = this.max_stamina;
    this.fatigue = 0;
    this.give('Flour', 5);
    for (const n of Object.keys(NPCS)) {
      this.fest_bond(n, 2);
    }
    await this.show_lines(`Year ${this.year} in Review`, [
      `  Gold: ${this.gold}G`,
      `  Total shipped: ${this.shipped_total}G`,
      `  Power Berries: ${this.power_berries}/10`,
      `  Chickens: ${this.chickens}   Barn Animals: ${this.animals.length}`,
      `  Spouse: ${this.married || '-'}   Child: ${this.child_name || '-'}`,
      `  Festival prizes: ${this.fest_wins.join(', ') || 'none yet'}`,
    ]);
  }

  async pass_out(text: string): Promise<void> {
    if (this.passing_out) return;
    this.passing_out = true;
    await this.say(text, null);
    await this.say('Doctor: You pushed yourself until you collapsed! Elli and I brought you home. Please take care of your Fatigue!', 'Doctor');
    await this.new_day('passout');
    this.passing_out = false;
  }

  run_sprites_work(report: string[]): void {
    let watered = 0;
    let harvested = 0;
    let animalsCared = 0;
    for (const s of SPRITES) {
      const job = this.sprite_jobs[s.name];
      if (!job || job.days <= 0 || job.task === 'none') continue;
      job.days -= 1;
      job.skill = Math.min(100, job.skill + 2);
      if (job.task === 'Watering') {
        for (const k of this.tilled) {
          this.wet.add(k);
          watered += 1;
        }
      } else if (job.task === 'Harvesting') {
        for (const [k, [crop, age]] of Object.entries(this.crops)) {
          const [days, regrow] = [CROPS[crop][2], CROPS[crop][3]];
          if (age >= days && crop !== 'Grass') {
            this.bin[crop] = (this.bin[crop] || 0) + 1;
            harvested += 1;
            if (regrow) {
              this.crops[k][1] = days - regrow;
            } else {
              delete this.crops[k];
            }
          }
        }
      } else if (job.task === 'Animals') {
        this.fed = this.chickens;
        for (const a of this.animals) {
          a.fed = true;
          a.aff = Math.min(100, a.aff + 1);
          animalsCared += 1;
        }
      }
      if (job.days === 0) {
        report.push(`${s.name} finished their ${job.task} contract.`);
        job.task = 'none';
      }
    }
    if (watered > 0) report.push(`Harvest Sprites watered your tilled field!`);
    if (harvested > 0) report.push(`Harvest Sprites harvested ${harvested} ripe crop(s) into the Shipping Bin!`);
    if (animalsCared > 0) report.push(`Harvest Sprites fed and brushed your livestock!`);
  }

  async new_day(reason: string): Promise<void> {
    const late = this.minutes >= 24 * 60;
    const report: string[] = [];

    // Collect any remaining items in shipping bin
    const total = this.process_zack_pickup();
    if (total > 0) {
      report.push(`Zack settled your remaining shipment: +${total}G.`);
    }
    this.zack_paid_today = false;
    this.honey_picked = false;

    // Advance crops that were watered yesterday
    for (const [pKey, c] of Object.entries(this.crops)) {
      if (this.wet.has(pKey) && c[1] < CROPS[c[0]][2]) {
        c[1] += 1;
      }
    }
    this.wet = new CoordSet();

    // Advance calendar
    this.day += 1;
    if (this.day > 30) {
      this.day = 1;
      this.season += 1;
      if (this.season > 3) {
        this.season = 0;
        this.year += 1;
      }
      report.push(`${this.season_name} has arrived!`);
      // Keep perennial Grass in Spring/Summer/Fall; wither seasonal crops
      const surviving: Record<string, [string, number]> = {};
      for (const [k, [crop, age]] of Object.entries(this.crops)) {
        if (crop === 'Grass' && this.season !== 3) {
          surviving[k] = [crop, age];
        }
      }
      if (Object.keys(this.crops).length > Object.keys(surviving).length) {
        report.push('The change of season withered your old seasonal crops.');
      }
      this.crops = surviving;
    }

    // Cursed Sickle / Hammer 10-day blessing progression
    if (this.levels[this.tool] === 5 && (this.tool === 'Sickle' || this.tool === 'Hammer')) {
      this.cursed_days[this.tool] = (this.cursed_days[this.tool] || 0) + 1;
      if (this.cursed_days[this.tool] >= 10) {
        this.levels[this.tool] = 6;
        report.push(`Miracle! Carrying the Cursed ${this.tool} for 10 days turned it into a BLESSED ${this.tool}!`);
      }
    }

    this.weather = this.tomorrow;
    for (const map of OUTDOOR_MAPS) {
      const wet = this.weather === 'Rain' || this.weather === 'Typhoon' ? 1 : (this.wetness[map] || 0) * 0.55;
      this.wetness[map] = wet < 0.06 ? 0 : wet;
    }
    let [nd, ns] = [this.day + 1, this.season];
    if (nd > 30) {
      nd = 1;
      ns = (ns + 1) % 4;
    }
    this.tomorrow = this.roll_weather(ns, nd);

    // Run hired Harvest Sprites
    this.run_sprites_work(report);

    if (this.weather === 'Rain' || this.weather === 'Typhoon') {
      for (const k of this.tilled) {
        this.wet.add(k);
      }
      report.push("It's raining — your fields are watered.");
    }
    if (this.weather === 'Typhoon' || this.weather === 'Blizzard') {
      report.push(`A fierce ${this.weather} sweeps through Mineral Town! Stay safe!`);
    }
    if (reason === 'sleep') this.night_surprise(report);

    // Incubator & Chickens
    if (this.incubator_days > 0) {
      this.incubator_days -= 1;
      if (this.incubator_days === 0 && this.chickens < this.coop_cap()) {
        this.chickens += 1;
        report.push('Cheep cheep! A new baby chick hatched in your Incubator!');
      }
    }
    if (this.fed) {
      this.eggs += this.fed;
      report.push(`Your chickens laid ${this.fed} egg${this.fed > 1 ? 's' : ''}.`);
    }
    this.fed = 0;

    this.barn_new_day(report);

    // Blacksmith completion
    if (this.upgrading && this.absday() >= this.upgrading[1]) {
      const t = this.upgrading[0];
      this.levels[t] = (this.levels[t] || 0) + 1;
      if (t === 'Watering Can') {
        this.water = CAN_CAP[this.levels[t]];
      }
      report.push(`Saibara finished your ${LEVELS[this.levels[t]]} ${t}!`);
      this.upgrading = null;
    }

    // TV Shopping delivery
    if (this.tv_order && this.absday() >= this.tv_order[1]) {
      const item = this.tv_order[0];
      this.tv_order = null;
      if (item === 'Power Berry') {
        this.give_power_berry('tv_shopping');
        report.push('Zack delivered your TV Shopping Power Berry!');
      } else {
        this.give(item, 1);
        report.push(`Zack delivered your ${item} from TV Shopping!`);
      }
    }

    // Carpentry completion
    report.push(...this.carpentry_day());

    // Marriage & Child Birth milestone
    if (this.married && !this.child_name && this.marriage_day >= 0 && this.absday() - this.marriage_day >= 30) {
      this.child_name = 'Sprout';
      report.push(`Joyous news! ${this.married} and you welcomed a healthy baby into your family!`);
    }

    // Rose Square request board
    this.request_day(report);

    // Spawn daily weeds & mountain/beach forage
    if (this.season !== 3) {
      const m = this.maps['farm'];
      const objs = this.objs['farm'];
      for (let i = 0; i < 3; i++) {
        const [x, y] = [py_rng().randint(3, 60), py_rng().randint(9, 26)];
        const k = pkey(x, y);
        if (m.tile(x, y) === 'field' && !this.tilled.has(k) && !objs[k]) {
          objs[k] = 'weed';
        }
      }
    }
    this.spawn_forage();
    this.spawn_digs();
    this.talked = new Set();
    this.gifted = new Set();
    this.prayed = false;
    this.fest_new_day(report);

    // Sleep Stamina & Fatigue Recovery (with Vase flower & Fireplace bonuses)
    const vaseBonus = this.vase_flower ? 15 : 0;
    const fireBonus = this.fireplace_lit && this.season === 3 ? 20 : 0;
    this.fireplace_lit = false;
    if (reason === 'passout') {
      this.stamina = Math.floor(this.max_stamina / 2);
      this.fatigue = 30;
      report.push('You woke up aching from collapsing yesterday. (Half Stamina, 30 Fatigue)');
    } else if (late) {
      this.stamina = Math.min(this.max_stamina, Math.floor((this.max_stamina * 3) / 4) + vaseBonus);
      this.fatigue = Math.max(0, this.fatigue - 25 - fireBonus);
      report.push('You stayed up past midnight, so you did not fully recover.');
    } else {
      this.stamina = this.max_stamina;
      this.fatigue = Math.max(0, this.fatigue - 50 - vaseBonus - fireBonus);
    }

    this.minutes = 6 * 60;
    this.acc = 0;
    this.riding_horse = false;
    this.mapname = 'house';
    [this.px, this.py] = HOUSE_WAKE;
    this.face = [0, -1];
    this.npc_pos = {};
    this.save(1);
    this.msgs = [];
    await this.say(`Good morning! ${this.date_str()}.  Weather: ${this.weather}.`, null);
    for (const r of report) {
      await this.say(r, null);
    }
    this.msg('Game saved to Diary Slot 1.', '03');
    this.last = Date.now() / 1000;
  }

  /** Drop saved forage that no longer lies on open ground (buildings have moved since older saves). */
  prune_forage(): void {
    for (const [name, items] of Object.entries(this.forage)) {
      const m = this.maps[name];
      if (!m) continue;
      for (const k of Object.keys(items)) {
        const [x, y] = parseCoordKey(k);
        const t = m.tile(x, y);
        if (t !== 'grass' && t !== 'sand') delete items[k];
      }
    }
  }

  /** Today's forage list for a map: an outer region's own pool, or the valley-wide seasonal list. */
  forage_pool(mapKey: string): string[] {
    return REGION_FORAGE[mapKey]?.[this.season_name] || FORAGE[this.season_name] || ['Blue Grass'];
  }

  spawn_forage(): void {
    const rng = py_rng();
    for (const mapKey of ['mountain', 'beach', 'woods', 'ridge', 'river', 'point', 'grove']) {
      const m = this.maps[mapKey];
      if (!m) continue;
      const items = this.forage_pool(mapKey);
      const fr: Record<string, string> = {};
      let tries = 0;
      const target = (FORAGE_TARGET[mapKey] ?? 6) * (this.season === 3 && mapKey !== 'beach' && mapKey !== 'point' ? 0.55 : 1);
      while (Object.keys(fr).length < target && tries < 400) {
        tries += 1;
        const [x, y] = [rng.randint(2, m.w - 3), rng.randint(2, m.h - 3)];
        const tile = m.tile(x, y);
        if ((tile === 'grass' || tile === 'sand') && !m.near(x, y, ['path', 'door', 'spring', 'pond'], 0)) {
          fr[pkey(x, y)] = rng.choice(items);
        }
      }
      this.forage[mapKey] = fr;
    }
    // fallen branches gather in Cedar Hollow overnight (a renewable lumber source)
    const woods = this.maps['woods'];
    if (woods) {
      const objs = (this.objs['woods'] ||= {});
      let tries = 0;
      while (Object.keys(objs).length < 9 && tries < 300) {
        tries += 1;
        const [x, y] = [rng.randint(2, woods.w - 3), rng.randint(2, woods.h - 3)];
        const k = pkey(x, y);
        if (woods.tile(x, y) === 'grass' && !woods.near(x, y, ['path', 'bridge'], 0) && !(k in (this.forage['woods'] || {}))) objs[k] = 'branch';
      }
    }
  }

  /** A free patch of open field on the farm (no soil, crop or object), or null. */
  free_field(): [number, number] | null {
    const m = this.maps['farm'];
    const objs = (this.objs['farm'] ||= {});
    const rng = py_rng();
    for (let tries = 0; tries < 200; tries++) {
      const [x, y] = [rng.randint(3, 60), rng.randint(9, 26)];
      const k = pkey(x, y);
      if (m.tile(x, y) === 'field' && !this.tilled.has(k) && !objs[k] && !this.crops[k]) return [x, y];
    }
    return null;
  }

  /** Wriggling soil: each morning a few dig spots appear across the valley (at most DIG_CAP per map). */
  spawn_digs(): void {
    const rng = py_rng();
    for (const mapKey of DIG_MAPS) {
      const m = this.maps[mapKey];
      if (!m || rng.random() < 0.45) continue;
      const objs = (this.objs[mapKey] ||= {});
      if (Object.values(objs).filter((o) => o === 'dig').length >= DIG_CAP) continue;
      if (mapKey === 'farm') {
        if (this.season === 3) continue; // frozen ground
        const spot = this.free_field();
        if (spot) objs[pkey(...spot)] = 'dig';
        continue;
      }
      const forage = this.forage[mapKey] || {};
      for (let tries = 0; tries < 80; tries++) {
        const [x, y] = [rng.randint(2, m.w - 3), rng.randint(2, m.h - 3)];
        const k = pkey(x, y);
        const tile = m.tile(x, y);
        if ((tile === 'grass' || tile === 'sand') && !objs[k] && !(k in forage) && !m.near(x, y, ['path', 'door', 'spring', 'pond', 'bridge'], 0)) {
          objs[k] = 'dig';
          break;
        }
      }
    }
  }

  /** Dig up a dig spot: coins, ore, seeds, local forage or, now and then, a relic for the museum. */
  dig_up(tx: number, ty: number): void {
    delete this.objs[this.mapname][pkey(tx, ty)];
    const rng = py_rng();
    const r = rng.random();
    const seeds = Object.keys(CROPS)
      .filter((c) => CROPS[c][0] === this.season_name && `${c} Seeds` in ITEMS)
      .map((c) => `${c} Seeds`);
    let found: string;
    if (r < 0.12) {
      const item = rng.choice(DIG_RELICS);
      this.give(item);
      found = `a ${item}! An old relic; the museum would treasure it.`;
      this.fx_add('sparkle', tx, ty, 0.9);
      this.mastery_add('foraging', 2);
    } else if (r < 0.37) {
      const item = rng.choice(DIG_ORES);
      this.give(item);
      found = `a chunk of ${item}.`;
    } else if (r < 0.55 && seeds.length) {
      const item = rng.choice(seeds);
      const n = rng.randint(1, 3);
      this.give(item, n);
      found = `${n} ${item}, still good!`;
    } else if (r < 0.75) {
      const item = rng.choice(this.forage_pool(this.mapname));
      this.give(item, 2);
      found = `2 ${item}.`;
    } else {
      const g = 30 + rng.randint(0, 17) * 10;
      this.gold += g;
      found = `an old purse with ${g}G inside!`;
      this.fx_add('coin', tx, ty, 0.8);
    }
    this.fx_add('debris', tx, ty, 0.45, { stuff: 'plant', delay: 0.05 });
    this.mastery_add('foraging', 1);
    this.msg(`You dug up ${found}`, '0B');
  }

  /** Now and then something happens while you sleep: one roll a night, most nights are quiet. */
  night_surprise(report: string[]): void {
    const rng = py_rng();
    if (rng.random() >= NIGHT_SURPRISE_CHANCE) return;
    const growing = Object.values(this.crops).filter(([c, age]) => c !== 'Grass' && age < CROPS[c][2]);
    const kinds = ['star', 'parcel'];
    if (this.season !== 3 && growing.length >= 3) kinds.push('moths', 'moths');
    const kind = rng.choice(kinds);
    if (kind === 'moths') {
      const lucky = rng.sample(growing, Math.min(6, growing.length));
      for (const c of lucky) c[1] += 1;
      report.push(`Glowmoths drifted over your field in the night. ${lucky.length} crops grew a little extra!`);
      return;
    }
    if (kind === 'star') {
      const spot = this.free_field();
      if (spot) {
        this.objs['farm'][pkey(...spot)] = 'starrock';
        report.push('A falling star streaked over the valley and landed on your farm! Find it and crack it open with your Hammer.');
        return;
      }
    }
    const friends = py_sorted(Object.keys(this.friend).filter((n) => NPCS[n] && (this.friend[n] || 0) >= 30));
    const from = friends.length ? rng.choice(friends) : 'Someone';
    const item = rng.choice(this.forage_pool(rng.choice(['mountain', 'beach', 'woods'])));
    this.give(item, 2);
    report.push(`${from} left a parcel by your door: 2 ${item}.`);
  }

  /** Semantic tag for a map cell, mirroring the precedence used by glyph(). */
  cell_tag(m: GameMap, x: number, y: number, t: string, hl: boolean, hlArea: boolean = false): CellTag {
    const pKey = pkey(x, y);
    const name = m.name;
    const tag: CellTag = { t, wx: x, wy: y, hl };
    if (hlArea) tag.hlArea = true;
    const obj = this.objs[name]?.[pKey];
    if (obj && OBJ_GLYPH[obj]) {
      tag.k = `obj:${obj}`;
      return tag;
    }
    const fr = this.forage[name]?.[pKey];
    if (fr && FORAGE_GLYPH[fr]) {
      tag.k = 'forage';
      return tag;
    }
    if (name === 'farm' && this.tilled.has(pKey)) {
      const wet = this.wet.has(pKey);
      const c = this.crops[pKey];
      if (!c) {
        tag.k = wet ? 'soil:wet' : 'soil';
      } else {
        const [crop, age] = c;
        const d = CROPS[crop];
        const stage = age >= d[2] ? 'ripe' : age === 0 ? 'seed' : age < d[2] / 2 ? 'sprout' : 'young';
        tag.k = `crop:${stage}${wet ? ':wet' : ''}`;
        tag.cropName = crop;
      }
      return tag;
    }
    if (name === 'mountain' && this.season === 3 && t === 'water' && x >= 13 && x <= 17 && y >= 7 && y <= 14) {
      tag.t = 'ice';
      return tag;
    }
    if (pKey in m.deco) {
      const [ch, fg] = m.deco[pKey];
      tag.k = 'deco';
      tag.dch = ch;
      tag.dfg = fg;
    }
    return tag;
  }

  glyph(m: GameMap, x: number, y: number, t: string): [string, string, string, boolean] {
    const pKey = pkey(x, y);
    const name = m.name;
    const obj = this.objs[name]?.[pKey];
    if (obj && OBJ_GLYPH[obj]) {
      let [ch, fg] = OBJ_GLYPH[obj];
      if (this.season === 3 && name === 'farm' && obj === 'weed') {
        fg = '07';
      }
      return [ch, fg, '00', false];
    }
    const fr = this.forage[name]?.[pKey];
    if (fr && FORAGE_GLYPH[fr]) {
      const [ch, fg] = FORAGE_GLYPH[fr];
      return [ch, fg, '00', true];
    }
    if (name === 'farm' && this.tilled.has(pKey)) {
      const bg = this.wet.has(pKey) ? '01' : '00';
      const c = this.crops[pKey];
      if (!c) {
        return ['=', '09', bg, false];
      }
      const [crop, age] = c;
      const d = CROPS[crop];
      if (age >= d[2]) {
        return [d[5], d[6], bg, true];
      }
      if (age === 0) {
        return [':', '09', bg, false];
      }
      if (age < d[2] / 2) {
        return [',', '0B', bg, false];
      }
      return ['"', '0B', bg, false];
    }
    // Frozen Lake ice in Winter around Lake Mine island
    if (name === 'mountain' && this.season === 3 && t === 'water' && x >= 13 && x <= 17 && y >= 7 && y <= 14) {
      return ['=', '0C', '01', false];
    }
    if (pKey in m.deco) {
      const [ch, fg] = m.deco[pKey];
      return [ch, fg, TILES[t]?.[2] || '00', false];
    }
    const [ch0, fg0, bg, ] = TILES[t] || [' ', '00', '00', false];
    let ch = ch0;
    let fg = fg0;
    const season = this.season;
    const h = (x * 7 + y * 13 + x * y) % 11;
    if (t === 'grass') {
      if (season === 3) {
        return [h < 4 ? '.' : ' ', '05', '00', false];
      }
      if (h < 3) {
        return [h ? ',' : '"', season === 2 && h !== 1 ? '09' : '0B', '00', false];
      }
      return [' ', fg, bg, false];
    }
    if (t === 'field' && season === 3) {
      return ['.', '05', '00', false];
    }
    if (t === 'tree') {
      return ['T', ['0B', '0B', '09', '04'][season], '00', true];
    }
    if (t === 'flower') {
      if (season === 3) {
        return ['.', '05', '00', false];
      }
      return ['*', ['0A', '0E', '08', '0C', '07'][h % 5], '00', false];
    }
    if (t === 'water' || t === 'fountain' || t === 'spring' || t === 'pond') {
      if (!this.scr.reducedMotion && (x + y + Math.floor((Date.now() / 1000) * 1.5)) % 7 === 0) {
        ch = '-';
      }
      if (season === 3 && t === 'water' && m.name !== 'mine') {
        fg = '0C';
      }
    }
    return [ch, fg, bg, false];
  }

  render(): void {
    const s = this.scr;
    s.clear();
    if (!this.started) {
      this.draw_title();
      return;
    }
    const [W, H] = [s.w, s.h];
    if (W < COMPACT_MIN_COLS || H < MIN_ROWS) {
      s.put(0, 0, `Terminal too small: need ${COMPACT_MIN_COLS}x${MIN_ROWS}, have ${W}x${H}`, '08');
      return;
    }
    // Narrow (phone) grids drop the side panel: the map takes the full width and the
    // panel's essentials move into the divider row (draw_status); 'p' overlays the panel.
    const compact = isCompact(W);
    const contour = s.style === 'enhanced' && !compact;
    const side = compact ? 0 : contour ? clamp(Math.round(W * 0.23), 24, 36) : 29;
    const mapY = contour ? 0 : 1;
    const dividerY = contour ? H - 2 : H - 4;
    const [vw, vh] = [compact ? W : W - side - 1, dividerY - mapY];
    s.ctx = {
      mapName: this.mapname,
      indoor: !!this.map.indoor,
      minutes: this.minutes,
      season: this.season,
      weather: this.map.indoor ? 'Sunny' : this.weather,
      wetness: this.wetness[this.mapname] || 0,
      cues: s.accessibleCues,
      palette: s.paletteMode,
      toolTier: UPGRADABLE.includes(this.tool) ? (this.levels[this.tool] || 0) : 0,
      zoom: 1,
      reducedMotion: s.reducedMotion,
      view: { x: 0, y: mapY, w: vw, h: vh },
      divX: vw,
      divY: dividerY,
      icons: [],
    };
    if (!contour) this.draw_topbar(W);
    this.draw_map(0, mapY, vw, vh);
    if (this.show_minimap) this.draw_minimap(vw, vh);
    if (compact) {
      s.put(0, H - 4, '-'.repeat(W), '01');
      this.draw_status(H - 4, W);
      if (this.show_panel) {
        const rows = 16 + (this.chickens ? 1 : 0) + (this.animals.length ? 1 : 0);
        s.box(W - 29, 1, 29, Math.min(H - 4, rows), '0C', '00', 'Status');
        this.draw_side(W - 27, 2, 25, false);
      }
      this.draw_msgs(H - 3);
      return;
    }
    for (let y = mapY; y < dividerY; y++) {
      s.put(vw, y, '|', '01');
    }
    s.put(0, dividerY, '-'.repeat(W), '01');
    if (contour) this.draw_contour_side(vw + 3, 1, side - 5);
    else this.draw_side(vw + 2, 2, side - 2);
    this.draw_msgs(dividerY + 1);
  }

  /** The right-side Contour Farm HUD. Grid bounds also cover short/touch viewports. */
  draw_contour_side(x: number, y: number, w: number): void {
    const s = this.scr;
    const end = s.ctx?.divY ?? s.h - 2;
    const compact = s.h < 30;
    const gap = s.h >= 38 ? 2 : 1;
    const clip = (text: string, width = w) => text.length > width ? text.slice(0, Math.max(0, width - 1)) + '…' : text;
    const line = (row: number, text: string, col = '05', bold = false) => {
      if (row < end) s.put(x, row, clip(text), col, '00', bold);
    };
    const pair = (row: number, name: string, value: string, col = '05') => {
      if (row >= end) return;
      const val = clip(value, Math.max(1, w - name.length - 1));
      line(row, name, '04');
      s.put(x + w - val.length, row, val, col);
    };
    const label = (row: number, text: string, scale: number, width: number, h: number) => {
      s.put(x, row, text[0], '07', '00', true);
      s.tag(x, row, { t: 'ui', k: 'hud:label', label: { text, scale, w: width, h } });
    };
    // Farm chrome: a post-and-rail fence between blocks, and ledger rows with dot leaders.
    const rail = (row: number) => {
      if (row >= end) return;
      for (let i = 0; i < w; i++) {
        s.put(x + i, row, fencePost(i, w) ? '╪' : '═', '01');
        s.tag(x + i, row, { t: 'ui', k: 'hud:fence' });
      }
    };
    const ledger = (row: number, name: string, value: string, col = '05') => {
      if (row >= end) return;
      pair(row, name, value, col);
      const from = name.length + 1;
      const to = w - Math.min(value.length, Math.max(1, w - name.length - 1)) - 1;
      if (to - from >= 3) s.put(x + from, row, '·'.repeat(to - from), '01');
    };

    const titleH = compact ? 1 : 2;
    label(y, 'HRVSTMN', compact ? 1 : 1.45, w, titleH);
    line(y + titleH, `${this.name} of ${this.farm} Farm`, '04');
    rail(y + titleH + 1);
    y += titleH + 1 + gap;
    // the season glyph (blossom, clover, leaf, snowflake) is drawn by the renderer
    if (y < end) {
      s.put(x + 2, y, clip(`${this.season_name.toUpperCase()} / YEAR ${this.year}`, w - 2), '0C', '00', true);
      s.ctx?.icons.push({ x, y, icon: 'season' });
    }
    y++;
    const dayH = compact ? 2 : 3;
    label(y, String(this.day).padStart(2, '0'), compact ? 1.8 : 2.6, 7, dayH);
    s.put(x + 8, y, WEEKDAYS[this.weekday].toUpperCase(), '07', '00', true);
    s.put(x + 8, y + 1, fmt_time(this.minutes).replace(/(AM|PM)$/, ' $1'), '05');
    y += dayH;
    line(y, `  ${this.weather.toUpperCase()}`, WEATHER_COL[this.weather] || '09');
    s.ctx?.icons.push({ x, y, icon: 'weather' });
    y += 1 + gap;

    const tool = this.tool;
    const preview = this.action_preview();
    const cost = preview.cost > 0 ? `-${preview.cost}st${preview.faint ? '!' : ''}` : '';
    pair(y++, 'EQUIPPED', cost, preview.faint ? '08' : '04');
    const idx = TOOLS.includes(tool) ? `[${TOOLS.indexOf(tool) + 1}] ` : '';
    // the equipped tool is a painted sign: one board the full width of the panel
    if (y < end) {
      s.put(x, y, ' '.repeat(w), '07');
      s.put(x + 1, y, clip(idx + tool.toUpperCase(), w - 2), '07', '00', true);
      if (idx) s.put(x + 1, y, idx.trimEnd(), '0C', '00', true);
      for (let i = 0; i < w; i++) s.tag(x + i, y, { t: 'ui', k: 'hud:sign' });
    }
    y++;
    if (UPGRADABLE.includes(tool)) {
      const level = this.levels[tool] || 0;
      const detail = `${LEVELS[level]} / ${this.tool_exp[tool] || 0}%`;
      if (tool === 'Watering Can') pair(y, detail, `${this.water}/${CAN_CAP[level]}`, '0C');
      else line(y, detail, '04');
    } else if (tool.endsWith(' Seeds')) {
      const crop = tool.slice(0, -6);
      const inSeason = crop === 'Grass' || CROPS[crop]?.[0] === this.season_name;
      pair(y, `${this.inv[tool] || 0} bags`, inSeason ? 'IN SEASON' : 'OFF-SEASON', inSeason ? '0B' : '08');
    }
    y++;
    rail(y++);
    y += gap - 1;

    const fraction = clamp(this.stamina / this.max_stamina, 0, 1);
    const staminaCol = fraction > 0.5 ? '0B' : fraction > 0.2 ? '09' : '08';
    pair(y++, 'STAMINA', `${this.stamina}/${this.max_stamina}`, staminaCol);
    const filled = Math.round(fraction * w);
    for (let i = 0; i < w; i++) {
      s.put(x + i, y, '─', i < filled ? staminaCol : '01');
      s.tag(x + i, y, { t: 'ui', k: i < filled ? 'hud:meter' : 'hud:meter:empty' });
    }
    y++;
    pair(y++, 'FATIGUE', `${this.fatigue}/100`, this.fatigue < 50 ? '04' : this.fatigue < 80 ? '09' : '08');
    y += gap;
    ledger(y++, 'GOLD', `${this.gold}G`, '09');
    const binValue = py_sum(Object.entries(this.bin).map(([item, qty]) => (ITEMS[item] ? ITEMS[item][0] : 0) * qty));
    ledger(y++, 'BIN', `${binValue}G`, binValue ? '09' : '04');
    const basket = getBasketTotal(this.basket);
    const held = this.held === 'Basket' ? `Basket ${basket}/${BASKET_CAPACITY}`
      : this.held ? `${this.held} x${this.inv[this.held] || 0}`
      : basket ? `Basket ${basket}/${BASKET_CAPACITY}` : '—';
    ledger(y++, 'HELD', held, this.held ? '0A' : basket ? '09' : '04');
    y += gap;
    if (this.upgrading) line(y++, `FORGE  ${this.upgrading[0]}`, '09');
    if (this.riding_horse) line(y++, 'RIDING HORSE / 2x', '09');
    if (this.chickens) ledger(y++, 'COOP', `${this.chickens} hens / ${this.eggs} eggs`);
    if (this.animals.length) {
      const hungry = this.animals.filter((animal) => !animal.fed).length;
      ledger(y++, 'BARN', hungry ? `${hungry} hungry` : `${this.animals.length} fed`, hungry ? '08' : '04');
    }
    if (this.power_berries || this.has_mystic_berry) ledger(y++, 'BERRIES', `${this.power_berries}${this.has_mystic_berry ? ' + Mystic' : ''}`);
    if (y + 2 < end) line(end - 1, this.map.title + (this.map.indoor ? ' / INDOORS' : ''), '04');
  }

  draw_topbar(W: number): void {
    const s = this.scr;
    s.put(0, 0, ' '.repeat(W), '05', '01');
    const sn = this.season_name;
    const compact = isCompact(W);
    const sep = compact ? ' ' : '  ';
    let x = 1;
    if (s.style === 'enhanced') {
      // the renderer draws the season glyph into this blank cell, like the weather icon
      s.ctx?.icons.push({ x, y: 0, icon: 'season' });
      x = 2;
    }
    const segments: [string, string][] = [
      [`${sn} ${this.day}`, SEASON_COL[sn]],
      [` ${WEEKDAYS[this.weekday]}`, '05'],
      [compact ? ` Y${this.year}` : `  Yr ${this.year}`, '04'],
      [`${sep}${fmt_time(this.minutes)}`, '07'],
      [`  ${this.weather}`, WEATHER_COL[this.weather] || '09'],
      [`${sep}${this.gold}G`, '09'],
    ];
    for (const [text, fg] of segments) {
      s.put(x, 0, text, fg, '01', true);
      if (text === `  ${this.weather}`) s.ctx?.icons.push({ x: x + 1, y: 0, icon: 'weather' });
      x += text.length;
    }
    let loc = this.map.title + (this.map.indoor && !compact ? ' (indoors)' : '');
    // Narrow screens: shorten the place name rather than let it run off the edge.
    if (compact && x + 1 + loc.length > W - 1) loc = loc.slice(0, Math.max(0, W - x - 3)) + '…';
    s.put(Math.max(x + 1, W - loc.length - 2), 0, loc, '0C', '01');
  }

  draw_map(ox: number, oy: number, vw: number, vh: number): void {
    const s = this.scr;
    const m = this.map;
    const cellW = vw;
    let targetX = 0;
    let targetY = 0;
    if (m.w <= vw) {
      ox += Math.floor((cellW - m.w) / 2);
    } else {
      targetX = clamp(this.px - Math.floor(vw / 2), 0, m.w - vw);
    }
    if (m.h <= vh) {
      oy += Math.floor((vh - m.h) / 2);
    } else {
      targetY = clamp(this.py - Math.floor(vh / 2), 0, m.h - vh);
    }
    if (
      s.reducedMotion ||
      this.cam_x === null ||
      this.cam_y === null ||
      Math.abs(targetX - this.cam_x) > 6 ||
      Math.abs(targetY - this.cam_y) > 6
    ) {
      this.cam_x = targetX;
      this.cam_y = targetY;
    } else {
      this.cam_x += (targetX - this.cam_x) * 0.28;
      this.cam_y += (targetY - this.cam_y) * 0.28;
    }
    const cx = Math.round(this.cam_x);
    const cy = Math.round(this.cam_y);
    if (s.ctx) {
      const now = Date.now() / 1000;
      s.ctx.fx = this.fx
        .filter((f) => f.map === this.mapname)
        .map((f) => ({ ...f, x: ox + f.x - cx, y: oy + f.y - cy, age: now - f.born, life: f.life }));
      s.ctx.shake = this.shake_fx && now - this.shake_fx.born < 0.3 ? { age: now - this.shake_fx.born, strength: this.shake_fx.strength } : undefined;
      s.ctx.wipe =
        this.warp_fx && now - this.warp_fx.born < this.warp_fx.duration
          ? { age: now - this.warp_fx.born, duration: this.warp_fx.duration, focus: [ox + this.px - cx, oy + this.py - cy] }
          : undefined;
    }
    const hour = this.minutes / 60;
    const classic = s.style === 'classic';
    const night = classic && !m.indoor && m.name !== 'mine' && (hour >= 19 || hour < 5);
    const dusk = classic && !m.indoor && m.name !== 'mine' && 17.5 <= hour && hour < 19;
    if (s.ctx) s.ctx.view = { x: ox, y: oy, w: Math.min(vw, m.w), h: Math.min(vh, m.h) };
    const [tx, ty] = this.target();
    const aoeSet = new Set<string>();
    aoeSet.add(pkey(tx, ty));
    if (this.mapname === 'farm') {
      if (['Hoe', 'Watering Can', 'Sickle'].includes(this.tool)) {
        for (const [qx, qy] of this.area()) {
          aoeSet.add(pkey(qx, qy));
        }
      } else if (this.tool.endsWith(' Seeds')) {
        for (const dx of [-1, 0, 1]) {
          for (const dy of [-1, 0, 1]) {
            aoeSet.add(pkey(tx + dx, ty + dy));
          }
        }
      }
    }

    for (let sy = 0; sy < Math.min(vh, m.h); sy++) {
      const y = cy + sy;
      const row = m.t[y];
      for (let sx = 0; sx < Math.min(vw, m.w); sx++) {
        const x = cx + sx;
        let [ch, fg, bg, bold] = this.glyph(m, x, y, row[x]);
        if (night && fg !== '00' && fg !== '01') {
          fg = fg === '0D' || fg === '0C' ? '0F' : fg === '02' || fg === '03' ? '02' : '03';
        } else if (dusk && fg === '0B') {
          fg = '09';
        }
        const hl = aoeSet.has(pkey(x, y));
        if (hl) {
          bg = bg === '01' ? '02' : '01';
        }
        const tag = this.cell_tag(m, x, y, row[x], hl, hl && !(x === tx && y === ty));
        const px = ox + sx;
        s.put(px, oy + sy, ch, fg, bg, bold);
        s.tag(px, oy + sy, tag);
      }
    }
    const at = (x: number, y: number, ch: string, fg: string, bold = true, ent = 'npc', extra?: Partial<CellTag>) => {
      const [sx, sy] = [x - cx, y - cy];
      if (0 <= sx && sx < Math.min(vw, m.w) && 0 <= sy && sy < Math.min(vh, m.h)) {
        const px = ox + sx;
        const bg = s.buf[oy + sy][px][2];
        const under = s.tags[oy + sy][px];
        s.put(px, oy + sy, ch, fg, bg, bold);
        if (under) s.tag(px, oy + sy, { ...under, ent, ...extra });
      }
    };
    // Draw outdoor Dog, Horse, and grazing Chickens/Cows/Sheep on the Farm
    if (this.mapname === 'farm') {
      at(21, 6, 'd', '09', true, 'pet'); // Faithful Dog by Doghouse
      if (!this.riding_horse) {
        at(25, 6, 'H', '04', true, 'pet'); // Horse by Stable
      }
      if (this.animals_grazing && this.weather === 'Sunny') {
        const tick = Math.floor(Date.now() / 1500);
        for (let i = 0; i < Math.min(6, this.chickens); i++) {
          const gx = 18 + ((i * 3 + tick) % 7);
          const gy = 8 + (i % 2);
          if (!(gx === this.px && gy === this.py)) at(gx, gy, 'c', '07', true, 'animal');
        }
        for (let i = 0; i < Math.min(8, this.animals.length); i++) {
          const a = this.animals[i];
          const gx = 28 + ((i * 4 + tick) % 10);
          const gy = 8 + (i % 2);
          if (!(gx === this.px && gy === this.py)) {
            const sheepCh = (a.wool ?? WOOL_DAYS) >= WOOL_DAYS ? 'S' : 's';
            at(gx, gy, a.kind === 'cow' ? 'C' : sheepCh, a.kind === 'cow' ? '07' : '05', true, 'animal');
          }
        }
      }
    }
    for (const [n, [x, y]] of Object.entries(this.npc_pos)) {
      if (NPCS[n]?.where?.[0] === this.mapname) {
        at(x, y, NPCS[n].g, NPCS[n].col);
      }
    }
    for (const [n, d] of Object.entries(this.indoor_npcs)) {
      if (d.map === this.mapname && n !== this.married) {
        at(d.pos[0], d.pos[1], NPCS[n].g, NPCS[n].col);
      }
    }
    if (this.mapname === 'house' && this.married) {
      at(SPOUSE_POS[0], SPOUSE_POS[1], NPCS[this.married].g, NPCS[this.married].col);
      if (this.child_name) {
        at(SPOUSE_POS[0] + 1, SPOUSE_POS[1], 'c', '0A', true, 'npc');
      }
    }
    // Player glyph color reflects Stamina & Fatigue state (White -> Orange -> Red -> Blue when exhausted!)
    const playerCol =
      this.fatigue >= 80 || this.stamina === 0
        ? '0D'
        : this.stamina <= this.max_stamina * 0.2
          ? '08'
          : this.stamina <= this.max_stamina * 0.5 || this.fatigue >= 50
            ? '09'
            : this.riding_horse
              ? '0A'
              : '07';
    at(this.px, this.py, '@', playerCol, true, 'player', {
      face: [this.face[0], this.face[1]],
      riding: this.riding_horse,
    });

    if (classic && !m.indoor && m.name !== 'mine' && this.weather !== 'Sunny' && !s.reducedMotion) {
      const rng = py_rng(Math.floor((Date.now() / 1000) * 8));
      const isRain = this.weather === 'Rain' || this.weather === 'Typhoon';
      const drops = Math.floor((vw * vh) / (isRain ? 22 : 40));
      for (let i = 0; i < drops; i++) {
        const [sx, sy] = [rng.randrange(Math.min(vw, m.w)), rng.randrange(Math.min(vh, m.h))];
        if (sx + cx === this.px && sy + cy === this.py) continue;
        const cell = s.buf[oy + sy][ox + sx];
        if (isRain) {
          s.put(ox + sx, oy + sy, '/', '0D', cell[2]);
        } else {
          s.put(ox + sx, oy + sy, rng.choice('*.'), '07', cell[2]);
        }
      }
    }
  }

  draw_minimap(vw: number, vh: number): void {
    if (vw < 30 || vh < 12) return;
    const s = this.scr;
    const m = this.map;
    const gw = Math.min(19, vw - 4);
    const gh = Math.min(7, vh - 6);
    const bx = vw - gw - 3;
    const by = 2;
    if (bx < 0 || by + gh + 2 > s.h) return;
    s.box(bx, by, gw + 2, gh + 2, '0C', '00', 'Map', '07', { accent: '0C' });
    // Keep the map's aspect ratio and include its outer edges. Small interiors stay
    // 1:1; large outdoor maps sample the full extent without dropping the last row/column.
    const drawW = Math.min(gw, m.w);
    const drawH = Math.min(gh, m.h);
    const offX = Math.floor((gw - drawW) / 2);
    const offY = Math.floor((gh - drawH) / 2);
    const atX = (gx: number) => (m.w <= 1 ? 0 : Math.round((gx * (m.w - 1)) / Math.max(1, drawW - 1)));
    const atY = (gy: number) => (m.h <= 1 ? 0 : Math.round((gy * (m.h - 1)) / Math.max(1, drawH - 1)));
    const glyph = (tx: number, ty: number, t: string | undefined): [string, string, string | null] => {
      if (!t || t === 'void') return [' ', '00', null];
      if (this.mapname === 'farm') {
        const pk = pkey(tx, ty);
        if (this.tilled.has(pk)) {
          const c = this.crops[pk];
          if (c) {
            const d = CROPS[c[0]];
            if (d && c[1] >= d[2]) return ['*', '0A', 'minimap:crop_ripe'];
            return ['•', '0B', 'minimap:crop'];
          }
          return ['=', '09', 'minimap:soil'];
        }
      }
      if (t === 'water' || t === 'fountain' || t === 'spring' || t === 'pond') return ['≈', '0A', 'minimap:water'];
      if (t === 'path' || t === 'bridge') return ['·', '03', 'minimap:path'];
      if (t === 'tree') return ['♣', '0B', 'minimap:tree'];
      if (t === 'field') return ['▒', '04', 'minimap:field'];
      if (t === 'cliff') return ['▲', '08', 'minimap:cliff'];
      if (t === 'door' || t === 'exit') return ['+', '09', 'minimap:door'];
      if (t === 'roof' || t === 'wall' || t === 'iwall' || t === 'mwall') return ['▮', '09', 'minimap:roof'];
      if (t === 'flower') return ['*', '0A', 'minimap:ground'];
      return ['·', '02', 'minimap:ground'];
    };
    for (let gy = 0; gy < drawH; gy++) {
      for (let gx = 0; gx < drawW; gx++) {
        const tx = atX(gx);
        const ty = atY(gy);
        const [ch, col, mk] = glyph(tx, ty, m.t[ty]?.[tx]);
        const sx = bx + 1 + offX + gx;
        const sy = by + 1 + offY + gy;
        s.put(sx, sy, ch, col, '00');
        if (mk) s.tag(sx, sy, { t: 'ui', k: mk });
      }
    }
    const mark = (wx: number, wy: number, ch: string, col: string, mk: string) => {
      const gx = offX + Math.round((wx * (drawW - 1)) / Math.max(1, m.w - 1));
      const gy = offY + Math.round((wy * (drawH - 1)) / Math.max(1, m.h - 1));
      if (gx < 0 || gx >= gw || gy < 0 || gy >= gh) return;
      const sx = bx + 1 + gx;
      const sy = by + 1 + gy;
      s.put(sx, sy, ch, col, '00', true);
      s.tag(sx, sy, { t: 'ui', k: mk });
    };
    for (const [n, [x, y]] of Object.entries(this.npc_pos)) {
      if (NPCS[n]?.where?.[0] === this.mapname) mark(x, y, 'o', '0C', 'minimap:npc');
    }
    mark(this.px, this.py, '@', '0D', 'minimap:player');
  }

  /**
   * Compact layout status line, drawn into the divider row: tool (+cost, can level or seed
   * bags), stamina bar, and fatigue/held item when there is room.
   */
  draw_status(y: number, W: number): void {
    const s = this.scr;
    const t = this.tool;
    const preview = this.action_preview();
    let x = 1;
    const seg = (text: string, fg: string, bold = false): boolean => {
      if (x + text.length > W - 1) return false;
      s.put(x, y, text, fg, '00', bold);
      // tag as UI so the divider pass doesn't turn hyphens ("-2st") into rule lines
      for (let i = 0; i < text.length; i++) if (text[i] !== ' ') s.tag(x + i, y, { t: 'ui' });
      x += text.length;
      return true;
    };
    const idx = TOOLS.includes(t) ? `[${TOOLS.indexOf(t) + 1}] ` : '';
    s.ctx?.icons.push({ x, y, icon: 'tool' });
    seg(' ', '02');
    const signX = x;
    if (seg(`${idx}${t} `, '07', true)) {
      for (let i = signX; i < x; i++) s.tag(i, y, { t: 'ui', k: 'hud:sign' });
    }
    if (t === 'Watering Can') seg(`${this.water}/${CAN_CAP[this.levels[t] || 0]} `, '0D');
    else if (t.endsWith(' Seeds')) {
      const crop = t.slice(0, -6);
      const ok = crop === 'Grass' || CROPS[crop]?.[0] === this.season_name;
      seg(`x${this.inv[t] || 0}${ok ? '' : ' off-season'} `, ok ? '0B' : '08');
    }
    if (preview.cost > 0) seg(`-${preview.cost}st${preview.faint ? '!' : ''} `, preview.faint ? '08' : '03');
    x += 1;
    const frac = this.stamina / this.max_stamina;
    const col = frac > 0.5 ? '0B' : frac > 0.2 ? '09' : '08';
    const num = ` ${this.stamina}`;
    const bw = Math.max(4, Math.min(10, W - x - num.length - 4));
    const filled = Math.round(frac * bw);
    s.ctx?.icons.push({ x, y, icon: 'stamina' });
    seg(' ', '02');
    s.put(x, y, '#'.repeat(filled), col, '00', true);
    s.put(x + filled, y, '.'.repeat(bw - filled), '01');
    for (let i = 0; i < bw; i++) s.tag(x + i, y, { t: 'ui', k: i < filled ? 'bar' : 'bar:empty' });
    x += bw;
    seg(`${num} `, col);
    if (this.fatigue >= 50) {
      x += 1;
      seg(` Fatg ${this.fatigue} `, this.fatigue < 80 ? '09' : '08');
    }
    const bCount = getBasketTotal(this.basket);
    const held = this.held === 'Basket' ? `Basket ${bCount}/${BASKET_CAPACITY}` : this.held ? `${this.held} x${this.inv[this.held] || 0}` : '';
    if (held) {
      x += 1;
      if (!seg(` ${held} `, '0A')) seg(` ${held.slice(0, Math.max(0, W - x - 3))} `, '0A');
    }
  }

  draw_side(x: number, y: number, w: number, hints = true): void {
    const s = this.scr;
    const sn = this.season_name;
    s.put(x, y, 'H R V S T M N', SEASON_COL[sn], '00', true);
    s.put(x, y + 1, `${this.name} of ${this.farm} Farm`.slice(0, w), '04');
    y += 3;

    const t = this.tool;
    const preview = this.action_preview();
    const costTxt = preview.cost > 0 ? `-${preview.cost}st` : '';
    const icon = (iy: number, kind: 'stamina' | 'fatigue' | 'gold' | 'bin' | 'tool') => s.ctx?.icons.push({ x: x - 1, y: iy, icon: kind });
    icon(y, 'tool');
    s.put(x, y, 'Tool', '02');
    const idx = TOOLS.includes(t) ? `[${TOOLS.indexOf(t) + 1}] ` : '    ';
    s.put(x + 6, y, (idx + t).slice(0, Math.max(4, w - 6 - costTxt.length - 1)), '07', '00', true);
    if (costTxt) s.put(x + w - costTxt.length, y, costTxt, preview.faint ? '08' : '03');
    y += 1;
    if (UPGRADABLE.includes(t)) {
      const lvl = this.levels[t] || 0;
      const exp = this.tool_exp[t] || 0;
      s.put(x + 6, y, `${LEVELS[lvl]} (${exp}%)`, LEVEL_COL[lvl]);
      if (t === 'Watering Can') {
        s.put(x + 19, y, `${this.water}/${CAN_CAP[lvl]}`, '0D');
      }
      if (preview.faint) s.put(x + w - 1, y, '!', '08', '00', true);
    } else if (t.endsWith(' Seeds')) {
      const crop = t.slice(0, -6);
      const ok = crop === 'Grass' || CROPS[crop]?.[0] === sn;
      s.put(x + 6, y, `x${this.inv[t] || 0} bags`, ok ? '0B' : '08');
      if (!ok) {
        s.put(x + 15, y, '(off-season)', '08');
      }
    }
    y += 1;
    if (this.upgrading) {
      s.put(x, y, `Forge: ${this.upgrading[0]}`.slice(0, w), '02');
    } else if (this.riding_horse) {
      s.put(x, y, 'Riding Horse (2x speed)', '09');
    }
    y += 1;

    s.put(x, y, 'Held', '02');
    const bCount = getBasketTotal(this.basket);
    const held =
      this.held === 'Basket'
        ? `Basket (${bCount}/${BASKET_CAPACITY})`
        : this.held
          ? `${this.held} x${this.inv[this.held] || 0}`
          : bCount > 0
            ? `Basket: ${bCount}/${BASKET_CAPACITY}`
            : '-';
    s.put(x + 6, y, held.slice(0, w - 6), this.held ? '0A' : bCount > 0 ? '09' : '02');
    y += 2;

    // Stamina Bar + Numerical readout
    const frac = this.stamina / this.max_stamina;
    const col = frac > 0.5 ? '0B' : frac > 0.2 ? '09' : '08';
    const bw = Math.max(6, w - 14);
    const filled = Math.round(frac * bw);
    icon(y, 'stamina');
    s.put(x, y, 'Stam', '02');
    s.put(x + 5, y, '#'.repeat(filled), col, '00', true);
    s.put(x + 5 + filled, y, '.'.repeat(bw - filled), '01');
    for (let i = 0; i < bw; i++) s.tag(x + 5 + i, y, { t: 'ui', k: i < filled ? 'bar' : 'bar:empty' });
    s.put(x + 6 + bw, y, `${this.stamina}/${this.max_stamina}`, col);
    y += 1;

    // Fatigue Bar + Berries
    const fatCol = this.fatigue < 50 ? '0C' : this.fatigue < 80 ? '09' : '08';
    icon(y, 'fatigue');
    s.put(x, y, 'Fatg', '02');
    s.put(
      x + 5,
      y,
      `${this.fatigue}/100  Berries:${this.power_berries}${this.has_mystic_berry ? '+B' : ''}`.slice(0, w - 5),
      fatCol
    );
    y += 2;

    icon(y, 'gold');
    s.put(x, y, 'Gold', '02');
    s.put(x + 6, y, `${this.gold}G`, '09', '00', true);
    y += 1;
    const binv = py_sum(
      Object.entries(this.bin).map(([i, q]) => (ITEMS[i] ? ITEMS[i][0] : 0) * q)
    );
    icon(y, 'bin');
    s.put(x, y, 'Bin', '02');
    s.put(x + 6, y, `${binv}G (5PM pickup)`, binv ? '09' : '02');
    y += 1;

    if (this.chickens) {
      s.put(x, y, 'Coop', '02');
      s.put(x + 6, y, `${this.chickens} hens, ${this.eggs} eggs`, '07');
      y += 1;
    }
    if (this.animals.length) {
      const hungry = this.animals.filter((a) => !a.fed).length;
      s.put(x, y, 'Barn', '02');
      s.put(
        x + 6,
        y,
        `${this.animals.length} head${hungry ? `, ${hungry} hungry` : ', all fed'}`.slice(0, w - 6),
        hungry ? '08' : '07'
      );
      y += 1;
    }

    y += 1;
    const help_lines = [
      ['SPC', 'use tool'],
      ['X', 'act / talk'],
      ['TAB', 'next tool'],
      ['I/M', 'bag / memo'],
      ['Y/R', 'today / notes'],
      ['⇧H', 'horse  B bell'],
      ['ESC', 'diary/save'],
      ['?', 'help'],
    ];
    for (const [k, d] of help_lines) {
      if (!hints || y >= s.h - 4) break;
      s.put(x, y, k, '0D', '00', true);
      s.put(x + 4, y, d, '02');
      y += 1;
    }
  }

  draw_msgs(y0: number): void {
    const cols = ['02', '03', null];
    const count = Math.min(3, this.scr.h - y0);
    if (count <= 0) return;
    const recent = this.msgs.slice(-count);
    const enhanced = this.scr.style === 'enhanced';
    if (isCompact(this.scr.w)) {
      // Narrow screens wrap messages instead of cutting them off; the newest always shows.
      const lines = fitMessages(recent.map(([text]) => text), this.scr.w - 2, count);
      const newest = lines.findIndex(({ age }) => age === 0);
      lines.forEach(({ text, age }, i) => {
        const fg = age === 0 ? recent[recent.length - 1][1] : age === 1 ? cols[1]! : cols[0]!;
        this.scr.put(1, y0 + i, text, fg);
      });
      // no column to spare on a phone: the bullet takes the blank left margin
      if (enhanced && newest >= 0) this.scr.ctx?.icons.push({ x: 0, y: y0 + newest, icon: 'note' });
      return;
    }
    const x0 = enhanced ? 3 : 1;
    for (let i = 0; i < recent.length; i++) {
      const [text, col] = recent[i];
      const age = recent.length - 1 - i;
      const fg = age === 0 ? col : age === 1 ? cols[1]! : cols[0]!;
      this.scr.put(x0, y0 + i, text.slice(0, this.scr.w - x0 - 1), fg);
      if (enhanced && age === 0) this.scr.ctx?.icons.push({ x: 1, y: y0 + i, icon: 'note' });
    }
  }

  draw_title(): void {
    const s = this.scr;
    const [W, H] = [s.w, s.h];
    const lw = LOGO[0].length;
    const x0 = Math.max(0, Math.floor((W - lw) / 2));
    const cols = ['0A', '0E', '0D', '0C', '0B'];
    s.scene = 'title';
    for (let i = 0; i < LOGO.length; i++) {
      s.put(x0, 2 + i, LOGO[i], cols[i], '00', true);
      for (let j = 0; j < LOGO[i].length; j++) if (LOGO[i][j] !== ' ') s.tag(x0 + j, 2 + i, { t: 'ui', k: 'logo' });
    }
    const sub = fitText(W, '~ Harvest Moon: Friends of Mineral Town (Complete ASCII Edition) ~', '~ Harvest Moon: Friends of Mineral Town ~');
    s.put(Math.max(0, Math.floor((W - sub.length) / 2)), 8, sub, '04');
    const scene_y = 10;
    const hillsFull = '   T   T  .-^-.   T   [Hot Spring]   T   .-^-.   T   ';
    const hills = fitText(W, hillsFull, hillsFull.trim());
    s.put(Math.max(0, Math.floor((W - hills.length) / 2)), scene_y, hills, '0B');
    const field = ' o * j o Y * o v d o * j O o * A o v * o j ';
    const fx = Math.max(0, Math.floor((W - field.length) / 2));
    const palette = ['07', '08', '0B', '09', '0E', '0A'];
    for (let i = 0; i < field.length; i++) {
      const ch = field[i];
      s.put(fx + i, scene_y + 1, ch, ch !== ' ' ? palette[i % palette.length] : '00', '00', true);
    }
    s.put(fx, scene_y + 2, '='.repeat(field.length), '09');
    const tag = fitText(
      W,
      'base16 isotope dark · 255-floor mines · 7 sprites · 20+ festivals · 108 recipes',
      '255-floor mines · 7 sprites · 20+ festivals',
    );
    s.put(Math.max(0, Math.floor((W - tag.length) / 2)), H - 2, tag, '02');
  }

  async modal(draw: () => void): Promise<string> {
    this.modal_depth += 1;
    try {
      while (true) {
        this.render();
        draw();
        this.scr.flush();
        const k = await this.scr.getKey(0.25);
        if (k) {
          this.last = Date.now() / 1000;
          return k;
        }
      }
    } finally {
      this.modal_depth = Math.max(0, this.modal_depth - 1);
    }
  }

  async say(text: string, who: string | null = null): Promise<void> {
    const [W, H] = [this.scr.w, this.scr.h];
    const bw = Math.min(W - 4, 74);
    const lines: string[] = [];
    for (const para of String(text).split('\n')) {
      lines.push(...(py_wrap(para, bw - 4) || ['']));
    }
    const pages: string[][] = [];
    for (let i = 0; i < lines.length; i += 3) {
      pages.push(lines.slice(i, i + 3));
    }
    let title: string | null = null;
    let tcol = '07';
    let hearts: [string, string] | null = null;
    let boxStyle: BoxStyle | undefined;
    if (who && who in NPCS) {
      title = `● ${who}`;
      tcol = NPCS[who].col;
      hearts = this.hearts(who);
      boxStyle = { kind: 'npc', accent: NPCS[who].col };
    } else if (who && /(TV|Channel|Cooking Show|Variety|Life on the Farm)/i.test(who)) {
      title = `▣ ${who}`;
      tcol = '0C';
      boxStyle = { kind: 'tv', accent: '0C' };
    } else if (who && /(Goddess|Festival|Heart Event|Rival Event)/i.test(who)) {
      title = `✦ ${who}`;
      tcol = '0B';
      boxStyle = { kind: 'fest', accent: '0B' };
    } else if (who === 'Shipping Bin') {
      title = `▣ ${who}`;
      tcol = '09';
      boxStyle = { kind: 'system', accent: '09' };
    } else if (who) {
      title = who;
      boxStyle = { kind: 'system', accent: '0D' };
    }
    for (const page of pages) {
      const draw = () => {
        const [bx, by] = [Math.floor((W - bw) / 2), H - 8];
        this.scr.box(bx, by, bw, 6, '0D', '00', title || undefined, tcol, boxStyle);
        if (hearts && title) {
          const hx = bx + title.length + 5;
          const room = bx + bw - 2 - hx;
          if (room >= 4) {
            this.scr.put(hx, by, hearts[0].slice(0, room), hearts[1]);
          }
        }
        for (let i = 0; i < page.length; i++) {
          this.scr.put(bx + 2, by + 1 + i, page[i], '06');
        }
        if (Math.floor((Date.now() / 1000) * 2) % 2) {
          this.scr.put(bx + bw - 3, by + 4, 'v', '0A', '00', true);
        }
      };
      await this.modal(draw);
    }
  }

  async show_lines(title: string, lines: string[]): Promise<void> {
    const pageSize = Math.max(4, this.scr.h - 5);
    const pages: string[][] = [];
    for (let i = 0; i < lines.length; i += pageSize) {
      pages.push(lines.slice(i, i + pageSize));
    }
    if (!pages.length) pages.push([]);
    await this.show_pages(title, pages);
  }

  async show_pages(title: string, pages: string[][]): Promise<void> {
    const [W, H] = [this.scr.w, this.scr.h];
    if (!pages.length) pages.push([]);
    if (isCompact(W)) pages = reflowPages(pages, W - 6, Math.max(4, H - 5));
    const maxLn = Math.max(
      title.length + 6,
      ...pages.flat().map((ln) => ln.length + 4),
    );
    const bw = Math.min(W - 2, maxLn);
    for (let p = 0; p < pages.length; p++) {
      const page = pages[p];
      const bh = Math.min(H - 2, page.length + 3);
      const pageTitle = pages.length > 1 ? `${title} (${p + 1}/${pages.length})` : title;
      const draw = () => {
        const [bx, by] = [Math.floor((W - bw) / 2), Math.floor((H - bh) / 2)];
        this.scr.box(bx, by, bw, bh, '0D', '00', pageTitle.slice(0, bw - 4));
        for (let i = 0; i < page.length; i++) {
          this.scr.put(bx + 2, by + 1 + i, page[i].slice(0, bw - 4), '05');
        }
        this.scr.put(bx + 2, by + bh - 2, p < pages.length - 1 ? 'press any key — next page' : 'press any key — close', '02');
      };
      await this.modal(draw);
    }
  }

  async menu(
    title: string,
    opts: string[],
    sel: number = 0,
    info: ((s: number) => string[]) | string[] | null = null,
    y: number | null = null
  ): Promise<number | null> {
    const n = opts.length;
    if (n === 0) return null;
    while (true) {
      const [W, H] = [this.scr.w, this.scr.h];
      const info_raw = typeof info === 'function' ? info(sel) : info || [];
      const info_lines = isCompact(W) ? wrapLines(info_raw, W - 6) : info_raw;
      const maxvis = Math.max(3, H - 8 - info_lines.length);
      const vis = Math.min(n, maxvis);
      const top = clamp(sel - Math.floor(vis / 2), 0, Math.max(0, n - vis));
      const w = Math.min(
        W - 2,
        Math.max(
          title.length + 8,
          ...opts.map((o) => o.length + 7),
          ...info_lines.map((ln) => ln.length + 4)
        )
      );
      const bh = vis + 2 + (info_lines.length ? info_lines.length + 1 : 0);
      const draw = () => {
        const bx = Math.floor((W - w) / 2);
        const by = y !== null ? y : Math.max(1, Math.floor((H - bh) / 2));
        this.scr.box(bx, by, w, bh, '0D', '00', title);
        for (let i = 0; i < vis; i++) {
          const j = top + i;
          if (j === sel) {
            this.scr.put(bx + 1, by + 1 + i, (' > ' + opts[j]).slice(0, w - 2).padEnd(w - 2), '00', '0D', true);
          } else {
            this.scr.put(bx + 1, by + 1 + i, ('   ' + opts[j]).slice(0, w - 2), '05');
          }
        }
        if (top > 0) {
          this.scr.put(bx + w - 3, by + 1, '^', '03');
        }
        if (top + vis < n) {
          this.scr.put(bx + w - 3, by + vis, 'v', '03');
        }
        if (info_lines.length) {
          this.scr.put(bx + 1, by + vis + 1, '-'.repeat(w - 2), '01');
          for (let i = 0; i < info_lines.length; i++) {
            this.scr.put(bx + 1, by + vis + 2 + i, info_lines[i].slice(0, w - 2), '04');
          }
        }
      };
      const k = await this.modal(draw);
      if (['up', 'w', 'k'].includes(k)) {
        sel = ((sel - 1) % n + n) % n;
      } else if (['down', 's', 'j', 'tab'].includes(k)) {
        sel = (sel + 1) % n;
      } else if (OK_KEYS.has(k)) {
        return sel;
      } else if (CANCEL_KEYS.has(k)) {
        return null;
      } else if (k.length === 1 && /^\d$/.test(k) && 1 <= Number(k) && Number(k) <= Math.min(n, 9)) {
        return Number(k) - 1;
      }
    }
  }

  async confirm(question: string): Promise<boolean> {
    return (await this.menu(question, ['Yes', 'No'])) === 0;
  }

  async ask_qty(prompt: string, maxq: number, price: number | null = null, label: string = 'Total'): Promise<number> {
    if (maxq <= 0) return 0;
    let q = 1;
    while (true) {
      const [W, H] = [this.scr.w, this.scr.h];
      const bw = Math.max(prompt.length + 8, 46);
      const draw = () => {
        const [bx, by] = [Math.floor((W - bw) / 2), Math.floor(H / 2) - 3];
        this.scr.box(bx, by, bw, 6, '0D', '00', prompt);
        this.scr.put(bx + 3, by + 2, `<  ${q}  >`, '07', '00', true);
        this.scr.put(bx + 16, by + 2, `of ${maxq}`, '03');
        if (price) {
          this.scr.put(bx + 26, by + 2, `${label}: ${q * price}G`, '09');
        }
        this.scr.put(bx + 3, by + 4, 'left/right +-1  up/down +-10  enter', '02');
      };
      const k = await this.modal(draw);
      if (['left', 'a', 'h'].includes(k)) {
        q = q > 1 ? q - 1 : maxq;
      } else if (['right', 'd', 'l'].includes(k)) {
        q = q < maxq ? q + 1 : 1;
      } else if (['up', 'w', 'k'].includes(k)) {
        q = Math.min(maxq, q + 10);
      } else if (['down', 's', 'j'].includes(k)) {
        q = Math.max(1, q - 10);
      } else if (OK_KEYS.has(k)) {
        return q;
      } else if (CANCEL_KEYS.has(k)) {
        return 0;
      }
    }
  }

  async text_input(prompt: string, py_default: string = ''): Promise<string> {
    this.typing = true;
    this.onTyping?.();
    try {
      return await this.read_text(prompt, py_default);
    } finally {
      this.typing = false;
    }
  }

  async read_text(prompt: string, py_default: string = ''): Promise<string> {
    let text = '';
    while (true) {
      const [W] = [this.scr.w, this.scr.h];
      const draw = () => {
        const bw = 44;
        const [bx, by] = [Math.floor((W - bw) / 2), 15];
        this.scr.box(bx, by, bw, 5, '0D', '00', prompt);
        this.scr.put(
          bx + 3,
          by + 2,
          text + (Math.floor((Date.now() / 1000) * 2) % 2 ? '_' : ' '),
          '07',
          '00',
          true
        );
        if (!text) {
          this.scr.put(bx + 4, by + 2, py_default, '02');
        }
        this.scr.put(bx + 3, by + 3, `type, then enter (blank = ${py_default})`, '02');
      };
      const k = await this.modal(draw);
      if (k === 'enter') {
        return text.trim() || py_default;
      }
      if (k === 'backspace') {
        text = text.slice(0, -1);
      } else if (k === 'space' && text.length < 12) {
        text += ' ';
      } else if (k === 'esc' || k === 'ctrl-c') {
        return py_default;
      } else if (k.length === 1 && /^[\x20-\x7E]$/.test(k) && text.length < 12) {
        text += k;
      }
    }
  }

  async title(): Promise<void> {
    while (true) {
      const has_save1 = Boolean(typeof localStorage !== 'undefined' && localStorage.getItem(SAVE_KEY));
      const has_save2 = Boolean(typeof localStorage !== 'undefined' && localStorage.getItem(`${SAVE_KEY}-2`));
      const opts: string[] = [];
      if (has_save1) opts.push('Continue (Diary Slot 1)');
      if (has_save2) opts.push('Continue (Diary Slot 2)');
      opts.push('New Game', 'Quit');
      const sel = await this.menu('Menu', opts, 0, null, 15);
      const choice = sel !== null ? opts[sel] : 'Quit';
      if (choice === 'Quit') {
        this.running = false;
        return;
      }
      if (choice.startsWith('Continue')) {
        const slot = choice.includes('Slot 2') ? 2 : 1;
        try {
          this.load(slot);
        } catch (e: any) {
          await this.say(`Couldn't load the save file: ${e}`, null);
          this.started = false;
          continue;
        }
        this.update_npcs();
        await this.say(`Welcome back! ${this.date_str()}.  Weather: ${this.weather}.`, null);
        return;
      }
      if (has_save1 && !(await this.confirm('Start a New Game?'))) {
        continue;
      }
      const name = await this.text_input("What's your name?", 'Pete');
      const farm = await this.text_input('Name your farm:', 'Moon');
      this.new_game(name, farm);
      await this.intro();
      return;
    }
  }

  async intro(): Promise<void> {
    const t = 'Thomas';
    await this.say(`Ho ho! You must be ${this.name}! Welcome to Mineral Town! I'm Mayor Thomas.`, t);
    await this.say(
      `Your grandfather left you this farm. Clear the field, till soil with your Hoe, sow seeds, and water them daily. Zack picks up your shipping bin ($) at 5:00 PM sharp!`,
      t
    );
    await this.say(
      `Visit the 7 Harvest Sprites at Willow Bend, soak in the Hot Spring on Mother's Hill, explore the 255-floor Spring & Lake Mines, and press M anytime for your Ranch Summary!`,
      t
    );
  }

  init_carpentry(): void {
    this.house_flags = [];
    this.project = null;
    this.bathed = false;
    this.rebuild_house();
  }

  rebuild_house(): void {
    this.maps['house'] = build_house_upgraded(this.house_flags);
  }

  coop_cap(): number {
    return this.house_flags.includes('Coop Expansion') ? 16 : 8;
  }

  carpentry_day(): string[] {
    this.bathed = false;
    if (!this.project || this.absday() < this.project[1]) {
      return [];
    }
    const name = this.project[0];
    this.project = null;
    if (!this.house_flags.includes(name)) {
      this.house_flags.push(name);
    }
    if (name === 'Big Bed') {
      this.max_stamina += 20;
    }
    this.rebuild_house();
    return [`Gotz finished building your ${name}! ${EXPANSIONS[name]?.[3] || ''}`];
  }

  async order_expansion(): Promise<void> {
    if (this.project) {
      const left = Math.max(1, this.project[1] - this.absday());
      await this.say(`I'm still building your ${this.project[0]}. ${left} more day${left > 1 ? 's' : ''}.`, 'Gotz');
      return;
    }
    const names = Object.keys(EXPANSIONS);
    const opts = names.map((n) => {
      const [gold, lumber] = EXPANSIONS[n];
      return this.house_flags.includes(n) ? `${n} (built)` : `${n} (${gold}G + ${lumber} Lumber)`;
    });
    const info = (s: number) => {
      const [gold, lumber, req, desc] = EXPANSIONS[names[s]];
      const lines = [`  ${desc}`];
      if (req && !this.house_flags.includes(req)) {
        lines.push(`  Requires: ${req}`);
      }
      lines.push(`  You have ${this.gold}G and ${this.inv['Lumber'] || 0} Lumber`);
      return lines;
    };
    const sel = await this.menu('Gotz Carpentry — Expansions', opts, 0, info);
    if (sel === null) return;
    const n = names[sel];
    const [gold, lumber, req] = EXPANSIONS[n];
    if (this.house_flags.includes(n)) {
      await this.say('Already built that one. Solid work, if I say so myself.', 'Gotz');
    } else if (req && !this.house_flags.includes(req)) {
      await this.say(`I need to build the ${req} first.`, 'Gotz');
    } else if (this.gold < gold || (this.inv['Lumber'] || 0) < lumber) {
      await this.say(`That'll be ${gold}G and ${lumber} Lumber. Come back when you have it.`, 'Gotz');
    } else if (await this.confirm(`Build the ${n} for ${gold}G + ${lumber} Lumber?`)) {
      this.gold -= gold;
      this.take('Lumber', lumber);
      this.project = [n, this.absday() + BUILD_DAYS];
      await this.say(`Right. I'll have your ${n} done in ${BUILD_DAYS} days.`, 'Gotz');
    }
  }

  async buy_kitchen_goods(): Promise<void> {
    const goods = [...Object.keys(UTENSILS), 'Rice'];
    const prices: Record<string, number> = { ...UTENSILS, Rice: 100 };
    const opts = goods.map(
      (g) => `${g} ${prices[g]}G${g in UTENSILS && g in this.inv ? '  (owned)' : ''}`
    );
    const sel = await this.menu(`Kitchen Utensils & Goods   ${this.gold}G`, opts);
    if (sel === null) return;
    const g = goods[sel];
    if (g in UTENSILS && g in this.inv) {
      await this.say(`You already have a ${g}.`, null);
    } else {
      await this.buy(g, prices[g], g in UTENSILS ? 1 : 99);
    }
  }

  async use_furniture(tile: string): Promise<void> {
    if (tile === 'kitchen') {
      await this.cook();
    } else if (tile === 'bath') {
      if (this.bathed) {
        await this.say('You already had a bath today.', null);
      } else {
        this.bathed = true;
        this.stamina = Math.min(this.max_stamina, this.stamina + 40);
        this.fatigue = Math.max(0, this.fatigue - 25);
        await this.advance(30);
        await this.say('Ahh... a hot bath in your Bathroom. (+40 Stamina, -25 Fatigue)', null);
      }
    } else if (tile === 'vase') {
      const flowers = ['Moondrop Flower', 'Pink Cat Flower', 'Toy Flower', 'Magic Red Flower', 'Blue Magic Grass'].filter(
        (f) => (this.inv[f] || 0) > 0
      );
      if (!flowers.length) {
        await this.say(
          `Flower Vase (${this.vase_flower || 'Empty'}): Place a Moondrop, Pink Cat, or Toy Flower here to boost overnight Stamina & Fatigue recovery!`,
          'Vase'
        );
      } else {
        const sel = await this.menu('Place which flower in the Vase?', flowers);
        if (sel !== null) {
          const fl = flowers[sel];
          this.take(fl, 1);
          this.vase_flower = fl;
          this.msg(`Placed ${fl} in the Vase! Better overnight recovery!`, '0A');
        }
      }
    } else if (tile === 'fireplace') {
      if ((this.inv['Lumber'] || 0) < 1) {
        await this.say('Fireplace: Bring 1 Lumber in Winter to light a warm fire and reduce overnight Fatigue!', 'Fireplace');
      } else if (await this.confirm('Light the Fireplace with 1 Lumber?')) {
        this.take('Lumber', 1);
        this.fireplace_lit = true;
        this.msg('A warm fire crackles in the fireplace!', '09');
      }
    } else {
      await this.show_lines(
        'Recipe Book (108 Dishes & Specialties)',
        Object.keys(RECIPES).map((r) => this.recipe_line(r))
      );
    }
  }

  recipe_line(dish: string): string {
    const [ing, ut] = RECIPES[dish];
    const parts = ing.map(([t, q]: [string, number]) => (t.startsWith('any:') ? `${q} any ${t.slice(4)}` : `${q} ${t}`));
    return `${dish}: ${parts.join(', ')}${ut ? ` [${ut}]` : ''}`;
  }

  ingredient_plan(dish: string): Record<string, number> | null {
    const left = { ...this.inv };
    const plan: Record<string, number> = {};
    for (let [tok, q] of py_sorted(RECIPES[dish][0])) {
      let pool: string[] = [];
      if (tok.startsWith('any:')) {
        const kind = tok.slice(4);
        pool = py_sorted(
          Object.keys(left).filter(
            (i) => left[i] > 0 && (kind === 'fruit' ? FRUITS.has(i) : (ITEMS[i]?.[2] || '') === kind)
          )
        );
      } else {
        pool = (left[tok] || 0) > 0 ? [tok] : [];
      }
      for (const i of pool) {
        const use = Math.min(q, left[i]);
        left[i] -= use;
        plan[i] = (plan[i] || 0) + use;
        q -= use;
        if (!q) break;
      }
      if (q) return null;
    }
    return plan;
  }

  async cook(): Promise<void> {
    while (true) {
      const dishes = Object.keys(RECIPES);
      const opts: string[] = ['[Experimental Free-Form Cooking]'];
      for (const d of dishes) {
        const ut = RECIPES[d][1];
        const ok = (!ut || ut in this.inv) && this.ingredient_plan(d) !== null;
        opts.push(`${ok ? '*' : ' '} ${d}`);
      }
      const info = (s: number) => {
        if (s === 0) {
          return [
            '  Combine any ingredient from your rucksack to experiment!',
            '  Invalid combinations produce a Failed Dish (needed for Elli Leaves!).',
          ];
        }
        const d = dishes[s - 1];
        const [, ut, st, sell] = RECIPES[d];
        const lines = [`  ${this.recipe_line(d)}`, `  +${st} Stamina, ships ${sell}G`];
        if (ut && !(ut in this.inv)) {
          lines.push(`  Needs a ${ut} (Supermarket / TV Shopping)`);
        }
        const plan = this.ingredient_plan(d);
        if (plan) {
          lines.push(
            '  Uses: ' +
              Object.entries(plan)
                .map(([i, q]) => `${q} ${i}`)
                .join(', ')
          );
        }
        return lines;
      };
      const sel = await this.menu('Kitchen   (* = ready to cook)', opts, 0, info);
      if (sel === null) return;
      if (sel === 0) {
        const usable = Object.keys(this.inv).filter((i) => ['crop', 'forage', 'fish', 'animal', 'ingredient', 'food'].includes(ITEMS[i]?.[2]));
        if (!usable.length) {
          await this.say('You have no food ingredients in your rucksack to experiment with.', null);
          continue;
        }
        const ingSel = await this.menu('Pick an ingredient to experiment with:', usable);
        if (ingSel !== null) {
          const used = usable[ingSel];
          this.take(used, 1);
          this.give('Failed Dish', 1);
          this.msg(`You experimented with ${used} and made a Failed Dish! (Used in Elli Leaves!)`, '0E');
        }
        continue;
      }
      const d = dishes[sel - 1];
      const ut = RECIPES[d][1];
      const plan = this.ingredient_plan(d);
      if (ut && !(ut in this.inv)) {
        await this.say(`You need a ${ut} to make ${d}.`, null);
      } else if (plan === null) {
        await this.say(`You don't have the ingredients for ${d}.`, null);
      } else {
        for (const [i, q] of Object.entries(plan)) {
          this.take(i, q);
        }
        this.give(d);
        this.msg(`You cooked ${d}!`, '0A');
      }
    }
  }
}
