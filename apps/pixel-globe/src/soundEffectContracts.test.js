import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createPortAssaultScenario, simulatePortAssault } from "./portAssaultBattle.js";

const root = new URL("../", import.meta.url);
const main = readFileSync(new URL("src/main.js", root), "utf8");
const ast = ts.createSourceFile("main.js", main, ts.ScriptTarget.Latest, true);
const functions = new Map(ast.statements.filter(ts.isFunctionDeclaration).map(node => [node.name.text, node.getText(ast)]));
const constants = ast.statements.filter(node => ts.isVariableStatement(node) &&
  node.declarationList.declarations.every(declaration => declaration.name.getText(ast).startsWith("SFX_")))
  .map(node => node.getText(ast)).join("\n");

function assertAudioAsset(url) {
  assert.match(url, /^assets\/sfx\/[^/]+\.(ogg|mp3|wav)$/);
  const bytes = readFileSync(new URL(`public/${url}`, root));
  assert.ok(bytes.length > 100, `${url}: empty audio`);
  const header = bytes.toString("ascii", 0, 4);
  assert.ok(header === "OggS" || header === "RIFF" || header.startsWith("ID3") ||
    (bytes[0] === 255 && (bytes[1] & 224) === 224), `${url}: not an audio file`);
  return url;
}

function soundRuntime() {
  const calls = [];
  const context = vm.createContext({ soundEffects: null,
    createSoundPool: (url, count) => Array.from({length:count}, () => ({url:assertAudioAsset(url)})),
    createAmbientLoop: url => ({url:assertAudioAsset(url)}),
    createAmbientPlaylist: urls => urls.map(assertAudioAsset),
    applyThemeAudioSettings() {},
    playSoundEffect(pool, volume, rate = 1) {
      assert.ok(Array.isArray(pool) && pool.length > 0, "sound handler references an uninitialized pool");
      assert.ok(Number.isFinite(volume) && volume >= 0 && volume <= 1);
      assert.ok(Number.isFinite(rate) && rate > 0);
      calls.push(pool[0].url);
    },
    playBowFireSound() { calls.push("bow"); },
    playArrowHitSound() { calls.push("arrow-hit"); },
    playCannonImpactSound() { calls.push("cannon-impact"); }
  });
  vm.runInContext(`${constants}\n${functions.get("setupSoundEffects")}\n${functions.get("playPortAssaultEventSound")}\nsetupSoundEffects();`,context);
  return {context,calls};
}

function productionSources(directory) {
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry => {
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""),directory);
    if (entry.isDirectory()) return entry.name === "assets" ? [] : productionSources(url);
    return entry.name.endsWith(".js") && !entry.name.endsWith(".test.js") ? [url] : [];
  });
}

