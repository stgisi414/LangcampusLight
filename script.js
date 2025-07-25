// Store last message for retry functionality
let lastUserMessage = '';

// Function to retry last failed message
async function retryLastMessage() {
    if (!lastUserMessage) return;

    // Remove the error message
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(msg => msg.remove());

    // Resend the last message
    const messageInput = document.getElementById('message-input');
    messageInput.value = lastUserMessage;
    await document.getElementById('send-message').click();
    messageInput.value = '';
}

// API_KEY removed - now handled by langcamp.us backend

// Model configuration
const GEMINI_MODELS = {
    'ultra': 'gemini-2.5-flash-preview-05-20',
    'super': 'gemini-2.0-flash',
    'pro': 'gemini-2.0-flash-thinking-exp-01-21',
    'lite': 'gemini-2.0-flash-lite'
};

let currentModel = 'super'; // Default to Super (gemini-2.0-flash)

// Centralized Gemini API call function - now uses langcamp.us backend
async function callGeminiAPI(prompt, retries = 3, callType = 'unknown') {
    const startTime = Date.now();

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            // Get user's name from My Info, fallback to default if not set
            let myInfo = {};
            try {
                myInfo = JSON.parse(localStorage.getItem('myInfo') || '{}');
            } catch (parseError) {
                console.warn('Error parsing myInfo from localStorage:', parseError);
                myInfo = {};
            }

            console.log('Attempting to retrieve username from myInfo:');
            console.log(myInfo);
            const username = myInfo.name || 'practicefor_fun_user';
            console.log('Sending API request with username:', username);

            const response = await fetch('https://langcamp.us/api/exchange-admin/gemini-generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    model: currentModel, // Send the model key (e.g., 'super', 'lite')
                    callType: callType,
                    source: 'practicefor_fun',
                    username: username,
                    userInfo: username, // Send as userInfo to match admin log display
                    userAgent: navigator.userAgent,
                    requestPreview: lastUserMessage || prompt.substring(0, 200)
                })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Backend API request failed with status ${response.status}: ${response.statusText}. Body: ${errorBody}`);
            }

            const data = await response.json();

            if (!data || !data.success) {
                console.error("Backend API error:", data);
                throw new Error(data.error || "Backend API returned unsuccessful response");
            }

            let generatedText = data.text;
            if (!generatedText) {
                throw new Error("No text returned from backend API");
            }

            generatedText = generatedText.trim();

            // Remove quotes if present
            if (generatedText.startsWith('"') && generatedText.endsWith('"')) {
                generatedText = generatedText.substring(1, generatedText.length - 1);
            }

            // Backend handles logging automatically, so we don't need to call logGeminiUsage here
            console.log(`Gemini API call successful via backend (${callType})`);

            return generatedText;

        } catch (error) {
            console.error(`Gemini API backend attempt ${attempt + 1} failed:`, error);

            if (attempt === retries - 1) {
                throw error;
            }

            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
    }
}

// Function to log Gemini API usage to the admin system
async function logGeminiUsage(logData) {
  try {
    console.log('Attempting to log API usage:', {
      action: logData.action,
      model: logData.model,
      success: logData.success
    });

    // Get user's name from My Info, fallback to provided username or default
    const myInfo = JSON.parse(localStorage.getItem('myInfo') || '{}');
    console.log('Attempting to retrieve username from myInfo:');
    console.log(myInfo);
    const username = myInfo.name || logData.username || 'practicefor_fun_user';

    const response = await fetch('https://langcamp.us/api/exchange-admin/log-gemini-usage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username,
        action: logData.action,
        model: logData.model,
        inputTokens: logData.inputTokens || 0,
        outputTokens: logData.outputTokens || 0,
        requestPreview: logData.requestPreview?.substring(0, 200) || '',
        responsePreview: logData.responsePreview?.substring(0, 200) || '',
        success: logData.success !== false,
        error: logData.error || null,
        duration: logData.duration || 0,
        ipAddress: logData.ipAddress || 'unknown',
        userAgent: logData.userAgent || navigator.userAgent
      })
    });

    if (response.ok) {
      console.log('API usage logged successfully to admin system');
    } else {
      const errorText = await response.text();
      console.error('Logging failed with status:', response.status, response.statusText, errorText);
    }
  } catch (error) {
    console.error('Failed to log API usage to admin system:', error);
  }
}

// Helper function to get user IP (simplified)
function getUserIP() {
    // In a real implementation, you might want to use a service to get the actual IP
    // For now, we'll use a placeholder that indicates the source
    return 'practicefor_fun_user';
}

async function searchPartners() {
    const nativeLanguage = document.getElementById('nativeLanguage').value;
    const targetLanguage = document.getElementById('targetLanguage').value;

    // Validation: Ensure both languages are selected
    if (!nativeLanguage || !targetLanguage) {
        alert("Please select both your native language and the language you want to learn.");
        return; // Stop execution if languages are not selected
    }

    console.log(`Search triggered with Native: ${nativeLanguage}, Target: ${targetLanguage}`);
    const resultsContainer = document.getElementById('results');
    const loadingIndicator = document.getElementById('loading-indicator'); // Get loader reference

    // Show loader first (if found)
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex'; // Show loader
    } else {
        console.error("Loading indicator element with ID 'loading-indicator' not found in the HTML!");
        resultsContainer.innerHTML = '<p style="text-align:center; color: red;">Error: Loading indicator missing. Cannot search.</p>';
        return; // Stop if loader is missing
    }

    // Then clear previous results (this removes the loader)
    resultsContainer.innerHTML = '';

    // Re-append the loader to the container so it persists
    resultsContainer.appendChild(loadingIndicator);

    try {
        // Define the expected JSON structure as an example
        const exampleJson = `[
  {
    "name": "Example Partner Name", 
    "age": 28,
    "gender": "male", 
    "nativeLanguage": "${targetLanguage}", 
    "targetLanguage": "${nativeLanguage}", 
    "interests": ["hiking", "photography", "cooking"]
  }
]`;

        // Create a more formal prompt with clear instructions and the example
        const prompt = `Please generate a list of six distinct language exchange partner profiles.
The goal is to find partners for someone who speaks ${nativeLanguage} and wants to learn ${targetLanguage}.
Therefore, each generated profile should represent a person whose native language is ${targetLanguage} and who wants to learn ${nativeLanguage}.

Generate profiles for people who are a mix of students, professionals, or artists, and give them varied personalities (e.g., patient, enthusiastic, humorous, studious, down to earth).

Each profile must be a JSON object with the following fields:
- 'name' (string)
- 'age' (integer between 20 and 45)
- 'gender' (string, either 'male', 'female', or 'other')
- 'nativeLanguage' (string, must be '${targetLanguage}')
- 'targetLanguage' (string, must be '${nativeLanguage}')
- 'interests' (an array of exactly three distinct strings representing hobbies).

Ensure the interests listed for each profile are varied and distinct from the other generated profiles. Ensure the profiles are realistic and diverse in terms of persona.

Your entire response must be ONLY the JSON array, starting with [ and ending with ]. Do not include any text before or after the array, nor any Markdown formatting like \`\`\`json.

Example of the required JSON array format (containing one profile for illustration):
${exampleJson}`;

        console.log("Sending prompt:", prompt);
        const partners = await generatePartnerProfiles(prompt);
        console.log("Generated Partners Data:", partners);
        displayResults(partners); // This will hide the loader again
    } catch (error) {
        console.error('Error searching for partners:', error);
        // Ensure loader is hidden on error *before* setting error message
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        resultsContainer.innerHTML = '<p style="text-align:center; color: red;">Failed to load partners. Please try again.</p>'; // Show error message
    }
}

