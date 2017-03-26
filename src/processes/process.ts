import { Mailbox } from './mailbox'
import { ProcessSystem } from './process_system'
import * as States from './states'
import { PID, Reference } from '../erlang-types'

export type Monitor = {
  monitor: PID
  monitee: PID
}

export type Task = () => IterableIterator<any>

function is_sleep(value) {
  return Array.isArray(value) && value[0] === States.SLEEP
}

function is_receive(value) {
  return Array.isArray(value) && value[0] === States.RECEIVE
}

function receive_timed_out(value) {
  return value[2] != null && value[2] < Date.now()
}

export class Process {

  public pid: PID
  public func: Task
  public args: any[]
  public mailbox: Mailbox
  public system: ProcessSystem
  public status: Symbol
  public dict: Object
  public flags: Object
  public monitors: Array<Reference>

  constructor(pid: PID, func: Task, args: any[], mailbox: Mailbox, system: ProcessSystem) {
    this.pid = pid
    this.func = func
    this.args = args
    this.mailbox = mailbox
    this.system = system
    this.status = States.STOPPED
    this.dict = {}
    this.flags = {}
    this.monitors = []
  }

  start() {
    const function_scope = this
    let machine = this.main()

    this.system.schedule(function() {
      function_scope.system.set_current(function_scope.pid)
      function_scope.run(machine, machine.next())
    }, this.pid)

  }

  *main() {
    let retval = States.NORMAL

    try {
      yield* this.func.apply(null, this.args)
    } catch (e) {
      console.error(e)
      retval = e
    }

    this.system.exit(retval as any)
  }

  process_flag(flag, value) {
    const old_value = this.flags[flag]
    this.flags[flag] = value
    return old_value
  }

  is_trapping_exits() {
    return this.flags[Symbol.for('trap_exit')] && this.flags[Symbol.for('trap_exit')] === true
  }

  signal(reason) {
    if (reason !== States.NORMAL) {
      this.system.schedule(() => {
        console.error(`
        Error: Process ${this.pid} signaled with reason ${reason.toString()}
        Origin PID: ${this.system.self()}`)
      })
    }

    this.system.remove_proc(this.pid, reason)
  }

  receive(fun) {
    let value = States.NOMATCH
    let messages = this.mailbox.get()

    for (let i = 0; i < messages.length; i++) {
      try {
        value = fun(messages[i])
        if (value !== States.NOMATCH) {
          this.mailbox.removeAt(i)
          break
        }
      } catch (e) {
        if (e.constructor.name !== 'MatchError') {
          this.system.exit(e)
        }
      }
    }

    return value
  }

  run(machine: IterableIterator<any>, step: IteratorResult<any>) {
    const function_scope = this

    if (!step.done) {
      let value = step.value

      if (is_sleep(value)) {

        this.system.delay(function() {
          function_scope.system.set_current(function_scope.pid)
          function_scope.run(machine, machine.next())
        }, value[1])

      } else if (is_receive(value) && receive_timed_out(value)) {

        let result = value[3]

        this.system.schedule(function() {
          function_scope.system.set_current(function_scope.pid)
          function_scope.run(machine, machine.next(result))
        })

      } else if (is_receive(value)) {

        let result = function_scope.receive(value[1])

        if (result === States.NOMATCH) {
          this.system.suspend(function() {
            function_scope.system.set_current(function_scope.pid)
            function_scope.run(machine, step)
          })
        } else {
          this.system.schedule(function() {
            function_scope.system.set_current(function_scope.pid)
            function_scope.run(machine, machine.next())
          })
        }
      }
    }
  }
}
