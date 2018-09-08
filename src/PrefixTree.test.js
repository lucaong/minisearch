/* eslint-env jest */

import PrefixTree from './PrefixTree.js'
import { behavesLikeSearchableMap } from './SearchableMap.behavior.js'

behavesLikeSearchableMap('PrefixTree', PrefixTree)
