declare module 'bcrypt' {
  export function hash(data: string | Buffer, rounds: number): Promise<string>
  export function compare(data: string | Buffer, encrypted: string | Buffer): Promise<boolean>
  export function genSalt(rounds?: number): Promise<string>
}

declare module 'passport-jwt' {
  export class Strategy {
    constructor(options: any)
  }
  export const ExtractJwt: {
    fromAuthHeaderAsBearerToken(): any
  }
}

declare module 'passport-local' {
  export class Strategy {
    constructor(options?: any)
  }
}
