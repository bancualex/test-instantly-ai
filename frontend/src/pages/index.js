import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  List,
  ListItem,
  ListItemText,
  Typography,
  Paper,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
  FormHelperText,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { emailApi, aiApi, validation } from "../api/emailApi";

export default function Home() {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeForm, setComposeForm] = useState({
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    body: "",
  });
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [recipientInfo, setRecipientInfo] = useState("");

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // AI generation state
  const [streamingSubject, setStreamingSubject] = useState("");
  const [streamingBody, setStreamingBody] = useState("");
  const [closeStreamConnection, setCloseStreamConnection] = useState(null);
  const [aiStatus, setAiStatus] = useState("");
  const [assistantType, setAssistantType] = useState("");

  // Fetch emails on component mount
  useEffect(() => {
    fetchEmails();
  }, []);

  // Cleanup stream connection on unmount
  useEffect(() => {
    return () => {
      if (closeStreamConnection) {
        closeStreamConnection();
      }
    };
  }, [closeStreamConnection]);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await emailApi.getEmails();
      setEmails(data.emails || []);
    } catch (error) {
      console.error("Error fetching emails:", error);
      setError("Failed to load emails. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleComposeSubmit = async () => {
    try {
      setError(null);
      setValidationErrors({});

      // Validate form
      const validation_result = validation.validateComposeForm(composeForm);
      if (!validation_result.isValid) {
        setValidationErrors(validation_result.errors);
        return;
      }

      setLoading(true);
      await emailApi.createEmail(composeForm);

      // Success - close dialog and refresh
      setComposeOpen(false);
      setComposeForm({ to: "", cc: "", bcc: "", subject: "", body: "" });
      await fetchEmails();
    } catch (error) {
      console.error("Error sending email:", error);
      setError("Failed to send email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      setError("Please enter a description for your email.");
      return;
    }

    try {
      setAiGenerating(true);
      setError(null);
      setStreamingSubject("");
      setStreamingBody("");
      setAiStatus("");
      setAssistantType("");
      setAiPromptOpen(false);

      // Clear existing form content for streaming
      setComposeForm((prev) => ({
        ...prev,
        subject: "",
        body: "",
      }));

      // Start streaming email generation
      const closeConnection = aiApi.streamEmailGeneration(
        aiPrompt,
        recipientInfo || composeForm.to || null, // Use recipient info from dialog or compose form
        // onUpdate callback - enhanced to handle all update types
        (update) => {
          switch (update.type) {
            case "classification":
              if (update.status === "classifying") {
                setAiStatus(
                  update.message || "AI is analyzing your request..."
                );
              } else if (update.emailType) {
                setAssistantType(update.emailType);
                setAiStatus(
                  update.message || `Using ${update.emailType} assistant`
                );
              }
              break;

            case "generation":
              setAiStatus(update.message || "Generating your email content...");
              break;

            case "subject":
              setStreamingSubject(update.content);
              setComposeForm((prev) => ({
                ...prev,
                subject: update.content,
              }));
              break;

            case "body":
              setStreamingBody(update.content);
              setComposeForm((prev) => ({
                ...prev,
                body: update.content,
              }));
              // Update status to show progress
              if (update.isComplete) {
                setAiStatus("Email generation completed!");
              }
              break;
          }
        },
        // onComplete callback
        (result) => {
          console.log("Email generation completed:", result);
          setAiGenerating(false);
          setAiPrompt("");
          setRecipientInfo("");
          setAiStatus(
            "Email generated successfully! You can now edit and send."
          );
          setTimeout(() => setAiStatus(""), 3000); // Clear status after 3 seconds
        },
        // onError callback - enhanced error handling
        (error) => {
          console.error("Streaming error:", error);
          const errorMessage =
            error.message || "Failed to generate email. Please try again.";
          setError(errorMessage);
          setAiPromptOpen(true); // Reopen modal so user can retry
          setAiGenerating(false);
          setAiPrompt("");
          setRecipientInfo("");
          setAiStatus("");
        }
      );

      // Store close function for cleanup
      setCloseStreamConnection(() => closeConnection);
    } catch (error) {
      console.error("Error starting email generation:", error);
      setError("Failed to generate email. Please try again.");
      setAiPromptOpen(true);
      setAiGenerating(false);
      setAiPrompt("");
      setRecipientInfo("");
      setAiStatus("");
    }
  };

  return (
    <Box sx={{ height: "100vh", display: "flex" }}>
      {/* Error Display */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{
            position: "fixed",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1300,
          }}
        >
          {error}
        </Alert>
      )}

      <Grid container sx={{ height: "100%" }}>
        {/* Email Sidebar */}
        <Grid
          item
          xs={4}
          sx={{
            borderRight: 1,
            borderColor: "divider",
            height: "100vh",
            overflow: "auto",
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="h6">Inbox</Typography>
            <Typography variant="body2" color="text.secondary">
              {emails.length} emails
            </Typography>
          </Box>
          <List sx={{ p: 0 }}>
            {loading && emails.length === 0 ? (
              <ListItem>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2">Loading emails...</Typography>
                </Box>
              </ListItem>
            ) : (
              <>
                {emails.map((email) => (
                  <ListItem
                    key={email.id}
                    sx={{
                      borderBottom: 1,
                      borderColor: "divider",
                      cursor: "pointer",
                      "&:hover": { backgroundColor: "action.hover" },
                      backgroundColor:
                        selectedEmail?.id === email.id
                          ? "action.selected"
                          : "transparent",
                    }}
                    onClick={() => setSelectedEmail(email)}
                  >
                    <ListItemText
                      primary={email.subject || "No Subject"}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.primary">
                            To: {email.to}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(email.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
                {emails.length === 0 && !loading && (
                  <ListItem>
                    <ListItemText
                      primary="No emails yet"
                      secondary="Start by composing your first email"
                    />
                  </ListItem>
                )}
              </>
            )}
          </List>
        </Grid>

        {/* Email Viewer */}
        <Grid
          item
          xs={8}
          sx={{ height: "100vh", display: "flex", flexDirection: "column" }}
        >
          {selectedEmail ? (
            <Paper sx={{ m: 2, p: 3, flex: 1, overflow: "auto" }}>
              <Typography variant="h5" gutterBottom>
                {selectedEmail.subject || "No Subject"}
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Chip label={`To: ${selectedEmail.to}`} sx={{ mr: 1, mb: 1 }} />
                {selectedEmail.cc && (
                  <Chip
                    label={`CC: ${selectedEmail.cc}`}
                    sx={{ mr: 1, mb: 1 }}
                  />
                )}
                {selectedEmail.bcc && (
                  <Chip
                    label={`BCC: ${selectedEmail.bcc}`}
                    sx={{ mr: 1, mb: 1 }}
                  />
                )}
              </Box>

              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ mb: 2 }}
              >
                {new Date(selectedEmail.created_at).toLocaleString()}
              </Typography>

              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                {selectedEmail.body || "No content"}
              </Typography>
            </Paper>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "text.secondary",
              }}
            >
              <Typography variant="h6">Select an email to view</Typography>
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Compose Email FAB */}
      <Fab
        color="primary"
        aria-label="compose"
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
        }}
        onClick={() => setComposeOpen(true)}
      >
        <EditIcon />
      </Fab>

      {/* Compose Email Dialog */}
      <Dialog
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Compose Email
          <Button
            startIcon={
              aiGenerating ? (
                <CircularProgress size={16} />
              ) : (
                <AutoAwesomeIcon />
              )
            }
            sx={{ float: "right" }}
            onClick={() => setAiPromptOpen(true)}
            disabled={aiGenerating}
          >
            {aiGenerating ? "Generating..." : "AI ✨"}
          </Button>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="To"
            value={composeForm.to}
            onChange={(e) => {
              setComposeForm((prev) => ({ ...prev, to: e.target.value }));
              // Clear validation error when user starts typing
              if (validationErrors.to) {
                setValidationErrors((prev) => ({ ...prev, to: undefined }));
              }
            }}
            margin="normal"
            error={!!validationErrors.to}
            helperText={validationErrors.to}
            required
          />
          <TextField
            fullWidth
            label="CC"
            value={composeForm.cc}
            onChange={(e) => {
              setComposeForm((prev) => ({ ...prev, cc: e.target.value }));
              if (validationErrors.cc) {
                setValidationErrors((prev) => ({ ...prev, cc: undefined }));
              }
            }}
            margin="normal"
            error={!!validationErrors.cc}
            helperText={validationErrors.cc}
          />
          <TextField
            fullWidth
            label="BCC"
            value={composeForm.bcc}
            onChange={(e) => {
              setComposeForm((prev) => ({ ...prev, bcc: e.target.value }));
              if (validationErrors.bcc) {
                setValidationErrors((prev) => ({ ...prev, bcc: undefined }));
              }
            }}
            margin="normal"
            error={!!validationErrors.bcc}
            helperText={validationErrors.bcc}
          />
          <TextField
            fullWidth
            label="Subject"
            value={composeForm.subject}
            onChange={(e) => {
              setComposeForm((prev) => ({ ...prev, subject: e.target.value }));
              if (validationErrors.subject) {
                setValidationErrors((prev) => ({
                  ...prev,
                  subject: undefined,
                }));
              }
            }}
            margin="normal"
            error={!!validationErrors.subject}
            helperText={validationErrors.subject}
            required
            disabled={aiGenerating}
            sx={aiGenerating ? { backgroundColor: "action.hover" } : {}}
          />
          <TextField
            fullWidth
            label="Body"
            multiline
            rows={8}
            value={composeForm.body}
            onChange={(e) => {
              setComposeForm((prev) => ({ ...prev, body: e.target.value }));
              if (validationErrors.body) {
                setValidationErrors((prev) => ({ ...prev, body: undefined }));
              }
            }}
            margin="normal"
            error={!!validationErrors.body}
            helperText={validationErrors.body}
            required
            disabled={aiGenerating}
            sx={aiGenerating ? { backgroundColor: "action.hover" } : {}}
          />

          {/* AI Status Display */}
          {(aiGenerating || aiStatus) && (
            <Box
              sx={{ mt: 2, p: 2, bgcolor: "primary.light", borderRadius: 1 }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                {aiGenerating && <CircularProgress size={16} />}
                <Typography variant="body2" color="primary.contrastText">
                  {aiStatus || "AI is working..."}
                </Typography>
              </Box>
              {assistantType && (
                <Chip
                  label={`${
                    assistantType === "sales"
                      ? "💼 Sales"
                      : assistantType === "follow-up"
                      ? "📧 Follow-up"
                      : "✨ General"
                  } Assistant`}
                  size="small"
                  sx={{
                    bgcolor: "primary.dark",
                    color: "primary.contrastText",
                  }}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComposeOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleComposeSubmit}
            variant="contained"
            disabled={loading || aiGenerating}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? "Sending..." : "Send"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Prompt Dialog */}
      <Dialog
        open={aiPromptOpen}
        onClose={() => {
          if (aiGenerating) {
            // Allow closing dialog during generation by canceling the stream
            if (closeStreamConnection) {
              closeStreamConnection();
              setCloseStreamConnection(null);
              setAiGenerating(false);
            }
          }
          // Reset form fields
          setAiPrompt("");
          setRecipientInfo("");
          setAiStatus("");
          setAiPromptOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>AI Email Assistant</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            What should this email be about?
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Email Description"
            placeholder="e.g., Meeting request for Tuesday, Sales pitch for our new software, Follow-up on project proposal"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            disabled={aiGenerating}
            error={!aiPrompt.trim() && error}
            sx={{ mb: 2 }}
          />

          <Typography variant="body2" sx={{ mb: 1 }}>
            Recipient Info (optional):
          </Typography>
          <TextField
            fullWidth
            label="Recipient Information"
            placeholder="e.g., Tech startup CEO, Marketing manager at Fortune 500 company"
            value={recipientInfo}
            onChange={(e) => setRecipientInfo(e.target.value)}
            disabled={aiGenerating}
            sx={{ mb: 2 }}
          />

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 2, display: "block" }}
          >
            <strong>🤖 AI Assistants:</strong>
            <br />• <strong>💼 Sales Assistant:</strong> Business proposals,
            pitches, partnerships (concise, under 40 words)
            <br />• <strong>📧 Follow-up Assistant:</strong> Check-ins, meeting
            requests, project follow-ups (polite, detailed)
            <br />• <strong>✨ General Assistant:</strong> All other email types
          </Typography>

          {aiGenerating && (
            <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Generating your email with AI...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              // Close stream connection if active
              if (closeStreamConnection && aiGenerating) {
                closeStreamConnection();
                setCloseStreamConnection(null);
                setAiGenerating(false);
              }
              // Reset form fields
              setAiPrompt("");
              setRecipientInfo("");
              setAiStatus("");
              setAiPromptOpen(false);
            }}
            disabled={false} // Always allow cancel
          >
            Cancel
          </Button>
          <Button
            onClick={handleAIGenerate}
            variant="contained"
            disabled={!aiPrompt.trim() || aiGenerating}
            startIcon={
              aiGenerating ? (
                <CircularProgress size={16} />
              ) : (
                <AutoAwesomeIcon />
              )
            }
          >
            {aiGenerating ? "Generating..." : "Generate Email"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
