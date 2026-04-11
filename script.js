const tools = [
  {
    icon: "fas fa-diagram-project",
    title: "Flowchart Maker (Basic)",
    description:
      "Create simple flowcharts with a drag and drop interface. Good for planning projects and ideas.",
    tags: ["Planning", "Design", "Flowchart"],
    status: "live",
    instructions: [
      "Drag shapes from the left to the center",
      "Connect shapes by clicking and dragging between dots",
      "Double-click to add or change text",
      "Save your design as an image",
    ],
    link: "./flowChartMaker/uIFlowForge.html",
    groupname: ["Flowchart Tools"],
  },
  {
    icon: "fas fa-wand-sparkles",
    title: "Flowchart Maker (Advanced)",
    description:
      "Advanced flowchart tool with more shapes, animations, and professional layouts.",
    tags: ["Advanced", "Design", "Animations"],
    status: "live",
    instructions: [
      "Pick a professional looking template",
      "Use animations to show how steps work",
      "Align everything perfectly with auto-spacing",
      "Export in high quality",
    ],
    link: "./flowChartMaker/uIFlowForgerEnhancer.html",
    groupname: ["Flowchart Tools"],
  },
  {
    icon: "fas fa-code-branch",
    title: "Logic Diagram Creator",
    description:
      "Design logic maps and decision trees quickly. Simple and fast for brainstorming.",
    tags: ["Logic", "Planning", "Trees"],
    status: "live",
    instructions: [
      "Start with a main idea box",
      "Add branches for each possible decision",
      "Color code your boxes to organize better",
      "Save your work to continue later",
    ],
    link: "./flowChartMaker/uIFlowChart.html",
    groupname: ["Flowchart Tools"],
  },
  {
    icon: "fas fa-microchip",
    title: "System Design Tool",
    description:
      "Draw complex system architectures and technical diagrams for engineering projects.",
    tags: ["Technical", "System Design", "Engineering"],
    status: "live",
    instructions: [
      "Use technical icons to show how systems connect",
      "Detail your architecture with notes",
      "Export technical data from your diagram",
      "Keep track of different system versions",
    ],
    link: "./flowChartMaker/uIFlowChart_Enhancer.html",
    groupname: ["Flowchart Tools"],
  },
  {
    icon: "fas fa-terminal",
    title: "Diagram from Code",
    description:
      "Type simple code to generate flowcharts automatically. Fast for developers.",
    tags: ["Coding", "Automation", "Charts"],
    status: "live",
    instructions: [
      "Write your flowchart steps in the code editor",
      "The diagram updates instantly as you type",
      "Use loops to handle repeating steps",
      "Download the result as a file",
    ],
    link: "./flowChartMaker/codeFlowForge.html",
    groupname: ["Coder Tools"],
  },
  {
    icon: "fas fa-palette",
    title: "Code Diagram Stylist",
    description: "Add colors and themes to the diagrams you created from code.",
    tags: ["Styling", "Colors", "Themes"],
    status: "live",
    instructions: [
      "Load your code-generated diagram",
      "Pick a color theme that looks good",
      "Customize colors for individual boxes",
      "Export the styled version",
    ],
    link: "./flowChartMaker/codeFlowForgeColorizer.html",
    groupname: ["Coder Tools"],
  },
  {
    icon: "fas fa-edit",
    title: "Markdown Editor",
    description:
      "Write markdown text and see how it looks in real-time. Easy for documents.",
    tags: ["Writing", "Editing", "Docs"],
    status: "live",
    instructions: [
      "Type your markdown text on the left side",
      "See the formatted view on the right side",
      "Use buttons for bold, italics, and links",
      "Save as a PDF or HTML file",
    ],
    link: "./mdFileWriter/liveCommonMarkdown.html",
    groupname: ["Writing Tools"],
  },
  {
    icon: "fas fa-pen-nib",
    title: "Markdown Designer",
    description:
      "Professional markdown tool with extra features like diagrams and table creators.",
    tags: ["Pro Writing", "Design", "Plugins"],
    status: "live",
    instructions: [
      "Use the sidebar to manage your files",
      "Add diagrams and math formulas to your text",
      "Pick a custom theme for the editor",
      "Publish your work directly",
    ],
    link: "./mdFileWriter/liveEnhancedMarkdown.html",
    groupname: ["Writing Tools"],
  },
  {
    icon: "fas fa-vault",
    title: "Secure Password Bank",
    description:
      "Save all your passwords safely in an encrypted vault. Organize by project.",
    tags: ["Security", "Privacy", "Passwords"],
    status: "live",
    instructions: [
      "Create new passwords for your accounts",
      "Store them safely with strong encryption",
      "Search for specific passwords easily",
      "Keep everything organized in groups",
    ],
    link: "./passwordBank/index.html",
    groupname: ["Security Tools"],
  },
  {
    icon: "fas fa-box-archive",
    title: "Info & Config Box",
    description:
      "Store bits of text, configurations, and private info in one safe place.",
    tags: ["Storage", "Security", "Notes"],
    status: "live",
    link: "./StorageInfoBox/index.html",
    groupname: ["Security Tools"],
  },
  {
    icon: "fas fa-book-open",
    title: "Cheat Sheet Builder",
    description:
      "Make your own quick reference guides and cheat sheets for learning.",
    tags: ["Ref", "Learning", "Guides"],
    status: "live",
    link: "./checkSheetBuilder/index.html",
    groupname: ["Learning Tools"],
  },
  {
    icon: "fas fa-note-sticky",
    title: "Notes Manager",
    description:
      "Quickly take notes and keep them organized. Fast and easy to use.",
    tags: ["Notes", "Tasks", "Drafts"],
    status: "live",
    link: "./NotesManager/index.html",
    groupname: ["Writing Tools"],
  },
  {
    icon: "fas fa-key",
    title: "Secret Keeper",
    description:
      "A private place to hide your most sensitive secrets and information.",
    tags: ["Privacy", "Secrets", "Encryption"],
    status: "live",
    link: "./secretsKeeper/index.html",
    groupname: ["Security Tools"],
  },
  {
    icon: "fas fa-user-shield",
    title: "Simple Pass Bank",
    description:
      "A very easy tool to save your common passwords and login info.",
    tags: ["Easy", "Logins"],
    status: "live",
    instructions: [
      "Add your login details quickly",
      "Search to find what you need",
      "Save and back up your data",
    ],
    link: "./simplePasswordBank/index.html",
    groupname: ["Security Tools"],
  },
  {
    icon: "fas fa-gamepad",
    title: "Hangouts Game",
    description:
      "Play interactive games like hangouts with your friends online.",
    tags: ["Games", "Fun", "Friends"],
    status: "onbuild",
    instructions: [
      "Start a new game with your friends",
      "Guess the words to win",
      "Keep track of your score",
    ],
    groupname: ["Fun & Games"],
  },
  {
    icon: "fas fa-shuffle",
    title: "File Converter",
    description:
      "Convert your files from one format to another (PDF, JPG, PNG, etc).",
    tags: ["Universal", "Utility", "Converter"],
    status: "upcoming",
    instructions: [
      "Drop your file into the box",
      "Pick the new format you want",
      "Click convert and download",
    ],
    groupname: ["Office Utilities"],
  },
  {
    icon: "fas fa-list-check",
    title: "Test Case Tracker",
    description:
      "Professional tool for software testers to manage and track test cases.",
    tags: ["Testing", "Software", "QA"],
    status: "live",
    instructions: [
      "Create new test cases for your software",
      "Update if they pass or fail",
      "See a total report of your tests",
      "Keep track of which version you tested",
    ],
    link: "./testCaseManager/index.html",
    groupname: ["Coder Tools"],
  },
  {
    icon: "fas fa-bullseye",
    title: "Interview Prep",
    description:
      "Track your progress and tasks when preparing for job interviews.",
    tags: ["Interviews", "Jobs", "Focus"],
    status: "live",
    link: "./preparationTracker/interview_prep_tracker.html",
    groupname: ["Career Tools"],
  },
  {
    icon: "fas fa-star",
    title: "Interview Prep (Advanced)",
    description:
      "Advanced preparation tool with points, challenges, and progress charts.",
    tags: ["Advanced", "Goals", "Success"],
    status: "live",
    link: "./preparationTracker/advpointstore.html",
    groupname: ["Career Tools"],
  },
  {
    icon: "fas fa-file-invoice",
    title: "Resume Checker",
    description:
      "Check your resume score and see how well it fits different job roles.",
    tags: ["Resume", "Jobs", "Score"],
    status: "live",
    link: "./resumeMatcher/resume-matcher.html",
    groupname: ["Career Tools"],
  },
];

