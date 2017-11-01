import { test } from 'ava'
import { Zone } from './Zone'

test('current zone is roorZone', t => {
  t.true(Zone.current.name === '<root>')
})

test('Zone can be forked', t => {
  const zoneB = Zone.current.fork({
    name: 'ForkedZone'
  })

  t.true(zoneB.name === 'ForkedZone')
  t.true(zoneB instanceof Zone)
})

test('When a zone runs, zone current is that zone', t => {
  const zoneB = Zone.current.fork({
    name: 'ForkedZone'
  }).run(() => {
    t.true(Zone.current.name === 'ForkedZone', 'Should be named ForkedZone')
  })
})

test.only('Zone inception', t => {
  Zone.current.fork({ name: 'ForkedZone' }).run(() => {
    Zone.current.fork({ name: 'ForkedSecondZone' }).run(() => {
      Zone.current.fork({ name: 'ForkedThirdZone' }).run(() => {
        t.true(Zone.current.name === 'ForkedThirdZone', 'Should be named ForkedSecondZone')
      })
    })
  })
})

test('Zone inception', t => {
  Zone.current.fork({ name: 'ForkedZone' }).run(() => {
    Zone.current.fork({ name: 'ForkedSecondZone' }).run(() => {
      Zone.current.fork({ name: 'ForkedThirdZone' }).run(() => {
        t.true(Zone.current.name === 'ForkedThirdZone', 'Should be named ForkedSecondZone')
      })
    })
  })
})

test('Deep thread', async t => {
  return new Promise((resolve) =>
    Zone.current.fork({ name: 'ForkedZone' }).run(() => {
      setTimeout(() => {

        t.true(Zone.current.name === 'ForkedZone', 'Should be named ForkedSecondZone')
        Zone.current.fork({ name: 'ForkedSecondZone' }).run(() => {
          setTimeout(() => {

            t.true(Zone.current.name === 'ForkedSecondZone', 'Should be named ForkedSecondZone')
            Zone.current.fork({ name: 'ForkedThirdZone' }).run(() => {
              t.true(Zone.current.name === 'ForkedThirdZone', 'Should be named ForkedSecondZone')
              resolve()
            })
          }, 1000)
        })

      }, 1000)
    })
  )
})
