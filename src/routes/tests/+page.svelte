<script>
    import { fetchAPOD } from "$lib/apod";
    import { onMount } from "svelte";

    onMount(async () => {
        console.log(await fetchAPOD(new Date("11-23-2024"), new Date()));
    });
</script>
