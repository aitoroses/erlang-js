import { Tuple, system, PID } from '..'
import { GenServer } from './gen-server'
import { test } from 'ava'

class MyServer {

  // Public API

  static start_link() {
    return GenServer.start_link(new MyServer(), [])
  }

  static get_state(pid) {
    return GenServer.call(pid, 'get_state')
  }

  static some_call(pid) {
    return GenServer.call(pid, 'some_call')
  }

  static some_cast(pid) {
    return GenServer.cast(pid, 'some_cast')
  }

  // Callbacks

  init() {
    return []
  }

  async handle_call(request, _from, state) {

    switch (request) {
      case 'some_call':
        return new Tuple('reply', 'some_call', [...state, 'some_call'])

      case 'get_state':
        return new Tuple('reply', state, state)

    }
  }

  async handle_cast(request, state) {
    return new Tuple('noreply', [...state, 'some_cast'])
  }
}

test('GenServer creation', async t => {
  return new Promise(resolve => {

    system.spawn(function*() {
      let server = MyServer.start_link()
      t.true(server instanceof PID)
      resolve()
    })

  })
})

test('GenServer call', async t => {
  return new Promise(resolve => {

    system.spawn(function*() {
      let server = MyServer.start_link()
      let [ok, result] = yield MyServer.some_call(server)
      t.true(ok === 'ok')
      t.true(result === 'some_call')
      resolve()
    })

  })
})

test.only('GenServer cast', async t => {
  return new Promise(resolve => {

    system.spawn(function*() {
      let server = MyServer.start_link()
      MyServer.some_cast(server)
      yield system.sleep(100)
      let [ok, state] = yield MyServer.get_state(server)
      console.log(state)
      resolve()
    })

  })
})
