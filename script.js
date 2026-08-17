// ============================================================
// AI INTERNSHIP MEMORY ASSISTANT
// FRONTEND JAVASCRIPT
// ============================================================

// Same Vercel deployment serves both frontend and API.
const API_BASE = window.location.origin;


// ============================================================
// DOM HELPER
// ============================================================

function getElement(id) {
    return document.getElementById(id);
}


// ============================================================
// SAFE HTML ESCAPING
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

    if (Array.isArray(value)) {
        return value;
    }

    return [];
}


// ============================================================
// PARSE API RESPONSE
// ============================================================

async function parseResponse(response) {

    const text = await response.text();

    if (!text) {
        throw new Error(
            `Server returned an empty response (${response.status}).`
        );
    }

    let data;

    try {

        data = JSON.parse(text);

    } catch (error) {

        console.error("Raw server response:", text);

        throw new Error(
            `Server returned invalid JSON (${response.status}).`
        );
    }

    return data;
}


// ============================================================
// EXTRACT CLAUDE JSON
// ============================================================
//
// Sometimes Claude returns:
//
// ```json
// {
//   ...
// }
// ```
//
// The backend may then return that inside raw_response.
// This function safely extracts it.
//

function extractJsonFromClaudeResponse(raw) {

    if (!raw) {
        return null;
    }

    let text = String(raw).trim();

    // Remove markdown code fence.
    text = text.replace(/^```json\s*/i, "");
    text = text.replace(/^```\s*/i, "");
    text = text.replace(/\s*```$/i, "");

    text = text.trim();

    try {

        return JSON.parse(text);

    } catch (error) {

        console.error(
            "Could not parse Claude JSON:",
            error
        );

        return null;
    }
}


// ============================================================
// NORMALIZE HEALTH RESPONSE
// ============================================================

function normalizeHealthResponse(data) {

    // Normal valid response
    if (
        data &&
        typeof data === "object" &&
        data.summary
    ) {
        return data;
    }


    // Backend may return:
    //
    // {
    //   "error": "Claude returned invalid JSON.",
    //   "raw_response": "```json {...}"
    // }
    //
    if (data && data.raw_response) {

        const extracted =
            extractJsonFromClaudeResponse(
                data.raw_response
            );

        if (extracted) {
            return extracted;
        }
    }


    return data;
}


// ============================================================
// ASK AI
// ============================================================

async function askQuestion() {

    const input =
        getElement("question");

    const answerContent =
        getElement("answerContent");


    if (!input) {

        console.error(
            "question input not found."
        );

        return;
    }


    if (!answerContent) {

        console.error(
            "answerContent element not found."
        );

        return;
    }


    const question =
        input.value.trim();


    if (!question) {

        showAskError(
            "Please enter a question."
        );

        return;
    }


    setAskLoading(true);


    // Show loading immediately.
    answerContent.innerHTML = `
        <div class="loading-card">
            <div class="spinner"></div>

            <p>
                Searching your internship knowledge...
            </p>
        </div>
    `;


    try {

        const response = await fetch(
            `${API_BASE}/ask`,
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
                })
            }
        );


        const data =
            await parseResponse(response);


        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.message ||
                "Unable to process the question."
            );
        }


        displayAskResponse(data);


    } catch (error) {

        console.error(
            "Ask AI error:",
            error
        );


        showAskError(
            error.message ||
            "Something went wrong while asking the AI."
        );


    } finally {

        setAskLoading(false);
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


    // Put question into input.
    input.value = question;


    // Ask immediately.
    askQuestion();
}


// ============================================================
// DISPLAY ASK RESPONSE
// ============================================================

