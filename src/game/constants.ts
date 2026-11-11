// Auto-generated exact constants from hrvstmn.py

export const PALETTE: Record<string, string> = {
  "00": "000000",
  "01": "404040",
  "02": "606060",
  "03": "808080",
  "04": "c0c0c0",
  "05": "d0d0d0",
  "06": "e0e0e0",
  "07": "ffffff",
  "08": "ff0000",
  "09": "ff9900",
  "0A": "ff0099",
  "0B": "33ff00",
  "0C": "00ffff",
  "0D": "0066ff",
  "0E": "cc00ff",
  "0F": "3300ff"
};

export const SECS_PER_10MIN = 6.0;
export const SAVE_KEY = "hrvstmn-save";

export const SEASONS = ["Spring", "Summer", "Fall", "Winter"] as const;
export type Season = typeof SEASONS[number];

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const SEASON_COL: Record<string, string> = {
  "Spring": "0A",
  "Summer": "0B",
  "Fall": "09",
  "Winter": "0C"
};

export const WEATHER_COL: Record<string, string> = {
  "Sunny": "09",
  "Rain": "0D",
  "Snow": "07"
};

export type CropDef = [season: string, seedPrice: number, daysToGrow: number, regrowDays: number, sellPrice: number, glyph: string, color: string];
export const CROPS: Record<string, any> = {
  "Turnip": [
    "Spring",
    120,
    4,
    0,
    60,
    "o",
    "07"
  ],
  "Potato": [
    "Spring",
    150,
    7,
    0,
    80,
    "o",
    "09"
  ],
  "Cucumber": [
    "Spring",
    200,
    9,
    5,
    60,
    "j",
    "0B"
  ],
  "Strawberry": [
    "Spring",
    150,
    8,
    2,
    30,
    "*",
    "08"
  ],
  "Cabbage": [
    "Spring",
    500,
    14,
    0,
    250,
    "Q",
    "0B"
  ],
  "Tomato": [
    "Summer",
    200,
    9,
    3,
    60,
    "*",
    "08"
  ],
  "Corn": [
    "Summer",
    300,
    14,
    3,
    100,
    "Y",
    "09"
  ],
  "Onion": [
    "Summer",
    150,
    7,
    0,
    80,
    "o",
    "0E"
  ],
  "Pumpkin": [
    "Summer",
    500,
    14,
    0,
    250,
    "O",
    "09"
  ],
  "Pineapple": [
    "Summer",
    1000,
    20,
    5,
    500,
    "A",
    "09"
  ],
  "Eggplant": [
    "Fall",
    120,
    9,
    3,
    80,
    "d",
    "0E"
  ],
  "Carrot": [
    "Fall",
    300,
    7,
    0,
    120,
    "v",
    "09"
  ],
  "Sweet Potato": [
    "Fall",
    300,
    5,
    2,
    120,
    "o",
    "0A"
  ],
  "Green Pepper": [
    "Fall",
    150,
    7,
    2,
    40,
    "j",
    "0B"
  ],
  "Spinach": [
    "Fall",
    200,
    5,
    0,
    80,
    "w",
    "0B"
  ]
};

export const FORAGE: Record<string, string[]> = {
  "Spring": [
    "Bamboo Shoot",
    "Medicinal Herb",
    "Moondrop Flower",
    "Toy Flower"
  ],
  "Summer": [
    "Red Grass",
    "Pink Cat Flower",
    "Wild Grape",
    "Medicinal Herb"
  ],
  "Fall": [
    "Mushroom",
    "Truffle",
    "Wild Grape",
    "Red Grass"
  ],
  "Winter": [
    "Blue Grass"
  ]
};

export const FORAGE_GLYPH: Record<string, any> = {
  "Bamboo Shoot": [
    "!",
    "0B"
  ],
  "Medicinal Herb": [
    "\"",
    "0B"
  ],
  "Moondrop Flower": [
    "*",
    "0C"
  ],
  "Toy Flower": [
    "*",
    "0A"
  ],
  "Red Grass": [
    "\"",
    "08"
  ],
  "Pink Cat Flower": [
    "*",
    "0E"
  ],
  "Wild Grape": [
    "%",
    "0E"
  ],
  "Mushroom": [
    "m",
    "09"
  ],
  "Truffle": [
    "m",
    "04"
  ],
  "Blue Grass": [
    "\"",
    "0D"
  ]
};

export type ItemDef = [sellPrice: number, stamina: number, category: string];
export const ITEMS: Record<string, any> = {
  "Turnip": [
    60,
    5,
    "crop"
  ],
  "Turnip Seeds": [
    0,
    0,
    "seed"
  ],
  "Potato": [
    80,
    6,
    "crop"
  ],
  "Potato Seeds": [
    0,
    0,
    "seed"
  ],
  "Cucumber": [
    60,
    5,
    "crop"
  ],
  "Cucumber Seeds": [
    0,
    0,
    "seed"
  ],
  "Strawberry": [
    30,
    4,
    "crop"
  ],
  "Strawberry Seeds": [
    0,
    0,
    "seed"
  ],
  "Cabbage": [
    250,
    13,
    "crop"
  ],
  "Cabbage Seeds": [
    0,
    0,
    "seed"
  ],
  "Tomato": [
    60,
    5,
    "crop"
  ],
  "Tomato Seeds": [
    0,
    0,
    "seed"
  ],
  "Corn": [
    100,
    7,
    "crop"
  ],
  "Corn Seeds": [
    0,
    0,
    "seed"
  ],
  "Onion": [
    80,
    6,
    "crop"
  ],
  "Onion Seeds": [
    0,
    0,
    "seed"
  ],
  "Pumpkin": [
    250,
    13,
    "crop"
  ],
  "Pumpkin Seeds": [
    0,
    0,
    "seed"
  ],
  "Pineapple": [
    500,
    23,
    "crop"
  ],
  "Pineapple Seeds": [
    0,
    0,
    "seed"
  ],
  "Eggplant": [
    80,
    6,
    "crop"
  ],
  "Eggplant Seeds": [
    0,
    0,
    "seed"
  ],
  "Carrot": [
    120,
    7,
    "crop"
  ],
  "Carrot Seeds": [
    0,
    0,
    "seed"
  ],
  "Sweet Potato": [
    120,
    7,
    "crop"
  ],
  "Sweet Potato Seeds": [
    0,
    0,
    "seed"
  ],
  "Green Pepper": [
    40,
    4,
    "crop"
  ],
  "Green Pepper Seeds": [
    0,
    0,
    "seed"
  ],
  "Spinach": [
    80,
    6,
    "crop"
  ],
  "Spinach Seeds": [
    0,
    0,
    "seed"
  ],
  "Bamboo Shoot": [
    50,
    4,
    "forage"
  ],
  "Medicinal Herb": [
    10,
    8,
    "forage"
  ],
  "Moondrop Flower": [
    60,
    0,
    "forage"
  ],
  "Toy Flower": [
    80,
    0,
    "forage"
  ],
  "Red Grass": [
    110,
    6,
    "forage"
  ],
  "Pink Cat Flower": [
    70,
    0,
    "forage"
  ],
  "Wild Grape": [
    50,
    4,
    "forage"
  ],
  "Mushroom": [
    70,
    5,
    "forage"
  ],
  "Truffle": [
    200,
    6,
    "forage"
  ],
  "Blue Grass": [
    100,
    6,
    "forage"
  ],
  "Small Fish": [
    50,
    5,
    "fish"
  ],
  "Medium Fish": [
    120,
    8,
    "fish"
  ],
  "Large Fish": [
    200,
    12,
    "fish"
  ],
  "Egg": [
    50,
    6,
    "animal"
  ],
  "Copper": [
    15,
    0,
    "ore"
  ],
  "Silver": [
    20,
    0,
    "ore"
  ],
  "Gold": [
    25,
    0,
    "ore"
  ],
  "Mystrile": [
    40,
    0,
    "ore"
  ],
  "Amethyst": [
    60,
    0,
    "ore"
  ],
  "Diamond": [
    100,
    0,
    "ore"
  ],
  "Lumber": [
    0,
    0,
    "material"
  ],
  "Chicken Feed": [
    0,
    0,
    "material"
  ],
  "Blue Feather": [
    0,
    0,
    "special"
  ],
  "Bread": [
    0,
    20,
    "food"
  ],
  "Milk": [
    0,
    15,
    "food"
  ],
  "Bodigizer": [
    0,
    100,
    "food"
  ],
  "Fodder": [
    0,
    0,
    "material"
  ],
  "Milker": [
    0,
    0,
    "tool"
  ],
  "Clippers": [
    0,
    0,
    "tool"
  ],
  "Brush": [
    0,
    0,
    "tool"
  ],
  "Small Milk": [
    100,
    10,
    "animal"
  ],
  "Medium Milk": [
    150,
    15,
    "animal"
  ],
  "Large Milk": [
    200,
    20,
    "animal"
  ],
  "Wool": [
    100,
    0,
    "animal"
  ],
  "Large Wool": [
    200,
    0,
    "animal"
  ],
  "Cake": [
    0,
    30,
    "food"
  ],
  "Salad": [
    150,
    20,
    "dish"
  ],
  "Pickled Turnip": [
    160,
    15,
    "dish"
  ],
  "Fried Potatoes": [
    200,
    25,
    "dish"
  ],
  "Popcorn": [
    160,
    20,
    "dish"
  ],
  "Strawberry Jam": [
    150,
    15,
    "dish"
  ],
  "Boiled Egg": [
    80,
    15,
    "dish"
  ],
  "Omelet": [
    200,
    35,
    "dish"
  ],
  "Hot Milk": [
    120,
    25,
    "dish"
  ],
  "Herb Tea": [
    60,
    30,
    "dish"
  ],
  "Stew": [
    300,
    45,
    "dish"
  ],
  "Grilled Fish": [
    200,
    30,
    "dish"
  ],
  "Sashimi": [
    180,
    25,
    "dish"
  ],
  "Sushi": [
    350,
    40,
    "dish"
  ],
  "Mushroom Rice": [
    300,
    40,
    "dish"
  ],
  "Curry Rice": [
    400,
    60,
    "dish"
  ],
  "Pumpkin Pudding": [
    600,
    60,
    "dish"
  ],
  "Fruit Juice": [
    150,
    20,
    "dish"
  ],
  "Vegetable Juice": [
    100,
    15,
    "dish"
  ],
  "Knife": [
    0,
    0,
    "utensil"
  ],
  "Frying Pan": [
    0,
    0,
    "utensil"
  ],
  "Pot": [
    0,
    0,
    "utensil"
  ],
  "Mixer": [
    0,
    0,
    "utensil"
  ],
  "Rice": [
    0,
    5,
    "ingredient"
  ]
};

export const BARN_CAP = 8;
export const WOOL_DAYS = 7;
export const ANIMALS: Record<string, any> = {
  "cow": [
    "Cow",
    5000
  ],
  "sheep": [
    "Sheep",
    4000
  ]
};

export const COW_NAMES = ["Bessie", "Daisy", "Clover", "Buttercup", "Moo", "Mocha", "Dotty", "Penny"];
export const SHEEP_NAMES = ["Fluffy", "Cotton", "Woolly", "Snowball", "Puff", "Lamby", "Cloud", "Tuft"];

