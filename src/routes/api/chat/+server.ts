// src/routes/api/chat/+server.ts

import { json, type RequestHandler } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { PROMPT, searchVendorsForAi } from '$lib/server/prompt';
import { env } from '$env/dynamic/private';
import { takeToken } from '$lib/server/rateLimit';

// Import Google Gen AI SDK
import { GoogleGenAI, Type, type Content, type FunctionResponse } from '@google/genai';

const CHAT_LIMIT_COOKIE = 'leora_chat_limit';

const MAX_AI_PROMPTS = 10;
const LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60;

// Created on first use, so a missing key disables chat instead of failing the build.
let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
	if (!env.GEMINI_KEY) throw new Error('GEMINI_KEY is not configured');
	return (client ??= new GoogleGenAI({ apiKey: env.GEMINI_KEY }));
}

// Using a standard high-efficiency Gemini model
const MODEL = 'gemini-3.5-flash-lite';

type ChatMessage = {
	role: 'user' | 'assistant' | 'system';
	content: string;
};

type ChatLimitPayload = {
	count: number;
	resetAt: number;
};

function base64url(value: string) {
	return Buffer.from(value).toString('base64url');
}

function fromBase64url(value: string) {
	return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value: string) {
	return createHmac('sha256', env.CHAT_LIMIT_SECRET || env.BETTER_AUTH_SECRET || '').update(value).digest('base64url');
}

function makeSignedCookie(payload: ChatLimitPayload) {
	const encodedPayload = base64url(JSON.stringify(payload));
	const signature = sign(encodedPayload);

	return `${encodedPayload}.${signature}`;
}

function readSignedCookie(cookieValue: string | undefined): ChatLimitPayload | null {
	if (!cookieValue) return null;

	const [encodedPayload, signature] = cookieValue.split('.');

	if (!encodedPayload || !signature) return null;

	const expectedSignature = sign(encodedPayload);

	const signatureBuffer = Buffer.from(signature);
	const expectedBuffer = Buffer.from(expectedSignature);

	if (
		signatureBuffer.length !== expectedBuffer.length ||
		!timingSafeEqual(signatureBuffer, expectedBuffer)
	) {
		return null;
	}

	try {
		return JSON.parse(fromBase64url(encodedPayload)) as ChatLimitPayload;
	} catch {
		return null;
	}
}

function checkAndUpdateChatLimit(cookies: import('@sveltejs/kit').Cookies) {
	const now = Date.now();

	const existing = readSignedCookie(cookies.get(CHAT_LIMIT_COOKIE));

	let payload: ChatLimitPayload;

	if (!existing || existing.resetAt <= now) {
		payload = {
			count: 1,
			resetAt: now + LIMIT_WINDOW_MS
		};
	} else {
		if (existing.count >= MAX_AI_PROMPTS) {
			return {
				allowed: false,
				remaining: 0,
				resetAt: existing.resetAt
			};
		}

		payload = {
			count: existing.count + 1,
			resetAt: existing.resetAt
		};
	}

	cookies.set(CHAT_LIMIT_COOKIE, makeSignedCookie(payload), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: COOKIE_MAX_AGE_SECONDS
	});

	return {
		allowed: true,
		remaining: MAX_AI_PROMPTS - payload.count,
		resetAt: payload.resetAt
	};
}

const tools = [
	{
		functionDeclarations: [
			{
				name: 'searchVendors',
				description:
					'Search approved wedding vendors listed on Leora Events. Use for questions about finding vendors, venues, photographers, decor, catering, prices or availability by category or city.',
				parameters: {
					type: Type.OBJECT,
					properties: {
						query: {
							type: Type.STRING,
							description: 'Free-text search, for example "photographer", "garden venue", "habesha kemis".'
						},
						categoryName: {
							type: Type.STRING,
							description: 'Optional vendor category name, for example "Photography" or "Venues".'
						},
						city: {
							type: Type.STRING,
							description: 'Optional city, for example "Addis Ababa" or "Bahir Dar".'
						},
						verifiedOnly: {
							type: Type.BOOLEAN,
							description: 'Return only vendors with the verified badge.'
						},
						limit: {
							type: Type.INTEGER,
							description: 'Maximum number of vendors to return, between 1 and 8.'
						}
					}
				}
			}
		]
	}
];

const str = (v: unknown, max: number) =>
	typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;

