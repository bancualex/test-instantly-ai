import DB from "../db/index.js";
import AIService from "../services/AIService.js";

export default async function routes(fastify, options) {
  // Initialize AI service
  const aiService = new AIService();

  // Enable CORS for frontend
  await fastify.register(import("@fastify/cors"), {
    origin: ["http://localhost:3000"],
    credentials: true,
  });

  // Health check
  fastify.get("/ping", async (request, reply) => {
    return "pong\n";
  });

  // Get all emails
  fastify.get("/emails", async (request, reply) => {
    try {
      const emails = await DB.getAllEmails();
      return { emails };
    } catch (error) {
      reply.status(500).send({ error: "Failed to fetch emails" });
    }
  });

  // Get email by ID
  fastify.get("/emails/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const email = await DB.getEmailById(parseInt(id));

      if (!email) {
        return reply.status(404).send({ error: "Email not found" });
      }

      return { email };
    } catch (error) {
      reply.status(500).send({ error: "Failed to fetch email" });
    }
  });

  // Create new email
  fastify.post("/emails", async (request, reply) => {
    try {
      const { to, cc, bcc, subject, body } = request.body;

      if (!to || !subject) {
        return reply.status(400).send({ error: "To and Subject are required" });
      }

      const emailData = {
        to: to || "",
        cc: cc || "",
        bcc: bcc || "",
        subject,
        body: body || "",
      };

      const email = await DB.createEmail(emailData);
      return { email };
    } catch (error) {
      reply.status(500).send({ error: "Failed to create email" });
    }
  });

  // Update email
  fastify.put("/emails/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const { to, cc, bcc, subject, body } = request.body;

      const existing = await DB.getEmailById(parseInt(id));
      if (!existing) {
        return reply.status(404).send({ error: "Email not found" });
      }

      const updateData = {
        to: to || "",
        cc: cc || "",
        bcc: bcc || "",
        subject: subject || existing.subject,
        body: body || "",
      };

      const email = await DB.updateEmail(parseInt(id), updateData);
      return { email };
    } catch (error) {
      reply.status(500).send({ error: "Failed to update email" });
    }
  });

  // Delete email
  fastify.delete("/emails/:id", async (request, reply) => {
    try {
      const { id } = request.params;

      const existing = await DB.getEmailById(parseInt(id));
      if (!existing) {
        return reply.status(404).send({ error: "Email not found" });
      }

      await DB.deleteEmail(parseInt(id));
      return { message: "Email deleted successfully" };
    } catch (error) {
      reply.status(500).send({ error: "Failed to delete email" });
    }
  });

  // AI Email Generation - Non-streaming endpoint
  fastify.post("/ai/generate-email", async (request, reply) => {
    try {
      const { prompt, recipientInfo } = request.body;

      if (!prompt) {
        return reply.status(400).send({ error: "Prompt is required" });
      }

      // Classify the prompt
      const emailType = await aiService.classifyPrompt(prompt);

      // Generate the email
      let result;
      if (emailType === "sales") {
        result = await aiService.generateSalesEmail(
          prompt,
          recipientInfo || ""
        );
      } else {
        result = await aiService.generateFollowUpEmail(prompt);
      }

      return {
        emailType,
        subject: result.subject,
        body: result.body,
      };
    } catch (error) {
      console.error("AI generation error:", error);
      reply.status(500).send({
        error:
          "Failed to generate email. Please check your OpenAI API key configuration.",
      });
    }
  });

  // AI Email Generation - Streaming endpoint using Server-Sent Events
  fastify.get("/ai/stream-email", async (request, reply) => {
    const { prompt, recipientInfo } = request.query;

    if (!prompt) {
      return reply
        .status(400)
        .send({ error: "Prompt query parameter is required" });
    }

    // Set SSE headers
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "http://localhost:3000",
      "Access-Control-Allow-Credentials": "true",
    });

    try {
      // Stream the AI generation process
      for await (const chunk of aiService.generateEmailStream(
        prompt,
        recipientInfo || ""
      )) {
        const data = JSON.stringify(chunk);
        reply.raw.write(`data: ${data}\n\n`);
      }

      // Send completion event
      reply.raw.write("event: done\ndata: {}\n\n");
    } catch (error) {
      console.error("AI streaming error:", error);
      const errorData = JSON.stringify({
        type: "error",
        message:
          "Failed to generate email. Please check your OpenAI API key configuration.",
      });
      reply.raw.write(`data: ${errorData}\n\n`);
    } finally {
      reply.raw.end();
    }
  });

  // AI Classification endpoint (utility endpoint for testing)
  fastify.post("/ai/classify", async (request, reply) => {
    try {
      const { prompt } = request.body;

      if (!prompt) {
        return reply.status(400).send({ error: "Prompt is required" });
      }

      const emailType = await aiService.classifyPrompt(prompt);
      return { emailType };
    } catch (error) {
      console.error("AI classification error:", error);
      reply.status(500).send({
        error:
          "Failed to classify prompt. Please check your OpenAI API key configuration.",
      });
    }
  });
}
