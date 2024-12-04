<script>
    import { onMount } from "svelte";
    import { register } from "swiper/element/bundle";
    import tippy from "tippy.js";
    import "tippy.js/dist/tippy.css";
    import { fade } from "svelte/transition";
    import ImagePreview from "$lib/ImagePreview.svelte";
    import AboutPopup from "$lib/AboutPopup.svelte";
    import Lens from "$lib/Lens.svelte";
    import { fetchAPOD } from "$lib/apod.ts";

    // Configuration
    const initialDays = 15;
    const incrementDays = 20;
    const loadMoreThreshold = 10; // How many items before end to trigger load

    // Is the page loading variable
    let loading = $state(true);

    // Where APODS are stored
    /** @type {any[]} */
    let apods = $state([]);

    // Current APOD the user is looking at
    let currentIndex = $state(0);

    // This is the small spinner; indicates wether more apods are loading in the backgroud.
    let loadingMore = $state(false);

    // Store error message here
    let error = $state({
        error: false,
        msg: "",
    });

    // Lens effect when hovering over APOD (Desktop only)
    let lensEffect = $state(false);

    // About Popup
    let viewAbout = $state(false);

    // Preview in HD popup
    let open = $state(false);
    let image = $state("");

    function updateURL(date) {
        const url = new URL(window.location.href);
        url.searchParams.set("date", date);
        window.history.replaceState({}, "", url);
    }

    // Toggle zoom lens effect for desktop
    async function toggleLensEffect() {
        if (apods.length == 1 && loadingMore == true) {
            return;
        }

        lensEffect = !lensEffect;
        localStorage.setItem("apod-lens-effect", lensEffect.toString());
    }

    // Get thumbnail for YouTube videos
    function getThumbnail(/** @type {string} */ url) {
        const youtubeRegex =
            /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(youtubeRegex);

        if (match && match[1]) {
            const videoId = match[1];
            return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }

        return "/assets/images/vid_thumb.webp";
    }

    async function loadSpecificDate(dateStr) {
        loading = true;
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                error.error = true;
                error.msg = "Invalid APOD date format. Try MM-DD-YYYY";
                throw new Error("Invalid date format");
            }
            const apod = await fetchAPOD(date);

            if (apod) {
                apods = [apod];
                currentIndex = 0;
            } else {
                error.error = true;
                error.msg =
                    "Failed to fetch APOD data! if you entered a valid date, please try again later.";
            }
        } catch (e) {
            error.error = true;
            error.msg =
                e instanceof Error ? e.message : "An unknown error occurred";
            apods = [];
        } finally {
            loading = false;
        }
    }

    // Load another batch of images
    async function loadMoreApods() {
        if (loadingMore) return; // Prevent multiple simultaneous loads

        loadingMore = true;

        try {
            // Find oldest date in batch by comparing all dates
            const oldestDate = new Date(
                Math.min(...apods.map((apod) => new Date(apod.date))),
            );

            const endDate = new Date(oldestDate);
            endDate.setDate(endDate.getDate() - 1);

            const startDate = new Date(oldestDate);
            startDate.setDate(startDate.getDate() - incrementDays);

            const newApods = await fetchAPOD(startDate, endDate);

            // Force reactivity by creating a new array
            apods = [...apods];
            apods.push(...newApods);

            if (apods.length > 0) {
                localStorage.setItem("latestApod", JSON.stringify(apods[0]));
            }

            // Force swiper to update
            const swiperEl = document.querySelector("swiper-container");
            if (swiperEl) {
                setTimeout(() => {
                    swiperEl.swiper.update();
                }, 0);
            }
        } catch (e) {
            console.error("Error loading more APODs:", e);
        } finally {
            loadingMore = false;
        }
    }

    // Navigation functions (For Mobile)
    async function goNext() {
        if (currentIndex < apods.length - 1) {
            currentIndex++;
            updateURL(apods[currentIndex].date);
        }

        if (currentIndex >= apods.length - loadMoreThreshold) {
            await loadMoreApods();
        }
    }

    function goPrev() {
        if (currentIndex > 0) {
            currentIndex--;
            updateURL(apods[currentIndex].date);
        }
    }

    // Check if we need to load more APODs
    async function checkLoadMore() {
        if (currentIndex >= apods.length - loadMoreThreshold && !loadingMore) {
            await loadMoreApods();
        }
    }

    onMount(async () => {
        loading = true;
        loadingMore = true;

        const urlParams = new URLSearchParams(window.location.search);
        const dateParam = urlParams.get("date");

        if (dateParam) {
            await loadSpecificDate(dateParam);
        } else {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - initialDays);

            try {
                // Check for cached data while fetching fresh data
                const cached = localStorage.getItem("latestApod");
                if (cached) {
                    apods = [JSON.parse(cached)];
                    loading = false;
                }

                const freshApods = await fetchAPOD(startDate, endDate);
                apods = freshApods;
                if (freshApods.length > 0) {
                    localStorage.setItem(
                        "latestApod",
                        JSON.stringify(freshApods[0]),
                    );
                }
            } catch (e) {
                error.error = true;
                error.msg =
                    e instanceof Error
                        ? e.message
                        : "An unknown error occurred";
            }
        }

        loading = false;
        loadingMore = false;

        if (localStorage.getItem("apod-lens-effect") == "true") {
            lensEffect = true;
        }

        register();

        // Setup swiper and tooltips
        setTimeout(async () => {
            const swiperEl = document.querySelector("swiper-container");
            if (swiperEl) {
                swiperEl.addEventListener("swiperslidechange", async (e) => {
                    currentIndex =
                        /** @type {any} */ (e)?.detail?.[0]?.activeIndex ?? 0;
                    updateURL(apods[currentIndex].date);
                    await checkLoadMore();
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
    <a href="/" title="APOD" target="_self">
        <h1 class="doto xl:text-xl text-lg font-semibold mx-4 drop-shadow-lg">
            🪐 Astronomy Picture Of The Day
        </h1></a
    >
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

    <div class="w-full min-[2600px]:flex justify-center items-center">
        <section
            transition:fade
            class="grid xl:grid-cols-2 gap-y-4 w-full z-20 2xl min-[2600px]:w-3/4"
        >
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
                            class="w-full h-full bg-cover bg-center bg-no-repeat relative"
                            style="background-image: url('{apods[currentIndex]
                                ?.url}');"
                        >
                            {#await new Promise((resolve) => {
                                const img = new Image();
                                img.onload = () => resolve(true);
                                img.src = apods[currentIndex]?.url;
                            })}
                                <div
                                    transition:fade={{ duration: 600 }}
                                    class="absolute inset-0 flex items-center justify-center"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        class="animate-spin w-12 h-12"
                                        viewBox="0 0 24 24"
                                        ><path
                                            fill="currentColor"
                                            d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8"
                                        /></svg
                                    >
                                </div>
                            {/await}
                        </div>
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
                                class="bg-white/10 backdrop-blur-xl px-4 py-2 rounded-xl text-sm flex items-center justify-center"
                                disabled={currentIndex === 0}
                                onclick={goPrev}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    class="-ml-2"
                                    viewBox="0 0 24 24"
                                >
                                    <g fill="none" fill-rule="evenodd">
                                        <path
                                            d="M24 0v24H0V0zM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M8.293 12.707a1 1 0 0 1 0-1.414l5.657-5.657a1 1 0 1 1 1.414 1.414L10.414 12l4.95 4.95a1 1 0 0 1-1.414 1.414z"
                                        />
                                    </g>
                                </svg>
                                {new Date(
                                    apods[currentIndex - 1].date,
                                ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                })}
                            </button>
                        {:else}
                            <button
                                class="bg-white/10 backdrop-blur-xl px-4 py-2 rounded-xl text-sm flex items-center justify-center disabled:text-neutral-400"
                                disabled={currentIndex === 0}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    class="-ml-2"
                                    viewBox="0 0 24 24"
                                >
                                    <g fill="none" fill-rule="evenodd">
                                        <path
                                            d="M24 0v24H0V0zM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M8.293 12.707a1 1 0 0 1 0-1.414l5.657-5.657a1 1 0 1 1 1.414 1.414L10.414 12l4.95 4.95a1 1 0 0 1-1.414 1.414z"
                                        />
                                    </g>
                                </svg>
                                Tomorrow
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
                                class="bg-white/10 backdrop-blur-xl px-4 py-2 rounded-xl text-sm flex items-center"
                                disabled={currentIndex === apods.length - 1}
                                onclick={goNext}
                            >
                                {new Date(
                                    apods[currentIndex + 1].date,
                                ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                })}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    class="-mr-2"
                                    viewBox="0 0 24 24"
                                >
                                    <g fill="none" fill-rule="evenodd">
                                        <path
                                            d="M24 0v24H0V0zM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M15.707 11.293a1 1 0 0 1 0 1.414l-5.657 5.657a1 1 0 1 1-1.414-1.414l4.95-4.95l-4.95-4.95a1 1 0 0 1 1.414-1.414z"
                                        />
                                    </g>
                                </svg>
                            </button>
                        {/if}
                    </div>
                </div>
            </section>

            <!-- Desktop Section -->
            <div
                class="hidden xl:flex justify-center items-center h-auto xl:h-[100vh] overflow-x-clip xl:[mask-image:linear-gradient(to_left,transparent,black_5%)]"
            >
                <swiper-container
                    class="apodSwiper max-w-[80vw] xl:max-w-[35vw] min-[2600px]:max-w-[25vw] min-[2600px]:aspect-1 pt-8 select-none"
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
                                <Lens bind:lensEffect>
                                    <img
                                        src={apod.url}
                                        loading="lazy"
                                        alt="APOD"
                                        class="w-full h-full object-cover bg-black"
                                    />
                                </Lens>
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

                {#if apods[currentIndex]?.credits}
                    <p class="mt-2 text-neutral-300">
                        <span class="font-medium">Credits:</span>
                        <span>{apods[currentIndex].credits ?? ""}</span>
                    </p>
                {/if}

                {#if apods[currentIndex]?.date == "2024-11-16"}
                    <p class="text-neutral-300 text-sm mt-2">
                        Fun fact: This APOD marks the birthday of this website!
                    </p>
                {/if}
            </div>
        </section>
    </div>

    <section class="z-10 fixed bottom-5 right-5">
        <div
            class="bg-white/10 backdrop-blur-xl px-4 py-2 rounded-xl grid grid-cols-3 xl:grid-cols-4 items-center justify-center gap-2"
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
                data-tippy-content="Toggle Lens Effect"
                class="w-full justify-center items-center hidden xl:flex"
                onclick={toggleLensEffect}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1.45em"
                    height="1.45em"
                    viewBox="0 0 24 24"
                    class="{lensEffect
                        ? 'text-neutral-400 hover:text-white'
                        : 'text-neutral-600'} duration-300"
                >
                    <path
                        fill="none"
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0-14 0m18 11l-6-6"
                    />
                </svg>
                <span class="sr-only">Toggle Lens Effect</span>
            </button>

            <button
                data-tippy-content="View at apod.nasa.gov"
                class="w-full items-center justify-center flex"
                onclick={() => {
                    if (apods[currentIndex]?.link) {
                        window.open(apods[currentIndex].link, "_blank");
                    }
                }}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1.4em"
                    height="1.4em"
                    class="{apods[currentIndex]?.link
                        ? 'text-neutral-400 hover:text-white'
                        : 'text-neutral-600'} duration-300"
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
{/if}

<ImagePreview bind:open bind:image />
