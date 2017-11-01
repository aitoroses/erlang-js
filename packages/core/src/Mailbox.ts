export class Observable {
  private subscribers: any[] = []

  next (v) {
    this.subscribers.forEach(cb => cb(v))
  }

  subscribe (cb) {
    this.subscribers.push(cb)
    return () => this.subscribers.splice(this.subscribers.indexOf(cb), 1)
  }
}

export class Mailbox extends Observable {

  private messages: any[] = []

  deliver (message) {
    this.messages.push(message)
    this.next(message)
    return message
  }

  get () {
    return this.messages
  }

  isEmpty () {
    return this.messages.length === 0
  }

  removeAt (index) {
    this.messages.splice(index, 1)
  }

  take (n: number) {
    let result: Function[] = []
    for (let i = 0; i < n; i++) {
      if (!this.isEmpty() && this.messages.length > i) {
        let index = i
        let message = Object.assign({}, this.messages[ i ])
        result.push(f => {
          f(message)
          this.removeAt(index)
        })
      } else {
        return result
      }
    }
    return result
  }
}
