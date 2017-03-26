import { PID } from '../erlang-types'
import { Logger } from './logger'

class ProcessQueue {

  private pid: PID
  private tasks: Function[]

  constructor(pid: PID) {
    this.pid = pid
    this.tasks = []
  }

  empty() {
    return this.tasks.length === 0
  }

  add(task: Function) {
    this.tasks.push(task)
  }

  next(): Function | undefined {
    return this.tasks.shift()
  }
}

export class Scheduler {

  public invokeLater: (callback) => void

  private isRunning = false
  private queues = new Map<PID, ProcessQueue>()

  constructor(throttle = 0, private reductions_per_process = 8) {
    this.invokeLater = (callback) => setTimeout(callback, throttle)
    this.run()
  }

  addToQueue(pid: PID, task: Function) {
    if (!this.queues.has(pid)) {
      this.queues.set(pid, new ProcessQueue(pid))
    }

    let queue = this.queues.get(pid)
    if (queue) {
      queue.add(task)
    }
  }

  removePid(pid: PID) {
    this.isRunning = true
    this.queues.delete(pid)
    this.isRunning = false
  }

  run() {
    if (this.isRunning) {
      this.invokeLater(() => this.run())
    } else {
      for (let [pid, queue] of this.queues) {
        let reductions = 0
        while (queue && !queue.empty() && reductions < this.reductions_per_process) {
          let task = queue.next()
          this.isRunning = true

          let result

          try {
            result = task && task()
          } catch (e) {
            Logger.error(e)
            result = e
          }

          this.isRunning = false

          if (result instanceof Error) {
            throw result
          }

          reductions++
        }
      }
    }

    this.invokeLater(() => this.run())
  }

  schedule(pid: PID, task: Function) {
    this.addToScheduler(pid, () => task())
  }

  scheduleFuture(pid: PID, dueTime: number, task: Function) {
    this.addToScheduler(pid, () => task(), dueTime)
  }

  private addToScheduler(pid: PID, task: Function, dueTime = 0) {
    const addIt = () => this.addToQueue(pid, task)

    if (dueTime === 0) {
      this.invokeLater(addIt)
    } else {
      setTimeout(addIt, dueTime)
    }
  }

}
