import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto } from '../users/dto/login.dto';
import { RegisterDto } from '../users/dto/register.dto';
import { VerifyEmailDto } from '../users/dto/verify-email.dto';
import { ResendVerificationDto } from '../users/dto/resend-verification.dto';
import { SetPasswordDto } from '../users/dto/set-password.dto';
import { ForgotPasswordDto } from '../users/dto/forgot-password.dto';
import { ResetPasswordDto } from '../users/dto/reset-password.dto';
import { UserDocument } from '../users/schemas/user.schema';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    const code = await this.usersService.issueVerificationCode(user);
    await this.usersService.sendVerificationEmail(user, code);
    return {
      user: user.toJSON(),
      message: 'Verification code sent to email',
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const user = await this.usersService.findByEmailWithVerification(
      verifyEmailDto.email,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid email or code');
    }
    if (!user.verification_code || !user.verification_code_expires_at) {
      throw new UnauthorizedException('Invalid email or code');
    }
    if (user.verification_code_expires_at.getTime() < Date.now()) {
      throw new UnauthorizedException('Code expired, request a new one');
    }
    if (user.verification_code !== verifyEmailDto.code) {
      throw new UnauthorizedException('Invalid email or code');
    }
    if (user.is_email_verified) {
      throw new ConflictException('Email already verified');
    }

    await this.usersService.markEmailVerified(user);
    return { user: user.toJSON() };
  }

  async setPassword(setPasswordDto: SetPasswordDto) {
    const user = await this.usersService.findByEmail(setPasswordDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.is_email_verified) {
      throw new UnauthorizedException('Please verify your email first');
    }
    if (!user.is_active) {
      throw new ForbiddenException('Account is inactive');
    }
    if (user.password) {
      throw new ConflictException('Password already set, please log in');
    }

    const updatedUser = await this.usersService.setPassword(
      String(user._id),
      setPasswordDto.password,
    );
    const access_token = this.generateToken(updatedUser);
    return { user: updatedUser.toJSON(), access_token };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);

    if (!user || !user.is_email_verified || !user.is_active) {
      return { message: 'If the account exists, a reset code was sent' };
    }

    const code = await this.usersService.issueResetCode(user);
    await this.usersService.sendResetEmail(user, code);
    return { message: 'Password reset code sent to email' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const user = await this.usersService.findByResetCode(resetPasswordDto.code);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    if (!user.is_active) {
      throw new ForbiddenException('Account is inactive');
    }

    await this.usersService.resetPassword(user, resetPasswordDto.new_password);
    return { message: 'Password reset successfully' };
  }

  async resendVerification(resendVerificationDto: ResendVerificationDto) {
    const user = await this.usersService.findByEmailWithVerification(
      resendVerificationDto.email,
    );
    if (!user || user.is_email_verified) {
      return {
        message: 'If the account exists and is unverified, a new code was sent',
      };
    }
    const code = await this.usersService.issueVerificationCode(user);
    await this.usersService.sendVerificationEmail(user, code);
    return { message: 'Verification code sent to email' };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.is_active) {
      throw new ForbiddenException('Account is inactive');
    }
    if (!user.is_email_verified) {
      throw new UnauthorizedException('Please verify your email first');
    }
    if (!user.password) {
      throw new ConflictException('Please set your password first');
    }
    if (!(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const access_token = this.generateToken(user);
    return { user: user.toJSON(), access_token };
  }

  private generateToken(user: UserDocument): string {
    const payload: JwtPayload = {
      sub: String(user._id),
      email: user.email,
      user_type: user.user_type,
    };
    return this.jwtService.sign(payload);
  }
}
