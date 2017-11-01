import { PingPongActorSystem } from './akka/PingPongActorSystem'
import { PingPongSupervisor, StartMatch } from './akka/PingPongSupervisor'

/**
 * Instantiate the system
 * @type {PingPongActorSystem}
 */
const system = new PingPongActorSystem()

/**
 * Get the Supervisor and call it to Start the match
 * @type {ActorRef<PingPongSMessages>}
 */
let supervisorRef = system.actorOf(PingPongSupervisor)
supervisorRef.tell(new StartMatch())
