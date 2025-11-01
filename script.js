const tools = [
  {
    icon: "fas fa-project-diagram",
    title: "UI FlowForge Creator",
    description: "Create professional flowcharts with intuitive drag & drop interface. Perfect for wireframing and process documentation.",
    tags: ["Flowchart Design", "UI", "Drag & Drop"],
    status: "live",
    instructions: [
      "Drag and drop elements from the palette to create your flowchart",
      "Connect elements by clicking and dragging between connection points",
      "Double-click on elements to edit text and properties",
      "Use the toolbar to adjust colors, styles, and layouts",
      "Export your flowchart as PNG, SVG, or PDF"
    ],
    link: "./flowChartMaker/uIFlowForge.html",
    groupname: ["FlowChart Maker", "Design Tools"]
  },
  {
    icon: "fas fa-magic",
    title: "UI FlowForge Enhancer",
    description: "Advanced flowchart creator with enhanced features, animations, and professional templates.",
    tags: ["Flowchart Design", "UI", "Enhanced"],
    status: "live",
    instructions: [
      "Choose from professional templates or start from scratch",
      "Access advanced styling options and animations",
      "Collaborate in real-time with team members",
      "Auto-arrange and optimize your flowchart layout"
    ],
    link: "./flowChartMaker/uIFlowForgerEnhancer.html",
    groupname: ["FlowChart Maker", "Design Tools"]
  },
  {
    icon: "fas fa-project-diagram",
    title: "UI FlowChart", 
    description: "Create professional flowcharts with intuitive drag & drop interface. Perfect for wireframing and process documentation.",
    tags: ["Flowchart Design", "UI", "Drag & Drop"],
    status: "live",
    instructions: [
      "Drag and drop elements from the palette to create your flowchart",
      "Connect elements by clicking and dragging between connection points",
      "Double-click on elements to edit text and properties",
      "Use the toolbar to adjust colors, styles, and layouts",
      "Export your flowchart as PNG, SVG, or PDF"
    ],
    link: "./flowChartMaker/uIFlowChart.html",
    groupname: ["FlowChart Maker", "Design Tools"]
  },
  {
    icon: "fas fa-project-diagram",
    title: "UI FlowChart Enhancer", 
    description: "Create professional flowcharts with intuitive drag & drop interface. Perfect for wireframing and process documentation.",
    tags: ["Flowchart Design", "UI", "Drag & Drop"],
    status: "live",
    instructions: [
      "Drag and drop elements from the palette to create your flowchart",
      "Connect elements by clicking and dragging between connection points",
      "Double-click on elements to edit text and properties",
      "Use the toolbar to adjust colors, styles, and layouts",
      "Export your flowchart as PNG, SVG, or PDF"
    ],
    link: "./flowChartMaker/uIFlowChart_Enhancer.html",
    groupname: ["FlowChart Maker", "Design Tools"]
  },
  {
    icon: "fas fa-code",
    title: "Code FlowForge",
    description: "Generate flowcharts programmatically using code. Perfect for developers who prefer coding over UI.",
    tags: ["Flowchart Design", "Code", "Programming", "API"],
    status: "live",
    instructions: [
      "Write flowchart definitions using our simple syntax",
      "Use variables and loops for dynamic chart generation",
      "Import/export flowchart data as JSON",
      "Integrate with your existing development workflow"
    ],
    link: "./flowChartMaker/codeFlowForge.html",
    groupname: ["FlowChart Maker"]
  },
  {
    icon: "fas fa-palette",
    title: "Code FlowForge Colorizer",
    description: "Add beautiful colors and themes to your code-generated flowcharts with advanced styling options.",
    tags: ["Flowchart Design", "Code", "Styling", "Themes"],
    status: "live",
    instructions: [
      "Apply predefined color schemes to your flowcharts",
      "Create custom color palettes and save them",
      "Use gradient effects and advanced styling",
      "Preview changes in real-time"
    ],
    link: "./flowChartMaker/codeFlowForgeColorizer.html",
    groupname: ["FlowChart Maker"]
  },
  {
    icon: "fas fa-markdown",
    title: "Live Markdown Editor",
    description: "Real-time markdown editor with instant preview, syntax highlighting, and export options.",
    tags: ["Markdown", "Editor", "Live Preview", "Documentation"],
    status: "live",
    instructions: [
      "Type markdown in the left pane and see instant preview",
      "Use toolbar shortcuts for common formatting",
      "Export to HTML, PDF, or save as markdown file",
      "Support for tables, code blocks, and math expressions"
    ],
    link: "./mdFileWriter/liveCommonMarkdown.html",
    groupname: ["Md - HTML Designer"]
  },
  {
    icon: "fas fa-file-code",
    title: "Enhanced Markdown Designer",
    description: "Advanced markdown editor with custom themes, plugins, and collaboration features.",
    tags: ["Markdown", "Designer", "Enhanced", "Collaboration"],
    status: "live",
    instructions: [
      "Choose from multiple editor themes and layouts",
      "Install plugins for extended functionality",
      "Share documents with team members for collaboration",
      "Use advanced features like diagrams and presentations"
    ],
    link: "./mdFileWriter/liveEnhancedMarkdown.html",
    groupname: ["Md - HTML Designer"]
  },
  {
    icon: "fas fa-shield-alt",
    title: "Complex Password Bank",
    description: "Secure password manager that stores your credentials in encrypted JSON format with advanced security features.",
    tags: ["Security", "Password Manager", "Encryption", "JSON"],
    status: "live",
    instructions: [
      "Create strong passwords with customizable criteria",
      "Store passwords in encrypted JSON format",
      "Organize passwords by categories and tags",
      "Import/export password data securely",
      "Use two-factor authentication for extra security"
    ],
    link: "./passwordBank/index.html",
    groupname: ["Password Store"]
  },
{
    icon: "fas fa-shield-alt",
    title: "Simple Password Bank",
    description: "Secure password manager that stores your credentials in encrypted JSON format with advanced security features.",
    tags: ["Security", "Password Manager", "Encryption", "JSON"],
    status: "live",
    instructions: [
      "Create strong passwords with customizable criteria",
      "Store passwords in encrypted JSON format",
      "Organize passwords by categories and tags",
      "Import/export password data securely",
      "Use two-factor authentication for extra security"
    ],
    link: "./simplePasswordBank/index.html",
    groupname: ["Password Store"]
  },
  {
    icon: "fas fa-chart-bar",
    title: "Hangouts",
    description: "Play hangouts with your friends.",
    tags: ["Hangouts", "GamePlay", "Interactive"],
    status: "onbuild",
    instructions: [
      "Play hangouts with your friends",
    ],
    groupname: ["GamePlay"]
  },
  {
    icon: "fas fa-cloud-upload-alt",
    title: "File Converter Suite",
    description: "Convert between various file formats with batch processing capabilities.",
    tags: ["File Conversion", "Batch Processing", "Multiple Formats"],
    status: "upcoming",
    instructions: [
      "Upload single files or entire folders",
      "Choose target format from supported options",
      "Apply batch processing for multiple files",
      "Download converted files individually or as ZIP"
    ],
    groupname: ["Resume Maker"]
  }
];

