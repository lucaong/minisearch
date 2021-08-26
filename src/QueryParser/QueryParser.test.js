/* eslint-env jest */

import { expect } from '@jest/globals'
import QueryParser from './QueryParser'

const parser = new QueryParser()

describe('A QueryParser', () => {
  it('parses single words', () => {
    const expression = parser.parse('Hello')

    expect(expression).toEqual({
      type: 'word',
      text: 'Hello'
    })
  })

  it('parses or-ed words', () => {
    const expression = parser.parse('Hello OR World')

    expect(expression).toEqual({
      type: 'or',
      children: [{
        type: 'word',
        text: 'Hello'
      }, {
        type: 'word',
        text: 'World'
      }]
    })
  })

  it('parses and-ed words', () => {
    const expression = parser.parse('Hello AND World')

    expect(expression).toEqual({
      type: 'and',
      children: [{
        type: 'word',
        text: 'Hello'
      }, {
        type: 'word',
        text: 'World'
      }]
    })
  })

  it('implicitly parses or-ed words', () => {
    const expression = parser.parse('Hello World')

    expect(expression).toEqual({
      type: 'or',
      children: [{
        type: 'word',
        text: 'Hello'
      }, {
        type: 'word',
        text: 'World'
      }]
    })
  })

  it('implicitly parses and-ed words', () => {
    const expression = parser.parse('Hello World', {
      implicitAnd: true
    })

    expect(expression).toEqual({
      type: 'and',
      children: [{
        type: 'word',
        text: 'Hello'
      }, {
        type: 'word',
        text: 'World'
      }]
    })
  })

  it('supports term processing', () => {
    const expression = parser.parse('Hello World', {
      implicitAnd: true,
      processTerm(term) {
        return term + '!'
      }
    })

    expect(expression).toEqual({
      type: 'and',
      children: [{
        type: 'word',
        text: 'Hello!'
      }, {
        type: 'word',
        text: 'World!'
      }]
    })
  })

  it('parses strings', () => {
    const expression = parser.parse('Hello AND "World!"')

    expect(expression).toEqual({
      type: 'and',
      children: [{
        type: 'word',
        text: 'Hello'
      }, {
        type: 'exact',
        text: 'World!'
      }]
    })
  })

  it('skips parsing empty strings', () => {
    const expression = parser.parse('Hello AND ""')

    expect(expression).toEqual({
      type: 'word',
      text: 'Hello'
    })
  })

  it('parses nested expressions', () => {
    const expression = parser.parse('a AND (b OR c)')

    expect(expression).toEqual({
      type: 'and',
      children: [{
        type: 'word',
        text: 'a'
      }, {
        type: 'or',
        children: [{
          type: 'word',
          text: 'b'
        }, {
          type: 'word',
          text: 'c'
        }]
      }]
    })
  })
})