export const TOOLS = ["Sickle", "Hoe", "Hammer", "Axe", "Watering Can", "Fishing Rod"];
export const UPGRADABLE = ["Sickle", "Hoe", "Hammer", "Axe", "Watering Can", "Fishing Rod"];
export const LEVELS = ["Basic", "Copper", "Silver", "Gold", "Mystrile", "Cursed", "Blessed", "Mythic"];
export const LEVEL_COL = ["04", "09", "05", "0A", "0C", "0E", "07", "0B"];
export const UPGRADE: Record<number, [number, string]> = {
  1: [1000, "Copper"],
  2: [2000, "Silver"],
  3: [3000, "Gold"],
  4: [5000, "Mystrile"],
  7: [50000, "Mythic Stone"]
};

export const CAN_CAP = [30, 55, 85, 130, 200, 250, 250, 500];
export const AREA: [number, number][] = [[1, 0], [3, 0], [2, 1], [3, 1], [5, 1], [6, 3], [6, 3], [9, 5]];


export const OBJ_GLYPH: Record<string, any> = {
  "weed": [
    "w",
    "0B"
  ],
  "stone": [
    "*",
    "04"
  ],
  "branch": [
    "/",
    "09"
  ],
  "dig": [
    "§",
    "0A"
  ],
  "starrock": [
    "*",
    "0A"
  ],
  "stump": [
    "0",
    "09"
  ],
  "boulder": [
    "O",
    "04"
  ],
  "rock": [
    "o",
    "03"
  ]
};

export const HOURS: Record<string, any> = {
  "supermarket": [
    9,
    17,
    [
      6
    ]
  ],
  "poultry": [
    11,
    16,
    [
      6
    ]
  ],
  "blacksmith": [
    10,
    16,
    [
      3
    ]
  ],
  "inn": [
    8,
    22,
    []
  ],
  "clinic": [
    9,
    16,
    [
      2
    ]
  ],
  "library": [
    10,
    16,
    [
      0
    ]
  ],
  "museum": [
    9,
    17,
    []
  ],
  "church": [
    6,
    20,
    []
  ],
  "mayor": [
    8,
    20,
    []
  ],
  "yodel": [
    10,
    15,
    []
  ],
  "carpenter": [
    10,
    16,
    [
      2
    ]
  ]
};

export const BUILDINGS: Record<string, string> = {
  "supermarket": "Supermarket",
  "poultry": "Lillia's Poultry Farm",
  "blacksmith": "Saibara's Blacksmith",
  "inn": "Doug's Inn",
  "clinic": "Clinic",
  "library": "Library",
  "church": "Church",
  "mayor": "Mayor Thomas' House",
  "yodel": "Yodel Ranch",
  "carpenter": "Gotz's Workshop",
  "museum": "Mineral Town Museum"
};

export interface NPCDef {
  g: string;
  col: string;
  home: string;
  out: [number, number] | null;
  where: [string, number, number] | null;
  rain: boolean;
  bach: boolean;
  loves: string[];
  likes: string[];
  hates: string[];
  lines: string[][];
}
export const NPCS: Record<string, any> = {
  "Mary": {
    "g": "M",
    "col": "0D",
    "home": "library",
    "out": [
      13,
      17
    ],
    "where": [
      "town",
      50,
      21
    ],
    "rain": false,
    "bach": true,
    "loves": [
      "Bamboo Shoot",
      "Moondrop Flower",
      "Mushroom Rice"
    ],
    "likes": [
      "Medicinal Herb",
      "Potato",
      "Wild Grape",
      "Mushroom",
      "Blue Grass",
      "Herb Tea"
    ],
    "hates": [
      "Small Fish",
      "Medium Fish",
      "Large Fish"
    ],
    "lines": [
      [
        "Oh... hello. I'm Mary. My father and I run the library.",
        "The mountain herbs are so interesting this time of year."
      ],
      [
        "I've been writing a novel. Please don't tell anyone!",
        "You can learn so much from books. And from farming, I suppose."
      ],
      [
        "When you visit, the words just seem to flow...",
        "I hope you'll come to the library again soon. I'll be waiting."
      ]
    ]
  },
  "Karen": {
    "g": "K",
    "col": "0E",
    "home": "supermarket",
    "out": [
      17,
      22
    ],
    "where": [
      "town",
      33,
      17
    ],
    "rain": false,
    "bach": true,
    "loves": [
      "Bamboo Shoot",
      "Wild Grape",
      "Sashimi"
    ],
    "likes": [
      "Corn",
      "Tomato",
      "Large Fish",
      "Red Grass",
      "Popcorn",
      "Fried Potatoes"
    ],
    "hates": [
      "Toy Flower",
      "Pink Cat Flower"
    ],
    "lines": [
      [
        "Hmph, the new farmer, huh? I'm Karen. My parents run the Supermarket.",
        "This town is so boring. Nothing ever happens here."
      ],
      [
        "You're working pretty hard on that farm. Not bad.",
        "Rose Square is nice at night. ...Not that I'm inviting you."
      ],
      [
        "I used to want to leave this town. Now I'm not so sure. Funny, huh?",
        "Don't look at me like that! ...Okay, you can look."
      ]
    ]
  },
  "Popuri": {
    "g": "P",
    "col": "0A",
    "home": "poultry",
    "out": [
      11,
      16
    ],
    "where": [
      "woods",
      44,
      8
    ],
    "rain": false,
    "bach": true,
    "loves": [
      "Strawberry",
      "Pink Cat Flower",
      "Strawberry Jam"
    ],
    "likes": [
      "Egg",
      "Toy Flower",
      "Moondrop Flower",
      "Turnip",
      "Fruit Juice",
      "Omelet"
    ],
    "hates": [
      "Copper",
      "Silver",
      "Gold",
      "Mystrile"
    ],
    "lines": [
      [
        "Hi hi! I'm Popuri! We raise chickens at the Poultry Farm!",
        "My brother Rick is soooo overprotective."
      ],
      [
        "Your farm is getting so cute! Do you have chickens yet? You should!",
        "I picked flowers on the mountain today. Wanna see?"
      ],
      [
        "Ehehe... being with you makes me all fluttery!",
        "Let's go on an adventure someday, okay? Just us!"
      ]
    ]
  },
  "Elli": {
    "g": "E",
    "col": "07",
    "home": "clinic",
    "out": [
      16,
      19
    ],
    "where": [
      "town",
      32,
      11
    ],
    "rain": false,
    "bach": true,
    "loves": [
      "Moondrop Flower",
      "Toy Flower",
      "Pumpkin Pudding"
    ],
    "likes": [
      "Egg",
      "Strawberry",
      "Medicinal Herb",
      "Cabbage",
      "Herb Tea",
      "Hot Milk"
    ],
    "hates": [
      "Mushroom",
      "Truffle"
    ],
    "lines": [
      [
        "Hello, I'm Elli, the nurse at the Clinic. Don't overwork yourself!",
        "If you feel tired, eat something. Your body will thank you."
      ],
      [
        "You look healthy today. Are you eating your vegetables?",
        "My little brother Stu is a handful, but I love him."
      ],
      [
        "I worry about you, you know. Please take care of yourself... for me.",
        "Seeing you smile is the best medicine."
      ]
    ]
  },
  "Ann": {
    "g": "A",
    "col": "09",
    "home": "inn",
    "out": [
      14,
      17
    ],
    "where": [
      "town",
      23,
      21
    ],
    "rain": false,
    "bach": true,
    "loves": [
      "Sweet Potato",
      "Large Fish",
      "Curry Rice"
    ],
    "likes": [
      "Potato",
      "Onion",
      "Carrot",
      "Pumpkin",
      "Egg",
      "Medium Fish",
      "Stew",
      "Fried Potatoes"
    ],
    "hates": [
      "Truffle"
    ],
    "lines": [
      [
        "Hi! I'm Ann! My dad Doug runs the Inn. Come eat with us!",
        "I'm terrible at cooking but great at fixing things!"
      ],
      [
        "Dad says I should act more like a lady. As if!",
        "Your crops would make a great stew. Hint hint!"
      ],
      [
        "You're the only one who doesn't mind when I'm covered in grease.",
        "Hey... come by the Inn tonight? I'll save you a seat."
      ]
    ]
  },
  "Thomas": {
    "g": "T",
    "col": "08",
    "home": "mayor",
    "out": [
      9,
      15
    ],
    "where": [
      "town",
      38,
      17
    ],
    "rain": true,
    "bach": false,
    "loves": [
      "Large Fish",
      "Truffle",
      "Sushi"
    ],
    "likes": [
      "Turnip",
      "Egg",
      "Potato",
      "Stew"
    ],
    "hates": [],
    "lines": [
      [
        "Ho ho! Welcome to Mineral Town! I'm Mayor Thomas.",
        "If you need anything, just ask! Hm hm!"
      ],
      [
        "Your farm is coming along nicely! Your grandfather would be proud.",
        "Rose Square is the heart of our little town!"
      ],
      [
        "Mineral Town is lucky to have you, my friend! Ho ho!"
      ]
    ]
  },
  "Gray": {
    "g": "G",
    "col": "04",
    "home": "blacksmith",
    "out": [
      17,
      19
    ],
    "where": [
      "grove",
      18,
      18
    ],
    "rain": false,
    "bach": false,
    "loves": [
      "Gold",
      "Mystrile"
    ],
    "likes": [
      "Copper",
      "Silver",
      "Amethyst",
      "Grilled Fish",
      "Curry Rice"
    ],
    "hates": [
      "Toy Flower",
      "Pink Cat Flower"
    ],
    "lines": [
      [
        "...I'm Gray. Apprentice at the blacksmith. Got a problem?",
        "Gramps works me to the bone."
      ],
      [
        "Bring ore if you want your tools upgraded. Good ore.",
        "...Your tools are holding up. Not bad."
      ],
      [
        "...Thanks for always stopping by. I mean it."
      ]
    ]
  },
  "Cliff": {
    "g": "C",
    "col": "0C",
    "home": "inn",
    "out": [
      9,
      17
    ],
    "where": [
      "mountain",
      27,
      9
    ],
    "rain": false,
    "bach": false,
    "loves": [
      "Medium Fish",
      "Large Fish"
    ],
    "likes": [
      "Bamboo Shoot",
      "Wild Grape",
      "Stew",
      "Omelet",
      "Grilled Fish"
    ],
    "hates": [
      "Truffle"
    ],
    "lines": [
      [
        "Oh... hi. I'm Cliff. I'm just passing through. I think.",
        "The lake is calm today."
      ],
      [
        "Mineral Town feels like it could be home. Maybe.",
        "I've been looking for work. Doesn't seem to be much around."
      ],
      [
        "Thanks for talking to me. It means more than you know."
      ]
    ]
  },
  "Rick": {
    "g": "R",
    "col": "0F",
    "home": "poultry",
    "out": [
      9,
      13
    ],
    "where": [
      "town",
      57,
      9
    ],
    "rain": false,
    "bach": false,
    "loves": [
      "Egg"
    ],
    "likes": [
      "Turnip",
      "Corn",
      "Large Fish",
      "Omelet",
      "Boiled Egg"
    ],
    "hates": [
      "Moondrop Flower"
    ],
    "lines": [
      [
        "I'm Rick. I look after the chickens. And stay away from my sister.",
        "Chickens are smarter than people think."
      ],
      [
        "Hey, you're alright. For a farmer.",
        "Fill their feed boxes every day and they'll lay every day."
      ],
      [
        "Popuri talks about you a lot. ...I suppose that's okay."
      ]
    ]
  },
  "May": {
    "g": "Y",
    "col": "0B",
    "home": "yodel",
    "out": [
      10,
      16
    ],
    "where": [
      "woods",
      57,
      8
    ],
    "rain": false,
    "bach": false,
    "loves": [
      "Strawberry",
      "Toy Flower",
      "Fruit Juice"
    ],
    "likes": [
      "Egg",
      "Turnip",
      "Sweet Potato",
      "Strawberry Jam",
      "Hot Milk"
    ],
    "hates": [
      "Mushroom"
    ],
    "lines": [
      [
        "I'm May! I live at Yodel Ranch with Grandpa Barley!",
        "Do you like cows? I like cows."
      ],
      [
        "Grandpa says you work really hard!",
        "Can I visit your farm sometime?"
      ],
      [
        "You're my best friend in the whole world!"
      ]
    ]
  },
  "Jeff": {
    "g": "J",
    "col": "05",
    "home": "supermarket",
    "out": null,
    "where": null,
    "rain": false,
    "bach": false,
    "loves": [
      "Moondrop Flower"
    ],
    "likes": [
      "Turnip",
      "Potato"
    ],
    "hates": [],
    "lines": [
      [
        "W-welcome to the Supermarket. Please, take your time.",
        "My wife Sasha handles... most things."
      ],
      [
        "Seeds sell well this time of year. I think."
      ],
      [
        "You're one of our best customers. Thank you, really."
      ]
    ]
  },
  "Saibara": {
    "g": "S",
    "col": "06",
    "home": "blacksmith",
    "out": null,
    "where": null,
    "rain": false,
    "bach": false,
    "loves": [
      "Mystrile",
      "Diamond"
    ],
    "likes": [
      "Gold",
      "Silver"
    ],
    "hates": [],
    "lines": [
      [
        "Hmph. I'm Saibara. Bring me ore and gold and I'll make your tools sing.",
        "Copper, Silver, Gold, Mystrile. That is the path of the craftsman."
      ],
      [
        "You treat your tools well. Good."
      ],
      [
        "You remind me of myself when I was young. Hmph."
      ]
    ]
  },
  "Doug": {
    "g": "D",
    "col": "09",
    "home": "inn",
    "out": null,
    "where": null,
    "rain": false,
    "bach": false,
    "loves": [
      "Large Fish"
    ],
    "likes": [
      "Onion",
      "Potato",
      "Cabbage",
      "Curry Rice",
      "Sushi"
    ],
    "hates": [],
    "lines": [
      [
        "Welcome to Doug's Inn! Hungry? Lunch is always on.",
        "Ann's a good kid. Wish she'd wear a dress once in a while."
      ],
      [
        "You look like you need a hot meal."
      ],
      [
        "You're always welcome here, friend!"
      ]
    ]
  },
  "Doctor": {
    "g": "T",
    "col": "04",
    "home": "clinic",
    "out": null,
    "where": null,
    "rain": false,
    "bach": false,
    "loves": [
      "Medicinal Herb",
      "Blue Grass"
    ],
    "likes": [
      "Herb Tea",
      "Salad"
    ],
    "hates": [],
    "lines": [
      [
        "I'm the town doctor. Hmm. You should get more sleep.",
        "A Bodigizer will restore your strength in a pinch."
      ],
      [
        "Your health is improving. Keep it up."
      ],
      [
        "...You're one of my more sensible patients."
      ]
    ]
  },
  "Lillia": {
    "g": "L",
    "col": "0A",
    "home": "poultry",
    "out": null,
    "where": null,
    "rain": false,
    "bach": false,
    "loves": [
      "Moondrop Flower",
      "Toy Flower"
    ],
    "likes": [
      "Egg"
    ],
    "hates": [],
    "lines": [
      [
        "I'm Lillia. Welcome to our Poultry Farm. Chickens are 1500G.",
        "Keep their feed boxes full and they'll give you an egg every day."
      ],
      [
        "My children are a blessing. And so are chickens!"
      ],
      [
        "Thank you for looking after Popuri and Rick."
      ]
    ]
  },
  "Barley": {
    "g": "B",
    "col": "05",
    "home": "yodel",
    "out": null,
    "where": null,
    "rain": false,
    "bach": false,
    "loves": [
      "Large Fish"
    ],
    "likes": [
      "Egg",
      "Corn"
    ],
    "hates": [],
    "lines": [
      [
        "Welcome to Yodel Ranch. I'm Barley. We sell fresh milk.",
        "May is all I have left. She keeps me young."
      ],
      [
        "Cows need love, just like people."
      ],
      [
        "You've been a good friend to May. Thank you."
      ]
    ]
  },
  "Carter": {
    "g": "C",
    "col": "07",
    "home": "church",
    "out": null,
    "where": null,
    "rain": false,
    "bach": false,
    "loves": [
      "Moondrop Flower"
    ],
    "likes": [
      "Wild Grape"
    ],
    "hates": [],
    "lines": [
      [
        "Welcome to the church. I'm Pastor Carter. May the Goddess bless you.",
        "Confession is good for the soul."
      ],
      [
        "The Harvest Goddess smiles on hard workers."
      ],
      [
        "You have a kind heart. I can tell."
      ]
    ]
  },
  "Basil": {
    "g": "B",
    "col": "0B",
    "home": "library",
    "out": null,
    "where": null,
    "rain": false,
    "bach": false,
    "loves": [
      "Truffle",
      "Mushroom"
    ],
    "likes": [
      "Medicinal Herb",
      "Red Grass",
      "Blue Grass"
    ],
    "hates": [],
    "lines": [
      [
        "I'm Basil, a botanist. Mary is my daughter.",
        "The mountains are full of rare plants. Have you looked?"
      ],
      [
        "Each season brings new wild herbs. Fascinating!"
      ],
      [
        "You have the eyes of a true naturalist."
      ]
    ]
  },
  "Gotz": {
    "g": "G",
    "col": "09",
    "home": "carpenter",
    "out": null,
    "where": null,
    "rain": false,
    "bach": false,
    "loves": [
      "Curry Rice"
    ],
    "likes": [
      "Stew",
      "Grilled Fish",
      "Wild Grape",
      "Hot Milk"
    ],
    "hates": [
      "Toy Flower"
    ],
    "lines": [
      [
        "I'm Gotz. Carpenter. Bring lumber and gold and I'll build what you need.",
        "A good house starts with good lumber. Chop branches and stumps."
      ],
      [
        "That farmhouse of yours could use some work. Just saying."
      ],
      [
        "You're a hard worker. I respect that."
      ]
    ]
  }
};

