# Auth Setup — How It Works

A walkthrough of the authentication + user system in this NestJS backend, written for learning. Two user types — **admin** and **employee** — share one `User` schema. The only difference is the `user_type` field, which controls what each user is allowed to do.

---

## 1. The Big Picture

```
HTTP Request
    │
    ▼
┌─────────────┐   validate body shape   ┌──────────┐
│   DTO       │ ──────────────────────► │  Guard   │  check token / role
│ (Validation)│                        │ (JWT,    │
└─────────────┘                        │  Roles)  │
                                       └────┬─────┘
                                            ▼
                                       ┌──────────┐
                                       │Controller│  maps HTTP → service call
                                       └────┬─────┘
                                            ▼
                                       ┌──────────┐    hash / compare      ┌────────┐
                                       │ Service  │ ─────────────────────► │ bcrypt │
                                       └────┬─────┘                        └────────┘
                                            ▼ issue token  ┌──────────────┐
                                       ┌──────────┐ ◄────── │ JwtModule    │
                                       │ Service  │         └──────────────┘
                                       └──────────┘
                                            ▼
                                       ┌──────────┐
                                       │ Mongoose │ ──► MongoDB
                                       │  Model   │
                                       └──────────┘
```

NestJS is built around **dependency injection**: a `@Module()` declares which pieces (controllers, services, models) exist and who can use them. Controllers only handle HTTP; services hold the real logic. Keep controllers thin — that's the NestJS style.

Note there is **no global prefix** (`main.ts` never calls `setGlobalPrefix`), so routes are literally `/auth/...`, `/admin/...`, `/employees/...`.

---

## 2. File Map

```
src/
├── main.ts                                # bootstrap: CORS + global ValidationPipe
├── app.module.ts                          # root module, wires everything together
├── common/
│   ├── common.module.ts                   # @Global: registers the interceptor + filter
│   ├── enums/user-type.enum.ts            # UserType { ADMIN, EMPLOYEE }
│   ├── pipes/parse-object-id.pipe.ts      # rejects bad MongoDB ids early
│   ├── decorators/response-message.decorator.ts  # @ResponseMessage('...')
│   ├── interceptors/transform.interceptor.ts     # wraps responses in an envelope
│   ├── filters/all-exceptions.filter.ts          # normalises every error response
│   └── interfaces/api-response.interface.ts      # ApiSuccessResponse / ApiErrorResponse
├── users/
│   ├── schemas/user.schema.ts             # the Mongoose schema + password hashing hook
│   ├── dto/
│   │   ├── register.dto.ts                # POST /auth/register body
│   │   ├── verify-email.dto.ts            # POST /auth/verify-email body
│   │   ├── set-password.dto.ts            # POST /auth/set-password body
│   │   ├── resend-verification.dto.ts     # POST /auth/resend-verification body
│   │   ├── login.dto.ts                   # POST /auth/login body
│   │   └── update-user.dto.ts             # PATCH body
│   ├── users.service.ts                   # all DB access for users
│   └── users.module.ts
├── auth/
│   ├── constants.ts                       # JWT secret + expiry
│   ├── auth.service.ts                    # register / verify / set-password / login
│   ├── auth.controller.ts                 # /auth/* routes
│   ├── auth.module.ts
│   ├── strategies/jwt.strategy.ts         # verifies bearer tokens
│   ├── guards/
│   │   ├── jwt-auth.guard.ts              # "are you logged in?"
│   │   └── roles.guard.ts                 # "are you an admin?"
│   └── decorators/
│       ├── roles.decorator.ts             # @Roles(UserType.ADMIN)
│       └── current-user.decorator.ts      # @CurrentUser() parameter
├── admin/
│   ├── admin.controller.ts                # /admin/users CRUD + stats (ADMIN only)
│   └── admin.module.ts
├── employees/
│   ├── employees.controller.ts            # /employees/* (EMPLOYEE only)
│   └── employees.module.ts
└── mail/
    ├── mail.service.ts                    # Brevo HTTP API wrapper
    └── templates/verification-code.template.ts
```

There is no `users.controller.ts` — all HTTP routes for users live in `auth.controller.ts` (`/auth/me`) and `admin.controller.ts` (`/admin/users`).

