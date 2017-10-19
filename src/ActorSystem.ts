import { Spec, SupervisorSpec, WorkerSpec } from './Spec'
import { Actor, ActorConstructor, SupervisorActor } from './Actors'
import { ProcessSystem } from './processes/process_system'
import { PID } from './types/pid'
import * as States from './processes/states'

export type SupervisionTree = {
  pid: PID
  children: any[]
  instance: Actor<any, any>
}

export class ActorRef<Message> {
  constructor(private pid: PID, private system: ActorSystem) {}

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

  private initializeSupervisorSpec(spec: SupervisorSpec<any>) {
    const self = this
    const {actorClass, args, options} = spec
    const supervisor: SupervisorActor<any, any> = new actorClass()
    supervisor.context = this
    let state = supervisor.init(args)
    Object.freeze(state)

    // Create a proc
    const pid = self.procSystem.spawn_link(function* () {
      while (true) {
        yield self.procSystem.receive(async function (request) {
          try {
            if (request.ref && request.sender && request.message) {
              self.sender = new ActorRef(request.sender, self)
              state = await supervisor.receive(request.message, state)
              self.sender = null
            } else {
              state = await supervisor.receive(request, state)
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

    const children: Spec<any>[] = supervisor.start()

    const props: SupervisionTree = {
      instance: supervisor,
      pid,
      children: []
    }

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
    const self = this
    const {actorClass, args, options} = spec
    const actor: Actor<any, any> = new actorClass()
    actor.context = this
    let state = actor.init(args)

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

    const props: SupervisionTree = {
      instance: actor,
      pid,
      children: []
    }

    return props
  }
}
