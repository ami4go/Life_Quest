// ═══════════════════════════════════════════════════════
// LIFEQUEST AI — AI Service (Gemini API)
// All AI-powered features in one place
// ═══════════════════════════════════════════════════════

import genAI, { geminiModel } from '../config/gemini';

/**
 * Decompose a goal into missions and quests
 */
export async function decomposeGoal(goalText, deadline, archetype) {
  const prompt = `You are LifeQuest AI — a game engine for real-life goals. You transform user goals into structured mission trees.

USER'S GOAL: "${goalText}"
DEADLINE: ${deadline}
USER ARCHETYPE: ${archetype?.primary || 'procrastinator'} ${archetype?.secondary ? `+ ${archetype.secondary}` : ''}

RULES:
- Break the goal into 2-4 MISSIONS (major milestones)
- Each mission has 3-6 QUESTS (specific actionable tasks)
- Each quest should be achievable in 15-60 minutes
- For "${archetype?.primary}" archetype, make first quests extremely easy to start
- Add time buffer based on archetype (poor_estimator gets 50% more time)
- Flag the final deadline mission as a Boss Battle
- Difficulty ranges from 1-5 stars
- Estimate time in minutes for each quest

Return ONLY valid JSON in this exact format:
{
  "missions": [
    {
      "title": "Mission title",
      "description": "Brief description",
      "isBossBattle": false,
      "quests": [
        {
          "title": "Quest title",
          "description": "Clear actionable description with specific deliverable",
          "difficulty": 3,
          "estimatedMinutes": 30,
          "order": 1
        }
      ]
    }
  ]
}`;

  try {
    const response = await genAI.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const text = response.text;
    return JSON.parse(text);
  } catch (error) {
    console.error('Goal decomposition failed:', error);
    throw error;
  }
}

/**
 * Diagnose avoidance and suggest restructuring
 */
export async function diagnoseAvoidance(questTitle, questDescription, archetype, avoidanceCount) {
  const prompt = `You are LifeQuest AI's Anti-Avoidance System. A user has opened this quest ${avoidanceCount} times without completing it.

QUEST: "${questTitle}"
DESCRIPTION: "${questDescription}"
USER ARCHETYPE: ${archetype?.primary || 'unknown'}
AVOIDANCE COUNT: ${avoidanceCount}

Your job: diagnose WHY they're avoiding it and provide a restructured approach.

Based on their archetype (${archetype?.primary}), consider:
- Procrastinator: overwhelmed by size, needs micro-actions
- Perfectionist: afraid of bad output, needs permission to do rough work
- Poor Estimator: underestimated complexity, needs time recalibration
- Overloaded: too many things competing, needs priority clarity
- Low Motivation: disconnected from the WHY, needs goal anchoring

Return ONLY valid JSON:
{
  "diagnosis": "Brief empathetic diagnosis of why they're avoiding this",
  "question": "A single diagnostic question to ask the user",
  "options": [
    {
      "text": "Option text the user can select",
      "action": "Brief description of what happens if selected"
    }
  ],
  "restructuredQuest": {
    "title": "Reframed quest title (easier/clearer)",
    "description": "Reframed description with lower barrier to start",
    "estimatedMinutes": 15,
    "difficulty": 2
  },
  "motivationalMessage": "A brief, empathetic encouragement (1-2 sentences)"
}`;

  try {
    const response = await genAI.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.8,
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Avoidance diagnosis failed:', error);
    throw error;
  }
}

/**
 * Verify proof of completion using multimodal AI
 */
