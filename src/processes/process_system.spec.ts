import test from 'ava'
import { ProcessSystem } from './process_system'

let system: ProcessSystem

test.beforeEach(t => {
  system = new ProcessSystem()
})

test(function* testSpawn(t) {
  const pid = system.spawn(function*() {
    yield 1
  })

  t.is(system.list().length, 2)
  t.is(system.list()[1], pid)
})

test(function* testSpawnLink(t) {
  const pid = system.spawn_link(function*() {
    let self = system.self()
    yield 1
  })

  t.is(system.list().length, 2)
  t.is(system.list()[1], pid)

  t.is(system.list().length, 2)

  let links: Set<any> = system.links.get(pid) as any
  t.true(links.has(system.list()[0]))

  links = system.links.get(system.list()[0]) as any
  t.true(links.has(pid))

})

test(function* testSpawnMonitor (t) {
  const [pid, ref] = system.spawn_monitor(function*(){
    yield 1
  })

  const self = system.list()[0]

  t.is(system.list().length, 2)
  t.deepEqual(
    system.monitors.get(ref),
    {monitor: self, monitee: pid}
  )
})