// State management
const state = {
  currentFilter: 'all',
  currentView: 'grid',
  searchQuery: '',
  selectedGroup: null, // Add selected group state
  tools: tools
};

// DOM elements
const elements = {
  container: document.getElementById('toolsContainer'),
  searchInput: document.getElementById('searchInput'),
  themeToggle: document.getElementById('themeToggle'),
  layoutToggle: document.getElementById('layoutToggle'),
  filterButtons: document.querySelectorAll('.filter-btn'),
  viewButtons: document.querySelectorAll('.view-btn'),
  modal: document.getElementById('modalOverlay'),
  modalTitle: document.getElementById('modalTitle'),
  instructionsList: document.getElementById('instructionsList'),
  closeModal: document.getElementById('closeModal'),
  noResults: document.getElementById('noResults'),
  groupFilters: document.getElementById('groupFilters') // Add group filters element
};

// Initialize the application
function init() {
  renderTools();
  renderGroupFilters(); // Add group filters rendering
  bindEvents();
  updateThemeIcon();

  // Initialize tooltips after rendering
  setTimeout(() => {
    initTooltips();
  }, 100);
}

// Render all tools grouped by category
function renderTools() {
  const filteredTools = getFilteredTools();

  if (filteredTools.length === 0) {
    elements.container.innerHTML = '';
    elements.noResults.style.display = 'block';
    return;
  }

  elements.noResults.style.display = 'none';

  // Group tools by category
  const groupedTools = groupToolsByCategory(filteredTools);

  let html = '';

  for (const [groupName, groupTools] of Object.entries(groupedTools)) {
    html += `
  <div class="group-section fade-in">
    <div class="group-header">
      <h2 class="group-title">${groupName}</h2>
      <span class="group-count">${groupTools.length} tools</span>
    </div>
    <div class="cards-grid ${state.currentView === 'list' ? 'list-view' : ''}">
      ${groupTools.map(tool => renderToolCard(tool)).join('')}
    </div>
  </div>
`;
  }

  elements.container.innerHTML = html;

  // Bind card events
  bindCardEvents();
}