export const SPOUSE_LINES = [
  "Welcome home! Don't work too hard today, okay?",
  "I'm so happy we live here together.",
  "The farm looks wonderful. You're amazing.",
  "Dinner will be ready when you get back!"
];

export interface FestivalDef { season: number; day: number; name: string; start: number; end: number; kind: string; }
export const FESTIVAL_LIST: FestivalDef[] = [
  {
    "season": 0,
    "day": 1,
    "name": "New Year's Day",
    "start": 9,
    "end": 17,
    "kind": "newyear"
  },
  {
    "season": 0,
    "day": 8,
    "name": "Goddess Festival",
    "start": 10,
    "end": 18,
    "kind": "goddess"
  },
  {
    "season": 0,
    "day": 18,
    "name": "Flower Festival",
    "start": 10,
    "end": 18,
    "kind": "dance"
  },
  {
    "season": 0,
    "day": 22,
    "name": "Chicken Sumo",
    "start": 10,
    "end": 16,
    "kind": "sumo"
  },
  {
    "season": 1,
    "day": 8,
    "name": "Egg Hunt",
    "start": 10,
    "end": 16,
    "kind": "egghunt"
  },
  {
    "season": 1,
    "day": 20,
    "name": "Crop Festival",
    "start": 10,
    "end": 18,
    "kind": "crops"
  },
  {
    "season": 1,
    "day": 24,
    "name": "Fireworks Festival",
    "start": 18,
    "end": 22,
    "kind": "fireworks"
  },
  {
    "season": 2,
    "day": 13,
    "name": "Harvest Festival",
    "start": 10,
    "end": 18,
    "kind": "harvest"
  },
  {
    "season": 2,
    "day": 20,
    "name": "Moon Viewing",
    "start": 18,
    "end": 22,
    "kind": "moon"
  },
  {
    "season": 3,
    "day": 14,
    "name": "Thanksgiving",
    "start": 10,
    "end": 18,
    "kind": "thanks"
  },
  {
    "season": 3,
    "day": 24,
    "name": "Starry Night",
    "start": 18,
    "end": 22,
    "kind": "starry"
  },
  {
    "season": 3,
    "day": 30,
    "name": "New Year's Eve",
    "start": 18,
    "end": 23,
    "kind": "nye"
  }
];
export const FESTIVALS: Record<string, [string, number, number, string]> = {
  "0,1": ["New Year's Day", 9, 17, "newyear"],
  "0,8": ["Goddess Festival", 10, 18, "goddess"],
  "0,18": ["Flower Festival", 10, 18, "dance"],
  "0,22": ["Chicken Sumo", 10, 16, "sumo"],
  "1,8": ["Egg Hunt", 10, 16, "egghunt"],
  "1,20": ["Crop Festival", 10, 18, "crops"],
  "1,24": ["Fireworks Festival", 18, 22, "fireworks"],
  "2,13": ["Harvest Festival", 10, 18, "harvest"],
  "2,20": ["Moon Viewing", 18, 22, "moon"],
  "3,14": ["Thanksgiving", 10, 18, "thanks"],
  "3,24": ["Starry Night", 18, 22, "starry"],
  "3,30": ["New Year's Eve", 18, 23, "nye"]
};

export const BIRTHDAYS: Record<string, [number, number]> = {
  "Mary": [
    3,
    20
  ],
  "Karen": [
    2,
    15
  ],
  "Popuri": [
    1,
    3
  ],
  "Elli": [
    0,
    16
  ],
  "Ann": [
    1,
    17
  ],
  "Thomas": [
    1,
    25
  ],
  "Gray": [
    3,
    6
  ],
  "Cliff": [
    1,
    6
  ],
  "Rick": [
    2,
    27
  ],
  "May": [
    3,
    26
  ],
  "Jeff": [
    3,
    29
  ],
  "Saibara": [
    1,
    21
  ],
  "Doug": [
    1,
    12
  ],
  "Doctor": [
    2,
    19
  ],
  "Lillia": [
    0,
    19
  ],
  "Barley": [
    1,
    26
  ],
  "Carter": [
    2,
    6
  ],
  "Basil": [
    1,
    11
  ]
};

export const FEST_SPOTS: [number, number][] = [[31, 11], [33, 10], [36, 10], [39, 11], [41, 12], [41, 14], [39, 16], [36, 16], [33, 16], [31, 14], [32, 12], [40, 13]];