async function generatePartnerProfiles(prompt) {
    try {
        let generatedText = await callGeminiAPI(prompt, 3, 'partner_profile');

        // Attempt to strip markdown code fences if present
        const jsonRegex = /```json\n?(\[.*\]|\[[\s\S]*?\])\n?```/;
        const match = generatedText.match(jsonRegex);
        if (match && match[1]) {
            generatedText = match[1];
        }

        // Trim whitespace just in case
        generatedText = generatedText.trim();

        let profiles;
        try {
            profiles = JSON.parse(generatedText);
        } catch (parseError) {
            console.error("Failed to parse JSON response:", parseError);
            console.error("Raw response text:", generatedText);
            throw new Error("Failed to parse JSON response from API");
        }

        // Add avatars to the profiles using DiceBear Avataaars with strict parameters
        return profiles.map(profile => {
            let avatarParams = [];

            // --- Define styles and VALID HEX colors based on gender ---
            // Using the stricter lists again
            const maleHairStyles = [
                'ShortHairShortFlat', 'ShortHairSides', 'ShortHairTheCaesar'
            ].join(',');
            const femaleHairStyles = [
                'LongHairStraight', 'LongHairStraight2', 'LongHairCurvy'
            ].join(',');

            // Use HEX codes for colors - NO pink/bright colors for males
            const maleHairColors = ['2C1B18', '4A312C', 'A55728', 'B58143', 'F5D6A1', '606060'].join(','); // Black, Browns, Blonde, Grey
            const femaleHairColors = ['2C1B18', '4A312C', 'A55728', 'B58143', 'F5D6A1', '606060', 'E8E1E1', 'FFC0CB', 'C93305'].join(','); // Includes Platinum, Pink, Red

            // --- Define skin tone HEX codes based on language origin ---
            const asianLanguages = ['Chinese', 'Japanese', 'Korean', 'Vietnamese', 'Mongolian', 'Thai', 'Hindi', 'Arabic'];
            const europeanLanguages = ['English', 'Spanish', 'French', 'Italian', 'Portuguese', 'Russian', 'German', 'Polish'];
            let skinColor = ''; // Default: Let seed decide if language doesn't match

            if (asianLanguages.includes(profile.nativeLanguage)) {
                skinColor = 'F9D46A'; // Yellow tone hex
            } else if (europeanLanguages.includes(profile.nativeLanguage)) {
                skinColor = ['EDB98A', 'FFDBAC', 'D08B5B', 'AE5D29'].join(','); // Light/Brown tones hex mix
            }
            if (skinColor) {
                avatarParams.push(`skinColor=${skinColor}`);
            }

            // --- Apply styles based on gender ---
            if (profile.gender === 'male') {
                avatarParams.push(`topType=${maleHairStyles}`);
                avatarParams.push(`hairColor=${maleHairColors}`);
                avatarParams.push(`eyeType=Default`); // Force default eyes
                avatarParams.push(`accessoriesType=Blank`); // Force no accessories
                // Allow default facial hair based on seed
            } else if (profile.gender === 'female') {
                avatarParams.push(`topType=${femaleHairStyles}`);
                avatarParams.push(`hairColor=${femaleHairColors}`);
                avatarParams.push("facialHairType=Blank"); // Explicitly no facial hair
            }
            // 'other' or undefined gender will use API defaults based on seed

            // Add detailed logging before constructing URL
            console.log(`[Avatar Generation] DiceBear Profile: ${profile.name}, Gender: ${profile.gender}, Params:`, avatarParams);

            // Construct DiceBear Avataaars URL with query string
            const seedParam = `seed=${encodeURIComponent(profile.name)}`; // Use 'seed' not 'Seed'
            const otherParams = avatarParams.join('&'); // Combine other params like topType, facialHairType, skinColor, hairColor
            const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?${seedParam}${otherParams ? '&' + otherParams : ''}`;

            return {
                ...profile,
                avatar: avatarUrl // Assign the new DiceBear URL
            };
        });
    } catch (error) {
        console.error('Error generating profiles:', error);
        return [];
    }
}

function filterPartnersByInterest(partners, searchTerm) {
    if (!searchTerm) return partners;
    searchTerm = searchTerm.toLowerCase();
    return partners.filter(partner =>
        partner.interests.some(interest =>
            interest.toLowerCase().includes(searchTerm)
        )
    );
}

function displayResults(partners) {
    const resultsContainer = document.getElementById('results');
    const loadingIndicator = document.getElementById('loading-indicator');
    const searchTerm = document.getElementById('interestSearch').value;
    const filteredPartners = filterPartnersByInterest(partners, searchTerm);

    // Ensure loader exists before trying to manipulate it
    if (!loadingIndicator) {
        console.error("Loading indicator missing in displayResults. Cannot proceed.");
        resultsContainer.innerHTML = '<p style="text-align:center; color: red;">Internal error: Loading indicator state lost.</p>';
        return;
    }

    // Hide loader first
    loadingIndicator.style.display = 'none';

    // Clear container (this removes the loader)
    resultsContainer.innerHTML = '';

    // Add partner cards or 'no results' message
    if (!partners || partners.length === 0) {
        resultsContainer.innerHTML = '<p style="grid-column: 1 / -1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 3rem; text-align: center; color: #555;">No partners found matching your criteria.</p>';
    } else {
        partners.forEach(partner => {
            const card = document.createElement('div');
            card.className = 'partner-card';
            // Encode the partner object as a JSON string for the onclick handler
            const partnerJson = JSON.stringify(partner).replace(/'/g, "\\'"); // Escape single quotes
            card.innerHTML = `
            <img src="${partner.avatar}" alt="${partner.name}">
            <h3>${partner.name}</h3>
            <p>Speaks: ${partner.nativeLanguage}</p>
            <p>Learning: ${partner.targetLanguage}</p>
            <p>Interests: ${partner.interests.join(', ')}</p>
            <button onclick='openChat(${partnerJson})'>Chat</button> 
        `;
            resultsContainer.appendChild(card);
        });
    }

    // IMPORTANT: Re-append the (now hidden) loader so it exists for the next search
    resultsContainer.appendChild(loadingIndicator);
}

// Global variable to store the timer ID
let geminiIntroTimer = null;
// Global variable to store the current partner's name for the send logic
let currentPartnerName = null;
let currentPartner = null; // Store the full partner object
let chatHistory = []; // Array to store chat messages { sender: '...', text: '...' }
// let grammarData = {}; // Old declaration
let enableCorrections = false; // State for the corrections toggle

console.log("Grammar data embedded."); // Log to confirm it's loaded

async function openChat(partner) { // Now accepts the full partner object
    // Clean up any existing audio buttons
    removeAudioButton();

    const modal = document.getElementById('chat-modal');
    // It's good practice to check if modal exists, though your existing code doesn't always do this.
    if (!modal) {
        console.error("Chat modal element not found!");
        return;
    }
    const chatHeader = modal.querySelector('.chat-header');
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');

    // Ensure all critical elements are found before proceeding
    if (!chatHeader || !chatMessages || !messageInput) {
        console.error("One or more critical chat modal sub-elements not found.");
        // Optionally, inform the user via an alert or a message in a safe part of the UI
        return;
    }

    // Clear previous messages, history, and reset input for a fresh chat session display
    // (Resume Chat logic in checkSavedPartner will repopulate history and messages after this)
    chatMessages.innerHTML = '';
    messageInput.value = '';
    chatHistory = []; // Cleared here, then repopulated by resume logic if applicable
    currentPartner = partner;
    currentPartnerName = partner.name;

    // Populate the chat header
    chatHeader.innerHTML = `
        <img src="${partner.avatar}" alt="${partner.name}" class="chat-avatar">
        <h3>Chat with ${partner.name}</h3>
        <p>(${partner.nativeLanguage} speaker, learning ${partner.targetLanguage})</p>
    `;

    modal.style.setProperty('display', 'flex', 'important'); // Make the modal visible
    document.body.style.overflow = 'hidden'; // <<< --- ADD THIS LINE HERE ---

    // Add initial placeholder/intro message - DO NOT add to history yet
    // This will be removed if the partner sends an intro or the user types first.
    // Or, if resuming, this gets overwritten by loaded messages.
    if (document.getElementById('connecting-message')) { // Remove if it exists from a previous quick open/close
        document.getElementById('connecting-message').remove();
    }
    chatMessages.innerHTML += `<p id="connecting-message"><em>Connecting you with ${partner.name}...</em></p>`;
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Clear any existing timer before setting a new one
    if (geminiIntroTimer) {
        clearTimeout(geminiIntroTimer);
        geminiIntroTimer = null; // Important to nullify after clearing
    }

    // Set a timer to send a message from the partner if the user doesn't type
    // (This is mainly for new chats, resume chat will fill history)
    geminiIntroTimer = setTimeout(async () => {
        const connectingMsg = document.getElementById('connecting-message');
        // Only send auto-intro if no messages have been loaded/sent yet
        if (chatHistory.length === 0 && connectingMsg) {
            // ... (existing intro message generation logic) ...

            // Example of how intro message is added (ensure you have your full logic here)
            // const introMessageText = `Hi from ${partner.name}!`; // Placeholder for actual generated text
            // if (connectingMsg) connectingMsg.remove(); // Remove "Connecting..."
            // const timestamp = new Date().toISOString();
            // const partnerIntro = { sender: partner.name, text: introMessageText, timestamp };
            // chatHistory.push(partnerIntro);
            // chatMessages.innerHTML += `
            //   <p class="partner-message">
            //     <strong>${partner.name}:</strong> ${introMessageText}
            //     <span class="message-time" style="font-size: 0.8em; color: #666; margin-left: 8px;">
            //       ${new Date(timestamp).toLocaleTimeString()}
            //     </span>
            //   </p>`;
            // chatMessages.scrollTop = chatMessages.scrollHeight;
            // >>>>>>> Make sure your full partner intro logic from lines 330-377 is here
            // For brevity, I'm not pasting all of it, but it should be within this timeout.
            // The critical part for the intro message generation:
            const myInfo = JSON.parse(localStorage.getItem('myInfo') || '{}');
            const userLocalDateTime = new Date(); // Renamed from timeOfDay to avoid conflict
            const currentUserTimeOfDay = userLocalDateTime.getHours() < 12 ? 'morning' : (userLocalDateTime.getHours() < 18 ? 'afternoon' : 'evening');

            const partnerNativeLangForIntro = partner.nativeLanguage; // Use a distinct variable
            let timezoneHintForIntro = `It is currently ${currentUserTimeOfDay} for the user you are about to greet.`;
            const asianLanguagesForIntro = ['Chinese', 'Japanese', 'Korean', 'Vietnamese', 'Mongolian'];

            if (asianLanguagesForIntro.includes(partnerNativeLangForIntro)) {
                timezoneHintForIntro += ` You, ${partner.name}, are from a country in Asia where ${partnerNativeLangForIntro} is spoken. This means it's likely a very different time for you (e.g., if it's the user's morning, it might be your evening or night).`;
            } else {
                timezoneHintForIntro += ` You, ${partner.name}, are from a country where ${partnerNativeLangForIntro} is spoken. Your time of day will also be different from the user's, though the specific difference can vary.`;
            }

            const introPrompt = `You are ${partner.name}. Your native language is ${partner.nativeLanguage}, and you are roleplaying as if you live in a country where it's spoken. You're enthusiastic about learning ${partner.targetLanguage}. Your interests are: ${partner.interests.join(', ')}.

You are about to send your *very first message* to a new language partner on the Langcampus Exchange website.
${myInfo.name ? `Their name is ${myInfo.name}.` : 'They haven\'t shared their name yet.'} ${myInfo.bio ? `Their bio says: "${myInfo.bio}".` : ''} ${myInfo.hobbies?.length ? `Their hobbies include: ${myInfo.hobbies.join(', ')}.` : 'They haven\'t listed hobbies yet.'}
This user speaks ${partner.targetLanguage} (which you are learning) and want to learn your native language (${partner.nativeLanguage}).

IMPORTANT TIMEZONE CONTEXT: ${timezoneHintForIntro}

CRITICAL: You must write your entire message in ${partner.nativeLanguage}. This is a language exchange, so you should communicate in your native language (${partner.nativeLanguage}) to help the user practice.

Your task is to create a friendly, natural, and culturally appropriate first greeting message (keep it to 2-4 sentences) in ${partner.nativeLanguage}.
Your message should:
1.  Start with a greeting in ${partner.nativeLanguage}. You should acknowledge the user's time of day appropriately in your language.
2.  Briefly introduce yourself (as ${partner.name}) in ${partner.nativeLanguage}.
3.  Express genuine enthusiasm for the language exchange opportunity in ${partner.nativeLanguage}.
4.  It's good if you can naturally allude to *your own* current time of day or a general activity appropriate for it, from your perspective as someone in your country. This makes the interaction feel more real.
5.  If you share any interests (${partner.interests.join(', ')}) with the user's listed hobbies (${myInfo.hobbies?.join(', ')}), briefly and naturally mention one if it fits.
6.  End with an engaging open-ended question in ${partner.nativeLanguage} to encourage them to reply and start the conversation.

Style: Conversational, warm, welcoming, and natural for a native ${partner.nativeLanguage} speaker. Avoid using emojis or excessive punctuation.
Your response must be ONLY the chat message text itself in ${partner.nativeLanguage}, without any prefix like your name.`;

            let introMessageText;
            try {
                introMessageText = await callGeminiAPI(introPrompt, 3, 'intro_message');
            } catch (error) {
                console.error('Error generating custom intro:', error);
                introMessageText = `Hi! I'm ${partner.name}. It's nice to meet you! I see you're learning ${partner.nativeLanguage}. How's it going so far?`; // Fallback
            }

            if (connectingMsg) connectingMsg.remove(); // Remove "Connecting..."

            const timestamp = new Date().toISOString();
            const partnerIntro = { sender: partner.name, text: introMessageText, timestamp };
            chatHistory.push(partnerIntro); // Add to history
            chatMessages.innerHTML += `
              <p class="partner-message">
                <strong>${partner.name}:</strong> ${introMessageText}
                <span class="message-time" style="font-size: 0.8em; color: #666; margin-left: 8px;">
                  ${new Date(timestamp).toLocaleTimeString()}
                </span>
              </p>`;
            chatMessages.scrollTop = chatMessages.scrollHeight;

        } // End of if (chatHistory.length === 0 && connectingMsg)
        geminiIntroTimer = null;
    }, 5000);

    const closeBtn = modal.querySelector('.close');
    if (closeBtn) { // Ensure closeBtn exists
        closeBtn.onclick = () => {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // UNLOCK body scroll
            if (geminiIntroTimer) {
                clearTimeout(geminiIntroTimer);
                geminiIntroTimer = null;
            }
        };
    }
    // The consolidated window.addEventListener('click', ...) handles outside clicks
}

// Function to load preferences from localStorage
function loadPreferences() {
    console.log("Attempting to load preferences from localStorage...");
    const savedNativeLang = localStorage.getItem("selectedNativeLanguage");
    const savedTargetLang = localStorage.getItem("selectedTargetLanguage");
    console.log(`Loaded nativeLanguage from localStorage: ${savedNativeLang}`);
    console.log(`Loaded targetLanguage from localStorage: ${savedTargetLang}`);

    const nativeSelect = document.getElementById('nativeLanguage');
    const targetSelect = document.getElementById('targetLanguage');

    if (!nativeSelect || !targetSelect) {
        console.error("Dropdown elements not found!");
        return;
    }

    if (savedNativeLang) {
        console.log("Setting nativeLanguage dropdown to:", savedNativeLang);
        nativeSelect.value = savedNativeLang;
    } else {
        console.log("No nativeLanguage preference found in localStorage.");
    }
    if (savedTargetLang) {
        console.log("Setting targetLanguage dropdown to:", savedTargetLang);
        targetSelect.value = savedTargetLang;
    } else {
        console.log("No targetLanguage preference found in localStorage.");
    }
}

function loadModelPreference() {
    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel && GEMINI_MODELS[savedModel]) {
        currentModel = savedModel;
        console.log(`Loaded model preference: ${currentModel} (${GEMINI_MODELS[currentModel]})`);

        // Update UI to reflect saved model
        document.querySelectorAll('.model-button').forEach(btn => btn.classList.remove('active'));
        const savedButton = document.querySelector(`[data-model="${savedModel}"]`);
        if (savedButton) {
            savedButton.classList.add('active');
        }
    } else {
        console.log("No model preference found, using default: super");
        // Set default active button to "super"
        document.querySelectorAll('.model-button').forEach(btn => btn.classList.remove('active'));
        const defaultButton = document.querySelector(`[data-model="super"]`);
        if (defaultButton) {
            defaultButton.classList.add('active');
        }
    }
}

// --- Language Level Assessment ---
const ASSESSMENT_INTERVAL = 4; // Assess every 4 messages
const ASSESSMENT_COOLDOWN = 60000; // Minimum 60 seconds between assessments
let messageCountForAssessment = 0;
let lastAssessmentTime = 0;

async function assessLanguageLevel(messages) {
    if (!messages || messages.length === 0) {
        console.warn("No messages to assess.");
        return;
    }

    const assessmentPrompt = `Analyze the following chat messages from a language learner and assess their proficiency level in the target language (1-5 stars, 1 being beginner, 5 being advanced):\n\n${messages.map(msg => `${msg.sender}: ${msg.text}`).join('\n')}\n\nProvide ONLY a single number representing the star rating (e.g., 3).`;

    try {
        const assessmentResult = await callGeminiAPI(assessmentPrompt, 3, 'language_assessment');
        const rating = parseInt(assessmentResult);

        if (isNaN(rating) || rating < 1 || rating > 5) {
            console.warn("Invalid assessment rating received:", assessmentResult);
            return;
        }

        // Store rating in local storage (secret from user)
        localStorage.setItem('languageLevelRating', rating.toString());
        lastAssessmentTime = Date.now();
        console.log(`Language level assessed: ${rating} stars`);

    } catch (error) {
        console.error("Error assessing language level:", error);
    }
}
// Event Listeners
document.getElementById('searchButton').addEventListener('click', searchPartners);

