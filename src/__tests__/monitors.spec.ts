import { test } from 'ava'
import { ProcessSystem, States, Logger, Tuple } from '../'

Logger.disable() // Disable the logger globally

test('monitors', (t) => {

  const system = new ProcessSystem()

  return new Promise((resolve, reject) => {

    let pid1 = system.spawn_link(function*() {
      system.trap_exits()

      let pid2 = system.spawn_link(function*() {
        yield system.exit(States.NORMAL)
      })

      system.monitor(pid2)

      while (true) {
        yield system.receive((event) => {
          if (event instanceof Tuple) {
            if (event.get(0) === 'DOWN') {
              t.true(event.get(2) === pid2)
              resolve()
            }
          }
        })
      }
    })
  })
})
