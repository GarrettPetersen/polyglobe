import test from 'node:test';
import assert from 'node:assert/strict';
import { CITY_POPULATION_PROFILES, cityCombatProfileForAppearance } from '../city-visualizer/cityPeople.js';
import { createCaptureCommissionTroops, strongestCommissionAppearance, captureCommissionTroopsAboard, captureCommissionTroopsForAssault, recordCaptureCommissionTroopLosses, validateCaptureCommissionTroops, captureCommissionTroopOfferText } from './captureCommissionTroops.js';
const origin = { cityId: 'london', populationProfileId: 'european' };
const target = { cityId: 'paris', population: 300000, isFactionCapital: true };
function quest(roll = 0) {
  const result = { id: 'royal-warrant', kind: 'capture-port', petitioned: false, stage: 'capture', targetCityId: target.cityId, targetName: 'Paris' };
  result.commissionTroops = createCaptureCommissionTroops(result, origin, target, roll);
  return result;
}
test('only unsolicited commissions offer companies, with stronger cities favored', () => {
  const q = quest();
  assert.equal(createCaptureCommissionTroops({ ...q, petitioned: true }, origin, target, 0), null);
  assert.equal(quest(.99).commissionTroops, null);
  assert.ok(q.commissionTroops.length >= 3 && q.commissionTroops.length <= 6);
  const village = { cityId: 'village', population: 100 };
  assert.equal(createCaptureCommissionTroops(q, origin, village, .5), null);
  assert.ok(createCaptureCommissionTroops(q, origin, target, .5));
  assert.match(captureCommissionTroopOfferText(q), /Paris alone/);
});
test('every population has a strongest authored soldier; Europe and Japan provide elite cavalry', () => {
  for (const profile of CITY_POPULATION_PROFILES) {
    const appearance = strongestCommissionAppearance({ cityId: profile.id, populationProfileId: profile.id });
    assert.ok(profile.garrison.some(entry => entry.appearanceId === appearance));
  }
  assert.equal(cityCombatProfileForAppearance(strongestCommissionAppearance(origin)), 'cavalier');
  assert.equal(cityCombatProfileForAppearance(strongestCommissionAppearance({ cityId: 'edo', populationProfileId: 'japanese' })), 'horse-samurai');
});
test('troops only fight at the canonical target and losses survive repeated assaults and serialization', () => {
  const q = quest();
  assert.equal(captureCommissionTroopsForAssault(q, 'elsewhere').length, 0);
  assert.equal(captureCommissionTroopsForAssault(q, 'paris').length, q.commissionTroops.length);
  const dead = q.commissionTroops[1].id;
  recordCaptureCommissionTroopLosses(q, [dead, 'conquistador:other:soldier:1']);
  recordCaptureCommissionTroopLosses(q, [dead]);
  const restored = JSON.parse(JSON.stringify(q));
  assert.equal(captureCommissionTroopsAboard(restored).length, q.commissionTroops.length - 1);
  assert.ok(!captureCommissionTroopsAboard(restored).some(troop => troop.id === dead));
  restored.stage = 'return';
  assert.deepEqual(captureCommissionTroopsAboard(restored), []);
  assert.deepEqual(captureCommissionTroopsForAssault(restored, 'paris'), []);
  assert.deepEqual(captureCommissionTroopsAboard(null), []);
});
test('corrupt rosters fail at the boundary; old commissions gain no retroactive troops', () => {
  const q = quest();
  assert.deepEqual(captureCommissionTroopsAboard({ ...q, commissionTroops: undefined }), []);
  for (const corrupt of [
    { ...q, petitioned: true },
    { ...q, commissionTroops: [...q.commissionTroops.slice(1), q.commissionTroops[1]] },
    { ...q, commissionTroops: q.commissionTroops.map(t => ({ ...t, appearanceId: 'missing' })) }
  ]) assert.throws(() => validateCaptureCommissionTroops(corrupt));
});

test('manifest soldiers keep their sprite and name after earlier companions die', async () => {
  const { createCommissionTravelerPeople } = await import('./expeditionTravelers.js');
  const q = { ...quest(), originCityId: 'london' };
  const people = () => {
    let count = 0;
    return createCommissionTravelerPeople({ quest: q, identityForPerson: () => ({ givenName: `Soldier ${++count}` }) });
  };
  const before = people();
  recordCaptureCommissionTroopLosses(q, [q.commissionTroops[0].id]);
  const after = people();
  assert.deepEqual(after, before.slice(1));
  for (const person of after) {
    assert.equal(person.kind, 'soldier');
    assert.equal(person.auxiliary, true);
    assert.equal(person.appearanceId, 'cavalier-covered');
    assert.equal(person.homePortCityId, 'london');
  }
});

test('victory transfers survivors to the city; later losses and conquest cannot resurrect them', async () => {
  const { stationCaptureCommissionTroops, commissionGarrisonTroops, recordCommissionGarrisonLosses, reconcileCommissionGarrisons, validateCommissionGarrisons } = await import('./captureCommissionTroops.js');
  const q = quest();
  const city = { cityId: q.targetCityId, factionId: 'england' };
  const quests = { captureActive: q, commissionGarrisons: {} };
  recordCaptureCommissionTroopLosses(q, [q.commissionTroops[0].id]);
  const survivors = captureCommissionTroopsAboard(q).map(t => t.id);
  stationCaptureCommissionTroops(quests, city.cityId, city.factionId);
  assert.deepEqual(captureCommissionTroopsAboard(q), []);
  assert.deepEqual(commissionGarrisonTroops(quests, city).map(t => t.id), survivors);
  stationCaptureCommissionTroops(quests, city.cityId, city.factionId);
  assert.equal(commissionGarrisonTroops(quests, city).length, survivors.length);
  quests.captureActive = null;
  const restored = JSON.parse(JSON.stringify(quests));
  validateCommissionGarrisons(restored);
  recordCommissionGarrisonLosses(restored, city, [survivors[0]]);
  assert.equal(commissionGarrisonTroops(restored, city).length, survivors.length - 1);
  reconcileCommissionGarrisons(restored, [{ ...city, factionId: 'france' }]);
  assert.deepEqual(commissionGarrisonTroops(restored, city), []);
  assert.throws(() => reconcileCommissionGarrisons(quests, []), /does not resolve/);
});
