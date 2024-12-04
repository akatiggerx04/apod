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
        This alternative client for NASA's Astronomy Picture of the Day (APOD)
        presents daily astronomical & scientific images and their explanations.
        The original APOD website is created and maintained by <a
            href="http://www.phy.mtu.edu/faculty/Nemiroff.html"
            target="_blank"
            ><span class="hover:text-neutral-100 hover:underline duration-200"
                >Robert Nemiroff</span
            ></a
        >
        and
        <a
            href="https://apod.nasa.gov/htmltest/jbonnell/www/bonnell.html"
            target="_blank"
            ><span class="hover:text-neutral-100 hover:underline duration-200"
                >Jerry Bonnell</span
            ></a
        >
        at
        <a href="https://apod.nasa.gov/apod/astropix.html" target="_blank"
            ><span class="hover:text-neutral-100 hover:underline duration-200"
                >apod.nasa.gov</span
            ></a
        >. This site serves as an alternative interface, fully crediting the
        original APOD service and its contributors.
    </p>

    <hr class="my-3 rounded border-neutral-500 opacity-40" />

    <div class="flex flex-wrap items-center gap-4 text-sm">
        <a href="mailto:apod@akatgx.link" target="_blank">
            <p class="font-medium hover:underline">Contact</p>
        </a>
        <a href="https://github.com/akatiggerx04/apod" target="_blank">
            <p class="font-medium hover:underline">Contribute</p>
        </a>
        <a
            href="https://asterisk.apod.com/viewtopic.php?t=44174"
            target="_blank"
        >
            <p class="font-medium hover:underline">Discuss</p>
        </a>
        <a href="https://apod.nasa.gov/apod" target="_blank">
            <p class="font-medium hover:underline">APOD</p>
        </a>
    </div>
</section>
