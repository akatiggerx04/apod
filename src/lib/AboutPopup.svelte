<script>
    let { viewAbout = $bindable() } = $props();
</script>

<section
    class="p-3 bg-black/70 backdrop-blur-xl rounded-xl min-w-[30vw] xl:max-w-[650px] mx-8 drop-shadow-xl"
>
    <div class="flex justify-between items-center gap-2">
        <p class="doto">🪐 About This Website</p>
        <button
            aria-label="Close"
            data-tippy-content="Close"
            onclick={() => {
                viewAbout = !viewAbout;
            }}
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

    <div class="flex items-center gap-2 mt-4">
        <img
            src="https://avatars.githubusercontent.com/akatiggerx04"
            class="rounded-full w-10 aspect-1 bg-neutral-300"
            alt="TGX Avatar"
        />
        <div>
            <p class="font-semibold">akatiggerx04</p>
            <p class="text-xs text-neutral-300">Space Enthusiast</p>
        </div>
    </div>

    <p class="text-sm text-neutral-300 mt-4">
        This is an unofficial client for NASA's Astronomy Picture of The Day
        (APOD) service, which utilizes NASA's APOD API to display daily
        astronomical images and information. The original APOD website is
        maintained by NASA and Michigan Technological University at
        apod.nasa.gov/apod. This website acts as an alternative interface while
        giving full credit and attribution to the original APOD service and its
        contributors.
    </p>

    <hr class="my-3 rounded border-neutral-500 opacity-40" />

    <div class="flex flex-wrap items-center gap-4 text-sm">
        <a href="mailto:apod@akatgx.link" target="_blank">
            <p class="font-medium">Contact</p>
        </a>
        <a href="https://github.com/akatiggerx04/apod" target="_blank">
            <p class="font-medium">Contribute</p>
        </a>
        <a href="https://apod.nasa.gov/apod" target="_blank">
            <p class="font-medium">APOD</p>
        </a>
        <a href="https://api.nasa.gov" target="_blank">
            <p class="font-medium">NASA's APIs</p>
        </a>
    </div>
</section>
