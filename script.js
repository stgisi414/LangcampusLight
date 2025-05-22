const API_KEY = 'AIzaSyDIFeql6HUpkZ8JJlr_kuN0WDFHUyOhijA';

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
        const prompt = `Please generate a list of four distinct language exchange partner profiles.
The goal is to find partners for someone who speaks ${nativeLanguage} and wants to learn ${targetLanguage}.
Therefore, each generated profile should represent a person whose native language is ${targetLanguage} and who wants to learn ${nativeLanguage}.

Generate profiles for people who are a mix of students, professionals, or artists, and give them varied personalities (e.g., patient, enthusiastic, humorous, studious).

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
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp-01-21:generateContent?key=' + API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt // Send the prompt exactly as constructed
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${response.statusText}. Body: ${errorBody}`);
        }

        const data = await response.json();

        if (!data || !data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
            console.error("Unexpected API response structure:", data);
            throw new Error("Unexpected API response structure");
        }

        let generatedText = data.candidates[0].content.parts[0].text;

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
            const asianLanguages = ['Chinese', 'Japanese', 'Korean'];
            const europeanLanguages = ['English', 'Spanish', 'French', 'Italian'];
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
        resultsContainer.innerHTML = '<p style="text-align:center;">No partners found matching your criteria.</p>';
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

