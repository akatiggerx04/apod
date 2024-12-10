<script>
    import { onMount } from "svelte";
    import { fetchAPOD } from "$lib/apod.ts";

    let loading = $state(true);
    let error = $state({
        error: false,
        msg: "",
    });
    let apod = $state({});

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

    onMount(async () => {
        loading = true;

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const dateParam = urlParams.get("date");

            if (dateParam) {
                // Replace hyphens with slashes for Safari compatibility
                const safariSafeDate = dateParam.replace(/-/g, "/");
                const date = new Date(safariSafeDate);
                if (isNaN(date.getTime())) {
                    throw new Error(
                        "Invalid date format. Please use YYYY-MM-DD",
                    );
                }
                const result = await fetchAPOD(date);
                apod = result || {};
            } else {
                const result = await fetchAPOD();
                apod = result || {};
            }

            if (!apod) {
                throw new Error("Failed to fetch APOD");
            }
        } catch (e) {
            error.error = true;
            error.msg =
                e instanceof Error ? e.message : "An unknown error occurred";
        } finally {
            loading = false;
        }
    });

    function handleClick() {
        if (typeof apod === "object" && "date" in apod) {
            window.open(`https://apod.akatgx.link?date=${apod.date}`, "_blank");
        }
    }
</script>

<svelte:head>
    <title>Astronomy Picture of The Day: Embed</title>
    <meta name="robots" content="noindex" />
</svelte:head>

{#if loading}
    <div class="w-screen h-screen flex items-center justify-center">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="3em"
            height="3em"
            class="animate-spin"
            viewBox="0 0 24 24"
        >
            <path
                fill="currentColor"
                d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"
            />
        </svg>
    </div>
{:else if error.error}
    <div class="w-screen h-screen flex items-center justify-center">
        <p class="text-red-500">{error.msg}</p>
    </div>
{:else if apod}
    <button class="cursor-pointer" onclick={handleClick}>
        {#if "media_type" in apod && "url" in apod && "title" in apod && apod.media_type === "image"}
            <img
                src={String(apod?.url)}
                alt={String(apod?.title)}
                class="w-screen h-screen object-cover object-center"
            />
        {:else if "media_type" in apod && "url" in apod && apod.media_type === "video"}
            <div
                class="w-screen h-screen bg-center bg-cover bg-no-repeat"
                style="background-image: url('{getThumbnail(
                    String(apod?.url),
                )}');"
            ></div>
        {/if}
    </button>
{/if}

<style>
    :global(body) {
        overflow: hidden;
    }
</style>
