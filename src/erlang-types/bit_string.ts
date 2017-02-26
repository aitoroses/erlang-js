/* tslint:disable */

export class BitString {

  public value: ReadonlyArray<number>

  constructor (...args) {
    this.value = Object.freeze(this.process(args))
  }

  get length(): number {
    return this.value.length
  }

  get bit_size(): number {
    return this.length * 8
  }

  get byte_size(): number {
    return this.length
  }

  get(index: number) {
    return this.value[index]
  }

  count() {
    return this.value.length
  }

  slice(start: number, end?: number) {
    let s = this.value.slice(start, end)
    let ms = s.map((elem) => BitString.integer(elem))
    return new BitString(...ms)
  }

  [Symbol.iterator] () {
    return this.value[Symbol.iterator]()
  }

  toString() {
    let i, s = ''
    for (i = 0; i < this.count(); i++) {
      if (s !== '') {
        s += ', '
      }
      s += this.get(i).toString()
    }

    return '<<' + s + '>>'
  }

  private process(bitStringParts) {
    let processed_values: number[] = []

    let i
    for (i = 0; i < bitStringParts.length; i++) {
      let processed_value = this['process_' + bitStringParts[i].type](bitStringParts[i])

      for (let attr of bitStringParts[i].attributes) {
        processed_value = this['process_' + attr](processed_value)
      }

      processed_values = processed_values.concat(processed_value)
    }

    return processed_values
  }

  private process_integer(value) {
    return value.value
  }

  private process_float(value) {
    if (value.size === 64) {
      return BitString.float64ToBytes(value.value)
    }else if (value.size === 32) {
      return BitString.float32ToBytes(value.value)
    }

    throw new Error('Invalid size for float')
  }

  private process_bitstring (value) {
    return value.value.value
  }

  private process_binary (value) {
    return BitString.toUTF8Array(value.value)
  }

  private process_utf8 (value) {
    return BitString.toUTF8Array(value.value)
  }

  private process_utf16 (value) {
    return BitString.toUTF16Array(value.value)
  }

  private process_utf32 (value) {
    return BitString.toUTF32Array(value.value)
  }

  private process_signed (value) {
    return (new Uint8Array([value]))[0]
  }

  private process_unsigned (value) {
    return value
  }

  private process_native (value) {
    return value
  }

  private process_big (value) {
    return value
  }

  private process_little (value) {
    return value.reverse()
  }

  private process_size (value) {
    return value
  }

  private process_unit (value) {
    return value
  }

  static integer (value) {
    return BitString.wrap(value, { 'type': 'integer', 'unit': 1, 'size': 8 })
  }

  static float (value) {
    return BitString.wrap(value, { 'type': 'float', 'unit': 1, 'size': 64 })
  }

  static bitstring (value) {
    return BitString.wrap(value, { 'type': 'bitstring', 'unit': 1, 'size': value.bit_size })
  }

  static bits (value) {
    return BitString.bitstring(value)
  }

  static binary (value) {
    return BitString.wrap(value, { 'type': 'binary', 'unit': 8, 'size': value.length })
  }

  static bytes (value) {
    return BitString.binary(value)
  }

  static utf8 (value) {
    return BitString.wrap(value, { 'type': 'utf8', 'unit': 1, 'size': value.length  })
  }

  static utf16 (value) {
    return BitString.wrap(value, { 'type': 'utf16', 'unit': 1, 'size': value.length * 2 })
  }

  static utf32 (value) {
    return BitString.wrap(value, { 'type': 'utf32', 'unit': 1, 'size': value.length * 4 })
  }

  static signed (value) {
    return BitString.wrap(value, {}, 'signed')
  }

  static unsigned (value) {
    return BitString.wrap(value, {}, 'unsigned')
  }

  static native (value) {
    return BitString.wrap(value, {}, 'native')
  }

  static big (value) {
    return BitString.wrap(value, {}, 'big')
  }

  static little (value) {
    return BitString.wrap(value, {}, 'little')
  }

  static size (value, count) {
    return BitString.wrap(value, {'size': count})
  }

