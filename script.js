// ============================================================
// AI INTERNSHIP MEMORY ASSISTANT
// FRONTEND JAVASCRIPT
// ============================================================

"use strict";


// ============================================================
// CONFIGURATION
// ============================================================

const API_BASE_URL =
    "https://ai-project-assistant-kappa.vercel.app";


// ============================================================
// GLOBAL STATE
// ============================================================

let analysisInProgress = false;
let analysisStartedAt = null;


// ============================================================
// SAFE ELEMENT HELPER
// ============================================================

function getElement(id) {
    return document.getElementById(id);
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// ARRAY HELPER
// ============================================================

function arrayValue(value) {

    return Array.isArray(value)
        ? value
        : [];

}


// ============================================================
// FORMAT TEXT
// ============================================================

function formatText(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return escapeHtml(value)
        .replace(/\r\n/g, "\n")
        .replace(/\n\n+/g, "<br><br>")
        .replace(/\n/g, "<br>");
}


// ============================================================
// OBJECT TO TEXT
// ============================================================

function objectToText(value) {

    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    if (typeof value === "object") {

        return (
            value.description ||
            value.detail ||
            value.accomplishment ||
            value.reason ||
            value.overview ||
            value.name ||
            value.title ||
            value.area ||
            value.focus ||
            value.step ||
            value.action ||
            ""
        );

    }

    return String(value);
}


// ============================================================
// CLEAN SOURCE NAME
// ------------------------------------------------------------
// Some backend/vault filenames already end in ".md" before they
// reach the frontend, and something upstream appends another
// ".md" on top of that (e.g. "Technologies.md.md"). This just
// collapses a duplicated extension so tags render cleanly.
// ============================================================

function cleanSourceName(value) {

    if (!value) {
        return "";
    }

    return String(value)
        .replace(/(\.md)+$/i, ".md");

}


// ============================================================
// PARSE POSSIBLE CLAUDE JSON
// ============================================================

function parsePossibleJSON(value) {

    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === "object") {
        return value;
    }

    if (typeof value !== "string") {
        return null;
    }

    let text = value.trim();


    // Remove markdown JSON fences

    text = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();


    try {

        return JSON.parse(text);

    } catch (error) {

        console.warn(
            "Unable to parse JSON:",
            error
        );

        return null;

    }

}


// ============================================================
// NORMALIZE API RESPONSE
// ============================================================

function normalizeHealthResponse(data) {

    if (!data) {
        return null;
    }


    // Normal response

    if (
        data.summary ||
        data.projects ||
        data.challenges ||
        data.learning
    ) {

        return data;

    }


    // Backend may return Claude error + raw response

    if (data.raw_response) {

        const parsed =
            parsePossibleJSON(
                data.raw_response
            );


        if (parsed) {
            return parsed;
        }

    }


    // Sometimes the backend puts JSON inside answer

    if (data.answer) {

        const parsed =
            parsePossibleJSON(
                data.answer
            );


        if (parsed) {
            return parsed;
        }

    }


    return data;
}


// ============================================================
// ENTER KEY
// ============================================================

function handleEnter(event) {

    if (
        event &&
        event.key === "Enter"
    ) {

        event.preventDefault();

        askQuestion();

    }

}


// ============================================================
// QUICK QUESTIONS
// ============================================================

function quickAsk(question) {

    const input =
        getElement("question");


    if (!input) {

        console.error(
            "Question input not found."
        );

        return;

    }


    input.value =
        question;


    askQuestion();

}


// ============================================================
// ASK AI
// ============================================================