export type TileDef = [glyph: string, fg: string, bg: string, walkable: boolean];
export const TILES: Record<string, any> = {
  "void": [
    " ",
    "00",
    "00",
    false
  ],
  "grass": [
    " ",
    "0B",
    "00",
    true
  ],
  "field": [
    ".",
    "02",
    "00",
    true
  ],
  "path": [
    ".",
    "03",
    "01",
    true
  ],
  "tree": [
    "T",
    "0B",
    "00",
    false
  ],
  "water": [
    "~",
    "0D",
    "00",
    false
  ],
  "fountain": [
    "~",
    "0C",
    "00",
    false
  ],
  "wall": [
    "#",
    "02",
    "01",
    false
  ],
  "roof": [
    "^",
    "08",
    "00",
    false
  ],
  "door": [
    "+",
    "09",
    "01",
    false
  ],
  "bin": [
    "$",
    "09",
    "01",
    false
  ],
  "flower": [
    "*",
    "0A",
    "00",
    false
  ],
  "bridge": [
    "=",
    "09",
    "00",
    true
  ],
  "cliff": [
    "^",
    "03",
    "00",
    false
  ],
  "cave": [
    "O",
    "07",
    "01",
    false
  ],
  "sign": [
    "?",
    "09",
    "01",
    false
  ],
  "floor": [
    ".",
    "02",
    "00",
    true
  ],
  "iwall": [
    "#",
    "03",
    "01",
    false
  ],
  "bed": [
    "=",
    "0D",
    "01",
    false
  ],
  "tv": [
    "T",
    "0C",
    "01",
    false
  ],
  "cal": [
    "%",
    "07",
    "01",
    false
  ],
  "table": [
    "n",
    "09",
    "00",
    false
  ],
  "mwall": [
    "#",
    "02",
    "01",
    false
  ],
  "mfloor": [
    ".",
    "01",
    "00",
    true
  ],
  "up": [
    "<",
    "0C",
    "00",
    true
  ],
  "down": [
    ">",
    "0C",
    "00",
    true
  ],
  "counter": [
    "=",
    "09",
    "01",
    false
  ],
  "furn": [
    "?",
    "04",
    "00",
    false
  ],
  "bookcase": [
    "|",
    "0E",
    "00",
    false
  ],
  "exit": [
    "+",
    "09",
    "01",
    true
  ],
  "kitchen": [
    "&",
    "09",
    "01",
    false
  ],
  "shelf": [
    "H",
    "09",
    "01",
    false
  ],
  "bath": [
    "U",
    "0C",
    "01",
    false
  ]
};

export const INTERIOR_LAYOUTS: Record<string, string[]> = {
  "supermarket": [
    "###################",
    "#HHH#....k....#HHH#",
    "#...#=========#...#",
    "#.................#",
    "#.HH..HH...HH..HH.#",
    "#.HH..HH...HH..HH.#",
    "#.................#",
    "#p......1........p#",
    "#########D#########"
  ],
  "blacksmith": [
    "#################",
    "#FF#....k....#oo#",
    "#FF#=========#..#",
    "#...............#",
    "#.A.....1.....o.#",
    "#...............#",
    "########D########"
  ],
  "inn": [
    "#####################",
    "#S..#.....k.....#b.b#",
    "#...#===========#...#",
    "#...................#",
    "#.ctc...ctc...ctc...#",
    "#...........1.......#",
    "#..2.........3......#",
    "#o.................o#",
    "##########D##########"
  ],
  "clinic": [
    "#################",
    "#M.b.b#..k..#MMM#",
    "#.....#=====#...#",
    "#...............#",
    "#.cc........1...#",
    "#p.............p#",
    "########D########"
  ],
  "library": [
    "###################",
    "#BBBBBB#.k.#BBBBBB#",
    "#......#===#......#",
    "#.................#",
    "#.BB.BB..1..BB.BB.#",
    "#.................#",
    "#.ctc.........ctc.#",
    "#p...............p#",
    "#########D#########"
  ],
  "museum": [
    "###################",
    "#HHH#....k....#HHH#",
    "#...#=====...#....#",
    "#.................#",
    "#.BB..BB...BB..BB.#",
    "#.................#",
    "#.ctc.........ctc.#",
    "#p...............p#",
    "#########D#########"
  ],
  "church": [
    "#################",
    "#p....#.k.#....p#",
    "#.....#===#.....#",
    "#...............#",
    "#.PPPP.....PPPP.#",
    "#...............#",
    "#.PPPP.....PPPP.#",
    "#.......1.......#",
    "########D########"
  ],
  "mayor": [
    "###############",
    "#Hb#..k..#..p.#",
    "#..#=====#....#",
    "#.............#",
    "#.ctc.....1...#",
    "#.............#",
    "#######D#######"
  ],
  "poultry": [
    "###################",
    "#yy#....k....#CCCC#",
    "#yy#=========#....#",
    "#.................#",
    "#.CC..CC.....1....#",
    "#.............2...#",
    "#o...............o#",
    "#########D#########"
  ],
  "yodel": [
    "###################",
    "#yy#....k....#ooo.#",
    "#yy#=========#....#",
    "#.................#",
    "#.ctc.....1.......#",
    "#...............p.#",
    "#########D#########"
  ]
};

export const INTERIOR_LEGEND: Record<string, [string, string | null, string | null]> = {
  "H": [
    "furn",
    "H",
    "09"
  ],
  "P": [
    "furn",
    "=",
    "02"
  ],
  "F": [
    "furn",
    "&",
    "08"
  ],
  "A": [
    "furn",
    "T",
    "04"
  ],
  "b": [
    "furn",
    "=",
    "0D"
  ],
  "c": [
    "furn",
    "h",
    "03"
  ],
  "o": [
    "furn",
    "o",
    "09"
  ],
  "p": [
    "furn",
    "*",
    "0B"
  ],
  "S": [
    "furn",
    "^",
    "08"
  ],
  "M": [
    "furn",
    "+",
    "08"
  ],
  "C": [
    "furn",
    "c",
    "07"
  ],
  "y": [
    "furn",
    "\"",
    "09"
  ],
  "t": [
    "table",
    null,
    null
  ],
  "B": [
    "bookcase",
    null,
    null
  ],
  "=": [
    "counter",
    null,
    null
  ],
  "#": [
    "iwall",
    null,
    null
  ]
};

export const EXPANSIONS: Record<string, any> = {
  "Kitchen": [
    2000,
    50,
    null,
    "A kitchen counter for cooking."
  ],
  "Extension": [
    5000,
    150,
    "Kitchen",
    "A second room with a bookshelf."
  ],
  "Bathroom": [
    3000,
    80,
    "Extension",
    "A bath that restores stamina once a day."
  ],
  "Big Bed": [
    1500,
    40,
    null,
    "A sturdier bed: +20 max stamina."
  ],
  "Coop Expansion": [
    2500,
    100,
    null,
    "Room for 16 chickens instead of 8."
  ]
};

export const BUILD_DAYS = 3;
export const UTENSILS: Record<string, number> = {
  "Knife": 600,
  "Frying Pan": 800,
  "Pot": 800,
  "Mixer": 1000
};

export const FRUITS = new Set(["Pineapple", "Strawberry", "Tomato", "Wild Grape"]);

export const RECIPES: Record<string, any> = {
  "Salad": [
    [
      [
        "any:crop",
        2
      ]
    ],
    "Knife",
    20,
    150
  ],
  "Pickled Turnip": [
    [
      [
        "Turnip",
        2
      ]
    ],
    null,
    15,
    160
  ],
  "Fried Potatoes": [
    [
      [
        "Potato",
        2
      ]
    ],
    "Frying Pan",
    25,
    200
  ],
  "Popcorn": [
    [
      [
        "Corn",
        1
      ]
    ],
    "Frying Pan",
    20,
    160
  ],
  "Strawberry Jam": [
    [
      [
        "Strawberry",
        3
      ]
    ],
    "Pot",
    15,
    150
  ],
  "Boiled Egg": [
    [
      [
        "Egg",
        1
      ]
    ],
    "Pot",
    15,
    80
  ],
  "Omelet": [
    [
      [
        "Egg",
        1
      ],
      [
        "Milk",
        1
      ]
    ],
    "Frying Pan",
    35,
    200
  ],
  "Hot Milk": [
    [
      [
        "Milk",
        1
      ]
    ],
    "Pot",
    25,
    120
  ],
  "Herb Tea": [
    [
      [
        "Medicinal Herb",
        2
      ]
    ],
    "Pot",
    30,
    60
  ],
  "Stew": [
    [
      [
        "any:crop",
        2
      ],
      [
        "Milk",
        1
      ]
    ],
    "Pot",
    45,
    300
  ],
  "Grilled Fish": [
    [
      [
        "any:fish",
        1
      ]
    ],
    "Frying Pan",
    30,
    200
  ],
  "Sashimi": [
    [
      [
        "any:fish",
        1
      ]
    ],
    "Knife",
    25,
    180
  ],
  "Sushi": [
    [
      [
        "any:fish",
        1
      ],
      [
        "Rice",
        1
      ]
    ],
    "Knife",
    40,
    350
  ],
  "Mushroom Rice": [
    [
      [
        "Mushroom",
        1
      ],
      [
        "Rice",
        1
      ]
    ],
    "Pot",
    40,
    300
  ],
  "Curry Rice": [
    [
      [
        "Rice",
        1
      ],
      [
        "any:crop",
        2
      ],
      [
        "Red Grass",
        1
      ]
    ],
    "Pot",
    60,
    400
  ],
  "Pumpkin Pudding": [
    [
      [
        "Pumpkin",
        1
      ],
      [
        "Egg",
        1
      ],
      [
        "Milk",
        1
      ]
    ],
    "Pot",
    60,
    600
  ],
  "Fruit Juice": [
    [
      [
        "any:fruit",
        2
      ]
    ],
    "Mixer",
    20,
    150
  ],
  "Vegetable Juice": [
    [
      [
        "any:crop",
        1
      ]
    ],
    "Mixer",
    15,
    100
  ]
};

export const DIRS: Record<string, [number, number]> = {
  up: [0, -1], w: [0, -1], k: [0, -1],
  down: [0, 1], s: [0, 1], j: [0, 1],
  left: [-1, 0], a: [-1, 0], h: [-1, 0],
  right: [1, 0], d: [1, 0], l: [1, 0],
};

export const OK_KEYS = new Set(['enter', 'x', 'e', 'space', 'z']);
export const CANCEL_KEYS = new Set(['esc', 'q', 'backspace', 'ctrl-c']);
export const SPOUSE_POS: [number, number] = [11, 3];
export const HOUSE_WAKE: [number, number] = [1, 2];

export const LOGO = [
  String.raw` _   _ ____  __     __ ____ _____ __  __ _   _ `,
  String.raw`| | | |  _ \ \ \   / // ___|_   _|  \/  | \ | |`,
  String.raw`| |_| | |_) | \ \ / / \___ \ | | | |\/| |  \| |`,
  String.raw`|  _  |  _ <   \ V /   ___) || | | |  | | |\  |`,
  String.raw`|_| |_|_| \_\   \_/   |____/ |_| |_|  |_|_| \_|`,
];

export function pkey(x: number, y: number): string {
  return `${x},${y}`;
}

export function unkey(s: string): [number, number] {
  const [x, y] = s.split(',').map(Number);
  return [x, y];
}

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

