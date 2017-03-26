import { PID, Tuple, Reference } from '../erlang-types'
import { Process, Monitor, Task } from './process'
import { Mailbox } from './mailbox'
import { Scheduler } from './scheduler'
import * as States from './states'

export interface IProcessSystem {
  spawn(fun: Task): PID
  spawn(module: Object, fun: string, args: any[]): PID
  spawn_link(fun: Task): PID
  spawn_link(module: Object, fun: string, args: any[]): PID
  spawn_monitor(fun: Task): [PID, Reference]
  spawn_monitor(module: Object, fun: string, args: any[]): [PID, Reference]
  link(pid: PID): void
  unlink(pid: PID): void
  register(name: string, pid: PID): void
  whereis(name: string): PID | undefined
  unregister(pid): void
  registered(): Array<string>
  pid(): PID
  pidof(pid: PID | Process | string): PID | undefined
  send<T>(pid: PID, msg: T): T
  receive(fun: Task, timeout?: number, timeoutFn?: Function)
  sleep(duration: number)
  exit(reason)
  exit(pid: PID, reason)
  error(reason)
  process_flag(flag: string, value: string)
  process_flag(pid: PID | Process | string, flag: string, value: string)
  put(key: string, value): void
  get(key, default_value?)
  get_process_dict()
  get_keys()
  get_keys(value)
  erase()
  erase(key)
  is_alive(pid: PID)
  make_ref()
  list(): PID[]
  monitor(pid: PID)
  demonitor(ref: Reference)
  self(): PID
}

/**
 * Process System
 */
export class ProcessSystem implements IProcessSystem {

  static DEFAULT_THROTTLE = 5

  public pids = new Map<PID, Process>()
  public mailboxes = new Map<PID, Mailbox>()
  public names = new Map<string, PID>()
  public links = new Map<PID, Set<any>>()
  public monitors = new Map<Reference, Monitor>()
  public suspended = new Map<PID, Function>()

  public current_process: Process | undefined
  public main_process_pid: PID | undefined

  public scheduler = new Scheduler(ProcessSystem.DEFAULT_THROTTLE)

  constructor() {
    let process_system_scope = this

    this.main_process_pid = this.spawn(function* () {
      yield process_system_scope.sleep(Symbol.for('Infinity'))
    })

    this.set_current(this.main_process_pid)
  }

  static * run(fun, args, context?: any) {
    if (fun.constructor.name === 'GeneratorFunction') {
      return yield* fun.apply(context, args)
    } else {
      return yield fun.apply(context, args)
    }
  }

  spawn(...args): PID {
    if (args.length === 1) {
      let fun = args[0]
      return this.add_proc(fun, [], false).pid
    } else if (args.length === 3) {
      let mod = args
    } else {
      throw Error('Incorrect number of arguments')
    }

    return null as any // Compiler undefined skip
  }

  spawn_link(...args): PID {
    if (args.length === 1) {
      let fun = args[0]
      return this.add_proc(fun, [], true, false).pid
    } else if (args.length === 3) {
      let mod = args
    } else {
      throw Error('Incorrect number of arguments')
    }

    return null as any // Compiler undefined skip
  }

  link(pid: PID) {
    let current_pid = this.pid()
    if (current_pid) {
      let current_links = this.links.get(current_pid)
      if (current_links) {
        current_links.add(pid)
      }
      let target_links = this.links.get(pid)
      if (target_links) {
        target_links.add(current_pid)
      }
    }
  }

  unlink(pid: PID) {
    let current_pid = this.pid()
    if (current_pid) {
      let current_links = this.links.get(current_pid)
      if (current_links) {
        current_links.delete(pid)
      }
      let target_links = this.links.get(pid)
      if (target_links) {
        target_links.delete(current_pid)
      }
    }
  }