document.getElementById('send-message').addEventListener('click', async () => { // Make async
    const messageInput = document.getElementById('message-input');
    const messageText = messageInput.value.trim();
    const chatMessages = document.getElementById('chat-messages');

    if (messageText && currentPartner) { // Ensure partner context is available
        lastUserMessage = messageText; // Store message for retry functionality
        // Clear the Gemini intro timer if the user sends a message first
        if (geminiIntroTimer) {
            clearTimeout(geminiIntroTimer);
            geminiIntroTimer = null;
        }

        // Remove the initial "Connecting..." message if it's still there
        const connectingMessage = document.getElementById('connecting-message');
        if (connectingMessage) {
            connectingMessage.remove();
        }

        // Add user's message with timestamp to UI and history
        const timestamp = new Date().toISOString();
        const userMessage = { sender: 'You', text: messageText, timestamp };
        chatHistory.push(userMessage);
        chatMessages.innerHTML += `
              <p class="user-message">
                <strong>You:</strong> ${messageText}
                <span class="message-time" style="font-size: 0.8em; color: #fff; margin-left: 8px;">
                  ${new Date(timestamp).toLocaleTimeString()}
                </span>
              </p>`;
        messageInput.value = ''; // Clear input field
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll down

        // Increment message count and check for assessment
        messageCountForAssessment++;
        const timeSinceLastAssessment = Date.now() - lastAssessmentTime;

        if (messageCountForAssessment % ASSESSMENT_INTERVAL === 0 &&
            timeSinceLastAssessment > ASSESSMENT_COOLDOWN) {
            // Get last 40 messages or all if less than 40, in multiples of 4
            const maxMessages = Math.min(40, chatHistory.length);
            const messagesToAnalyze = Math.floor(maxMessages / 4) * 4;
            const recentMessages = chatHistory.slice(-messagesToAnalyze);

            // Perform assessment in background
            assessLanguageLevel(recentMessages);
        }

        // Add a thinking indicator (optional)
        const thinkingIndicator = document.createElement('p');
        thinkingIndicator.id = 'thinking-indicator';
        thinkingIndicator.innerHTML = `<em>${currentPartnerName} is typing...</em>`;
        chatMessages.appendChild(thinkingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            // Get response from Gemini
            const partnerResponseText = await getGeminiChatResponse(currentPartner, chatHistory);

            // Remove thinking indicator
            const thinkingIndicatorToRemove = document.getElementById('thinking-indicator');
            if (thinkingIndicatorToRemove) {
                thinkingIndicatorToRemove.remove();
            }

            // Add partner's response to UI and history
            if (partnerResponseText) {
                const timestamp = new Date().toISOString();
                const partnerResponse = { sender: currentPartnerName, text: partnerResponseText, timestamp };
                chatHistory.push(partnerResponse);
                chatMessages.innerHTML += `
                  <p class="partner-message">
                    <strong>${currentPartnerName}:</strong> ${partnerResponseText}
                    <span class="message-time" style="font-size: 0.8em; color: #666; margin-left: 8px;">
                      ${new Date(timestamp).toLocaleTimeString()}
                    </span>
                  </p>`;
            } else {
                chatMessages.innerHTML += `<p><em>Sorry, ${currentPartnerName} couldn't respond right now.</em></p>`;
            }
        } catch (error) {
            console.error("Error getting Gemini response:", error);
            // Remove thinking indicator on error
            const thinkingIndicatorToRemove = document.getElementById('thinking-indicator');
            if (thinkingIndicatorToRemove) {
                thinkingIndicatorToRemove.remove();
            }
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.innerHTML = `
                <p><em>Error getting response.</em></p>
                <button onclick="retryLastMessage()" class="chat-button small-button" style="margin-top: 8px;">Retry</button>
            `;
            chatMessages.appendChild(errorDiv);
        } finally {
            chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll down after response/error
        }
    }
});

// Add event listener for Enter key on message input
document.getElementById('message-input')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.keyCode === 13) {
        event.preventDefault();
        document.getElementById('send-message')?.click();
    }
});

// Text selection handler - Removed redundant code

// --- Teach Me Modal Logic ---
const teachMeModal = document.getElementById('teach-me-modal');
const teachMeButton = document.getElementById('teach-me-button');
const teachMeCloseBtn = teachMeModal.querySelector('.teach-me-close');
const grammarTopicList = document.getElementById('grammar-topic-list');
const vocabularyTopicList = document.getElementById('vocabulary-topic-list');

//Reloading lists
function reloadGrammarTopicsList() {
    if (!currentPartner || !currentPartner.nativeLanguage) {
        console.error("Cannot reload grammar topics: Partner context is missing.");
        if (grammarTopicList) {
            grammarTopicList.innerHTML = '<p style="color: red;">Error: Partner language not set. Please close and reopen "Teach Me".</p>';
        }
        return;
    }
    const targetLang = currentPartner.nativeLanguage;

    if (!grammarTopicList) return;
    grammarTopicList.innerHTML = ''; // Clear current content (explanation/quiz)

    if (grammarData && grammarData[targetLang]) {
        const topics = grammarData[targetLang];
        if (topics && topics.length > 0) {
            topics.sort((a, b) => a.level - b.level);
            topics.forEach(topic => {
                const button = document.createElement('button');
                button.dataset.title = topic.title;
                button.innerHTML = `${topic.title} <span style="font-size: 0.8em; color: #777; margin-left: 10px; background-color: #eee; padding: 2px 6px; border-radius: 3px;">Level ${topic.level}</span>`;
                // The existing event listener on grammarTopicList (added via event delegation)
                // will handle clicks on these dynamically created buttons.
                grammarTopicList.appendChild(button);
            });
        } else {
            grammarTopicList.innerHTML = `<p>No grammar topics available for ${targetLang} yet.</p>`;
        }
    } else {
        grammarTopicList.innerHTML = `<p>Grammar data for ${targetLang} not found.</p>`;
    }
    quizActive = false; // Reset quiz state
    currentQuiz = {};
}

function reloadVocabularyTopicsList() {
    if (!vocabularyTopicList) return;
    vocabularyTopicList.innerHTML = ''; // Clear current content (explanation/quiz)

    if (!currentPartner || !currentPartner.nativeLanguage) {
        console.error("Cannot reload vocabulary topics: Partner context is missing.");
        vocabularyTopicList.innerHTML = '<p style="color: red;">Error: Partner language not set. Please close and reopen "Teach Me".</p>';
        return;
    }
    const targetLangForVocab = currentPartner.nativeLanguage;

    if (vocabData && vocabData.length > 0) {
        vocabData.sort((a, b) => a.level - b.level);
        vocabData.forEach(topic => {
            const button = document.createElement('button');
            button.dataset.title = topic.title;
            // Apply styles consistent with initial populationbutton.style.display= 'block';
            button.style.width = '100%';
            button.style.padding = '0.8rem';
            button.style.marginBottom = '0.5rem';
            button.style.textAlign = 'left';
            button.style.backgroundColor = '#f9f9f9';
            button.style.border = '1px solid #eee';
            button.style.cursor = 'pointer';
            button.style.borderRadius = '4px';
            button.style.transition = 'background-color 0.2s';
            button.style.color = '#333';
            button.innerHTML = `${topic.title} <span style="font-size: 0.8em; color: #777; margin-left: 10px; background-color: #eee; padding: 2px 6px; border-radius: 3px;">Level ${topic.level}</span>`;

            button.onclick = () => loadVocabularyContent(topic, targetLangForVocab);

            button.onmouseover = () => button.style.backgroundColor = '#e9e9e9';
            button.onmouseout = () => button.style.backgroundColor = '#f9f9f9';

            vocabularyTopicList.appendChild(button);
        });
    } else {
        vocabularyTopicList.innerHTML = `<p>No vocabulary topics available yet.</p>`;
    }
    quizActive = false; // Reset quiz state
    currentQuiz = {};
}

// Tab switching functionality
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(`${tabId}-section`).classList.add('active');
    });
});

teachMeButton.addEventListener('click', () => {
    if (!currentPartner) {
        console.error("Partner not available.");
        return;
    }

    const targetLang = currentPartner.nativeLanguage; // User is learning partner's native language

    // Load Grammar Topics
    if (grammarData && grammarData[targetLang]) {
        const topics = grammarData[targetLang];
        grammarTopicList.innerHTML = ''; // Clear previous list

        if (topics && topics.length > 0) {
            topics.sort((a, b) => a.level - b.level); // Sort by level
            topics.forEach(topic => {
                const button = document.createElement('button');
                button.dataset.title = topic.title;
                button.innerHTML = `${topic.title} <span>Level ${topic.level}</span>`;
                grammarTopicList.appendChild(button);
            });
        } else {
            grammarTopicList.innerHTML = `<p>No grammar topics available for ${targetLang} yet.</p>`;
        }
    }

    // Load Vocabulary Topics
    if (vocabData) {
        vocabularyTopicList.innerHTML = ''; // Clear previous list
        vocabData.sort((a, b) => a.level - b.level); // Sort by level

        vocabData.forEach(topic => {
            const button = document.createElement('button');
            button.dataset.title = topic.title;
            button.dataset.type = 'vocabulary';
            button.style.display = 'block';
            button.style.width = '100%';
            button.style.padding = '0.8rem';
            button.style.marginBottom = '0.5rem';
            button.style.textAlign = 'left';
            button.style.backgroundColor = '#f9f9f9';
            button.style.border = '1px solid #eee';
            button.style.cursor = 'pointer';
            button.style.borderRadius = '4px';
            button.style.transition = 'background-color 0.2s';
            button.style.color = '#333';
            button.innerHTML = `${topic.title} <span style="font-size: 0.8em; color: #777; margin-left: 10px; background-color = #eee; padding: 2px 6px; border-radius: 3px;">Level ${topic.level}</span>`;
            button.onclick = () => loadVocabularyContent(topic, targetLang);
            button.onmouseover = () => button.style.backgroundColor = '#e9e9e9';
            button.onmouseout = () => button.style.backgroundColor = '#f9f9f9';
            vocabularyTopicList.appendChild(button);
        });
    }

    teachMeModal.style.setProperty('display', 'flex', 'important');
});

async function loadVocabularyContent(topic, targetLang) {
    console.log('Starting loadVocabularyContent:', { topic, targetLang });
    const vocabTopicList = document.getElementById('vocabulary-topic-list');
    if (!vocabTopicList) {
        console.error('Vocabulary topic list element not found');
        return;
    }
    vocabTopicList.innerHTML = `
        <h2>${topic.title}</h2>
        <div id="vocabulary-content">
            <p>Loading vocabulary content...</p>
        </div>
    `;
    const container = document.getElementById('vocabulary-content');
    if (!container) {
        console.error('Vocabulary content container not found');
        return;
    }

    try {
        // Get the user's native language for explanations
        const userNativeLanguage = currentPartner ? currentPartner.targetLanguage : 'English';

        const prompt = `You are a ${targetLang} language teacher creating a vocabulary study guide for a student whose native language is ${userNativeLanguage}.

Create a comprehensive vocabulary study guide for "${topic.title}" in ${targetLang}.

IMPORTANT: Write all explanations, definitions, and instructions in ${userNativeLanguage} so the student can understand clearly. Use ${targetLang} only for the vocabulary words, phrases, and example sentences.

Include:
1. Key vocabulary words and phrases related to ${topic.title} (in ${targetLang}) with definitions in ${userNativeLanguage}
2. Example sentences in ${targetLang} with ${userNativeLanguage} translations
3. Common expressions or idioms related to this topic (in ${targetLang}) with explanations in ${userNativeLanguage}
4. Cultural notes (explained in ${userNativeLanguage}) if relevant
5. Usage tips and memory aids (in ${userNativeLanguage})

Format the response in Markdown with clear sections and examples.`;

        const content = await callGeminiAPI(prompt, 3, 'vocabulary_content');

        // Convert markdown to HTML and display
        container.innerHTML = `
               ${marked.parse(content)}
               <div class="topic-actions" style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                   <button class="chat-button" onclick="startVocabularyQuiz('${topic.title.replace(/'/g, "\\'")}', '${targetLang.replace(/'/g, "\\'")}')">Quiz Me</button>
                   <button class="chat-button secondary-button" onclick="reloadVocabularyTopicsList()">Return to Topics</button>
               </div>
           `;

    } catch (error) {
        console.error('Error loading vocabulary content:', error);
        container.innerHTML = `
            <p style="color: red;">Failed to load vocabulary content. Please try again.</p>
            <button onclick="loadVocabularyContent('${topic.title}', '${targetLang}')" class="chat-button">
                Retry
            </button>
        `;
    }
}

