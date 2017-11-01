export type Case<A, B> = {
  ctor: { new(...args): A }
  fn(a: A): B
}

export function Case<A, B> (ctor: { new(...args): A }, fn: (A) => B): Case<A, B> {
  return { ctor, fn }
}

export function Match<B> (...clauses: Case<any, B>[]) {
  return function (value): B {
    for (let i = 0; i < clauses.length; i++) {
      if (value instanceof clauses[ i ].ctor) {
        return clauses[ i ].fn(value)
      }
    }

    return null as any
  }
}