  spawn_monitor(...args): [PID, Reference] {
    if (args.length === 1) {
      let fun = args[0]
      let process = this.add_proc(fun, [], false, true)
      return [process.pid, process.monitors[0]] as [PID, Reference]
    } else {
      let mod = args[0]
      let fun = args[1]
      let the_args = args[2]
      let process = this.add_proc(mod[fun], the_args, false, true)

      return [process.pid, process.monitors[0]] as [PID, Reference]
    }
  }

  schedule(task: Function, pid?: PID) {
    const the_pid = pid != null ? pid : this.current_process && this.current_process.pid as PID
    if (the_pid) {
      this.scheduler.schedule(the_pid, task)
    }
  }

  set_current(id) {
    let pid = this.pidof(id)
    if (pid !== undefined) {
      this.current_process = this.pids.get(pid)
      if (this.current_process) {
        this.current_process.status = States.RUNNING
      }
    }
  }

  add_proc(fun: Task, args: any[], linked: boolean, monitored?: boolean): Process {
    let newpid = new PID()
    let mailbox = new Mailbox()
    let newproc = new Process(newpid, fun, args, mailbox, this)

    this.pids.set(newpid, newproc)
    this.mailboxes.set(newpid, mailbox)
    this.links.set(newpid, new Set())

    if (linked) {
      this.link(newpid)
    }

    if (monitored) {
      this.monitor(newpid)
    }

    newproc.start()
    return newproc
  }

  remove_proc(pid, exitreason) {
    this.pids.delete(pid)
    this.unregister(pid)
    this.scheduler.removePid(pid)

    if (this.links.has(pid)) {
      let linkSet: Set<any> = this.links.get(pid) as any
      for (let linkpid of linkSet) {
        this.exit(linkpid, exitreason)
        if (this.links.get(linkpid)) {
          (this.links.get(linkpid) as any).delete(pid)
        }
      }

      this.links.delete(pid)
    }
  }

  monitor(pid: PID): Reference {
    const real_pid = this.pidof(pid)
    const ref = this.make_ref()

    if (this.current_process) {
      if (real_pid) {
        this.monitors.set(ref, {
          monitor: this.current_process.pid,
          monitee: real_pid
        })
        let proc = this.pids.get(real_pid)
        if (proc) {
          proc.monitors.push(ref)
        }
      } else {
        this.send(this.current_process.pid, new Tuple(
          'DOWN', ref, pid, real_pid, Symbol.for('noproc')))
      }

    } else {
      throw Error(`There's no current process`)
    }

    return ref
  }

  demonitor(ref) {
    if (this.monitors.has(ref)) {
      this.monitors.delete(ref)
      return true
    }

    return false
  }

  exit(one: PID | any, two?: any) {
    let pid: PID = null as any
    let reason: any = null as any
    let process: Process = null as any

    if (two) {
      pid = one
      reason = two
      process = this.pids.get(this.pidof(pid) as any) as any

      if (!process) { return }

      if (process.is_trapping_exits() && (reason === States.KILL || reason === States.NORMAL)) {
        let mailbox: Mailbox = this.mailboxes.get(process.pid) as any
        mailbox.deliver(new Tuple(States.EXIT, this.pid() /* from */, reason))

      } else {
        process && process.signal(reason)
      }

    } else {
      if (this.current_process) {
        pid = this.current_process.pid
        reason = one as string
        process = this.current_process

        process.signal(reason)
      }
    }

    // Monitors
    for (let ref in process.monitors) {
      let mons = this.monitors.get(ref as any)
      if (mons) {
        this.send(mons.monitor, new Tuple(
          'DOWN', ref, mons['monitee'], reason))
      }
    }
  }

  pid(): PID {
    return this.current_process && this.current_process.pid as any
  }

  pidof(id: PID | Process | string): PID | undefined {
    if (id instanceof PID) {
      return this.pids.has(id) ? id : undefined
    } else if (id instanceof Process) {
      return id.pid
    } else {
      let pid = this.whereis(id)
      if (pid === null) {
        throw (`Process name not registered: ${id} (${typeof id})`)
      }
      return pid
    }
  }

