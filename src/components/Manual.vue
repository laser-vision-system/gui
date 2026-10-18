<script setup>
  import hintIcon from '../assets/images/manual.svg'
</script>
<template>
<teleport to="body">
    <footer class="footer text-center d-flex  align-items-center justify-content-center">
        <p class="m-0 d-flex align-items-center gap-2">
            For extra information on the system you can access the user manual by clicking this icon
            <a href="https://laser-vision-system.github.io/" target="_blank" class="d-flex">
                <img :src="hintIcon" alt="" width="30px" height="30px" class="hint-image">
            </a>
        </p>
    </footer>
</teleport>

</template>
<style scoped>
.footer{
    color: var(--camera-tab-text);
    background-color: var(--nav-bg);
    height: 3rem;
    flex-shrink: 0;
}
:global(body) {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

:global(#app) {
  flex: 1 0 auto;
}
</style>
