import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomInt } from 'crypto';
import { UserType } from '../common/enums/user-type.enum';
import { User, UserDocument } from './schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { MailService } from '../mail/mail.service';
import { buildVerificationCodeEmail } from '../mail/templates/verification-code.template';
import { buildResetCodeEmail } from '../mail/templates/reset-code.template';

export const VERIFICATION_CODE_TTL_MS = 2 * 60 * 60 * 1000;
export const RESET_CODE_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly mailService: MailService,
  ) {}

  async create(registerDto: RegisterDto): Promise<UserDocument> {
    const existing = await this.userModel
      .findOne({ email: registerDto.email })
      .exec();

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    try {
      const user = new this.userModel({ ...registerDto });
      return await user.save();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException('Email already registered');
      }

      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email })
      .select(
        '+password +verification_code +verification_code_expires_at +reset_code +reset_code_expires_at',
      )
      .exec();
  }

  async findByEmailWithVerification(
    email: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email })
      .select('+password +verification_code +verification_code_expires_at')
      .exec();
  }

  async issueVerificationCode(user: UserDocument): Promise<string> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    user.verification_code = code;
    user.verification_code_expires_at = new Date(
      Date.now() + VERIFICATION_CODE_TTL_MS,
    );
    await user.save();
    return code;
  }

  async markEmailVerified(user: UserDocument): Promise<void> {
    user.is_email_verified = true;
    user.verification_code = undefined as unknown as string;
    user.verification_code_expires_at = undefined as unknown as Date;
    await user.save();
  }

  async setPassword(id: string, password: string): Promise<UserDocument> {
    const user = await this.findById(id);
    user.password = password;
    return user.save();
  }

  async findByResetCode(code: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        reset_code: code,
        reset_code_expires_at: { $gt: new Date() },
      })
      .select('+password +reset_code +reset_code_expires_at')
      .exec();
  }

  async issueResetCode(user: UserDocument): Promise<string> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    user.reset_code = code;
    user.reset_code_expires_at = new Date(Date.now() + RESET_CODE_TTL_MS);
    await user.save();
    return code;
  }

  async resetPassword(
    user: UserDocument,
    password: string,
  ): Promise<UserDocument> {
    user.password = password;
    user.reset_code = undefined as unknown as string;
    user.reset_code_expires_at = undefined as unknown as Date;
    return user.save();
  }

  async sendResetEmail(user: UserDocument, code: string): Promise<void> {
    const email = buildResetCodeEmail(user.first_name, code);
    await this.mailService.send({
      to: user.email,
      toName: `${user.first_name} ${user.last_name}`,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  }

  async sendVerificationEmail(user: UserDocument, code: string): Promise<void> {
    const email = buildVerificationCodeEmail(user.first_name, code);
    await this.mailService.send({
      to: user.email,
      toName: `${user.first_name} ${user.last_name}`,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }

  async findAll(userType?: UserType): Promise<UserDocument[]> {
    const filter = userType ? { user_type: userType } : {};
    return this.userModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async getStats(): Promise<{
    admins: number;
    employees: number;
    total: number;
  }> {
    const [admins, employees] = await Promise.all([
      this.userModel.countDocuments({ user_type: UserType.ADMIN }).exec(),
      this.userModel.countDocuments({ user_type: UserType.EMPLOYEE }).exec(),
    ]);
    return { admins, employees, total: admins + employees };
  }

  async findDirectory(): Promise<unknown[]> {
    return this.userModel
      .find({ user_type: UserType.EMPLOYEE })
      .select('first_name last_name email department position')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findPublicProfileById(id: string): Promise<unknown> {
    const user = await this.userModel
      .findById(id)
      .select('first_name last_name email department position')
      .lean()
      .exec();
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const user = await this.findById(id);
    const changes = Object.entries(updateUserDto).filter(
      ([, value]) => value !== undefined,
    );
    Object.assign(user, Object.fromEntries(changes));
    return user.save();
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`User #${id} not found`);
    }
  }
}
