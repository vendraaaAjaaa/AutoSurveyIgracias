// ==UserScript==
// @name         Telkom University Survey - ALWAYS POSITIVE
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Always select positive options (Yes/Satisfied/Very Satisfied)
// @match        *://igracias.telkomuniversity.ac.id/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // =================== CONFIGURATION ===================
    const CONFIG = {
        // Positive keywords with priority score (higher = better)
        POSITIVE_KEYWORDS: [
            { keyword: 'very satisfied', score: 100 },
            { keyword: 'sangat puas', score: 100 },
            { keyword: 'strongly agree', score: 100 },
            { keyword: 'sangat setuju', score: 100 },
            { keyword: 'satisfied', score: 90 },
            { keyword: 'puas', score: 90 },
            { keyword: 'agree', score: 90 },
            { keyword: 'setuju', score: 90 },
            { keyword: 'yes', score: 80 },
            { keyword: 'ya', score: 80 }
        ],
        
        // Negative keywords to avoid (score = -999)
        NEGATIVE_KEYWORDS: [
            'no', 'tidak',
            'dissatisfied', 'tidak puas',
            'disagree', 'tidak setuju',
            'very dissatisfied', 'sangat tidak puas',
            'strongly disagree', 'sangat tidak setuju'
        ]
    };
    // ====================================================
    
    function autoAnswer() {
        console.log('🎯 AUTO-ANSWER STARTED - Telkom University Survey');
        
        // Get all radio buttons
        const radios = document.querySelectorAll('input[type="radio"]');
        
        if (radios.length === 0) {
            console.log('❌ No radio buttons found');
            return;
        }
        
        // Group by question
        const questionMap = {};
        radios.forEach(radio => {
            if (!radio.name) return;
            if (!questionMap[radio.name]) {
                questionMap[radio.name] = [];
            }
            questionMap[radio.name].push(radio);
        });
        
        console.log(`📊 Found ${Object.keys(questionMap).length} questions`);
        
        let selectedCount = 0;
        
        // Process each question
        Object.entries(questionMap).forEach(([qName, options], index) => {
            console.log(`\n🔍 Question ${index + 1}: ${qName}`);
            
            let bestOption = null;
            let bestScore = -Infinity;
            let bestOptionText = '';
            
            // Evaluate each option
            options.forEach(radio => {
                const optionText = getOptionText(radio).toLowerCase().trim();
                
                if (!optionText) {
                    console.log(`   ⚠️  Could not get text for radio button`);
                    return;
                }
                
                console.log(`   📝 Option: "${optionText}"`);
                
                // Calculate score
                let score = 0;
                
                // Check for positive keywords
                CONFIG.POSITIVE_KEYWORDS.forEach(({ keyword, score: keywordScore }) => {
                    if (optionText.includes(keyword.toLowerCase())) {
                        score += keywordScore;
                        console.log(`      ➕ +${keywordScore} for "${keyword}"`);
                    }
                });
                
                // Penalize negative keywords
                CONFIG.NEGATIVE_KEYWORDS.forEach(negativeKeyword => {
                    if (optionText.includes(negativeKeyword.toLowerCase())) {
                        score = -999; // Heavy penalty
                        console.log(`      ⛔ -999 penalty for "${negativeKeyword}"`);
                    }
                });
                
                // Additional scoring: "Very" gets bonus
                if (optionText.includes('very') || optionText.includes('sangat')) {
                    if (score > 0) score += 5;
                }
                
                console.log(`      📊 Final score: ${score}`);
                
                // Track best option
                if (score > bestScore) {
                    bestScore = score;
                    bestOption = radio;
                    bestOptionText = optionText;
                }
            });
            
            // Select the best option
            if (bestOption && bestScore > -999) {
                if (!bestOption.checked) {
                    bestOption.checked = true;
                    triggerAllEvents(bestOption);
                    selectedCount++;
                    console.log(`   ✅ SELECTED: "${bestOptionText.substring(0, 50)}..." (Score: ${bestScore})`);
                } else {
                    console.log(`   ℹ️  Already selected: "${bestOptionText.substring(0, 50)}..."`);
                }
            } else if (options.length > 0) {
                // If all options are negative, choose the first one
                options[0].checked = true;
                triggerAllEvents(options[0]);
                selectedCount++;
                console.log(`   ⚠️  No good options, selected first one`);
            }
        });
        
        // Show results
        showNotification(`Auto-selected ${selectedCount}/${Object.keys(questionMap).length} questions`);
        
        // Log summary
        console.log('\n==========================================');
        console.log(`✅ AUTO-ANSWER COMPLETED`);
        console.log(`   Questions: ${Object.keys(questionMap).length}`);
        console.log(`   Selected: ${selectedCount}`);
        console.log(`   Preferences: Yes → Very Satisfied → Satisfied → Agree`);
        console.log(`   Never selects: No, Dissatisfied, Disagree`);
        console.log('==========================================');
    }
    
    // Get the text label for a radio button
    function getOptionText(radio) {
        // Try multiple methods to find the label
        
        // Method 1: Look for sibling with class 'answerlist1'
        const parentLi = radio.closest('li');
        if (parentLi) {
            const answerlist1 = parentLi.querySelector('.answerlist1');
            if (answerlist1) return answerlist1.textContent.trim();
        }
        
        // Method 2: Look for next sibling with class 'answerlist1'
        const siblingDiv = radio.parentElement.nextElementSibling;
        if (siblingDiv && siblingDiv.classList.contains('answerlist1')) {
            return siblingDiv.textContent.trim();
        }
        
        // Method 3: Look for any text in the parent container
        const container = radio.closest('li, div, td');
        if (container) {
            // Get all text, remove the radio button value if any
            const text = container.textContent.trim();
            // Clean up text (remove extra whitespace)
            return text.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
        }
        
        // Method 4: Look for the label element
        const label = document.querySelector(`label[for="${radio.id}"]`);
        if (label) return label.textContent.trim();
        
        return '';
    }
    
    // Trigger all necessary events
    function triggerAllEvents(element) {
        const events = ['change', 'click', 'input', 'focus', 'blur'];
        events.forEach(eventType => {
            element.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
    }
    
    // Show notification
    function showNotification(message) {
        // Remove existing notification
        const existing = document.getElementById('auto-survey-notification');
        if (existing) existing.remove();
        
        // Create new notification
        const notif = document.createElement('div');
        notif.id = 'auto-survey-notification';
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4CAF50, #2E7D32);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 999999;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            border-left: 6px solid #FFD700;
            max-width: 350px;
            animation: slideIn 0.3s ease;
        `;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        notif.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <div style="font-size: 20px;">✅</div>
                <div style="flex-grow: 1;">${message}</div>
            </div>
            <div style="font-size: 12px; opacity: 0.9; background: rgba(255,255,255,0.1); padding: 8px; border-radius: 5px;">
                <div><strong>Selected:</strong> Yes • Very Satisfied • Satisfied • Agree</div>
                <div><strong>Avoided:</strong> No • Dissatisfied • Disagree</div>
            </div>
        `;
        
        document.body.appendChild(notif);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notif.style.opacity = '0';
            notif.style.transition = 'opacity 0.5s';
            setTimeout(() => notif.remove(), 500);
        }, 5000);
    }
    
    // Add manual button
    function addManualButton() {
        const existingBtn = document.getElementById('survey-auto-btn');
        if (existingBtn) existingBtn.remove();
        
        const btn = document.createElement('button');
        btn.id = 'survey-auto-btn';
        btn.textContent = '🚀 Auto-Answer';
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999998;
            padding: 12px 24px;
            background: linear-gradient(135deg, #2196F3, #0D47A1);
            color: white;
            border: none;
            border-radius: 30px;
            cursor: pointer;
            font-family: Arial, sans-serif;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        btn.onmouseover = () => {
            btn.style.transform = 'translateY(-2px)';
            btn.style.boxShadow = '0 6px 20px rgba(33, 150, 243, 0.4)';
        };
        
        btn.onmouseout = () => {
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
        };
        
        btn.onclick = () => {
            btn.textContent = '⏳ Processing...';
            btn.style.background = 'linear-gradient(135deg, #FF9800, #F57C00)';
            
            setTimeout(() => {
                autoAnswer();
                btn.textContent = '✅ Done!';
                btn.style.background = 'linear-gradient(135deg, #4CAF50, #2E7D32)';
                
                setTimeout(() => {
                    btn.textContent = '🔄 Run Again';
                    btn.style.background = 'linear-gradient(135deg, #2196F3, #0D47A1)';
                }, 2000);
            }, 500);
        };
        
        document.body.appendChild(btn);
    }
    
    // Initialize
    function init() {
        // Wait for page to fully load
        setTimeout(() => {
            console.log('🚀 Initializing Auto-Survey Script...');
            
            // Run auto-answer
            autoAnswer();
            
            // Add manual button
            addManualButton();
            
            // Setup mutation observer for dynamic content
            setupMutationObserver();
            
        }, 1500);
    }
    
    // Setup mutation observer for dynamic content
    function setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            let shouldRun = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    const radios = document.querySelectorAll('input[type="radio"]');
                    if (radios.length > 0) {
                        shouldRun = true;
                    }
                }
            });
            
            if (shouldRun) {
                console.log('🔄 New content detected, running auto-answer...');
                setTimeout(autoAnswer, 500);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Start the script
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();