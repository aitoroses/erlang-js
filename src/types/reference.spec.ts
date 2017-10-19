import { test } from 'ava'
import { Reference } from './reference'

test('Reference is converted to string ', (t) => {
  t.true(`${new Reference()}` === 'Ref#<0.0.0.0>')
  t.true(`${new Reference()}` === 'Ref#<0.0.0.1>')
  t.true(`${new Reference()}` === 'Ref#<0.0.0.2>')
})
