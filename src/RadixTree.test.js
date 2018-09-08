/* eslint-env jest */

import RadixTree from './RadixTree.js'
import { behavesLikeSearchableMap } from './SearchableMap.behavior.js'

behavesLikeSearchableMap('PrefixTree', RadixTree)