async function askQuestion() {

    const input =
        getElement("question");

    const button =
        getElement("askButton");

    const wrapper =
        getElement("answerWrapper");

    const answer =
        getElement("answerContent");


    if (!input || !button || !wrapper || !answer) {

        console.error(
            "Required Ask AI elements were not found."
        );

        return;

    }


    const question =
        input.value.trim();


    // --------------------------------------------------------
    // EMPTY QUESTION
    // --------------------------------------------------------

    if (!question) {

        wrapper.style.display =
            "block";


        answer.innerHTML = `

            <div class="error-message">

                Please enter a question.

            </div>

        `;

        input.focus();

        return;

    }


    // --------------------------------------------------------
    // LOADING
    // --------------------------------------------------------

    button.disabled =
        true;

    button.innerText =
        "Thinking...";


    wrapper.style.display =
        "block";


    answer.innerHTML = `

        <div class="loading">

            <div class="loading-spinner"></div>

            <span>
                Searching your internship knowledge...
            </span>

        </div>

    `;


    try {

        console.log(
            "Sending question to:",
            `${API_BASE_URL}/ask`
        );


        const response =
            await fetch(
                `${API_BASE_URL}/ask`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"
                    },

                    body: JSON.stringify({
                        question: question
                    }),

                    cache: "no-store"
                }
            );


        let data = null;


        try {

            data =
                await response.json();

        } catch (error) {

            throw new Error(
                `Server returned ${response.status} with an invalid response.`
            );

        }


        if (!response.ok) {

            throw new Error(
                data?.detail ||
                data?.message ||
                `Server returned ${response.status}.`
            );

        }


        displayAnswer(data);


    } catch (error) {

        console.error(
            "Ask AI Error:",
            error
        );


        answer.innerHTML = `

            <div class="error-box">

                <strong>
                    Unable to get an answer
                </strong>

                <p>
                    ${escapeHtml(
                        error.message ||
                        "Unknown error"
                    )}
                </p>

                <small>
                    Backend:
                    ${escapeHtml(API_BASE_URL)}
                </small>

            </div>

        `;

    } finally {

        button.disabled =
            false;

        button.innerText =
            "Ask AI →";

    }

}


// ============================================================
// DISPLAY AI ANSWER
// ============================================================

function displayAnswer(data) {

    const answer =
        getElement("answerContent");


    if (!answer) {
        return;
    }


    const answerText =
        objectToText(
            data?.answer
        ) ||
        "No answer was returned.";


    const keyPoints =
        arrayValue(
            data?.key_points
        );


    const sources =
        arrayValue(
            data?.sources
        );


    let html = `

        <div class="main-answer">

            ${formatText(answerText)}

        </div>

    `;


    // --------------------------------------------------------
    // KEY POINTS
    // --------------------------------------------------------

    if (keyPoints.length > 0) {

        html += `

            <div class="response-section">

                <div class="response-section-title">
                    Key Points
                </div>

                <ul class="key-points">

        `;


        keyPoints.forEach(
            point => {

                const text =
                    objectToText(point);


                if (!text) {
                    return;
                }


                html += `

                    <li>
                        ${formatText(text)}
                    </li>

                `;

            }
        );


        html += `

                </ul>

            </div>

        `;

    }


    // --------------------------------------------------------
    // SOURCES
    // --------------------------------------------------------

    if (sources.length > 0) {

        html += `

            <div class="response-section">

                <div class="response-section-title">
                    Sources
                </div>

                <div class="sources">

        `;


        sources.forEach(
            source => {

                const rawName =
                    typeof source === "object"
                        ? (
                            source.name ||
                            source.filename ||
                            source.file ||
                            source.title ||
                            ""
                        )
                        : source;


                const sourceName =
                    cleanSourceName(rawName);


                if (!sourceName) {
                    return;
                }


                html += `

                    <span class="source-tag">
                        ${escapeHtml(sourceName)}
                    </span>

                `;

            }
        );


        html += `

                </div>

            </div>

        `;

    }


    answer.innerHTML =
        html;


    // Keep answer visible

    const wrapper =
        getElement("answerWrapper");


    if (wrapper) {
        wrapper.style.display =
            "block";
    }

}


// ============================================================
// HEALTH CHECK
// ============================================================