// Embed grammar data directly to avoid fetch/CORS issues
const grammarData = {
    // PASTE THE FULL CONTENT OF grammar.json HERE
    // Ensure the keys (language names) match the values used in your dropdowns (e.g., "Spanish", "English")
    "Spanish": [
        // Beginner (Level 1)
        { "title": "Alphabet & Pronunciation", "level": 1, "tags": ["basics", "pronunciation"] },
        { "title": "Gender of Nouns", "level": 1, "tags": ["nouns", "gender", "basics"] },
        { "title": "Plural of Nouns", "level": 1, "tags": ["nouns", "plural", "basics"] },
        { "title": "Definite & Indefinite Articles", "level": 1, "tags": ["articles", "basics"] },
        { "title": "Subject Pronouns", "level": 1, "tags": ["pronouns", "basics"] },
        { "title": "Present Tense: Ser", "level": 1, "tags": ["verbs", "present tense", "ser", "basics"] },
        { "title": "Present Tense: Estar", "level": 1, "tags": ["verbs", "present tense", "estar", "basics"] },
        { "title": "Present Tense: Regular -AR Verbs", "level": 1, "tags": ["verbs", "present tense", "regular verbs", "basics"] },
        { "title": "Present Tense: Regular -ER Verbs", "level": 1, "tags": ["verbs", "present tense", "regular verbs", "basics"] },
        { "title": "Present Tense: Regular -IR Verbs", "level": 1, "tags": ["verbs", "present tense", "regular verbs", "basics"] },
        { "title": "Basic Adjectives (Agreement)", "level": 1, "tags": ["adjectives", "agreement", "basics"] },
        { "title": "Numbers 0-100", "level": 1, "tags": ["numbers", "vocabulary", "basics"] },
        { "title": "Telling Time", "level": 1, "tags": ["time", "vocabulary", "basics"] },
        { "title": "Days of the Week & Months", "level": 1, "tags": ["time", "vocabulary", "basics"] },
        { "title": "Basic Question Formation", "level": 1, "tags": ["questions", "basics"] },
        { "title": "Gustar (Basic Usage)", "level": 1, "tags": ["verbs", "gustar", "basics"] },
        // Pre-Intermediate (Level 2)
        { "title": "Ser vs. Estar", "level": 2, "tags": ["verbs", "basics", "ser", "estar"] },
        { "title": "Present Tense: Stem-Changing Verbs (e>ie, o>ue)", "level": 2, "tags": ["verbs", "present tense", "irregular verbs", "stem-changing"] },
        { "title": "Present Tense: Irregular 'yo' Verbs (hacer, poner, salir, traer)", "level": 2, "tags": ["verbs", "present tense", "irregular verbs"] },
        { "title": "Present Tense: More Irregular Verbs (ir, dar, ver)", "level": 2, "tags": ["verbs", "present tense", "irregular verbs"] },
        { "title": "Possessive Adjectives (Short Form)", "level": 2, "tags": ["adjectives", "possessives"] },
        { "title": "Demonstrative Adjectives & Pronouns", "level": 2, "tags": ["adjectives", "pronouns", "demonstratives"] },
        { "title": "Direct Object Pronouns", "level": 2, "tags": ["pronouns", "objects"] },
        { "title": "Indirect Object Pronouns", "level": 2, "tags": ["pronouns", "objects"] },
        { "title": "Simple Future (ir + a + infinitive)", "level": 2, "tags": ["verbs", "future tense"] },
        { "title": "Present Progressive (estar + gerund)", "level": 2, "tags": ["verbs", "present tense", "progressive"] },
        { "title": "Preterite Tense: Regular Verbs", "level": 2, "tags": ["verbs", "past tense", "preterite", "regular verbs"] },
        { "title": "Preterite Tense: Ser & Ir", "level": 2, "tags": ["verbs", "past tense", "preterite", "irregular verbs"] },
        { "title": "Comparisons (Equality & Inequality)", "level": 2, "tags": ["adjectives", "adverbs", "comparisons"] },
        { "title": "Superlatives", "level": 2, "tags": ["adjectives", "adverbs", "superlatives"] },
        { "title": "Affirmative & Negative Words", "level": 2, "tags": ["negation", "affirmation", "adverbs"] },
        // Intermediate (Level 3)
        { "title": "Preterite vs. Imperfect", "level": 3, "tags": ["verbs", "past tense", "preterite", "imperfect"] },
        { "title": "Imperfect Tense: Regular & Irregular Verbs", "level": 3, "tags": ["verbs", "past tense", "imperfect"] },
        { "title": "Preterite Tense: Irregular Verbs (stem-changing, spelling changes)", "level": 3, "tags": ["verbs", "past tense", "preterite", "irregular verbs"] },
        { "title": "Reflexive Verbs", "level": 3, "tags": ["verbs", "reflexive"] },
        { "title": "Formal Commands (Usted/Ustedes)", "level": 3, "tags": ["verbs", "commands", "mood"] },
        { "title": "Informal Commands (Tú - Affirmative)", "level": 3, "tags": ["verbs", "commands", "mood"] },
        { "title": "Informal Commands (Tú - Negative)", "level": 3, "tags": ["verbs", "commands", "mood", "subjunctive"] },
        { "title": "Por vs. Para", "level": 3, "tags": ["prepositions", "por", "para"] },
        { "title": "Object Pronouns with Commands & Infinitives", "level": 3, "tags": ["pronouns", "objects", "commands"] },
        { "title": "Relative Pronouns (que, quien, lo que)", "level": 3, "tags": ["pronouns", "relative clauses"] },
        { "title": "Future Simple Tense (Regular & Irregular)", "level": 3, "tags": ["verbs", "future tense"] },
        { "title": "Conditional Simple Tense (Regular & Irregular)", "level": 3, "tags": ["verbs", "conditional", "mood"] },
        // Upper-Intermediate (Level 4)
        { "title": "Present Subjunctive (Formation & WEIRDO)", "level": 4, "tags": ["verbs", "subjunctive", "present tense", "mood"] },
        { "title": "Subjunctive with Impersonal Expressions", "level": 4, "tags": ["verbs", "subjunctive", "mood"] },
        { "title": "Subjunctive with Emotion, Doubt, Denial", "level": 4, "tags": ["verbs", "subjunctive", "mood"] },
        { "title": "Subjunctive vs. Indicative in Adjective Clauses", "level": 4, "tags": ["verbs", "subjunctive", "indicative", "relative clauses"] },
        { "title": "Subjunctive vs. Indicative in Adverbial Clauses (Time, Concession)", "level": 4, "tags": ["verbs", "subjunctive", "indicative", "adverbial clauses"] },
        { "title": "Imperfect Subjunctive", "level": 4, "tags": ["verbs", "subjunctive", "past tense", "mood"] },
        { "title": "Si Clauses (Hypothetical Situations)", "level": 4, "tags": ["verbs", "conditional", "subjunctive", "si clauses"] },
        { "title": "Passive Voice (ser + past participle)", "level": 4, "tags": ["verbs", "passive voice"] },
        { "title": "Passive Voice with 'se'", "level": 4, "tags": ["verbs", "passive voice", "se"] },
        { "title": "Perfect Tenses: Present Perfect", "level": 4, "tags": ["verbs", "perfect tenses", "present tense"] },
        { "title": "Perfect Tenses: Past Perfect (Pluperfect)", "level": 4, "tags": ["verbs", "perfect tenses", "past tense"] },
        // Advanced (Level 5)
        { "title": "Perfect Tenses: Future Perfect", "level": 5, "tags": ["verbs", "perfect tenses", "future tense"] },
        { "title": "Perfect Tenses: Conditional Perfect", "level": 5, "tags": ["verbs", "perfect tenses", "conditional"] },
        { "title": "Perfect Subjunctives (Present & Past)", "level": 5, "tags": ["verbs", "perfect tenses", "subjunctive"] },
        { "title": "Advanced Uses of 'Se'", "level": 5, "tags": ["verbs", "se", "impersonal", "passive"] },
        { "title": "Reported Speech (Indirect Discourse)", "level": 5, "tags": ["reported speech", "subjunctive", "indicative"] },
        { "title": "Advanced Prepositions & Conjunctions", "level": 5, "tags": ["prepositions", "conjunctions", "linking words"] },
        { "title": "Nuances of Por vs. Para", "level": 5, "tags": ["prepositions", "por", "para", "nuances"] },
        { "title": "Diminutives and Augmentatives", "level": 5, "tags": ["nouns", "suffixes", "vocabulary"] }
    ],
    "English": [
        // Beginner (Level 1)
        { "title": "Alphabet & Basic Phonics", "level": 1, "tags": ["basics", "pronunciation"] },
        { "title": "Subject Pronouns (I, you, he, she, it, we, they)", "level": 1, "tags": ["pronouns", "basics"] },
        { "title": "Verb 'to be' (Present Simple: am, is, are)", "level": 1, "tags": ["verbs", "basics", "present tense", "to be"] },
        { "title": "Basic Nouns (Singular & Plural)", "level": 1, "tags": ["nouns", "basics", "plural"] },
        { "title": "Articles (a, an, the)", "level": 1, "tags": ["articles", "basics"] },
        { "title": "Demonstratives (this, that, these, those)", "level": 1, "tags": ["demonstratives", "basics"] },
        { "title": "Present Simple (Affirmative, basic verbs like 'have', 'go', 'like')", "level": 1, "tags": ["verbs", "present tense", "basics"] },
        { "title": "Present Simple (Negative & Questions with 'do/does')", "level": 1, "tags": ["verbs", "present tense", "questions", "negation", "basics"] },
        { "title": "Basic Adjectives & Position", "level": 1, "tags": ["adjectives", "basics"] },
        { "title": "Possessive Adjectives (my, your, his, her, its, our, their)", "level": 1, "tags": ["possessives", "adjectives", "basics"] },
        { "title": "Numbers 0-100", "level": 1, "tags": ["numbers", "vocabulary", "basics"] },
        { "title": "Telling Time", "level": 1, "tags": ["time", "vocabulary", "basics"] },
        { "title": "Days, Months, Seasons", "level": 1, "tags": ["time", "vocabulary", "basics"] },
        { "title": "Basic Prepositions of Place (in, on, under, next to)", "level": 1, "tags": ["prepositions", "basics", "place"] },
        { "title": "Basic Prepositions of Time (at, in, on)", "level": 1, "tags": ["prepositions", "basics", "time"] },
        { "title": "There is / There are", "level": 1, "tags": ["structure", "basics"] },
        // Pre-Intermediate (Level 2)
        { "title": "Present Continuous (Formation & Use)", "level": 2, "tags": ["verbs", "present tense", "continuous"] },
        { "title": "Present Simple vs. Present Continuous", "level": 2, "tags": ["verbs", "present tense", "simple", "continuous"] },
        { "title": "Past Simple: Verb 'to be' (was, were)", "level": 2, "tags": ["verbs", "past tense", "to be"] },
        { "title": "Past Simple: Regular Verbs (-ed)", "level": 2, "tags": ["verbs", "past tense", "regular verbs"] },
        { "title": "Past Simple: Irregular Verbs (Common ones: go, have, eat, see)", "level": 2, "tags": ["verbs", "past tense", "irregular verbs"] },
        { "title": "Past Simple (Negative & Questions with 'did')", "level": 2, "tags": ["verbs", "past tense", "questions", "negation"] },
        { "title": "Countable & Uncountable Nouns", "level": 2, "tags": ["nouns", "countable", "uncountable"] },
        { "title": "Quantifiers (some, any, much, many, a lot of)", "level": 2, "tags": ["quantifiers", "nouns"] },
        { "title": "Object Pronouns (me, you, him, her, it, us, them)", "level": 2, "tags": ["pronouns", "objects"] },
        { "title": "Possessive Pronouns (mine, yours, his, hers, ours, theirs)", "level": 2, "tags": ["possessives", "pronouns"] },
        { "title": "Comparative Adjectives", "level": 2, "tags": ["adjectives", "comparisons"] },
        { "title": "Superlative Adjectives", "level": 2, "tags": ["adjectives", "superlatives"] },
        { "title": "Adverbs of Frequency (always, usually, often, sometimes, never)", "level": 2, "tags": ["adverbs", "frequency"] },
        { "title": "Modal Verbs: Can / Can't (Ability & Permission)", "level": 2, "tags": ["verbs", "modals", "can"] },
        { "title": "Modal Verbs: Could (Past Ability, Polite Request)", "level": 2, "tags": ["verbs", "modals", "could"] },
        { "title": "Future Simple: 'will' (Predictions, Spontaneous Decisions)", "level": 2, "tags": ["verbs", "future tense", "will"] },
        { "title": "Future Simple: 'be going to' (Plans, Intentions)", "level": 2, "tags": ["verbs", "future tense", "going to"] },
        // Intermediate (Level 3)
        { "title": "Present Perfect Simple (Formation & Use with 'for', 'since', 'ever', 'never')", "level": 3, "tags": ["verbs", "perfect tenses", "present tense"] },
        { "title": "Present Perfect vs. Past Simple", "level": 3, "tags": ["verbs", "perfect tenses", "past tense"] },
        { "title": "Present Perfect Continuous", "level": 3, "tags": ["verbs", "perfect tenses", "present tense", "continuous"] },
        { "title": "Past Continuous (Formation & Use)", "level": 3, "tags": ["verbs", "past tense", "continuous"] },
        { "title": "Past Continuous vs. Past Simple", "level": 3, "tags": ["verbs", "past tense", "continuous", "simple"] },
        { "title": "Past Perfect Simple", "level": 3, "tags": ["verbs", "perfect tenses", "past tense"] },
        { "title": "Gerunds & Infinitives (Basic Uses)", "level": 3, "tags": ["verbs", "gerunds", "infinitives"] },
        { "title": "Modal Verbs: Must / Have to (Obligation)", "level": 3, "tags": ["verbs", "modals", "must", "have to"] },
        { "title": "Modal Verbs: Should / Ought to (Advice)", "level": 3, "tags": ["verbs", "modals", "should", "ought to"] },
        { "title": "Modal Verbs: May / Might (Possibility)", "level": 3, "tags": ["verbs", "modals", "may", "might"] },
        { "title": "First Conditional (If + Present Simple, ... will + Base Verb)", "level": 3, "tags": ["conditionals", "if clauses"] },
        { "title": "Second Conditional (If + Past Simple, ... would + Base Verb)", "level": 3, "tags": ["conditionals", "if clauses"] },
        { "title": "Passive Voice (Present & Past Simple)", "level": 3, "tags": ["verbs", "passive voice"] },
        { "title": "Relative Clauses (who, which, that, whose)", "level": 3, "tags": ["relative clauses", "pronouns"] },
        { "title": "Reported Speech (Statements - Present & Past)", "level": 3, "tags": ["reported speech"] },
        // Upper-Intermediate (Level 4)
        { "title": "Past Perfect Continuous", "level": 4, "tags": ["verbs", "perfect tenses", "past tense", "continuous"] },
        { "title": "Future Continuous", "level": 4, "tags": ["verbs", "future tense", "continuous"] },
        { "title": "Future Perfect Simple", "level": 4, "tags": ["verbs", "perfect tenses", "future tense"] },
        { "title": "Third Conditional (If + Past Perfect, ... would have + Past Participle)", "level": 4, "tags": ["conditionals", "if clauses"] },
        { "title": "Mixed Conditionals", "level": 4, "tags": ["conditionals", "if clauses"] },
        { "title": "Passive Voice (All Tenses)", "level": 4, "tags": ["verbs", "passive voice"] },
        { "title": "Passive Voice with Modals", "level": 4, "tags": ["verbs", "passive voice", "modals"] },
        { "title": "Gerunds & Infinitives (Advanced Uses)", "level": 4, "tags": ["verbs", "gerunds", "infinitives"] },
        { "title": "Modal Verbs of Deduction (must be, might be, can't be)", "level": 4, "tags": ["verbs", "modals", "deduction"] },
        { "title": "Past Modals (should have, could have, might have)", "level": 4, "tags": ["verbs", "modals", "past"] },
        { "title": "Defining vs. Non-Defining Relative Clauses", "level": 4, "tags": ["relative clauses"] },
        { "title": "Reported Speech (Questions, Commands, Requests)", "level": 4, "tags": ["reported speech"] },
        { "title": "Emphasis (Cleft Sentences, Inversion)", "level": 4, "tags": ["syntax", "emphasis", "inversion"] },
        { "title": "Phrasal Verbs (Common)", "level": 4, "tags": ["verbs", "phrasal verbs", "vocabulary"] },
        // Advanced (Level 5)
        { "title": "Future Perfect Continuous", "level": 5, "tags": ["verbs", "perfect tenses", "future tense", "continuous"] },
        { "title": "Advanced Passive Structures (e.g., 'have something done')", "level": 5, "tags": ["verbs", "passive voice", "causative"] },
        { "title": "Wishes & Regrets ('I wish...', 'If only...')", "level": 5, "tags": ["conditionals", "subjunctive", "wishes"] },
        { "title": "Unreal Past (e.g., 'It's time you went')", "level": 5, "tags": ["subjunctive", "past tense", "unreal"] },
        { "title": "Advanced Conditionals (Implied, Inverted)", "level": 5, "tags": ["conditionals", "inversion"] },
        { "title": "Participle Clauses", "level": 5, "tags": ["clauses", "participles"] },
        { "title": "Advanced Use of Articles", "level": 5, "tags": ["articles", "nuances"] },
        { "title": "Determiners & Pronouns (Nuances)", "level": 5, "tags": ["determiners", "pronouns", "nuances"] },
        { "title": "Complex Prepositions & Conjunctions", "level": 5, "tags": ["prepositions", "conjunctions", "linking words"] },
        { "title": "Inversion with Negative Adverbials", "level": 5, "tags": ["syntax", "inversion", "adverbs"] },
        { "title": "Figurative Language & Idioms", "level": 5, "tags": ["vocabulary", "idioms", "figurative language"] },
        { "title": "Discourse Markers", "level": 5, "tags": ["linking words", "discourse markers", "cohesion"] }
    ],
    "French": [
        // Beginner (Level 1)
        { "title": "Alphabet & Pronunciation (Accents, Nasal Vowels)", "level": 1, "tags": ["basics", "pronunciation"] },
        { "title": "Subject Pronouns (Je, Tu, Il, Elle, On, Nous, Vous, Ils, Elles)", "level": 1, "tags": ["pronouns", "basics"] },
        { "title": "Definite Articles (le, la, l', les)", "level": 1, "tags": ["articles", "basics", "gender"] },
        { "title": "Indefinite Articles (un, une, des)", "level": 1, "tags": ["articles", "basics", "gender"] },
        { "title": "Noun Gender & Plural", "level": 1, "tags": ["nouns", "gender", "plural", "basics"] },
        { "title": "Present Tense: Être (To Be)", "level": 1, "tags": ["verbs", "basics", "present tense", "être"] },
        { "title": "Present Tense: Avoir (To Have)", "level": 1, "tags": ["verbs", "basics", "present tense", "avoir"] },
        { "title": "Present Tense: Regular -ER Verbs", "level": 1, "tags": ["verbs", "basics", "present tense", "regular verbs", "-er verbs"] },
        { "title": "Basic Adjective Agreement (Gender & Number)", "level": 1, "tags": ["adjectives", "agreement", "basics"] },
        { "title": "Basic Negation (ne...pas)", "level": 1, "tags": ["negation", "basics"] },
        { "title": "Basic Question Formation (Est-ce que, Inversion with 'il/elle')", "level": 1, "tags": ["questions", "basics"] },
        { "title": "Numbers 0-69", "level": 1, "tags": ["numbers", "vocabulary", "basics"] },
        { "title": "Telling Time", "level": 1, "tags": ["time", "vocabulary", "basics"] },
        { "title": "Days of the Week & Months", "level": 1, "tags": ["time", "vocabulary", "basics"] },
        { "title": "Present Tense: Aller (To Go)", "level": 1, "tags": ["verbs", "present tense", "irregular verbs", "aller"] },
        { "title": "Immediate Future (aller + infinitive)", "level": 1, "tags": ["verbs", "future tense", "aller"] },
        // Pre-Intermediate (Level 2)
        { "title": "Present Tense: Regular -IR Verbs", "level": 2, "tags": ["verbs", "present tense", "regular verbs", "-ir verbs"] },
        { "title": "Present Tense: Regular -RE Verbs", "level": 2, "tags": ["verbs", "present tense", "regular verbs", "-re verbs"] },
        { "title": "Partitive Articles (du, de la, de l', des)", "level": 2, "tags": ["articles", "partitive"] },
        { "title": "Contractions with à and de (au, aux, du, des)", "level": 2, "tags": ["articles", "prepositions", "contractions"] },
        { "title": "Possessive Adjectives (mon, ton, son...)", "level": 2, "tags": ["adjectives", "possessives"] },
        { "title": "Demonstrative Adjectives (ce, cet, cette, ces)", "level": 2, "tags": ["adjectives", "demonstratives"] },
        { "title": "Present Tense: Common Irregular Verbs (faire, vouloir, pouvoir, devoir)", "level": 2, "tags": ["verbs", "present tense", "irregular verbs"] },
        { "title": "Passé Composé with Avoir", "level": 2, "tags": ["verbs", "past tense", "passé composé", "avoir"] },
        { "title": "Passé Composé: Common Irregular Past Participles", "level": 2, "tags": ["verbs", "past tense", "passé composé", "irregular verbs"] },
        { "title": "Passé Composé with Être (DR MRS VANDERTRAMP)", "level": 2, "tags": ["verbs", "past tense", "passé composé", "être", "agreement"] },
        { "title": "Past Participle Agreement with Être Verbs", "level": 2, "tags": ["verbs", "past tense", "passé composé", "être", "agreement"] },
        { "title": "Direct Object Pronouns (le, la, les)", "level": 2, "tags": ["pronouns", "objects", "direct objects"] },
        { "title": "Indirect Object Pronouns (lui, leur)", "level": 2, "tags": ["pronouns", "objects", "indirect objects"] },
        { "title": "Placement of Object Pronouns (Present Tense)", "level": 2, "tags": ["pronouns", "objects", "syntax"] },
        { "title": "Comparative & Superlative Adjectives", "level": 2, "tags": ["adjectives", "comparisons", "superlatives"] },
        { "title": "Adverbs (Formation from Adjectives)", "level": 2, "tags": ["adverbs", "formation"] },
        // Intermediate (Level 3)
        { "title": "Imperfect Tense (L'imparfait)", "level": 3, "tags": ["verbs", "past tense", "imperfect"] },
        { "title": "Passé Composé vs. Imparfait", "level": 3, "tags": ["verbs", "past tense", "passé composé", "imperfect"] },
        { "title": "Reflexive Verbs (Present Tense)", "level": 3, "tags": ["verbs", "reflexive", "present tense"] },
        { "title": "Reflexive Verbs (Passé Composé)", "level": 3, "tags": ["verbs", "reflexive", "past tense", "passé composé", "être"] },
        { "title": "Pronoun 'y'", "level": 3, "tags": ["pronouns", "adverbial pronouns", "y"] },
        { "title": "Pronoun 'en'", "level": 3, "tags": ["pronouns", "adverbial pronouns", "en"] },
        { "title": "Order of Multiple Object Pronouns", "level": 3, "tags": ["pronouns", "objects", "syntax"] },
        { "title": "Future Simple Tense (Le Futur Simple)", "level": 3, "tags": ["verbs", "future tense"] },
        { "title": "Conditional Present Tense (Le Conditionnel Présent)", "level": 3, "tags": ["verbs", "conditional", "mood"] },
        { "title": "Relative Pronouns (qui, que, où)", "level": 3, "tags": ["pronouns", "relative clauses"] },
        { "title": "Relative Pronoun 'dont'", "level": 3, "tags": ["pronouns", "relative clauses", "dont"] },
        { "title": "Commands (L'impératif - tu, nous, vous)", "level": 3, "tags": ["verbs", "commands", "mood"] },
        { "title": "Commands with Object Pronouns", "level": 3, "tags": ["verbs", "commands", "pronouns", "objects"] },
        { "title": "Present Subjunctive (Formation & Basic Uses - il faut que, vouloir que)", "level": 3, "tags": ["verbs", "subjunctive", "present tense", "mood"] },
        // Upper-Intermediate (Level 4)
        { "title": "Subjunctive Uses (Doubt, Emotion, Opinion)", "level": 4, "tags": ["verbs", "subjunctive", "mood"] },
        { "title": "Subjunctive after Certain Conjunctions (avant que, pour que, bien que...)", "level": 4, "tags": ["verbs", "subjunctive", "conjunctions"] },
        { "title": "Subjunctive vs. Indicative", "level": 4, "tags": ["verbs", "subjunctive", "indicative", "mood"] },
        { "title": "Past Subjunctive (Subjonctif Passé)", "level": 4, "tags": ["verbs", "subjunctive", "past tense", "mood"] },
        { "title": "Si Clauses (Hypotheticals - Present, Past, Future)", "level": 4, "tags": ["conditionals", "if clauses", "subjunctive", "indicative"] },
        { "title": "Passive Voice (La Voix Passive)", "level": 4, "tags": ["verbs", "passive voice"] },
        { "title": "Causative 'Faire' (Faire + Infinitive)", "level": 4, "tags": ["verbs", "causative", "faire"] },
        { "title": "Gerund (Le Gérondif - en + -ant)", "level": 4, "tags": ["verbs", "participles", "gerund"] },
        { "title": "Present Participle (Le Participe Présent)", "level": 4, "tags": ["verbs", "participles"] },
        { "title": "Plus-que-parfait (Pluperfect Tense)", "level": 4, "tags": ["verbs", "past tense", "perfect tenses"] },
        { "title": "Conditional Past Tense (Le Conditionnel Passé)", "level": 4, "tags": ["verbs", "conditional", "past tense", "mood"] },
        { "title": "Advanced Relative Pronouns (lequel, auquel, duquel)", "level": 4, "tags": ["pronouns", "relative clauses", "lequel"] },
        { "title": "Disjunctive Pronouns (moi, toi, lui, elle...)", "level": 4, "tags": ["pronouns", "disjunctive"] },
        // Advanced (Level 5)
        { "title": "Future Perfect Tense (Le Futur Antérieur)", "level": 5, "tags": ["verbs", "future tense", "perfect tenses"] },
        { "title": "Imperfect Subjunctive (Subjonctif Imparfait - Literary)", "level": 5, "tags": ["verbs", "subjunctive", "past tense", "literary"] },
        { "title": "Pluperfect Subjunctive (Subjonctif Plus-que-parfait - Literary)", "level": 5, "tags": ["verbs", "subjunctive", "past tense", "perfect tenses", "literary"] },
        { "title": "Past Conditional - Second Form (Literary)", "level": 5, "tags": ["verbs", "conditional", "past tense", "literary"] },
        { "title": "Simple Past Tense (Le Passé Simple - Literary)", "level": 5, "tags": ["verbs", "past tense", "literary"] },
        { "title": "Advanced Uses of Subjunctive", "level": 5, "tags": ["verbs", "subjunctive", "nuances"] },
        { "title": "Inversion in Questions & Statements (Advanced)", "level": 5, "tags": ["syntax", "questions", "inversion"] },
        { "title": "Prepositions with Geographical Names", "level": 5, "tags": ["prepositions", "geography"] },
        { "title": "Verbs followed by à vs. de vs. no preposition", "level": 5, "tags": ["verbs", "prepositions", "syntax"] },
        { "title": "Reported Speech (Le Discours Indirect)", "level": 5, "tags": ["reported speech", "syntax"] },
        { "title": "Nuances of Pronoun Usage (y, en, object pronouns)", "level": 5, "tags": ["pronouns", "nuances"] },
        { "title": "Idiomatic Expressions & Figures of Speech", "level": 5, "tags": ["vocabulary", "idioms", "figurative language"] }
    ],
    "Italian": [
        // Beginner (Level 1 - A1 equivalent)
        { "title": "Alphabet & Pronunciation (Alfabeto e Pronuncia)", "level": 1, "tags": ["basics", "pronunciation", "alphabet"] },
        { "title": "Definite Articles (Articoli Determinativi - il, lo, la, i, gli, le)", "level": 1, "tags": ["basics", "articles", "definite articles", "gender", "number"] },
        { "title": "Indefinite Articles (Articoli Indeterminativi - un, uno, una, un')", "level": 1, "tags": ["basics", "articles", "indefinite articles", "gender"] },
        { "title": "Nouns: Gender & Number (Nomi: Genere e Numero)", "level": 1, "tags": ["basics", "nouns", "gender", "number"] },
        { "title": "Subject Pronouns (Pronomi Soggetto - io, tu, lui/lei/Lei, noi, voi, loro)", "level": 1, "tags": ["basics", "pronouns", "subject pronouns"] },
        { "title": "Present Tense: Essere (Essere - Presente Indicativo)", "level": 1, "tags": ["basics", "verbs", "present tense", "essere", "to be"] },
        { "title": "Present Tense: Avere (Avere - Presente Indicativo)", "level": 1, "tags": ["basics", "verbs", "present tense", "avere", "to have"] },
        { "title": "Present Tense: Regular -ARE Verbs (Verbi Regolari in -ARE)", "level": 1, "tags": ["basics", "verbs", "present tense", "regular verbs", "-are verbs"] },
        { "title": "Adjectives: Agreement (Aggettivi: Accordo)", "level": 1, "tags": ["basics", "adjectives", "agreement", "gender", "number"] },
        { "title": "Basic Negation (Non)", "level": 1, "tags": ["basics", "negation", "non"] },
        { "title": "Basic Question Formation", "level": 1, "tags": ["basics", "questions"] },
        { "title": "Numbers 0-100 (Numeri)", "level": 1, "tags": ["basics", "numbers", "vocabulary"] },
        { "title": "Telling Time (Dire l'ora)", "level": 1, "tags": ["basics", "time", "vocabulary"] },
        { "title": "Days, Months, Seasons (Giorni, Mesi, Stagioni)", "level": 1, "tags": ["basics", "time", "vocabulary"] },
        { "title": "Prepositions: di, a, da, in, con, su, per, tra/fra (Preposizioni Semplici)", "level": 1, "tags": ["basics", "prepositions"] },
        // Pre-Intermediate (Level 2 - A2 equivalent)
        { "title": "Present Tense: Regular -ERE Verbs (Verbi Regolari in -ERE)", "level": 2, "tags": ["verbs", "present tense", "regular verbs", "-ere verbs"] },
        { "title": "Present Tense: Regular -IRE Verbs (Verbi Regolari in -IRE, tipo 'dormire')", "level": 2, "tags": ["verbs", "present tense", "regular verbs", "-ire verbs"] },
        { "title": "Present Tense: -IRE Verbs with -isc- (tipo 'finire')", "level": 2, "tags": ["verbs", "present tense", "irregular verbs", "-ire verbs", "-isc verbs"] },
        { "title": "Articulated Prepositions (Preposizioni Articolate)", "level": 2, "tags": ["prepositions", "articles", "contractions"] },
        { "title": "Possessive Adjectives & Pronouns (Aggettivi e Pronomi Possessivi)", "level": 2, "tags": ["adjectives", "pronouns", "possessives"] },
        { "title": "Demonstrative Adjectives & Pronouns (Aggettivi e Pronomi Dimostrativi - questo, quello)", "level": 2, "tags": ["adjectives", "pronouns", "demonstratives"] },
        { "title": "Common Irregular Verbs (Present Tense: andare, venire, fare, dire, potere, volere, dovere)", "level": 2, "tags": ["verbs", "present tense", "irregular verbs"] },
        { "title": "Passato Prossimo (Past Tense with Avere & Essere)", "level": 2, "tags": ["verbs", "past tense", "passato prossimo", "avere", "essere"] },
        { "title": "Passato Prossimo: Irregular Past Participles", "level": 2, "tags": ["verbs", "past tense", "passato prossimo", "irregular verbs", "past participles"] },
        { "title": "Agreement of Past Participle with Essere", "level": 2, "tags": ["verbs", "past tense", "passato prossimo", "essere", "agreement"] },
        { "title": "Direct Object Pronouns (Pronomi Oggetto Diretto - mi, ti, lo, la, ci, vi, li, le)", "level": 2, "tags": ["pronouns", "object pronouns", "direct objects"] },
        { "title": "Indirect Object Pronouns (Pronomi Oggetto Indiretto - mi, ti, gli, le, ci, vi, gli)", "level": 2, "tags": ["pronouns", "object pronouns", "indirect objects"] },
        { "title": "Placement of Object Pronouns (Present Tense & Passato Prossimo)", "level": 2, "tags": ["pronouns", "object pronouns", "syntax"] },
        { "title": "Reflexive Verbs (Verbi Riflessivi - Present Tense)", "level": 2, "tags": ["verbs", "reflexive", "present tense"] },
        { "title": "Adverbs of Frequency (Avverbi di Frequenza)", "level": 2, "tags": ["adverbs", "frequency"] },
        { "title": "Ci (there, about it)", "level": 2, "tags": ["particles", "adverbial particles", "ci"] },
        { "title": "Ne (of it/them, some)", "level": 2, "tags": ["particles", "partitive", "ne"] },
        // Intermediate (Level 3 - B1 equivalent)
        { "title": "Imperfect Tense (Imperfetto Indicativo)", "level": 3, "tags": ["verbs", "past tense", "imperfetto"] },
        { "title": "Passato Prossimo vs. Imperfetto", "level": 3, "tags": ["verbs", "past tense", "passato prossimo", "imperfetto", "usage"] },
        { "title": "Future Simple Tense (Futuro Semplice)", "level": 3, "tags": ["verbs", "future tense", "futuro semplice"] },
        { "title": "Conditional Present Tense (Condizionale Presente)", "level": 3, "tags": ["verbs", "conditional", "condizionale presente", "mood"] },
        { "title": "Reflexive Verbs (Passato Prossimo)", "level": 3, "tags": ["verbs", "reflexive", "past tense", "passato prossimo"] },
        { "title": "Double Object Pronouns (Pronomi Combinati)", "level": 3, "tags": ["pronouns", "object pronouns", "combined pronouns"] },
        { "title": "Comparatives & Superlatives (Comparativi e Superlativi)", "level": 3, "tags": ["adjectives", "adverbs", "comparisons", "superlatives"] },
        { "title": "Relative Pronouns (Pronomi Relativi - che, cui, il quale)", "level": 3, "tags": ["pronouns", "relative clauses", "che", "cui"] },
        { "title": "Present Subjunctive (Congiuntivo Presente - Formation)", "level": 3, "tags": ["verbs", "subjunctive", "congiuntivo presente", "mood"] },
        { "title": "Uses of Present Subjunctive (Opinions, Desires, Doubts)", "level": 3, "tags": ["verbs", "subjunctive", "congiuntivo presente", "usage"] },
        { "title": "Impersonal Form with 'si' (Forma Impersonale con 'si')", "level": 3, "tags": ["verbs", "impersonal", "si"] },
        { "title": "Passive Form with 'essere' (Forma Passiva con 'essere')", "level": 3, "tags": ["verbs", "passive voice", "essere"] },
        { "title": "Stare + Gerund (Progressive Form)", "level": 3, "tags": ["verbs", "progressive", "stare", "gerund"] },
        // Upper-Intermediate (Level 4 - B2 equivalent)
        { "title": "Past Perfect / Pluperfect (Trapassato Prossimo)", "level": 4, "tags": ["verbs", "past tense", "perfect tenses", "trapassato prossimo"] },
        { "title": "Future Perfect (Futuro Anteriore)", "level": 4, "tags": ["verbs", "future tense", "perfect tenses", "futuro anteriore"] },
        { "title": "Past Conditional (Condizionale Passato)", "level": 4, "tags": ["verbs", "conditional", "past tense", "condizionale passato", "mood"] },
        { "title": "Imperfect Subjunctive (Congiuntivo Imperfetto)", "level": 4, "tags": ["verbs", "subjunctive", "past tense", "congiuntivo imperfetto", "mood"] },
        { "title": "Past Subjunctive (Congiuntivo Passato)", "level": 4, "tags": ["verbs", "subjunctive", "past tense", "congiuntivo passato", "mood"] },
        { "title": "Pluperfect Subjunctive (Congiuntivo Trapassato)", "level": 4, "tags": ["verbs", "subjunctive", "past tense", "perfect tenses", "congiuntivo trapassato", "mood"] },
        { "title": "Hypothetical Sentences / Si Clauses (Periodo Ipotetico - all types)", "level": 4, "tags": ["conditionals", "if clauses", "subjunctive", "indicative", "periodo ipotetico"] },
        { "title": "Sequence of Tenses (Concordanza dei Tempi - Indicative & Subjunctive)", "level": 4, "tags": ["syntax", "sequence of tenses", "indicative", "subjunctive"] },
        { "title": "Passive Form with 'venire' & 'andare' (Forma Passiva con 'venire' e 'andare')", "level": 4, "tags": ["verbs", "passive voice", "venire", "andare"] },
        { "title": "Si Passivante (Passive 'si')", "level": 4, "tags": ["verbs", "passive voice", "si"] },
        { "title": "Discourse Markers (Congiunzioni e Connettivi Complessi)", "level": 4, "tags": ["conjunctions", "linking words", "discourse markers"] },
        { "title": "Reported Speech (Discorso Indiretto - Statements, Questions, Commands)", "level": 4, "tags": ["reported speech", "syntax"] },
        // Advanced (Level 5 - C1/C2 equivalent)
        { "title": "Remote Past / Passato Remoto (Passato Remoto Indicativo)", "level": 5, "tags": ["verbs", "past tense", "passato remoto", "literary"] },
        { "title": "Trapassato Remoto (Literary Past Tense)", "level": 5, "tags": ["verbs", "past tense", "perfect tenses", "trapassato remoto", "literary"] },
        { "title": "Advanced Uses of Subjunctive (Concessive, Purpose, etc.)", "level": 5, "tags": ["verbs", "subjunctive", "nuances", "advanced"] },
        { "title": "Implicit Subjunctive (Infinitives, Gerunds, Participles)", "level": 5, "tags": ["verbs", "subjunctive", "infinitive", "gerund", "participle", "implicit forms"] },
        { "title": "Subjunctive in Independent Clauses", "level": 5, "tags": ["verbs", "subjunctive", "independent clauses", "wishes", "commands"] },
        { "title": "Gerunds & Participles (Advanced Uses)", "level": 5, "tags": ["verbs", "gerund", "participle", "clauses"] },
        { "title": "Causative 'Fare' (Fare + Infinitive)", "level": 5, "tags": ["verbs", "causative", "fare"] },
        { "title": "Periphrastic Constructions (Costruzioni Perifrastiche)", "level": 5, "tags": ["verbs", "periphrasis", "aspect"] },
        { "title": "Figurative Language & Idioms (Linguaggio Figurato e Modi di Dire)", "level": 5, "tags": ["vocabulary", "idioms", "figurative language"] },
        { "title": "Formal vs. Informal Registers (Registri Formali e Informali)", "level": 5, "tags": ["style", "register", "formal language", "informal language"] },
        { "title": "Nominalization (Nominalizzazione - transforming verbs/adjectives into nouns)", "level": 5, "tags": ["syntax", "nominalization", "word formation"] },
        { "title": "Historical Development of Italian Grammar (Cenni di Grammatica Storica)", "level": 5, "tags": ["linguistics", "grammar history", "historical grammar"] }
    ],
    "Japanese": [
        // Beginner (Level 1 - N5 equivalent)
        { "title": "Hiragana & Katakana Writing Systems", "level": 1, "tags": ["basics", "writing system", "hiragana", "katakana"] },
        { "title": "Basic Greetings & Phrases", "level": 1, "tags": ["basics", "phrases", "vocabulary"] },
        { "title": "Introduction to Kanji (Simple Radicals & Numbers)", "level": 1, "tags": ["basics", "writing system", "kanji"] },
        { "title": "Noun Sentences (X は Y です - X wa Y desu)", "level": 1, "tags": ["basics", "sentence structure", "particles", "wa", "desu"] },
        { "title": "Particles: は (wa), も (mo)", "level": 1, "tags": ["basics", "particles", "wa", "mo"] },
        { "title": "Particles: の (no - possessive)", "level": 1, "tags": ["basics", "particles", "no", "possessive"] },
        { "title": "Demonstratives: これ/それ/あれ (kore/sore/are), この/その/あの (kono/sono/ano)", "level": 1, "tags": ["basics", "demonstratives", "pronouns"] },
        { "title": "Particles: か (ka - question marker)", "level": 1, "tags": ["basics", "particles", "ka", "questions"] },
        { "title": "Introduction to Verbs (-masu form)", "level": 1, "tags": ["verbs", "basics", "masu form", "present tense"] },
        { "title": "Verb Tenses: Present/Future Affirmative & Negative (-masu, -masen)", "level": 1, "tags": ["verbs", "basics", "masu form", "present tense", "negation"] },
        { "title": "Verb Tenses: Past Affirmative & Negative (-mashita, -masendeshita)", "level": 1, "tags": ["verbs", "basics", "masu form", "past tense"] },
        { "title": "Particles: を (o - direct object)", "level": 1, "tags": ["basics", "particles", "o", "objects"] },
        { "title": "Particles: に (ni - location, time)", "level": 1, "tags": ["basics", "particles", "ni", "location", "time"] },
        { "title": "Particles: へ (e - direction)", "level": 1, "tags": ["basics", "particles", "e", "direction"] },
        { "title": "Particles: で (de - location of action, means)", "level": 1, "tags": ["basics", "particles", "de", "location", "means"] },
        { "title": "Inviting Someone (~masen ka, ~mashou)", "level": 1, "tags": ["verbs", "invitations", "phrases"] },
        { "title": "Introduction to Adjectives: い-adjectives (i-adjectives)", "level": 1, "tags": ["adjectives", "basics", "i-adjectives"] },
        { "title": "Introduction to Adjectives: な-adjectives (na-adjectives)", "level": 1, "tags": ["adjectives", "basics", "na-adjectives"] },
        { "title": "Adjective Usage (Present & Past, Affirmative & Negative)", "level": 1, "tags": ["adjectives", "conjugation", "tense"] },
        { "title": "Particle: が (ga - subject marker, 'but')", "level": 1, "tags": ["basics", "particles", "ga", "subject"] },
        { "title": "Counting (Basic Counters)", "level": 1, "tags": ["numbers", "counters", "vocabulary"] },
        // Pre-Intermediate (Level 2 - N4 equivalent)
        { "title": "Verb Plain Form (Dictionary Form)", "level": 2, "tags": ["verbs", "plain form", "dictionary form"] },
        { "title": "Verb Plain Form (Past - ta form)", "level": 2, "tags": ["verbs", "plain form", "ta form", "past tense"] },
        { "title": "Verb Plain Form (Negative - nai form)", "level": 2, "tags": ["verbs", "plain form", "nai form", "negation"] },
        { "title": "Verb Plain Form (Past Negative - nakatta form)", "level": 2, "tags": ["verbs", "plain form", "nakatta form", "past tense", "negation"] },
        { "title": "Using Plain Forms in Sentences (with と思います to omou, etc.)", "level": 2, "tags": ["verbs", "plain form", "reported speech", "opinion"] },
        { "title": "Verb て-form (te-form) & Basic Uses (requests, linking actions)", "level": 2, "tags": ["verbs", "te form", "requests", "linking verbs"] },
        { "title": "Using ている (te iru - present progressive, state)", "level": 2, "tags": ["verbs", "te form", "progressive", "state"] },
        { "title": "Permission (~te mo ii desu ka)", "level": 2, "tags": ["verbs", "te form", "permission"] },
        { "title": "Prohibition (~te wa ikemasen)", "level": 2, "tags": ["verbs", "te form", "prohibition"] },
        { "title": "Listing Actions (~tari ~tari suru)", "level": 2, "tags": ["verbs", "ta form", "listing actions"] },
        { "title": "Giving & Receiving Verbs (あげる ageru, くれる kureru, もらう morau)", "level": 2, "tags": ["verbs", "giving", "receiving"] },
        { "title": "Potential Form (Can do - ~eru/~rareru)", "level": 2, "tags": ["verbs", "potential form", "ability"] },
        { "title": "Expressing Experience (~ta koto ga aru)", "level": 2, "tags": ["verbs", "ta form", "experience"] },
        { "title": "Comparisons (より yori, のほうが no hou ga)", "level": 2, "tags": ["comparisons", "adjectives", "particles"] },
        { "title": "Expressing 'Want' (たい tai form, ほしい hoshii)", "level": 2, "tags": ["verbs", "adjectives", "desire", "tai form"] },
        { "title": "Conditional: と (to - natural consequence)", "level": 2, "tags": ["conditionals", "particles", "to"] },
        { "title": "Conditional: たら (tara - general condition/if)", "level": 2, "tags": ["conditionals", "ta form", "tara"] },
        { "title": "Adjective て-form (くて kute, で de)", "level": 2, "tags": ["adjectives", "te form", "linking adjectives"] },
        { "title": "Adverbs from Adjectives", "level": 2, "tags": ["adjectives", "adverbs", "formation"] },
        // Intermediate (Level 3 - N3 equivalent)
        { "title": "Volitional Form (~ou/~you) & Uses", "level": 3, "tags": ["verbs", "volitional form", "suggestion", "intention"] },
        { "title": "Expressing Obligation (~nakereba naranai/ikemasen)", "level": 3, "tags": ["verbs", "nai form", "obligation"] },
        { "title": "Expressing 'Looks Like' / Hearsay (そうだ sou da)", "level": 3, "tags": ["grammar points", "hearsay", "appearance", "sou da"] },
        { "title": "Expressing 'Seems Like' (ようだ you da, みたいだ mitai da)", "level": 3, "tags": ["grammar points", "similarity", "appearance", "you da", "mitai da"] },
        { "title": "Expressing 'Intend To' (つもり tsumori)", "level": 3, "tags": ["grammar points", "intention", "tsumori"] },
        { "title": "Passive Form (~(r)areru)", "level": 3, "tags": ["verbs", "passive voice"] },
        { "title": "Causative Form (~(s)aseru)", "level": 3, "tags": ["verbs", "causative"] },
        { "title": "Causative-Passive Form (~(s)aserareru)", "level": 3, "tags": ["verbs", "causative", "passive voice"] },
        { "title": "Conditional: ば (ba - hypothetical)", "level": 3, "tags": ["conditionals", "ba form"] },
        { "title": "Conditional: なら (nara - contextual condition)", "level": 3, "tags": ["conditionals", "nara"] },
        { "title": "Expressing 'Easy/Hard To Do' (~yasui, ~nikui)", "level": 3, "tags": ["verbs", "suffixes", "yasui", "nikui"] },
        { "title": "Expressing 'Only' (だけ dake, しか~ない shika...nai)", "level": 3, "tags": ["particles", "adverbs", "restriction", "dake", "shikanai"] },
        { "title": "Purpose (~ni iku/kuru/kaeru)", "level": 3, "tags": ["verbs", "particles", "purpose", "ni"] },
        { "title": "Making Requests (Polite Forms - ~te itadakemasen ka)", "level": 3, "tags": ["verbs", "te form", "requests", "politeness"] },
        { "title": "Formal Language Introduction (Keigo Basics - Sonkeigo, Kenjougo)", "level": 3, "tags": ["keigo", "politeness", "formal language", "sonkeigo", "kenjougo"] },
        // Upper-Intermediate (Level 4 - N2 equivalent)
        { "title": "Advanced Keigo (Honorific & Humble Speech)", "level": 4, "tags": ["keigo", "politeness", "formal language", "sonkeigo", "kenjougo"] },
        { "title": "Expressing 'Supposed To' / 'Should' (はず hazu, べき beki)", "level": 4, "tags": ["grammar points", "expectation", "obligation", "hazu", "beki"] },
        { "title": "Expressing 'Just Finished' (~ta bakari)", "level": 4, "tags": ["verbs", "ta form", "immediacy", "bakari"] },
        { "title": "Expressing 'Not Necessarily' (わけではない wake de wa nai)", "level": 4, "tags": ["grammar points", "negation", "partial negation", "wake"] },
        { "title": "Expressing 'It Means That...' (という ことだ to iu koto da)", "level": 4, "tags": ["grammar points", "explanation", "conclusion", "koto"] },
        { "title": "Expressing 'According To' (~ni yoru to)", "level": 4, "tags": ["grammar points", "source", "ni yoru to"] },
        { "title": "Expressing 'Instead Of' (かわりに kawari ni)", "level": 4, "tags": ["grammar points", "substitution", "kawari ni"] },
        { "title": "Expressing 'Even If' (~te mo / ~de mo)", "level": 4, "tags": ["conditionals", "concession", "te mo"] },
        { "title": "Expressing 'While' / 'During' (あいだに aida ni, うちに uchi ni)", "level": 4, "tags": ["grammar points", "time", "concurrency", "aida", "uchi"] },
        { "title": "Expressing 'Tendency To' (~gachi)", "level": 4, "tags": ["suffixes", "tendency", "gachi"] },
        { "title": "Expressing 'Looks Like' (Advanced - ~rashii)", "level": 4, "tags": ["grammar points", "hearsay", "appearance", "rashii"] },
        { "title": "Nominalization (こと koto, の no)", "level": 4, "tags": ["grammar points", "nominalization", "koto", "no"] },
        { "title": "Various Uses of まま (mama - as is)", "level": 4, "tags": ["grammar points", "state", "mama"] },
        // Advanced (Level 5 - N1 equivalent)
        { "title": "Advanced Passive & Causative Nuances", "level": 5, "tags": ["verbs", "passive voice", "causative", "nuances"] },
        { "title": "Complex Conditionals & Nuances (ba, tara, nara, to)", "level": 5, "tags": ["conditionals", "nuances"] },
        { "title": "Expressing 'No Choice But To' (~zaru o enai)", "level": 5, "tags": ["grammar points", "obligation", "necessity", "zaru o enai"] },
        { "title": "Expressing 'On The Verge Of' (~sou ni naru)", "level": 5, "tags": ["grammar points", "imminence", "sou ni naru"] },
        { "title": "Expressing 'Cannot Help But' (~te tamaranai, ~te shouganai)", "level": 5, "tags": ["grammar points", "emotion", "compulsion"] },
        { "title": "Expressing 'From The Standpoint Of' (~kara sureba / ~kara miru to)", "level": 5, "tags": ["grammar points", "perspective"] },
        { "title": "Expressing 'Not Only... But Also' (~bakari ka)", "level": 5, "tags": ["grammar points", "addition", "bakari ka"] },
        { "title": "Expressing 'Contrary To Expectations' (~ni hanshite)", "level": 5, "tags": ["grammar points", "contrast", "expectation"] },
        { "title": "Nuances of Quotation (と to, って tte)", "level": 5, "tags": ["particles", "quotation", "nuances"] },
        { "title": "Classical Japanese Grammar Elements (Archaic Forms)", "level": 5, "tags": ["classical japanese", "literary", "grammar history"] },
        { "title": "Onomatopoeia & Mimetic Words (Giongo & Gitaigo)", "level": 5, "tags": ["vocabulary", "onomatopoeia", "mimetic words"] },
        { "title": "Advanced Discourse Markers & Connectives", "level": 5, "tags": ["discourse markers", "conjunctions", "linking words"] }
    ],
    "Korean": [
        // Beginner (Level 1 - TOPIK 1 equivalent)
        { "title": "Hangul: Vowels & Consonants (한글)", "level": 1, "tags": ["basics", "writing system", "hangul"] },
        { "title": "Syllable Structure & Pronunciation Rules", "level": 1, "tags": ["basics", "pronunciation", "hangul"] },
        { "title": "Basic Greetings & Introductions", "level": 1, "tags": ["basics", "phrases", "vocabulary"] },
        { "title": "Basic Sentence Structure (SOV)", "level": 1, "tags": ["basics", "sentence structure"] },
        { "title": "이에요/예요 (ieyo/yeyo - 'to be' Noun Endings)", "level": 1, "tags": ["basics", "verbs", "to be", "politeness"] },
        { "title": "Topic Marker 은/는 (eun/neun)", "level": 1, "tags": ["basics", "particles", "topic marker"] },
        { "title": "Subject Marker 이/가 (i/ga)", "level": 1, "tags": ["basics", "particles", "subject marker"] },
        { "title": "Object Marker 을/를 (eul/reul)", "level": 1, "tags": ["basics", "particles", "object marker"] },
        { "title": "Location Particles 에/에서 (e/eseo)", "level": 1, "tags": ["basics", "particles", "location"] },
        { "title": "Possessive Particle 의 (ui)", "level": 1, "tags": ["basics", "particles", "possessive"] },
        { "title": "Numbers (Sino-Korean & Native Korean)", "level": 1, "tags": ["basics", "numbers", "vocabulary"] },
        { "title": "Present Tense Verb Ending (아요/어요 - ayo/eoyo)", "level": 1, "tags": ["basics", "verbs", "present tense", "politeness"] },
        { "title": "Present Tense: 있다/없다 (itta/eopta - to have/not have, to be/not be at location)", "level": 1, "tags": ["basics", "verbs", "existence", "possession"] },
        { "title": "Past Tense Verb Ending (았어요/었어요 - asseoyo/eosseoyo)", "level": 1, "tags": ["basics", "verbs", "past tense", "politeness"] },
        { "title": "Basic Conjunction 'and': 하고/-(이)랑 (hago/-(i)rang)", "level": 1, "tags": ["basics", "conjunctions", "and"] },
        { "title": "Asking Questions (using intonation, question words)", "level": 1, "tags": ["basics", "questions"] },
        { "title": "Demonstratives: 이/그/저 (i/geu/jeo)", "level": 1, "tags": ["basics", "demonstratives"] },
        // Pre-Intermediate (Level 2 - TOPIK 2 equivalent)
        { "title": "Future Tense: -(으)ㄹ 거예요 (-(eu)l geoyeyo)", "level": 2, "tags": ["verbs", "future tense", "politeness"] },
        { "title": "Conjunction 'and/with': 와/과 (wa/gwa)", "level": 2, "tags": ["conjunctions", "particles", "and", "with"] },
        { "title": "Conjunction 'so/therefore': 그래서 (geuraeseo), -(아/어)서 (-(a/eo)seo)", "level": 2, "tags": ["conjunctions", "reason", "linking verbs"] },
        { "title": "Conjunction 'but': 그렇지만 (geureochiman), -지만 (-jiman)", "level": 2, "tags": ["conjunctions", "contrast", "linking verbs"] },
        { "title": "Ability/Inability: -(으)ㄹ 수 있다/없다 (-(eu)l su itta/eopta)", "level": 2, "tags": ["verbs", "ability", "potential"] },
        { "title": "Making Requests: -(아/어) 주세요 (-(a/eo) juseyo)", "level": 2, "tags": ["verbs", "requests", "politeness"] },
        { "title": "Expressing 'Want': -고 싶다 (-go sipda)", "level": 2, "tags": ["verbs", "desire", "want"] },
        { "title": "Time Particle 에 (e)", "level": 2, "tags": ["particles", "time"] },
        { "title": "Particles 'from/to': 에서/까지 (eseo/kkaji), 부터/까지 (buteo/kkaji)", "level": 2, "tags": ["particles", "range", "time", "location"] },
        { "title": "Particle 'to (a person)': 한테/에게 (hante/ege)", "level": 2, "tags": ["particles", "recipient"] },
        { "title": "Particle 'from (a person)': 한테서/에게서 (hanteseo/egeseo)", "level": 2, "tags": ["particles", "source"] },
        { "title": "Irregular Verbs (ㅂ, ㄷ, ㅅ, ㅎ, 르)", "level": 2, "tags": ["verbs", "conjugation", "irregular verbs"] },
        { "title": "Comparing: 보다 (boda)", "level": 2, "tags": ["comparisons", "particles"] },
        { "title": "Adjective Modifier Form -(으)ㄴ (-(eu)n)", "level": 2, "tags": ["adjectives", "modification", "relative clauses"] },
        { "title": "Verb Modifier Form -는 (-neun - present)", "level": 2, "tags": ["verbs", "modification", "relative clauses", "present tense"] },
        { "title": "Verb Modifier Form -(으)ㄴ (-(eu)n - past)", "level": 2, "tags": ["verbs", "modification", "relative clauses", "past tense"] },
        { "title": "Negative Commands: -지 마세요 (-ji maseyo)", "level": 2, "tags": ["verbs", "commands", "negation", "politeness"] },
        { "title": "Counters & Units", "level": 2, "tags": ["numbers", "counters", "vocabulary"] },
        // Intermediate (Level 3 - TOPIK 3 equivalent)
        { "title": "Honorifics Basics: -(으)시- (-(eu)si-)", "level": 3, "tags": ["politeness", "honorifics", "verbs", "adjectives"] },
        { "title": "Honorific Nouns & Verbs (Special Forms)", "level": 3, "tags": ["politeness", "honorifics", "vocabulary"] },
        { "title": "Connecting Sentences: -고 (-go - and)", "level": 3, "tags": ["conjunctions", "linking verbs", "and"] },
        { "title": "Connecting Sentences: -(으)며 (-(eu)myeo - and/while)", "level": 3, "tags": ["conjunctions", "linking verbs", "and", "while"] },
        { "title": "Expressing Purpose: -(으)러 가다/오다 (-(eu)reo gada/oda)", "level": 3, "tags": ["verbs", "purpose", "movement verbs"] },
        { "title": "Expressing Purpose: -기 위해서 (-gi wihaeseo)", "level": 3, "tags": ["grammar points", "purpose", "reason"] },
        { "title": "Expressing Reason: -기 때문에 (-gi ttaemune)", "level": 3, "tags": ["grammar points", "reason", "cause"] },
        { "title": "Expressing Decision/Plan: -(으)려고 하다 (-(eu)ryeogo hada)", "level": 3, "tags": ["verbs", "intention", "plan"] },
        { "title": "Conditional 'if': -(으)면 (-(eu)myeon)", "level": 3, "tags": ["conditionals", "if clauses"] },
        { "title": "Expressing Experience: -(으)ㄴ 적이 있다/없다 (-(eu)n jeogi itta/eopta)", "level": 3, "tags": ["verbs", "experience", "past tense"] },
        { "title": "Expressing 'while doing': -(으)면서 (-(eu)myeonseo)", "level": 3, "tags": ["verbs", "concurrency", "while"] },
        { "title": "Reported Speech (Indirect Quotation - Plain Form + -고 하다)", "level": 3, "tags": ["reported speech", "quotation", "verbs"] },
        { "title": "Reported Speech (Specific Endings - Noun+-(이)라고, Adj+다고, Verb+ㄴ/는다고)", "level": 3, "tags": ["reported speech", "quotation"] },
        { "title": "Making Suggestions: -(으)ㅂ시다 (-(eu)psida - formal)", "level": 3, "tags": ["verbs", "suggestions", "formal language", "politeness"] },
        { "title": "Making Suggestions: -(으)ㄹ까요? (-(eu)lkkayo? - shall we?)", "level": 3, "tags": ["verbs", "suggestions", "questions"] },
        { "title": "Passive Voice: -이/히/리/기- (-i/hi/ri/gi-)", "level": 3, "tags": ["verbs", "passive voice"] },
        { "title": "Passive Voice: -아/어지다 (-a/eojida)", "level": 3, "tags": ["verbs", "passive voice", "change of state"] },
        // Upper-Intermediate (Level 4 - TOPIK 4 equivalent)
        { "title": "Causative Verbs: -이/히/리/기/우/구/추-", "level": 4, "tags": ["verbs", "causative"] },
        { "title": "Causative Verbs: -게 하다 (-ge hada)", "level": 4, "tags": ["verbs", "causative"] },
        { "title": "Expressing 'seems like': -(으)ㄴ/는/(으)ㄹ 것 같다 (geot gatda)", "level": 4, "tags": ["grammar points", "supposition", "appearance"] },
        { "title": "Expressing 'looks like' (based on appearance): -아/어 보이다 (-a/eo boida)", "level": 4, "tags": ["grammar points", "appearance", "adjectives"] },
        { "title": "Expressing Discovery/Realization: -네요 (-neyo)", "level": 4, "tags": ["sentence endings", "reaction", "discovery"] },
        { "title": "Expressing Surprise/Admiration: -군요/는군요 (-gunyo/-neungunyo)", "level": 4, "tags": ["sentence endings", "reaction", "surprise"] },
        { "title": "Expressing 'as soon as': -자마자 (-jamaja)", "level": 4, "tags": ["conjunctions", "time", "immediacy"] },
        { "title": "Expressing 'even if': -아/어도 (-a/eodo)", "level": 4, "tags": ["conditionals", "concession"] },
        { "title": "Expressing 'not only... but also': -(으)ㄹ 뿐만 아니라 (-(eu)l ppuman anira)", "level": 4, "tags": ["conjunctions", "addition"] },
        { "title": "Expressing 'worth doing': -(으)ㄹ 만하다 (-(eu)l manhada)", "level": 4, "tags": ["grammar points", "value", "worth"] },
        { "title": "Expressing 'tendency': -는 편이다 (-neun pyeonida)", "level": 4, "tags": ["grammar points", "tendency"] },
        { "title": "Expressing Regret: -(으)ㄹ 걸 그랬다 (-(eu)l geol geuraetda)", "level": 4, "tags": ["grammar points", "regret", "past tense"] },
        { "title": "Advanced Reported Speech (Commands, Suggestions)", "level": 4, "tags": ["reported speech", "quotation"] },
        { "title": "Nominalization: -음/ㅁ (-eum/m)", "level": 4, "tags": ["grammar points", "nominalization"] },
        { "title": "Nominalization: -기 (-gi)", "level": 4, "tags": ["grammar points", "nominalization"] },
        // Advanced (Level 5 - TOPIK 5/6 equivalent)
        { "title": "Advanced Honorifics & Humble Speech (Speech Levels)", "level": 5, "tags": ["politeness", "honorifics", "formal language", "speech levels"] },
        { "title": "Expressing 'no matter how': 아무리 -아/어도 (amuri -a/eodo)", "level": 5, "tags": ["grammar points", "concession", "emphasis"] },
        { "title": "Expressing 'on the contrary': -(으)ㄴ/는/(으)ㄹ커녕 (-(eu)n/neun/(eu)lkeonyeong)", "level": 5, "tags": ["grammar points", "contrast", "negation"] },
        { "title": "Expressing 'let alone': -(으)ㄴ/는 고사하고 (-(eu)n/neun gosahago)", "level": 5, "tags": ["grammar points", "comparison", "negation"] },
        { "title": "Expressing 'due to'/'because of' (Negative Nuance): -는 바람에 (-neun barame)", "level": 5, "tags": ["grammar points", "reason", "cause", "negative nuance"] },
        { "title": "Expressing 'to the point that': -(으)ㄹ 정도로 (-(eu)l jeongdoro)", "level": 5, "tags": ["grammar points", "degree", "extent"] },
        { "title": "Expressing 'might as well': -(으)ㄹ 바에야 (-(eu)l baeya)", "level": 5, "tags": ["grammar points", "preference", "comparison"] },
        { "title": "Expressing 'inevitability': -(으)ㄹ 수밖에 없다 (-(eu)l subakke eopta)", "level": 5, "tags": ["grammar points", "necessity", "inevitability"] },
        { "title": "Expressing Simultaneity: -기가 무섭게 (-giga museopge)", "level": 5, "tags": ["conjunctions", "time", "immediacy"] },
        { "title": "Expressing Intention (Strong): -(으)려던 참이다 (-(eu)ryeodeon chamida)", "level": 5, "tags": ["grammar points", "intention", "timing"] },
        { "title": "Archaic/Literary Endings & Forms", "level": 5, "tags": ["literary", "formal language", "archaic"] },
        { "title": "Sound Symbolism & Ideophones (의성어/의태어)", "level": 5, "tags": ["vocabulary", "onomatopoeia", "ideophones"] },
        { "title": "Advanced Discourse Markers & Idiomatic Expressions", "level": 5, "tags": ["discourse markers", "linking words", "idioms"] }
    ],
    "Chinese": [
        // Beginner (Level 1 - HSK 1 equivalent)
        { "title": "Pinyin & Tones (拼音与声调)", "level": 1, "tags": ["basics", "pronunciation", "pinyin", "tones"] },
        { "title": "Basic Greetings & Introductions (问候与介绍)", "level": 1, "tags": ["basics", "phrases", "vocabulary"] },
        { "title": "Basic Sentence Structure (SVO)", "level": 1, "tags": ["basics", "sentence structure"] },
        { "title": "Verb 是 (shì - 'to be')", "level": 1, "tags": ["basics", "verbs", "to be", "shi"] },
        { "title": "Negation with 不 (bù)", "level": 1, "tags": ["basics", "negation", "bu"] },
        { "title": "Asking Questions with 吗 (ma)", "level": 1, "tags": ["basics", "questions", "ma"] },
        { "title": "Pronouns (我, 你, 他, 她, 它, 我们, 你们, 他们 - wǒ, nǐ, tā, tā, tā, wǒmen, nǐmen, tāmen)", "level": 1, "tags": ["basics", "pronouns"] },
        { "title": "Using 很 (hěn) with Adjectives", "level": 1, "tags": ["basics", "adjectives", "adverbs", "hen"] },
        { "title": "Numbers 0-99 (数字)", "level": 1, "tags": ["basics", "numbers", "vocabulary"] },
        { "title": "Possessive Particle 的 (de)", "level": 1, "tags": ["basics", "particles", "possessive", "de"] },
        { "title": "Question Words (谁 shéi, 什么 shénme, 哪里 nǎlǐ, 什么时候 shénme shíhou)", "level": 1, "tags": ["basics", "questions", "question words"] },
        { "title": "Verb 有 (yǒu - 'to have')", "level": 1, "tags": ["basics", "verbs", "possession", "existence", "you"] },
        { "title": "Negation with 没(有) (méi(yǒu))", "level": 1, "tags": ["basics", "negation", "mei", "you"] },
        { "title": "Measure Words (Basic: 个 ge, 口 kǒu, 杯 bēi, 瓶 píng)", "level": 1, "tags": ["basics", "nouns", "measure words"] },
        { "title": "Telling Time (时间)", "level": 1, "tags": ["basics", "time", "vocabulary"] },
        { "title": "Dates (日期: 年 nián, 月 yuè, 日 rì/号 hào)", "level": 1, "tags": ["basics", "time", "vocabulary"] },
        // Pre-Intermediate (Level 2 - HSK 2 equivalent)
        { "title": "The Particle 了 (le - completion/change of state)", "level": 2, "tags": ["particles", "aspect", "le", "completion"] },
        { "title": "Using Adjectives as Predicates", "level": 2, "tags": ["adjectives", "sentence structure"] },
        { "title": "Conjunction 和 (hé - 'and' for nouns)", "level": 2, "tags": ["conjunctions", "and", "he"] },
        { "title": "Modal Verbs: 会 (huì - can, will), 想 (xiǎng - want to), 要 (yào - want to/will)", "level": 2, "tags": ["verbs", "modals", "hui", "xiang", "yao"] },
        { "title": "Expressing 'also': 也 (yě)", "level": 2, "tags": ["adverbs", "also", "ye"] },
        { "title": "Expressing 'both/all': 都 (dōu)", "level": 2, "tags": ["adverbs", "all", "both", "dou"] },
        { "title": "Location Words (上 shàng, 下 xià, 里 lǐ, 外 wài, 前 qián, 后 hòu)", "level": 2, "tags": ["prepositions", "location", "nouns"] },
        { "title": "Using 在 (zài - at/in/on, indicating action in progress)", "level": 2, "tags": ["verbs", "prepositions", "location", "progressive aspect", "zai"] },
        { "title": "Comparing: 比 (bǐ)", "level": 2, "tags": ["comparisons", "bi"] },
        { "title": "Measure Words (Expanded: 本 běn, 件 jiàn, 条 tiáo, 张 zhāng)", "level": 2, "tags": ["nouns", "measure words"] },
        { "title": "Expressing 'about to': 快要...了 (kuài yào...le), 就要...了 (jiù yào...le)", "level": 2, "tags": ["grammar points", "future", "imminence"] },
        { "title": "Expressing 'from...to...': 从...到... (cóng...dào...)", "level": 2, "tags": ["prepositions", "range", "cong", "dao"] },
        { "title": "Directional Complements (Simple: 上来 shànglai, 下去 xiàqu)", "level": 2, "tags": ["verbs", "complements", "direction"] },
        { "title": "Resultative Complements (Basic: 见 jiàn, 完 wán, 懂 dǒng)", "level": 2, "tags": ["verbs", "complements", "result"] },
        { "title": "Tag Questions: ...好吗? (...hǎo ma?), ...行吗? (...xíng ma?)", "level": 2, "tags": ["questions", "tag questions", "suggestions"] },
        // Intermediate (Level 3 - HSK 3 equivalent)
        { "title": "The Particle 过 (guo - indicating past experience)", "level": 3, "tags": ["particles", "aspect", "guo", "experience"] },
        { "title": "Potential Complements (Verb + 得/不 + Complement)", "level": 3, "tags": ["verbs", "complements", "potential", "de", "bu"] },
        { "title": "Duration with 了 (le)", "level": 3, "tags": ["particles", "le", "duration"] },
        { "title": "Comparative Sentences (A 比 B + Adj +得多/一点儿)", "level": 3, "tags": ["comparisons", "bi", "degree"] },
        { "title": "Comparing: 跟...一样 (gēn...yīyàng - same as)", "level": 3, "tags": ["comparisons", "equality", "gen", "yiyang"] },
        { "title": "Comparing: 没有 (méiyǒu - not as...as)", "level": 3, "tags": ["comparisons", "negation", "meiyou"] },
        { "title": "Measure Words (Further Expansion: 次 cì, 遍 biàn, 种 zhǒng)", "level": 3, "tags": ["nouns", "measure words"] },
        { "title": "把 (bǎ) Sentences (Subject + 把 + Object + Verb + Complement)", "level": 3, "tags": ["sentence structure", "ba", "disposal"] },
        { "title": "被 (bèi) Sentences (Passive Voice)", "level": 3, "tags": ["sentence structure", "bei", "passive voice"] },
        { "title": "Expressing 'if': 如果...的话 (rúguǒ...dehuà), 要是...的话 (yàoshi...dehuà)", "level": 3, "tags": ["conditionals", "if clauses", "ruguo", "yaoshi"] },
        { "title": "Expressing 'because...so...': 因为...所以... (yīnwèi...suǒyǐ...)", "level": 3, "tags": ["conjunctions", "reason", "result", "yinwei", "suoyi"] },
        { "title": "Expressing 'although...but...': 虽然...但是... (suīrán...dànshì...)", "level": 3, "tags": ["conjunctions", "concession", "contrast", "suiran", "danshi"] },
        { "title": "Reduplication of Adjectives (e.g., 高高兴兴 gāogāoxìngxìng)", "level": 3, "tags": ["adjectives", "reduplication", "emphasis"] },
        { "title": "Reduplication of Verbs (e.g., 看看 kànkan)", "level": 3, "tags": ["verbs", "reduplication", "softening", "brief action"] },
        { "title": "Notional Passive (Subject + Verb + 了)", "level": 3, "tags": ["passive voice", "notional passive"] },
        // Upper-Intermediate (Level 4 - HSK 4 equivalent)
        { "title": "Complements of Degree (Verb/Adj + 得 + description)", "level": 4, "tags": ["verbs", "adjectives", "complements", "degree", "de"] },
        { "title": "Directional Complements (Compound)", "level": 4, "tags": ["verbs", "complements", "direction"] },
        { "title": "Resultative Complements (Advanced)", "level": 4, "tags": ["verbs", "complements", "result"] },
        { "title": "Conjunctions: 不但...而且... (búdàn...érqiě - not only...but also)", "level": 4, "tags": ["conjunctions", "addition", "budan", "erqie"] },
        { "title": "Conjunctions: 只要...就... (zhǐyào...jiù - as long as...then...)", "level": 4, "tags": ["conditionals", "zhiyao", "jiu"] },
        { "title": "Conjunctions: 只有...才... (zhǐyǒu...cái - only if...then...)", "level": 4, "tags": ["conditionals", "restriction", "zhiyou", "cai"] },
        { "title": "Conjunctions: 无论/不管...都/也... (wúlùn/bùguǎn...dōu/yě - regardless of...)", "level": 4, "tags": ["conjunctions", "concession", "wulun", "buguan"] },
        { "title": "Using 是...的 (shì...de) for Emphasis", "level": 4, "tags": ["sentence structure", "emphasis", "shi...de"] },
        { "title": "Using 连...都/也... (lián...dōu/yě - even...)", "level": 4, "tags": ["sentence structure", "emphasis", "lian"] },
        { "title": "Existential Sentences (Location + Verb + (了/着) + Numeral + MW + Noun)", "level": 4, "tags": ["sentence structure", "existence"] },
        { "title": "Duration of Non-Action ([Time] + 没 + Verb + 了)", "level": 4, "tags": ["negation", "duration"] },
        { "title": "Rhetorical Questions", "level": 4, "tags": ["questions", "rhetorical questions"] },
        { "title": "Using Adverbs like 原来 (yuánlái), 竟然 (jìngrán), 难道 (nándào)", "level": 4, "tags": ["adverbs", "nuance", "surprise", "rhetoric"] },
        // Advanced (Level 5 - HSK 5/6 equivalent)
        { "title": "Advanced 把 (bǎ) Structures", "level": 5, "tags": ["sentence structure", "ba", "disposal", "advanced"] },
        { "title": "Advanced 被 (bèi) Structures (including 让 ràng, 叫 jiào, 给 gěi)", "level": 5, "tags": ["sentence structure", "bei", "passive voice", "advanced"] },
        { "title": "Complex Complements (Directional, Resultative, Potential - Nuances)", "level": 5, "tags": ["verbs", "complements", "nuances"] },
        { "title": "Formal Conjunctions (既...又... jì...yòu; 与其...不如... yǔqí...bùrú)", "level": 5, "tags": ["conjunctions", "formal language", "parallelism", "preference"] },
        { "title": "Expressing 'on the contrary': 反而 (fǎn'ér)", "level": 5, "tags": ["adverbs", "contrast", "fan'er"] },
        { "title": "Expressing 'might as well': 不妨 (bùfáng)", "level": 5, "tags": ["adverbs", "suggestion", "bufang"] },
        { "title": "Expressing 'as far as possible': 尽量 (jǐnliàng)", "level": 5, "tags": ["adverbs", "effort", "jinliang"] },
        { "title": "Using Formal Adverbs (e.g., 未免 wèimiǎn, 何必 hébì, 不禁 bùjīn)", "level": 5, "tags": ["adverbs", "formal language", "nuance"] },
        { "title": "Set Phrases & Chengyu (成语 - Idioms)", "level": 5, "tags": ["vocabulary", "idioms", "chengyu", "culture"] },
        { "title": "Topic-Comment Structures", "level": 5, "tags": ["sentence structure", "topic comment"] },
        { "title": "Complex Sentence Structures & Clauses", "level": 4, "tags": ["sentence structure", "syntax", "clauses"] },
        { "title": "Nuances of Aspect Particles (了 le, 着 zhe, 过 guo)", "level": 5, "tags": ["particles", "aspect", "nuances", "le", "zhe", "guo"] }
    ]
};
console.log("Grammar data embedded."); // Log to confirm it's loaded

