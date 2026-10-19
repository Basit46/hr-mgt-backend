import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'node:path';
import { UserType } from '../common/enums/user-type.enum';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { StorageService, type StoredFile } from './storage.service';
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  FALLBACK_MIME_TYPE,
  FOLDER_BY_ROLE,
  MAX_FILE_SIZE_BYTES,
} from './upload.constants';

type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

function fileFilter(
  _req: unknown,
  file: Express.Multer.File,
  callback: FileFilterCallback,
): void {
  const extension = extname(file.originalname).toLowerCase();
  const mimeAllowed = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const extensionAllowed = ALLOWED_EXTENSIONS.includes(extension);
  const genericMime = file.mimetype === FALLBACK_MIME_TYPE;

  if (!mimeAllowed && !(genericMime && extensionAllowed)) {
    callback(
      new BadRequestException(
        `Unsupported file type: ${file.originalname}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      ),
      false,
    );
    return;
  }

  callback(null, true);
}

@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.ADMIN, UserType.EMPLOYEE)
export class UploadsController {
  constructor(private readonly storageService: StorageService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1, fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter,
    }),
  )
  @ResponseMessage('File uploaded successfully')
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<StoredFile> {
    if (!file) {
      throw new BadRequestException(
        'A file is required under the "file" field',
      );
    }

    const folder =
      currentUser.user_type === UserType.ADMIN
        ? FOLDER_BY_ROLE.admin
        : FOLDER_BY_ROLE.employee;

    return this.storageService.upload(file, folder);
  }
}
