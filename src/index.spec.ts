import { test } from 'ava'
import * as ErlantTypes from './erlang-types'
import { ProcessSystem, States } from './processes'

test('erlang types can be used', (t) => {
  t.true(typeof ErlantTypes.PID === 'function')
  t.true(typeof ErlantTypes.Reference === 'function')
  t.true(typeof ErlantTypes.BitString === 'function')
  t.true(typeof ErlantTypes.Tuple === 'function')
})

test('erlang process system is available', (t) => {
  t.true(typeof ProcessSystem === 'function')
  t.true(typeof States.NORMAL === 'symbol')
})
