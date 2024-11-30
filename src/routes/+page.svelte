<script>
    // @ts-nocheck
    import { onMount } from "svelte";
    import { register } from "swiper/element/bundle";
    import tippy from "tippy.js";
    import "tippy.js/dist/tippy.css";
    import { fade } from "svelte/transition";
    import { PUBLIC_API_KEY } from "$env/static/public";
    import ImagePreview from "$lib/ImagePreview.svelte";
    import AboutPopup from "$lib/AboutPopup.svelte";

    let loading = $state(true);
    let apods = $state([]);
    let currentIndex = $state(0);
    let monthsToLoad = $state(1);
    let loadingMore = $state(false);
    let error = $state({
        error: false,
        msg: "",
    });

    let viewAbout = $state(false);
    let apiCallsLeft = $state(-1);

    let open = $state(false);
    let image = $state("");

    async function requestMonthlyApods(startMonth, endMonth) {
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() - startMonth);

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - endMonth);

        try {
            const rawResponse = await fetch(
                `https://api.nasa.gov/planetary/apod?start_date=${startDate.toISOString().split("T")[0]}&end_date=${endDate.toISOString().split("T")[0]}&api_key=${PUBLIC_API_KEY}`,
                {
                    method: "GET",
                    headers: {
                        "X-Message-To-User":
                            "Please Don't Steal API Key; Get your own at api.nasa.gov.",
                    },
                },
            );

            apiCallsLeft = parseInt(
                rawResponse.headers.get("x-ratelimit-remaining"),
            );
            const jsonResponse = await rawResponse.json();
            return jsonResponse.reverse();
        } catch (e) {
            error.error = true;
            error.msg = e.message;
            return [];
        }
    }

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

    async function loadMoreApods() {
        if (loadingMore) return;

        loadingMore = true;

        const oldestDate = new Date(apods[apods.length - 1].date);

        const endDate = new Date(oldestDate);
        endDate.setDate(endDate.getDate() - 1);

        const startDate = new Date(oldestDate);
        startDate.setMonth(startDate.getMonth() - 1);

        let rawResponse;

        try {
            rawResponse = await fetch(
                `https://api.nasa.gov/planetary/apod?start_date=${startDate.toISOString().split("T")[0]}&end_date=${endDate.toISOString().split("T")[0]}&api_key=${PUBLIC_API_KEY}`,
                {
                    method: "GET",
                },
            );
        } catch (e) {
            error.error = true;
            error.msg = e.message;
            return [];
        }

        apiCallsLeft = parseInt(
            rawResponse.headers.get("x-ratelimit-remaining"),
        );
        const newApods = await rawResponse.json();
        apods = [...apods, ...newApods.reverse()];
        if (apods.length > 0) {
            localStorage.setItem("latestApod", JSON.stringify(apods[0]));
        }
        loadingMore = false;
    }

    async function goNext() {
        if (currentIndex < apods.length - 1) {
            currentIndex++;
        }

        if (currentIndex >= apods.length - 10) {
            loadMoreApods();
        }
    }

    function goPrev() {
        if (currentIndex > 0) {
            currentIndex--;
        }
    }

    onMount(async () => {
        loading = true;
        loadingMore = true;

        const cached = localStorage.getItem("latestApod");
        if (cached) {
            apods = [JSON.parse(cached)];
            loading = false;
        }

        const freshApods = await requestMonthlyApods(0, monthsToLoad);
        apods = freshApods;
        if (freshApods.length > 0) {
            localStorage.setItem("latestApod", JSON.stringify(freshApods[0]));
        }

        loading = false;
        loadingMore = false;

        register();

        setTimeout(() => {
            const swiperEl = document.querySelector("swiper-container");
            if (swiperEl) {
                swiperEl.addEventListener("swiperslidechange", (e) => {
                    currentIndex = e?.detail[0]?.activeIndex ?? 0;

                    if (currentIndex >= apods.length - 10) {
                        loadMoreApods();
                    }
                });
            }
            tippy("[data-tippy-content]");
        }, 100);
    });
</script>

