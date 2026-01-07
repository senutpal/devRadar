/*** Fastify Type Extensions
 *
 * Extends Fastify's type system for custom decorators ***/

import type { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      username: string;
      tier: string;
    };
    user: {
      userId: string;
      username: string;
      tier: string;
    };
  }
}
