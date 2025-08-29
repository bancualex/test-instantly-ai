// ESM
import Fastify from "fastify";
import routes from "./src/routes/index.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * @type {import('fastify').FastifyInstance} Instance of Fastify
 */
const fastify = Fastify({
  logger: true,
});

fastify.register(routes);

const port = process.env.PORT || 3001;

fastify.listen({ port, host: "0.0.0.0" }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`🚀 Server is now listening on ${address}`);
});
