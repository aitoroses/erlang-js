import { ProcessSystem } from '../processes'

const system = new ProcessSystem()

const pid1 = system.spawn(function*(){
  while (true) {

    yield system.receive(function(value){
      return console.log(value)
    })

    system.send(pid2, 'PING')
  }
})

system.register('Sally', pid1)

const pid2 = system.spawn(function*() {

  while (true) {
    system.send('Sally', 'PONG')

    yield system.receive(function(value){
      return console.log(value)
    })
  }
})