// State management
const state = {
  currentFilter: "all",
  currentView: "grid",
  searchQuery: "",
  selectedGroup: null, // Add selected group state
  tools: tools,
  isSidebarCollapsed: false, // Default to expanded, no storage
};

// DOM elements
const elements = {
  container: document.getElementById("toolsContainer"),
  searchInput: document.getElementById("searchInput"),
  globalSearch: document.getElementById("globalSearch"),
  themeToggle: document.getElementById("themeToggle"),
  layoutToggle: document.getElementById("layoutToggle"),
  filterButtons: document.querySelectorAll(".filter-link"),
  viewButtons: document.querySelectorAll(".view-btn"),
  modal: document.getElementById("modalOverlay"),
  modalTitle: document.getElementById("modalTitle"),
  instructionsList: document.getElementById("instructionsList"),
  closeModal: document.getElementById("closeModal"),
  noResults: document.getElementById("noResults"),
  groupFilters: document.getElementById("groupFilters"),
  greeting: document.getElementById("greeting"),
  currentDate: document.getElementById("currentDate"),
  totalTools: document.getElementById("totalTools"),
  liveTools: document.getElementById("liveTools"),
  collapseToggle: document.getElementById("collapseToggle"),
  appLayout: document.querySelector(".app-layout"),
};

