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
    const nextState = () => ({...state, touches: state.touches + 1})

    return Match<PingPongState | void>(
      Case(Start, () => {
        console.log(`${state.name} is starting match`, JSON.stringify(state))
        otherPlayer.tell(isPing ? new Ping() : new Pong())
      }),

      Case(Ping, () => {
        if (!isPing) {
          otherPlayer.tell(new Pong())
          return nextState()
        }
      }),

      Case(Pong, () => {
        if (isPing) {
          otherPlayer.tell(new Ping())
          return nextState()
        }
      }),

      Case(GetResult, () => {
        if (this.context.sender) {
          this.context.sender.tell(state.touches)
        }
      })
    )(msg) || state
  }
}
