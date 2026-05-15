import {
  ArrowUp,
  Mail,
  Mic
}
from "lucide-react";
import { useState, useEffect, useRef } from "react";
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

function createStarterChat() {

  return {
    id: Date.now(),
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

function Home() {
  const [showEmailModal, setShowEmailModal] =
  useState(false);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [isListening, setIsListening] =
    useState(false);

  const recognitionRef = useRef(null);

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
        behavior: "smooth",
      });

  }, [conversations]);

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

    const newChat = {

      id: Date.now(),

      title: "New Chat",

      messages: [],
    };

    setConversations(
      (prev) => [newChat, ...prev]
    );

    setCurrentChatId(
      newChat.id
    );
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

  const speakText =
    (text) => {

      if (!window.speechSynthesis) {

        return;
      }

      window.speechSynthesis.cancel();

      const speech =
        new SpeechSynthesisUtterance(
          text.replace(
            /[`*_#>\[\]()]/g,
            ""
          )
        );

      speech.lang = "en-US";

      speech.rate = 1;

      speech.pitch = 1;

      window.speechSynthesis.speak(
        speech
      );
    };

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

    try {

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
        }
      );

      const data =
        await response.json();

      const botMessage = {

        sender: "bot",

        text: data.reply,
      };

      if (options.speak) {

        speakText(
          botMessage.text
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

        text:
          "Error connecting to backend.",
      };

      if (options.speak) {

        speakText(
          errorMessage.text
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
    }

    setLoading(false);
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
      e.target.files[0];

    if (!file) return;

    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    try {

      const response =
        await fetch(

          `${API_BASE_URL}/upload-pdf`,

          {

            method: "POST",

            body: formData,
          }
        );

      const data =
        await response.json();

      alert(
        data.message
      );

    } catch (error) {

      alert(
        "PDF upload failed"
      );
    }
  };

const startVoiceInput = () => {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {

    alert(
      "Speech recognition not supported"
    );

    return;
  }

  const recognition =
    new SpeechRecognition();

  recognitionRef.current =
    recognition;

  recognition.continuous = false;

  recognition.interimResults = false;

  recognition.lang = "en-US";

  setIsListening(true);

  recognition.start();

  recognition.onresult =
    async (event) => {

    const transcript =
      event.results[0][0].transcript;

    setIsListening(false);

    await sendMessageText(
      transcript,
      {
        speak: true,
      }
    );
  };

  recognition.onspeechend = () => {

    recognition.stop();
  };

  recognition.onnomatch = () => {

    setIsListening(false);

    speakText(
      "I could not understand that. Please try again."
    );
  };

  recognition.onerror = () => {

    setIsListening(false);

    speakText(
      "I could not hear you. Please try again."
    );
  };

  recognition.onend = () => {

    setIsListening(false);
  };
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
          <div className="top-actions">

            <label className="upload-btn">
              Upload PDF
              <input
                type="file"
                accept=".pdf"
                hidden
                onChange={uploadPDF}
              />
            </label>

          </div>

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
              </div>
            )
          )}

          {loading && (

            <div className="bot-message">
              Thinking...
            </div>

          )}

          <div ref={messagesEndRef} />

        </div>

        {/* INPUT */}
       <div className="input-container">

  <input
    type="text"
    placeholder="Ask anything..."
    value={message}
    onChange={(e) => setMessage(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        sendMessage();
      }
    }}
  />

  <div className="input-actions">

    <button
      className={`composer-icon-btn mic-btn ${
        isListening ? "listening" : ""
      }`}
      onClick={startVoiceInput}
      title={
        isListening
          ? "Listening"
          : "Voice input"
      }
      aria-label={
        isListening
          ? "Listening"
          : "Start voice input"
      }
    >
      <Mic size={21} />
    </button>

    <div
      className="email-icon-wrapper"
      title="Send Email"
      onClick={() => setShowEmailModal(true)}
    >
      <Mail size={22} />
    </div>

    <button
      className="composer-icon-btn send-btn"
      onClick={sendMessage}
      title="Send message"
      aria-label="Send message"
    >
      <ArrowUp size={24} strokeWidth={3} />
    </button>

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

    </div>
  );
}

export default Home;
