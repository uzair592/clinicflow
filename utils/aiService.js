const { GoogleGenerativeAI } = require('@google/generative-ai');
const AIRequestLog = require('../models/AIRequestLog');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const askAIFunction = async (prompt, context) => {
    const fullPrompt = `${context}\n\nUser Request: ${prompt}`;
    const result = await model.generateContent(fullPrompt);
    return result.response.text();
};

const askAI = async (userId, feature, prompt, context, retries = 1) => {
    const startTime = Date.now();
    let success = false;
    let errorReason = null;
    let responseText = null;

    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI Request Timeout')), 8000);
    });

    try {
        responseText = await Promise.race([
            askAIFunction(prompt, context),
            timeoutPromise
        ]);
        success = true;
    } catch (error) {
        if (error.message === 'AI Request Timeout' && retries > 0) {
            console.log('AI Timeout, retrying...');
            return await askAI(userId, feature, prompt, context, 0);
        }
        errorReason = error.message;
        responseText = JSON.stringify({ fallback: true, message: "AI unavailable. Please use manual diagnosis." });
        console.error("AI Error:", error);
    }

    const latency = Date.now() - startTime;

    // Log the request asynchronously
    AIRequestLog.create({
        userId,
        feature,
        prompt: `${context}\n\n${prompt}`,
        response: responseText,
        latency,
        success,
        errorReason
    }).catch(err => console.error("Failed to log AI Request:", err));

    try {
        // Try to parse as JSON if it looks like JSON
        if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
            // Strip markdown json blocks if gemini returned them
            let cleanJSON = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJSON);
        }
        return responseText;
    } catch (e) {
        return responseText;
    }
};

module.exports = { askAI };
