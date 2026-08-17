// ============================================================
// AI PROJECT ASSISTANT - FRONTEND
// ============================================================

// Your deployed Vercel API.
// Because frontend and backend are deployed in the same project,
// we can use relative URLs.
const API_BASE = "";

// ============================================================
// DOM HELPERS
// ============================================================

function findElement(...selectors) {
    for (const selector of selectors) {
        const element = document.querySelector(selector);

        if (element) {
            return element;
        }
    }

    return null;
}

function findAll(...selectors) {
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);

        if (elements.length > 0) {
            return elements;
        }
    }

    return [];
}


// ============================================================
// ELEMENTS
// ============================================================

const questionInput = findElement(
    "#question",
    "#questionInput",
    "#userQuestion",
    "textarea",
    "input[type='text']"
);

const askButton = findElement(
    "#askButton",
    "#ask-btn",
    "#askBtn",
    "button"
);


// ============================================================
// API HELPER
// ============================================================

async function apiRequest(endpoint, options = {}) {

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 60000);

    try {

        const response = await fetch(
            `${API_BASE}${endpoint}`,
            {
                ...options,
                signal: controller.signal,
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    ...(options.headers || {})
                }
            }
        );

        const text = await response.text();

        let data;

        try {
            data = JSON.parse(text);
        } catch (error) {

            throw new Error(
                `API returned invalid JSON. HTTP ${response.status}: ${text.substring(0, 500)}`
            );
        }

        if (!response.ok) {

            const message =
                data.detail ||
                data.error ||
                data.message ||
                `Request failed with status ${response.status}`;

            throw new Error(message);
        }

        return data;

    } catch (error) {

        if (error.name === "AbortError") {
            throw new Error("Request timed out. Please try again.");
        }

        throw error;

    } finally {

        clearTimeout(timeout);
    }
}


// ============================================================
// CLEAN CLAUDE JSON
// ============================================================

