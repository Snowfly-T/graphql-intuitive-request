import type { Merge, SimpleMerge, StringKeyOf } from './common';
import type {
  GraphQLEnum,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalar,
  ObjectDefinition,
} from './graphql-types';

type TryResolve<
  T extends StringKeyOf<$>,
  $,
  TOptions extends { resolveScalar?: boolean; treatNullableTypeAsOptional?: boolean },
> = $[T] extends infer TDef
  ? TDef extends ObjectDefinition | string
    ? _Parse<TDef, $, TOptions>
    : TDef extends GraphQLEnum<infer S>
    ? S
    : TDef extends GraphQLScalar<any, infer U>
    ? TOptions['resolveScalar'] extends true
      ? U
      : TDef
    : TDef
  : never;

export type ParseDef<
  TDef,
  $,
  TOptions extends {
    treatNullableTypeAsOptional?: boolean;
    acceptVoid?: boolean;
  } = {},
> = [TOptions['acceptVoid'], TDef] extends [true, 'void']
  ? { type: void; coreType: void; variant: 'SIMPLE' }
  : [_Parse<TDef, $, TOptions>] extends [infer TIntermediateType]
  ? [_Parse<TDef, $, SimpleMerge<TOptions, { ignoreInput: true; resolveScalar: true }>>] extends [
      infer TType,
    ]
    ? [TIntermediateType] extends [Array<infer U> | null]
      ? null extends TIntermediateType
        ? null extends U
          ? { type: TType; coreType: U; variant: 'NULLABLE-LIST-NULLABLE' }
          : { type: TType; coreType: U; variant: 'LIST-NULLABLE' }
        : null extends U
        ? { type: TType; coreType: U; variant: 'NULLABLE-LIST' }
        : { type: TType; coreType: U; variant: 'LIST' }
      : [TIntermediateType] extends [infer U | null]
      ? null extends TIntermediateType
        ? { type: TType; coreType: U; variant: 'SIMPLE-NULLABLE' }
        : { type: TType; coreType: U; variant: 'SIMPLE' }
      : never
    : never
  : never;

type _Parse<
  TDef,
  $,
  TOptions extends {
    ignoreInput?: boolean;
    resolveScalar?: boolean;
    treatNullableTypeAsOptional?: boolean;
  },
> = TDef extends [infer TInput, infer TOutput]
  ? TOptions['ignoreInput'] extends true
    ? _Parse<TOutput, $, TOptions>
    : [
        _Parse<
          TInput,
          $,
          SimpleMerge<TOptions, { resolveScalar: true; treatNullableTypeAsOptional: true }>
        >,
        _Parse<TOutput, $, TOptions>,
      ]
  : TDef extends ObjectDefinition
  ? TOptions['treatNullableTypeAsOptional'] extends true
    ? Merge<
        {
          [P in keyof TDef as P extends `${string}?`
            ? never
            : TDef[P] extends `${string}!`
            ? P
            : never]: _Parse<TDef[P], $, TOptions>;
        },
        {
          [P in keyof TDef as P extends `${infer K}?`
            ? K
            : TDef[P] extends `${string}!`
            ? never
            : P]?: _Parse<TDef[P], $, TOptions>;
        }
      >
    : Merge<
        { [P in keyof TDef as P extends `${string}?` ? never : P]: _Parse<TDef[P], $, TOptions> },
        { [P in keyof TDef as P extends `${infer K}?` ? K : never]?: _Parse<TDef[P], $, TOptions> }
      >
  : TDef extends GraphQLNonNull<infer U extends StringKeyOf<$>>
  ? // HACK: I use this ugly `infer R` instead of just `Exclude<..., null>` because the latter will
    // cause a infinite loop when compiling—I don't know why, but it works.
    TryResolve<U, $, TOptions> extends infer R
    ? R extends U | null
      ? U
      : R
    : never
  : TDef extends StringKeyOf<$>
  ? TryResolve<TDef, $, TOptions> | null
  : TDef extends GraphQLNonNull<GraphQLList<infer U>>
  ? // HACK: I use this ugly `infer R` instead of just `Exclude<..., null>` because the latter will
    // cause a infinite loop when compiling—I don't know why, but it works.
    _Parse<U, $, TOptions>[] extends infer R
    ? R extends U | null
      ? U
      : R
    : never
  : TDef extends GraphQLList<infer U>
  ? _Parse<U, $, TOptions>[] | null
  : TDef extends GraphQLEnum<infer S>
  ? S
  : TOptions['resolveScalar'] extends true
  ? TDef extends GraphQLScalar<any, infer U>
    ? U
    : TDef
  : TDef;
