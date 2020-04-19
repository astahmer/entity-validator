export const isPromise = <T = any>(p: any): p is Promise<T> =>
    p !== null && typeof p === "object" && typeof p.then === "function";

// Original types from https://github.com/typeorm/typeorm/

/**
 * Represents some Type of the Object.
 */
export declare type ObjectType<T> =
    | {
          new (): T;
      }
    | Function;

/**
 * Interface of the simple literal object with any string keys.
 */
export interface ObjectLiteral {
    [key: string]: any;
}
