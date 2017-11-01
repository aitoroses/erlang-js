let ref_counter = -1

export class Reference {

  private id: number
  private ref: Symbol

  constructor () {
    ref_counter = ref_counter + 1
    this.id = ref_counter
    this.ref = Symbol()
  }

  toString () {
    return 'Ref#<0.0.0.' + this.id + '>'
  }
}
