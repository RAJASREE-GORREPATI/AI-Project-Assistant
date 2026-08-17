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
        .replace(/\n\n+/g, "<br><br>")
        .replace(/\n/g, "<br>");

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

    input.value = question;

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

        wrapper.style.display = "block";

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

    button.disabled = true;

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


        // ----------------------------------------------------
        // READ RESPONSE
        // ----------------------------------------------------

        let data = null;

        try {

            data =
                await response.json();

        } catch (jsonError) {

            throw new Error(
                `Server returned ${response.status} with an invalid response.`
            );

        }


        // ----------------------------------------------------
        // HTTP ERROR
        // ----------------------------------------------------

        if (!response.ok) {

            throw new Error(
                data?.detail ||
                data?.message ||
                `Server returned ${response.status}.`
            );

        }


        // ----------------------------------------------------
        // DISPLAY
        // ----------------------------------------------------

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
                    The backend is deployed at:
                    ${escapeHtml(API_BASE_URL)}
                </small>

            </div>

        `;

    } finally {

        button.disabled = false;

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

        console.error(
            "answerContent element not found."
        );

        return;

    }


    const answerText =
        data?.answer ||
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

                html += `

                    <li>
                        ${formatText(
                            typeof point === "object"
                                ? (
                                    point.description ||
                                    point.title ||
                                    JSON.stringify(point)
                                )
                                : point
                        )}
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

                html += `

                    <span class="source-tag">

                        ${escapeHtml(
                            typeof source === "object"
                                ? (
                                    source.name ||
                                    source.filename ||
                                    JSON.stringify(source)
                                )
                                : source
                        )}

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


    if (!button || !empty || !content || !status) {

        console.error(
            "Health check elements were not found."
        );

        return;

    }


    // --------------------------------------------------------
    // LOADING
    // --------------------------------------------------------

    button.disabled = true;

    button.innerText =
        "Analyzing...";


    status.innerText =
        "Analyzing...";


    empty.style.display =
        "block";


    content.style.display =
        "none";


    empty.innerHTML = `

        <div class="empty-symbol">
            ✦
        </div>

        <h3>
            Analyzing internship
        </h3>

        <p>
            Claude is reviewing your internship
            knowledge and identifying projects,
            accomplishments, challenges,
            learning, and next steps.
        </p>

    `;


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


        // ----------------------------------------------------
        // PARSE RESPONSE
        // ----------------------------------------------------

        let data = null;

        try {

            data =
                await response.json();

        } catch (jsonError) {

            throw new Error(
                `Server returned ${response.status} with invalid JSON.`
            );

        }


        // ----------------------------------------------------
        // ERROR
        // ----------------------------------------------------

        if (!response.ok) {

            throw new Error(
                data?.detail ||
                data?.message ||
                `Health check failed with status ${response.status}.`
            );

        }


        if (data?.error) {

            throw new Error(
                data.message ||
                data.error
            );

        }


        // ----------------------------------------------------
        // DISPLAY DATA
        // ----------------------------------------------------

        displayHealthData(data);


        empty.style.display =
            "none";


        content.style.display =
            "block";


        status.innerText =
            "Analyzed";


    } catch (error) {

        console.error(
            "Health Check Error:",
            error
        );


        status.innerText =
            "Error";


        empty.style.display =
            "block";


        content.style.display =
            "none";


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

    } finally {

        button.disabled = false;

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
        0;


    // --------------------------------------------------------
    // CURRENT HTML HAS THESE ELEMENTS
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
    // STATUS
    // --------------------------------------------------------

    const healthTitle =
        getElement("healthTitle");


    if (healthTitle) {

        healthTitle.innerText =
            summary.status ||
            "Internship Progress";

    }


    const indicator =
        getElement("healthIndicator");


    if (indicator) {

        indicator.style.background =
            "#18845b";

    }


    // --------------------------------------------------------
    // OVERVIEW
    // --------------------------------------------------------

    const overview =
        summary.overview ||
        "No overview documented.";


    // --------------------------------------------------------
    // FINDINGS CONTAINER
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


    // --------------------------------------------------------
    // OVERVIEW
    // --------------------------------------------------------

    html += `

        <div class="finding-card">

            <div class="finding-title">
                Overview
            </div>

            <p>
                ${formatText(overview)}
            </p>

        </div>

    `;


    // --------------------------------------------------------
    // PROJECTS
    // --------------------------------------------------------

    if (projects.length > 0) {

        html += `
            <div class="section-label">
                Projects
            </div>
        `;


        projects.forEach(
            item => {

                html +=
                    createHealthCard(
                        item
                    );

            }
        );

    }


    // --------------------------------------------------------
    // ACCOMPLISHMENTS
    // --------------------------------------------------------

    if (accomplishments.length > 0) {

        html += `
            <div class="section-label">
                Accomplishments
            </div>
        `;


        accomplishments.forEach(
            item => {

                html +=
                    createHealthCard(
                        item
                    );

            }
        );

    }


    // --------------------------------------------------------
    // CHALLENGES
    // --------------------------------------------------------

    if (challenges.length > 0) {

        html += `
            <div class="section-label">
                Challenges
            </div>
        `;


        challenges.forEach(
            item => {

                html +=
                    createHealthCard(
                        item
                    );

            }
        );

    }


    // --------------------------------------------------------
    // LEARNING
    // --------------------------------------------------------

    if (learning.length > 0) {

        html += `
            <div class="section-label">
                Learning
            </div>
        `;


        learning.forEach(
            item => {

                html +=
                    createHealthCard(
                        item
                    );

            }
        );

    }


    // --------------------------------------------------------
    // CURRENT FOCUS
    // --------------------------------------------------------

    if (currentFocus.length > 0) {

        html += `
            <div class="section-label">
                Current Focus
            </div>
        `;


        currentFocus.forEach(
            item => {

                html +=
                    createHealthCard(
                        item
                    );

            }
        );

    }


    findings.innerHTML =
        html;


    // --------------------------------------------------------
    // NEXT STEPS
    // --------------------------------------------------------

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
// HEALTH CARD
// ============================================================

function createHealthCard(item) {

    // --------------------------------------------------------
    // STRING
    // --------------------------------------------------------

    if (
        typeof item === "string"
    ) {

        return `

            <div class="finding-card">

                <p>
                    ${formatText(item)}
                </p>

            </div>

        `;

    }


    // --------------------------------------------------------
    // OBJECT
    // --------------------------------------------------------

    if (
        !item ||
        typeof item !== "object"
    ) {

        return "";

    }


    const title =
        item.name ||
        item.title ||
        item.area ||
        item.focus ||
        item.step ||
        "Internship Item";


    const description =
        item.description ||
        item.detail ||
        item.accomplishment ||
        item.reason ||
        "";


    const status =
        item.status ||
        "";


    const sources =
        arrayValue(
            item.sources
        );


    let html = `

        <div class="finding-card">

            <div class="finding-title">

                ${escapeHtml(title)}

            </div>

    `;


    if (status) {

        html += `

            <div class="finding-status">

                ${escapeHtml(status)}

            </div>

        `;

    }


    if (description) {

        html += `

            <p>
                ${formatText(description)}
            </p>

        `;

    }


    if (sources.length > 0) {

        html += `

            <div class="finding-sources">

                ${sources
                    .map(
                        source => `
                            <span>
                                ${escapeHtml(source)}
                            </span>
                        `
                    )
                    .join("")
                }

            </div>

        `;

    }


    html += `

        </div>

    `;


    return html;

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
        "";


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
// DEBUG / CONNECTION TEST
// ============================================================

async function testBackend() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/health`,
                {
                    method: "GET",
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
// PAGE INITIALIZATION
// ============================================================

function initializeApp() {

    console.log(
        "AI Internship Memory Assistant loaded."
    );


    console.log(
        "API:",
        API_BASE_URL
    );


    // Check that the important HTML elements exist.

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
    // BACKEND TEST
    // --------------------------------------------------------

    testBackend();

}


// ============================================================
// MAKE FUNCTIONS AVAILABLE TO HTML onclick
// ============================================================
//
// Your HTML uses:
//
// onclick="askQuestion()"
// onclick="quickAsk(...)"
// onclick="healthCheck()"
//
// These must exist on window.
//

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
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeApp
    );

} else {

    initializeApp();

}