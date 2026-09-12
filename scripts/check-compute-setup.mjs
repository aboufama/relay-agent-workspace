import assert from 'node:assert/strict';
import { computeSetup } from '../lib/compute-setup.ts';
const config={GB10_CHAT_URL:'https://runtime.example/v1/chat/completions',GB10_API_KEY:'test-key'};
const request=(method='GET',origin='https://relay.example',body)=>new Request('https://relay.example/api/compute/setup',{method,headers:{Origin:origin},...(method === "POST" ? {body} : {})});
const originalFetch=globalThis.fetch;
const calls=[];
try {
 assert.equal((await computeSetup(request('POST','https://other.example'),config)).status,403);
 assert.equal((await computeSetup(request(),{})).status,503);
 assert.equal((await computeSetup(request(),{...config,GB10_CHAT_URL:'file:///tmp/secret'})).status,503);
 globalThis.fetch=async(url,options)=>{calls.push({url: url instanceof URL ? url.href : typeof url === "string" ? url : url.url,options});return Response.json({phase:'downloading',progress:150,downloaded:1024,total:4096,model:'untrusted override',logs:['private installer output']})};
 let result=await computeSetup(request('POST','https://relay.example','{"command":"anything","url":"https://other.example"}'),config);
 const status=await result.json();
 assert.equal(result.status,200);assert.equal(calls[0].url,'https://runtime.example/relay/setup');assert.equal(calls[0].options.body,undefined);assert.equal(calls[0].options.headers.Authorization,'Bearer test-key');assert.equal(status.progress,100);assert.equal(status.model,'Nemotron 3.5 Lightning 30B-A3B · NVFP4');assert.equal(status.logs,undefined);assert.equal(result.headers.get('Cache-Control'),'no-store');
 globalThis.fetch=async()=>Response.json({phase:'bogus'});assert.equal((await computeSetup(request(),config)).status,502);
 globalThis.fetch=async()=>new Response('private error',{status:500});result=await computeSetup(request(),config);assert.equal(result.status,503);assert.ok(!(await result.text()).includes('private error'));
 globalThis.fetch=async()=>{throw Error('private exception')};assert.equal((await computeSetup(request(),config)).status,504);
 console.log('Compute setup proxy: origin, configuration, fixed target/action, bounded status, private logs and failure checks passed.');
} finally {globalThis.fetch=originalFetch;}