---

## 3. The User Schema

`src/users/schemas/user.schema.ts`

```ts
@Schema({ timestamps: true, versionKey: false })
export class User {
  @Prop({ required: true, trim: true }) first_name: string;
  @Prop({ required: true, trim: true }) last_name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ select: false })
  password?: string;                       // <-- optional! see below

  @Prop({ required: true, enum: UserType, default: UserType.EMPLOYEE, index: true })
  user_type: UserType;

  @Prop({ trim: true }) department: string;
  @Prop({ trim: true }) role: string;      // free-text job title, NOT the role switch

  @Prop({ default: true }) is_active: boolean;
  @Prop({ default: false }) is_email_verified: boolean;

  @Prop({ select: false }) verification_code: string;
  @Prop({ type: Date, select: false }) verification_code_expires_at: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

Key NestJS + Mongoose concepts:

- **`@Schema()` + `@Prop()` decorators** describe the collection. `SchemaFactory.createForClass(User)` turns the decorated class into the actual Mongoose schema.
- **One collection, two roles.** There is no separate `admins` and `employees` table — `user_type` (from the `UserType` enum) is the discriminator. Simple queries like `find({ user_type: 'employee' })` give you all employees.
- **`password` is optional.** A freshly registered user has *no* password yet — it's set later in the onboarding flow (§5). The presence of `password` is the "has finished onboarding" flag.
- **`timestamps: true`** auto-manages `createdAt` / `updatedAt` for you. `versionKey: false` drops Mongoose's `__v`.
- **`toJSON` transform** strips `password`, `verification_code` and `verification_code_expires_at` from serialized output as a safety net.

### `select: false` — and the bug it caused

`select: false` hides a field from queries by default. You must explicitly re-select it:

```ts
async findByEmail(email: string) {
  return this.userModel
    .findOne({ email })
    .select('+password +verification_code +verification_code_expires_at')
    .exec();
}
```

`is_email_verified` originally had `select: false` too — and **no query ever added `+is_email_verified`**. That meant `user.is_email_verified` was always `undefined`, so every check against it silently did nothing:

```ts
if (!user.is_email_verified) {
  throw new UnauthorizedException('Please verify your email first');  // never fired
}
```

The lesson: `select: false` is a promise that *every* query that needs the field remembers to re-select it. If a boolean gate must be reliable, don't hide it. `is_email_verified` is not a secret, so it's selected normally now. The fields still marked `select: false` are the genuinely sensitive ones (`password`, the verification code).

### Password hashing (never store plain text)

```ts
UserSchema.pre<UserDocument>('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});
```

This is a Mongoose **middleware hook**. It runs before every `save()`, so the raw password is replaced by a bcrypt hash automatically — the service never has to remember to hash. `isModified` prevents re-hashing an already-hashed password on unrelated updates, and the `!this.password` guard skips the case where nothing is being set.

Login then compares with `bcrypt.compare(plainInput, storedHash)` — bcrypt hashes are one-way, so you can only verify, never decrypt.

---

## 4. DTOs and Validation

`src/users/dto/register.dto.ts` — a **DTO** (Data Transfer Object) defines the exact shape of an incoming request body:

```ts
export class RegisterDto {
  @IsString() @MinLength(2) first_name: string;
  @IsString() @MinLength(2) last_name: string;
  @IsEmail() email: string;

  @IsOptional() @IsEnum(UserType) user_type: UserType;   // <-- the role switch
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() role?: string;
}
```

**Note there is no `password` field.** Registration deliberately cannot set a password — the password is only accepted after the email address has been verified (§5).

- Decorators come from `class-validator`; `@IsEnum(UserType)` rejects anything that isn't `admin` or `employee` with a `400 Bad Request` before your code runs. `@IsOptional()` lets a field be omitted entirely.
- The global `ValidationPipe` in `main.ts` (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`) makes this automatic for every `@Body()`:
  - `whitelist` — strips properties that don't exist on the DTO
  - `forbidNonWhitelisted` — **errors** if the client sends unknown properties
  - `transform` — converts the plain JSON into a real DTO class instance