<svelte:head>
    <title>
        Astronomy Picture of The Day{apods[currentIndex]
            ? ": " + apods[currentIndex].title
            : ""}
    </title>
    <meta
        name="description"
        content="An unofficial client for the Astronomy Picture of The Day (APOD) by NASA. Everyday a space/science related picture is featured, accompanied by an explanation."
    />
    <meta
        name="keywords"
        content="NASA, astronomy, space, APOD, cosmos, universe, science, astrophotography, picture, daily"
    />
    <meta property="title" content="Astronomy Picture of The Day" />
    <meta property="og:title" content="Astronomy Picture of The Day" />
    <meta
        property="og:description"
        content="An unofficial client for the Astronomy Picture of The Day (APOD) by NASA. Everyday a space/science related picture is featured, accompanied by an explanation."
    />
    <meta property="og:image" content="/assets/images/social.webp" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta
        name="twitter:title"
        content="Astronomy Picture of The Day (by @akatiggerx04)"
    />
    <meta
        name="twitter:description"
        content="An unofficial client for the Astronomy Picture of The Day (APOD) by NASA. Everyday a space/science related picture is featured, accompanied by an explanation."
    />
    <script src="/assets/js/swiper.min.js"></script>
</svelte:head>

<!-- Page Title -->
<div
    class="top-0 left-0 static xl:fixed flex justify-center items-center flex-col text-center w-full pt-6 xl:pt-8 pb-4 mxl:pb-0 z-30"
>
    <h1 class="doto xl:text-xl text-lg font-semibold mx-4 drop-shadow-lg">
        🪐 Astronomy Picture Of The Day
    </h1>
    {#if apods?.length && apods[currentIndex].date}
        <p class="doto drop-shadow-lg">
            - {new Date(apods[currentIndex].date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
            })} -
        </p>
    {/if}
</div>
<!-- End Page Title -->

<!-- Background Image -->
<div
    class="w-screen h-screen fixed -z-10 top-0 left-0 bg-cover bg-no-repeat bg-center blur-xl opacity-10 transition-all duration-500"
    style="background-image: url('{error.error || loading
        ? '/assets/images/default_jwst.webp'
        : apods[currentIndex]?.media_type == 'image'
          ? apods[currentIndex]?.url
          : apods[currentIndex]?.media_type == 'video'
            ? getThumbnail(apods[currentIndex]?.url)
            : '/assets/images/vid_thumb.webp'}');"
></div>
<!-- End Background Image -->

