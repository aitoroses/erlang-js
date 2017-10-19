import { test } from 'ava'
import { Tuple } from './tuple'

test('constructor', (t) => {

  let pair = new Tuple(':ok', 'message')

  t.true(pair.length === 2)
  t.true(pair.count() === 2)

})

test('index accessing', (t) => {

  let pair = new Tuple(':ok', 'message')
  t.true(pair.get(1) === 'message')

})

test('adding elements', (t) => {

  let pair = new Tuple(':ok', 'message')
  let three = pair.put_elem(1, 'otherMessage')

  t.true( three !== pair )
  t.true( three.length === 3 )
  t.true( three.get(0) === ':ok' )
  t.true( three.get(1) === 'otherMessage' )
  t.true( three.get(2) === 'message' )

})

test('adding elements at the end', (t) => {

  let pair = new Tuple(':ok', 'message')
  let three = pair.put_elem(pair.length, 'otherMessage')

  t.true( three !== pair )
  t.true( three.length === 3 )
  t.true( three.get(0) === ':ok' )
  t.true( three.get(1) === 'message' )
  t.true( three.get(2) === 'otherMessage' )
})

test('removing elements', (t) => {

  let pair = new Tuple(':ok', 'message')
  let three = pair.put_elem(pair.length, 'otherMessage')

  pair = three.remove_elem(0)
  t.true( pair !== three )
  t.true( pair.length === 2 )
  t.true( pair.get(0) === 'message' )
  t.true( pair.get(1) === 'otherMessage' )
})

test('iterate elements', (t) => {

  let pair = new Tuple(':ok', 'message')
  let three = pair.put_elem(pair.length, 'otherMessage')

  let i = 0
  for (let elem of three) {
    i++
  }

  t.true(i === three.length)

})

test('toString', (t) => {
  let pair = new Tuple(':ok', 'message')
  let three = pair.put_elem(pair.length, 'otherMessage')

  t.true(`${pair}` === '{:ok, message}')
  t.true(`${three}` === '{:ok, message, otherMessage}')
})