export async function verifyProof(questTitle, questDescription, difficulty, fileBase64, fileMimeType) {
  const prompt = `You are LifeQuest AI's Proof Verification System. A user claims to have completed this quest and has uploaded evidence.

QUEST: "${questTitle}"
DESCRIPTION: "${questDescription}"
DIFFICULTY: ${difficulty}/5 stars

Analyze the uploaded file and determine:
1. Does this submission match the quest requirements?
2. Rate the quality of work from 1-5
3. Provide brief constructive feedback

Return ONLY valid JSON:
{
  "match": true,
  "qualityScore": 4,
  "feedback": "Brief constructive feedback about the submission",
  "bonusXPReason": "Why this deserves bonus XP (or null if quality < 3)"
}`;

  try {
    const response = await genAI.models.generateContent({
      model: geminiModel,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: fileMimeType,
                data: fileBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Proof verification failed:', error);
    throw error;
  }
}

/**
 * Generate a daily AI schedule
 */
export async function generateSchedule(quests, archetype, currentTime) {
  const questSummary = quests.map((q) => ({
    title: q.title,
    difficulty: q.difficulty,
    deadline: q.deadline,
    estimatedMinutes: q.estimatedMinutes,
    status: q.status,
    focusLocked: q.focusLocked,
  }));

  const prompt = `You are LifeQuest AI's Smart Scheduler. Generate an optimized daily schedule.

TODAY'S DATE/TIME: ${currentTime}
USER ARCHETYPE: ${archetype?.primary || 'unknown'}
AVAILABLE QUESTS: ${JSON.stringify(questSummary)}

RULES for ${archetype?.primary} archetype:
- Procrastinator: Start with easiest task, short sessions (25 min max)
- Perfectionist: Include "rough draft" framing, time-box tasks
- Poor Estimator: Add 50% buffer to all estimates
- Overloaded: Maximum 3 critical tasks, defer the rest
- Low Motivation: Start with most meaningful task, celebrate each completion

Return ONLY valid JSON:
{
  "greeting": "Personalized morning greeting based on archetype",
  "topPriority": "The single most important thing to do today",
  "schedule": [
    {
      "time": "9:00 AM",
      "title": "Quest title",
      "duration": "25 min",
      "tip": "Archetype-specific tip for this task",
      "priority": "high"
    }
  ],
  "archetypeTip": "Daily tip based on their archetype",
  "energyAdvice": "When to take breaks and why"
}`;

  try {
    const response = await genAI.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Schedule generation failed:', error);
    throw error;
  }
}

/**
 * Generate boss battle preparation quests
 */
export async function generateBossPrep(missionTitle, deadline, existingQuests) {
  const prompt = `You are LifeQuest AI. A Boss Battle is approaching — a major deadline.

BOSS BATTLE: "${missionTitle}"
DEADLINE: ${deadline}
EXISTING QUESTS: ${JSON.stringify(existingQuests.map(q => q.title))}

Generate 3-5 preparation quests that help the user get ready for this deadline.
Each prep quest should be specific and achievable in 20-40 minutes.

Return ONLY valid JSON:
{
  "bossName": "Creative boss battle name",
  "bossEmoji": "Fitting emoji",
  "prepQuests": [
    {
      "title": "Prep quest title",
      "description": "Specific actionable description",
      "difficulty": 2,
      "estimatedMinutes": 25,
      "order": 1
    }
  ],
  "battleCry": "Motivational battle cry for the user"
}`;

  try {
    const response = await genAI.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.8,
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Boss prep generation failed:', error);
    throw error;
  }
}

/**
 * Universal AI Task Evaluator — scores work quality 1-5
 * Used for both quests and duels
 */
export async function evaluateTaskSubmission({
  taskTitle, taskDescription, category,
  evaluationCriteria,
  submissionBase64, submissionMimeType,
  submissionText,
  difficulty
}) {
  const categoryGuides = {
    design: 'Evaluate creativity, visual hierarchy, color usage, originality, and overall aesthetic quality.',
    writing: 'Evaluate clarity, structure, grammar, persuasiveness, style, and depth of thought.',
    coding: 'Evaluate correctness, code quality, edge cases handled, efficiency, and readability.',
    reasoning: 'Evaluate logic, depth of analysis, evidence provided, and quality of conclusions.',
    fitness: 'Evaluate effort shown, proper form (if visible), consistency, and achievement of fitness goals.',
    learning: 'Evaluate comprehension demonstrated, quality of notes/summary, and practical application shown.',
    hackathon: 'Evaluate innovation, technical complexity, completeness, presentation quality, and real-world impact.',
    custom: 'Evaluate overall quality, effort, completeness, and how well it meets the task requirements.',
  };

  const criteriaText = evaluationCriteria
    || categoryGuides[category]
    || categoryGuides.custom;

  const prompt = `You are LifeQuest AI's Impartial Task Evaluator. You evaluate real-life task submissions with ZERO bias — like a fair but encouraging judge.

TASK: "${taskTitle}"
DESCRIPTION: "${taskDescription || 'No description provided'}"
CATEGORY: ${category || 'custom'}
DIFFICULTY: ${difficulty}/5 stars
EVALUATION CRITERIA: ${criteriaText}

${submissionText ? `SUBMISSION TEXT:\n${submissionText}\n` : ''}

SCORING RUBRIC (be honest but encouraging):
- 1/5 "Needs Work" — Minimal effort or doesn't match requirements. Give constructive direction.
- 2/5 "Getting There" — Shows effort but has significant gaps. Acknowledge the attempt.
- 3/5 "Solid Work" — Meets requirements. Fundamentals are there. Good effort.
- 4/5 "Impressive" — Above average quality. Shows clear skill and dedication.
- 5/5 "Masterpiece" — Exceptional work. Outstanding quality that goes above and beyond.

RULES:
- Be IMPARTIAL — score based purely on quality, not on feelings
- Be ENCOURAGING — even low scores should motivate improvement
- Provide specific, actionable feedback
- Identify clear strengths (at least 1)
- Suggest specific improvements (at least 1)
- Never be harsh or demeaning

Return ONLY valid JSON:
{
  "score": 4,
  "scoreLabel": "Impressive",
  "feedback": "Detailed constructive feedback about the submission (2-3 sentences)",
  "strengths": ["Specific strength 1", "Specific strength 2"],
  "improvements": ["Specific actionable improvement 1"],
  "categoryInsight": "A brief insight specific to this category of work"
}`;

  try {
    const contentParts = [{ text: prompt }];

    // Add file submission if provided
    if (submissionBase64 && submissionMimeType) {
      contentParts.push({
        inlineData: {
          mimeType: submissionMimeType,
          data: submissionBase64,
        },
      });
    }

    const response = await genAI.models.generateContent({
      model: geminiModel,
      contents: [{ role: 'user', parts: contentParts }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Task evaluation failed:', error);
    throw error;
  }
}

/**
 * AI-decided penalty for dropping / missing a task or duel challenge.
 * The model weighs task complexity AND the user's track record, then returns
 * an HP (XP) loss and coin loss with a short human-readable rationale.
 *
 * Falls back to a deterministic formula if the AI call fails.
 */
export async function decidePenalty({ action, taskTitle, difficulty = 3, stakeHP = 0, userStats = {} }) {
  const {
    tasksDropped = 0, perfectStreak = 0, level = 0,
    completionRate = 0, onTimeStreak = 0,
  } = userStats;

  const prompt = `You are LifeQuest AI's Fairness Engine. Decide a fair penalty when a user ${action === 'late' ? 'submits a task LATE' : 'DROPS/abandons a task'}.

TASK: "${taskTitle || 'a task'}"
DIFFICULTY: ${difficulty}/5
DUEL STAKE (HP), if any: ${stakeHP}

USER TRACK RECORD:
- Tasks dropped before: ${tasksDropped}
- Current perfect streak: ${perfectStreak}
- On-time streak: ${onTimeStreak}
- Level: ${level}
- Completion rate: ${completionRate}%

POLICY:
- Repeat droppers / low completion rate → harsher penalty.
- Strong streaks / high completion rate → more lenient (give grace).
- Higher difficulty tasks → slightly softer (they were hard).
- hpLoss range 10-150. coinLoss range 0-60. Keep it motivating, never crushing.

Return ONLY valid JSON:
{
  "hpLoss": 40,
  "coinLoss": 15,
  "severity": "light|moderate|harsh",
  "reason": "One short sentence explaining the decision to the user."
}`;

  try {
    const response = await genAI.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0.4 },
    });
    const out = JSON.parse(response.text);
    return {
      hpLoss: Math.max(0, Math.min(150, Math.round(out.hpLoss ?? 40))),
      coinLoss: Math.max(0, Math.min(60, Math.round(out.coinLoss ?? 10))),
      severity: out.severity || 'moderate',
      reason: out.reason || 'Penalty applied for an incomplete commitment.',
    };
  } catch (error) {
    console.error('Penalty decision failed, using fallback:', error);
    // Deterministic fallback
    const base = action === 'late' ? 25 : 40;
    const repeatMult = 1 + Math.min(tasksDropped, 5) * 0.15;
    const grace = perfectStreak >= 5 ? 0.6 : 1;
    const hpLoss = Math.max(10, Math.min(150, Math.round(base * repeatMult * grace)));
    return {
      hpLoss,
      coinLoss: Math.max(0, Math.min(60, Math.round(hpLoss * 0.25))),
      severity: hpLoss > 80 ? 'harsh' : hpLoss > 40 ? 'moderate' : 'light',
      reason: 'Penalty calculated from task difficulty and your recent track record.',
    };
  }
}

/**
 * Suggest duel challenges based on category and preferences
 */
export async function suggestDuelChallenges(category, playerCount, difficulty) {
  const prompt = `You are LifeQuest AI's Challenge Designer. Generate creative, fun, real-life challenges for a duel between ${playerCount} people.

CATEGORY: ${category || 'mixed'}
TARGET DIFFICULTY: ${difficulty}/5 stars
PLAYER COUNT: ${playerCount}

RULES:
- Generate exactly 3 challenge suggestions
- Each challenge must be completable in real life (not just theoretical)
- Challenges should be competitive — clear criteria for who did better
- Mix of creative and practical tasks
- Include clear evaluation criteria for AI scoring
- Suggest appropriate HP (Health Points) based on difficulty
- HP range: 50 (easy) to 200 (very hard)

Return ONLY valid JSON:
{
  "challenges": [
    {
      "title": "Clear challenge title",
      "description": "Detailed description of what participants must do and submit",
      "category": "${category || 'custom'}",
      "difficulty": ${difficulty},
      "suggestedHP": 100,
      "evaluationCriteria": "What the AI should evaluate when scoring submissions",
      "submissionType": "image|text|file",
      "estimatedMinutes": 30
    }
  ],
  "arenaTheme": "A fun theme name for this duel arena (e.g. 'The Creative Gauntlet')"
}`;

  try {
    const response = await genAI.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.9,
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Challenge suggestion failed:', error);
    throw error;
  }
}

/**
 * Refine a rough challenge name into a proper prompt
 * User types "make a logo" → AI returns a well-structured challenge
 */
export async function refineChallengePrompt(roughTitle, category) {
  const prompt = `You are LifeQuest AI's Challenge Promptsmith. A user typed a rough challenge idea. Transform it into a clear, exciting, well-structured challenge.

USER'S ROUGH IDEA: "${roughTitle}"
CATEGORY: ${category || 'custom'}

Transform this into a polished challenge with:
- A catchy, clear title
- A detailed description that explains exactly what to do
- Clear evaluation criteria for AI scoring
- Appropriate difficulty rating
- Suggested HP reward

Return ONLY valid JSON:
{
  "title": "Polished challenge title",
  "description": "Clear, detailed description of what to do and what to submit as proof",
  "category": "${category || 'custom'}",
  "difficulty": 3,
  "suggestedHP": 100,
  "evaluationCriteria": "Specific criteria for AI to evaluate submissions",
  "submissionType": "image|text|file",
  "estimatedMinutes": 30,
  "tips": "A helpful tip for participants"
}`;

  try {
    const response = await genAI.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Challenge refinement failed:', error);
    throw error;
  }
}

/**
 * Verify an uploaded certificate (for any event — hackathon, course, workshop, etc.)
 */
export async function verifyCertificate(certificateBase64, mimeType, eventDescription) {
  const prompt = `You are LifeQuest AI's Certificate Verification System. A user uploaded a certificate/achievement document and wants bonus coins.

EVENT/CONTEXT: "${eventDescription || 'Not specified'}"

Analyze the uploaded certificate and determine:
1. Is this a legitimate certificate/award/achievement document?
2. What type of event is it for? (hackathon, course, workshop, competition, etc.)
3. What organization issued it?
4. Rate the achievement significance (1-5)

Return ONLY valid JSON:
{
  "isValid": true,
  "eventType": "hackathon|course|workshop|competition|other",
  "issuer": "Organization name or 'Unknown'",
  "significance": 4,
  "summary": "Brief summary of the achievement",
  "bonusCoinsReason": "Why this deserves bonus coins"
}`;

  try {
    const response = await genAI.models.generateContent({
      model: geminiModel,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: certificateBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Certificate verification failed:', error);
    throw error;
  }
}

/**
 * Generate a complete duel mission tree from a single project/theme title
 */
export async function generateDuelMissionTree(theme, category) {
  const prompt = `You are LifeQuest AI — a game engine for real-life goals. You transform a user's duel theme into a structured set of challenges for a multiplayer duel.

DUEL THEME / PROJECT TITLE: "${theme}"
CATEGORY HINT: "${category || 'general'}"

RULES:
- Break the theme into 3-6 distinct challenges.
- Each challenge should be achievable and test a specific skill or progress point.
- Difficulty ranges from 1-5 stars.
- HP reward should correlate with difficulty (e.g., 50 for 1-star, 200 for 5-star).
- Enable AI Evaluation if the output is something the AI can rate (like a design, a code snippet, a written piece).

Return ONLY valid JSON in this exact format:
{
  "challenges": [
    {
      "title": "Challenge title",
      "description": "Clear actionable description",
      "difficulty": 3,
      "hp": 100,
      "category": "design",
      "enableAIEvaluation": true,
      "evaluationCriteria": "What to look for in the submission"
    }
  ]
}`;

  try {
    const response = await genAI.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const text = response.text;
    return JSON.parse(text);
  } catch (error) {
    console.error('Duel mission tree generation failed:', error);
    throw error;
  }
}
