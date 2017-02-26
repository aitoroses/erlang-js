let process_counter = -1

export class PID {

  private id: number

  constructor () {
    process_counter = process_counter + 1
    this.id = process_counter
  }

  toString () {
    return 'PID#<0.' + this.id + '.0>'
  }
}
