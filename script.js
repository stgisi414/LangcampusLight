
const API_KEY = 'AIzaSyDjRnqcQmB1dudbtoO6urFYzd3RuK8Ee1U';

async function searchPartners() {
    const nativeLanguage = document.getElementById('nativeLanguage').value;
    const targetLanguage = document.getElementById('targetLanguage').value;
    
    try {
        // This would be replaced with actual Gemini API call
        const prompt = `Generate language exchange partner profiles who speaks ${nativeLanguage} and wants to learn ${targetLanguage}`;
        const partners = await generatePartnerProfiles(prompt);
        displayResults(partners);
    } catch (error) {
        console.error('Error searching for partners:', error);
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
                        text: prompt + `. Return JSON array of 3 profiles with fields: name, age (20-45), nativeLanguage, targetLanguage, interests (array of 3 hobbies). Make it realistic and diverse.`
                    }]
                }]
            })
        });

        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;
        const profiles = JSON.parse(generatedText);
        
        // Add avatars to the profiles
        return profiles.map(profile => ({
            ...profile,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`
        }));
    } catch (error) {
        console.error('Error generating profiles:', error);
        return [];
    }
}

function displayResults(partners) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';
    
    partners.forEach(partner => {
        const card = document.createElement('div');
        card.className = 'partner-card';
        card.innerHTML = `
            <img src="${partner.avatar}" alt="${partner.name}">
            <h3>${partner.name}</h3>
            <p>Speaks: ${partner.nativeLanguage}</p>
            <p>Learning: ${partner.targetLanguage}</p>
            <p>Interests: ${partner.interests.join(', ')}</p>
            <button onclick="openChat('${partner.name}')">Chat</button>
        `;
        resultsContainer.appendChild(card);
    });
}

function openChat(partnerName) {
    const modal = document.getElementById('chat-modal');
    modal.style.display = 'block';
    
    const closeBtn = document.getElementsByClassName('close')[0];
    closeBtn.onclick = () => modal.style.display = 'none';
    
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Event Listeners
document.getElementById('searchButton').addEventListener('click', searchPartners);
document.getElementById('send-message').addEventListener('click', () => {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    
    if (message) {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML += `<p><strong>You:</strong> ${message}</p>`;
        messageInput.value = '';
        
        // Simulate response (replace with Gemini API response)
        setTimeout(() => {
            chatMessages.innerHTML += `<p><strong>Partner:</strong> Thanks for your message! This is a demo response.</p>`;
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 1000);
    }
});
