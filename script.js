// ============================================================
// CONFIGURATION
// ============================================================

const API_BASE = window.location.origin;


// ============================================================
// DOM HELPERS
// ============================================================

function getElement(id) {
    return document.getElementById(id);
}


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


function arrayValue(value) {

    if (!Array.isArray(value)) {
        return [];
    }

    return value;
}


// ============================================================
// ASK AI
// ============================================================

async function askQuestion() {

    const input = getElement("question");

    if (!input) {
        console.error("Question input not found.");
        return;
    }

    const question = input.value.trim();

    if (!question) {
        showAskError("Please enter a question.");
        return;
    }

    setAskLoading(true);

    try {

        const response = await fetch(
            `${API_BASE}/ask`,
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

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.message ||
                "Unable to process the question."
            );
        }

        displayAskResponse(data);

    } catch (error) {

        console.error("Ask error:", error);

        showAskError(
            error.message ||
            "Something went wrong while asking the AI."
        );

    } finally {

        setAskLoading(false);
    }
}


// ============================================================
// DISPLAY ASK RESPONSE
// ============================================================

function displayAskResponse(data) {

    const container = getElement("response");

    if (!container) {
        console.error("Response container not found.");
        return;
    }

    const answer = escapeHtml(
        data.answer || "No answer returned."
    );

    const keyPoints = arrayValue(
        data.key_points
    );

    const sources = arrayValue(
        data.sources
    );

    let html = `
        <div class="response-card">

            <div class="response-header">
                <h2>AI Response</h2>
                <span>INTERNSHIP KNOWLEDGE</span>
            </div>

            <div class="answer">
                ${answer}
            </div>
    `;


    // --------------------------------------------------------
    // KEY POINTS
    // --------------------------------------------------------

    if (keyPoints.length > 0) {

        html += `
            <div class="response-section">
                <h3>KEY POINTS</h3>
                <ul>
        `;

        keyPoints.forEach(point => {

            html += `
                <li>${escapeHtml(point)}</li>
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

    if (sources.length > 0) {

        html += `
            <div class="response-section">
                <h3>SOURCES</h3>
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
}


// ============================================================
// ASK ERROR
// ============================================================

function showAskError(message) {

    const container = getElement("response");

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="error-card">
            <h3>Something went wrong</h3>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
}


// ============================================================
// ASK LOADING
// ============================================================

function setAskLoading(isLoading) {

    const button = getElement("askButton");
    const input = getElement("question");

    if (button) {

        button.disabled = isLoading;

        button.textContent = isLoading
            ? "Thinking..."
            : "Ask AI";
    }

    if (input) {
        input.disabled = isLoading;
    }
}


// ============================================================
// HEALTH CHECK
// ============================================================

async function loadHealthCheck() {

    const container = getElement(
        "health-container"
    );

    if (!container) {
        console.warn(
            "health-container not found."
        );
        return;
    }

    showHealthLoading(container);

    try {

        const response = await fetch(
            `${API_BASE}/health-check`,
            {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                cache: "no-store"
            }
        );

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.message ||
                "Health check failed."
            );
        }


        // ----------------------------------------------------
        // BACKEND ERROR
        // ----------------------------------------------------

        if (data.error) {

            showHealthError(
                container,
                data.message || data.error
            );

            return;
        }


        // ----------------------------------------------------
        // DISPLAY
        // ----------------------------------------------------

        displayHealthCheck(
            container,
            data
        );

    } catch (error) {

        console.error(
            "Health check error:",
            error
        );

        showHealthError(
            container,
            error.message ||
            "Unable to load internship analysis."
        );
    }
}


// ============================================================
// HEALTH LOADING
// ============================================================

function showHealthLoading(container) {

    container.innerHTML = `
        <div class="loading-card">
            <div class="spinner"></div>
            <p>Analyzing your internship knowledge...</p>
        </div>
    `;
}


// ============================================================
// HEALTH ERROR
// ============================================================

function showHealthError(
    container,
    message
) {

    container.innerHTML = `
        <div class="error-card">

            <h3>Analysis unavailable</h3>

            <p>
                ${escapeHtml(message)}
            </p>

            <button
                class="retry-button"
                onclick="loadHealthCheck()"
            >
                Re-analyze
            </button>

        </div>
    `;
}


// ============================================================
// HEALTH CHECK DISPLAY
// ============================================================

function displayHealthCheck(
    container,
    data
) {

    const summary = data.summary || {};

    const projects = arrayValue(
        data.projects
    );

    const challenges = arrayValue(
        data.challenges
    );

    const learning = arrayValue(
        data.learning
    );

    const accomplishments = arrayValue(
        data.accomplishments
    );

    const currentFocus = arrayValue(
        data.current_focus
    );

    const nextSteps = arrayValue(
        data.next_steps
    );


    const projectCount =
        Number(summary.project_count) ||
        projects.length;


    const challengeCount =
        Number(summary.challenge_count) ||
        challenges.length;


    const technologyCount =
        Number(summary.technology_count) ||
        0;


    container.innerHTML = `

        <div class="health-card">

            <!-- HEADER -->

            <div class="health-header">

                <div>
                    <h2>Internship Overview</h2>

                    <p>
                        AI analysis of your internship knowledge
                    </p>
                </div>

                <span class="status-badge">
                    Analyzed
                </span>

            </div>


            <!-- STATUS -->

            <div class="health-status">

                <div class="status-left">

                    <span class="status-dot"></span>

                    <div>
                        <strong>
                            ${escapeHtml(
                                summary.status || "Active"
                            )}
                        </strong>

                        <span>
                            AI-generated assessment
                        </span>
                    </div>

                </div>


                <button
                    class="reanalyze-button"
                    onclick="loadHealthCheck()"
                >
                    Re-analyze
                </button>

            </div>


            <!-- STATISTICS -->

            <div class="stats-grid">

                <div class="stat-card">
                    <strong>
                        ${projectCount}
                    </strong>

                    <span>
                        Projects
                    </span>
                </div>


                <div class="stat-card">
                    <strong>
                        ${challengeCount}
                    </strong>

                    <span>
                        Challenges
                    </span>
                </div>


                <div class="stat-card">
                    <strong>
                        ${technologyCount}
                    </strong>

                    <span>
                        Technologies
                    </span>
                </div>

            </div>


            <!-- OVERVIEW -->

            <section class="health-section">

                <h3>OVERVIEW</h3>

                <p class="overview-text">
                    ${escapeHtml(
                        summary.overview ||
                        "No overview documented."
                    )}
                </p>

            </section>


            <!-- PROJECTS -->

            <section class="health-section">

                <h3>PROJECTS</h3>

                ${renderProjects(projects)}

            </section>


            <!-- ACCOMPLISHMENTS -->

            <section class="health-section">

                <h3>ACCOMPLISHMENTS</h3>

                ${renderAccomplishments(
                    accomplishments
                )}

            </section>


            <!-- CHALLENGES -->

            <section class="health-section">

                <h3>CHALLENGES</h3>

                ${renderChallenges(challenges)}

            </section>


            <!-- LEARNING -->

            <section class="health-section">

                <h3>LEARNING</h3>

                ${renderLearning(learning)}

            </section>


            <!-- CURRENT FOCUS -->

            <section class="health-section">

                <h3>CURRENT FOCUS</h3>

                ${renderCurrentFocus(
                    currentFocus
                )}

            </section>


            <!-- NEXT STEPS -->

            <section class="health-section">

                <h3>NEXT STEPS</h3>

                ${renderNextSteps(nextSteps)}

            </section>

        </div>
    `;
}


// ============================================================
// PROJECTS
// ============================================================

function renderProjects(projects) {

    if (projects.length === 0) {

        return `
            <p class="empty-state">
                No documented projects.
            </p>
        `;
    }


    return `
        <div class="project-list">

            ${projects.map(project => {

                const name =
                    project.name || "Unnamed project";

                const status =
                    project.status || "unknown";

                const description =
                    project.description ||
                    "No description documented.";

                const sources =
                    arrayValue(project.sources);


                return `
                    <div class="project-item">

                        <div class="item-top">

                            <h4>
                                ${escapeHtml(name)}
                            </h4>

                            <span class="
                                project-status
                                ${escapeHtml(status)}
                            ">
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

    if (accomplishments.length === 0) {

        return `
            <p class="empty-state">
                No documented accomplishments.
            </p>
        `;
    }


    return `
        <ul class="simple-list">

            ${accomplishments.map(item => {

                const description =
                    item.description ||
                    item.accomplishment ||
                    "";

                return `
                    <li>
                        ${escapeHtml(description)}

                        ${renderSources(
                            arrayValue(
                                item.sources
                            )
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

    if (challenges.length === 0) {

        return `
            <p class="empty-state">
                No documented challenges.
            </p>
        `;
    }


    return `
        <div class="challenge-list">

            ${challenges.map(challenge => {

                const title =
                    challenge.title ||
                    "Challenge";

                const description =
                    challenge.description ||
                    "";

                const status =
                    challenge.status ||
                    "encountered";


                return `
                    <div class="challenge-item">

                        <div class="item-top">

                            <h4>
                                ${escapeHtml(title)}
                            </h4>

                            <span class="
                                challenge-status
                                ${escapeHtml(status)}
                            ">
                                ${escapeHtml(status)}
                            </span>

                        </div>

                        <p>
                            ${escapeHtml(description)}
                        </p>

                        ${renderSources(
                            arrayValue(
                                challenge.sources
                            )
                        )}

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

    if (learning.length === 0) {

        return `
            <p class="empty-state">
                No documented learning areas.
            </p>
        `;
    }


    return `
        <div class="learning-list">

            ${learning.map(item => {

                const area =
                    item.area ||
                    "Learning";

                const description =
                    item.description ||
                    "";


                return `
                    <div class="learning-item">

                        <h4>
                            ${escapeHtml(area)}
                        </h4>

                        <p>
                            ${escapeHtml(description)}
                        </p>

                        ${renderSources(
                            arrayValue(
                                item.sources
                            )
                        )}

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

    if (currentFocus.length === 0) {

        return `
            <p class="empty-state">
                No documented current focus.
            </p>
        `;
    }


    return `
        <ul class="simple-list">

            ${currentFocus.map(item => {

                const focus =
                    item.focus ||
                    item.description ||
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

    if (nextSteps.length === 0) {

        return `
            <p class="empty-state">
                No documented next steps.
            </p>
        `;
    }


    return `
        <ol class="simple-list numbered">

            ${nextSteps.map(item => {

                const step =
                    item.step ||
                    item.description ||
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
// ENTER KEY
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

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


        // Load health check automatically
        loadHealthCheck();
    }
);