function cleanClaudeJSON(data) {

    // Already an object
    if (typeof data === "object" && data !== null) {
        return data;
    }

    if (typeof data !== "string") {
        return data;
    }

    let text = data.trim();

    // Remove markdown JSON fences
    text = text.replace(/^```json\s*/i, "");
    text = text.replace(/^```\s*/i, "");
    text = text.replace(/\s*```$/i, "");

    text = text.trim();

    try {
        return JSON.parse(text);
    } catch (error) {

        console.error("Could not parse Claude JSON:", text);

        return {
            error: "Claude returned invalid JSON.",
            raw_response: text
        };
    }
}


// ============================================================
// ASK AI
// ============================================================

async function askAI(question) {

    if (!question || !question.trim()) {

        showAskError("Please enter a question.");

        return;
    }

    showAskLoading();

    try {

        const result = await apiRequest(
            "/ask",
            {
                method: "POST",

                body: JSON.stringify({
                    question: question.trim()
                })
            }
        );

        const data = cleanClaudeJSON(result);

        console.log("ASK RESPONSE:", data);

        if (data.error && !data.answer) {

            showAskError(
                data.error ||
                "Unable to get an answer."
            );

            return;
        }

        renderAskResponse(data);

    } catch (error) {

        console.error("ASK ERROR:", error);

        showAskError(
            error.message ||
            "Unable to connect to the AI assistant."
        );
    }
}


// ============================================================
// HEALTH CHECK / ANALYSIS
// ============================================================

async function loadHealthCheck() {

    const overviewContainer = findElement(
        "#healthCheck",
        "#health-check",
        "#analysis",
        "#overview",
        ".health-check",
        ".analysis"
    );

    if (overviewContainer) {

        overviewContainer.innerHTML = `
            <div class="loading-message">
                Analyzing your internship knowledge...
            </div>
        `;
    }

    try {

        console.log("Calling /health-check...");

        const result = await apiRequest(
            "/health-check",
            {
                method: "GET"
            }
        );

        console.log("HEALTH CHECK RESPONSE:", result);

        const data = cleanClaudeJSON(result);

        console.log("CLEAN HEALTH DATA:", data);

        if (data.error) {

            console.error(
                "Health check returned error:",
                data.error
            );

            showHealthError(
                data.error,
                data.raw_response
            );

            return;
        }

        renderHealthCheck(data);

    } catch (error) {

        console.error(
            "HEALTH CHECK ERROR:",
            error
        );

        showHealthError(
            error.message ||
            "Unable to analyze internship knowledge."
        );
    }
}


// ============================================================
// ASK LOADING
// ============================================================

function showAskLoading() {

    const responseContainer = findElement(
        "#aiResponse",
        "#response",
        "#answer",
        ".ai-response",
        ".response"
    );

    if (!responseContainer) {
        console.warn("AI response container not found.");
        return;
    }

    responseContainer.innerHTML = `
        <div class="loading-message">
            Thinking...
        </div>
    `;
}


// ============================================================
// ASK ERROR
// ============================================================

function showAskError(message) {

    const responseContainer = findElement(
        "#aiResponse",
        "#response",
        "#answer",
        ".ai-response",
        ".response"
    );

    if (!responseContainer) {
        alert(message);
        return;
    }

    responseContainer.innerHTML = `
        <div class="error-message">
            ${escapeHTML(message)}
        </div>
    `;
}


// ============================================================
// HEALTH ERROR
// ============================================================

function showHealthError(message, rawResponse = "") {

    const container = findElement(
        "#healthCheck",
        "#health-check",
        "#analysis",
        "#overview",
        ".health-check",
        ".analysis"
    );

    if (!container) {
        console.error(message);
        return;
    }

    container.innerHTML = `
        <div class="error-message">
            <strong>Unable to analyze internship knowledge.</strong>
            <br><br>
            ${escapeHTML(message)}
        </div>
    `;

    if (rawResponse) {

        console.log(
            "Raw health-check response:",
            rawResponse
        );
    }
}


// ============================================================
// RENDER ASK RESPONSE
// ============================================================

function renderAskResponse(data) {

    const responseContainer = findElement(
        "#aiResponse",
        "#response",
        "#answer",
        ".ai-response",
        ".response"
    );

    if (!responseContainer) {

        console.warn(
            "Could not find AI response container."
        );

        return;
    }

    const answer =
        data.answer ||
        "No answer was returned.";

    const keyPoints =
        Array.isArray(data.key_points)
            ? data.key_points
            : [];

    const sources =
        Array.isArray(data.sources)
            ? data.sources
            : [];

    let html = "";

    html += `
        <div class="response-answer">
            ${formatText(answer)}
        </div>
    `;

    if (keyPoints.length > 0) {

        html += `
            <div class="response-section">
                <h3>KEY POINTS</h3>
                <ul>
        `;

        keyPoints.forEach(point => {

            html += `
                <li>${formatText(String(point))}</li>
            `;
        });

        html += `
                </ul>
            </div>
        `;
    }

    if (sources.length > 0) {

        html += `
            <div class="response-section">
                <h3>SOURCES</h3>
                <div class="source-list">
        `;

        sources.forEach(source => {

            html += `
                <span class="source-tag">
                    ${escapeHTML(String(source))}
                </span>
            `;
        });

        html += `
                </div>
            </div>
        `;
    }

    responseContainer.innerHTML = html;
}


// ============================================================
// RENDER HEALTH CHECK
// ============================================================

function renderHealthCheck(data) {

    console.log(
        "Rendering health check:",
        data
    );

    // --------------------------------------------------------
    // Try to find the overview card
    // --------------------------------------------------------

    const container = findElement(
        "#healthCheck",
        "#health-check",
        "#analysis",
        "#overview",
        ".health-check",
        ".analysis"
    );

    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    const statusElement = findElement(
        "#status",
        "#healthStatus",
        ".status"
    );

    if (statusElement && data.summary) {

        statusElement.textContent =
            data.summary.status || "Analyzed";
    }

    // --------------------------------------------------------
    // PROJECT COUNT
    // --------------------------------------------------------

    updateNumber(
        [
            "#projectCount",
            "#projectsCount",
            "[data-stat='projects']",
            "[data-count='projects']"
        ],
        data.summary?.project_count ??
        (Array.isArray(data.projects)
            ? data.projects.length
            : 0)
    );

    // --------------------------------------------------------
    // CHALLENGE COUNT
    // --------------------------------------------------------

    updateNumber(
        [
            "#challengeCount",
            "#challengesCount",
            "[data-stat='challenges']",
            "[data-count='challenges']"
        ],
        data.summary?.challenge_count ??
        (Array.isArray(data.challenges)
            ? data.challenges.length
            : 0)
    );

    // --------------------------------------------------------
    // TECHNOLOGY COUNT
    // --------------------------------------------------------

    updateNumber(
        [
            "#technologyCount",
            "#technologiesCount",
            "[data-stat='technologies']",
            "[data-count='technologies']"
        ],
        data.summary?.technology_count ??
        (Array.isArray(data.technologies)
            ? data.technologies.length
            : 0)
    );

    // --------------------------------------------------------
    // OVERVIEW
    // --------------------------------------------------------

    const overviewElement = findElement(
        "#overviewText",
        "#overview",
        ".overview-text",
        "[data-section='overview']"
    );

    if (overviewElement && data.summary) {

        overviewElement.textContent =
            data.summary.overview || "";
    }

    // --------------------------------------------------------
    // PROJECTS
    // --------------------------------------------------------

    renderList(
        [
            "#projects",
            "#projectList",
            ".projects-list",
            "[data-section='projects']"
        ],
        data.projects,
        project => {

            if (typeof project === "string") {
                return escapeHTML(project);
            }

            return `
                <strong>
                    ${escapeHTML(project.name || "Project")}
                </strong>

                ${
                    project.status
                        ? `<span class="status-badge">
                            ${escapeHTML(project.status)}
                           </span>`
                        : ""
                }

                ${
                    project.description
                        ? `<div>
                            ${escapeHTML(project.description)}
                           </div>`
                        : ""
                }
            `;
        }
    );

    // --------------------------------------------------------
    // ACCOMPLISHMENTS
    // --------------------------------------------------------

    renderList(
        [
            "#accomplishments",
            "#accomplishmentList",
            ".accomplishments-list",
            "[data-section='accomplishments']"
        ],
        data.accomplishments,
        item => {

            if (typeof item === "string") {
                return escapeHTML(item);
            }

            return escapeHTML(
                item.description ||
                item.accomplishment ||
                ""
            );
        }
    );

    // --------------------------------------------------------
    // CHALLENGES
    // --------------------------------------------------------

    renderList(
        [
            "#challenges",
            "#challengeList",
            ".challenges-list",
            "[data-section='challenges']"
        ],
        data.challenges,
        item => {

            if (typeof item === "string") {
                return escapeHTML(item);
            }

            return `
                <strong>
                    ${escapeHTML(
                        item.title ||
                        item.challenge ||
                        "Challenge"
                    )}
                </strong>

                ${
                    item.status
                        ? `<span class="status-badge">
                            ${escapeHTML(item.status)}
                           </span>`
                        : ""
                }

                ${
                    item.description
                        ? `<div>
                            ${escapeHTML(item.description)}
                           </div>`
                        : ""
                }
            `;
        }
    );

    // --------------------------------------------------------
    // LEARNING
    // --------------------------------------------------------

    renderList(
        [
            "#learning",
            "#learningList",
            ".learning-list",
            "[data-section='learning']"
        ],
        data.learning,
        item => {

            if (typeof item === "string") {
                return escapeHTML(item);
            }

            return `
                <strong>
                    ${escapeHTML(
                        item.area ||
                        "Learning"
                    )}
                </strong>

                ${
                    item.description
                        ? `<div>
                            ${escapeHTML(item.description)}
                           </div>`
                        : ""
                }
            `;
        }
    );

    // --------------------------------------------------------
    // CURRENT FOCUS
    // --------------------------------------------------------

    renderList(
        [
            "#currentFocus",
            "#current-focus",
            "#focusList",
            "[data-section='current-focus']"
        ],
        data.current_focus,
        item => {

            if (typeof item === "string") {
                return escapeHTML(item);
            }

            return escapeHTML(
                item.focus ||
                item.description ||
                item.step ||
                ""
            );
        }
    );

    // --------------------------------------------------------
    // NEXT STEPS
    // --------------------------------------------------------

    renderList(
        [
            "#nextSteps",
            "#next-steps",
            "#nextStepsList",
            "[data-section='next-steps']"
        ],
        data.next_steps,
        item => {

            if (typeof item === "string") {
                return escapeHTML(item);
            }

            return escapeHTML(
                item.step ||
                item.description ||
                ""
            );
        }
    );

    // --------------------------------------------------------
    // If we couldn't find a specific container,
    // log the response for debugging.
    // --------------------------------------------------------

    if (!container) {

        console.warn(
            "Health-check data was received, but the expected health-check container was not found."
        );

        console.log(
            "Health-check data:",
            data
        );
    }
}


// ============================================================
// UPDATE NUMBER
// ============================================================

function updateNumber(selectors, value) {

    const element = findElement(...selectors);

    if (!element) {
        return;
    }

    element.textContent = value;
}


// ============================================================
// RENDER LIST
// ============================================================

function renderList(
    selectors,
    items,
    formatter
) {

    const element = findElement(...selectors);

    if (!element) {
        return;
    }

    if (!Array.isArray(items) || items.length === 0) {

        element.innerHTML = `
            <li>No documented information.</li>
        `;

        return;
    }

    element.innerHTML = items
        .map(item => {

            return `
                <li>
                    ${formatter(item)}
                </li>
            `;
        })
        .join("");
}


// ============================================================
// TEXT FORMAT
// ============================================================

function formatText(text) {

    return escapeHTML(text)
        .replace(/\n/g, "<br>");
}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    const div = document.createElement("div");

    div.textContent = String(value);

    return div.innerHTML;
}


// ============================================================
// ASK BUTTON
// ============================================================

function setupAskButton() {

    if (!askButton) {

        console.warn(
            "Ask button was not found."
        );

        return;
    }

    askButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            const question =
                questionInput
                    ? questionInput.value
                    : "";

            askAI(question);
        }
    );
}


// ============================================================
// ENTER KEY
// ============================================================

function setupQuestionInput() {

    if (!questionInput) {
        return;
    }

    questionInput.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                const question =
                    questionInput.value;

                askAI(question);
            }
        }
    );
}


// ============================================================
// QUICK QUESTION BUTTONS
// ============================================================

function setupQuickQuestions() {

    const buttons = document.querySelectorAll(
        "button"
    );

    buttons.forEach(button => {

        const text =
            button.textContent
                .trim()
                .toLowerCase();

        if (
            text.includes("my projects") ||
            text.includes("projects")
        ) {

            button.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    askAI(
                        "What projects did I work on?"
                    );
                }
            );
        }

        else if (
            text.includes("technologies") ||
            text.includes("technology")
        ) {

            button.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    askAI(
                        "What technologies and tools did I use during my internship?"
                    );
                }
            );
        }

        else if (
            text.includes("accomplishments")
        ) {

            button.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    askAI(
                        "What accomplishments did I achieve during my internship?"
                    );
                }
            );
        }

        else if (
            text.includes("challenges")
        ) {

            button.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    askAI(
                        "What challenges did I face during my internship?"
                    );
                }
            );
        }
    });
}


// ============================================================
// PAGE INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "AI Project Assistant frontend loaded."
        );

        console.log(
            "API:",
            window.location.origin
        );

        setupAskButton();

        setupQuestionInput();

        setupQuickQuestions();

        // Load internship analysis
        loadHealthCheck();
    }
);