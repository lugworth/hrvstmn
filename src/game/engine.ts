// Transpiled HRVSTMN Game Engine

import { Screen } from './screen';
import { GameMap, build_farm, build_town, build_mountain, build_house, build_interior, build_house_upgraded, build_mine } from './map';
import {
  PALETTE, SECS_PER_10MIN, SAVE_KEY, SEASONS, WEEKDAYS, SEASON_COL, WEATHER_COL,
  CROPS, FORAGE, FORAGE_GLYPH, ITEMS, BARN_CAP, ANIMALS, WOOL_DAYS, COW_NAMES, SHEEP_NAMES,
  TOOLS, UPGRADABLE, LEVELS, LEVEL_COL, UPGRADE, CAN_CAP, AREA, OBJ_GLYPH, HOURS, BUILDINGS,
  NPCS, SPOUSE_LINES, FESTIVALS, BIRTHDAYS, FEST_SPOTS, TILES, INTERIOR_LAYOUTS, INTERIOR_LEGEND,
  EXPANSIONS, BUILD_DAYS, UTENSILS, FRUITS, RECIPES, DIRS, OK_KEYS, CANCEL_KEYS, SPOUSE_POS,
  HOUSE_WAKE, LOGO, pkey, unkey, clamp, fmt_time, fmt_hour, BOOKS, HELP
} from './constants';
import {
  py_len, py_range, py_choice, py_randint, py_slice, py_item, py_in,
  py_dict_get, py_dict_items, py_dict_keys, py_dict_values, py_dict_setdefault, py_del, py_rng,
  py_sum, py_sorted, py_next, py_add, py_eq, enumerate, py_iter, py_wrap, py_mult
} from './runtime_helpers';

export class Game {
  [key: string]: any;

  scr!: Screen;
  started: boolean = false;
  running: boolean = true;
  msgs: [string, string][] = [];
  maps: Record<string, GameMap> = {};
  last: number = 0;
  acc: number = 0.0;
  npc_acc: number = 0.0;
  passing_out: boolean = false;
  interior_data: Record<string, { entry: [number, number]; spots: Record<string, [number, number]> }> = {};
  interiors: Record<string, any> = {};
  interior_bid: Record<string, string> = {};
  indoor_npcs: Record<string, any> = {};
  _fest_saved: Record<string, any> = {};

  name: string = 'Pete';
  farm: string = 'Moon';
  year: number = 1;
  season: number = 0;
  day: number = 1;
  minutes: number = 360;
  weather: string = 'Sunny';
  tomorrow: string = 'Sunny';
  gold: number = 500;
  stamina: number = 100;
  max_stamina: number = 100;
  inv: Record<string, number> = {};
  held: string | null = null;
  tool: string = 'Hoe';
  levels: Record<string, number> = {};
  water: number = 30;
  upgrading: [string, number] | null = null;
  tilled: Set<string> = new Set();
  wet: Set<string> = new Set();
  crops: Record<string, any> = {};
  objs: { farm: Record<string, string>; mine: Record<string, string> } = { farm: {}, mine: {} };
  hp: Record<string, number> = {};
  forage: Record<string, Record<string, string>> = { mountain: {} };
  bin: Record<string, number> = {};
  chickens: number = 0;
  fed: number = 0;
  eggs: number = 0;
  friend: Record<string, number> = {};
  talked: Set<string> = new Set();
  gifted: Set<string> = new Set();
  married: string | null = null;
  shipped_total: number = 0;
  prayed: boolean = false;
  fest_wins: string[] = [];
  fest_attended: boolean = false;
  fest_declined: boolean = false;
  npc_pos: Record<string, any> = {};
  mine_floor: number = 0;
  ladder: [number, number] | null = null;
  mapname: string = 'house';
  px: number = 1;
  py: number = 2;
  face: [number, number] = [0, -1];
  animals: any[] = [];
  house_flags: string[] = [];
  project: [string, number] | null = null;
  bath_used: boolean = false;
  SAVE_FIELDS = ['name', 'farm', 'year', 'season', 'day', 'weather', 'tomorrow', 'gold',
    'max_stamina', 'inv', 'tool', 'levels', 'water', 'upgrading', 'bin',
    'chickens', 'fed', 'eggs', 'friend', 'married', 'shipped_total',
    'animals', 'fest_wins', 'house_flags', 'project'];

  constructor(scr: any) {
    this.scr = scr;
    this.started = false;
    this.running = true;
    this.msgs = [];
    this.maps = { ["farm"]: build_farm(), ["town"]: build_town(), ["mountain"]: build_mountain(), ["house"]: build_house() };
    this.last = (Date.now() / 1000);
    this.acc = 0.0;
    this.npc_acc = 0.0;
    this.passing_out = false;
    ((this as any).build_interiors());
  }

  new_game(name: any, farm: any): any {
    let kind: any = undefined; let m: any = undefined; let r: any = undefined; let rng: any = undefined; let x: any = undefined; let y: any = undefined;
    [this.name, this.farm] = [name, farm];
    [this.year, this.season, this.day, this.minutes] = [1, 0, 1, py_mult(6, 60)];
    [this.weather, this.tomorrow] = ["Sunny", ((this as any).roll_weather(0, 2))];
    [this.gold, this.stamina, this.max_stamina] = [500, 100, 100];
    this.inv = { ["Turnip Seeds"]: 2 };
    this.held = null;
    this.tool = "Hoe";
    this.levels = Object.fromEntries(py_iter(UPGRADABLE).map((t: any) => [t, 0]));
    this.water = py_item(CAN_CAP, 0);
    this.upgrading = null;
    [this.tilled, this.wet, this.crops] = [new Set(), new Set(), {  }];
    this.objs = { ["farm"]: {  }, ["mine"]: {  } };
    this.hp = {  };
    this.forage = { ["mountain"]: {  } };
    this.bin = {  };
    this.chickens = 0;
    this.fed = 0;
    this.eggs = 0;
    this.friend = Object.fromEntries(py_iter(NPCS).map((n: any) => [n, 0]));
    [this.talked, this.gifted] = [new Set(), new Set()];
    this.married = null;
    this.shipped_total = 0;
    this.prayed = false;
    [this.fest_wins, this.fest_attended, this.fest_declined] = [[], false, false];
    this.npc_pos = {  };
    this.mine_floor = 0;
    this.ladder = null;
    this.mapname = "house";
    [this.px, this.py] = HOUSE_WAKE;
    this.face = [0, (-1)];
    rng = py_rng().Random();
    m = py_item(this.maps, "farm");
    for (let y of py_iter(py_range(m.h))) {
      for (let x of py_iter(py_range(m.w))) {
        if (py_eq(py_item(py_item(m.t, y), x), "field")) {
          r = rng.random();
          kind = ((r < 0.12) ? "weed" : ((r < 0.19) ? "stone" : ((r < 0.25) ? "branch" : ((r < 0.262) ? "stump" : ((r < 0.274) ? "boulder" : null)))));
          if (kind) {
            py_item(this.objs, "farm")[pkey(x, y)] = kind;
            if (py_in(kind, ["stump", "boulder"])) {
              this.hp[pkey(x, y)] = 6;
            }
          }
        }
      }
    }
    ((this as any).spawn_forage());
    this.animals = [];
    ((this as any).init_carpentry());
    this.started = true;
  }

  get map(): any {
    return py_item(this.maps, this.mapname);
  }

  absday(year: any = null, season: any = null, day: any = null): any {
    year = (py_eq(year, null) ? this.year : year);
    season = (py_eq(season, null) ? this.season : season);
    day = (py_eq(day, null) ? this.day : day);
    return (py_add(py_add(py_mult((year - 1), 120), py_mult(season, 30)), day) - 1);
  }

  get weekday(): any {
    return (((this as any).absday()) % 7);
  }

  get season_name(): any {
    return py_item(SEASONS, this.season);
  }

  date_str(): any {
    return `${this.season_name} ${this.day} (${py_item(WEEKDAYS, this.weekday)}), Year ${this.year}`;
  }

  roll_weather(season: any, day: any): any {
    let r: any = undefined;
    if (py_eq(day, 1)) {
      return "Sunny";
    }
    r = py_rng().random();
    if (py_eq(season, 3)) {
      return ((r < 0.25) ? "Snow" : "Sunny");
    }
    return ((r < py_item([0.2, 0.1, 0.15], season)) ? "Rain" : "Sunny");
  }

  msg(text: any, col: any = "05"): any {
    this.msgs.push([text, col]);
    this.msgs = py_slice(this.msgs, (-30), null);
  }

  give(item: any, n: any = 1): any {
    this.inv[item] = py_add(py_dict_get(this.inv, item, 0), n);
  }

  take(item: any, n: any = 1): any {
    this.inv[item] -= n;
    if ((py_item(this.inv, item) <= 0)) {
      py_del(this.inv, item);
      if (py_eq(this.held, item)) {
        this.held = null;
      }
    }
  }

