import { ActorSystem } from '../../ActorSystem'
import { supervisor, SupervisorSpec } from '../../Spec'
import { PingPongSupervisor } from '../akka/PingPongSupervisor'

/**
 * Create an ActorSystem that provides a SupervisionTree with PingPongSupervisor
 */
export class PingPongActorSystem extends ActorSystem {
  start(): SupervisorSpec<any> {
    return supervisor(PingPongSupervisor, {name: 'PingPongSupervisor'})
  }
}
