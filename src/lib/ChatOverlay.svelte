<script>
    import { scale, fade } from "svelte/transition";

    import { onMount } from "svelte";
    import { marked } from "marked";

    let { open = $bindable(), apod = $bindable() } = $props();
    let initialized = $state(false);
    let chatContainer;
    let isTyping = $state(false);
    let currentApodDate = $state("");

    // Format date to be more readable
    function formatDate(dateString) {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }

    // Get thumbnail for YouTube videos
    function getThumbnail(url) {
        const youtubeRegex =
            /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(youtubeRegex);

        if (match && match[1]) {
            const videoId = match[1];
            return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }

        return "/assets/images/vid_thumb.webp";
    }

    let messageInput = $state("");
    let messages = $state([]);

    $effect(() => {
        // Reset initialized state and messages when apod changes or chat is opened
        if (apod?.date && open && !initialized) {
            initialized = false;
            messages = [];
            currentApodDate = apod.date;

            if (!initialized) {
                const systemPrompt = `You are an astronomy expert assistant for alternative frontend of NASA's Astronomy Picture of the Day (APOD) website. This is an alternative frontend to apod.nasa.gov where users can explore and learn about daily astronomy images and videos.

                You are discussing the APOD titled "${apod.title}" from ${formatDate(apod.date)}. The content shows: ${apod.explanation?.slice(0, 200)}...

                Your role is to:
                1. Explain the astronomical significance of this content
                2. Answer questions about the objects, phenomena, and science shown
                3. Provide historical context and related discoveries
                4. Help users understand the scale and importance of what they're seeing

                Please be informative yet accessible, and feel free to reference related astronomical concepts and discoveries. Keep reponses consise, clear and very informative.`;

                messages = [
                    {
                        role: "system",
                        content: systemPrompt,
                    },
                ];
                suggestedQuestions = generateSuggestedQuestions(apod);
                initialized = true;
            }
        }
    });

    // Auto-scroll to bottom when messages change
    $effect(() => {
        if (chatContainer && messages.length > 0) {
            setTimeout(() => {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }, 0);
        }
    });

    // Generate suggested questions based on APOD content
    function generateSuggestedQuestions(apod) {
        const questions = [
            `What makes this ${apod.media_type === "image" ? "image" : "video"} scientifically significant?`,
            `Can you explain the key features visible in this ${apod.media_type === "image" ? "photograph" : "footage"}?`,
            `What's the historical significance of ${apod.title}?`,
            `How does this relate to other astronomical discoveries?`,
        ];
        return questions;
    }

    let suggestedQuestions = $state([]);

    function askSuggestedQuestion(question) {
        messageInput = question;
        handleSubmit();
    }

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!messageInput.trim()) return;

        messages = [...messages, { role: "user", content: messageInput }];
        const userMessage = messageInput;
        messageInput = "";
        isTyping = true;

        chatContainer.scrollTop = chatContainer.scrollHeight;

        try {
            // Pass the entire messages array to maintain chat history with streaming enabled
            const stream = await puter.ai.chat(messages, {
                stream: true,
                // testMode: true,
            });

            let streamedResponse = "";
            for await (const chunk of stream) {
                streamedResponse += chunk?.text ?? "";
                const cleanedResponse = streamedResponse;
                // Check if we already have an assistant response
                const hasAssistantResponse =
                    messages.length > 0 &&
                    messages[messages.length - 1].role === "assistant";
                if (hasAssistantResponse) {
                    // Update the existing assistant response
                    messages = [
                        ...messages.slice(0, -1),
                        {
                            role: "assistant",
                            content: cleanedResponse,
                        },
                    ];

                    chatContainer.scrollTop = chatContainer.scrollHeight;
                } else {
                    // Add a new assistant response
                    messages = [
                        ...messages,
                        {
                            role: "assistant",
                            content: cleanedResponse,
                        },
                    ];

                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            }
            // Final message is already added through streaming
        } catch (error) {
            messages = [
                ...messages,
                {
                    role: "assistant",
                    content:
                        "I apologize, but I'm having trouble connecting right now. Please try again later.",
                },
            ];
            console.error("Chat error:", error);
        } finally {
            isTyping = false;
        }
    };

    const handleKeydown = (e) => {
        if (e.key === "Escape") {
            open = false;
        } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    };
