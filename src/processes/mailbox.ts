export class Mailbox {

  private messages: any[] = []

  deliver(message) {
    this.messages.push(message)
    return message
  }

  get() {
    return this.messages
  }

  isEmpty() {
    return this.messages.length === 0
  }

  removeAt(index) {
    this.messages.splice(index, 1)
  }
}
