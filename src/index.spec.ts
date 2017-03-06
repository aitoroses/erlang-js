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

test(function pingPongTest(t) {

  let resolve, promise = new Promise<any>(res => resolve = res)
  const system = new ProcessSystem()

  const pid1 = system.spawn(function*(){
    let pid1Receive

    yield system.receive(value => {
      pid1Receive = value
    })

    t.true(pid1Receive === 'PING')

    system.send(pid2, 'PONG')
  })

  system.register('Sally', pid1)

  const pid2 = system.spawn(function*() {
    let pid2Receive

    system.send('Sally', 'PING')

    yield system.receive(value => {
      pid2Receive = value
    })

    t.true(pid2Receive === 'PONG')

    resolve()
  })

  return promise
})