async function healthCheck() {

    const button =
        getElement("healthButton");

    const empty =
        getElement("healthEmpty");

    const content =
        getElement("healthContent");

    const status =
        getElement("healthStatus");


    if (!button) {

        console.error(
            "healthButton not found."
        );

        return;

    }


    analysisInProgress =
        true;

    analysisStartedAt =
        Date.now();


    // --------------------------------------------------------
    // LOADING STATE
    // --------------------------------------------------------

    button.disabled =
        true;

    button.innerText =
        "Analyzing...";


    if (status) {

        status.innerText =
            "Analyzing...";

    }


    if (empty) {

        empty.style.display =
            "block";


        empty.innerHTML = `

            <div class="empty-symbol">
                ✦
            </div>

            <h3>
                Analyzing internship knowledge
            </h3>

            <p>
                Claude is reviewing your internship
                knowledge and organizing projects,
                accomplishments, challenges,
                technologies, learning, and next steps.
            </p>

        `;

    }


    if (content) {

        content.style.display =
            "none";

    }


    // Show connection card

    showConnectionDetails(
        "analyzing"
    );


    try {

        console.log(
            "Calling:",
            `${API_BASE_URL}/health-check`
        );


        const response =
            await fetch(
                `${API_BASE_URL}/health-check`,
                {
                    method: "GET",

                    headers: {
                        "Accept":
                            "application/json"
                    },

                    cache: "no-store"
                }
            );


        let data = null;


        try {

            data =
                await response.json();

        } catch (error) {

            throw new Error(
                `Server returned ${response.status} with invalid JSON.`
            );

        }


        if (!response.ok) {

            throw new Error(
                data?.detail ||
                data?.message ||
                `Health check failed with status ${response.status}.`
            );

        }


        // Normalize response

        data =
            normalizeHealthResponse(
                data
            );


        if (!data) {

            throw new Error(
                "The backend returned no analysis data."
            );

        }


        // Handle Claude raw response error

        if (
            data.error &&
            !data.summary &&
            !data.projects
        ) {

            const parsed =
                normalizeHealthResponse(data);


            if (
                parsed &&
                (
                    parsed.summary ||
                    parsed.projects
                )
            ) {

                data =
                    parsed;

            } else {

                throw new Error(
                    data.message ||
                    data.error ||
                    "Claude returned an invalid analysis."
                );

            }

        }


        // ----------------------------------------------------
        // DISPLAY HEALTH DATA
        // ----------------------------------------------------

        displayHealthData(data);


        if (empty) {

            empty.style.display =
                "none";

        }


        if (content) {

            content.style.display =
                "block";

        }


        if (status) {

            status.innerText =
                "Analyzed";

        }


        // Connection card after analysis

        showConnectionDetails(
            "connected",
            data
        );


    } catch (error) {

        console.error(
            "Health Check Error:",
            error
        );


        if (status) {

            status.innerText =
                "Error";

        }


        if (empty) {

            empty.style.display =
                "block";


            empty.innerHTML = `

                <div class="empty-symbol">
                    !
                </div>

                <h3>
                    Analysis failed
                </h3>

                <p>
                    ${escapeHtml(
                        error.message ||
                        "Unable to analyze internship."
                    )}
                </p>

                <button
                    class="health-button"
                    onclick="healthCheck()"
                >
                    Try Again
                </button>

            `;

        }


        if (content) {

            content.style.display =
                "none";

        }


        showConnectionDetails(
            "error",
            null,
            error.message
        );

    } finally {

        analysisInProgress =
            false;


        analysisStartedAt =
            null;


        button.disabled =
            false;

        button.innerText =
            "Run AI Analysis";

    }

}


// ============================================================
// DISPLAY HEALTH DATA
// ============================================================

