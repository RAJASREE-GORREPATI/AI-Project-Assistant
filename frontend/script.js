// ============================================================
// AI INTERNSHIP MEMORY ASSISTANT
// FRONTEND JAVASCRIPT
// ============================================================


// ============================================================
// BACKEND URL
// ============================================================

const API_BASE_URL =
    "https://ai-project-assistant-kappa.vercel.app";


// ============================================================
// ELEMENTS
// ============================================================

const questionInput =
    document.getElementById("question");

const askButton =
    document.getElementById("askButton");

const answerWrapper =
    document.getElementById("answerWrapper");

const answerContent =
    document.getElementById("answerContent");


// ============================================================
// ENTER KEY
// ============================================================

function handleEnter(event) {

    if (event.key === "Enter") {
        askQuestion();
    }

}


// ============================================================
// QUICK QUESTIONS
// ============================================================

function quickAsk(question) {

    questionInput.value = question;

    askQuestion();

}


// ============================================================
// ASK AI
// ============================================================

async function askQuestion() {

    const question =
        questionInput.value.trim();


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!question) {

        answerWrapper.classList.add("visible");

        answerContent.innerHTML = `
            <div class="error-message">
                Please enter a question.
            </div>
        `;

        return;
    }


    // --------------------------------------------------------
    // LOADING STATE
    // --------------------------------------------------------

    askButton.disabled = true;

    askButton.innerHTML =
        "Thinking...";


    answerWrapper.classList.add("visible");


    answerContent.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>

            <span>
                Searching your internship knowledge...
            </span>
        </div>
    `;


    try {

        // ----------------------------------------------------
        // API REQUEST
        // ----------------------------------------------------

        const response = await fetch(
            `${API_BASE_URL}/ask`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },

                body: JSON.stringify({
                    question: question
                })
            }
        );


        // ----------------------------------------------------
        // HANDLE HTTP ERRORS
        // ----------------------------------------------------

        if (!response.ok) {

            let errorMessage =
                `Server returned ${response.status}`;

            try {

                const errorData =
                    await response.json();

                if (errorData.detail) {
                    errorMessage =
                        errorData.detail;
                }

            } catch (error) {
                // Ignore JSON parsing error
            }

            throw new Error(errorMessage);
        }


        // ----------------------------------------------------
        // READ RESPONSE
        // ----------------------------------------------------

        const data =
            await response.json();


        // ----------------------------------------------------
        // DISPLAY RESPONSE
        // ----------------------------------------------------

        displayAnswer(data);


    } catch (error) {

        console.error(
            "Ask API Error:",
            error
        );


        answerContent.innerHTML = `
            <div class="error-box">

                <strong>
                    Unable to get an answer
                </strong>

                <p>
                    ${escapeHtml(error.message)}
                </p>

                <small>
                    Please check that the backend deployment
                    and Obsidian connection are running.
                </small>

            </div>
        `;

    } finally {

        askButton.disabled = false;

        askButton.innerHTML =
            "Ask AI →";

    }

}


// ============================================================
// DISPLAY AI ANSWER
// ============================================================

function displayAnswer(data) {

    let html = "";


    // --------------------------------------------------------
    // ANSWER
    // --------------------------------------------------------

    if (data.answer) {

        html += `
            <div class="main-answer">
                ${formatText(data.answer)}
            </div>
        `;

    }


    // --------------------------------------------------------
    // KEY POINTS
    // --------------------------------------------------------

    if (
        Array.isArray(data.key_points) &&
        data.key_points.length > 0
    ) {

        html += `
            <div class="response-section">

                <div class="response-section-title">
                    Key Points
                </div>

                <ul class="key-points">
        `;


        data.key_points.forEach(point => {

            html += `
                <li>
                    ${formatText(point)}
                </li>
            `;

        });


        html += `
                </ul>

            </div>
        `;

    }


    // --------------------------------------------------------
    // SOURCES
    // --------------------------------------------------------

    if (
        Array.isArray(data.sources) &&
        data.sources.length > 0
    ) {

        html += `
            <div class="response-section">

                <div class="response-section-title">
                    Sources
                </div>

                <div class="sources">
        `;


        data.sources.forEach(source => {

            html += `
                <span class="source-tag">
                    ${escapeHtml(source)}
                </span>
            `;

        });


        html += `
                </div>

            </div>
        `;

    }


    // --------------------------------------------------------
    // EMPTY RESPONSE
    // --------------------------------------------------------

    if (!html) {

        html = `
            <div class="error-message">
                No response was returned.
            </div>
        `;

    }


    answerContent.innerHTML =
        html;

}


// ============================================================
// HEALTH CHECK
// ============================================================

async function healthCheck() {

    const healthButton =
        document.getElementById("healthButton");

    const healthEmpty =
        document.getElementById("healthEmpty");

    const healthContent =
        document.getElementById("healthContent");

    const healthStatus =
        document.getElementById("healthStatus");


    healthButton.disabled = true;

    healthButton.innerHTML =
        "Analyzing...";


    healthStatus.innerHTML =
        "Analyzing";


    try {

        const response = await fetch(
            `${API_BASE_URL}/health-check`,
            {
                method: "GET",

                headers: {
                    "Accept": "application/json"
                }
            }
        );


        if (!response.ok) {

            let errorMessage =
                `Server returned ${response.status}`;

            try {

                const errorData =
                    await response.json();

                if (errorData.detail) {
                    errorMessage =
                        errorData.detail;
                }

            } catch (error) {}

            throw new Error(errorMessage);
        }


        const data =
            await response.json();


        displayHealthData(data);


        healthEmpty.style.display =
            "none";

        healthContent.style.display =
            "block";

        healthStatus.innerHTML =
            "Analyzed";


    } catch (error) {

        console.error(
            "Health Check Error:",
            error
        );


        healthStatus.innerHTML =
            "Error";


        healthEmpty.innerHTML = `

            <div class="empty-symbol">
                !
            </div>

            <h3>
                Analysis failed
            </h3>

            <p>
                ${escapeHtml(error.message)}
            </p>

            <button
                class="health-button"
                onclick="healthCheck()"
            >
                Try Again
            </button>

        `;

    } finally {

        healthButton.disabled = false;

        healthButton.innerHTML =
            "Run AI Analysis";

    }

}


// ============================================================
// DISPLAY HEALTH DATA
// ============================================================

function displayHealthData(data) {

    const summary =
        data.summary || {};


    // --------------------------------------------------------
    // COUNTS
    // --------------------------------------------------------

    document.getElementById("highCount")
        .textContent =
        summary.project_count || 0;


    document.getElementById("attentionCount")
        .textContent =
        summary.challenge_count || 0;


    document.getElementById("trackCount")
        .textContent =
        summary.technology_count || 0;


    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    const status =
        summary.status || "Analyzed";


    document.getElementById("healthTitle")
        .textContent =
        status;


    // --------------------------------------------------------
    // FINDINGS
    // --------------------------------------------------------

    const findings =
        document.getElementById(
            "healthFindings"
        );


    let findingsHtml = "";


    if (
        summary.overview &&
        summary.overview.trim()
    ) {

        findingsHtml += `

            <div class="finding-card">

                <div class="finding-title">
                    Overview
                </div>

                <p>
                    ${formatText(summary.overview)}
                </p>

            </div>

        `;

    }


    // --------------------------------------------------------
    // PROJECTS
    // --------------------------------------------------------

    if (
        Array.isArray(data.projects) &&
        data.projects.length > 0
    ) {

        findingsHtml += createListSection(
            "Projects",
            data.projects
        );

    }


    // --------------------------------------------------------
    // ACCOMPLISHMENTS
    // --------------------------------------------------------

    if (
        Array.isArray(data.accomplishments) &&
        data.accomplishments.length > 0
    ) {

        findingsHtml += createListSection(
            "Accomplishments",
            data.accomplishments
        );

    }


    // --------------------------------------------------------
    // CHALLENGES
    // --------------------------------------------------------

    if (
        Array.isArray(data.challenges) &&
        data.challenges.length > 0
    ) {

        findingsHtml += createListSection(
            "Challenges",
            data.challenges
        );

    }


    // --------------------------------------------------------
    // LEARNING
    // --------------------------------------------------------

    if (
        Array.isArray(data.learning) &&
        data.learning.length > 0
    ) {

        findingsHtml += createListSection(
            "Learning",
            data.learning
        );

    }


    findings.innerHTML =
        findingsHtml;


    // --------------------------------------------------------
    // NEXT STEPS
    // --------------------------------------------------------

    const recommendedActions =
        document.getElementById(
            "recommendedActions"
        );


    if (
        Array.isArray(data.next_steps) &&
        data.next_steps.length > 0
    ) {

        recommendedActions.innerHTML =
            data.next_steps
                .map(
                    step => `
                        <div class="action-item">
                            ${formatText(step)}
                        </div>
                    `
                )
                .join("");

    } else {

        recommendedActions.innerHTML =
            `<div class="no-data">
                No documented next steps.
            </div>`;

    }

}


// ============================================================
// CREATE LIST SECTION
// ============================================================

function createListSection(
    title,
    items
) {

    return `

        <div class="finding-card">

            <div class="finding-title">
                ${escapeHtml(title)}
            </div>

            <ul class="finding-list">

                ${items
                    .map(
                        item => `
                            <li>
                                ${formatText(item)}
                            </li>
                        `
                    )
                    .join("")
                }

            </ul>

        </div>

    `;

}


// ============================================================
// TEXT FORMATTING
// ============================================================

function formatText(text) {

    if (text === null || text === undefined) {
        return "";
    }


    return escapeHtml(
        String(text)
    )
    .replace(/\n/g, "<br>");
}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        questionInput.focus();

    }
);