/**
 * Projects terminal: interactive CLI for the projects section.
 * Lazy-loaded when #projects-terminal enters the viewport.
 */
(function () {
  "use strict";

  const PROMPT = "C:/users/cam>";
  const COMMANDS = ["list", "about", "stack", "clear", "help"];
  const STORAGE_KEY = "projectsTerminalHistory";
  const IDLE_MS = 10000;

  let projects = [];
  let history = [];
  let historyIndex = -1;
  let idleTimer = null;
  let tabCompletionIndex = 0;

  const container = document.getElementById("projects-terminal-view");
  const outputContainer = document.getElementById("projects-terminal-output");
  const inputEl = document.getElementById("projects-terminal-input");
  const suggestionEl = document.getElementById("projects-terminal-suggestion");

  if (!container || !outputContainer || !inputEl) return;

  // --- Data ---
  async function loadProjects() {
    try {
      const res = await fetch("./content/projects.json");
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      projects = Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("Projects terminal: failed to load projects.json", e);
      projects = [];
    }
  }

  function findProject(query) {
    const q = (query || "").trim().toLowerCase();
    if (!q) return null;
    const exact = projects.find((p) => p.name.toLowerCase() === q);
    if (exact) return exact;
    return projects.find((p) => p.name.toLowerCase().startsWith(q)) || null;
  }

  function getProjectCompletions(prefix) {
    const p = (prefix || "").toLowerCase();
    return projects
      .filter((proj) => proj.name.toLowerCase().startsWith(p))
      .map((proj) => proj.name);
  }

  // --- Session storage ---
  function saveHistoryToSession() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (_) {}
  }

  function loadHistoryFromSession() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  // --- DOM helpers ---
  function scrollToBottom() {
    container.scrollTop = container.scrollHeight;
  }

  function appendOutputLine(text, className) {
    const p = document.createElement("p");
    p.className = className ? "terminal-line " + className : "terminal-line";
    p.textContent = text;
    outputContainer.appendChild(p);
    scrollToBottom();
  }

  function appendPromptLine(text) {
    const line = document.createElement("p");
    line.className = "terminal-line";
    const pathSpan = document.createElement("span");
    pathSpan.className = "card-terminal-path";
    pathSpan.textContent = PROMPT + " ";
    line.appendChild(pathSpan);
    line.appendChild(document.createTextNode(text || ""));
    outputContainer.appendChild(line);
    scrollToBottom();
  }

  function appendOutputLink(title, url) {
    const p = document.createElement("p");
    p.className = "terminal-line";
    p.appendChild(document.createTextNode("  "));
    const a = document.createElement("a");
    a.className = "terminal-link";
    a.href = url;
    a.textContent = title;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    p.appendChild(a);
    outputContainer.appendChild(p);
    scrollToBottom();
  }

  function setInputState(text) {
    inputEl.value = text || "";
  }

  function getInputState() {
    return inputEl.value || "";
  }

  function showSuggestion(text) {
    if (!suggestionEl) return;
    suggestionEl.textContent = text || "";
    suggestionEl.style.display = text ? "inline" : "none";
  }

  function hideSuggestion() {
    showSuggestion("");
  }

  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
    hideSuggestion();
    idleTimer = setTimeout(() => {
      if (getInputState() === "") {
        showSuggestion("Type help or press Tab to complete");
      }
      idleTimer = null;
    }, IDLE_MS);
  }

  function cancelIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
    hideSuggestion();
  }

  // --- Commands ---
  function runList() {
    if (projects.length === 0) {
      appendOutputLine("No projects loaded.");
      return;
    }
    projects.forEach((p, i) => appendOutputLine(`${i + 1}. ${p.name}`));
  }

  function runAbout(name) {
    const project = findProject(name);
    if (!project) {
      appendOutputLine(`Project not found: ${name}. Use 'list' to see projects.`);
      return;
    }
    appendOutputLine(project.name);
    appendOutputLine(project.description || "(no description)");
    (project.links || []).forEach((link) => {
      appendOutputLink(link.title, link.url);
    });
  }

  function runStack(name) {
    const project = findProject(name);
    if (!project) {
      appendOutputLine(`Project not found: ${name}. Use 'list' to see projects.`);
      return;
    }
    const stack = project.stack && project.stack.length ? project.stack.join(", ") : "(none)";
    appendOutputLine(`Stack: ${stack}`);
  }

  function runClear() {
    while (outputContainer.firstChild) outputContainer.removeChild(outputContainer.firstChild);
  }

  function runHelp() {
    appendOutputLine("Available commands:");
    appendOutputLine("- list (list all available projects)");
    appendOutputLine("- stack [project] (see the stack of a project)");
    appendOutputLine("- about [project] (get a description of a project)");
    appendOutputLine("- clear (clear the terminal)");
    appendOutputLine("- help (show this help message)");
  }

  function executeCommand(line) {
    const trimmed = line.trim();
    if (!trimmed) return;

    const parts = trimmed.split(/\s+/);
    const cmd = (parts[0] || "").toLowerCase();
    const arg = parts.slice(1).join(" ");

    switch (cmd) {
      case "list":
        runList();
        break;
      case "about":
        runAbout(arg);
        break;
      case "stack":
        runStack(arg);
        break;
      case "clear":
        runClear();
        break;
      case "help":
        runHelp();
        break;
      default:
        appendOutputLine("Command not found. Type 'help' for available commands.");
    }
  }

  function handleSubmit() {
    const text = getInputState().trim();
    appendPromptLine(text);
    setInputState("");
    cancelIdleTimer();

    if (text) {
      history.push(text);
      historyIndex = history.length;
      saveHistoryToSession();
      executeCommand(text);
    }

    scrollToBottom();
  }

  // --- Tab completion ---
  function completeCommand(prefix) {
    const p = (prefix || "").toLowerCase();
    const matches = COMMANDS.filter((c) => c.startsWith(p));
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];
    return matches[tabCompletionIndex % matches.length];
  }

  function completeProject(prefix) {
    const matches = getProjectCompletions(prefix);
    if (matches.length === 0) return null;
    return matches[tabCompletionIndex % matches.length];
  }

  function doTabComplete() {
    const raw = getInputState();
    const parts = raw.trim().split(/\s+/);
    let newText;

    if (parts.length <= 1) {
      const prefix = parts[0] || "";
      const completed = completeCommand(prefix);
      if (completed !== null) {
        tabCompletionIndex++;
        newText = completed;
      } else if (prefix === "" && suggestionEl.style.display !== "none") {
        newText = "help";
        hideSuggestion();
        tabCompletionIndex = 0;
      }
    } else {
      const cmd = (parts[0] || "").toLowerCase();
      const projectPrefix = parts[1] || "";
      if (cmd === "about" || cmd === "stack") {
        const completed = completeProject(projectPrefix);
        if (completed !== null) {
          tabCompletionIndex++;
          newText = cmd + " " + completed;
        }
      }
    }

    if (newText !== undefined) {
      setInputState(newText);
      resetIdleTimer();
    }
  }

  // --- Keyboard ---
  function onKeydown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
      tabCompletionIndex = 0;
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      doTabComplete();
      resetIdleTimer();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      if (historyIndex > 0) {
        historyIndex--;
        setInputState(history[historyIndex]);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        historyIndex++;
        setInputState(history[historyIndex]);
      } else {
        historyIndex = history.length;
        setInputState("");
      }
      return;
    }

    tabCompletionIndex = 0;
    resetIdleTimer();
  }

  // --- Initial content: restore from session or show help ---
  function renderInitial() {
    const saved = loadHistoryFromSession();
    if (saved.length > 0) {
      saved.forEach((cmd) => {
        appendPromptLine(cmd);
        executeCommand(cmd);
      });
      history = [...saved];
      historyIndex = history.length;
    } else {
      appendPromptLine("help");
      runHelp();
    }
  }

  function init() {
    inputEl.addEventListener("keydown", onKeydown);
    inputEl.addEventListener("input", resetIdleTimer);
    inputEl.addEventListener("focus", resetIdleTimer);
    container.addEventListener("click", (e) => {
      e.preventDefault();
      inputEl.focus();
    });

    setInputState("");
    renderInitial();
    scrollToBottom();
    inputEl.focus();
  }

  (async function run() {
    await loadProjects();
    init();
  })();
})();