`forbidNonWhitelisted` is strict on purpose: sending a stray field is a `400`, not a silent no-op. It means a client can never smuggle `user_type: "admin"` into a DTO that doesn't declare it.

The other onboarding DTOs:

```ts
export class VerifyEmailDto {
  @IsEmail() email: string;
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' }) code: string;
}

export class SetPasswordDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}
```

DTOs double as documentation: they tell a client exactly what each endpoint accepts.

---

## 5. The Onboarding Flow: register → verify → set password → login

`src/auth/auth.service.ts`

A new account is built in four calls. The password is only accepted **after** the emailed code has proved control of the inbox.

```
POST /auth/register              → 201  user created, 6-digit code emailed
POST /auth/verify-email          → 200  is_email_verified = true, code cleared
POST /auth/set-password          → 200  password hashed, access_token returned
POST /auth/login                 → 200  access_token
```

### 1. Register

```ts
async register(registerDto: RegisterDto) {
  const user = await this.usersService.create(registerDto);
  const code = await this.usersService.issueVerificationCode(user);
  await this.usersService.sendVerificationEmail(user, code);
  return { user: user.toJSON(), message: 'Verification code sent to email' };
}
```

No token is issued here — there is nothing to log in with yet.

### 2. The verification code

```ts
export const VERIFICATION_CODE_TTL_MS = 2 * 60 * 60 * 1000;   // 2 hours

async issueVerificationCode(user: UserDocument): Promise<string> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  user.verification_code = code;
  user.verification_code_expires_at = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);
  await user.save();
  return code;
}
```

The code is **persisted in the database**, unlike the access token which is stateless. It is 6 digits from `crypto.randomInt` (not `Math.random`), valid for 2 hours, and **single-use** — `markEmailVerified` clears it on success.

`POST /auth/resend-verification` issues a fresh code. It returns the same message whether or not the account exists, so it can't be used to discover which emails are registered:

```ts
if (!user || user.is_email_verified) {
  return { message: 'If the account exists and is unverified, a new code was sent' };
}
```

### 3. Verify the code

```ts
async verifyEmail(verifyEmailDto: VerifyEmailDto) {
  const user = await this.usersService.findByEmailWithVerification(dto.email);
  if (!user) throw new UnauthorizedException('Invalid email or code');
  if (!user.verification_code || !user.verification_code_expires_at) {
    throw new UnauthorizedException('Invalid email or code');
  }
  if (user.verification_code_expires_at.getTime() < Date.now()) {
    throw new UnauthorizedException('Code expired, request a new one');
  }
  if (user.verification_code !== dto.code) {
    throw new UnauthorizedException('Invalid email or code');
  }
  if (user.is_email_verified) {
    throw new ConflictException('Email already verified');   // 409, not 401
  }

  await this.usersService.markEmailVerified(user);
  return { user: user.toJSON() };
}
```

Note the **ordering**, which is the whole point. Checking `is_email_verified` *before* the code comparison is an enumeration oracle:

```ts
if (user.is_email_verified) throw new UnauthorizedException('Email already verified');
if (user.verification_code !== dto.code) { ... }   // never reached for a verified account
```

With that order, anyone can probe for registered addresses — an unknown email returns `"Invalid email or code"`, a verified one returns `"Email already verified"` — in a single request. Every failure path here returns the same message so the endpoint can't be used to discover which addresses exist. A side effect is that the `409` is now only reachable by someone who already has the correct code, which makes it a defensive branch rather than a probeable one.

### 4. Set the password

```ts
async setPassword(setPasswordDto: SetPasswordDto) {
  const user = await this.usersService.findByEmail(setPasswordDto.email);
  if (!user) throw new UnauthorizedException('Invalid email or password');
  if (!user.is_email_verified) throw new UnauthorizedException('Please verify your email first');
  if (!user.is_active) throw new ForbiddenException('Account is inactive');
  if (user.password) throw new ConflictException('Password already set, please log in');

  const updatedUser = await this.usersService.setPassword(String(user._id), dto.password);
  return { user: updatedUser.toJSON(), access_token: this.generateToken(updatedUser) };
}
```

