import { Actor } from '../../Actors'
import { Case, Match } from '../../match'

export abstract class PingPongMessage {}
export class Ping extends PingPongMessage {}
export class Pong extends PingPongMessage {}
export class Start extends PingPongMessage {}
export class GetResult extends PingPongMessage {}

export type PingPongState = {
  name: string
  touches: number
}

export class PingPongActor extends Actor<PingPongMessage, PingPongState> {

  /**
   * Initialize the state of this actor with args being passed from the supervisor
   * @param {string} name
   * @returns {PingPongState}
   */
  init(name: string): PingPongState {
    return {
      name,
      touches: 0
    }
  }

  increment(state: PingPongState) {
    return { ...state, touches: state.touches + 1 }
  }

  /**
   * Receive ping/pong messages
   * Actors are signaled to start the match
   *
   * @param {PingPongMessage} msg
   * @param {PingPongState} state
   * @returns {PingPongState}
   */
  receive(msg: PingPongMessage, state: PingPongState): PingPongState {

    const isPing = state.name === 'ping'
    const otherPlayer = this.context.actorOf(isPing ? 'pong' : 'ping')

    return Match<PingPongState | void>(
      Case(Start, () => {
        console.log(`${state.name} is starting match`, JSON.stringify(state))
        otherPlayer.tell(isPing ? new Ping() : new Pong())
      }),

      Case(Ping, () => {
        if (!isPing) {
          otherPlayer.tell(new Pong(), 10)
          return this.increment(state)
        }
      }),

      Case(Pong, () => {
        if (isPing) {
          otherPlayer.tell(new Ping(), 10)
          return this.increment(state)
        }
      }),

      Case(GetResult, () => {
        this.context.sender.respond(state.touches)
      })

    )(msg) || state
  }
}
