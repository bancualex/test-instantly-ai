import OpenAI from "openai";

class AIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn(
        "⚠️  OPENAI_API_KEY not found in environment variables. AI features will be disabled."
      );
      this.client = null;
      return;
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Router Assistant - Classifies user prompts to determine which specialist to use
   */
  async classifyPrompt(userPrompt) {
    if (!this.client) {
      throw new Error(
        "OpenAI client not initialized. Please check your API key."
      );
    }

    const systemPrompt = `You are a routing assistant that determines which type of email should be generated based on user input.

Analyze the user's prompt and classify it as either:
- "sales" - for emails related to selling, pitching, business development, lead generation, product promotion, or any commercial outreach
- "follow-up" - for emails checking in, following up on previous conversations, reminders, status updates, or maintaining relationships

Respond with ONLY the classification: either "sales" or "follow-up"

Examples:
- "Meeting request for Tuesday" → follow-up
- "Pitch our new product to a potential client" → sales  
- "Check in about the proposal we sent last week" → follow-up
- "Introduce our services to a new lead" → sales
- "Follow up on our conversation from yesterday" → follow-up`;

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 10,
      });

      const classification = response.choices[0].message.content
        .trim()
        .toLowerCase();

      if (!["sales", "follow-up"].includes(classification)) {
        // Default to follow-up if classification is unclear
        return "follow-up";
      }

      return classification;
    } catch (error) {
      console.error("Error classifying prompt:", error);
      // Default to follow-up on error
      return "follow-up";
    }
  }

  /**
   * Sales Assistant - Generates sales emails under 40 words, 7-10 words per sentence
   */
  async generateSalesEmail(userPrompt, recipientInfo = "") {
    if (!this.client) {
      throw new Error(
        "OpenAI client not initialized. Please check your API key."
      );
    }

    const systemPrompt = `You are a Sales Assistant specialized in creating concise, effective sales emails.

REQUIREMENTS:
- Total email must be under 40 words
- Each sentence must be 7-10 words maximum
- Be direct, compelling, and action-oriented
- Include a clear call-to-action
- Professional but conversational tone

Generate both a subject line and email body.
Format your response as JSON:
{
  "subject": "Your subject line here",
  "body": "Your email body here"
}

${recipientInfo ? `Recipient context: ${recipientInfo}` : ""}`;

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error("Error generating sales email:", error);
      // Fallback response
      return {
        subject: "Quick question about your business",
        body: "Hi! I have a solution that could help your business grow. Can we chat for 10 minutes this week?",
      };
    }
  }

  /**
   * Follow-up Assistant - Generates polite follow-up emails
   */
  async generateFollowUpEmail(userPrompt) {
    if (!this.client) {
      throw new Error(
        "OpenAI client not initialized. Please check your API key."
      );
    }

    const systemPrompt = `You are a Follow-up Assistant specialized in creating polite, professional follow-up emails.

CHARACTERISTICS:
- Polite and respectful tone
- Clear purpose and context
- Appropriate level of persistence
- Professional but friendly
- Includes next steps or call-to-action

Generate both a subject line and email body.
Format your response as JSON:
{
  "subject": "Your subject line here",
  "body": "Your email body here"
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 300,
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error("Error generating follow-up email:", error);
      // Fallback response
      return {
        subject: "Following up on our conversation",
        body: "Hi,\n\nI wanted to follow up on our recent conversation. Please let me know if you need any additional information or if there's anything I can help clarify.\n\nLooking forward to hearing from you.\n\nBest regards",
      };
    }
  }

  /**
   * Generate email with streaming support
   */
  async *generateEmailStream(userPrompt, recipientInfo = "") {
    if (!this.client) {
      throw new Error(
        "OpenAI client not initialized. Please check your API key."
      );
    }

    // First, classify the prompt
    yield { type: "classification", status: "classifying" };
    const emailType = await this.classifyPrompt(userPrompt);
    yield { type: "classification", emailType };

    // Generate the email based on type
    yield { type: "generation", status: "generating" };

    let result;
    if (emailType === "sales") {
      result = await this.generateSalesEmail(userPrompt, recipientInfo);
    } else {
      result = await this.generateFollowUpEmail(userPrompt);
    }

    // Stream the subject
    yield { type: "subject", content: result.subject };

    // Stream the body word by word for dramatic effect
    const words = result.body.split(" ");
    for (let i = 0; i < words.length; i++) {
      yield {
        type: "body",
        content: words.slice(0, i + 1).join(" "),
        isComplete: i === words.length - 1,
      };
      // Small delay for streaming effect
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    yield { type: "complete", emailType };
  }
}

export default AIService;
