import { PID } from '../erlang-types'

export type Generator = () => IterableIterator<any>

export type Task = Generator

class ProcessQueue {

  private pid: PID
  private tasks: Task[]

  constructor(pid: PID) {
    this.pid = pid
    this.tasks = []
  }

  empty() {
    return this.tasks.length === 0
  }

  add(task: Task) {
    this.tasks.push(task)
  }

  next(): Task | undefined {
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

  removePid(pid: PID) {
    this.isRunning = true
    this.queues.delete(pid)
    this.isRunning = false
  }

  addToQueue(pid: PID, task: Task) {
    if (!this.queues.has(pid)) {
      this.queues.set(pid, new ProcessQueue(pid))
    }
  }

  run() {
    if (this.isRunning) {
      this.invokeLater(() => this.run())
    } else {
      for (let [pid, queue] of this.queues) {
        let reductions = 0
        while (queue && !queue.empty && reductions < this.reductions_per_process) {
          let task = queue.next()
          this.isRunning = true

          let result

          try {
            result = task && task()
          } catch (e) {
            console.error(e)
            result = e
          }

          if (result instanceof Error) {
            throw result
          }

          reductions++
        }
      }
    }

    this.invokeLater(() => this.run())
  }

  addToScheduler(pid: PID, task: Task, dueTime = 0) {
    const addIt = () => this.addToQueue(pid, task)

    if (dueTime === 0) {
      this.invokeLater(addIt)
    } else {
      setTimeout(addIt, dueTime)
    }
  }

  schedule(pid: PID, task: Task) {
    this.addToScheduler(pid, () => task())
  }

  scheduleFuture(pid: PID, dueTime: number, task: Task) {
    this.addToScheduler(pid, () => task(), dueTime)
  }

}
