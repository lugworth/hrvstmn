// Python runtime helpers for transpiled game logic

export function py_len(x: any): number {
  if (x === null || x === undefined) return 0;
  if (typeof x.length === 'number') return x.length;
  if (typeof x.size === 'number') return x.size;
  return Object.keys(x).length;
}

export function py_range(...args: number[]): number[] {
  let start = 0;
  let stop = 0;
  let step = 1;
  if (args.length === 1) {
    stop = args[0];
  } else if (args.length === 2) {
    start = args[0];
    stop = args[1];
  } else if (args.length >= 3) {
    start = args[0];
    stop = args[1];
    step = args[2];
  }
  const result: number[] = [];
  if (step > 0) {
    for (let i = start; i < stop; i += step) result.push(i);
  } else if (step < 0) {
    for (let i = start; i > stop; i += step) result.push(i);
  }
  return result;
}

export function py_choice(arr: any): any {
  const list = Array.isArray(arr) ? arr : Array.from(arr || []);
  if (list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export function py_mult(a: any, b: any): any {
  if (typeof a === 'string') {
    return a.repeat(Math.max(0, Math.floor(Number(b) || 0)));
  }
  if (typeof b === 'string') {
    return b.repeat(Math.max(0, Math.floor(Number(a) || 0)));
  }
  return Number(a) * Number(b);
}

export function py_randint(a: number, b: number): number {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

export function py_slice<T>(x: T[] | string, lower: number | null, upper: number | null): any {
  if (x === null || x === undefined) return x;
  const len = x.length;
  let l = lower === null ? 0 : lower < 0 ? Math.max(0, len + lower) : lower;
  let u = upper === null ? len : upper < 0 ? Math.max(0, len + upper) : upper;
  return x.slice(l, u);
}

export function py_item(obj: any, idx: any): any {
  if (obj === null || obj === undefined) return undefined;
  if (typeof idx === 'number' && idx < 0 && (Array.isArray(obj) || typeof obj === 'string')) {
    return obj[obj.length + idx];
  }
  return obj[idx];
}

export function py_in(item: any, container: any): boolean {
  if (container === null || container === undefined) return false;
  if (typeof container === 'string') return container.includes(String(item));
  if (Array.isArray(container)) {
    if (Array.isArray(item)) {
      return container.some((elem) => Array.isArray(elem) && elem.length === item.length && elem.every((v, i) => v === item[i]));
    }
    return container.includes(item);
  }
  if (container instanceof Set) {
    return container.has(item);
  }
  return Object.prototype.hasOwnProperty.call(container, item);
}

export function py_dict_get(dict: any, key: any, defaultVal: any = null): any {
  if (dict && Object.prototype.hasOwnProperty.call(dict, key)) {
    return dict[key];
  }
  return defaultVal;
}

export function py_dict_items(dict: any): [string, any][] {
  if (!dict) return [];
  return Object.entries(dict);
}

export function py_dict_keys(dict: any): string[] {
  if (!dict) return [];
  return Object.keys(dict);
}

export function py_dict_values(dict: any): any[] {
  if (!dict) return [];
  return Object.values(dict);
}

export function py_dict_setdefault(dict: any, key: any, defaultVal: any): any {
  if (dict && !Object.prototype.hasOwnProperty.call(dict, key)) {
    dict[key] = defaultVal;
  }
  return dict[key];
}

export function py_del(container: any, key: any) {
  if (!container) return;
  if (container instanceof Set) {
    container.delete(key);
  } else if (Array.isArray(container) && typeof key === 'number') {
    const idx = key < 0 ? container.length + key : key;
    container.splice(idx, 1);
  } else {
    delete container[key];
  }
}

export function py_rng(seed?: number) {
  return {
    random: () => Math.random(),
    Random: (_s?: number) => py_rng(_s),
    randint: (a: number, b: number) => py_randint(a, b),
    randrange: (stop: number) => Math.floor(Math.random() * stop),
    choice: (arr: any) => py_choice(arr),
    sample: (arr: any[], k: number) => {
      const copy = Array.from(arr || []);
      copy.sort(() => Math.random() - 0.5);
      return copy.slice(0, k);
    },
    uniform: (a: number, b: number) => Math.random() * (b - a) + a,
    shuffle: (arr: any[]) => arr.sort(() => Math.random() - 0.5),
  };
}

export function py_sum(arr: any): number {
  if (!arr) return 0;
  const list = Array.isArray(arr) ? arr : Array.from(arr);
  return list.reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
}

export function py_sorted(arr: any): any[] {
  if (!arr) return [];
  const list = Array.isArray(arr) ? [...arr] : Array.from(arr);
  return list.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function py_next(iter: any, defaultVal: any = null): any {
  if (!iter) return defaultVal;
  const list = Array.isArray(iter) ? iter : Array.from(iter);
  return list.length > 0 ? list[0] : defaultVal;
}

export function py_add(a: any, b: any): any {
  if (Array.isArray(a) && Array.isArray(b)) {
    return [...a, ...b];
  }
  return a + b;
}

export function py_eq(a: any, b: any): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!py_eq(a[i], b[i])) return false;
    }
    return true;
  }
  return false;
}

export function enumerate<T>(arr: T[]): [number, T][] {
  if (!arr) return [];
  return Array.from(arr).map((val, idx) => [idx, val]);
}

export function py_iter(container: any): any[] {
  if (!container) return [];
  if (Array.isArray(container)) return container;
  if (container instanceof Set) return Array.from(container);
  return Object.keys(container);
}

export function py_wrap(text: string, width: number): string[] {
  if (!text) return [''];
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if (cur.length + 1 + w.length <= width) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}
