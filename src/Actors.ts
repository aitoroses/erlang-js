import { ActorSystem } from './ActorSystem'
import { Spec } from './Spec'
import { Mailbox } from './Mailbox'
import { ActorRef } from './ActorRef'
import { PID } from './types/pid'

export type Constructor<A> = {
  new(...args): A
}

export type ActorConstructor<A extends Actor<any, any>> = Constructor<A>

export abstract class Actor<Message, State> {
  context: ActorSystem
  state: State
  private mailbox = new Mailbox()
  private pid = new PID()
  abstract receive(msg: Message, state: State)
  abstract init(...args): State

  getRef() {
    return new ActorRef(this, this.context)
  }
}

export abstract class SupervisorActor<Message, State> extends Actor<Message, State> {
  abstract start(...args): Spec<any>[]
}
