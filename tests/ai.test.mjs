import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
registerHooks({resolve(specifier, context, nextResolve) {
 if (specifier.endsWith('.js') && specifier.startsWith('.') && context.parentURL) {
  const candidate=new URL(specifier.replace(/\.js$/,'.ts'),context.parentURL)
  if (existsSync(candidate)) return nextResolve(candidate.href,context)
 }
 return nextResolve(specifier,context)
}})
const { normalizeTransaction, aiError } = await import('../api/_gemini.ts')
const categories=[{id:1,name:'Food',spendingType:'variable'},{id:2,name:'ETC',spendingType:'variable'}]
test('API cleanup validates dates, amounts and categories',()=>{
 const result=normalizeTransaction({date:'2026-02-31',merchant:'맥도날드',description:'맥도날드 베토디 세트 8100',amount:8100,categoryId:999,confidence:3},categories,'2026-11-12')
 assert.equal(result.description,'베토디 세트');assert.equal(result.date,'2026-11-12');assert.equal(result.categoryId,2);assert.equal(result.confidence,1)
 assert.throws(()=>normalizeTransaction({amount:0},categories,'2026-11-12'))
 assert.throws(()=>normalizeTransaction({amount:'NaN'},categories,'2026-11-12'))
})
test('quota failures retain 429 and do not leak provider messages',()=>{
 const result=aiError({status:429,message:'sensitive details'})
 assert.equal(result.status,429);assert.equal(result.retryAfter,60);assert.ok(!result.error.includes('sensitive'))
 assert.match(aiError({status:404}).error,/model/)
})
test('client blocks repeated API calls briefly after quota failure',async()=>{
 const original=globalThis.fetch; let requests=0
 globalThis.fetch=async()=>{requests++;return new Response(JSON.stringify({error:'Usage limit reached'}),{status:429,headers:{'Retry-After':'60'}})}
 try {
  const {requestAi}=await import('../src/utils/aiRequest.ts?quota-test')
  await assert.rejects(requestAi('/api/classify',{}),/Usage limit/)
  await assert.rejects(requestAi('/api/import-image',{}),/usage limit/)
  assert.equal(requests,1)
 } finally {globalThis.fetch=original}
})