test("every production SFX asset reference exists and contains audio", () => {
  const references = new Set();
  for (const file of [...productionSources(new URL("src/",root)), ...productionSources(new URL("city-visualizer/",root))]) {
    for (const match of readFileSync(file,"utf8").matchAll(/["'`](assets\/sfx\/[^"'`]+\.(?:ogg|mp3|wav))["'`]/g)) references.add(match[1]);
  }
  assert.ok(references.size > 30, "must scan the complete sound catalog");
  for (const url of references) assertAudioAsset(url);
});

test("every named sound pool used in production is created by audio initialization", () => {
  const {context} = soundRuntime();
  function visit(node) {
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "soundEffects") {
      assert.ok(Object.hasOwn(context.soundEffects,node.name.text), `Missing sound pool: ${node.name.text}`);
    }
    ts.forEachChild(node,visit);
  }
  visit(ast);
});

test("actual assault timelines including boarding play through the production sound handler", () => {
  const {context,calls} = soundRuntime();
  const observed = new Set();
  const soldier = (id,type) => ({id,appearanceId:type,crewTypeId:type,combatProfileId:type,experienceStars:1,auxiliary:false});
  for (const dockKind of ["wood","stone","none"]) {
    const battle = simulatePortAssault(createPortAssaultScenario({cityId:"tunis|tunisia",dockKind,fortified:false,
      attackers:Array.from({length:15},(_,i)=>soldier(`a${i}`,"gunner")),
      defenders:Array.from({length:8},(_,i)=>({...soldier(`d${i}`,"swordsman"),experienceStars:3})),
      shipHitPoints:80,shipMaxHitPoints:100}),42);
    for (const event of battle.events) {
      observed.add(event.type);
      context.playPortAssaultEventSound(event);
    }
  }
  for (const type of ["deck-land","dock-land","splash","jump","attack","ship-hit","death","result"]) assert.ok(observed.has(type),type);
  assert.ok(calls.some(url=>url.endsWith("thump-close-101799.ogg")));
  assert.ok(calls.some(url=>url.endsWith("thump-105302.ogg")));
  for (const type of ["attack","hit"]) for (const attackType of ["arrow","firearm","melee"]) context.playPortAssaultEventSound({type,attackType});
  for (const type of ["hit","death"]) {
    const before = calls.length;
    context.playPortAssaultEventSound({type,attackType:"melee",chargeLaunch:true});
    assert.ok(calls.slice(before).some(url=>url.endsWith("impact-thud-291047.ogg")));
  }
  for (const type of ["block","breach","time-limit"]) context.playPortAssaultEventSound({type});
  assert.throws(()=>context.playPortAssaultEventSound({type:"unknown"}),/Unknown port assault/);
  assert.throws(()=>context.playPortAssaultEventSound({type:"attack",attackType:"unknown"}),/Unknown port assault/);
});

test("every assault event declared by the simulator has an explicit audio policy", () => {
  const battleSource = ts.createSourceFile("portAssaultBattle.js",readFileSync(new URL("src/portAssaultBattle.js",root),"utf8"),ts.ScriptTarget.Latest,true);
  const emitted = new Set();
  function addValues(expression) {
    if (ts.isStringLiteral(expression)) emitted.add(expression.text);
    else if (ts.isConditionalExpression(expression)) { addValues(expression.whenTrue); addValues(expression.whenFalse); }
    else assert.fail(`Assault event type needs a statically enumerable contract: ${expression.getText(battleSource)}`);
  }
  function visit(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(battleSource) === "type") addValues(node.initializer);
    ts.forEachChild(node,visit);
  }
  visit(battleSource);
  const handled = new Set([...functions.get("playPortAssaultEventSound").matchAll(/event\.type === "([^"]+)"/g)].map(match=>match[1]));
  assert.ok(emitted.size >= 10);
  for (const type of emitted) assert.ok(handled.has(type), `Assault event has no audio policy: ${type}`);
});

test("every bundled sound effect has an individual in-game credit",()=>{
  const credits=readFileSync(new URL('public/assets/CREDITS.md',root),'utf8').split('## Sound Effects\n')[1].split('\n## ')[0];
  const normalize=text=>text.toLowerCase().replace(/[^a-z0-9]/g,'');
  const lines=credits.split('\n').map(normalize);
  const special={
    'bow-fire.ogg':'Three Kingdoms Stratagem - Bow Fire',
    'arrow-hit.ogg':'Three Kingdoms Stratagem - Arrow Hit',
    'dominik-braun-failure-sound.mp3':'Dominik Braun - Failure Sound',
    'nps-humpback-whale-surface-blow.ogg':'H. Lentfer / National Park Service - Humpbacks and Murrelets'
  };
  for(const filename of readdirSync(new URL('public/assets/sfx/',root))) {
    const stem=filename.replace(/\.(ogg|mp3|wav)$/,'');
    const id=stem.match(/-(\d+)$/)?.[1];
    if(id) assert.ok(lines.some(line=>line.includes(`pixabay${id}`)),`Missing individual SFX credit: ${filename}`);
    else assert.ok(lines.some(line=>line.includes(normalize(special[filename] ?? stem))),`Missing SFX credit: ${filename}`);
  }
});
