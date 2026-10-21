import test from 'node:test';
import assert from 'node:assert/strict';
import { INDICIA_TOOLS, supportsIndicia, verifyIndicia, searchIndicia, indiciaRecords } from '../server/indicia.mjs';
const key='in_'+'x'.repeat(40);
async function mocked(fetcher, run) { const original=globalThis.fetch; globalThis.fetch=fetcher; try { await run(); } finally { globalThis.fetch=original; } }
const response = data => new Response(JSON.stringify(data));
test('Indicia sends credentials only to fixed endpoints without redirects; excludes paid/credential/bypass routes', async()=>{
  for(const id of ['intelx','double-counter','horus','roblox','web','../v1/info','__proto__']) assert.equal(supportsIndicia(id),false);
  const calls=[];
  await mocked(async(url,options)=>{
    calls.push({url,options});
    assert.equal(new URL(url).origin,'https://api.indicia.app');
    assert.equal(options.redirect,'error');
    assert.equal(options.headers['x-api-key'],key);
    return response(url.endsWith('/pricing')?{success:true,prices:{ipinfo:0}}:{success:true,data:{ip:'8.8.8.8',country_name:'United States'}});
  },async()=>{
    const [source]=await searchIndicia('ip','8.8.8.8',key);
    assert.equal(source.status,'found');
    assert.equal(calls.length,2);
    assert.deepEqual(JSON.parse(calls[1].options.body),{query:'8.8.8.8'});
    assert.ok(!JSON.stringify(source).includes(key));
  });
});
test('live price must be exactly zero before any search; provider errors stay unavailable',async()=>{
  for(const prices of [{ipinfo:1},{},{ipinfo:'0'}]) {
    let count=0;
    await mocked(async()=>{count++; return response({success:true,prices});},async()=>{
      const [s]=await searchIndicia('ip','8.8.8.8',key);
      assert.equal(s.status,'unavailable'); assert.equal(count,1); assert.deepEqual(s.results,[]);
    });
  }
  await mocked(async url=>response(url.endsWith('/pricing')?{success:true,prices:{ipinfo:0}}:{success:false,error:'sensitive upstream error '+key}),async()=>{
    const s=await searchIndicia('ip','8.8.8.8',key);
    assert.equal(s[0].status,'unavailable'); assert.ok(!JSON.stringify(s).includes(key));
  });
  await mocked(async url=>response(url.endsWith('/pricing')?{success:true,prices:{ipinfo:0}}:{success:true,data:{ip:'8.8.8.8',message:key}}),async()=>{
    const s=await searchIndicia('ip','8.8.8.8',key);
    assert.equal(s[0].status,'unavailable'); assert.ok(!JSON.stringify(s).includes(key));
  });
});
test('parser handles structured data/collections/no matches with bounded credential-free fields',()=>{
  assert.deepEqual(indiciaRecords('cve','CVE-2024-3094',{query:'CVE-2024-3094',kevMatches:[]}),[]);
  assert.deepEqual(indiciaRecords('urlscan','example.com',{results:[]}),[]);
  assert.deepEqual(indiciaRecords('ip','8.8.8.8',null),[]);
  assert.throws(()=>indiciaRecords('urlscan','example.com',{}));
  const records=indiciaRecords('steam','sample',{steamId:'123',personaName:'Sample',profileUrl:'javascript:alert(1)',password:'hidden',accessToken:'hidden',games:[{appid:1,name:'Example'}], ...Object.fromEntries(Array.from({length:100},(_,i)=>['field'+i,i]))});
  assert.equal(records.length,1); assert.ok(records[0].url.startsWith('https://'));
  assert.ok(records[0].fields.some(f=>f.label.includes('games / 0 / name')));
  assert.ok(!JSON.stringify(records).includes('hidden')); assert.ok(records[0].fields.length<=80);
  assert.equal(indiciaRecords('certificate','example.com',Array.from({length:40},(_,i)=>({id:i,common_name:'example.com'}))).length,30);
  assert.ok(indiciaRecords('crypto','sample',{address:'sample',tokens:[{symbol:'BTC',amount:'1'}]})[0].fields.some(f=>f.label==='tokens / 0 / symbol'));
});
test('special request schemas never forward optional paid snapshot content or arbitrary fields',async()=>{
  for(const id of ['wayback','crypto','tiktok']) {
    let payload;
    await mocked(async(url,options)=>{
      if(url.endsWith('/pricing')) return response({success:true,prices:{[INDICIA_TOOLS[id].price]:0}});
      payload=JSON.parse(options.body);
      return response({success:true,data:id==='wayback'?{snapshots:[]}:null});
    },async()=>{await searchIndicia(id,'example',key);});
    if(id==='wayback') {assert.deepEqual(payload,{url:'example',limit:20}); assert.ok(!('timestamp' in payload));}
    if(id==='crypto') assert.deepEqual(payload,{address:'example',network:'bitcoin'});
    if(id==='tiktok') assert.deepEqual(payload,{query:'example',type:'username'});
  }
});
test('key verification reports status only, without exposing account data or the secret',async()=>{
  await assert.rejects(()=>verifyIndicia('invalid'));
  await mocked(async()=>response({success:true,key:{enabled:true,id:'private-id'},user:{tokens:0,email:'private@example.com'}}),async()=>{
    assert.deepEqual(await verifyIndicia(key),{connected:true,hasProviderCredits:false});
  });
});
