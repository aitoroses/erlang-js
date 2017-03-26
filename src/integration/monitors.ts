import { system, States } from '../processes'

let pid1 = system.spawn_link(function*() {

  let pid2 = system.spawn(function*() {
    yield system.sleep(3000)
    system.send(pid1, '***** Sleeped 3000')
    yield system.exit(States.KILL)
    while (true) {
      console.log('GG')
    }
  })

  let ref = system.monitor(pid2)

  // Loop listen
  while (true) {
    yield system.receive(x => console.log(`Receive: ${x}`))
  }
})

setTimeout(printStats, 5000)

function printStats() {
  let processes = system.list()
  if (processes.length) {
    console.log(`${system.list()}`)
  } else {
    console.log('All processes exited')
  }
}
