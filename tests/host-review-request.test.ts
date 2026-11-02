import test from 'node:test';
import assert from 'node:assert/strict';
import { readHostReviewForm } from '../src/lib/host-review-request.ts';
const url='https://portal.example/api/admin/host-reviews';
const request=(body:BodyInit,headers:Record<string,string>={},signal?:AbortSignal)=>new Request(url,{method:'POST',body,headers:{'content-type':'application/x-www-form-urlencoded',...headers},...(signal?{signal}:{}),duplex:'half'} as RequestInit);
const rejected=(fn:()=>Promise<unknown>,status:number)=>assert.rejects(fn,(error:unknown)=>error instanceof Error && 'status' in error && error.status===status && !error.message.includes('private'));

test('bounded URL-encoded and multipart forms support existing text-only submissions',async()=>{
 assert.deepEqual({...await readHostReviewForm(request('action=submit&showTitle=Fictional+show'))},{action:'submit',showTitle:'Fictional show'});
 const form=new FormData();form.set('action','amend');form.set('revision','1');
 assert.deepEqual({...await readHostReviewForm(new Request(url,{method:'POST',body:form}))},{action:'amend',revision:'1'});
});
test('measured stream budget rejects missing or misleading content length',async()=>{
 const declarations: Record<string,string>[] = [{},{'content-length':'1'},{'content-length':'16385'}];
 for(const headers of declarations)
  await rejected(()=>readHostReviewForm(request('x='.padEnd(16385,'a'),headers)),413);
 for(const length of ['-1','garbage','9007199254740992']) await rejected(()=>readHostReviewForm(request('x=1',{'content-length':length})),400);
 await rejected(()=>readHostReviewForm(request('x=1',{'content-length':'2'})),400);
});
test('duplicate keys files field count and unsupported content types fail closed',async()=>{
 await rejected(()=>readHostReviewForm(request('action=submit&action=review')),400);
 await rejected(()=>readHostReviewForm(request(new URLSearchParams(Array.from({length:25},(_,i)=>['k'+i,'v'])).toString())),400);
 const form=new FormData();form.set('file',new Blob(['private bytes']),'sample.txt');
 await rejected(()=>readHostReviewForm(new Request(url,{method:'POST',body:form})),400);
 await rejected(()=>readHostReviewForm(request('x=1',{'content-type':'application/x-www-form-urlencoded-evil'})),415);
});
test('stalled and aborted request streams are bounded and cancelled',async()=>{
 let cancelled=false;
 const stalled=new ReadableStream<Uint8Array>({pull:()=>new Promise(()=>{}),cancel:()=>{cancelled=true;}});
 await rejected(()=>readHostReviewForm(request(stalled),10),408);assert.equal(cancelled,true);
 const controller=new AbortController();controller.abort('private reason');
 await rejected(()=>readHostReviewForm(request('x=1',{},controller.signal)),408);
});
test('empty chunk flooding and delayed timer delivery cannot bypass admission bounds',async()=>{
 const flood=new ReadableStream<Uint8Array>({pull(controller){controller.enqueue(new Uint8Array());}});
 await rejected(()=>readHostReviewForm(request(flood)),413);
 const slow=new ReadableStream<Uint8Array>({pull(controller){const end=performance.now()+30;while(performance.now()<end){}controller.enqueue(new TextEncoder().encode('x=1'));controller.close();}});
 await rejected(()=>readHostReviewForm(request(slow),10),408);
});
