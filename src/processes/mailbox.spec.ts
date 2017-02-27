import { test } from 'ava'
import { Mailbox } from './mailbox'

test('mailbox', t => {
  const m = new Mailbox()
  const message = 'test message'

  t.true(m.get().length === 0)
  t.true(m.isEmpty())
  t.true(message === m.deliver(message))
  t.true(m.get().length === 1)
  t.true(message === m.get()[0])
  t.false(m.isEmpty())
  m.removeAt(0)
  t.true(m.isEmpty())
  t.true(m.get().length === 0)

})