export function fmt_time(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ampm = h < 12 ? 'AM' : 'PM';
  const displayH = h % 12 || 12;
  const displayM = m.toString().padStart(2, '0');
  const hPad = displayH < 10 ? ` ${displayH}` : `${displayH}`;
  return `${hPad}:${displayM}${ampm}`;
}

export function fmt_hour(h: number): string {
  h = h % 24;
  const displayH = h % 12 || 12;
  return `${displayH}${h < 12 ? 'AM' : 'PM'}`;
}

export const BOOKS: string[] = [
  "'Turnips for Beginners': Turnips grow in 4 days. Plant in 3x3 or U-shaped blocks so you can reach every crop!",
  "'Seed Unlocks': Ship 100 each of Turnip, Potato, and Cucumber to unlock Strawberry Seeds at the Supermarket (same for Pumpkin in Summer and Spinach in Fall).",
  "'The Craftsman's Path': Saibara upgrades all 6 tools from Copper to Mystrile—and even Mythic once all 6 Cursed Tools are Blessed!",
  "'Mysteries of the Two Mines': Spring Mine holds Copper, Silver, Gold, Mystrile, Orichalc, Adamantite, Goddess Jewels, and the Teleport Stone on F255. The Winter Lake Mine holds Gems, Kappa Jewels, and Cursed Tools on floors 29, 39, 49, 59, 69, and 79.",
  "'Blessing Cursed Tools': Carter at the Church Confession Booth can remove or bless Cursed Tools. Bless Hoe/Can 10x, equip Sickle/Hammer 10 days, or swing Rod/Axe 255 times!",
  "'The Seven Harvest Sprites': In a hut at Willow Bend, east of town, live Chef, Nappy, Hoggy, Timid, Aqua, Staid, and Bold. Befriend them to 3 hearts with Flour or Grass to hire them or play mini-games!",
  "'Of Livestock & Makers': Saibara builds Mayonnaise, Cheese, and Yarn Makers with Adamantite. Festival winners produce Golden, P-Type, and rare X-Type goods!",
  "'The Goddess & The Kappa': Throw offerings into the Goddess Pond on Mother's Hill for a Power Berry, and throw 10 Cucumbers into the Lake for Kappa's Blue Berry (no rain fatigue!).",
  "'TV & Saturday Shopping': Watch TV on Tuesday for cooking recipes and Saturday for TV Shopping—then order at Doug's Inn telephone!",
  "'Marriage & Family': See all 4 Heart Events, upgrade your house with a Big Bed, and present the Blue Feather at Red Heart!",
];

export const HELP: string[] = [
  "MOVE      arrows / WASD / hjkl",
  "USE TOOL  space or z (uses equipped tool or sows seeds)",
  "ACT       x / e / enter   talk, gift held item, harvest, forage,",
  "                          ship, enter doors, soak in Hot Spring",
  "TOOLS     tab / shift-tab cycle,  1-6 pick tool",
  "RUCKSACK  i   hold/eat/wrap items, equip Gems, blow Whistle",
  "SUMMARY   m   Ranch Summary, Memo, Sprites, Fish & Collectibles",
  "TODAY     y   daily checklist: crops, animals, shipping, events",
  "MINIMAP   n   toggle the corner map overlay",
  "VILLAGERS r   hearts, favourite gifts and usual whereabouts",
  "DIARY     esc Save/Load anywhere (2 slots), Teleport, Status",
  "",
  "Zack picks up shipments at 5:00 PM daily. Sleep in bed to advance day.",
  "Visit the Hot Spring on Mother's Hill or your Bathroom to recover.",
  "Befriend the 7 Harvest Sprites at Willow Bend to automate chores!",
];

// --- EXPANDED HARVEST MOON: FRIENDS OF MINERAL TOWN DATA ---

Object.assign(WEATHER_COL, {
  "Typhoon": "08",
  "Blizzard": "0C",
});

// Additional Crops & Flowers (Grass, Moondrop, Toy Flower, Pink Cat, Magic Red)
Object.assign(CROPS, {
  "Grass": ["Spring", 500, 9, 3, 20, "\"", "0B"],
  "Moondrop Flower": ["Spring", 300, 6, 0, 60, "*", "09"],
  "Toy Flower": ["Spring", 400, 12, 0, 100, "*", "07"],
  "Pink Cat Flower": ["Summer", 300, 6, 0, 70, "*", "0A"],
  "Magic Red Flower": ["Fall", 600, 10, 0, 200, "*", "08"],
});

Object.assign(FORAGE, {
  "Spring": ["Bamboo Shoot", "Blue Grass", "Yellow Grass", "Orange Grass", "Moondrop Flower", "Toy Flower", "Medicinal Herb"],
  "Summer": ["Blue Grass", "Green Grass", "Red Grass", "Purple Grass", "Indigo Grass", "Pink Cat Flower", "Wild Grape"],
  "Fall": ["Mushroom", "Poisonous Mushroom", "Truffle", "Green Grass", "Red Grass", "Magic Red Flower", "Apple", "Wild Grape"],
  "Winter": ["White Grass", "Black Grass", "Blue Grass"],
});

Object.assign(FORAGE_GLYPH, {
  "Yellow Grass": ["\"", "09"],
  "Orange Grass": ["\"", "09"],
  "Green Grass": ["\"", "0B"],
  "Purple Grass": ["\"", "0E"],
  "Indigo Grass": ["\"", "0D"],
  "Black Grass": ["\"", "03"],
  "White Grass": ["\"", "07"],
  "Poisonous Mushroom": ["m", "0E"],
  "Magic Red Flower": ["*", "08"],
  "Blue Magic Grass": ["*", "0D"],
  "Apple": ["a", "08"],
  "SUGDW Apple": ["a", "08"],
  "HMSGB Apple": ["a", "0A"],
  "AEPFE Apple": ["a", "09"],
  "Honey": ["h", "09"],
});

Object.assign(TILES, {
  "spring": ["~", "0C", "01", true],   // Hot Spring water (walkable / soakable)
  "pond": ["~", "0B", "00", false],    // Goddess Pond
  "ice": ["=", "0C", "01", true],      // Frozen Lake in Winter
  "sand": [".", "09", "00", true],     // Mineral Beach sand
  "mill": ["%", "09", "01", false],    // Corn Mill by Coop
  "doghouse": ["D", "08", "01", false],
  "stable": ["H", "09", "01", false],
  "vase": ["v", "0A", "01", false],
  "fireplace": ["^", "08", "01", false],
  "phone": ["P", "0C", "01", false],
  "trash": ["U", "03", "01", false],
  "maker": ["M", "0C", "01", false],
  "incub": ["O", "09", "01", false],
});

Object.assign(ITEMS, {
  // Seeds
  "Grass Seeds": [0, 0, "seed"],
  "Moondrop Flower Seeds": [0, 0, "seed"],
  "Toy Flower Seeds": [0, 0, "seed"],
  "Pink Cat Flower Seeds": [0, 0, "seed"],
  "Magic Red Flower Seeds": [0, 0, "seed"],
  "Grass": [20, 0, "forage"],
  "Magic Red Flower": [200, 0, "forage"],
  "Blue Magic Grass": [90, 0, "forage"],
  // Wild Grasses & Forage
  "Green Grass": [100, 10, "forage"],
  "Yellow Grass": [120, 12, "forage"],
  "Orange Grass": [100, 10, "forage"],
  "Purple Grass": [120, 12, "forage"],
  "Indigo Grass": [100, 15, "forage"],
  "Black Grass": [10, 15, "forage"],
  "White Grass": [150, 25, "forage"],
  "Poisonous Mushroom": [100, -25, "forage"],
  "Apple": [50, 8, "forage"],
  "SUGDW Apple": [500, 15, "forage"],
  "HMSGB Apple": [500, 15, "forage"],
  "AEPFE Apple": [500, 15, "forage"],
  "Honey": [50, 10, "forage"],
  "Spa-Boiled Egg": [80, 15, "animal"],
  // Egg & Mayonnaise Quality Ladder
  "Good Egg": [60, 10, "animal"],
  "High Egg": [80, 15, "animal"],
  "Golden Egg": [100, 20, "animal"],
  "P Egg": [180, 30, "animal"],
  "X Egg": [350, 50, "animal"],
  "Small Mayonnaise": [100, 10, "animal"],
  "Medium Mayonnaise": [150, 15, "animal"],
  "Large Mayonnaise": [200, 20, "animal"],
  "Golden Mayonnaise": [300, 30, "animal"],
  "P Mayonnaise": [450, 45, "animal"],
  "X Mayonnaise": [800, 75, "animal"],
  // Milk & Cheese Quality Ladder
  "Golden Milk": [300, 30, "animal"],
  "P Milk": [500, 45, "animal"],
  "X Milk": [800, 75, "animal"],
  "Small Cheese": [300, 15, "animal"],
  "Medium Cheese": [400, 20, "animal"],
  "Large Cheese": [500, 30, "animal"],
  "Golden Cheese": [600, 40, "animal"],
  "P Cheese": [750, 55, "animal"],
  "X Cheese": [1500, 90, "animal"],
  // Wool & Yarn Quality Ladder
  "Good Wool": [150, 0, "animal"],
  "Golden Wool": [600, 0, "animal"],
  "P Wool": [1000, 0, "animal"],
  "X Wool": [2000, 0, "animal"],
  "Small Yarn": [300, 0, "animal"],
  "Medium Yarn": [700, 0, "animal"],
  "Large Yarn": [800, 0, "animal"],
  "Golden Yarn": [1000, 0, "animal"],
  "P Yarn": [1500, 0, "animal"],
  "X Yarn": [4000, 0, "animal"],
  // Spring & Lake Mine Ores, Gems & Artifacts
  "Junk Ore": [1, 0, "ore"],
  "Orichalc": [50, 0, "ore"],
  "Adamantite": [50, 0, "ore"],
  "Mythic Stone": [20000, 0, "ore"],
  "Agate": [62, 0, "ore"],
  "Fluorite": [65, 0, "ore"],
  "Peridot": [68, 0, "ore"],
  "Topaz": [70, 0, "ore"],
  "Ruby": [75, 0, "ore"],
  "Emerald": [80, 0, "ore"],
  "Moon Stone": [55, 0, "ore"],
  "Sand Rose": [60, 0, "ore"],
  "Pink Diamond": [10000, 0, "ore"],
  "Alexandrite": [10000, 0, "ore"],
  // Jewels & Gems
  "Goddess Jewel": [0, 0, "special"],
  "Kappa Jewel": [0, 0, "special"],
  "Truth Jewel": [0, 0, "special"],
  "Gem of the Goddess": [0, 0, "special"],
  "Gem of the Kappa": [0, 0, "special"],
  "Gem of Truth": [0, 0, "special"],
  "Teleport Stone": [0, 0, "tool"],
  "Pedometer": [0, 0, "tool"],
  "Power Berry": [0, 50, "special"],
  "Mystic Berry": [0, 50, "special"],
  // Fishing Kings & Sea Treasures
  "Catfish": [500, 40, "fish"],
  "Carp": [500, 40, "fish"],
  "Coelacanth": [1000, 60, "fish"],
  "Squid": [500, 40, "fish"],
  "Monkfish": [500, 40, "fish"],
  "Spa Catfish": [500, 40, "fish"],
  "Pirate Treasure": [10000, 0, "ore"],
  "Fossil of Ancient Fish": [5000, 0, "ore"],
  // Relics: buried curios from dig spots (and one from falling stars); the museum's Relics wing
  "Clay Whistle": [180, 0, "relic"],
  "Glass Float": [220, 0, "relic"],
  "Tin Soldier": [260, 0, "relic"],
  "Lantern Lens": [300, 0, "relic"],
  "Carved Acorn": [160, 0, "relic"],
  "Fossil Fern": [420, 0, "relic"],
  "Bronze Bell": [380, 0, "relic"],
  "Sun Coin": [600, 0, "relic"],
  "Star Fragment": [800, 0, "relic"],
  "Boot": [1, 0, "trash"],
  "Empty Can": [1, 0, "trash"],
  "Fish Bones": [1, 0, "trash"],
  // Shop Goods, Jewelry, Medicines & Ranch Tools
  "Flour": [50, 5, "ingredient"],
  "Oil": [50, 2, "ingredient"],
  "Curry Powder": [50, 2, "ingredient"],
  "Chocolate": [100, 10, "food"],
  "Wine": [300, 15, "food"],
  "Grape Juice": [200, 20, "food"],
  "Bodigizer XL": [0, 150, "food"],
  "Turbojolt": [0, 50, "food"],
  "Turbojolt XL": [0, 100, "food"],
  "Animal Medicine": [0, 0, "tool"],
  "Miracle Potion": [0, 0, "tool"],
  "Bell": [0, 0, "tool"],
  "Basket": [0, 0, "tool"],
  "Dog Ball": [0, 0, "tool"],
  "Frisbee": [0, 0, "tool"],
  "Record Player": [0, 0, "special"],
  "Golden Lumber": [100, 0, "material"],
  "Necklace": [2000, 0, "special"],
  "Earrings": [2000, 0, "special"],
  "Bracelet": [2000, 0, "special"],
  "Brooch": [2000, 0, "special"],
  "Perfume": [1500, 0, "special"],
  "Dress": [2500, 0, "special"],
  "Sunblock": [1000, 0, "special"],
  "Skin Lotion": [1000, 0, "special"],
  "Facial Pack": [1000, 0, "special"],
  // Extra Utensils
  "Whisk": [0, 0, "utensil"],
  "Rolling Pin": [0, 0, "utensil"],
  "Oven": [0, 0, "utensil"],
  "Seasoning Set": [0, 0, "utensil"],
  // Extra Cooked Dishes
  "Failed Dish": [1, -10, "dish"],
  "Elli Leaves": [0, 250, "dish"],
  "Relaxation Tea Leaves": [1000, 50, "ingredient"],
  "Relaxation Tea": [1200, 120, "dish"],
  "Cookies": [200, 25, "dish"],
  "Chocolate Cookies": [300, 35, "dish"],
  "Chocolate Cake": [500, 65, "dish"],
  "Pancakes": [250, 35, "dish"],
  "French Fries": [220, 30, "dish"],
  "Ketchup": [180, 10, "dish"],
  "Pizza": [450, 55, "dish"],
  "Cheese Fondue": [400, 50, "dish"],
  "Noodles": [250, 40, "dish"],
  "Curry Noodles": [400, 60, "dish"],
  "Tempura": [320, 45, "dish"],
  "Miso Soup": [150, 25, "dish"],
  "Ice Cream": [300, 40, "dish"],
  "Baked Sweet Potato": [240, 35, "dish"],
  "Apple Pie": [450, 55, "dish"],
});

