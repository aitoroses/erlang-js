import {ActorRef, ActorSystem} from './ActorSystem'
import { Spec } from './Spec'

export type Constructor<A> = {
  new(...args): A
}

export type ActorConstructor<A extends Actor<any, any>> = Constructor<A>

export abstract class Actor<Message, State> {
  context: ActorSystem
  abstract receive(msg: Message, state: State)
  abstract init(...args): State
}

export abstract class SupervisorActor<Message, State> extends Actor<Message, State> {
  abstract start(...args): Spec<any>[]
}
