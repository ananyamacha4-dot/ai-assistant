import {
  ArrowUp,
  FilePlus,
  FileText,
  Mail,
  Mic,
  Paperclip,
  Square,
  Volume2,
  X
}
from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  useNavigate
} from "react-router-dom";

import ReactMarkdown from "react-markdown";

import {
  useAuth
} from "./components/AuthProvider";

import {
  API_BASE_URL
} from "./config";

import { Prism as SyntaxHighlighter }
from "react-syntax-highlighter";

import { oneDark }
from "react-syntax-highlighter/dist/esm/styles/prism";

import "./index.css";

function makeChatId() {

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {

    return crypto.randomUUID();
  }

  return (
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );
}

function createStarterChat() {

  return {
    id: makeChatId(),
    title: "New Chat",
    messages: [],
  };
}

function readJson(key, fallback) {

  try {

    const value =
      localStorage.getItem(key);

    return value
      ? JSON.parse(value)
      : fallback;

  } catch (error) {

    return fallback;
  }
}

function createFallbackReply() {

  return (
    "The AI server is waking up (free tier cold start). " +
    "This usually takes 30 to 60 seconds the first time. " +
    "Please send your message again in a moment."
  );
}

function Home() {
  const [showEmailModal, setShowEmailModal] =
  useState(false);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [isListening, setIsListening] =
    useState(false);

  const [isRecording, setIsRecording] =
    useState(false);

  const [isSpeaking, setIsSpeaking] =
    useState(false);

  const [speakingMessageKey, setSpeakingMessageKey] =
    useState(null);

    const [voiceMode, setVoiceMode] =
  useState(false);

  const mediaRecorderRef = useRef(null);

  const speechRecognitionRef = useRef(null);

  const audioChunksRef = useRef([]);

  const audioStreamRef = useRef(null);

  const pdfInputRef = useRef(null);

  const textareaRef = useRef(null);

  const audioPlayerRef = useRef(null);

  const audioPlayerUrlRef = useRef(null);

  const [attachedPdf, setAttachedPdf] =
    useState(null);

  const [pdfUploading, setPdfUploading] =
    useState(false);

  const [showDocModal, setShowDocModal] =
    useState(false);

  const [docData, setDocData] = useState({
    topic: "",
    doc_type: "letter",
    length: "medium",
  });

  const [docGenerating, setDocGenerating] =
    useState(false);

  const [docElapsed, setDocElapsed] =
    useState(0);

  const docTimerRef = useRef(null);

  const {
    user,
    logout
  } =
    useAuth();

const [emailData, setEmailData] =
  useState({

    senderEmail: "",

    senderPassword: "",

    recipientEmail: "",

    description: "",

    length: "medium",
  });
  const navigate =
  useNavigate();

  const [message, setMessage] =
    useState("");

  const [conversations, setConversations] =
    useState(() => {

      return [
        createStarterChat(),
      ];
    });

  const [currentChatId, setCurrentChatId] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const messagesEndRef =
    useRef(null);

  const userStorageId =
    encodeURIComponent(
      user?.email?.toLowerCase() ||
      "guest"
    );

  const conversationsKey =
    `conversations:${userStorageId}`;

  const currentChatIdKey =
    `currentChatId:${userStorageId}`;

  useEffect(() => {

    messagesEndRef.current
      ?.scrollIntoView({
        block: "end",
        behavior: "auto",
      });

  }, [conversations, loading]);

  useEffect(() => {

    const controller = new AbortController();

    const warmupTimeout = setTimeout(
      () => controller.abort(),
      90000
    );

    fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal,
    })
      .catch(() => {})
      .finally(() => clearTimeout(warmupTimeout));

    return () => {
      clearTimeout(warmupTimeout);
      controller.abort();
    };

  }, []);

  useEffect(() => {

    if (!user) return;

    const savedConversations =
      readJson(
        conversationsKey,
        null
      );

    const nextConversations =
      Array.isArray(savedConversations) &&
      savedConversations.length > 0
        ? savedConversations
        : [
            createStarterChat(),
          ];

    const savedCurrentChatId =
      readJson(
        currentChatIdKey,
        null
      );

    const nextCurrentChatId =
      nextConversations.some(
        (chat) =>
          chat.id === savedCurrentChatId
      )
        ? savedCurrentChatId
        : nextConversations[0].id;

    setConversations(
      nextConversations
    );

    setCurrentChatId(
      nextCurrentChatId
    );

  }, [
    user,
    conversationsKey,
    currentChatIdKey
  ]);

  useEffect(() => {

    if (!user || !currentChatId) {

      return;
    }

    localStorage.setItem(
      conversationsKey,
      JSON.stringify(conversations)
    );

    localStorage.setItem(
      currentChatIdKey,
      JSON.stringify(currentChatId)
    );

  }, [
    user,
    conversationsKey,
    currentChatIdKey,
    conversations,
    currentChatId
  ]);

  const currentChat =
    conversations.find(
      (chat) =>
        chat.id === currentChatId
    );

  const createNewChat = () => {

    releaseVoiceResources();

    setMessage("");

    setAttachedPdf(null);

    const existingEmpty = conversations.find(
      (chat) =>
        chat.messages.length === 0 &&
        chat.title === "New Chat"
    );

    if (existingEmpty) {

      setCurrentChatId(existingEmpty.id);

      return;
    }

    const newChat = {

      id: makeChatId(),

      title: "New Chat",

      messages: [],
    };

    setConversations(
      (prev) => [newChat, ...prev]
    );

    setCurrentChatId(newChat.id);
  };

  const profileName =
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "User";

  const profileEmail =
    user?.email || "";

  const initials =
    profileName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part[0]?.toUpperCase()
      )
      .join("") || "U";

  const handleLogout =
    () => {

      logout();

      navigate("/login");
    };