FRUITS.add("Apple");
FRUITS.add("SUGDW Apple");
FRUITS.add("HMSGB Apple");
FRUITS.add("AEPFE Apple");

Object.assign(UTENSILS, {
  "Knife": 1500,
  "Frying Pan": 1200,
  "Pot": 1000,
  "Mixer": 1200,
  "Whisk": 500,
  "Rolling Pin": 750,
  "Oven": 2500,
  "Seasoning Set": 2500,
});

Object.assign(EXPANSIONS, {
  "Kitchen": [4000, 100, null, "A full kitchen counter for cooking 100+ dishes."],
  "Extension": [3000, 200, "Kitchen", "House Upgrade 1: Second room, Cabinet & Refrigerator."],
  "Bathroom": [30000, 580, "Extension", "House Upgrade 2 + Bathroom & Fireplace (+30 Stamina / -20 Fatigue bath)."],
  "Big Bed": [10000, 200, "Extension", "Required for marriage and adds +20 recovery."],
  "Coop Expansion": [5000, 420, null, "Expands Coop to 16 chickens and unlocks Mayonnaise Maker."],
  "Barn Expansion": [6800, 500, null, "Expands Barn to 16 cows/sheep and unlocks Cheese & Yarn Makers."],
  "Town Cottage": [100000, 999, "Bathroom", "Vacation villa in Town with the New Year's Gameshow TV!"],
});

Object.assign(RECIPES, {
  "Cookies": [[["Flour", 1], ["Egg", 1]], "Oven", 25, 200],
  "Chocolate Cookies": [[["Flour", 1], ["Egg", 1], ["Chocolate", 1]], "Oven", 35, 300],
  "Cake": [[["Flour", 1], ["Egg", 1], ["Milk", 1]], "Oven", 45, 350],
  "Chocolate Cake": [[["Flour", 1], ["Egg", 1], ["Milk", 1], ["Chocolate", 1]], "Oven", 65, 500],
  "Pancakes": [[["Flour", 1], ["Egg", 1], ["Milk", 1], ["Honey", 1]], "Frying Pan", 35, 250],
  "French Fries": [[["Potato", 1], ["Oil", 1]], "Frying Pan", 30, 220],
  "Ketchup": [[["Tomato", 1], ["Onion", 1]], "Mixer", 10, 180],
  "Pizza": [[["Flour", 1], ["Small Cheese", 1], ["Ketchup", 1]], "Oven", 55, 450],
  "Cheese Fondue": [[["Bread", 1], ["Small Cheese", 1]], "Pot", 50, 400],
  "Noodles": [[["Flour", 1]], "Rolling Pin", 40, 250],
  "Curry Noodles": [[["Flour", 1], ["Curry Powder", 1]], "Pot", 60, 400],
  "Tempura": [[["Flour", 1], ["Egg", 1], ["Oil", 1], ["any:fish", 1]], "Frying Pan", 45, 320],
  "Miso Soup": [[["any:crop", 1]], "Seasoning Set", 25, 150],
  "Ice Cream": [[["Milk", 1], ["Egg", 1]], "Whisk", 40, 300],
  "Baked Sweet Potato": [[["Sweet Potato", 1]], "Oven", 35, 240],
  "Apple Pie": [[["Apple", 1], ["Flour", 1], ["Egg", 1]], "Oven", 55, 450],
  "Relaxation Tea": [[["Relaxation Tea Leaves", 1]], "Pot", 120, 1200],
  "Bodigizer": [[["Red Grass", 1], ["Black Grass", 1], ["Honey", 1]], "Pot", 100, 250],
  "Bodigizer XL": [[["Bodigizer", 1], ["Blue Grass", 1]], "Mixer", 150, 500],
  "Turbojolt": [[["Red Grass", 1], ["White Grass", 1], ["Honey", 1]], "Pot", 50, 300],
  "Turbojolt XL": [[["Turbojolt", 1], ["Green Grass", 1]], "Mixer", 100, 600],
  "Elli Leaves": [[["Failed Dish", 1], ["Bodigizer", 1], ["Turbojolt", 1]], "Knife", 250, 1000],
  "X Egg": [[["Egg", 1], ["Good Egg", 1], ["High Egg", 1], ["Golden Egg", 1], ["P Egg", 1]], "Seasoning Set", 50, 350],
  "X Milk": [[["Small Milk", 1], ["Medium Milk", 1], ["Large Milk", 1], ["Golden Milk", 1], ["P Milk", 1]], "Seasoning Set", 75, 800],
});

Object.assign(BUILDINGS, {
  "winery": "Aja Winery",
  "sprites": "Harvest Sprite Hut",
  "zack": "Zack & Won's Beach House",
  "kai_shack": "Kai's Seaside Lodge",
});

Object.assign(HOURS, {
  "winery": [9, 14, [5]],
  "sprites": [6, 22, []],
  "zack": [11, 16, []],
  "kai_shack": [11, 19, [6]],
});

Object.assign(INTERIOR_LAYOUTS, {
  "winery": [
    "###################",
    "#ooo#....k....#ooo#",
    "#ooo#=========#ooo#",
    "#.................#",
    "#.oo..oo...oo..oo.#",
    "#.........1.......#",
    "#########D#########"
  ],
  "sprites": [
    "###################",
    "#b.b.b.#.k.#.b.b.b#",
    "#.................#",
    "#.1..2..3...4..5..#",
    "#.6....ctc.....7..#",
    "#.................#",
    "#########D#########"
  ],
  "zack": [
    "#################",
    "#HH#....k....#oo#",
    "#..#=========#..#",
    "#...............#",
    "#.ctc....1....o.#",
    "########D########"
  ],
});

