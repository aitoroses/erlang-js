import { Actor } from './Actors'
import { Reference } from './types/reference'
import { ActorSystem } from './ActorSystem'
import { Mailbox } from './Mailbox'

export class ActorRef<Message> {

  constructor (private target: Actor<Message, any>, private system: ActorSystem) {
  }

  ask (message: Message, timeout: number = 5000) {
    if (!this.system.current) {
      throw Error('Only an actor can Ref.ask(...) another actor')
    }

    return new Promise((resolve, reject) => {

      // Prepare an error timeout
      const timeoutId = setTimeout(() => {
        reject('timeout')
      }, timeout)

      // Send a message to the refering actor

      const request = {
        ref: new Reference(),
        sender: this.system.current && this.system.current.getRef(),
        message
      }

      const mailbox: Mailbox = (this.target as any).mailbox
      mailbox.deliver(request)

      const askingMailbox: Mailbox = (this.system.current as any).mailbox
      const subscription = askingMailbox.subscribe((response) => {
        if (response.ref === request.ref) {
          clearTimeout(timeoutId)
          subscription()
          resolve(response.message)
        }
      })
    })
    /*.catch((e) => {
          debugger
        })*/
  }

  respond (response) {
    throw Error(`Cannot respond to message in ${this.target.toString()}`)
  }

  tell (message: Message, ms?: number): void {

    if (!this.system.current) {
      throw Error('Only an actor can Ref.ask(...) another actor')
    }

    const request = {
      sender: this.system.current && this.system.current.getRef(),
      message
    }

    const deliver = () => (this.target as any).mailbox.deliver(request)

    if (ms !== undefined) {
      setTimeout(() => {
        deliver()
      }, ms)
    } else {
      deliver()
    }
  }
}
