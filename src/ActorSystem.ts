import { Spec, SupervisorSpec, WorkerSpec } from './Spec'
import { Actor, ActorConstructor, SupervisorActor } from './Actors'
import { ProcessSystem } from './processes/process_system'
import * as States from './processes/states'
import { ActorRef } from './ActorRef'
import { SupervisionTree } from './SupervisionTree'

export abstract class ActorSystem {

  sender: ActorRef<any> | null
  private procSystem: ProcessSystem = new ProcessSystem()
  private props: SupervisionTree

  constructor() {
    this.initialize()
  }

  abstract start(): SupervisorSpec<any>

  initialize() {
    this.props = this.initializeSupervisorSpec(this.start())
  }

  actorOf<Message, A extends Actor<Message, any>>(actorClass: ActorConstructor<Actor<Message, any>> | string): ActorRef<Message> {

    const self = this

    if (!this.props) {
      throw Error('ActorSystem is not initialized.')
    }

    const go = (checkerFn: Function, actorClass: ActorConstructor<any> | string, node: SupervisionTree, isRoot: boolean) => {
      if (checkerFn(actorClass, node)) {
        return createActorRef(node)
      } else {
        for (const child of node.children) {
          const props = go(checkerFn, actorClass, child, false)
          if (props) {
            return createActorRef(props)
          }
        }

        if (isRoot) {
          if (typeof actorClass === 'string') {
            throw Error(`Not found an actor called ${actorClass}`)
          } else {
            throw Error(`Not found an actor of type ${actorClass.name}`)
          }
        }
      }
    }

    function checkString(actorClass: string, props: SupervisionTree) {
      const pid = self.procSystem.pidof(actorClass)
      return pid === props.pid
    }

    function checkClass(actorClass: ActorConstructor<any>, props: SupervisionTree) {
      return props.instance instanceof actorClass
    }

    const createActorRef = (props: SupervisionTree) => {
      return new ActorRef(props.pid, this)
    }

    return go(typeof actorClass === 'string' ? checkString : checkClass, actorClass, this.props, true)
  }

  private initializeSpec(spec: Spec<any>): SupervisionTree {
    const self = this
    const {actorClass, args, options} = spec
    const actor: Actor<any, any> = new actorClass()
    actor.context = this
    let state = actor.init(args)
    Object.freeze(state)

    // Create a proc
    const pid = self.procSystem.spawn_link(function* () {
      while (true) {
        yield self.procSystem.receive(async function (request) {
          try {
            if (request.ref && request.sender && request.message) {
              self.sender = new ActorRef(request.sender, self)
              state = await actor.receive(request.message, state)
              self.sender = null
            } else {
              state = await actor.receive(request, state)
            }
            Object.freeze(state)
          } catch (e) {
            const messageKind = Object.getPrototypeOf(request.message).constructor.name
            const message = JSON.stringify(request.message)
            console.error(`${spec.actorClass.name} failed to receive message from inbox ${messageKind} ${message}`)
            console.error(e)
            self.procSystem.exit(pid, States.KILL)
          }
        })
      }
    })

    if (spec.options && spec.options.name) {
      this.procSystem.register(spec.options.name, pid)
    }

    return new SupervisionTree(pid, [], actor)
  }

  private initializeSupervisorSpec(spec: SupervisorSpec<any>) {
    const props = this.initializeSpec(spec)

    const children: Spec<any>[] = (props as any).instance.start()

    for (const child of children) {
      if (child.actorClass instanceof SupervisorActor) {
        props.children.push(this.initializeSupervisorSpec(child))
      } else {
        props.children.push(this.initializeWorkerSpec(child))
      }
    }

    return props
  }

  private initializeWorkerSpec(spec: WorkerSpec<any>) {
    return this.initializeSpec(spec)
  }
}