// Add Remaining Villagers, Harvest Goddess, Kappa, Won, Kai, Duke, Manna, Anna, Sasha, Harris, Zack, Ellen, Stu
Object.assign(NPCS, {
  "Harvest Goddess": {
    g: "G",
    col: "0C",
    home: "church",
    out: [6, 22],
    where: ["mountain", 47, 7],
    rain: true,
    bach: true,
    loves: ["Strawberry", "Pineapple", "Moondrop Flower", "Toy Flower", "Pink Cat Flower", "Magic Red Flower", "Relaxation Tea"],
    likes: ["Turnip", "Potato", "Cucumber", "Egg", "Milk", "Apple", "Honey"],
    hates: ["Junk Ore", "Boot", "Empty Can", "Poisonous Mushroom", "Failed Dish"],
    lines: [
      ["Tadaaa! I am the Harvest Goddess! Toss an offering into my pond each day for blessings!"],
      ["You work so diligently on your farm! Keep collecting the 9 Goddess Jewels in the Spring Mine."],
      ["You have proven yourself a true master of Mineral Town! My heart is yours."],
    ],
  },
  "Kappa": {
    g: "K",
    col: "0B",
    home: "church",
    out: [8, 20],
    where: ["mountain", 15, 7],
    rain: true,
    bach: false,
    loves: ["Cucumber"],
    likes: ["Small Fish", "Medium Fish", "Large Fish"],
    hates: ["Junk Ore", "Failed Dish"],
    lines: [
      ["...Kappa. (He stares at you from the lake. Try giving him a Cucumber.)"],
      ["...Good Cucumber. Bring 10 and I will grant you the Mystic Blue Berry."],
      ["...You hold the power of the lake. Rain will never tire you."],
    ],
  },
  "Won": {
    g: "W",
    col: "09",
    home: "zack",
    out: [11, 16],
    where: ["town", 24, 15],
    rain: false,
    bach: false,
    loves: ["Gold", "Mystrile", "Diamond", "Pink Diamond", "Alexandrite", "SUGDW Apple"],
    likes: ["Apple", "Copper", "Silver", "Jade"],
    hates: ["Boot", "Empty Can", "Junk Ore"],
    lines: [
      ["Hehehe! Welcome, my friend! I am Won, purveyor of rare seeds and exotic treasures!"],
      ["Looking for Cabbage, Pineapple, or Green Pepper seeds? Or perhaps a Frisbee for your dog?"],
      ["For a discerning customer like you, I even have a Jewel of Truth and a Record Player!"],
    ],
  },
  "Kai": {
    g: "k",
    col: "0E",
    home: "kai_shack",
    out: [9, 19],
    where: ["beach", 20, 12],
    rain: false,
    bach: true,
    loves: ["Pineapple", "Corn", "Large Fish", "Oil", "Flour", "Bread", "Omelet"],
    likes: ["Egg", "Tomato", "Onion", "Pumpkin"],
    hates: ["Turnip", "Sweet Potato", "Junk Ore"],
    lines: [
      ["Hey! Nothing beats the ocean breeze in summer. Come grab a bite at my shack!"],
      ["The guys in town think I'm a slacker, but you actually treat me like a friend."],
      ["Maybe I don't have to leave Mineral Town after summer... if I'm here with you."],
    ],
  },
  "Duke": {
    g: "u",
    col: "0E",
    home: "winery",
    out: [13, 18],
    where: ["woods", 35, 20],
    rain: false,
    bach: false,
    loves: ["Wine", "Grape Juice", "Wild Grape", "Sashimi", "Grilled Fish", "Cucumber"],
    likes: ["Eggplant", "Cheese Fondue", "Tomato", "Spinach"],
    hates: ["Junk Ore", "Failed Dish"],
    lines: [
      ["Welcome to Aja Winery! Our vines soak up the sunshine off Mother's Hill."],
      ["Come fall, we always need extra hands for the grape harvest."],
      ["Here's to a fine vintage and a fine neighbour!"],
    ],
  },
  "Manna": {
    g: "n",
    col: "0A",
    home: "winery",
    out: [13, 17],
    where: ["town", 33, 13],
    rain: false,
    bach: false,
    loves: ["Wine", "Honey", "Pink Cat Flower", "Medium Fish", "Mushroom"],
    likes: ["Milk", "Moondrop Flower", "Tomato", "Carrot"],
    hates: ["Failed Dish", "Junk Ore"],
    lines: [
      ["Oh, hello dear! Have you met my husband Duke? Once I start talking I never stop,aha!"],
      ["Our daughter Aja moved to the city, you know. Working alongside Cliff really cheered Duke up!"],
      ["You're always welcome at the winery—and at Rose Plaza for our daily chat!"],
    ],
  },
  "Zack": {
    g: "Z",
    col: "0D",
    home: "zack",
    out: [16, 18],
    where: ["farm", 20, 7],
    rain: true,
    bach: false,
    loves: ["Large Fish", "Orichalc", "Diamond", "Cucumber", "Tomato", "Curry Noodles"],
    likes: ["Small Fish", "Medium Fish", "Egg", "Apple"],
    hates: ["Poisonous Mushroom", "Junk Ore"],
    lines: [
      ["Hey there! I pick up everything from your shipping bin at 5:00 PM sharp every day."],
      ["Have you tried ocean fishing off Mineral Beach? My old Fishing Rod still has plenty of luck in it!"],
      ["Your farm's shipments keep getting bigger! Your grandfather would be proud."],
    ],
  },
  "Harris": {
    g: "H",
    col: "0D",
    home: "mayor",
    out: [9, 19],
    where: ["town", 38, 15],
    rain: true,
    bach: false,
    loves: ["Cake", "Hot Milk", "Spa-Boiled Egg", "Small Fish", "Apple Pie"],
    likes: ["Potato", "Egg", "Honey", "Apple", "Bread"],
    hates: ["Poisonous Mushroom", "Red Grass"],
    lines: [
      ["Good day! Keeping the peace and delivering the mail in Mineral Town is my duty!"],
      ["Everything's peaceful today... well, except when Won tries peddling strange apples."],
      ["If I ever work up the courage to write a letter to Aja in the city, I hope it turns out well."],
    ],
  },
  "Curator": {
    g: "Ω",
    col: "0C",
    home: "museum",
    out: null,
    where: null,
    rain: true,
    bach: false,
    loves: ["Diamond", "Pink Diamond", "Alexandrite", "Moondrop Flower"],
    likes: ["Copper", "Silver", "Gold", "Mystrile", "Medicinal Herb"],
    hates: ["Junk Ore", "Boot", "Empty Can"],
    lines: [
      ["Welcome to the Mineral Town Museum. Bring me a fish, ore, forage or crop and I'll add it to the collection."],
      ["Every donation helps us rebuild the old exhibits. Milestones earn a small reward from the town fund."],
      ["The collection is looking better every season. Thank you for helping us remember Mineral Town's natural history."],
    ],
  },
});

// Make all 5 original Bachelors also eligible for Heart Events & Blue Feather (Remake + Classic support!)
for (const bachelor of ["Gray", "Rick", "Cliff", "Doctor", "Kai"]) {
  if (NPCS[bachelor]) {
    NPCS[bachelor].bach = true;
  }
}

Object.assign(BIRTHDAYS, {
  "Harvest Goddess": [0, 8],
  "Won": [3, 19],
  "Kai": [1, 22],
  "Duke": [3, 15],
  "Manna": [2, 11],
  "Zack": [1, 29],
  "Harris": [1, 4],
});

// All 20+ Festivals across Spring, Summer, Fall, and Winter
Object.assign(FESTIVALS, {
  "0,1": ["New Year's Festival", 9, 18, "newyear"],
  "0,8": ["Spring Goddess Festival", 10, 18, "goddess"],
  "0,14": ["Spring Thanksgiving", 9, 18, "spring_thanks"],
  "0,18": ["Spring Horse Race", 10, 18, "horserace"],
  "0,22": ["Cooking Festival", 10, 18, "cooking"],
  "1,1": ["Beach Day Frisbee Contest", 10, 18, "beach"],
  "1,7": ["Chicken Sumo Festival", 10, 18, "sumo"],
  "1,8": ["Egg Hunt", 10, 16, "egghunt"],
  "1,20": ["Cow Festival", 10, 18, "cowfest"],
  "1,24": ["Fireworks Festival", 18, 22, "fireworks"],
  "2,3": ["Music Festival", 18, 22, "music"],
  "2,9": ["Harvest Festival", 10, 18, "harvest"],
  "2,13": ["Moon Viewing Festival", 18, 22, "moon"],
  "2,18": ["Fall Horse Race", 10, 18, "horserace"],
  "2,21": ["Sheep Festival", 10, 18, "sheepfest"],
  "2,30": ["Pumpkin Festival", 10, 18, "pumpkin"],
  "3,2": ["Thomas's Winter Request", 9, 18, "winter_req"],
  "3,14": ["Winter Thanksgiving", 10, 18, "thanks"],
  "3,24": ["Starry Night Festival", 18, 22, "starry"],
  "3,25": ["Stocking Festival", 9, 18, "stocking"],
  "3,30": ["New Year's Eve Noodles", 18, 23, "nye"],
});

export interface SpriteDef {
  name: string;
  colorName: string;
  col: string;
  grass: string;
  bday: [number, number];
}

export const SPRITES: SpriteDef[] = [
  { name: "Chef", colorName: "Red", col: "08", grass: "Red Grass", bday: [2, 14] },
  { name: "Nappy", colorName: "Orange", col: "09", grass: "Orange Grass", bday: [3, 22] },
  { name: "Hoggy", colorName: "Yellow", col: "0A", grass: "Yellow Grass", bday: [2, 10] },
  { name: "Timid", colorName: "Green", col: "0B", grass: "Green Grass", bday: [1, 16] },
  { name: "Aqua", colorName: "Blue", col: "0C", grass: "Blue Grass", bday: [0, 26] },
  { name: "Staid", colorName: "Indigo", col: "0D", grass: "Indigo Grass", bday: [2, 15] },
  { name: "Bold", colorName: "Purple", col: "0E", grass: "Purple Grass", bday: [0, 4] },
];

export const TV_SHOPPING_ITEMS: [string, number, string][] = [
  ["Clock", 2000, "Displays exact time in your farmhouse."],
  ["Mirror", 1000, "Check your appearance and stamina state."],
  ["Refrigerator", 2500, "Stores food and cooking ingredients."],
  ["Cabinet", 2500, "Stores ores, gems, and unlocks the Gem of Truth."],
  ["Knife", 1500, "Kitchen utensil for salads, sashimi, and sushi."],
  ["Frying Pan", 1200, "Kitchen utensil for stir-fries, omelets, and pancakes."],
  ["Pot", 1000, "Kitchen utensil for stews, curries, and teas."],
  ["Mixer", 1200, "Kitchen utensil for juices and XL medicines."],
  ["Whisk", 500, "Kitchen utensil for ice cream and batters."],
  ["Rolling Pin", 750, "Kitchen utensil for noodles and pastries."],
  ["Oven", 2500, "Kitchen utensil for cakes, cookies, pizza, and pies."],
  ["Seasoning Set", 2500, "Sugar, Salt, Vinegar, Soy Sauce, and Miso for recipes."],
  ["Rug", 5000, "A plush carpet for your farmhouse floor."],
  ["Power Berry", 10000, "Increases your maximum Stamina by +10!"],
];

export const HEART_EVENTS: Record<string, [string, string, string, string]> = {
  "Mary": [
    "Black Heart Event: Mary drops a stack of botany books in the Library. You help her gather them, and she shyly thanks you.",
    "Purple Heart Event: Mary asks your opinion on the rough draft of her novel about a brave farmer and a forest spirit.",
    "Blue Heart Event: On Mother's Hill, Mary gifts you a pressed bookmark and confesses you inspired her story's hero.",
    "Yellow Heart Event: Basil and Anna invite you to dinner; Mary beams when you praise her homemade vegetable stew.",
  ],
  "Karen": [
    "Black Heart Event: At the Supermarket, Karen gives you a bag of Grass Seeds on the house to help get your farm started.",
    "Purple Heart Event: Karen asks you to help pick betweenMoondrop and Pink Cat flower seeds for Sasha's garden.",
    "Blue Heart Event: At Aja Winery, Duke gifts Karen a bottle of wine brewed the year she was born—and she shares a glass with you.",
    "Yellow Heart Event: Karen cooks you her signature dish; even though it's a little burnt, eating it with a smile wins her heart.",
  ],
  "Popuri": [
    "Black Heart Event: Popuri chases an escaped hen outside the Poultry Farm; you catch it gently for her.",
    "Purple Heart Event: Popuri asks if you'd like to give her a tour of your farm—she loves seeing your crops and animals!",
    "Blue Heart Event: By the Hot Spring, Popuri gives you a keepsake Mud Ball she made and promises to always cheer you on.",
    "Yellow Heart Event: Lillia and Rick invite you for lunch, and Popuri proudly serves her homemade omelet.",
  ],
  "Elli": [
    "Black Heart Event: Stu scrapes his knee outside the Clinic; you help Elli calm him down while she bandages it.",
    "Purple Heart Event: Elli asks for your encouragement as she studies late to become a better nurse alongside the Doctor.",
    "Blue Heart Event: On her day off, Elli brings you homemade sandwiches to test if they're nutritious enough for hard-working farmers.",
    "Yellow Heart Event: At Mineral Beach, Elli opens up about her grandmother Ellen and how much your kindness means to her.",
  ],
  "Ann": [
    "Black Heart Event: At Doug's Inn, Ann serves you a huge complimentary meal to see if you have a healthy appetite!",
    "Purple Heart Event: Ann tries cleaning the upper rooms of the Inn and tumbles into your arms, blushing furiously.",
    "Blue Heart Event: Ann gives you a cherished broken Music Box that belonged to her mother, trusting you with it.",
    "Yellow Heart Event: Doug pulls you aside at the Inn and admits he'd be proud if someone as hardworking as you looked after Ann.",
  ],
  "Harvest Goddess": [
    "Black Heart Event: The Harvest Goddess rises from the waterfall in a cascade of light to applaud your first 10 offerings.",
    "Purple Heart Event: She tests your knowledge of Mineral Town's crops and animals, laughing delightedly at your answers.",
    "Blue Heart Event: She blesses your fields with golden light and gifts you a rare White Grass from the heavens.",
    "Yellow Heart Event: She reveals that only a true master of the land, mines, and waters may win her hand in marriage.",
  ],
};