const sendEmail =
  async () => {

    try {

      const response =
        await fetch(

          `${API_BASE_URL}/send-email`,

          {

            method: "POST",

            headers: {

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              emailData
            ),
          }
        );

      const data =
        await response.json();

      alert(
        data.message
      );

      setShowEmailModal(
        false
      );

    } catch (error) {

      alert(
        "Failed to send email"
      );
    }
  };

const generateDocument =
  async () => {

    if (!docData.topic.trim()) {

      alert("Please describe the document.");

      return;
    }

    setDocGenerating(true);

    const controller = new AbortController();

    const timeoutMs = 90 * 1000;

    const timeoutId = setTimeout(() => {

      controller.abort();
    }, timeoutMs);

    try {

      const response = await fetch(
        `${API_BASE_URL}/generate-pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic:    docData.topic,
            doc_type: docData.doc_type,
            length:   docData.length,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      const contentType =
        response.headers.get("content-type") || "";

      if (
        !response.ok ||
        contentType.includes("application/json")
      ) {

        const errJson = await response
          .json()
          .catch(() => ({}));

        throw new Error(
          errJson.error ||
          "Document generation failed"
        );
      }

      const disposition =
        response.headers.get(
          "content-disposition"
        ) || "";

      const match = disposition.match(
        /filename="?([^"]+)"?/i
      );

      const filename = match
        ? match[1]
        : `${docData.doc_type || "document"}.pdf`;

      const blob = await response.blob();

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;

      a.download = filename;

      document.body.appendChild(a);

      a.click();

      a.remove();

      URL.revokeObjectURL(url);

      setShowDocModal(false);

      setDocData((prev) => ({
        ...prev,
        topic: "",
      }));

    } catch (error) {

      clearTimeout(timeoutId);

      if (error.name === "AbortError") {

        alert(
          "PDF generation timed out after 90s. " +
          "The backend may be cold-starting, offline, or stuck. " +
          "Check the backend terminal for errors and try again."
        );

      } else if (
        typeof error.message === "string" &&
        error.message.includes("Failed to fetch")
      ) {

        alert(
          "Could not reach the backend at " +
          API_BASE_URL +
          ". Is it running? Check the terminal."
        );

      } else {

        alert(
          error.message ||
          "PDF generation failed"
        );
      }

    } finally {

      clearTimeout(timeoutId);

      setDocGenerating(false);
    }
  };

  const stopSpeaking = () => {

    const player = audioPlayerRef.current;

    if (player) {

      try {
        player.pause();
        player.currentTime = 0;
      } catch (error) {
        console.debug("Audio stop failed", error);
      }

      audioPlayerRef.current = null;
    }

    const oldUrl = audioPlayerUrlRef.current;

    if (oldUrl) {

      URL.revokeObjectURL(oldUrl);

      audioPlayerUrlRef.current = null;
    }

    setIsSpeaking(false);

    setSpeakingMessageKey(null);
  };

  const speakText =
    async (text, messageKey = null) => {

      stopSpeaking();

      const cleaned =
        (text || "").trim();

      if (!cleaned) return;

      try {

        const response = await fetch(
          `${API_BASE_URL}/speak`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: cleaned,
            }),
          }
        );

        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        if (
          !response.ok ||
          contentType.includes("application/json")
        ) {

          const errJson = await response
            .json()
            .catch(() => ({}));

          throw new Error(
            errJson.error ||
            "Speech synthesis failed"
          );
        }

        const blob = await response.blob();

        const url = URL.createObjectURL(blob);

        audioPlayerUrlRef.current = url;

        const audio = new Audio(url);

        audioPlayerRef.current = audio;

        audio.onplay = () => {
          setIsSpeaking(true);
          setSpeakingMessageKey(messageKey);
        };

        const cleanup = () => {

          setIsSpeaking(false);
          setSpeakingMessageKey(null);

          if (audioPlayerUrlRef.current === url) {

            URL.revokeObjectURL(url);
            audioPlayerUrlRef.current = null;
          }

          if (audioPlayerRef.current === audio) {

            audioPlayerRef.current = null;
          }
        };

        audio.onended = cleanup;
        audio.onerror = cleanup;

        await audio.play();

      } catch (error) {

        setIsSpeaking(false);
        setSpeakingMessageKey(null);

        console.error(
          "speakText error:",
          error
        );

        if (window.speechSynthesis) {

          const fallbackSpeech =
            new SpeechSynthesisUtterance(
              cleaned
                .replace(/[`*_#>()]/g, "")
                .replaceAll("[", "")
                .replaceAll("]", "")
            );

          fallbackSpeech.lang = "en-US";
          fallbackSpeech.rate = 1;
          fallbackSpeech.pitch = 1;

          fallbackSpeech.onstart = () => {
            setIsSpeaking(true);
            setSpeakingMessageKey(messageKey);
          };

          fallbackSpeech.onend = () => {
            setIsSpeaking(false);
            setSpeakingMessageKey(null);
          };

          fallbackSpeech.onerror = () => {
            setIsSpeaking(false);
            setSpeakingMessageKey(null);
          };

          window.speechSynthesis.speak(
            fallbackSpeech
          );

          return;
        }

        alert("Text to speech failed. Please try again.");
      }
    };

  const toggleSpeakMessage =
    (text, messageKey) => {

      if (
        isSpeaking &&
        speakingMessageKey === messageKey
      ) {

        stopSpeaking();

        return;
      }

      speakText(text, messageKey);
    };

  useEffect(() => {

    const el = textareaRef.current;

    if (!el) return;

    el.style.height = "40px";

    if (el.scrollHeight > 40) {

      el.style.height = `${Math.min(
        el.scrollHeight,
        200
      )}px`;
    }

  }, [message]);

  useEffect(() => {

    if (!docGenerating) {

      if (docTimerRef.current) {

        clearInterval(docTimerRef.current);

        docTimerRef.current = null;
      }

      setDocElapsed(0);

      return;
    }

    const startedAt = Date.now();

    setDocElapsed(0);

    docTimerRef.current = setInterval(() => {

      setDocElapsed(
        Math.floor(
          (Date.now() - startedAt) / 1000
        )
      );
    }, 250);

    return () => {

      if (docTimerRef.current) {

        clearInterval(docTimerRef.current);

        docTimerRef.current = null;
      }
    };
  }, [docGenerating]);

  const releaseVoiceResources =
    useCallback(() => {

      if (window.speechSynthesis) {

        window.speechSynthesis.cancel();
      }

      const player = audioPlayerRef.current;

      if (player) {

        try {
          player.pause();
          player.currentTime = 0;
        } catch (error) {
          console.debug("Audio cleanup failed", error);
        }

        audioPlayerRef.current = null;
      }

      const oldUrl = audioPlayerUrlRef.current;

      if (oldUrl) {

        URL.revokeObjectURL(oldUrl);

        audioPlayerUrlRef.current = null;
      }

      const recorder = mediaRecorderRef.current;

      if (
        recorder &&
        recorder.state !== "inactive"
      ) {

        try {
          recorder.stop();
        } catch (error) {
          console.debug("Recorder cleanup failed", error);
        }
      }

      mediaRecorderRef.current = null;

      const recognition = speechRecognitionRef.current;

      if (recognition) {

        try {
          recognition.abort();
        } catch (error) {
          console.debug("Recognition cleanup failed", error);
        }

        speechRecognitionRef.current = null;
      }

      const stream = audioStreamRef.current;

      if (stream) {

        stream.getTracks().forEach(
          (track) => track.stop()
        );

        audioStreamRef.current = null;
      }

      audioChunksRef.current = [];

      setIsSpeaking(false);

      setIsRecording(false);

      setIsListening(false);

      setSpeakingMessageKey(null);
    }, []);

  useEffect(() => {

    return () => {

      releaseVoiceResources();
    };
  }, [releaseVoiceResources]);

  useEffect(() => {

    const handlePageExit = () => {

      releaseVoiceResources();
    };

    window.addEventListener(
      "beforeunload",
      handlePageExit
    );

    window.addEventListener(
      "pagehide",
      handlePageExit
    );

    return () => {

      window.removeEventListener(
        "beforeunload",
        handlePageExit
      );

      window.removeEventListener(
        "pagehide",
        handlePageExit
      );
    };
  }, [releaseVoiceResources]);

  useEffect(() => {

    releaseVoiceResources();

  }, [currentChatId, releaseVoiceResources]);

  const sendMessageText =
    async (
      text,
      options = {}
    ) => {

    const currentMessage =
      text.trim();

    if (!currentMessage) return;

    const activeChat =
      conversations.find(
        (chat) =>
          chat.id === currentChatId
      );

    if (!activeChat) return;

    const userMessage = {

      sender: "user",

      text: currentMessage,
    };

    const updatedConversations =
      conversations.map((chat) => {

        if (
          chat.id === currentChatId
        ) {

          return {

            ...chat,

            title:
              chat.messages.length === 0
                ? currentMessage.slice(0, 25)
                : chat.title,

            messages: [
              ...chat.messages,
              userMessage,
            ],
          };
        }

        return chat;
      });

    setConversations(
      updatedConversations
    );

    setMessage("");

    setLoading(true);

    let timeoutId = null;

    try {

      const controller =
        new AbortController();

      timeoutId = setTimeout(
        () => controller.abort(),
        90000
      );

      const response = await fetch(
        `${API_BASE_URL}/chat`,
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({

            message: currentMessage,

            history:
              activeChat.messages || [],
          }),

          signal: controller.signal,
        }
      );

      if (!response.ok) {

        throw new Error(
          "Backend chat request failed"
        );
      }

      const data =
        await response.json();

      const replyText =
        (data.reply || "").trim();

      if (
        !replyText ||
        replyText.startsWith("Backend Error:") ||
        replyText.startsWith("Gemini API Error:")
      ) {

        throw new Error(
          replyText || "Empty AI reply"
        );
      }

      const botMessage = {

        sender: "bot",

        text: replyText,
      };

      const botMessageKey =
        `${currentChatId}-${
          activeChat.messages.length + 1
        }`;

      if (options.speak) {

        speakText(
          botMessage.text,
          botMessageKey
        );
      }

      setConversations(
        (prev) =>
          prev.map((chat) => {

            if (
              chat.id === currentChatId
            ) {

              return {

                ...chat,

                messages: [
                  ...chat.messages,
                  botMessage,
                ],
              };
            }

            return chat;
          })
      );

    } catch (error) {

      const errorMessage = {

        sender: "bot",

        text: createFallbackReply(),
      };

      const errorMessageKey =
        `${currentChatId}-${
          activeChat.messages.length + 1
        }`;

      if (options.speak) {

        speakText(
          errorMessage.text,
          errorMessageKey
        );
      }

      setConversations(
        (prev) =>
          prev.map((chat) => {

            if (
              chat.id === currentChatId
            ) {

              return {

                ...chat,

                messages: [
                  ...chat.messages,
                  errorMessage,
                ],
              };
            }

            return chat;
          })
      );
    } finally {

      if (timeoutId) {

        clearTimeout(timeoutId);
      }

      setLoading(false);
    }

  };

  const sendMessage =
    async () => {

      await sendMessageText(
        message
      );
    };
