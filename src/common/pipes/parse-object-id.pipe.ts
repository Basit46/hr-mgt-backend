import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<
  string | undefined,
  string | undefined
> {
  transform(value: string | undefined): string | undefined {
    if (value === undefined || value === '') return value;

    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid id: ${value}`);
    }
    return value;
  }
}
