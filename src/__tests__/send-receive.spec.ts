import { test } from 'ava'
import { ProcessSystem, Logger } from '../processes'

Logger.disable() // Disable the logger globally

test('ProcessSystem#send/receive', (t) => {

  return new Promise((resolve, reject) => {

    let system = new ProcessSystem()

    let received = 0

    const pid1 = system.spawn(function*() {
      while (true) {
        yield system.receive(function(value) {
          received = received + 1
          if (received === 5) {
            system.send(pid2, 'PONG')
          }
        })
      }
    })

    const pid2 = system.spawn(function*() {
      yield system.receive(resolve)
    })

    for (let i = 0; i < 5; i++) {
      system.send(pid1, 'PING')
    }

    t.pass()
  })

})