async function startVocabularyQuiz(topicTitle, language) {
    console.log('Starting vocabulary quiz:', { topicTitle, language });
    currentTopicTitle = topicTitle;
    const container = document.getElementById('vocabulary-content');
    if (!container) {
        console.error('Quiz container not found');
        return;
    }
    container.innerHTML = '<p>Loading quiz...</p>';

    quizActive = true;
    currentQuiz = {
        questions: [],
        currentQuestion: 0,
        score: 0,
        total: 16
    };

    // Get the quiz taker's native language from currentPartner
    const quizTakerNativeLanguage = currentPartner ? currentPartner.targetLanguage : 'English';

    const quizPrompt = `Create a multiple-choice vocabulary quiz (16 questions) about "${topicTitle}" in ${language}. 

IMPORTANT CONTEXT: The quiz taker's native language is ${quizTakerNativeLanguage}. Please create the quiz entirely IN ${quizTakerNativeLanguage} so they can understand the questions and answer options clearly.

- Write all questions in ${quizTakerNativeLanguage}
- Write all answer choices in ${quizTakerNativeLanguage}
- Test their knowledge of ${language} vocabulary through ${quizTakerNativeLanguage} explanations
- When showing ${language} words, always provide ${quizTakerNativeLanguage} context or translations

Questions should test vocabulary understanding through:
1. Word definitions
2. Usage in context
3. Synonyms/antonyms
4. Appropriate word choice

Format as valid JSON with this structure:
[
  {
    "question": "What is the meaning of [word] in ${language}?",
    "options": ["definition1", "definition2", "definition3", "definition4"],
    "correctIndex": 0
  }
]

Each question must have exactly 4 options. Do not include backticks or markdown formatting.`;

    try {
        let quizText = await callGeminiAPI(quizPrompt, 3, 'vocabulary_quiz');

        try {
            // Clean the response text by removing markdown code fences and any extra whitespace
            let cleanText = quizText.replace(/```json\s*|\s*```/g, '').trim();

            // Ensure it starts with [ and ends with ]
            if (!cleanText.startsWith('[') || !cleanText.endsWith(']')) {
                throw new Error('Invalid quiz format: must be a JSON array');
            }

            // Parse the cleaned JSON
            const questions = JSON.parse(cleanText);

            // Validate the structure
            if (!Array.isArray(questions) || questions.length === 0) {
                throw new Error('Quiz must be a non-empty array');
            }

            // Validate each question
            questions.forEach((q, index) => {
                if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 ||
                    typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
                    throw new Error(`Invalid question format at index ${index}`);
                }
            });

            currentQuiz = {
                questions: questions,
                currentQuestion: 0,
                score: 0,
                total: questions.length,
                type: 'vocabulary', // Add quiz type
                containerId: 'vocabulary-content', // Set specific container ID for vocabulary
                topicTitle: topicTitle, // Store for "Start Over"
                language: language      // Store for "Start Over"
            };

            showNextQuestion();
        } catch (parseError) {
            console.error('Quiz parsing failed:', parseError);
            container.innerHTML = `
                <div style="text-align: center;">
                    <p>Failed to generate vocabulary quiz.</p>
                    <button onclick="startVocabularyQuiz('${topicTitle}', '${language}')" class="chat-button">
                        Try Again
                    </button>
                </div>`;
            quizActive = false;
        }
    } catch (error) {
        console.error('Quiz generation failed:', error);
        container.innerHTML = `
            <div style="text-align: center;">
                <p>Failed to generate vocabulary quiz.</p>
                <button onclick="startVocabularyQuiz('${topicTitle}', '${language}')" class="chat-button">
                    Try Again
                </button>
            </div>`;
        quizActive = false;
    }
}

teachMeCloseBtn.onclick = () => {
    teachMeModal.style.display = 'none';
};

// Event delegation for topic selection
grammarTopicList.addEventListener('click', async (event) => {
    const button = event.target.closest('button');

    // Only proceed if the clicked button is a grammar topic selection button
    // (i.e., it's not a quiz answer button and has a 'data-title' attribute).
    if (button && !button.classList.contains('quiz-choice') && button.dataset.title) {
        // If a quiz was active, clicking a new topic implies abandoning it.
        if (quizActive) {
            console.log("A new grammar topic was selected while a quiz was active. Resetting quiz state.");
            quizActive = false;
            currentQuiz = {}; // Reset any ongoing quiz
        }

        const topicTitle = button.dataset.title;
        const explanationContainer = document.getElementById('grammar-topic-list'); // This is the same as grammarTopicList

        // Show loading state for the explanation
        explanationContainer.innerHTML = '<p>Loading explanation...</p>';

        try {
            // Ensure currentPartner is available
            if (!currentPartner || !currentPartner.nativeLanguage) {
                explanationContainer.innerHTML = '<p style="color: red;">Cannot load explanation: Partner context is missing.</p>';
                return;
            }
            const targetLang = currentPartner.nativeLanguage;

            // Determine the level of the topic
            let level = 'unknown';
            if (grammarData && grammarData[targetLang]) {
                const topicData = grammarData[targetLang].find(topic => topic.title === topicTitle);
                if (topicData) {
                    level = topicData.level;
                }
            }

            await getGrammarExplanation(topicTitle, targetLang, level);
        } catch (error) {
            console.error("Error processing grammar topic selection:", error);
            explanationContainer.innerHTML = `<p style="color: red;">Failed to load explanation for "${topicTitle}". Please try again.</p>`;
        }
    }
    // If it's a .quiz-choice button, its own inline onclick handler will manage it.
    // No action is needed here for .quiz-choice buttons.
});

// Close Teach Me modal if clicked outside
window.addEventListener('click', (event) => {
    if (event.target === teachMeModal) {
        teachMeModal.style.display = 'none';
    }
    // Keep existing logic for closing the main chat modal
    const chatModal = document.getElementById('chat-modal');
    if (event.target === chatModal) {
        chatModal.style.display = 'none';
        if (geminiIntroTimer) {
            clearTimeout(geminiIntroTimer);
            geminiIntroTimer = null;
        }
    }
});

// --- Corrections Toggle Logic ---
document.getElementById('corrections-toggle').addEventListener('change', (event) => {
    enableCorrections = event.target.checked;
    console.log("Corrections enabled:", enableCorrections);
});

// --- Update API Call Functions ---
// New function to get grammar explanation
let quizActive = false;
let currentQuiz = {};

let currentTopicTitle = ''; // Add this at the top of your script with other global variables

async function startQuiz(topicTitle, language, level = 'unknown') {
    // Store topic title globally when quiz starts
    currentTopicTitle = topicTitle;

    // Validate inputs
    if (!topicTitle || !language) {
        console.error('Quiz initialization failed: Missing topic or language');
        return;
    }

    const explanationContainer = document.getElementById('grammar-topic-list');
    if (!explanationContainer) {
        console.error('Quiz container not found');
        return;
    }

    // Log values for debugging
    console.log('Starting quiz with:', {
        topicTitle,
        language,
        level,
        container: explanationContainer
    });

    // Initialize quiz state
    quizActive = true;
    currentQuiz = {
        questions: [],
        currentQuestion: 0,
        score: 0,
        total: 16
    };

    // Ensure level is valid
    if (!level || level === 'unknown') {
        if (grammarData[language]) {
            const topic = grammarData[language].find(t => t.title === topicTitle);
            level = topic ? topic.level : 1;
        } else {
            level = 1; // Default to level 1 if no data found
        }
    }

    // Set a clear loading state
    explanationContainer.innerHTML = `
        <p>Loading quiz for "${topicTitle}"...</p>
        <p>Language: ${language}, Level: ${level}</p>
    `;

    // Find topic level from grammar data if not provided
    if (!level || level === 'unknown') {
        level = grammarData[language]?.find(topic => topic.title === topicTitle)?.level || 1;
    }

    // Get the quiz taker's native language from currentPartner
    const quizTakerNativeLanguage = currentPartner ? currentPartner.targetLanguage : 'English';

    const quizPrompt = `Create a multiple-choice quiz (16 questions) about "${topicTitle}" in ${language} at level ${level}. 

IMPORTANT CONTEXT: The quiz taker's native language is ${quizTakerNativeLanguage}. Please create the quiz entirely IN ${quizTakerNativeLanguage} so they can understand the questions and answer options clearly. 

- Write all questions in ${quizTakerNativeLanguage}
- Write all answer choices in ${quizTakerNativeLanguage} 
- Only include ${language} text when showing specific examples that need to be identified or analyzed
- Test their knowledge of ${language} grammar concepts through ${quizTakerNativeLanguage} explanations

Your response must be valid JSON structured like this example:

    [
      {
        "question": "What is the capital of France?",
        "options": ["Rome", "London", "Paris", "Berlin"],
        "correctIndex": 2
      },
      {
        "question": "Which planet is known as the Red Planet?",
        "options": ["Earth", "Mars", "Jupiter", "Venus"],
        "correctIndex": 1
      },
      // Additional questions...
    ]

    Each quiz question in your JSON should follow this structure. Do not include any markdown formatting or backticks.

    Make sure to generate varied and challenging questions suitable for the specified level. Do not always use the same question structure or options. Randomize the order the content appears in the questions making it not the same order as you would typically learn it. In all just make sure multiple answers cannot be correct and the answers must be completely separate from the question example.`;

    callGeminiAPI(quizPrompt, 3, 'grammar_quiz')
        .then(quizText => {
            console.log("Quiz API response:");
            console.log(quizText);
            quizText = quizText.replace(/```json\s*|\s*```/g, '').trim();

            if (!quizText.startsWith('[')) {
                throw new Error('Invalid quiz format received');
            }

            try {
                // Clean and validate the response text
                let cleanText = quizText.replace(/```json\s*|\s*code\s*|\s*```/g, '').trim();

                // Ensure it starts with [ and ends with ]
                if (!cleanText.startsWith('[') || !cleanText.endsWith(']')) {
                    throw new Error('Invalid quiz format: must be a JSON array');
                }

                // Parse the JSON
                const questions = JSON.parse(cleanText);

                // Validate the structure
                if (!Array.isArray(questions) || questions.length === 0) {
                    throw new Error('Quiz must be a non-empty array');
                }

                // Validate each question
                questions.forEach((q, index) => {
                    if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 ||
                        typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
                        throw new Error(`Invalid question format at index ${index}`);
                    }
                });

                // Inside the .then(data => { try { ... const questions = JSON.parse(cleanText); ... } }) block
                currentQuiz = {
                    questions: questions,
                    currentQuestion: 0,
                    score: 0,
                    total: questions.length,
                    type: 'grammar', // Add quiz type
                    containerId: explanationContainer.id, // Store the correct container ID (e.g., 'grammar-topic-list')
                    topicTitle: topicTitle, // Store for "Start Over" functionality
                    language: language,     // Store for "Start Over"
                    level: level            // Store for "Start Over"
                };
                showNextQuestion(); // No longer needs container as argument
            } catch (parseError) {
                console.error('Quiz parsing failed:', parseError);
                explanationContainer.innerHTML = `
                    <div style="text-align: center;">
                        <p>Failed to generate quiz.</p>
                        <button onclick="startQuiz('${topicTitle}', '${language}', ${level})" class="chat-button" style="margin-top: 10px;">
                            Try Again
                        </button>
                    </div>`;
                quizActive = false;
            }
        })
        .catch(error => {
            console.error('Quiz generation failed:', error);
            explanationContainer.innerHTML = `
                <div style="text-align: center;">
                    <p>Failed to generate quiz.</p>
                    <button onclick="startQuiz('${topicTitle}', '${language}', ${level})" class="chat-button" style="margin-top: 10px;">
                        Try Again
                    </button>
                </div>`;
            quizActive = false;
        });
}

function showNextQuestion() {
    // Ensure currentQuiz and containerId are properly set
    if (!currentQuiz || !currentQuiz.containerId) {
        console.error("Quiz context or containerId not set in currentQuiz.");
        // Attempt to use a fallback or display an error in a default location
        const fallbackContainer = document.getElementById('grammar-topic-list') || document.getElementById('vocabulary-content');
        if (fallbackContainer) {
            fallbackContainer.innerHTML = "<p style='color:red;'>Error: Quiz display container not found. Please select a topic again.</p>";
        }
        return;
    }
    const container = document.getElementById(currentQuiz.containerId);
    if (!container) {
        console.error(`Container with ID '${currentQuiz.containerId}' not found.`);
        // Display error in a more general modal area if possible
        const modalContent = document.querySelector('#teach-me-modal .modal-content');
        if (modalContent) {
            modalContent.innerHTML = "<p style='color:red;'>Critical Error: Quiz container missing. Please close and reopen.</p>";
        }
        return;
    }

    if (!currentQuiz.questions) {
        console.error('Quiz questions property missing');
        endQuiz('Quiz questions not properly initialized', container);
        return;
    }

    if (!Array.isArray(currentQuiz.questions)) {
        console.error('Quiz questions must be an array');
        endQuiz('Quiz questions format invalid', container);
        return;
    }

    if (currentQuiz.questions.length === 0) {
        console.error('Quiz questions array is empty');
        endQuiz('No quiz questions available', container);
        return;
    }

    if (typeof currentQuiz.currentQuestion !== 'number' || typeof currentQuiz.total !== 'number') {
        console.error('Invalid quiz progress state');
        endQuiz('Quiz progress tracking error', container);
        return;
    }

    if (currentQuiz.currentQuestion >= currentQuiz.total) {
        const percentage = Math.round((currentQuiz.score / currentQuiz.total) * 100);
        let grade = '';
        if (percentage >= 90) grade = 'Excellent! 🌟';
        else if (percentage >= 80) grade = 'Great job! 👏';
        else if (percentage >= 70) grade = 'Good work! 👍';
        else if (percentage >= 60) grade = 'Keep practicing! 💪';
        else grade = 'More practice needed! 📚';

        endQuiz(`Quiz complete!\nYour score: ${currentQuiz.score}/${currentQuiz.total} (${percentage}%)\n${grade}`, container);
        return;
    }

    const question = currentQuiz.questions[currentQuiz.currentQuestion];
    if (!question || typeof question !== 'object' || !Array.isArray(question.options) || question.options.length !== 4 || typeof question.correctIndex !== 'number') {
        console.error('Invalid question format:', question);
        endQuiz('Quiz error: Invalid question format', container);
        return;
    }

    const letters = ['A', 'B', 'C', 'D'];
    const correctIndex = typeof question.correctIndex === 'number' ? question.correctIndex : 0;

    container.innerHTML = `
        <div class="quiz-question">
            <strong>Question ${currentQuiz.currentQuestion + 1}/${currentQuiz.questions.length}:</strong>
            <p>${question.question}</p>
            <div class="quiz-options">
                ${question.options.map((option, i) => `
                    <button class="quiz-choice" onclick="handleAnswer(${i}, ${correctIndex})">
                        ${letters[i]}) ${option}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function handleAnswer(selected, correct) {
    if (!currentQuiz || !currentQuiz.questions || !currentQuiz.containerId) {
        console.error("Quiz context or containerId not set in handleAnswer.");
        return; // Exit if critical information is missing
    }
    const container = document.getElementById(currentQuiz.containerId);
    if (!container) {
        console.error(`Container with ID '${currentQuiz.containerId}' not found in handleAnswer.`);
        return; // Exit if container is not found
    }

    const buttons = container.querySelectorAll('.quiz-choice');
    if (!buttons.length) return;

    // Disable all buttons
    buttons.forEach(button => button.disabled = true);

    // Store user's answer and update score if correct
    currentQuiz.questions[currentQuiz.currentQuestion].userAnswer = selected;
    if (selected === correct) currentQuiz.score++;

    // Show result
    buttons.forEach((button, index) => {
        if (index === correct) {
            button.style.backgroundColor = '#4CAF50';
            button.style.color = 'white';
        } else if (index === selected && selected !== correct) {
            button.style.backgroundColor = '#f44336';
            button.style.color = 'white';
        }
        button.style.opacity = '0.7';
    });

    // Add feedback message
    const resultDiv = document.createElement('div');
    resultDiv.className = 'quiz-result';
    resultDiv.innerHTML = `
        <p style="color: ${selected === correct ? '#4CAF50' : '#f44336'}">
            <strong>${selected === correct ? '✓ Correct!' : '✗ Incorrect'}</strong><br>
            ${selected !== correct ? `The correct answer was: ${buttons[correct].textContent}` : ''}
        </p>
    `;
    container.appendChild(resultDiv);

    // Move to next question after delay
    currentQuiz.currentQuestion++;
    //setTimeout(() => showNextQuestion(container), 2000);
    setTimeout(() => showNextQuestion(), 2000); // New, container argument no longer needed

}