// Render individual tool card - Fixed button functionality
function renderToolCard(tool) {
    const isDisabled = tool.status === 'upcoming';
    const hasValidLink = tool.link && tool.link !== '#' && !isDisabled;
  
    let html = '';
  
    html += `<div class="tool-card" data-status="${tool.status}" data-tags="${tool.tags.join(',').toLowerCase()}">`;
  
    // Header
    html += `
      <div class="card-header">
        <div class="card-icon">
          <i class="${tool.icon}"></i>
        </div>
        <div class="card-actions">
          ${tool.instructions ? `<button class="info-btn" data-tool-title="${tool.title}" data-tooltip="View Instructions"><i class="fas fa-info"></i></button>` : ''}
        </div>
      </div>
    `;
  
    // Content
    html += `
      <div class="card-content">
        <h3>${tool.title}</h3>
        <p>${tool.description}</p>
        <div class="tags">
          ${tool.tags.map(tag => `<span class="tag" data-tooltip="Click to search">${tag}</span>`).join('')}
        </div>
      </div>
    `;
    // Footer
    html += `
      <div class="card-footer">
        <span class="status-badge status-${tool.status}">${formatStatus(tool.status)}</span>
        ${hasValidLink
          ? (tool.link && tool.link.length > 0
              ? `<a href="${tool.link}" target="_blank" class="launch-btn" data-tooltip="Open in new tab">
                      Launch <i class="fas fa-external-link-alt"></i>
                  </a>`
              : ``)
          : ``
        }
      </div>
    `;
  
    html += `</div>`;
  
    return html;
  }
  
// Format status text
function formatStatus(status) {
  switch (status) {
    case 'live': return 'Live';
    case 'onbuild': return 'In Progress';
    case 'upcoming': return 'Coming Soon';
    default: return status;
  }
}

