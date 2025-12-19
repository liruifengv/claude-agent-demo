import * as math from 'mathjs'

export function calculator(expression:string) : string{
  const result = math.evaluate(expression)
  return result.toString()
}