function displayHealthData(data) {

    const summary =
        data?.summary || {};


    const projects =
        arrayValue(
            data?.projects
        );


    const accomplishments =
        arrayValue(
            data?.accomplishments
        );


    const challenges =
        arrayValue(
            data?.challenges
        );


    const learning =
        arrayValue(
            data?.learning
        );


    const currentFocus =
        arrayValue(
            data?.current_focus
        );


    const nextSteps =
        arrayValue(
            data?.next_steps
        );


    // --------------------------------------------------------
    // COUNTS
    // --------------------------------------------------------

    const projectCount =
        Number(
            summary.project_count
        ) ||
        projects.length;


    const challengeCount =
        Number(
            summary.challenge_count
        ) ||
        challenges.length;


    const technologyCount =
        Number(
            summary.technology_count
        ) ||
        arrayValue(
            data?.technologies
        ).length;


    // --------------------------------------------------------
    // EXISTING COUNT ELEMENTS
    // --------------------------------------------------------

    const highCount =
        getElement("highCount");


    const attentionCount =
        getElement("attentionCount");


    const trackCount =
        getElement("trackCount");


    if (highCount) {

        highCount.innerText =
            projectCount;

    }


    if (attentionCount) {

        attentionCount.innerText =
            challengeCount;

    }


    if (trackCount) {

        trackCount.innerText =
            technologyCount;

    }


    // --------------------------------------------------------
    // HEALTH TITLE
    // --------------------------------------------------------

    const healthTitle =
        getElement("healthTitle");


    if (healthTitle) {

        healthTitle.innerText =
            summary.status ||
            "Internship Progress";

    }


    // --------------------------------------------------------
    // HEALTH INDICATOR
    // --------------------------------------------------------

    const indicator =
        getElement("healthIndicator");


    if (indicator) {

        indicator.style.background =
            "#18845b";

    }


    // --------------------------------------------------------
    // FINDINGS
    // --------------------------------------------------------

    const findings =
        getElement("healthFindings");


    if (!findings) {

        console.warn(
            "healthFindings not found."
        );

        return;

    }


    let html = "";


    // ========================================================
    // OVERVIEW
    // ========================================================

    const overview =
        summary.overview ||
        "No overview documented.";


    html += `

        <div class="finding-card overview-card">

            <div class="finding-title">
                Overview
            </div>

            <p>
                ${formatText(overview)}
            </p>

        </div>

    `;


    // ========================================================
    // PROJECTS
    // ========================================================

    if (projects.length > 0) {

        html += `

            <div class="section-label">
                Projects
            </div>

            <div class="health-card-grid">

        `;


        projects.forEach(
            (item, index) => {

                html +=
                    createStructuredCard(
                        item,
                        index + 1,
                        "project"
                    );

            }
        );


        html += `

            </div>

        `;

    }


    // ========================================================
    // ACCOMPLISHMENTS
    // ========================================================

    if (accomplishments.length > 0) {

        html += `

            <div class="section-label">
                Accomplishments
            </div>

            <div class="health-card-grid">

        `;


        accomplishments.forEach(
            (item, index) => {

                html +=
                    createStructuredCard(
                        item,
                        index + 1,
                        "accomplishment"
                    );

            }
        );


        html += `

            </div>

        `;

    }


    // ========================================================
    // CHALLENGES
    // ========================================================

    if (challenges.length > 0) {

        html += `

            <div class="section-label">
                Challenges
            </div>

            <div class="health-card-grid">

        `;


        challenges.forEach(
            (item, index) => {

                html +=
                    createStructuredCard(
                        item,
                        index + 1,
                        "challenge"
                    );

            }
        );


        html += `

            </div>

        `;

    }


    // ========================================================
    // LEARNING
    // ========================================================

    if (learning.length > 0) {

        html += `

            <div class="section-label">
                Learning
            </div>

            <div class="health-card-grid">

        `;


        learning.forEach(
            (item, index) => {

                html +=
                    createStructuredCard(
                        item,
                        index + 1,
                        "learning"
                    );

            }
        );


        html += `

            </div>

        `;

    }


    // ========================================================
    // CURRENT FOCUS
    // ========================================================

    if (currentFocus.length > 0) {

        html += `

            <div class="section-label">
                Current Focus
            </div>

            <div class="health-card-grid">

        `;


        currentFocus.forEach(
            (item, index) => {

                html +=
                    createStructuredCard(
                        item,
                        index + 1,
                        "focus"
                    );

            }
        );


        html += `

            </div>

        `;

    }


    findings.innerHTML =
        html;


    // ========================================================
    // NEXT STEPS
    // ========================================================

    const recommendedActions =
        getElement(
            "recommendedActions"
        );


    if (recommendedActions) {

        if (nextSteps.length > 0) {

            recommendedActions.innerHTML =
                nextSteps
                    .map(
                        step =>
                            createActionCard(
                                step
                            )
                    )
                    .join("");

        } else {

            recommendedActions.innerHTML = `

                <div class="no-data">
                    No documented next steps.
                </div>

            `;

        }

    }

}


// ============================================================
// STRUCTURED HEALTH CARD
// ============================================================

