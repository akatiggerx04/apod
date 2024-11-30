<script>
    import { fade } from "svelte/transition";
    import { spring } from "svelte/motion";

    let { open = $bindable(), image = $bindable() } = $props();

    let scale = spring(1);
    let panX = spring(0);
    let panY = spring(0);
    let startX = $state(0);
    let startY = $state(0);
    let isPanning = $state(false);

    function handleWheel(event) {
        event.preventDefault();
        const delta = event.deltaY * -0.01;
        scale.update((n) => Math.max(1, Math.min(5, n + delta)));
        checkAndResetPosition();
    }

    function handleTouchStart(event) {
        if (event.touches.length === 2) {
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            startX = (touch1.clientX + touch2.clientX) / 2;
            startY = (touch1.clientY + touch2.clientY) / 2;
        }
    }

    function handleTouchMove(event) {
        if (event.touches.length === 2) {
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const currentX = (touch1.clientX + touch2.clientX) / 2;
            const currentY = (touch1.clientY + touch2.clientY) / 2;

            panX.update((n) => n + currentX - startX);
            panY.update((n) => n + currentY - startY);

            startX = currentX;
            startY = currentY;
        }
    }

    function handleMouseDown(event) {
        isPanning = true;
        startX = event.clientX;
        startY = event.clientY;
    }

    function handleMouseMove(event) {
        if (isPanning && $scale > 1) {
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            panX.update((n) => n + dx);
            panY.update((n) => n + dy);
            startX = event.clientX;
            startY = event.clientY;
        }
    }

    function handleMouseUp() {
        isPanning = false;
        checkAndResetPosition();
    }

    function resetZoom(event) {
        if (event.target === event.currentTarget && $scale === 1) {
            closePreview();
        } else if (event.target === event.currentTarget) {
            scale.set(1);
            panX.set(0);
            panY.set(0);
        }
    }

    function checkAndResetPosition() {
        if ($scale === 1) {
            panX.set(0, { hard: false });
            panY.set(0, { hard: false });
        }
    }

    function closePreview() {
        open = false;
        document.body.style.overflow = "auto";
        scale.set(1);
        panX.set(0);
        panY.set(0);
    }
</script>

{#if open}
    <div
        class="fixed top-0 left-0 w-screen h-screen bg-black/90 z-50 flex items-center justify-center cursor-default backdrop-blur-lg"
        transition:fade={{ delay: 0, duration: 100 }}
        onclick={resetZoom}
        onkeydown={resetZoom}
        ontouchstart={handleTouchStart}
        onwheel={handleWheel}
        ontouchmove={handleTouchMove}
        onmousedown={handleMouseDown}
        onmousemove={handleMouseMove}
        onmouseup={handleMouseUp}
        onmouseleave={handleMouseUp}
        tabindex="0"
        role="button"
        class:cursor-grabbing={isPanning}
    >
        <button
            class="fixed top-5 right-5 drop-shadow"
            style="z-index: 9999;"
            onclick={closePreview}
            aria-label="Close"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="#ffffff"
                ><path
                    d="m16.192 6.344-4.243 4.242-4.242-4.242-1.414 1.414L10.535 12l-4.242 4.242 1.414 1.414 4.242-4.242 4.243 4.242 1.414-1.414L13.364 12l4.242-4.242z"
                ></path></svg
            >
        </button>
        <img
            src={image}
            alt="Preview"
            class="w-full h-full object-contain py-10 md:lg:py-32 px-8 md:px-24 lg:px-32 select-none"
            class:cursor-grabbing={isPanning}
            style="transform: scale({$scale}) translate({$panX}px, {$panY}px); view-transition-name: var(--imagePreviewAnimate);"
        />
    </div>
{/if}

<style>
    img {
        user-select: none;
        -moz-user-select: none;
        -webkit-user-drag: none;
        -webkit-user-select: none;
        -ms-user-select: none;
    }
</style>
