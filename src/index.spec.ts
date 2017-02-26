import { test } from 'ava'
import * as ErlantTypes from './erlang-types'

test('erlang types can be used', (t) => {
  t.true(typeof ErlantTypes.PID === 'function')
  t.true(typeof ErlantTypes.Reference === 'function')
  t.true(typeof ErlantTypes.BitString === 'function')
  t.true(typeof ErlantTypes.Tuple === 'function')
})