// Initialize the application
function init() {
  updateDashboardHeader();
  renderTools();
  renderGroupFilters(); // Add group filters rendering
  bindEvents();
  updateThemeIcon();
  applySidebarState();

  // Initialize tooltips after rendering
  setTimeout(() => {
    initTooltips();
  }, 100);
}

// Update Dashboard Stats and Greeting
function updateDashboardHeader() {
  if (!elements.greeting) return;

  const hour = new Date().getHours();
  let greetingText = "Good Morning";
  if (hour >= 12 && hour < 17) greetingText = "Good Afternoon";
  else if (hour >= 17) greetingText = "Good Evening";
  elements.greeting.innerText = `${greetingText}, Explorer`;

  if (elements.currentDate) {
    elements.currentDate.innerText = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  if (elements.totalTools) elements.totalTools.innerText = tools.length;
  if (elements.liveTools)
    elements.liveTools.innerText = tools.filter(
      (t) => t.status === "live"
    ).length;
}

// Render all tools grouped by category
function renderTools() {
  const filteredTools = getFilteredTools();

  if (filteredTools.length === 0) {
    elements.container.innerHTML = "";
    elements.noResults.style.display = "block";
    return;
  }

  elements.noResults.style.display = "none";

  // Group tools by category
  const groupedTools = groupToolsByCategory(filteredTools);

  let html = "";

  for (const [groupName, groupTools] of Object.entries(groupedTools)) {
    html += `
  <div class="group-section">
    <div class="group-header">
      <h2 class="group-title">${groupName}</h2>
      <span class="group-count">${groupTools.length}</span>
    </div>
    <div class="cards-grid ${state.currentView === "list" ? "list-view" : ""}">
      ${groupTools
        .map((tool, index) => renderToolCard(tool, index))
        .join("")}
    </div>
  </div>
`;
  }

  elements.container.innerHTML = html;

  // Bind card events
  bindCardEvents();
}

// Render individual tool card - Fixed button functionality
function renderToolCard(tool, index = 0) {
  const isDisabled = tool.status === "upcoming";
  const hasValidLink = tool.link && tool.link !== "#" && !isDisabled;

  let html = "";

  html += `<div class="tool-card" style="animation-delay: ${
    index * 0.05
  }s" data-status="${tool.status}" data-tags="${tool.tags
    .join(",")
    .toLowerCase()}">`;

  // Header
  html += `
      <div class="card-header">
        <div class="card-icon">
          <i class="${tool.icon}"></i>
        </div>
        <div class="card-actions">
          ${
            tool.instructions
              ? `<button class="info-btn" data-tool-title="${tool.title}" data-tooltip="View Instructions"><i class="fas fa-info"></i></button>`
              : ""
          }
        </div>
      </div>
    `;

  // Content
  html += `
      <div class="card-content">
        <h3>${tool.title}</h3>
        <p>${tool.description}</p>
        <div class="tags">
          ${tool.tags
            .map(
              (tag) =>
                `<span class="tag" data-tooltip="Click to search">${tag}</span>`
            )
            .join("")}
        </div>
      </div>
    `;
  // Footer
  html += `
        <div class="card-footer">
          <span class="status-badge status-${tool.status}">${tool.status}</span>
          <a href="${tool.link}" class="launch-btn" target="_blank">
            Launch <i class="fas fa-external-link-alt"></i>
          </a>
        </div>
    `;

  html += `</div>`;

  return html;
}

// Format status text
function formatStatus(status) {
  switch (status) {
    case "live":
      return "Live";
    case "onbuild":
      return "In Progress";
    case "upcoming":
      return "Coming Soon";
    default:
      return status;
  }
}

// Group tools by category - Updated to handle multiple groups per tool
function groupToolsByCategory(tools) {
  const grouped = {};

  tools.forEach((tool) => {
    const categories = Array.isArray(tool.groupname)
      ? tool.groupname
      : [tool.groupname || "Others"];

    categories.forEach((category) => {
      if (!grouped[category]) {
        grouped[category] = [];
      }

      // Check if tool is already in this group to avoid duplicates
      if (!grouped[category].find((t) => t.title === tool.title)) {
        grouped[category].push(tool);
      }
    });
  });

  return grouped;
}

// Get filtered tools based on current state - Updated to include group filter
function getFilteredTools() {
  let filtered = [...state.tools];

  // Apply status filter
  if (state.currentFilter !== "all") {
    filtered = filtered.filter((tool) => tool.status === state.currentFilter);
  }

  // Apply group filter
  if (state.selectedGroup) {
    filtered = filtered.filter((tool) => {
      const groups = Array.isArray(tool.groupname)
        ? tool.groupname
        : [tool.groupname || "Others"];
      return groups.includes(state.selectedGroup);
    });
  }

  // Apply search filter
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter((tool) => {
      const groupNames = Array.isArray(tool.groupname)
        ? tool.groupname.join(" ")
        : tool.groupname || "";
      return (
        tool.title.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        groupNames.toLowerCase().includes(query)
      );
    });
  }

  return filtered;
}