function openChat(partner) { // Now accepts the full partner object
    const modal = document.getElementById('chat-modal');
    const chatHeader = modal.querySelector('.chat-header'); // Get the header element
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');

    // Clear previous messages, history, and reset input
    chatMessages.innerHTML = '';
    messageInput.value = '';
    chatHistory = []; // Clear history for new chat
    currentPartner = partner; // Store the whole partner object
    currentPartnerName = partner.name; // Store partner name

    // Populate the chat header
    chatHeader.innerHTML = `
        <img src="${partner.avatar}" alt="${partner.name}" class="chat-avatar">
        <h3>Chat with ${partner.name}</h3>
        <p>(${partner.nativeLanguage} speaker, learning ${partner.targetLanguage})</p>
    `;

    modal.style.setProperty('display', 'flex', 'important'); // Use flex to enable centering and force it

    // Add initial placeholder/intro message - DO NOT add to history yet
    chatMessages.innerHTML += `<p id="connecting-message"><em>Connecting you with ${partner.name}...</em></p>`;
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Clear any existing timer before setting a new one
    if (geminiIntroTimer) {
        clearTimeout(geminiIntroTimer);
    }

    // Set a timer to send a message from the partner if the user doesn't type
    geminiIntroTimer = setTimeout(() => {
        // Check if the user hasn't sent a message yet (chatMessages only has the intro)
        // Check history length instead of DOM elements
        if (chatHistory.length === 0) {
            // Generate an intro message roleplaying as the partner
            const introMessageText = `Hi! I'm ${partner.name}. Nice to meet you! I see you're learning ${partner.nativeLanguage}. Maybe we can practice?`;

            // Remove the "Connecting..." message
            const connectingMessage = document.getElementById('connecting-message');
            if (connectingMessage) {
                connectingMessage.remove();
            }

            // Add partner's intro to UI and history
            const partnerIntro = { sender: partner.name, text: introMessageText };
            chatHistory.push(partnerIntro);
            chatMessages.innerHTML += `<p><strong>${partner.name}:</strong> ${introMessageText}</p>`;
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        geminiIntroTimer = null; // Clear timer ID after it runs or is cleared
    }, 5000); // 5 seconds

    const closeBtn = modal.querySelector('.close'); // More specific selector
    closeBtn.onclick = () => {
        modal.style.display = 'none';
        if (geminiIntroTimer) { // Clear timer if modal is closed
            clearTimeout(geminiIntroTimer);
            geminiIntroTimer = null;
        }
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            if (geminiIntroTimer) { // Clear timer if modal is closed by clicking outside
                clearTimeout(geminiIntroTimer);
                geminiIntroTimer = null;
            }
        }
    };
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

// Event Listeners
document.getElementById('searchButton').addEventListener('click', searchPartners);

document.getElementById('send-message').addEventListener('click', async () => { // Make async
    const messageInput = document.getElementById('message-input');
    const messageText = messageInput.value.trim();
    const chatMessages = document.getElementById('chat-messages');

    if (messageText && currentPartner) { // Ensure partner context is available
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

        // Add user's message to UI and history
        const userMessage = { sender: 'You', text: messageText };
        chatHistory.push(userMessage);
        chatMessages.innerHTML += `<p><strong>You:</strong> ${messageText}</p>`;
        messageInput.value = ''; // Clear input field
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll down

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
                const partnerResponse = { sender: currentPartnerName, text: partnerResponseText };
                chatHistory.push(partnerResponse);
                chatMessages.innerHTML += `<p><strong>${currentPartnerName}:</strong> ${partnerResponseText}</p>`;
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
            chatMessages.innerHTML += `<p><em>Error getting response. Please try again.</em></p>`;
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

teachMeButton.addEventListener('click', () => {
    if (!currentPartner || !grammarData) {
        console.error("Partner or grammar data not available.");
        // Optionally show a message to the user
        return;
    }

    const targetLang = currentPartner.nativeLanguage; // User is learning partner's native language
    const topics = grammarData[targetLang];

    grammarTopicList.innerHTML = ''; // Clear previous list

    if (topics && topics.length > 0) {
        topics.sort((a, b) => a.level - b.level); // Sort by level
        topics.forEach(topic => {
            const button = document.createElement('button');
            button.dataset.title = topic.title; // Store title for later use
            button.innerHTML = `${topic.title} <span>Level ${topic.level}</span>`;
            grammarTopicList.appendChild(button);
        });
    } else {
        grammarTopicList.innerHTML = `<p>No grammar topics available for ${targetLang} yet.</p>`;
    }

    teachMeModal.style.setProperty('display', 'flex', 'important');
});

teachMeCloseBtn.onclick = () => {
    teachMeModal.style.display = 'none';
};

// Event delegation for topic selection
grammarTopicList.addEventListener('click', async (event) => {
    // Check if the clicked element is a button within the list
    if (event.target && event.target.closest('button')) {
        const button = event.target.closest('button');
        const topicTitle = button.dataset.title;
        const explanationContainer = document.getElementById('grammar-topic-list'); // Target the modal's content area

        // Keep the modal open to show the explanation
        // teachMeModal.style.display = 'none'; // Don't close the modal

        // Show loading state within the modal's content area
        explanationContainer.innerHTML = '<p>Loading explanation...</p>';

        try {
            // Find the topic level from embedded grammar data
            const targetLang = currentPartner.nativeLanguage; // User is learning partner's language
            const level = grammarData[targetLang]?.find(topic => topic.title === topicTitle)?.level || 'unknown';

            // Call the function to fetch and display the explanation IN THE MODAL
            // This function updates explanationContainer.innerHTML directly.
            await getGrammarExplanation(topicTitle, targetLang, level);

            // NO NEED to add anything to the main chatMessages here,
            // as the explanation is now shown inside the teachMeModal's explanationContainer.

        } catch (error) {
            console.error("Error getting grammar explanation:", error);
            // Display error within the modal's content area
            explanationContainer.innerHTML = `<p style="color: red;">Failed to load explanation for "${topicTitle}". Please try again.</p>`;
        }
    }
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

// Modified getGeminiChatResponse to include corrections instruction
async function getGeminiChatResponse(partner, history) {
    console.log("Getting Gemini Response. History:", history);
    const prompt = `You are ${partner.name}, a language exchange partner on the website http://practicefor.fun. Your native language is ${partner.nativeLanguage} and you are learning ${partner.targetLanguage}. Your interests are ${partner.interests.join(', ')}.
You are chatting with someone whose native language is ${partner.targetLanguage} and who is learning your language (${partner.nativeLanguage}).

Here is the recent chat history (last 10 messages):
${history.map(msg => `${msg.sender}: ${msg.text}`).join('\n')}

Respond naturally to the last message in the chat.
Respond in a friendly, encouraging, and informal chat style. Keep your response relatively short, like a typical chat message (1-3 sentences).

${enableCorrections ? `
IMPORTANT: The user wants corrections. If their last message (sender: 'You') contains grammar or spelling errors in ${partner.nativeLanguage}, provide a brief, friendly correction AFTER your main conversational reply.
Format the correction clearly, like this:
"By the way, a slightly more natural way to say that in ${partner.nativeLanguage} is: [Corrected Sentence]"
Only provide a correction if you identify a clear error in ${partner.nativeLanguage} in the user's *last* message. If there are no errors, just give your conversational reply.
` : `
The user does not currently want corrections. Just provide a natural conversational reply.
`}

Your response should be ONLY the chat message text. Do not include your name or any other prefix.`;

    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp-01-21:generateContent?key=' + API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Gemini API request failed with status ${response.status}: ${response.statusText}. Body: ${errorBody}`);
            throw new Error(`API request failed: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Gemini API Response Data:", data);

        if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
            let generatedText = data.candidates[0].content.parts[0].text;
            generatedText = generatedText.trim();
            if (generatedText.startsWith('"') && generatedText.endsWith('"')) {
                generatedText = generatedText.substring(1, generatedText.length - 1);
            }
            console.log("Extracted Gemini text:", generatedText);
            return generatedText;
        } else if (data && data.candidates && data.candidates[0] && data.candidates[0].finishReason === 'SAFETY') {
            console.warn("Gemini response blocked due to safety settings.");
            return "I'm sorry, I can't respond to that.";
        } else {
            console.error("Unexpected Gemini API response structure:", data);
            throw new Error("Unexpected API response structure");
        }

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error;
    }
}

// New function to get grammar explanation
async function getGrammarExplanation(topicTitle, language, level = 'unknown') { // Added level parameter
    const explanationContainer = document.getElementById('grammar-topic-list'); // Assuming this is where we show loading/result
    explanationContainer.innerHTML = '<p>Loading explanation...</p>'; // Show loading state

    console.log(`Requesting grammar explanation for: ${topicTitle} in ${language}, Level: ${level}`);

    // Construct a more detailed prompt requesting Markdown
    const prompt = `Explain the grammar topic "${topicTitle}" for a learner of ${language} (assume they are at a level suitable for this topic: ${level}).
Provide a clear explanation with examples. 
Use simple language suitable for a language learner.
Format your entire response using Markdown. Use headings, bullet points, bold text, and code blocks for examples where appropriate to make the explanation clear and easy to read.
Do NOT include any text before or after the Markdown content.`;

    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp-01-21:generateContent?key=' + API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${response.statusText}. Body: ${errorBody}`);
        }

        const data = await response.json();

        if (!data || !data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
            console.error("Unexpected API response structure for grammar explanation:", data);
            throw new Error("Unexpected API response structure for grammar explanation");
        }

        let explanationMarkdown = data.candidates[0].content.parts[0].text;
        console.log("Received Markdown explanation:", explanationMarkdown);

        // Convert Markdown to HTML using marked.js
        const explanationHtml = marked.parse(explanationMarkdown);

        // Display the HTML content in the modal
        explanationContainer.innerHTML = `<h2>Explanation: ${topicTitle}</h2> ${explanationHtml}`; // Display parsed HTML

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
document.addEventListener('DOMContentLoaded', () => {
    loadPreferences();
    checkSavedPartner();
});

function checkSavedPartner() {
    const savedPartnerData = localStorage.getItem('savedPartner');
    const banner = document.getElementById('saved-partner-banner');
    const info = document.getElementById('saved-partner-info');

    if (savedPartnerData) {
        const data = JSON.parse(savedPartnerData);
        banner.style.display = 'block';
        info.textContent = `Chat with ${data.partner.name}`;

        // Resume chat button
        document.getElementById('resume-chat-btn').onclick = () => {
            openChat(data.partner);
            // Load saved messages
            const chatMessages = document.getElementById('chat-messages');
            chatHistory = data.messages;
            chatMessages.innerHTML = chatHistory.map(msg => 
                `<p><strong>${msg.sender}:</strong> ${msg.text}</p>`
            ).join('');
        };

        // Delete saved partner button
        document.getElementById('delete-partner-btn').onclick = () => {
            if (confirm('Are you sure you want to delete the saved chat?')) {
                localStorage.removeItem('savedPartner');
                banner.style.display = 'none';
            }
        };
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

        // Save partner and last 10 messages
        const dataToSave = {
            partner: currentPartner,
            messages: chatHistory.slice(-10)
        };

        localStorage.setItem('savedPartner', JSON.stringify(dataToSave));
        
        // Show success message
        if (isMobile) {
            // Create a temporary success message element
            const successMsg = document.createElement('div');
            successMsg.style.position = 'fixed';
            successMsg.style.bottom = '20px';
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
document.getElementById('chat-messages')?.addEventListener('click', async (event) => {
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

            // **NEW:** Parse the Markdown explanation to HTML using Marked.js
            // Ensure marked.parse() is available (CDN should be loaded in HTML)
            if (typeof marked === 'undefined') {
                console.error("Marked.js library not loaded!");
                throw new Error("Markdown library not available.");
            }
            const explanationHtml = marked.parse(explanationMarkdown);

            // Display the parsed HTML
            const explanationDiv = document.createElement('div');
            explanationDiv.className = 'message grammar-explanation'; // Add 'message' class
            // Add sender info consistent with other messages
            const senderSpan = document.createElement('span');
            senderSpan.className = 'sender';
            senderSpan.textContent = `Gemini (Teaching ${topicTitle}):`;
            explanationDiv.appendChild(senderSpan);
            // Append the parsed HTML content
            const contentDiv = document.createElement('div');
            contentDiv.innerHTML = explanationHtml;
            explanationDiv.appendChild(contentDiv);

            chatMessages.appendChild(explanationDiv);


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

// Text-to-speech configuration with retry mechanism
const WEBHOOK_SECRET = 'wsec_01bd5c39d5578c3b569001b062a2532ab49c657fc7af3ca10c4926968cfe46ef';
const WEBHOOK_URL = 'https://practicefor.fun/webhook';

async function sendWebhookRequest(data) {
    const timestamp = Date.now().toString();
    const message = timestamp + JSON.stringify(data);
    
    // Create HMAC signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(WEBHOOK_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(message)
    );
    
    const signatureHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Signature': signatureHex,
                'X-Timestamp': timestamp
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`Webhook request failed: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Webhook error:', error);
        throw error;
    }
}

const TTS_API_URL = 'https://langcamp.us/elevenlbs-exchange-audio/exchange-audio';
var audioContext = null;

// Voice mapping for different languages
const VOICE_MAPPING = {
    'en': 'pNInz6obpgDQGcFmaJgB', // English
    'es': '3zcEGzEYQQUXzdCubewx', // Spanish
    'fr': 'jsCqWAovK2LkecY7zXl4', // French
    'de': 'b3VNW9IEW1aDDStvLk0D', // German
    'ja': 'zcAOhNBS3c14rBihAFp1', // Japanese
    'zh': 'TxGEqnHWrfWFTfGW9XjX'  // Chinese
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
    if (/[\u3040-\u30FF\u3400-\u4DBF]/.test(text)) return 'ja';
    // Check for Spanish/French specific characters
    if (/[áéíóúñ]/i.test(text)) return 'es';
    if (/[àâçéèêëîïôûùüÿ]/i.test(text)) return 'fr';
    // Check for German specific characters
    if (/[äöüß]/i.test(text)) return 'de';
    // Default to English
    return 'en';
}

// Function to play audio with better error handling
async function playAudioFromText(text, button) {
    try {
        if (window.location.protocol !== 'https:') {
            throw new Error('Audio functionality requires HTTPS');
        }
        
        initAudioContext();
        button.disabled = true;
        button.innerHTML = '🔄 Loading...';

        const detectedLang = detectLanguage(text);
        const voiceId = VOICE_MAPPING[detectedLang] || VOICE_MAPPING.en;

        const response = await fetch(TTS_API_URL, {
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

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onerror = (e) => {
            console.error('Audio playback error:', e);
            button.innerHTML = '❌ Error';
            setTimeout(() => button.remove(), 2000);
        };

        audio.onended = () => {
            button.innerHTML = '✅ Played';
            setTimeout(() => button.remove(), 2000);
            URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
        button.innerHTML = '🔊 Playing...';

    } catch (error) {
        console.error('Audio playback failed:', error);
        button.innerHTML = '❌ Error';
        setTimeout(() => button.remove(), 2000);
    }
}

// Audio button controller 
function createAudioButton(text, rect) {
    // Remove any existing audio buttons first
    const existingButtons = document.querySelectorAll('.audio-button');
    existingButtons.forEach(btn => btn.remove());

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
    
    button.innerHTML = `
        <span class="button-icon" style="font-size: 16px;">🔊</span>
        <span class="button-text" style="font-weight: 500;">Play Audio</span>
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
    
    button.style.left = `${left}px`;
    button.style.top = `${top}px`;
    button.style.zIndex = '10000';

    let isPlaying = false;
    button.onclick = async () => {
        if (isPlaying) return;
        
        try {
            isPlaying = true;
            button.classList.add('playing');
            button.innerHTML = `
                <span class="button-icon">🔄</span>
                <span class="button-text">Loading...</span>
            `;
            
            await playAudioFromText(text, button);
            
            button.innerHTML = `
                <span class="button-icon">✅</span>
                <span class="button-text">Played</span>
            `;
            
            setTimeout(() => button.remove(), 2000);
        } catch (error) {
            console.error('Audio playback failed:', error);
            button.classList.remove('playing');
            button.innerHTML = `
                <span class="button-icon">❌</span>
                <span class="button-text">Error</span>
            `;
            setTimeout(() => button.remove(), 2000);
        } finally {
            isPlaying = false;
        }
    };

    document.body.appendChild(button);
    return button;
}

function removeAudioButton() {
    const buttons = document.querySelectorAll('.audio-button');
    buttons.forEach(btn => btn.remove());
    // Restore scroll behavior
    document.body.style.overflow = '';
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) chatMessages.style.overflow = '';
}

// Text selection handler for both desktop and mobile
document.addEventListener('selectionchange', function() {
    // Don't show audio button if selection is in input/textarea
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
        return;
    }

    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText && selectedText.length >= 2) {
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
    } else {
        removeAudioButton();
    }
});

// Add touch event handling for mobile
document.addEventListener('touchend', function(e) {
    // Small delay to allow selection to complete
    setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();
        
        if (selectedText && selectedText.length >= 2) {
            const range = selection?.getRangeAt(0);
            if (!range) return;
            
            const rect = range.getBoundingClientRect();
            if (!rect) return;
            
            // Adjust position for mobile
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
            rect.top += scrollY;
            
            createAudioButton(selectedText, rect);
        }
    }, 100);
});

// Remove audio button when clicking outside
document.addEventListener('mousedown', (event) => {
    if (!event.target.classList.contains('audio-button')) {
        removeAudioButton();
    }
});