const uploadPDF =
  async (e) => {

    const file =
      e.target.files?.[0];

    e.target.value = "";

    if (!file) return;

    setAttachedPdf({
      name: file.name,
      size: file.size,
    });

    setPdfUploading(true);

    const formData = new FormData();

    formData.append("file", file);

    try {

      const response = await fetch(
        `${API_BASE_URL}/upload-pdf`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {

        throw new Error(
          data.message ||
          "PDF upload failed"
        );
      }

    } catch (error) {

      setAttachedPdf(null);

      alert(
        "PDF upload failed"
      );

    } finally {

      setPdfUploading(false);
    }
  };

const clearAttachedPdf = () => {

  setAttachedPdf(null);
};

const triggerPdfPicker = () => {

  pdfInputRef.current?.click();
};

const pickAudioMimeType = () => {

  if (typeof MediaRecorder === "undefined") {

    return "";
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];

  for (const type of candidates) {

    if (MediaRecorder.isTypeSupported(type)) {

      return type;
    }
  }

  return "";
};

const stopAudioStream = () => {

  const stream = audioStreamRef.current;

  if (stream) {

    stream.getTracks().forEach(
      (track) => track.stop()
    );

    audioStreamRef.current = null;
  }
};

const sendAudioForTranscription =
  async (blob) => {

    setIsListening(true);

    try {

      const formData = new FormData();

      const audioFilename =
        blob.type.includes("mp4")
          ? "voice.mp4"
          : blob.type.includes("ogg")
          ? "voice.ogg"
          : "voice.webm";

      formData.append(
        "file",
        blob,
        audioFilename
      );

      const response = await fetch(
        `${API_BASE_URL}/transcribe`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {

        throw new Error(
          data.error ||
          "Voice transcription failed"
        );
      }

      const transcript =
        (data.transcript || "").trim();

      if (!transcript) {

        speakText(
          "I could not understand that. Please try again."
        );

        return;
      }

      await sendMessageText(
        transcript,
        { speak: true }
      );

    } catch (error) {

      speakText(
        "Voice transcription failed. Please try again."
      );

    } finally {

      setIsListening(false);
    }
  };

const getSpeechRecognition = () => {

  return (
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    null
  );
};

const startBrowserSpeechRecognition =
  () => {

    const SpeechRecognition =
      getSpeechRecognition();

    if (!SpeechRecognition) {

      return false;
    }

    const recognition =
      new SpeechRecognition();

    speechRecognitionRef.current =
      recognition;

    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {

      setIsRecording(true);
    };

    recognition.onresult = async (event) => {

      const transcript =
        Array.from(event.results)
          .map((result) => result[0]?.transcript || "")
          .join(" ")
          .trim();

      if (transcript) {

        await sendMessageText(
          transcript,
          { speak: true }
        );

      } else {

        speakText(
          "I could not understand that. Please try again."
        );
      }
    };

    recognition.onerror = () => {

      setIsRecording(false);

      speakText(
        "Voice transcription failed. Please try again."
      );
    };

    recognition.onend = () => {

      if (
        speechRecognitionRef.current ===
        recognition
      ) {

        speechRecognitionRef.current = null;
      }

      setIsRecording(false);
    };

    recognition.start();

    return true;
  };

const startVoiceInput = async () => {

  if (startBrowserSpeechRecognition()) {

    return;
  }

  if (
    !navigator.mediaDevices ||
    typeof MediaRecorder === "undefined"
  ) {

    alert(
      "Microphone recording is not supported in this browser."
    );

    return;
  }

  try {

    const stream =
      await navigator.mediaDevices.getUserMedia(
        { audio: true }
      );

    audioStreamRef.current = stream;

    const mimeType = pickAudioMimeType();

    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    mediaRecorderRef.current = recorder;

    audioChunksRef.current = [];

    recorder.ondataavailable = (event) => {

      if (event.data && event.data.size > 0) {

        audioChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {

      stopAudioStream();

      setIsRecording(false);

      const chunks = audioChunksRef.current;

      audioChunksRef.current = [];

      if (chunks.length === 0) {

        return;
      }

      const blob = new Blob(
        chunks,
        {
          type:
            recorder.mimeType ||
            "audio/webm",
        }
      );

      await sendAudioForTranscription(blob);
    };

    recorder.onerror = () => {

      stopAudioStream();

      setIsRecording(false);

      speakText(
        "Microphone error. Please try again."
      );
    };

    setIsRecording(true);

    recorder.start();

  } catch (error) {

    stopAudioStream();

    setIsRecording(false);

    alert(
      "Could not access microphone. Please grant permission."
    );
  }
};

const stopVoiceInput = () => {

  const recognition =
    speechRecognitionRef.current;

  if (recognition) {

    try {
      recognition.stop();
    } catch (error) {
      console.debug("Recognition stop failed", error);
    }

    speechRecognitionRef.current = null;

    setIsRecording(false);

    return;
  }

  const recorder = mediaRecorderRef.current;

  if (
    recorder &&
    recorder.state !== "inactive"
  ) {

    recorder.stop();

  } else {

    stopAudioStream();

    setIsRecording(false);
  }
};
const startContinuousVoice =
  async () => {

    setVoiceMode(true);

    await startVoiceInput();
  };
  return (

    <div className="app">

      {/* SIDEBAR */}
      <div className="sidebar">

        <div className="logo">
          AI
        </div>

        <button
          className="new-chat-btn"
          onClick={createNewChat}
        >
          + New Chat
        </button>

        <div className="chat-list">

          {conversations.map(
            (chat) => (

              <div
                key={chat.id}

                className={`chat-item ${
                  currentChatId ===
                  chat.id
                    ? "active"
                    : ""
                }`}

                onClick={() =>
                  setCurrentChatId(
                    chat.id
                  )
                }
              >

                {chat.title}

              </div>
            )
          )}

        </div>

        <div className="sidebar-profile">

          {profileOpen && (

            <div className="profile-popover">

              <div className="profile-popover-name">
                {profileName}
              </div>

              {profileEmail && (

                <div className="profile-popover-email">
                  {profileEmail}
                </div>
              )}

              <button
                className="profile-logout-btn"
                onClick={handleLogout}
              >
                Logout
              </button>

            </div>
          )}

          <button
            className={`profile-card ${
              profileOpen ? "active" : ""
            }`}
            onClick={() =>
              setProfileOpen(
                (open) => !open
              )
            }
            aria-expanded={profileOpen}
          >

            <span className="profile-avatar">
              {initials}
            </span>

            <span className="profile-copy">

              <span className="profile-name">
                {profileName}
              </span>

              <span className="profile-action">
                Go
              </span>

            </span>

          </button>

        </div>

      </div>

      {/* MAIN */}
      <div className="main">

        {/* TOPBAR */}
        <div className="topbar">

          <h1>
            AI Assistant
          </h1>

        </div>

        {/* CHAT AREA */}
        <div className="chat-container">

          {currentChat?.messages.map(
            (msg, index) => (

              <div
  key={index}

  className={`message ${
    msg.sender === "user"
      ? "user-message"
      : "bot-message"
  }`}
>

  <div className="message-content">

    <ReactMarkdown

                  components={{

  p({ children }) {

    const hasCodeBlock =
      Array.isArray(children) &&

      children.some(

        (child) =>

          child?.type === "pre"
      );

    if (hasCodeBlock) {

      return <>{children}</>;
    }

    return <p>{children}</p>;
  },

  code({
    inline,
    className,
    children,
    ...props
  }) {

    const match =
      /language-(\w+)/.exec(
        className || ""
      );

    const codeString =
      String(children).replace(
        /\n$/,
        ""
      );

    const copyCode =
      async () => {

        try {

          await navigator.clipboard
            .writeText(codeString);

        } catch (err) {

          console.error(
            "Copy failed",
            err
          );
        }
      };

    if (!inline) {

      return (

        <div className="code-block-wrapper">

          <div className="code-actions">

            <button
              className="copy-btn"
              onClick={copyCode}
            >
              Copy
            </button>

            <button
              className="run-btn"
              onClick={() =>

                navigate(
                  "/interpreter",
                  {

                    state: {
                      code: codeString,
                    },
                  }
                )
              }
            >
              Interpreter
            </button>

          </div>

          <SyntaxHighlighter

            style={oneDark}

            language={
              match
                ? match[1]
                : "python"
            }

            PreTag="div"

            {...props}
          >

            {codeString}

          </SyntaxHighlighter>

        </div>
      );
    }

    return (

      <code
        className={className}
        {...props}
      >

        {children}

      </code>
    );
  },
}}

                >

                  {msg.text}

                </ReactMarkdown>
            </div>

  {msg.sender === "bot" && (

    <div className="message-actions">

      <button
        className={`msg-action-btn ${
          speakingMessageKey ===
          `${currentChatId}-${index}`
            ? "active"
            : ""
        }`}
        onClick={() =>
          toggleSpeakMessage(
            msg.text,
            `${currentChatId}-${index}`
          )
        }
        title={
          speakingMessageKey ===
          `${currentChatId}-${index}`
            ? "Stop reading"
            : "Read aloud"
        }
        aria-label={
          speakingMessageKey ===
          `${currentChatId}-${index}`
            ? "Stop reading"
            : "Read aloud"
        }
      >
        {speakingMessageKey ===
        `${currentChatId}-${index}` ? (
          <Square
            size={14}
            fill="currentColor"
          />
        ) : (
          <Volume2 size={16} />
        )}
      </button>

    </div>
  )}
              </div>
            )
          )}

          {loading && (

            <div className="message bot-message">
              <div className="message-content thinking-indicator">
                Thinking...
              </div>
            </div>

          )}

          <div ref={messagesEndRef} />

        </div>

        {/* INPUT */}
       <div className="input-container">

  {attachedPdf && (

    <div className="attachment-row">

      <div className="attachment-chip">

        <span className="attachment-icon">
          <FileText size={18} />
        </span>

        <span className="attachment-meta">

          <span className="attachment-name">
            {attachedPdf.name}
          </span>

          <span className="attachment-sub">
            {pdfUploading
              ? "Uploading..."
              : "PDF attached"}
          </span>

        </span>

        <button
          className="attachment-remove"
          onClick={clearAttachedPdf}
          title="Remove attachment"
          aria-label="Remove attachment"
        >
          <X size={14} />
        </button>

      </div>

    </div>
  )}

  <div className="input-row">

    <button
      className="composer-icon-btn attach-btn"
      onClick={triggerPdfPicker}
      title="Attach PDF"
      aria-label="Attach PDF"
      disabled={pdfUploading}
    >
      <Paperclip size={20} />
    </button>

    <input
      ref={pdfInputRef}
      type="file"
      accept=".pdf"
      hidden
      onChange={uploadPDF}
    />

    <textarea
      ref={textareaRef}
      className="composer-textarea"
      placeholder="Ask anything..."
      value={message}
      rows={1}
      onChange={(e) => setMessage(e.target.value)}
      onKeyDown={(e) => {
        if (
          e.key === "Enter" &&
          !e.shiftKey
        ) {
          e.preventDefault();
          sendMessage();
        }
      }}
    />

    <div className="input-actions">

      <button
        type="button"
        className="composer-icon-btn email-btn"
        title="Send Email"
        aria-label="Send Email"
        onClick={() => setShowEmailModal(true)}
      >
        <Mail size={20} />
      </button>

      <button
        type="button"
        className="composer-icon-btn doc-btn"
        title="Generate PDF"
        aria-label="Generate PDF"
        onClick={() => setShowDocModal(true)}
      >
        <FilePlus size={20} />
      </button>

      <button
        className={`composer-icon-btn mic-btn ${
          isSpeaking
            ? "speaking"
            : isRecording
            ? "recording"
            : isListening
            ? "listening"
            : ""
        }`}
        onClick={
          isSpeaking
            ? stopSpeaking
            : isRecording
            ? stopVoiceInput
            : startVoiceInput
        }
        disabled={isListening}
        title={
          isSpeaking
            ? "Stop speaking"
            : isRecording
            ? "Stop recording"
            : isListening
            ? "Transcribing..."
            : "Voice input"
        }
        aria-label={
          isSpeaking
            ? "Stop speaking"
            : isRecording
            ? "Stop recording"
            : isListening
            ? "Transcribing"
            : "Start voice input"
        }
      >
        {isSpeaking || isRecording ? (
          <Square
            size={18}
            fill="currentColor"
          />
        ) : (
          <Mic size={20} />
        )}
      </button>

      <button
        className="composer-icon-btn send-btn"
        onClick={sendMessage}
        title="Send message"
        aria-label="Send message"
        disabled={
          !message.trim() ||
          loading
        }
      >
        <ArrowUp size={20} strokeWidth={3} />
      </button>

    </div>

  </div>

</div>
      </div>
      {
  showEmailModal && (

    <div className="email-modal-overlay">

      <div className="email-modal">

        <h2>
          Send AI Email
        </h2>

        <input
          type="email"

          placeholder="Your Gmail"

          value={
            emailData.senderEmail
          }

          onChange={(e) =>
            setEmailData({

              ...emailData,

              senderEmail:
                e.target.value,
            })
          }
        />

        <input
          type="password"

          placeholder="Gmail App Password"

          value={
            emailData.senderPassword
          }

          onChange={(e) =>
            setEmailData({

              ...emailData,

              senderPassword:
                e.target.value,
            })
          }
        />

        <input
          type="email"

          placeholder="Recipient Email"

          value={
            emailData.recipientEmail
          }

          onChange={(e) =>
            setEmailData({

              ...emailData,

              recipientEmail:
                e.target.value,
            })
          }
        />

        <textarea

          placeholder="What should the email be about?"

          value={
            emailData.description
          }

          onChange={(e) =>
            setEmailData({

              ...emailData,

              description:
                e.target.value,
            })
          }
        />

        <select

          value={emailData.length}

          onChange={(e) =>
            setEmailData({

              ...emailData,

              length:
                e.target.value,
            })
          }
        >

          <option value="short">
            Short
          </option>

          <option value="medium">
            Medium
          </option>

          <option value="long">
            Long
          </option>

        </select>

        <div className="email-modal-buttons">

          <button
            className="cancel-btn"
            onClick={() =>
              setShowEmailModal(false)
            }
          >
            Cancel
          </button>

          <button
            className="send-email-btn"
            onClick={sendEmail}
          >
            Send Email
          </button>

        </div>

      </div>

    </div>
  )
}

      {showDocModal && (() => {

        const estimateByLength = {
          short:  6,
          medium: 12,
          long:   22,
        };

        const estimateSec =
          estimateByLength[docData.length] || 12;

        const progressPct = Math.min(
          95,
          Math.round(
            (docElapsed / estimateSec) * 100
          )
        );

        const overrun =
          docElapsed > estimateSec;

        return (

          <div className="email-modal-overlay">

            <div className="email-modal">

              <h2>Generate PDF</h2>

              <textarea
                placeholder="Describe the document you want (e.g. 'Cover letter for a junior React role at a fintech startup')"
                value={docData.topic}
                onChange={(e) =>
                  setDocData({
                    ...docData,
                    topic: e.target.value,
                  })
                }
                disabled={docGenerating}
              />

              <select
                value={docData.doc_type}
                onChange={(e) =>
                  setDocData({
                    ...docData,
                    doc_type: e.target.value,
                  })
                }
                disabled={docGenerating}
              >
                <option value="letter">Letter</option>
                <option value="cover letter">Cover Letter</option>
                <option value="essay">Essay</option>
                <option value="report">Report</option>
                <option value="memo">Memo</option>
                <option value="resume summary">Resume Summary</option>
                <option value="proposal">Proposal</option>
                <option value="document">Generic Document</option>
              </select>

              <select
                value={docData.length}
                onChange={(e) =>
                  setDocData({
                    ...docData,
                    length: e.target.value,
                  })
                }
                disabled={docGenerating}
              >
                <option value="short">
                  Short (~200 words, ~{estimateByLength.short}s)
                </option>
                <option value="medium">
                  Medium (~500 words, ~{estimateByLength.medium}s) — default
                </option>
                <option value="long">
                  Long (~1000 words, ~{estimateByLength.long}s)
                </option>
              </select>

              {docGenerating && (

                <div className="doc-progress">

                  <div className="doc-progress-meta">

                    <span>
                      {overrun
                        ? "Taking longer than usual..."
                        : "Generating..."}
                    </span>

                    <span>
                      {docElapsed}s
                      {" / "}
                      ~{estimateSec}s
                    </span>

                  </div>

                  <div className="doc-progress-bar">

                    <div
                      className="doc-progress-bar-fill"
                      style={{
                        width: `${progressPct}%`,
                      }}
                    />

                  </div>

                </div>
              )}

              <div className="email-modal-buttons">

                <button
                  className="cancel-btn"
                  onClick={() =>
                    setShowDocModal(false)
                  }
                  disabled={docGenerating}
                >
                  Cancel
                </button>

                <button
                  className="send-email-btn"
                  onClick={generateDocument}
                  disabled={
                    docGenerating ||
                    !docData.topic.trim()
                  }
                >
                  {docGenerating
                    ? `Generating... ${docElapsed}s`
                    : `Generate PDF (~${estimateSec}s)`}
                </button>

              </div>

            </div>

          </div>
        );
      })()}

    </div>
  );
}

export default Home;