  static unit (value, count) {
    return BitString.wrap(value, {'unit': count})
  }

  static wrap (value, opt, new_attribute?: string) {
    let the_value = value

    if (!(value instanceof Object)) {
      the_value = {'value': value, 'attributes': []}
    }

    the_value = Object.assign(the_value, opt)

    if (new_attribute) {
      the_value.attributes.push(new_attribute)
    }

    return the_value
  }

  static toUTF8Array (str: string) {
    let utf8: number[] = []
    for (let i = 0; i < str.length; i++) {
      let charcode = str.charCodeAt(i)
      if (charcode < 0x80) {
        utf8.push(charcode)
      }
      else if (charcode < 0x800) {
        utf8.push(0xc0 | (charcode >> 6),
                  0x80 | (charcode & 0x3f))
      }
      else if (charcode < 0xd800 || charcode >= 0xe000) {
        utf8.push(0xe0 | (charcode >> 12),
                  0x80 | ((charcode >> 6) & 0x3f),
                  0x80 | (charcode & 0x3f))
      }
      // surrogate pair
      else {
        i++
        // UTF-16 encodes 0x10000-0x10FFFF by
        // subtracting 0x10000 and splitting the
        // 20 bits of 0x0-0xFFFFF into two halves
        charcode = 0x10000 + (((charcode & 0x3ff) << 10)
                  | (str.charCodeAt(i) & 0x3ff))
        utf8.push(0xf0 | (charcode >> 18),
                  0x80 | ((charcode >> 12) & 0x3f),
                  0x80 | ((charcode >> 6) & 0x3f),
                  0x80 | (charcode & 0x3f))
      }
    }
    return utf8
  }

  static toUTF16Array (str: string) {
    let utf16: number[] = []
    for (let i = 0; i < str.length; i++) {
      let codePoint = <any>str.codePointAt(i)

      if (codePoint <= 255) {
        utf16.push(0)
        utf16.push(codePoint)
      }else{
        utf16.push(((codePoint >> 8) & 0xFF))
        utf16.push((codePoint & 0xFF))
      }
    }
    return utf16
  }


  static toUTF32Array (str: string) {
    let utf32: number[] = []
    for (let i = 0; i < str.length; i++) {
      let codePoint = <any>str.codePointAt(i)

      if (codePoint <= 255) {
        utf32.push(0)
        utf32.push(0)
        utf32.push(0)
        utf32.push(codePoint)
      }else{
        utf32.push(0)
        utf32.push(0)
        utf32.push(((codePoint >> 8) & 0xFF))
        utf32.push((codePoint & 0xFF))
      }
    }
    return utf32
  }

  //http://stackoverflow.com/questions/2003493/javascript-float-from-to-bits
  static float32ToBytes(f: number) {
    let bytes: number[] = []

    let buf = new ArrayBuffer(4);
    (new Float32Array(buf))[0] = f

    let intVersion = (new Uint32Array(buf))[0]

    bytes.push(((intVersion >> 24) & 0xFF))
    bytes.push(((intVersion >> 16) & 0xFF))
    bytes.push(((intVersion >> 8) & 0xFF))
    bytes.push((intVersion & 0xFF))

    return bytes
  }

  static float64ToBytes (f: number) {
    let bytes: number[] = []

    let buf = new ArrayBuffer(8);
    (new Float64Array(buf))[0] = f

    let intVersion1 = (new Uint32Array(buf))[0]
    let intVersion2 = (new Uint32Array(buf))[1]

    bytes.push(((intVersion2 >> 24) & 0xFF))
    bytes.push(((intVersion2 >> 16) & 0xFF))
    bytes.push(((intVersion2 >> 8) & 0xFF))
    bytes.push((intVersion2 & 0xFF))

    bytes.push(((intVersion1 >> 24) & 0xFF))
    bytes.push(((intVersion1 >> 16) & 0xFF))
    bytes.push(((intVersion1 >> 8) & 0xFF))
    bytes.push((intVersion1 & 0xFF))

    return bytes
  }
}