  save(): void {
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
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SAVE_KEY, JSON.stringify(d));
      }
    } catch (e) {
      console.error('Save failed', e);
    }
  }

  load(): void {
    let jsonStr = '';
    try {
      if (typeof localStorage !== 'undefined') {
        jsonStr = localStorage.getItem(SAVE_KEY) || '';
      }
    } catch (e) {
      console.error('Load failed', e);
    }
    if (!jsonStr) {
      throw new Error('No save file found');
    }
    const d = JSON.parse(jsonStr);
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
    this.tilled = new Set(d.tilled || []);
    this.wet = new Set(d.wet || []);
    this.crops = { ...(d.crops || {}) };
    this.objs.farm = { ...(d.objs || {}) };
    this.hp = { ...(d.hp || {}) };
    this.forage = { ...(d.forage || { mountain: {} }) };
    this.stamina = this.max_stamina;
    this.rebuild_house();
  }

  async run(): Promise<any> {
    let k: any = undefined;
    (await (this as any).title());
    this.last = (Date.now() / 1000);
    while (this.running) {
      k = (await this.scr.getKey((1 / 20)));
      while ((k && this.running)) {
        (await (this as any).handle(k));
        k = (await this.scr.getKey(0));
      }
      (await (this as any).update());
      ((this as any).render());
      this.scr.flush();
    }
  }

  async update(): Promise<any> {
    let dt: any = undefined; let now: any = undefined;
    now = (Date.now() / 1000);
    dt = Math.min((now - this.last), 0.25);
    this.last = now;
    if ((!this.map.indoor)) {
      this.acc += dt;
      while ((this.acc >= SECS_PER_10MIN)) {
        this.acc -= SECS_PER_10MIN;
        (await (this as any).advance(10));
      }
    }
    this.npc_acc += dt;
    if ((this.npc_acc > 0.7)) {
      this.npc_acc = 0;
      ((this as any).move_npcs());
    }
  }

  async advance(mins: any): Promise<any> {
    let before: any = undefined;
    before = this.minutes;
    this.minutes += mins;
    if ((before < py_mult(18, 60)) && (py_mult(18, 60) <= this.minutes)) {
      ((this as any).msg("The sun is setting. Shops are closing soon.", "09"));
    }
    if ((before < py_mult(24, 60)) && (py_mult(24, 60) <= this.minutes)) {
      ((this as any).msg("It's midnight. You should get to bed!", "08"));
    }
    if ((this.minutes >= py_mult(26, 60))) {
      (await (this as any).pass_out("It's 2AM... you collapse from exhaustion where you stand."));
      return;
    }
    ((this as any).update_npcs());
  }

  async handle(k: any): Promise<any> {
    let t: any = undefined;
    if (py_in(k, DIRS)) {
      (await (this as any).move(...((py_iter(py_item(DIRS, k)) || []) as [any, any, any])));
    } else {
      if (py_in(k, ["space", "z"])) {
        (await (this as any).use_tool());
      } else {
        if (py_in(k, ["x", "e", "enter"])) {
          (await (this as any).interact());
        } else {
          if (py_eq(k, "tab")) {
            ((this as any).cycle_tool(1));
          } else {
            if (py_eq(k, "btab")) {
              ((this as any).cycle_tool((-1)));
            } else {
              if ((py_eq(py_len(k), 1) && py_in(k, "123456"))) {
                t = py_item(TOOLS, (Math.floor(Number(k)) - 1));
                if ((this.upgrading && py_eq(py_item(this.upgrading, 0), t))) {
                  ((this as any).msg(`Saibara is still working on your ${t}.`, "08"));
                } else {
                  this.tool = t;
                }
              } else {
                if (py_eq(k, "i")) {
                  (await (this as any).rucksack());
                } else {
                  if (py_eq(k, "?")) {
                    (await (this as any).show_lines("Help", HELP));
                  } else {
                    if (py_eq(k, "esc")) {
                      (await (this as any).pause_menu());
                    } else {
                      if (py_in(k, ["Q", "ctrl-c"])) {
                        (await (this as any).quit_prompt());
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  async pause_menu(): Promise<any> {
    let sel: any = undefined;
    sel = (await (this as any).menu("Paused", ["Resume", "Rucksack", "Help", "Quit"]));
    if (py_eq(sel, 1)) {
      (await (this as any).rucksack());
    } else {
      if (py_eq(sel, 2)) {
        (await (this as any).show_lines("Help", HELP));
      } else {
        if (py_eq(sel, 3)) {
          (await (this as any).quit_prompt());
        }
      }
    }
  }

  async quit_prompt(): Promise<any> {
    if ((await (this as any).confirm("Quit? Progress since you last slept is lost."))) {
      this.running = false;
    }
  }

  npc_at(x: any, y: any, mapname: any = null): any {
    let n: any = undefined; let p: any = undefined;
    mapname = (mapname || this.mapname);
    for (let [n, p] of py_iter(py_dict_items(this.npc_pos))) {
      if ((py_eq(p, [x, y]) && py_eq(py_item(py_item(py_item(NPCS, n), "where"), 0), mapname))) {
        return n;
      }
    }
    n = ((this as any).indoor_npc_at(x, y, mapname));
    if (n) {
      return n;
    }
    if ((py_eq(mapname, "house") && this.married && py_eq([x, y], SPOUSE_POS))) {
      return this.married;
    }
    return null;
  }

  walkable(mapname: any, x: any, y: any, for_npc: any = false): any {
    let m: any = undefined;
    m = py_item(this.maps, mapname);
    if (((!m.inside(x, y)) || (!py_item(py_item(TILES, m.tile(x, y)), 3)))) {
      return false;
    }
    if ((py_in([x, y], py_dict_get(this.objs, mapname, {  })) || py_in([x, y], py_dict_get(this.forage, mapname, {  })))) {
      return false;
    }
    if ((for_npc && (py_in([x, y], m.warps) || (py_in([x, y], this.tilled) && py_eq(mapname, "farm"))))) {
      return false;
    }
    return true;
  }

  is_out(n: any): any {
    let a: any = undefined; let b: any = undefined; let d: any = undefined;
    if ((!py_eq(((this as any).fest_is_out(n)), null))) {
      return true;
    }
    d = py_item(NPCS, n);
    if (((!py_item(d, "out")) || py_eq(n, this.married))) {
      return false;
    }
    if (((!py_eq(this.weather, "Sunny")) && (!py_item(d, "rain")))) {
      return false;
    }
    [a, b] = py_item(d, "out");
    return (py_mult(a, 60) <= this.minutes) && (this.minutes < py_mult(b, 60));
  }

  update_npcs(): any {
    let ax: any = undefined; let ay: any = undefined; let d: any = undefined; let mp: any = undefined; let n: any = undefined; let spot: any = undefined;
    ((this as any).fest_sync());
    for (let [n, d] of py_iter(py_dict_items(NPCS))) {
      if (((this as any).is_out(n))) {
        if ((!py_in(n, this.npc_pos))) {
          [mp, ax, ay] = py_item(d, "where");
          spot = ((this as any).free_spot(mp, ax, ay));
          if (spot) {
            this.npc_pos[n] = spot;
          }
        }
      } else {
        this.npc_pos.pop(n, null);
      }
    }
    ((this as any).update_indoor_npcs());
  }

  free_spot(mp: any, x: any, y: any): any {
    let dx: any = undefined; let dy: any = undefined; let p: any = undefined; let r: any = undefined;
    for (let r of py_iter(py_range(0, 7))) {
      for (let dy of py_iter(py_range((-r), py_add(r, 1)))) {
        for (let dx of py_iter(py_range((-r), py_add(r, 1)))) {
          p = [py_add(x, dx), py_add(y, dy)];
          if ((((this as any).walkable(mp, ...((py_iter(p) || []) as [any, any, any]))) && (!((this as any).npc_at(...((py_iter(p) || []) as [any, any, any])))) && (!(py_eq(mp, this.mapname) && py_eq(p, [this.px, this.py]))))) {
            return p;
          }
        }
      }
    }
    return null;
  }

  move_npcs(): any {
    let ax: any = undefined; let ay: any = undefined; let dx: any = undefined; let dy: any = undefined; let mp: any = undefined; let n: any = undefined; let nx: any = undefined; let ny: any = undefined; let x: any = undefined; let y: any = undefined;
    for (let [n, [x, y]] of py_iter(Array.from(py_iter(py_dict_items(this.npc_pos) || [])))) {
      [mp, ax, ay] = py_item(py_item(NPCS, n), "where");
      if (((!py_eq(mp, this.mapname)) || (py_rng().random() > 0.45))) {
        continue;
      }
      [dx, dy] = py_rng().choice([[1, 0], [(-1), 0], [0, 1], [0, (-1)]]);
      [nx, ny] = [py_add(x, dx), py_add(y, dy)];
      if (((Math.abs((nx - ax)) > 4) || (Math.abs((ny - ay)) > 3))) {
        continue;
      }
      if ((((this as any).walkable(mp, nx, ny, true)) && (!((this as any).npc_at(nx, ny))) && (!py_eq([nx, ny], [this.px, this.py])))) {
        this.npc_pos[n] = [nx, ny];
      }
    }
    ((this as any).move_indoor_npcs());
  }

  target(): any {
    return [py_add(this.px, py_item(this.face, 0)), py_add(this.py, py_item(this.face, 1))];
  }

  async move(dx: any, dy: any): Promise<any> {
    let m: any = undefined; let mp: any = undefined; let nx: any = undefined; let ny: any = undefined; let wx: any = undefined; let wy: any = undefined;
    this.face = [dx, dy];
    [nx, ny] = [py_add(this.px, dx), py_add(this.py, dy)];
    m = this.map;
    if ((!m.inside(nx, ny))) {
      return;
    }
    if (py_in([nx, ny], m.doors)) {
      (await (this as any).enter(py_item(m.doors, pkey(nx, ny))));
      return;
    }
    if (((!((this as any).walkable(this.mapname, nx, ny))) || ((this as any).npc_at(nx, ny)))) {
      return;
    }
    [this.px, this.py] = [nx, ny];
    (await (this as any).fest_check());
    if (py_in([nx, ny], m.warps)) {
      [mp, wx, wy] = py_item(m.warps, pkey(nx, ny));
      ((this as any).warp(mp, wx, wy));
    } else {
      if (py_eq(m.tile(nx, ny), "down")) {
        ((this as any).enter_mine(py_add(this.mine_floor, 1)));
      } else {
        if (py_eq(m.tile(nx, ny), "up")) {
          ((this as any).warp("mountain", 52, 5, [0, 1]));
          ((this as any).msg("You climb back out into the fresh air."));
        }
      }
    }
  }

  warp(mp: any, x: any, y: any, face: any = null): any {
    [this.mapname, this.px, this.py] = [mp, x, y];
    if (face) {
      this.face = face;
    }
    ((this as any).update_npcs());
    if ((!this.map.indoor)) {
      ((this as any).msg(`~ ${this.map.title} ~`, "0C"));
    }
  }

  async enter(door: any): Promise<any> {
    if (py_eq(door, "house_in")) {
      ((this as any).warp("house", 7, 5, [0, (-1)]));
    } else {
      if (py_eq(door, "house_out")) {
        ((this as any).warp("farm", 8, 6, [0, 1]));
      } else {
        if (py_eq(door, "coop")) {
          (await (this as any).coop());
        } else {
          if (py_eq(door, "barn")) {
            (await (this as any).barn());
          } else {
            if (py_eq(door, "mine")) {
              ((this as any).enter_mine(1));
            } else {
              (await (this as any).visit(door));
            }
          }
        }
      }
    }
  }

  enter_mine(floor: any): any {
    let ladder: any = undefined; let m: any = undefined; let rocks: any = undefined;
    this.mine_floor = floor;
    [m, rocks, ladder] = build_mine(floor);
    this.maps["mine"] = m;
    this.objs["mine"] = rocks;
    this.ladder = ladder;
    [this.mapname, this.px, this.py, this.face] = ["mine", 2, 2, [1, 0]];
    ((this as any).msg(`Mine - floor B${floor}F. Break rocks to find the ladder down.`, "0C"));
  }

  tool_list(): any {
    let tools: any = undefined;
    tools = py_iter(TOOLS).filter((t: any) => (!(this.upgrading && py_eq(py_item(this.upgrading, 0), t)))).map((t: any) => t);
    return py_add(tools, py_sorted(py_iter(this.inv).filter((i: any) => i.endsWith(" Seeds")).map((i: any) => i)));
  }

  cycle_tool(d: any): any {
    let i: any = undefined; let tl: any = undefined;
    tl = ((this as any).tool_list());
    i = (py_in(this.tool, tl) ? tl.indexOf(this.tool) : (-1));
    this.tool = py_item(tl, (py_add(i, d) % py_len(tl)));
  }

  area(): any {
    let depth: any = undefined; let fx: any = undefined; let fy: any = undefined; let half: any = undefined; let lx: any = undefined; let ly: any = undefined;
    [depth, half] = py_item(AREA, py_dict_get(this.levels, this.tool, 0));
    [fx, fy] = this.face;
    [lx, ly] = [(-fy), fx];
    return py_iter(py_range(1, py_add(depth, 1))).flatMap((k: any) => py_iter(py_range((-half), py_add(half, 1))).map((l: any) => [py_add(py_add(this.px, py_mult(fx, k)), py_mult(lx, l)), py_add(py_add(this.py, py_mult(fy, k)), py_mult(ly, l))]));
  }

  async spend(n: any): Promise<any> {
    let before: any = undefined;
    before = this.stamina;
    this.stamina = Math.max(0, (this.stamina - n));
    if ((this.stamina <= 0)) {
      (await (this as any).pass_out("You push yourself too hard and collapse from exhaustion..."));
    } else {
      if ((before > 30) && (30 >= this.stamina)) {
        ((this as any).msg("You're getting tired. Eat something or rest.", "09"));
      } else {
        if ((before > 10) && (10 >= this.stamina)) {
          ((this as any).msg("You're exhausted! You can barely lift your tools.", "08"));
        }
      }
    }
  }

  async use_tool(): Promise<any> {
    let area: any = undefined; let cap: any = undefined; let drop: any = undefined; let m: any = undefined; let n: any = undefined; let obj: any = undefined; let objs: any = undefined; let p: any = undefined; let q: any = undefined; let t: any = undefined; let tile: any = undefined; let tx: any = undefined; let ty: any = undefined;
    t = this.tool;
    if ((!py_in(t, ((this as any).tool_list())))) {
      this.tool = "Hoe";
      return;
    }
    [tx, ty] = ((this as any).target());
    p = [tx, ty];
    m = this.map;
    objs = py_dict_get(this.objs, this.mapname, {  });
    obj = py_dict_get(objs, p);
    tile = m.tile(tx, ty);
    if (t.endsWith(" Seeds")) {
      (await (this as any).sow(t, p));
      return;
    }
    if (py_eq(t, "Sickle")) {
      if (py_eq(obj, "weed")) {
        py_del(objs, p);
        ((this as any).msg("Swish! You cut the weeds."));
      } else {
        if ((py_in(p, this.crops) && py_eq(this.mapname, "farm"))) {
          ((this as any).msg("Careful! That's a crop."));
          return;
        }
      }
      (await (this as any).spend(2));
    } else {
      if (py_eq(t, "Hoe")) {
        if ((!py_eq(this.mapname, "farm"))) {
          ((this as any).msg("You can only till the soil on your farm."));
        } else {
          if (py_eq(this.season, 3)) {
            ((this as any).msg("The ground is frozen solid."));
          } else {
            n = 0;
            for (let q of py_iter(((this as any).area()))) {
              if ((py_eq(py_item(this.maps, "farm").tile(...((py_iter(q) || []) as [any, any, any])), "field") && (!py_in(q, objs)) && (!py_in(q, this.tilled)))) {
                this.tilled.add(q);
                if (py_eq(this.weather, "Rain")) {
                  this.wet.add(q);
                }
                n += 1;
              }
            }
            if (((!n) && obj)) {
              ((this as any).msg(`There's a ${obj} in the way.`));
            }
          }
        }
        area = py_len(((this as any).area()));
        (await (this as any).spend(py_add(2, Math.floor(area / 3))));
      } else {
        if (py_eq(t, "Hammer")) {
          if (py_eq(obj, "stone")) {
            py_del(objs, p);
            ((this as any).msg("Crack! The stone shatters."));
          } else {
            if (py_eq(obj, "boulder")) {
              if ((py_item(this.levels, "Hammer") < 1)) {
                ((this as any).msg("This boulder is too big. Upgrade your Hammer."));
              } else {
                this.hp[p] = (py_dict_get(this.hp, p, 6) - py_add(1, py_item(this.levels, "Hammer")));
                if ((py_item(this.hp, p) <= 0)) {
                  py_del(objs, p);
                  py_del(this.hp, p);
                  ((this as any).msg("BOOM! The boulder breaks apart."));
                } else {
                  ((this as any).msg("Clang! The boulder cracks."));
                }
              }
            } else {
              if (py_eq(obj, "rock")) {
                py_del(objs, p);
                drop = ((this as any).mine_drop());
                if (drop) {
                  ((this as any).give(drop));
                  ((this as any).msg(`You found ${drop}!`, "0C"));
                }
                if (py_eq(p, this.ladder)) {
                  m.set(tx, ty, "down");
                  ((this as any).msg("There's a ladder hidden under the rock!", "0A"));
                }
              } else {
                if ((py_eq(this.mapname, "farm") && py_in(p, this.tilled) && (!py_in(p, this.crops)))) {
                  this.tilled.delete(p);
                  this.wet.delete(p);
                } else {
                  if ((py_eq(this.mapname, "farm") && py_in(p, this.crops))) {
                    ((this as any).msg("Better not smash your crops."));
                    return;
                  }
                }
              }
            }
          }
          (await (this as any).spend(2));
        } else {
          if (py_eq(t, "Axe")) {
            if (py_eq(obj, "branch")) {
              py_del(objs, p);
              ((this as any).give("Lumber"));
              ((this as any).msg("Chop! +1 Lumber."));
            } else {
              if (py_eq(obj, "stump")) {
                if ((py_item(this.levels, "Axe") < 1)) {
                  ((this as any).msg("This stump is too tough. Upgrade your Axe."));
                } else {
                  this.hp[p] = (py_dict_get(this.hp, p, 6) - py_add(1, py_item(this.levels, "Axe")));
                  if ((py_item(this.hp, p) <= 0)) {
                    py_del(objs, p);
                    py_del(this.hp, p);
                    ((this as any).give("Lumber", 6));
                    ((this as any).msg("The stump splits! +6 Lumber."));
                  } else {
                    ((this as any).msg("Thunk!"));
                  }
                }
              } else {
                if (py_eq(tile, "tree")) {
                  ((this as any).msg("This tree is too big to chop down."));
                }
              }
            }
            (await (this as any).spend(2));
          } else {
            if (py_eq(t, "Watering Can")) {
              cap = py_item(CAN_CAP, py_item(this.levels, "Watering Can"));
              if (py_in(tile, ["water", "fountain"])) {
                this.water = cap;
                ((this as any).msg(`You fill the watering can. (${cap}/${cap})`, "0D"));
                return;
              }
              if ((this.water <= 0)) {
                ((this as any).msg("The watering can is empty. Refill it at a pond.", "08"));
                return;
              }
              this.water -= 1;
              if (py_eq(this.mapname, "farm")) {
                for (let q of py_iter(((this as any).area()))) {
                  if (py_in(q, this.tilled)) {
                    this.wet.add(q);
                  }
                }
              }
              (await (this as any).spend(py_add(2, Math.floor(py_len(((this as any).area())) / 3))));
            } else {
              if (py_eq(t, "Fishing Rod")) {
                if (py_eq(tile, "water")) {
                  (await (this as any).fish());
                } else {
                  ((this as any).msg("You need to face some water to fish."));
                }
              }
            }
          }
        }
      }
    }
  }

  mine_drop(): any {
    let acc: any = undefined; let chance: any = undefined; let f: any = undefined; let minf: any = undefined; let name: any = undefined; let r: any = undefined; let table: any = undefined;
    f = this.mine_floor;
    table = [["Copper", 28, 1], ["Silver", 14, 3], ["Gold", 9, 5], ["Amethyst", 4, 6], ["Mystrile", 4, 8], ["Diamond", 2, 10]];
    [r, acc] = [py_mult(py_rng().random(), 100), 0];
    for (let [name, chance, minf] of py_iter(table)) {
      if ((f >= minf)) {
        acc += chance;
        if ((r < acc)) {
          return name;
        }
      }
    }
    return null;
  }

  async sow(bag: any, p: any): Promise<any> {
    let crop: any = undefined; let dx: any = undefined; let dy: any = undefined; let n: any = undefined; let q: any = undefined;
    crop = py_slice(bag, null, (-6));
    if ((!py_eq(this.mapname, "farm"))) {
      ((this as any).msg("You can only plant seeds on your farm."));
      return;
    }
    if ((!py_eq(py_item(py_item(CROPS, crop), 0), this.season_name))) {
      ((this as any).msg(`${crop} won't grow in ${this.season_name}.`, "08"));
      return;
    }
    n = 0;
    for (let dx of py_iter([(-1), 0, 1])) {
      for (let dy of py_iter([(-1), 0, 1])) {
        q = [py_add(py_item(p, 0), dx), py_add(py_item(p, 1), dy)];
        if ((py_in(q, this.tilled) && (!py_in(q, this.crops)))) {
          this.crops[q] = [crop, 0];
          n += 1;
        }
      }
    }
    if ((!n)) {
      ((this as any).msg("Seeds need empty tilled soil. Use the Hoe first."));
      return;
    }
    ((this as any).take(bag));
    ((this as any).msg(`You sowed ${crop} seeds on ${n} tile${((n > 1) ? "s" : "")}.`, "0B"));
    if ((!py_in(bag, this.inv))) {
      this.tool = "Watering Can";
    }
    (await (this as any).spend(1));
  }

  async fish(): Promise<any> {
    let H: any = undefined; let W: any = undefined; let bite: any = undefined; let bx: any = undefined; let by: any = undefined; let dots: any = undefined; let fish: any = undefined; let k: any = undefined; let now: any = undefined; let r: any = undefined; let result: any = undefined; let start: any = undefined; let wait: any = undefined;
    wait = py_rng().uniform(1.2, 4.0);
    start = (Date.now() / 1000);
    bite = null;
    result = null;
    while (py_eq(result, null)) {
      now = (Date.now() / 1000);
      if ((py_eq(bite, null) && ((now - start) >= wait))) {
        bite = now;
      }
      if (((!py_eq(bite, null)) && ((now - bite) > 0.9))) {
        result = "miss";
        break;
      }
      [W, H] = [this.scr.w, this.scr.h];
      const draw = () => {
        [bx, by] = [Math.floor((W - 34) / 2), (Math.floor(H / 2) - 3)];
        this.scr.box(bx, by, 34, 5, "0D", "00", "Fishing");
        if (py_eq(bite, null)) {
          dots = py_mult(".", py_add(1, (Math.floor(Number(py_mult((now - start), 2))) % 3)));
          this.scr.put(py_add(bx, 3), py_add(by, 2), `~ ~ o ~ ~   waiting${dots}`, "0D");
        } else {
          this.scr.put(py_add(bx, 3), py_add(by, 2), "~ ~ O ~ ~   !! BITE !! SPACE", "08", "00", true);
        }
      };
      ((this as any).render());
      draw();
      this.scr.flush();
      k = (await this.scr.getKey(0.05));
      if (k) {
        if (py_in(k, CANCEL_KEYS)) {
          result = "quit";
        } else {
          if (py_eq(bite, null)) {
            result = "early";
          } else {
            result = "catch";
          }
        }
      }
    }
    this.last = (Date.now() / 1000);
    if (py_eq(result, "catch")) {
      r = py_rng().random();
      fish = ((r < 0.12) ? "Large Fish" : ((r < 0.45) ? "Medium Fish" : "Small Fish"));
      ((this as any).give(fish));
      ((this as any).msg(`You caught a ${fish}!`, "0C"));
    } else {
      if (py_eq(result, "early")) {
        ((this as any).msg("You reeled in too early."));
      } else {
        if (py_eq(result, "miss")) {
          ((this as any).msg("It got away..."));
        }
      }
    }
    (await (this as any).spend(3));
  }

  async interact(): Promise<any> {
    let age: any = undefined; let crop: any = undefined; let days: any = undefined; let fr: any = undefined; let item: any = undefined; let left: any = undefined; let m: any = undefined; let n: any = undefined; let nxt: any = undefined; let p: any = undefined; let regrow: any = undefined; let show: any = undefined; let text: any = undefined; let tile: any = undefined; let tx: any = undefined; let ty: any = undefined;
    [tx, ty] = ((this as any).target());
    p = [tx, ty];
    m = this.map;
    n = ((this as any).npc_at(tx, ty));
    if (n) {
      (await (this as any).talk(n));
      return;
    }
    if (py_in(p, m.doors)) {
      (await (this as any).enter(py_item(m.doors, p)));
      return;
    }
    tile = m.tile(tx, ty);
    if ((py_eq(this.mapname, "farm") && py_in(p, this.crops))) {
      [crop, age] = py_item(this.crops, p);
      [days, regrow] = [py_item(py_item(CROPS, crop), 2), py_item(py_item(CROPS, crop), 3)];
      if ((age >= days)) {
        ((this as any).give(crop));
        if (regrow) {
          py_item(this.crops, p)[1] = (days - regrow);
        } else {
          py_del(this.crops, p);
        }
        ((this as any).msg(`You harvested a ${crop}!`, "0B"));
      } else {
        ((this as any).msg(`${crop}: ${(days - age)} more day${(((days - age) > 1) ? "s" : "")} to go.${(py_in(p, this.wet) ? "" : " (needs water)")}`));
      }
      return;
    }
    fr = py_dict_get(this.forage, this.mapname, {  });
    if (py_in(p, fr)) {
      item = fr.pop(p);
      ((this as any).give(item));
      ((this as any).msg(`You picked up ${item}.`, "0B"));
      return;
    }
    if (py_eq(tile, "bin")) {
      (await (this as any).ship());
    } else {
      if (py_eq(tile, "bed")) {
        if ((await (this as any).confirm("Go to bed? (Your game will be saved.)"))) {
          (await (this as any).new_day("sleep"));
        }
      } else {
        if (py_eq(tile, "tv")) {
          show = py_rng().choice(["a cooking show", "the news", "a samurai drama", "a farming tips show"]);
          (await (this as any).say(`Tomorrow's forecast: ${this.tomorrow}.${((this as any).fest_news())}  Afterwards, ${show} comes on.`, "TV"));
        } else {
          if (py_eq(tile, "cal")) {
            left = (30 - this.day);
            nxt = py_item(SEASONS, (py_add(this.season, 1) % 4));
            (await (this as any).say(`Today is ${((this as any).date_str())}. ${left} day${((!py_eq(left, 1)) ? "s" : "")} until ${nxt}.`, "Calendar"));
            (await (this as any).fest_calendar());
          } else {
            if (py_in(tile, ["counter", "bookcase"])) {
              (await (this as any).interior_interact(tile, p));
            } else {
              if (py_in(tile, ["kitchen", "bath", "shelf"])) {
                (await (this as any).use_furniture(tile));
              } else {
                if (py_eq(tile, "sign")) {
                  text = py_dict_get(m.signs, p, "");
                  if (py_eq(text, "farm")) {
                    text = `${this.farm.toUpperCase()} FARM - Owner: ${this.name}`;
                  }
                  (await (this as any).say(text, "Sign"));
                } else {
                  if (this.held) {
                    ((this as any).msg(`You're holding ${this.held}. Face someone and press X to give it.`));
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  hearts(n: any): any {
    let col: any = undefined; let h: any = undefined;
    h = Math.floor(py_dict_get(this.friend, n, 0) / 10);
    col = py_item(["03", "0E", "0D", "0B", "09", "08"], Math.min(5, Math.floor(h / 2)));
    return [py_add(py_add(py_add("[", py_mult("#", h)), py_mult(".", (10 - h))), "]"), col];
  }

  async talk(n: any): Promise<any> {
    let d: any = undefined; let f: any = undefined; let item: any = undefined; let line: any = undefined; let pts: any = undefined; let tier: any = undefined;
    if ((await (this as any).fest_talk(n))) {
      return;
    }
    d = py_item(NPCS, n);
    if (this.held) {
      item = this.held;
      if (py_eq(item, "Blue Feather")) {
        (await (this as any).propose(n));
        return;
      }
      if (py_in(n, this.gifted)) {
        (await (this as any).say("You already gave me something today. Thank you, though!", n));
        return;
      }
      ((this as any).take(item));
      if (py_in(item, py_item(d, "loves"))) {
        [pts, line] = [6, `Oh! ${item}! I love this! Thank you so much!`];
      } else {
        if (py_in(item, py_item(d, "likes"))) {
          [pts, line] = [3, `A ${item}? Thank you, that's really nice.`];
        } else {
          if (py_in(item, py_item(d, "hates"))) {
            [pts, line] = [(-4), `...A ${item}? I don't really like this.`];
          } else {
            [pts, line] = [1, `Oh, a ${item}? For me? Thanks.`];
          }
        }
      }
      [pts, line] = ((this as any).birthday_gift(n, pts, line));
      this.friend[n] = clamp(py_add(py_item(this.friend, n), pts), 0, 100);
      this.gifted.add(n);
      (await (this as any).say(line, n));
      return;
    }
    if ((py_eq(n, this.married) && py_eq(this.mapname, "house"))) {
      line = py_rng().choice(SPOUSE_LINES);
    } else {
      f = py_item(this.friend, n);
      tier = ((f < 30) ? 0 : ((f < 70) ? 1 : 2));
      line = py_rng().choice(py_item(py_item(d, "lines"), tier));
    }
    if ((!py_in(n, this.talked))) {
      this.talked.add(n);
      this.friend[n] = clamp(py_add(py_item(this.friend, n), 1), 0, 100);
    }
    (await (this as any).say(line, n));
  }

  async propose(n: any): Promise<any> {
    let d: any = undefined;
    d = py_item(NPCS, n);
    if ((!py_item(d, "bach"))) {
      (await (this as any).say("What a beautiful blue feather! You should give it to someone special.", n));
    } else {
      if (this.married) {
        (await (this as any).say("You're already married! Go home to your family.", n));
      } else {
        if ((py_item(this.friend, n) < 100)) {
          (await (this as any).say("A blue feather...? I'm sorry. I... I don't feel that way. Not yet, at least.", n));
        } else {
          ((this as any).take("Blue Feather"));
          (await (this as any).say("A blue feather...! Is this... a proposal? YES! Of course, yes!", n));
          (await (this as any).say("A week later, the whole town gathers at the church.", null));
          (await (this as any).say(`Pastor Carter: Do you, ${this.name}, take ${n} to be your spouse?`, null));
          (await (this as any).say(`You say 'I do.' The bells of Mineral Town ring out for ${this.name} and ${n}!`, null));
          this.married = n;
          this.npc_pos.pop(n, null);
          (await (this as any).say(`${n} has moved into your farmhouse. Congratulations!`, null));
        }
      }
    }
  }

  async ship(): Promise<any> {
    let item: any = undefined; let items: any = undefined; let opts: any = undefined; let pending: any = undefined; let q: any = undefined; let sel: any = undefined;
    while (true) {
      items = py_iter(py_sorted(this.inv)).filter((i: any) => (py_item(py_item(ITEMS, i), 0) > 0)).map((i: any) => i);
      if ((!items)) {
        (await (this as any).say("You have nothing to ship.", "Shipping Bin"));
        return;
      }
      opts = py_add(py_iter(items).map((i: any) => `${i} x${py_item(this.inv, i)} ${py_item(py_item(ITEMS, i), 0)}G`), ["Done"]);
      pending = py_sum(py_iter(py_dict_items(this.bin)).map(([i, q]: any) => py_mult(py_item(py_item(ITEMS, i), 0), q)));
      sel = (await (this as any).menu(`Shipping Bin  (in bin: ${pending}G)`, opts));
      if ((py_eq(sel, null) || py_eq(sel, py_len(items)))) {
        return;
      }
      item = py_item(items, sel);
      q = (await (this as any).ask_qty(`Ship how many ${item}?`, py_item(this.inv, item), py_item(py_item(ITEMS, item), 0), "Value"));
      if (q) {
        ((this as any).take(item, q));
        this.bin[item] = py_add(py_dict_get(this.bin, item, 0), q);
        ((this as any).msg(`Shipped ${q} ${item}. Zack will collect it tomorrow morning.`, "09"));
      }
    }
  }

  async rucksack(): Promise<any> {
    let cat: any = undefined; let eat: any = undefined; let gain: any = undefined; let i: any = undefined; let item: any = undefined; let items: any = undefined; let opts: any = undefined; let parts: any = undefined; let s2: any = undefined; let sel: any = undefined; let sell: any = undefined; let sub: any = undefined;
    while (true) {
      items = py_sorted(this.inv);
      if ((!items)) {
        (await (this as any).say("Your rucksack is empty.", null));
        return;
      }
      opts = py_iter(items).map((i: any) => `${(py_eq(i, this.held) ? ">" : " ")} ${i} x${py_item(this.inv, i)}`);
      const info = (s: any) => {
        i = py_item(items, s);
        [sell, eat, cat] = py_item(ITEMS, i);
        parts = [cat];
        if (sell) {
          parts.push(`sells ${sell}G`);
        }
        if (eat) {
          parts.push(`+${eat} stamina`);
        }
        return [py_add("  ", py_iter(parts).join(", "))];
      };
      sel = (await (this as any).menu("Rucksack", opts));
      if (py_eq(sel, null)) {
        return;
      }
      item = py_item(items, sel);
      sub = [(py_eq(this.held, item) ? "Put away" : "Hold (to gift)")];
      if (py_item(py_item(ITEMS, item), 1)) {
        sub.push("Eat");
      }
      sub.push("Cancel");
      s2 = (await (this as any).menu(item, sub));
      if ((py_eq(s2, null) || py_eq(py_item(sub, s2), "Cancel"))) {
        continue;
      }
      if (py_eq(py_item(sub, s2), "Eat")) {
        ((this as any).take(item));
        gain = py_item(py_item(ITEMS, item), 1);
        this.stamina = Math.min(this.max_stamina, py_add(this.stamina, gain));
        ((this as any).msg(`You ate the ${item}. +${gain} stamina.`, "0B"));
      } else {
        if (py_eq(py_item(sub, s2), "Put away")) {
          this.held = null;
          ((this as any).msg(`You put away the ${item}.`));
        } else {
          this.held = item;
          ((this as any).msg(`You hold the ${item} high. Face someone and press X to give it.`));
          return;
        }
      }
    }
  }

  async coop(): Promise<any> {
    let info: any = undefined; let n: any = undefined; let sel: any = undefined;
    while (true) {
      info = [`  Chickens: ${this.chickens}/${((this as any).coop_cap())}   Fed today: ${this.fed}`, `  Eggs waiting: ${this.eggs}   Chicken Feed: ${py_dict_get(this.inv, "Chicken Feed", 0)}`];
      sel = (await (this as any).menu("Chicken Coop", ["Fill feed boxes", "Collect eggs", "Leave"]));
      if (py_eq(sel, 0)) {
        if ((!this.chickens)) {
          (await (this as any).say("The coop is empty. Lillia sells chickens at the Poultry Farm.", null));
          continue;
        }
        n = Math.min((this.chickens - this.fed), py_dict_get(this.inv, "Chicken Feed", 0));
        if ((this.fed >= this.chickens)) {
          (await (this as any).say("Every feed box is already full.", null));
        } else {
          if ((!n)) {
            (await (this as any).say("You're out of Chicken Feed. The Poultry Farm sells it.", null));
          } else {
            ((this as any).take("Chicken Feed", n));
            this.fed += n;
            ((this as any).msg(`You filled ${n} feed box${((n > 1) ? "es" : "")}. Cluck cluck!`, "09"));
          }
        }
      } else {
        if (py_eq(sel, 1)) {
          if (this.eggs) {
            ((this as any).give("Egg", this.eggs));
            ((this as any).msg(`You collected ${this.eggs} egg${((this.eggs > 1) ? "s" : "")}!`, "07"));
            this.eggs = 0;
          } else {
            (await (this as any).say("No eggs today.", null));
          }
        } else {
          return;
        }
      }
    }
  }

  animal_line(a: any): any {
    let h: any = undefined; let kind: any = undefined; let status: any = undefined;
    h = Math.floor(py_item(a, "aff") / 10);
    status = [];
    if ((!py_item(a, "fed"))) {
      status.push("hungry");
    }
    if ((py_eq(py_item(a, "kind"), "cow") && py_item(a, "ready"))) {
      status.push("milk ready");
    }
    if ((py_eq(py_item(a, "kind"), "sheep") && (py_item(a, "wool") >= WOOL_DAYS))) {
      status.push("wool ready");
    }
    kind = py_item(py_item(ANIMALS, py_item(a, "kind")), 0);
    return `${py_item(a, "name")} ${kind} [${py_mult("#", h)}${py_mult(".", (10 - h))}] ${py_iter(status).join(", ")}`;
  }

  async barn(): Promise<any> {
    let info: any = undefined; let opts: any = undefined; let sel: any = undefined; let tools: any = undefined; let unfed: any = undefined;
    sel = 0;
    while (true) {
      unfed = py_sum(py_iter(this.animals).filter((a: any) => (!py_item(a, "fed"))).map((a: any) => 1));
      tools = py_iter(py_iter(["Milker", "Clippers", "Brush"]).filter((t: any) => py_dict_get(this.inv, t)).map((t: any) => t)).join(", ");
      info = [`  Animals: ${py_len(this.animals)}/${BARN_CAP}   Hungry: ${unfed}   Fodder: ${py_dict_get(this.inv, "Fodder", 0)}`, `  Tools: ${(tools || "none (sold at Yodel Ranch)")}`];
      opts = py_add(py_add(["Fill fodder boxes"], py_iter(this.animals).map((a: any) => ((this as any).animal_line(a)))), ["Leave"]);
      sel = (await (this as any).menu("Barn", opts));
      if ((py_eq(sel, null) || py_eq(sel, (py_len(opts) - 1)))) {
        return;
      }
      if (py_eq(sel, 0)) {
        (await (this as any).barn_feed());
      } else {
        (await (this as any).animal_care(py_item(this.animals, (sel - 1))));
        if (py_eq(this.mapname, "house")) {
          return;
        }
      }
    }
  }

  async barn_feed(): Promise<any> {
    let a: any = undefined; let hungry: any = undefined; let n: any = undefined;
    if ((!this.animals)) {
      (await (this as any).say("The barn is empty. Barley sells cows and sheep at Yodel Ranch.", null));
      return;
    }
    hungry = py_iter(this.animals).filter((a: any) => (!py_item(a, "fed"))).map((a: any) => a);
    if ((!hungry)) {
      (await (this as any).say("Every fodder box is already full.", null));
      return;
    }
    n = Math.min(py_len(hungry), py_dict_get(this.inv, "Fodder", 0));
    if ((!n)) {
      (await (this as any).say("You're out of Fodder. Yodel Ranch sells it.", null));
      return;
    }
    ((this as any).take("Fodder", n));
    for (let a of py_iter(py_slice(hungry, null, n))) {
      a["fed"] = true;
    }
    ((this as any).msg(`You filled ${n} fodder box${((n > 1) ? "es" : "")}. Moo!`, "09"));
  }

  async animal_care(a: any): Promise<any> {
    let act: any = undefined; let item: any = undefined; let left: any = undefined; let name: any = undefined; let opts: any = undefined; let sel: any = undefined; let sound: any = undefined;
    while (true) {
      name = py_item(a, "name");
      opts = ["Talk"];
      if (py_dict_get(this.inv, "Brush")) {
        opts.push("Brush");
      }
      if ((py_eq(py_item(a, "kind"), "cow") && py_dict_get(this.inv, "Milker"))) {
        opts.push("Milk");
      }
      if ((py_eq(py_item(a, "kind"), "sheep") && py_dict_get(this.inv, "Clippers"))) {
        opts.push("Shear");
      }
      opts.push("Back");
      sel = (await (this as any).menu(((this as any).animal_line(a)), opts));
      if ((py_eq(sel, null) || py_eq(py_item(opts, sel), "Back"))) {
        return;
      }
      act = py_item(opts, sel);
      if (py_eq(act, "Talk")) {
        if (py_item(a, "talked")) {
          (await (this as any).say(`${name} looks at you contentedly.`, name));
        } else {
          a["talked"] = true;
          a["aff"] = Math.min(100, py_add(py_item(a, "aff"), 1));
          sound = (py_eq(py_item(a, "kind"), "cow") ? "Moooo!" : "Baaaa!");
          (await (this as any).say(`${sound} ${name} seems happy to see you.`, name));
        }
      } else {
        if (py_eq(act, "Brush")) {
          if (py_item(a, "brushed")) {
            (await (this as any).say(`${name}'s coat is already shiny.`, name));
          } else {
            a["brushed"] = true;
            a["aff"] = Math.min(100, py_add(py_item(a, "aff"), 2));
            ((this as any).msg(`You brushed ${name}. ${name} looks pleased!`, "0B"));
            (await (this as any).spend(1));
          }
        } else {
          if (py_eq(act, "Milk")) {
            if ((!py_item(a, "ready"))) {
              (await (this as any).say(`${name} has no milk right now. Feed ${name} today and try tomorrow.`, null));
            } else {
              a["ready"] = false;
              a["aff"] = Math.min(100, py_add(py_item(a, "aff"), 1));
              item = ((py_item(a, "aff") >= 80) ? "Large Milk" : ((py_item(a, "aff") >= 40) ? "Medium Milk" : "Small Milk"));
              ((this as any).give(item));
              ((this as any).msg(`You milked ${name}: ${item}!`, "07"));
              (await (this as any).spend(2));
            }
          } else {
            if (py_eq(act, "Shear")) {
              if ((py_item(a, "wool") < WOOL_DAYS)) {
                left = (WOOL_DAYS - py_item(a, "wool"));
                (await (this as any).say(`${name}'s wool needs ${left} more well-fed day${((left > 1) ? "s" : "")} to grow back.`, null));
              } else {
                a["wool"] = 0;
                a["aff"] = Math.min(100, py_add(py_item(a, "aff"), 1));
                item = ((py_item(a, "aff") >= 70) ? "Large Wool" : "Wool");
                ((this as any).give(item));
                ((this as any).msg(`You sheared ${name}: ${item}!`, "07"));
                (await (this as any).spend(2));
              }
            }
          }
        }
      }
      if (py_eq(this.mapname, "house")) {
        return;
      }
    }
  }

  async buy_animal(kind: any): Promise<any> {
    let label: any = undefined; let name: any = undefined; let names: any = undefined; let price: any = undefined; let py_default: any = undefined; let taken: any = undefined;
    [label, price] = py_item(ANIMALS, kind);
    if ((py_len(this.animals) >= BARN_CAP)) {
      (await (this as any).say("Your barn is full!", "Barley"));
      return;
    }
    if ((this.gold < price)) {
      (await (this as any).say(`A ${label.toLowerCase()} is ${price}G. Come back when you've saved up.`, "Barley"));
      return;
    }
    if ((!(await (this as any).confirm(`Buy a ${label.toLowerCase()} for ${price}G?`)))) {
      return;
    }
    names = (py_eq(kind, "cow") ? COW_NAMES : SHEEP_NAMES);
    taken = new Set(py_iter(this.animals).map((a: any) => py_item(a, "name")));
    py_default = py_next(py_iter(names).filter((n: any) => (!py_in(n, taken))).map((n: any) => n), `${label}${py_add(py_len(this.animals), 1)}`);
    name = py_slice((await (this as any).text_input(`Name your ${label.toLowerCase()}:`, py_default)), null, 10);
    this.gold -= price;
    this.animals.push({ ["name"]: name, ["kind"]: kind, ["aff"]: 10, ["fed"]: false, ["ready"]: false, ["wool"]: 0, ["talked"]: false, ["brushed"]: false });
    (await (this as any).say(`${name} will be waiting in your barn. Fill the fodder box every day!`, "Barley"));
  }

  async buy_barn_tool(item: any, price: any): Promise<any> {
    if (py_dict_get(this.inv, item)) {
      (await (this as any).say(`You already have a ${item}.`, "Barley"));
    } else {
      if ((this.gold < price)) {
        (await (this as any).say(`The ${item} is ${price}G.`, "Barley"));
      } else {
        if ((await (this as any).confirm(`Buy a ${item} for ${price}G?`))) {
          this.gold -= price;
          ((this as any).give(item));
          ((this as any).msg(`Bought a ${item}.`, "09"));
        }
      }
    }
  }

  barn_new_day(report: any): any {
    let a: any = undefined; let hungry: any = undefined; let ready: any = undefined;
    hungry = 0;
    for (let a of py_iter(this.animals)) {
      if (py_item(a, "fed")) {
        if (py_eq(py_item(a, "kind"), "cow")) {
          a["ready"] = true;
        } else {
          a["wool"] = Math.min(WOOL_DAYS, py_add(py_item(a, "wool"), 1));
        }
      } else {
        hungry += 1;
        a["aff"] = Math.max(0, (py_item(a, "aff") - 5));
      }
      a["fed"] = false;
      a["talked"] = false;
      a["brushed"] = false;
    }
    if (hungry) {
      report.push(`${hungry} barn animal${((hungry > 1) ? "s" : "")} went hungry yesterday.`);
    }
    ready = py_iter(this.animals).filter((a: any) => ((py_eq(py_item(a, "kind"), "cow") && py_item(a, "ready")) || (py_eq(py_item(a, "kind"), "sheep") && (py_item(a, "wool") >= WOOL_DAYS)))).map((a: any) => py_item(a, "name"));
    if (ready) {
      report.push(`Ready in the barn: ${py_iter(ready).join(", ")}.`);
    }
  }

  async visit(bid: any): Promise<any> {
    if ((!(await (this as any).building_open(bid)))) {
      return;
    }
    if (py_in(bid, this.interiors)) {
      ((this as any).enter_interior(bid));
      return;
    }
    (await (this as any).shop_menu(bid));
  }

  async building_open(bid: any): Promise<any> {
    let c: any = undefined; let closed: any = undefined; let days: any = undefined; let name: any = undefined; let o: any = undefined;
    if ((await (this as any).fest_closed(bid))) {
      return false;
    }
    name = py_item(BUILDINGS, bid);
    [o, c, closed] = py_item(HOURS, bid);
    if ((py_in(this.weekday, closed) || (!(py_mult(o, 60) <= this.minutes) && (this.minutes < py_mult(c, 60))))) {
      days = py_iter(py_iter(py_sorted(closed)).map((d: any) => py_item(WEEKDAYS, d))).join(", ");
      (await (this as any).say(`The ${name} is closed. Open ${fmt_hour(o)} - ${fmt_hour(c)}${(days ? py_add(", closed ", days) : "")}.`, null));
      return false;
    }
    return true;
  }

  async shop_menu(bid: any, people_fn: any = null): Promise<any> {
    let name: any = undefined; let opts: any = undefined; let people: any = undefined; let sel: any = undefined; let shop: any = undefined;
    name = py_item(BUILDINGS, bid);
    while (true) {
      if (people_fn) {
        people = people_fn();
      } else {
        people = py_iter(py_dict_items(NPCS)).filter(([n, d]: any) => (py_eq(py_item(d, "home"), bid) && (!((this as any).is_out(n))) && (!py_eq(n, this.married)))).map(([n, d]: any) => n);
      }
      shop = (await (this as any).shop_options(bid));
      opts = py_add(py_add(py_iter(shop).map((s: any) => py_item(s, 0)), py_iter(people).map((p: any) => `Talk to ${p}`)), ["Leave"]);
      sel = (await (this as any).menu(`${name}   ${this.gold}G`, opts));
      if ((py_eq(sel, null) || py_eq(sel, (py_len(opts) - 1)))) {
        return;
      }
      if ((sel < py_len(shop))) {
        (py_item(py_item(shop, sel), 1))();
      } else {
        (await (this as any).talk(py_item(people, (sel - py_len(shop)))));
      }
    }
  }

  build_interiors(): any {
    let bid: any = undefined; let dx: any = undefined; let dy: any = undefined; let entry: any = undefined; let front: any = undefined; let im: any = undefined; let m: any = undefined; let mname: any = undefined; let spots: any = undefined;
    "Create an interior for every building door that has a layout.";
    this.interiors = {  };
    this.interior_bid = {  };
    this.indoor_npcs = {  };
    for (let [mname, m] of py_iter(Array.from(py_iter(py_dict_items(this.maps) || [])))) {
      for (let [[dx, dy], bid] of py_iter(py_dict_items(m.doors))) {
        if (((!py_in(bid, INTERIOR_LAYOUTS)) || py_in(bid, this.interiors))) {
          continue;
        }
        front = py_next(py_iter([[0, 1], [0, (-1)], [1, 0], [(-1), 0]]).filter(([ox, oy]: any) => py_item(py_item(TILES, m.tile(py_add(dx, ox), py_add(dy, oy))), 3)).map(([ox, oy]: any) => [py_add(dx, ox), py_add(dy, oy)]), [dx, py_add(dy, 1)]);
        [im, entry, spots] = build_interior(bid, [mname, ...((py_iter(front) || []) as [any, any, any])]);
        this.maps[im.name] = im;
        this.interiors[bid] = { ["map"]: im.name, ["entry"]: entry, ["spots"]: spots };
        this.interior_bid[im.name] = bid;
      }
    }
  }

  enter_interior(bid: any): any {
    let info: any = undefined;
    info = py_item(this.interiors, bid);
    ((this as any).warp(py_item(info, "map"), ...((py_iter(py_item(info, "entry")) || []) as [any, any, any]), [0, (-1)]));
    ((this as any).msg(`You step into the ${py_item(BUILDINGS, bid)}.`, "0C"));
  }

  keeper_of(bid: any): any {
    return py_next(py_iter(py_dict_items(NPCS)).filter(([n, d]: any) => (py_eq(py_item(d, "home"), bid) && (!py_item(d, "out")))).map(([n, d]: any) => n), null);
  }

  update_indoor_npcs(): any {
    let anchor: any = undefined; let bid: any = undefined; let d: any = undefined; let fixed: any = undefined; let i: any = undefined; let info: any = undefined; let keeper: any = undefined; let n: any = undefined; let pos: any = undefined; let residents: any = undefined; let spots: any = undefined;
    for (let [n, d] of py_iter(py_dict_items(NPCS))) {
      info = py_dict_get(this.interiors, py_item(d, "home"));
      if (((!info) || ((this as any).is_out(n)) || py_eq(n, this.married))) {
        this.indoor_npcs.pop(n, null);
        continue;
      }
      if (py_in(n, this.indoor_npcs)) {
        continue;
      }
      bid = py_item(d, "home");
      keeper = ((this as any).keeper_of(bid));
      residents = py_iter(py_dict_items(NPCS)).filter(([r, rd]: any) => (py_eq(py_item(rd, "home"), bid) && (!py_eq(r, keeper)))).map(([r, rd]: any) => r);
      spots = py_item(info, "spots");
      if ((py_eq(n, keeper) && py_in("k", spots))) {
        [pos, fixed] = [py_item(spots, "k"), true];
      } else {
        i = residents.indexOf(n);
        pos = py_dict_get(spots, String(py_add(i, 1)));
        if ((py_eq(pos, null) || ((this as any).npc_at(...((py_iter(pos) || []) as [any, any, any]))))) {
          anchor = py_dict_get(spots, "1", py_item(info, "entry"));
          pos = ((this as any).free_spot(py_item(info, "map"), ...((py_iter(anchor) || []) as [any, any, any])));
        }
        fixed = false;
      }
      if (pos) {
        this.indoor_npcs[n] = { ["map"]: py_item(info, "map"), ["pos"]: pos, ["home"]: pos, ["fixed"]: fixed };
      }
    }
  }

  indoor_npc_at(x: any, y: any, mapname: any): any {
    let d: any = undefined; let n: any = undefined;
    for (let [n, d] of py_iter(py_dict_items(this.indoor_npcs))) {
      if ((py_eq(py_item(d, "map"), mapname) && py_eq(py_item(d, "pos"), [x, y]) && (!py_eq(n, this.married)))) {
        return n;
      }
    }
    return null;
  }

  move_indoor_npcs(): any {
    let d: any = undefined; let dx: any = undefined; let dy: any = undefined; let hx: any = undefined; let hy: any = undefined; let n: any = undefined; let nx: any = undefined; let ny: any = undefined; let x: any = undefined; let y: any = undefined;
    for (let [n, d] of py_iter(py_dict_items(this.indoor_npcs))) {
      if (((!py_eq(py_item(d, "map"), this.mapname)) || py_item(d, "fixed") || (py_rng().random() > 0.35))) {
        continue;
      }
      [[x, y], [hx, hy]] = [py_item(d, "pos"), py_item(d, "home")];
      [dx, dy] = py_rng().choice([[1, 0], [(-1), 0], [0, 1], [0, (-1)]]);
      [nx, ny] = [py_add(x, dx), py_add(y, dy)];
      if (((Math.abs((nx - hx)) > 2) || (Math.abs((ny - hy)) > 2))) {
        continue;
      }
      if (py_eq([nx, ny], py_item(py_item(this.interiors, py_item(this.interior_bid, py_item(d, "map"))), "entry"))) {
        continue;
      }
      if ((((this as any).walkable(py_item(d, "map"), nx, ny, true)) && (!((this as any).npc_at(nx, ny))) && (!py_eq([nx, ny], [this.px, this.py])))) {
        d["pos"] = [nx, ny];
      }
    }
  }

  async interior_interact(tile: any, p: any): Promise<any> {
    let behind: any = undefined; let bid: any = undefined;
    bid = py_dict_get(this.interior_bid, this.mapname);
    if (py_eq(tile, "bookcase")) {
      (await (this as any).say(py_rng().choice(BOOKS), "Book"));
      return;
    }
    if ((!bid)) {
      return;
    }
    behind = ((this as any).npc_at(py_add(py_item(p, 0), py_item(this.face, 0)), py_add(py_item(p, 1), py_item(this.face, 1))));
    (await (this as any).shop_menu(bid, (() => (behind ? [behind] : []))));
  }

  async shop_options(bid: any): Promise<any> {
    if (py_eq(bid, "supermarket")) {
      return [["Buy seeds", this.buy_seeds], ["Buy Bread (100G)", (async () => (await (this as any).buy("Bread", 100)))], ["Buy Blue Feather (1000G)", (async () => (await (this as any).buy("Blue Feather", 1000, 1)))], ["Buy kitchen goods", this.buy_kitchen_goods]];
    }
    if (py_eq(bid, "carpenter")) {
      return [["Buy Lumber (50G)", (async () => (await (this as any).buy("Lumber", 50)))], ["Order a house expansion", this.order_expansion]];
    }
    if (py_eq(bid, "poultry")) {
      return [["Buy a chicken (1500G)", this.buy_chicken], ["Buy Chicken Feed (10G)", (async () => (await (this as any).buy("Chicken Feed", 10)))]];
    }
    if (py_eq(bid, "blacksmith")) {
      return [["Upgrade a tool", this.upgrade_tool]];
    }
    if (py_eq(bid, "inn")) {
      return [["Eat lunch (300G, +50 stamina)", this.inn_lunch]];
    }
    if (py_eq(bid, "clinic")) {
      return [["Buy Bodigizer (500G)", (async () => (await (this as any).buy("Bodigizer", 500)))], ["Get a checkup", this.checkup]];
    }
    if (py_eq(bid, "library")) {
      return [["Read a book", (async () => (await (this as any).say(py_rng().choice(BOOKS), "Book")))]];
    }
    if (py_eq(bid, "church")) {
      return [["Pray", this.pray]];
    }
    if (py_eq(bid, "mayor")) {
      return [["Ask about your farm", this.farm_report]];
    }
    if (py_eq(bid, "yodel")) {
      return [["Buy Milk (150G)", (async () => (await (this as any).buy("Milk", 150)))], ["Buy a cow (5000G)", (async () => (await (this as any).buy_animal("cow")))], ["Buy a sheep (4000G)", (async () => (await (this as any).buy_animal("sheep")))], ["Buy Fodder (20G)", (async () => (await (this as any).buy("Fodder", 20)))], ["Buy Milker (2000G)", (async () => (await (this as any).buy_barn_tool("Milker", 2000)))], ["Buy Clippers (1800G)", (async () => (await (this as any).buy_barn_tool("Clippers", 1800)))], ["Buy Brush (800G)", (async () => (await (this as any).buy_barn_tool("Brush", 800)))]];
    }
    return [];
  }

  async buy(item: any, price: any, limit: any = 99): Promise<any> {
    let maxq: any = undefined; let q: any = undefined;
    maxq = Math.min(limit, Math.floor(this.gold / price));
    if ((maxq <= 0)) {
      (await (this as any).say("You can't afford that.", null));
      return;
    }
    q = (await (this as any).ask_qty(`Buy how many ${item}?`, maxq, price, "Cost"));
    if (q) {
      this.gold -= py_mult(q, price);
      ((this as any).give(item, q));
      ((this as any).msg(`Bought ${q} ${item} for ${py_mult(q, price)}G.`, "09"));
    }
  }

  async buy_seeds(): Promise<any> {
    let crops: any = undefined; let d: any = undefined; let opts: any = undefined; let regrow: any = undefined; let sel: any = undefined;
    crops = py_iter(py_dict_items(CROPS)).filter(([c, d]: any) => py_eq(py_item(d, 0), this.season_name)).map(([c, d]: any) => c);
    if ((!crops)) {
      (await (this as any).say("Nothing grows in winter, dear. Come back in Spring!", "Jeff"));
      return;
    }
    opts = py_iter(crops).map((c: any) => `${py_add(c, " Seeds")} ${py_item(py_item(CROPS, c), 1)}G`);
    const info = (s: any) => {
      d = py_item(CROPS, py_item(crops, s));
      regrow = (py_item(d, 3) ? `, regrows every ${py_item(d, 3)}d` : "");
      return [`  ${py_item(d, 2)} days to grow${regrow}`, `  sells for ${py_item(d, 4)}G each, sows 3x3`];
    };
    sel = (await (this as any).menu(`Seeds   ${this.gold}G`, opts));
    if ((!py_eq(sel, null))) {
      (await (this as any).buy(py_add(py_item(crops, sel), " Seeds"), py_item(py_item(CROPS, py_item(crops, sel)), 1)));
    }
  }

  async buy_chicken(): Promise<any> {
    if ((this.chickens >= ((this as any).coop_cap()))) {
      (await (this as any).say("Your coop is full!", "Lillia"));
    } else {
      if ((this.gold < 1500)) {
        (await (this as any).say("A chicken is 1500G. Come back when you've saved up.", "Lillia"));
      } else {
        if ((await (this as any).confirm("Buy a chicken for 1500G?"))) {
          this.gold -= 1500;
          this.chickens += 1;
          (await (this as any).say("Rick will bring it to your coop. Remember to fill its feed box!", "Lillia"));
        }
      }
    }
  }

  async upgrade_tool(): Promise<any> {
    let cost: any = undefined; let lvl: any = undefined; let opts: any = undefined; let ore: any = undefined; let sel: any = undefined; let t: any = undefined;
    if (this.upgrading) {
      (await (this as any).say(`I'm still working on your ${py_item(this.upgrading, 0)}. Hmph. Patience.`, "Saibara"));
      return;
    }
    opts = [];
    for (let t of py_iter(UPGRADABLE)) {
      lvl = py_item(this.levels, t);
      if ((lvl >= 4)) {
        opts.push(`${t} (Mystrile - maxed)`);
      } else {
        [cost, ore] = py_item(UPGRADE, py_add(lvl, 1));
        opts.push(`${t} -> ${py_item(LEVELS, py_add(lvl, 1))} ${cost}G + 3 ${ore}`);
      }
    }
    sel = (await (this as any).menu("Upgrade which tool?", opts));
    if (py_eq(sel, null)) {
      return;
    }
    t = py_item(UPGRADABLE, sel);
    lvl = py_item(this.levels, t);
    if ((lvl >= 4)) {
      (await (this as any).say("That tool is already the finest it can be.", "Saibara"));
      return;
    }
    [cost, ore] = py_item(UPGRADE, py_add(lvl, 1));
    if (((this.gold < cost) || (py_dict_get(this.inv, ore, 0) < 3))) {
      (await (this as any).say(`I need ${cost}G and 3 ${ore} ore. Find ore in the mine on Mother's Hill.`, "Saibara"));
      return;
    }
    this.gold -= cost;
    ((this as any).take(ore, 3));
    this.upgrading = [t, py_add(((this as any).absday()), 2)];
    if (py_eq(this.tool, t)) {
      this.tool = "Sickle";
    }
    (await (this as any).say(`Leave your ${t} with me. Come back in two days. Hmph.`, "Saibara"));
  }

  async inn_lunch(): Promise<any> {
    if ((this.gold < 300)) {
      (await (this as any).say("Lunch is 300G, friend.", "Doug"));
      return;
    }
    this.gold -= 300;
    this.stamina = Math.min(this.max_stamina, py_add(this.stamina, 50));
    (await (this as any).say("Here you go - Doug's special! You feel refreshed. (+50 stamina)", "Doug"));
  }

  async checkup(): Promise<any> {
    let s: any = undefined; let verdict: any = undefined;
    s = this.stamina;
    verdict = ((s > 70) ? "You're in excellent shape." : ((s > 30) ? "You're a little tired." : "You're exhausted! Rest, and eat something."));
    (await (this as any).say(`Stamina ${s}/${this.max_stamina}. ${verdict}`, "Doctor"));
  }

  async pray(): Promise<any> {
    if (this.prayed) {
      (await (this as any).say("You sit quietly for a while. Your mind is at peace.", null));
      return;
    }
    this.prayed = true;
    this.stamina = Math.min(this.max_stamina, py_add(this.stamina, 10));
    (await (this as any).say("You pray to the Harvest Goddess. You feel a gentle warmth. (+10 stamina)", null));
  }

  async farm_report(): Promise<any> {
    let best: any = undefined; let lines: any = undefined; let n: any = undefined; let v: any = undefined;
    best = py_slice(py_sorted(py_iter(py_dict_items(this.friend)).map(([n, v]: any) => [v, n])), null, 6);
    lines = [`  Gold: ${this.gold}G     Total shipped: ${this.shipped_total}G`, `  Tilled: ${py_len(this.tilled)}  Crops growing: ${py_len(this.crops)}  Chickens: ${this.chickens}`, `  Spouse: ${(this.married || "-")}`, "", "  Friends:"];
    for (let [v, n] of py_iter(best)) {
      lines.push(`   ${n} ${py_item(((this as any).hearts(n)), 0)}`);
    }
    (await (this as any).show_lines("Mayor Thomas: Your Farm", lines));
  }

  fest_date(offset: any = 0): any {
    let n: any = undefined;
    n = py_add((this.day - 1), offset);
    return [(py_add(this.season, Math.floor(n / 30)) % 4), py_add((n % 30), 1)];
  }

  fest_on(offset: any = 0): any {
    return py_dict_get(FESTIVALS, ((this as any).fest_date(offset)));
  }

  fest_active(): any {
    let f: any = undefined;
    f = ((this as any).fest_on());
    return ((f && (py_mult(py_item(f, 1), 60) <= this.minutes) && (this.minutes < py_mult(py_item(f, 2), 60))) ? f : null);
  }

  birthdays(offset: any = 0): any {
    let when: any = undefined;
    when = ((this as any).fest_date(offset));
    return py_iter(py_dict_items(BIRTHDAYS)).filter(([n, d]: any) => py_eq(d, when)).map(([n, d]: any) => n);
  }

  fest_sync(): any {
    let NPCS: any = undefined; let f: any = undefined; let i: any = undefined; let n: any = undefined; let saved: any = undefined; let w: any = undefined; let x: any = undefined; let y: any = undefined;
    "Gather everyone around the fountain while a festival is on.";
    f = ((this as any).fest_active());
    saved = ((this as any)["_fest_saved"]);
    if ((f && py_eq(saved, null))) {
      this._fest_saved = Object.fromEntries(py_iter(py_dict_items(NPCS)).map(([n, d]: any) => [n, py_item(d, "where")]));
      for (let [i, n] of py_iter(enumerate(NPCS))) {
        [x, y] = py_item(FEST_SPOTS, (i % py_len(FEST_SPOTS)));
        py_item(NPCS, n)["where"] = ["town", x, y];
      }
      this.npc_pos = {  };
      if ((!this.fest_attended)) {
        ((this as any).msg(`The ${py_item(f, 0)} has begun in Rose Square!`, "0A"));
      }
    } else {
      if (((!f) && (!py_eq(saved, null)))) {
        for (let [n, w] of py_iter(py_dict_items(saved))) {
          py_item(NPCS, n)["where"] = w;
        }
        this._fest_saved = null;
        this.npc_pos = {  };
      }
    }
  }

  fest_is_out(n: any): any {
    if ((py_eq(n, this.married) || (!((this as any).fest_active())))) {
      return null;
    }
    return true;
  }

  async fest_check(): Promise<any> {
    let f: any = undefined;
    f = ((this as any).fest_active());
    if (((!f) || (!py_eq(this.mapname, "town")) || this.fest_attended || this.fest_declined)) {
      return;
    }
    if ((!((29 <= this.px) && (this.px <= 43) && (8 <= this.py) && (this.py <= 19)))) {
      return;
    }
    if ((await (this as any).confirm(`The ${py_item(f, 0)} is underway! Join in?`))) {
      (await (this as any).fest_run(f));
    } else {
      this.fest_declined = true;
      ((this as any).msg("Talk to Mayor Thomas when you're ready to join in."));
    }
  }

  async fest_talk(n: any): Promise<any> {
    let f: any = undefined;
    f = ((this as any).fest_active());
    if (((!py_eq(n, "Thomas")) || (!f) || this.held || this.fest_attended)) {
      return false;
    }
    if ((await (this as any).confirm(`Join the ${py_item(f, 0)}?`))) {
      (await (this as any).fest_run(f));
      return true;
    }
    return false;
  }

  async fest_run(f: any): Promise<any> {
    let _: any = undefined; let end: any = undefined; let kind: any = undefined; let name: any = undefined;
    [name, _, end, kind] = f;
    this.fest_attended = true;
    (await (this as any).say(`Welcome, everyone, to the ${name}! Ho ho!`, "Thomas"));
    (((this as any)[py_add("fest_ev_", kind)]))();
    this.minutes = Math.max(this.minutes, py_mult(end, 60));
    (await (this as any).say(`The ${name} draws to a close, and everyone heads home.`, null));
    ((this as any).update_npcs());
    this.last = (Date.now() / 1000);
  }

  fest_new_day(report: any): any {
    let f: any = undefined; let n: any = undefined; let t: any = undefined;
    this.fest_attended = false;
    this.fest_declined = false;
    f = ((this as any).fest_on());
    if (f) {
      report.push(`Today is the ${py_item(f, 0)}! Head to Rose Square between ${fmt_hour(py_item(f, 1))} and ${fmt_hour(py_item(f, 2))}. Shops are closed.`);
    }
    t = ((this as any).fest_on(1));
    if (t) {
      report.push(`Tomorrow is the ${py_item(t, 0)}.`);
    }
    for (let n of py_iter(((this as any).birthdays()))) {
      report.push(`It's ${n}'s birthday today! A gift would mean a lot.`);
    }
  }

  async fest_closed(bid: any): Promise<any> {
    let f: any = undefined;
    f = ((this as any).fest_on());
    if (((!f) || py_eq(bid, "church"))) {
      return false;
    }
    (await (this as any).say(`A sign on the door: 'Closed today for the ${py_item(f, 0)}. See you in Rose Square!'`, null));
    return true;
  }

  birthday_gift(n: any, pts: any, line: any): any {
    if ((!py_in(n, ((this as any).birthdays())))) {
      return [pts, line];
    }
    if ((pts > 0)) {
      return [py_add(py_mult(pts, 2), 2), py_add(line, " And on my birthday! You remembered!")];
    }
    return [pts, py_add(line, " ...On my birthday, too.")];
  }

  fest_news(): any {
    let f: any = undefined; let n: any = undefined; let parts: any = undefined; let t: any = undefined;
    parts = [];
    f = ((this as any).fest_on());
    if (f) {
      parts.push(`Today: the ${py_item(f, 0)} in Rose Square, ${fmt_hour(py_item(f, 1))}-${fmt_hour(py_item(f, 2))}.`);
    }
    t = ((this as any).fest_on(1));
    if (t) {
      parts.push(`Tomorrow: the ${py_item(t, 0)}.`);
    }
    for (let n of py_iter(((this as any).birthdays()))) {
      parts.push(`Happy birthday to ${n}!`);
    }
    for (let n of py_iter(((this as any).birthdays(1)))) {
      parts.push(`Tomorrow is ${n}'s birthday.`);
    }
    return (parts ? py_add("  ", py_iter(parts).join(" ")) : "");
  }

  async fest_calendar(): Promise<any> {
    let d: any = undefined; let f: any = undefined; let lines: any = undefined; let n: any = undefined; let off: any = undefined; let s: any = undefined; let when: any = undefined;
    lines = [];
    for (let off of py_iter(py_range(0, 31))) {
      [s, d] = ((this as any).fest_date(off));
      when = `${(py_eq(off, 0) ? "today" : (py_eq(off, 1) ? "tomorrow" : `in ${off} days`))}`;
      f = py_dict_get(FESTIVALS, [s, d]);
      if (f) {
        lines.push(` ${py_item(SEASONS, s)} ${d}  ${when}  ${py_item(f, 0)}`);
      }
      for (let n of py_iter(((this as any).birthdays(off)))) {
        lines.push(` ${py_item(SEASONS, s)} ${d}  ${when}  ${n}'s birthday`);
      }
    }
    (await (this as any).show_lines("Upcoming events", py_slice((lines || [" Nothing planned."]), null, 12)));
  }

  fest_bachs(): any {
    return py_iter(py_dict_items(NPCS)).filter(([n, d]: any) => py_item(d, "bach")).map(([n, d]: any) => n);
  }

  fest_bond(n: any, pts: any): any {
    this.friend[n] = clamp(py_add(py_item(this.friend, n), pts), 0, 100);
  }

  async fest_pick(title: any, names: any): Promise<any> {
    let opts: any = undefined; let sel: any = undefined;
    opts = py_add(py_iter(names).map((n: any) => `${n} ${py_item(((this as any).hearts(n)), 0)}`), ["No one"]);
    sel = (await (this as any).menu(title, opts));
    return (((!py_eq(sel, null)) && (sel < py_len(names))) ? py_item(names, sel) : null);
  }

  fest_win(name: any): any {
    if ((!py_in(name, this.fest_wins))) {
      this.fest_wins.push(name);
    }
  }

  async fest_ev_newyear(): Promise<any> {
    let n: any = undefined;
    (await (this as any).say("Let's welcome the new year together! Doug made rice cakes for everyone!", "Thomas"));
    this.stamina = this.max_stamina;
    for (let n of py_iter(NPCS)) {
      ((this as any).fest_bond(n, 2));
    }
    (await (this as any).say("You share rice cakes and good wishes with the whole town. (Stamina restored, everyone likes you a little more.)", null));
  }

  async fest_ev_goddess(): Promise<any> {
    let n: any = undefined;
    (await (this as any).say("Every spring the young women of town dance to thank the Harvest Goddess.", "Thomas"));
    (await (this as any).say("Mary, Karen, Popuri, Elli and Ann step into the square in flowing white dresses.", null));
    n = (await (this as any).fest_pick("Who do you cheer for?", ((this as any).fest_bachs())));
    if (n) {
      ((this as any).fest_bond(n, 5));
      (await (this as any).say(`You cheer for ${n}. She catches your eye mid-dance and smiles.`, null));
    }
    ((this as any).give("Strawberry Seeds"));
    (await (this as any).say("A warm breeze carries the Goddess's blessing. You receive a bag of Strawberry Seeds.", null));
  }

  async fest_ev_dance(): Promise<any> {
    let n: any = undefined;
    (await (this as any).say("The square is covered in flowers. Now, everyone, find a partner and dance!", "Thomas"));
    n = (await (this as any).fest_pick("Ask someone to dance", ((this as any).fest_bachs())));
    if ((!n)) {
      (await (this as any).say("You watch the dancers from the edge of the square.", null));
    } else {
      if (((py_item(this.friend, n) >= 20) || py_eq(n, this.married))) {
        ((this as any).fest_bond(n, 8));
        (await (this as any).say("I'd love to! ...You're not a bad dancer, you know.", n));
      } else {
        ((this as any).fest_bond(n, 1));
        (await (this as any).say("Oh! Um... maybe next year? I don't know you that well yet.", n));
      }
    }
  }

  async fest_mash(duration: any, rival: any, title: any): Promise<any> {
    let H: any = undefined; let W: any = undefined; let bar: any = undefined; let bx: any = undefined; let by: any = undefined; let el: any = undefined; let k: any = undefined; let last: any = undefined; let n: any = undefined; let side: any = undefined; let start: any = undefined; let them: any = undefined; let you: any = undefined;
    "Alternate left/right as fast as possible. Returns presses counted.";
    [start, n, last] = [(Date.now() / 1000), 0, null];
    [W, H] = [this.scr.w, this.scr.h];
    while (true) {
      el = ((Date.now() / 1000) - start);
      if ((el >= duration)) {
        break;
      }
      const draw = () => {
        [bx, by] = [Math.floor((W - 50) / 2), (Math.floor(H / 2) - 4)];
        this.scr.box(bx, by, 50, 7, "0D", "00", title);
        bar = 32;
        you = Math.min(bar, Math.floor(py_mult(n, bar) / Math.max(1, py_add(rival, 8))));
        them = Math.min(bar, Math.floor(py_mult(Math.floor(Number((py_mult(rival, el) / duration))), bar) / Math.max(1, py_add(rival, 8))));
        this.scr.put(py_add(bx, 2), py_add(by, 2), py_add(py_add(py_add("You   [", py_mult("#", you)), py_mult(".", (bar - you))), "]"), "0B");
        this.scr.put(py_add(bx, 2), py_add(by, 3), py_add(py_add(py_add("Rival [", py_mult("#", them)), py_mult(".", (bar - them))), "]"), "08");
        this.scr.put(py_add(bx, 2), py_add(by, 5), `LEFT / RIGHT alternately!   ${(duration - el)}s`, "07", "00", true);
      };
      ((this as any).render());
      draw();
      this.scr.flush();
      k = (await this.scr.getKey(0.03));
      if (py_in(k, ["left", "a", "h", "right", "d", "l"])) {
        side = (py_in(k, ["left", "a", "h"]) ? "L" : "R");
        if ((!py_eq(side, last))) {
          n += 1;
          last = side;
        }
      }
    }
    this.last = (Date.now() / 1000);
    return n;
  }

  async fest_ev_sumo(): Promise<any> {
    let rival: any = undefined; let score: any = undefined;
    (await (this as any).say("Chicken Sumo! Each farmer's hen tries to push the other out of the ring!", "Thomas"));
    if ((!this.chickens)) {
      (await (this as any).say("You don't have a chicken to enter, so you watch Rick's hen win again.", null));
      return;
    }
    rival = py_rng().randint(16, 32);
    (await (this as any).say("Cheer your hen on by alternating LEFT and RIGHT as fast as you can. 5 seconds!", "Rick"));
    score = (await (this as any).fest_mash(5.0, rival, "Chicken Sumo"));
    if ((score >= rival)) {
      this.gold += 500;
      ((this as any).give("Chicken Feed", 10));
      ((this as any).fest_win("Chicken Sumo"));
      ((this as any).fest_bond("Rick", 3));
      (await (this as any).say(`Your hen shoves Rick's hen clean out of the ring! You win 500G and 10 Chicken Feed. (${score} vs ${rival})`, "Thomas"));
    } else {
      ((this as any).fest_bond("Rick", 1));
      (await (this as any).say(`Rick's hen holds the ring. Better luck next year! (${score} vs ${rival})`, "Rick"));
    }
  }

  async fest_ev_egghunt(): Promise<any> {
    let H: any = undefined; let W: any = undefined; let bx: any = undefined; let by: any = undefined; let cur: any = undefined; let cx: any = undefined; let cy: any = undefined; let dx: any = undefined; let dy: any = undefined; let eggs: any = undefined; let fg: any = undefined; let found: any = undefined; let i: any = undefined; let k: any = undefined; let opened: any = undefined; let tries: any = undefined; let txt: any = undefined;
    (await (this as any).say("Eggs are hidden in nine flower bushes around the square. You get three peeks. Find two or more to win!", "Thomas"));
    eggs = new Set(py_rng().sample(py_range(9), 3));
    [opened, cur, tries, found] = [new Set(), 4, 3, 0];
    [W, H] = [this.scr.w, this.scr.h];
    while ((tries > 0)) {
      const draw = () => {
        [bx, by] = [Math.floor((W - 36) / 2), (Math.floor(H / 2) - 6)];
        this.scr.box(bx, by, 36, 11, "0D", "00", `Egg Hunt  peeks left: ${tries}`);
        for (let i of py_iter(py_range(9))) {
          [cx, cy] = [py_add(py_add(bx, 5), py_mult((i % 3), 10)), py_add(py_add(by, 2), py_mult(Math.floor(i / 3), 2))];
          if (py_in(i, opened)) {
            [txt, fg] = (py_in(i, eggs) ? ["( o )", "07"] : ["(   )", "02"]);
          } else {
            [txt, fg] = ["(***)", "0B"];
          }
          this.scr.put(cx, cy, txt, fg, (py_eq(i, cur) ? "01" : "00"), py_eq(i, cur));
        }
        this.scr.put(py_add(bx, 3), py_add(by, 9), "arrows move, X to search", "02");
      };
      k = (await (this as any).modal(draw));
      if (py_in(k, DIRS)) {
        [dx, dy] = py_item(DIRS, k);
        cur = py_add(clamp(py_add((cur % 3), dx), 0, 2), py_mult(3, clamp(py_add(Math.floor(cur / 3), dy), 0, 2)));
      } else {
        if ((py_in(k, OK_KEYS) && (!py_in(cur, opened)))) {
          opened.add(cur);
          tries -= 1;
          if (py_in(cur, eggs)) {
            found += 1;
            ((this as any).msg("You found an egg!", "07"));
          }
        } else {
          if (py_in(k, CANCEL_KEYS)) {
            break;
          }
        }
      }
    }
    if (found) {
      ((this as any).give("Egg", found));
    }
    if ((found >= 2)) {
      this.gold += 300;
      ((this as any).fest_win("Egg Hunt"));
      (await (this as any).say(`You found ${found} eggs! First prize: 300G - and you keep the eggs!`, "Thomas"));
    } else {
      ((this as any).fest_bond("May", 2));
      (await (this as any).say(`You found ${found} egg${((!py_eq(found, 1)) ? "s" : "")}. May found the most and wins this year. She's thrilled!`, "Thomas"));
    }
  }

  async fest_ev_crops(): Promise<any> {
    let best: any = undefined; let crop: any = undefined; let crops: any = undefined; let mine: any = undefined; let rivals: any = undefined; let sel: any = undefined;
    (await (this as any).say("Farmers, bring out your finest crop! The judges will choose the best.", "Thomas"));
    crops = py_iter(py_sorted(this.inv)).filter((i: any) => py_eq(py_item(py_item(ITEMS, i), 2), "crop")).map((i: any) => i);
    if ((!crops)) {
      (await (this as any).say("You have no crops to enter. You admire everyone else's vegetables.", null));
      return;
    }
    sel = (await (this as any).menu("Enter which crop?", py_iter(crops).map((c: any) => `${c} (worth ${py_item(py_item(ITEMS, c), 0)}G)`)));
    if (py_eq(sel, null)) {
      (await (this as any).say("You decide to just watch the judging.", null));
      return;
    }
    crop = py_item(crops, sel);
    mine = py_mult(py_item(py_item(ITEMS, crop), 0), py_rng().uniform(0.9, 1.5));
    rivals = Object.fromEntries(py_iter(["Rick", "Basil", "Barley"]).map((n: any) => [n, py_rng().uniform(40, 240)]));
    best = Math.max(...(py_iter(rivals).map(Number) as [number, ...number[]]));
    if ((mine > py_item(rivals, best))) {
      this.gold += 1000;
      ((this as any).fest_win("Crop Festival"));
      (await (this as any).say(`First prize goes to ${this.name}'s magnificent ${crop}! (+1000G)`, "Thomas"));
    } else {
      this.gold += 100;
      (await (this as any).say(`${best}'s entry takes first prize. Your ${crop} earns an honorable mention. (+100G)`, "Thomas"));
    }
  }

  async fest_companion(ask: any, scene: any, line: any): Promise<any> {
    let n: any = undefined; let names: any = undefined;
    names = py_iter(((this as any).fest_bachs())).filter((n: any) => (!py_eq(n, this.married))).map((n: any) => n);
    if (this.married) {
      names.insert(0, this.married);
    }
    n = (await (this as any).fest_pick(ask, names));
    if ((!n)) {
      (await (this as any).say(scene, null));
    } else {
      if (((py_item(this.friend, n) >= 10) || py_eq(n, this.married))) {
        ((this as any).fest_bond(n, 6));
        (await (this as any).say(`${scene} ${n} stays by your side the whole time.`, null));
        (await (this as any).say(line, n));
      } else {
        ((this as any).fest_bond(n, 1));
        (await (this as any).say("Sorry, I promised to spend tonight with my family.", n));
        (await (this as any).say(scene, null));
      }
    }
  }

  async fest_ev_fireworks(): Promise<any> {
    (await (this as any).fest_companion("Watch the fireworks with...", "BOOM! Fireworks bloom over the river in red, blue and pink.", "Wow... they're beautiful. I'm glad I'm watching them with you."));
  }

  async fest_ev_moon(): Promise<any> {
    (await (this as any).fest_companion("View the moon with...", "The full moon rises over Mother's Hill, round and bright.", "The moon is so pretty tonight. ...So is the company."));
  }

  async fest_ev_harvest(): Promise<any> {
    let item: any = undefined; let items: any = undefined; let n: any = undefined; let pts: any = undefined; let sel: any = undefined;
    (await (this as any).say("Everyone adds an ingredient to the giant pot! Then we all share the stew!", "Thomas"));
    items = py_iter(py_sorted(this.inv)).filter((i: any) => py_in(py_item(py_item(ITEMS, i), 2), ["crop", "forage", "fish", "animal"])).map((i: any) => i);
    sel = (items ? (await (this as any).menu("Add what to the pot?", py_add(items, ["Nothing"]))) : null);
    if ((py_eq(sel, null) || (sel >= py_len(items)))) {
      (await (this as any).say("Everyone else's ingredients make a fine stew anyway.", null));
    } else {
      item = py_item(items, sel);
      ((this as any).take(item));
      pts = ((py_item(py_item(ITEMS, item), 0) >= 100) ? 3 : 2);
      for (let n of py_iter(NPCS)) {
        ((this as any).fest_bond(n, pts));
      }
      (await (this as any).say(`Your ${item} makes the stew delicious! Everyone thanks you.`, null));
    }
    this.stamina = this.max_stamina;
    (await (this as any).say("You eat until you're full. (Stamina restored)", null));
  }

  async fest_ev_thanks(): Promise<any> {
    let cakes: any = undefined; let n: any = undefined;
    (await (this as any).say("Thanksgiving! It's a day to give thanks to the people you care about.", "Thomas"));
    cakes = py_iter(((this as any).fest_bachs())).filter((n: any) => ((py_item(this.friend, n) >= 40) || py_eq(n, this.married))).map((n: any) => n);
    for (let n of py_iter(cakes)) {
      ((this as any).give("Cake"));
      (await (this as any).say("Happy Thanksgiving! I baked this for you. ...Don't make a big deal of it!", n));
    }
    if ((!cakes)) {
      (await (this as any).say("No one gave you a cake this year... Maybe next year.", null));
    }
  }

  async fest_ev_starry(): Promise<any> {
    let best: any = undefined; let n: any = undefined;
    n = this.married;
    if ((!n)) {
      best = Math.max(...(py_iter(((this as any).fest_bachs())).map(Number) as [number, ...number[]]));
      n = ((py_item(this.friend, best) >= 30) ? best : null);
    }
    if (n) {
      ((this as any).fest_bond(n, 10));
      (await (this as any).say(`Snow falls softly. ${n} finds you by the fountain and takes your hand.`, null));
      (await (this as any).say("They say a wish made on Starry Night always comes true. I already know what I'll wish for.", n));
    } else {
      ((this as any).fest_bond("Thomas", 3));
      (await (this as any).say("You spend Starry Night with Mayor Thomas, eating his famous pot roast. Ho ho!", null));
    }
  }

  async fest_ev_nye(): Promise<any> {
    let n: any = undefined;
    (await (this as any).say(`Another year in Mineral Town comes to an end! Thank you all, and thank you, ${this.name}!`, "Thomas"));
    this.stamina = this.max_stamina;
    for (let n of py_iter(NPCS)) {
      ((this as any).fest_bond(n, 1));
    }
    (await (this as any).show_lines(`Year ${this.year} in review`, [`  Gold: ${this.gold}G`, `  Total shipped: ${this.shipped_total}G`, `  Chickens: ${this.chickens}`, `  Spouse: ${(this.married || "-")}`, `  Festival prizes: ${(py_iter(this.fest_wins).join(", ") || "none yet")}`]));
  }

  async pass_out(text: any): Promise<any> {
    if (this.passing_out) {
      return;
    }
    this.passing_out = true;
    (await (this as any).say(text, null));
    (await (this as any).new_day("passout"));
    this.passing_out = false;
  }

  async new_day(reason: any): Promise<any> {
    let _: any = undefined; let c: any = undefined; let late: any = undefined; let m: any = undefined; let nd: any = undefined; let ns: any = undefined; let objs: any = undefined; let p: any = undefined; let r: any = undefined; let report: any = undefined; let t: any = undefined; let total: any = undefined; let x: any = undefined; let y: any = undefined;
    late = (this.minutes >= py_mult(24, 60));
    report = [];
    if (this.bin) {
      total = py_sum(py_iter(py_dict_items(this.bin)).map(([i, q]: any) => py_mult(py_item(py_item(ITEMS, i), 0), q)));
      this.gold += total;
      this.shipped_total += total;
      report.push(`Zack collected your shipment overnight: +${total}G.`);
      this.bin = {  };
    }
    for (let [p, c] of py_iter(py_dict_items(this.crops))) {
      if ((py_in(p, this.wet) && (py_item(c, 1) < py_item(py_item(CROPS, py_item(c, 0)), 2)))) {
        c[1] += 1;
      }
    }
    this.wet = new Set();
    this.day += 1;
    if ((this.day > 30)) {
      this.day = 1;
      this.season += 1;
      if ((this.season > 3)) {
        this.season = 0;
        this.year += 1;
      }
      report.push(`${this.season_name} has arrived!`);
      if (this.crops) {
        report.push("The change of season withered your crops.");
        this.crops = {  };
      }
    }
    this.weather = this.tomorrow;
    [nd, ns] = [py_add(this.day, 1), this.season];
    if ((nd > 30)) {
      [nd, ns] = [1, (py_add(ns, 1) % 4)];
    }
    this.tomorrow = ((this as any).roll_weather(ns, nd));
    if (py_eq(this.weather, "Rain")) {
      this.wet = new Set(this.tilled);
      report.push("It's raining - your fields are watered.");
    }
    if (this.fed) {
      this.eggs += this.fed;
      report.push(`Your chickens laid ${this.fed} egg${((this.fed > 1) ? "s" : "")}.`);
    }
    this.fed = 0;
    ((this as any).barn_new_day(report));
    if ((this.upgrading && (((this as any).absday()) >= py_item(this.upgrading, 1)))) {
      t = py_item(this.upgrading, 0);
      this.levels[t] += 1;
      if (py_eq(t, "Watering Can")) {
        this.water = py_item(CAN_CAP, py_item(this.levels, t));
      }
      report.push(`Saibara finished your ${py_item(LEVELS, py_item(this.levels, t))} ${t}!`);
      this.upgrading = null;
    }
    report += ((this as any).carpentry_day());
    if ((!py_eq(this.season, 3))) {
      m = py_item(this.maps, "farm");
      objs = py_item(this.objs, "farm");
      for (let _ of py_iter(py_range(4))) {
        [x, y] = [py_rng().randint(3, 60), py_rng().randint(9, 26)];
        if ((py_eq(m.tile(x, y), "field") && (!py_in([x, y], this.tilled)) && (!py_in([x, y], objs)))) {
          objs[pkey(x, y)] = "weed";
        }
      }
    }
    ((this as any).spawn_forage());
    [this.talked, this.gifted, this.prayed] = [new Set(), new Set(), false];
    ((this as any).fest_new_day(report));
    if (py_eq(reason, "passout")) {
      this.stamina = Math.floor(this.max_stamina / 2);
      report.push("You woke up at home, still aching. (half stamina)");
    } else {
      if (late) {
        this.stamina = Math.floor(py_mult(this.max_stamina, 3) / 4);
        report.push("You stayed up late. You don't feel fully rested.");
      } else {
        this.stamina = this.max_stamina;
      }
    }
    this.minutes = py_mult(6, 60);
    this.acc = 0;
    this.mapname = "house";
    [this.px, this.py] = HOUSE_WAKE;
    this.face = [0, (-1)];
    this.npc_pos = {  };
    ((this as any).save());
    this.msgs = [];
    (await (this as any).say(`Good morning! ${((this as any).date_str())}.  Weather: ${this.weather}.`, null));
    for (let r of py_iter(report)) {
      (await (this as any).say(r, null));
    }
    ((this as any).msg("Game saved.", "03"));
    this.last = (Date.now() / 1000);
  }

  spawn_forage(): any {
    let fr: any = undefined; let items: any = undefined; let m: any = undefined; let rng: any = undefined; let target: any = undefined; let tries: any = undefined; let x: any = undefined; let y: any = undefined;
    m = py_item(this.maps, "mountain");
    items = py_item(FORAGE, this.season_name);
    fr = {  };
    rng = py_rng().Random();
    tries = 0;
    target = (py_eq(this.season, 3) ? 5 : 10);
    while (((py_len(fr) < target) && (tries < 500))) {
      tries += 1;
      [x, y] = [rng.randint(1, (m.w - 2)), rng.randint(1, (m.h - 2))];
      if ((py_eq(m.tile(x, y), "grass") && (!m.near(x, y, ["path"], 0)))) {
        fr[pkey(x, y)] = rng.choice(items);
      }
    }
    this.forage["mountain"] = fr;
  }

  glyph(m: any, x: any, y: any, t: any): any {
    let _: any = undefined; let age: any = undefined; let bg: any = undefined; let c: any = undefined; let ch: any = undefined; let crop: any = undefined; let d: any = undefined; let fg: any = undefined; let fr: any = undefined; let h: any = undefined; let name: any = undefined; let obj: any = undefined; let p: any = undefined; let season: any = undefined;
    p = [x, y];
    name = m.name;
    obj = py_dict_get(py_dict_get(this.objs, name, {  }), p);
    if (obj) {
      [ch, fg] = py_item(OBJ_GLYPH, obj);
      if ((py_eq(this.season, 3) && py_eq(name, "farm"))) {
        fg = (py_eq(obj, "weed") ? "07" : fg);
      }
      return [ch, fg, "00", false];
    }
    fr = py_dict_get(py_dict_get(this.forage, name, {  }), p);
    if (fr) {
      [ch, fg] = py_item(FORAGE_GLYPH, fr);
      return [ch, fg, "00", true];
    }
    if ((py_eq(name, "farm") && py_in(p, this.tilled))) {
      bg = (py_in(p, this.wet) ? "01" : "00");
      c = py_dict_get(this.crops, p);
      if ((!c)) {
        return ["=", "09", bg, false];
      }
      [crop, age] = c;
      d = py_item(CROPS, crop);
      if ((age >= py_item(d, 2))) {
        return [py_item(d, 5), py_item(d, 6), bg, true];
      }
      if (py_eq(age, 0)) {
        return [":", "09", bg, false];
      }
      if ((age < (py_item(d, 2) / 2))) {
        return [",", "0B", bg, false];
      }
      return ["\"", "0B", bg, false];
    }
    if (py_in(p, m.deco)) {
      [ch, fg] = py_item(m.deco, p);
      return [ch, fg, py_item(py_item(TILES, t), 2), false];
    }
    [ch, fg, bg, _] = py_item(TILES, t);
    season = this.season;
    h = (py_add(py_add(py_mult(x, 7), py_mult(y, 13)), py_mult(x, y)) % 11);
    if (py_eq(t, "grass")) {
      if (py_eq(season, 3)) {
        return [((h < 4) ? "." : " "), "05", "00", false];
      }
      if ((h < 3)) {
        return [(h ? "," : "\""), ((py_eq(season, 2) && (!py_eq(h, 1))) ? "09" : "0B"), "00", false];
      }
      return [" ", fg, bg, false];
    }
    if ((py_eq(t, "field") && py_eq(season, 3))) {
      return [".", "05", "00", false];
    }
    if (py_eq(t, "tree")) {
      return ["T", py_item(["0B", "0B", "09", "04"], season), "00", true];
    }
    if (py_eq(t, "flower")) {
      if (py_eq(season, 3)) {
        return [".", "05", "00", false];
      }
      return ["*", py_item(["0A", "0E", "08", "0C", "07"], (h % 5)), "00", false];
    }
    if (py_in(t, ["water", "fountain"])) {
      if (py_eq((py_add(py_add(x, y), Math.floor(Number(py_mult((Date.now() / 1000), 1.5)))) % 7), 0)) {
        ch = "-";
      }
      if ((py_eq(season, 3) && py_eq(t, "water") && (!py_eq(m.name, "mine")))) {
        fg = "0C";
      }
    }
    return [ch, fg, bg, false];
  }

  render(): any {
    let H: any = undefined; let W: any = undefined; let s: any = undefined; let side: any = undefined; let vh: any = undefined; let vw: any = undefined; let y: any = undefined;
    s = this.scr;
    s.clear();
    if ((!this.started)) {
      ((this as any).draw_title());
      return;
    }
    [W, H] = [s.w, s.h];
    if (((W < 80) || (H < 24))) {
      s.put(0, 0, `Terminal too small: need 80x24, have ${W}x${H}`, "08");
      return;
    }
    side = 27;
    [vw, vh] = [((W - side) - 1), (H - 5)];
    ((this as any).draw_topbar(W));
    ((this as any).draw_map(0, 1, vw, vh));
    for (let y of py_iter(py_range(1, (H - 4)))) {
      s.put(vw, y, "|", "01");
    }
    s.put(0, (H - 4), py_mult("-", W), "01");
    ((this as any).draw_side(py_add(vw, 2), 2, (side - 2)));
    ((this as any).draw_msgs((H - 3)));
  }

  draw_topbar(W: any): any {
    let fg: any = undefined; let loc: any = undefined; let s: any = undefined; let sn: any = undefined; let text: any = undefined; let x: any = undefined;
    s = this.scr;
    s.put(0, 0, py_mult(" ", W), "05", "01");
    sn = this.season_name;
    x = 1;
    for (let [text, fg] of py_iter([[`${sn} ${this.day}`, py_item(SEASON_COL, sn)], [` ${py_item(WEEKDAYS, this.weekday)}`, "05"], [`  Year ${this.year}`, "04"], [`   ${fmt_time(this.minutes)}`, "07"], [`   ${this.weather}`, py_item(WEATHER_COL, this.weather)], [`   ${this.gold}G`, "09"]])) {
      s.put(x, 0, text, fg, "01", true);
      x += py_len(text);
    }
    loc = py_add(this.map.title, (this.map.indoor ? "   (time stops indoors)" : ""));
    s.put(((W - py_len(loc)) - 2), 0, loc, "0C", "01");
  }

  draw_map(ox: any, oy: any, vw: any, vh: any): any {
    let _: any = undefined; let bg: any = undefined; let bold: any = undefined; let cell: any = undefined; let ch: any = undefined; let cx: any = undefined; let cy: any = undefined; let d: any = undefined; let drops: any = undefined; let dusk: any = undefined; let fg: any = undefined; let hour: any = undefined; let m: any = undefined; let n: any = undefined; let night: any = undefined; let rng: any = undefined; let row: any = undefined; let s: any = undefined; let sx: any = undefined; let sy: any = undefined; let tx: any = undefined; let ty: any = undefined; let x: any = undefined; let y: any = undefined;
    s = this.scr;
    m = this.map;
    if ((m.w <= vw)) {
      [cx, ox] = [0, py_add(ox, Math.floor((vw - m.w) / 2))];
    } else {
      cx = clamp((this.px - Math.floor(vw / 2)), 0, (m.w - vw));
    }
    if ((m.h <= vh)) {
      [cy, oy] = [0, py_add(oy, Math.floor((vh - m.h) / 2))];
    } else {
      cy = clamp((this.py - Math.floor(vh / 2)), 0, (m.h - vh));
    }
    hour = (this.minutes / 60);
    night = ((!m.indoor) && (!py_eq(m.name, "mine")) && ((hour >= 19) || (hour < 5)));
    dusk = ((!m.indoor) && (!py_eq(m.name, "mine")) && (17.5 <= hour) && (hour < 19));
    [tx, ty] = ((this as any).target());
    for (let sy of py_iter(py_range(Math.min(vh, m.h)))) {
      y = py_add(cy, sy);
      row = py_item(m.t, y);
      for (let sx of py_iter(py_range(Math.min(vw, m.w)))) {
        x = py_add(cx, sx);
        [ch, fg, bg, bold] = ((this as any).glyph(m, x, y, py_item(row, x)));
        if ((night && (!py_in(fg, ["00", "01"])))) {
          fg = (py_in(fg, ["0D", "0C"]) ? "0F" : (py_in(fg, ["02", "03"]) ? "02" : "03"));
        } else {
          if ((dusk && py_eq(fg, "0B"))) {
            fg = "09";
          }
        }
        if (py_eq([x, y], [tx, ty])) {
          bg = (py_eq(bg, "01") ? "02" : "01");
        }
        s.put(py_add(ox, sx), py_add(oy, sy), ch, fg, bg, bold);
      }
    }
    const at = (x: any, y: any, ch: any, fg: any, bold: any = true) => {
      [sx, sy] = [(x - cx), (y - cy)];
      if (((0 <= sx) && (sx < Math.min(vw, m.w)) && (0 <= sy) && (sy < Math.min(vh, m.h)))) {
        bg = py_item(py_item(py_item(s.buf, py_add(oy, sy)), py_add(ox, sx)), 2);
        s.put(py_add(ox, sx), py_add(oy, sy), ch, fg, bg, bold);
      }
    };
    for (let [n, [x, y]] of py_iter(py_dict_items(this.npc_pos))) {
      if (py_eq(py_item(py_item(py_item(NPCS, n), "where"), 0), this.mapname)) {
        at(x, y, py_item(py_item(NPCS, n), "g"), py_item(py_item(NPCS, n), "col"));
      }
    }
    for (let [n, d] of py_iter(py_dict_items(this.indoor_npcs))) {
      if ((py_eq(py_item(d, "map"), this.mapname) && (!py_eq(n, this.married)))) {
        at(...((py_iter(py_item(d, "pos")) || []) as [any, any, any]), py_item(py_item(NPCS, n), "g"), py_item(py_item(NPCS, n), "col"));
      }
    }
    if ((py_eq(this.mapname, "house") && this.married)) {
      at(...((py_iter(SPOUSE_POS) || []) as [any, any, any]), py_item(py_item(NPCS, this.married), "g"), py_item(py_item(NPCS, this.married), "col"));
    }
    at(this.px, this.py, "@", "07");
    if (((!m.indoor) && (!py_eq(m.name, "mine")) && (!py_eq(this.weather, "Sunny")))) {
      rng = py_rng().Random(Math.floor(Number(py_mult((Date.now() / 1000), 8))));
      drops = Math.floor(py_mult(vw, vh) / (py_eq(this.weather, "Rain") ? 25 : 45));
      for (let _ of py_iter(py_range(drops))) {
        [sx, sy] = [rng.randrange(Math.min(vw, m.w)), rng.randrange(Math.min(vh, m.h))];
        if (py_eq([py_add(sx, cx), py_add(sy, cy)], [this.px, this.py])) {
          continue;
        }
        cell = py_item(py_item(s.buf, py_add(oy, sy)), py_add(ox, sx));
        if (py_eq(this.weather, "Rain")) {
          s.put(py_add(ox, sx), py_add(oy, sy), "/", "0D", py_item(cell, 2));
        } else {
          s.put(py_add(ox, sx), py_add(oy, sy), rng.choice("*."), "07", py_item(cell, 2));
        }
      }
    }
  }

  draw_side(x: any, y: any, w: any): any {
    let binv: any = undefined; let bw: any = undefined; let col: any = undefined; let crop: any = undefined; let d: any = undefined; let filled: any = undefined; let frac: any = undefined; let held: any = undefined; let help_lines: any = undefined; let hungry: any = undefined; let idx: any = undefined; let k: any = undefined; let lvl: any = undefined; let ok: any = undefined; let s: any = undefined; let sn: any = undefined; let t: any = undefined;
    s = this.scr;
    sn = this.season_name;
    s.put(x, y, "H R V S T M N", py_item(SEASON_COL, sn), "00", true);
    s.put(x, py_add(y, 1), py_slice(`${this.name} of ${this.farm} Farm`, null, w), "04");
    y += 3;
    t = this.tool;
    s.put(x, y, "Tool", "03");
    idx = (py_in(t, TOOLS) ? `[${py_add(TOOLS.indexOf(t), 1)}] ` : "    ");
    s.put(py_add(x, 6), y, py_slice(py_add(idx, t), null, (w - 6)), "07", "00", true);
    y += 1;
    if (py_in(t, UPGRADABLE)) {
      lvl = py_item(this.levels, t);
      s.put(py_add(x, 6), y, py_item(LEVELS, lvl), py_item(LEVEL_COL, lvl));
      if (py_eq(t, "Watering Can")) {
        s.put(py_add(x, 15), y, `${this.water}/${py_item(CAN_CAP, lvl)}`, "0D");
      }
    } else {
      if (t.endsWith(" Seeds")) {
        crop = py_slice(t, null, (-6));
        ok = py_eq(py_item(py_item(CROPS, crop), 0), sn);
        s.put(py_add(x, 6), y, `x${py_dict_get(this.inv, t, 0)} bags`, (ok ? "0B" : "08"));
        if ((!ok)) {
          s.put(py_add(x, 15), y, "(off-season)", "08");
        }
      }
    }
    y += 1;
    if (this.upgrading) {
      s.put(x, y, py_slice(`Saibara has: ${py_item(this.upgrading, 0)}`, null, w), "03");
    }
    y += 1;
    s.put(x, y, "Held", "03");
    held = (this.held ? `${this.held} x${py_dict_get(this.inv, this.held, 0)}` : "-");
    s.put(py_add(x, 6), y, py_slice(held, null, (w - 6)), (this.held ? "0A" : "02"));
    y += 2;
    frac = (this.stamina / this.max_stamina);
    col = ((frac > 0.5) ? "0B" : ((frac > 0.25) ? "09" : "08"));
    bw = (w - 6);
    filled = Math.floor(Number(Math.round(py_mult(frac, bw))));
    s.put(x, y, "Stam", "03");
    s.put(py_add(x, 6), y, py_mult("#", filled), col, "00", true);
    s.put(py_add(py_add(x, 6), filled), y, py_mult(".", (bw - filled)), "01");
    y += 2;
    s.put(x, y, "Gold", "03");
    s.put(py_add(x, 6), y, `${this.gold}G`, "09", "00", true);
    y += 1;
    binv = py_sum(py_iter(py_dict_items(this.bin)).map(([i, q]: any) => py_mult(py_item(py_item(ITEMS, i), 0), q)));
    s.put(x, y, "Bin", "03");
    s.put(py_add(x, 6), y, `${binv}G pending`, (binv ? "09" : "02"));
    y += 1;
    if (this.chickens) {
      s.put(x, y, "Coop", "03");
      s.put(py_add(x, 6), y, `${this.chickens} hens, ${this.eggs} eggs`, "07");
    }
    if (this.animals) {
      y += 1;
      hungry = py_sum(py_iter(this.animals).filter((a: any) => (!py_item(a, "fed"))).map((a: any) => 1));
      s.put(x, y, "Barn", "03");
      s.put(py_add(x, 6), y, py_slice(py_add(`${py_len(this.animals)} animals`, (hungry ? `, ${hungry} hungry` : ", all fed")), null, (w - 6)), (hungry ? "08" : "07"));
    }
    y += 2;
    help_lines = [["SPC", "use tool"], ["X", "act / talk"], ["TAB", "next tool"], ["I", "rucksack"], ["?", "help"], ["Q", "quit"]];
    for (let [k, d] of py_iter(help_lines)) {
      if ((y >= (s.h - 5))) {
        break;
      }
      s.put(x, y, `${k}`, "0D", "00", true);
      s.put(py_add(x, 4), y, d, "03");
      y += 1;
    }
  }

  draw_msgs(y0: any): any {
    let age: any = undefined; let col: any = undefined; let cols: any = undefined; let fg: any = undefined; let i: any = undefined; let recent: any = undefined; let text: any = undefined;
    cols = ["02", "03", null];
    recent = py_slice(this.msgs, (-3), null);
    for (let [i, [text, col]] of py_iter(enumerate(recent))) {
      age = ((py_len(recent) - 1) - i);
      fg = (py_eq(age, 0) ? col : (py_eq(age, 1) ? py_item(cols, 1) : py_item(cols, 0)));
      this.scr.put(1, py_add(y0, i), py_slice(text, null, (this.scr.w - 2)), fg);
    }
  }

  draw_title(): any {
    let H: any = undefined; let W: any = undefined; let ch: any = undefined; let cols: any = undefined; let field: any = undefined; let fx: any = undefined; let hills: any = undefined; let i: any = undefined; let line: any = undefined; let lw: any = undefined; let palette: any = undefined; let s: any = undefined; let scene_y: any = undefined; let sub: any = undefined; let tag: any = undefined; let x0: any = undefined;
    s = this.scr;
    [W, H] = [s.w, s.h];
    lw = py_len(py_item(LOGO, 0));
    x0 = Math.max(0, Math.floor((W - lw) / 2));
    cols = ["0A", "0E", "0D", "0C", "0B"];
    for (let [i, line] of py_iter(enumerate(LOGO))) {
      s.put(x0, py_add(2, i), line, py_item(cols, i), "00", true);
    }
    sub = "~ an ASCII tribute to Harvest Moon: Friends of Mineral Town ~";
    s.put(Math.max(0, Math.floor((W - py_len(sub)) / 2)), 8, sub, "04");
    scene_y = 10;
    hills = "   T   T  .-^-.   T        T   .-^-.   T   ";
    s.put(Math.max(0, Math.floor((W - py_len(hills)) / 2)), scene_y, hills, "0B");
    field = " o * j o Y * o v d o * j O o * A o v * o j ";
    fx = Math.max(0, Math.floor((W - py_len(field)) / 2));
    palette = ["07", "08", "0B", "09", "0E", "0A"];
    for (let [i, ch] of py_iter(enumerate(field))) {
      s.put(py_add(fx, i), py_add(scene_y, 1), ch, ((!py_eq(ch, " ")) ? py_item(palette, (i % py_len(palette))) : "00"), "00", true);
    }
    s.put(fx, py_add(scene_y, 2), py_mult("=", py_len(field)), "09");
    tag = "base16 isotope dark";
    s.put(Math.max(0, Math.floor((W - py_len(tag)) / 2)), (H - 2), tag, "02");
  }

  async modal(draw: any): Promise<any> {
    let k: any = undefined;
    while (true) {
      ((this as any).render());
      draw();
      this.scr.flush();
      k = (await this.scr.getKey(0.25));
      if (k) {
        this.last = (Date.now() / 1000);
        return k;
      }
    }
  }

  async say(text: any, who: any = null): Promise<any> {
    let H: any = undefined; let W: any = undefined; let bw: any = undefined; let bx: any = undefined; let by: any = undefined; let hearts: any = undefined; let i: any = undefined; let lines: any = undefined; let ln: any = undefined; let page: any = undefined; let pages: any = undefined; let para: any = undefined; let tcol: any = undefined; let title: any = undefined;
    [W, H] = [this.scr.w, this.scr.h];
    bw = Math.min((W - 4), 74);
    lines = [];
    for (let para of py_iter(text.split("\n"))) {
      lines += (py_wrap(para, (bw - 4)) || [""]);
    }
    pages = py_iter(py_range(0, py_len(lines), 3)).map((i: any) => py_slice(lines, i, py_add(i, 3)));
    [title, tcol, hearts] = [null, "07", null];
    if (py_in(who, NPCS)) {
      [title, tcol] = [who, py_item(py_item(NPCS, who), "col")];
      hearts = ((this as any).hearts(who));
    } else {
      if (who) {
        title = who;
      }
    }
    for (let page of py_iter(pages)) {
      const draw = () => {
        [bx, by] = [Math.floor((W - bw) / 2), (H - 8)];
        this.scr.box(bx, by, bw, 6, "0D", "00", title, tcol);
        if (hearts) {
          this.scr.put(py_add(py_add(bx, py_len(title)), 5), by, py_item(hearts, 0), py_item(hearts, 1));
        }
        for (let [i, ln] of py_iter(enumerate(page))) {
          this.scr.put(py_add(bx, 2), py_add(py_add(by, 1), i), ln, "06");
        }
        if ((Math.floor(Number(py_mult((Date.now() / 1000), 2))) % 2)) {
          this.scr.put((py_add(bx, bw) - 3), py_add(by, 4), "v", "0A", "00", true);
        }
      };
      (await (this as any).modal(draw));
    }
  }

  async show_lines(title: any, lines: any): Promise<any> {
    let H: any = undefined; let W: any = undefined; let bh: any = undefined; let bw: any = undefined; let bx: any = undefined; let by: any = undefined; let i: any = undefined; let ln: any = undefined;
    [W, H] = [this.scr.w, this.scr.h];
    bw = Math.min((W - 2), Math.max(py_add(py_len(title), 6), py_add(Math.max(...(py_iter(py_iter(lines).map((ln: any) => py_len(ln))).map(Number) as [number, ...number[]])), 4)));
    bh = Math.min((H - 2), py_add(py_len(lines), 3));
    const draw = () => {
      [bx, by] = [Math.floor((W - bw) / 2), Math.floor((H - bh) / 2)];
      this.scr.box(bx, by, bw, bh, "0D", "00", title);
      for (let [i, ln] of py_iter(enumerate(py_slice(lines, null, (bh - 3))))) {
        this.scr.put(py_add(bx, 2), py_add(py_add(by, 1), i), ln, "05");
      }
      this.scr.put(py_add(bx, 2), (py_add(by, bh) - 2), "press any key", "02");
    };
    (await (this as any).modal(draw));
  }

  async menu(title: any, opts: any, sel: any = 0, info: any = null, y: any = null): Promise<any> {
    let H: any = undefined; let W: any = undefined; let bh: any = undefined; let bx: any = undefined; let by: any = undefined; let i: any = undefined; let info_lines: any = undefined; let j: any = undefined; let k: any = undefined; let ln: any = undefined; let maxvis: any = undefined; let n: any = undefined; let top: any = undefined; let vis: any = undefined; let w: any = undefined;
    n = py_len(opts);
    while (true) {
      [W, H] = [this.scr.w, this.scr.h];
      info_lines = ((typeof info === 'function') ? info(sel) : (info || []));
      maxvis = Math.max(3, ((H - 8) - py_len(info_lines)));
      vis = Math.min(n, maxvis);
      top = clamp((sel - Math.floor(vis / 2)), 0, Math.max(0, (n - vis)));
      w = Math.min((W - 2), Math.max(...(py_iter(py_add(py_add([py_add(py_len(title), 8)], py_iter(opts).map((o: any) => py_add(py_len(o), 7))), py_iter(info_lines).map((ln: any) => py_add(py_len(ln), 4)))).map(Number) as [number, ...number[]])));
      bh = py_add(py_add(vis, 2), (info_lines ? py_add(py_len(info_lines), 1) : 0));
      const draw = () => {
        bx = Math.floor((W - w) / 2);
        by = ((!py_eq(y, null)) ? y : Math.max(1, Math.floor((H - bh) / 2)));
        this.scr.box(bx, by, w, bh, "0D", "00", title);
        for (let i of py_iter(py_range(vis))) {
          j = py_add(top, i);
          if (py_eq(j, sel)) {
            this.scr.put(py_add(bx, 1), py_add(py_add(by, 1), i), py_add(" > ", py_item(opts, j)).padEnd((w - 2)), "00", "0D", true);
          } else {
            this.scr.put(py_add(bx, 1), py_add(py_add(by, 1), i), py_add("   ", py_item(opts, j)), "05");
          }
        }
        if ((top > 0)) {
          this.scr.put((py_add(bx, w) - 3), py_add(by, 1), "^", "03");
        }
        if ((py_add(top, vis) < n)) {
          this.scr.put((py_add(bx, w) - 3), py_add(by, vis), "v", "03");
        }
        if (info_lines) {
          this.scr.put(py_add(bx, 1), py_add(py_add(by, vis), 1), py_mult("-", (w - 2)), "01");
          for (let [i, ln] of py_iter(enumerate(info_lines))) {
            this.scr.put(py_add(bx, 1), py_add(py_add(py_add(by, vis), 2), i), ln, "04");
          }
        }
      };
      k = (await (this as any).modal(draw));
      if (py_in(k, ["up", "w", "k"])) {
        sel = ((sel - 1) % n);
      } else {
        if (py_in(k, ["down", "s", "j", "tab"])) {
          sel = (py_add(sel, 1) % n);
        } else {
          if (py_in(k, OK_KEYS)) {
            return sel;
          } else {
            if (py_in(k, CANCEL_KEYS)) {
              return null;
            } else {
              if ((py_eq(py_len(k), 1) && /^\d+$/.test(k) && (1 <= Math.floor(Number(k))) && (Math.floor(Number(k)) <= Math.min(n, 9)))) {
                return (Math.floor(Number(k)) - 1);
              }
            }
          }
        }
      }
    }
  }

  async confirm(question: any): Promise<any> {
    return py_eq((await (this as any).menu(question, ["Yes", "No"])), 0);
  }

  async ask_qty(prompt: any, maxq: any, price: any = null, label: any = "Total"): Promise<any> {
    let H: any = undefined; let W: any = undefined; let bw: any = undefined; let bx: any = undefined; let by: any = undefined; let k: any = undefined; let q: any = undefined;
    if ((maxq <= 0)) {
      return 0;
    }
    q = 1;
    while (true) {
      [W, H] = [this.scr.w, this.scr.h];
      bw = Math.max(py_add(py_len(prompt), 8), 46);
      const draw = () => {
        [bx, by] = [Math.floor((W - bw) / 2), (Math.floor(H / 2) - 3)];
        this.scr.box(bx, by, bw, 6, "0D", "00", prompt);
        this.scr.put(py_add(bx, 3), py_add(by, 2), `<  ${q}  >`, "07", "00", true);
        this.scr.put(py_add(bx, 16), py_add(by, 2), `of ${maxq}`, "03");
        if (price) {
          this.scr.put(py_add(bx, 26), py_add(by, 2), `${label}: ${py_mult(q, price)}G`, "09");
        }
        this.scr.put(py_add(bx, 3), py_add(by, 4), "left/right +-1  up/down +-10  enter", "02");
      };
      k = (await (this as any).modal(draw));
      if (py_in(k, ["left", "a", "h"])) {
        q = ((q > 1) ? (q - 1) : maxq);
      } else {
        if (py_in(k, ["right", "d", "l"])) {
          q = ((q < maxq) ? py_add(q, 1) : 1);
        } else {
          if (py_in(k, ["up", "w", "k"])) {
            q = Math.min(maxq, py_add(q, 10));
          } else {
            if (py_in(k, ["down", "s", "j"])) {
              q = Math.max(1, (q - 10));
            } else {
              if (py_in(k, OK_KEYS)) {
                return q;
              } else {
                if (py_in(k, CANCEL_KEYS)) {
                  return 0;
                }
              }
            }
          }
        }
      }
    }
  }

  async text_input(prompt: any, py_default: any = ""): Promise<any> {
    let H: any = undefined; let W: any = undefined; let bw: any = undefined; let bx: any = undefined; let by: any = undefined; let k: any = undefined; let text: any = undefined;
    text = "";
    while (true) {
      [W, H] = [this.scr.w, this.scr.h];
      const draw = () => {
        bw = 44;
        [bx, by] = [Math.floor((W - bw) / 2), 15];
        this.scr.box(bx, by, bw, 5, "0D", "00", prompt);
        this.scr.put(py_add(bx, 3), py_add(by, 2), py_add(text, ((Math.floor(Number(py_mult((Date.now() / 1000), 2))) % 2) ? "_" : " ")), "07", "00", true);
        if ((!text)) {
          this.scr.put(py_add(bx, 4), py_add(by, 2), py_default, "02");
        }
        this.scr.put(py_add(bx, 3), py_add(by, 3), `type, then enter (blank = ${py_default})`, "02");
      };
      k = (await (this as any).modal(draw));
      if (py_eq(k, "enter")) {
        return (text.trim() || py_default);
      }
      if (py_eq(k, "backspace")) {
        text = py_slice(text, null, (-1));
      } else {
        if ((py_eq(k, "space") && (py_len(text) < 12))) {
          text += " ";
        } else {
          if (py_in(k, ["esc", "ctrl-c"])) {
            return py_default;
          } else {
            if ((py_eq(py_len(k), 1) && /^[\x20-\x7E]$/.test(k) && (py_len(text) < 12))) {
              text += k;
            }
          }
        }
      }
    }
  }

  async title(): Promise<any> {
    let choice: any = undefined; let farm: any = undefined; let has_save: any = undefined; let name: any = undefined; let opts: any = undefined; let sel: any = undefined;
    while (true) {
      has_save = Boolean(typeof localStorage !== 'undefined' && localStorage.getItem(SAVE_KEY));
      opts = py_add((has_save ? ["Continue"] : []), ["New Game", "Quit"]);
      sel = (await (this as any).menu("Menu", opts));
      choice = ((!py_eq(sel, null)) ? py_item(opts, sel) : "Quit");
      if (py_eq(choice, "Quit")) {
        this.running = false;
        return;
      }
      if (py_eq(choice, "Continue")) {
        try {
          ((this as any).load());
        } catch (e: any) {
          (await (this as any).say(`Couldn't load the save file: ${e}`, null));
          this.started = false;
          continue;
        }
        ((this as any).update_npcs());
        (await (this as any).say(`Welcome back! ${((this as any).date_str())}.  Weather: ${this.weather}.`, null));
        return;
      }
      if ((has_save && (!(await (this as any).confirm("Start over? This will overwrite your save."))))) {
        continue;
      }
      name = (await (this as any).text_input("What's your name?", "Pete"));
      farm = (await (this as any).text_input("Name your farm:", "Moon"));
      ((this as any).new_game(name, farm));
      (await (this as any).intro());
      return;
    }
  }

  async intro(): Promise<any> {
    let t: any = undefined;
    t = "Thomas";
    (await (this as any).say(`Ho ho! You must be ${this.name}! Welcome to Mineral Town! I'm Mayor Thomas.`, t));
    (await (this as any).say(`Your grandfather left you this farm. It's a bit overgrown, but I'm sure ${this.farm} Farm will bloom again in your hands!`, t));
    (await (this as any).say("Clear the field, till the soil with your Hoe, plant seeds, and water them every day. Drop your harvest in the shipping bin ($) and Zack will pay you each morning.", t));
    (await (this as any).say("Visit town to buy seeds and meet everyone. Talk to folks every day - and a gift never hurts! You have 500G and two bags of Turnip seeds to start. Good luck!", t));
    (await (this as any).say("Press ? at any time for help.", null));
  }

  init_carpentry(): any {
    this.house_flags = [];
    this.project = null;
    this.bathed = false;
    ((this as any).rebuild_house());
  }

  rebuild_house(): any {
    this.maps["house"] = build_house_upgraded(((this as any)["house_flags"]));
  }

  coop_cap(): any {
    return (py_in("Coop Expansion", ((this as any)["house_flags"])) ? 16 : 8);
  }

  carpentry_day(): any {
    let name: any = undefined;
    this.bathed = false;
    if (((!this.project) || (((this as any).absday()) < py_item(this.project, 1)))) {
      return [];
    }
    name = py_item(this.project, 0);
    this.project = null;
    if ((!py_in(name, this.house_flags))) {
      this.house_flags.push(name);
    }
    if (py_eq(name, "Big Bed")) {
      this.max_stamina += 20;
    }
    ((this as any).rebuild_house());
    return [`Gotz finished building your ${name}! ${py_item(py_item(EXPANSIONS, name), 3)}`];
  }

  async order_expansion(): Promise<any> {
    let _: any = undefined; let desc: any = undefined; let gold: any = undefined; let left: any = undefined; let lines: any = undefined; let lumber: any = undefined; let n: any = undefined; let names: any = undefined; let opts: any = undefined; let req: any = undefined; let sel: any = undefined;
    if (this.project) {
      left = Math.max(1, (py_item(this.project, 1) - ((this as any).absday())));
      (await (this as any).say(`I'm still building your ${py_item(this.project, 0)}. ${left} more day${((left > 1) ? "s" : "")}.`, "Gotz"));
      return;
    }
    names = Array.from(py_iter(EXPANSIONS || []));
    opts = [];
    for (let n of py_iter(names)) {
      [gold, lumber, req, _] = py_item(EXPANSIONS, n);
      if (py_in(n, this.house_flags)) {
        opts.push(`${n} (built)`);
      } else {
        opts.push(`${n} ${gold}G + ${lumber} Lumber`);
      }
    }
    const info = (s: any) => {
      [gold, lumber, req, desc] = py_item(EXPANSIONS, py_item(names, s));
      lines = [`  ${desc}`];
      if ((req && (!py_in(req, this.house_flags)))) {
        lines.push(`  Requires: ${req}`);
      }
      lines.push(`  You have ${this.gold}G and ${py_dict_get(this.inv, "Lumber", 0)} Lumber`);
      return lines;
    };
    sel = (await (this as any).menu("House expansions", opts));
    if (py_eq(sel, null)) {
      return;
    }
    n = py_item(names, sel);
    [gold, lumber, req, _] = py_item(EXPANSIONS, n);
    if (py_in(n, this.house_flags)) {
      (await (this as any).say("Already built that one. Solid work, if I say so myself.", "Gotz"));
    } else {
      if ((req && (!py_in(req, this.house_flags)))) {
        (await (this as any).say(`I need to build the ${req} first.`, "Gotz"));
      } else {
        if (((this.gold < gold) || (py_dict_get(this.inv, "Lumber", 0) < lumber))) {
          (await (this as any).say(`That'll be ${gold}G and ${lumber} Lumber. Come back when you have it.`, "Gotz"));
        } else {
          if ((await (this as any).confirm(`Build the ${n} for ${gold}G + ${lumber} Lumber?`))) {
            this.gold -= gold;
            ((this as any).take("Lumber", lumber));
            this.project = [n, py_add(((this as any).absday()), BUILD_DAYS)];
            (await (this as any).say(`Right. I'll have your ${n} done in ${BUILD_DAYS} days.`, "Gotz"));
          }
        }
      }
    }
  }

  async buy_kitchen_goods(): Promise<any> {
    let g: any = undefined; let goods: any = undefined; let opts: any = undefined; let prices: any = undefined; let sel: any = undefined;
    goods = py_add(Array.from(py_iter(UTENSILS || [])), ["Rice"]);
    prices = Object.assign({}, UTENSILS);
    opts = py_iter(goods).map((g: any) => py_add(`${g} ${py_item(prices, g)}G`, ((py_in(g, UTENSILS) && py_in(g, this.inv)) ? "  (owned)" : "")));
    sel = (await (this as any).menu(`Kitchen goods   ${this.gold}G`, opts));
    if (py_eq(sel, null)) {
      return;
    }
    g = py_item(goods, sel);
    if ((py_in(g, UTENSILS) && py_in(g, this.inv))) {
      (await (this as any).say(`You already have a ${g}.`, null));
    } else {
      (await (this as any).buy(g, py_item(prices, g), (py_in(g, UTENSILS) ? 1 : 99)));
    }
  }

  async use_furniture(tile: any): Promise<any> {
    if (py_eq(tile, "kitchen")) {
      (await (this as any).cook());
    } else {
      if (py_eq(tile, "bath")) {
        if (this.bathed) {
          (await (this as any).say("You already had a bath today.", null));
        } else {
          this.bathed = true;
          this.stamina = Math.min(this.max_stamina, py_add(this.stamina, 30));
          (await (this as any).say("Ahh... a hot bath. You feel refreshed. (+30 stamina)", null));
        }
      } else {
        (await (this as any).show_lines("Recipe Book", py_iter(RECIPES).map((r: any) => ((this as any).recipe_line(r)))));
      }
    }
  }

  recipe_line(dish: any): any {
    let _: any = undefined; let ing: any = undefined; let parts: any = undefined; let ut: any = undefined;
    [ing, ut, _, _] = py_item(RECIPES, dish);
    parts = py_iter(ing).map(([t, q]: any) => (t.startsWith("any:") ? `${q} any ${py_slice(t, 4, null)}` : `${q} ${t}`));
    return py_add(`${dish} ${py_iter(parts).join(", ")}`, (ut ? `  [${ut}]` : ""));
  }

  ingredient_plan(dish: any): any {
    let i: any = undefined; let kind: any = undefined; let left: any = undefined; let plan: any = undefined; let pool: any = undefined; let q: any = undefined; let tok: any = undefined; let use: any = undefined;
    "Pick which rucksack items a recipe would use (cheapest first), or None.";
    left = Object.assign({}, this.inv);
    plan = {  };
    for (let [tok, q] of py_iter(py_sorted(py_item(py_item(RECIPES, dish), 0)))) {
      if (tok.startsWith("any:")) {
        kind = py_slice(tok, 4, null);
        pool = py_sorted(py_iter(left).filter((i: any) => ((py_item(left, i) > 0) && (py_eq(kind, "fruit") ? py_in(i, FRUITS) : py_eq(py_item(py_dict_get(ITEMS, i, [0, 0, ""]), 2), kind)))).map((i: any) => i));
      } else {
        pool = ((py_dict_get(left, tok, 0) > 0) ? [tok] : []);
      }
      for (let i of py_iter(pool)) {
        use = Math.min(q, py_item(left, i));
        left[i] -= use;
        plan[i] = py_add(py_dict_get(plan, i, 0), use);
        q -= use;
        if ((!q)) {
          break;
        }
      }
      if (q) {
        return null;
      }
    }
    return plan;
  }

  async cook(): Promise<any> {
    let _: any = undefined; let d: any = undefined; let dishes: any = undefined; let i: any = undefined; let lines: any = undefined; let ok: any = undefined; let opts: any = undefined; let plan: any = undefined; let q: any = undefined; let sel: any = undefined; let sell: any = undefined; let st: any = undefined; let ut: any = undefined;
    while (true) {
      dishes = Array.from(py_iter(RECIPES || []));
      opts = [];
      for (let d of py_iter(dishes)) {
        ut = py_item(py_item(RECIPES, d), 1);
        ok = (((!ut) || py_in(ut, this.inv)) && (!py_eq(((this as any).ingredient_plan(d)), null)));
        opts.push(`${(ok ? "*" : " ")} ${d}`);
      }
      const info = (s: any) => {
        d = py_item(dishes, s);
        [_, ut, st, sell] = py_item(RECIPES, d);
        lines = [py_add("  ", py_slice(((this as any).recipe_line(d)), 17, null)), `  +${st} stamina, sells ${sell}G`];
        if ((ut && (!py_in(ut, this.inv)))) {
          lines.push(`  Needs a ${ut} (Supermarket)`);
        }
        plan = ((this as any).ingredient_plan(d));
        if (plan) {
          lines.push(py_add("  Uses: ", py_iter(py_iter(py_dict_items(plan)).map(([i, q]: any) => `${q} ${i}`)).join(", ")));
        }
        return lines;
      };
      sel = (await (this as any).menu("Kitchen   (* = can cook)", opts));
      if (py_eq(sel, null)) {
        return;
      }
      d = py_item(dishes, sel);
      ut = py_item(py_item(RECIPES, d), 1);
      plan = ((this as any).ingredient_plan(d));
      if ((ut && (!py_in(ut, this.inv)))) {
        (await (this as any).say(`You need a ${ut} to make ${d}.`, null));
      } else {
        if (py_eq(plan, null)) {
          (await (this as any).say(`You don't have the ingredients for ${d}.`, null));
        } else {
          for (let [i, q] of py_iter(py_dict_items(plan))) {
            ((this as any).take(i, q));
          }
          ((this as any).give(d));
          ((this as any).msg(`You cooked ${d}!`, "0A"));
        }
      }
    }
  }

}