function createStructuredCard(
    item,
    number,
    type
) {

    // --------------------------------------------------------
    // STRING
    // --------------------------------------------------------

    if (
        typeof item === "string"
    ) {

        return `

            <div class="finding-card structured-card">

                <div class="card-number">
                    ${number}
                </div>

                <div class="card-body">

                    <div class="finding-title">
                        ${formatText(item)}
                    </div>

                </div>

            </div>

        `;

    }


    if (
        !item ||
        typeof item !== "object"
    ) {

        return "";

    }


    // --------------------------------------------------------
    // TITLE
    // --------------------------------------------------------

    const title =
        item.name ||
        item.title ||
        item.area ||
        item.focus ||
        item.step ||
        item.action ||
        "Internship Item";


    // --------------------------------------------------------
    // DESCRIPTION
    // --------------------------------------------------------

    const description =
        item.description ||
        item.detail ||
        item.accomplishment ||
        item.reason ||
        "";


    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    const status =
        item.status ||
        "";


    // --------------------------------------------------------
    // SOURCES
    // --------------------------------------------------------

    const sources =
        arrayValue(
            item.sources
        );


    let html = `

        <div class="finding-card structured-card">

            <div class="card-number">
                ${number}
            </div>

            <div class="card-body">

                <div class="finding-title">
                    ${escapeHtml(title)}
                </div>

    `;


    // --------------------------------------------------------
    // STATUS BADGE
    // --------------------------------------------------------

    if (status) {

        const statusClass =
            getStatusClass(
                status
            );


        html += `

            <div class="finding-status ${statusClass}">
                ${escapeHtml(
                    formatStatus(status)
                )}
            </div>

        `;

    }


    // --------------------------------------------------------
    // DESCRIPTION
    // --------------------------------------------------------

    if (description) {

        html += `

            <p class="finding-description">
                ${formatText(description)}
            </p>

        `;

    }


    // --------------------------------------------------------
    // RESOURCES
    // --------------------------------------------------------

    if (sources.length > 0) {

        html += `

            <div class="resource-block">

                <div class="resource-label">
                    Resources
                </div>

                <div class="finding-sources">

        `;


        sources.forEach(
            source => {

                const rawName =
                    typeof source === "object"
                        ? (
                            source.name ||
                            source.filename ||
                            source.file ||
                            source.title ||
                            ""
                        )
                        : source;


                const sourceName =
                    cleanSourceName(rawName);


                if (!sourceName) {
                    return;
                }


                html += `

                    <span class="resource-tag">
                        ${escapeHtml(sourceName)}
                    </span>

                `;

            }
        );


        html += `

                </div>

            </div>

        `;

    }


    html += `

            </div>

        </div>

    `;


    return html;

}


// ============================================================
// STATUS CLASS
// ============================================================

function getStatusClass(status) {

    const value =
        String(status)
            .toLowerCase();


    if (
        value.includes("complete")
    ) {

        return "status-completed";

    }


    if (
        value.includes("progress")
    ) {

        return "status-progress";

    }


    if (
        value.includes("block")
    ) {

        return "status-blocked";

    }


    if (
        value.includes("encounter")
    ) {

        return "status-encountered";

    }


    return "status-default";

}


// ============================================================
// FORMAT STATUS
// ============================================================

function formatStatus(status) {

    if (!status) {
        return "";
    }


    const text =
        String(status);


    return text.charAt(0).toUpperCase() +
        text.slice(1);

}


// ============================================================
// NEXT STEP CARD
// ============================================================

function createActionCard(step) {

    if (
        typeof step === "string"
    ) {

        return `

            <div class="action-item">

                ${formatText(step)}

            </div>

        `;

    }


    if (
        !step ||
        typeof step !== "object"
    ) {

        return "";

    }


    const action =
        step.action ||
        step.step ||
        step.title ||
        "Next step";


    const reason =
        step.reason ||
        step.description ||
        "";


    return `

        <div class="action-item">

            <strong>
                ${escapeHtml(action)}
            </strong>

            ${
                reason
                    ? `
                        <p>
                            ${formatText(reason)}
                        </p>
                    `
                    : ""
            }

        </div>

    `;

}


// ============================================================
// CONNECTION DETAILS
// ------------------------------------------------------------
// This card is now rendered INSIDE the Knowledge Layer panel's
// .knowledge-body (appended after the existing knowledge rows),
// instead of being inserted as a sibling of the panel itself.
// Previously it used insertAdjacentElement("afterend", card) on
// the whole panel, which made it a THIRD item in the 2-column
// .dashboard grid — it auto-placed into row 2 / column 1, which
// is what caused the Knowledge Layer column to keep growing and
// misaligning as the left "Internship Overview" panel filled up.
// ============================================================

