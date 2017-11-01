import { ActorSystem } from '@akka/core'
import { supervisor, SupervisorSpec } from '@akka/core'
import { PingPongSupervisor } from './PingPongSupervisor'

/**
 * Create an ActorSystem that provides a SupervisionTree with PingPongSupervisor
 */
export class PingPongActorSystem extends ActorSystem {
  start (): SupervisorSpec<any> {
    return supervisor(PingPongSupervisor, { name: 'PingPongSupervisor' })
  }
}