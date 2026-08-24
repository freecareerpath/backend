import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersRepository } from './users.repository';
import { SessionsRepository } from './sessions.repository';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_MS,
  generateRefreshToken,
  hashRefreshToken,
} from './tokens';

const PASSWORD_HASH_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthTokens = {
  userId: string;
  accessToken: string;
  refreshToken: string;
};

/**
 * All auth logic lives here (not the controller) so it's unit-testable with
 * the repositories mocked — no live database needed (see ADR-0004; a real
 * Supabase project has not been provisioned yet, docs/architecture.md).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly sessions: SessionsRepository,
    private readonly jwt: JwtService,
  ) {}

  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<AuthTokens> {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new BadRequestException('Name is required.');
    }
    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email)) {
      throw new BadRequestException('Enter a valid email address.');
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
    }

    const existing = await this.users.findByEmail(email);
    if (existing) {
      // A "log in instead" UX unavoidably reveals the email is taken (AC-002).
      throw new ConflictException('This email is already registered.');
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
    const user = await this.users.create(email, passwordHash, name.trim());
    return this.issueTokens(user.id);
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.users.findByEmail(email);
    const genericError = new UnauthorizedException(
      'Incorrect email or password.',
    );

    if (!user) {
      // Still hash something so this path takes comparable time either way.
      await bcrypt.compare(
        password,
        await bcrypt.hash('', PASSWORD_HASH_ROUNDS),
      );
      throw genericError;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw genericError;

    return this.issueTokens(user.id);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const session = await this.sessions.findValidByHash(
      hashRefreshToken(refreshToken),
    );
    if (!session) {
      throw new UnauthorizedException('Session expired or revoked.');
    }

    // Rotate on every refresh: old session is single-use.
    await this.sessions.revoke(session.id);
    return this.issueTokens(session.userId);
  }

  async logout(refreshToken: string): Promise<void> {
    const session = await this.sessions.findValidByHash(
      hashRefreshToken(refreshToken),
    );
    if (session) {
      await this.sessions.revoke(session.id);
    }
    // Already-invalid token: logout is idempotent, not an error.
  }

  private async issueTokens(userId: string): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId },
      { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    );

    const refreshToken = generateRefreshToken();
    await this.sessions.create(
      userId,
      hashRefreshToken(refreshToken),
      new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    );

    return { userId, accessToken, refreshToken };
  }
}
