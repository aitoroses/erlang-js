import {ActorSystem} from '../../akka/ActorSystem'
import {supervisor, SupervisorSpec} from '../../akka/Spec'
import {PingPongSupervisor} from '../akka/PingPongSupervisor'

/**
 * Create an ActorSystem that provides a SupervisionTree with PingPongSupervisor
 */
export class PingPongActorSystem extends ActorSystem {
  start(): SupervisorSpec<any> {
    return supervisor(PingPongSupervisor, {name: 'PingPongSupervisor'})
  }
}
