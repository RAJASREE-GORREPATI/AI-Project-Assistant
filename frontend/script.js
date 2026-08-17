/* ==========================================================
   API CONFIGURATION
========================================================== */

// LOCAL DEVELOPMENT
const API_BASE_URL = "http://127.0.0.1:8000";

// When FastAPI is deployed, change the line above to:
//
// const API_BASE_URL = "https://your-backend-url.com";


/* ==========================================================
   ENTER KEY
========================================================== */

function handleEnter(event) {

    if (event.key === "Enter") {
        askQuestion();
    }

}


/* ==========================================================
   QUICK PROMPTS
========================================================== */

function quickAsk(question) {

    document.getElementById("question").value = question;

    askQuestion();

}


/* ==========================================================
   ASK AI
========================================================== */

async function askQuestion() {

    const input =
        document.getElementById("question");

    const button =
        document.getElementById("askButton");

    const wrapper =
        document.getElementById("answerWrapper");

    const answer =
        document.getElementById("answerContent");

    const question =
        input.value.trim();


    if (!question) {

        input.focus();

        return;

    }


    wrapper.style.display = "block";


    answer.innerHTML = `
        <div class="ai-loading">
            <span class="loading-dot"></span>

            <span>
                Analyzing your internship knowledge...
            </span>
        </div>
    `;


    button.disabled = true;

    button.innerText = "Thinking...";


    try {

        const response = await fetch(
            `${API_BASE_URL}/ask`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    question: question
                })
            }
        );


        if (!response.ok) {

            throw new Error(
                "Request failed"
            );

        }


        const data =
            await response.json();


        renderAnswer(data);


    } catch (error) {

        console.error(error);


        answer.innerHTML = `
            <div class="answer-error">

                <strong>
                    Unable to get an answer
                </strong>

                <span>
                    Make sure FastAPI and Obsidian
                    are running.
                </span>

            </div>
        `;

    }


    button.disabled = false;

    button.innerText = "Ask AI →";

}


/* ==========================================================
   RENDER AI ANSWER
========================================================== */

function renderAnswer(data) {

    const answer =
        document.getElementById(
            "answerContent"
        );


    const answerText =
        data.answer ||
        "No answer available.";


    const keyPoints =
        data.key_points || [];


    const sources =
        data.sources || [];


    let html = `

        <div class="answer-main">

            ${formatAIText(answerText)}

        </div>

    `;


    /* ======================================================
       KEY POINTS
    ====================================================== */

    if (keyPoints.length > 0) {

        html += `

            <div class="answer-section">

                <div class="answer-section-title">
                    Key Points
                </div>


                <div class="key-points">

                    ${keyPoints
                        .map(
                            point => `
                                <div class="key-point">

                                    <span class="point-icon">
                                        ✓
                                    </span>

                                    <span>
                                        ${escapeHtml(point)}
                                    </span>

                                </div>
                            `
                        )
                        .join("")
                    }

                </div>

            </div>

        `;

    }


    /* ======================================================
       SOURCES
    ====================================================== */

    if (sources.length > 0) {

        html += `

            <div class="answer-section">

                <div class="answer-section-title">
                    Sources
                </div>


                <div class="answer-sources">

                    ${sources
                        .map(
                            source => `
                                <span class="answer-source">
                                    ${escapeHtml(source)}
                                </span>
                            `
                        )
                        .join("")
                    }

                </div>

            </div>

        `;

    }


    answer.innerHTML = html;

}


/* ==========================================================
   FORMAT AI RESPONSE
========================================================== */

function formatAIText(text) {

    if (!text) {
        return "";
    }


    let formatted =
        escapeHtml(text);


    /* -----------------------------------------------
       HEADINGS
    ------------------------------------------------ */

    formatted =
        formatted.replace(
            /^### (.*?)$/gm,
            '<h4 class="ai-heading">$1</h4>'
        );


    formatted =
        formatted.replace(
            /^## (.*?)$/gm,
            '<h3 class="ai-heading">$1</h3>'
        );


    formatted =
        formatted.replace(
            /^# (.*?)$/gm,
            '<h2 class="ai-heading">$1</h2>'
        );


    /* -----------------------------------------------
       BOLD TEXT
    ------------------------------------------------ */

    formatted =
        formatted.replace(
            /\*\*(.*?)\*\*/g,
            '<strong>$1</strong>'
        );


    /* -----------------------------------------------
       ITALIC TEXT
    ------------------------------------------------ */

    formatted =
        formatted.replace(
            /\*(.*?)\*/g,
            '<em>$1</em>'
        );


    /* -----------------------------------------------
       BULLET POINTS
    ------------------------------------------------ */

    formatted =
        formatted.replace(
            /^\s*[-•]\s+(.*?)$/gm,
            `
            <div class="ai-bullet">

                <span>
                    •
                </span>

                <span>
                    $1
                </span>

            </div>
            `
        );


    /* -----------------------------------------------
       NUMBERED LISTS
    ------------------------------------------------ */

    formatted =
        formatted.replace(
            /^\s*(\d+)\.\s+(.*?)$/gm,
            `
            <div class="ai-numbered">

                <span class="number">
                    $1
                </span>

                <span>
                    $2
                </span>

            </div>
            `
        );


    /* -----------------------------------------------
       HORIZONTAL LINES
    ------------------------------------------------ */

    formatted =
        formatted.replace(
            /^---$/gm,
            '<div class="ai-divider"></div>'
        );


    /* -----------------------------------------------
       PARAGRAPH SPACING
    ------------------------------------------------ */

    formatted =
        formatted.replace(
            /\n{2,}/g,
            '<div class="ai-space"></div>'
        );


    /* -----------------------------------------------
       REMAINING LINE BREAKS
    ------------------------------------------------ */

    formatted =
        formatted.replace(
            /\n/g,
            "<br>"
        );


    return formatted;

}


