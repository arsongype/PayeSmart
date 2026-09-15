import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Type,
} from '@nestjs/common'
import { validate } from 'class-validator'
import { plainToClass } from 'class-transformer'

@Injectable()
export class ValidationPipe implements PipeTransform {
  async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    if (!metadata.data || !value) {
      return value
    }

    const object = plainToClass(metadata.metatype as Type<object>, value as object)
    const errors = await validate(object)

    if (errors.length > 0) {
      const validationErrors: Record<string, string[]> = {}
      errors.forEach((error) => {
        const property = error.property
        const constraints = error.constraints ?? {}
        validationErrors[property] = Object.values(constraints)
      })

      throw new BadRequestException({
        message: 'Validation failed',
        errors: Object.entries(validationErrors).map(([property, constraints]) => ({
          property,
          constraints: Object.fromEntries(constraints.map((c, i) => [i.toString(), c])),
        })),
      })
    }

    return value
  }
}