function displayAskResponse(data) {

    const container =
        getElement("answerContent");


    if (!container) {

        console.error(
            "answerContent not found."
        );

        return;
    }


    const answer =
        data.answer ||
        "No answer returned.";


    const keyPoints =
        arrayValue(data.key_points);


    const sources =
        arrayValue(data.sources);


    let html = `

        <div class="response-content">

            <div class="answer-text">
                ${escapeHtml(answer)}
            </div>

    `;


    // ========================================================
    // KEY POINTS
    // ========================================================

    if (keyPoints.length > 0) {

        html += `

            <div class="response-section">

                <h3>
                    KEY POINTS
                </h3>

                <ul>
        `;


        keyPoints.forEach(point => {

            html += `
                <li>
                    ${escapeHtml(point)}
                </li>
            `;

        });


        html += `

                </ul>

            </div>

        `;
    }


    // ========================================================
    // SOURCES
    // ========================================================

    if (sources.length > 0) {

        html += `

            <div class="response-section">

                <h3>
                    SOURCES
                </h3>

                <div class="source-list">
        `;


        sources.forEach(source => {

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


    html += `

        </div>

    `;


    container.innerHTML = html;


    // Scroll to answer.
    const wrapper =
        getElement("answerWrapper");


    if (wrapper) {

        wrapper.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}


// ============================================================
// ASK ERROR
// ============================================================

function showAskError(message) {

    const container =
        getElement("answerContent");


    if (!container) {
        return;
    }


    container.innerHTML = `

        <div class="error-card">

            <h3>
                Something went wrong
            </h3>

            <p>
                ${escapeHtml(message)}
            </p>

        </div>

    `;
}


// ============================================================
// ASK LOADING
// ============================================================

function setAskLoading(isLoading) {

    const button =
        getElement("askButton");


    const input =
        getElement("question");


    if (button) {

        button.disabled =
            isLoading;


        button.textContent =
            isLoading
                ? "Thinking..."
                : "Ask AI →";
    }


    if (input) {

        input.disabled =
            isLoading;
    }
}


// ============================================================
// HEALTH CHECK
// ============================================================
//
// IMPORTANT:
// Your HTML calls:
//
// onclick="healthCheck()"
//
// So this function MUST exist.
//

async function healthCheck() {

    const healthEmpty =
        getElement("healthEmpty");


    const healthContent =
        getElement("healthContent");


    const healthButton =
        getElement("healthButton");


    if (!healthContent) {

        console.error(
            "healthContent not found."
        );

        return;
    }


    // Hide empty state.
    if (healthEmpty) {
        healthEmpty.style.display = "none";
    }


    // Show content.
    healthContent.style.display =
        "block";


    // Loading state.
    healthContent.innerHTML = `

        <div class="loading-card">

            <div class="spinner"></div>

            <p>
                Analyzing your internship knowledge...
            </p>

        </div>

    `;


    if (healthButton) {
        healthButton.disabled = true;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/health-check`,
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
            await parseResponse(response);


        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.message ||
                data.error ||
                "Health check failed."
            );
        }


        const normalizedData =
            normalizeHealthResponse(data);


        if (
            !normalizedData ||
            !normalizedData.summary
        ) {

            throw new Error(
                normalizedData &&
                normalizedData.error
                    ? normalizedData.error
                    : "Invalid health check response."
            );
        }


        displayHealthCheck(
            normalizedData
        );


    } catch (error) {

        console.error(
            "Health check error:",
            error
        );


        showHealthError(
            error.message ||
            "Unable to load internship analysis."
        );


    } finally {

        if (healthButton) {
            healthButton.disabled = false;
        }
    }
}


// ============================================================
// HEALTH ERROR
// ============================================================

function showHealthError(message) {

    const healthContent =
        getElement("healthContent");


    const healthEmpty =
        getElement("healthEmpty");


    if (!healthContent) {
        return;
    }


    if (healthEmpty) {
        healthEmpty.style.display = "none";
    }


    healthContent.style.display =
        "block";


    healthContent.innerHTML = `

        <div class="error-card">

            <h3>
                Analysis unavailable
            </h3>

            <p>
                ${escapeHtml(message)}
            </p>

            <button
                class="retry-button"
                onclick="healthCheck()"
            >
                Re-analyze
            </button>

        </div>

    `;
}


// ============================================================
// DISPLAY HEALTH CHECK
// ============================================================

function displayHealthCheck(data) {

    const healthEmpty =
        getElement("healthEmpty");


    const healthContent =
        getElement("healthContent");


    const healthStatus =
        getElement("healthStatus");


    const healthIndicator =
        getElement("healthIndicator");


    const healthTitle =
        getElement("healthTitle");


    const highCount =
        getElement("highCount");


    const attentionCount =
        getElement("attentionCount");


    const trackCount =
        getElement("trackCount");


    const healthFindings =
        getElement("healthFindings");


    const recommendedActions =
        getElement("recommendedActions");


    if (!healthContent) {

        console.error(
            "healthContent not found."
        );

        return;
    }


    // ========================================================
    // SHOW HEALTH CONTENT
    // ========================================================

    if (healthEmpty) {

        healthEmpty.style.display =
            "none";
    }


    healthContent.style.display =
        "block";


    // ========================================================
    // DATA
    // ========================================================

    const summary =
        data.summary || {};


    const projects =
        arrayValue(data.projects);


    const accomplishments =
        arrayValue(data.accomplishments);


    const challenges =
        arrayValue(data.challenges);


    const learning =
        arrayValue(data.learning);


    const currentFocus =
        arrayValue(data.current_focus);


    const nextSteps =
        arrayValue(data.next_steps);


    // ========================================================
    // COUNTS
    // ========================================================

    const projectCount =
        Number(summary.project_count) ||
        projects.length;


    const challengeCount =
        Number(summary.challenge_count) ||
        challenges.length;


    const technologyCount =
        Number(summary.technology_count) ||
        0;


    // ========================================================
    // UPDATE TOP STATUS
    // ========================================================

    if (healthStatus) {

        healthStatus.textContent =
            "Analyzed";

        healthStatus.classList.add(
            "analyzed"
        );
    }


    if (healthIndicator) {

        healthIndicator.classList.add(
            "active"
        );
    }


    if (healthTitle) {

        healthTitle.textContent =
            capitalize(
                summary.status ||
                "Active"
            );
    }


    // ========================================================
    // STATISTICS
    // ========================================================

    if (highCount) {

        highCount.textContent =
            projectCount;
    }


    if (attentionCount) {

        attentionCount.textContent =
            challengeCount;
    }


    if (trackCount) {

        trackCount.textContent =
            technologyCount;
    }


    // ========================================================
    // FINDINGS
    // ========================================================

    if (healthFindings) {

        healthFindings.innerHTML = `

            <div class="health-section">

                <div class="section-label">
                    OVERVIEW
                </div>

                <p class="overview-text">
                    ${escapeHtml(
                        summary.overview ||
                        "No overview documented."
                    )}
                </p>

            </div>


            <div class="health-section">

                <div class="section-label">
                    PROJECTS
                </div>

                ${renderProjects(projects)}

            </div>


            <div class="health-section">

                <div class="section-label">
                    ACCOMPLISHMENTS
                </div>

                ${renderAccomplishments(
                    accomplishments
                )}

            </div>


            <div class="health-section">

                <div class="section-label">
                    CHALLENGES
                </div>

                ${renderChallenges(
                    challenges
                )}

            </div>


            <div class="health-section">

                <div class="section-label">
                    LEARNING
                </div>

                ${renderLearning(
                    learning
                )}

            </div>


            <div class="health-section">

                <div class="section-label">
                    CURRENT FOCUS
                </div>

                ${renderCurrentFocus(
                    currentFocus
                )}

            </div>

        `;
    }


    // ========================================================
    // NEXT STEPS
    // ========================================================

    if (recommendedActions) {

        recommendedActions.innerHTML =
            renderNextSteps(
                nextSteps
            );
    }
}


// ============================================================
// CAPITALIZE
// ============================================================

function capitalize(value) {

    if (!value) {
        return "";
    }


    const text =
        String(value);


    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );
}


// ============================================================
// PROJECTS
// ============================================================

function renderProjects(projects) {

    if (!projects.length) {

        return `
            <p class="empty-state">
                No documented projects.
            </p>
        `;
    }


    return `

        <div class="project-list">

            ${projects.map(project => {

                // Protect against unexpected object formats.
                if (
                    !project ||
                    typeof project !== "object"
                ) {

                    return "";
                }


                const name =
                    project.name ||
                    "Unnamed project";


                const status =
                    project.status ||
                    "unknown";


                const description =
                    project.description ||
                    "No description documented.";


                const sources =
                    arrayValue(
                        project.sources
                    );


                return `

                    <div class="project-item">

                        <div class="item-top">

                            <h4>
                                ${escapeHtml(name)}
                            </h4>

                            <span
                                class="project-status ${escapeHtml(status)}"
                            >
                                ${escapeHtml(status)}
                            </span>

                        </div>


                        <p>
                            ${escapeHtml(description)}
                        </p>


                        ${renderSources(sources)}

                    </div>

                `;

            }).join("")}

        </div>

    `;
}


// ============================================================
// ACCOMPLISHMENTS
// ============================================================

function renderAccomplishments(
    accomplishments
) {

    if (!accomplishments.length) {

        return `
            <p class="empty-state">
                No documented accomplishments.
            </p>
        `;
    }


    return `

        <ul class="simple-list">

            ${accomplishments.map(item => {

                if (
                    !item ||
                    typeof item !== "object"
                ) {
                    return "";
                }


                const description =
                    item.description ||
                    item.accomplishment ||
                    "";


                const sources =
                    arrayValue(
                        item.sources
                    );


                return `

                    <li>

                        ${escapeHtml(description)}

                        ${renderSources(
                            sources
                        )}

                    </li>

                `;

            }).join("")}

        </ul>

    `;
}


// ============================================================
// CHALLENGES
// ============================================================

function renderChallenges(challenges) {

    if (!challenges.length) {

        return `
            <p class="empty-state">
                No documented challenges.
            </p>
        `;
    }


    return `

        <div class="challenge-list">

            ${challenges.map(challenge => {

                if (
                    !challenge ||
                    typeof challenge !== "object"
                ) {
                    return "";
                }


                const title =
                    challenge.title ||
                    challenge.challenge ||
                    "Challenge";


                const description =
                    challenge.description ||
                    "";


                const status =
                    challenge.status ||
                    "encountered";


                const sources =
                    arrayValue(
                        challenge.sources
                    );


                return `

                    <div class="challenge-item">

                        <div class="item-top">

                            <h4>
                                ${escapeHtml(title)}
                            </h4>

                            <span
                                class="challenge-status ${escapeHtml(status)}"
                            >
                                ${escapeHtml(status)}
                            </span>

                        </div>


                        <p>
                            ${escapeHtml(description)}
                        </p>


                        ${renderSources(sources)}

                    </div>

                `;

            }).join("")}

        </div>

    `;
}


// ============================================================
// LEARNING
// ============================================================

function renderLearning(learning) {

    if (!learning.length) {

        return `
            <p class="empty-state">
                No documented learning areas.
            </p>
        `;
    }


    return `

        <div class="learning-list">

            ${learning.map(item => {

                if (
                    !item ||
                    typeof item !== "object"
                ) {
                    return "";
                }


                const area =
                    item.area ||
                    item.name ||
                    "Learning";


                const description =
                    item.description ||
                    "";


                const sources =
                    arrayValue(
                        item.sources
                    );


                return `

                    <div class="learning-item">

                        <h4>
                            ${escapeHtml(area)}
                        </h4>

                        <p>
                            ${escapeHtml(description)}
                        </p>

                        ${renderSources(sources)}

                    </div>

                `;

            }).join("")}

        </div>

    `;
}


// ============================================================
// CURRENT FOCUS
// ============================================================

function renderCurrentFocus(
    currentFocus
) {

    if (!currentFocus.length) {

        return `
            <p class="empty-state">
                No documented current focus.
            </p>
        `;
    }


    return `

        <ul class="simple-list">

            ${currentFocus.map(item => {

                if (
                    !item ||
                    typeof item !== "object"
                ) {
                    return "";
                }


                const focus =
                    item.focus ||
                    item.description ||
                    item.step ||
                    "";


                const source =
                    item.source ||
                    "";


                return `

                    <li>

                        ${escapeHtml(focus)}

                        ${
                            source
                                ? `
                                    <span class="inline-source">
                                        ${escapeHtml(source)}
                                    </span>
                                  `
                                : ""
                        }

                    </li>

                `;

            }).join("")}

        </ul>

    `;
}


// ============================================================
// NEXT STEPS
// ============================================================

function renderNextSteps(nextSteps) {

    if (!nextSteps.length) {

        return `
            <p class="empty-state">
                No documented next steps.
            </p>
        `;
    }


    return `

        <ol class="simple-list numbered">

            ${nextSteps.map(item => {

                if (
                    !item ||
                    typeof item !== "object"
                ) {
                    return "";
                }


                const step =
                    item.step ||
                    item.description ||
                    item.next_step ||
                    "";


                const source =
                    item.source ||
                    "";


                return `

                    <li>

                        ${escapeHtml(step)}

                        ${
                            source
                                ? `
                                    <span class="inline-source">
                                        ${escapeHtml(source)}
                                    </span>
                                  `
                                : ""
                        }

                    </li>

                `;

            }).join("")}

        </ol>

    `;
}


// ============================================================
// SOURCES
// ============================================================

function renderSources(sources) {

    if (!sources.length) {
        return "";
    }


    return `

        <div class="source-list">

            ${sources.map(source => {

                return `

                    <span class="source-tag">
                        ${escapeHtml(source)}
                    </span>

                `;

            }).join("")}

        </div>

    `;
}


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "AI Internship Memory Assistant loaded."
        );


        console.log(
            "API:",
            API_BASE
        );


        // ====================================================
        // ASK INPUT
        // ====================================================

        const input =
            getElement("question");


        if (input) {

            input.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key === "Enter" &&
                        !event.shiftKey
                    ) {

                        event.preventDefault();

                        askQuestion();
                    }
                }
            );
        }


        // ====================================================
        // DO NOT AUTOMATICALLY CALL HEALTH CHECK
        // ====================================================
        //
        // The user should click:
        //
        // "Run AI Analysis"
        //
        // or:
        //
        // "Re-analyze"
        //
        // ====================================================

    }
);