/* ==========================================================
   INTERNSHIP HEALTH CHECK
========================================================== */

async function healthCheck() {

    const empty =
        document.getElementById(
            "healthEmpty"
        );


    const content =
        document.getElementById(
            "healthContent"
        );


    const status =
        document.getElementById(
            "healthStatus"
        );


    const button =
        document.getElementById(
            "healthButton"
        );


    status.innerText =
        "Analyzing...";


    button.disabled = true;

    button.innerText =
        "Analyzing...";


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
            accomplishments, challenges, and
            next steps.
        </p>

    `;


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/health-check`
            );


        if (!response.ok) {

            throw new Error(
                "Health check failed"
            );

        }


        const data =
            await response.json();


        if (data.error) {

            throw new Error(
                data.error
            );

        }


        renderHealth(data);


        empty.style.display =
            "none";


        content.style.display =
            "block";


        status.innerText =
            "Updated just now";


    } catch (error) {

        console.error(error);


        empty.innerHTML = `

            <div class="empty-symbol">
                !
            </div>


            <h3>
                Analysis failed
            </h3>


            <p>
                Unable to analyze the internship.
                Make sure FastAPI and Obsidian
                are running.
            </p>

        `;


        status.innerText =
            "Unable to analyze";

    }


    button.disabled = false;

    button.innerText =
        "Run AI Analysis";

}


/* ==========================================================
   RENDER HEALTH
========================================================== */

function renderHealth(data) {

    const summary =
        data.summary || {};


    /* ======================================================
       SUPPORT CURRENT / NEW DATA
    ====================================================== */

    const projectCount =
        summary.project_count ??
        summary.high_risk_count ??
        0;


    const challengeCount =
        summary.challenge_count ??
        summary.attention_count ??
        0;


    const technologyCount =
        summary.technology_count ??
        summary.on_track_count ??
        0;


    /* ======================================================
       TITLE
    ====================================================== */

    document.getElementById(
        "healthTitle"
    ).innerText =
        summary.status ||
        "Internship Progress";


    /* ======================================================
       COUNTS
    ====================================================== */

    document.getElementById(
        "highCount"
    ).innerText =
        projectCount;


    document.getElementById(
        "attentionCount"
    ).innerText =
        challengeCount;


    document.getElementById(
        "trackCount"
    ).innerText =
        technologyCount;


    /* ======================================================
       HEALTH INDICATOR
    ====================================================== */

    const indicator =
        document.getElementById(
            "healthIndicator"
        );


    if (
        summary.status &&
        summary.status
            .toLowerCase()
            .includes("attention")
    ) {

        indicator.style.background =
            "#c87500";

    }

    else {

        indicator.style.background =
            "#18845b";

    }


    /* ======================================================
       FINDINGS
    ====================================================== */

    const findings =
        document.getElementById(
            "healthFindings"
        );


    findings.innerHTML = "";


    /* ======================================================
       PROJECTS
    ====================================================== */

    if (
        data.projects &&
        data.projects.length > 0
    ) {

        findings.innerHTML += `

            <div class="section-label">
                Projects
            </div>

        `;


        data.projects.forEach(
            item => {

                findings.innerHTML +=
                    createInternshipCard(
                        item,
                        "project"
                    );

            }
        );

    }


    /* ======================================================
       ACCOMPLISHMENTS
    ====================================================== */

    if (
        data.accomplishments &&
        data.accomplishments.length > 0
    ) {

        findings.innerHTML += `

            <div class="section-label">
                Accomplishments
            </div>

        `;


        data.accomplishments.forEach(
            item => {

                findings.innerHTML +=
                    createInternshipCard(
                        item,
                        "accomplishment"
                    );

            }
        );

    }


    /* ======================================================
       CHALLENGES
    ====================================================== */

    if (
        data.challenges &&
        data.challenges.length > 0
    ) {

        findings.innerHTML += `

            <div class="section-label">
                Challenges
            </div>

        `;


        data.challenges.forEach(
            item => {

                findings.innerHTML +=
                    createInternshipCard(
                        item,
                        "challenge"
                    );

            }
        );

    }


    /* ======================================================
       LEARNING
    ====================================================== */

    if (
        data.learning &&
        data.learning.length > 0
    ) {

        findings.innerHTML += `

            <div class="section-label">
                Learning & Development
            </div>

        `;


        data.learning.forEach(
            item => {

                findings.innerHTML +=
                    createInternshipCard(
                        item,
                        "learning"
                    );

            }
        );

    }


    /* ======================================================
       CURRENT FOCUS
    ====================================================== */

    if (
        data.current_focus &&
        data.current_focus.length > 0
    ) {

        findings.innerHTML += `

            <div class="section-label">
                Current Focus
            </div>

        `;


        data.current_focus.forEach(
            item => {

                findings.innerHTML +=
                    createInternshipCard(
                        item,
                        "focus"
                    );

            }
        );

    }


    /* ======================================================
       RECOMMENDED ACTIONS / NEXT STEPS
    ====================================================== */

    const actions =
        document.getElementById(
            "recommendedActions"
        );


    actions.innerHTML = "";


    if (
        data.next_steps &&
        data.next_steps.length > 0
    ) {

        data.next_steps.forEach(
            (item, index) => {

                const action =
                    typeof item === "string"
                    ? item
                    : item.action ||
                      item.title ||
                      "";


                const reason =
                    typeof item === "string"
                    ? ""
                    : item.reason ||
                      item.description ||
                      "";


                actions.innerHTML += `

                    <div class="action">

                        <div class="action-number">
                            ${index + 1}
                        </div>


                        <div>

                            <div class="action-title">
                                ${escapeHtml(action)}
                            </div>


                            ${
                                reason
                                ? `
                                    <div class="action-reason">
                                        ${escapeHtml(reason)}
                                    </div>
                                `
                                : ""
                            }

                        </div>

                    </div>

                `;

            }
        );

    }

    else if (
        data.recommended_actions &&
        data.recommended_actions.length > 0
    ) {

        data.recommended_actions.forEach(
            item => {

                actions.innerHTML += `

                    <div class="action">

                        <div class="action-number">

                            ${escapeHtml(
                                String(
                                    item.priority
                                )
                            )}

                        </div>


                        <div>

                            <div class="action-title">

                                ${escapeHtml(
                                    item.action
                                )}

                            </div>


                            <div class="action-reason">

                                ${escapeHtml(
                                    item.reason || ""
                                )}

                            </div>

                        </div>

                    </div>

                `;

            }
        );

    }

    else {

        actions.innerHTML = `

            <div class="action-reason">
                No additional next steps available.
            </div>

        `;

    }

}


