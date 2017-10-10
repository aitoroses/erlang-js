
import {PingPongActorSystem} from './akka/PingPongActorSystem'
import {GetResults, PingPongSupervisor, StartMatch} from './akka/PingPongSupervisor'

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

/**
 * Each second evaluate results
 */
setInterval(async () => {
  console.log(await supervisorRef.ask(new GetResults()))
}, 1000)
