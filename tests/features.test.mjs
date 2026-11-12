import test from 'node:test'
import assert from 'node:assert/strict'
import { monthlyExpenses } from '../src/utils/monthly.ts'
import { cleanDescription, parseKnownMerchant, splitTrailingPrice } from '../src/utils/expenseInput.ts'
const categories = [1,2,3].map(id => ({ id, name: `Category ${id}`, order: id }))
test('monthly items count in expense without creating daily transactions', () => {
 const transactions = [{id:1, categoryId:1, amount:8100}]
 const plans = [{id:1, categoryId:2, amount:8690, status:'paid'}, {id:2,categoryId:2,amount:30000,status:'planned'}]
 const result = monthlyExpenses(transactions, plans, categories)
 assert.equal(result.totalExpense, 46790)
 assert.deepEqual(result.categoryTotals.map(x=>x.amount), [8100,38690,0])
 assert.equal(transactions.length,1)
 assert.equal(transactions.reduce((s,x)=>s+x.amount,0),8100)
})
test('editing and deleting monthly items changes totals exactly once', () => {
 assert.equal(monthlyExpenses([], [{categoryId:1,amount:200}], categories).totalExpense,200)
 assert.equal(monthlyExpenses([], [], categories).totalExpense,0)
})
test('summary retains unused categories and expenses of deleted categories', () => {
 const result=monthlyExpenses([{categoryId:99,amount:100}],[],categories)
 assert.equal(result.categoryTotals.length,4)
 assert.equal(result.categoryTotals.reduce((s,x)=>s+x.amount,0),result.totalExpense)
})
test('known Korean merchant separates product and amount', () => {
 assert.deepEqual(parseKnownMerchant('맥도날드 베토디 세트 8100','맥도날드'),{merchant:'맥도날드',description:'베토디 세트',amount:8100})
})
test('product model numbers never override the trailing price', () => {
 assert.equal(parseKnownMerchant('Store Model 99999 8,100원','store').amount,8100)
 assert.equal(parseKnownMerchant('Store Model 99999 8,100원','store').description,'Model 99999')
})
test('merchant substring does not silently misclassify another store', () => {
 assert.equal(parseKnownMerchant('CUmart milk 2000','cu'),null)
 assert.equal(parseKnownMerchant('yesterday CU milk 2000','cu'),null)
})
test('AI description cleanup preserves the product name', () => {
 assert.equal(cleanDescription('맥도날드 베토디 세트 8100','맥도날드',8100),'베토디 세트')
 assert.equal(cleanDescription('Store Model 8100','Store',2000),'Model 8100')
 assert.equal(cleanDescription('Starbucks 6000','Starbucks',6000),'Purchase')
})
test('price parser rejects missing price and recognizes currency', () => {
 assert.equal(splitTrailingPrice('coffee'),null)
 assert.equal(splitTrailingPrice('coffee 0'),null)
 assert.deepEqual(splitTrailingPrice('coffee ₩ 6,000'),{label:'coffee',amount:6000})
})
