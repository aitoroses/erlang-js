import { SupervisorActor } from '../../Actors'
import { Spec, worker } from '../../Spec'
import { Case, Match } from '../../match'
import { GetResult, PingPongActor, Start } from './PingPongActor'

export type SupervisorState = {
  name: string
}

export abstract class PingPongSMessages {
}

export class StartMatch extends PingPongSMessages {
}

export class GetResults extends PingPongSMessages {
}

export class PingPongSupervisor extends SupervisorActor<PingPongSMessages, SupervisorState> {

  /**
   * Initialize the state of the supervisor
   * @param {string} name
   * @returns {SupervisorState}
   */
  init (name: string): SupervisorState {

    /**
     * Each second evaluate results
     */
    setInterval(async () => {
      const selfRef = this.getRef()
      console.log(await selfRef.ask(new GetResults()))
    }, 1000)

    return {
      name
    }
  }

  /**
   * Receive a message from the mailbox
   * @param {PingPongSMessages} msg
   * @param {SupervisorState} state
   * @returns {Promise<SupervisorState>}
   */
  async receive (msg: PingPongSMessages, state: SupervisorState) {

    const pingRef: any = this.context.actorOf('ping')
    const pongRef: any = this.context.actorOf('pong')

    Match<any>(
      Case(StartMatch, () => {
        pingRef.tell(new Start())
        console.log('Supervisor started match')
      }),

      Case(GetResults, async (a) => {
        const [ ping, pong ] = await Promise.all([
          pingRef.ask(new GetResult()),
          pongRef.ask(new GetResult())
        ])

        if (true === true) { // tslint:disable-line
          throw Error('BOOOM!!')
        }

        console.log({ ping, pong })
      })
    )(msg)

    return state
  }

  /**
   * Create two worker actor that will play ping/pong
   */
  start (...args): Spec<any>[] {
    return [
      worker(PingPongActor, 'ping', { name: 'ping' }),
      worker(PingPongActor, 'pong', { name: 'pong' })
    ]
  }
}