// Bind all event listeners
function bindEvents() {
  // Search functionality
  elements.searchInput.addEventListener("input", handleSearch);
  if (elements.globalSearch) {
    elements.globalSearch.addEventListener("input", (e) => {
      elements.searchInput.value = e.target.value;
      handleSearch(e);
    });
  }

  // Theme toggle
  elements.themeToggle.addEventListener("click", toggleTheme);

  // Sidebar toggle
  if (elements.collapseToggle) {
    elements.collapseToggle.addEventListener("click", toggleSidebar);
  }

  // Layout toggle
  elements.layoutToggle.addEventListener("click", toggleLayout);

  // Filter buttons
  elements.filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => handleFilter(btn.dataset.filter));
  });

  // View toggle buttons
  elements.viewButtons.forEach((btn) => {
    btn.addEventListener("click", () => handleViewChange(btn.dataset.view));
  });

  // Modal events
  elements.closeModal.addEventListener("click", closeModal);
  elements.modal.addEventListener("click", (e) => {
    if (e.target === elements.modal) closeModal();
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", handleKeyboard);
}

// Render group filter cards
function renderGroupFilters() {
  // Get all unique groups and their tool counts
  const groupCounts = {};

  state.tools.forEach((tool) => {
    const groups = Array.isArray(tool.groupname)
      ? tool.groupname
      : [tool.groupname || "Others"];
    groups.forEach((group) => {
      groupCounts[group] = (groupCounts[group] || 0) + 1;
    });
  });

  // Sort groups by tool count (descending)
  const sortedGroups = Object.entries(groupCounts).sort(
    ([, a], [, b]) => b - a
  );

  const groupFiltersHTML = sortedGroups
    .map(([groupName, count]) => {
      const isActive = state.selectedGroup === groupName;
      // Map icons to groups
      const iconMap = {
        "Flowchart Tools": "fa-diagram-project",
        "Security Tools": "fa-shield-halved",
        "Coder Tools": "fa-code",
        "Writing Tools": "fa-pen-fancy",
        "Career Tools": "fa-briefcase",
        "Learning Tools": "fa-graduation-cap",
        "Fun & Games": "fa-gamepad",
        "Office Utilities": "fa-folder-tree",
      };
      const iconClass = iconMap[groupName] || "fa-folder";

      return `
      <button class="group-filter-card ${
        isActive ? "active" : ""
      }" data-group="${groupName}" title="${groupName}">
          <i class="fas ${iconClass}"></i>
          <span>${groupName}</span>
      </button>
    `;
    })
    .join("");

  elements.groupFilters.innerHTML = groupFiltersHTML;

  // Bind group filter events
  bindGroupFilterEvents();
}

// Bind group filter events
function bindGroupFilterEvents() {
  document.querySelectorAll(".group-filter-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      const groupName = card.dataset.group;

      // Toggle group selection
      if (state.selectedGroup === groupName) {
        state.selectedGroup = null; // Deselect if already selected
      } else {
        state.selectedGroup = groupName; // Select new group
      }

      // Update active states
      document.querySelectorAll(".group-filter-card").forEach((c) => {
        c.classList.remove("active");
      });

      if (state.selectedGroup) {
        card.classList.add("active");
      }

      // Clear search when group filter is applied
      if (state.selectedGroup && state.searchQuery) {
        elements.searchInput.value = "";
        state.searchQuery = "";
      }

      // Re-render tools with new filter
      renderTools();

      // Scroll to tools section
      //   elements.container.scrollIntoView({ behavior: 'smooth' });
    });
  });
}
function bindCardEvents() {
  // Info button events
  document.querySelectorAll(".info-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const toolTitle = btn.dataset.toolTitle;
      const tool = state.tools.find((t) => t.title === toolTitle);
      if (tool && tool.instructions) {
        showModal(tool);
      }
    });
  });

  // Tag click events for search
  document.querySelectorAll(".tag").forEach((tag) => {
    tag.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const tagText = tag.textContent.trim();
      elements.searchInput.value = tagText;
      state.searchQuery = tagText;
      renderTools();
    });
  });

  // Launch button events (for non-link buttons)
  document.querySelectorAll(".launch-btn:not([href])").forEach((btn) => {
    if (!btn.disabled) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        // You can add custom logic here for tools without direct links
        console.log("Tool launch requested but no valid link available");
      });
    }
  });
}