  whereis(name: string): PID | undefined {
    return this.names.has(name) ? this.names.get(name) : undefined
  }

  send(id: PID | Process | string, msg) {
    const pid = this.pidof(id)

    if (pid) {
      (this.mailboxes.get(pid) as any).deliver(msg)

      if (this.suspended.has(pid)) {
        let task: Function = this.suspended.get(pid) as any
        this.suspended.delete(pid)
        this.schedule(task, pid)
      }
    }
  }

  receive(fun: Function, timeout = 0, timeoutFn = () => true) {
    let DateTimeout: number | null = null

    if (timeout === 0 || timeout === Infinity) {
      DateTimeout = null
    } else {
      DateTimeout = Date.now() + timeout
    }

    return [
      States.RECEIVE,
      fun,
      DateTimeout,
      timeoutFn
    ]
  }

  sleep(duration) {
    return [States.SLEEP, duration]
  }

  suspend(fun: Function) {
    if (this.current_process) {
      this.current_process.status = States.SUSPENDED
      this.suspended.set(this.current_process.pid, fun)
    }
  }

  delay(fun: Function, time: number) {
    if (this.current_process) {
      this.current_process.status = States.SLEEPING
      if (Number.isInteger(time)) {
        this.scheduler.scheduleFuture(this.current_process.pid, time, fun)
      }
    }
  }

  trap_exits() {
    if (this.current_process) {
      this.current_process.process_flag(Symbol.for('trap_exit'), true)
    }
  }

  make_ref() {
    return new Reference()
  }

  register(name: string, pid: PID) {
    if (!this.names.has(name)) {
      this.names.set(name, pid)
    } else {
      throw Error('Name is already registered to another process')
    }
  }

  unregister(pid: PID) {
    for (let name of this.names.keys()) {
      if (this.names.has(name) && this.names.get(name) === pid) {
        this.names.delete(name)
      }
    }
  }

  registered() {
    let names: string[] = []
    for (let name of this.names.keys()) {
      names.push(name)
    }
    return names
  }

  process_flag(...args) {
    if (!this.current_process) {
      throw Error(`No current process.`)
    }

    if (args.length === 2) {
      const flag = args[0]
      const value = args[1]
      return this.current_process.process_flag(flag, value)

    } else {
      const pid = this.pidof(args[0])

      if (!pid) {
        throw Error('No process to be flagged')
      }

      const flag = args[1]
      const value = args[2]
      let proc = this.pids.get(pid)

      if (proc) {
        return proc.process_flag(flag, value)
      } else {
        throw Error(`There is no named process ${args[0]}`)
      }
    }
  }

  put(key, value) {
    if (this.current_process) {
      this.current_process.dict[key] = value
    }
  }

  get_process_dict() {
    if (this.current_process) {
      return this.current_process.dict
    }
  }

  get(key, default_value?) {
    if (this.current_process) {
      if (key in this.current_process.dict) {
        return this.current_process.dict[key]
      } else {
        return default_value
      }
    }
  }

  get_keys(value?) {
    if (value && this.current_process) {
      let keys: string[] = []

      for (let key of Object.keys(this.current_process.dict)) {
        if (this.current_process.dict[key] === value) {
          keys.push(key)
        }
      }

      return keys
    }

    return this.current_process ? Object.keys(this.current_process.dict) : []
  }

  erase(key?) {
    if (this.current_process) {
      if (key != null) {
        delete this.current_process.dict[key]
      } else {
        this.current_process.dict = {}
      }
    }
  }

  is_alive(pid) {
    const real_pid = this.pidof(pid)
    return real_pid != null
  }

  list() {
    return Array.from(this.pids.keys())
  }

  self(): PID {
    if (this.current_process) {
      return this.current_process.pid
    } else {
      return null as any
    }
  }

  error(reason) {
    if (this.current_process) {
      this.current_process.signal(reason)
    }
  }
}
