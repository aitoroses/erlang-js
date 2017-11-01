import { Zone, ZoneDelegate, ZoneSpec } from '@akka/zone'
import { Actor } from './Actors'
import { ActorRef } from './ActorRef'
import { Reference } from './types/reference'

export class ActorZone implements ZoneSpec {

  name = 'ActorZone'
  saveCurrent: Actor<any, any> | null
  saveRespond: Function | null
  saveSender: ActorRef<any> | null

  constructor (private currentActor: Actor<any, any>,
               private senderRef: ActorRef<any>,
               private ref?: Reference) {
  }

  onAfterTask () {
    // Restore state
    this.currentActor.context.current = this.saveCurrent
    this.currentActor.context.sender = this.saveSender as any
    this.saveCurrent = null
    this.saveSender = null
  }

  onBeforeTask () {
    // Store current state
    this.saveSender = this.currentActor.context.sender
    this.saveCurrent = this.currentActor
    this.saveRespond = this.saveSender && this.saveSender.respond

    // Setup context for zone tasks
    this.currentActor.context.sender = this.senderRef

    // If it's a message with a ref, reimplement the respond function
    if (this.ref) {
      const actorRef = (this.currentActor.context.current as any).getRef()
      const responseRef = this.ref
      this.currentActor.context.sender.respond = function (response) {
        this.target.mailbox.deliver({
          ref: responseRef,
          sender: actorRef,
          message: response
        })
      }
    }

    this.currentActor.context.current = this.currentActor
  }

  onHandleError (parentZoneDelegate: ZoneDelegate, parentZone: Zone, targetZone: Zone, delegate: Function, source: any[], error: Error) {
    debugger
  }
}