This endpoint takes **no token** — the caller has no credentials yet. Its gate is `is_email_verified === true`, plus the one-shot check that no password exists yet. `UsersService.setPassword` loads the doc and saves it, so the `pre('save')` hook hashes the password.

Because the flow is now a plain verified flag rather than a signed token, `set-password` is reachable by anyone who knows a verified email address. On a real deployment you'd add rate limiting here (see §12).

### 5. Login

```ts
async login(loginDto: LoginDto) {
  const user = await this.usersService.findByEmail(loginDto.email);
  if (!user) throw new UnauthorizedException('Invalid email or password');
  if (!user.is_active) throw new ForbiddenException('Account is inactive');
  if (!user.is_email_verified) throw new UnauthorizedException('Please verify your email first');
  if (!user.password) throw new UnauthorizedException('Please set your password first');
  if (!user.password) throw new ConflictException('Please set your password first');
  if (!(await bcrypt.compare(loginDto.password, user.password))) {
    throw new UnauthorizedException('Invalid email or password');
  }
  return { user: user.toJSON(), access_token: this.generateToken(user) };
}
```

Notice the error message is the same whether the email doesn't exist or the password is wrong — this avoids leaking which emails are registered. The `!user.password` branch is a **409** rather than a 401: there is no credential to get wrong, the account just hasn't finished onboarding yet.

### The token payload

```ts
const payload: JwtPayload = {
  sub: String(user._id),  // subject — standard JWT claim for "who is this"
  email: user.email,
  user_type: user.user_type,
};
```

`this.jwtService.sign(payload)` produces a signed JWT. A JWT is **not encrypted** — it's base64 data + a signature. The server can verify it wasn't tampered with because only the server knows `JWT_SECRET`. Since the payload is readable, never put secrets in it.

---

## 6. JWT Strategy (how the server trusts a token)

`src/auth/strategies/jwt.strategy.ts`

```ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return { userId: payload.sub, email: payload.email, user_type: payload.user_type };
  }
}
```

**Passport** is the standard auth middleware for Express. The strategy:

1. Reads the `Authorization: Bearer <token>` header.
2. Verifies the signature and expiry.
3. If valid, calls `validate()` — whatever it returns is attached to `request.user` for the whole request.

The token is stateless: the server doesn't look up a session, it just checks the signature. (Trade-offs: a token stays valid until it expires — logout requires short expiry or a blocklist; and because there's no DB lookup, `is_active` and `is_email_verified` are *not* re-checked here, so deactivating a user doesn't kill tokens they've already been issued.)

---

## 7. Guards — "same endpoints, different access"

**`JwtAuthGuard`** — is there a valid token?

```ts
@UseGuards(JwtAuthGuard)
getProfile(@CurrentUser() currentUser: AuthenticatedUser) { ... }
```

**`RolesGuard` + `@Roles()`** — is this user allowed? Applied per-controller:

```ts
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.ADMIN)
export class AdminController {}
```

```ts
canActivate(context: ExecutionContext): boolean {
  const roles = this.reflector.getAllAndOverride<UserType[] | undefined>(
    ROLES_KEY, [context.getHandler(), context.getClass()],
  );
  if (!roles || roles.length === 0) return true;   // no @Roles() => open
  const { user } = context.switchToHttp().getRequest();
  if (!user) return false;
  return roles.includes(user.user_type);
}
```

`SetMetadata(ROLES_KEY, roles)` from `@Roles()` attaches metadata to the route; the `Reflector` reads it back at request time. If no `@Roles()` exists the guard passes everything through — which is why `JwtAuthGuard` is always the real gate. Guards that return `false` produce a `403`.

The `/auth/*` onboarding and login routes have **no guard at all** — they're deliberately public, secured only by DTO validation and the state checks in the service.

---

## 8. Decorators (`@CurrentUser()`)

```ts
@Get('me')
@UseGuards(JwtAuthGuard)
@ResponseMessage('Profile retrieved successfully')
getProfile(@CurrentUser() currentUser: AuthenticatedUser) {
  return this.usersService.findById(currentUser.userId);
}
```

`@CurrentUser()` is a `createParamDecorator` that pulls `request.user` (set by the strategy) into a handler argument. Much cleaner than extracting headers manually in every method. It also accepts a key — `@CurrentUser('userId')` — to pull a single field.

