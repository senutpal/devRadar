/*** Fastify Type Extensions
 *
 * Extends Fastify's type system for custom decorators ***/

import type { FastifyReply } from 'fastify';

declare module 'fastify' {
  // FastifyRequest is referenced from the 'fastify' module namespace
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    rawBody?: Buffer;
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
