export class Tuple {

  private values: ReadonlyArray<any>

  constructor (...args) {
    this.values = Object.freeze(args)
  }

  get length(): number {
    return this.values.length
  }

  get (index) {
    return this.values[index]
  }

  count () {
    return this.values.length
  }

  [Symbol.iterator] () {
    return this.values[Symbol.iterator]()
  }

  toString () {
    let i, s = ''
    for (i = 0; i < this.values.length; i++) {
      if (s !== '') {
        s += ', '
      }
      s += this.values[i].toString()
    }

    return '{' + s + '}'
  }

  put_elem (index, elem) {
    if (index === this.length) {
      let new_values = this.values.concat([elem])
      return new Tuple(...new_values)
    }

    let new_values = this.values.concat([])
    new_values.splice(index, 0, elem)
    return new Tuple(...new_values)
  }

  remove_elem (index) {
    let new_values = this.values.concat([])
    new_values.splice(index, 1)
    return new Tuple(...new_values)
  }

}
