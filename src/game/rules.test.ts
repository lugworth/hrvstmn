import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
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
} from './rules';

describe('Harvest Moon: Friends of Mineral Town Rules & Mechanics', () => {
  test('Power Berries scale max stamina from 150 to 250 (+10 each)', () => {
    assert.equal(getMaxStamina(0), 150);
    assert.equal(getMaxStamina(5), 200);
    assert.equal(getMaxStamina(10), 250);
    assert.equal(getMaxStamina(15), 250); // Clamped at 10 Power Berries
  });

  test('Tool area scales across all 8 tool tiers (Basic to Mythic)', () => {
    // Hoe facing right [1, 0]
    assert.equal(getToolArea('Hoe', 0, 10, 10, [1, 0]).length, 1);
    assert.equal(getToolArea('Hoe', 1, 10, 10, [1, 0]).length, 2);
    assert.equal(getToolArea('Hoe', 2, 10, 10, [1, 0]).length, 3);
    assert.equal(getToolArea('Hoe', 3, 10, 10, [1, 0]).length, 4);
    assert.equal(getToolArea('Hoe', 4, 10, 10, [1, 0]).length, 6);
    assert.equal(getToolArea('Hoe', 6, 10, 10, [1, 0]).length, 36); // Blessed 3x12
    assert.equal(getToolArea('Hoe', 7, 10, 10, [1, 0]).length, 90); // Mythic 5x18

    // Watering Can
    assert.equal(getToolArea('Watering Can', 0, 10, 10, [0, 1]).length, 1);
    assert.equal(getToolArea('Watering Can', 1, 10, 10, [0, 1]).length, 3);
    assert.equal(getToolArea('Watering Can', 2, 10, 10, [0, 1]).length, 6);
    assert.equal(getToolArea('Watering Can', 3, 10, 10, [0, 1]).length, 9);
    assert.equal(getToolArea('Watering Can', 4, 10, 10, [0, 1]).length, 15);

    // Sickle centered area at Gold/Mystrile
    assert.equal(getToolArea('Sickle', 3, 10, 10, [0, 1]).length, 9);
    assert.equal(getToolArea('Sickle', 4, 10, 10, [0, 1]).length, 25);
  });

  test('Stamina, Fatigue, Mystic Berry and Fainting mechanics', () => {
    // Sunny daytime tool use only costs stamina
    const r1 = calculateStaminaSpend(100, 0, 5, { weather: 'Sunny', minutes: 12 * 60 });
    assert.equal(r1.stamina, 95);
    assert.equal(r1.fatigue, 0);
    assert.equal(r1.fainted, false);

    // Rainy late-night tool use adds environmental fatigue
    const r2 = calculateStaminaSpend(100, 10, 5, { weather: 'Rain', minutes: 23 * 60 });
    assert.equal(r2.stamina, 95);
    assert.equal(r2.fatigue, 12);

    // Mystic Berry halves environmental fatigue buildup
    const r3 = calculateStaminaSpend(100, 10, 5, {
      weather: 'Rain',
      minutes: 23 * 60,
      hasMysticBerry: true,
    });
    assert.equal(r3.fatigue, 11);

    // Zero stamina overflows into fatigue and faints at 100
    const r4 = calculateStaminaSpend(0, 96, 5, { weather: 'Sunny', minutes: 12 * 60 });
    assert.equal(r4.stamina, 0);
    assert.equal(r4.fatigue, 100);
    assert.equal(r4.fainted, true);
    assert.equal(r4.warning, 'fainted');
  });

  test('Heart color tiers and birthday gift multipliers', () => {
    assert.equal(getHeartInfo(5).label, 'Black');
    assert.equal(getHeartInfo(20).label, 'Purple');
    assert.equal(getHeartInfo(35).label, 'Blue');
    assert.equal(getHeartInfo(50).label, 'Green');
    assert.equal(getHeartInfo(65).label, 'Yellow');
    assert.equal(getHeartInfo(80).label, 'Orange');
    assert.equal(getHeartInfo(95).label, 'Red');

    assert.equal(calculateGiftPoints('love', false, false), 8);
    assert.equal(calculateGiftPoints('love', true, false), 40); // 5x on birthday
    assert.equal(calculateGiftPoints('love', true, true), 50); // 5x * 1.25 wrapped
  });

  test('Livestock quality grades and Maker conversions', () => {
    assert.equal(getEggQuality(20, false, 0), 'Egg');
    assert.equal(getEggQuality(50, false, 0), 'Good Egg');
    assert.equal(getEggQuality(80, false, 0), 'High Egg');
    assert.equal(getEggQuality(85, true, 10), 'Golden Egg');
    assert.equal(getEggQuality(95, true, 60, 0.5), 'P Egg');
    assert.equal(getEggQuality(95, true, 60, 0.001), 'X Egg');

    assert.equal(getMilkQuality(95, true, 60, 0.5), 'P Milk');
    assert.equal(getWoolQuality(95, true, 60, 0.5), 'P Wool');

    assert.deepEqual(convertWithMaker('Golden Egg'), {
      output: 'Golden Mayonnaise',
      maker: 'Mayonnaise Maker',
    });
    assert.deepEqual(convertWithMaker('Large Milk'), {
      output: 'Large Cheese',
      maker: 'Cheese Maker',
    });
    assert.deepEqual(convertWithMaker('P Wool'), {
      output: 'P Yarn',
      maker: 'Yarn Maker',
    });
  });

  test('Spring Mine and Lake Mine drop tables', () => {
    assert.equal(rollSpringMineDrop(60, true, 3), 'Mythic Stone');
    assert.equal(rollSpringMineDrop(10, false, 3), 'Adamantite');
    assert.equal(rollLakeMineDrop(50, 2), 'Pink Diamond');
    assert.equal(rollLakeMineDrop(60, 2), 'Alexandrite');
    assert.equal(rollLakeMineDrop(10, 2), 'Diamond');
  });
});
