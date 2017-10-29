/**
 * Specs definition
 */
import { Actor, ActorConstructor } from './Actors'

export type Options = {
  name: string
}

export abstract class Spec<A extends Actor<any, any>> {
  constructor(
    public actorClass: ActorConstructor<A>,
    public args?,
    public options?: Options
  ) {}
}

export class WorkerSpec<A extends Actor<any, any>> extends Spec<A> {}
export class SupervisorSpec<A extends Actor<any, any>> extends Spec<A> {}

export function supervisor<A extends Actor<any, any>>(actorClass: ActorConstructor<A>, args?, options?: Options) {
  return new SupervisorSpec(actorClass, args, options)
}

export function worker(actorClass: ActorConstructor<any>, args?, options?: Options) {
  return new WorkerSpec(actorClass, args, options)
}
