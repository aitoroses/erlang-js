import { Actor } from '@akka/core'
import { Case, Match } from '@akka/core'

export abstract class PingPongMessage {
}

export class Ping extends PingPongMessage {
}

export class Pong extends PingPongMessage {
}

export class Start extends PingPongMessage {
}

export class GetResult extends PingPongMessage {
}

export type PingPongState = {
  name: string
  touches: number
}

export class PingPongActor extends Actor<PingPongMessage, PingPongState> {

  increment (state: PingPongState) {
    return { ...state, touches: state.touches + 1 }
  }

  /**
   * Initialize the state of this actor with args being passed from the supervisor
   * @param {string} name
   * @returns {PingPongState}
   */
  init (name: string): PingPongState {

    setTimeout(() => {
      console.log((this as any).mailbox.get())
    }, 10000)

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
  receive (msg: PingPongMessage, state: PingPongState): PingPongState {

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