// Handle search input - Updated to clear group filter
function handleSearch(e) {
  state.searchQuery = e.target.value;

  // Clear group filter when searching
  if (state.searchQuery && state.selectedGroup) {
    state.selectedGroup = null;
    document.querySelectorAll(".group-filter-card").forEach((card) => {
      card.classList.remove("active");
    });
  }

  debounce(renderTools, 300)();
}

// Add shortcut for search focus
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    elements.searchInput.focus();
  }
});

// Handle filter changes - Updated to clear group filter
function handleFilter(filter) {
  state.currentFilter = filter;

  // Clear group filter when status filter changes
  if (state.selectedGroup) {
    state.selectedGroup = null;
    document.querySelectorAll(".group-filter-card").forEach((card) => {
      card.classList.remove("active");
    });
  }

  // Update active filter button
  elements.filterButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });

  renderTools();
}

// Handle view changes
function handleViewChange(view) {
  state.currentView = view;

  // Update active view button
  elements.viewButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  // Update grid layout
  document.querySelectorAll(".cards-grid").forEach((grid) => {
    grid.classList.toggle("list-view", view === "list");
  });

  // Update layout toggle icon
  const icon = elements.layoutToggle.querySelector("i");
  icon.className = view === "grid" ? "fas fa-th" : "fas fa-list";
}

// Toggle theme
function toggleTheme() {
  const body = document.body;
  const currentTheme = body.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  body.setAttribute("data-theme", newTheme);
  updateThemeIcon();

  // Store theme preference
  localStorage.setItem("theme", newTheme);
}

// Sidebar Functions
function toggleSidebar() {
  state.isSidebarCollapsed = !state.isSidebarCollapsed;
  // localStorage storage removed as requested
  applySidebarState();
}

function applySidebarState() {
  if (state.isSidebarCollapsed) {
    elements.appLayout.classList.add("collapsed");
  } else {
    elements.appLayout.classList.remove("collapsed");
  }
}

// Update theme icon
function updateThemeIcon() {
  const theme = document.body.getAttribute("data-theme");
  const icon = elements.themeToggle.querySelector("i");
  icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
}