{#if loading && error.error == false}
    <section class="flex justify-center items-center flex-col h-screen w-full">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="2em"
            height="2em"
            class="animate-spin text-neutral-300"
            viewBox="0 0 1024 1024"
            ><rect width="1024" height="1024" fill="none" /><path
                fill="currentColor"
                d="M512 64a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V96a32 32 0 0 1 32-32m0 640a32 32 0 0 1 32 32v192a32 32 0 1 1-64 0V736a32 32 0 0 1 32-32m448-192a32 32 0 0 1-32 32H736a32 32 0 1 1 0-64h192a32 32 0 0 1 32 32m-640 0a32 32 0 0 1-32 32H96a32 32 0 0 1 0-64h192a32 32 0 0 1 32 32M195.2 195.2a32 32 0 0 1 45.248 0L376.32 331.008a32 32 0 0 1-45.248 45.248L195.2 240.448a32 32 0 0 1 0-45.248m452.544 452.544a32 32 0 0 1 45.248 0L828.8 783.552a32 32 0 0 1-45.248 45.248L647.744 692.992a32 32 0 0 1 0-45.248M828.8 195.264a32 32 0 0 1 0 45.184L692.992 376.32a32 32 0 0 1-45.248-45.248l135.808-135.808a32 32 0 0 1 45.248 0m-452.544 452.48a32 32 0 0 1 0 45.248L240.448 828.8a32 32 0 0 1-45.248-45.248l135.808-135.808a32 32 0 0 1 45.248 0"
            />
        </svg>
        <noscript>
            <div class="mt-4 text-center">
                <p>Please Enable JavaScript</p>
                <p class="text-sm text-neutral-300">
                    JavaScript is required to fetch and display APODs
                </p>
            </div>
        </noscript>
    </section>
{:else if error.error == true}
    <section
        class="flex justify-center items-center flex-col mt-12 xl:mt-0 xl:h-screen w-full px-12 xl:px-4"
    >
        <div class="space-y-4">
            <p class="text-2xl font-semibold">Houston, We Have a Problem! 🚀</p>
            <p class="text-neutral-400">
                Our telescope seems to be experiencing some interference...
            </p>
            <p
                class="bg-red-800/10 px-4 py-2 rounded-lg font-mono text-sm backdrop-blur-lg"
            >
                {error.msg}
            </p>
            <p class="text-sm text-neutral-300">
                Try refreshing the page or check back later
            </p>
        </div>
    </section>
{:else if apods}
    {#if loadingMore}
        <div class="xl:block hidden fixed left-5 top-5 xl:z-10 z-30">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1.3em"
                height="1.3em"
                class="animate-spin text-neutral-300"
                viewBox="0 0 1024 1024"
                ><rect width="1024" height="1024" fill="none" /><path
                    fill="currentColor"
                    d="M512 64a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V96a32 32 0 0 1 32-32m0 640a32 32 0 0 1 32 32v192a32 32 0 1 1-64 0V736a32 32 0 0 1 32-32m448-192a32 32 0 0 1-32 32H736a32 32 0 1 1 0-64h192a32 32 0 0 1 32 32m-640 0a32 32 0 0 1-32 32H96a32 32 0 0 1 0-64h192a32 32 0 0 1 32 32M195.2 195.2a32 32 0 0 1 45.248 0L376.32 331.008a32 32 0 0 1-45.248 45.248L195.2 240.448a32 32 0 0 1 0-45.248m452.544 452.544a32 32 0 0 1 45.248 0L828.8 783.552a32 32 0 0 1-45.248 45.248L647.744 692.992a32 32 0 0 1 0-45.248M828.8 195.264a32 32 0 0 1 0 45.184L692.992 376.32a32 32 0 0 1-45.248-45.248l135.808-135.808a32 32 0 0 1 45.248 0m-452.544 452.48a32 32 0 0 1 0 45.248L240.448 828.8a32 32 0 0 1-45.248-45.248l135.808-135.808a32 32 0 0 1 45.248 0"
                />
            </svg>
        </div>
    {/if}

    <section transition:fade class="grid xl:grid-cols-2 gap-y-4 w-full z-20">
        <!-- Mobile Section -->
        <section class="block xl:hidden">
            <button
                aria-label="Preview in HD"
                class="w-full aspect-1 md:aspect-2"
                onclick={() => {
                    if (
                        apods[currentIndex]?.media_type == "image" &&
                        apods[currentIndex]?.hdurl
                    ) {
                        image = apods[currentIndex]?.hdurl;
                        open = true;
                    }
                }}
            >
                {#if apods[currentIndex]?.media_type == "image"}
                    <div
                        class="w-full h-full bg-cover bg-no-repeat bg-center"
                        style="background-image: url('{apods[currentIndex]
                            ?.url}');"
                    ></div>
                {:else if apods[currentIndex]?.media_type == "video"}
                    <div
                        class="w-full h-full bg-cover bg-no-repeat bg-center flex justify-center items-center mb-[6px]"
                        style="background-image: url('{getThumbnail(
                            apods[currentIndex]?.url,
                        )}');"
                    >
                        <a href={apods[currentIndex]?.url} target="_blank">
                            <div
                                class="bg-white rounded-xl text-black px-4 py-2 flex gap-2 items-center"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="1.3em"
                                    height="1.3em"
                                    viewBox="0 0 24 24"
                                    ><rect
                                        width="24"
                                        height="24"
                                        fill="none"
                                    /><path
                                        fill="currentColor"
                                        stroke="currentColor"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="1.5"
                                        d="M6.906 4.537A.6.6 0 0 0 6 5.053v13.894a.6.6 0 0 0 .906.516l11.723-6.947a.6.6 0 0 0 0-1.032z"
                                    />
                                </svg>
                                Play Video
                            </div>
                        </a>
                    </div>
                {:else}
                    <div
                        class="w-full h-full flex justify-center items-center mb-[6px]"
                    >
                        <p class="doto">Unknown Media Type</p>
                    </div>
                {/if}
            </button>

            <!-- Mobile Navigation -->
            <div
                class="grid grid-cols-3 justify-between items-center gap-4 p-4 xl:hidden h-14"
            >
                <div>
                    {#if apods[currentIndex - 1]}
                        <button
                            class="bg-white/10 backdrop-blur-xl px-4 py-2 rounded-xl text-sm"
                            disabled={currentIndex === 0}
                            onclick={goPrev}
                        >
                            ←
                            {new Date(
                                apods[currentIndex - 1].date,
                            ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                            })}
                        </button>
                    {/if}
                </div>

                <div class="flex justify-center items-center">
                    {#if loadingMore}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="1.3em"
                            height="1.3em"
                            class="animate-spin text-neutral-300"
                            viewBox="0 0 1024 1024"
                            ><rect
                                width="1024"
                                height="1024"
                                fill="none"
                            /><path
                                fill="currentColor"
                                d="M512 64a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V96a32 32 0 0 1 32-32m0 640a32 32 0 0 1 32 32v192a32 32 0 1 1-64 0V736a32 32 0 0 1 32-32m448-192a32 32 0 0 1-32 32H736a32 32 0 1 1 0-64h192a32 32 0 0 1 32 32m-640 0a32 32 0 0 1-32 32H96a32 32 0 0 1 0-64h192a32 32 0 0 1 32 32M195.2 195.2a32 32 0 0 1 45.248 0L376.32 331.008a32 32 0 0 1-45.248 45.248L195.2 240.448a32 32 0 0 1 0-45.248m452.544 452.544a32 32 0 0 1 45.248 0L828.8 783.552a32 32 0 0 1-45.248 45.248L647.744 692.992a32 32 0 0 1 0-45.248M828.8 195.264a32 32 0 0 1 0 45.184L692.992 376.32a32 32 0 0 1-45.248-45.248l135.808-135.808a32 32 0 0 1 45.248 0m-452.544 452.48a32 32 0 0 1 0 45.248L240.448 828.8a32 32 0 0 1-45.248-45.248l135.808-135.808a32 32 0 0 1 45.248 0"
                            />
                        </svg>
                    {/if}
                </div>

                <div class="justify-end flex items-center">
                    {#if apods[currentIndex + 1]}
                        <button
                            class="bg-white/10 backdrop-blur-xl px-4 py-2 rounded-xl text-sm"
                            disabled={currentIndex === apods.length - 1}
                            onclick={goNext}
                        >
                            {new Date(
                                apods[currentIndex + 1].date,
                            ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                            })}
                            →
                        </button>
                    {/if}
                </div>
            </div>
        </section>

        <!-- Desktop Section -->
        <div
            class="hidden xl:flex justify-center items-center h-auto xl:h-[100vh] overflow-x-clip xl:[mask-image:linear-gradient(to_left,transparent,black_20%)]"
        >
            <swiper-container
                class="apodSwiper max-w-[80vw] xl:max-w-[35vw] pt-8 select-none"
                effect="cards"
                grab-cursor="true"
                observer="true"
            >
                {#each apods as apod}
                    <swiper-slide
                        lazy={apod.media_type == "image" ? "true" : "false"}
                        class="min-w-full aspect-1 bg-black bg-cover bg-no-repeat rounded-3xl transition-none transform-none xl:transform-gpu xl:transition-all duration-500"
                        style="height: 60vh !important;"
                    >
                        {#if apod.media_type == "image"}
                            <img
                                src={apod.url}
                                loading="lazy"
                                alt="APOD"
                                class="w-full h-full object-cover bg-black"
                            />
                        {:else if apod.media_type == "video"}
                            <div
                                class="h-full w-full flex justify-center items-center bg-cover bg-no-repeat bg-center"
                                style="background-image: url('{getThumbnail(
                                    apod.url,
                                )}');"
                            >
                                <button
                                    onclick={() => {
                                        window.open(apod.url, "_blank");
                                    }}
                                    class="bg-white rounded-xl text-black px-4 py-2 flex gap-2 items-center"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="1.3em"
                                        height="1.3em"
                                        viewBox="0 0 24 24"
                                        ><rect
                                            width="24"
                                            height="24"
                                            fill="none"
                                        /><path
                                            fill="currentColor"
                                            stroke="currentColor"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="1.5"
                                            d="M6.906 4.537A.6.6 0 0 0 6 5.053v13.894a.6.6 0 0 0 .906.516l11.723-6.947a.6.6 0 0 0 0-1.032z"
                                        />
                                    </svg>
                                    Play Video</button
                                >
                            </div>
                        {:else}
                            <div
                                class="h-full w-full flex justify-center items-center"
                            >
                                <p class="doto">Unknown Media Type</p>
                            </div>
                        {/if}
                    </swiper-slide>
                {/each}
            </swiper-container>
        </div>
        <div
            class="z-10 flex xl:items-start xl:h-[100vh] flex-col text-start justify-start xl:justify-center pb-14 xl:pb-0 xl:pr-24 pt-0 xl:pt-8 px-6 xl:px-0 select-text"
        >
            <p class="text-3xl font-semibold mb-2">
                {apods[currentIndex]?.title}
            </p>
            <p class="xl:max-h-[60vh] xl:overflow-y-auto">
                {apods[currentIndex]?.explanation}
            </p>
            {#if apods[currentIndex]?.copyright}
                <p class="mt-2 text-neutral-300">
                    <span>© {apods[currentIndex].copyright ?? ""}</span>
                </p>
            {/if}

            {#if apods[currentIndex]?.date == "2024-11-16"}
                <p class="text-neutral-300 text-sm mt-2">
                    Fun fact: This APOD marks the birthday of this website!
                </p>
            {/if}
        </div>
    </section>

    <section class="z-10 fixed bottom-5 right-5">
        <div
            class="bg-white/10 backdrop-blur-xl px-4 py-2 rounded-xl grid grid-cols-3 items-center justify-center gap-2"
        >
            <button
                data-tippy-content="Preview in HD"
                onclick={() => {
                    if (apods[currentIndex]?.hdurl) {
                        image = apods[currentIndex]?.hdurl;
                        open = true;
                    }
                }}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1.6em"
                    height="1.6em"
                    viewBox="0 0 24 24"
                    class="{apods[currentIndex]?.hdurl
                        ? 'text-neutral-400 hover:text-white'
                        : 'text-neutral-600'} duration-300"
                >
                    <rect width="24" height="24" fill="none" />
                    <path
                        fill="currentColor"
                        d="M5 21h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2M5 5h14v14H5zm4.5 6.5h-2V9H6v6h1.5v-2h2v2H11V9H9.5zM17 9h-4v6h4c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1m-.5 4.5h-2v-3h2z"
                    />
                </svg>
                <span class="sr-only">Preview in HD</span>
            </button>

            <button
                data-tippy-content="View at apod.nasa.gov"
                class="w-full items-center justify-center flex"
                onclick={() => {
                    if (apods[currentIndex]?.date) {
                        window.open(
                            `https://apod.nasa.gov/apod/ap${apods[
                                currentIndex
                            ].date
                                .split("-")
                                .map((n) => n.padStart(2, "0"))
                                .join("")
                                .substring(2)}.html`,
                            "_blank",
                        );
                    }
                }}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1.4em"
                    height="1.4em"
                    class="text-neutral-400 hover:text-white"
                    viewBox="0 0 256 256"
                >
                    <rect width="256" height="256" fill="none" />
                    <path
                        fill="currentColor"
                        d="M117.18 188.74a12 12 0 0 1 0 17l-5.12 5.12A58.26 58.26 0 0 1 70.6 228a58.62 58.62 0 0 1-41.46-100.08l34.75-34.75a58.64 58.64 0 0 1 98.56 28.11a12 12 0 1 1-23.37 5.44a34.65 34.65 0 0 0-58.22-16.58l-34.75 34.75A34.62 34.62 0 0 0 70.57 204a34.4 34.4 0 0 0 24.49-10.14l5.11-5.12a12 12 0 0 1 17.01 0M226.83 45.17a58.65 58.65 0 0 0-82.93 0l-5.11 5.11a12 12 0 0 0 17 17l5.12-5.12a34.63 34.63 0 1 1 49 49l-34.81 34.7A34.4 34.4 0 0 1 150.61 156a34.63 34.63 0 0 1-33.69-26.72a12 12 0 0 0-23.38 5.44A58.64 58.64 0 0 0 150.56 180h.05a58.28 58.28 0 0 0 41.47-17.17l34.75-34.75a58.62 58.62 0 0 0 0-82.91"
                    />
                </svg>
                <span class="sr-only">View at apod.nasa.gov</span>
            </button>

            <button
                data-tippy-content="About"
                onclick={() => {
                    viewAbout = !viewAbout;
                }}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1.3em"
                    height="1.3em"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="text-neutral-400 hover:text-white duration-300 -mt-0.5"
                    ><circle cx="12" cy="12" r="10" /><path
                        d="M12 16v-4"
                    /><path d="M12 8h.01" /></svg
                >
                <span class="sr-only">About</span>
            </button>
        </div>
    </section>
{:else}
    <p>Error</p>
{/if}

{#if viewAbout}
    <div
        class="z-50 fixed top-0 left-0 w-full min-h-screen justify-center items-center flex"
    >
        <AboutPopup bind:viewAbout />
    </div>

    <div class="fixed bottom-2 left-2">
        <p class="text-neutral-500 text-xs opacity-50">
            Hourly Remaining API Calls:
            <span class="font-medium">{apiCallsLeft}</span>
        </p>
    </div>
{/if}

<ImagePreview bind:open bind:image />