function showConnectionDetails(
    state,
    data = null,
    errorMessage = ""
) {

    // --------------------------------------------------------
    // Find Knowledge Layer body (where the card should live)
    // --------------------------------------------------------

    const knowledgeBody =
        findKnowledgeLayerBody();


    if (!knowledgeBody) {

        console.warn(
            "Knowledge Layer container not found."
        );

        return;

    }


    // Avoid duplicate cards

    let card =
        document.getElementById(
            "connectionDetailsCard"
        );


    if (!card) {

        card =
            document.createElement(
                "div"
            );


        card.id =
            "connectionDetailsCard";


        card.className =
            "connection-details-card";


        // Append inside the panel body, not after the panel.

        knowledgeBody.appendChild(
            card
        );

    }


    // --------------------------------------------------------
    // Status
    // --------------------------------------------------------

    let overallStatus =
        "Connected";


    let overallClass =
        "connection-good";


    if (state === "analyzing") {

        overallStatus =
            "Analyzing...";

        overallClass =
            "connection-working";

    }


    if (state === "error") {

        overallStatus =
            "Connection Error";

        overallClass =
            "connection-error";

    }


    // --------------------------------------------------------
    // Analysis information
    // --------------------------------------------------------

    let analysisText =
        "Ready to answer questions from your internship knowledge.";


    if (state === "analyzing") {

        analysisText =
            "Claude is analyzing the connected internship knowledge.";

    }


    if (state === "error") {

        analysisText =
            errorMessage ||
            "The analysis could not be completed.";

    }


    if (state === "connected") {

        analysisText =
            "Knowledge successfully analyzed and available to the assistant.";

    }


    // --------------------------------------------------------
    // Counts
    // --------------------------------------------------------

    const summary =
        data?.summary || {};


    const projects =
        Number(
            summary.project_count
        ) ||
        arrayValue(
            data?.projects
        ).length;


    const challenges =
        Number(
            summary.challenge_count
        ) ||
        arrayValue(
            data?.challenges
        ).length;


    const technologies =
        Number(
            summary.technology_count
        ) ||
        arrayValue(
            data?.technologies
        ).length;


    // --------------------------------------------------------
    // HTML
    // --------------------------------------------------------

    card.innerHTML = `

        <div class="connection-header">

            <div>

                <div class="connection-title">
                    Connection Details
                </div>

                <div class="connection-subtitle">
                    Live status of the AI knowledge pipeline
                </div>

            </div>

            <span class="connection-status ${overallClass}">
                ${escapeHtml(overallStatus)}
            </span>

        </div>


        <div class="connection-items">

            <div class="connection-item">

                <div class="connection-icon">
                    ◈
                </div>

                <div class="connection-info">

                    <strong>
                        Obsidian Vault
                    </strong>

                    <span>
                        Internship knowledge source
                    </span>

                </div>

                <span class="connection-badge good">
                    Connected
                </span>

            </div>


            <div class="connection-item">

                <div class="connection-icon">
                    ✦
                </div>

                <div class="connection-info">

                    <strong>
                        Claude Sonnet
                    </strong>

                    <span>
                        AI reasoning engine
                    </span>

                </div>

                <span class="connection-badge good">
                    Active
                </span>

            </div>


            <div class="connection-item">

                <div class="connection-icon">
                    ↝
                </div>

                <div class="connection-info">

                    <strong>
                        FastAPI Backend
                    </strong>

                    <span>
                        ${escapeHtml(
                            API_BASE_URL
                        )}
                    </span>

                </div>

                <span class="connection-badge good">
                    Online
                </span>

            </div>

        </div>


        <div class="connection-analysis">

            <div class="connection-analysis-title">
                Analysis Status
            </div>

            <div class="connection-analysis-text">
                ${escapeHtml(
                    analysisText
                )}
            </div>


            <div class="connection-stats">

                <div class="connection-stat">

                    <strong>
                        ${projects}
                    </strong>

                    <span>
                        Projects
                    </span>

                </div>


                <div class="connection-stat">

                    <strong>
                        ${challenges}
                    </strong>

                    <span>
                        Challenges
                    </span>

                </div>


                <div class="connection-stat">

                    <strong>
                        ${technologies}
                    </strong>

                    <span>
                        Technologies
                    </span>

                </div>

            </div>

        </div>

    `;

}