// Toggle layout
function toggleLayout() {
  const newView = state.currentView === "grid" ? "list" : "grid";
  handleViewChange(newView);

  // Update view buttons
  elements.viewButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === newView);
  });
}

// Show modal with tool instructions
function showModal(tool) {
  elements.modalTitle.textContent = `${tool.title} - Instructions`;

  const instructionsHTML = tool.instructions
    .map((instruction) => `<li>${instruction}</li>`)
    .join("");

  elements.instructionsList.innerHTML = instructionsHTML;
  elements.modal.classList.add("active");

  // Prevent body scroll
  document.body.style.overflow = "hidden";
}

// Close modal
function closeModal() {
  elements.modal.classList.remove("active");
  document.body.style.overflow = "";
}

// Handle keyboard shortcuts
function handleKeyboard(e) {
  // ESC to close modal
  if (e.key === "Escape") {
    closeModal();
  }

  // Ctrl/Cmd + K to focus search
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    elements.searchInput.focus();
  }

  // Ctrl/Cmd + D to toggle theme
  if ((e.ctrlKey || e.metaKey) && e.key === "d") {
    e.preventDefault();
    toggleTheme();
  }
}

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Load saved preferences
function loadPreferences() {
  // Load saved theme
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.body.setAttribute("data-theme", savedTheme);

  // Load saved view preference
  const savedView = localStorage.getItem("view") || "grid";
  handleViewChange(savedView);
}

// Add some loading states and animations
function showLoading() {
  elements.container.innerHTML = `
<div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
  <div class="loading"></div>
  <p style="margin-top: 1rem;">Loading tools...</p>
</div>
`;
}

// Add tooltip functionality - Fixed tooltip system
function initTooltips() {
  // Remove existing tooltip if any
  const existingTooltip = document.querySelector(".tooltip");
  if (existingTooltip) {
    existingTooltip.remove();
  }

  // Create tooltip element
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  tooltip.style.cssText = `
position: absolute;
background: var(--card-bg);
padding: 0.5rem 0.75rem;
border-radius: 6px;
font-size: 0.8rem;
color: var(--text-primary);
border: 1px solid var(--border-color);
z-index: 10001;
pointer-events: none;
opacity: 0;
transition: opacity 0.2s ease;
backdrop-filter: var(--blur);
box-shadow: var(--shadow-light);
max-width: 200px;
white-space: nowrap;
`;
  document.body.appendChild(tooltip);

  let currentTooltipElement = null;

  // Add tooltip to elements with data-tooltip
  document.addEventListener("mouseover", (e) => {
    const element = e.target.closest("[data-tooltip]");
    if (element && element !== currentTooltipElement) {
      currentTooltipElement = element;
      tooltip.textContent = element.dataset.tooltip;
      tooltip.style.opacity = "1";

      const rect = element.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();

      let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
      let top = rect.bottom + 8;

      // Keep tooltip within viewport
      if (left < 8) left = 8;
      if (left + tooltipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tooltipRect.width - 8;
      }

      if (top + tooltipRect.height > window.innerHeight - 8) {
        top = rect.top - tooltipRect.height - 8;
      }

      tooltip.style.left = left + "px";
      tooltip.style.top = top + "px";
    }
  });

  document.addEventListener("mouseout", (e) => {
    const element = e.target.closest("[data-tooltip]");
    if (element && element === currentTooltipElement) {
      currentTooltipElement = null;
      tooltip.style.opacity = "0";
    }
  });
}

// Add smooth scrolling for navigation
function smoothScrollTo(element) {
  element.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

// Add search highlighting
function highlightSearchTerm(text, searchTerm) {
  if (!searchTerm) return text;

  const regex = new RegExp(`(${searchTerm})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

// Add animation observer for cards
function observeCardAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.animationDelay = `${Math.random() * 0.3}s`;
          entry.target.classList.add("fade-in");
        }
      });
    },
    {
      threshold: 0.1,
    }
  );

  document.querySelectorAll(".tool-card").forEach((card) => {
    observer.observe(card);
  });
}

// Initialize application
function initApp() {
  loadPreferences();
  init();
  initTooltips();

  // Add some demo notifications
  setTimeout(() => {
    console.log("🚀 All Tools Dashboard loaded successfully!");
  }, 1000);
}

// Start the application when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
