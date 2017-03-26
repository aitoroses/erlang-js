import { test } from 'ava'
import { ProcessSystem, States, Logger } from '../processes'

Logger.disable() // Disable the logger globally

test('ProcessSystem#spawn_link', (t) => {

  const system = new ProcessSystem()

  return new Promise((resolve, reject) => {

    let pid1 = system.spawn_link(function*() {
      let pid2 = system.spawn_link(function*() {
        yield system.exit(States.KILL)
      })

      // Loop listen
      while (true) {
        yield system.receive(x => console.log(`Receive: ${x}`))
      }
    })

    setTimeout(() => {
      t.true(system.list().length === 0)
      resolve()
    }, 90)
  })
})

test('ProcessSystem#trap_exit', (t) => {

  const system = new ProcessSystem()

  return new Promise((resolve, reject) => {

    let pid1 = system.spawn_link(function*() {
      system.trap_exits()

      t.true(system.list().length === 2)

      let pid2 = system.spawn_link(function*() {
        yield system.exit(States.KILL)
      })

      t.true(system.list().length === 3)

      yield system.sleep(100000) // Keep alive
    })

    setTimeout(() => {
      t.true(system.list().length === 2)
      resolve()
    }, 10)
  })
})