export const RIVAL_PAIRS: [string, string, string][] = [
  ["Mary", "Gray", "Gray spends his afternoons reading quietly in Mary's library, bonding over craftsmanship and stories."],
  ["Karen", "Rick", "Rick and Karen reminisce by the stream about growing up together in Mineral Town."],
  ["Popuri", "Kai", "Popuri visits Kai's seaside shack, fascinated by his stories of life beyond Mineral Town."],
  ["Elli", "Doctor", "The Doctor praises Elli's dedication at the Clinic and admits he couldn't run it without her."],
  ["Ann", "Cliff", "Ann brings Cliff a warm lunch from Doug's Inn and encourages him to make Mineral Town his home."],
];


// ---------------------------------------------------------------- outer-region content
// Original forage, fish and landmark text for the four outer regions:
// Cedar Hollow (woods), Skyline Ridge (ridge), Willow Bend (river) and Lighthouse Point (point).

Object.assign(ITEMS, {
  // Cedar Hollow: woodland greens, berries and mushrooms
  "Fiddlehead": [60, 5, "forage"],
  "Blackberry": [60, 5, "forage"],
  "Chanterelle": [150, 7, "forage"],
  "Cedar Cone": [40, 0, "forage"],
  // Skyline Ridge: alpine herbs and flowers
  "Mountain Thyme": [80, 6, "forage"],
  "Edelweiss": [150, 0, "forage"],
  "Juniper Berry": [90, 4, "forage"],
  // Willow Bend: riverbank plants
  "Watercress": [60, 6, "forage"],
  "Cattail": [70, 0, "forage"],
  "Willow Catkin": [80, 0, "forage"],
  // Lighthouse Point: shoreline finds
  "Kelp": [50, 5, "forage"],
  "Samphire": [70, 6, "forage"],
  "Spiral Shell": [80, 0, "forage"],
  "Sea Glass": [120, 0, "forage"],
  // Willow Bend river fish
  "Willow Chub": [70, 6, "fish"],
  "Speckled Trout": [160, 10, "fish"],
  "Burbot": [180, 11, "fish"],
  "Elder Sturgeon": [800, 50, "fish"],
  // Lighthouse Point sea fish
  "Mackerel": [90, 7, "fish"],
  "Rockfish": [130, 9, "fish"],
  "Sea Bass": [220, 13, "fish"],
  "Storm Marlin": [900, 55, "fish"],
});

FRUITS.add("Blackberry");

Object.assign(FORAGE_GLYPH, {
  "Fiddlehead": ["f", "0B"],
  "Blackberry": ["%", "0F"],
  "Chanterelle": ["n", "09"],
  "Cedar Cone": ["o", "09"],
  "Mountain Thyme": ["t", "0E"],
  "Edelweiss": ["*", "07"],
  "Juniper Berry": ["%", "0D"],
  "Watercress": ["w", "0B"],
  "Cattail": ["!", "09"],
  "Willow Catkin": ["*", "04"],
  "Kelp": ["&", "0B"],
  "Samphire": ["\"", "0B"],
  "Spiral Shell": ["@", "0A"],
  "Sea Glass": ["o", "0C"],
});

/** Seasonal forage for each outer region (other maps use the valley-wide FORAGE lists). */
export const REGION_FORAGE: Record<string, Record<string, string[]>> = {
  grove: {
    Spring: ["Fiddlehead", "Medicinal Herb", "Yellow Grass", "Toy Flower"],
    Summer: ["Blackberry", "Medicinal Herb", "Red Grass", "Purple Grass"],
    Fall: ["Mushroom", "Chanterelle", "Cedar Cone", "Orange Grass"],
    Winter: ["Cedar Cone", "White Grass", "Black Grass"],
  },
  woods: {
    Spring: ["Fiddlehead", "Bamboo Shoot", "Medicinal Herb", "Moondrop Flower"],
    Summer: ["Blackberry", "Wild Grape", "Medicinal Herb", "Green Grass"],
    Fall: ["Chanterelle", "Mushroom", "Truffle", "Poisonous Mushroom"],
    Winter: ["Cedar Cone", "Black Grass", "Blue Grass"],
  },
  ridge: {
    Spring: ["Mountain Thyme", "Medicinal Herb", "Yellow Grass", "Toy Flower"],
    Summer: ["Edelweiss", "Mountain Thyme", "Indigo Grass", "Purple Grass"],
    Fall: ["Juniper Berry", "Red Grass", "Orange Grass", "Mushroom"],
    Winter: ["Juniper Berry", "White Grass", "Blue Grass"],
  },
  river: {
    Spring: ["Watercress", "Willow Catkin", "Green Grass", "Blue Grass"],
    Summer: ["Watercress", "Cattail", "Pink Cat Flower", "Blue Grass"],
    Fall: ["Cattail", "Wild Grape", "Red Grass", "Mushroom"],
    Winter: ["Willow Catkin", "Blue Grass", "Black Grass"],
  },
  point: {
    Spring: ["Kelp", "Spiral Shell", "Sea Glass"],
    Summer: ["Samphire", "Kelp", "Spiral Shell", "Sea Glass"],
    Fall: ["Kelp", "Spiral Shell", "Sea Glass"],
    Winter: ["Spiral Shell", "Sea Glass"],
  },
};

/** One weighted line in a catch table. `seasons` limits it (0 Spring .. 3 Winter); `rod` adds weight per rod level. */
export interface CatchEntry {
  item: string;
  w: number;
  seasons?: number[];
  rod?: number;
}

/** A region's catch table: a weighted, seasonal draw, plus a rare catch that needs a better rod. */
export interface CatchTable {
  fish: CatchEntry[];
  rare: string;
  /** Minimum Fishing Rod level for the rare catch. */
  rareRod: number;
  /** Chance per catch at that level (+1% for each level above it). */
  rareChance: number;
  /** Multiplier on the rare chance on rainy or stormy days. */
  stormBoost?: number;
}

/** Waters with their own fish: the river at Willow Bend and the sea off Lighthouse Point. */
export const REGION_CATCH: Record<string, CatchTable> = {
  river: {
    fish: [
      { item: "Small Fish", w: 30 },
      { item: "Willow Chub", w: 26 },
      { item: "Medium Fish", w: 18, rod: 2 },
      { item: "Speckled Trout", w: 12, seasons: [0, 2], rod: 2 },
      { item: "Burbot", w: 14, seasons: [3], rod: 2 },
      { item: "Large Fish", w: 6, rod: 3 },
      { item: "Boot", w: 3 },
      { item: "Empty Can", w: 3 },
    ],
    rare: "Elder Sturgeon",
    rareRod: 2,
    rareChance: 0.04,
  },
  point: {
    fish: [
      { item: "Small Fish", w: 22 },
      { item: "Mackerel", w: 24, seasons: [0, 1] },
      { item: "Rockfish", w: 20, rod: 1 },
      { item: "Medium Fish", w: 14, rod: 2 },
      { item: "Sea Bass", w: 12, seasons: [1, 2], rod: 2 },
      { item: "Large Fish", w: 6, rod: 3 },
      { item: "Fish Bones", w: 4 },
    ],
    rare: "Storm Marlin",
    rareRod: 3,
    rareChance: 0.03,
    stormBoost: 3,
  },
};

/** Skyline Ridge lookout: what tomorrow's weather looks like from the top. */
export const LOOKOUT_VIEW: Record<string, string> = {
  Sunny: "The sky is clear all the way to the sea. Tomorrow looks fine.",
  Rain: "Grey cloud is banking up over the sea. It will rain tomorrow.",
  Typhoon: "A dark wall of cloud is wheeling in off the sea. A storm is coming tomorrow!",
  Snow: "Heavy snow clouds sit on the far hills. Expect snow tomorrow.",
  Blizzard: "The far peaks have vanished into white. A blizzard is coming tomorrow!",
};
/** The lookout's once-a-day lift. */
export const LOOKOUT_STAMINA = 30;
export const LOOKOUT_FATIGUE = 10;

/** Cedar Hollow's mossy pond: chance that a forage pickup finds a second one on a lucky day. */
export const HOLLOW_LUCK_CHANCE = 0.3;

/** Relics a dig spot can turn up (Star Fragments only come from falling stars). */
export const DIG_RELICS = ['Clay Whistle', 'Glass Float', 'Tin Soldier', 'Lantern Lens', 'Carved Acorn', 'Fossil Fern', 'Bronze Bell', 'Sun Coin'];
/** Ore and gems a dig spot can turn up. */
export const DIG_ORES = ['Copper', 'Silver', 'Gold', 'Agate', 'Moon Stone', 'Sand Rose'];
/** Outdoor maps that grow dig spots, and how many each may hold at once. */
export const DIG_MAPS = ['farm', 'mountain', 'beach', 'woods', 'ridge', 'river', 'point', 'grove'];
export const DIG_CAP = 2;
/** Chance a good night's sleep brings a surprise (glowmoths, a falling star or a doorstep parcel). */
export const NIGHT_SURPRISE_CHANCE = 0.18;
/** Gems a fallen star can hold beside its Star Fragment. */
export const STAR_GEMS = ['Moon Stone', 'Sand Rose', 'Topaz', 'Ruby', 'Emerald', 'Diamond'];

/** Lighthouse Point: the old keeper's log, read one page a day at the sign. */
export const LIGHTHOUSE_INTRO =
  "Lighthouse Point — The keeper left years ago, but the light still turns on stormy nights. A weathered logbook hangs on a nail under the sign.";
export const LIGHTHOUSE_LOG: string[] = [
  "First night. I lit the lamp at dusk, and a little green boat with a white stripe came round the Point and blinked its lantern twice. Thank you, I think it meant.",
  "Every storm since, the green boat comes back: two blinks, then gone. I have started leaving a lantern on the rocks for it, in case its own goes out.",
  "I asked down at the harbour. Nobody in the valley owns a green boat with a white stripe. The oldest net-mender says nobody ever did.",
  "My last night here. I have rigged the lamp to light itself whenever a storm comes in. If you ever see two blinks out at sea, blink back for me.",
];

/** What you see in a Lighthouse Point tide pool. */
export const TIDE_POOL_TEXT =
  "A tide pool among the rocks. Tiny crabs scuttle under the weed, and a red anemone opens and closes like a slow heartbeat.";
