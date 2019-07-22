// Type definitions for MiniSearch

export as namespace MiniSearch;
export = MiniSearch;

declare class MiniSearch {
    constructor(options: Options);

    documentCount: number;

    add(document: object): void;

    addAll(documents: object[]): void;

    addAllAsync(documents: object[], options?: { chunkSize?: number }): Promise<undefined>;

    autoSuggest(query: string, options?: SearchOptions): Suggestion[];

    remove(document: object): void;

    search(query: string, options?: SearchOptions): SearchResult[];

    toJSON(): object;

    static getDefault(optionName: string): any;

    static loadJSON(json: string, options: Options): MiniSearch;
}

interface SearchOptions {
  fields?: string[],

  boost?: { [fieldName: string]: number },

  prefix?: boolean
    | ((term: string, index: number, terms: string[]) => boolean),

  fuzzy?: boolean
    | ((term: string, index: number, terms: string[]) => boolean | number),

  combineWith?: string,

  extractField?: (document: object, fieldName: string) => string,

  tokenize?: (text: string) => string[],

  processTerm?: (term: string) => string | null | undefined | false
}

interface Options {
  fields: string[],

  idField?: string,

  extractField?: (document: object, fieldName: string) => string,

  tokenize?: (text: string, fieldName: string) => string[],

  processTerm?: (term: string, fieldName: string) => string | null | undefined | false,

  searchOptions?: SearchOptions
}

interface Suggestion {
  suggestion: string,

  score: number
}

interface MatchInfo {
  [term: string]: string[]
}

interface SearchResult {
  id: any,

  score: number,

  match: MatchInfo
}