</script>

<svelte:head>
    <link rel="stylesheet" href="/assets/css/unreset.css" />
</svelte:head>

{#if open}
    <div
        transition:fade
        class="fixed inset-0 bg-black/30 flex justify-center items-end sm:items-center p-4 z-50"
    >
        <div
            transition:scale
            class="w-full max-w-3xl bg-neutral-900/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl"
        >
            {#if apod}
                <div
                    class="p-4 border-b border-white/10 flex items-center gap-4"
                >
                    <div
                        class="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800"
                    >
                        <img
                            src={apod.media_type === "image"
                                ? apod.url
                                : getThumbnail(apod.url)}
                            alt={apod.title}
                            class="w-full h-full object-cover"
                        />
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-medium truncate">{apod.title}</h3>
                        <p class="text-sm text-neutral-400">
                            {formatDate(apod.date)}
                        </p>
                    </div>
                </div>
            {/if}
            <div
                class="p-4 border-b border-white/10 flex justify-between items-center"
            >
                <h2 class="text-lg font-semibold">Your Cosmic Guide</h2>
                <button
                    onclick={() => {
                        open = false;
                        initialized = false;
                        messages = [];
                    }}
                    class="text-neutral-400 hover:text-white duration-300"
                    aria-label="Close"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                    </svg>
                </button>
            </div>

            <div
                bind:this={chatContainer}
                class="h-[60vh] overflow-y-auto p-4 space-y-4"
            >
                {#if messages.filter((m) => m.role !== "system").length === 0 && suggestedQuestions.length > 0}
                    <div class="mb-6">
                        <p class="text-neutral-400 text-sm mb-3 italic">
                            This chat feature uses third-party AI services. This
                            website is an open source community project and does
                            not collect, store, or monetize your conversations.
                            AI responses may contain inaccuracies - please
                            verify important information.
                        </p>
                        <p class="text-neutral-400 text-sm mb-3">
                            Suggested questions about this astronomy picture:
                        </p>
                        <div class="flex flex-col gap-2">
                            {#each suggestedQuestions as question}
                                <button
                                    onclick={() =>
                                        askSuggestedQuestion(question)}
                                    class="text-left bg-neutral-800/70 hover:bg-neutral-700/70 text-sm p-3 rounded-xl transition-colors duration-200 border border-white/10"
                                >
                                    {question}
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}

                {#each messages.filter((m) => m.role !== "system") as message}
                    <div
                        class="flex gap-3 {message.role === 'assistant'
                            ? 'flex-row'
                            : 'flex-row-reverse'}"
                        transition:fade|local={{ duration: 200 }}
                    >
                        <div
                            class="w-8 h-8 rounded-full bg-neutral-700/80 flex-shrink-0 flex items-center justify-center backdrop-blur-sm border border-white/5 shadow-lg"
                        >
                            {#if message.role === "assistant"}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <polygon
                                        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                                    />
                                </svg>
                            {:else}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path
                                        d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
                                    />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            {/if}
                        </div>
                        <div
                            class="unreset flex-1 bg-neutral-800/50 backdrop-blur-sm rounded-2xl px-4 {message.role !=
                            'assistant'
                                ? 'py-4'
                                : ''} text-sm markdown-content border border-white/5 shadow-lg hover:border-white/10 transition-colors duration-200"
                        >
                            {@html message.role === "assistant"
                                ? marked.parse(message.content)
                                : message.content}
                        </div>
                    </div>
                {/each}
            </div>

            <div class="p-4 border-t border-white/10">
                <form onsubmit={handleSubmit} class="flex gap-2">
                    <textarea
                        bind:value={messageInput}
                        onkeydown={handleKeydown}
                        placeholder="Type your message..."
                        rows="1"
                        class="flex-1 bg-neutral-800/50 rounded-xl p-3 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                    <button
                        type="submit"
                        class="bg-white text-black rounded-xl px-4 py-2 font-medium hover:bg-neutral-200 duration-300"
                        disabled={!messageInput.trim() || isTyping}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    </div>
{/if}

<style>
    @keyframes shine {
        100% {
            transform: translateX(100%);
        }
    }

    @keyframes blink {
        0%,
        100% {
            opacity: 0;
        }
        50% {
            opacity: 1;
        }
    }
</style>