function endQuiz(message, container) {
    quizActive = false;
    // Ensure currentQuiz and its properties are valid before proceeding
    const score = (currentQuiz && typeof currentQuiz.score === 'number') ? currentQuiz.score : 0;
    const total = (currentQuiz && typeof currentQuiz.total === 'number') ? currentQuiz.total : 0;
    const percentage = total ? Math.round((score / total) * 100) : 0;

    let grade = '';
    if (percentage >= 90) grade = 'Excellent! 🌟';
    else if (percentage >= 80) grade = 'Great job! 👏';
    else if (percentage >= 70) grade = 'Good work! 👍';
    else if (percentage >= 60) grade = 'Keep practicing! 💪';
    else grade = 'More practice needed! 📚';

    const incorrectQuestions = (currentQuiz && Array.isArray(currentQuiz.questions))
        ? currentQuiz.questions
            .filter(q => q.userAnswer !== undefined && q.userAnswer !== q.correctIndex)
            .map(q => q.question)
            .slice(0, 3)
        : [];

    const topicTitleForResults = (currentQuiz && currentQuiz.topicTitle) ? currentQuiz.topicTitle : "Unknown Topic";

    window.lastQuizResults = {
        grade,
        percentage,
        score,
        total,
        incorrectQuestions,
        topicTitle: topicTitleForResults,
        type: currentQuiz.type
    };

    let startOverButtonHtml = '';
    if (currentQuiz && currentQuiz.type === 'grammar' && currentQuiz.topicTitle && currentQuiz.language && typeof currentQuiz.level !== 'undefined') {
        const safeTopicTitle = currentQuiz.topicTitle.replace(/'/g, "\\'");
        const safeLanguage = currentQuiz.language.replace(/'/g, "\\'");
        startOverButtonHtml = `<button onclick="startQuiz('${safeTopicTitle}', '${safeLanguage}', ${currentQuiz.level})" class="chat-button">Start Over</button>`;
    } else if (currentQuiz && currentQuiz.type === 'vocabulary' && currentQuiz.topicTitle && currentQuiz.language) {
        const safeTopicTitle = currentQuiz.topicTitle.replace(/'/g, "\\'");
        const safeLanguage = currentQuiz.language.replace(/'/g, "\\'");
        startOverButtonHtml = `<button onclick="startVocabularyQuiz('${safeTopicTitle}', '${safeLanguage}')" class="chat-button">Start Over</button>`;
    }

    if (!container) {
        console.error("Container is null in endQuiz. Cannot display quiz results.");
        const modalContent = document.querySelector('#teach-me-modal .modal-content');
        if (modalContent) {
            const errorP = document.createElement('p');
            errorP.style.color = 'red';
            errorP.textContent = "Error: Could not display quiz results area properly.";
            modalContent.appendChild(errorP);
        } else {
            alert("Error displaying quiz results: container not found.");
        }
        currentQuiz = {};
        return;
    }

    // =====================================================================================
    // CRITICAL LINE: Ensure this line below uses BACKTICKS (`) at the beginning and end
    // =====================================================================================
    container.innerHTML = `
        <div class="quiz-end">
            <strong>Quiz Complete!</strong>
            <pre style="margin: 10px 0; white-space: pre-wrap;">Your score: <span class="math-inline">${score}/</span>${total} (<span class="math-inline">${percentage}%\)\n</span>${grade}</pre>
            <button onclick="shareQuizResults()" class="chat-button" style="margin-right: 10px;">Share Results</button>
            ${startOverButtonHtml}
        </div>
    `;
    // =====================================================================================
    // End of critical section
    // =====================================================================================

    currentQuiz = {};
}

function shareQuizResults() {
    const lastResults = window.lastQuizResults;
    if (!lastResults) {
        console.error('No quiz results available to share');
        return;
    }

    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-message');

    // Determine quiz type string for the message
    // Use the quizType from lastResults, default to 'grammar' if it's somehow undefined
    const quizTypeString = lastResults.type === 'vocabulary' ? 'vocabulary' : 'grammar';

    const missedSection = lastResults.incorrectQuestions?.length > 0
        ? `\nAreas to review:\n${lastResults.incorrectQuestions.join('\n')}`
        : '';

    // Construct the message using the determined quizTypeString
    messageInput.value = `I just completed the "${lastResults.topicTitle}" ${quizTypeString} quiz!\n\nScore: ${lastResults.score}/${lastResults.total} (${lastResults.percentage}%)\n${lastResults.grade}${missedSection}`;

    const teachMeModal = document.getElementById('teach-me-modal');
    if (teachMeModal) {
        teachMeModal.style.display = 'none';
    }

    if (sendButton) {
        sendButton.click();
    }

    window.lastQuizResults = {}; // Clear results after sharing
}

async function getGrammarExplanation(topicTitle, language, level = null) {
    const explanationContainer = document.getElementById('grammar-topic-list');
    explanationContainer.innerHTML = '<p>Loading explanation...</p>';
    quizActive = false;
    currentQuiz = {};

    if (!topicTitle || topicTitle === 'undefined') {
        return;
    }

    // Find topic in grammar data
    if (!level && grammarData[language]) {
        const topic = grammarData[language].find(t => t.title === topicTitle);
        if (topic) {
            level = topic.level;
        }
    }

    // If still no level found, default to 1
    level = level || 1;

    console.log(`Requesting grammar explanation for: ${topicTitle} in ${language}, Level: ${level}`);

    // Get the user's native language for explanations
    const userNativeLanguage = currentPartner ? currentPartner.targetLanguage : 'English';

    // Construct a more detailed prompt requesting Markdown
    const prompt = `You are a ${language} language teacher explaining grammar to a student whose native language is ${userNativeLanguage}. 

Explain the grammar topic "${topicTitle}" for a learner of ${language} (assume they are at level ${level}).

IMPORTANT: Write your entire explanation in ${userNativeLanguage} so the student can understand it clearly. Only use ${language} for examples and sample sentences.

Your explanation should include:
1. A clear definition of the grammar concept in ${userNativeLanguage}
2. When and how to use it (explained in ${userNativeLanguage})
3. Examples in ${language} with ${userNativeLanguage} translations
4. Common mistakes to avoid (explained in ${userNativeLanguage})
5. Practice tips (in ${userNativeLanguage})

Format your entire response using Markdown. Use headings, bullet points, bold text, and code blocks for ${language} examples.
Do NOT include any text before or after the Markdown content.`;

    try {
        let explanationMarkdown = await callGeminiAPI(prompt, 3, 'grammar_explanation');
        console.log("Received Markdown explanation:", explanationMarkdown);

        // Convert Markdown to HTML using marked.js
        const explanationHtml = marked.parse(explanationMarkdown);

        // Display the HTML content in the modal
        explanationContainer.innerHTML = `
               <h2>Explanation: ${topicTitle}</h2>
               ${explanationHtml}
               <div class="topic-actions" style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                   <button class="chat-button" onclick="startQuiz('${topicTitle.replace(/'/g, "\\'")}', '${language.replace(/'/g, "\\'")}', ${level})">Quiz Me</button>
                   <button class="chat-button secondary-button" onclick="reloadGrammarTopicsList()">Return to Topics</button>
               </div>
           `;

    } catch (error) {
        console.error('Error getting grammar explanation:', error);
        explanationContainer.innerHTML = `<p style="color: red;">Failed to load explanation for "${topicTitle}". Please try again.</p>`;
    }
}

// --- Load Grammar Data on Startup --- REMOVED
// async function loadGrammarData() {
//    try {
//        const response = await fetch('grammar.json');
//        if (!response.ok) {
//            throw new Error(`HTTP error! status: ${response.status}`);
//        }
//        grammarData = await response.json();
//        console.log("Grammar data loaded successfully:", grammarData);
//    } catch (error) {
//        console.error("Could not load grammar data:", error);
//    }
// }

// --- Initialize --- 

// Load preferences only when the page loads
// Grammar data is now embedded, no need to fetch it here.
// My Info management
function loadMyInfo() {
    const myInfo = JSON.parse(localStorage.getItem('myInfo') || '{}');

    if (myInfo.name) {
        document.getElementById('userName').value = myInfo.name;
    }
    if (myInfo.bio) {
        document.getElementById('userBio').value = myInfo.bio;
    }
    if (myInfo.hobbies && myInfo.hobbies.length > 0) {
        const hobbiesList = document.getElementById('hobbiesList');
        hobbiesList.innerHTML = '';
        myInfo.hobbies.forEach(hobby => {
            addHobbyInput(hobby);
        });
    }

    // Check if we should collapse the section
    const content = document.getElementById('myInfoContent');
    const toggle = document.getElementById('toggleMyInfo');
    if (!myInfo.name && !myInfo.bio && (!myInfo.hobbies || myInfo.hobbies.length === 0)) {
        content.classList.add('hidden');
        toggle.classList.add('collapsed');
    }
}

function saveMyInfo() {
    const name = document.getElementById('userName').value;
    const bio = document.getElementById('userBio').value;
    const hobbyInputs = document.querySelectorAll('.hobby-input input');
    const hobbies = Array.from(hobbyInputs).map(input => input.value).filter(Boolean);

    const myInfo = { name, bio, hobbies };
    localStorage.setItem('myInfo', JSON.stringify(myInfo));
}

function addHobbyInput(value = '') {
    const hobbiesList = document.getElementById('hobbiesList');
    const div = document.createElement('div');
    div.className = 'hobby-input';
    div.innerHTML = `
        <input type="text" placeholder="Enter a hobby" value="${value}">
        <button class="remove-hobby">×</button>
    `;

    div.querySelector('.remove-hobby').addEventListener('click', () => {
        div.remove();
        saveMyInfo();
    });

    div.querySelector('input').addEventListener('change', saveMyInfo);
    hobbiesList.appendChild(div);
}

// Modified getGeminiChatResponse to include user info
async function getGeminiChatResponse(partner, history) {
    let myInfo = {};
    try {
        myInfo = JSON.parse(localStorage.getItem('myInfo') || '{}');
    } catch (parseError) {
        console.warn('Error parsing myInfo in getGeminiChatResponse:', parseError);
        myInfo = {};
    }
    
    const userContext = myInfo.name ?
        `The user's name is ${myInfo.name}. ${myInfo.bio ? `Their bio: ${myInfo.bio}.` : ''} ${myInfo.hobbies?.length ? `Their hobbies: ${myInfo.hobbies.join(', ')}.` : ''}` :
        '';
    
    console.log('Chat response using myInfo:', { name: myInfo.name, hasContext: !!userContext });

    // Get timezone context based on partner's native language
    const getTimezoneContext = (language) => {
        const timezoneMapping = {
            'Chinese': 'Asia/Shanghai',
            'Japanese': 'Asia/Tokyo', 
            'Korean': 'Asia/Seoul',
            'Vietnamese': 'Asia/Ho_Chi_Minh',
            'Thai': 'Asia/Bangkok',
            'Hindi': 'Asia/Kolkata',
            'Arabic': 'Asia/Dubai',
            'Russian': 'Europe/Moscow',
            'German': 'Europe/Berlin',
            'French': 'Europe/Paris',
            'Spanish': 'Europe/Madrid',
            'Italian': 'Europe/Rome',
            'Portuguese': 'Europe/Lisbon',
            'Polish': 'Europe/Warsaw',
            'Mongolian': 'Asia/Ulaanbaatar',
            'English': 'America/New_York'
        };
        return timezoneMapping[language] || 'UTC';
    };

    const partnerTimezone = getTimezoneContext(partner.nativeLanguage);
    const partnerTime = new Date().toLocaleString('en-US', { 
        timeZone: partnerTimezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        weekday: 'long'
    });

    // Analyze message timestamps to distinguish recent vs old messages
    const now = new Date();
    const last10Messages = history.slice(-10);
    
    // Check if this is a new conversation (less than 3 messages total)
    const isNewConversation = history.length <= 3;
    
    const messageAnalysis = last10Messages.map(msg => {
        // For new conversations, treat everything as "just now"
        if (isNewConversation || !msg.timestamp) {
            return { ...msg, timeContext: 'just now' };
        }
        
        const messageTime = new Date(msg.timestamp);
        const timeDiffMinutes = (now - messageTime) / (1000 * 60);
        
        let timeContext;
        if (timeDiffMinutes < 30) {
            timeContext = 'just now';
        } else if (timeDiffMinutes < 180) { // 3 hours
            timeContext = 'recent';
        } else if (timeDiffMinutes < 1440) { // 24 hours
            timeContext = 'earlier today';
        } else {
            timeContext = 'from previous session';
        }
        
        return { ...msg, timeContext };
    });

    // Separate recent messages from older loaded messages
    const recentMessages = messageAnalysis.filter(msg => msg.timeContext === 'just now' || msg.timeContext === 'recent');
    const olderMessages = messageAnalysis.filter(msg => msg.timeContext !== 'just now' && msg.timeContext !== 'recent');

    // Create context-aware message history
    let historyContext = '';
    if (olderMessages.length > 0 && !isNewConversation) {
        historyContext += `PREVIOUS CONVERSATION CONTEXT (from an earlier chat session):\n`;
        historyContext += olderMessages.map(msg => `${msg.sender}: ${msg.text}`).join('\n');
        historyContext += '\n\nCURRENT CONVERSATION (happening right now):\n';
        historyContext += recentMessages.map(msg => `${msg.sender}: ${msg.text}`).join('\n');
    } else {
        historyContext = `CURRENT CONVERSATION (happening right now):\n`;
        historyContext += messageAnalysis.map(msg => `${msg.sender}: ${msg.text}`).join('\n');
    }

    const prompt = `You are ${partner.name}, a language exchange partner on the website http://practicefor.fun. Your native language is ${partner.nativeLanguage} and you are learning ${partner.targetLanguage}. Your interests are ${partner.interests.join(', ')}.
${userContext}
You are chatting with someone whose native language is ${partner.targetLanguage} and who is learning your language (${partner.nativeLanguage}).

IMPORTANT TIMEZONE CONTEXT: You live in a region where ${partner.nativeLanguage} is spoken. Your current local time is ${partnerTime} (timezone: ${partnerTimezone}). When discussing time, weather, or daily activities, always reference YOUR local time and timezone, not the user's. If asked about the time, tell them what time it is where YOU are located.

${historyContext}

CRITICAL TIMING RULES:
- Pay attention to the distinction between "PREVIOUS CONVERSATION CONTEXT" and "CURRENT CONVERSATION"
- Messages in the "CURRENT CONVERSATION" section are happening RIGHT NOW in real-time
- Messages in the "PREVIOUS CONVERSATION CONTEXT" section are from a previous chat session
- ${isNewConversation ? 'THIS IS A NEW CONVERSATION - treat this as your first interaction with this person' : 'This appears to be a continuing conversation'}
- When referencing previous context messages, you can say things like "I remember you mentioned..." or "from our previous conversation..."
- When referencing current conversation messages, use present-tense language like "you just said..." or "you mentioned..."
- ${isNewConversation ? 'Since this is a new conversation, greet naturally without referencing past time or previous interactions' : 'Always respond to the most recent message in the current conversation'}
- Never say "it's been a while" or reference time gaps unless there's actual evidence of previous conversation context

Respond naturally to the last message in the current conversation.
Keep your response relatively short, like a typical chat message (1-3 sentences), unless directly asked to explain something in detail.

${enableCorrections ? `
  IMPORTANT: The user wants corrections. If their last message (sender: 'You') contains grammar or spelling errors in ${partner.nativeLanguage}, provide a brief, friendly correction AFTER your main conversational reply.
  The correction MUST be clearly displayed in ${partner.targetLanguage} (the user's native language).
  Provide the correction explanation in ${partner.targetLanguage} so the user can understand it clearly.
  Only provide a correction if you identify a clear error in ${partner.nativeLanguage} in the user's *last* message. If there are no errors, just give your conversational reply.
  ` : `
  The user does not currently want corrections. Just provide a natural conversational reply.
  `}

Your response should be ONLY the chat message text. Do not include your name or any other prefix.`;

    try {
        console.log("Getting Gemini Response. History:", history);
        const generatedText = await callGeminiAPI(prompt, 3, 'chat_response');
        console.log("Extracted Gemini text:", generatedText);
        return generatedText;
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadPreferences();
    loadMyInfo();
    loadModelPreference();

    // Model selector event listeners
    document.querySelectorAll('.model-button').forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            document.querySelectorAll('.model-button').forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            button.classList.add('active');

            // Update current model
            currentModel = button.dataset.model;

            // Save to localStorage
            localStorage.setItem('selectedModel', currentModel);

            console.log(`Model changed to: ${currentModel} (${GEMINI_MODELS[currentModel]})`);
        });
    });

    // My Info event listeners
    document.getElementById('toggleMyInfo').addEventListener('click', () => {
        const content = document.getElementById('myInfoContent');
        const toggle = document.getElementById('toggleMyInfo');
        const chevron = toggle.querySelector('.chevron');
        content.classList.toggle('hidden');
        toggle.classList.toggle('collapsed');

        // Save the toggle state to localStorage
        const isHidden = content.classList.contains('hidden');
        localStorage.setItem('myInfoToggleState', isHidden ? 'hidden' : 'visible');

        // Rotate chevron when toggled
        if (isHidden) {
            chevron.style.transform = 'rotate(-90deg)';
        } else {
            chevron.style.transform = 'rotate(0deg)';
        }
    });

    document.getElementById('addHobby')?.addEventListener('click', (e) => {
        e.preventDefault();
        addHobbyInput();
        saveMyInfo(); // Save after adding new hobby input
    });

    // Add input event listeners for real-time saving
    document.getElementById('userName')?.addEventListener('input', saveMyInfo);
    document.getElementById('userBio')?.addEventListener('input', saveMyInfo);

    // Add event delegation for hobby inputs
    document.getElementById('hobbiesList')?.addEventListener('input', (e) => {
        if (e.target.matches('input')) {
            saveMyInfo();
        }
    });

    checkSavedPartner();
    initializeTutorial();
});

function addHobbyInput(value = '') {
    const hobbiesList = document.getElementById('hobbiesList');
    if (!hobbiesList) return;

    const div = document.createElement('div');
    div.className = 'hobby-input';
    div.innerHTML = `
        <input type="text" placeholder="Enter a hobby" value="${value}">
        <button class="remove-hobby">×</button>
    `;

    const removeButton = div.querySelector('.remove-hobby');
    removeButton.addEventListener('click', (e) => {
        e.preventDefault();
        div.remove();
        saveMyInfo();
    });

    hobbiesList.appendChild(div);
}

function saveMyInfo() {
    const name = document.getElementById('userName')?.value || '';
    const bio = document.getElementById('userBio')?.value || '';
    const hobbyInputs = document.querySelectorAll('.hobby-input input');
    const hobbies = Array.from(hobbyInputs).map(input => input.value).filter(Boolean);

    const myInfo = { name, bio, hobbies };
    localStorage.setItem('myInfo', JSON.stringify(myInfo));
    console.log('Saved myInfo to localStorage:', myInfo);
}

function loadMyInfo() {
    try {
        const myInfo = JSON.parse(localStorage.getItem('myInfo') || '{}');

        if (myInfo.name) {
            const userNameInput = document.getElementById('userName');
            if (userNameInput) userNameInput.value = myInfo.name;
        }

        if (myInfo.bio) {
            const userBioInput = document.getElementById('userBio');
            if (userBioInput) userBioInput.value = myInfo.bio;
        }

        const hobbiesList = document.getElementById('hobbiesList');
        if (hobbiesList) {
            hobbiesList.innerHTML = ''; // Clear existing hobbies
            if (myInfo.hobbies && myInfo.hobbies.length > 0) {
                myInfo.hobbies.forEach(hobby => addHobbyInput(hobby));
            } else {
                addHobbyInput(); // Add one empty hobby input if none exist
            }
        }

        // Set initial visibility state based on localStorage or content
        const content = document.getElementById('myInfoContent');
        const toggle = document.getElementById('toggleMyInfo');
        const chevron = toggle?.querySelector('.chevron');
        if (content && toggle && chevron) {
            // Check if user has previously set a toggle state
            const savedToggleState = localStorage.getItem('myInfoToggleState');

            if (savedToggleState) {
                // Use saved state
                if (savedToggleState === 'hidden') {
                    content.classList.add('hidden');
                    toggle.classList.add('collapsed');
                    chevron.style.transform = 'rotate(-90deg)';
                } else {
                    content.classList.remove('hidden');
                    toggle.classList.remove('collapsed');
                    chevron.style.transform = 'rotate(0deg)';
                }
            } else {
                // Default behavior: collapse if no content
                const hasContent = myInfo.name || myInfo.bio || (myInfo.hobbies && myInfo.hobbies.length > 0);
                if (!hasContent) {
                    content.classList.add('hidden');
                    toggle.classList.add('collapsed');
                    chevron.style.transform = 'rotate(-90deg)';
                }
            }
        }
    } catch (error) {
        console.error('Error loading my info:', error);
    }
}

function initializeTutorial() {
    const tutorialModal = document.getElementById('tutorial-modal');
    const tutorialBtn = document.getElementById('tutorial-btn');
    const tutorialClose = tutorialModal.querySelector('.tutorial-close');

    tutorialBtn.onclick = () => {
        tutorialModal.style.display = 'flex';
    };

    tutorialClose.onclick = () => {
        tutorialModal.style.display = 'none';
    };

    window.onclick = (event) => {
        if (event.target === tutorialModal) {
            tutorialModal.style.display = 'none';
        }
    };
}

function checkSavedPartner() {
    const savedPartnerData = localStorage.getItem('savedPartner');
    const banner = document.getElementById('saved-partner-banner');
    const info = document.getElementById('saved-partner-info');

    if (!banner || !info) {
        // console.error("Saved partner banner elements not found."); // Optionally uncomment for debugging
        return;
    }

    if (savedPartnerData) {
        try {
            const data = JSON.parse(savedPartnerData);
            if (!data || !data.partner || !Array.isArray(data.messages)) {
                console.error("Saved partner data is corrupted or incomplete.");
                localStorage.removeItem('savedPartner'); // Clear corrupted data
                banner.style.display = 'none';
                return;
            }

            banner.style.display = 'block';
            info.textContent = `Continue chat with ${data.partner.name}`; // Updated text slightly

            const resumeBtn = document.getElementById('resume-chat-btn');
            if (resumeBtn) {
                resumeBtn.onclick = () => {
                    openChat(data.partner); // This call initializes the chat UI, including clearing messages

                    // After openChat, repopulate chatHistory and render messages
                    chatHistory = data.messages || []; // Restore global chatHistory

                    const chatMessages = document.getElementById('chat-messages');
                    if (chatMessages) {
                        chatMessages.innerHTML = chatHistory.map(msg => {
                            // Determine class based on sender
                            const messageClass = msg.sender === 'You' ? 'user-message' : 'partner-message';

                            // Use the sender name from the message object
                            const senderName = msg.sender; // This will be "You" or the partner's name

                            // Format the timestamp if it exists
                            const messageTimestamp = msg.timestamp
                                ? new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
                                : '';

                            // Reconstruct the HTML for each message, including class and timestamp span
                            return `
                              <p class="${messageClass}">
                                <strong>${senderName}:</strong> ${msg.text}
                                ${messageTimestamp ? `<span class="message-time">${messageTimestamp}</span>` : ''}
                              </p>`;
                        }).join('');

                        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to the bottom
                    }
                };
            }

            const deleteBtn = document.getElementById('delete-partner-btn');
            if (deleteBtn) {
                deleteBtn.onclick = () => {
                    if (confirm('Are you sure you want to delete the saved chat with ' + data.partner.name + '?')) {
                        localStorage.removeItem('savedPartner');
                        banner.style.display = 'none';
                    }
                };
            }
        } catch (error) {
            console.error("Error parsing saved partner data:", error);
            localStorage.removeItem('savedPartner'); // Clear potentially corrupted data
            banner.style.display = 'none';
        }
    } else {
        banner.style.display = 'none';
    }
}

// Remove the old DOMContentLoaded listener for just loadPreferences
// document.addEventListener('DOMContentLoaded', loadPreferences);

// Add event listeners to save dropdown changes to localStorage
document.getElementById('nativeLanguage').addEventListener('change', (event) => {
    const valueToSave = event.target.value;
    console.log(`Saving nativeLanguage: ${valueToSave}`);
    localStorage.setItem("selectedNativeLanguage", valueToSave);
});

document.getElementById('targetLanguage').addEventListener('change', (event) => {
    const valueToSave = event.target.value;
    console.log(`Saving targetLanguage: ${valueToSave}`);
    localStorage.setItem("selectedTargetLanguage", valueToSave);
});

// Save partner functionality
document.getElementById('save-partner-btn').addEventListener('click', () => {
    if (!currentPartner) return;

    // Check if running on mobile and HTTPS
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isHttps = window.location.protocol === 'https:';

    if (!isHttps) {
        alert('Save functionality requires HTTPS. Please ensure you are using a secure connection.');
        return;
    }

    try {
        const savedPartner = localStorage.getItem('savedPartner');
        if (savedPartner) {
            // Use custom modal for mobile devices instead of confirm
            if (isMobile) {
                const confirmed = window.confirm('Do you want to overwrite the previously saved partner?');
                if (!confirmed) {
                    return;
                }
            } else {
                if (!confirm('Do you want to overwrite the previously saved partner?')) {
                    return;
                }
            }
        }

        // Save partner and last 50 messages
        const dataToSave = {
            partner: currentPartner,
            messages: chatHistory.slice(-50)
        };

        localStorage.setItem('savedPartner', JSON.stringify(dataToSave));

        // Show success message
        if (isMobile) {
            // Create a temporary success message element
            const successMsg = document.createElement('div');
            successMsg.style.position = 'fixed'; successMsg.style.bottom = '20px';
            successMsg.style.left = '50%';
            successMsg.style.transform = 'translateX(-50%)';
            successMsg.style.background = '#4CAF50';
            successMsg.style.color = 'white';
            successMsg.style.padding = '10px 20px';
            successMsg.style.borderRadius = '5px';
            successMsg.style.zIndex = '10000';
            successMsg.textContent = 'Partner saved successfully!';

            document.body.appendChild(successMsg);

            // Remove after 2 seconds
            setTimeout(() => {
                successMsg.remove();
            }, 2000);
        } else {
            alert('Partner and recent messages saved successfully!');
        }
    } catch (error) {
        console.error('Error saving partner:', error);
        if (isMobile) {
            // Show error message for mobile
            const errorMsg = document.createElement('div');
            errorMsg.style.position = 'fixed';
            errorMsg.style.bottom = '20px';
            errorMsg.style.left = '50%';
            errorMsg.style.transform = 'translateX(-50%)';
            errorMsg.style.background = '#f44336';
            errorMsg.style.color = 'white';
            errorMsg.style.padding = '10px 20px';
            errorMsg.style.borderRadius = '5px';
            errorMsg.style.zIndex = '10000';
            errorMsg.textContent = 'Could not save partner. Please ensure HTTPS is enabled.';

            document.body.appendChild(errorMsg);

            setTimeout(() => {
                errorMsg.remove();
            }, 3000);
        } else {
            alert('Could not save partner. Please ensure you are using HTTPS in production.');
        }
    }
});

// Add interest search filter
document.getElementById('interestSearch').addEventListener('input', () => {
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.click(); // Trigger a new search when the interest filter changes
    }
});

