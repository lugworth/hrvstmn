#!/usr/bin/env python3
"""
HRVSTMN - an ASCII tribute to Harvest Moon: Friends of Mineral Town.
Drawn in the base16 Isotope Dark palette.

    python3 hrvstmn.py            # truecolor terminal (recommended)
    python3 hrvstmn.py --256      # 256-color fallback
    python3 hrvstmn.py --clock 3  # real seconds per 10 game minutes (default 6)

Pure standard library. Linux / macOS terminals, 80x24 minimum.
"""
import json
import os
import random
import select
import shutil
import sys
import textwrap
import time

try:
    import termios
    import tty
except ImportError:  # pragma: no cover
    termios = tty = None

# --------------------------------------------------------------------------
# base16 Isotope (dark) by Jan T. Sott
# --------------------------------------------------------------------------
PALETTE = {
    '00': '000000', '01': '404040', '02': '606060', '03': '808080',
    '04': 'c0c0c0', '05': 'd0d0d0', '06': 'e0e0e0', '07': 'ffffff',
    '08': 'ff0000', '09': 'ff9900', '0A': 'ff0099', '0B': '33ff00',
    '0C': '00ffff', '0D': '0066ff', '0E': 'cc00ff', '0F': '3300ff',
}

SAVE_PATH = os.path.join(
    os.environ.get('XDG_DATA_HOME', os.path.expanduser('~/.local/share')),
    'hrvstmn', 'save.json')
SECS_PER_10MIN = 6.0


def hex_rgb(h):
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def rgb_to_256(r, g, b):
    if r == g == b:
        if r < 8:
            return 16
        if r > 238:
            return 231
        return 232 + (r - 8) // 10

    def c(v):
        return 0 if v < 48 else 1 if v < 115 else (v - 35) // 40
    return 16 + 36 * c(r) + 6 * c(g) + c(b)


def clamp(v, a, b):
    return max(a, min(b, v))


