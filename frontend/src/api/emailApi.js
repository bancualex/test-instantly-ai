// API functions for email operations and AI integration

const API_BASE_URL = "http://localhost:3001";

// Email CRUD operations
export const emailApi = {
  // Get all emails
  async getEmails() {
    try {
      const response = await fetch(`${API_BASE_URL}/emails`);
      if (!response.ok) throw new Error("Failed to fetch emails");
      const data = await response.json();
      return data; // Returns { emails: [...] }
    } catch (error) {
      console.error("Error fetching emails:", error);
      throw error;
    }
  },

  // Get single email by ID
  async getEmail(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/emails/${id}`);
      if (!response.ok) throw new Error("Failed to fetch email");
      const data = await response.json();
      return data.email; // Returns email object
    } catch (error) {
      console.error("Error fetching email:", error);
      throw error;
    }
  },

  // Create new email
  async createEmail(emailData) {
    try {
      const response = await fetch(`${API_BASE_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to create email");
      }
      return await response.json();
    } catch (error) {
      console.error("Error creating email:", error);
      throw error;
    }
  },

  // Update existing email
  async updateEmail(id, emailData) {
    try {
      const response = await fetch(`${API_BASE_URL}/emails/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to update email");
      }
      return await response.json();
    } catch (error) {
      console.error("Error updating email:", error);
      throw error;
    }
  },

  // Delete email
  async deleteEmail(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/emails/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to delete email");
      }
      return true;
    } catch (error) {
      console.error("Error deleting email:", error);
      throw error;
    }
  },
};

// AI-powered email generation
export const aiApi = {
  // Classify prompt to determine email type
  async classifyPrompt(prompt) {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/classify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) throw new Error("Failed to classify prompt");
      return await response.json();
    } catch (error) {
      console.error("Error classifying prompt:", error);
      throw error;
    }
  },

  // Generate email (non-streaming)
  async generateEmail(prompt, recipientInfo = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/generate-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          ...(recipientInfo && { recipientInfo }),
        }),
      });

      if (!response.ok) throw new Error("Failed to generate email");
      return await response.json();
    } catch (error) {
      console.error("Error generating email:", error);
      throw error;
    }
  },

  // Stream email generation using Server-Sent Events
  streamEmailGeneration(prompt, recipientInfo, onUpdate, onComplete, onError) {
    const params = new URLSearchParams({ prompt });
    if (recipientInfo && recipientInfo.trim()) {
      params.append("recipientInfo", recipientInfo.trim());
    }

    const eventSource = new EventSource(
      `${API_BASE_URL}/ai/stream-email?${params}`
    );

    let currentSubject = "";
    let currentBody = "";
    let emailType = "";
    let isStreamActive = true;

    eventSource.onmessage = (event) => {
      if (!isStreamActive) return;

      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "classification":
            if (data.status === "classifying") {
              if (onUpdate) {
                onUpdate({
                  type: "classification",
                  status: "classifying",
                  message: "AI is analyzing your request...",
                });
              }
            } else if (data.emailType) {
              emailType = data.emailType;
              if (onUpdate) {
                onUpdate({
                  type: "classification",
                  emailType: data.emailType,
                  message: `Using ${
                    data.emailType === "sales"
                      ? "Sales"
                      : data.emailType === "follow-up"
                      ? "Follow-up"
                      : "General"
                  } Assistant`,
                });
              }
            }
            break;

          case "generation":
            if (onUpdate) {
              onUpdate({
                type: "generation",
                status: "generating",
                message: "Generating your email content...",
              });
            }
            break;

          case "subject":
            currentSubject = data.content;
            if (onUpdate) {
              onUpdate({ type: "subject", content: currentSubject });
            }
            break;

          case "body":
            currentBody = data.content;
            if (onUpdate) {
              onUpdate({
                type: "body",
                content: currentBody,
                isComplete: data.isComplete || false,
              });
            }
            break;

          case "complete":
            if (onComplete) {
              onComplete({
                emailType,
                subject: currentSubject,
                body: currentBody,
              });
            }
            break;
        }
      } catch (parseError) {
        console.error("Error parsing SSE data:", parseError);
        // Continue processing other events
      }
    };

    eventSource.addEventListener("done", () => {
      isStreamActive = false;
      eventSource.close();
      if (onComplete) {
        onComplete({
          emailType,
          subject: currentSubject,
          body: currentBody,
        });
      }
    });

    eventSource.onerror = (error) => {
      isStreamActive = false;
      eventSource.close();
      console.error("SSE Error:", error);

      if (onError) {
        // Check if it's likely an OpenAI key issue
        const errorMessage = error.message || "";
        if (
          errorMessage.includes("OpenAI") ||
          errorMessage.includes("API key")
        ) {
          onError(
            new Error(
              "AI features unavailable. Please check OpenAI API key configuration."
            )
          );
        } else {
          onError(
            new Error("Failed to stream email generation. Please try again.")
          );
        }
      }
    };

    // Return function to close the connection
    return () => {
      isStreamActive = false;
      eventSource.close();
    };
  },

  // Fallback: Generate email with non-streaming if streaming fails
  async generateEmailFallback(prompt, recipientInfo = null) {
    try {
      const result = await this.generateEmail(prompt, recipientInfo);
      return {
        subject: result.subject || "Generated Subject",
        body: result.body || "Generated body content...",
        emailType: result.emailType || "general",
      };
    } catch (error) {
      console.error("Error in fallback generation:", error);
      throw error;
    }
  },
};

// Form validation utilities
export const validation = {
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  validateEmailList(emailString) {
    if (!emailString.trim()) return true; // Empty is valid for CC/BCC
    const emails = emailString.split(",").map((email) => email.trim());
    return emails.every((email) => this.validateEmail(email));
  },

  validateComposeForm(formData) {
    const errors = {};

    if (!formData.to.trim()) {
      errors.to = "To field is required";
    } else if (!this.validateEmailList(formData.to)) {
      errors.to = "Please enter valid email addresses";
    }

    if (formData.cc && !this.validateEmailList(formData.cc)) {
      errors.cc = "Please enter valid email addresses";
    }

    if (formData.bcc && !this.validateEmailList(formData.bcc)) {
      errors.bcc = "Please enter valid email addresses";
    }

    if (!formData.subject.trim()) {
      errors.subject = "Subject is required";
    }

    if (!formData.body.trim()) {
      errors.body = "Email body is required";
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },
};
