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
export const UPGRADABLE = ["Hoe", "Hammer", "Axe", "Watering Can"];
export const LEVELS = ["Basic", "Copper", "Silver", "Gold", "Mystrile"];
export const LEVEL_COL = ["04", "08", "06", "09", "0C"];
export const UPGRADE: Record<number, [number, string]> = {
  "1": [
    1000,
    "Copper"
  ],
  "2": [
    2000,
    "Silver"
  ],
  "3": [
    3000,
    "Gold"
  ],
  "4": [
    5000,
    "Mystrile"
  ]
};

export const CAN_CAP = [30, 45, 60, 80, 100];
export const AREA: [number, number][] = [[1, 0], [3, 0], [2, 1], [3, 1], [5, 1]];

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
  "carpenter": "Gotz's Workshop"
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
      45,
      9
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
      "town",
      51,
      21
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
      "town",
      21,
      9
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
      "town",
      63,
      22
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
];

export const HELP: string[] = [
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
];
