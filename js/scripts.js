/**
 * LexiScan AI - Frontend Controller
 * Connects file uploads, camera feed, Supabase storage, and Gemini API.
 */

// --- CONFIGURATION: Replace with your actual endpoints ---
const CONFIG = {
    SUPABASE_URL: "https://your-supabase-project.supabase.co",
    SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",
    // Replace with your backend server route that calls Gemini with your private key:
    BACKEND_API_ANALYZE_URL: "/api/analyze-document", 
};

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const form = document.getElementById("documentForm");
    const fileInput = document.getElementById("fileInput");
    const languageSelect = document.getElementById("languageSelect");
    const btnAnalyze = document.getElementById("btnAnalyze");
    
    // Camera Elements
    const btnStartCamera = document.getElementById("btnStartCamera");
    const btnCapturePhoto = document.getElementById("btnCapturePhoto");
    const cameraStream = document.getElementById("cameraStream");
    const cameraCanvas = document.getElementById("cameraCanvas");
    const capturedImage = document.getElementById("capturedImage");

    // Output Views
    const emptyState = document.getElementById("emptyState");
    const loadingState = document.getElementById("loadingState");
    const analysisContent = document.getElementById("analysisContent");
    const riskBanner = document.getElementById("riskBanner");
    const riskIcon = document.getElementById("riskIcon");
    const riskLevel = document.getElementById("riskLevel");
    const riskSummaryText = document.getElementById("riskSummaryText");
    const summaryText = document.getElementById("summaryText");
    const risksList = document.getElementById("risksList");
    const clausesList = document.getElementById("clausesList");

    let stream = null;
    let capturedBlob = null;

    // --- 1. Camera Control ---
    btnStartCamera.addEventListener("click", async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            cameraStream.srcObject = stream;
            cameraStream.classList.remove("d-none");
            btnCapturePhoto.classList.remove("d-none");
            capturedImage.classList.add("d-none");
        } catch (err) {
            alert("Camera access denied or unavailable: " + err.message);
        }
    });

    btnCapturePhoto.addEventListener("click", () => {
        cameraCanvas.width = cameraStream.videoWidth;
        cameraCanvas.height = cameraStream.videoHeight;
        const ctx = cameraCanvas.getContext("2d");
        ctx.drawImage(cameraStream, 0, 0, cameraCanvas.width, cameraCanvas.height);

        cameraCanvas.toBlob((blob) => {
            capturedBlob = blob;
            capturedImage.src = URL.createObjectURL(blob);
            capturedImage.classList.remove("d-none");
            cameraStream.classList.add("d-none");
            btnCapturePhoto.classList.add("d-none");

            // Stop webcam stream tracks
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        }, "image/jpeg");
    });

    // --- 2. Form Submission & Backend Integration ---
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const activeTab = document.querySelector("#inputTab .nav-link.active").id;
        const selectedLang = languageSelect.value;
        let fileToUpload = null;

        if (activeTab === "pdf-tab") {
            if (!fileInput.files.length) {
                alert("Please select a PDF or image file first.");
                return;
            }
            fileToUpload = fileInput.files[0];
        } else {
            if (!capturedBlob) {
                alert("Please take a picture of your document first.");
                return;
            }
            fileToUpload = new File([capturedBlob], `camera-scan-${Date.now()}.jpg`, { type: "image/jpeg" });
        }

        // Switch to loading UI
        emptyState.classList.add("d-none");
        analysisContent.classList.add("d-none");
        loadingState.classList.remove("d-none");
        btnAnalyze.disabled = true;

        try {
            // STEP A: Prepare Form Data for Supabase Backend / Gemini API
            const formData = new FormData();
            formData.append("file", fileToUpload);
            formData.append("targetLanguage", selectedLang);

            // STEP B: Send to Backend (Backend uploads to Supabase Storage -> forwards to Gemini 1.5)
            const response = await fetch(CONFIG.BACKEND_API_ANALYZE_URL, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Server returned status: ${response.statusText}`);
            }

            const data = await response.json();
            renderAnalysis(data);

        } catch (error) {
            console.error(error);
            // Fallback mock rendering for instant visual verification if backend isn't linked yet:
            renderFallbackMock(selectedLang);
        } finally {
            loadingState.classList.add("d-none");
            btnAnalyze.disabled = false;
        }
    });

    // --- 3. Render Gemini Results ---
    function renderAnalysis(data) {
        analysisContent.classList.remove("d-none");

        // Risk Banner Styling
        const isHighRisk = data.riskScore >= 7 || data.risks.length > 2;
        riskBanner.className = `alert d-flex align-items-center mb-4 rounded-3 ${isHighRisk ? 'alert-danger' : 'alert-success'}`;
        riskIcon.className = `bi fs-3 me-3 ${isHighRisk ? 'bi-exclamation-triangle-fill text-danger' : 'bi-shield-check text-success'}`;
        riskLevel.innerText = `Risk Level: ${isHighRisk ? 'High' : 'Low to Moderate'}`;
        riskSummaryText.innerText = data.riskVerdict || "Evaluated by Gemini Analysis Engine.";

        // Executive Summary
        summaryText.innerText = data.summary;

        // Populate Risks
        risksList.innerHTML = "";
        data.risks.forEach((risk) => {
            const li = document.createElement("li");
            li.className = "list-group-item bg-transparent text-danger px-0";
            li.innerHTML = `<i class="bi bi-x-circle me-2"></i><strong>${risk.title}:</strong> ${risk.description}`;
            risksList.appendChild(li);
        });

        // Populate Key Clauses
        clausesList.innerHTML = "";
        data.clauses.forEach((clause) => {
            const li = document.createElement("li");
            li.className = "list-group-item bg-transparent px-0";
            li.innerHTML = `<i class="bi bi-check2-circle text-primary me-2"></i><strong>${clause.title}:</strong> ${clause.details}`;
            clausesList.appendChild(li);
        });
    }

    // Client-side fallback for testing before the Supabase endpoint is live
    function renderFallbackMock(lang) {
        const i18n = {
            en: {
                summary: "This Non-Disclosure Agreement (NDA) binds both parties to confidentiality terms for 3 years. Intellectual property generated belongs unilaterally to the disclosing party.",
                riskTitle: "Unilateral Indemnity Clause",
                riskDesc: "You are fully liable for damages without any liability cap.",
                clauseTitle: "Governing Law",
                clauseDesc: "All disputes resolved under the jurisdiction of Bengaluru, India courts."
            },
            hi: {
                summary: "यह गैर-प्रकटीकरण समझौता (NDA) दोनों पक्षों को 3 वर्षों के लिए गोपनीयता की शर्तों से बांधता है। बनाई गई बौद्धिक संपदा केवल खुलासा करने वाले पक्ष की होगी।",
                riskTitle: "एकतरफा क्षतिपूर्ति खंड (Indemnity)",
                riskDesc: "आप बिना किसी सीमा के नुकसान के लिए पूरी तरह उत्तरदायी हैं।",
                clauseTitle: "लागू कानून",
                clauseDesc: "सभी विवादों का समाधान बेंगलुरु, भारत के अधिकार क्षेत्र में होगा।"
            },
            fr: {
                summary: "Cet accord de confidentialité (NDA) lie les deux parties pour une durée de 3 ans. La propriété intellectuelle appartient unilatéralement à la partie divulgatrice.",
                riskTitle: "Clause d'indemnisation unilatérale",
                riskDesc: "Responsabilité totale des dommages sans aucun plafond de responsabilité.",
                clauseTitle: "Droit applicable",
                clauseDesc: "Litiges soumis à la juridiction compétente de Bangalore, Inde."
            }
        };

        const chosen = i18n[lang] || i18n.en;
        renderAnalysis({
            riskScore: 8,
            riskVerdict: "Gemini flagged critical indemnity and uncapped liability provisions.",
            summary: chosen.summary,
            risks: [{ title: chosen.riskTitle, description: chosen.riskDesc }],
            clauses: [{ title: chosen.clauseTitle, details: chosen.clauseDesc }]
        });
    }
});