(function () {
  const root = document.documentElement;
  const themeKey = "docchat-theme";

  function setTheme(theme) {
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem(themeKey, theme);
    const toggle = document.querySelector("[data-theme-toggle]");
    if (toggle) {
      toggle.textContent = theme === "dark" ? "☀" : "☾";
    }
  }

  function initTheme() {
    const stored = localStorage.getItem(themeKey);
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(stored || (prefersDark ? "dark" : "light"));
    const toggle = document.querySelector("[data-theme-toggle]");
    if (toggle) {
      toggle.addEventListener("click", () => setTheme(root.classList.contains("dark") ? "light" : "dark"));
    }
  }

  function readState() {
    const node = document.getElementById("initial-state");
    if (!node) return {};
    return JSON.parse(node.textContent || "{}");
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function tokenSummary(tokens) {
    if (!tokens || !tokens.total_tokens) return "";
    const parts = [`prompt: ${tokens.prompt_tokens}`];
    if (tokens.reasoning_tokens) parts.push(`reasoning: ${tokens.reasoning_tokens}`);
    parts.push(`response: ${tokens.reasoning_tokens ? tokens.completion_tokens - tokens.reasoning_tokens : tokens.completion_tokens}`);
    return `${tokens.total_tokens} tokens (${parts.join(" • ")})`;
  }

  async function fetchJson(url, options) {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      let message = `Request failed (${res.status})`;
      try {
        const payload = JSON.parse(text);
        if (payload && (payload.error || payload.detail)) {
          message = payload.error || payload.detail;
        } else if (text) {
          message = text;
        }
      } catch (err) {
        if (text) {
          message = text;
        }
      }
      throw new Error(message);
    }
    return res.json();
  }

  function renderMessages(container, messages, showTokens) {
    container.innerHTML = "";
    if (!messages.length) {
      container.appendChild(el("div", "empty-chat", "Hello! Upload a document and ask your question."));
      return;
    }

    messages.forEach((message) => {
      const row = el("div", "message-row");
      row.appendChild(el("div", `message ${message.role === "user" ? "user" : "ai"}`, message.text || ""));

      if (showTokens && message.role === "ai" && message.tokens && message.tokens.total_tokens) {
        const details = el("details", "token-details");
        details.open = false;
        details.appendChild(el("summary", "token-summary", tokenSummary(message.tokens)));
        const meta = el("div", "token-meta");
        if (message.model) meta.appendChild(el("div", "", `Model: ${message.model}`));
        if (message.tokens.context_tokens) meta.appendChild(el("div", "", `Context: ${message.tokens.context_tokens}`));
        if (message.tokens.history_tokens) meta.appendChild(el("div", "", `History: ${message.tokens.history_tokens}`));
        if (message.tokens.query_tokens) meta.appendChild(el("div", "", `Query: ${message.tokens.query_tokens}`));
        if (message.tokens.reasoning_tokens) meta.appendChild(el("div", "", `Reasoning: ${message.tokens.reasoning_tokens}`));
        meta.appendChild(el("div", "", `Response: ${message.tokens.reasoning_tokens ? message.tokens.completion_tokens - message.tokens.reasoning_tokens : message.tokens.completion_tokens}`));
        details.appendChild(meta);
        row.appendChild(details);
      }

      container.appendChild(row);
    });
    container.scrollTop = container.scrollHeight;
  }

  function renderFiles(container, files) {
    container.innerHTML = "";
    if (!files.length) {
      container.appendChild(el("p", "muted", "No files uploaded yet."));
      return;
    }

    files.forEach((file) => {
      const card = el("article", "file-card");
      card.appendChild(el("strong", "", file.file_name || "Unknown file"));
      card.appendChild(el("span", "muted", file.file_type || "Unknown type"));
      container.appendChild(card);
    });
  }

  function renderQueuedFiles(container, files) {
    container.innerHTML = "";
    if (!files.length) {
      container.appendChild(el("p", "muted", "No files selected."));
      return;
    }

    files.forEach((file) => {
      const card = el("article", "file-card");
      card.appendChild(el("strong", "", file.name));
      card.appendChild(el("span", "muted", `${(file.size / (1024 * 1024)).toFixed(2)} MB`));
      container.appendChild(card);
    });
  }

  function initChat() {
    const state = readState();
    const chatId = state.chat_id;
    const messagesEl = document.getElementById("messages");
    const processedFilesEl = document.getElementById("processed-files");
    const queuedFilesEl = document.getElementById("queued-files");
    const fileInput = document.getElementById("file-input");
    const processButton = document.getElementById("process-files");
    const sendButton = document.getElementById("send-message");
    const input = document.getElementById("message-input");
    const showTokens = document.getElementById("show-tokens");
    const modelSelect = document.getElementById("model-select");
    const modelDefault = document.getElementById("model-default");
    const tabButtons = Array.from(document.querySelectorAll("[data-model-tab]"));

    let queuedFiles = [];
    let conversationIds = [];
    let activeTab = "llm";
    let models = state.models || { configured: { llm: { configured: "" }, vlm: { configured: "" } }, available: { llm: [], vlm: [] } };
    let selectedModel = models.configured?.llm?.configured || "";

    function currentModels() {
      return (models.available && models.available[activeTab]) || [];
    }

    function syncDefaultLabel() {
      modelDefault.textContent = `Default: ${models.configured?.llm?.configured || "none"}`;
    }

    function syncModelSelect() {
      const list = currentModels();
      modelSelect.innerHTML = "";
      if (!list.length) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = `No ${activeTab === "llm" ? "text" : "vision"} models available`;
        modelSelect.appendChild(option);
        modelSelect.disabled = true;
        selectedModel = "";
        return;
      }

      modelSelect.disabled = false;
      let hasSelected = false;
      list.forEach((model, index) => {
        const option = document.createElement("option");
        option.value = model.name;
        const sizeGb = model.size ? `${(model.size / (1024 ** 3)).toFixed(1)}GB` : "";
        option.textContent = sizeGb ? `${model.name} (${sizeGb})` : model.name;
        if (selectedModel === model.name || (!selectedModel && index === 0)) {
          option.selected = true;
          selectedModel = model.name;
          hasSelected = true;
        }
        modelSelect.appendChild(option);
      });
      if (!hasSelected) {
        selectedModel = list[0].name;
        modelSelect.value = selectedModel;
      }
    }

    function setActiveTab(tab) {
      activeTab = tab;
      tabButtons.forEach((button) => button.classList.toggle("active", button.dataset.modelTab === tab));
      syncModelSelect();
    }

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => setActiveTab(button.dataset.modelTab || "llm"));
    });

    modelSelect.addEventListener("change", () => {
      selectedModel = modelSelect.value;
    });

    showTokens.addEventListener("change", () => {
      document.body.dataset.showTokens = showTokens.checked ? "true" : "false";
      renderMessages(messagesEl, state.messages || [], showTokens.checked);
    });

    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });

    fileInput.addEventListener("change", () => {
      queuedFiles = queuedFiles.concat(Array.from(fileInput.files || []));
      renderQueuedFiles(queuedFilesEl, queuedFiles);
      fileInput.value = "";
    });

    async function refreshFiles() {
      const data = await fetchJson(`/api/session/${chatId}/conversations`);
      renderFiles(processedFilesEl, data.files || []);
      conversationIds = (data.files || []).map((file) => file.conversation_id).filter(Boolean);
    }

    async function refreshMessages() {
      const data = await fetchJson(`/api/session/${chatId}/messages`);
      renderMessages(messagesEl, data.messages || [], showTokens.checked);
    }

    async function refreshModels() {
      const data = await fetchJson("/api/models");
      models = data;
      selectedModel = models.configured?.llm?.configured || selectedModel || "";
      syncDefaultLabel();
      syncModelSelect();
    }

    async function uploadFiles() {
      if (!queuedFiles.length) return;
      processButton.disabled = true;
      try {
        for (const file of queuedFiles) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("chat_id", chatId);
          formData.append("user_id", state.user_id || "");
          await fetchJson("/api/upload", { method: "POST", body: formData });
        }
        queuedFiles = [];
        renderQueuedFiles(queuedFilesEl, queuedFiles);
        await refreshFiles();
      } finally {
        processButton.disabled = false;
      }
    }

    async function sendMessage() {
      const query = input.value.trim();
      if (!query) return;

      const outbound = el("div", "message-row");
      outbound.appendChild(el("div", "message user", query));
      messagesEl.appendChild(outbound);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      input.value = "";
      input.style.height = "auto";

      sendButton.disabled = true;
      try {
        const response = await fetchJson("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            conversation_ids: conversationIds,
            query,
            mode: "search",
            user_id: state.user_id || "",
            model: selectedModel || undefined,
          }),
        });

        const inbound = el("div", "message-row");
        inbound.appendChild(el("div", "message ai", response.answer || "No response."));
        if (response.tokens && response.tokens.total_tokens && showTokens.checked) {
          const details = el("details", "token-details");
          details.appendChild(el("summary", "token-summary", tokenSummary(response.tokens)));
          const meta = el("div", "token-meta");
          if (response.model_used) meta.appendChild(el("div", "", `Model: ${response.model_used}`));
          if (response.tokens.context_tokens) meta.appendChild(el("div", "", `Context: ${response.tokens.context_tokens}`));
          if (response.tokens.history_tokens) meta.appendChild(el("div", "", `History: ${response.tokens.history_tokens}`));
          if (response.tokens.query_tokens) meta.appendChild(el("div", "", `Query: ${response.tokens.query_tokens}`));
          if (response.tokens.reasoning_tokens) meta.appendChild(el("div", "", `Reasoning: ${response.tokens.reasoning_tokens}`));
          meta.appendChild(el("div", "", `Response: ${response.tokens.reasoning_tokens ? response.tokens.completion_tokens - response.tokens.reasoning_tokens : response.tokens.completion_tokens}`));
          details.appendChild(meta);
          inbound.appendChild(details);
        }
        messagesEl.appendChild(inbound);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      } finally {
        sendButton.disabled = false;
      }
    }

    processButton.addEventListener("click", uploadFiles);
    sendButton.addEventListener("click", sendMessage);

    document.body.dataset.showTokens = "true";
    renderMessages(messagesEl, state.messages || [], true);
    renderFiles(processedFilesEl, state.files || []);
    renderQueuedFiles(queuedFilesEl, queuedFiles);
    syncDefaultLabel();
    syncModelSelect();
    refreshModels().catch(() => {});
    refreshFiles().catch(() => {});
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    if (document.body.dataset.page === "chat") {
      initChat();
    }
  });
})();