// Event listener for grammar topic links
document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');

    chatMessages?.addEventListener('click', async (event) => {
        if (event.target.classList.contains('grammar-topic-link')) {
            event.preventDefault();
            const topicTitle = event.target.dataset.topic;
            const language = currentPartner.nativeLanguage; // Teach in partner's native language

            // Add a "requesting explanation" message
            const requestingMsg = document.createElement('p');
            requestingMsg.innerHTML = `<em>Requesting explanation for "${topicTitle}"...</em>`;
            requestingMsg.style.fontStyle = 'italic';
            chatMessages.appendChild(requestingMsg);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            try {
                // Find the topic level from grammarData
                const level = grammarData[language]?.find(topic => topic.title === topicTitle)?.level || 'unknown';
                const explanationMarkdown = await getGrammarExplanation(topicTitle, language, level);

                // Remove the requesting message
                chatMessages.removeChild(requestingMsg);

                // Parse the Markdown explanation to HTML using Marked.js
                if (typeof marked === 'undefined') {
                    console.error("Marked.js library not loaded!");
                    throw new Error("Markdown library not available.");
                }
                const explanationHtml = marked.parse(explanationMarkdown);

                // Display the parsed HTML
                const explanationDiv = document.createElement('div');
                explanationDiv.className = 'message grammar-explanation';
                const senderSpan = document.createElement('span');
                senderSpan.className = 'sender';
                senderSpan.textContent = `Gemini (Teaching ${topicTitle}):`;
                explanationDiv.appendChild(senderSpan);
                const contentDiv = document.createElement('div');
                contentDiv.innerHTML = explanationHtml;
                explanationDiv.appendChild(contentDiv);

            } catch (error) {
                // Remove the requesting message even if there's an error
                if (chatMessages.contains(requestingMsg)) {
                    chatMessages.removeChild(requestingMsg);
                }
                console.error("Error getting or parsing grammar explanation:", error);
                const errorMsg = document.createElement('p');
                errorMsg.innerHTML = `<p><em>Sorry, couldn't get an explanation for ${topicTitle}. Error: ${error.message}</em></p>`;
                errorMsg.style.color = 'red';
                errorMsg.style.fontStyle = 'italic';
                chatMessages.appendChild(errorMsg);
            } finally {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }
    });
});