/* ==========================================================
   INTERNSHIP CARD
========================================================== */

function createInternshipCard(
    item,
    type
) {

    const id =
        "finding-" +
        Math.random()
            .toString(36)
            .substring(2);


    const title =
        typeof item === "string"
        ? item
        : item.title || "";


    const description =
        typeof item === "string"
        ? ""
        : item.description ||
          item.details ||
          item.issue ||
          "";


    const reason =
        typeof item === "string"
        ? ""
        : item.reason ||
          item.why_it_matters ||
          "";


    const sources =
        typeof item === "object"
        ? item.sources || []
        : [];


    return `

        <div class="finding">


            <div
                class="finding-header"
                onclick="toggleFinding('${id}')"
            >

                <div class="finding-main">

                    <span
                        class="finding-dot ${type}"
                    ></span>


                    <span class="finding-title">

                        ${escapeHtml(title)}

                    </span>

                </div>


                <span
                    id="${id}-arrow"
                    class="finding-arrow"
                >
                    +
                </span>

            </div>



            <div
                id="${id}"
                class="finding-body"
            >


                ${
                    description
                    ? `
                        <div class="finding-field">

                            <div class="finding-label">
                                Details
                            </div>


                            <p class="finding-text">

                                ${escapeHtml(
                                    description
                                )}

                            </p>

                        </div>
                    `
                    : ""
                }



                ${
                    reason
                    ? `
                        <div class="finding-field">

                            <div class="finding-label">
                                Context
                            </div>


                            <p class="finding-text">

                                ${escapeHtml(
                                    reason
                                )}

                            </p>

                        </div>
                    `
                    : ""
                }



                ${
                    sources.length > 0
                    ? `
                        <div class="finding-field">

                            <div class="finding-label">
                                Sources
                            </div>


                            <div class="sources">

                                ${
                                    sources
                                        .map(
                                            source => `
                                                <span class="source">

                                                    ${escapeHtml(
                                                        source
                                                    )}

                                                </span>
                                            `
                                        )
                                        .join("")
                                }

                            </div>

                        </div>
                    `
                    : ""
                }

            </div>

        </div>

    `;

}


/* ==========================================================
   EXPAND / COLLAPSE
========================================================== */

function toggleFinding(id) {

    const body =
        document.getElementById(id);


    const arrow =
        document.getElementById(
            id + "-arrow"
        );


    if (
        body.style.display === "block"
    ) {

        body.style.display =
            "none";

        arrow.innerText =
            "+";

    }

    else {

        body.style.display =
            "block";

        arrow.innerText =
            "−";

    }

}


/* ==========================================================
   HTML ESCAPE
========================================================== */

function escapeHtml(value) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value ?? "";


    return div.innerHTML;

}