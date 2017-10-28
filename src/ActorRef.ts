import { PID } from './types/pid'
import { ProcessSystem } from './processes/process_system'
import * as States from './processes/states'
import { ActorSystem } from './ActorSystem'

export class ActorRef<Message> {
  constructor(private pid: PID, private system: ActorSystem) {
  }

  tell(message: Message, ms?: number): void {
    const procSystem: ProcessSystem = (this.system as any).procSystem
    const request = {
      ref: procSystem.make_ref(),
      sender: procSystem.self(),
      message
    }
    if (ms !== undefined) {
      setTimeout(() => {
        procSystem.send(this.pid, request)
      }, ms)
    } else {
      procSystem.send(this.pid, request)
    }
  }

  ask(message: Message, timeout: number = 5000) {
    const system = this.system
    const procSystem: ProcessSystem = (this.system as any).procSystem
    const self = this
    return new Promise((resolve, reject) => {

      // Spawn a listener process
      const taskPid = procSystem.spawn_link(function* () {

        // Prepare an error timeout
        const timeoutId = setTimeout(() => {
          procSystem.exit(States.KILL)
          reject(States.KILL)
        }, timeout)

        // Send a message to the refering actor

        const request = {
          sender: taskPid,
          ref: procSystem.make_ref(),
          message
        }

        procSystem.send(self.pid, request)
        yield procSystem.receive(function (response) {
          resolve(response.message)
          clearTimeout(timeoutId)
          return false
        })
      })

      // Trap exit of child process
      procSystem.trap_exits()
    })
  }
}
