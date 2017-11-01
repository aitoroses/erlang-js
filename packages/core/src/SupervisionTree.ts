import { PID } from './types/pid'
import { Actor } from './Actors'
import { Spec } from './Spec'
import { ActorSystem } from './ActorSystem'
import { ActorZone } from './ActorZone'
import { Zone } from '@akka/zone'

export class SupervisionTree {

  public parent: SupervisionTree

  constructor (public name: PID | string,
               public children: SupervisionTree[],
               public instance: Actor<any, any>) {
  }

  static createFromSpec (spec: Spec<any>, parentActor: SupervisionTree | null, actorSystem: ActorSystem) {
    const self = this
    const { actorClass, args, options } = spec
    const actor: Actor<any, any> = new actorClass()
    actor.context = actorSystem
    const actorZone = new ActorZone(actor, null as any)

    // Do actorZone transaction
    Zone.current.fork(actorZone).run(() => {
      let state = actor.init(args)
      Object.freeze(state)
      actor.state = state
    })

    let name = spec.options && spec.options.name || new PID()
    const props = new SupervisionTree(name, [], actor)
    props.parent = parentActor as SupervisionTree
    return props
  }

  filter (predicate) {
    let result: SupervisionTree[] = []
    this.forEach(a => predicate(a) && result.push(a))
    return result
  }

  find (predicate) {
    return this.filter(predicate)[ 0 ]
  }

  forEach (cb: (s: SupervisionTree) => void) {
    cb(this)
    for (let a of this.children) {
      cb(a)
      if (a.children.length) {
        a.forEach(cb)
      }
    }
  }
}
