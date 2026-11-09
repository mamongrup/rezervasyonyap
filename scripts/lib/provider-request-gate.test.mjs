import test from 'node:test';
import assert from 'node:assert/strict';
import {createSupplierRequestGate} from './provider-request-gate.mjs';
function fake(){let time=0;const waits=[];return {waits,now:()=>time,sleep:async ms=>{waits.push(ms);time+=ms}}}
const reply=(status,header=null)=>({status,headers:{get:()=>header},text:async()=>''});
test('supplier requests are serialized and paced',async()=>{const f=fake(),g=createSupplierRequestGate({...f,intervalMs:1500});const starts=[];await Promise.all([1,2,3].map(()=>g(async()=>{starts.push(f.now());return reply(200)})));assert.deepEqual(starts,[0,1500,3000])});
test('read retries respect Retry-After',async()=>{const f=fake(),g=createSupplierRequestGate({...f,intervalMs:1000});let attempts=0;const r=await g(async()=>reply(++attempts===1?429:200,'4'),{retryable:true});assert.equal(r.status,200);assert.equal(attempts,2);assert.deepEqual(f.waits,[4000])});
test('unsafe writes are never retried',async()=>{const f=fake(),g=createSupplierRequestGate(f);let attempts=0;const r=await g(async()=>{attempts++;return reply(429)});assert.equal(r.status,429);assert.equal(attempts,1)});
test('retry count remains bounded',async()=>{const f=fake(),g=createSupplierRequestGate({...f,maxAttempts:3});let attempts=0;const r=await g(async()=>{attempts++;return reply(503)},{retryable:true});assert.equal(r.status,503);assert.equal(attempts,3);assert.deepEqual(f.waits,[60000,120000])});
test('transport failure does not poison the queue',async()=>{const f=fake(),g=createSupplierRequestGate(f);await assert.rejects(g(async()=>{throw Error('offline')}));assert.equal((await g(async()=>reply(200))).status,200)});