// Text-to-speech configuration with retry mechanism
const TTS_API_URL = 'https://langcamp.us/elevenlbs-exchange-audio/exchange-audio';
var audioContext = null;

// Debug logging
console.log('TTS functionality initialized');

const VOICE_MAPPING = {
    'en': '21m00Tcm4TlvDq8ikWAM', // English (Rachel)
    'es': 'IKne3meq5aSn9XLyUdCD', // Spanish (Antoni)
    'fr': 'XB0fDUnXU5powFXDhCwa', // French (Remi)
    'de': 'MqJuQxV2f1yxaP9J7OQu', // German (Hans)
    'ja': 'XrExE9yKIg1WjnnlVkGX', // Japanese (Hiroshi)
    'zh': 'bVMeCyTHy58xNoL34h3p', // Chinese (Xiomara)
    'pl': 'UZBqWwKILHHhN8VO4q3g', // Polish (Agnieszka)
    'ar': 'z9fAnlkpzviPz146aGWa', // Arabic (Omar)
    'ru': 'AZnzlk1XvdvUeBnXmlld', // Russian (Dmitri)
    'it': 'VR6AewLTigWG4xSOukaG', // Italian (Vittorio)
    'vn': 'pMsXgVXv3BLzUgSXRplE', // Vietnamese (Thao)
    'hi': 'C6MJXOCUZzWZwLPQCRul', // Hindi (Rajesh)
    'pt': 'TxGEqnHWrfWFTfGW9XjX', // Portuguese (Lucas)
    'ko': 'YOXNVwl6pD7RMqXCh1cJ', // Korean (Jin)
    'th': 'piTKgcLEGmPE4e6mEKli', // Thai (Somchai)
    'mn': 'ErXwobaYiN019PkySvjV'  // Mongolian (Batbayar)
};


// Initialize audio context on user interaction
function initAudioContext() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.error('Could not initialize audio context:', error);
            return null;
        }
    }
    return audioContext;
}

// Detect language using basic character set analysis
function detectLanguage(text) {
    // Check for Chinese characters
    if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
    // Check for Japanese characters (Hiragana, Katakana, Kanji)
    if (/[\u3040-\u30FF\u3400-\u4DBF\uF900-\uFAFF]/.test(text)) return 'ja'; // Added Kanji range
    // Check for Korean Hangul
    if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
    // Check for Arabic characters
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';
    // Check for Russian Cyrillic characters
    if (/[\u0400-\u04FF]/.test(text)) return 'ru';
    // Check for Hindi Devanagari characters
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    // Check for Thai characters
    if (/[\u0E00-\u0E7F]/.test(text)) return 'th';

    // For European languages based on Latin script, diacritics can help but are not foolproof
    // Order matters here: more specific checks first
    if (/[áéíóúñüÁÉÍÓÚÑÜ]/.test(text) && !/[çÇãõÃÕàÀ]/.test(text)) return 'es'; // Spanish-specific somewhat
    if (/[àâçéèêëîïôûùüÿÀÂÇÉÈÊËÎÏÔÛÙÜŸ]/.test(text) && !/[ãõÃÕ]/.test(text)) return 'fr'; // French-specific somewhat
    if (/[äöüßÄÖÜ]/.test(text)) return 'de'; // German
    if (/[àèéìòùÀÈÉÌÒÙ]/.test(text) && !/[çÇãõÃÕ]/.test(text)) return 'it'; // Italian-specific somewhat
    if (/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(text)) return 'pl'; // Polish
    if (/[ãõáéíóúâêôçÃÕÁÉÍÓÚÂÊÔÇ]/.test(text)) return 'pt'; // Portuguese (overlaps with Spanish/French)

    // Vietnamese uses Latin script with many diacritics
    // A more robust check might involve looking for specific tone mark combinations
    // This is a very basic check for some common Vietnamese diacritics
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/.test(text)) return 'vn';

    // Mongolian (Cyrillic) would be caught by Russian check if not distinguished;
    // If using traditional Mongolian script, that's another unicode range.
    // For Cyrillic Mongolian, it's harder to distinguish from Russian without more context or specific Mongolian Cyrillic letters like ӨөҮү
    if (/[ӨөҮү]/.test(text)) return 'mn';


    // Default to English if no other language is strongly indicated
    return 'en';
}

// Function to play audio with better error handling
async function playAudioFromText(text, button, maxRetries = 3) {
    console.log('Starting playAudioFromText with text:', text);
    let retryCount = 0;
    let success = false;

    while (retryCount < maxRetries && !success) {
        try {
            if (window.location.protocol !== 'https:') {
                throw new Error('Audio functionality requires HTTPS');
            }

            initAudioContext();
            button.disabled = true;
            button.style.visibility = 'visible';
            button.style.display = 'flex';
            button.innerHTML = retryCount > 0 ?
                `🔄 Loading... (Retry ${retryCount}/${maxRetries})` :
                '🔄 Loading...';

            const detectedLang = detectLanguage(text);
            const voiceId = VOICE_MAPPING[detectedLang] || VOICE_MAPPING.en;

            // Create timeout promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), 10000)
            );

            // Fetch with timeout
            const fetchPromise = fetch(TTS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer wsec_81c54a71adb28dff26425889f84fbdfee3b446707529b33bd0e2a54eb3a43944'
                },
                body: JSON.stringify({
                    text: text,
                    voice_id: voiceId,
                    model_id: "eleven_multilingual_v2"
                })
            });

            const response = await Promise.race([fetchPromise, timeoutPromise]);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`TTS API error: ${response.status} - ${errorText}`);
            }

            const audioBlob = await response.blob();
            if (!audioBlob || audioBlob.size === 0) {
                throw new Error('Empty audio response received');
            }

            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio();

            // Pre-load audio
            await new Promise((resolve, reject) => {
                audio.oncanplaythrough = resolve;
                audio.onerror = reject;
                audio.src = audioUrl;
                audio.load();
                setTimeout(() => reject(new Error('Audio loading timeout')), 5000);
            });

            // Setup event handlers
            audio.onerror = (e) => {
                console.error('Audio playback error:', e);
                throw new Error('Audio playback failed');
            };

            // Play audio and wait for completion
            await audio.play();
            await new Promise((resolve) => {
                audio.onended = resolve;
            });

            // Success! Update button and clean up
            button.innerHTML = '✅ Played';
            button.style.display = 'flex';
            setTimeout(() => {
                URL.revokeObjectURL(audioUrl);
                button.remove();
            }, 2000);

            success = true;

        } catch (error) {
            console.error(`TTS attempt ${retryCount + 1} failed:`, error);
            retryCount++;

            if (retryCount < maxRetries) {
                // Wait before retrying (increasing delay)
                await new Promise(r => setTimeout(r, retryCount * 1000));
            } else {
                // All retries failed
                if (button && button.parentNode) {
                    button.disabled = false;
                    button.style.visibility = 'visible';
                    button.style.display = 'flex';
                    button.innerHTML = `❌ Error: ${error.message}`;

                    setTimeout(() => {
                        if (button && button.parentNode) {
                            button.innerHTML = '🔊 Try Again';
                            button.disabled = false;
                        }
                    }, 3000);
                }
            }
        }
    }

    return success;
}