`@ResponseMessage('...')` is a custom decorator setting metadata that `TransformInterceptor` reads to fill in the response envelope's `message`.

---

## 9. Response Envelope

Every response is wrapped by `TransformInterceptor` (registered globally as `APP_INTERCEPTOR` in `common.module.ts`):

```json
{
  "status": "success",
  "message": "Password set successfully",
  "statusCode": 200,
  "data": { "user": { "...": "..." }, "access_token": "eyJ..." }
}
```

Everything that goes wrong goes through `AllExceptionsFilter` (`APP_FILTER`), which normalises the shape and turns Mongo's duplicate-key error (`code: 11000`) into a `409`:

```json
{ "status": "error", "message": "Invalid email or password", "statusCode": 401, "data": null }
```

---

## 10. Endpoint Reference

| Method | Route                          | Auth                  | Who can use it     |
| ------ | ------------------------------ | --------------------- | ------------------ |
| POST   | `/auth/register`               | none                  | anyone             |
| POST   | `/auth/verify-email`           | none                  | anyone             |
| POST   | `/auth/set-password`           | none (needs verified email) | anyone     |
| POST   | `/auth/resend-verification`    | none                  | anyone             |
| POST   | `/auth/login`                  | none                  | anyone             |
| GET    | `/auth/me`                     | JWT                   | any logged-in user |
| PATCH  | `/auth/me`                     | JWT                   | any logged-in user |
| GET    | `/admin/stats`                 | JWT + `@Roles(ADMIN)` | admin only         |
| GET    | `/admin/users`                 | JWT + `@Roles(ADMIN)` | admin only         |
| POST   | `/admin/users`                 | JWT + `@Roles(ADMIN)` | admin only         |
| GET    | `/admin/users/:id`             | JWT + `@Roles(ADMIN)` | admin only         |
| PATCH  | `/admin/users/:id`             | JWT + `@Roles(ADMIN)` | admin only         |
| DELETE | `/admin/users/:id`             | JWT + `@Roles(ADMIN)` | admin only         |
| GET    | `/employees/me`                | JWT + `@Roles(EMPLOYEE)` | employee only  |
| PATCH  | `/employees/me`                | JWT + `@Roles(EMPLOYEE)` | employee only  |
| GET    | `/employees/directory`         | JWT + `@Roles(EMPLOYEE)` | employee only  |
| GET    | `/employees/:id`               | JWT + `@Roles(EMPLOYEE)` | employee only  |

Note `POST /admin/users` uses the same `RegisterDto` and runs the same `issueVerificationCode` + `sendVerificationEmail` pair as `POST /auth/register` — otherwise an admin-created account would have no code and could never finish onboarding.

### Examples

Register an employee (the full onboarding, start to finish):

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
        "first_name": "Bob",
        "last_name": "Employee",
        "email": "bob@corp.com",
        "user_type": "employee",
        "department": "Sales"
      }'
# => 201 { "status": "success", "message": "Account created, verification code sent",
#           "data": { "user": { ...no password field... } } }

# check the 6-digit code in bob's inbox, then:
curl -X POST http://localhost:3000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{ "email": "bob@corp.com", "code": "123456" }'
# => 200 { "status": "success", "message": "Email verified, set your password to continue" }

curl -X POST http://localhost:3000/auth/set-password \
  -H "Content-Type: application/json" \
  -d '{ "email": "bob@corp.com", "password": "password123" }'
# => 200 { "status": "success", "message": "Password set successfully",
#           "data": { "user": { ... }, "access_token": "eyJ..." } }

curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "bob@corp.com", "password": "password123" }'
```

Your own profile:

```bash
curl http://localhost:3000/auth/me -H "Authorization: Bearer <token>"
```

Admin listing all users:

```bash
curl http://localhost:3000/admin/users -H "Authorization: Bearer <admin_token>"
# employee token => 403 Forbidden
```

Status codes:

Status codes follow a strict three-way split:

| Code | Meaning                                                     |
| ---- | ----------------------------------------------------------- |
| 401  | "I don't know who you are" — bad/absent credential          |
| 403  | "I know you, but you may not do this" — e.g. `!is_active`   |
| 409  | "I know you, but it's already in that state" — e.g. verified, or password already set |

| Situation                     | Status |
| ----------------------------- | ------ |
| Valid registration            | 201    |
| Wrong / expired verification code | 401 |
| Set password before verifying | 401    |
| Set password twice            | 409    |
| Login before setting a password | 409  |
| Email already verified        | 409    |
| Email already registered      | 409    |
| Bad body / bad enum / unknown field | 400 |
| Wrong email or password       | 401    |
| Missing or invalid token      | 401    |
| Inactive account              | 403    |
| Right token, wrong role       | 403    |
| Unknown id                    | 404    |

---

## 11. Environment & Configuration

`.env`:

```
MONGODB_URI="mongodb+srv://<user>:<pass>@cluster.../hr-mgt"
JWT_SECRET="<random-secret>"
JWT_EXPIRES_IN="7d"
PORT=3000

BREVO_API_KEY="xkeysib-..."
BREVO_FROM_EMAIL="no-reply@noemdekhrmgt.co.uk"
BREVO_FROM_NAME="HR Mgt System"
```

- `ConfigModule.forRoot({ isGlobal: true })` loads `.env` into `process.env` — available everywhere without re-importing.
- Always generate a long random `JWT_SECRET`. If someone knows it, they can forge tokens for any user, including admins. The code falls back to `'hr-mgt-dev-secret'` if unset, which is fine locally and dangerous anywhere else.
- `MONGODB_URI` points to MongoDB Atlas. `mongooseModule.forRoot` connects at boot; the app still starts if the database is briefly unreachable (requests fail until it connects).
- Mail goes through **Brevo**'s HTTP API in `MailService`. If `BREVO_API_KEY` is unset, `send()` logs a warning — including the code — and returns without sending, so local development works without mail credentials but real codes never arrive.
- `.env` is in `.gitignore` — never commit real credentials.

---

## 12. Request Lifecycle Example

`GET /admin/users` with an employee token:

```
1. Route matched by Nest router (AdminController.findAll)
2. JwtAuthGuard runs → validates Bearer token with JwtStrategy
3. RolesGuard runs → reads @Roles(UserType.ADMIN) from the controller,
   sees request.user.user_type === 'employee'
4. → ForbiddenException → AllExceptionsFilter →
   403 { "status": "error", "message": "Forbidden resource", "statusCode": 403, "data": null }
```

`POST /auth/set-password` on an unverified account:

```
1. No guards — route is public
2. ValidationPipe checks the body against SetPasswordDto
3. AuthService.setPassword → usersService.findByEmail → user found
4. user.is_email_verified is false → UnauthorizedException
5. → 401 { "status": "error", "message": "Please verify your email first", ... }
```

---

## 13. Things to Look Into Next

- **Rate limiting** — the biggest gap. Nothing throttles `/auth/login` or the 6-digit verification code, so both are brute-forceable. Add `@nestjs/throttler` with a `ThrottlerGuard` and a tight limit on the `/auth` routes.
- **Password reset** — there is no forgot-password flow. Once you have a `forgot-password` endpoint you'll want signed, single-use, time-limited reset tokens (the same shape the old setup token had).
- **Refresh tokens** — short-lived access tokens plus a long-lived refresh flow so stolen tokens expire quickly.
- **`APP_GUARD`** — register `JwtAuthGuard` globally and opt routes out with a `@Public()` decorator, instead of decorating each controller and relying on forgetting to decorate new ones.
- **`is_active` on existing tokens** — it's enforced at `login` and `set-password`, but `JwtStrategy.validate` does no DB lookup, so a user deactivated mid-session keeps access until their token expires. Add a `blocked` claim check or a token version.
- **Password policy** — `SetPasswordDto` only enforces `MinLength(8)`. Add `Matches` rules or a `zxcvbn` strength check.
- **Role hierarchy** — if more roles appear, model permissions instead of hardcoding `UserType.ADMIN` checks.
- **Verification code storage** — codes are compared with `!==` against a plaintext column. Fine for a personal project; `timingSafeEqual` (or a hash of the code) is the hardened version.