function cleanToolArgs(args: unknown) {
	const a = (args && typeof args === 'object' ? args : {}) as Record<string, unknown>;
	return {
		query: str(a.query, 100),
		categoryName: str(a.categoryName, 50),
		city: str(a.city, 50),
		verifiedOnly: a.verifiedOnly === true,
		limit: typeof a.limit === 'number' ? Math.max(1, Math.min(8, Math.floor(a.limit))) : 5
	};
}

/** Per message and per conversation, so one request can't run up a large Gemini bill. */
const MAX_MESSAGE_CHARS = 2000;

export const POST: RequestHandler = async ({ request, cookies, getClientAddress, locals }) => {
	try {
		const { messages } = (await request.json()) as {
			messages: ChatMessage[];
		};

		if (
			!Array.isArray(messages) ||
			messages.some((m) => typeof m?.content !== 'string' || m.content.length > MAX_MESSAGE_CHARS)
		) {
			return json({ error: 'Invalid messages format.' }, { status: 400 });
		}

		// The cookie is easy to clear, so the server also counts per IP (and per account).
		const serverKey = locals.user ? `chat:user:${locals.user.id}` : `chat:ip:${getClientAddress()}`;
		if (!takeToken(serverKey, { capacity: MAX_AI_PROMPTS, perMinute: MAX_AI_PROMPTS / (24 * 60) })) {
			return json(
				{ error: 'You have reached the chat limit. Please try again later.' },
				{ status: 429 }
			);
		}

		const limit = checkAndUpdateChatLimit(cookies);

		if (!limit.allowed) {
			return json(
				{
					error: 'You have reached the chat limit for this device. Please try again later.',
					resetAt: new Date(limit.resetAt).toISOString()
				},
				{ status: 429 }
			);
		}

		// Keep last 10 messages and transform OpenAI format to Gemini 'Content' format
		const safeMessages = messages
			.filter((message) => message.role === 'user' || message.role === 'assistant')
			.slice(-10);

		const contents: Content[] = safeMessages.map((message) => ({
			role: message.role === 'assistant' ? 'model' : 'user',
			parts: [{ text: message.content }]
		}));

		/**
		 * First request:
		 * Send history and configurations to Gemini.
		 */
		const firstResponse = await ai().models.generateContent({
			model: MODEL,
			contents: contents,
			config: {
				systemInstruction: PROMPT,
				tools: tools
			}
		});

		const functionCalls = firstResponse.functionCalls;

		/**
		 * If Gemini did not call a function, return the final text response.
		 */
		if (!functionCalls || functionCalls.length === 0) {
			return json({
				reply: firstResponse.text || 'Sorry, I could not answer that right now.'
			});
		}

		/**
		 * To chain a multi-turn conversation back to Gemini with function tool execution,
		 * we append both the model's structure generation output and our function call output.
		 */
		const followUpContents = [...contents];

		// 1. Append the model's turnaround containing the function call requests
		if (firstResponse.candidates?.[0]?.content) {
			followUpContents.push(firstResponse.candidates[0].content);
		}

		const functionResponses: FunctionResponse[] = [];

		for (const call of functionCalls) {
			if (call.name !== 'searchVendors') {
				functionResponses.push({
					name: call.name,
					response: { error: 'Unknown function call.' }
				});
				continue;
			}

			try {
				const args = cleanToolArgs(call.args);
				const result = await searchVendorsForAi(args);

				functionResponses.push({
					name: call.name,
					response: { result: result }
				});
			} catch (error) {
				console.error('searchVendors failed:', error);
				functionResponses.push({
					name: call.name,
					response: {
						error:
							'Vendor search failed. Suggest the user browse the Vendors page or contact Leora support.'
					}
				});
			}
		}

		// 2. Append the execution output to the conversation history under the 'function' role
		followUpContents.push({
			role: 'function',
			parts: functionResponses.map((res) => ({ functionResponse: res }))
		});

		/**
		 * Second request:
		 * Provide the tool outputs so Gemini can form its final string.
		 */
		const finalResponse = await ai().models.generateContent({
			model: MODEL,
			contents: followUpContents,
			config: {
				systemInstruction: PROMPT,
				tools: tools
			}
		});

		return json({
			reply: finalResponse.text || 'Sorry, I could not answer that right now.'
		});
	} catch (error) {
		console.error(error);

		return json(
			{
				error: 'Something went wrong while sending your message.'
			},
			{ status: 500 }
		);
	}
};