// ============================================================
// FIND KNOWLEDGE LAYER BODY
// ------------------------------------------------------------
// Returns the .knowledge-body element inside the Knowledge
// Layer panel (not the whole panel), so the connection card can
// be appended inside it rather than inserted as a sibling of
// the panel in the dashboard grid.
// ============================================================

function findKnowledgeLayerBody() {

    // First try common IDs, in case the body itself has one.

    const knownIds = [
        "knowledgeLayer",
        "knowledge-layer",
        "knowledgeContainer",
        "knowledgeBody"
    ];


    for (
        const id of knownIds
    ) {

        const element =
            getElement(id);


        if (element) {
            return element;
        }

    }


    // Search visible headings for "Knowledge Layer", then
    // resolve to that panel's .knowledge-body.

    const headings =
        document.querySelectorAll(
            "h1, h2, h3, h4, .card-title, .section-title, .panel-heading"
        );


    for (
        const heading of headings
    ) {

        const text =
            heading.textContent
                .trim()
                .toLowerCase();


        if (
            text ===
            "knowledge layer"
        ) {

            const panel =
                heading.closest(
                    ".panel"
                ) ||
                heading.closest(
                    ".card"
                ) ||
                heading.closest(
                    ".section"
                );


            if (!panel) {
                return null;
            }


            return (
                panel.querySelector(
                    ".knowledge-body"
                ) ||
                panel
            );

        }

    }


    return null;

}


// ============================================================
// BACKEND TEST
// ============================================================

async function testBackend() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/health`,
                {
                    method: "GET",
                    headers: {
                        "Accept":
                            "application/json"
                    },
                    cache: "no-store"
                }
            );


        const data =
            await response.json();


        console.log(
            "Backend health:",
            data
        );


        return data;

    } catch (error) {

        console.error(
            "Backend connection failed:",
            error
        );


        return null;

    }

}


// ============================================================
// MAKE QUICK BUTTONS WORK
// ============================================================

function initializeQuickButtons() {

    // Buttons using data-question

    const buttons =
        document.querySelectorAll(
            "[data-question]"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                function () {

                    const question =
                        this.getAttribute(
                            "data-question"
                        );


                    if (question) {

                        quickAsk(
                            question
                        );

                    }

                }
            );

        }
    );


    // Buttons with quick-question class

    const quickButtons =
        document.querySelectorAll(
            ".quick-question"
        );


    quickButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                function () {

                    const question =
                        this.dataset.question ||
                        this.innerText.trim();


                    if (question) {

                        quickAsk(
                            question
                        );

                    }

                }
            );

        }
    );

}


// ============================================================
// INITIALIZE APP
// ============================================================

function initializeApp() {

    console.log(
        "AI Internship Memory Assistant loaded."
    );


    console.log(
        "API:",
        API_BASE_URL
    );


    console.log(
        "Question input:",
        !!getElement("question")
    );


    console.log(
        "Ask button:",
        !!getElement("askButton")
    );


    console.log(
        "Health button:",
        !!getElement("healthButton")
    );


    // --------------------------------------------------------
    // ENTER KEY
    // --------------------------------------------------------

    const input =
        getElement("question");


    if (input) {

        input.addEventListener(
            "keydown",
            handleEnter
        );

    }


    // --------------------------------------------------------
    // QUICK BUTTONS
    // --------------------------------------------------------

    initializeQuickButtons();


    // --------------------------------------------------------
    // CONNECTION CARD
    // --------------------------------------------------------

    showConnectionDetails(
        "connected"
    );


    // --------------------------------------------------------
    // BACKEND TEST
    // --------------------------------------------------------

    testBackend();

}


// ============================================================
// GLOBAL FUNCTIONS FOR HTML
// ============================================================

window.handleEnter =
    handleEnter;

window.quickAsk =
    quickAsk;

window.askQuestion =
    askQuestion;

window.healthCheck =
    healthCheck;

window.testBackend =
    testBackend;


// ============================================================
// START
// ============================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeApp
    );

} else {

    initializeApp();

}