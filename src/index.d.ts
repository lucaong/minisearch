// Type definitions for MiniSearch

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

export declare interface SearchOptions {
  fields?: string[],

  filter?: (result: SearchResult) => boolean,

  boost?: { [fieldName: string]: number },

  prefix?: boolean
    | ((term: string, index: number, terms: string[]) => boolean),

  fuzzy?: boolean | number 
    | ((term: string, index: number, terms: string[]) => boolean | number),

  combineWith?: string,

  extractField?: (document: object, fieldName: string) => string,

  tokenize?: (text: string) => string[],

  processTerm?: (term: string) => string | null | undefined | false
}

export declare interface Options {
  fields: string[],

  storeFields?: string[],

  idField?: string,

  extractField?: (document: object, fieldName: string) => string,

  tokenize?: (text: string, fieldName: string) => string[],

  processTerm?: (term: string, fieldName: string) => string | null | undefined | false,

  searchOptions?: SearchOptions
}

export declare interface Suggestion {
  suggestion: string,

  score: number
}

export declare interface MatchInfo {
  [term: string]: string[]
}

export declare interface SearchResult {
  id: any,

  score: number,

  match: MatchInfo,

  [key: string]: any
}

export default MiniSearch
