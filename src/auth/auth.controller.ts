import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './strategies/jwt.strategy';
import { UsersService } from '../users/users.service';
import { RegisterDto } from '../users/dto/register.dto';
import { LoginDto } from '../users/dto/login.dto';
import { VerifyEmailDto } from '../users/dto/verify-email.dto';
import { ResendVerificationDto } from '../users/dto/resend-verification.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { SetPasswordDto } from '../users/dto/set-password.dto';
import { ForgotPasswordDto } from '../users/dto/forgot-password.dto';
import { ResetPasswordDto } from '../users/dto/reset-password.dto';
import { ResponseMessage } from '../common/decorators/response-message.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @ResponseMessage('Account created, verification code sent')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Email verified, set your password to continue')
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Password set successfully')
  setPassword(@Body() setPasswordDto: SetPasswordDto) {
    return this.authService.setPassword(setPasswordDto);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Verification code sent')
  resendVerification(@Body() resendVerificationDto: ResendVerificationDto) {
    return this.authService.resendVerification(resendVerificationDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('If the account exists, a reset code was sent')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Password reset successfully')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Logged in successfully')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Profile retrieved successfully')
  getProfile(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.usersService.findById(currentUser.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Profile updated successfully')
  updateProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(currentUser.userId, updateUserDto);
  }
}