// Group tools by category - Updated to handle multiple groups per tool
function groupToolsByCategory(tools) {
  const grouped = {};

  tools.forEach(tool => {
    const categories = Array.isArray(tool.groupname) ? tool.groupname : [tool.groupname || 'Others'];

    categories.forEach(category => {
      if (!grouped[category]) {
        grouped[category] = [];
      }

      // Check if tool is already in this group to avoid duplicates
      if (!grouped[category].find(t => t.title === tool.title)) {
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
  if (state.currentFilter !== 'all') {
    filtered = filtered.filter(tool => tool.status === state.currentFilter);
  }

  // Apply group filter
  if (state.selectedGroup) {
    filtered = filtered.filter(tool => {
      const groups = Array.isArray(tool.groupname) ? tool.groupname : [tool.groupname || 'Others'];
      return groups.includes(state.selectedGroup);
    });
  }

  // Apply search filter
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(tool => {
      const groupNames = Array.isArray(tool.groupname) ? tool.groupname.join(' ') : (tool.groupname || '');
      return tool.title.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.tags.some(tag => tag.toLowerCase().includes(query)) ||
        groupNames.toLowerCase().includes(query);
    });
  }

  return filtered;
}

// Bind all event listeners
function bindEvents() {
  // Search functionality
  elements.searchInput.addEventListener('input', handleSearch);

  // Theme toggle
  elements.themeToggle.addEventListener('click', toggleTheme);

  // Layout toggle
  elements.layoutToggle.addEventListener('click', toggleLayout);

  // Filter buttons
  elements.filterButtons.forEach(btn => {
    btn.addEventListener('click', () => handleFilter(btn.dataset.filter));
  });

  // View toggle buttons
  elements.viewButtons.forEach(btn => {
    btn.addEventListener('click', () => handleViewChange(btn.dataset.view));
  });

  // Modal events
  elements.closeModal.addEventListener('click', closeModal);
  elements.modal.addEventListener('click', (e) => {
    if (e.target === elements.modal) closeModal();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);
}

// Render group filter cards
function renderGroupFilters() {
  // Get all unique groups and their tool counts
  const groupCounts = {};

  state.tools.forEach(tool => {
    const groups = Array.isArray(tool.groupname) ? tool.groupname : [tool.groupname || 'Others'];
    groups.forEach(group => {
      groupCounts[group] = (groupCounts[group] || 0) + 1;
    });
  });

  // Sort groups by tool count (descending)
  const sortedGroups = Object.entries(groupCounts)
    .sort(([, a], [, b]) => b - a);

  const groupFiltersHTML = sortedGroups.map(([groupName, count]) => {
    const isActive = state.selectedGroup === groupName;

    return `
  <div class="group-filter-card ${isActive ? 'active' : ''}" data-group="${groupName}">
      <div class="group-filter-title">${groupName}</div>
  </div>
`;
  }).join('');

  elements.groupFilters.innerHTML = groupFiltersHTML;

  // Bind group filter events
  bindGroupFilterEvents();
}

// Bind group filter events
function bindGroupFilterEvents() {
  document.querySelectorAll('.group-filter-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const groupName = card.dataset.group;

      // Toggle group selection
      if (state.selectedGroup === groupName) {
        state.selectedGroup = null; // Deselect if already selected
      } else {
        state.selectedGroup = groupName; // Select new group
      }

      // Update active states
      document.querySelectorAll('.group-filter-card').forEach(c => {
        c.classList.remove('active');
      });

      if (state.selectedGroup) {
        card.classList.add('active');
      }

      // Clear search when group filter is applied
      if (state.selectedGroup && state.searchQuery) {
        elements.searchInput.value = '';
        state.searchQuery = '';
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
  document.querySelectorAll('.info-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const toolTitle = btn.dataset.toolTitle;
      const tool = state.tools.find(t => t.title === toolTitle);
      if (tool && tool.instructions) {
        showModal(tool);
      }
    });
  });

  // Tag click events for search
  document.querySelectorAll('.tag').forEach(tag => {
    tag.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const tagText = tag.textContent.trim();
      elements.searchInput.value = tagText;
      state.searchQuery = tagText;
      renderTools();
    });
  });

  // Launch button events (for non-link buttons)
  document.querySelectorAll('.launch-btn:not([href])').forEach(btn => {
    if (!btn.disabled) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        // You can add custom logic here for tools without direct links
        console.log('Tool launch requested but no valid link available');
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
    document.querySelectorAll('.group-filter-card').forEach(card => {
      card.classList.remove('active');
    });
  }

  debounce(renderTools, 300)();
}

// Handle filter changes - Updated to clear group filter
function handleFilter(filter) {
  state.currentFilter = filter;

  // Clear group filter when status filter changes
  if (state.selectedGroup) {
    state.selectedGroup = null;
    document.querySelectorAll('.group-filter-card').forEach(card => {
      card.classList.remove('active');
    });
  }

  // Update active filter button
  elements.filterButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });

  renderTools();
}

// Handle view changes
function handleViewChange(view) {
  state.currentView = view;

  // Update active view button
  elements.viewButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  // Update grid layout
  document.querySelectorAll('.cards-grid').forEach(grid => {
    grid.classList.toggle('list-view', view === 'list');
  });

  // Update layout toggle icon
  const icon = elements.layoutToggle.querySelector('i');
  icon.className = view === 'grid' ? 'fas fa-th' : 'fas fa-list';
}

// Toggle theme
function toggleTheme() {
  const body = document.body;
  const currentTheme = body.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  body.setAttribute('data-theme', newTheme);
  updateThemeIcon();

  // Store theme preference
  localStorage.setItem('theme', newTheme);
}

// Update theme icon
function updateThemeIcon() {
  const theme = document.body.getAttribute('data-theme');
  const icon = elements.themeToggle.querySelector('i');
  icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Toggle layout
function toggleLayout() {
  const newView = state.currentView === 'grid' ? 'list' : 'grid';
  handleViewChange(newView);

  // Update view buttons
  elements.viewButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === newView);
  });
}

// Show modal with tool instructions
function showModal(tool) {
  elements.modalTitle.textContent = `${tool.title} - Instructions`;

  const instructionsHTML = tool.instructions.map(instruction =>
    `<li>${instruction}</li>`
  ).join('');

  elements.instructionsList.innerHTML = instructionsHTML;
  elements.modal.classList.add('active');

  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
  elements.modal.classList.remove('active');
  document.body.style.overflow = '';
}

