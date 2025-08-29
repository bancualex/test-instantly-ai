import React, { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";

const StreamingText = ({
  text,
  isStreaming,
  onComplete,
  typingSpeed = 50,
  ...props
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!isStreaming || !text) {
      setDisplayedText(text || "");
      return;
    }

    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, typingSpeed);

      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [text, currentIndex, isStreaming, typingSpeed, onComplete]);

  useEffect(() => {
    // Reset when text changes
    if (text !== displayedText) {
      setCurrentIndex(0);
      setDisplayedText("");
    }
  }, [text]);

  return (
    <Box {...props}>
      <Typography component="span">
        {displayedText}
        {isStreaming && currentIndex < (text?.length || 0) && (
          <Box
            component="span"
            sx={{
              borderRight: "2px solid",
              borderColor: "primary.main",
              animation: "blink 1s infinite",
              "@keyframes blink": {
                "0%, 50%": { borderColor: "primary.main" },
                "51%, 100%": { borderColor: "transparent" },
              },
            }}
          />
        )}
      </Typography>
    </Box>
  );
};

export default StreamingText;
