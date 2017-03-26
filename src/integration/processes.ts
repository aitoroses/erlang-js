import { system } from '../processes'

let pid1 = system.spawn(function*(){
  while (true) {

    yield system.receive(function(value){
      console.log(value)
    })

    system.send(pid2, 'message from 1')
  }
})

system.register('Sally', pid1)

let pid2 = system.spawn(function*() {

  while (true) {
    system.send('Sally', 'message from 2')

    yield system.receive(function(value){
      console.log(value)
    })
  }
})