// Handle keyboard shortcuts
function handleKeyboard(e) {
  // ESC to close modal
  if (e.key === 'Escape') {
    closeModal();
  }

  // Ctrl/Cmd + K to focus search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    elements.searchInput.focus();
  }

  // Ctrl/Cmd + D to toggle theme
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
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
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.body.setAttribute('data-theme', savedTheme);

  // Load saved view preference
  const savedView = localStorage.getItem('view') || 'grid';
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
  const existingTooltip = document.querySelector('.tooltip');
  if (existingTooltip) {
    existingTooltip.remove();
  }

  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
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
  document.addEventListener('mouseover', (e) => {
    const element = e.target.closest('[data-tooltip]');
    if (element && element !== currentTooltipElement) {
      currentTooltipElement = element;
      tooltip.textContent = element.dataset.tooltip;
      tooltip.style.opacity = '1';

      const rect = element.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();

      let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
      let top = rect.bottom + 8;

      // Keep tooltip within viewport
      if (left < 8) left = 8;
      if (left + tooltipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tooltipRect.width - 8;
      }

      if (top + tooltipRect.height > window.innerHeight - 8) {
        top = rect.top - tooltipRect.height - 8;
      }

      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    }
  });

  document.addEventListener('mouseout', (e) => {
    const element = e.target.closest('[data-tooltip]');
    if (element && element === currentTooltipElement) {
      currentTooltipElement = null;
      tooltip.style.opacity = '0';
    }
  });
}

// Add smooth scrolling for navigation
function smoothScrollTo(element) {
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

// Add search highlighting
function highlightSearchTerm(text, searchTerm) {
  if (!searchTerm) return text;

  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

// Add animation observer for cards
function observeCardAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationDelay = `${Math.random() * 0.3}s`;
        entry.target.classList.add('fade-in');
      }
    });
  }, {
    threshold: 0.1
  });

  document.querySelectorAll('.tool-card').forEach(card => {
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
    console.log('🚀 All Tools Dashboard loaded successfully!');
  }, 1000);
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Add CSS for tooltip and other dynamic styles
const dynamicStyles = document.createElement('style');
dynamicStyles.textContent = `
.tooltip {
backdrop-filter: var(--blur);
box-shadow: var(--shadow-light);
}

mark {
background: rgba(102, 126, 234, 0.3);
color: inherit;
padding: 0.1em 0.2em;
border-radius: 3px;
}

.tool-card.fade-in {
animation: cardFadeIn 0.6s ease-out forwards;
}

@keyframes cardFadeIn {
from {
  opacity: 0;
  transform: translateY(30px) scale(0.95);
}
to {
  opacity: 1;
  transform: translateY(0) scale(1);
}
}

.search-bar:focus + .search-results {
display: block;
}

.status-badge {
animation: pulse 2s infinite;
}

@keyframes pulse {
0% { opacity: 1; }
50% { opacity: 0.7; }
100% { opacity: 1; }
}

.launch-btn:hover i {
transform: translateX(3px);
}

.tag:hover {
cursor: pointer;
}

/* Custom scrollbar */
::-webkit-scrollbar {
width: 8px;
}

::-webkit-scrollbar-track {
background: var(--glass-bg);
}

::-webkit-scrollbar-thumb {
background: var(--accent);
border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
background: var(--primary);
}
`;

document.head.appendChild(dynamicStyles);
// Bind events for individual cards - Fixed event binding
function bindCardEvents() {
  // Info button events
  document.querySelectorAll('.info-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const toolTitle = btn.dataset.toolTitle;
      const tool = state.tools.find(t => t.title === toolTitle);
      if (tool && tool.instructions) {
        showModal(tool);
      }
    });
  });

  // Tag click events for search
  document.querySelectorAll('.tag').forEach(tag => {
    tag.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const tagText = tag.textContent.trim();
      elements.searchInput.value = tagText;
      state.searchQuery = tagText;

      // Clear group filter when searching by tag
      if (state.selectedGroup) {
        state.selectedGroup = null;
        document.querySelectorAll('.group-filter-card').forEach(card => {
          card.classList.remove('active');
        });
      }

      renderTools();
    });
  });

  // Launch button events (for non-link buttons)
  document.querySelectorAll('.launch-btn:not([href])').forEach(btn => {
    if (!btn.disabled) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        // You can add custom logic here for tools without direct links
        console.log('Tool launch requested but no valid link available');
      });
    }
  });
}
