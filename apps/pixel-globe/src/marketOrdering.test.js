import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source = readFileSync(new URL('./dialogueSystem.js',import.meta.url),'utf8');
const code = source.slice(source.indexOf('function stableMarketGoodIds('),source.indexOf('function marketTradeLotCount('));
for (const side of ['buy','sell']) test(`${side} roster ranks initial world-price advantage and stays still while trading`, () => {
  const prices = {fish: 150,grain: 50,meat: 100};
  let quotes=0;
  const order = vm.runInNewContext(`${code}\nstableMarketGoodIds`, {Set,Array,
    worldMarketPriceComparison:(_economy,_city,id)=>{quotes++;return {localPrice:prices[id],worldPrice:100};}});
  const session={roster:[]};
  const expected=side==='buy'?['grain','meat','fish']:['fish','meat','grain'];
  assert.deepEqual(order(session,'roster',['fish','grain','meat'],{}, {},side),expected);
  prices.grain=1000;
  assert.deepEqual(order(session,'roster',['grain','fish'],{}, {},side),expected);
  assert.equal(quotes,3,'existing rows must not be repriced for ordering after each click');
});
