import test from 'node:test'
import assert from 'node:assert/strict'
import { emptySnapshot, mergeSnapshots, validateSnapshot } from '../src/lib/merge.ts'
const snap = rows => ({ ...emptySnapshot(), transactions: rows })
const row = (id, amount) => ({ id, amount, categoryId: 1 })
test('independent devices add different records', () => {
  const result = mergeSnapshots(snap([]), snap([row(1, 10)]), snap([row(2, 20)]))
  assert.equal(result.conflicts.length, 0); assert.equal(result.merged.transactions.length, 2)
})
test('remote deletion does not resurrect a stale local row', () => {
  assert.deepEqual(mergeSnapshots(snap([row(1, 10)]), snap([row(1, 10)]), snap([])).merged.transactions, [])
})
test('local deletion survives an unchanged remote', () => {
  assert.deepEqual(mergeSnapshots(snap([row(1, 10)]), snap([]), snap([row(1, 10)])).merged.transactions, [])
})
test('concurrent edits require resolution', () => {
  assert.equal(mergeSnapshots(snap([row(1, 10)]), snap([row(1, 20)]), snap([row(1, 30)])).conflicts.length, 1)
})
test('edit versus delete is a conflict', () => {
  assert.equal(mergeSnapshots(snap([row(1, 10)]), snap([]), snap([row(1, 30)])).conflicts.length, 1)
})
test('legacy numeric ID collisions are not overwritten', () => {
  assert.equal(mergeSnapshots(snap([]), snap([row(1, 20)]), snap([row(1, 30)])).conflicts.length, 1)
})
test('response loss retry of the same save is idempotent', () => {
  const result = mergeSnapshots(snap([]), snap([row(1, 20)]), snap([row(1, 20)]))
  assert.equal(result.conflicts.length, 0); assert.equal(result.merged.transactions.length, 1)
})
test('edits during upload rebase onto acknowledged save', () => {
  const result = mergeSnapshots(snap([row(1, 20)]), snap([row(1, 30)]), snap([row(1, 20), row(2, 40)]))
  assert.equal(result.conflicts.length, 0); assert.deepEqual(result.merged.transactions, [row(1, 30), row(2, 40)])
})
test('JSON property ordering does not create conflicts', () => {
  assert.equal(mergeSnapshots(snap([row(1, 10)]), snap([{ amount: 10, categoryId: 1, id: 1 }]), snap([row(1, 20)])).conflicts.length, 0)
})
test('invalid and duplicate primary keys are rejected', () => {
  assert.throws(() => validateSnapshot(snap([row(1, 20), row(1, 30)])))
  assert.throws(() => validateSnapshot(snap([row('1', 20)])))
  assert.throws(() => validateSnapshot({}))
})
