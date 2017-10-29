import {Spec, SupervisorSpec, WorkerSpec} from './Spec'
import {Actor, ActorConstructor, SupervisorActor} from './Actors'
import {ActorRef} from './ActorRef'
import {SupervisionTree} from './SupervisionTree'
import {Zone} from './Zone'
import {Scheduler, GlobalScheduler, ExecutionModel} from 'funfix'
import {ActorZone} from './ActorZone'

export abstract class ActorSystem {

  sender: ActorRef<any>
  current: Actor<any, any> | null
  scheduler: Scheduler = new GlobalScheduler(false, ExecutionModel.synchronous())
  private messageProcessingScheduled: boolean = false
  private props: SupervisionTree

  constructor() {
    Zone.current.fork({
      name: 'ActorSystemZone'
    })
    .run(() => this.initialize())
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

    const checkString = (actorClass: string) => (props: SupervisionTree) => {
      return actorClass === props.name
    }

    const checkClass = (actorClass: ActorConstructor<any>) => (props: SupervisionTree) => {
      return props.instance instanceof actorClass
    }

    const createActorRef = (props: SupervisionTree) => {
      return new ActorRef(props.instance, this)
    }

    const resultingActor =
      this.props.find(checkString(actorClass as string)) ||
      this.props.find(checkClass(actorClass as ActorConstructor<any>))

    if (resultingActor) {
      return createActorRef(resultingActor)
    } else {
      if (typeof actorClass === 'string') {
        throw Error(`Not found an actor called ${actorClass}`)
      } else {
        throw Error(`Not found an actor of type ${actorClass.name}`)
      }
    }
  }

  private subscribeToMessages(actor) {
    actor.mailbox.subscribe(() => {
      if (!this.messageProcessingScheduled) {
        this.scheduler.scheduleOnce(0, () => {
          this.processMessages()
          this.messageProcessingScheduled = false
        })
        this.messageProcessingScheduled = true
      }
    })
  }

  private initializeSupervisorSpec(spec: SupervisorSpec<any>) {
    const props = SupervisionTree.createFromSpec(spec, null, this)
    this.subscribeToMessages(props.instance)

    const children: Spec<any>[] = (props as any).instance.start()

    for (const child of children) {
      if (child.actorClass instanceof SupervisorActor) {
        props.children.push(this.initializeSupervisorSpec(child))
      } else {
        props.children.push(this.initializeWorkerSpec(child, props))
      }
    }

    return props
  }

  private initializeWorkerSpec(spec: WorkerSpec<any>, parent: SupervisionTree) {
    const props = SupervisionTree.createFromSpec(spec, parent, this)
    this.subscribeToMessages(props.instance)
    return props
  }

  private processMessages() {
    const REDUCTIONS_PER_ACTOR = 8
    /**
     * Take every actor messages and run their receive method inside a zone
     */
    this.props.forEach(s => {
      const actor = s.instance
      const messages = (actor as any).mailbox.take(REDUCTIONS_PER_ACTOR)
      messages.forEach(messageConsumable => {
        messageConsumable(({ message, sender, ref }) => {
          const actorZone = new ActorZone(actor, sender, ref)
          Zone.current.fork(actorZone).run(() => {
            const resultState = actor.receive(message, actor.state)
            if (resultState) {
              Promise.resolve(resultState)
                .then(nextState => {
                  Object.freeze(nextState)
                  actor.state = nextState
                })
            }
          })
        })
      })
    })
  }
}