def fmt_time(mins):
    h, m = (mins // 60) % 24, mins % 60
    return f"{h % 12 or 12:2d}:{m:02d}{'AM' if h < 12 else 'PM'}"


def fmt_hour(h):
    h %= 24
    return f"{h % 12 or 12}{'AM' if h < 12 else 'PM'}"


# --------------------------------------------------------------------------
# Terminal
# --------------------------------------------------------------------------
def parse_keys(data):
    keys, i = [], 0
    named = {'\r': 'enter', '\n': 'enter', '\t': 'tab', ' ': 'space',
             '\x7f': 'backspace', '\x08': 'backspace', '\x03': 'ctrl-c'}
    arrows = {'A': 'up', 'B': 'down', 'C': 'right', 'D': 'left', 'Z': 'btab'}
    while i < len(data):
        c = data[i]
        if c == '\x1b':
            if i + 2 < len(data) + 0 and data[i + 1:i + 2] in ('[', 'O'):
                j = i + 2
                while j < len(data) and not (data[j].isalpha() or data[j] == '~'):
                    j += 1
                seq = data[i + 2:j + 1]
                i = j + 1
                if seq[-1:] in arrows:
                    keys.append(arrows[seq[-1]])
                continue
            keys.append('esc')
            i += 1
            continue
        keys.append(named.get(c, c))
        i += 1
    return keys


class Screen:
    def __init__(self, truecolor=True, headless=False):
        self.tc = truecolor
        self.headless = headless
        self.queue = []
        self.prev = None
        self.w = self.h = 0
        self._sgr = {}
        if headless:
            self.w, self.h = 100, 30
            return
        self.fd = sys.stdin.fileno()
        self.saved = termios.tcgetattr(self.fd)
        tty.setraw(self.fd)
        self.out = sys.stdout
        self.out.write('\x1b[?1049h\x1b[?25l\x1b[2J')
        self.out.flush()

    def close(self):
        if self.headless:
            return
        self.out.write('\x1b[0m\x1b[2J\x1b[?25h\x1b[?1049l')
        self.out.flush()
        termios.tcsetattr(self.fd, termios.TCSADRAIN, self.saved)

    def clear(self):
        if not self.headless:
            w, h = shutil.get_terminal_size((80, 24))
            if (w, h) != (self.w, self.h):
                self.w, self.h = w, h
                self.prev = None
                self.out.write('\x1b[0m\x1b[2J')
        blank = (' ', '05', '00', False)
        self.buf = [[blank] * self.w for _ in range(self.h)]

    def put(self, x, y, text, fg='05', bg='00', bold=False):
        if not 0 <= y < self.h:
            return
        row = self.buf[y]
        for i, ch in enumerate(text):
            if 0 <= x + i < self.w:
                row[x + i] = (ch, fg, bg, bold)

    def box(self, x, y, w, h, fg='03', bg='00', title=None, tfg='07'):
        for j in range(h):
            self.put(x, y + j, ' ' * w, fg, bg)
        edge = '+' + '-' * (w - 2) + '+'
        self.put(x, y, edge, fg, bg)
        self.put(x, y + h - 1, edge, fg, bg)
        for j in range(1, h - 1):
            self.put(x, y + j, '|', fg, bg)
            self.put(x + w - 1, y + j, '|', fg, bg)
        if title:
            self.put(x + 2, y, f' {title} ', tfg, bg, True)

    def sgr(self, fg, bg, bold):
        key = (fg, bg, bold)
        if key not in self._sgr:
            b = '1;' if bold else ''
            fr, fgc, fb = hex_rgb(PALETTE[fg])
            br, bgc, bb = hex_rgb(PALETTE[bg])
            if self.tc:
                s = f'\x1b[0;{b}38;2;{fr};{fgc};{fb};48;2;{br};{bgc};{bb}m'
            else:
                s = f'\x1b[0;{b}38;5;{rgb_to_256(fr, fgc, fb)};48;5;{rgb_to_256(br, bgc, bb)}m'
            self._sgr[key] = s
        return self._sgr[key]

    def flush(self):
        if self.headless:
            self.prev = self.buf
            return
        out, last, cur = [], None, None
        prev = self.prev
        for y, row in enumerate(self.buf):
            prow = prev[y] if prev else None
            for x, cell in enumerate(row):
                if prow is not None and prow[x] == cell:
                    continue
                if y == self.h - 1 and x == self.w - 1:
                    continue
                if cur != (x, y):
                    out.append(f'\x1b[{y + 1};{x + 1}H')
                attr = cell[1:]
                if attr != last:
                    out.append(self.sgr(*attr))
                    last = attr
                out.append(cell[0])
                cur = (x + 1, y)
        if out:
            self.out.write(''.join(out))
            self.out.flush()
        self.prev = self.buf

    def text(self):
        """Plain-text dump of the current frame (for debugging/tests)."""
        return '\n'.join(''.join(c[0] for c in row) for row in self.buf)

    def getkey(self, timeout=None):
        if self.headless:
            if not self.queue:
                raise RuntimeError('headless screen ran out of keys')
            return self.queue.pop(0)
        if not self.queue:
            r, _, _ = select.select([self.fd], [], [], timeout)
            if r:
                data = os.read(self.fd, 4096)
                self.queue.extend(parse_keys(data.decode('utf-8', 'ignore')))
        return self.queue.pop(0) if self.queue else None


# --------------------------------------------------------------------------
# Game data
# --------------------------------------------------------------------------
SEASONS = ['Spring', 'Summer', 'Fall', 'Winter']
WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
SEASON_COL = {'Spring': '0A', 'Summer': '0B', 'Fall': '09', 'Winter': '0C'}
WEATHER_COL = {'Sunny': '09', 'Rain': '0D', 'Snow': '07'}

# name: (season, seed price, days to grow, regrow days, sell price, glyph, color)
CROPS = {
    'Turnip':       ('Spring', 120, 4, 0, 60, 'o', '07'),
    'Potato':       ('Spring', 150, 7, 0, 80, 'o', '09'),
    'Cucumber':     ('Spring', 200, 9, 5, 60, 'j', '0B'),
    'Strawberry':   ('Spring', 150, 8, 2, 30, '*', '08'),
    'Cabbage':      ('Spring', 500, 14, 0, 250, 'Q', '0B'),
    'Tomato':       ('Summer', 200, 9, 3, 60, '*', '08'),
    'Corn':         ('Summer', 300, 14, 3, 100, 'Y', '09'),
    'Onion':        ('Summer', 150, 7, 0, 80, 'o', '0E'),
    'Pumpkin':      ('Summer', 500, 14, 0, 250, 'O', '09'),
    'Pineapple':    ('Summer', 1000, 20, 5, 500, 'A', '09'),
    'Eggplant':     ('Fall', 120, 9, 3, 80, 'd', '0E'),
    'Carrot':       ('Fall', 300, 7, 0, 120, 'v', '09'),
    'Sweet Potato': ('Fall', 300, 5, 2, 120, 'o', '0A'),
    'Green Pepper': ('Fall', 150, 7, 2, 40, 'j', '0B'),
    'Spinach':      ('Fall', 200, 5, 0, 80, 'w', '0B'),
}

FORAGE = {
    'Spring': ['Bamboo Shoot', 'Medicinal Herb', 'Moondrop Flower', 'Toy Flower'],
    'Summer': ['Red Grass', 'Pink Cat Flower', 'Wild Grape', 'Medicinal Herb'],
    'Fall':   ['Mushroom', 'Truffle', 'Wild Grape', 'Red Grass'],
    'Winter': ['Blue Grass'],
}
FORAGE_GLYPH = {
    'Bamboo Shoot': ('!', '0B'), 'Medicinal Herb': ('"', '0B'),
    'Moondrop Flower': ('*', '0C'), 'Toy Flower': ('*', '0A'),
    'Red Grass': ('"', '08'), 'Pink Cat Flower': ('*', '0E'),
    'Wild Grape': ('%', '0E'), 'Mushroom': ('m', '09'),
    'Truffle': ('m', '04'), 'Blue Grass': ('"', '0D'),
}

# name: (sell price, stamina when eaten, category)
ITEMS = {}
for _c, _d in CROPS.items():
    ITEMS[_c] = (_d[4], 3 + _d[4] // 25, 'crop')
    ITEMS[_c + ' Seeds'] = (0, 0, 'seed')
ITEMS.update({
    'Bamboo Shoot': (50, 4, 'forage'), 'Medicinal Herb': (10, 8, 'forage'),
    'Moondrop Flower': (60, 0, 'forage'), 'Toy Flower': (80, 0, 'forage'),
    'Red Grass': (110, 6, 'forage'), 'Pink Cat Flower': (70, 0, 'forage'),
    'Wild Grape': (50, 4, 'forage'), 'Mushroom': (70, 5, 'forage'),
    'Truffle': (200, 6, 'forage'), 'Blue Grass': (100, 6, 'forage'),
    'Small Fish': (50, 5, 'fish'), 'Medium Fish': (120, 8, 'fish'),
    'Large Fish': (200, 12, 'fish'), 'Egg': (50, 6, 'animal'),
    'Copper': (15, 0, 'ore'), 'Silver': (20, 0, 'ore'), 'Gold': (25, 0, 'ore'),
    'Mystrile': (40, 0, 'ore'), 'Amethyst': (60, 0, 'ore'), 'Diamond': (100, 0, 'ore'),
    'Lumber': (0, 0, 'material'), 'Chicken Feed': (0, 0, 'material'),
    'Blue Feather': (0, 0, 'special'),
    'Bread': (0, 20, 'food'), 'Milk': (0, 15, 'food'), 'Bodigizer': (0, 100, 'food'),
})

# ---- barn animals: data ----
ITEMS.update({
    'Fodder': (0, 0, 'material'), 'Milker': (0, 0, 'tool'), 'Clippers': (0, 0, 'tool'),
    'Brush': (0, 0, 'tool'), 'Small Milk': (100, 10, 'animal'), 'Medium Milk': (150, 15, 'animal'),
    'Large Milk': (200, 20, 'animal'), 'Wool': (100, 0, 'animal'), 'Large Wool': (200, 0, 'animal'),
})
BARN_CAP = 8
ANIMALS = {'cow': ('Cow', 5000), 'sheep': ('Sheep', 4000)}
WOOL_DAYS = 7
COW_NAMES = ['Bessie', 'Daisy', 'Clover', 'Buttercup', 'Moo', 'Mocha', 'Dotty', 'Penny']
SHEEP_NAMES = ['Fluffy', 'Cotton', 'Woolly', 'Snowball', 'Puff', 'Lamby', 'Cloud', 'Tuft']

TOOLS = ['Sickle', 'Hoe', 'Hammer', 'Axe', 'Watering Can', 'Fishing Rod']
UPGRADABLE = ['Hoe', 'Hammer', 'Axe', 'Watering Can']
LEVELS = ['Basic', 'Copper', 'Silver', 'Gold', 'Mystrile']
LEVEL_COL = ['04', '08', '06', '09', '0C']
UPGRADE = {1: (1000, 'Copper'), 2: (2000, 'Silver'), 3: (3000, 'Gold'), 4: (5000, 'Mystrile')}
CAN_CAP = [30, 45, 60, 80, 100]
AREA = [(1, 0), (3, 0), (2, 1), (3, 1), (5, 1)]  # (depth, half-width) per level

OBJ_GLYPH = {'weed': ('w', '0B'), 'stone': ('*', '04'), 'branch': ('/', '09'),
             'stump': ('0', '09'), 'boulder': ('O', '04'), 'rock': ('o', '03')}

# opening hour, closing hour, closed weekdays (Mon=0)
HOURS = {
    'supermarket': (9, 17, {6}), 'poultry': (11, 16, {6}), 'blacksmith': (10, 16, {3}),
    'inn': (8, 22, set()), 'clinic': (9, 16, {2}), 'library': (10, 16, {0}),
    'church': (6, 20, set()), 'mayor': (8, 20, set()), 'yodel': (10, 15, set()),
}
BUILDINGS = {
    'supermarket': 'Supermarket', 'poultry': "Lillia's Poultry Farm",
    'blacksmith': 'Saibara\'s Blacksmith', 'inn': "Doug's Inn", 'clinic': 'Clinic',
    'library': 'Library', 'church': 'Church', 'mayor': "Mayor Thomas' House",
    'yodel': 'Yodel Ranch',
}


def npc(g, col, home, out=None, where=None, rain=False, bach=False,
        loves=(), likes=(), hates=(), lines=()):
    return dict(g=g, col=col, home=home, out=out, where=where, rain=rain, bach=bach,
                loves=list(loves), likes=list(likes), hates=list(hates), lines=list(lines))


NPCS = {
    'Mary': npc('M', '0D', 'library', (13, 17), ('town', 45, 9), bach=True,
                loves=['Bamboo Shoot', 'Moondrop Flower'],
                likes=['Medicinal Herb', 'Potato', 'Wild Grape', 'Mushroom', 'Blue Grass'],
                hates=['Small Fish', 'Medium Fish', 'Large Fish'],
                lines=[["Oh... hello. I'm Mary. My father and I run the library.",
                        "The mountain herbs are so interesting this time of year."],
                       ["I've been writing a novel. Please don't tell anyone!",
                        "You can learn so much from books. And from farming, I suppose."],
                       ["When you visit, the words just seem to flow...",
                        "I hope you'll come to the library again soon. I'll be waiting."]]),
    'Karen': npc('K', '0E', 'supermarket', (17, 22), ('town', 33, 17), bach=True,
                 loves=['Bamboo Shoot', 'Wild Grape'],
                 likes=['Corn', 'Tomato', 'Large Fish', 'Red Grass'],
                 hates=['Toy Flower', 'Pink Cat Flower'],
                 lines=[["Hmph, the new farmer, huh? I'm Karen. My parents run the Supermarket.",
                         "This town is so boring. Nothing ever happens here."],
                        ["You're working pretty hard on that farm. Not bad.",
                         "Rose Square is nice at night. ...Not that I'm inviting you."],
                        ["I used to want to leave this town. Now I'm not so sure. Funny, huh?",
                         "Don't look at me like that! ...Okay, you can look."]]),
    'Popuri': npc('P', '0A', 'poultry', (11, 16), ('town', 51, 21), bach=True,
                  loves=['Strawberry', 'Pink Cat Flower'],
                  likes=['Egg', 'Toy Flower', 'Moondrop Flower', 'Turnip'],
                  hates=['Copper', 'Silver', 'Gold', 'Mystrile'],
                  lines=[["Hi hi! I'm Popuri! We raise chickens at the Poultry Farm!",
                          "My brother Rick is soooo overprotective."],
                         ["Your farm is getting so cute! Do you have chickens yet? You should!",
                          "I picked flowers on the mountain today. Wanna see?"],
                         ["Ehehe... being with you makes me all fluttery!",
                          "Let's go on an adventure someday, okay? Just us!"]]),
    'Elli': npc('E', '07', 'clinic', (16, 19), ('town', 32, 11), bach=True,
                loves=['Moondrop Flower', 'Toy Flower'],
                likes=['Egg', 'Strawberry', 'Medicinal Herb', 'Cabbage'],
                hates=['Mushroom', 'Truffle'],
                lines=[["Hello, I'm Elli, the nurse at the Clinic. Don't overwork yourself!",
                        "If you feel tired, eat something. Your body will thank you."],
                       ["You look healthy today. Are you eating your vegetables?",
                        "My little brother Stu is a handful, but I love him."],
                       ["I worry about you, you know. Please take care of yourself... for me.",
                        "Seeing you smile is the best medicine."]]),
    'Ann': npc('A', '09', 'inn', (14, 17), ('town', 23, 21), bach=True,
               loves=['Sweet Potato', 'Large Fish'],
               likes=['Potato', 'Onion', 'Carrot', 'Pumpkin', 'Egg', 'Medium Fish'],
               hates=['Truffle'],
               lines=[["Hi! I'm Ann! My dad Doug runs the Inn. Come eat with us!",
                       "I'm terrible at cooking but great at fixing things!"],
                      ["Dad says I should act more like a lady. As if!",
                       "Your crops would make a great stew. Hint hint!"],
                      ["You're the only one who doesn't mind when I'm covered in grease.",
                       "Hey... come by the Inn tonight? I'll save you a seat."]]),
    'Thomas': npc('T', '08', 'mayor', (9, 15), ('town', 38, 17), rain=True,
                  loves=['Large Fish', 'Truffle'], likes=['Turnip', 'Egg', 'Potato'],
                  lines=[["Ho ho! Welcome to Mineral Town! I'm Mayor Thomas.",
                          "If you need anything, just ask! Hm hm!"],
                         ["Your farm is coming along nicely! Your grandfather would be proud.",
                          "Rose Square is the heart of our little town!"],
                         ["Mineral Town is lucky to have you, my friend! Ho ho!"]]),
    'Gray': npc('G', '04', 'blacksmith', (17, 19), ('town', 21, 9),
                loves=['Gold', 'Mystrile'], likes=['Copper', 'Silver', 'Amethyst'],
                hates=['Toy Flower', 'Pink Cat Flower'],
                lines=[["...I'm Gray. Apprentice at the blacksmith. Got a problem?",
                        "Gramps works me to the bone."],
                       ["Bring ore if you want your tools upgraded. Good ore.",
                        "...Your tools are holding up. Not bad."],
                       ["...Thanks for always stopping by. I mean it."]]),
    'Cliff': npc('C', '0C', 'inn', (9, 17), ('mountain', 27, 9),
                 loves=['Medium Fish', 'Large Fish'], likes=['Bamboo Shoot', 'Wild Grape'],
                 hates=['Truffle'],
                 lines=[["Oh... hi. I'm Cliff. I'm just passing through. I think.",
                         "The lake is calm today."],
                        ["Mineral Town feels like it could be home. Maybe.",
                         "I've been looking for work. Doesn't seem to be much around."],
                        ["Thanks for talking to me. It means more than you know."]]),
    'Rick': npc('R', '0F', 'poultry', (9, 13), ('town', 57, 9),
                loves=['Egg'], likes=['Turnip', 'Corn', 'Large Fish'], hates=['Moondrop Flower'],
                lines=[["I'm Rick. I look after the chickens. And stay away from my sister.",
                        "Chickens are smarter than people think."],
                       ["Hey, you're alright. For a farmer.",
                        "Fill their feed boxes every day and they'll lay every day."],
                       ["Popuri talks about you a lot. ...I suppose that's okay."]]),
    'May': npc('Y', '0B', 'yodel', (10, 16), ('town', 63, 22),
               loves=['Strawberry', 'Toy Flower'], likes=['Egg', 'Turnip', 'Sweet Potato'],
               hates=['Mushroom'],
               lines=[["I'm May! I live at Yodel Ranch with Grandpa Barley!",
                       "Do you like cows? I like cows."],
                      ["Grandpa says you work really hard!", "Can I visit your farm sometime?"],
                      ["You're my best friend in the whole world!"]]),
    'Jeff': npc('J', '05', 'supermarket', loves=['Moondrop Flower'], likes=['Turnip', 'Potato'],
                lines=[["W-welcome to the Supermarket. Please, take your time.",
                        "My wife Sasha handles... most things."],
                       ["Seeds sell well this time of year. I think."],
                       ["You're one of our best customers. Thank you, really."]]),
    'Saibara': npc('S', '06', 'blacksmith', loves=['Mystrile', 'Diamond'], likes=['Gold', 'Silver'],
                   lines=[["Hmph. I'm Saibara. Bring me ore and gold and I'll make your tools sing.",
                           "Copper, Silver, Gold, Mystrile. That is the path of the craftsman."],
                          ["You treat your tools well. Good."],
                          ["You remind me of myself when I was young. Hmph."]]),
    'Doug': npc('D', '09', 'inn', loves=['Large Fish'], likes=['Onion', 'Potato', 'Cabbage'],
                lines=[["Welcome to Doug's Inn! Hungry? Lunch is always on.",
                        "Ann's a good kid. Wish she'd wear a dress once in a while."],
                       ["You look like you need a hot meal."],
                       ["You're always welcome here, friend!"]]),
    'Doctor': npc('T', '04', 'clinic', loves=['Medicinal Herb', 'Blue Grass'],
                  lines=[["I'm the town doctor. Hmm. You should get more sleep.",
                          "A Bodigizer will restore your strength in a pinch."],
                         ["Your health is improving. Keep it up."],
                         ["...You're one of my more sensible patients."]]),
    'Lillia': npc('L', '0A', 'poultry', loves=['Moondrop Flower', 'Toy Flower'], likes=['Egg'],
                  lines=[["I'm Lillia. Welcome to our Poultry Farm. Chickens are 1500G.",
                          "Keep their feed boxes full and they'll give you an egg every day."],
                         ["My children are a blessing. And so are chickens!"],
                         ["Thank you for looking after Popuri and Rick."]]),
    'Barley': npc('B', '05', 'yodel', loves=['Large Fish'], likes=['Egg', 'Corn'],
                  lines=[["Welcome to Yodel Ranch. I'm Barley. We sell fresh milk.",
                          "May is all I have left. She keeps me young."],
                         ["Cows need love, just like people."],
                         ["You've been a good friend to May. Thank you."]]),
    'Carter': npc('C', '07', 'church', loves=['Moondrop Flower'], likes=['Wild Grape'],
                  lines=[["Welcome to the church. I'm Pastor Carter. May the Goddess bless you.",
                          "Confession is good for the soul."],
                         ["The Harvest Goddess smiles on hard workers."],
                         ["You have a kind heart. I can tell."]]),
    'Basil': npc('B', '0B', 'library', loves=['Truffle', 'Mushroom'],
                 likes=['Medicinal Herb', 'Red Grass', 'Blue Grass'],
                 lines=[["I'm Basil, a botanist. Mary is my daughter.",
                         "The mountains are full of rare plants. Have you looked?"],
                        ["Each season brings new wild herbs. Fascinating!"],
                        ["You have the eyes of a true naturalist."]]),
}

SPOUSE_LINES = [
    "Welcome home! Don't work too hard today, okay?",
    "I'm so happy we live here together.",
    "The farm looks wonderful. You're amazing.",
    "Dinner will be ready when you get back!",
]

BOOKS = [
    "'Turnips for Beginners': Turnips grow in just 4 days. A fine first crop!",
    "'Watering Wisdom': Crops only grow on days their soil was watered. Rain does it for you.",
    "'The Craftsman's Path': Saibara can upgrade your Hoe and Watering Can to work wider areas.",
    "'Mysteries of the Mine': Deeper floors hide silver, gold... and rarer things. Look for the ladder under rocks.",
    "'Of Hens and Hearts': A fed chicken lays one egg every morning.",
    "'Seasonal Sorrows': When the season changes, all crops in the field wither. Plan your harvest!",
    "'Regrowing Riches': Cucumbers, tomatoes, corn and more regrow after harvest.",
    "'A Gift Guide': Everyone has favorites. A loved gift warms a heart far more than a talk.",
    "'The Blue Feather': A blue feather is given to the one you wish to marry. Hearts must be full.",
    "'Rest & Recovery': Sleeping before midnight restores all your stamina.",
]

HELP = [
    "MOVE      arrows / WASD / hjkl",
    "USE TOOL  space or z",
    "ACT       x / e / enter   talk, give held item, harvest,",
    "                          pick up, ship, enter doors, sleep",
    "TOOLS     tab / shift-tab cycle,  1-6 pick a tool",
    "          seed bags appear in the cycle; they sow a 3x3 patch",
    "RUCKSACK  i   hold an item (to gift it) or eat it",
    "MENU      esc        QUIT  Q",
    "",
    "Till soil with the Hoe, sow seeds, water every day.",
    "Ship produce in the bin ($) - Zack pays out each morning.",
    "Time only passes outdoors. Sleep in your bed to save.",
    "Talk to villagers daily and give gifts to raise hearts.",
]


# ---- festivals ------------------------------------------------------------
# (season, day): (name, start hour, end hour, event kind)
FESTIVALS = {
    (0, 1): ("New Year's Day", 9, 17, 'newyear'),
    (0, 8): ('Goddess Festival', 10, 18, 'goddess'),
    (0, 18): ('Flower Festival', 10, 18, 'dance'),
    (0, 22): ('Chicken Sumo', 10, 16, 'sumo'),
    (1, 8): ('Egg Hunt', 10, 16, 'egghunt'),
    (1, 20): ('Crop Festival', 10, 18, 'crops'),
    (1, 24): ('Fireworks Festival', 18, 22, 'fireworks'),
    (2, 13): ('Harvest Festival', 10, 18, 'harvest'),
    (2, 20): ('Moon Viewing', 18, 22, 'moon'),
    (3, 14): ('Thanksgiving', 10, 18, 'thanks'),
    (3, 24): ('Starry Night', 18, 22, 'starry'),
    (3, 30): ("New Year's Eve", 18, 23, 'nye'),
}
BIRTHDAYS = {
    'Mary': (3, 20), 'Karen': (2, 15), 'Popuri': (1, 3), 'Elli': (0, 16), 'Ann': (1, 17),
    'Thomas': (1, 25), 'Gray': (3, 6), 'Cliff': (1, 6), 'Rick': (2, 27), 'May': (3, 26),
    'Jeff': (3, 29), 'Saibara': (1, 21), 'Doug': (1, 12), 'Doctor': (2, 19),
    'Lillia': (0, 19), 'Barley': (1, 26), 'Carter': (2, 6), 'Basil': (1, 11),
}
# spots villagers gather around the Rose Square fountain
FEST_SPOTS = [(31, 11), (33, 10), (36, 10), (39, 11), (41, 12), (41, 14), (39, 16),
              (36, 16), (33, 16), (31, 14), (32, 12), (40, 13)]
ITEMS['Cake'] = (0, 30, 'food')


# --------------------------------------------------------------------------
# Maps
# --------------------------------------------------------------------------
# type: (glyph, fg, bg, walkable)
TILES = {
    'void': (' ', '00', '00', False),
    'grass': (' ', '0B', '00', True),
    'field': ('.', '02', '00', True),
    'path': ('.', '03', '01', True),
    'tree': ('T', '0B', '00', False),
    'water': ('~', '0D', '00', False),
    'fountain': ('~', '0C', '00', False),
    'wall': ('#', '02', '01', False),
    'roof': ('^', '08', '00', False),
    'door': ('+', '09', '01', False),
    'bin': ('$', '09', '01', False),
    'flower': ('*', '0A', '00', False),
    'bridge': ('=', '09', '00', True),
    'cliff': ('^', '03', '00', False),
    'cave': ('O', '07', '01', False),
    'sign': ('?', '09', '01', False),
    'floor': ('.', '02', '00', True),
    'iwall': ('#', '03', '01', False),
    'bed': ('=', '0D', '01', False),
    'tv': ('T', '0C', '01', False),
    'cal': ('%', '07', '01', False),
    'table': ('n', '09', '00', False),
    'mwall': ('#', '02', '01', False),
    'mfloor': ('.', '01', '00', True),
    'up': ('<', '0C', '00', True),
    'down': ('>', '0C', '00', True),
    'counter': ('=', '09', '01', False),
    'furn': ('?', '04', '00', False),
    'bookcase': ('|', '0E', '00', False),
    'exit': ('+', '09', '01', True),
}


class Map:
    def __init__(self, name, w, h, fill, title, indoor=False):
        self.name, self.w, self.h, self.title, self.indoor = name, w, h, title, indoor
        self.t = [[fill] * w for _ in range(h)]
        self.deco, self.doors, self.warps, self.signs = {}, {}, {}, {}

    def inside(self, x, y):
        return 0 <= x < self.w and 0 <= y < self.h

    def tile(self, x, y):
        return self.t[y][x] if self.inside(x, y) else 'void'

    def set(self, x, y, t):
        if self.inside(x, y):
            self.t[y][x] = t

    def rect(self, x0, y0, x1, y1, t):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, t)

    def border(self, t):
        for x in range(self.w):
            self.t[0][x] = self.t[self.h - 1][x] = t
        for y in range(self.h):
            self.t[y][0] = self.t[y][self.w - 1] = t

    def near(self, x, y, types, r=1):
        return any(self.tile(x + dx, y + dy) in types
                   for dx in range(-r, r + 1) for dy in range(-r, r + 1))


def building(m, x0, y0, w, h, label, roof, door_id):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            if y < y0 + 2:
                if y == y0 and x in (x0, x0 + w - 1):
                    continue
                m.t[y][x] = 'roof'
                left = x0 + (1 if y == y0 else 0)
                right = x0 + w - 1 - (1 if y == y0 else 0)
                m.deco[(x, y)] = ('/' if x == left else '\\' if x == right else '^', roof)
            else:
                m.t[y][x] = 'wall'
    sx = x0 + (w - len(label)) // 2
    for i, ch in enumerate(label):
        m.deco[(sx + i, y0 + 2)] = (ch, '07')
    dx, dy = x0 + w // 2, y0 + h - 1
    if w >= 7:
        m.deco[(x0 + 2, dy)] = ('=', '0C')
        m.deco[(x0 + w - 3, dy)] = ('=', '0C')
    m.t[dy][dx] = 'door'
    m.doors[(dx, dy)] = door_id


def build_farm():
    m = Map('farm', 64, 28, 'grass', 'Your Farm')
    m.border('tree')
    m.rect(3, 9, 60, 26, 'field')
    m.rect(1, 7, 63, 7, 'path')
    for y in (6, 7, 8):
        m.set(63, y, 'path')
        m.warps[(63, y)] = ('town', 1, y)
    building(m, 4, 1, 9, 5, 'HOME', '08', 'house_in')
    building(m, 16, 1, 9, 5, 'COOP', '09', 'coop')
    m.set(8, 6, 'path')
    m.set(20, 6, 'path')
    m.set(14, 6, 'bin')
    m.set(11, 6, 'sign')
    m.signs[(11, 6)] = 'farm'
    for y in range(1, 7):
        for x in range(48, 62):
            if ((x - 55) / 6.0) ** 2 + ((y - 3.5) / 2.6) ** 2 <= 1:
                m.set(x, y, 'water')
    rng = random.Random(3)
    for y in range(1, 6):
        for x in range(27, 47):
            if rng.random() < 0.18:
                m.set(x, y, 'tree')
    m.rect(26, 1, 38, 6, 'grass')
    building(m, 27, 1, 11, 5, 'BARN', '08', 'barn')
    m.set(32, 6, 'path')
    return m


def build_town():
    m = Map('town', 72, 32, 'grass', 'Mineral Town')
    m.border('tree')
    m.rect(1, 7, 70, 7, 'path')
    for y in (6, 7, 8):
        m.set(0, y, 'path')
        m.warps[(0, y)] = ('farm', 62, y)
    m.rect(35, 0, 37, 6, 'path')
    for x in (35, 36, 37):
        m.warps[(x, 0)] = ('mountain', x, 24)
    m.rect(1, 20, 70, 20, 'path')
    m.rect(29, 8, 43, 19, 'path')
    m.rect(35, 12, 37, 14, 'fountain')
    m.deco[(36, 13)] = ('Y', '07')
    for x, y in [(30, 9), (31, 9), (30, 10), (41, 9), (42, 9), (42, 10),
                 (30, 18), (31, 18), (30, 17), (41, 18), (42, 18), (42, 17)]:
        m.set(x, y, 'flower')
    m.set(39, 10, 'sign')
    m.signs[(39, 10)] = "ROSE SQUARE - The heart of Mineral Town."
    m.rect(36, 21, 36, 27, 'path')
    m.rect(1, 28, 70, 29, 'water')
    m.set(36, 28, 'bridge')
    building(m, 2, 2, 13, 5, 'SUPERMARKET', '0D', 'supermarket')
    building(m, 16, 2, 11, 5, 'BLACKSMITH', '03', 'blacksmith')
    building(m, 40, 2, 11, 5, 'LIBRARY', '0E', 'library')
    building(m, 53, 2, 9, 5, 'MAYOR', '08', 'mayor')
    building(m, 63, 2, 8, 5, 'CHURCH', '07', 'church')
    building(m, 3, 15, 11, 5, 'CLINIC', '0C', 'clinic')
    building(m, 16, 14, 12, 6, "DOUG'S INN", '09', 'inn')
    building(m, 45, 15, 12, 5, 'POULTRY', '0A', 'poultry')
    building(m, 59, 15, 12, 5, 'YODEL RANCH', '0B', 'yodel')
    m.set(1, 21, 'sign')
    m.signs[(1, 21)] = "West: your farm.  North: Mother's Hill.  South: the river - good fishing!"
    rng = random.Random(11)
    for y in list(range(9, 14)) + list(range(22, 27)):
        for x in range(1, 71):
            if m.tile(x, y) == 'grass' and not m.near(x, y, ('path', 'door', 'flower', 'sign')) \
                    and rng.random() < 0.12:
                m.set(x, y, 'tree' if rng.random() < 0.8 else 'flower')
    return m


def build_mountain():
    m = Map('mountain', 64, 26, 'grass', "Mother's Hill")
    m.border('tree')
    for x in (35, 36, 37):
        m.set(x, 25, 'path')
        m.warps[(x, 25)] = ('town', x, 1)
    m.rect(36, 7, 36, 24, 'path')
    m.rect(36, 7, 52, 7, 'path')
    m.rect(52, 5, 52, 7, 'path')
    m.rect(44, 1, 60, 4, 'cliff')
    m.set(52, 4, 'cave')
    m.doors[(52, 4)] = 'mine'
    for y in range(3, 16):
        for x in range(4, 30):
            if ((x - 16) / 9.5) ** 2 + ((y - 9) / 4.5) ** 2 <= 1:
                m.set(x, y, 'water')
    m.set(38, 22, 'sign')
    m.signs[(38, 22)] = "MOTHER'S HILL - Lake to the west. The old mine lies to the northeast."
    rng = random.Random(7)
    for y in range(1, 25):
        for x in range(1, 63):
            if m.tile(x, y) == 'grass' and not m.near(x, y, ('path', 'water', 'sign', 'cave')) \
                    and rng.random() < 0.09:
                m.set(x, y, 'tree')
    building(m, 37, 2, 7, 5, 'GOTZ', '09', 'carpenter')
    return m


def build_house():
    m = Map('house', 15, 7, 'floor', 'Your House', indoor=True)
    m.border('iwall')
    m.set(1, 1, 'bed')
    m.set(2, 1, 'bed')
    m.set(6, 1, 'tv')
    m.set(7, 1, 'tv')
    m.deco[(7, 1)] = ('V', '0C')
    m.set(12, 1, 'cal')
    m.set(6, 3, 'table')
    m.set(7, 3, 'table')
    m.set(7, 6, 'door')
    m.doors[(7, 6)] = 'house_out'
    return m


def build_mine(floor):
    m = Map('mine', 40, 16, 'mfloor', f'Mine  B{floor}F')
    m.border('mwall')
    rng = random.Random()
    for _ in range(4 + floor // 2):
        cx, cy = rng.randint(6, 36), rng.randint(3, 12)
        for _ in range(rng.randint(3, 9)):
            m.set(cx + rng.randint(-2, 2), cy + rng.randint(-1, 1), 'mwall')
    m.rect(1, 1, 3, 3, 'mfloor')
    m.set(1, 1, 'up')
    rocks = {}
    for y in range(1, m.h - 1):
        for x in range(1, m.w - 1):
            if m.tile(x, y) == 'mfloor' and max(abs(x - 1), abs(y - 1)) > 2 and rng.random() < 0.42:
                rocks[(x, y)] = 'rock'
    far = [p for p in rocks if p[0] > 14] or list(rocks)
    ladder = rng.choice(far) if far else (m.w - 2, m.h - 2)
    rocks.setdefault(ladder, 'rock')
    return m, rocks, ladder


# ---- interiors ----------------------------------------------------------
# '#' wall  '.' floor  'D' door out  '=' shop counter  'B' bookcase
# 'k' shopkeeper spot (behind the counter)  '1'-'3' resident spots
INTERIOR_LEGEND = {
    'H': ('furn', 'H', '09'),  # shelves
    'P': ('furn', '=', '02'),  # pew
    'F': ('furn', '&', '08'),  # forge
    'A': ('furn', 'T', '04'),  # anvil
    'b': ('furn', '=', '0D'),  # bed
    'c': ('furn', 'h', '03'),  # chair
    'o': ('furn', 'o', '09'),  # barrel / milk can
    'p': ('furn', '*', '0B'),  # potted plant
    'S': ('furn', '^', '08'),  # fireplace
    'M': ('furn', '+', '08'),  # medicine cabinet
    'C': ('furn', 'c', '07'),  # chicken pen
    'y': ('furn', '"', '09'),  # hay
    't': ('table', None, None),
    'B': ('bookcase', None, None),
    '=': ('counter', None, None),
    '#': ('iwall', None, None),
}
BOOK_COLS = ['0D', '0E', '08', '0B', '09', '0C']

INTERIOR_LAYOUTS = {
    'supermarket': [
        "###################",
        "#HHH#....k....#HHH#",
        "#...#=========#...#",
        "#.................#",
        "#.HH..HH...HH..HH.#",
        "#.HH..HH...HH..HH.#",
        "#.................#",
        "#p......1........p#",
        "#########D#########",
    ],
    'blacksmith': [
        "#################",
        "#FF#....k....#oo#",
        "#FF#=========#..#",
        "#...............#",
        "#.A.....1.....o.#",
        "#...............#",
        "########D########",
    ],
    'inn': [
        "#####################",
        "#S..#.....k.....#b.b#",
        "#...#===========#...#",
        "#...................#",
        "#.ctc...ctc...ctc...#",
        "#...........1.......#",
        "#..2.........3......#",
        "#o.................o#",
        "##########D##########",
    ],
    'clinic': [
        "#################",
        "#M.b.b#..k..#MMM#",
        "#.....#=====#...#",
        "#...............#",
        "#.cc........1...#",
        "#p.............p#",
        "########D########",
    ],
    'library': [
        "###################",
        "#BBBBBB#.k.#BBBBBB#",
        "#......#===#......#",
        "#.................#",
        "#.BB.BB..1..BB.BB.#",
        "#.................#",
        "#.ctc.........ctc.#",
        "#p...............p#",
        "#########D#########",
    ],
    'church': [
        "#################",
        "#p....#.k.#....p#",
        "#.....#===#.....#",
        "#...............#",
        "#.PPPP.....PPPP.#",
        "#...............#",
        "#.PPPP.....PPPP.#",
        "#.......1.......#",
        "########D########",
    ],
    'mayor': [
        "###############",
        "#Hb#..k..#..p.#",
        "#..#=====#....#",
        "#.............#",
        "#.ctc.....1...#",
        "#.............#",
        "#######D#######",
    ],
    'poultry': [
        "###################",
        "#yy#....k....#CCCC#",
        "#yy#=========#....#",
        "#.................#",
        "#.CC..CC.....1....#",
        "#.............2...#",
        "#o...............o#",
        "#########D#########",
    ],
    'yodel': [
        "###################",
        "#yy#....k....#ooo.#",
        "#yy#=========#....#",
        "#.................#",
        "#.ctc.....1.......#",
        "#...............p.#",
        "#########D#########",
    ],
}


def build_interior(bid, exit_to):
    """Build an indoor Map for building `bid`. `exit_to` is (map, x, y) outside its door.
    Returns (map, entry_xy, spots) where spots maps 'k'/'1'.. to positions."""
    rows = INTERIOR_LAYOUTS[bid]
    w, h = len(rows[0]), len(rows)
    assert all(len(r) == w for r in rows), f"ragged interior layout: {bid}"
    m = Map(f'in_{bid}', w, h, 'floor', BUILDINGS[bid], indoor=True)
    spots, entry = {}, None
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in INTERIOR_LEGEND:
                t, g, fg = INTERIOR_LEGEND[ch]
                m.t[y][x] = t
                if g:
                    m.deco[(x, y)] = (g, fg)
                elif t == 'bookcase':
                    m.deco[(x, y)] = ('|[]'[(x + y) % 3], BOOK_COLS[(x * 5 + y * 3) % 6])
            elif ch == 'D':
                m.t[y][x] = 'exit'
                m.warps[(x, y)] = exit_to
                entry = (x, y - 1)
            elif ch != '.':
                spots[ch] = (x, y)
    return m, entry, spots


# ---- carpentry & cooking ----------------------------------------------------
TILES.update({
    'kitchen': ('&', '09', '01', False),
    'shelf': ('H', '09', '01', False),
    'bath': ('U', '0C', '01', False),
})
HOURS['carpenter'] = (10, 16, {2})
BUILDINGS['carpenter'] = "Gotz's Workshop"
NPCS['Gotz'] = npc('G', '09', 'carpenter', loves=['Curry Rice'],
                   likes=['Stew', 'Grilled Fish', 'Wild Grape', 'Hot Milk'], hates=['Toy Flower'],
                   lines=[["I'm Gotz. Carpenter. Bring lumber and gold and I'll build what you need.",
                           "A good house starts with good lumber. Chop branches and stumps."],
                          ["That farmhouse of yours could use some work. Just saying."],
                          ["You're a hard worker. I respect that."]])

# name: (gold, lumber, prerequisite, description)
EXPANSIONS = {
    'Kitchen':        (2000, 50, None, 'A kitchen counter for cooking.'),
    'Extension':      (5000, 150, 'Kitchen', 'A second room with a bookshelf.'),
    'Bathroom':       (3000, 80, 'Extension', 'A bath that restores stamina once a day.'),
    'Big Bed':        (1500, 40, None, 'A sturdier bed: +20 max stamina.'),
    'Coop Expansion': (2500, 100, None, 'Room for 16 chickens instead of 8.'),
}
BUILD_DAYS = 3
UTENSILS = {'Knife': 600, 'Frying Pan': 800, 'Pot': 800, 'Mixer': 1000}
FRUITS = {'Strawberry', 'Pineapple', 'Wild Grape', 'Tomato'}

# dish: (ingredients [(item or 'any:<category>', qty)], utensil, stamina, sell price)
RECIPES = {
    'Salad':           ([('any:crop', 2)], 'Knife', 20, 150),
    'Pickled Turnip':  ([('Turnip', 2)], None, 15, 160),
    'Fried Potatoes':  ([('Potato', 2)], 'Frying Pan', 25, 200),
    'Popcorn':         ([('Corn', 1)], 'Frying Pan', 20, 160),
    'Strawberry Jam':  ([('Strawberry', 3)], 'Pot', 15, 150),
    'Boiled Egg':      ([('Egg', 1)], 'Pot', 15, 80),
    'Omelet':          ([('Egg', 1), ('Milk', 1)], 'Frying Pan', 35, 200),
    'Hot Milk':        ([('Milk', 1)], 'Pot', 25, 120),
    'Herb Tea':        ([('Medicinal Herb', 2)], 'Pot', 30, 60),
    'Stew':            ([('any:crop', 2), ('Milk', 1)], 'Pot', 45, 300),
    'Grilled Fish':    ([('any:fish', 1)], 'Frying Pan', 30, 200),
    'Sashimi':         ([('any:fish', 1)], 'Knife', 25, 180),
    'Sushi':           ([('any:fish', 1), ('Rice', 1)], 'Knife', 40, 350),
    'Mushroom Rice':   ([('Mushroom', 1), ('Rice', 1)], 'Pot', 40, 300),
    'Curry Rice':      ([('Rice', 1), ('any:crop', 2), ('Red Grass', 1)], 'Pot', 60, 400),
    'Pumpkin Pudding': ([('Pumpkin', 1), ('Egg', 1), ('Milk', 1)], 'Pot', 60, 600),
    'Fruit Juice':     ([('any:fruit', 2)], 'Mixer', 20, 150),
    'Vegetable Juice': ([('any:crop', 1)], 'Mixer', 15, 100),
}
for _dish, (_ing, _ut, _st, _sell) in RECIPES.items():
    ITEMS[_dish] = (_sell, _st, 'dish')
for _u in UTENSILS:
    ITEMS[_u] = (0, 0, 'utensil')
ITEMS['Rice'] = (0, 5, 'ingredient')

for _n, _loves, _likes in [
        ('Mary', ['Mushroom Rice'], ['Herb Tea']),
        ('Karen', ['Sashimi'], ['Popcorn', 'Fried Potatoes']),
        ('Popuri', ['Strawberry Jam'], ['Fruit Juice', 'Omelet']),
        ('Elli', ['Pumpkin Pudding'], ['Herb Tea', 'Hot Milk']),
        ('Ann', ['Curry Rice'], ['Stew', 'Fried Potatoes']),
        ('Thomas', ['Sushi'], ['Stew']),
        ('Gray', [], ['Grilled Fish', 'Curry Rice']),
        ('Cliff', [], ['Stew', 'Omelet', 'Grilled Fish']),
        ('Rick', [], ['Omelet', 'Boiled Egg']),
        ('May', ['Fruit Juice'], ['Strawberry Jam', 'Hot Milk']),
        ('Doug', [], ['Curry Rice', 'Sushi']),
        ('Doctor', [], ['Herb Tea', 'Salad'])]:
    NPCS[_n]['loves'] += _loves
    NPCS[_n]['likes'] += _likes


def build_house_upgraded(flags):
    """The farmhouse, rebuilt from build_house() according to completed expansions."""
    base = build_house()
    if 'Extension' in flags:
        m = Map('house', 23, base.h, 'floor', base.title, indoor=True)
        for y in range(base.h):
            for x in range(base.w):
                m.t[y][x] = base.t[y][x]
        m.deco, m.doors, m.warps, m.signs = base.deco, base.doors, base.warps, base.signs
        m.border('iwall')
        for y in range(1, m.h - 1):
            m.set(14, y, 'floor' if y == 3 else 'iwall')
        m.set(16, 1, 'shelf')
        m.set(17, 1, 'shelf')
        m.set(18, 3, 'table')
        m.set(19, 3, 'table')
        if 'Bathroom' in flags:
            m.set(21, 1, 'bath')
            m.set(21, 2, 'bath')
    else:
        m = base
    if 'Kitchen' in flags:
        m.set(9, 1, 'kitchen')
        m.set(10, 1, 'kitchen')
        m.deco[(9, 1)] = ('[', '09')
        m.deco[(10, 1)] = ('&', '08')
    if 'Big Bed' in flags:
        m.set(3, 1, 'bed')
        m.deco[(3, 1)] = (']', '0A')
    return m


DIRS = {'up': (0, -1), 'w': (0, -1), 'k': (0, -1),
        'down': (0, 1), 's': (0, 1), 'j': (0, 1),
        'left': (-1, 0), 'a': (-1, 0), 'h': (-1, 0),
        'right': (1, 0), 'd': (1, 0), 'l': (1, 0)}
OK_KEYS = ('enter', 'x', 'e', 'space', 'z')
CANCEL_KEYS = ('esc', 'q', 'backspace', 'ctrl-c')

SPOUSE_POS = (11, 3)
HOUSE_WAKE = (1, 2)

LOGO = [
    r" _   _ ____  __     __ ____ _____ __  __ _   _ ",
    r"| | | |  _ \ \ \   / // ___|_   _|  \/  | \ | |",
    r"| |_| | |_) | \ \ / / \___ \ | | | |\/| |  \| |",
    r"|  _  |  _ <   \ V /   ___) || | | |  | | |\  |",
    r"|_| |_|_| \_\   \_/   |____/ |_| |_|  |_|_| \_|",
]


def pkey(p):
    return f'{p[0]},{p[1]}'


def unkey(s):
    x, y = s.split(',')
    return int(x), int(y)


# --------------------------------------------------------------------------
# Game
# --------------------------------------------------------------------------
class Game:
    def __init__(self, scr):
        self.scr = scr
        self.started = False
        self.running = True
        self.msgs = []
        self.maps = {'farm': build_farm(), 'town': build_town(),
                     'mountain': build_mountain(), 'house': build_house()}
        self.last = time.time()
        self.acc = 0.0
        self.npc_acc = 0.0
        self.passing_out = False
        self.build_interiors()

    # ---- state ---------------------------------------------------------
    def new_game(self, name, farm):
        self.name, self.farm = name, farm
        self.year, self.season, self.day, self.minutes = 1, 0, 1, 6 * 60
        self.weather, self.tomorrow = 'Sunny', self.roll_weather(0, 2)
        self.gold, self.stamina, self.max_stamina = 500, 100, 100
        self.inv = {'Turnip Seeds': 2}
        self.held = None
        self.tool = 'Hoe'
        self.levels = {t: 0 for t in UPGRADABLE}
        self.water = CAN_CAP[0]
        self.upgrading = None
        self.tilled, self.wet, self.crops = set(), set(), {}
        self.objs = {'farm': {}, 'mine': {}}
        self.hp = {}
        self.forage = {'mountain': {}}
        self.bin = {}
        self.chickens = self.fed = self.eggs = 0
        self.friend = {n: 0 for n in NPCS}
        self.talked, self.gifted = set(), set()
        self.married = None
        self.shipped_total = 0
        self.prayed = False
        self.fest_wins, self.fest_attended, self.fest_declined = [], False, False
        self.npc_pos = {}
        self.mine_floor = 0
        self.ladder = None
        self.mapname = 'house'
        self.px, self.py = HOUSE_WAKE
        self.face = (0, -1)
        rng = random.Random()
        m = self.maps['farm']
        for y in range(m.h):
            for x in range(m.w):
                if m.t[y][x] == 'field':
                    r = rng.random()
                    kind = ('weed' if r < 0.12 else 'stone' if r < 0.19 else 'branch' if r < 0.25
                            else 'stump' if r < 0.262 else 'boulder' if r < 0.274 else None)
                    if kind:
                        self.objs['farm'][(x, y)] = kind
                        if kind in ('stump', 'boulder'):
                            self.hp[(x, y)] = 6
        self.spawn_forage()
        self.animals = []
        self.init_carpentry()
        self.started = True

    @property
    def map(self):
        return self.maps[self.mapname]

    def absday(self, year=None, season=None, day=None):
        year = self.year if year is None else year
        season = self.season if season is None else season
        day = self.day if day is None else day
        return (year - 1) * 120 + season * 30 + day - 1

    @property
    def weekday(self):
        return self.absday() % 7

    @property
    def season_name(self):
        return SEASONS[self.season]

    def date_str(self):
        return f"{self.season_name} {self.day} ({WEEKDAYS[self.weekday]}), Year {self.year}"

    def roll_weather(self, season, day):
        if day == 1:
            return 'Sunny'
        r = random.random()
        if season == 3:
            return 'Snow' if r < 0.25 else 'Sunny'
        return 'Rain' if r < (0.2, 0.1, 0.15)[season] else 'Sunny'

    def msg(self, text, col='05'):
        self.msgs.append((text, col))
        self.msgs = self.msgs[-30:]

    def give(self, item, n=1):
        self.inv[item] = self.inv.get(item, 0) + n

    def take(self, item, n=1):
        self.inv[item] -= n
        if self.inv[item] <= 0:
            del self.inv[item]
            if self.held == item:
                self.held = None

    # ---- save / load -----------------------------------------------------
    SAVE_FIELDS = ['name', 'farm', 'year', 'season', 'day', 'weather', 'tomorrow', 'gold',
                   'max_stamina', 'inv', 'tool', 'levels', 'water', 'upgrading', 'bin',
                   'chickens', 'fed', 'eggs', 'friend', 'married', 'shipped_total',
                   'animals', 'fest_wins', 'house_flags', 'project']

    def save(self):
        d = {k: getattr(self, k) for k in self.SAVE_FIELDS}
        d['tilled'] = [pkey(p) for p in self.tilled]
        d['wet'] = [pkey(p) for p in self.wet]
        d['crops'] = {pkey(p): c for p, c in self.crops.items()}
        d['objs'] = {pkey(p): o for p, o in self.objs['farm'].items()}
        d['hp'] = {pkey(p): v for p, v in self.hp.items()}
        d['forage'] = {mp: {pkey(p): i for p, i in f.items()} for mp, f in self.forage.items()}
        os.makedirs(os.path.dirname(SAVE_PATH), exist_ok=True)
        tmp = SAVE_PATH + '.tmp'
        with open(tmp, 'w') as f:
            json.dump(d, f)
        os.replace(tmp, SAVE_PATH)

    def load(self):
        with open(SAVE_PATH) as f:
            d = json.load(f)
        self.new_game(d['name'], d['farm'])
        for k in self.SAVE_FIELDS:
            if k in d:
                setattr(self, k, d[k])
        for n in NPCS:
            self.friend.setdefault(n, 0)
        self.tilled = {unkey(s) for s in d['tilled']}
        self.wet = {unkey(s) for s in d['wet']}
        self.crops = {unkey(s): c for s, c in d['crops'].items()}
        self.objs['farm'] = {unkey(s): o for s, o in d['objs'].items()}
        self.hp = {unkey(s): v for s, v in d['hp'].items()}
        self.forage = {mp: {unkey(s): i for s, i in f.items()} for mp, f in d['forage'].items()}
        self.stamina = self.max_stamina
        self.rebuild_house()

    # ---- main loop -------------------------------------------------------
    def run(self):
        self.title()
        self.last = time.time()
        while self.running:
            k = self.scr.getkey(1 / 20)
            while k and self.running:
                self.handle(k)
                k = self.scr.getkey(0)
            self.update()
            self.render()
            self.scr.flush()

    def update(self):
        now = time.time()
        dt = min(now - self.last, 0.25)
        self.last = now
        if not self.map.indoor:
            self.acc += dt
            while self.acc >= SECS_PER_10MIN:
                self.acc -= SECS_PER_10MIN
                self.advance(10)
        self.npc_acc += dt
        if self.npc_acc > 0.7:
            self.npc_acc = 0
            self.move_npcs()

    def advance(self, mins):
        before = self.minutes
        self.minutes += mins
        if before < 18 * 60 <= self.minutes:
            self.msg("The sun is setting. Shops are closing soon.", '09')
        if before < 24 * 60 <= self.minutes:
            self.msg("It's midnight. You should get to bed!", '08')
        if self.minutes >= 26 * 60:
            self.pass_out("It's 2AM... you collapse from exhaustion where you stand.")
            return
        self.update_npcs()

    def handle(self, k):
        if k in DIRS:
            self.move(*DIRS[k])
        elif k in ('space', 'z'):
            self.use_tool()
        elif k in ('x', 'e', 'enter'):
            self.interact()
        elif k == 'tab':
            self.cycle_tool(1)
        elif k == 'btab':
            self.cycle_tool(-1)
        elif len(k) == 1 and k in '123456':
            t = TOOLS[int(k) - 1]
            if self.upgrading and self.upgrading[0] == t:
                self.msg(f"Saibara is still working on your {t}.", '08')
            else:
                self.tool = t
        elif k == 'i':
            self.rucksack()
        elif k == '?':
            self.show_lines('Help', HELP)
        elif k == 'esc':
            self.pause_menu()
        elif k in ('Q', 'ctrl-c'):
            self.quit_prompt()

    def pause_menu(self):
        sel = self.menu('Paused', ['Resume', 'Rucksack', 'Help', 'Quit'])
        if sel == 1:
            self.rucksack()
        elif sel == 2:
            self.show_lines('Help', HELP)
        elif sel == 3:
            self.quit_prompt()

    def quit_prompt(self):
        if self.confirm("Quit? Progress since you last slept is lost."):
            self.running = False

    # ---- world queries ---------------------------------------------------
    def npc_at(self, x, y, mapname=None):
        mapname = mapname or self.mapname
        for n, p in self.npc_pos.items():
            if p == (x, y) and NPCS[n]['where'][0] == mapname:
                return n
        n = self.indoor_npc_at(x, y, mapname)
        if n:
            return n
        if mapname == 'house' and self.married and (x, y) == SPOUSE_POS:
            return self.married
        return None

    def walkable(self, mapname, x, y, for_npc=False):
        m = self.maps[mapname]
        if not m.inside(x, y) or not TILES[m.tile(x, y)][3]:
            return False
        if (x, y) in self.objs.get(mapname, {}) or (x, y) in self.forage.get(mapname, {}):
            return False
        if for_npc and ((x, y) in m.warps or (x, y) in self.tilled and mapname == 'farm'):
            return False
        return True

    def is_out(self, n):
        if self.fest_is_out(n) is not None:
            return True
        d = NPCS[n]
        if not d['out'] or n == self.married:
            return False
        if self.weather != 'Sunny' and not d['rain']:
            return False
        a, b = d['out']
        return a * 60 <= self.minutes < b * 60

    def update_npcs(self):
        self.fest_sync()
        for n, d in NPCS.items():
            if self.is_out(n):
                if n not in self.npc_pos:
                    mp, ax, ay = d['where']
                    spot = self.free_spot(mp, ax, ay)
                    if spot:
                        self.npc_pos[n] = spot
            else:
                self.npc_pos.pop(n, None)
        self.update_indoor_npcs()

    def free_spot(self, mp, x, y):
        for r in range(0, 7):
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    p = (x + dx, y + dy)
                    if self.walkable(mp, *p, for_npc=True) and not self.npc_at(*p, mapname=mp) \
                            and not (mp == self.mapname and p == (self.px, self.py)):
                        return p
        return None

    def move_npcs(self):
        for n, (x, y) in list(self.npc_pos.items()):
            mp, ax, ay = NPCS[n]['where']
            if mp != self.mapname or random.random() > 0.45:
                continue
            dx, dy = random.choice(((1, 0), (-1, 0), (0, 1), (0, -1)))
            nx, ny = x + dx, y + dy
            if abs(nx - ax) > 4 or abs(ny - ay) > 3:
                continue
            if self.walkable(mp, nx, ny, True) and not self.npc_at(nx, ny) \
                    and (nx, ny) != (self.px, self.py):
                self.npc_pos[n] = (nx, ny)
        self.move_indoor_npcs()

    def target(self):
        return self.px + self.face[0], self.py + self.face[1]

    # ---- movement --------------------------------------------------------
    def move(self, dx, dy):
        self.face = (dx, dy)
        nx, ny = self.px + dx, self.py + dy
        m = self.map
        if not m.inside(nx, ny):
            return
        if (nx, ny) in m.doors:
            self.enter(m.doors[(nx, ny)])
            return
        if not self.walkable(self.mapname, nx, ny) or self.npc_at(nx, ny):
            return
        self.px, self.py = nx, ny
        self.fest_check()
        if (nx, ny) in m.warps:
            mp, wx, wy = m.warps[(nx, ny)]
            self.warp(mp, wx, wy)
        elif m.tile(nx, ny) == 'down':
            self.enter_mine(self.mine_floor + 1)
        elif m.tile(nx, ny) == 'up':
            self.warp('mountain', 52, 5, (0, 1))
            self.msg("You climb back out into the fresh air.")

    def warp(self, mp, x, y, face=None):
        self.mapname, self.px, self.py = mp, x, y
        if face:
            self.face = face
        self.update_npcs()
        if not self.map.indoor:
            self.msg(f"~ {self.map.title} ~", '0C')

    def enter(self, door):
        if door == 'house_in':
            self.warp('house', 7, 5, (0, -1))
        elif door == 'house_out':
            self.warp('farm', 8, 6, (0, 1))
        elif door == 'coop':
            self.coop()
        elif door == 'barn':
            self.barn()
        elif door == 'mine':
            self.enter_mine(1)
        else:
            self.visit(door)

    def enter_mine(self, floor):
        self.mine_floor = floor
        m, rocks, ladder = build_mine(floor)
        self.maps['mine'] = m
        self.objs['mine'] = rocks
        self.ladder = ladder
        self.mapname, self.px, self.py, self.face = 'mine', 2, 2, (1, 0)
        self.msg(f"Mine - floor B{floor}F. Break rocks to find the ladder down.", '0C')

    # ---- tools -----------------------------------------------------------
    def tool_list(self):
        tools = [t for t in TOOLS if not (self.upgrading and self.upgrading[0] == t)]
        return tools + sorted(i for i in self.inv if i.endswith(' Seeds'))

    def cycle_tool(self, d):
        tl = self.tool_list()
        i = tl.index(self.tool) if self.tool in tl else -1
        self.tool = tl[(i + d) % len(tl)]

    def area(self):
        depth, half = AREA[self.levels.get(self.tool, 0)]
        fx, fy = self.face
        lx, ly = -fy, fx
        return [(self.px + fx * k + lx * l, self.py + fy * k + ly * l)
                for k in range(1, depth + 1) for l in range(-half, half + 1)]

    def spend(self, n):
        before = self.stamina
        self.stamina = max(0, self.stamina - n)
        if self.stamina <= 0:
            self.pass_out("You push yourself too hard and collapse from exhaustion...")
        elif before > 30 >= self.stamina:
            self.msg("You're getting tired. Eat something or rest.", '09')
        elif before > 10 >= self.stamina:
            self.msg("You're exhausted! You can barely lift your tools.", '08')

    def use_tool(self):
        t = self.tool
        if t not in self.tool_list():
            self.tool = 'Hoe'
            return
        tx, ty = self.target()
        p = (tx, ty)
        m = self.map
        objs = self.objs.get(self.mapname, {})
        obj = objs.get(p)
        tile = m.tile(tx, ty)
        if t.endswith(' Seeds'):
            self.sow(t, p)
            return
        if t == 'Sickle':
            if obj == 'weed':
                del objs[p]
                self.msg("Swish! You cut the weeds.")
            elif p in self.crops and self.mapname == 'farm':
                self.msg("Careful! That's a crop.")
                return
            self.spend(2)
        elif t == 'Hoe':
            if self.mapname != 'farm':
                self.msg("You can only till the soil on your farm.")
            elif self.season == 3:
                self.msg("The ground is frozen solid.")
            else:
                n = 0
                for q in self.area():
                    if self.maps['farm'].tile(*q) == 'field' and q not in objs \
                            and q not in self.tilled:
                        self.tilled.add(q)
                        if self.weather == 'Rain':
                            self.wet.add(q)
                        n += 1
                if not n and obj:
                    self.msg(f"There's a {obj} in the way.")
            area = len(self.area())
            self.spend(2 + area // 3)
        elif t == 'Hammer':
            if obj == 'stone':
                del objs[p]
                self.msg("Crack! The stone shatters.")
            elif obj == 'boulder':
                if self.levels['Hammer'] < 1:
                    self.msg("This boulder is too big. Upgrade your Hammer.")
                else:
                    self.hp[p] = self.hp.get(p, 6) - (1 + self.levels['Hammer'])
                    if self.hp[p] <= 0:
                        del objs[p], self.hp[p]
                        self.msg("BOOM! The boulder breaks apart.")
                    else:
                        self.msg("Clang! The boulder cracks.")
            elif obj == 'rock':
                del objs[p]
                drop = self.mine_drop()
                if drop:
                    self.give(drop)
                    self.msg(f"You found {drop}!", '0C')
                if p == self.ladder:
                    m.set(tx, ty, 'down')
                    self.msg("There's a ladder hidden under the rock!", '0A')
            elif self.mapname == 'farm' and p in self.tilled and p not in self.crops:
                self.tilled.discard(p)
                self.wet.discard(p)
            elif self.mapname == 'farm' and p in self.crops:
                self.msg("Better not smash your crops.")
                return
            self.spend(2)
        elif t == 'Axe':
            if obj == 'branch':
                del objs[p]
                self.give('Lumber')
                self.msg("Chop! +1 Lumber.")
            elif obj == 'stump':
                if self.levels['Axe'] < 1:
                    self.msg("This stump is too tough. Upgrade your Axe.")
                else:
                    self.hp[p] = self.hp.get(p, 6) - (1 + self.levels['Axe'])
                    if self.hp[p] <= 0:
                        del objs[p], self.hp[p]
                        self.give('Lumber', 6)
                        self.msg("The stump splits! +6 Lumber.")
                    else:
                        self.msg("Thunk!")
            elif tile == 'tree':
                self.msg("This tree is too big to chop down.")
            self.spend(2)
        elif t == 'Watering Can':
            cap = CAN_CAP[self.levels['Watering Can']]
            if tile in ('water', 'fountain'):
                self.water = cap
                self.msg(f"You fill the watering can. ({cap}/{cap})", '0D')
                return
            if self.water <= 0:
                self.msg("The watering can is empty. Refill it at a pond.", '08')
                return
            self.water -= 1
            if self.mapname == 'farm':
                for q in self.area():
                    if q in self.tilled:
                        self.wet.add(q)
            self.spend(2 + len(self.area()) // 3)
        elif t == 'Fishing Rod':
            if tile == 'water':
                self.fish()
            else:
                self.msg("You need to face some water to fish.")

    def mine_drop(self):
        f = self.mine_floor
        table = [('Copper', 28, 1), ('Silver', 14, 3), ('Gold', 9, 5), ('Amethyst', 4, 6),
                 ('Mystrile', 4, 8), ('Diamond', 2, 10)]
        r, acc = random.random() * 100, 0
        for name, chance, minf in table:
            if f >= minf:
                acc += chance
                if r < acc:
                    return name
        return None

    def sow(self, bag, p):
        crop = bag[:-6]
        if self.mapname != 'farm':
            self.msg("You can only plant seeds on your farm.")
            return
        if CROPS[crop][0] != self.season_name:
            self.msg(f"{crop} won't grow in {self.season_name}.", '08')
            return
        n = 0
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                q = (p[0] + dx, p[1] + dy)
                if q in self.tilled and q not in self.crops:
                    self.crops[q] = [crop, 0]
                    n += 1
        if not n:
            self.msg("Seeds need empty tilled soil. Use the Hoe first.")
            return
        self.take(bag)
        self.msg(f"You sowed {crop} seeds on {n} tile{'s' if n > 1 else ''}.", '0B')
        if bag not in self.inv:
            self.tool = 'Watering Can'
        self.spend(1)

    def fish(self):
        wait = random.uniform(1.2, 4.0)
        start = time.time()
        bite = None
        result = None
        while result is None:
            now = time.time()
            if bite is None and now - start >= wait:
                bite = now
            if bite is not None and now - bite > 0.9:
                result = 'miss'
                break
            W, H = self.scr.w, self.scr.h

            def draw():
                bx, by = (W - 34) // 2, H // 2 - 3
                self.scr.box(bx, by, 34, 5, '0D', '00', 'Fishing')
                if bite is None:
                    dots = '.' * (1 + int((now - start) * 2) % 3)
                    self.scr.put(bx + 3, by + 2, f"~ ~ o ~ ~   waiting{dots}", '0D')
                else:
                    self.scr.put(bx + 3, by + 2, "~ ~ O ~ ~   !! BITE !! SPACE", '08', '00', True)
            self.render()
            draw()
            self.scr.flush()
            k = self.scr.getkey(0.05)
            if k:
                if k in CANCEL_KEYS:
                    result = 'quit'
                elif bite is None:
                    result = 'early'
                else:
                    result = 'catch'
        self.last = time.time()
        if result == 'catch':
            r = random.random()
            fish = 'Large Fish' if r < 0.12 else 'Medium Fish' if r < 0.45 else 'Small Fish'
            self.give(fish)
            self.msg(f"You caught a {fish}!", '0C')
        elif result == 'early':
            self.msg("You reeled in too early.")
        elif result == 'miss':
            self.msg("It got away...")
        self.spend(3)

    # ---- interaction -----------------------------------------------------
    def interact(self):
        tx, ty = self.target()
        p = (tx, ty)
        m = self.map
        n = self.npc_at(tx, ty)
        if n:
            self.talk(n)
            return
        if p in m.doors:
            self.enter(m.doors[p])
            return
        tile = m.tile(tx, ty)
        if self.mapname == 'farm' and p in self.crops:
            crop, age = self.crops[p]
            days, regrow = CROPS[crop][2], CROPS[crop][3]
            if age >= days:
                self.give(crop)
                if regrow:
                    self.crops[p][1] = days - regrow
                else:
                    del self.crops[p]
                self.msg(f"You harvested a {crop}!", '0B')
            else:
                self.msg(f"{crop}: {days - age} more day{'s' if days - age > 1 else ''} to go."
                         f"{'' if p in self.wet else ' (needs water)'}")
            return
        fr = self.forage.get(self.mapname, {})
        if p in fr:
            item = fr.pop(p)
            self.give(item)
            self.msg(f"You picked up {item}.", '0B')
            return
        if tile == 'bin':
            self.ship()
        elif tile == 'bed':
            if self.confirm("Go to bed? (Your game will be saved.)"):
                self.new_day('sleep')
        elif tile == 'tv':
            show = random.choice(["a cooking show", "the news", "a samurai drama", "a farming tips show"])
            self.say(f"Tomorrow's forecast: {self.tomorrow}.{self.fest_news()}  Afterwards, {show} comes on.",
                     'TV')
        elif tile == 'cal':
            left = 30 - self.day
            nxt = SEASONS[(self.season + 1) % 4]
            self.say(f"Today is {self.date_str()}. {left} day{'s' if left != 1 else ''} until {nxt}.",
                     'Calendar')
            self.fest_calendar()
        elif tile in ('counter', 'bookcase'):
            self.interior_interact(tile, p)
        elif tile in ('kitchen', 'bath', 'shelf'):
            self.use_furniture(tile)
        elif tile == 'sign':
            text = m.signs.get(p, '')
            if text == 'farm':
                text = f"{self.farm.upper()} FARM - Owner: {self.name}"
            self.say(text, 'Sign')
        elif self.held:
            self.msg(f"You're holding {self.held}. Face someone and press X to give it.")

    def hearts(self, n):
        h = self.friend.get(n, 0) // 10
        col = ['03', '0E', '0D', '0B', '09', '08'][min(5, h // 2)]
        return '[' + '#' * h + '.' * (10 - h) + ']', col

    def talk(self, n):
        if self.fest_talk(n):
            return
        d = NPCS[n]
        if self.held:
            item = self.held
            if item == 'Blue Feather':
                self.propose(n)
                return
            if n in self.gifted:
                self.say("You already gave me something today. Thank you, though!", n)
                return
            self.take(item)
            if item in d['loves']:
                pts, line = 6, f"Oh! {item}! I love this! Thank you so much!"
            elif item in d['likes']:
                pts, line = 3, f"A {item}? Thank you, that's really nice."
            elif item in d['hates']:
                pts, line = -4, f"...A {item}? I don't really like this."
            else:
                pts, line = 1, f"Oh, a {item}? For me? Thanks."
            pts, line = self.birthday_gift(n, pts, line)
            self.friend[n] = clamp(self.friend[n] + pts, 0, 100)
            self.gifted.add(n)
            self.say(line, n)
            return
        if n == self.married and self.mapname == 'house':
            line = random.choice(SPOUSE_LINES)
        else:
            f = self.friend[n]
            tier = 0 if f < 30 else 1 if f < 70 else 2
            line = random.choice(d['lines'][tier])
        if n not in self.talked:
            self.talked.add(n)
            self.friend[n] = clamp(self.friend[n] + 1, 0, 100)
        self.say(line, n)

    def propose(self, n):
        d = NPCS[n]
        if not d['bach']:
            self.say("What a beautiful blue feather! You should give it to someone special.", n)
        elif self.married:
            self.say("You're already married! Go home to your family.", n)
        elif self.friend[n] < 100:
            self.say("A blue feather...? I'm sorry. I... I don't feel that way. Not yet, at least.", n)
        else:
            self.take('Blue Feather')
            self.say("A blue feather...! Is this... a proposal? YES! Of course, yes!", n)
            self.say("A week later, the whole town gathers at the church.", None)
            self.say(f"Pastor Carter: Do you, {self.name}, take {n} to be your spouse?", None)
            self.say(f"You say 'I do.' The bells of Mineral Town ring out for {self.name} and {n}!",
                     None)
            self.married = n
            self.npc_pos.pop(n, None)
            self.say(f"{n} has moved into your farmhouse. Congratulations!", None)

    def ship(self):
        while True:
            items = [i for i in sorted(self.inv) if ITEMS[i][0] > 0]
            if not items:
                self.say("You have nothing to ship.", 'Shipping Bin')
                return
            opts = [f"{i:16s} x{self.inv[i]:<3d} {ITEMS[i][0]:4d}G" for i in items] + ['Done']
            pending = sum(ITEMS[i][0] * q for i, q in self.bin.items())
            sel = self.menu(f"Shipping Bin  (in bin: {pending}G)", opts)
            if sel is None or sel == len(items):
                return
            item = items[sel]
            q = self.ask_qty(f"Ship how many {item}?", self.inv[item], ITEMS[item][0], 'Value')
            if q:
                self.take(item, q)
                self.bin[item] = self.bin.get(item, 0) + q
                self.msg(f"Shipped {q} {item}. Zack will collect it tomorrow morning.", '09')

    def rucksack(self):
        while True:
            items = sorted(self.inv)
            if not items:
                self.say("Your rucksack is empty.", None)
                return
            opts = [f"{'>' if i == self.held else ' '} {i:16s} x{self.inv[i]}" for i in items]

            def info(s, items=items):
                i = items[s]
                sell, eat, cat = ITEMS[i]
                parts = [cat]
                if sell:
                    parts.append(f"sells {sell}G")
                if eat:
                    parts.append(f"+{eat} stamina")
                return ['  ' + ', '.join(parts)]
            sel = self.menu('Rucksack', opts, info=info)
            if sel is None:
                return
            item = items[sel]
            sub = ['Put away' if self.held == item else 'Hold (to gift)']
            if ITEMS[item][1]:
                sub.append('Eat')
            sub.append('Cancel')
            s2 = self.menu(item, sub)
            if s2 is None or sub[s2] == 'Cancel':
                continue
            if sub[s2] == 'Eat':
                self.take(item)
                gain = ITEMS[item][1]
                self.stamina = min(self.max_stamina, self.stamina + gain)
                self.msg(f"You ate the {item}. +{gain} stamina.", '0B')
            elif sub[s2] == 'Put away':
                self.held = None
                self.msg(f"You put away the {item}.")
            else:
                self.held = item
                self.msg(f"You hold the {item} high. Face someone and press X to give it.")
                return

    def coop(self):
        while True:
            info = [f"  Chickens: {self.chickens}/{self.coop_cap()}   Fed today: {self.fed}",
                    f"  Eggs waiting: {self.eggs}   Chicken Feed: {self.inv.get('Chicken Feed', 0)}"]
            sel = self.menu('Chicken Coop', ['Fill feed boxes', 'Collect eggs', 'Leave'], info=info)
            if sel == 0:
                if not self.chickens:
                    self.say("The coop is empty. Lillia sells chickens at the Poultry Farm.", None)
                    continue
                n = min(self.chickens - self.fed, self.inv.get('Chicken Feed', 0))
                if self.fed >= self.chickens:
                    self.say("Every feed box is already full.", None)
                elif not n:
                    self.say("You're out of Chicken Feed. The Poultry Farm sells it.", None)
                else:
                    self.take('Chicken Feed', n)
                    self.fed += n
                    self.msg(f"You filled {n} feed box{'es' if n > 1 else ''}. Cluck cluck!", '09')
            elif sel == 1:
                if self.eggs:
                    self.give('Egg', self.eggs)
                    self.msg(f"You collected {self.eggs} egg{'s' if self.eggs > 1 else ''}!", '07')
                    self.eggs = 0
                else:
                    self.say("No eggs today.", None)
            else:
                return

    # ---- barn animals ----------------------------------------------------
    def animal_line(self, a):
        h = a['aff'] // 10
        status = []
        if not a['fed']:
            status.append('hungry')
        if a['kind'] == 'cow' and a['ready']:
            status.append('milk ready')
        if a['kind'] == 'sheep' and a['wool'] >= WOOL_DAYS:
            status.append('wool ready')
        kind = ANIMALS[a['kind']][0]
        return f"{a['name']:10s} {kind:5s} [{'#' * h}{'.' * (10 - h)}] {', '.join(status)}"

    def barn(self):
        sel = 0
        while True:
            unfed = sum(1 for a in self.animals if not a['fed'])
            tools = ', '.join(t for t in ('Milker', 'Clippers', 'Brush') if self.inv.get(t))
            info = [f"  Animals: {len(self.animals)}/{BARN_CAP}   Hungry: {unfed}"
                    f"   Fodder: {self.inv.get('Fodder', 0)}",
                    f"  Tools: {tools or 'none (sold at Yodel Ranch)'}"]
            opts = ['Fill fodder boxes'] + [self.animal_line(a) for a in self.animals] + ['Leave']
            sel = self.menu('Barn', opts, sel=min(sel, len(opts) - 1), info=info)
            if sel is None or sel == len(opts) - 1:
                return
            if sel == 0:
                self.barn_feed()
            else:
                self.animal_care(self.animals[sel - 1])
                if self.mapname == 'house':
                    return

    def barn_feed(self):
        if not self.animals:
            self.say("The barn is empty. Barley sells cows and sheep at Yodel Ranch.", None)
            return
        hungry = [a for a in self.animals if not a['fed']]
        if not hungry:
            self.say("Every fodder box is already full.", None)
            return
        n = min(len(hungry), self.inv.get('Fodder', 0))
        if not n:
            self.say("You're out of Fodder. Yodel Ranch sells it.", None)
            return
        self.take('Fodder', n)
        for a in hungry[:n]:
            a['fed'] = True
        self.msg(f"You filled {n} fodder box{'es' if n > 1 else ''}. Moo!", '09')

    def animal_care(self, a):
        while True:
            name = a['name']
            opts = ['Talk']
            if self.inv.get('Brush'):
                opts.append('Brush')
            if a['kind'] == 'cow' and self.inv.get('Milker'):
                opts.append('Milk')
            if a['kind'] == 'sheep' and self.inv.get('Clippers'):
                opts.append('Shear')
            opts.append('Back')
            sel = self.menu(self.animal_line(a), opts)
            if sel is None or opts[sel] == 'Back':
                return
            act = opts[sel]
            if act == 'Talk':
                if a['talked']:
                    self.say(f"{name} looks at you contentedly.", name)
                else:
                    a['talked'] = True
                    a['aff'] = min(100, a['aff'] + 1)
                    sound = 'Moooo!' if a['kind'] == 'cow' else 'Baaaa!'
                    self.say(f"{sound} {name} seems happy to see you.", name)
            elif act == 'Brush':
                if a['brushed']:
                    self.say(f"{name}'s coat is already shiny.", name)
                else:
                    a['brushed'] = True
                    a['aff'] = min(100, a['aff'] + 2)
                    self.msg(f"You brushed {name}. {name} looks pleased!", '0B')
                    self.spend(1)
            elif act == 'Milk':
                if not a['ready']:
                    self.say(f"{name} has no milk right now. Feed {name} today and try tomorrow.",
                             None)
                else:
                    a['ready'] = False
                    a['aff'] = min(100, a['aff'] + 1)
                    item = ('Large Milk' if a['aff'] >= 80 else 'Medium Milk' if a['aff'] >= 40
                            else 'Small Milk')
                    self.give(item)
                    self.msg(f"You milked {name}: {item}!", '07')
                    self.spend(2)
            elif act == 'Shear':
                if a['wool'] < WOOL_DAYS:
                    left = WOOL_DAYS - a['wool']
                    self.say(f"{name}'s wool needs {left} more well-fed day{'s' if left > 1 else ''}"
                             " to grow back.", None)
                else:
                    a['wool'] = 0
                    a['aff'] = min(100, a['aff'] + 1)
                    item = 'Large Wool' if a['aff'] >= 70 else 'Wool'
                    self.give(item)
                    self.msg(f"You sheared {name}: {item}!", '07')
                    self.spend(2)
            if self.mapname == 'house':  # passed out mid-care: the day is over
                return

    def buy_animal(self, kind):
        label, price = ANIMALS[kind]
        if len(self.animals) >= BARN_CAP:
            self.say("Your barn is full!", 'Barley')
            return
        if self.gold < price:
            self.say(f"A {label.lower()} is {price}G. Come back when you've saved up.", 'Barley')
            return
        if not self.confirm(f"Buy a {label.lower()} for {price}G?"):
            return
        names = COW_NAMES if kind == 'cow' else SHEEP_NAMES
        taken = {a['name'] for a in self.animals}
        default = next((n for n in names if n not in taken), f"{label}{len(self.animals) + 1}")
        name = self.text_input(f"Name your {label.lower()}:", default)[:10]
        self.gold -= price
        self.animals.append({'name': name, 'kind': kind, 'aff': 10, 'fed': False, 'ready': False,
                             'wool': 0, 'talked': False, 'brushed': False})
        self.say(f"{name} will be waiting in your barn. Fill the fodder box every day!", 'Barley')

    def buy_barn_tool(self, item, price):
        if self.inv.get(item):
            self.say(f"You already have a {item}.", 'Barley')
        elif self.gold < price:
            self.say(f"The {item} is {price}G.", 'Barley')
        elif self.confirm(f"Buy a {item} for {price}G?"):
            self.gold -= price
            self.give(item)
            self.msg(f"Bought a {item}.", '09')

    def barn_new_day(self, report):
        hungry = 0
        for a in self.animals:
            if a['fed']:
                if a['kind'] == 'cow':
                    a['ready'] = True
                else:
                    a['wool'] = min(WOOL_DAYS, a['wool'] + 1)
            else:
                hungry += 1
                a['aff'] = max(0, a['aff'] - 5)
            a['fed'] = a['talked'] = a['brushed'] = False
        if hungry:
            report.append(f"{hungry} barn animal{'s' if hungry > 1 else ''} went hungry yesterday.")
        ready = [a['name'] for a in self.animals if (a['kind'] == 'cow' and a['ready'])
                 or (a['kind'] == 'sheep' and a['wool'] >= WOOL_DAYS)]
        if ready:
            report.append(f"Ready in the barn: {', '.join(ready)}.")

    # ---- town buildings --------------------------------------------------
    def visit(self, bid):
        if not self.building_open(bid):
            return
        if bid in self.interiors:
            self.enter_interior(bid)
            return
        self.shop_menu(bid)

    def building_open(self, bid):
        if self.fest_closed(bid):
            return False
        name = BUILDINGS[bid]
        o, c, closed = HOURS[bid]
        if self.weekday in closed or not (o * 60 <= self.minutes < c * 60):
            days = ', '.join(WEEKDAYS[d] for d in sorted(closed))
            self.say(f"The {name} is closed. Open {fmt_hour(o)} - {fmt_hour(c)}"
                     f"{', closed ' + days if days else ''}.", None)
            return False
        return True

    def shop_menu(self, bid, people_fn=None):
        name = BUILDINGS[bid]
        while True:
            if people_fn:
                people = people_fn()
            else:
                people = [n for n, d in NPCS.items()
                          if d['home'] == bid and not self.is_out(n) and n != self.married]
            shop = self.shop_options(bid)
            opts = [s[0] for s in shop] + [f"Talk to {p}" for p in people] + ['Leave']
            sel = self.menu(f"{name}   {self.gold}G", opts)
            if sel is None or sel == len(opts) - 1:
                return
            if sel < len(shop):
                shop[sel][1]()
            else:
                self.talk(people[sel - len(shop)])

    # ---- interiors -------------------------------------------------------
    def build_interiors(self):
        """Create an interior for every building door that has a layout."""
        self.interiors = {}       # bid -> {'map', 'entry', 'spots'}
        self.interior_bid = {}    # interior map name -> bid
        self.indoor_npcs = {}     # npc -> {'map', 'pos', 'home', 'fixed'}
        for mname, m in list(self.maps.items()):
            for (dx, dy), bid in m.doors.items():
                if bid not in INTERIOR_LAYOUTS or bid in self.interiors:
                    continue
                front = next(((dx + ox, dy + oy) for ox, oy in ((0, 1), (0, -1), (1, 0), (-1, 0))
                              if TILES[m.tile(dx + ox, dy + oy)][3]), (dx, dy + 1))
                im, entry, spots = build_interior(bid, (mname, *front))
                self.maps[im.name] = im
                self.interiors[bid] = {'map': im.name, 'entry': entry, 'spots': spots}
                self.interior_bid[im.name] = bid

    def enter_interior(self, bid):
        info = self.interiors[bid]
        self.warp(info['map'], *info['entry'], (0, -1))
        self.msg(f"You step into the {BUILDINGS[bid]}.", '0C')

    def keeper_of(self, bid):
        return next((n for n, d in NPCS.items() if d['home'] == bid and not d['out']), None)

    def update_indoor_npcs(self):
        for n, d in NPCS.items():
            info = self.interiors.get(d['home'])
            if not info or self.is_out(n) or n == self.married:
                self.indoor_npcs.pop(n, None)
                continue
            if n in self.indoor_npcs:
                continue
            bid = d['home']
            keeper = self.keeper_of(bid)
            residents = [r for r, rd in NPCS.items() if rd['home'] == bid and r != keeper]
            spots = info['spots']
            if n == keeper and 'k' in spots:
                pos, fixed = spots['k'], True
            else:
                i = residents.index(n)
                pos = spots.get(str(i + 1))
                if pos is None or self.npc_at(*pos, mapname=info['map']):
                    anchor = spots.get('1', info['entry'])
                    pos = self.free_spot(info['map'], *anchor)
                fixed = False
            if pos:
                self.indoor_npcs[n] = {'map': info['map'], 'pos': pos, 'home': pos, 'fixed': fixed}

    def indoor_npc_at(self, x, y, mapname):
        for n, d in self.indoor_npcs.items():
            if d['map'] == mapname and d['pos'] == (x, y) and n != self.married:
                return n
        return None

    def move_indoor_npcs(self):
        for n, d in self.indoor_npcs.items():
            if d['map'] != self.mapname or d['fixed'] or random.random() > 0.35:
                continue
            (x, y), (hx, hy) = d['pos'], d['home']
            dx, dy = random.choice(((1, 0), (-1, 0), (0, 1), (0, -1)))
            nx, ny = x + dx, y + dy
            if abs(nx - hx) > 2 or abs(ny - hy) > 2:
                continue
            if (nx, ny) == self.interiors[self.interior_bid[d['map']]]['entry']:
                continue
            if self.walkable(d['map'], nx, ny, True) and not self.npc_at(nx, ny) \
                    and (nx, ny) != (self.px, self.py):
                d['pos'] = (nx, ny)

    def interior_interact(self, tile, p):
        bid = self.interior_bid.get(self.mapname)
        if tile == 'bookcase':
            self.say(random.choice(BOOKS), 'Book')
            return
        if not bid:
            return
        behind = self.npc_at(p[0] + self.face[0], p[1] + self.face[1])
        self.shop_menu(bid, lambda: [behind] if behind else [])

    def shop_options(self, bid):
        if bid == 'supermarket':
            return [('Buy seeds', self.buy_seeds),
                    ('Buy Bread (100G)', lambda: self.buy('Bread', 100)),
                    ('Buy Blue Feather (1000G)', lambda: self.buy('Blue Feather', 1000, 1)),
                    ('Buy kitchen goods', self.buy_kitchen_goods)]
        if bid == 'carpenter':
            return [('Buy Lumber (50G)', lambda: self.buy('Lumber', 50)),
                    ('Order a house expansion', self.order_expansion)]
        if bid == 'poultry':
            return [('Buy a chicken (1500G)', self.buy_chicken),
                    ('Buy Chicken Feed (10G)', lambda: self.buy('Chicken Feed', 10))]
        if bid == 'blacksmith':
            return [('Upgrade a tool', self.upgrade_tool)]
        if bid == 'inn':
            return [('Eat lunch (300G, +50 stamina)', self.inn_lunch)]
        if bid == 'clinic':
            return [('Buy Bodigizer (500G)', lambda: self.buy('Bodigizer', 500)),
                    ('Get a checkup', self.checkup)]
        if bid == 'library':
            return [('Read a book', lambda: self.say(random.choice(BOOKS), 'Book'))]
        if bid == 'church':
            return [('Pray', self.pray)]
        if bid == 'mayor':
            return [('Ask about your farm', self.farm_report)]
        if bid == 'yodel':
            return [('Buy Milk (150G)', lambda: self.buy('Milk', 150)),
                    ('Buy a cow (5000G)', lambda: self.buy_animal('cow')),
                    ('Buy a sheep (4000G)', lambda: self.buy_animal('sheep')),
                    ('Buy Fodder (20G)', lambda: self.buy('Fodder', 20)),
                    ('Buy Milker (2000G)', lambda: self.buy_barn_tool('Milker', 2000)),
                    ('Buy Clippers (1800G)', lambda: self.buy_barn_tool('Clippers', 1800)),
                    ('Buy Brush (800G)', lambda: self.buy_barn_tool('Brush', 800))]
        return []

    def buy(self, item, price, limit=99):
        maxq = min(limit, self.gold // price)
        if maxq <= 0:
            self.say("You can't afford that.", None)
            return
        q = self.ask_qty(f"Buy how many {item}?", maxq, price, 'Cost')
        if q:
            self.gold -= q * price
            self.give(item, q)
            self.msg(f"Bought {q} {item} for {q * price}G.", '09')

    def buy_seeds(self):
        crops = [c for c, d in CROPS.items() if d[0] == self.season_name]
        if not crops:
            self.say("Nothing grows in winter, dear. Come back in Spring!", 'Jeff')
            return
        opts = [f"{c + ' Seeds':20s} {CROPS[c][1]:5d}G" for c in crops]

        def info(s):
            d = CROPS[crops[s]]
            regrow = f", regrows every {d[3]}d" if d[3] else ''
            return [f"  {d[2]} days to grow{regrow}", f"  sells for {d[4]}G each, sows 3x3"]
        sel = self.menu(f"Seeds   {self.gold}G", opts, info=info)
        if sel is not None:
            self.buy(crops[sel] + ' Seeds', CROPS[crops[sel]][1])

    def buy_chicken(self):
        if self.chickens >= self.coop_cap():
            self.say("Your coop is full!", 'Lillia')
        elif self.gold < 1500:
            self.say("A chicken is 1500G. Come back when you've saved up.", 'Lillia')
        elif self.confirm("Buy a chicken for 1500G?"):
            self.gold -= 1500
            self.chickens += 1
            self.say("Rick will bring it to your coop. Remember to fill its feed box!", 'Lillia')

    def upgrade_tool(self):
        if self.upgrading:
            self.say(f"I'm still working on your {self.upgrading[0]}. Hmph. Patience.", 'Saibara')
            return
        opts = []
        for t in UPGRADABLE:
            lvl = self.levels[t]
            if lvl >= 4:
                opts.append(f"{t:13s} (Mystrile - maxed)")
            else:
                cost, ore = UPGRADE[lvl + 1]
                opts.append(f"{t:13s} -> {LEVELS[lvl + 1]:8s} {cost}G + 3 {ore}")
        sel = self.menu('Upgrade which tool?', opts)
        if sel is None:
            return
        t = UPGRADABLE[sel]
        lvl = self.levels[t]
        if lvl >= 4:
            self.say("That tool is already the finest it can be.", 'Saibara')
            return
        cost, ore = UPGRADE[lvl + 1]
        if self.gold < cost or self.inv.get(ore, 0) < 3:
            self.say(f"I need {cost}G and 3 {ore} ore. Find ore in the mine on Mother's Hill.",
                     'Saibara')
            return
        self.gold -= cost
        self.take(ore, 3)
        self.upgrading = [t, self.absday() + 2]
        if self.tool == t:
            self.tool = 'Sickle'
        self.say(f"Leave your {t} with me. Come back in two days. Hmph.", 'Saibara')

    def inn_lunch(self):
        if self.gold < 300:
            self.say("Lunch is 300G, friend.", 'Doug')
            return
        self.gold -= 300
        self.stamina = min(self.max_stamina, self.stamina + 50)
        self.say("Here you go - Doug's special! You feel refreshed. (+50 stamina)", 'Doug')

    def checkup(self):
        s = self.stamina
        verdict = ("You're in excellent shape." if s > 70 else "You're a little tired." if s > 30
                   else "You're exhausted! Rest, and eat something.")
        self.say(f"Stamina {s}/{self.max_stamina}. {verdict}", 'Doctor')

    def pray(self):
        if self.prayed:
            self.say("You sit quietly for a while. Your mind is at peace.", None)
            return
        self.prayed = True
        self.stamina = min(self.max_stamina, self.stamina + 10)
        self.say("You pray to the Harvest Goddess. You feel a gentle warmth. (+10 stamina)", None)

    def farm_report(self):
        best = sorted(((v, n) for n, v in self.friend.items()), reverse=True)[:6]
        lines = [f"  Gold: {self.gold}G     Total shipped: {self.shipped_total}G",
                 f"  Tilled: {len(self.tilled)}  Crops growing: {len(self.crops)}"
                 f"  Chickens: {self.chickens}",
                 f"  Spouse: {self.married or '-'}", "", "  Friends:"]
        for v, n in best:
            lines.append(f"   {n:8s} {self.hearts(n)[0]}")
        self.show_lines('Mayor Thomas: Your Farm', lines)

    # ---- festivals -------------------------------------------------------
    def fest_date(self, offset=0):
        n = self.day - 1 + offset
        return (self.season + n // 30) % 4, n % 30 + 1

    def fest_on(self, offset=0):
        return FESTIVALS.get(self.fest_date(offset))

    def fest_active(self):
        f = self.fest_on()
        return f if f and f[1] * 60 <= self.minutes < f[2] * 60 else None

    def birthdays(self, offset=0):
        when = self.fest_date(offset)
        return [n for n, d in BIRTHDAYS.items() if d == when]

    def fest_sync(self):
        """Gather everyone around the fountain while a festival is on."""
        f = self.fest_active()
        saved = getattr(self, '_fest_saved', None)
        if f and saved is None:
            self._fest_saved = {n: d['where'] for n, d in NPCS.items()}
            for i, n in enumerate(NPCS):
                x, y = FEST_SPOTS[i % len(FEST_SPOTS)]
                NPCS[n]['where'] = ('town', x, y)
            self.npc_pos = {}
            if not self.fest_attended:
                self.msg(f"The {f[0]} has begun in Rose Square!", '0A')
        elif not f and saved is not None:
            for n, w in saved.items():
                NPCS[n]['where'] = w
            self._fest_saved = None
            self.npc_pos = {}

    def fest_is_out(self, n):
        if n == self.married or not self.fest_active():
            return None
        return True

    def fest_check(self):
        f = self.fest_active()
        if not f or self.mapname != 'town' or self.fest_attended or self.fest_declined:
            return
        if not (29 <= self.px <= 43 and 8 <= self.py <= 19):
            return
        if self.confirm(f"The {f[0]} is underway! Join in?"):
            self.fest_run(f)
        else:
            self.fest_declined = True
            self.msg("Talk to Mayor Thomas when you're ready to join in.")

    def fest_talk(self, n):
        f = self.fest_active()
        if n != 'Thomas' or not f or self.held or self.fest_attended:
            return False
        if self.confirm(f"Join the {f[0]}?"):
            self.fest_run(f)
            return True
        return False

    def fest_run(self, f):
        name, _, end, kind = f
        self.fest_attended = True
        self.say(f"Welcome, everyone, to the {name}! Ho ho!", 'Thomas')
        getattr(self, 'fest_ev_' + kind)()
        self.minutes = max(self.minutes, end * 60)
        self.say(f"The {name} draws to a close, and everyone heads home.", None)
        self.update_npcs()
        self.last = time.time()

    def fest_new_day(self, report):
        self.fest_attended = self.fest_declined = False
        f = self.fest_on()
        if f:
            report.append(f"Today is the {f[0]}! Head to Rose Square between {fmt_hour(f[1])} "
                          f"and {fmt_hour(f[2])}. Shops are closed.")
        t = self.fest_on(1)
        if t:
            report.append(f"Tomorrow is the {t[0]}.")
        for n in self.birthdays():
            report.append(f"It's {n}'s birthday today! A gift would mean a lot.")

    def fest_closed(self, bid):
        f = self.fest_on()
        if not f or bid == 'church':
            return False
        self.say(f"A sign on the door: 'Closed today for the {f[0]}. See you in Rose Square!'", None)
        return True

    def birthday_gift(self, n, pts, line):
        if n not in self.birthdays():
            return pts, line
        if pts > 0:
            return pts * 2 + 2, line + " And on my birthday! You remembered!"
        return pts, line + " ...On my birthday, too."

    def fest_news(self):
        parts = []
        f = self.fest_on()
        if f:
            parts.append(f"Today: the {f[0]} in Rose Square, {fmt_hour(f[1])}-{fmt_hour(f[2])}.")
        t = self.fest_on(1)
        if t:
            parts.append(f"Tomorrow: the {t[0]}.")
        for n in self.birthdays():
            parts.append(f"Happy birthday to {n}!")
        for n in self.birthdays(1):
            parts.append(f"Tomorrow is {n}'s birthday.")
        return ('  ' + ' '.join(parts)) if parts else ''

    def fest_calendar(self):
        lines = []
        for off in range(0, 31):
            s, d = self.fest_date(off)
            when = f"{'today' if off == 0 else 'tomorrow' if off == 1 else f'in {off} days':10s}"
            f = FESTIVALS.get((s, d))
            if f:
                lines.append(f" {SEASONS[s]:6s} {d:2d}  {when}  {f[0]}")
            for n in self.birthdays(off):
                lines.append(f" {SEASONS[s]:6s} {d:2d}  {when}  {n}'s birthday")
        self.show_lines('Upcoming events', (lines or [' Nothing planned.'])[:12])

    def fest_bachs(self):
        return [n for n, d in NPCS.items() if d['bach']]

    def fest_bond(self, n, pts):
        self.friend[n] = clamp(self.friend[n] + pts, 0, 100)

    def fest_pick(self, title, names):
        opts = [f"{n:8s} {self.hearts(n)[0]}" for n in names] + ['No one']
        sel = self.menu(title, opts)
        return names[sel] if sel is not None and sel < len(names) else None

    def fest_win(self, name):
        if name not in self.fest_wins:
            self.fest_wins.append(name)

    def fest_ev_newyear(self):
        self.say("Let's welcome the new year together! Doug made rice cakes for everyone!", 'Thomas')
        self.stamina = self.max_stamina
        for n in NPCS:
            self.fest_bond(n, 2)
        self.say("You share rice cakes and good wishes with the whole town. "
                 "(Stamina restored, everyone likes you a little more.)", None)

    def fest_ev_goddess(self):
        self.say("Every spring the young women of town dance to thank the Harvest Goddess.", 'Thomas')
        self.say("Mary, Karen, Popuri, Elli and Ann step into the square in flowing white dresses.",
                 None)
        n = self.fest_pick('Who do you cheer for?', self.fest_bachs())
        if n:
            self.fest_bond(n, 5)
            self.say(f"You cheer for {n}. She catches your eye mid-dance and smiles.", None)
        self.give('Strawberry Seeds')
        self.say("A warm breeze carries the Goddess's blessing. You receive a bag of "
                 "Strawberry Seeds.", None)

    def fest_ev_dance(self):
        self.say("The square is covered in flowers. Now, everyone, find a partner and dance!",
                 'Thomas')
        n = self.fest_pick('Ask someone to dance', self.fest_bachs())
        if not n:
            self.say("You watch the dancers from the edge of the square.", None)
        elif self.friend[n] >= 20 or n == self.married:
            self.fest_bond(n, 8)
            self.say("I'd love to! ...You're not a bad dancer, you know.", n)
        else:
            self.fest_bond(n, 1)
            self.say("Oh! Um... maybe next year? I don't know you that well yet.", n)

    def fest_mash(self, duration, rival, title):
        """Alternate left/right as fast as possible. Returns presses counted."""
        start, n, last = time.time(), 0, None
        W, H = self.scr.w, self.scr.h
        while True:
            el = time.time() - start
            if el >= duration:
                break

            def draw(el=el, n=n):
                bx, by = (W - 50) // 2, H // 2 - 4
                self.scr.box(bx, by, 50, 7, '0D', '00', title)
                bar = 32
                you = min(bar, n * bar // max(1, rival + 8))
                them = min(bar, int(rival * el / duration) * bar // max(1, rival + 8))
                self.scr.put(bx + 2, by + 2, 'You   [' + '#' * you + '.' * (bar - you) + ']', '0B')
                self.scr.put(bx + 2, by + 3, 'Rival [' + '#' * them + '.' * (bar - them) + ']', '08')
                self.scr.put(bx + 2, by + 5, f"LEFT / RIGHT alternately!   {duration - el:3.1f}s",
                             '07', '00', True)
            self.render()
            draw()
            self.scr.flush()
            k = self.scr.getkey(0.03)
            if k in ('left', 'a', 'h', 'right', 'd', 'l'):
                side = 'L' if k in ('left', 'a', 'h') else 'R'
                if side != last:
                    n += 1
                    last = side
        self.last = time.time()
        return n

    def fest_ev_sumo(self):
        self.say("Chicken Sumo! Each farmer's hen tries to push the other out of the ring!", 'Thomas')
        if not self.chickens:
            self.say("You don't have a chicken to enter, so you watch Rick's hen win again.", None)
            return
        rival = random.randint(16, 32)
        self.say("Cheer your hen on by alternating LEFT and RIGHT as fast as you can. 5 seconds!",
                 'Rick')
        score = self.fest_mash(5.0, rival, 'Chicken Sumo')
        if score >= rival:
            self.gold += 500
            self.give('Chicken Feed', 10)
            self.fest_win('Chicken Sumo')
            self.fest_bond('Rick', 3)
            self.say(f"Your hen shoves Rick's hen clean out of the ring! You win 500G and "
                     f"10 Chicken Feed. ({score} vs {rival})", 'Thomas')
        else:
            self.fest_bond('Rick', 1)
            self.say(f"Rick's hen holds the ring. Better luck next year! ({score} vs {rival})", 'Rick')

    def fest_ev_egghunt(self):
        self.say("Eggs are hidden in nine flower bushes around the square. You get three peeks. "
                 "Find two or more to win!", 'Thomas')
        eggs = set(random.sample(range(9), 3))
        opened, cur, tries, found = set(), 4, 3, 0
        W, H = self.scr.w, self.scr.h
        while tries > 0:
            def draw():
                bx, by = (W - 36) // 2, H // 2 - 6
                self.scr.box(bx, by, 36, 11, '0D', '00', f'Egg Hunt  peeks left: {tries}')
                for i in range(9):
                    cx, cy = bx + 5 + (i % 3) * 10, by + 2 + (i // 3) * 2
                    if i in opened:
                        txt, fg = ('( o )', '07') if i in eggs else ('(   )', '02')
                    else:
                        txt, fg = '(***)', '0B'
                    self.scr.put(cx, cy, txt, fg, '01' if i == cur else '00', i == cur)
                self.scr.put(bx + 3, by + 9, 'arrows move, X to search', '02')
            k = self.modal(draw)
            if k in DIRS:
                dx, dy = DIRS[k]
                cur = clamp(cur % 3 + dx, 0, 2) + 3 * clamp(cur // 3 + dy, 0, 2)
            elif k in OK_KEYS and cur not in opened:
                opened.add(cur)
                tries -= 1
                if cur in eggs:
                    found += 1
                    self.msg("You found an egg!", '07')
            elif k in CANCEL_KEYS:
                break
        if found:
            self.give('Egg', found)
        if found >= 2:
            self.gold += 300
            self.fest_win('Egg Hunt')
            self.say(f"You found {found} eggs! First prize: 300G - and you keep the eggs!", 'Thomas')
        else:
            self.fest_bond('May', 2)
            self.say(f"You found {found} egg{'s' if found != 1 else ''}. May found the most "
                     "and wins this year. She's thrilled!", 'Thomas')

    def fest_ev_crops(self):
        self.say("Farmers, bring out your finest crop! The judges will choose the best.", 'Thomas')
        crops = [i for i in sorted(self.inv) if ITEMS[i][2] == 'crop']
        if not crops:
            self.say("You have no crops to enter. You admire everyone else's vegetables.", None)
            return
        sel = self.menu('Enter which crop?', [f"{c} (worth {ITEMS[c][0]}G)" for c in crops])
        if sel is None:
            self.say("You decide to just watch the judging.", None)
            return
        crop = crops[sel]
        mine = ITEMS[crop][0] * random.uniform(0.9, 1.5)
        rivals = {n: random.uniform(40, 240) for n in ('Rick', 'Basil', 'Barley')}
        best = max(rivals, key=rivals.get)
        if mine > rivals[best]:
            self.gold += 1000
            self.fest_win('Crop Festival')
            self.say(f"First prize goes to {self.name}'s magnificent {crop}! (+1000G)", 'Thomas')
        else:
            self.gold += 100
            self.say(f"{best}'s entry takes first prize. Your {crop} earns an honorable "
                     "mention. (+100G)", 'Thomas')

    def fest_companion(self, ask, scene, line):
        names = [n for n in self.fest_bachs() if n != self.married]
        if self.married:
            names.insert(0, self.married)
        n = self.fest_pick(ask, names)
        if not n:
            self.say(scene, None)
        elif self.friend[n] >= 10 or n == self.married:
            self.fest_bond(n, 6)
            self.say(f"{scene} {n} stays by your side the whole time.", None)
            self.say(line, n)
        else:
            self.fest_bond(n, 1)
            self.say("Sorry, I promised to spend tonight with my family.", n)
            self.say(scene, None)

    def fest_ev_fireworks(self):
        self.fest_companion("Watch the fireworks with...",
                            "BOOM! Fireworks bloom over the river in red, blue and pink.",
                            "Wow... they're beautiful. I'm glad I'm watching them with you.")

    def fest_ev_moon(self):
        self.fest_companion("View the moon with...",
                            "The full moon rises over Mother's Hill, round and bright.",
                            "The moon is so pretty tonight. ...So is the company.")

    def fest_ev_harvest(self):
        self.say("Everyone adds an ingredient to the giant pot! Then we all share the stew!",
                 'Thomas')
        items = [i for i in sorted(self.inv) if ITEMS[i][2] in ('crop', 'forage', 'fish', 'animal')]
        sel = self.menu('Add what to the pot?', items + ['Nothing']) if items else None
        if sel is None or sel >= len(items):
            self.say("Everyone else's ingredients make a fine stew anyway.", None)
        else:
            item = items[sel]
            self.take(item)
            pts = 3 if ITEMS[item][0] >= 100 else 2
            for n in NPCS:
                self.fest_bond(n, pts)
            self.say(f"Your {item} makes the stew delicious! Everyone thanks you.", None)
        self.stamina = self.max_stamina
        self.say("You eat until you're full. (Stamina restored)", None)

    def fest_ev_thanks(self):
        self.say("Thanksgiving! It's a day to give thanks to the people you care about.", 'Thomas')
        cakes = [n for n in self.fest_bachs() if self.friend[n] >= 40 or n == self.married]
        for n in cakes:
            self.give('Cake')
            self.say("Happy Thanksgiving! I baked this for you. ...Don't make a big deal of it!", n)
        if not cakes:
            self.say("No one gave you a cake this year... Maybe next year.", None)

    def fest_ev_starry(self):
        n = self.married
        if not n:
            best = max(self.fest_bachs(), key=lambda b: self.friend[b])
            n = best if self.friend[best] >= 30 else None
        if n:
            self.fest_bond(n, 10)
            self.say(f"Snow falls softly. {n} finds you by the fountain and takes your hand.", None)
            self.say("They say a wish made on Starry Night always comes true. I already know "
                     "what I'll wish for.", n)
        else:
            self.fest_bond('Thomas', 3)
            self.say("You spend Starry Night with Mayor Thomas, eating his famous pot roast. "
                     "Ho ho!", None)

    def fest_ev_nye(self):
        self.say(f"Another year in Mineral Town comes to an end! Thank you all, and thank you, "
                 f"{self.name}!", 'Thomas')
        self.stamina = self.max_stamina
        for n in NPCS:
            self.fest_bond(n, 1)
        self.show_lines(f"Year {self.year} in review", [
            f"  Gold: {self.gold}G", f"  Total shipped: {self.shipped_total}G",
            f"  Chickens: {self.chickens}", f"  Spouse: {self.married or '-'}",
            f"  Festival prizes: {', '.join(self.fest_wins) or 'none yet'}"])

    # ---- days ------------------------------------------------------------
    def pass_out(self, text):
        if self.passing_out:
            return
        self.passing_out = True
        self.say(text, None)
        self.new_day('passout')
        self.passing_out = False

    def new_day(self, reason):
        late = self.minutes >= 24 * 60
        report = []
        if self.bin:
            total = sum(ITEMS[i][0] * q for i, q in self.bin.items())
            self.gold += total
            self.shipped_total += total
            report.append(f"Zack collected your shipment overnight: +{total}G.")
            self.bin = {}
        for p, c in self.crops.items():
            if p in self.wet and c[1] < CROPS[c[0]][2]:
                c[1] += 1
        self.wet = set()
        self.day += 1
        if self.day > 30:
            self.day = 1
            self.season += 1
            if self.season > 3:
                self.season = 0
                self.year += 1
            report.append(f"{self.season_name} has arrived!")
            if self.crops:
                report.append("The change of season withered your crops.")
                self.crops = {}
        self.weather = self.tomorrow
        nd, ns = self.day + 1, self.season
        if nd > 30:
            nd, ns = 1, (ns + 1) % 4
        self.tomorrow = self.roll_weather(ns, nd)
        if self.weather == 'Rain':
            self.wet = set(self.tilled)
            report.append("It's raining - your fields are watered.")
        if self.fed:
            self.eggs += self.fed
            report.append(f"Your chickens laid {self.fed} egg{'s' if self.fed > 1 else ''}.")
        self.fed = 0
        self.barn_new_day(report)
        if self.upgrading and self.absday() >= self.upgrading[1]:
            t = self.upgrading[0]
            self.levels[t] += 1
            if t == 'Watering Can':
                self.water = CAN_CAP[self.levels[t]]
            report.append(f"Saibara finished your {LEVELS[self.levels[t]]} {t}!")
            self.upgrading = None
        report += self.carpentry_day()
        if self.season != 3:
            m = self.maps['farm']
            objs = self.objs['farm']
            for _ in range(4):
                x, y = random.randint(3, 60), random.randint(9, 26)
                if m.tile(x, y) == 'field' and (x, y) not in self.tilled and (x, y) not in objs:
                    objs[(x, y)] = 'weed'
        self.spawn_forage()
        self.talked, self.gifted, self.prayed = set(), set(), False
        self.fest_new_day(report)
        if reason == 'passout':
            self.stamina = self.max_stamina // 2
            report.append("You woke up at home, still aching. (half stamina)")
        elif late:
            self.stamina = self.max_stamina * 3 // 4
            report.append("You stayed up late. You don't feel fully rested.")
        else:
            self.stamina = self.max_stamina
        self.minutes = 6 * 60
        self.acc = 0
        self.mapname = 'house'
        self.px, self.py = HOUSE_WAKE
        self.face = (0, -1)
        self.npc_pos = {}
        self.save()
        self.msgs = []
        self.say(f"Good morning! {self.date_str()}.  Weather: {self.weather}.", None)
        for r in report:
            self.say(r, None)
        self.msg("Game saved.", '03')
        self.last = time.time()

    def spawn_forage(self):
        m = self.maps['mountain']
        items = FORAGE[self.season_name]
        fr = {}
        rng = random.Random()
        tries = 0
        target = 5 if self.season == 3 else 10
        while len(fr) < target and tries < 500:
            tries += 1
            x, y = rng.randint(1, m.w - 2), rng.randint(1, m.h - 2)
            if m.tile(x, y) == 'grass' and not m.near(x, y, ('path',), 0):
                fr[(x, y)] = rng.choice(items)
        self.forage['mountain'] = fr

    # ---- rendering -------------------------------------------------------
    def glyph(self, m, x, y, t):
        p = (x, y)
        name = m.name
        obj = self.objs.get(name, {}).get(p)
        if obj:
            ch, fg = OBJ_GLYPH[obj]
            if self.season == 3 and name == 'farm':
                fg = '07' if obj == 'weed' else fg
            return ch, fg, '00', False
        fr = self.forage.get(name, {}).get(p)
        if fr:
            ch, fg = FORAGE_GLYPH[fr]
            return ch, fg, '00', True
        if name == 'farm' and p in self.tilled:
            bg = '01' if p in self.wet else '00'
            c = self.crops.get(p)
            if not c:
                return '=', '09', bg, False
            crop, age = c
            d = CROPS[crop]
            if age >= d[2]:
                return d[5], d[6], bg, True
            if age == 0:
                return ':', '09', bg, False
            if age < d[2] / 2:
                return ',', '0B', bg, False
            return '"', '0B', bg, False
        if p in m.deco:
            ch, fg = m.deco[p]
            return ch, fg, TILES[t][2], False
        ch, fg, bg, _ = TILES[t]
        season = self.season
        h = (x * 7 + y * 13 + x * y) % 11
        if t == 'grass':
            if season == 3:
                return ('.' if h < 4 else ' '), '05', '00', False
            if h < 3:
                return (',' if h else '"'), ('09' if season == 2 and h != 1 else '0B'), '00', False
            return ' ', fg, bg, False
        if t == 'field' and season == 3:
            return '.', '05', '00', False
        if t == 'tree':
            return 'T', ('0B', '0B', '09', '04')[season], '00', True
        if t == 'flower':
            if season == 3:
                return '.', '05', '00', False
            return '*', ('0A', '0E', '08', '0C', '07')[h % 5], '00', False
        if t in ('water', 'fountain'):
            if (x + y + int(time.time() * 1.5)) % 7 == 0:
                ch = '-'
            if season == 3 and t == 'water' and m.name != 'mine':
                fg = '0C'
        return ch, fg, bg, False

    def render(self):
        s = self.scr
        s.clear()
        if not self.started:
            self.draw_title()
            return
        W, H = s.w, s.h
        if W < 80 or H < 24:
            s.put(0, 0, f"Terminal too small: need 80x24, have {W}x{H}", '08')
            return
        side = 27
        vw, vh = W - side - 1, H - 5
        self.draw_topbar(W)
        self.draw_map(0, 1, vw, vh)
        for y in range(1, H - 4):
            s.put(vw, y, '|', '01')
        s.put(0, H - 4, '-' * W, '01')
        self.draw_side(vw + 2, 2, side - 2)
        self.draw_msgs(H - 3)

    def draw_topbar(self, W):
        s = self.scr
        s.put(0, 0, ' ' * W, '05', '01')
        sn = self.season_name
        x = 1
        for text, fg in [(f"{sn} {self.day}", SEASON_COL[sn]), (f" {WEEKDAYS[self.weekday]}", '05'),
                         (f"  Year {self.year}", '04'), (f"   {fmt_time(self.minutes)}", '07'),
                         (f"   {self.weather}", WEATHER_COL[self.weather]),
                         (f"   {self.gold}G", '09')]:
            s.put(x, 0, text, fg, '01', True)
            x += len(text)
        loc = self.map.title + ('   (time stops indoors)' if self.map.indoor else '')
        s.put(W - len(loc) - 2, 0, loc, '0C', '01')

    def draw_map(self, ox, oy, vw, vh):
        s = self.scr
        m = self.map
        if m.w <= vw:
            cx, ox = 0, ox + (vw - m.w) // 2
        else:
            cx = clamp(self.px - vw // 2, 0, m.w - vw)
        if m.h <= vh:
            cy, oy = 0, oy + (vh - m.h) // 2
        else:
            cy = clamp(self.py - vh // 2, 0, m.h - vh)
        hour = self.minutes / 60
        night = not m.indoor and m.name != 'mine' and (hour >= 19 or hour < 5)
        dusk = not m.indoor and m.name != 'mine' and 17.5 <= hour < 19
        tx, ty = self.target()
        for sy in range(min(vh, m.h)):
            y = cy + sy
            row = m.t[y]
            for sx in range(min(vw, m.w)):
                x = cx + sx
                ch, fg, bg, bold = self.glyph(m, x, y, row[x])
                if night and fg not in ('00', '01'):
                    fg = '0F' if fg in ('0D', '0C') else '02' if fg in ('02', '03') else '03'
                elif dusk and fg == '0B':
                    fg = '09'
                if (x, y) == (tx, ty):
                    bg = '02' if bg == '01' else '01'
                s.put(ox + sx, oy + sy, ch, fg, bg, bold)

        def at(x, y, ch, fg, bold=True):
            sx, sy = x - cx, y - cy
            if 0 <= sx < min(vw, m.w) and 0 <= sy < min(vh, m.h):
                bg = s.buf[oy + sy][ox + sx][2]
                s.put(ox + sx, oy + sy, ch, fg, bg, bold)
        for n, (x, y) in self.npc_pos.items():
            if NPCS[n]['where'][0] == self.mapname:
                at(x, y, NPCS[n]['g'], NPCS[n]['col'])
        for n, d in self.indoor_npcs.items():
            if d['map'] == self.mapname and n != self.married:
                at(*d['pos'], NPCS[n]['g'], NPCS[n]['col'])
        if self.mapname == 'house' and self.married:
            at(*SPOUSE_POS, NPCS[self.married]['g'], NPCS[self.married]['col'])
        at(self.px, self.py, '@', '07')
        if not m.indoor and m.name != 'mine' and self.weather != 'Sunny':
            rng = random.Random(int(time.time() * 8))
            drops = vw * vh // (25 if self.weather == 'Rain' else 45)
            for _ in range(drops):
                sx, sy = rng.randrange(min(vw, m.w)), rng.randrange(min(vh, m.h))
                if (sx + cx, sy + cy) == (self.px, self.py):
                    continue
                cell = s.buf[oy + sy][ox + sx]
                if self.weather == 'Rain':
                    s.put(ox + sx, oy + sy, '/', '0D', cell[2])
                else:
                    s.put(ox + sx, oy + sy, rng.choice('*.'), '07', cell[2])

    def draw_side(self, x, y, w):
        s = self.scr
        sn = self.season_name
        s.put(x, y, 'H R V S T M N', SEASON_COL[sn], '00', True)
        s.put(x, y + 1, f"{self.name} of {self.farm} Farm"[:w], '04')
        y += 3
        t = self.tool
        s.put(x, y, 'Tool', '03')
        idx = f"[{TOOLS.index(t) + 1}] " if t in TOOLS else '    '
        s.put(x + 6, y, (idx + t)[:w - 6], '07', '00', True)
        y += 1
        if t in UPGRADABLE:
            lvl = self.levels[t]
            s.put(x + 6, y, LEVELS[lvl], LEVEL_COL[lvl])
            if t == 'Watering Can':
                s.put(x + 15, y, f"{self.water}/{CAN_CAP[lvl]}", '0D')
        elif t.endswith(' Seeds'):
            crop = t[:-6]
            ok = CROPS[crop][0] == sn
            s.put(x + 6, y, f"x{self.inv.get(t, 0)} bags", '0B' if ok else '08')
            if not ok:
                s.put(x + 15, y, '(off-season)', '08')
        y += 1
        if self.upgrading:
            s.put(x, y, f"Saibara has: {self.upgrading[0]}"[:w], '03')
        y += 1
        s.put(x, y, 'Held', '03')
        held = f"{self.held} x{self.inv.get(self.held, 0)}" if self.held else '-'
        s.put(x + 6, y, held[:w - 6], '0A' if self.held else '02')
        y += 2
        frac = self.stamina / self.max_stamina
        col = '0B' if frac > 0.5 else '09' if frac > 0.25 else '08'
        bw = w - 6
        filled = int(round(frac * bw))
        s.put(x, y, 'Stam', '03')
        s.put(x + 6, y, '#' * filled, col, '00', True)
        s.put(x + 6 + filled, y, '.' * (bw - filled), '01')
        y += 2
        s.put(x, y, 'Gold', '03')
        s.put(x + 6, y, f"{self.gold}G", '09', '00', True)
        y += 1
        binv = sum(ITEMS[i][0] * q for i, q in self.bin.items())
        s.put(x, y, 'Bin', '03')
        s.put(x + 6, y, f"{binv}G pending", '09' if binv else '02')
        y += 1
        if self.chickens:
            s.put(x, y, 'Coop', '03')
            s.put(x + 6, y, f"{self.chickens} hens, {self.eggs} eggs", '07')
        if self.animals:
            y += 1
            hungry = sum(1 for a in self.animals if not a['fed'])
            s.put(x, y, 'Barn', '03')
            s.put(x + 6, y, (f"{len(self.animals)} animals" +
                             (f", {hungry} hungry" if hungry else ', all fed'))[:w - 6],
                  '08' if hungry else '07')
        y += 2
        help_lines = [('SPC', 'use tool'), ('X', 'act / talk'), ('TAB', 'next tool'),
                      ('I', 'rucksack'), ('?', 'help'), ('Q', 'quit')]
        for k, d in help_lines:
            if y >= s.h - 5:
                break
            s.put(x, y, f"{k:>3}", '0D', '00', True)
            s.put(x + 4, y, d, '03')
            y += 1

    def draw_msgs(self, y0):
        cols = ['02', '03', None]
        recent = self.msgs[-3:]
        for i, (text, col) in enumerate(recent):
            age = len(recent) - 1 - i
            fg = col if age == 0 else cols[1] if age == 1 else cols[0]
            self.scr.put(1, y0 + i, text[:self.scr.w - 2], fg)

    def draw_title(self):
        s = self.scr
        W, H = s.w, s.h
        lw = len(LOGO[0])
        x0 = max(0, (W - lw) // 2)
        cols = ['0A', '0E', '0D', '0C', '0B']
        for i, line in enumerate(LOGO):
            s.put(x0, 2 + i, line, cols[i], '00', True)
        sub = "~ an ASCII tribute to Harvest Moon: Friends of Mineral Town ~"
        s.put(max(0, (W - len(sub)) // 2), 8, sub, '04')
        scene_y = 10
        hills = "   T   T  .-^-.   T        T   .-^-.   T   "
        s.put(max(0, (W - len(hills)) // 2), scene_y, hills, '0B')
        field = " o * j o Y * o v d o * j O o * A o v * o j "
        fx = max(0, (W - len(field)) // 2)
        palette = ['07', '08', '0B', '09', '0E', '0A']
        for i, ch in enumerate(field):
            s.put(fx + i, scene_y + 1, ch, palette[i % len(palette)] if ch != ' ' else '00',
                  '00', True)
        s.put(fx, scene_y + 2, '=' * len(field), '09')
        tag = "base16 isotope dark"
        s.put(max(0, (W - len(tag)) // 2), H - 2, tag, '02')

    # ---- UI widgets ------------------------------------------------------
    def modal(self, draw):
        while True:
            self.render()
            draw()
            self.scr.flush()
            k = self.scr.getkey(0.25)
            if k:
                self.last = time.time()
                return k

    def say(self, text, who=None):
        W, H = self.scr.w, self.scr.h
        bw = min(W - 4, 74)
        lines = []
        for para in text.split('\n'):
            lines += textwrap.wrap(para, bw - 4) or ['']
        pages = [lines[i:i + 3] for i in range(0, len(lines), 3)]
        title, tcol, hearts = None, '07', None
        if who in NPCS:
            title, tcol = who, NPCS[who]['col']
            hearts = self.hearts(who)
        elif who:
            title = who
        for page in pages:
            def draw(page=page):
                bx, by = (W - bw) // 2, H - 8
                self.scr.box(bx, by, bw, 6, '0D', '00', title, tcol)
                if hearts:
                    self.scr.put(bx + len(title) + 5, by, hearts[0], hearts[1])
                for i, ln in enumerate(page):
                    self.scr.put(bx + 2, by + 1 + i, ln, '06')
                if int(time.time() * 2) % 2:
                    self.scr.put(bx + bw - 3, by + 4, 'v', '0A', '00', True)
            self.modal(draw)

    def show_lines(self, title, lines):
        W, H = self.scr.w, self.scr.h
        bw = min(W - 2, max(len(title) + 6, max(len(ln) for ln in lines) + 4))
        bh = min(H - 2, len(lines) + 3)

        def draw():
            bx, by = (W - bw) // 2, (H - bh) // 2
            self.scr.box(bx, by, bw, bh, '0D', '00', title)
            for i, ln in enumerate(lines[:bh - 3]):
                self.scr.put(bx + 2, by + 1 + i, ln, '05')
            self.scr.put(bx + 2, by + bh - 2, 'press any key', '02')
        self.modal(draw)

    def menu(self, title, opts, sel=0, info=None, y=None):
        n = len(opts)
        while True:
            W, H = self.scr.w, self.scr.h
            info_lines = info(sel) if callable(info) else (info or [])
            maxvis = max(3, H - 8 - len(info_lines))
            vis = min(n, maxvis)
            top = clamp(sel - vis // 2, 0, max(0, n - vis))
            w = min(W - 2, max([len(title) + 8] + [len(o) + 7 for o in opts] +
                               [len(ln) + 4 for ln in info_lines]))
            bh = vis + 2 + (len(info_lines) + 1 if info_lines else 0)

            def draw():
                bx = (W - w) // 2
                by = y if y is not None else max(1, (H - bh) // 2)
                self.scr.box(bx, by, w, bh, '0D', '00', title)
                for i in range(vis):
                    j = top + i
                    if j == sel:
                        self.scr.put(bx + 1, by + 1 + i, (' > ' + opts[j]).ljust(w - 2), '00', '0D',
                                     True)
                    else:
                        self.scr.put(bx + 1, by + 1 + i, '   ' + opts[j], '05')
                if top > 0:
                    self.scr.put(bx + w - 3, by + 1, '^', '03')
                if top + vis < n:
                    self.scr.put(bx + w - 3, by + vis, 'v', '03')
                if info_lines:
                    self.scr.put(bx + 1, by + vis + 1, '-' * (w - 2), '01')
                    for i, ln in enumerate(info_lines):
                        self.scr.put(bx + 1, by + vis + 2 + i, ln, '04')
            k = self.modal(draw)
            if k in ('up', 'w', 'k'):
                sel = (sel - 1) % n
            elif k in ('down', 's', 'j', 'tab'):
                sel = (sel + 1) % n
            elif k in OK_KEYS:
                return sel
            elif k in CANCEL_KEYS:
                return None
            elif len(k) == 1 and k.isdigit() and 1 <= int(k) <= min(n, 9):
                return int(k) - 1

    def confirm(self, question):
        return self.menu(question, ['Yes', 'No']) == 0

    def ask_qty(self, prompt, maxq, price=None, label='Total'):
        if maxq <= 0:
            return 0
        q = 1
        while True:
            W, H = self.scr.w, self.scr.h
            bw = max(len(prompt) + 8, 46)

            def draw():
                bx, by = (W - bw) // 2, H // 2 - 3
                self.scr.box(bx, by, bw, 6, '0D', '00', prompt)
                self.scr.put(bx + 3, by + 2, f"<  {q:3d}  >", '07', '00', True)
                self.scr.put(bx + 16, by + 2, f"of {maxq}", '03')
                if price:
                    self.scr.put(bx + 26, by + 2, f"{label}: {q * price}G", '09')
                self.scr.put(bx + 3, by + 4, "left/right +-1  up/down +-10  enter", '02')
            k = self.modal(draw)
            if k in ('left', 'a', 'h'):
                q = q - 1 if q > 1 else maxq
            elif k in ('right', 'd', 'l'):
                q = q + 1 if q < maxq else 1
            elif k in ('up', 'w', 'k'):
                q = min(maxq, q + 10)
            elif k in ('down', 's', 'j'):
                q = max(1, q - 10)
            elif k in OK_KEYS:
                return q
            elif k in CANCEL_KEYS:
                return 0

    def text_input(self, prompt, default=''):
        text = ''
        while True:
            W, H = self.scr.w, self.scr.h

            def draw():
                bw = 44
                bx, by = (W - bw) // 2, 15
                self.scr.box(bx, by, bw, 5, '0D', '00', prompt)
                self.scr.put(bx + 3, by + 2, text + ('_' if int(time.time() * 2) % 2 else ' '),
                             '07', '00', True)
                if not text:
                    self.scr.put(bx + 4, by + 2, default, '02')
                self.scr.put(bx + 3, by + 3, f'type, then enter (blank = {default})', '02')
            k = self.modal(draw)
            if k == 'enter':
                return text.strip() or default
            if k == 'backspace':
                text = text[:-1]
            elif k == 'space' and len(text) < 12:
                text += ' '
            elif k in ('esc', 'ctrl-c'):
                return default
            elif len(k) == 1 and k.isprintable() and len(text) < 12:
                text += k

    # ---- title & intro ---------------------------------------------------
    def title(self):
        while True:
            has_save = os.path.exists(SAVE_PATH)
            opts = (['Continue'] if has_save else []) + ['New Game', 'Quit']
            sel = self.menu('Menu', opts, y=15)
            choice = opts[sel] if sel is not None else 'Quit'
            if choice == 'Quit':
                self.running = False
                return
            if choice == 'Continue':
                try:
                    self.load()
                except (OSError, ValueError, KeyError) as e:
                    self.say(f"Couldn't load the save file: {e}", None)
                    self.started = False
                    continue
                self.update_npcs()
                self.say(f"Welcome back! {self.date_str()}.  Weather: {self.weather}.", None)
                return
            if has_save and not self.confirm("Start over? This will overwrite your save."):
                continue
            name = self.text_input("What's your name?", 'Pete')
            farm = self.text_input("Name your farm:", 'Moon')
            self.new_game(name, farm)
            self.intro()
            return

    def intro(self):
        t = 'Thomas'
        self.say(f"Ho ho! You must be {self.name}! Welcome to Mineral Town! I'm Mayor Thomas.", t)
        self.say(f"Your grandfather left you this farm. It's a bit overgrown, but I'm sure "
                 f"{self.farm} Farm will bloom again in your hands!", t)
        self.say("Clear the field, till the soil with your Hoe, plant seeds, and water them every "
                 "day. Drop your harvest in the shipping bin ($) and Zack will pay you each morning.", t)
        self.say("Visit town to buy seeds and meet everyone. Talk to folks every day - and a gift "
                 "never hurts! You have 500G and two bags of Turnip seeds to start. Good luck!", t)
        self.say("Press ? at any time for help.", None)

    # ---- carpentry & cooking ---------------------------------------------

    def init_carpentry(self):
        self.house_flags = []
        self.project = None
        self.bathed = False
        self.rebuild_house()

    def rebuild_house(self):
        self.maps['house'] = build_house_upgraded(getattr(self, 'house_flags', []))

    def coop_cap(self):
        return 16 if 'Coop Expansion' in getattr(self, 'house_flags', []) else 8

    def carpentry_day(self):
        self.bathed = False
        if not self.project or self.absday() < self.project[1]:
            return []
        name = self.project[0]
        self.project = None
        if name not in self.house_flags:
            self.house_flags.append(name)
        if name == 'Big Bed':
            self.max_stamina += 20
        self.rebuild_house()
        return [f"Gotz finished building your {name}! {EXPANSIONS[name][3]}"]

    def order_expansion(self):
        if self.project:
            left = max(1, self.project[1] - self.absday())
            self.say(f"I'm still building your {self.project[0]}. {left} more day"
                     f"{'s' if left > 1 else ''}.", 'Gotz')
            return
        names = list(EXPANSIONS)
        opts = []
        for n in names:
            gold, lumber, req, _ = EXPANSIONS[n]
            if n in self.house_flags:
                opts.append(f"{n:15s} (built)")
            else:
                opts.append(f"{n:15s} {gold:5d}G + {lumber:3d} Lumber")

        def info(s):
            gold, lumber, req, desc = EXPANSIONS[names[s]]
            lines = [f"  {desc}"]
            if req and req not in self.house_flags:
                lines.append(f"  Requires: {req}")
            lines.append(f"  You have {self.gold}G and {self.inv.get('Lumber', 0)} Lumber")
            return lines
        sel = self.menu('House expansions', opts, info=info)
        if sel is None:
            return
        n = names[sel]
        gold, lumber, req, _ = EXPANSIONS[n]
        if n in self.house_flags:
            self.say("Already built that one. Solid work, if I say so myself.", 'Gotz')
        elif req and req not in self.house_flags:
            self.say(f"I need to build the {req} first.", 'Gotz')
        elif self.gold < gold or self.inv.get('Lumber', 0) < lumber:
            self.say(f"That'll be {gold}G and {lumber} Lumber. Come back when you have it.", 'Gotz')
        elif self.confirm(f"Build the {n} for {gold}G + {lumber} Lumber?"):
            self.gold -= gold
            self.take('Lumber', lumber)
            self.project = [n, self.absday() + BUILD_DAYS]
            self.say(f"Right. I'll have your {n} done in {BUILD_DAYS} days.", 'Gotz')

    def buy_kitchen_goods(self):
        goods = list(UTENSILS) + ['Rice']
        prices = dict(UTENSILS, Rice=100)
        opts = [f"{g:11s} {prices[g]:5d}G" + ('  (owned)' if g in UTENSILS and g in self.inv else '')
                for g in goods]
        sel = self.menu(f"Kitchen goods   {self.gold}G", opts,
                        info=["  Utensils unlock recipes. You need a Kitchen to cook."])
        if sel is None:
            return
        g = goods[sel]
        if g in UTENSILS and g in self.inv:
            self.say(f"You already have a {g}.", None)
        else:
            self.buy(g, prices[g], 1 if g in UTENSILS else 99)

    def use_furniture(self, tile):
        if tile == 'kitchen':
            self.cook()
        elif tile == 'bath':
            if self.bathed:
                self.say("You already had a bath today.", None)
            else:
                self.bathed = True
                self.stamina = min(self.max_stamina, self.stamina + 30)
                self.say("Ahh... a hot bath. You feel refreshed. (+30 stamina)", None)
        else:
            self.show_lines('Recipe Book', [self.recipe_line(r) for r in RECIPES])

    def recipe_line(self, dish):
        ing, ut, _, _ = RECIPES[dish]
        parts = [f"{q} any {t[4:]}" if t.startswith('any:') else f"{q} {t}" for t, q in ing]
        return f"{dish:16s} {', '.join(parts)}" + (f"  [{ut}]" if ut else '')

    def ingredient_plan(self, dish):
        """Pick which rucksack items a recipe would use (cheapest first), or None."""
        left = dict(self.inv)
        plan = {}
        for tok, q in sorted(RECIPES[dish][0], key=lambda iq: iq[0].startswith('any:')):
            if tok.startswith('any:'):
                kind = tok[4:]
                pool = sorted((i for i in left if left[i] > 0 and (
                    i in FRUITS if kind == 'fruit' else ITEMS.get(i, (0, 0, ''))[2] == kind)),
                    key=lambda i: ITEMS[i][0])
            else:
                pool = [tok] if left.get(tok, 0) > 0 else []
            for i in pool:
                use = min(q, left[i])
                left[i] -= use
                plan[i] = plan.get(i, 0) + use
                q -= use
                if not q:
                    break
            if q:
                return None
        return plan

    def cook(self):
        while True:
            dishes = list(RECIPES)
            opts = []
            for d in dishes:
                ut = RECIPES[d][1]
                ok = (not ut or ut in self.inv) and self.ingredient_plan(d) is not None
                opts.append(f"{'*' if ok else ' '} {d}")

            def info(s):
                d = dishes[s]
                _, ut, st, sell = RECIPES[d]
                lines = ['  ' + self.recipe_line(d)[17:], f"  +{st} stamina, sells {sell}G"]
                if ut and ut not in self.inv:
                    lines.append(f"  Needs a {ut} (Supermarket)")
                plan = self.ingredient_plan(d)
                if plan:
                    lines.append('  Uses: ' + ', '.join(f"{q} {i}" for i, q in plan.items()))
                return lines
            sel = self.menu('Kitchen   (* = can cook)', opts, info=info)
            if sel is None:
                return
            d = dishes[sel]
            ut = RECIPES[d][1]
            plan = self.ingredient_plan(d)
            if ut and ut not in self.inv:
                self.say(f"You need a {ut} to make {d}.", None)
            elif plan is None:
                self.say(f"You don't have the ingredients for {d}.", None)
            else:
                for i, q in plan.items():
                    self.take(i, q)
                self.give(d)
                self.msg(f"You cooked {d}!", '0A')


def main():
    global SECS_PER_10MIN
    args = sys.argv[1:]
    truecolor = '--256' not in args and os.environ.get('COLORTERM', '') != '' or '--truecolor' in args
    if '--256' in args:
        truecolor = False
    if '--clock' in args:
        try:
            SECS_PER_10MIN = max(0.5, float(args[args.index('--clock') + 1]))
        except (IndexError, ValueError):
            pass
    if not sys.stdin.isatty():
        print("hrvstmn needs an interactive terminal.")
        return
    scr = Screen(truecolor)
    try:
        Game(scr).run()
    finally:
        scr.close()


if __name__ == '__main__':
    main()