// Audio button controller 
function createAudioButton(text, rect) {
    // Remove existing buttons
    removeAudioButton();

    // Create new button
    const button = document.createElement('button');
    button.className = 'audio-button icon-button';
    button.style.position = 'fixed';
    button.style.background = '#3498db';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.padding = '4px 12px';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.zIndex = '10000';
    button.style.fontSize = '14px';
    button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    button.style.transition = 'all 0.2s ease';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.gap = '8px';
    button.style.pointerEvents = 'auto'; // Ensure clicks are registered
    button.style.userSelect = 'none'; // Prevent text selection
    button.style.webkitUserSelect = 'none'; // For Safari
    button.style.msUserSelect = 'none'; // For IE/Edge

    button.innerHTML = `
        <span class="button-icon" style="font-size: 16px; pointer-events: none;">🔊</span>
        <span class="button-text" style="font-weight: 500; pointer-events: none;">Play Audio</span>
    `;

    // Get chat modal for scroll handling
    const chatModal = document.getElementById('chat-modal');
    const chatMessages = document.getElementById('chat-messages');
    const modalRect = chatModal?.getBoundingClientRect() || { top: 0, left: 0 };

    // Calculate viewport dimensions
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Calculate initial position relative to viewport
    let left = Math.min(rect.left, viewportWidth - 120); // Use viewport-relative position
    let top = rect.bottom + 2; // Use viewport-relative position

    // Adjust if selection is inside chat modal
    if (chatModal && chatModal.contains(window.getSelection().anchorNode)) {
        // Keep chat modal scrollable but lock main page
        document.body.style.overflow = 'hidden';
        chatMessages.style.overflow = 'auto';

        // Adjust position relative to chat modal
        top += modalRect.top;
        left += modalRect.left;
    } else {
        // Lock page scroll for selections outside chat
        document.body.style.overflow = 'hidden';
    }

    // Adjust for bottom of viewport
    const buttonHeight = 36;
    if (top + buttonHeight > viewportHeight) {
        top = rect.top - buttonHeight - 2;
    }

    // Ensure left position isn't negative
    left = Math.max(10, left);

    // Ensure button is visible and clickable
    button.style.position = 'fixed';
    button.style.left = `${left}px`;
    button.style.top = `${top}px`;
    button.style.zIndex = '10000';
    button.style.visibility = 'visible';
    button.style.opacity = '1';
    button.style.userSelect = 'none';
    button.style.pointerEvents = 'auto';

    console.log('Button positioned at:', { left, top });
    let isPlaying = false;
    // Add click event listener with preventDefault
    button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('Audio button clicked');

        if (button.disabled) {
            console.log('Button is disabled, ignoring click');
            return;
        }

        button.disabled = true;
        button.innerHTML = '🔄 Loading...';

        try {
            console.log('Attempting to initialize audio context...');
            if (!audioContext) {
                audioContext = initAudioContext();
                console.log('Audio context initialized:', audioContext ? 'success' : 'failed');
            }
        } catch (error) {
            console.error('Error initializing audio context:', error);
            throw error;
        }

        try {
            console.log('Starting audio playback');
            isPlaying = true;

            // Keep button visible and interactive
            button.style.opacity = '1';
            button.style.visibility = 'visible';
            button.style.display = 'flex';
            button.style.pointerEvents = 'auto';

            // Update button state
            button.disabled = true;
            button.classList.add('playing');
            button.innerHTML = `
                <span class="button-icon">🔄</span>
                <span class="button-text">Loading...</span>
            `;

            // Initialize audio context on user interaction
            if (!audioContext) {
                audioContext = initAudioContext();
                if (!audioContext) {
                    throw new Error('Could not initialize audio context');
                }
            }

            await playAudioFromText(text, button);

            button.innerHTML = `
                <span class="button-icon">✅</span>
                <span class="button-text">Played</span>
            `;

            setTimeout(() => button.remove(), 2000);
        } catch (error) {
            console.error('Audio playback failed:', error);
            if (button && button.parentNode) {
                button.disabled = false;
                button.classList.remove('playing');
                button.style.opacity = '1';
                button.style.visibility = 'visible';
                button.style.display = 'flex';
                button.style.pointerEvents = 'auto';
                button.innerHTML = `
                    <span class="button-icon">❌</span>
                    <span class="button-text">Error: ${error.message}</span>
                `;

                // Keep error visible and allow retry
                const retryTimeout = setTimeout(() => {
                    if (button && button.parentNode) {
                        button.innerHTML = `
                            <span class="button-icon">🔊</span>
                            <span class="button-text">Try Again</span>
                        `;
                    }
                }, 3000);

                // Store timeout ID on button element
                button.dataset.retryTimeout = retryTimeout;
            }
        } finally {
            isPlaying = false;
        }
    });

    try {
        document.body.appendChild(button);
        console.log('Audio button created and appended to body');
        return button;
    } catch (error) {
        console.error('Error creating audio button:', error);
        return null;
    }
}

function removeAudioButton() {
    const buttons = document.querySelectorAll('.audio-button');
    buttons.forEach(btn => btn.remove());
    // Restore scroll behavior
    document.body.style.overflow = '';
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) chatMessages.style.overflow = '';
}

// Create a debounce function to rate limit selection handling
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Text selection handler for both desktop and mobile
document.addEventListener('selectionchange', debounce(function() {
    // Don't show audio button if selection is in input/textarea
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
        console.log('Selection in input/textarea, ignoring');
        return;
    }

    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText && selectedText.length >= 2 && selectedText.length <= 200) {
        const range = selection?.getRangeAt(0);
        if (!range) return;

        const rect = range.getBoundingClientRect();
        if (!rect) return;

        // For mobile, adjust the rect position to account for scroll
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
            rect.top += scrollY;
        }

        createAudioButton(selectedText, rect);
    }
    // Don't remove the button immediately on selection change
}, 300));

// Only remove audio button on specific events
document.addEventListener('mousedown', (event) => {
    // Don't remove if clicking the audio button itself
    if (!event.target.closest('.audio-button')) {
        removeAudioButton();
    }
});

// Add touch event handling for mobile
document.addEventListener('touchend', function(e) {
    // Don't show audio button if selection is in input/textarea
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
        return;
    }

    // Small delay to allow selection to complete
    setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();

        if (selectedText && selectedText.length >= 2 && selectedText.length <= 200) {
            const range = selection?.getRangeAt(0);
            if (!range) return;

            const rect = range = selection?.getRangeAt(0).getBoundingClientRect();
            if (!rect) return;

            // Adjust position for mobile
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
            const adjustedRect = new DOMRect(
                rect.x,
                rect.y + scrollY,
                rect.width,
                rect.height
            );

            // Remove any existing audio buttons before creating new one
            removeAudioButton();
            createAudioButton(selectedText, adjustedRect);
        }
    }, 100);
});

// Remove audio button when clicking outside
document.addEventListener('mousedown', (event) => {
    if (!event.target.classList.contains('audio-button')) {
        removeAudioButton();
    }
});

// Simplified study guide middleware function
async function studyGuideMiddleware(message, chatContext) {
    console.log(`[StudyGuide] Checking message: "${message}"`);

    // Simple keyword detection first - if any study-related keywords are found, trigger the study guide
    const studyKeywords = [
        'teach me', 'help me learn', 'study', 'grammar', 'vocabulary', 'pronouns', 'verbs',
        'what should i study', 'recommend', 'learn', 'practice', 'explain', 'conjugation',
        'tense', 'adjective', 'noun', 'lesson', 'guide', 'how do i', 'tutorial'
    ];

    const messageLC = message.toLowerCase();
    const hasStudyKeyword = studyKeywords.some(keyword => messageLC.includes(keyword));

    console.log(`[StudyGuide] Keyword check result: ${hasStudyKeyword ? 'STUDY KEYWORDS FOUND' : 'NO STUDY KEYWORDS'}`);

    if (!hasStudyKeyword) {
        return null; // Skip AI detection if no obvious study keywords
    }

    try {
        // If keywords found, proceed with study guidance generation
        const targetLanguage = currentPartner ? currentPartner.nativeLanguage : 'the target language';
        const userNativeLanguage = currentPartner ? currentPartner.targetLanguage : 'English';
        const userLevel = localStorage.getItem('languageLevelRating') || '1';

        console.log(`[StudyGuide] Generating study guidance for ${targetLanguage} (user level: ${userLevel})`);

        const studyGuidancePrompt = `You are a helpful language learning assistant. The user is learning ${targetLanguage} and their native language is ${userNativeLanguage}. Their current proficiency level is ${userLevel} out of 5.

User's request: "${message}"

Provide specific, actionable study recommendations that include:
1. Relevant grammar topics for their level
2. Vocabulary areas to focus on  
3. Practical next steps
4. Encouragement

Keep your response concise but helpful (2-3 sentences max). Respond in ${userNativeLanguage}.

Available grammar topics include: ${grammarData[targetLanguage] ? grammarData[targetLanguage].slice(0, 10).map(topic => topic.title).join(', ') : 'basic grammar topics'}`;

        let studyRecommendations = await callGeminiAPI(studyGuidancePrompt, 3, 'study_guide');

        console.log(`[StudyGuide] Generated recommendations: "${studyRecommendations.substring(0, 100)}..."`);
        return studyRecommendations;

    } catch (error) {
        console.error('[StudyGuide] Error:', error);
        return null;
    }
}

// Add study guide middleware to send button
document.getElementById('send-message').addEventListener('click', async () => {
    const messageInput = document.getElementById('message-input');
    const messageText = messageInput.value.trim();

    // Only proceed if there's actually a message
    if (!messageText) {
        return;
    }

    // Check for study guide request FIRST
    const chatContext = chatHistory.slice(-10);
    const studyGuideMessage = await studyGuideMiddleware(messageText, chatContext);

    if (studyGuideMessage) {
        console.log(`[StudyGuide] TRIGGERED! Showing study guide response`);

        const chatMessages = document.getElementById('chat-messages');
        const timestamp = new Date().toISOString();
        const studyGuideResponse = { sender: 'Study Guide', text: studyGuideMessage, timestamp };
        chatHistory.push(studyGuideResponse);

        chatMessages.innerHTML += `
            <p class="partner-message" style="background-color: #e8f5e8; border-left: 4px solid #4CAF50;">
                <strong>📚 Study Guide:</strong> ${studyGuideMessage}
                <span class="message-time" style="font-size: 0.8em; color: #666; margin-left: 8px;">
                    ${new Date(timestamp).toLocaleTimeString()}
                </span>
            </p>`;
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Clear the input and don't proceed with normal message processing
        messageInput.value = '';
        return;
    }

    // Normal message processing
    if (messageText && currentPartner) {
        lastUserMessage = messageText;
        if (geminiIntroTimer) {
            clearTimeout(geminiIntroTimer);
            geminiIntroTimer = null;
        }

        const connectingMessage = document.getElementById('connecting-message');
        if (connectingMessage) {
            connectingMessage.remove();
        }

        const timestamp = new Date().toISOString();
        const userMessage = { sender: 'You', text: messageText, timestamp };
        chatHistory.push(userMessage);
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML += `
            <p class="user-message">
                <strong>You:</strong> ${messageText}
                <span class="message-time" style="font-size: 0.8em; color: #fff; margin-left: 8px;">
                    ${new Date(timestamp).toLocaleTimeString()}
                </span>
            </p>`;
        messageInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        messageCountForAssessment++;
        const timeSinceLastAssessment = Date.now() - lastAssessmentTime;

        if (messageCountForAssessment % ASSESSMENT_INTERVAL === 0 &&
            timeSinceLastAssessment > ASSESSMENT_COOLDOWN) {
            const maxMessages = Math.min(40, chatHistory.length);
            const messagesToAnalyze = Math.floor(maxMessages / 4) * 4;
            const recentMessages = chatHistory.slice(-messagesToAnalyze);

            assessLanguageLevel(recentMessages);
        }
        const thinkingIndicator = document.createElement('p');
        thinkingIndicator.id = 'thinking-indicator';
        thinkingIndicator.innerHTML = `<em>${currentPartnerName} is typing...</em>`;
        chatMessages.appendChild(thinkingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const partnerResponseText = await getGeminiChatResponse(currentPartner, chatHistory);

            const thinkingIndicatorToRemove = document.getElementById('thinking-indicator');
            if (thinkingIndicatorToRemove) {
                thinkingIndicatorToRemove.remove();
            }

            if (partnerResponseText) {
                const partnerResponse = { sender: currentPartnerName, text: partnerResponseText, timestamp };
                chatHistory.push(partnerResponse);
                chatMessages.innerHTML += `
                    <p class="partner-message">
                        <strong>${currentPartnerName}:</strong> ${partnerResponseText}
                        <span class="message-time" style="font-size: 0.8em; color: #666; margin-left: 8px;">
                            ${new Date(timestamp).toLocaleTimeString()}
                        </span>
                    </p>`;
            } else {
                chatMessages.innerHTML += `<p><em>Sorry, ${currentPartnerName} couldn't respond right now.</em></p>`;
            }
        } catch (error) {
            console.error("Error getting Gemini response:", error);
            const thinkingIndicatorToRemove = document.getElementById('thinking-indicator');
            if (thinkingIndicatorToRemove) {
                thinkingIndicatorToRemove.remove();
            }
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.innerHTML = `
                <p><em>Error getting response.</em></p>
                <button onclick="retryLastMessage()" class="chat-button small-button" style="margin-top: 8px;">Retry</button>
            `;
            chatMessages.appendChild(errorDiv);
        } finally {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }
});