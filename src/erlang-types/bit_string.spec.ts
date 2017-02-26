import { BitString } from './bit_string'
import { test } from 'ava'

test('creation', (t) => {
  let bs = new BitString(BitString.integer(1))
  t.deepEqual(bs.value, [1])

  bs = new BitString(BitString.binary('foo'))
  t.deepEqual(bs.value, [102, 111, 111])

  bs = new BitString(BitString.integer(0), BitString.binary('foo'))
  t.deepEqual(bs.value, [0, 102, 111, 111])

  bs = new BitString(BitString.float(3.14))
  t.deepEqual(bs.value, [64, 9, 30, 184, 81, 235, 133, 31])

  bs = new BitString(BitString.signed(BitString.integer(-100)))
  t.deepEqual(bs.value, [156])
})

test('toUTF8Array', (t) => {
  let bs = BitString.toUTF8Array('fo≈')
  t.deepEqual(bs, [102, 111, 226, 137, 136])
})

test('toUTF16Array', (t) => {
  let bs = BitString.toUTF16Array('fo≈')
  t.deepEqual(bs, [0, 102, 0, 111, 34, 72])
})

test('toUTF32Array', (t) => {
  let bs = BitString.toUTF32Array('fo≈')
  t.deepEqual(bs, [0, 0, 0, 102, 0, 0, 0, 111, 0, 0, 34, 72])
})

test('float32Bytes', (t) => {
  let bs = BitString.float32ToBytes(3.14)
  t.deepEqual(bs, [64, 72, 245, 195])
})

test('float32Bytes', (t) => {
  let bs = BitString.float64ToBytes(3.14)
  t.deepEqual(bs, [64, 9, 30, 184, 81, 235, 133, 31])
})
