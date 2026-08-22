import { Global, Module } from '@nestjs/common';
import { PG_POOL, createPool } from './pool';

/**
 * Global so every feature module can inject PG_POOL without re-declaring the
 * provider. The pool itself is not connected until a query actually runs, so
 * this module can be imported even with no DATABASE_URL set.
 */
@Global()
@Module({
  providers: [{ provide: PG_POOL, useFactory: createPool }],
  exports: [PG_POOL],
})
export class DbModule {}
